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

# Step 5: Post-process — fix fake z-scores, fill bonds from 10Y yield, mark missing equity
echo "=== STEP 5: Post-processing (z-scores, bonds, equity marking) ==="
python3 scripts/postprocess.py
echo ""

# Step 6: Build TypeScript
echo "=== STEP 6: Building TypeScript ==="
npm run build
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL DONE — Dashboard fully updated                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  $(date)"
