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
import { sendClientError, sendServerError } from "../server/errors.js";
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

router.get("/documents/mcf/meta", (req, res) => {
  try {
    return res.json(getMcfMeta());
  } catch (err) {
    return sendServerError(req, res, err, "mcf_meta_failed");
  }
});

router.get("/documents/mcf/search", (req, res) => {
  try {
    const { q, funder, sector, minAmount, limit, offset } = req.query;
    return res.json(searchMcfProjects({ q, funder, sector, minAmount, limit, offset }));
  } catch (err) {
    return sendServerError(req, res, err, "mcf_search_failed");
  }
});

router.get("/documents/mcf/:projectId", (req, res) => {
  try {
    const project = getMcfProject(req.params.projectId);
    if (!project) return sendClientError(res, 404, "not_found", "MCF project not found");
    return res.json(project);
  } catch (err) {
    return sendServerError(req, res, err, "mcf_get_failed");
  }
});

router.get("/documents/passage-corpus/meta", (req, res) => {
  try {
    return res.json(getPassageCorpusMeta());
  } catch (err) {
    return sendServerError(req, res, err, "passage_corpus_meta_failed");
  }
});

router.get("/documents/topics", (req, res) => {
  try {
    const { documentId } = req.query;
    return res.json(listTopics({ documentId }));
  } catch (err) {
    return sendServerError(req, res, err, "documents_topics_failed");
  }
});

router.get("/documents/passages/search", (req, res) => {
  try {
    const { q, topicId, limit, offset } = req.query;
    return res.json(searchPassages({ q, topicId, limit, offset }));
  } catch (err) {
    return sendServerError(req, res, err, "documents_passages_search_failed");
  }
});

router.get("/documents/meta", (req, res) => {
  try {
    return res.json(getMeta());
  } catch (err) {
    return sendServerError(req, res, err, "documents_meta_failed");
  }
});

router.get("/documents/curated", (req, res) => {
  try {
    const { sectorId, context } = req.query;
    return res.json(getCurated({ sectorId, context }));
  } catch (err) {
    return sendServerError(req, res, err, "documents_curated_failed");
  }
});

router.get("/documents/catalog/:catalogId", (req, res) => {
  try {
    const doc = getDocumentById(req.params.catalogId);
    if (!doc) return sendClientError(res, 404, "not_found", "Document not found");
    const passageDoc = getPassageDocumentByCatalogId(req.params.catalogId);
    return res.json({ document: doc, passageDocument: passageDoc });
  } catch (err) {
    return sendServerError(req, res, err, "documents_catalog_get_failed");
  }
});

router.get("/documents/:cprDocumentId/passages", (req, res) => {
  try {
    const { cprDocumentId } = req.params;
    const { q, topicId, limit, offset } = req.query;
    const result = listPassages(cprDocumentId, { q, topicId, limit, offset });
    if (!result) return sendClientError(res, 404, "not_found", "Passage document not found");
    return res.json(result);
  } catch (err) {
    return sendServerError(req, res, err, "documents_passages_list_failed");
  }
});

router.get("/documents/:cprDocumentId", (req, res) => {
  try {
    const doc = getPassageDocument(req.params.cprDocumentId);
    if (!doc) return sendClientError(res, 404, "not_found", "Passage document not found");
    return res.json(doc);
  } catch (err) {
    return sendServerError(req, res, err, "documents_passage_get_failed");
  }
});

router.get("/documents", (req, res) => {
  try {
    const { category, source, q, limit, offset } = req.query;
    return res.json(listDocuments({ category, source, q, limit, offset }));
  } catch (err) {
    return sendServerError(req, res, err, "documents_list_failed");
  }
});

export default router;
