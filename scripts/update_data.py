#!/usr/bin/env python3
"""
Global Economic Attribution Dashboard — Data Pipeline
======================================================
Fetches equity, currency, and futures data from Yahoo Finance,
computes rolling z-scores and percentiles, and outputs JSON files
consumed by the React dashboard.

Run from the project root:
    python scripts/update_data.py
"""

import json
import os
import sys
import time
import shutil
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf
from scipy.stats import norm

# ───────────────────────────────────────────────────────────────
# Constants
# ───────────────────────────────────────────────────────────────

LOOKBACK_YEARS = 3
MIN_OBS = 252  # minimum observations for z-score computation
ZSCORE_CAP = 3.0
REQUEST_DELAY = 0.35  # seconds between Yahoo Finance requests

RETURN_WINDOWS = {
    "1M": 21,
    "3M": 63,
    "6M": 126,
    "12M": 252,
}

GLOBAL_FUTURES = {
    "SPY": {"name": "S&P 500", "category": "equity", "direction": 1},
    "QQQ": {"name": "Nasdaq 100", "category": "equity", "direction": 1},
    "TLT": {"name": "10Y Bond (Long)", "category": "rates", "direction": 1},
    "SHY": {"name": "2Y Bond (Short)", "category": "rates", "direction": 1},
    "UUP": {"name": "US Dollar", "category": "currency", "direction": 1},
    "USO": {"name": "Crude Oil", "category": "commodity", "direction": 1},
    "CPER": {"name": "Copper", "category": "commodity", "direction": 1},
    "GLD": {"name": "Gold", "category": "commodity", "direction": 1},
    "VIXY": {"name": "VIX (Volatility)", "category": "volatility", "direction": -1},
    "DBA": {"name": "Agriculture", "category": "commodity", "direction": 1},
}

# ───────────────────────────────────────────────────────────────
# Path resolution (works when run from project root)
# ───────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

COUNTRIES_JSON = PROJECT_ROOT / "src" / "data" / "countries.json"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"

# ───────────────────────────────────────────────────────────────
# Utility helpers
# ───────────────────────────────────────────────────────────────


def ensure_dirs() -> None:
    """Create output directories if they don't exist."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_countries() -> list[dict]:
    """Load country definitions from countries.json."""
    with open(COUNTRIES_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_price_data(ticker: str, period_years: int = LOOKBACK_YEARS) -> pd.Series | None:
    """
    Download adjusted close prices for *ticker* from Yahoo Finance.
    Returns a cleaned pd.Series indexed by date, or None on failure.
    """
    try:
        end = datetime.now()
        start = end - timedelta(days=period_years * 365 + 30)  # extra buffer
        tk = yf.Ticker(ticker)
        df = tk.history(start=start.strftime("%Y-%m-%d"), end=end.strftime("%Y-%m-%d"))
        if df is None or df.empty:
            return None
        prices = df["Close"].dropna()
        if len(prices) < 30:
            return None
        prices.index = pd.to_datetime(prices.index).tz_localize(None)
        return prices
    except Exception as exc:
        print(f"    ⚠  yfinance error for {ticker}: {exc}")
        return None


def compute_returns(prices: pd.Series) -> dict[str, float | None]:
    """Compute 1M/3M/6M/12M returns from a price series."""
    results: dict[str, float | None] = {}
    for label, days in RETURN_WINDOWS.items():
        if len(prices) >= days + 1:
            ret = float((prices.iloc[-1] / prices.iloc[-days - 1]) - 1)
            results[label] = round(ret * 100, 2)  # percent
        else:
            results[label] = None
    return results


def compute_zscore_and_percentile(
    prices: pd.Series,
    window_days: int,
    direction: int = 1,
) -> dict[str, dict[str, float | None]]:
    """
    For each return window compute a rolling z-score (3-year window)
    and a percentile via the normal CDF.

    Parameters
    ----------
    prices : pd.Series — daily close prices
    window_days : unused here (we use the full 3-year rolling window)
    direction : 1 if higher = better, -1 if lower = better
    """
    results: dict[str, dict[str, float | None]] = {}

    for label, days in RETURN_WINDOWS.items():
        if len(prices) < days + 1:
            results[label] = {"return_pct": None, "z_score": None, "percentile": None}
            continue

        # Compute rolling returns over the entire price history
        rolling_ret = prices.pct_change(periods=days).dropna()

        if len(rolling_ret) < MIN_OBS:
            # Not enough history for z-score
            current_ret = float((prices.iloc[-1] / prices.iloc[-days - 1]) - 1)
            results[label] = {
                "return_pct": round(current_ret * 100, 2),
                "z_score": None,
                "percentile": None,
            }
            continue

        mean = rolling_ret.mean()
        std = rolling_ret.std()

        current_ret = rolling_ret.iloc[-1]

        if std == 0 or np.isnan(std):
            z = 0.0
        else:
            z = float((current_ret - mean) / std) * direction

        z = float(np.clip(z, -ZSCORE_CAP, ZSCORE_CAP))
        pct = float(norm.cdf(z))

        results[label] = {
            "return_pct": round(current_ret * 100, 2),
            "z_score": round(z, 3),
            "percentile": round(pct, 4),
        }

    return results


def percentile_to_color(pct: float | None) -> str:
    """Map a percentile value to a color class name."""
    if pct is None:
        return "gray"
    if pct >= 0.7:
        return "green"
    if pct >= 0.4:
        return "yellow"
    return "red"


def safe_float(val) -> float | None:
    """Convert value to float or None if NaN / invalid."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if np.isnan(f) or np.isinf(f) else f
    except (ValueError, TypeError):
        return None


