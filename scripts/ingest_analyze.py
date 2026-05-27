#!/usr/bin/env python3
"""
Accurate tabular ingest analysis for NDC Data Explorer.
Reads JSON from stdin, writes JSON to stdout.

Input:
  { "csv_text": "..." }  OR  { "rows": [ {...}, ... ], "filename": "x.csv" }

Uses pandas/numpy for type inference, numeric coercion, and correct aggregations.
"""
from __future__ import annotations

import json
import re
import sys
from io import StringIO
from typing import Any

import numpy as np
import pandas as pd

# ── Column detection candidates ────────────────────────────────────────────────
# NDC data uses many non-standard column names — we match on substrings too.

YEAR_CANDIDATES = [
    "year", "target_year", "base_year", "baseline_year", "reporting_year",
    "period_end", "inventory_year", "calendar_year", "reference_year",
    "ndc_year", "fiscal_year",
]
SECTOR_CANDIDATES = [
    "sector", "main_sector", "sector_name", "sector_id", "category",
    "ghg_sector", "ipcc_sector", "ghg_category", "subsector", "sub_sector",
    "sector_target",
]
VALUE_CANDIDATES = [
    "value_mtco2e", "value", "emissions", "emission", "mtco2e", "co2e",
    "amount", "quantity", "total", "reduction", "target_value", "ndc_target",
    "baseline_emissions", "baseline", "bau_emissions", "bau",
    "projected_emissions", "mitigation", "ghg_reduction",
    "unconditional", "conditional", "absolute_reduction",
    "percent_reduction", "reduction_pct", "target_mtco2e",
    "ghg_emissions", "net_emissions", "gross_emissions",
]
DISTRICT_CANDIDATES = [
    "district", "region", "subnational", "admin1", "location",
    "province", "county", "municipality",
]

# Patterns for NDC-specific numeric columns (used for additional insights)
NDC_TARGET_PATTERNS: dict[str, list[str]] = {
    "unconditional": ["unconditional", "uncond"],
    "conditional": ["conditional", "cond"],
    "baseline": ["baseline", "base_year_emission", "reference_emission"],
    "bau": ["bau", "business_as_usual", "business-as-usual"],
    "reduction_pct": ["percent_reduction", "reduction_pct", "reduce_pct", "pct_reduction"],
    "absolute_reduction": ["absolute_reduction", "abs_reduction", "reduction_mt"],
}

NATIONAL_TOKENS = frozenset(
    {"national", "country", "uganda", "all", "total", "nationwide", "n/a", "na", ""}
)

SECTOR_LABELS = {
    "afolu": "Forests & land use (AFOLU)",
    "energy": "Energy",
    "ippu": "Industry & processes (IPPU)",
    "agriculture": "Agriculture",
    "waste": "Waste",
    "transport": "Transport",
    "power": "Electricity & power",
    "buildings": "Buildings",
    "manufacturing": "Manufacturing",
    "forestry": "Forestry",
}

# Columns that look numeric but are IDs / codes, not values
ID_LIKE_PATTERNS = ["_id", "_code", "iso", "fips", "gadm", "rank", "order", "index"]


def detect_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lower_map = {str(c).lower(): c for c in df.columns}
    for cand in candidates:
        if cand in lower_map:
            return lower_map[cand]
    for col in df.columns:
        cl = str(col).lower()
        for cand in candidates:
            if cand in cl:
                return col
    return None


def _is_id_like(col: str) -> bool:
    cl = str(col).lower()
    return any(p in cl for p in ID_LIKE_PATTERNS)


def detect_best_numeric_column(
    df: pd.DataFrame, used_cols: list[str | None]
) -> str | None:
    """
    Fallback: find the non-key numeric column with the highest fill rate.
    Used when no VALUE_CANDIDATES pattern matches.
    """
    used = {c for c in used_cols if c}
    best_col: str | None = None
    best_score = 0.0
    for col in df.columns:
        if col in used or _is_id_like(col):
            continue
        num = coerce_numeric(df[col])
        fill = float(num.notna().mean())
        if fill < 0.05:
            continue
        # Prefer columns with variance (not all-same-value identifiers)
        std = float(num.std()) if num.notna().sum() > 1 else 0.0
        score = fill + (0.1 if std > 0 else 0.0)
        if score > best_score:
            best_score = score
            best_col = col
    return best_col


