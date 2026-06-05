// ============================================================
// Global Economic Attribution Dashboard — Fingerprint Detector
// ============================================================

import type {
  GlobalFingerprint,
  FuturesAsset,
  MarketRegime,
} from './types';

// ------------------------------------------------------------
// Threshold constants
// ------------------------------------------------------------
const Z_UP = 0.5;
const Z_DOWN = -0.5;
const VIX_EXTREME = 1.5; // z-score threshold for extreme VIX

// ------------------------------------------------------------
// Direction helpers
// ------------------------------------------------------------
function isUp(asset: FuturesAsset | undefined): boolean {
  if (!asset) return false;
  const z = asset.z_score ?? 0;
  return z > Z_UP;
}

function isDown(asset: FuturesAsset | undefined): boolean {
  if (!asset) return false;
  const z = asset.z_score ?? 0;
  return z < Z_DOWN;
}

// Note: isStrongDown is used for stocks strong down detection

function isStrongDown(asset: FuturesAsset | undefined): boolean {
  if (!asset) return false;
  const z = asset.z_score ?? 0;
  return z < -1.0;
}

// ------------------------------------------------------------
// Get Asset by Name (case-insensitive partial match)
// ------------------------------------------------------------
export function getAsset(
  assets: FuturesAsset[],
  name: string
): FuturesAsset | undefined {
  const lower = name.toLowerCase();
  return (
    assets.find((a) => a.name.toLowerCase() === lower) ??
    assets.find((a) => a.name.toLowerCase().includes(lower)) ??
    assets.find((a) => a.ticker.toLowerCase().includes(lower))
  );
}

