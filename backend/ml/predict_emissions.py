#!/usr/bin/env python3
"""
NDC 2030 emissions forecaster for the NDC Data Explorer.
Reads JSON from stdin, writes JSON to stdout.

Input:
  {
    "target_year": 2030,
    "series": { "<sector>": [ {"year": 2015, "value": 6.2}, ... ], ... },
    "ndc_targets": { "<sector>": {"label","unit","baseline","target","target_year","condition"} }
  }

Primary model (deep learning): a single *global* GRU (PyTorch) trained jointly
across every sector's observed series with a learned per-sector embedding. It
forecasts each sector autoregressively to the NDC target year, and a 95%
prediction interval is estimated via Monte-Carlo dropout. The predicted target-year
value is compared to the NDC target to produce a gap and an on-track / at-risk /
off-track status.

Fallback model: if PyTorch is unavailable (or training fails), each sector falls
back to a numpy OLS trend (linear / log-linear, best in-sample fit) with a 95%
prediction interval.

Dependencies: numpy (required); torch (optional, enables the deep model).
"""
from __future__ import annotations

import json
import sys
from typing import Any

import numpy as np

# 95% prediction interval z-multiplier (normal approximation).
Z_95 = 1.96
# Status thresholds: predicted/target ratio (lower emissions = better).
ON_TRACK_RATIO = 1.02
AT_RISK_RATIO = 1.15


def _ols(x: np.ndarray, y: np.ndarray) -> dict[str, Any]:
    """Ordinary least squares y = a + b*x with R^2 and residual std error."""
    n = len(x)
    xbar = x.mean()
    sxx = float(((x - xbar) ** 2).sum())
    if sxx == 0:
        return {"ok": False}
    b = float(((x - xbar) * (y - y.mean())).sum() / sxx)
    a = float(y.mean() - b * xbar)
    yhat = a + b * x
    ss_res = float(((y - yhat) ** 2).sum())
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 1.0
    dof = max(1, n - 2)
    s = float(np.sqrt(ss_res / dof))
    return {"ok": True, "a": a, "b": b, "r2": r2, "s": s, "xbar": xbar, "sxx": sxx, "n": n}


def _pi_halfwidth(fit: dict[str, Any], x0: float) -> float:
    """95% prediction-interval half-width for a new observation at x0."""
    n = fit["n"]
    se = fit["s"] * np.sqrt(1.0 + 1.0 / n + ((x0 - fit["xbar"]) ** 2) / fit["sxx"])
    return float(Z_95 * se)


def _forecast_linear(years: np.ndarray, values: np.ndarray, future: list[int]):
    fit = _ols(years, values)
    if not fit.get("ok"):
        return None
    pts = []
    for yr in future:
        yhat = fit["a"] + fit["b"] * yr
        hw = _pi_halfwidth(fit, yr)
        pts.append({"year": int(yr), "yhat": yhat, "lower": yhat - hw, "upper": yhat + hw})
    return {"model": "linear", "r2": fit["r2"], "points": pts}


def _forecast_loglinear(years: np.ndarray, values: np.ndarray, future: list[int]):
    # Only valid when all observed values are strictly positive.
    if np.any(values <= 0):
        return None
    logy = np.log(values)
    fit = _ols(years, logy)
    if not fit.get("ok"):
        return None
    # R^2 measured in the original (back-transformed) space for fair comparison.
    yhat_hist = np.exp(fit["a"] + fit["b"] * years)
    ss_res = float(((values - yhat_hist) ** 2).sum())
    ss_tot = float(((values - values.mean()) ** 2).sum())
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 1.0
    pts = []
    for yr in future:
        log_yhat = fit["a"] + fit["b"] * yr
        hw = _pi_halfwidth(fit, yr)  # half-width in log space
        pts.append(
            {
                "year": int(yr),
                "yhat": float(np.exp(log_yhat)),
                "lower": float(np.exp(log_yhat - hw)),
                "upper": float(np.exp(log_yhat + hw)),
            }
        )
    return {"model": "log-linear", "r2": r2, "points": pts}


