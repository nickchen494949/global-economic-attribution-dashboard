#!/usr/bin/env python3
"""
fetch_valuation.py - Fetch valuation metrics from Yahoo Finance for country ETFs.

Fetches dividend yield, beta, and AUM for each country's equity ETF,
computes cross-sectional z-scores, and merges into dashboard_data.json.

Note: P/E and P/B are not available for ETFs via yfinance (returns None).
Dividend yield is used as the primary valuation proxy.
"""

import json
import time
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

import numpy as np

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run: pip install yfinance")
    sys.exit(1)

from scipy.stats import norm

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
COUNTRIES_PATH = PROJECT_ROOT / "src" / "data" / "countries.json"
DASHBOARD_PATH = PROJECT_ROOT / "public" / "data" / "dashboard_data.json"

REQUEST_DELAY = 0.3  # seconds between Yahoo Finance requests


def load_json(path: Path) -> dict | list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict | list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Saved to {path}")


def fetch_valuation_for_ticker(ticker: str) -> dict:
    """Fetch valuation metrics for a single ETF ticker via yfinance."""
    try:
        t = yf.Ticker(ticker)
        info = t.info

        # For ETFs: trailingPE and priceToBook return None
        # dividendYield, beta, and totalAssets (AUM) are available
        pe_ratio = info.get("trailingPE")       # Usually None for ETFs
        pb_ratio = info.get("priceToBook")      # Usually None for ETFs
        dividend_yield = info.get("dividendYield")
        beta = info.get("beta")
        aum = info.get("totalAssets")

        return {
            "pe_ratio": pe_ratio,
            "pb_ratio": pb_ratio,
            "dividend_yield": dividend_yield,
            "beta": beta,
            "aum": aum,
            "available": True,
            "source": "Yahoo Finance",
            "note": "P/E and P/B not available for ETFs; using dividend yield as valuation proxy"
                    if (pe_ratio is None and pb_ratio is None) else None,
        }
    except Exception as e:
        print(f"  ⚠ Error fetching {ticker}: {e}")
        return {
            "pe_ratio": None,
            "pb_ratio": None,
            "dividend_yield": None,
            "beta": None,
            "aum": None,
            "available": False,
            "source": "Yahoo Finance",
            "error": str(e),
        }


def compute_z_scores(valuations: dict[str, dict]) -> None:
    """
    Compute cross-sectional z-scores for valuation metrics.
    P/E: lower is better (direction = -1) — usually unavailable for ETFs
    P/B: lower is better (direction = -1) — usually unavailable for ETFs
    Dividend yield: higher is better (direction = 1) — primary valuation proxy
    """
    metrics_config = {
        "pe_ratio": -1,       # lower is better
        "pb_ratio": -1,       # lower is better
        "dividend_yield": 1,  # higher is better
    }

    # Collect raw values per metric
    metric_values = {m: {} for m in metrics_config}
    for code, val in valuations.items():
        if not val.get("available"):
            continue
        for metric in metrics_config:
            v = val.get(metric)
            if v is not None:
                metric_values[metric][code] = v

    # Compute per-metric z-scores
    z_scores_per_metric = {m: {} for m in metrics_config}
    for metric, direction in metrics_config.items():
        values = metric_values[metric]
        if len(values) < 3:
            print(f"  ⚠ Skipping z-score for {metric}: only {len(values)} data points (need ≥3)")
            continue

        arr = np.array(list(values.values()))
        mean = np.mean(arr)
        std = np.std(arr, ddof=1)
        if std < 1e-10:
            print(f"  ⚠ Skipping z-score for {metric}: zero std deviation")
            continue

        for code, v in values.items():
            raw_z = (v - mean) / std
            z_scores_per_metric[metric][code] = raw_z * direction

    # Compute composite valuation z-score per country
    for code, val in valuations.items():
        if not val.get("available"):
            val["pe_z"] = None
            val["pb_z"] = None
            val["div_yield_z"] = None
            val["valuation_z"] = None
            val["valuation_percentile"] = None
            continue

        component_zs = []

        # P/E z-score (usually None for ETFs)
        pe_z = z_scores_per_metric["pe_ratio"].get(code)
        val["pe_z"] = round(pe_z, 3) if pe_z is not None else None
        if pe_z is not None:
            component_zs.append(pe_z)

        # P/B z-score (usually None for ETFs)
        pb_z = z_scores_per_metric["pb_ratio"].get(code)
        val["pb_z"] = round(pb_z, 3) if pb_z is not None else None
        if pb_z is not None:
            component_zs.append(pb_z)

        # Dividend yield z-score (primary proxy)
        dy_z = z_scores_per_metric["dividend_yield"].get(code)
        val["div_yield_z"] = round(dy_z, 3) if dy_z is not None else None
        if dy_z is not None:
            component_zs.append(dy_z)

        if component_zs:
            composite = float(np.mean(component_zs))
            val["valuation_z"] = round(composite, 3)
            val["valuation_percentile"] = round(float(norm.cdf(composite)), 4)
        else:
            val["valuation_z"] = None
            val["valuation_percentile"] = None


