#!/bin/bash
# Master update script — v2.0 pipeline (10 steps)
# Usage: bash scripts/update_all.sh

set -e

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Global Economic Attribution Dashboard — v2.0 Update     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  $(date)"
echo ""

# Step 1: Download asset data (equity, currency, bond, futures)
echo "=== STEP 1/10: Downloading asset data from Yahoo Finance ==="
python3 scripts/update_data.py
echo ""

# Step 2: Download valuation data (dividend yield, beta, AUM)
echo "=== STEP 2/10: Downloading valuation data from Yahoo Finance ==="
python3 scripts/fetch_valuation.py || echo "  ⚠ Valuation fetch failed — continuing"
echo ""

# Step 3: Download high-frequency macro from TradingEconomics
echo "=== STEP 3/10: Downloading high-frequency macro from TradingEconomics ==="
python3 scripts/fetch_te_lists.py
echo ""

# Step 4: Download macro data from World Bank
echo "=== STEP 4/10: Downloading macro data from World Bank ==="
python3 scripts/fetch_macro.py
echo ""

# Step 5: Deep scrape TradingEconomics for remaining gaps
echo "=== STEP 5/10: Deep scraping TradingEconomics ==="
python3 scripts/fetch_te_deep.py
echo ""

# Step 6: Download COT positioning data from CFTC
echo "=== STEP 6/10: Downloading COT positioning data ==="
python3 scripts/fetch_cot.py || echo "  ⚠ COT fetch failed — continuing"
echo ""

# Step 7: Post-process — z-scores, bonds, sovereign spreads, own-history
echo "=== STEP 7/10: Post-processing (z-scores, bonds, spreads, history) ==="
python3 scripts/postprocess.py
echo ""

# Step 8: Run backtest — classification snapshots + forward returns
echo "=== STEP 8/10: Backtest — classification snapshots ==="
python3 scripts/backtest.py || echo "  ⚠ Backtest failed — continuing"
echo ""

# Step 9: Seed/update historical data (skip if already run this month)
echo "=== STEP 9/10: Historical data check ==="
if [ ! -f "data/historical/macro_history.json" ]; then
    echo "  Seeding historical data from World Bank..."
    python3 scripts/seed_history.py
else
    echo "  ✓ Historical data already seeded"
fi
echo ""

# Step 10: Build TypeScript
echo "=== STEP 10/10: Building TypeScript ==="
npm run build
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ v2.0 — ALL DONE — Dashboard fully updated            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  $(date)"
