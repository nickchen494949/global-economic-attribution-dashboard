#!/usr/bin/env python3
"""
seed_history.py - Seed historical macro data from World Bank API.

Fetches 2010-2025 data for 5 macro indicators across all 37 countries,
and stores as data/historical/macro_history.json.
"""

import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
COUNTRIES_PATH = PROJECT_ROOT / "src" / "data" / "countries.json"
HISTORY_DIR = PROJECT_ROOT / "data" / "historical"
HISTORY_PATH = HISTORY_DIR / "macro_history.json"

# ── World Bank API Config ──────────────────────────────────────────────────
WB_API_BASE = "https://api.worldbank.org/v2"
DATE_RANGE = "2010:2025"

# Indicators to fetch
INDICATORS = {
    "gdp_growth": "NY.GDP.MKTP.KD.ZG",
    "cpi": "FP.CPI.TOTL.ZG",
    "unemployment": "SL.UEM.TOTL.ZS",
    "current_account": "BN.CAB.XOKA.GD.ZS",
    "fx_reserves": "FI.RES.TOTL.CD",
}

# ISO 2-letter → 3-letter code mapping for World Bank API
ISO2_TO_ISO3 = {
    "US": "USA", "CA": "CAN", "MX": "MEX", "BR": "BRA", "CL": "CHL",
    "AR": "ARG", "GB": "GBR", "DE": "DEU", "FR": "FRA", "NL": "NLD",
    "CH": "CHE", "SE": "SWE", "PL": "POL", "TR": "TUR", "CN": "CHN",
    "JP": "JPN", "KR": "KOR", "TW": "TWN", "HK": "HKG", "SG": "SGP",
    "MY": "MYS", "TH": "THA", "ID": "IDN", "VN": "VNM", "PH": "PHL",
    "IN": "IND", "PK": "PAK", "BD": "BGD", "SA": "SAU", "AE": "ARE",
    "QA": "QAT", "EG": "EGY", "AU": "AUS", "NZ": "NZL", "ZA": "ZAF",
    "NG": "NGA", "KE": "KEN",
}

# Reverse mapping for parsing responses
ISO3_TO_ISO2 = {v: k for k, v in ISO2_TO_ISO3.items()}

REQUEST_DELAY = 0.5  # seconds between API requests


def load_json(path: Path) -> dict | list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict | list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Saved to {path}")


def fetch_world_bank_indicator(indicator_code: str, country_codes_3: list[str]) -> list[dict]:
    """
    Fetch indicator data from World Bank API for a batch of countries.
    Uses semicolon-separated country codes.
    Returns list of data records.
    """
    # World Bank API allows batching with semicolons
    # But there may be a URL length limit, so batch in groups
    BATCH_SIZE = 20
    all_records = []

    for i in range(0, len(country_codes_3), BATCH_SIZE):
        batch = country_codes_3[i:i + BATCH_SIZE]
        codes_str = ";".join(batch)
        url = (
            f"{WB_API_BASE}/country/{codes_str}/indicator/{indicator_code}"
            f"?date={DATE_RANGE}&format=json&per_page=2000"
        )

        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            # World Bank API returns [metadata, records] or [metadata] on error
            if isinstance(data, list) and len(data) >= 2 and data[1]:
                records = data[1]
                all_records.extend(records)
            elif isinstance(data, list) and len(data) >= 1:
                # Check for pagination
                meta = data[0]
                total = meta.get("total", 0)
                if total == 0:
                    pass  # No data for this batch
            else:
                pass

        except requests.RequestException as e:
            print(f"    ⚠ API error for batch {codes_str[:30]}...: {e}")

        time.sleep(REQUEST_DELAY)

    return all_records


