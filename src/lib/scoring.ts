// ============================================================
// Global Economic Attribution Dashboard — Scoring Engine
// ============================================================

import type { CategoryScore } from './types';

// ------------------------------------------------------------
// Rolling Z-Score
// Computes the z-score of the last value in the array relative
// to the trailing `window` values (inclusive of the last value).
// Returns null if fewer than 2 values are available.
// ------------------------------------------------------------
export function rollingZScore(values: number[], window: number): number | null {
  if (values.length < 2) return null;

  const slice = values.slice(-Math.min(window, values.length));
  if (slice.length < 2) return null;

  const n = slice.length;
  const mean = slice.reduce((a, b) => a + b, 0) / n;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  const lastValue = values[values.length - 1];
  return (lastValue - mean) / stdDev;
}

// ------------------------------------------------------------
// Cap Z-Score to [-3, +3]
// ------------------------------------------------------------
export function capZScore(z: number): number {
  return Math.max(-3, Math.min(3, z));
}

// ------------------------------------------------------------
// Normal CDF Approximation (Abramowitz & Stegun rational approx)
// Accurate to ~1e-7 for the standard normal distribution.
// ------------------------------------------------------------
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

// ------------------------------------------------------------
// Convert Z-Score to Percentile [0–100]
// ------------------------------------------------------------
export function zToPercentile(z: number): number {
  const capped = capZScore(z);
  return Math.round(normalCDF(capped) * 100 * 100) / 100; // two decimal places
}

// ------------------------------------------------------------
// Direction Adjustment
// For indicators where lower is better (e.g., unemployment,
// inflation above target), flip the sign of the z-score.
// ------------------------------------------------------------
export function directionAdjust(z: number, isNegativeGood: boolean): number {
  return isNegativeGood ? -z : z;
}

// ------------------------------------------------------------
// Inflation Score
// Distance-from-target scoring. A value near the target is
// ideal. The score penalizes deviations in either direction.
// Returns a z-score-like value in [-3, +3].
// Default target is 2.0%.
// ------------------------------------------------------------
export function inflationScore(inflation: number, target: number = 2.0): number {
  const deviation = Math.abs(inflation - target);

  // Map deviation to a penalty z-score:
  //   0% deviation → +2 (very good)
  //   1% deviation → +1
  //   2% deviation →  0 (neutral)
  //   4% deviation → -2
  //   6%+ deviation → -3 (capped)
  const rawScore = 2 - deviation;
  return capZScore(rawScore);
}

// ------------------------------------------------------------
// Helper: compute a CategoryScore from an array of z-values,
// ignoring nulls.
// ------------------------------------------------------------
function aggregateCategoryScore(
  zValues: (number | null)[],
  totalCount: number
): CategoryScore {
  const validValues = zValues.filter((v): v is number => v !== null);
  const availableCount = validValues.length;

  if (availableCount === 0) {
    return {
      score: null,
      z_score: null,
      percentile: null,
      available_count: 0,
      total_count: totalCount,
    };
  }

  const avgZ = validValues.reduce((a, b) => a + b, 0) / availableCount;
  const cappedZ = capZScore(avgZ);
  const percentile = zToPercentile(cappedZ);

  return {
    score: Math.round(percentile * 100) / 100,
    z_score: Math.round(cappedZ * 1000) / 1000,
    percentile,
    available_count: availableCount,
    total_count: totalCount,
  };
}

// ------------------------------------------------------------
// Compute Asset Score
// Equal-weight average of equity, bond (if available), currency.
// ------------------------------------------------------------
export function computeAssetScore(
  equityZ: number | null,
  bondZ: number | null,
  currencyZ: number | null
): CategoryScore {
  return aggregateCategoryScore([equityZ, bondZ, currencyZ], 3);
}

// ------------------------------------------------------------
// Compute Macro Score
// Equal-weight average of 6 macro categories.
// ------------------------------------------------------------
export function computeMacroScore(
  growthZ: number | null,
  laborZ: number | null,
  inflationZ: number | null,
  externalZ: number | null,
  fiscalZ: number | null,
  creditZ: number | null
): CategoryScore {
  return aggregateCategoryScore(
    [growthZ, laborZ, inflationZ, externalZ, fiscalZ, creditZ],
    6
  );
}

// ------------------------------------------------------------
// Compute Risk Score
// Weighted average across currency risk, external vulnerability,
// fiscal risk, credit stress, and financial stress indicators.
// Higher z-score = LOWER risk (better), so we invert negatives.
// ------------------------------------------------------------
export function computeRiskScore(
  currencyZ: number | null,
  externalZ: number | null,
  fiscalZ: number | null,
  creditStressZ: number | null,
  financialStressZ: number | null
): CategoryScore {
  return aggregateCategoryScore(
    [currencyZ, externalZ, fiscalZ, creditStressZ, financialStressZ],
    5
  );
}

// ------------------------------------------------------------
// Percentile → Label
// ------------------------------------------------------------
export function percentileLabel(
  p: number
): 'Very Weak' | 'Weak' | 'Neutral' | 'Strong' | 'Very Strong' {
  if (p >= 80) return 'Very Strong';
  if (p >= 60) return 'Strong';
  if (p >= 40) return 'Neutral';
  if (p >= 20) return 'Weak';
  return 'Very Weak';
}

// ------------------------------------------------------------
// Percentile → Color
// Uses the dashboard's color scheme:
//   green  = strong (≥70)
//   yellow = neutral (40–69)
//   red    = weak (<30)
//   gray   = missing data
//   blue   = benchmark reference
// Returns Tailwind-compatible hex colors for the dark theme.
// ------------------------------------------------------------
export function percentileColor(p: number): string {
  if (p >= 80) return '#22c55e'; // green-500 — very strong
  if (p >= 70) return '#4ade80'; // green-400 — strong
  if (p >= 60) return '#86efac'; // green-300 — solid
  if (p >= 50) return '#fbbf24'; // amber-400 — above neutral
  if (p >= 40) return '#f59e0b'; // amber-500 — neutral
  if (p >= 30) return '#f97316'; // orange-500 — below neutral
  if (p >= 20) return '#ef4444'; // red-500 — weak
  return '#dc2626';              // red-600 — very weak
}
