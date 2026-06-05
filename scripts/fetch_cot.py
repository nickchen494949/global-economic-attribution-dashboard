#!/usr/bin/env python3
"""
fetch_cot.py - Fetch CFTC Commitments of Traders (COT) data.

Downloads the latest COT futures-only report, parses net speculative
positioning for key contracts, and merges into dashboard_data.json.
"""

import json
import csv
import io
import os
import sys
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_PATH = PROJECT_ROOT / "public" / "data" / "dashboard_data.json"

# CFTC COT data URLs — try current year format first, then fallback
# The CFTC publishes annual zip files at varying URL patterns
COT_URLS = [
    f"https://www.cftc.gov/files/dea/history/deacmelf{datetime.now().year}.zip",
    f"https://www.cftc.gov/files/dea/history/fut_disagg_txt_{datetime.now().year}.zip",
    "https://www.cftc.gov/files/dea/history/deacmelf2025.zip",
    "https://www.cftc.gov/files/dea/history/deacmelf2024.zip",
]

# Contract name patterns → dashboard ticker mapping
# We match substrings in Market_and_Exchange_Names (case-insensitive)
CONTRACT_MAP = {
    "SPY": {
        "patterns": ["E-MINI S&P 500", "S&P 500"],
        "name": "S&P 500",
    },
    "UUP": {
        "patterns": ["EURO FX"],
        "name": "EUR/USD (inverted via Euro FX)",
    },
    "GLD": {
        "patterns": ["GOLD"],
        "name": "Gold",
    },
    "USO": {
        "patterns": ["CRUDE OIL, LIGHT SWEET", "WTI CRUDE", "CRUDE OIL"],
        "name": "Crude Oil (WTI)",
    },
    "CPER": {
        "patterns": ["COPPER"],
        "name": "Copper",
    },
}

# Additional standalone tracking (not mapped to global_futures ticker)
STANDALONE_CONTRACTS = {
    "JPY": {
        "patterns": ["JAPANESE YEN"],
        "name": "Japanese Yen",
    },
    "EUR": {
        "patterns": ["EURO FX"],
        "name": "Euro FX",
    },
}


def load_json(path: Path) -> dict | list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict | list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Saved to {path}")


def download_cot_data() -> list[dict]:
    """Download and parse the CFTC COT zip file. Returns list of row dicts."""
    print(f"  Downloading COT data from CFTC...")

    resp = None
    for url in COT_URLS:
        print(f"  Trying: {url}")
        try:
            resp = requests.get(url, timeout=60)
            resp.raise_for_status()
            print(f"  ✓ Downloaded {len(resp.content) / 1024:.0f} KB")
            break
        except requests.RequestException as e:
            print(f"  ✗ Failed: {e}")
            resp = None
            continue

    if resp is None:
        print(f"  ✗ All download URLs failed")
        return []

    # Extract CSV from zip
    try:
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            csv_names = [n for n in zf.namelist() if n.endswith(".csv") or n.endswith(".txt")]
            if not csv_names:
                # Try all files
                csv_names = zf.namelist()
            if not csv_names:
                print("  ✗ No files found in zip")
                return []

            csv_name = csv_names[0]
            print(f"  Parsing: {csv_name}")

            with zf.open(csv_name) as f:
                text = f.read().decode("utf-8", errors="replace")
                reader = csv.DictReader(io.StringIO(text))
                rows = list(reader)
                print(f"  Parsed {len(rows)} rows")
                return rows
    except (zipfile.BadZipFile, Exception) as e:
        print(f"  ✗ Error parsing zip: {e}")
        return []


def find_column(row: dict, candidates: list[str]) -> str | None:
    """Find the actual column name from a list of candidates (case-insensitive)."""
    row_keys_lower = {k.strip().lower(): k for k in row.keys()}
    for c in candidates:
        c_lower = c.strip().lower()
        if c_lower in row_keys_lower:
            return row_keys_lower[c_lower]
    return None