// ------------------------------------------------------------
// Detect Market Regime
// Uses a priority-ordered rule system to classify the current
// global macro regime from cross-asset futures/ETF signals.
// ------------------------------------------------------------
export function detectRegime(assets: FuturesAsset[]): {
  regime: MarketRegime;
  confidence: number;
  explanation: string;
  signals: string[];
} {
  // Locate key assets
  const stocks =
    getAsset(assets, 'S&P 500') ??
    getAsset(assets, 'SPX') ??
    getAsset(assets, 'ES');
  const bonds =
    getAsset(assets, 'US 10Y') ??
    getAsset(assets, 'Treasury') ??
    getAsset(assets, 'TLT');
  const dollar =
    getAsset(assets, 'DXY') ??
    getAsset(assets, 'Dollar') ??
    getAsset(assets, 'USD');
  const gold =
    getAsset(assets, 'Gold') ?? getAsset(assets, 'GC') ?? getAsset(assets, 'GLD');
  const oil =
    getAsset(assets, 'Crude Oil') ??
    getAsset(assets, 'WTI') ??
    getAsset(assets, 'CL') ??
    getAsset(assets, 'Brent');
  const copper =
    getAsset(assets, 'Copper') ?? getAsset(assets, 'HG');
  const vix =
    getAsset(assets, 'VIX') ?? getAsset(assets, 'Volatility');

  const signals: string[] = [];

  // Log observed directions
  if (stocks) signals.push(`Stocks: ${formatDirection(stocks)}`);
  if (bonds) signals.push(`Bonds: ${formatDirection(bonds)}`);
  if (dollar) signals.push(`Dollar: ${formatDirection(dollar)}`);
  if (gold) signals.push(`Gold: ${formatDirection(gold)}`);
  if (oil) signals.push(`Oil: ${formatDirection(oil)}`);
  if (copper) signals.push(`Copper: ${formatDirection(copper)}`);
  if (vix) signals.push(`VIX: ${formatDirection(vix)}`);

  const stocksDown = isDown(stocks);
  const stocksStrongDown = isStrongDown(stocks);
  const bondsUp = isUp(bonds);
  const bondsDown = isDown(bonds);
  const dollarUp = isUp(dollar);
  const goldUp = isUp(gold);
  const oilUp = isUp(oil);
  const copperDown = isDown(copper);
  const vixExtreme = vix && (vix.z_score ?? 0) > VIX_EXTREME;
  const vixUp = isUp(vix);

  // ---- Priority-ordered regime detection ----

  // VIX extreme → Risk-Off
  if (vixExtreme && stocksDown) {
    return {
      regime: 'Risk-Off',
      confidence: computeRegimeConfidence([vix, stocks].filter((a): a is FuturesAsset => a !== undefined)),
      explanation:
        'Extreme volatility spike combined with equity selloff indicates a broad Risk-Off regime. ' +
        'Market participants are aggressively hedging and de-risking across asset classes.',
      signals,
    };
  }

  // Stocks down + bonds up → Growth Scare
  if (stocksDown && bondsUp) {
    const conf = computeRegimeConfidence([stocks, bonds].filter((a): a is FuturesAsset => a !== undefined));
    return {
      regime: 'Growth Scare',
      confidence: conf,
      explanation:
        'Equities declining while bonds rally is the classic Growth Scare signal. ' +
        'The bond market is pricing in slower growth or potential rate cuts, while equity risk premia rise. ' +
        'EM countries with strong current accounts and low external debt tend to be more resilient.',
      signals,
    };
  }

  // Stocks down + bonds down → Inflation Scare
  if (stocksDown && bondsDown) {
    return {
      regime: 'Inflation Scare',
      confidence: computeRegimeConfidence([stocks, bonds].filter((a): a is FuturesAsset => a !== undefined)),
      explanation:
        'Both stocks and bonds declining simultaneously is the hallmark of an Inflation Scare. ' +
        'The market fears persistent inflation will force central banks to maintain or increase restrictive policy. ' +
        'Commodity exporters may benefit while rate-sensitive sectors and EM borrowers face headwinds.',
      signals,
    };
  }

  // Stocks down + dollar up → Dollar Squeeze
  if (stocksDown && dollarUp) {
    return {
      regime: 'Dollar Squeeze',
      confidence: computeRegimeConfidence([stocks, dollar].filter((a): a is FuturesAsset => a !== undefined)),
      explanation:
        'Equity weakness paired with dollar strength signals a Dollar Squeeze regime. ' +
        'Capital is flowing to USD safe havens, creating funding stress for dollar-denominated EM debt. ' +
        'Countries with high external USD-denominated obligations are most vulnerable.',
      signals,
    };
  }

  // Stocks down + gold up → Credit Stress
  if (stocksDown && goldUp) {
    return {
      regime: 'Credit Stress',
      confidence: computeRegimeConfidence([stocks, gold].filter((a): a is FuturesAsset => a !== undefined)),
      explanation:
        'Equities falling while gold rallies indicates Credit Stress. ' +
        'Investors are seeking safety in hard assets, suggesting concerns about counterparty risk or systemic fragility. ' +
        'Watch for widening credit spreads and sovereign CDS moves.',
      signals,
    };
  }

  // Stocks down + oil up → Energy Shock
  if (stocksDown && oilUp) {
    return {
      regime: 'Energy Shock',
      confidence: computeRegimeConfidence([stocks, oil].filter((a): a is FuturesAsset => a !== undefined)),
      explanation:
        'Equities declining while energy prices surge indicates an Energy Shock. ' +
        'Supply disruption or geopolitical risk is driving oil higher, acting as a tax on consumers and importers. ' +
        'Net energy importers face deteriorating terms of trade while exporters benefit.',
      signals,
    };
  }

  // Stocks down + copper down → Risk-Off with industrial weakness
  if (stocksDown && copperDown) {
    return {
      regime: 'Risk-Off',
      confidence: computeRegimeConfidence([stocks, copper].filter((a): a is FuturesAsset => a !== undefined)),
      explanation:
        'Equities and industrial metals declining together signals broad Risk-Off with industrial weakness. ' +
        'Dr. Copper is confirming the equity selloff with deteriorating demand expectations. ' +
        'Manufacturing exporters and commodity-dependent economies are most exposed.',
      signals,
    };
  }

  // Stocks down generally → Risk-Off
  if (stocksStrongDown) {
    return {
      regime: 'Risk-Off',
      confidence: computeRegimeConfidence([stocks].filter((a): a is FuturesAsset => a !== undefined)),
      explanation:
        'Broad equity weakness without a clear single-factor driver indicates general Risk-Off positioning. ' +
        'Defensive positioning favors low-beta markets, strong balance sheets, and current account surplus countries.',
      signals,
    };
  }

  // Everything up → Risk-On
  const everythingUp =
    isUp(stocks) &&
    (bondsUp || !bondsDown) &&
    (goldUp || !isDown(gold)) &&
    !vixUp;

  if (everythingUp && isUp(stocks)) {
    return {
      regime: 'Risk-On',
      confidence: computeRegimeConfidence(
        [stocks, bonds, gold].filter((a): a is FuturesAsset => a !== undefined)
      ),
      explanation:
        'Broad-based gains across equities and supportive cross-asset signals indicate a Risk-On regime. ' +
        'Liquidity conditions are favorable, and markets are pricing in goldilocks growth. ' +
        'High-beta EM markets and cyclical sectors tend to outperform in this environment.',
      signals,
    };
  }

  // VIX elevated but not extreme
  if (vixUp && !stocksDown) {
    return {
      regime: 'Neutral',
      confidence: 0.4,
      explanation:
        'Volatility is slightly elevated but equities are holding, suggesting an uneasy equilibrium. ' +
        'Markets are hedging but not yet in full risk-off mode. Watch for a resolution in either direction.',
      signals,
    };
  }

  // No strong signal → Neutral
  return {
    regime: 'Neutral',
    confidence: 0.5,
    explanation:
      'No dominant cross-asset signal detected. Markets are range-bound with mixed signals ' +
      'across equities, bonds, and commodities. Country-specific factors are likely more important ' +
      'than global macro themes in this environment.',
    signals,
  };
}

