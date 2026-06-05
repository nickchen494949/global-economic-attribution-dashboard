#!/usr/bin/env python3
"""
DATA AUDIT SCRIPT
=================
Run this to verify data completeness of dashboard_data.json.
Anyone can clone the repo and run: python3 scripts/audit.py

No dependencies required — uses only Python standard library.
"""

import json
import os
import sys

def main():
    # Find dashboard_data.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    data_path = os.path.join(project_root, "public", "data", "dashboard_data.json")
    
    if not os.path.exists(data_path):
        print(f"ERROR: {data_path} not found")
        sys.exit(1)
    
    with open(data_path) as f:
        d = json.load(f)
    
    print("=" * 75)
    print("  DATA COMPLETENESS AUDIT")
    print("=" * 75)
    print(f"  File: {data_path}")
    print(f"  Last Updated: {d.get('last_updated', 'UNKNOWN')}")
    print(f"  Countries: {len(d['countries'])}")
    print()

    # All macro fields
    ALL_FIELDS = [
        ("growth", "gdp_growth", "GDP Growth"),
        ("growth", "pmi", "PMI"),
        ("growth", "industrial_production", "Industrial Prod"),
        ("growth", "retail_sales", "Retail Sales"),
        ("growth", "exports", "Exports"),
        ("labor", "unemployment", "Unemployment"),
        ("labor", "wage_growth", "Wage Growth"),
        ("labor", "jobless_claims", "Jobless Claims"),
        ("inflation", "cpi_yoy", "CPI YoY"),
        ("inflation", "core_cpi", "Core CPI"),
        ("inflation", "ppi", "PPI"),
        ("inflation", "food_energy_pressure", "Food/Energy Pressure"),
        ("external_balance", "current_account_pct_gdp", "Current Acct % GDP"),
        ("external_balance", "trade_balance", "Trade Balance"),
        ("external_balance", "fx_reserves", "FX Reserves"),
        ("external_balance", "export_growth", "Export Growth"),
        ("external_balance", "import_growth", "Import Growth"),
        ("fiscal_debt", "fiscal_balance_pct_gdp", "Fiscal Balance % GDP"),
        ("fiscal_debt", "govt_debt_pct_gdp", "Govt Debt % GDP"),
        ("fiscal_debt", "yield_10y", "10Y Yield"),
        ("credit_cycle", "private_credit_growth", "Private Credit % GDP"),
        ("credit_cycle", "bank_lending", "Bank Lending Rate"),
        ("credit_cycle", "household_debt", "Household Debt % GDP"),
        ("credit_cycle", "corporate_debt", "Corporate Debt % GDP"),
    ]

    # === ASSET DATA ===
    print("─" * 75)
    print("  ASSET DATA")
    print("─" * 75)
    eq_ok = sum(1 for c in d["countries"] if c.get("equity", {}).get("available"))
    cur_ok = sum(1 for c in d["countries"] if c.get("currency", {}).get("available"))
    bond_ok = sum(1 for c in d["countries"] if c.get("bond", {}).get("available"))
    total_c = len(d["countries"])
    print(f"  Equity (ETF prices)  : {eq_ok}/{total_c}")
    print(f"  Currency (FX rates)  : {cur_ok}/{total_c}")
    print(f"  Bonds (proxy ETFs)   : {bond_ok}/{total_c}")
    print()

    # === PER-FIELD COVERAGE ===
    print("─" * 75)
    print("  MACRO INDICATOR COVERAGE (per field)")
    print("─" * 75)
    total_global = 0
    total_possible = 0

    for cat, field, label in ALL_FIELDS:
        avail = 0
        missing = []
        for c in d["countries"]:
            v = c.get("macro_panel", {}).get(cat, {}).get(field, {})
            if isinstance(v, dict) and v.get("available"):
                avail += 1
            else:
                missing.append(c["code"])
        total_global += avail
        total_possible += total_c

        pct = avail / total_c * 100
        if avail == total_c:
            icon = "✅"
        elif avail >= 30:
            icon = "🟡"
        elif avail >= 20:
            icon = "🟠"
        else:
            icon = "❌"

        miss_str = ""
        if missing:
            miss_str = f"  Missing: {', '.join(missing)}"
        print(f"  {icon} {label:25s} {avail:2d}/{total_c} ({pct:5.1f}%){miss_str}")

    print()

    # === PER-COUNTRY COVERAGE ===
    print("─" * 75)
    print("  MACRO INDICATOR COVERAGE (per country)")
    print("─" * 75)

    for c in d["countries"]:
        avail = 0
        missing_fields = []
        for cat, field, label in ALL_FIELDS:
            v = c.get("macro_panel", {}).get(cat, {}).get(field, {})
            if isinstance(v, dict) and v.get("available"):
                avail += 1
            else:
                missing_fields.append(label)
        total = len(ALL_FIELDS)
        pct = avail / total * 100

        if pct >= 90:
            icon = "✅"
        elif pct >= 75:
            icon = "🟡"
        elif pct >= 60:
            icon = "🟠"
        else:
            icon = "❌"

        miss_str = ""
        if missing_fields:
            miss_str = f"  Missing: {', '.join(missing_fields)}"
        print(f"  {icon} {c['code']:3s} {c['country']:25s} {avail:2d}/{total} ({pct:5.1f}%){miss_str}")

    print()

    # === DATA SOURCES ===
    print("─" * 75)
    print("  DATA SOURCES BREAKDOWN")
    print("─" * 75)
    src_counts = {}
    for c in d["countries"]:
        mp = c.get("macro_panel", {})
        for cat in mp.values():
            if isinstance(cat, dict):
                for v in cat.values():
                    if isinstance(v, dict) and v.get("available"):
                        src = v.get("source", "Unknown")
                        src_counts[src] = src_counts.get(src, 0) + 1

    for src, count in sorted(src_counts.items(), key=lambda x: -x[1]):
        print(f"  {src:25s}: {count:3d} fields")

    print()

    # === SUMMARY ===
    print("=" * 75)
    print(f"  GLOBAL FILL RATE: {total_global}/{total_possible} ({total_global / total_possible * 100:.1f}%)")
    print("=" * 75)

    # Exit code: 0 if > 80%, 1 otherwise
    fill_rate = total_global / total_possible * 100
    if fill_rate < 80:
        print("  ⚠️  BELOW 80% THRESHOLD — DATA INCOMPLETE")
        sys.exit(1)
    else:
        print("  ✅ PASSED — Data coverage above 80%")
        sys.exit(0)


if __name__ == "__main__":
    main()
