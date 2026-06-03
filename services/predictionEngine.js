/**
 * NDC 2030 prediction engine.
 *
 * Gathers the per-sector Climate TRACE observed timeseries (via the emissions
 * dashboard) and forecasts each sector to the NDC target year (2030), comparing
 * the prediction to the NDC target to surface the projected gap and status.
 *
 * Primary path: scripts/predict_emissions.py (numpy linear / log-linear models).
 * Fallback: an in-process JS OLS linear forecast, so the feature works even where
 * Python is unavailable (e.g. serverless hosts).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import NodeCache from "node-cache";
import { getEmissionsDashboard } from "./emissionsData.js";
import { NDC_TARGETS } from "../config/ndcTargets.js";
import { UGANDA_NATIONAL_GADM } from "../config/ugandaDistrictGadm.js";
import { defaultInventoryRange } from "../config/climateTrace.js";
import { logger } from "../server/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "scripts", "predict_emissions.py");
const TIMEOUT_MS = 90_000; // deep model training + MC-dropout sampling
const TARGET_YEAR = 2030;

const cache = new NodeCache({ stdTTL: 86_400 }); // 24h — CT data updates monthly

const Z_80 = 1.2816;
const ON_TRACK_RATIO = 1.02;
const AT_RISK_RATIO = 1.15;

function round(v, nd = 2) {
  if (v == null || Number.isNaN(v)) return null;
  const f = 10 ** nd;
  return Math.round(v * f) / f;
}

function statusFor(predicted, target) {
  if (target == null || target <= 0) return "unknown";
  const ratio = predicted / target;
  if (ratio <= ON_TRACK_RATIO) return "on_track";
  if (ratio <= AT_RISK_RATIO) return "at_risk";
  return "off_track";
}

/** In-process OLS linear forecast used when Python is unavailable. */
function jsForecastSector(points, meta, targetYear) {
  const clean = (points || [])
    .filter((p) => p && p.value != null)
    .map((p) => [Number(p.year), Number(p.value)])
    .sort((a, b) => a[0] - b[0]);
  const history = clean.map(([year, value]) => ({ year, value: round(value) }));
  const target = meta.target ?? null;

  if (clean.length < 3) {
    return {
      label: meta.label,
      unit: meta.unit ?? "MtCO2e",
      history,
      forecast: [],
      predicted_value: null,
      target_value: target,
      baseline_value: meta.baseline ?? null,
      gap: null,
      gap_pct: null,
      status: "insufficient_data",
      model: null,
      r2: null,
      n_points: clean.length,
      note: "Need at least 3 observed years to forecast.",
    };
  }

  const xs = clean.map((c) => c[0]);
  const ys = clean.map((c) => c[1]);
  const n = xs.length;
  const lastYear = Math.max(...xs);
  const futureYears = [];
  for (let yr = lastYear + 1; yr <= targetYear; yr++) futureYears.push(yr);

  // Fit OLS in a given space; `transform`/`inv` map to/from that space (e.g. log).
  const fitOls = (yvals) => {
    const xbar = xs.reduce((s, v) => s + v, 0) / n;
    const ybar = yvals.reduce((s, v) => s + v, 0) / n;
    const sxx = xs.reduce((s, v) => s + (v - xbar) ** 2, 0);
    if (sxx === 0) return null;
    const b = xs.reduce((s, v, i) => s + (v - xbar) * (yvals[i] - ybar), 0) / sxx;
    const a = ybar - b * xbar;
    const se = Math.sqrt(
      yvals.reduce((s, y, i) => s + (y - (a + b * xs[i])) ** 2, 0) / Math.max(1, n - 2),
    );
    return { a, b, xbar, sxx, se };
  };
  const hw = (f, x0) => Z_80 * f.se * Math.sqrt(1 + 1 / n + (x0 - f.xbar) ** 2 / f.sxx);

  const candidates = [];
  const linFit = fitOls(ys);
  if (linFit) {
    const yhatHist = xs.map((x) => linFit.a + linFit.b * x);
    const ssRes = ys.reduce((s, y, i) => s + (y - yhatHist[i]) ** 2, 0);
    const ssTot = ys.reduce((s, y) => s + (y - ys.reduce((p, q) => p + q, 0) / n) ** 2, 0);
    candidates.push({
      model: "linear",
      r2: ssTot > 0 ? 1 - ssRes / ssTot : 1,
      points: futureYears.map((yr) => {
        const yhat = linFit.a + linFit.b * yr;
        const w = hw(linFit, yr);
        return { year: yr, yhat, lower: yhat - w, upper: yhat + w };
      }),
    });
  }
  if (ys.every((y) => y > 0)) {
    const logFit = fitOls(ys.map((y) => Math.log(y)));
    if (logFit) {
      const yhatHist = xs.map((x) => Math.exp(logFit.a + logFit.b * x));
      const ybar = ys.reduce((s, y) => s + y, 0) / n;
      const ssRes = ys.reduce((s, y, i) => s + (y - yhatHist[i]) ** 2, 0);
      const ssTot = ys.reduce((s, y) => s + (y - ybar) ** 2, 0);
      candidates.push({
        model: "log-linear",
        r2: ssTot > 0 ? 1 - ssRes / ssTot : 1,
        points: futureYears.map((yr) => {
          const logYhat = logFit.a + logFit.b * yr;
          const w = hw(logFit, yr);
          return { year: yr, yhat: Math.exp(logYhat), lower: Math.exp(logYhat - w), upper: Math.exp(logYhat + w) };
        }),
      });
    }
  }

  const positive = candidates.filter((c) => c.points.length && c.points[c.points.length - 1].yhat > 0);
  const best = (positive.length ? positive : candidates).reduce((a, c) => (c.r2 > a.r2 ? c : a));
  const r2 = best.r2;

  const forecast = best.points.map((p) => ({
    year: p.year,
    yhat: round(Math.max(0, p.yhat)),
    lower: round(Math.max(0, p.lower)),
    upper: round(Math.max(0, p.upper)),
  }));
  const targetRaw = best.points.find((p) => p.year === targetYear) ?? best.points[best.points.length - 1];
  const targetPoint = targetRaw
    ? { yhat: Math.max(0, targetRaw.yhat), lower: Math.max(0, targetRaw.lower), upper: Math.max(0, targetRaw.upper) }
    : null;

  const predicted = targetPoint ? targetPoint.yhat : null;
  const gap = predicted != null && target != null ? predicted - target : null;
  const gapPct = gap != null && target ? (gap / target) * 100 : null;

  return {
    label: meta.label,
    unit: meta.unit ?? "MtCO2e",
    history,
    forecast,
    predicted_value: round(predicted),
    predicted_lower: round(targetPoint?.lower),
    predicted_upper: round(targetPoint?.upper),
    target_value: target,
    baseline_value: meta.baseline ?? null,
    gap: round(gap),
    gap_pct: round(gapPct, 1),
    status: statusFor(predicted, target),
    model: best.model,
    r2: round(r2, 3),
    n_points: n,
    note: null,
  };
}