def detect_ndc_columns(df: pd.DataFrame, used_cols: list[str | None]) -> dict[str, str]:
    """
    Find NDC-specific numeric columns (conditional, unconditional, baseline, etc.)
    that are separate from the primary value column.
    """
    used = {c for c in used_cols if c}
    found: dict[str, str] = {}
    for key, patterns in NDC_TARGET_PATTERNS.items():
        for col in df.columns:
            if col in used or col in found.values():
                continue
            cl = str(col).lower().replace(" ", "_")
            if any(p in cl for p in patterns):
                num = coerce_numeric(df[col])
                if float(num.notna().mean()) > 0.05:
                    found[key] = col
                    break
    return found


def coerce_numeric(series: pd.Series) -> pd.Series:
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce")
    s = series.astype(str).str.strip()
    s = s.replace({"": np.nan, "nan": np.nan, "None": np.nan, "null": np.nan})
    s = s.str.replace(",", "", regex=False)
    s = s.str.replace(r"[^\d.\-eE+]", "", regex=True)
    return pd.to_numeric(s, errors="coerce")


def coerce_year(series: pd.Series) -> pd.Series:
    if pd.api.types.is_datetime64_any_dtype(series):
        return series.dt.year.astype("Int64")
    num = coerce_numeric(series)
    if num.notna().mean() > 0.7:
        years = num.round()
        if years.dropna().between(1900, 2100).all():
            return years.astype("Int64")
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce").round().astype("Int64")
    parsed = pd.to_datetime(series, errors="coerce", utc=False)
    if parsed.notna().mean() > 0.5:
        return parsed.dt.year.astype("Int64")
    extracted = series.astype(str).str.extract(r"(19\d{2}|20\d{2}|2100)", expand=False)
    return pd.to_numeric(extracted, errors="coerce").astype("Int64")


def infer_column_type(series: pd.Series) -> str:
    non_null = series.dropna()
    if len(non_null) == 0:
        return "string"
    if pd.api.types.is_numeric_dtype(series):
        return "number"
    num = coerce_numeric(series)
    if num.notna().mean() >= 0.8:
        return "number"
    yr = coerce_year(series)
    if yr.notna().mean() >= 0.8 and yr.dropna().between(1900, 2100).all():
        return "date"
    boolish = non_null.astype(str).str.lower().isin(["true", "false", "yes", "no"])
    if boolish.mean() >= 0.8:
        return "boolean"
    return "string"


def profile_columns(df: pd.DataFrame) -> list[dict[str, Any]]:
    out = []
    n = len(df)
    for col in df.columns:
        s = df[col]
        nulls = int(s.isna().sum() + (s.astype(str).str.strip() == "").sum())
        nulls = min(nulls, n)
        ctype = infer_column_type(s)
        entry: dict[str, Any] = {
            "name": str(col),
            "type": ctype,
            "nulls": nulls,
            "total": n,
            "null_ratio": round(nulls / max(n, 1), 3),
            "stats": None,
        }
        if ctype == "number":
            nums = coerce_numeric(s).dropna()
            if len(nums):
                entry["stats"] = {
                    "count": int(len(nums)),
                    "min": round(float(nums.min()), 4),
                    "max": round(float(nums.max()), 4),
                    "mean": round(float(nums.mean()), 4),
                }
        out.append(entry)
    return out


def infer_value_unit(value_col: str | None) -> str:
    if not value_col:
        return ""
    lc = value_col.lower()
    if "mtco2" in lc or "mt_co2" in lc:
        return "Mt CO₂e"
    if "tco2" in lc or "tonnes" in lc or "tons" in lc:
        return "t CO₂e"
    if "co2" in lc or "emission" in lc or "ghg" in lc:
        return "CO₂e"
    if "percent" in lc or lc.endswith("_pct") or lc == "pct" or "reduction_pct" in lc:
        return "%"
    return ""


def sector_label(name: str) -> str:
    key = str(name).strip().lower()
    return SECTOR_LABELS.get(key, str(name).strip())


