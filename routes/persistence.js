import express from "express";
import { getTargets, getObservationsForTarget } from "../services/persistence.js";

const router = express.Router();

router.get("/targets", async (_req, res) => {
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
