#!/usr/bin/env node
/** Verify the production forecast path using live input data. This checks data
 * integrity and comparison rules, not whether future estimates will be correct.
 * Python model experiments can be run separately with backend/ml/backtest_predictions.py.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { getSectorPredictions } from "../backend/services/predictionEngine.js";
import { getEmissionsDashboard } from "../backend/services/emissionsData.js";
import { defaultInventoryRange } from "../config/climateTrace.js";
import { NDC_TARGETS } from "../config/ndcTargets.js";

// Vercel uses the in-process regression engine; test that actual deployment path.
process.env.VERCEL = "1";
process.env.USE_MOCK_DATA = "false";
const report = { verified_at: new Date().toISOString(), checks: [], geographies: [] };
try {
  const range = defaultInventoryRange();
  for (const geo of [{ gadmId: "UGA" }, { gadmId: "UGA.16_1", districtName: "Kampala" }]) {
    const dashboard = await getEmissionsDashboard(range.since, range.to, geo);
    const forecast = await getSectorPredictions(geo);
    assert.equal(forecast.engine, "js-ols-fallback");
    assert.equal(forecast.summary.total_gap, null, "Mapped sectors cannot be summed into a national NDC gap");
    assert.equal(Object.keys(forecast.predictions).length, Object.keys(NDC_TARGETS).length);
    for (const [sector, prediction] of Object.entries(forecast.predictions)) {
      assert.deepEqual(prediction.history, dashboard.timeseries[sector], `${geo.gadmId}/${sector}: history differs from live input`);
      const comparable = geo.gadmId === "UGA" && NDC_TARGETS[sector].progress_comparable !== false && NDC_TARGETS[sector].target != null;
      assert.equal(prediction.comparison_available, comparable);
      if (!comparable) {
        assert.equal(prediction.target_value, null);
        assert.equal(prediction.gap, null);
        assert.ok(["unknown", "insufficient_data"].includes(prediction.status));
      }
      if (prediction.status !== "insufficient_data") {
        assert.ok(Number.isFinite(prediction.predicted_value));
        assert.ok(prediction.predicted_lower <= prediction.predicted_value);
        assert.ok(prediction.predicted_value <= prediction.predicted_upper);
        if (sector !== "afolu") assert.ok(prediction.predicted_value >= 0);
      }
      assert.ok(prediction.history.some((point) => point.value != null), "Live history is unavailable");
      report.checks.push({ geography: geo.gadmId, sector, history_matches_live_input: true, comparable,
        available_years: prediction.n_points, predicted_2030: prediction.predicted_value });
    }
    report.geographies.push({ gadm_id: geo.gadmId, engine: forecast.engine, source: dashboard.data_source, summary: forecast.summary });
  }
  writeFileSync(new URL("./.verify-predictions-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PASS: ${report.checks.length} sector/geography forecasts use live histories, preserve missing values, and obey target comparison rules.`);
  console.log("Forecasts remain planning estimates; this check does not certify future accuracy.");
} catch (error) {
  console.error("FAIL:", error.message);
  process.exitCode = 1;
}
