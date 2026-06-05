#!/bin/bash
# Master update script — runs everything in one shot
# Usage: bash scripts/update_all.sh

set -e

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Global Economic Attribution Dashboard — Full Update     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  $(date)"
echo ""

# Step 1: Download asset data (equity, currency, bond, futures)
echo "=== STEP 1: Downloading asset data from Yahoo Finance ==="
python3 scripts/update_data.py
echo ""

# Step 2: Download high-frequency macro from TradingEconomics (FIRST PASS)
echo "=== STEP 2: Downloading high-frequency macro from TradingEconomics ==="
python3 scripts/fetch_te_lists.py
echo ""

# Step 3: Download macro data from World Bank (MERGES on top, doesn't overwrite)
echo "=== STEP 3: Downloading macro data from World Bank ==="
python3 scripts/fetch_macro.py
echo ""

# Step 4: Deep scrape TradingEconomics for remaining gaps
echo "=== STEP 4: Deep scraping TradingEconomics for remaining gaps ==="
python3 scripts/fetch_te_deep.py
echo ""

# Step 5: Fix inflation scores (CPI-only when PPI unavailable)
echo "=== STEP 5: Post-processing macro scores ==="
python3 -c "
import json, math

def normal_cdf(z):
    a1,a2,a3=0.254829592,-0.284496736,1.421413741
    a4,a5,p=-1.453152027,1.061405429,0.3275911
    sign = -1 if z < 0 else 1
    x = abs(z) / math.sqrt(2)
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*math.exp(-x*x)
    return 0.5 * (1.0 + sign * y)

d = json.load(open('public/data/dashboard_data.json'))

for c in d['countries']:
    mcs = c.get('macro_category_scores', {})
    mp = c.get('macro_panel', {})
    
    # Fix inflation category using CPI alone
    cpi = mp.get('inflation', {}).get('cpi_yoy', {})
    if isinstance(cpi, dict) and cpi.get('available') and cpi.get('z_score') is not None:
        z = cpi['z_score']
        mcs['inflation'] = {
            'z_score': z,
            'percentile': round(normal_cdf(z) * 100, 1),
            'available_count': 1,
            'total_count': 2,
        }
        c['macro_category_scores'] = mcs
    
    # Recalculate macro_composite
    all_z = [s['z_score'] for s in mcs.values() if isinstance(s, dict) and s.get('z_score') is not None]
    if all_z:
        avg_z = sum(all_z) / len(all_z)
        c['macro_composite'] = {
            'z_score': round(avg_z, 2),
            'percentile': round(normal_cdf(avg_z) * 100, 1),
            'available_count': len(all_z),
            'total_count': 6,
        }

with open('public/data/dashboard_data.json', 'w') as f:
    json.dump(d, f, indent=2)
with open('data/processed/dashboard_data.json', 'w') as f:
    json.dump(d, f, indent=2)
print('  ✓ Post-processing complete')
"
echo ""

# Step 6: Build TypeScript
echo "=== STEP 6: Building TypeScript ==="
npm run build
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL DONE — Dashboard fully updated                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  $(date)"
