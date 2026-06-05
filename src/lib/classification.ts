// ============================================================
// Global Economic Attribution Dashboard — Classification Engine
// ============================================================

import type {
  CountryScores,
  CountryLabelResult,
  CountryLabel,
  CountryClassification,
  CategoryScore,
} from './types';
import { percentileLabel } from './scoring';

// ------------------------------------------------------------
// Safe percentile accessor — returns 50 (neutral) when null
// ------------------------------------------------------------
function p(score: CategoryScore): number {
  return score.percentile ?? 50;
}

// ------------------------------------------------------------
// Classify a Country
//
// Check order: Crisis Risk → True Alpha → Fake Alpha →
//              Hidden Alpha → Beta → Unclassified
// ------------------------------------------------------------
export function classifyCountry(
  scores: CountryScores,
  classification: CountryClassification,
  peerGroupName: string
): CountryLabelResult {
  const assetP = p(scores.asset_score);
  const macroP = p(scores.macro_score);
  const riskP = p(scores.risk_score);
  const currencyP = p(scores.currency_score);
  const alpha = scores.country_alpha ?? 0;
  const alphaZ = scores.asset_score.z_score ?? 0;

  const supporting: string[] = [];
  const risks: string[] = [];

  // Collect supporting factors
  if (assetP >= 70) supporting.push(`Asset score at ${assetP.toFixed(0)}th percentile`);
  if (macroP >= 60) supporting.push(`Macro score at ${macroP.toFixed(0)}th percentile`);
  if (riskP >= 50) supporting.push(`Risk profile at ${riskP.toFixed(0)}th percentile`);
  if (currencyP >= 50) supporting.push(`Currency strength at ${currencyP.toFixed(0)}th percentile`);
  if (alpha > 0) supporting.push(`Positive country alpha of ${alpha.toFixed(3)}`);

  // Collect risk factors
  if (assetP < 30) risks.push(`Weak asset performance (${assetP.toFixed(0)}th pctl)`);
  if (macroP < 40) risks.push(`Below-average macro fundamentals (${macroP.toFixed(0)}th pctl)`);
  if (riskP < 30) risks.push(`Elevated risk profile (${riskP.toFixed(0)}th pctl)`);
  if (currencyP < 30) risks.push(`Currency weakness (${currencyP.toFixed(0)}th pctl)`);
  if (alpha < -0.25) risks.push(`Negative country alpha of ${alpha.toFixed(3)}`);

  // Score equity & bond detail
  const equityP = p(scores.equity_score);
  const bondP = p(scores.bond_score);
  if (equityP >= 60) supporting.push(`Equity outperformance (${equityP.toFixed(0)}th pctl)`);
  if (bondP < 30) risks.push(`Bond market stress (${bondP.toFixed(0)}th pctl)`);

  let label: CountryLabel;
  let confidence: number;

  // ---- Crisis Risk ----
  if (assetP < 30 && currencyP < 30 && riskP < 30) {
    label = 'Crisis Risk';
    confidence = computeConfidence([
      { value: assetP, threshold: 30, direction: 'below' },
      { value: currencyP, threshold: 30, direction: 'below' },
      { value: riskP, threshold: 30, direction: 'below' },
    ]);
  }
  // ---- True Alpha ----
  else if (
    assetP > 70 &&
    alpha > 0 &&
    macroP > 60 &&
    riskP > 50 &&
    currencyP > 40
  ) {
    label = 'True Alpha';
    confidence = computeConfidence([
      { value: assetP, threshold: 70, direction: 'above' },
      { value: macroP, threshold: 60, direction: 'above' },
      { value: riskP, threshold: 50, direction: 'above' },
      { value: currencyP, threshold: 40, direction: 'above' },
    ]);
  }
  // ---- Fake Alpha ----
  else if (
    assetP > 70 &&
    (macroP < 50 || riskP < 40 || currencyP < 40)
  ) {
    label = 'Fake Alpha';
    const weaknesses: { value: number; threshold: number }[] = [];
    if (macroP < 50) weaknesses.push({ value: macroP, threshold: 50 });
    if (riskP < 40) weaknesses.push({ value: riskP, threshold: 40 });
    if (currencyP < 40) weaknesses.push({ value: currencyP, threshold: 40 });
    confidence = computeConfidence([
      { value: assetP, threshold: 70, direction: 'above' },
      ...weaknesses.map((w) => ({
        value: w.value,
        threshold: w.threshold,
        direction: 'below' as const,
      })),
    ]);
  }
  // ---- Hidden Alpha ----
  else if (macroP > 70 && riskP > 50 && assetP < 50) {
    label = 'Hidden Alpha';
    confidence = computeConfidence([
      { value: macroP, threshold: 70, direction: 'above' },
      { value: riskP, threshold: 50, direction: 'above' },
      { value: assetP, threshold: 50, direction: 'below' },
    ]);
  }
  // ---- Beta ----
  else if (Math.abs(alphaZ) <= 0.25) {
    label = 'Beta';
    // Confidence is higher when alpha is closer to zero
    confidence = Math.round((1 - Math.abs(alphaZ) / 0.25) * 100) / 100;
    confidence = Math.max(0.3, Math.min(1, confidence));
  }
  // ---- Unclassified ----
  else {
    label = 'Unclassified';
    confidence = 0.5;
  }

  const explanation = generateExplanation(
    classification.country,
    label,
    scores,
    classification,
    peerGroupName
  );

  return {
    label,
    confidence: Math.round(confidence * 100) / 100,
    explanation,
    supporting_factors: supporting,
    risk_factors: risks,
  };
}