# ───────────────────────────────────────────────────────────────
# Data-fetching pipelines
# ───────────────────────────────────────────────────────────────


def process_equity(countries: list[dict]) -> tuple[dict, int, int]:
    """Fetch and process equity data for all countries."""
    print("\n" + "=" * 60)
    print("  EQUITY DATA")
    print("=" * 60)

    equity_data: dict[str, dict] = {}
    successes = 0
    failures = 0

    for c in countries:
        code = c["code"]
        name = c["country"]
        ticker = c.get("ticker_equity")
        if not ticker:
            print(f"  [{code}] {name} — no equity ticker, skipping")
            equity_data[code] = {"available": False, "ticker": None}
            continue

        print(f"  [{code}] Fetching {name} equity ({ticker})...", end=" ", flush=True)
        prices = fetch_price_data(ticker)
        time.sleep(REQUEST_DELAY)

        if prices is None:
            print("FAILED")
            equity_data[code] = {"available": False, "ticker": ticker}
            failures += 1
            continue

        print("OK")
        returns = compute_returns(prices)
        metrics = compute_zscore_and_percentile(prices, window_days=0, direction=1)
        last_price = safe_float(prices.iloc[-1])
        last_date = prices.index[-1].strftime("%Y-%m-%d")

        equity_data[code] = {
            "available": True,
            "ticker": ticker,
            "last_price": last_price,
            "last_date": last_date,
            "returns": returns,
            "metrics": {
                period: {
                    "return_pct": m["return_pct"],
                    "z_score": m["z_score"],
                    "percentile": m["percentile"],
                    "color": percentile_to_color(m["percentile"]),
                }
                for period, m in metrics.items()
            },
        }
        successes += 1

    return equity_data, successes, failures