def filter_national_rows(
    df: pd.DataFrame, district_col: str | None
) -> tuple[pd.DataFrame, str | None]:
    if not district_col or district_col not in df.columns:
        return df, None
    d = df[district_col].astype(str).str.strip().str.lower()
    has_national = d.isin(NATIONAL_TOKENS).any()
    has_sub = (~d.isin(NATIONAL_TOKENS)).any()
    if has_national and has_sub:
        mask = d.isin(NATIONAL_TOKENS)
        filtered = df.loc[mask].copy()
        if len(filtered) > 0:
            return filtered, (
                "Charts use national-level rows only; district-level rows were excluded "
                "to avoid counting the same emissions twice."
            )
    return df, None


def round_val(x: float) -> float:
    if abs(x) >= 1000:
        return round(x, 2)
    if abs(x) >= 1:
        return round(x, 4)
    return round(x, 6)


def build_sector_bar(
    df: pd.DataFrame,
    sector_col: str,
    value_col: str,
    year_col: str | None,
) -> tuple[list[dict], str | None]:
    work = df[[sector_col, value_col] + ([year_col] if year_col else [])].copy()
    work[value_col] = coerce_numeric(work[value_col])
    work = work.dropna(subset=[sector_col, value_col])
    work[sector_col] = work[sector_col].astype(str).str.strip().str.lower()

    note = None
    if year_col and year_col in work.columns:
        work[year_col] = coerce_year(work[year_col])
        work = work.dropna(subset=[year_col])
        n_years = work[year_col].nunique()
        if n_years > 1:
            latest = int(work[year_col].max())
            work = work.loc[work[year_col] == latest]
            note = (
                f"Sector chart shows the latest year in the file ({latest}) only, "
                "so sectors are not summed across multiple years."
            )

    agg = work.groupby(sector_col, observed=True)[value_col].sum().sort_values(ascending=False)
    bars = [
        {
            "name": str(idx),
            "label": sector_label(str(idx)),
            "total": round_val(float(val)),
        }
        for idx, val in agg.items()
    ]
    return bars[:12], note


def build_time_series(
    df: pd.DataFrame,
    year_col: str,
    value_col: str,
    sector_col: str | None,
    district_col: str | None,
) -> tuple[list[dict], str | None]:
    cols = [year_col, value_col]
    if sector_col:
        cols.append(sector_col)
    if district_col:
        cols.append(district_col)

    work = df[cols].copy()
    work[value_col] = coerce_numeric(work[value_col])
    work[year_col] = coerce_year(work[year_col])
    work = work.dropna(subset=[year_col, value_col])

    note = None
    if sector_col and sector_col in work.columns:
        n_sector_per_year = work.groupby(year_col)[sector_col].nunique().max()
        if n_sector_per_year and n_sector_per_year > 1:
            note = (
                "The trend line sums all sectors for each year — "
                "this represents an estimated national total from the file."
            )

    agg = work.groupby(year_col, observed=True)[value_col].sum().sort_index()
    series = [
        {"year": int(yr), "total": round_val(float(val))}
        for yr, val in agg.items()
        if 1900 <= int(yr) <= 2100
    ]
    return series, note


def build_null_chart(df: pd.DataFrame) -> list[dict]:
    n = len(df)
    rows = []
    for col in df.columns:
        s = df[col]
        nulls = int(s.isna().sum())
        if s.dtype == object:
            nulls += int((s.astype(str).str.strip() == "").sum())
        nulls = min(nulls, n)
        rows.append({"name": str(col), "null_pct": round(100 * nulls / max(n, 1), 1)})
    rows.sort(key=lambda x: x["null_pct"], reverse=True)
    return rows[:10]


def check_duplicates(
    df: pd.DataFrame,
    year_col: str | None,
    sector_col: str | None,
    district_col: str | None,
) -> list[str]:
    warnings = []
    keys = [c for c in [year_col, sector_col, district_col] if c and c in df.columns]
    if len(keys) >= 2:
        dup_mask = df.duplicated(subset=keys, keep=False)
        n_dup = int(dup_mask.sum())
        if n_dup > 0:
            warnings.append(
                f"{n_dup} row(s) share the same {' + '.join(keys)} combination; "
                "duplicate keys were summed in aggregations."
            )
    return warnings


def count_duplicate_rows(
    df: pd.DataFrame,
    year_col: str | None,
    sector_col: str | None,
    district_col: str | None,
) -> int:
    keys = [c for c in [year_col, sector_col, district_col] if c and c in df.columns]
    if len(keys) < 2:
        return 0
    dup_mask = df.duplicated(subset=keys, keep=False)
    return int(dup_mask.sum())


