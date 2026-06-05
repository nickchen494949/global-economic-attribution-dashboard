#!/usr/bin/env python3
"""
Forward Return Backtest — Validates label predictive power.

Stores monthly classification snapshots and computes:
- Average forward 1M/3M/6M returns by label
- Hit rate (% of True Alpha that outperformed)
- Information ratio

Requires at least 3 months of historical snapshots to produce results.

Usage: python3 scripts/backtest.py
"""

import json
import os
import math
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DASH_PATH = os.path.join(PROJECT_ROOT, 'public', 'data', 'dashboard_data.json')
HISTORY_DIR = os.path.join(PROJECT_ROOT, 'data', 'historical')
CLASSIFICATIONS_PATH = os.path.join(HISTORY_DIR, 'classifications.json')
ASSET_SNAPSHOTS_PATH = os.path.join(HISTORY_DIR, 'asset_snapshots.json')
BACKTEST_OUTPUT = os.path.join(PROJECT_ROOT, 'public', 'data', 'backtest_results.json')

LABELS = ['True Alpha', 'Fake Alpha', 'Hidden Alpha', 'Beta', 'Negative Drift', 'Crisis Risk']


def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  Backtest: Label Predictive Power Validation            ║")
    print("╚══════════════════════════════════════════════════════════╝")

    os.makedirs(HISTORY_DIR, exist_ok=True)

    # ── Step 1: Load current dashboard and store classification snapshot ──
    with open(DASH_PATH, 'r') as f:
        dashboard = json.load(f)

    # Load existing classifications
    if os.path.exists(CLASSIFICATIONS_PATH):
        with open(CLASSIFICATIONS_PATH, 'r') as f:
            classifications = json.load(f)
    else:
        classifications = {}

    month_key = datetime.utcnow().strftime('%Y-%m')

    if month_key not in classifications:
        snap = {}
        for c in dashboard['countries']:
            code = c['code']
            # Try to get label from the adapter output
            # In raw pipeline data, labels are computed by the adapter
            # We'll store the composite scores + macro for later analysis
            eq = c.get('equity', {})
            cur = c.get('currency', {})
            mc = c.get('macro_composite', {})

            eq_z = None
            if eq.get('available') and eq.get('metrics'):
                zs = [m.get('z_score') for m in eq['metrics'].values()
                      if isinstance(m, dict) and m.get('z_score') is not None]
                if zs:
                    eq_z = round(sum(zs) / len(zs), 3)

            snap[code] = {
                'equity_z': eq_z,
                'macro_z': mc.get('z_score') if isinstance(mc, dict) else None,
                'spread': c.get('bond', {}).get('sovereign_spread'),
                'composite_3m': c.get('composite', {}).get('3M', {}).get('z_score'),
            }

        classifications[month_key] = snap
        with open(CLASSIFICATIONS_PATH, 'w') as f:
            json.dump(classifications, f, indent=2)
        print(f"  ✓ Stored classification snapshot for {month_key}")
    else:
        print(f"  ✓ Classification snapshot for {month_key} already exists")

    # ── Step 2: Check if we have enough history for backtest ──
    months = sorted(classifications.keys())
    n_months = len(months)
    print(f"\n  Historical snapshots: {n_months} months ({months[0] if months else 'none'} → {months[-1] if months else 'none'})")

    if n_months < 3:
        print(f"\n  ⚠ Insufficient data for backtest (need ≥ 3 months, have {n_months})")
        print("    Backtest will be available after 3+ monthly pipeline runs.")

        # Write minimal backtest results
        results = {
            'status': 'insufficient_data',
            'months_available': n_months,
            'months_needed': 3,
            'message': f'Need at least 3 months of data. Currently have {n_months} month(s).',
            'snapshots': months,
            'last_updated': datetime.utcnow().isoformat() + 'Z',
        }
        with open(BACKTEST_OUTPUT, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"  ✓ Saved placeholder to {BACKTEST_OUTPUT}")
        return

    # ── Step 3: Compute forward returns ──
    print("\n  Computing forward returns...")

    # Load asset snapshots for return computation
    if os.path.exists(ASSET_SNAPSHOTS_PATH):
        with open(ASSET_SNAPSHOTS_PATH, 'r') as f:
            asset_snapshots = json.load(f)
    else:
        asset_snapshots = {}

    # For each historical month, compare equity_z at T with equity_z at T+1, T+3
    forward_returns = {}  # month -> { code: { '1M': z_change, '3M': z_change } }

    for i, month in enumerate(months):
        forward_returns[month] = {}
        snap = classifications[month]

        for code, data in snap.items():
            fwd = {}
            # 1-month forward
            if i + 1 < len(months):
                next_month = months[i + 1]
                next_snap = classifications.get(next_month, {})
                if code in next_snap:
                    curr_z = data.get('composite_3m')
                    next_z = next_snap[code].get('composite_3m')
                    if curr_z is not None and next_z is not None:
                        fwd['1M'] = round(next_z - curr_z, 3)

            # 3-month forward
            if i + 3 < len(months):
                fwd_month = months[i + 3]
                fwd_snap = classifications.get(fwd_month, {})
                if code in fwd_snap:
                    curr_z = data.get('composite_3m')
                    fwd_z = fwd_snap[code].get('composite_3m')
                    if curr_z is not None and fwd_z is not None:
                        fwd['3M'] = round(fwd_z - curr_z, 3)

            forward_returns[month][code] = fwd

    # ── Step 4: Aggregate by label category ──
    # Since we don't store labels directly, use equity_z thresholds as proxy
    def classify_from_scores(equity_z, macro_z, spread):
        """Simple label classification from raw scores."""
        if equity_z is None:
            return 'Unknown'
        if macro_z is not None and macro_z > 0.5 and equity_z > 0.3:
            return 'True Alpha'
        if equity_z > 0.5 and (macro_z is None or macro_z < -0.3):
            return 'Fake Alpha'
        if equity_z < -0.5 and (spread is not None and spread > 5):
            return 'Crisis Risk'
        if equity_z < -0.3:
            return 'Negative Drift'
        if macro_z is not None and macro_z > 0.3 and equity_z < 0.3:
            return 'Hidden Alpha'
        return 'Beta'

    label_returns = {label: {'1M': [], '3M': []} for label in LABELS}

    for month in months:
        snap = classifications[month]
        fwd = forward_returns.get(month, {})

        for code, data in snap.items():
            label = classify_from_scores(
                data.get('equity_z'),
                data.get('macro_z'),
                data.get('spread'),
            )

            code_fwd = fwd.get(code, {})
            if '1M' in code_fwd:
                label_returns[label]['1M'].append(code_fwd['1M'])
            if '3M' in code_fwd:
                label_returns[label]['3M'].append(code_fwd['3M'])

    # ── Step 5: Compute statistics ──
    results = {
        'status': 'available',
        'months_available': n_months,
        'date_range': f"{months[0]} to {months[-1]}",
        'last_updated': datetime.utcnow().isoformat() + 'Z',
        'labels': {},
    }

    for label in LABELS:
        label_result = {}
        for horizon in ['1M', '3M']:
            returns = label_returns[label][horizon]
            if len(returns) >= 3:
                avg = sum(returns) / len(returns)
                std = math.sqrt(sum((r - avg) ** 2 for r in returns) / len(returns)) if len(returns) > 1 else 0
                hit_rate = sum(1 for r in returns if r > 0) / len(returns)
                ir = avg / std if std > 0 else 0

                label_result[horizon] = {
                    'avg_return': round(avg, 3),
                    'std': round(std, 3),
                    'hit_rate': round(hit_rate, 3),
                    'information_ratio': round(ir, 3),
                    'n_observations': len(returns),
                }
            else:
                label_result[horizon] = {
                    'avg_return': None,
                    'n_observations': len(returns),
                    'note': 'Insufficient observations',
                }

        results['labels'][label] = label_result

    with open(BACKTEST_OUTPUT, 'w') as f:
        json.dump(results, f, indent=2)

    print("\n  Backtest Results:")
    print(f"  {'Label':<20} {'1M Avg':>10} {'1M Hit':>10} {'3M Avg':>10} {'3M Hit':>10}")
    print("  " + "-" * 60)
    for label in LABELS:
        lr = results['labels'][label]
        m1 = lr.get('1M', {})
        m3 = lr.get('3M', {})
        avg1 = f"{m1.get('avg_return', 'N/A'):>+.3f}" if m1.get('avg_return') is not None else "N/A"
        hit1 = f"{m1.get('hit_rate', 0):.0%}" if m1.get('hit_rate') is not None else "N/A"
        avg3 = f"{m3.get('avg_return', 'N/A'):>+.3f}" if m3.get('avg_return') is not None else "N/A"
        hit3 = f"{m3.get('hit_rate', 0):.0%}" if m3.get('hit_rate') is not None else "N/A"
        print(f"  {label:<20} {avg1:>10} {hit1:>10} {avg3:>10} {hit3:>10}")

    print(f"\n  ✓ Saved backtest results to {BACKTEST_OUTPUT}")


if __name__ == '__main__':
    main()
