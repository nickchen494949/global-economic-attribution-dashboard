#!/usr/bin/env python3
"""
Macro data fetcher — Downloads macro indicators from World Bank API
and integrates them into dashboard_data.json.

Indicators:
  - GDP Growth (annual %)
  - Inflation CPI (annual %)
  - Unemployment Rate (%)
  - Current Account (% of GDP)
  - Trade Balance (% of GDP)
  - Government Debt (% of GDP)
  - Fiscal Balance (% of GDP)
  - FX Reserves (current US$)
  - Exports Growth (annual %)
  - Imports Growth (annual %)

Sources: World Bank Open Data API (free, no key)
"""

import json
import os
import sys
import time
import math
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
COUNTRIES_FILE = PROJECT_ROOT / "src" / "data" / "countries.json"
DASHBOARD_FILE = PROJECT_ROOT / "public" / "data" / "dashboard_data.json"
DASHBOARD_PROCESSED = PROJECT_ROOT / "data" / "processed" / "dashboard_data.json"
MACRO_OUTPUT = PROJECT_ROOT / "data" / "processed" / "macro_data.json"

# ISO alpha-2 to ISO alpha-3 mapping for World Bank API
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

# World Bank indicators
WB_INDICATORS = {
    "gdp_growth":          "NY.GDP.MKTP.KD.ZG",
    "cpi_yoy":             "FP.CPI.TOTL.ZG",
    "unemployment":        "SL.UEM.TOTL.ZS",
    "current_account":     "BN.CAB.XOKA.GD.ZS",
    "trade_pct_gdp":       "NE.TRD.GNFS.ZS",
    "govt_debt_pct_gdp":   "GC.DOD.TOTL.GD.ZS",
    "fiscal_balance":      "GC.BAL.CASH.GD.ZS",
    "fx_reserves":         "FI.RES.TOTL.CD",
    "export_growth":       "NE.EXP.GNFS.KD.ZG",
    "import_growth":       "NE.IMP.GNFS.KD.ZG",
    "private_credit":      "FS.AST.PRVT.GD.ZS",
    "ppi":                 "FP.WPI.TOTL.ZG",
    "industrial_prod":     "NV.IND.TOTL.KD.ZG",
    "retail_sales":        "NE.CON.PRVT.KD.ZG",
}

def fetch_wb_indicator(indicator_code: str, iso3_codes: list[str], years: int = 5) -> dict:
    """Fetch a World Bank indicator for multiple countries. Returns {iso3: [(year, value), ...]}"""
    countries_str = ";".join(iso3_codes)
    current_year = datetime.now().year
    start_year = current_year - years
    
    url = (
        f"https://api.worldbank.org/v2/country/{countries_str}"
        f"/indicator/{indicator_code}"
        f"?date={start_year}:{current_year}"
        f"&format=json&per_page=500"
    )
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        
        if not data or len(data) < 2 or data[1] is None:
            return {}
        
        results = {}
        for entry in data[1]:
            iso3 = entry.get("countryiso3code") or entry.get("country", {}).get("id", "")
            year = entry.get("date")
            value = entry.get("value")
            if iso3 and year and value is not None:
                if iso3 not in results:
                    results[iso3] = []
                results[iso3].append((int(year), float(value)))
        
        # Sort by year descending
        for iso3 in results:
            results[iso3].sort(key=lambda x: -x[0])
        
        return results
        
    except Exception as e:
        print(f"    ⚠ API error for {indicator_code}: {e}")
        return {}


def fetch_all_macro_data(iso2_codes: list[str]) -> dict:
    """Fetch all macro indicators for all countries."""
    iso3_codes = [ISO2_TO_ISO3.get(c, c) for c in iso2_codes if c in ISO2_TO_ISO3]
    iso3_to_iso2 = {v: k for k, v in ISO2_TO_ISO3.items()}
    
    macro_data = {code: {} for code in iso2_codes}
    
    total = len(WB_INDICATORS)
    for idx, (name, indicator_code) in enumerate(WB_INDICATORS.items(), 1):
        print(f"  [{idx}/{total}] Fetching {name} ({indicator_code})...", end=" ", flush=True)
        
        results = fetch_wb_indicator(indicator_code, iso3_codes)
        
        count = 0
        for iso3, values in results.items():
            iso2 = iso3_to_iso2.get(iso3)
            if iso2 and iso2 in macro_data and values:
                # Take the most recent value
                latest_year, latest_value = values[0]
                # Also get previous year for z-score computation
                prev_values = [v for y, v in values if y < latest_year]
                
                macro_data[iso2][name] = {
                    "value": round(latest_value, 2),
                    "year": latest_year,
                    "available": True,
                    "history": [(y, round(v, 2)) for y, v in values[:5]],
                }
                count += 1
        
        print(f"OK ({count} countries)")
        time.sleep(0.3)  # Rate limit
    
    return macro_data