def parse_cot_contracts(rows: list[dict]) -> dict:
    """
    Parse COT data for target contracts.
    Returns dict of {key: {net_speculative, report_date, long, short, market_name}}.
    """
    if not rows:
        return {}

    # Identify column names (CFTC column names can vary slightly)
    sample = rows[0]
    market_col = find_column(sample, [
        "Market_and_Exchange_Names",
        "Market and Exchange Names",
    ])
    long_col = find_column(sample, [
        "NonComm_Positions_Long_All",
        "NonComm_Positions-Long_All",
        "Noncommercial Positions-Long (All)",
        "M_Money_Positions_Long_All",
    ])
    short_col = find_column(sample, [
        "NonComm_Positions_Short_All",
        "NonComm_Positions-Short_All",
        "Noncommercial Positions-Short (All)",
        "M_Money_Positions_Short_All",
    ])
    date_col = find_column(sample, [
        "Report_Date_as_YYYY-MM-DD",
        "Report_Date_as_MM_DD_YYYY",
        "As_of_Date_In_Form_YYMMDD",
        "As of Date in Form YYMMDD",
    ])

    if not market_col:
        print("  ✗ Could not find market name column")
        print(f"    Available columns: {list(sample.keys())[:10]}...")
        return {}

    print(f"  Column mapping:")
    print(f"    Market: {market_col}")
    print(f"    Long:   {long_col}")
    print(f"    Short:  {short_col}")
    print(f"    Date:   {date_col}")

    # Combine all patterns we need to search for
    all_contracts = {}
    all_contracts.update(CONTRACT_MAP)
    all_contracts.update(STANDALONE_CONTRACTS)

    results = {}

    for key, config in all_contracts.items():
        patterns = config["patterns"]
        # Find matching rows (take the most recent one)
        matching_rows = []
        for row in rows:
            market_name = (row.get(market_col, "") or "").upper()
            for pattern in patterns:
                if pattern.upper() in market_name:
                    matching_rows.append(row)
                    break

        if not matching_rows:
            print(f"  ⚠ No match for {key} ({config['name']})")
            continue

        # Sort by date (most recent first) if date column exists
        if date_col:
            try:
                matching_rows.sort(key=lambda r: r.get(date_col, ""), reverse=True)
            except Exception:
                pass

        row = matching_rows[0]
        market_name = (row.get(market_col, "") or "").strip()

        # Extract long/short positions
        try:
            long_val = int(str(row.get(long_col, "0")).strip().replace(",", ""))
        except (ValueError, TypeError):
            long_val = 0
        try:
            short_val = int(str(row.get(short_col, "0")).strip().replace(",", ""))
        except (ValueError, TypeError):
            short_val = 0

        net_spec = long_val - short_val

        # Extract date
        report_date = None
        if date_col:
            raw_date = (row.get(date_col, "") or "").strip()
            if raw_date:
                # Try various date formats
                for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%y%m%d"]:
                    try:
                        report_date = datetime.strptime(raw_date, fmt).strftime("%Y-%m-%d")
                        break
                    except ValueError:
                        continue
                if not report_date:
                    report_date = raw_date

        results[key] = {
            "net_speculative": net_spec,
            "long": long_val,
            "short": short_val,
            "report_date": report_date,
            "market_name": market_name,
            "source": "CFTC COT",
        }

        print(f"  ✓ {key:6s} ({config['name']:30s}): net={net_spec:>+10,d}  "
              f"(L={long_val:>8,d} S={short_val:>8,d})  date={report_date}")

    return results


def main():
    print("=" * 60)
    print("  COT POSITIONING DATA FETCHER (CFTC)")
    print("=" * 60)
    print(f"  Time: {datetime.now(timezone.utc).isoformat()}")
    print()

    # 1. Download COT data
    rows = download_cot_data()
    if not rows:
        print("\n  ✗ No COT data available. Exiting gracefully.")
        return

    # 2. Parse contracts
    print()
    results = parse_cot_contracts(rows)
    if not results:
        print("\n  ✗ No contracts matched. Exiting gracefully.")
        return

    # 3. Load dashboard data
    print(f"\n  Loading dashboard_data.json...")
    dashboard = load_json(DASHBOARD_PATH)

    # 4. Merge positioning into global_futures
    global_futures = dashboard.get("global_futures", {})
    merged_count = 0

    for ticker, positioning in results.items():
        if ticker in global_futures:
            # Add positioning block (just the clean fields, not market_name)
            global_futures[ticker]["positioning"] = {
                "net_speculative": positioning["net_speculative"],
                "report_date": positioning["report_date"],
                "source": positioning["source"],
            }
            merged_count += 1
            print(f"  → Merged positioning for {ticker}")

    # 5. Also store a dedicated COT summary section
    dashboard["cot_positioning"] = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": "CFTC Commitments of Traders",
        "contracts": {},
    }
    for key, data in results.items():
        dashboard["cot_positioning"]["contracts"][key] = {
            "name": data.get("market_name", key),
            "net_speculative": data["net_speculative"],
            "long": data["long"],
            "short": data["short"],
            "report_date": data["report_date"],
        }

    dashboard["last_updated"] = datetime.now(timezone.utc).isoformat()

    # 6. Save
    save_json(DASHBOARD_PATH, dashboard)

    # 7. Summary
    print("\n" + "=" * 60)
    print("  COT POSITIONING SUMMARY")
    print("=" * 60)
    print(f"\n  {'Contract':<12} {'Net Spec':>12} {'Report Date':>14}")
    print("  " + "-" * 40)
    for key, data in results.items():
        print(f"  {key:<12} {data['net_speculative']:>+12,d} {data['report_date'] or 'N/A':>14}")

    print(f"\n  Merged {merged_count} contracts into global_futures")
    print(f"  Total contracts tracked: {len(results)}")
    print(f"\n  ✅ COT fetch complete!")


if __name__ == "__main__":
    main()