def build_ndc_insights(
    df: pd.DataFrame,
    ndc_cols: dict[str, str],
    year_col: str | None,
    sector_col: str | None,
    value_col: str | None,
    value_is_fallback: bool,
) -> list[str]:
    """Generate NDC-specific insights when NDC target columns are detected."""
    lines = []

    if year_col:
        years = coerce_year(df[year_col]).dropna().unique()
        target_years = sorted([int(y) for y in years if 2020 <= y <= 2100])
        base_years = sorted([int(y) for y in years if 1990 <= y < 2020])
        if target_years:
            lines.append(
                f"NDC target year(s): {', '.join(str(y) for y in target_years)}."
            )
        if base_years:
            lines.append(
                f"Reference / baseline year(s) in the file: {', '.join(str(y) for y in base_years)}."
            )

    if sector_col:
        sectors = (
            df[sector_col].dropna().astype(str).str.strip()
            .loc[lambda s: s != ""].unique()
        )
        sector_list = ", ".join(str(s) for s in sectors[:8])
        suffix = "…" if len(sectors) > 8 else ""
        lines.append(
            f"Covers {len(sectors)} sector(s): {sector_list}{suffix}."
        )

    if "unconditional" in ndc_cols:
        col = ndc_cols["unconditional"]
        vals = coerce_numeric(df[col]).dropna()
        if len(vals):
            total = round_val(float(vals.sum()))
            unit = infer_value_unit(col)
            unit_str = f" {unit}" if unit else ""
            lines.append(
                f"Unconditional targets ({col}): combined total {total}{unit_str} "
                "— Uganda's commitment without external finance."
            )

    if "conditional" in ndc_cols:
        col = ndc_cols["conditional"]
        vals = coerce_numeric(df[col]).dropna()
        if len(vals):
            total = round_val(float(vals.sum()))
            unit = infer_value_unit(col)
            unit_str = f" {unit}" if unit else ""
            lines.append(
                f"Conditional targets ({col}): combined total {total}{unit_str} "
                "— achievable with international climate finance."
            )

    if "baseline" in ndc_cols and (
        "unconditional" in ndc_cols or "conditional" in ndc_cols
    ):
        lines.append(
            "Baseline and target columns are both present — "
            "this file supports reduction-vs-baseline calculations."
        )

    if "bau" in ndc_cols:
        col = ndc_cols["bau"]
        vals = coerce_numeric(df[col]).dropna()
        if len(vals):
            total = round_val(float(vals.sum()))
            lines.append(
                f"Business-as-usual (BAU) projections ({col}): {total} total. "
                "NDC targets are measured against this reference scenario."
            )

    if "reduction_pct" in ndc_cols:
        col = ndc_cols["reduction_pct"]
        vals = coerce_numeric(df[col]).dropna()
        if len(vals):
            mean_pct = round(float(vals.mean()), 1)
            lines.append(
                f"Percentage-reduction column ({col}) averages {mean_pct}% across rows."
            )

    if value_is_fallback and value_col and not ndc_cols:
        lines.append(
            "No standard emissions column was found; charts use column "
            + value_col +
            " as the best available numeric column. Rename it to value or emissions for cleaner detection."
        )

    return lines


def build_insights(
    df: pd.DataFrame,
    columns: list[dict],
    year_col: str | None,
    sector_col: str | None,
    value_col: str | None,
    district_col: str | None,
    time_series: list[dict],
    sector_bar: list[dict],
    validation_notes: list[str],
    ndc_cols: dict[str, str] | None,
    value_is_fallback: bool,
) -> list[str]:
    lines = [
        f"Your file has {len(df)} rows and {len(df.columns)} columns (analysed with pandas).",
    ]

    if ndc_cols:
        ndc_lines = build_ndc_insights(
            df, ndc_cols, year_col, sector_col, value_col, value_is_fallback
        )
        lines.extend(ndc_lines)
    else:
        if value_col:
            unit = infer_value_unit(value_col)
            if unit:
                lines.append(f"Values are read from {value_col} in {unit}.")
        if year_col and value_col:
            lines.append(
                f"Trends use {year_col} on the horizontal axis and {value_col} for amounts."
            )
        if sector_col and sector_bar:
            lines.append(
                f"Sector comparison uses {sector_col} with {len(sector_bar)} sector(s) shown."
            )
        if time_series and len(time_series) >= 2:
            first, last = time_series[0], time_series[-1]
            delta = last["total"] - first["total"]
            direction = "rose" if delta >= 0 else "fell"
            pct = ""
            if first["total"]:
                pct_val = abs(100 * delta / first["total"])
                pct = f", about {pct_val:.1f}% over the period"
            lines.append(
                f"Between {first['year']} and {last['year']}, the annual total {direction} "
                f"by {abs(delta):g}{pct}."
            )

    for note in validation_notes[:2]:
        lines.append(note)
    return lines