def compute_z_score(value: float, values_list: list[float]) -> float | None:
    """Compute z-score of a value relative to a distribution."""
    if len(values_list) < 3:
        return None
    mean = sum(values_list) / len(values_list)
    variance = sum((v - mean) ** 2 for v in values_list) / len(values_list)
    std = math.sqrt(variance) if variance > 0 else 0
    if std == 0:
        return 0.0
    z = (value - mean) / std
    return max(-3.0, min(3.0, round(z, 3)))


def normal_cdf(z: float) -> float:
    """Approximate normal CDF."""
    a1, a2, a3 = 0.254829592, -0.284496736, 1.421413741
    a4, a5, p = -1.453152027, 1.061405429, 0.3275911
    sign = -1 if z < 0 else 1
    x = abs(z) / math.sqrt(2)
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
    return 0.5 * (1.0 + sign * y)


def compute_macro_scores(macro_data: dict, all_codes: list[str]) -> dict:
    """Compute z-scores and percentiles for macro indicators across countries."""
    # Collect cross-sectional distributions for each indicator
    distributions = {}
    for name in WB_INDICATORS:
        values = []
        for code in all_codes:
            v = macro_data.get(code, {}).get(name, {}).get("value")
            if v is not None:
                values.append((code, v))
        distributions[name] = values
    
    # Compute z-scores
    scored_data = {}
    for code in all_codes:
        scored_data[code] = {}
        for name in WB_INDICATORS:
            entry = macro_data.get(code, {}).get(name, {})
            if not entry.get("available"):
                scored_data[code][name] = {
                    "value": None, "available": False,
                    "z_score": None, "percentile": None,
                    "source": "World Bank", "last_updated": None,
                }
                continue
            
            value = entry["value"]
            all_values = [v for _, v in distributions.get(name, [])]
            z = compute_z_score(value, all_values)
            
            # Direction adjustment: for unemployment and inflation, lower is better
            if name in ("unemployment", "cpi_yoy", "ppi", "import_growth", "govt_debt_pct_gdp"):
                if z is not None:
                    z = -z  # Flip: lower raw value = higher (better) z-score
            
            percentile = round(normal_cdf(z) * 100, 1) if z is not None else None
            
            scored_data[code][name] = {
                "value": value,
                "available": True,
                "z_score": round(z, 2) if z is not None else None,
                "percentile": percentile,
                "source": "World Bank",
                "last_updated": str(entry.get("year", "")),
            }
    
    return scored_data


def integrate_macro_into_dashboard(dashboard: dict, scored_macro: dict) -> dict:
    """Inject macro scores into the dashboard data structure."""
    
    # Map WB indicator names to dashboard macro panel fields
    MACRO_MAP = {
        "growth": {
            "gdp_growth": "gdp_growth",
            "industrial_prod": "industrial_production",
            "retail_sales": "retail_sales",
            "export_growth": "exports",
        },
        "labor": {
            "unemployment": "unemployment",
        },
        "inflation": {
            "cpi_yoy": "cpi_yoy",
            "ppi": "ppi",
        },
        "external_balance": {
            "current_account": "current_account_pct_gdp",
            "trade_pct_gdp": "trade_balance",
            "fx_reserves": "fx_reserves",
            "export_growth": "export_growth",
            "import_growth": "import_growth",
        },
        "fiscal_debt": {
            "fiscal_balance": "fiscal_balance_pct_gdp",
            "govt_debt_pct_gdp": "govt_debt_pct_gdp",
        },
        "credit_cycle": {
            "private_credit": "private_credit_growth",
        },
    }
    
    for country in dashboard["countries"]:
        code = country["code"]
        macro = scored_macro.get(code, {})
        
        if "macro_scores" not in country:
            country["macro_scores"] = {}
        
        # Build macro structure — MERGE into existing, don't replace
        existing_panel = country.get("macro_panel", {})
        macro_category_scores = {}
        
        for category, field_map in MACRO_MAP.items():
            # Start from existing category data (preserves TE-scraped fields)
            existing_cat = existing_panel.get(category, {})
            z_scores = []
            avail_count = 0
            total_count = len(field_map)
            
            for wb_name, panel_name in field_map.items():
                indicator = macro.get(wb_name, {})
                # Only overwrite if World Bank actually has data for this field
                if indicator.get("available"):
                    existing_cat[panel_name] = indicator
                # If WB doesn't have it, keep whatever was already there (from TE)
                
                # Count from final merged data
                final = existing_cat.get(panel_name, {})
                if final.get("available") and final.get("z_score") is not None:
                    z_scores.append(final["z_score"])
                    avail_count += 1
            
            existing_panel[category] = existing_cat
            
            # Compute category score
            if z_scores:
                avg_z = sum(z_scores) / len(z_scores)
                macro_category_scores[category] = {
                    "z_score": round(avg_z, 2),
                    "percentile": round(normal_cdf(avg_z) * 100, 1),
                    "available_count": avail_count,
                    "total_count": total_count,
                }
            else:
                macro_category_scores[category] = {
                    "z_score": None,
                    "percentile": None,
                    "available_count": 0,
                    "total_count": total_count,
                }
        
        country["macro_panel"] = existing_panel
        country["macro_category_scores"] = macro_category_scores
        
        # Compute overall macro composite score
        all_macro_z = []
        for cat_score in macro_category_scores.values():
            if cat_score["z_score"] is not None:
                all_macro_z.append(cat_score["z_score"])
        
        if all_macro_z:
            macro_z = sum(all_macro_z) / len(all_macro_z)
            country["macro_composite"] = {
                "z_score": round(macro_z, 2),
                "percentile": round(normal_cdf(macro_z) * 100, 1),
                "available_count": len(all_macro_z),
                "total_count": len(MACRO_MAP),
            }
        else:
            country["macro_composite"] = {
                "z_score": None, "percentile": None,
                "available_count": 0, "total_count": len(MACRO_MAP),
            }
    
    return dashboard