function jsForecast(payload) {
  const predictions = {};
  const counts = { on_track: 0, at_risk: 0, off_track: 0, unknown: 0, insufficient_data: 0 };
  let totalPred = 0;
  let totalTarget = 0;
  for (const [sector, points] of Object.entries(payload.series)) {
    const meta = payload.ndc_targets[sector] ?? {};
    const r = jsForecastSector(points, meta, payload.target_year);
    predictions[sector] = r;
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    if (r.predicted_value != null) totalPred += r.predicted_value;
    if (r.target_value != null) totalTarget += r.target_value;
  }
  return {
    ok: true,
    engine: "js-ols-fallback",
    target_year: payload.target_year,
    predictions,
    summary: {
      ...counts,
      total_predicted: round(totalPred),
      total_target: round(totalTarget),
      total_gap: round(totalPred - totalTarget),
    },
  };
}

function runPython(payload) {
  if (process.env.VERCEL) return Promise.resolve(null);
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn("python3", [SCRIPT], { stdio: ["pipe", "pipe", "pipe"] });
    } catch {
      resolve(null);
      return;
    }
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve(null);
    }, TIMEOUT_MS);
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger.warn({ event: "prediction_python_exit", code, stderr: stderr.slice(0, 200) }, "python predict_emissions.py exited with error");
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed.ok ? parsed : null);
      } catch {
        resolve(null);
      }
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

/**
 * Forecast all NDC sectors to 2030 for a geography (national by default).
 * @param {{ gadmId?: string, districtName?: string|null }} [options]
 */
export async function getSectorPredictions(options = {}) {
  const gadmId = options.gadmId ?? UGANDA_NATIONAL_GADM;
  const districtName = options.districtName ?? null;
  const cacheKey = `pred:${gadmId}:${TARGET_YEAR}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, from_cache: true };

  const { since, to } = defaultInventoryRange();
  const dashboard = await getEmissionsDashboard(since, to, { gadmId, districtName });

  const series = {};
  const ndcTargets = {};
  for (const [sector, target] of Object.entries(NDC_TARGETS)) {
    series[sector] = dashboard.timeseries?.[sector] ?? [];
    ndcTargets[sector] = {
      label: target.label,
      unit: target.unit,
      baseline: target.baseline,
      target: target.target,
      target_year: target.target_year,
      condition: target.condition,
    };
  }

  const payload = { target_year: TARGET_YEAR, series, ndc_targets: ndcTargets };
  const result = (await runPython(payload)) ?? jsForecast(payload);

  // Merge NDC context (BAU ceiling, condition) the forecaster doesn't echo.
  for (const [sector, pred] of Object.entries(result.predictions ?? {})) {
    const t = NDC_TARGETS[sector];
    if (t) {
      pred.bau_2030 = t.bau_2030 ?? null;
      pred.condition = t.condition ?? null;
      pred.reduction_below_bau_pct = t.reduction_below_bau_pct ?? null;
    }
  }

  const isDistrict = gadmId !== UGANDA_NATIONAL_GADM;
  const enriched = {
    ...result,
    geography: isDistrict ? "district" : "national",
    gadm_id: gadmId,
    district_name: districtName,
    observed_from: since,
    observed_to: dashboard.inventory_year ?? to,
    data_source: "Climate TRACE",
    methodology:
      "Deep-learning forecast: a global GRU (PyTorch) trained jointly across sectors on Climate TRACE observed emissions, with an 80% prediction interval from Monte-Carlo dropout (numpy OLS fallback if torch is unavailable). Compared to Uganda NDC 2030 targets. Indicative planning projection, not official MRV.",
    target_scope: "national",
    from_cache: false,
  };

  cache.set(cacheKey, enriched);
  return enriched;
}

export function clearPredictionCache() {
  cache.flushAll();
}