def _status(predicted: float, target: float | None) -> str:
    if target is None or target <= 0:
        return "unknown"
    ratio = predicted / target
    if ratio <= ON_TRACK_RATIO:
        return "on_track"
    if ratio <= AT_RISK_RATIO:
        return "at_risk"
    return "off_track"


def _round(v: float | None, nd: int = 2) -> float | None:
    if v is None:
        return None
    return round(float(v), nd)


def predict_sector(points: list[dict], meta: dict, target_year: int) -> dict:
    clean = [(int(p["year"]), float(p["value"])) for p in points if p.get("value") is not None]
    clean.sort()
    history = [{"year": y, "value": _round(v)} for y, v in clean]
    target_value = meta.get("target")

    if len(clean) < 3:
        return {
            "label": meta.get("label"),
            "unit": meta.get("unit", "MtCO2e"),
            "history": history,
            "forecast": [],
            "predicted_value": None,
            "target_value": target_value,
            "baseline_value": meta.get("baseline"),
            "gap": None,
            "gap_pct": None,
            "status": "insufficient_data",
            "model": None,
            "r2": None,
            "n_points": len(clean),
            "note": "Need at least 3 observed years to forecast.",
        }

    years = np.array([y for y, _ in clean], dtype=float)
    values = np.array([v for _, v in clean], dtype=float)
    last_year = int(years.max())
    future = list(range(last_year + 1, target_year + 1))
    if not future:
        future = [target_year]

    candidates = [c for c in (_forecast_linear(years, values, future), _forecast_loglinear(years, values, future)) if c]
    # Prefer a model whose target-year forecast stays physically positive
    # (a linear fit on a noisy decline can extrapolate below zero, which then
    # clamps to a misleading 0). Among the valid ones, pick the best in-sample fit.
    positive = [c for c in candidates if c["points"] and c["points"][-1]["yhat"] > 0]
    best = max(positive or candidates, key=lambda c: c["r2"])

    forecast = [
        {
            "year": p["year"],
            "yhat": _round(max(0.0, p["yhat"])),
            "lower": _round(max(0.0, p["lower"])),
            "upper": _round(max(0.0, p["upper"])),
        }
        for p in best["points"]
    ]
    target_point = next((p for p in best["points"] if p["year"] == target_year), best["points"][-1])
    predicted = max(0.0, target_point["yhat"])
    gap = predicted - target_value if target_value is not None else None
    gap_pct = (gap / target_value * 100.0) if (target_value not in (None, 0)) else None

    return {
        "label": meta.get("label"),
        "unit": meta.get("unit", "MtCO2e"),
        "history": history,
        "forecast": forecast,
        "predicted_value": _round(predicted),
        "predicted_lower": _round(max(0.0, target_point["lower"])),
        "predicted_upper": _round(max(0.0, target_point["upper"])),
        "target_value": target_value,
        "baseline_value": meta.get("baseline"),
        "gap": _round(gap),
        "gap_pct": _round(gap_pct, 1),
        "status": _status(predicted, target_value),
        "model": best["model"],
        "r2": _round(best["r2"], 3),
        "n_points": len(clean),
        "note": None,
    }


# ── Deep-learning forecaster (PyTorch) ──────────────────────────────────────────
# A single *global* GRU is trained jointly over every sector's observed series
# (with a learned per-sector embedding) so the small annual histories share
# temporal structure. Forecasts are produced autoregressively and a 95%
# prediction interval is estimated with Monte-Carlo dropout (dropout kept active
# at inference, sampled many times). This is a genuine deep model rather than a
# closed-form trend; the numpy OLS path above remains the fallback when torch is
# unavailable.

WINDOW = 4          # look-back length fed to the GRU
HIDDEN = 24
EMBED_DIM = 4
DROPOUT = 0.2
EPOCHS = 600
LR = 0.01
MC_SAMPLES = 200
SEED = 42