def build_highlights(
    time_series: list[dict],
    sector_bar: list[dict],
    value_col: str | None,
    unit: str,
    ndc_cols: dict[str, str],
    df: pd.DataFrame,
) -> list[dict]:
    highlights = []

    if "unconditional" in ndc_cols:
        col = ndc_cols["unconditional"]
        vals = coerce_numeric(df[col]).dropna()
        if len(vals):
            col_unit = infer_value_unit(col)
            highlights.append(
                {
                    "label": "Total unconditional NDC target",
                    "value": f"{round_val(float(vals.sum()))}{(' ' + col_unit) if col_unit else ''}",
                    "note": "Sum of '" + col + "' — Uganda's commitment without external finance.",
                }
            )
    elif time_series:
        peak = max(time_series, key=lambda x: x["total"])
        highlights.append(
            {
                "label": "Highest annual total in the file",
                "value": f"{peak['year']}: {peak['total']}{(' ' + unit) if unit else ''}",
                "note": "Sum of all rows for that year after numeric cleaning.",
            }
        )

    if "conditional" in ndc_cols:
        col = ndc_cols["conditional"]
        vals = coerce_numeric(df[col]).dropna()
        if len(vals):
            col_unit = infer_value_unit(col)
            highlights.append(
                {
                    "label": "Total conditional NDC target",
                    "value": f"{round_val(float(vals.sum()))}{(' ' + col_unit) if col_unit else ''}",
                    "note": "From '" + col + "' — achievable with international support.",
                }
            )
    elif sector_bar:
        top = sector_bar[0]
        highlights.append(
            {
                "label": "Largest sector in the chart",
                "value": f"{top['label']}: {top['total']}{(' ' + unit) if unit else ''}",
                "note": "Based on grouped sums (see sector chart note for the year scope).",
            }
        )

    return highlights


def build_chart_guides(
    sector_bar: list[dict],
    time_series: list[dict],
    null_chart: list[dict],
    sector_note: str | None,
    time_note: str | None,
) -> list[dict]:
    guides = []
    if sector_bar:
        guides.append(
            {
                "id": "sector_bar",
                "title": "Emissions or values by sector",
                "what": "Each bar is the total of the value column for one sector.",
                "how_to_read": sector_note
                or "Taller bars mean a larger share for that sector in the chosen scope.",
            }
        )
    if time_series:
        guides.append(
            {
                "id": "year_timeline",
                "title": "Change over time",
                "what": "Each point is the sum of all rows for that calendar year.",
                "how_to_read": time_note
                or "An upward line means annual totals increased; downward means they decreased.",
            }
        )
    if null_chart:
        guides.append(
            {
                "id": "null_chart",
                "title": "Missing data by column",
                "what": "Shows the percentage of empty cells per column.",
                "how_to_read": "Columns above 50% empty may need cleanup before official reporting.",
            }
        )
    return guides


def infer_ndc_doc_type(
    df: pd.DataFrame,
    ndc_cols: dict[str, str],
    year_col: str | None,
    sector_col: str | None,
    value_col: str | None,
) -> tuple[str, str]:
    """Return (doc_type, doc_type_plain) for the about section."""
    cols_str = " ".join(str(c).lower() for c in df.columns)

    if "unconditional" in ndc_cols or "conditional" in ndc_cols:
        return "NDC mitigation targets", "NDC mitigation targets"
    if "bau" in ndc_cols and (year_col or sector_col):
        return "BAU scenario & projections", "Business-as-usual scenario"
    if "baseline" in ndc_cols and sector_col:
        return "Emissions baseline data", "Emissions baseline data"
    if any(t in cols_str for t in ["mitigation", "ghg_reduction", "co2", "emission"]):
        if sector_col:
            return "GHG emissions by sector", "GHG emissions by sector"
    if year_col and value_col:
        return "Structured data (time series candidate)", "Spreadsheet-style data file"
    return "Tabular dataset", "Data table"