def process_currency(countries: list[dict]) -> tuple[dict, int, int]:
    """Fetch and process currency data for all countries."""
    print("\n" + "=" * 60)
    print("  CURRENCY DATA")
    print("=" * 60)

    currency_data: dict[str, dict] = {}
    successes = 0
    failures = 0

    # De-duplicate currency pairs (e.g. EUR countries share EURUSD=X)
    seen_pairs: dict[str, pd.Series | None] = {}

    for c in countries:
        code = c["code"]
        name = c["country"]
        pair = c.get("currency_pair")
        if not pair:
            print(f"  [{code}] {name} — no currency pair, skipping")
            currency_data[code] = {"available": False, "currency_pair": None}
            continue

        print(f"  [{code}] Fetching {name} currency ({pair})...", end=" ", flush=True)

        if pair in seen_pairs:
            prices = seen_pairs[pair]
            if prices is not None:
                print("OK (cached)")
            else:
                print("FAILED (cached)")
        else:
            prices = fetch_price_data(pair)
            seen_pairs[pair] = prices
            time.sleep(REQUEST_DELAY)

            if prices is None:
                print("FAILED")
            else:
                print("OK")

        if prices is None:
            currency_data[code] = {"available": False, "currency_pair": pair}
            failures += 1
            continue

        # Direction: all pairs in countries.json are XXXUSD=X format
        # Positive Yahoo return = stronger local currency (good)
        # Exception: US dollar index (DX-Y.NYB) — higher = stronger USD (good for US)
        direction = 1

        returns = compute_returns(prices)
        metrics = compute_zscore_and_percentile(prices, window_days=0, direction=direction)
        last_price = safe_float(prices.iloc[-1])
        last_date = prices.index[-1].strftime("%Y-%m-%d")

        currency_data[code] = {
            "available": True,
            "currency_pair": pair,
            "last_price": last_price,
            "last_date": last_date,
            "returns": returns,
            "metrics": {
                period: {
                    "return_pct": m["return_pct"],
                    "z_score": m["z_score"],
                    "percentile": m["percentile"],
                    "color": percentile_to_color(m["percentile"]),
                }
                for period, m in metrics.items()
            },
        }
        successes += 1

    return currency_data, successes, failures


def process_bonds(countries: list[dict]) -> tuple[dict, int, int]:
    """Fetch and process bond proxy data for countries with bond_proxy != null."""
    print("\n" + "=" * 60)
    print("  BOND DATA")
    print("=" * 60)

    bond_data: dict[str, dict] = {}
    successes = 0
    failures = 0

    for c in countries:
        code = c["code"]
        name = c["country"]
        proxy = c.get("bond_proxy")
        if not proxy:
            bond_data[code] = {"available": False, "bond_proxy": None}
            continue

        print(f"  [{code}] Fetching {name} bond proxy ({proxy})...", end=" ", flush=True)
        prices = fetch_price_data(proxy)
        time.sleep(REQUEST_DELAY)

        if prices is None:
            print("FAILED")
            bond_data[code] = {"available": False, "bond_proxy": proxy}
            failures += 1
            continue

        print("OK")
        returns = compute_returns(prices)
        # For bonds, higher price = lower yield = easing conditions → direction=1 (good)
        metrics = compute_zscore_and_percentile(prices, window_days=0, direction=1)
        last_price = safe_float(prices.iloc[-1])
        last_date = prices.index[-1].strftime("%Y-%m-%d")

        bond_data[code] = {
            "available": True,
            "bond_proxy": proxy,
            "last_price": last_price,
            "last_date": last_date,
            "returns": returns,
            "metrics": {
                period: {
                    "return_pct": m["return_pct"],
                    "z_score": m["z_score"],
                    "percentile": m["percentile"],
                    "color": percentile_to_color(m["percentile"]),
                }
                for period, m in metrics.items()
            },
        }
        successes += 1

    return bond_data, successes, failures


def process_global_futures() -> dict:
    """Fetch and process the global futures / macro panel."""
    print("\n" + "=" * 60)
    print("  GLOBAL FUTURES PANEL")
    print("=" * 60)

    futures_data: dict[str, dict] = {}

    for ticker, info in GLOBAL_FUTURES.items():
        print(f"  Fetching {info['name']} ({ticker})...", end=" ", flush=True)
        prices = fetch_price_data(ticker)
        time.sleep(REQUEST_DELAY)

        if prices is None:
            print("FAILED")
            futures_data[ticker] = {
                "available": False,
                "name": info["name"],
                "category": info["category"],
            }
            continue

        print("OK")
        returns = compute_returns(prices)
        metrics = compute_zscore_and_percentile(
            prices, window_days=0, direction=info["direction"]
        )
        last_price = safe_float(prices.iloc[-1])
        last_date = prices.index[-1].strftime("%Y-%m-%d")

        futures_data[ticker] = {
            "available": True,
            "name": info["name"],
            "category": info["category"],
            "ticker": ticker,
            "last_price": last_price,
            "last_date": last_date,
            "returns": returns,
            "metrics": {
                period: {
                    "return_pct": m["return_pct"],
                    "z_score": m["z_score"],
                    "percentile": m["percentile"],
                    "color": percentile_to_color(m["percentile"]),
                }
                for period, m in metrics.items()
            },
        }

    return futures_data


