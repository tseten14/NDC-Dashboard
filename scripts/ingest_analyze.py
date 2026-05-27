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

YEAR_CANDIDATES = [
    "year",
    "reporting_year",
    "period_end",
    "inventory_year",
    "calendar_year",
]
SECTOR_CANDIDATES = ["sector", "sector_id", "category", "ghg_sector", "ipcc_sector"]
VALUE_CANDIDATES = [
    "value_mtco2e",
    "value",
    "emissions",
    "mtco2e",
    "co2e",
    "amount",
    "quantity",
    "total",
]
DISTRICT_CANDIDATES = ["district", "region", "subnational", "admin1", "location"]

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
    if "co2" in lc or "emission" in lc:
        return "CO₂e"
    if "percent" in lc or lc.endswith("_pct") or lc == "pct":
        return "%"
    return ""


def sector_label(name: str) -> str:
    key = str(name).strip().lower()
    return SECTOR_LABELS.get(key, str(name).strip())


def filter_national_rows(df: pd.DataFrame, district_col: str | None) -> tuple[pd.DataFrame, str | None]:
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
    group_keys = [year_col]
    if sector_col and sector_col in work.columns:
        n_sector_per_year = work.groupby(year_col)[sector_col].nunique().max()
        if n_sector_per_year and n_sector_per_year > 1:
            note = (
                "The trend line sums all sectors (and rows) for each year — "
                "this represents an estimated national total from the file."
            )
            if district_col and district_col in work.columns:
                d = work[district_col].astype(str).str.strip().str.lower()
                if d.isin(NATIONAL_TOKENS).any() and (~d.isin(NATIONAL_TOKENS)).any():
                    note += " National-level rows only were used where mixed with districts."

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
) -> list[str]:
    lines = [
        f"Your file has {len(df)} rows and {len(df.columns)} columns (analysed with pandas).",
    ]
    if value_col:
        unit = infer_value_unit(value_col)
        if unit:
            lines.append(f"Values are read from “{value_col}” in {unit}.")
    if year_col and value_col:
        lines.append(f"Trends use “{year_col}” on the horizontal axis and “{value_col}” for amounts.")
    if sector_col and sector_bar:
        lines.append(
            f"Sector comparison uses “{sector_col}” with {len(sector_bar)} sector(s) shown."
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
) -> list[dict]:
    highlights = []
    if time_series:
        peak = max(time_series, key=lambda x: x["total"])
        highlights.append(
            {
                "label": "Highest annual total in the file",
                "value": f"{peak['year']}: {peak['total']}{(' ' + unit) if unit else ''}",
                "note": "Sum of all rows for that year after numeric cleaning.",
            }
        )
    if sector_bar:
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


def analyze_dataframe(df: pd.DataFrame, filename: str) -> dict[str, Any]:
    if df.empty or len(df.columns) == 0:
        raise ValueError("No usable rows or columns")

    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    year_col = detect_column(df, YEAR_CANDIDATES)
    sector_col = detect_column(df, SECTOR_CANDIDATES)
    value_col = detect_column(df, VALUE_CANDIDATES)
    district_col = detect_column(df, DISTRICT_CANDIDATES)

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

    sector_bar, sector_note = (
        build_sector_bar(chart_df, sector_col, value_col, year_col)
        if sector_col and value_col
        else ([], None)
    )
    time_series, time_note = (
        build_time_series(chart_df, year_col, value_col, sector_col, district_col)
        if year_col and value_col
        else ([], None)
    )
    if sector_note:
        validation_notes.append(sector_note)
    if time_note:
        validation_notes.append(time_note)

    null_chart = build_null_chart(df)
    insights = build_insights(
        df,
        columns,
        year_col,
        sector_col,
        value_col,
        district_col,
        time_series,
        sector_bar,
        validation_notes,
    )
    highlights = build_highlights(time_series, sector_bar, value_col, unit)
    chart_guides = build_chart_guides(
        sector_bar, time_series, null_chart, sector_note, time_note
    )

    incomplete = [c for c in columns if c["null_ratio"] >= 0.5]
    recommendations = []
    if incomplete:
        names = ", ".join(c["name"] for c in incomplete[:3])
        recommendations.append(
            f"{len(incomplete)} column(s) are more than half empty ({names}). "
            "Fill gaps before using this in official reports."
        )
    if not year_col:
        recommendations.append(
            'Add a "year" (or reporting_year) column to enable accurate trend charts.'
        )
    if not value_col:
        recommendations.append(
            'Add a numeric "value" or "value_mtco2e" column for emissions or indicators.'
        )
    if not sector_col:
        recommendations.append(
            "Add a sector column (energy, afolu, agriculture, etc.) for sector breakdown charts."
        )
    if not recommendations:
        recommendations.append(
            "Schema looks usable — map columns to NDC indicators in the structured import tab."
        )

    doc_type = (
        "Structured data (time series candidate)"
        if year_col and value_col
        else "Tabular dataset"
    )
    col_bits = []
    if year_col:
        col_bits.append(f"year (“{year_col}”)")
    if value_col:
        col_bits.append(f"value (“{value_col}”)")
    if sector_col:
        col_bits.append(f"sector (“{sector_col}”)")
    if district_col:
        col_bits.append(f"location (“{district_col}”)")

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
            "value_column": value_col,
            "sector_column": sector_col,
            "district_column": district_col,
            "value_unit": unit,
            "aggregation_engine": "pandas_groupby",
        },
        "about": {
            "title": re.sub(r"\.[^.]+$", "", filename).replace("-", " ").replace("_", " "),
            "doc_type": doc_type,
            "doc_type_plain": "Spreadsheet-style data file"
            if year_col and value_col
            else "Data table",
            "description": (
                "This table was analysed with pandas for accurate numeric parsing and charts. "
                + (f"We recognised {', '.join(col_bits)}." if col_bits else "")
            ),
            "purpose": "Can be imported to update indicators and track progress over time.",
            "detected_columns": {
                "year": year_col,
                "value": value_col,
                "sector": sector_col,
                "district": district_col,
            },
            "detected_columns_plain": {
                "year": f"Years are in “{year_col}”" if year_col else "No year column found",
                "value": f"Amounts are in “{value_col}”" if value_col else "No value column found",
                "sector": f"Sectors are in “{sector_col}”" if sector_col else "No sector column",
                "district": (
                    f"Locations are in “{district_col}”"
                    if district_col
                    else "No district/region column"
                ),
            },
            "shape": {"rows": int(len(df)), "columns": int(len(df.columns))},
        },
        "analysis": {
            "mode": "tabular",
            "presentation": "bullets",
            "overview": (
                "Charts below were computed with pandas (correct sums by year and sector, "
                "numeric cleaning, and national-row filtering where needed)."
            ),
            "insights": insights,
            "highlights": highlights,
            "chart_guides": chart_guides,
            "value_unit": unit,
            "visuals": {
                "sector_bar": sector_bar,
                "time_series": time_series,
                "null_chart": null_chart,
            },
        },
        "recommendations": recommendations,
    }


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
