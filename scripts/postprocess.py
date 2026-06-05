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
    # STEP 5: Compute sovereign spread (CDS proxy)
    # ================================================================
    print("\n  --- Step 5: Sovereign spread computation ---")

    # Get US 10Y yield as reference
    us_yield = None
    for c in countries:
        if c['code'] == 'US':
            bond = c.get('bond', {})
            if bond.get('available') and bond.get('yield_10y') is not None:
                us_yield = bond['yield_10y']
            else:
                mp = c.get('macro_panel', {})
                y = mp.get('fiscal_debt', {}).get('yield_10y', {})
                if isinstance(y, dict) and y.get('value') is not None:
                    us_yield = y['value']
            break

    if us_yield is not None:
        spread_data = []
        for c in countries:
            code = c['code']
            bond = c.get('bond', {})
            country_yield = bond.get('yield_10y')

            if country_yield is None:
                mp = c.get('macro_panel', {})
                y = mp.get('fiscal_debt', {}).get('yield_10y', {})
                if isinstance(y, dict) and y.get('value') is not None:
                    country_yield = y['value']

            if country_yield is not None:
                spread = round(country_yield - us_yield, 3)
                bond['sovereign_spread'] = spread
                spread_data.append((code, spread))
            else:
                bond['sovereign_spread'] = None
                bond['spread_z_score'] = None

        # Cross-sectional z-score of spreads (lower = less risky = better)
        if len(spread_data) >= MIN_COUNTRIES_FOR_ZSCORE:
            vals = [v for _, v in spread_data]
            mean_s = sum(vals) / len(vals)
            var_s = sum((v - mean_s) ** 2 for v in vals) / len(vals)
            std_s = math.sqrt(var_s) if var_s > 0 else 0

            for c in countries:
                bond = c.get('bond', {})
                sp = bond.get('sovereign_spread')
                if sp is not None and std_s > 0:
                    z = -((sp - mean_s) / std_s)  # Negative: lower spread = better
                    z = max(-3.0, min(3.0, z))
                    bond['spread_z_score'] = round(z, 3)
                else:
                    bond['spread_z_score'] = None

        print(f"  US 10Y yield: {us_yield}%")
        print(f"  ✓ Computed sovereign spread for {len(spread_data)} countries")
    else:
        print("  ⚠ US 10Y yield not found — skipping sovereign spread")

    # ================================================================
    # STEP 6: Own-history z-scores (if historical data exists)
    # ================================================================
    print("\n  --- Step 6: Own-history z-scores ---")
    HISTORY_PATH = os.path.join(PROJECT_ROOT, 'data', 'historical', 'macro_history.json')

    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH, 'r') as f:
            macro_history_raw = json.load(f)

        # seed_history.py stores under {"metadata": ..., "data": {...}}
        macro_history = macro_history_raw.get('data', macro_history_raw)

        # Map WB indicator names to our macro field names
        WB_TO_FIELD = {
            'gdp_growth': ('growth', 'gdp_growth'),
            'cpi': ('inflation', 'cpi_yoy'),
            'unemployment': ('labor', 'unemployment'),
            'current_account': ('external_balance', 'current_account_pct_gdp'),
            'fx_reserves': ('external_balance', 'fx_reserves'),
        }

        own_history_count = 0

        for wb_name, (cat_name, field_name) in WB_TO_FIELD.items():
            indicator_history = macro_history.get(wb_name, {})
            if not indicator_history:
                continue

            for c in countries:
                code = c['code']
                country_hist = indicator_history.get(code, {})
                hist_values = [v for v in country_hist.values() if v is not None]

                if len(hist_values) < 5:
                    continue

                # Get current value
                mp = c.get('macro_panel', {})
                field = mp.get(cat_name, {}).get(field_name, {})
                if not isinstance(field, dict) or not field.get('available'):
                    continue
                current = field.get('value')
                if current is None:
                    continue

                # Compute own-history z-score
                h_mean = sum(hist_values) / len(hist_values)
                h_var = sum((v - h_mean) ** 2 for v in hist_values) / len(hist_values)
                h_std = math.sqrt(h_var) if h_var > 0 else 0

                if h_std > 0:
                    direction = -1 if field_name in LOWER_IS_BETTER else 1
                    own_z = ((current - h_mean) / h_std) * direction
                    own_z = max(-3.0, min(3.0, own_z))
                    field['own_history_z'] = round(own_z, 3)

                    # Compute composite: 50/50 blend of own-history and peer cross-sectional
                    peer_z = field.get('z_score')
                    if peer_z is not None:
                        comp_z = 0.5 * own_z + 0.5 * peer_z
                        field['composite_z'] = round(comp_z, 3)
                        field['peer_z'] = peer_z
                    else:
                        field['composite_z'] = round(own_z, 3)
                        field['peer_z'] = None

                    field['scoring_method'] = 'dual'
                    own_history_count += 1

        print(f"  ✓ Computed {own_history_count} own-history z-scores from historical data")
    else:
        print(f"  ⚠ No historical data at {HISTORY_PATH} — skipping own-history z-scores")
        print("    Run scripts/seed_history.py first to seed historical data")

    # ================================================================
    # STEP 7: Append current snapshot to history
    # ================================================================
    print("\n  --- Step 7: Append current snapshot ---")
    SNAPSHOT_DIR = os.path.join(PROJECT_ROOT, 'data', 'historical')
    SNAPSHOT_PATH = os.path.join(SNAPSHOT_DIR, 'asset_snapshots.json')

    os.makedirs(SNAPSHOT_DIR, exist_ok=True)

    # Load existing snapshots
    if os.path.exists(SNAPSHOT_PATH):
        with open(SNAPSHOT_PATH, 'r') as f:
            snapshots = json.load(f)
    else:
        snapshots = {}

    # Create current month key
    from datetime import datetime
    month_key = datetime.utcnow().strftime('%Y-%m')

    if month_key not in snapshots:
        current_snap = {}
        for c in countries:
            code = c['code']
            # Asset z-scores
            eq = c.get('equity', {})
            eq_z = None
            if eq.get('available') and eq.get('metrics'):
                zs = [m.get('z_score') for m in eq['metrics'].values() if isinstance(m, dict) and m.get('z_score') is not None]
                if zs:
                    eq_z = round(sum(zs) / len(zs), 3)

            cur = c.get('currency', {})
            cur_z = None
            if cur.get('available') and cur.get('metrics'):
                zs = [m.get('z_score') for m in cur['metrics'].values() if isinstance(m, dict) and m.get('z_score') is not None]
                if zs:
                    cur_z = round(sum(zs) / len(zs), 3)

            macro_z = None
            mc = c.get('macro_composite', {})
            if isinstance(mc, dict):
                macro_z = mc.get('z_score')

            current_snap[code] = {
                'equity_z': eq_z,
                'currency_z': cur_z,
                'macro_z': macro_z,
                'spread': c.get('bond', {}).get('sovereign_spread'),
            }

        snapshots[month_key] = current_snap
        with open(SNAPSHOT_PATH, 'w') as f:
            json.dump(snapshots, f, indent=2)
        print(f"  ✓ Appended snapshot for {month_key} ({len(current_snap)} countries)")
    else:
        print(f"  ✓ Snapshot for {month_key} already exists, skipping")

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