def _build_torch_model(torch, n_sectors: int):
    import torch.nn as nn

    class GlobalGRUForecaster(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.emb = nn.Embedding(n_sectors, EMBED_DIM)
            self.gru = nn.GRU(input_size=1, hidden_size=HIDDEN, batch_first=True)
            self.drop = nn.Dropout(DROPOUT)
            self.head = nn.Sequential(
                nn.Linear(HIDDEN + EMBED_DIM, HIDDEN),
                nn.ReLU(),
                nn.Dropout(DROPOUT),
                nn.Linear(HIDDEN, 1),
            )

        def forward(self, seq, idx):
            _, h = self.gru(seq)          # h: (1, B, HIDDEN)
            h = self.drop(h.squeeze(0))
            x = torch.cat([h, self.emb(idx)], dim=-1)
            return self.head(x)

    return GlobalGRUForecaster()


def run_torch(series: dict, ndc_targets: dict, target_year: int):
    import torch

    torch.manual_seed(SEED)
    np.random.seed(SEED)
    torch.set_num_threads(2)

    # Clean + sort each sector's observed points.
    data: dict[str, list[tuple[int, float]]] = {}
    for sector, points in series.items():
        clean = sorted(
            (int(p["year"]), float(p["value"]))
            for p in (points or [])
            if p.get("value") is not None
        )
        data[sector] = clean

    # A sector is trainable only if it can yield at least one (window -> next) pair.
    train_sectors = [s for s, c in data.items() if len(c) >= WINDOW + 1]
    if not train_sectors:
        preds = {
            s: predict_sector(series.get(s) or [], ndc_targets.get(s, {}), target_year)
            for s in data
        }
        return preds, f"numpy-ols (v{np.__version__})"

    sector_index = {s: i for i, s in enumerate(train_sectors)}
    scaler: dict[str, tuple[float, float]] = {}
    for s in train_sectors:
        vals = np.array([v for _, v in data[s]], dtype=float)
        sd = float(vals.std()) or 1.0
        scaler[s] = (float(vals.mean()), sd)

    # Build training windows in z-scored space.
    x_seq, x_idx, y = [], [], []
    for s in train_sectors:
        mu, sd = scaler[s]
        z = (np.array([v for _, v in data[s]], dtype=float) - mu) / sd
        for i in range(len(z) - WINDOW):
            x_seq.append(z[i : i + WINDOW])
            x_idx.append(sector_index[s])
            y.append(z[i + WINDOW])

    seq_t = torch.tensor(np.array(x_seq), dtype=torch.float32).unsqueeze(-1)
    idx_t = torch.tensor(np.array(x_idx), dtype=torch.long)
    y_t = torch.tensor(np.array(y), dtype=torch.float32).unsqueeze(-1)

    model = _build_torch_model(torch, len(train_sectors))
    opt = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    loss_fn = torch.nn.MSELoss()
    model.train()
    for _ in range(EPOCHS):
        opt.zero_grad()
        loss = loss_fn(model(seq_t, idx_t), y_t)
        loss.backward()
        opt.step()

    # In-sample one-step R^2 per sector (eval mode, dropout off).
    model.eval()
    r2_by_sector: dict[str, float] = {}
    with torch.no_grad():
        for s in train_sectors:
            mu, sd = scaler[s]
            z = (np.array([v for _, v in data[s]], dtype=float) - mu) / sd
            actual, pred = [], []
            for i in range(len(z) - WINDOW):
                inp = torch.tensor(z[i : i + WINDOW], dtype=torch.float32).view(1, WINDOW, 1)
                out = model(inp, torch.tensor([sector_index[s]])).item()
                pred.append(out * sd + mu)
                actual.append(z[i + WINDOW] * sd + mu)
            actual_a, pred_a = np.array(actual), np.array(pred)
            ss_tot = float(((actual_a - actual_a.mean()) ** 2).sum())
            ss_res = float(((actual_a - pred_a) ** 2).sum())
            r2_by_sector[s] = (1.0 - ss_res / ss_tot) if ss_tot > 0 else 1.0

    # Autoregressive rollout to target_year with MC-dropout uncertainty.
    model.train()  # keep dropout active for sampling
    predictions: dict[str, Any] = {}
    for sector, clean in data.items():
        meta = ndc_targets.get(sector, {})
        if sector not in sector_index:
            predictions[sector] = predict_sector(series.get(sector) or [], meta, target_year)
            continue

        mu, sd = scaler[sector]
        z_hist = list((np.array([v for _, v in clean], dtype=float) - mu) / sd)
        last_year = clean[-1][0]
        future_years = list(range(last_year + 1, target_year + 1)) or [target_year]
        idx = torch.tensor([sector_index[sector]])

        samples = np.zeros((MC_SAMPLES, len(future_years)))
        with torch.no_grad():
            for n in range(MC_SAMPLES):
                seq = list(z_hist[-WINDOW:])
                for j in range(len(future_years)):
                    inp = torch.tensor(seq[-WINDOW:], dtype=torch.float32).view(1, WINDOW, 1)
                    out = model(inp, idx).item()
                    samples[n, j] = out
                    seq.append(out)
        samples = samples * sd + mu  # denormalize

        yhat = samples.mean(axis=0)
        lower = np.percentile(samples, 2.5, axis=0)
        upper = np.percentile(samples, 97.5, axis=0)

        history = [{"year": yr, "value": _round(v)} for yr, v in clean]
        forecast = [
            {
                "year": int(future_years[j]),
                "yhat": _round(max(0.0, float(yhat[j]))),
                "lower": _round(max(0.0, float(lower[j]))),
                "upper": _round(max(0.0, float(upper[j]))),
            }
            for j in range(len(future_years))
        ]
        ti = future_years.index(target_year) if target_year in future_years else len(future_years) - 1
        predicted = max(0.0, float(yhat[ti]))
        target_value = meta.get("target")
        gap = predicted - target_value if target_value is not None else None
        gap_pct = (gap / target_value * 100.0) if (target_value not in (None, 0)) else None

        predictions[sector] = {
            "label": meta.get("label"),
            "unit": meta.get("unit", "MtCO2e"),
            "history": history,
            "forecast": forecast,
            "predicted_value": _round(predicted),
            "predicted_lower": _round(max(0.0, float(lower[ti]))),
            "predicted_upper": _round(max(0.0, float(upper[ti]))),
            "target_value": target_value,
            "baseline_value": meta.get("baseline"),
            "gap": _round(gap),
            "gap_pct": _round(gap_pct, 1),
            "status": _status(predicted, target_value),
            "model": "pytorch-gru",
            "r2": _round(r2_by_sector.get(sector), 3),
            "n_points": len(clean),
            "note": None,
        }

    engine = f"pytorch-gru (torch {torch.__version__})"
    return predictions, engine


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"invalid JSON: {exc}"}))
        return

    target_year = int(payload.get("target_year", 2030))
    series = payload.get("series", {}) or {}
    ndc_targets = payload.get("ndc_targets", {}) or {}

    try:
        import torch  # noqa: F401

        predictions, engine = run_torch(series, ndc_targets, target_year)
    except Exception as exc:  # torch missing or any training failure → OLS fallback
        sys.stderr.write(f"[predict] torch path unavailable, using OLS fallback: {exc}\n")
        predictions = {
            sector: predict_sector(points or [], ndc_targets.get(sector, {}), target_year)
            for sector, points in series.items()
        }
        engine = f"numpy-ols (v{np.__version__})"

    counts = {"on_track": 0, "at_risk": 0, "off_track": 0, "unknown": 0, "insufficient_data": 0}
    total_pred = 0.0
    total_target = 0.0
    for result in predictions.values():
        counts[result["status"]] = counts.get(result["status"], 0) + 1
        if result.get("predicted_value") is not None:
            total_pred += result["predicted_value"]
        if result.get("target_value") is not None:
            total_target += result["target_value"]

    summary = {
        **counts,
        "total_predicted": _round(total_pred),
        "total_target": _round(total_target),
        "total_gap": _round(total_pred - total_target),
    }

    print(
        json.dumps(
            {
                "ok": True,
                "engine": engine,
                "target_year": target_year,
                "predictions": predictions,
                "summary": summary,
            }
        )
    )


if __name__ == "__main__":
    main()
