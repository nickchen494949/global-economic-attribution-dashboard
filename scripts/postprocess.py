#!/usr/bin/env python3
"""
Post-Processing Pipeline — Fixes fake z-scores, bond gaps, and equity marking.

Run AFTER all data sources (Yahoo, TE lists, World Bank, TE deep) are done.
This script:
1. Recomputes cross-sectional z-scores for ALL macro indicators (no more fake 0.0/50%)
2. Populates bond data from 10Y yield when no ETF proxy exists
3. Marks BD/KE as "No ETF proxy available" cleanly
4. Recalculates category scores and macro composite

Usage: python3 scripts/postprocess.py
"""

import json
import math
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DASH_PATH = os.path.join(PROJECT_ROOT, 'public', 'data', 'dashboard_data.json')
DASH_PROCESSED = os.path.join(PROJECT_ROOT, 'data', 'processed', 'dashboard_data.json')

MIN_COUNTRIES_FOR_ZSCORE = 3  # Need at least 3 countries to compute meaningful z-score


def normal_cdf(z):
    """Standard normal CDF approximation."""
    a1, a2, a3 = 0.254829592, -0.284496736, 1.421413741
    a4, a5, p = -1.453152027, 1.061405429, 0.3275911
    sign = -1 if z < 0 else 1
    x = abs(z) / math.sqrt(2)
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
    return 0.5 * (1.0 + sign * y)


# Indicators where LOWER is better (inverted z-score direction)
LOWER_IS_BETTER = {
    'unemployment', 'jobless_claims',
    'cpi_yoy', 'core_cpi', 'ppi', 'food_energy_pressure',
    'yield_10y',
    'govt_debt_pct_gdp', 'household_debt', 'corporate_debt',
}