# ───────────────────────────────────────────────────────────────
# Peer benchmarks
# ───────────────────────────────────────────────────────────────


def compute_peer_benchmarks(
    countries: list[dict],
    equity_data: dict,
    currency_data: dict,
    bond_data: dict,
) -> dict:
    """
    Compute peer benchmarks across all 5 classification dimensions:
    global, region, development_stage, global_roles, openness_type,
    and external_vulnerability.

    Each benchmark group outputs:
        { z_score, percentile, group_size, best_country, worst_country, dispersion }
    per asset class and period.
    """

    # ── helpers ──────────────────────────────────────────────

    def _z_values_for(data_dict: dict, codes: list[str], period: str) -> list[tuple[str, float]]:
        """Return list of (country_code, z_score) pairs that have data."""
        pairs: list[tuple[str, float]] = []
        for code in codes:
            entry = data_dict.get(code, {})
            if not entry.get("available"):
                continue
            z = entry.get("metrics", {}).get(period, {}).get("z_score")
            if z is not None:
                pairs.append((code, z))
        return pairs

    def _composite_z(code: str, period: str) -> float | None:
        """Average z-score across available asset classes for one country/period."""
        zs: list[float] = []
        for data_dict in (equity_data, currency_data, bond_data):
            entry = data_dict.get(code, {})
            if entry.get("available"):
                z = entry.get("metrics", {}).get(period, {}).get("z_score")
                if z is not None:
                    zs.append(z)
        return float(np.mean(zs)) if zs else None

    code_to_country: dict[str, str] = {c["code"]: c["country"] for c in countries}

    def build_asset_bench(data_dict: dict, codes: list[str]) -> dict:
        """Build benchmark dict for one asset class over a set of codes."""
        result: dict[str, dict] = {}
        for period in RETURN_WINDOWS:
            pairs = _z_values_for(data_dict, codes, period)
            if pairs:
                values = [v for _, v in pairs]
                mean_z = float(np.mean(values))
                mean_z_capped = float(np.clip(mean_z, -ZSCORE_CAP, ZSCORE_CAP))
                pct = float(norm.cdf(mean_z_capped))
                best_code = max(pairs, key=lambda p: p[1])[0]
                worst_code = min(pairs, key=lambda p: p[1])[0]
                dispersion = float(np.std(values)) if len(values) > 1 else 0.0
                result[period] = {
                    "z_score": round(mean_z, 3),
                    "percentile": round(pct, 4),
                    "group_size": len(pairs),
                    "best_country": code_to_country.get(best_code, best_code),
                    "worst_country": code_to_country.get(worst_code, worst_code),
                    "dispersion": round(dispersion, 3),
                }
            else:
                result[period] = {
                    "z_score": None,
                    "percentile": None,
                    "group_size": 0,
                    "best_country": None,
                    "worst_country": None,
                    "dispersion": None,
                }
        return result

    def build_group_bench(codes: list[str]) -> dict:
        """Build full benchmark for a group of countries (all asset classes + countries list)."""
        return {
            "equity": build_asset_bench(equity_data, codes),
            "currency": build_asset_bench(currency_data, codes),
            "bond": build_asset_bench(bond_data, codes),
            "countries": codes,
        }

    # ── group countries by each dimension ────────────────────

    all_codes = [c["code"] for c in countries]

    # Region
    regions: dict[str, list[str]] = {}
    for c in countries:
        regions.setdefault(c["region"], []).append(c["code"])

    # Development stage
    dev_stages: dict[str, list[str]] = {}
    for c in countries:
        dev_stages.setdefault(c["development_stage"], []).append(c["code"])

    # Global roles (array — a country can appear in multiple groups)
    global_roles: dict[str, list[str]] = {}
    for c in countries:
        for role in c.get("global_roles", []):
            global_roles.setdefault(role, []).append(c["code"])

    # Openness type
    openness: dict[str, list[str]] = {}
    for c in countries:
        openness.setdefault(c["openness_type"], []).append(c["code"])

    # External vulnerability
    ext_vuln: dict[str, list[str]] = {}
    for c in countries:
        ext_vuln.setdefault(c["external_vulnerability"], []).append(c["code"])

    # ── assemble benchmarks ──────────────────────────────────

    benchmarks: dict = {
        "global": build_group_bench(all_codes),
        "regions": {region: build_group_bench(codes) for region, codes in regions.items()},
        "development_stages": {stage: build_group_bench(codes) for stage, codes in dev_stages.items()},
        "global_roles": {role: build_group_bench(codes) for role, codes in global_roles.items()},
        "openness_types": {ot: build_group_bench(codes) for ot, codes in openness.items()},
        "external_vulnerabilities": {ev: build_group_bench(codes) for ev, codes in ext_vuln.items()},
    }

    return benchmarks