def parse_records(records: list[dict]) -> dict[str, dict[str, float]]:
    """
    Parse World Bank API records into {country_iso2: {year: value}} format.
    """
    result = {}
    for rec in records:
        if not rec:
            continue

        # World Bank returns country.id as 2-letter code
        country_info = rec.get("country", {})
        country_id_2 = country_info.get("id", "")  # 2-letter code like "CA"
        country_id_3 = rec.get("countryiso3code", "")  # 3-letter code like "CAN"

        # Try 2-letter first, then convert from 3-letter
        iso2 = None
        if country_id_2 in ISO2_TO_ISO3:
            iso2 = country_id_2
        elif country_id_3:
            iso2 = ISO3_TO_ISO2.get(country_id_3)

        if not iso2:
            continue

        year = rec.get("date", "")
        value = rec.get("value")

        if value is not None:
            if iso2 not in result:
                result[iso2] = {}
            try:
                result[iso2][str(year)] = round(float(value), 4)
            except (ValueError, TypeError):
                pass

    return result


def main():
    print("=" * 60)
    print("  HISTORICAL MACRO DATA SEEDER (World Bank)")
    print("=" * 60)
    print(f"  Time: {datetime.now(timezone.utc).isoformat()}")
    print()

    # 1. Create historical directory
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    print(f"  Historical data directory: {HISTORY_DIR}")

    # 2. Load countries
    countries = load_json(COUNTRIES_PATH)
    country_codes_2 = [c["code"] for c in countries]
    country_codes_3 = [ISO2_TO_ISO3.get(c, c) for c in country_codes_2]

    # Filter out any that don't have a mapping
    valid_codes_3 = [c for c in country_codes_3 if c in ISO3_TO_ISO2]
    print(f"  Countries: {len(country_codes_2)} total, {len(valid_codes_3)} with World Bank codes")
    print(f"  Date range: {DATE_RANGE}")
    print(f"  Indicators: {len(INDICATORS)}")
    print()

    # 3. Fetch each indicator
    history = {}
    total_data_points = 0

    for indicator_name, indicator_code in INDICATORS.items():
        print(f"  Fetching: {indicator_name} ({indicator_code})...")
        records = fetch_world_bank_indicator(indicator_code, valid_codes_3)
        print(f"    Raw records: {len(records)}")

        parsed = parse_records(records)
        history[indicator_name] = parsed

        # Stats
        n_countries = len(parsed)
        n_years = sum(len(years) for years in parsed.values())
        total_data_points += n_years
        print(f"    Parsed: {n_countries} countries, {n_years} data points")
        print()

    # 4. Build metadata
    output = {
        "metadata": {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "World Bank API v2",
            "date_range": DATE_RANGE,
            "indicators": {
                name: code for name, code in INDICATORS.items()
            },
            "country_count": len(valid_codes_3),
        },
        "data": history,
    }

    # 5. Save
    save_json(HISTORY_PATH, output)

    # 6. Summary
    print("=" * 60)
    print("  SEEDING SUMMARY")
    print("=" * 60)

    print(f"\n  {'Indicator':<20} {'Countries':>10} {'Years':>8} {'Avg Yrs/Country':>16}")
    print("  " + "-" * 56)

    for indicator_name in INDICATORS:
        data = history.get(indicator_name, {})
        n_countries = len(data)
        n_years = sum(len(years) for years in data.values())
        avg_years = n_years / n_countries if n_countries > 0 else 0
        print(f"  {indicator_name:<20} {n_countries:>10} {n_years:>8} {avg_years:>16.1f}")

    print(f"\n  Total data points: {total_data_points:,}")
    print(f"  Output file: {HISTORY_PATH}")
    print(f"  File size: {HISTORY_PATH.stat().st_size / 1024:.1f} KB")

    # Show sample data for US
    us_gdp = history.get("gdp_growth", {}).get("US", {})
    if us_gdp:
        years = sorted(us_gdp.keys())
        print(f"\n  Sample — US GDP Growth:")
        for y in years[-5:]:
            print(f"    {y}: {us_gdp[y]:.2f}%")

    print(f"\n  ✅ Historical data seeding complete!")


if __name__ == "__main__":
    main()