// ------------------------------------------------------------
// Confidence Computation
// Average of how far each metric exceeds its threshold,
// normalized to [0, 1].
// ------------------------------------------------------------
interface ConfidenceInput {
  value: number;
  threshold: number;
  direction: 'above' | 'below';
}

function computeConfidence(inputs: ConfidenceInput[]): number {
  if (inputs.length === 0) return 0.5;

  const scores = inputs.map(({ value, threshold, direction }) => {
    const distance =
      direction === 'above' ? value - threshold : threshold - value;
    // Normalize: 0 distance → 0.5 confidence, 30 distance → 1.0
    return Math.min(1, 0.5 + distance / 60);
  });

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.max(0.3, Math.min(1, avg));
}

// ------------------------------------------------------------
// Generate Explanation
// Produces natural language sentences explaining a country's
// classification relative to its peer group.
// ------------------------------------------------------------
export function generateExplanation(
  country: string,
  label: CountryLabel,
  scores: CountryScores,
  _classification: CountryClassification,
  peerGroupName: string
): string {
  const assetP = p(scores.asset_score);
  const macroP = p(scores.macro_score);
  const riskP = p(scores.risk_score);
  const currencyP = p(scores.currency_score);
  const equityP = p(scores.equity_score);
  const growthP = p(scores.growth_score);
  const creditP = p(scores.credit_score);
  const laborP = p(scores.labor_score);
  const fiscalP = p(scores.fiscal_score);
  const externalP = p(scores.external_balance_score);
  const alpha = scores.country_alpha ?? 0;

  const assetLabel = percentileLabel(assetP);
  const macroLabel = percentileLabel(macroP);
  const riskLabel = percentileLabel(riskP);

  // Identify strongest and weakest drivers
  const drivers: { name: string; pct: number }[] = [
    { name: 'equity performance', pct: equityP },
    { name: 'currency stability', pct: currencyP },
    { name: 'growth momentum', pct: growthP },
    { name: 'labor markets', pct: laborP },
    { name: 'credit conditions', pct: creditP },
    { name: 'fiscal position', pct: fiscalP },
    { name: 'external balance', pct: externalP },
  ];

  const sorted = [...drivers].sort((a, b) => b.pct - a.pct);
  const topDrivers = sorted.slice(0, 2).map((d) => d.name);
  const weakDrivers = sorted
    .slice(-2)
    .filter((d) => d.pct < 40)
    .map((d) => d.name);

  switch (label) {
    case 'True Alpha': {
      const driverStr = topDrivers.join(' and ');
      const base = `${country} is genuinely outperforming its ${peerGroupName} peer group, driven primarily by ${driverStr}. `;
      const macro = `Macro fundamentals are ${macroLabel.toLowerCase()} (${macroP.toFixed(0)}th percentile) with a positive alpha of ${alpha.toFixed(3)}, confirming the outperformance is anchored in real economic strength.`;
      return base + macro;
    }

    case 'Fake Alpha': {
      const driverStr = topDrivers.join(' and ');
      const weakStr =
        weakDrivers.length > 0
          ? weakDrivers.join(' and ')
          : 'key macro fundamentals';
      const base = `${country} shows strong asset returns within its ${peerGroupName} peer group via ${driverStr}, but this outperformance is not confirmed by fundamentals. `;
      const warning = `Macro confirmation is only ${macroLabel.toLowerCase()} (${macroP.toFixed(0)}th percentile) because ${weakStr} are below peer average. Risk profile is ${riskLabel.toLowerCase()} (${riskP.toFixed(0)}th percentile), suggesting the rally may be fragile.`;
      return base + warning;
    }

    case 'Hidden Alpha': {
      const weakAssetStr =
        equityP < 40 ? 'equity weakness' : 'subdued asset returns';
      const base = `${country} has strong macro fundamentals (${macroP.toFixed(0)}th percentile) within its ${peerGroupName} peer group, but markets have not yet priced this in. `;
      const detail = `Asset score is only ${assetLabel.toLowerCase()} (${assetP.toFixed(0)}th percentile) due to ${weakAssetStr}. `;
      const thesis = `If fundamentals persist, this represents a potential re-rating opportunity as the gap between macro strength and asset performance narrows.`;
      return base + detail + thesis;
    }

    case 'Beta': {
      const base = `${country} is tracking its ${peerGroupName} peer group average with an alpha near zero (${alpha.toFixed(3)}). `;
      const detail = `Asset performance is ${assetLabel.toLowerCase()} (${assetP.toFixed(0)}th percentile), macro outlook is ${macroLabel.toLowerCase()} (${macroP.toFixed(0)}th percentile), and risk is ${riskLabel.toLowerCase()} (${riskP.toFixed(0)}th percentile). `;
      const implication = `The country is largely driven by broad regional or global factors rather than idiosyncratic themes.`;
      return base + detail + implication;
    }

    case 'Crisis Risk': {
      const base = `${country} is signaling significant stress across multiple dimensions within its ${peerGroupName} peer group. `;
      const detail = `Asset performance is ${assetLabel.toLowerCase()} (${assetP.toFixed(0)}th percentile), risk profile is ${riskLabel.toLowerCase()} (${riskP.toFixed(0)}th percentile), and currency is under pressure (${currencyP.toFixed(0)}th percentile). `;
      const weakList =
        weakDrivers.length > 0
          ? `Key weaknesses include ${weakDrivers.join(' and ')}. `
          : '';
      const warning = `${weakList}This combination of weak assets, currency depreciation, and elevated risk warrants close monitoring for potential contagion.`;
      return base + detail + warning;
    }

    case 'Unclassified':
    default: {
      const base = `${country} does not fit cleanly into a standard classification within its ${peerGroupName} peer group. `;
      const detail = `Asset performance is ${assetLabel.toLowerCase()} (${assetP.toFixed(0)}th percentile), macro is ${macroLabel.toLowerCase()} (${macroP.toFixed(0)}th percentile), risk is ${riskLabel.toLowerCase()} (${riskP.toFixed(0)}th percentile). `;
      const note = `The mixed signal profile suggests monitoring for emerging trends.`;
      return base + detail + note;
    }
  }
}
