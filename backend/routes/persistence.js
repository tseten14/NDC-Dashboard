/**
 * Read access to saved targets and their observations.
 *
 * These are the figures that have been imported through the data-ingestion
 * screen and stored — as opposed to the live Climate TRACE numbers, which are
 * fetched fresh on every request. Used to show a target's own reported history
 * alongside the satellite-derived observations.
 *
 * Endpoints:
 *   GET /targets                        — every stored target
 *   GET /targets/:targetId/observations — the values recorded against one target
 */
import express from "express";
import { getTargets, getObservationsForTarget } from "../services/persistence.js";

const router = express.Router();

router.get("/targets", async (req, res) => {
  try {
    const rows = await getTargets();
    return res.json({ targets: rows, count: rows.length });
  } catch (err) {
    req.log?.error({ err }, "targets_list_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/targets/:targetId/observations", async (req, res) => {
  try {
    const rows = await getObservationsForTarget(req.params.targetId);
    return res.json({ target_id: req.params.targetId, observations: rows, count: rows.length });
  } catch (err) {
    req.log?.error({ err, targetId: req.params.targetId }, "target_observations_failed");
    return res.status(500).json({ error: err.message });
  }
});

export default router;