// ------------------------------------------------------------
// Build the Global Fingerprint
// Combines all asset data with regime detection.
// ------------------------------------------------------------
export function buildGlobalFingerprint(
  assets: FuturesAsset[]
): GlobalFingerprint {
  const { regime, confidence, explanation, signals } = detectRegime(assets);

  return {
    assets,
    regime,
    regime_confidence: confidence,
    regime_explanation: explanation,
    fingerprint_signals: signals,
  };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function formatDirection(asset: FuturesAsset): string {
  const z = asset.z_score ?? 0;
  const change = asset.change_1w;
  const changeStr =
    change !== null ? ` (${change >= 0 ? '+' : ''}${change.toFixed(2)}% 1W)` : '';

  if (z > 1.0) return `Strong Up (z=${z.toFixed(2)})${changeStr}`;
  if (z > Z_UP) return `Up (z=${z.toFixed(2)})${changeStr}`;
  if (z < -1.0) return `Strong Down (z=${z.toFixed(2)})${changeStr}`;
  if (z < Z_DOWN) return `Down (z=${z.toFixed(2)})${changeStr}`;
  return `Flat (z=${z.toFixed(2)})${changeStr}`;
}

function computeRegimeConfidence(
  assets: FuturesAsset[]
): number {
  if (assets.length === 0) return 0.3;

  const avgAbsZ =
    assets.reduce((sum, a) => sum + Math.abs(a.z_score ?? 0), 0) / assets.length;

  // Higher absolute z-scores → higher confidence
  // avgAbsZ of 0.5 → 0.5 confidence, 1.0 → 0.7, 2.0 → 0.9
  const rawConfidence = Math.min(0.95, 0.3 + avgAbsZ * 0.3);
  return Math.round(rawConfidence * 100) / 100;
}
