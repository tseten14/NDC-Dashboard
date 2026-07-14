#!/usr/bin/env python3
"""
PySpark port of the Data Pipeline "unclean -> clean" transform
(backend/lib/ingest/pipelineClean.ts): sanitize -> geography filter ->
required-field filter -> dedupe -> latest-year-only.

Local/dev only — never invoked on Vercel (no JVM in that runtime). See
backend/services/ingestSpark.js for the availability gate and JS fallback.

Reads JSON from stdin, writes JSON to stdout:
  Input:  { "rows": [...], "headers": [...], "mapping": {...}, "filters": {...} }
  Output: { "ok": true, "rowsInput", "rowsOutput", "steps", "cleanedRows",
            "preview", "issues", "geographyColumn", "engine": "pyspark",
            "filtersApplied" }
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, date
from typing import Any

ROW_COUNT_VALUE_COLUMN = "__row_count__"

GEOGRAPHY_CANDIDATES = [
    "geographies", "geography", "country", "countries", "region",
    "district", "location", "admin1", "iso3", "iso_code",
]
UGANDA_TOKENS = re.compile(r"\b(uga|ug|uganda)\b", re.IGNORECASE)
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DMY_DATE = re.compile(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$")
YEAR_ONLY = re.compile(r"^\d{4}$")
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")
FORMULA_PREFIX = re.compile(r"^[=+\-@]")
HTML_TAG = re.compile(r"<[^>]*>")

_EXTRA_DATE_FORMATS = ["%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y", "%Y/%m/%d"]


def parse_date_value(raw: Any) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if ISO_DATE.match(s):
        return s
    dmy = DMY_DATE.match(s)
    if dmy:
        dd, mm, yyyy = dmy.group(1).zfill(2), dmy.group(2).zfill(2), dmy.group(3)
        return f"{yyyy}-{mm}-{dd}"
    if YEAR_ONLY.match(s):
        return f"{s}-01-01"
    for fmt in _EXTRA_DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def extract_year_from_value(raw: Any) -> int | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        n = int(raw)
        if n == raw and 1900 <= n <= 2100:
            return n
    s = str(raw).strip()
    if YEAR_ONLY.match(s):
        return int(s)
    d = parse_date_value(raw)
    if d:
        return int(d[:4])
    try:
        n = float(s.replace(",", ""))
        if n.is_integer() and 1900 <= n <= 2100:
            return int(n)
    except ValueError:
        pass
    return None


def normalize_number(raw: Any) -> float | None:
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "")
    if not s:
        return None
    try:
        n = float(s)
    except ValueError:
        return None
    return n if n == n and n not in (float("inf"), float("-inf")) else None


def strip_html(raw: str) -> str:
    return (
        HTML_TAG.sub("", raw)
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )


def normalize_date_display(raw: Any) -> Any:
    if raw is None or not isinstance(raw, str):
        return raw
    s = raw.strip()
    iso = re.match(r"^(\d{4}-\d{2}-\d{2})T", s)
    return iso.group(1) if iso else s


def sanitize_cell(raw: Any, strip_html_flag: bool, normalize_date_flag: bool) -> Any:
    if raw is None or not isinstance(raw, str):
        return raw
    s = CONTROL_CHARS.sub("", raw).strip()
    if strip_html_flag and HTML_TAG.search(s):
        s = strip_html(s).strip()
    if normalize_date_flag:
        s = str(normalize_date_display(s))
    if FORMULA_PREFIX.match(s):
        s = f"'{s}"
    return s


def detect_geography_column(headers: list[str]) -> str | None:
    lower = [(h, re.sub(r"\s+", "_", h.strip().lower())) for h in headers]
    for cand in GEOGRAPHY_CANDIDATES:
        for h, lc in lower:
            if lc == cand or cand in lc:
                return h
    return None


def detect_document_url_column(headers: list[str]) -> str | None:
    lower = [(h, h.strip().lower()) for h in headers]
    for h, lc in lower:
        if lc == "document url":
            return h
    for h, lc in lower:
        if "document" in lc and "url" in lc:
            return h
    return None


def is_policy_catalog_file(headers: list[str]) -> bool:
    has_geo = any(re.search(r"geograph", h, re.IGNORECASE) for h in headers)
    has_date = any(re.search(r"publication.*date|family.*date", h, re.IGNORECASE) for h in headers)
    has_category = any(re.match(r"^category$", h.strip(), re.IGNORECASE) for h in headers)
    return has_geo and has_date and has_category


def header_by_pattern(headers: list[str], pattern: re.Pattern) -> str | None:
    for h in headers:
        if pattern.search(h.strip()):
            return h
    return None


def row_matches_uganda(row: dict, geo_col: str) -> bool:
    raw = row.get(geo_col)
    if raw is None or str(raw).strip() == "":
        return False
    parts = [p.strip() for p in re.split(r"[;,|]", str(raw)) if p.strip()]
    if not parts:
        return bool(UGANDA_TOKENS.search(str(raw)))
    return any(UGANDA_TOKENS.search(p) for p in parts)


def policy_dedupe_key(row: dict, headers: list[str], doc_url_col: str | None) -> str:
    if doc_url_col and row.get(doc_url_col) is not None:
        url = str(row[doc_url_col]).strip().lower()
        if url:
            return f"url:{url}"
    title_col = header_by_pattern(headers, re.compile(r"^document\s*title$", re.IGNORECASE)) or \
        header_by_pattern(headers, re.compile(r"document\s*title", re.IGNORECASE))
    family_col = header_by_pattern(headers, re.compile(r"^family\s*name$", re.IGNORECASE)) or \
        header_by_pattern(headers, re.compile(r"family\s*name", re.IGNORECASE))
    title_key = str(row.get(title_col, "")).strip().lower() if title_col else ""
    family_key = str(row.get(family_col, "")).strip().lower() if family_col else ""
    if title_key or family_key:
        return f"doc:{family_key}|{title_key}"
    return f"row:{json.dumps(row, sort_keys=True)[:200]}"


def publication_timestamp(row: dict, year_col: str | None) -> float:
    if not year_col:
        return 0.0
    parsed = parse_date_value(row.get(year_col))
    if parsed:
        try:
            return datetime.fromisoformat(parsed).timestamp()
        except ValueError:
            return 0.0
    year = extract_year_from_value(row.get(year_col))
    if year is not None:
        return date(year, 1, 1).toordinal()
    return 0.0


def dedupe_key(row: dict, mapping: dict) -> str:
    parts = []
    for field in ("year", "value", "source", "target_id"):
        col = mapping.get(field)
        if not col:
            parts.append("")
            continue
        v = row.get(col)
        parts.append("" if v is None else str(v).strip().lower())
    return "|".join(parts)


def clean(sc, rows: list[dict], headers: list[str], mapping: dict, filters: dict) -> dict:
    filters_applied = {
        "ugandaOnly": bool(filters.get("ugandaOnly", False)),
        "dropDuplicates": filters.get("dropDuplicates", True) is not False,
        "latestYearOnly": bool(filters.get("latestYearOnly", False)),
        "documentCountMode": bool(filters.get("documentCountMode", False)),
    }

    effective_mapping = dict(mapping or {})
    if filters_applied["documentCountMode"] and not mapping.get("value"):
        effective_mapping["value"] = ROW_COUNT_VALUE_COLUMN

    geography_column = detect_geography_column(headers)
    policy_catalog = is_policy_catalog_file(headers)
    document_url_column = detect_document_url_column(headers)
    year_col = effective_mapping.get("year")
    value_col = effective_mapping.get("value")
    date_headers = {h for h in headers if re.search(r"date", h, re.IGNORECASE) or h == year_col}

    rows_input = len(rows)
    steps: list[dict] = []
    issues: list[dict] = []

    rdd = sc.parallelize(rows, max(1, min(8, len(rows) // 500 + 1))) if rows else sc.parallelize([])

    def do_sanitize(row: dict) -> dict:
        out = {h: sanitize_cell(row.get(h), policy_catalog, h in date_headers) for h in headers}
        if effective_mapping.get("value") == ROW_COUNT_VALUE_COLUMN:
            out[ROW_COUNT_VALUE_COLUMN] = 1
        return out

    work = rdd.map(do_sanitize)
    details = [
        "Trim whitespace, remove control characters, and neutralise spreadsheet formulas.",
        "Strip HTML tags from text fields." if policy_catalog else None,
        "Normalize date columns to YYYY-MM-DD." if date_headers else None,
    ]
    steps.append({
        "id": "sanitize", "label": "Sanitize cell text",
        "rowsBefore": rows_input, "rowsAfter": rows_input, "removed": 0,
        "detail": " ".join(d for d in details if d),
    })

    if filters_applied["documentCountMode"] and not mapping.get("value"):
        steps.append({
            "id": "document_count", "label": "Document count mode",
            "rowsBefore": rows_input, "rowsAfter": rows_input, "removed": 0,
            "detail": "No amount column mapped — each row is assigned value 1 for counting documents.",
        })

    if filters_applied["ugandaOnly"] and geography_column:
        before = work.count()
        work = work.filter(lambda row: row_matches_uganda(row, geography_column))
        after = work.count()
        steps.append({
            "id": "uganda_filter", "label": "Uganda geography filter",
            "rowsBefore": before, "rowsAfter": after, "removed": before - after,
            "detail": f"Kept rows where “{geography_column}” includes Uganda or UGA.",
        })
    elif filters_applied["ugandaOnly"]:
        n = work.count()
        steps.append({
            "id": "uganda_filter", "label": "Uganda geography filter",
            "rowsBefore": n, "rowsAfter": n, "removed": 0,
            "detail": "Skipped — no geography column detected (Geographies, Country, Region, etc.).",
        })

    if year_col or value_col:
        before = work.count()

        def required_ok(row: dict) -> bool:
            if year_col and extract_year_from_value(row.get(year_col)) is None:
                return False
            if value_col and normalize_number(row.get(value_col)) is None:
                return False
            return True

        work = work.filter(required_ok)
        after = work.count()
        detail = " · ".join(
            d for d in [f"Year from “{year_col}”" if year_col else None,
                        f"Value from “{value_col}”" if value_col else None] if d
        )
        steps.append({
            "id": "required_fields", "label": "Required mapped fields",
            "rowsBefore": before, "rowsAfter": after, "removed": before - after,
            "detail": detail,
        })

    if filters_applied["dropDuplicates"] and (policy_catalog or year_col or value_col):
        before = work.count()
        indexed = work.zipWithIndex()  # (row, idx) — idx preserves original order for tie-breaks

        if policy_catalog:
            keyed = indexed.map(
                lambda ri: (policy_dedupe_key(ri[0], headers, document_url_column), ri)
            )
            # Winner = max (publication timestamp, idx); reproduces the JS fold's
            # ">=" (later occurrence wins ties) regardless of reduceByKey combine order.
            def keep_latest(a, b):
                ta = (publication_timestamp(a[0], year_col), a[1])
                tb = (publication_timestamp(b[0], year_col), b[1])
                return a if ta >= tb else b

            winners = keyed.reduceByKey(keep_latest)
            winner_idx_by_key = dict(winners.mapValues(lambda ri: ri[1]).collect())
            kept = indexed.filter(
                lambda ri: winner_idx_by_key[policy_dedupe_key(ri[0], headers, document_url_column)] == ri[1]
            )
            dropped_count = before - kept.count()
            if dropped_count:
                issues.append({
                    "row": 0,
                    "message": f"{dropped_count} duplicate document(s) removed — newest publication date kept per "
                               f"{'“' + document_url_column + '”' if document_url_column else 'document title + family name'}.",
                })
            deduped = kept.sortBy(lambda ri: ri[1]).map(lambda ri: ri[0])
            detail = (
                f"Same “{document_url_column}” appears only once (newest publication date kept)."
                if document_url_column
                else "Same document title + family name appears only once."
            )
        else:
            keyed = indexed.map(lambda ri: (dedupe_key(ri[0], effective_mapping), ri))
            # Winner = min idx (first occurrence), matching the JS Set-based "seen" pass.
            winners = keyed.reduceByKey(lambda a, b: a if a[1] < b[1] else b)
            winner_idx_by_key = dict(winners.mapValues(lambda ri: ri[1]).collect())
            kept = indexed.filter(
                lambda ri: winner_idx_by_key[dedupe_key(ri[0], effective_mapping)] == ri[1]
            )
            dropped_count = before - kept.count()
            if dropped_count:
                issues.append({"row": 0, "message": f"{dropped_count} duplicate row(s) removed."})
            deduped = kept.sortBy(lambda ri: ri[1]).map(lambda ri: ri[0])
            detail = "Same year, value, source, and target combination appears only once."

        work = deduped
        after = work.count()
        steps.append({
            "id": "dedupe",
            "label": "Remove duplicate documents" if policy_catalog else "Remove duplicate rows",
            "rowsBefore": before, "rowsAfter": after, "removed": before - after,
            "detail": detail,
        })

    if filters_applied["latestYearOnly"] and year_col:
        years = work.map(lambda row: extract_year_from_value(row.get(year_col))).filter(lambda y: y is not None)
        latest = years.max() if not years.isEmpty() else None
        if latest is not None:
            before = work.count()
            work = work.filter(lambda row: extract_year_from_value(row.get(year_col)) == latest)
            after = work.count()
            steps.append({
                "id": "latest_year", "label": "Latest year only",
                "rowsBefore": before, "rowsAfter": after, "removed": before - after,
                "detail": f"Kept rows for {latest} only.",
            })

    cleaned_rows = work.collect()
    return {
        "ok": True,
        "rowsInput": rows_input,
        "rowsOutput": len(cleaned_rows),
        "steps": steps,
        "cleanedRows": cleaned_rows,
        "preview": cleaned_rows[:10],
        "issues": issues[:100],
        "geographyColumn": geography_column,
        "engine": "pyspark",
        "filtersApplied": filters_applied,
    }


def main() -> None:
    try:
        payload = json.load(sys.stdin)
        rows = payload.get("rows") or []
        headers = payload.get("headers") or []
        mapping = payload.get("mapping") or {}
        filters = payload.get("filters") or {}
        if not isinstance(rows, list) or not isinstance(headers, list):
            raise ValueError("Missing rows/headers in payload")

        from pyspark import SparkConf
        from pyspark.sql import SparkSession

        conf = (
            SparkConf()
            .setAppName("ndc-ingest-pipeline-clean")
            .setMaster("local[*]")
            .set("spark.ui.enabled", "false")
            .set("spark.driver.memory", "512m")
        )
        spark = SparkSession.builder.config(conf=conf).getOrCreate()
        spark.sparkContext.setLogLevel("ERROR")
        try:
            result = clean(spark.sparkContext, rows, headers, mapping, filters)
        finally:
            spark.stop()

        json.dump(result, sys.stdout, ensure_ascii=False)
    except Exception as exc:  # noqa: BLE001 — always report failure as JSON for the Node bridge
        json.dump({"ok": False, "error": str(exc)}, sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
