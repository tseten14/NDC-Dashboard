/**
 * Marketplace deal pipeline API.
 *
 * GET endpoints are public (anyone can browse the pipeline).
 * POST/PUT/DELETE require the operator session (same auth as ingest).
 */
import express from "express";
import { requireWriteApiKey } from "../server/middleware/apiKeyAuth.js";
import { listDeals, getDeal, createDeal, updateDeal, deleteDeal } from "../services/marketplaceDeals.js";

const router = express.Router();

function sendServerError(req, res, err, code) {
  req.log?.error({ err, event: code }, err.message);
  const status = err.status === 400 ? 400 : err.message?.includes("not configured") ? 503 : 500;
  res.status(status).json({ error: code, message: err.message });
}

router.get("/marketplace/deals", async (req, res) => {
  try {
    const deals = await listDeals();
    res.json({ deals, count: deals.length });
  } catch (err) {
    sendServerError(req, res, err, "marketplace_list_failed");
  }
});

router.get("/marketplace/deals/:id", async (req, res) => {
  try {
    const deal = await getDeal(req.params.id);
    if (!deal) return res.status(404).json({ error: "not_found" });
    res.json({ deal });
  } catch (err) {
    sendServerError(req, res, err, "marketplace_get_failed");
  }
});

router.post("/marketplace/deals", requireWriteApiKey, async (req, res) => {
  try {
    const data = req.body;
    if (!data?.title || !data?.sector || !data?.problem) {
      return res.status(400).json({ error: "missing_fields", message: "title, sector, and problem are required" });
    }
    const deal = await createDeal(data);
    res.status(201).json({ deal });
  } catch (err) {
    sendServerError(req, res, err, "marketplace_create_failed");
  }
});

router.put("/marketplace/deals/:id", requireWriteApiKey, async (req, res) => {
  try {
    const deal = await updateDeal(req.params.id, req.body);
    if (!deal) return res.status(404).json({ error: "not_found" });
    res.json({ deal });
  } catch (err) {
    sendServerError(req, res, err, "marketplace_update_failed");
  }
});

router.delete("/marketplace/deals/:id", requireWriteApiKey, async (req, res) => {
  try {
    const deleted = await deleteDeal(req.params.id);
    if (!deleted) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (err) {
    sendServerError(req, res, err, "marketplace_delete_failed");
  }
});

export default router;
