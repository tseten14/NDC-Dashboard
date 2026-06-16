#!/usr/bin/env python3
"""
Audit + rolling-origin backtest for the NDC 2030 forecaster.

Reuses the *actual* model under test (backend/ml/predict_emissions.py): the global
GRU architecture and the OLS baselines. Reads the live per-sector observed series
from a JSON file (default /tmp/series.json, produced from the live API) shaped as:
  { "<sector>": {"history":[{"year","value"}], "target":..., "label":...}, ... }

Outputs:
  * Training verification (loss drop, weight-norm change)
  * MC-dropout activity + interval-width sanity
  * Reproducibility check
  * Rolling-origin one-step backtest: GRU vs Linear vs Log-Linear vs Naive
    (MAE / RMSE / MAPE / R^2, pooled across sectors and origins)
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from predict_emissions import (  # noqa: E402
    _build_torch_model, WINDOW, EPOCHS, LR, _ols,
)

import torch  # noqa: E402

SERIES_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/series.json"


def load_series(path):
    raw = json.load(open(path))
    out = {}
    for sector, obj in raw.items():
        hist = sorted((int(h["year"]), float(h["value"])) for h in obj["history"] if h["value"] is not None)
        out[sector] = hist
    return out


def train_gru(data_upto, seed=42):
    """Train the real global GRU on {sector: [(year,value)]} limited to train years.
    Scaler is fit on TRAINING data only (no leakage). Returns (model, sector_index, scaler)."""
    torch.manual_seed(seed)
    np.random.seed(seed)
    sectors = [s for s, c in data_upto.items() if len(c) >= WINDOW + 1]
    if not sectors:
        return None, None, None
    sector_index = {s: i for i, s in enumerate(sectors)}
    scaler = {}
    for s in sectors:
        v = np.array([x for _, x in data_upto[s]], float)
        scaler[s] = (float(v.mean()), float(v.std()) or 1.0)
    xs, idx, ys = [], [], []
    for s in sectors:
        mu, sd = scaler[s]
        z = (np.array([x for _, x in data_upto[s]], float) - mu) / sd
        for i in range(len(z) - WINDOW):
            xs.append(z[i:i + WINDOW]); idx.append(sector_index[s]); ys.append(z[i + WINDOW])
    seq = torch.tensor(np.array(xs), dtype=torch.float32).unsqueeze(-1)
    ix = torch.tensor(np.array(idx), dtype=torch.long)
    yt = torch.tensor(np.array(ys), dtype=torch.float32).unsqueeze(-1)
    model = _build_torch_model(torch, len(sectors))
    opt = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    lossf = torch.nn.MSELoss()
    model.train()
    loss0 = None
    for e in range(EPOCHS):
        opt.zero_grad()
        loss = lossf(model(seq, ix), yt)
        if e == 0:
            loss0 = loss.item()
        loss.backward(); opt.step()
    return model, sector_index, scaler, loss0, loss.item()


def gru_one_step(model, sector_index, scaler, data_upto, sector):
    """One-step-ahead point forecast (eval mode, dropout off)."""
    if sector not in sector_index:
        return None
    mu, sd = scaler[sector]
    z = list((np.array([x for _, x in data_upto[sector]], float) - mu) / sd)
    model.eval()
    with torch.no_grad():
        inp = torch.tensor(z[-WINDOW:], dtype=torch.float32).view(1, WINDOW, 1)
        out = model(inp, torch.tensor([sector_index[sector]])).item()
    return out * sd + mu


def lin_one_step(data_upto, sector, target_year, log=False):
    pts = data_upto[sector]
    yrs = np.array([y for y, _ in pts], float)
    vals = np.array([v for _, v in pts], float)
    if log and np.any(vals <= 0):
        return None
    fit = _ols(yrs, np.log(vals) if log else vals)
    if not fit.get("ok"):
        return None
    p = fit["a"] + fit["b"] * target_year
    return float(np.exp(p)) if log else float(p)


def metrics(actual, pred):
    a, p = np.array(actual, float), np.array(pred, float)
    mask = ~np.isnan(p)
    a, p = a[mask], p[mask]
    if len(a) == 0:
        return None
    err = p - a
    mae = float(np.mean(np.abs(err)))
    rmse = float(np.sqrt(np.mean(err ** 2)))
    mape = float(np.mean(np.abs(err / a)) * 100)
    ss_tot = float(((a - a.mean()) ** 2).sum())
    r2 = float(1 - (err ** 2).sum() / ss_tot) if ss_tot > 0 else float("nan")
    return dict(n=len(a), mae=mae, rmse=rmse, mape=mape, r2=r2)


def main():
    data = load_series(SERIES_PATH)
    sectors = list(data)
    n = len(next(iter(data.values())))
    print(f"=== DATA ===\nsectors={sectors}\npoints/sector={n}\n")

    # ---- Training verification + MC-dropout + reproducibility on full data ----
    print("=== TRAINING VERIFICATION (full data) ===")
    m1, si, sc, l0, lf = train_gru(data, seed=42)
    w_after = torch.cat([p.flatten() for p in m1.parameters()]).detach().clone()
    # fresh init norm for comparison
    torch.manual_seed(42); np.random.seed(42)
    m_init = _build_torch_model(torch, len(si))
    w_init = torch.cat([p.flatten() for p in m_init.parameters()]).detach()
    print(f"initial loss={l0:.5f}  final loss={lf:.6f}  loss drop={(1-lf/l0)*100:.1f}%")
    print(f"param count={w_after.numel()}  ||w_init||={w_init.norm():.3f}  ||w_trained||={w_after.norm():.3f}  Δ={ (w_after-w_init[:w_after.numel()]).norm():.3f}")

    # MC-dropout activity: variance of stochastic forward passes (train mode)
    m1.train()
    s = sectors[0]
    mu, sd = sc[s]
    z = list((np.array([x for _, x in data[s]], float) - mu) / sd)
    inp = torch.tensor(z[-WINDOW:], dtype=torch.float32).view(1, WINDOW, 1)
    with torch.no_grad():
        draws = np.array([m1(inp, torch.tensor([si[s]])).item() for _ in range(300)]) * sd + mu
    print(f"MC-dropout draws[{s}]: mean={draws.mean():.3f} std={draws.std():.4f} "
          f"-> 80% width={np.percentile(draws,90)-np.percentile(draws,10):.4f} "
          f"({(np.percentile(draws,90)-np.percentile(draws,10))/draws.mean()*100:.1f}% of mean)")

    # Reproducibility: retrain + re-predict, compare
    m2, si2, sc2, _, _ = train_gru(data, seed=42)
    m2.eval()
    diffs = []
    for sec in sectors:
        a = gru_one_step(m1, si, sc, data, sec)
        b = gru_one_step(m2, si2, sc2, data, sec)
        if a is not None and b is not None:
            diffs.append(abs(a - b))
    print(f"reproducibility max |Δ| across sectors (eval one-step) = {max(diffs):.2e}\n")

    # ---- forecast vs naive (persistence) closeness on full data, eval mode ----
    print("=== FORECAST vs PERSISTENCE (full-data one-step, eval) ===")
    for sec in sectors:
        g = gru_one_step(m1, si, sc, data, sec)
        last = data[sec][-1][1]
        print(f"{sec:12s} last={last:.2f}  GRU_next={g:.2f}  Δvs_last={g-last:+.2f}")
    print()

    # ---- Rolling-origin backtest ----
    print("=== ROLLING-ORIGIN BACKTEST (one-step-ahead) ===")
    origins = list(range(WINDOW + 1, n))  # need >=WINDOW+1 training points for GRU
    results = {k: {"actual": [], "pred": []} for k in ["GRU", "Linear", "LogLinear", "Naive"]}
    per_origin = []
    for k in origins:
        # training data = first k points (years index 0..k-1), predict index k
        data_tr = {s: data[s][:k] for s in sectors}
        target_year = data[sectors[0]][k][0]
        gm = train_gru(data_tr, seed=42)
        gmodel, gsi, gsc = gm[0], gm[1], gm[2]
        row = {"origin_year": target_year}
        for sec in sectors:
            actual = data[sec][k][1]
            tyr = data[sec][k][0]
            g = gru_one_step(gmodel, gsi, gsc, data_tr, sec) if gmodel is not None else None
            lin = lin_one_step(data_tr, sec, tyr, log=False)
            llog = lin_one_step(data_tr, sec, tyr, log=True)
            naive = data_tr[sec][-1][1]
            for name, val in [("GRU", g), ("Linear", lin), ("LogLinear", llog), ("Naive", naive)]:
                results[name]["actual"].append(actual)
                results[name]["pred"].append(val if val is not None else np.nan)
            row[sec] = dict(actual=round(actual, 2), gru=None if g is None else round(g, 2),
                            lin=None if lin is None else round(lin, 2), naive=round(naive, 2))
        per_origin.append(row)

    print(f"origins (target years): {[data[sectors[0]][k][0] for k in origins]}  "
          f"-> {len(results['GRU']['actual'])} eval points\n")
    print(f"{'Model':12s} {'n':>4s} {'MAE':>8s} {'RMSE':>8s} {'MAPE%':>8s} {'R2':>8s}")
    for name in ["GRU", "Linear", "LogLinear", "Naive"]:
        mtr = metrics(results[name]["actual"], results[name]["pred"])
        if mtr:
            print(f"{name:12s} {mtr['n']:>4d} {mtr['mae']:>8.3f} {mtr['rmse']:>8.3f} {mtr['mape']:>8.2f} {mtr['r2']:>8.3f}")

    print("\n=== PER-ORIGIN DETAIL (actual / gru / linear / naive) ===")
    for row in per_origin:
        ty = row.pop("origin_year")
        print(f"-- predict {ty}:")
        for sec, d in row.items():
            print(f"   {sec:12s} actual={d['actual']:>7} gru={str(d['gru']):>7} lin={str(d['lin']):>7} naive={d['naive']:>7}")


if __name__ == "__main__":
    main()