def build_ndc_description(
    df: pd.DataFrame,
    ndc_cols: dict[str, str],
    doc_type: str,
    year_col: str | None,
    sector_col: str | None,
    col_bits: list[str],
) -> str:
    """Produce a clear plain-English description of what the file contains."""
    base = f"This table was analysed with pandas. "

    if doc_type == "NDC mitigation targets":
        sector_count = (
            int(df[sector_col].dropna().nunique()) if sector_col else 0
        )
        parts = []
        if sector_count:
            parts.append(f"{sector_count} sector(s)")
        if year_col:
            years = coerce_year(df[year_col]).dropna().unique()
            target_yrs = sorted([int(y) for y in years if 2020 <= y <= 2100])
            if target_yrs:
                parts.append(f"target year(s) {', '.join(str(y) for y in target_yrs)}")
        target_types = []
        if "unconditional" in ndc_cols:
            target_types.append("unconditional")
        if "conditional" in ndc_cols:
            target_types.append("conditional")
        if target_types:
            parts.append(f"{' and '.join(target_types)} reduction targets")
        desc = "NDC mitigation targets"
        if parts:
            desc += f" — covering {', '.join(parts)}"
        return base + desc + "."

    if col_bits:
        return base + f"We recognised: {', '.join(col_bits)}."
    return base + "Some expected columns (year, value) were not found — see recommendations below."


def build_recommendations(
    df: pd.DataFrame,
    columns: list[dict],
    year_col: str | None,
    sector_col: str | None,
    value_col: str | None,
    value_is_fallback: bool,
    ndc_cols: dict[str, str],
    doc_type: str,
) -> list[str]:
    recs = []
    incomplete = [c for c in columns if c["null_ratio"] >= 0.5]

    if doc_type == "NDC mitigation targets":
        # NDC-specific, actionable recommendations
        if "unconditional" not in ndc_cols and "conditional" not in ndc_cols:
            recs.append(
                "Add columns named 'unconditional_mtco2e' and 'conditional_mtco2e' to "
                "enable Uganda NDC target charts in the dashboard."
            )
        if not year_col:
            recs.append(
                "Add a 'target_year' column (e.g. 2030) so sector targets can be "
                "filtered by reporting period."
            )
        if incomplete:
            names = ", ".join(c["name"] for c in incomplete[:3])
            recs.append(
                f"{len(incomplete)} column(s) are more than half empty ({names}). "
                "These may be optional target types — fill or remove them before "
                "publishing to the indicator dashboard."
            )
        if not recs:
            recs.append(
                "Schema looks complete. Use the 'Import to database' tab to link each "
                "sector row to its NDC indicator in the tracking framework."
            )
        return recs

    # Generic tabular recommendations
    if incomplete:
        names = ", ".join(c["name"] for c in incomplete[:3])
        recs.append(
            f"{len(incomplete)} column(s) are more than half empty ({names}). "
            "Fill gaps before using this in official reports."
        )
    if not year_col:
        recs.append(
            'Add a "year" (or target_year / reporting_year) column to enable trend charts.'
        )
    if not value_col:
        recs.append(
            'Add a numeric "value", "emissions", or "unconditional_mtco2e" column '
            "for emissions or NDC indicator values."
        )
    elif value_is_fallback:
        recs.append(
            f'Column [{value_col}] was used as the value column by best-guess. '
            "Rename it to 'value' or 'emissions' for reliable detection."
        )
    if not sector_col:
        recs.append(
            "Add a sector column (energy, afolu, agriculture, etc.) to enable "
            "sector breakdown charts."
        )
    if not recs:
        recs.append(
            "Schema looks usable — map columns to NDC indicators in the structured import tab."
        )
    return recs


