/**
 * Policy impact modelling endpoints.
 *
 * Lets a user ask "if we adopt this policy, what happens to emissions?" A policy
 * case describes a real measure (its cost, coverage and expected effect); the
 * forecast endpoint runs that case through the impact engine and returns the
 * projected emissions path. "TEF elements" are the building blocks of the
 * Transparency and Effectiveness Framework used to structure the answer.
 *
 * Endpoints:
 *   GET  /policy-cases              — the library of modelled policy cases
 *   GET  /policy-cases/:id          — one case in full
 *   POST /policy-impact/forecast    — run a case and return the projection
 *   GET  /policy-impact/tef-elements — the framework's building blocks
 */
import express from "express";
import { safeParseOrLog } from "../../shared/validate.js";
import {
  forecastRequestSchema,
  forecastResponseSchema,
  policyCaseSchema,
} from "../../shared/schemas/policyImpact.schema.js";
import {
  getPolicyCaseById,
  getTefElements,
  listPolicyCases,
  getAllPolicyCases,
} from "../services/policyCaseData.js";
import { runPolicyImpactForecast } from "../services/policyImpactEngine.js";

const router = express.Router();

router.get("/policy-cases", (_req, res) => {
  try {
    return res.json(listPolicyCases());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/policy-cases/:id", (req, res) => {
  try {
    const c = getPolicyCaseById(req.params.id);
    if (!c) return res.status(404).json({ error: "case_not_found" });
    safeParseOrLog(policyCaseSchema, c, "policyCase.detail");
    return res.json({ case: c, data_source: "bundled KCI corpus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/policy-impact/forecast", (req, res) => {
  try {
    const parsed = forecastRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
    }
    const result = runPolicyImpactForecast(getAllPolicyCases(), parsed.data);
    safeParseOrLog(forecastResponseSchema, result, "policyImpact.forecast");
    return res.json(result);
  } catch (err) {
    req.log?.error({ err }, "policy_impact_forecast_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/policy-impact/tef-elements", (req, res) => {
  try {
    const sector = req.query.sector?.toString() ?? "";
    const elements = getTefElements(sector);
    return res.json({ sector: sector || "all", elements, data_source: "transition elements taxonomy" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