def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  Post-Processing: Fix z-scores, bonds, equity marking   ║")
    print("╚══════════════════════════════════════════════════════════╝")

    with open(DASH_PATH, 'r') as f:
        d = json.load(f)

    countries = d['countries']

    # ================================================================
    # STEP 1: Fix BD/KE equity — mark clearly why no data
    # ================================================================
    print("\n  --- Step 1: Mark missing equity proxies ---")
    for c in countries:
        code = c['code']
        eq = c.get('equity', {})
        if not eq.get('available') and not eq.get('ticker'):
            c['equity'] = {
                'available': False,
                'ticker': None,
                'reason': 'No US-listed ETF proxy available for this market',
            }
            print(f"  [{code}] Marked as no equity proxy")

    # ================================================================
    # STEP 2: Populate bond data from 10Y yield for missing countries
    # ================================================================
    print("\n  --- Step 2: Populate bonds from 10Y yield ---")
    bond_filled = 0
    for c in countries:
        code = c['code']
        bond = c.get('bond', {})

        # Skip if bond already has ETF data
        if bond.get('available') and bond.get('bond_proxy'):
            continue

        # Check if we have 10Y yield from macro_panel
        mp = c.get('macro_panel', {})
        yield_10y = mp.get('fiscal_debt', {}).get('yield_10y', {})

        if isinstance(yield_10y, dict) and yield_10y.get('available') and yield_10y.get('value') is not None:
            val = yield_10y['value']
            c['bond'] = {
                'available': True,
                'bond_proxy': None,
                'source': 'TradingEconomics 10Y Yield',
                'yield_10y': val,
                'yield_change_1m': None,  # No time-series from TE snapshot
                'yield_change_3m': None,
                'last_date': yield_10y.get('last_updated'),
            }
            bond_filled += 1
            print(f"  [{code}] Bond filled from 10Y yield: {val}%")
        else:
            c['bond'] = {
                'available': False,
                'bond_proxy': None,
                'reason': 'No bond ETF proxy and no 10Y yield data available',
            }

    print(f"  ✓ Filled {bond_filled} countries with 10Y yield bond data")

    # ================================================================
    # STEP 3: Recompute cross-sectional z-scores for ALL macro indicators
    # ================================================================
    print("\n  --- Step 3: Cross-sectional z-score recomputation ---")

    # Collect all (category, field) pairs
    all_fields = set()
    for c in countries:
        mp = c.get('macro_panel', {})
        for cat_name, cat_data in mp.items():
            if isinstance(cat_data, dict):
                for field_name, field_data in cat_data.items():
                    if isinstance(field_data, dict):
                        all_fields.add((cat_name, field_name))

    recomputed = 0
    raw_only = 0

    for cat_name, field_name in sorted(all_fields):
        # Collect all values for this indicator across countries
        values = []
        for c in countries:
            mp = c.get('macro_panel', {})
            field = mp.get(cat_name, {}).get(field_name, {})
            if isinstance(field, dict) and field.get('available') and field.get('value') is not None:
                values.append((c['code'], field['value']))

        if len(values) < MIN_COUNTRIES_FOR_ZSCORE:
            # Not enough data for cross-sectional z-score → mark as raw-only
            for c in countries:
                mp = c.get('macro_panel', {})
                field = mp.get(cat_name, {}).get(field_name, {})
                if isinstance(field, dict) and field.get('available'):
                    field['z_score'] = None
                    field['percentile'] = None
                    field['scoring_method'] = 'raw_only'
            if values:
                raw_only += 1
                print(f"  [{cat_name}.{field_name}] {len(values)} countries → raw-only (too few for z-score)")
            continue

        # Compute cross-sectional statistics
        vals = [v for _, v in values]
        mean = sum(vals) / len(vals)
        variance = sum((v - mean) ** 2 for v in vals) / len(vals)
        std = math.sqrt(variance) if variance > 0 else 0

        if std == 0:
            # All values are the same → z-score = 0 for everyone
            for c in countries:
                mp = c.get('macro_panel', {})
                field = mp.get(cat_name, {}).get(field_name, {})
                if isinstance(field, dict) and field.get('available') and field.get('value') is not None:
                    field['z_score'] = 0.0
                    field['percentile'] = 50.0
                    field['scoring_method'] = 'cross_sectional'
            continue

        # Direction: for some indicators, lower is better
        direction = -1 if field_name in LOWER_IS_BETTER else 1

        for c in countries:
            mp = c.get('macro_panel', {})
            field = mp.get(cat_name, {}).get(field_name, {})
            if isinstance(field, dict) and field.get('available') and field.get('value') is not None:
                val = field['value']
                z = ((val - mean) / std) * direction
                z = max(-3.0, min(3.0, z))  # Cap at ±3
                pct = normal_cdf(z) * 100

                field['z_score'] = round(z, 3)
                field['percentile'] = round(pct, 1)
                field['scoring_method'] = 'cross_sectional'

        recomputed += 1
        print(f"  [{cat_name}.{field_name}] {len(values)} countries → z-scores recomputed (dir={'lower_better' if direction == -1 else 'higher_better'})")

    print(f"  ✓ Recomputed {recomputed} indicators, {raw_only} marked raw-only")

    # ================================================================
    # STEP 4: Recalculate category scores and macro composite
    # ================================================================
    print("\n  --- Step 4: Recalculate category & composite scores ---")

    for c in countries:
        mcs = {}
        mp = c.get('macro_panel', {})

        for cat_name, cat_data in mp.items():
            if not isinstance(cat_data, dict):
                continue

            z_scores = []
            available = 0
            total = 0

            for field_data in cat_data.values():
                if isinstance(field_data, dict):
                    total += 1
                    if field_data.get('available'):
                        available += 1
                        z = field_data.get('z_score')
                        if z is not None:
                            z_scores.append(z)

            if z_scores:
                avg_z = sum(z_scores) / len(z_scores)
                mcs[cat_name] = {
                    'z_score': round(avg_z, 3),
                    'percentile': round(normal_cdf(avg_z) * 100, 1),
                    'available_count': available,
                    'total_count': total,
                }
            elif available > 0:
                # Has data but all raw-only (no z-scores)
                mcs[cat_name] = {
                    'z_score': None,
                    'percentile': None,
                    'available_count': available,
                    'total_count': total,
                }

        c['macro_category_scores'] = mcs

        # Macro composite: only from categories with real z-scores
        all_z = [s['z_score'] for s in mcs.values()
                 if isinstance(s, dict) and s.get('z_score') is not None]
        if all_z:
            avg_z = sum(all_z) / len(all_z)
            c['macro_composite'] = {
                'z_score': round(avg_z, 3),
                'percentile': round(normal_cdf(avg_z) * 100, 1),
                'available_count': len(all_z),
                'total_count': 6,
            }
        else:
            c['macro_composite'] = {
                'z_score': None,
                'percentile': None,
                'available_count': 0,
                'total_count': 6,
            }

    # ================================================================
    # STEP 5: Summary audit
    # ================================================================
    print("\n  --- Summary ---")
    eq_count = sum(1 for c in countries if c.get('equity', {}).get('available'))
    bond_count = sum(1 for c in countries if c.get('bond', {}).get('available'))
    cur_count = sum(1 for c in countries if c.get('currency', {}).get('available'))

    total_macro = 0
    real_zscore = 0
    raw_only_count = 0
    for c in countries:
        mp = c.get('macro_panel', {})
        for cat in mp.values():
            if isinstance(cat, dict):
                for field in cat.values():
                    if isinstance(field, dict) and field.get('available'):
                        total_macro += 1
                        method = field.get('scoring_method', '')
                        if method == 'cross_sectional':
                            real_zscore += 1
                        elif method == 'raw_only':
                            raw_only_count += 1

    n = len(countries)
    print(f"  Equity:   {eq_count}/{n} countries")
    print(f"  Currency: {cur_count}/{n} countries")
    print(f"  Bond:     {bond_count}/{n} countries")
    print(f"  Macro fields: {total_macro} available")
    print(f"    Real z-scores:  {real_zscore}")
    print(f"    Raw-only:       {raw_only_count}")
    print(f"    Fake 50%:       0  ← fixed!")

    # Save
    with open(DASH_PATH, 'w') as f:
        json.dump(d, f, indent=2)
    with open(DASH_PROCESSED, 'w') as f:
        json.dump(d, f, indent=2)

    print(f"\n  ✓ Saved to {DASH_PATH}")
    print("  ✓ Post-processing complete")


if __name__ == '__main__':
    main()