def main():
    print("=" * 60)
    print("  VALUATION DATA FETCHER (Yahoo Finance)")
    print("=" * 60)
    print(f"  Time: {datetime.now(timezone.utc).isoformat()}")
    print()

    # 1. Load countries config
    countries = load_json(COUNTRIES_PATH)
    print(f"  Loaded {len(countries)} countries from countries.json")

    # 2. Fetch valuation data for each country
    valuations = {}
    success_count = 0
    skip_count = 0
    error_count = 0

    for i, country in enumerate(countries):
        code = country["code"]
        ticker = country.get("ticker_equity")
        name = country["country"]

        if not ticker:
            print(f"  [{i+1:2d}/{len(countries)}] {name} ({code}): No ticker_equity — skipping")
            valuations[code] = {
                "pe_ratio": None,
                "pb_ratio": None,
                "dividend_yield": None,
                "beta": None,
                "aum": None,
                "available": False,
                "source": "Yahoo Finance",
            }
            skip_count += 1
            continue

        print(f"  [{i+1:2d}/{len(countries)}] {name} ({code}): Fetching {ticker}...", end=" ")
        val = fetch_valuation_for_ticker(ticker)
        valuations[code] = val

        if val["available"]:
            dy = val["dividend_yield"]
            beta = val["beta"]
            aum = val["aum"]
            pe = val["pe_ratio"]
            pb = val["pb_ratio"]
            dy_str = f"{dy*100:.2f}%" if dy else "N/A"
            beta_str = f"{beta:.2f}" if beta else "N/A"
            aum_str = f"${aum/1e9:.1f}B" if aum else "N/A"
            pe_str = f"{pe:.1f}" if pe else "N/A"
            pb_str = f"{pb:.2f}" if pb else "N/A"
            print(f"Div={dy_str}  β={beta_str}  AUM={aum_str}  P/E={pe_str}  P/B={pb_str}")
            success_count += 1
        else:
            error_count += 1

        if i < len(countries) - 1:
            time.sleep(REQUEST_DELAY)

    print()
    print(f"  Fetched: {success_count} success, {skip_count} skipped, {error_count} errors")

    # 3. Compute z-scores
    print("\n  Computing cross-sectional z-scores...")
    compute_z_scores(valuations)

    # 4. Load dashboard_data.json and merge
    print(f"\n  Loading dashboard_data.json...")
    dashboard = load_json(DASHBOARD_PATH)

    country_map = {c["code"]: c for c in dashboard["countries"]}
    merged_count = 0
    for code, val in valuations.items():
        if code in country_map:
            country_map[code]["valuation"] = val
            merged_count += 1

    dashboard["last_updated"] = datetime.now(timezone.utc).isoformat()
    print(f"  Merged valuation data for {merged_count} countries")

    # 5. Save
    save_json(DASHBOARD_PATH, dashboard)

    # 6. Summary
    print("\n" + "=" * 60)
    print("  VALUATION SUMMARY")
    print("=" * 60)

    ranked = [
        (code, val) for code, val in valuations.items()
        if val.get("available") and val.get("valuation_z") is not None
    ]
    ranked.sort(key=lambda x: x[1]["valuation_z"], reverse=True)

    print(f"\n  {'Rank':<5} {'Code':<5} {'DivYld':>8} {'Beta':>6} {'AUM':>10} {'Val-Z':>7} {'Pctl':>7}")
    print("  " + "-" * 52)
    for i, (code, val) in enumerate(ranked, 1):
        dy = f"{val['dividend_yield']*100:.2f}%" if val['dividend_yield'] else "N/A"
        beta = f"{val['beta']:.2f}" if val['beta'] else "N/A"
        aum = f"${val['aum']/1e9:.1f}B" if val['aum'] else "N/A"
        vz = f"{val['valuation_z']:.3f}"
        pctl = f"{val['valuation_percentile']:.1%}" if val['valuation_percentile'] else "N/A"
        print(f"  {i:<5} {code:<5} {dy:>8} {beta:>6} {aum:>10} {vz:>7} {pctl:>7}")

    print(f"\n  ✅ Valuation fetch complete!")


if __name__ == "__main__":
    main()