# ───────────────────────────────────────────────────────────────
# Composite score
# ───────────────────────────────────────────────────────────────


def compute_composite_scores(
    countries: list[dict],
    equity_data: dict,
    currency_data: dict,
    bond_data: dict,
) -> dict[str, dict]:
    """
    Compute a composite z-score / percentile for each country.
    Equal-weight average of available asset z-scores at each period.
    """
    composites: dict[str, dict] = {}

    for c in countries:
        code = c["code"]
        composite_periods: dict[str, dict] = {}

        for period in RETURN_WINDOWS:
            zscores = []

            # Equity
            eq = equity_data.get(code, {})
            if eq.get("available"):
                ez = eq.get("metrics", {}).get(period, {}).get("z_score")
                if ez is not None:
                    zscores.append(ez)

            # Currency
            cx = currency_data.get(code, {})
            if cx.get("available"):
                cz = cx.get("metrics", {}).get(period, {}).get("z_score")
                if cz is not None:
                    zscores.append(cz)

            # Bond
            bd = bond_data.get(code, {})
            if bd.get("available"):
                bz = bd.get("metrics", {}).get(period, {}).get("z_score")
                if bz is not None:
                    zscores.append(bz)

            if zscores:
                avg_z = float(np.mean(zscores))
                avg_z = float(np.clip(avg_z, -ZSCORE_CAP, ZSCORE_CAP))
                pct = float(norm.cdf(avg_z))
                composite_periods[period] = {
                    "z_score": round(avg_z, 3),
                    "percentile": round(pct, 4),
                    "color": percentile_to_color(pct),
                    "n_signals": len(zscores),
                }
            else:
                composite_periods[period] = {
                    "z_score": None,
                    "percentile": None,
                    "color": "gray",
                    "n_signals": 0,
                }

        composites[code] = composite_periods

    return composites


# ───────────────────────────────────────────────────────────────
# Assemble full dashboard payload
# ───────────────────────────────────────────────────────────────


def build_dashboard_data(
    countries: list[dict],
    equity_data: dict,
    currency_data: dict,
    bond_data: dict,
    futures_data: dict,
    benchmarks: dict,
    composites: dict,
) -> dict:
    """Build the complete DashboardData-compatible JSON structure."""

    country_entries = []
    for c in countries:
        code = c["code"]
        entry = {
            "country": c["country"],
            "code": code,
            "region": c["region"],
            "development_stage": c["development_stage"],
            "global_roles": c["global_roles"],
            "openness_type": c["openness_type"],
            "external_vulnerability": c["external_vulnerability"],
            "equity": equity_data.get(code, {"available": False}),
            "currency": currency_data.get(code, {"available": False}),
            "bond": bond_data.get(code, {"available": False}),
            "composite": composites.get(code, {}),
        }
        country_entries.append(entry)

    return {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "is_sample_data": False,
        "data_version": "1.0.0",
        "countries": country_entries,
        "global_futures": futures_data,
        "benchmarks": benchmarks,
        "metadata": {
            "return_windows": list(RETURN_WINDOWS.keys()),
            "return_window_days": RETURN_WINDOWS,
            "lookback_years": LOOKBACK_YEARS,
            "min_observations": MIN_OBS,
            "zscore_cap": ZSCORE_CAP,
            "total_countries": len(countries),
        },
    }


