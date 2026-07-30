/**
 * Policy document library endpoints.
 *
 * Serves the collection of climate policy documents (national strategies, plans
 * and Multilateral Climate Fund project papers) that the app lets people browse
 * and search. Documents are broken into short "passages" so a search can point
 * at the exact paragraph that answers a question, rather than a whole PDF.
 *
 * Everything here is read-only and comes from files prepared ahead of time by
 * the scripts in scripts/build_policy_*.mjs.
 *
 * Endpoints:
 *   GET /documents                       — list the document catalogue
 *   GET /documents/meta                  — counts and coverage of the catalogue
 *   GET /documents/curated               — the hand-picked highlights
 *   GET /documents/topics                — topics documents are tagged with
 *   GET /documents/:id                   — one document
 *   GET /documents/:id/passages          — that document split into passages
 *   GET /documents/passages/search       — full-text search across passages
 *   GET /documents/passage-corpus/meta   — size/coverage of the passage set
 *   GET /documents/catalog/:catalogId    — look a document up by catalogue id
 *   GET /documents/mcf/meta              — summary of the climate-fund projects
 *   GET /documents/mcf/search            — search the climate-fund projects
 *   GET /documents/mcf/:projectId        — one climate-fund project
 */
import express from "express";
import { getCurated, getDocumentById, getMeta, listDocuments } from "../services/policyDocuments.js";
import {
  getPassageCorpusMeta,
  getPassageDocument,
  getPassageDocumentByCatalogId,
  listPassages,
  listTopics,
  searchPassages,
} from "../services/policyPassages.js";
import { getMcfMeta, getMcfProject, searchMcfProjects } from "../services/mcfProjects.js";

const router = express.Router();

router.get("/documents/mcf/meta", (_req, res) => {
  try {
    return res.json(getMcfMeta());
  } catch (err) {
    _req.log?.error({ err }, "mcf_meta_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/mcf/search", (req, res) => {
  try {
    const { q, funder, sector, minAmount, limit, offset } = req.query;
    return res.json(searchMcfProjects({ q, funder, sector, minAmount, limit, offset }));
  } catch (err) {
    req.log?.error({ err }, "mcf_search_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/mcf/:projectId", (req, res) => {
  try {
    const project = getMcfProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: "MCF project not found" });
    return res.json(project);
  } catch (err) {
    req.log?.error({ err }, "mcf_get_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/passage-corpus/meta", (_req, res) => {
  try {
    return res.json(getPassageCorpusMeta());
  } catch (err) {
    _req.log?.error({ err }, "passage_corpus_meta_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/topics", (req, res) => {
  try {
    const { documentId } = req.query;
    return res.json(listTopics({ documentId }));
  } catch (err) {
    req.log?.error({ err }, "documents_topics_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/passages/search", (req, res) => {
  try {
    const { q, topicId, limit, offset } = req.query;
    return res.json(searchPassages({ q, topicId, limit, offset }));
  } catch (err) {
    req.log?.error({ err }, "documents_passages_search_failed");
    return res.status(500).json({ error: err.message });
  }
});

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

router.get("/documents/catalog/:catalogId", (req, res) => {
  try {
    const doc = getDocumentById(req.params.catalogId);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const passageDoc = getPassageDocumentByCatalogId(req.params.catalogId);
    return res.json({ document: doc, passageDocument: passageDoc });
  } catch (err) {
    req.log?.error({ err }, "documents_catalog_get_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/:cprDocumentId/passages", (req, res) => {
  try {
    const { cprDocumentId } = req.params;
    const { q, topicId, limit, offset } = req.query;
    const result = listPassages(cprDocumentId, { q, topicId, limit, offset });
    if (!result) return res.status(404).json({ error: "Passage document not found" });
    return res.json(result);
  } catch (err) {
    req.log?.error({ err }, "documents_passages_list_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/documents/:cprDocumentId", (req, res) => {
  try {
    const doc = getPassageDocument(req.params.cprDocumentId);
    if (!doc) return res.status(404).json({ error: "Passage document not found" });
    return res.json(doc);
  } catch (err) {
    req.log?.error({ err }, "documents_passage_get_failed");
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