def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  Macro Data Downloader — World Bank API                 ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"  Timestamp : {datetime.now().isoformat()}")
    print()
    
    # Load countries
    with open(COUNTRIES_FILE) as f:
        countries = json.load(f)
    
    codes = [c["code"] for c in countries]
    print(f"  Countries: {len(codes)}")
    print()
    
    # Fetch macro data
    print("============================================================")
    print("  DOWNLOADING MACRO DATA FROM WORLD BANK")
    print("============================================================")
    macro_data = fetch_all_macro_data(codes)
    
    # Count coverage
    print()
    for name in WB_INDICATORS:
        count = sum(1 for code in codes if macro_data.get(code, {}).get(name, {}).get("available", False))
        print(f"  {name:25s}: {count}/{len(codes)} countries")
    
    # Compute z-scores
    print()
    print("============================================================")
    print("  COMPUTING Z-SCORES AND PERCENTILES")
    print("============================================================")
    scored_macro = compute_macro_scores(macro_data, codes)
    
    # Save raw macro data
    os.makedirs(MACRO_OUTPUT.parent, exist_ok=True)
    with open(MACRO_OUTPUT, "w") as f:
        json.dump({"macro_data": macro_data, "scored_macro": scored_macro, "last_updated": datetime.now().isoformat()}, f, indent=2)
    print(f"  ✓ Saved macro data to {MACRO_OUTPUT} ({MACRO_OUTPUT.stat().st_size / 1024:.1f} KB)")
    
    # Load existing dashboard and integrate
    print()
    print("============================================================")
    print("  INTEGRATING INTO DASHBOARD DATA")
    print("============================================================")
    
    if not DASHBOARD_FILE.exists():
        print("  ⚠ No dashboard_data.json found — run update_data.py first!")
        sys.exit(1)
    
    with open(DASHBOARD_FILE) as f:
        dashboard = json.load(f)
    
    dashboard = integrate_macro_into_dashboard(dashboard, scored_macro)
    dashboard["macro_last_updated"] = datetime.now().isoformat()
    
    # Save
    with open(DASHBOARD_FILE, "w") as f:
        json.dump(dashboard, f, indent=2)
    print(f"  ✓ Updated {DASHBOARD_FILE} ({DASHBOARD_FILE.stat().st_size / 1024:.1f} KB)")
    
    with open(DASHBOARD_PROCESSED, "w") as f:
        json.dump(dashboard, f, indent=2)
    print(f"  ✓ Updated {DASHBOARD_PROCESSED} ({DASHBOARD_PROCESSED.stat().st_size / 1024:.1f} KB)")
    
    # Summary
    print()
    print("============================================================")
    print("  SUMMARY")
    print("============================================================")
    total_indicators = 0
    filled_indicators = 0
    for code in codes:
        for name in WB_INDICATORS:
            total_indicators += 1
            if scored_macro.get(code, {}).get(name, {}).get("available"):
                filled_indicators += 1
    
    print(f"  Macro indicators: {filled_indicators}/{total_indicators} filled ({filled_indicators/total_indicators*100:.1f}%)")
    print(f"  Countries with macro: {sum(1 for c in codes if any(scored_macro.get(c,{}).get(n,{}).get('available') for n in WB_INDICATORS))}/{len(codes)}")
    print()
    print(f"  ✓ Macro pipeline finished at {datetime.now().isoformat()}")
    print()


if __name__ == "__main__":
    main()
