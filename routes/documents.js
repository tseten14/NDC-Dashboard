import express from "express";
import { getCurated, getMeta, listDocuments } from "../services/policyDocuments.js";

const router = express.Router();

router.get("/documents/meta", (_req, res) => {
  try {
    return res.json(getMeta());
  } catch (err) {
    _req.log?.error({ err }, "documents_meta_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/curated", (req, res) => {
  try {
    const { sectorId, context } = req.query;
    return res.json(getCurated({ sectorId, context }));
  } catch (err) {
    req.log?.error({ err }, "documents_curated_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents", (req, res) => {
  try {
    const { category, source, q, limit, offset } = req.query;
    return res.json(listDocuments({ category, source, q, limit, offset }));
  } catch (err) {
    req.log?.error({ err }, "documents_list_failed");
    return res.status(500).json({ error: err.message });
  }
});

export default router;