def analyze_dataframe(df: pd.DataFrame, filename: str) -> dict[str, Any]:
    if df.empty or len(df.columns) == 0:
        raise ValueError("No usable rows or columns")

    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    # Primary column detection
    year_col = detect_column(df, YEAR_CANDIDATES)
    sector_col = detect_column(df, SECTOR_CANDIDATES)
    value_col = detect_column(df, VALUE_CANDIDATES)
    district_col = detect_column(df, DISTRICT_CANDIDATES)

    # Fallback: if no value col, pick the best available numeric column
    value_is_fallback = False
    if value_col is None:
        value_col = detect_best_numeric_column(df, [year_col, sector_col, district_col])
        if value_col is not None:
            value_is_fallback = True

    # Find NDC-specific target columns (additional to primary value col)
    ndc_cols = detect_ndc_columns(df, [year_col, sector_col, district_col, value_col])

    # If primary value_col is one of the NDC cols, remove it from ndc_cols to avoid duplication
    if value_col:
        ndc_cols = {k: v for k, v in ndc_cols.items() if v != value_col}

    validation_notes: list[str] = []
    chart_df, national_note = filter_national_rows(df, district_col)
    if national_note:
        validation_notes.append(national_note)

    warnings = check_duplicates(chart_df, year_col, sector_col, district_col)
    duplicate_key_rows = count_duplicate_rows(chart_df, year_col, sector_col, district_col)

    columns = profile_columns(df)
    unit = infer_value_unit(value_col)
    value_coercion_failures = 0
    if value_col and value_col in df.columns:
        src = df[value_col]
        coerced = coerce_numeric(src)
        src_non_empty = src.notna() & (src.astype(str).str.strip() != "")
        value_coercion_failures = int((src_non_empty & coerced.isna()).sum())

    # For NDC targets, prefer the first non-fallback numeric column for the sector bar
    # if the primary value col has very low fill rate
    chart_value_col = value_col
    if value_col and value_is_fallback and ndc_cols:
        # Use the first NDC col with best fill rate for charts
        best_ndc = max(
            ndc_cols.items(),
            key=lambda kv: float(coerce_numeric(df[kv[1]]).notna().mean()),
        )
        chart_value_col = best_ndc[1]
        unit = infer_value_unit(chart_value_col)

    sector_bar, sector_note = (
        build_sector_bar(chart_df, sector_col, chart_value_col, year_col)
        if sector_col and chart_value_col
        else ([], None)
    )
    time_series, time_note = (
        build_time_series(chart_df, year_col, chart_value_col, sector_col, district_col)
        if year_col and chart_value_col
        else ([], None)
    )
    if sector_note:
        validation_notes.append(sector_note)
    if time_note:
        validation_notes.append(time_note)

    null_chart = build_null_chart(df)

    # Only include null chart if there is meaningful missing-data signal
    # (skip it when the main charts are present and null chart would just repeat what's obvious)
    show_null_chart = not (sector_bar and time_series) or any(
        r["null_pct"] >= 50 for r in null_chart
    )

    insights = build_insights(
        df, columns, year_col, sector_col, chart_value_col or value_col,
        district_col, time_series, sector_bar, validation_notes,
        ndc_cols, value_is_fallback,
    )
    highlights = build_highlights(
        time_series, sector_bar, chart_value_col or value_col, unit, ndc_cols, df
    )
    chart_guides = build_chart_guides(
        sector_bar, time_series,
        null_chart if show_null_chart else [],
        sector_note, time_note,
    )

    doc_type, doc_type_plain = infer_ndc_doc_type(
        df, ndc_cols, year_col, sector_col, value_col
    )

    col_bits = []
    if year_col:
        col_bits.append("year ('" + year_col + "')")
    if chart_value_col or value_col:
        col_bits.append("value ('" + (chart_value_col or value_col) + "')")
    if sector_col:
        col_bits.append("sector ('" + sector_col + "')")
    if district_col:
        col_bits.append("location ('" + district_col + "')")

    recommendations = build_recommendations(
        df, columns, year_col, sector_col, value_col,
        value_is_fallback, ndc_cols, doc_type,
    )

    description = build_ndc_description(
        df, ndc_cols, doc_type, year_col, sector_col, col_bits
    )

    ndc_col_summary: dict[str, str | None] = {
        k: v for k, v in {
            "unconditional": ndc_cols.get("unconditional"),
            "conditional": ndc_cols.get("conditional"),
            "baseline": ndc_cols.get("baseline"),
            "bau": ndc_cols.get("bau"),
            "reduction_pct": ndc_cols.get("reduction_pct"),
        }.items() if v is not None
    }

    sample = df.head(5).replace({np.nan: None}).to_dict(orient="records")

    return {
        "ok": True,
        "engine": "pandas",
        "pandas_version": pd.__version__,
        "rows": int(len(df)),
        "columns": columns,
        "sample": sample,
        "warnings": warnings,
        "qc": {
            "rows_input": int(len(df)),
            "rows_used_for_charts": int(len(chart_df)),
            "rows_dropped_non_national": int(max(0, len(df) - len(chart_df))),
            "duplicate_key_rows": int(duplicate_key_rows),
            "value_coercion_failures": int(value_coercion_failures),
        },
        "validation": {
            "notes": validation_notes,
            "year_column": year_col,
            "value_column": chart_value_col or value_col,
            "value_is_fallback": value_is_fallback,
            "sector_column": sector_col,
            "district_column": district_col,
            "value_unit": unit,
            "ndc_columns": ndc_col_summary,
            "aggregation_engine": "pandas_groupby",
        },
        "about": {
            "title": re.sub(r"\.[^.]+$", "", filename).replace("-", " ").replace("_", " "),
            "doc_type": doc_type,
            "doc_type_plain": doc_type_plain,
            "description": description,
            "purpose": _doc_purpose(doc_type),
            "detected_columns": {
                "year": year_col,
                "value": chart_value_col or value_col,
                "sector": sector_col,
                "district": district_col,
            },
            "detected_columns_plain": {
                "year": ("Years are in '" + year_col + "'") if year_col else "No year column found",
                "value": (
                    ("Values are in '" + (chart_value_col or value_col) + "'")
                    if (chart_value_col or value_col)
                    else "No value column found"
                ),
                "sector": ("Sectors are in '" + sector_col + "'") if sector_col else "No sector column",
                "district": (
                    ("Locations are in '" + district_col + "'")
                    if district_col
                    else "No district/region column"
                ),
            },
            "ndc_columns_detected": ndc_col_summary,
            "shape": {"rows": int(len(df)), "columns": int(len(df.columns))},
        },
        "analysis": {
            "mode": "tabular",
            "presentation": "bullets",
            "overview": _analysis_overview(doc_type, bool(sector_bar), bool(time_series)),
            "insights": insights,
            "highlights": highlights,
            "chart_guides": chart_guides,
            "value_unit": unit,
            "visuals": {
                "sector_bar": sector_bar,
                "time_series": time_series,
                "null_chart": null_chart if show_null_chart else [],
            },
        },
        "recommendations": recommendations,
    }