# ───────────────────────────────────────────────────────────────
# File I/O
# ───────────────────────────────────────────────────────────────


def save_json(data: dict | list, filepath: Path) -> None:
    """Serialize *data* to a JSON file at *filepath*."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    size_kb = filepath.stat().st_size / 1024
    print(f"  ✓ Saved {filepath.relative_to(PROJECT_ROOT)} ({size_kb:.1f} KB)")


# ───────────────────────────────────────────────────────────────
# Main entry point
# ───────────────────────────────────────────────────────────────


def main() -> None:
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  Global Economic Attribution Dashboard — Data Pipeline  ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"  Timestamp : {datetime.now().isoformat()}")
    print(f"  Project   : {PROJECT_ROOT}")
    print(f"  Countries : {COUNTRIES_JSON}")

    # ── Validate paths ──────────────────────────────────────
    if not COUNTRIES_JSON.exists():
        print(f"\n✗ countries.json not found at {COUNTRIES_JSON}")
        print("  Make sure you run this script from the project root:")
        print("    python scripts/update_data.py")
        sys.exit(1)

    ensure_dirs()
    countries = load_countries()
    total = len(countries)
    print(f"\n  Loaded {total} country definitions.\n")

    # ── Fetch & process ─────────────────────────────────────
    equity_data, eq_ok, eq_fail = process_equity(countries)
    currency_data, fx_ok, fx_fail = process_currency(countries)
    bond_data, bd_ok, bd_fail = process_bonds(countries)
    futures_data = process_global_futures()

    # ── Compute analytics ───────────────────────────────────
    print("\n" + "=" * 60)
    print("  COMPUTING ANALYTICS")
    print("=" * 60)

    benchmarks = compute_peer_benchmarks(countries, equity_data, currency_data, bond_data)
    print("  ✓ Peer benchmarks (global + region + development_stage + global_roles + openness_type + external_vulnerability)")

    composites = compute_composite_scores(countries, equity_data, currency_data, bond_data)
    print("  ✓ Composite scores")

    dashboard = build_dashboard_data(
        countries, equity_data, currency_data, bond_data,
        futures_data, benchmarks, composites,
    )
    print("  ✓ Dashboard payload assembled")

    # ── Save outputs ────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  SAVING OUTPUT FILES")
    print("=" * 60)

    save_json(equity_data, PROCESSED_DIR / "equity_data.json")
    save_json(currency_data, PROCESSED_DIR / "currency_data.json")
    save_json(futures_data, PROCESSED_DIR / "global_futures.json")
    save_json(dashboard, PROCESSED_DIR / "dashboard_data.json")

    # Copy to public directory for the React app
    public_dest = PUBLIC_DATA_DIR / "dashboard_data.json"
    shutil.copy2(PROCESSED_DIR / "dashboard_data.json", public_dest)
    size_kb = public_dest.stat().st_size / 1024
    print(f"  ✓ Copied to {public_dest.relative_to(PROJECT_ROOT)} ({size_kb:.1f} KB)")

    # ── Summary ─────────────────────────────────────────────
    futures_ok = sum(1 for v in futures_data.values() if v.get("available"))
    futures_fail = len(futures_data) - futures_ok

    total_ok = eq_ok + fx_ok + bd_ok
    total_fail = eq_fail + fx_fail + bd_fail

    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print(f"  Equity   : {eq_ok} OK / {eq_fail} failed")
    print(f"  Currency : {fx_ok} OK / {fx_fail} failed")
    print(f"  Bonds    : {bd_ok} OK / {bd_fail} failed")
    print(f"  Futures  : {futures_ok} OK / {futures_fail} failed")
    print(f"  ──────────────────────────────────")
    print(f"  Completed: {eq_ok}/{total} countries (equity), "
          f"{fx_ok}/{total} countries (currency)")
    print(f"  Total failures: {total_fail}")
    print(f"\n  ✓ Pipeline finished at {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