def _doc_purpose(doc_type: str) -> str:
    purposes = {
        "NDC mitigation targets": (
            "Feeds the NDC cockpit dashboard — shows per-sector conditional and "
            "unconditional reduction commitments against Uganda's 2030 targets."
        ),
        "BAU scenario & projections": (
            "Provides the business-as-usual baseline against which NDC reductions are measured."
        ),
        "Emissions baseline data": (
            "Establishes the reference year emissions from which reduction targets are calculated."
        ),
        "GHG emissions by sector": (
            "Can be imported to update sector-level emissions indicators and track progress over time."
        ),
        "Structured data (time series candidate)": (
            "Can be imported to update indicators and track progress over time."
        ),
    }
    return purposes.get(doc_type, "Review and map columns to NDC indicators in the import tab.")


def _analysis_overview(doc_type: str, has_sector: bool, has_time: bool) -> str:
    if doc_type == "NDC mitigation targets":
        if has_sector:
            return (
                "Charts below were computed with pandas. "
                "Sector bars show NDC target values per sector; "
                "NDC-specific columns (conditional, unconditional, baseline) were detected and summarised above."
            )
        return (
            "NDC mitigation target data detected. "
            "Charts and insights below are based on pandas analysis of the target columns found."
        )
    return (
        "Charts below were computed with pandas (correct sums by year and sector, "
        "numeric cleaning, and national-row filtering where needed)."
    )


def load_payload(payload: dict) -> pd.DataFrame:
    if payload.get("csv_text"):
        text = payload["csv_text"]
        if not str(text).strip():
            raise ValueError("CSV text is empty")
        return pd.read_csv(StringIO(text), low_memory=False)
    rows = payload.get("rows")
    if not rows or not isinstance(rows, list):
        raise ValueError("Missing csv_text or rows in payload")
    return pd.DataFrame(rows)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
        filename = payload.get("filename") or "upload.csv"
        df = load_payload(payload)
        result = analyze_dataframe(df, filename)
        json.dump(result, sys.stdout, ensure_ascii=False)
    except Exception as exc:
        json.dump({"ok": False, "error": str(exc)}, sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
