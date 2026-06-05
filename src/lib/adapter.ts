// ============================================================
// Data Adapter — Transforms Python pipeline output to DashboardData
// ============================================================
import type {
  DashboardData, CountryData, CountryClassification,
  AssetPanel, EquityData, BondData, CurrencyData,
  MacroPanel, MacroIndicator, GrowthData, LaborData, InflationData,
  ExternalBalanceData, FiscalDebtData, CreditCycleData,
  CountryScores, CategoryScore, PeerBenchmark, PeerDimension,
  CountryLabelResult, CountryLabel, DataQuality,
  GlobalFingerprint, FuturesAsset, MarketRegime,
} from './types';

// The raw format from Python pipeline
interface RawPipelineData {
  last_updated: string;
  is_sample_data: boolean;
  data_version: string;
  countries: RawCountry[];
  global_futures: Record<string, RawFuturesAsset>;
  benchmarks: {
    global: Record<string, any>;
    regions: Record<string, any>;
    development_stages: Record<string, any>;
    global_roles: Record<string, any>;
    openness_types: Record<string, any>;
    external_vulnerabilities: Record<string, any>;
  };
  metadata?: any;
}

interface RawCountry {
  country: string;
  code: string;
  region: string;
  development_stage: string;
  global_roles: string[];
  openness_type: string;
  external_vulnerability: string;
  equity: RawAssetBlock;
  currency: RawAssetBlock;
  bond: RawAssetBlock;
  composite: Record<string, RawMetric>;
  // Macro data from World Bank (injected by fetch_macro.py)
  macro_panel?: Record<string, Record<string, RawMacroIndicator>>;
  macro_category_scores?: Record<string, { z_score: number | null; percentile: number | null; available_count: number; total_count: number }>;
  macro_composite?: { z_score: number | null; percentile: number | null; available_count: number; total_count: number };
}

interface RawMacroIndicator {
  value: number | null;
  available: boolean;
  z_score: number | null;
  percentile: number | null;
  source: string;
  last_updated: string | null;
}

interface RawAssetBlock {
  available: boolean;
  ticker?: string;
  currency_pair?: string;
  bond_proxy?: string;
  last_price?: number;
  last_date?: string;
  returns?: Record<string, number>;
  metrics?: Record<string, RawMetric>;
}

interface RawMetric {
  return_pct?: number;
  z_score: number;
  percentile: number;
  color: string;
  n_signals?: number;
}

interface RawFuturesAsset {
  available: boolean;
  name: string;
  category: string;
  ticker: string;
  last_price: number;
  last_date: string;
  returns: Record<string, number>;
  metrics: Record<string, RawMetric>;
}

// --- Normal CDF for z-to-percentile ---
function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// --- Country classification lookup from countries.json ---
import countriesRaw from '../data/countries.json';
const classificationMap = new Map<string, CountryClassification>();
(countriesRaw as CountryClassification[]).forEach(c => classificationMap.set(c.code, c));

// --- Adapter ---
export function adaptPipelineData(raw: RawPipelineData): DashboardData {
  const countries = raw.countries.map(rc => adaptCountry(rc, raw.benchmarks));
  const globalFingerprint = adaptFingerprint(raw.global_futures);

  // best/worst for peer benchmarks are now populated from Python output
  // (see adaptCountry → peer_benchmarks section)

  return {
    countries,
    global_fingerprint: globalFingerprint,
    last_updated: raw.last_updated.split('T')[0],
    data_version: raw.data_version || '1.0.0-live',
    is_sample_data: raw.is_sample_data,
  };
}

function adaptCountry(rc: RawCountry, benchmarks: RawPipelineData['benchmarks']): CountryData {
  const classification = classificationMap.get(rc.code) || {
    country: rc.country, code: rc.code,
    ticker_equity: rc.equity?.ticker || '',
    currency_pair: rc.currency?.currency_pair || '',
    bond_proxy: rc.bond?.bond_proxy || null,
    region: rc.region as any, development_stage: rc.development_stage as any,
    global_roles: rc.global_roles as any[], openness_type: rc.openness_type as any,
    external_vulnerability: rc.external_vulnerability as any,
  };

  const equity = adaptEquity(rc.equity);
  const bond = adaptBond(rc.bond);
  const currency = adaptCurrency(rc.currency);

  const assets: AssetPanel = { equity, bond, currency };

  // Compute scores from composite or individual z-scores
  const eqZ = getAvgZ(rc.equity);
  const bondZ = rc.bond?.available ? getAvgZ(rc.bond) : null;
  const curZ = getAvgZ(rc.currency);

  // Asset score: avg of available
  const assetZArr = [eqZ, bondZ, curZ].filter((v): v is number => v !== null);
  const assetZ = assetZArr.length > 0 ? assetZArr.reduce((a, b) => a + b, 0) / assetZArr.length : null;

  const assetScore = makeScore(assetZ, bond.available ? 3 : 2, 3);
  const equityScore = makeScore(eqZ, 1, 1);
  const bondScore = makeScore(bondZ, bond.available ? 1 : 0, 1);
  const currencyScore = makeScore(curZ, 1, 1);

  // --- Macro scores from World Bank data ---
  const macroCS = rc.macro_category_scores || {};
  const macroComp = rc.macro_composite;

  const growthScore = makeMacroScore(macroCS['growth']);
  const laborScore = makeMacroScore(macroCS['labor']);
  const inflationScore = makeMacroScore(macroCS['inflation']);
  const externalBalanceScore = makeMacroScore(macroCS['external_balance']);
  const fiscalScore = makeMacroScore(macroCS['fiscal_debt']);
  const creditScore = makeMacroScore(macroCS['credit_cycle']);

  const macroZ = macroComp?.z_score ?? null;
  const macroScore = macroComp
    ? makeScore(macroZ, macroComp.available_count, macroComp.total_count)
    : makeScore(null, 0, 6);

  // Risk score: blend of currency weakness + macro risk factors
  const riskFactors: number[] = [];
  if (curZ !== null) riskFactors.push(curZ);
  if (macroCS['external_balance']?.z_score != null) riskFactors.push(macroCS['external_balance'].z_score);
  if (macroCS['fiscal_debt']?.z_score != null) riskFactors.push(macroCS['fiscal_debt'].z_score);
  if (macroCS['credit_cycle']?.z_score != null) riskFactors.push(macroCS['credit_cycle'].z_score);
  const riskZ = riskFactors.length > 0 ? riskFactors.reduce((a, b) => a + b, 0) / riskFactors.length : curZ;
  const riskScore = makeScore(riskZ, riskFactors.length || (curZ !== null ? 1 : 0), 5);

  // --- Helper to read benchmark z-score from Python output (handles both number and object) ---
  function readBenchZ(benchGroup: Record<string, any> | undefined): number | null {
    const eq3m = benchGroup?.equity?.['3M'];
    if (eq3m === null || eq3m === undefined) return null;
    if (typeof eq3m === 'object') return eq3m.z_score ?? null;
    if (typeof eq3m === 'number') return eq3m;
    return null;
  }

  function readBenchMeta(benchGroup: Record<string, any> | undefined): { groupSize: number; bestCountry: string | null; worstCountry: string | null; dispersion: number | null } {
    const eq3m = benchGroup?.equity?.['3M'];
    if (!eq3m || typeof eq3m !== 'object') return { groupSize: 0, bestCountry: null, worstCountry: null, dispersion: null };
    return {
      groupSize: eq3m.group_size ?? 0,
      bestCountry: eq3m.best_country ?? null,
      worstCountry: eq3m.worst_country ?? null,
      dispersion: eq3m.dispersion ?? null,
    };
  }

  // Read all benchmark z-scores
  const globalBenchZ = readBenchZ(benchmarks?.global) ?? 0;
  const regionBenchZ = readBenchZ(benchmarks?.regions?.[rc.region]);
  const devStageBenchZ = readBenchZ(benchmarks?.development_stages?.[rc.development_stage]);
  const opennessBenchZ = readBenchZ(benchmarks?.openness_types?.[rc.openness_type]);
  const extVulnBenchZ = readBenchZ(benchmarks?.external_vulnerabilities?.[rc.external_vulnerability]);

  // Multi-role: average z-scores across all roles
  const roleZs = rc.global_roles
    .map(role => readBenchZ(benchmarks?.global_roles?.[role]))
    .filter((v): v is number => v !== null);
  const globalRoleBenchZ = roleZs.length > 0 ? roleZs.reduce((a, b) => a + b, 0) / roleZs.length : null;

  // Multi-role metadata: aggregate across all roles
  const roleMetas = rc.global_roles
    .map(role => readBenchMeta(benchmarks?.global_roles?.[role]))
    .filter(m => m.groupSize > 0);
  const globalRoleMeta = roleMetas.length > 0
    ? {
        groupSize: roleMetas.reduce((s, m) => s + m.groupSize, 0),
        bestCountry: roleMetas.length === 1 ? roleMetas[0].bestCountry : 'Multi-role composite',
        worstCountry: roleMetas.length === 1 ? roleMetas[0].worstCountry : 'Multi-role composite',
        dispersion: roleMetas.length === 1 ? roleMetas[0].dispersion
          : roleMetas.reduce((s, m) => s + (m.dispersion ?? 0), 0) / roleMetas.length,
      }
    : { groupSize: 0, bestCountry: null, worstCountry: null, dispersion: null };

  // Compute alpha residuals: assetZ minus each benchmark
  function computeAlpha(benchZ: number | null): number | null {
    if (assetZ === null || benchZ === null) return null;
    return parseFloat((assetZ - benchZ).toFixed(3));
  }

  const alpha_vs_global = computeAlpha(globalBenchZ);
  const alpha_vs_region = computeAlpha(regionBenchZ);
  const alpha_vs_development_stage = computeAlpha(devStageBenchZ);
  const alpha_vs_global_role = computeAlpha(globalRoleBenchZ);
  const alpha_vs_openness = computeAlpha(opennessBenchZ);
  const alpha_vs_external_vulnerability = computeAlpha(extVulnBenchZ);

  // country_alpha = vs global (backward compat), true_alpha = vs region
  const alpha = alpha_vs_global;

  const scores: CountryScores = {
    asset_score: assetScore,
    equity_score: equityScore,
    bond_score: bondScore,
    currency_score: currencyScore,
    macro_score: macroScore,
    growth_score: growthScore,
    labor_score: laborScore,
    inflation_score: inflationScore,
    external_balance_score: externalBalanceScore,
    fiscal_score: fiscalScore,
    credit_score: creditScore,
    risk_score: riskScore,
    country_alpha: alpha,
    true_alpha: alpha_vs_region,
    alpha_vs_global,
    alpha_vs_region,
    alpha_vs_development_stage,
    alpha_vs_global_role,
    alpha_vs_openness,
    alpha_vs_external_vulnerability,
  };

  // Classification label — now using macro data too
  const assetP = assetScore.percentile ?? 50;
  const macroP = macroScore.percentile ?? 50;
  const riskP = riskScore.percentile ?? 50;
  const curP = currencyScore.percentile ?? 50;
  const label = classifyFromScores(assetP, macroP, riskP, curP, alpha ?? 0, rc.country, rc.region);

  // Peer benchmark metadata
  const globalMeta = readBenchMeta(benchmarks?.global);
  const regionMeta = readBenchMeta(benchmarks?.regions?.[rc.region]);
  const devStageMeta = readBenchMeta(benchmarks?.development_stages?.[rc.development_stage]);
  const opennessMeta = readBenchMeta(benchmarks?.openness_types?.[rc.openness_type]);
  const extVulnMeta = readBenchMeta(benchmarks?.external_vulnerabilities?.[rc.external_vulnerability]);

  const peer_benchmarks: Record<PeerDimension, PeerBenchmark> = {
    global: {
      dimension: 'global', group_name: 'Global', group_size: globalMeta.groupSize,
      avg_asset_score: globalBenchZ, avg_macro_score: null, avg_risk_score: null,
      best_country: globalMeta.bestCountry, worst_country: globalMeta.worstCountry, dispersion: globalMeta.dispersion,
    },
    region: {
      dimension: 'region', group_name: rc.region, group_size: regionMeta.groupSize,
      avg_asset_score: regionBenchZ, avg_macro_score: null, avg_risk_score: null,
      best_country: regionMeta.bestCountry, worst_country: regionMeta.worstCountry, dispersion: regionMeta.dispersion,
    },
    development_stage: {
      dimension: 'development_stage', group_name: rc.development_stage, group_size: devStageMeta.groupSize,
      avg_asset_score: devStageBenchZ, avg_macro_score: null, avg_risk_score: null,
      best_country: devStageMeta.bestCountry, worst_country: devStageMeta.worstCountry, dispersion: devStageMeta.dispersion,
    },
    global_role: {
      dimension: 'global_role', group_name: rc.global_roles.length > 1 ? rc.global_roles.join(' + ') : (rc.global_roles[0] || 'N/A'),
      group_size: globalRoleMeta.groupSize,
      avg_asset_score: globalRoleBenchZ, avg_macro_score: null, avg_risk_score: null,
      best_country: globalRoleMeta.bestCountry, worst_country: globalRoleMeta.worstCountry, dispersion: globalRoleMeta.dispersion,
    },
    openness_type: {
      dimension: 'openness_type', group_name: rc.openness_type, group_size: opennessMeta.groupSize,
      avg_asset_score: opennessBenchZ, avg_macro_score: null, avg_risk_score: null,
      best_country: opennessMeta.bestCountry, worst_country: opennessMeta.worstCountry, dispersion: opennessMeta.dispersion,
    },
    external_vulnerability: {
      dimension: 'external_vulnerability', group_name: rc.external_vulnerability, group_size: extVulnMeta.groupSize,
      avg_asset_score: extVulnBenchZ, avg_macro_score: null, avg_risk_score: null,
      best_country: extVulnMeta.bestCountry, worst_country: extVulnMeta.worstCountry, dispersion: extVulnMeta.dispersion,
    },
  };

  // Macro panel — read from pipeline data
  const macro = adaptMacroPanel(rc);

  // Data quality — count all available fields
  let availCount = 0;
  let missingCount = 0;
  const missingFields: string[] = [];
  if (rc.equity?.available) availCount += 4; else { missingCount += 4; missingFields.push('Equity'); }
  if (rc.currency?.available) availCount += 4; else { missingCount += 4; missingFields.push('Currency'); }
  if (rc.bond?.available) availCount += 4; else { missingCount += 4; missingFields.push('Bond'); }

  // Count macro fields
  let macroAvail = 0;
  let macroMissing = 0;
  const macroPanel = rc.macro_panel || {};
  for (const cat of Object.values(macroPanel)) {
    for (const ind of Object.values(cat)) {
      if (ind?.available) macroAvail++;
      else macroMissing++;
    }
  }
  if (macroAvail === 0) {
    macroMissing = 14; // all macro indicators
    missingFields.push('All macro indicators');
  } else {
    if (!macroPanel['growth']?.['gdp_growth']?.available) missingFields.push('GDP Growth');
    if (!macroPanel['inflation']?.['cpi_yoy']?.available) missingFields.push('CPI');
    if (!macroPanel['labor']?.['unemployment']?.available) missingFields.push('Unemployment');
  }
  availCount += macroAvail;
  missingCount += macroMissing;
  const totalFields = availCount + missingCount;

  const data_quality: DataQuality = {
    country: rc.country,
    available_count: availCount,
    missing_count: missingCount,
    total_fields: totalFields,
    last_updated: rc.equity?.last_date || rc.currency?.last_date || '',
    data_source: 'Yahoo Finance + World Bank',
    confidence: macroAvail > 8 ? 'High' : macroAvail > 4 ? 'Medium' : 'Low',
    missing_fields: missingFields,
  };

  return { classification, assets, macro, scores, peer_benchmarks, label, data_quality };
}

// --- Helper functions ---

function makeMacroScore(raw: { z_score: number | null; percentile: number | null; available_count: number; total_count: number } | undefined): CategoryScore {
  if (!raw || raw.z_score === null) return { score: null, z_score: null, percentile: null, available_count: raw?.available_count ?? 0, total_count: raw?.total_count ?? 5 };
  return makeScore(raw.z_score, raw.available_count, raw.total_count);
}

function adaptMacroPanel(rc: RawCountry): MacroPanel {
  const panel = rc.macro_panel || {};
  const na: MacroIndicator = { value: null, available: false, z_score: null, percentile: null, source: 'Not available', last_updated: null };

  function toIndicator(cat: string, field: string): MacroIndicator {
    const raw = panel[cat]?.[field];
    if (!raw || !raw.available) return na;
    return {
      value: raw.value,
      available: true,
      z_score: raw.z_score,
      percentile: raw.percentile,
      source: raw.source || 'World Bank',
      last_updated: raw.last_updated,
    };
  }

  return {
    growth: {
      gdp_growth: toIndicator('growth', 'gdp_growth'),
      pmi: toIndicator('growth', 'pmi'),
      industrial_production: toIndicator('growth', 'industrial_production'),
      retail_sales: toIndicator('growth', 'retail_sales'),
      exports: toIndicator('growth', 'exports'),
    },
    labor: {
      unemployment: toIndicator('labor', 'unemployment'),
      wage_growth: toIndicator('labor', 'wage_growth'),
      jobless_claims: toIndicator('labor', 'jobless_claims'),
    },
    inflation: {
      cpi_yoy: toIndicator('inflation', 'cpi_yoy'),
      core_cpi: toIndicator('inflation', 'core_cpi'),
      ppi: toIndicator('inflation', 'ppi'),
      food_energy_pressure: toIndicator('inflation', 'food_energy_pressure'),
    },
    external_balance: {
      current_account_pct_gdp: toIndicator('external_balance', 'current_account_pct_gdp'),
      trade_balance: toIndicator('external_balance', 'trade_balance'),
      fx_reserves: toIndicator('external_balance', 'fx_reserves'),
      export_growth: toIndicator('external_balance', 'export_growth'),
      import_growth: toIndicator('external_balance', 'import_growth'),
    },
    fiscal_debt: {
      fiscal_balance_pct_gdp: toIndicator('fiscal_debt', 'fiscal_balance_pct_gdp'),
      govt_debt_pct_gdp: toIndicator('fiscal_debt', 'govt_debt_pct_gdp'),
      yield_10y: toIndicator('fiscal_debt', 'yield_10y'),
      sovereign_cds: toIndicator('fiscal_debt', 'sovereign_cds'),
    },
    credit_cycle: {
      private_credit_growth: toIndicator('credit_cycle', 'private_credit_growth'),
      bank_lending: toIndicator('credit_cycle', 'bank_lending'),
      household_debt: toIndicator('credit_cycle', 'household_debt'),
      corporate_debt: toIndicator('credit_cycle', 'corporate_debt'),
      credit_spread: toIndicator('credit_cycle', 'credit_spread'),
      bank_stock_performance: toIndicator('credit_cycle', 'bank_stock_performance'),
    },
  };
}

function getAvgZ(block: RawAssetBlock | undefined): number | null {
  if (!block?.available || !block.metrics) return null;
  const zScores = Object.values(block.metrics)
    .map(m => m.z_score)
    .filter((v): v is number => v !== null && v !== undefined);
  if (zScores.length === 0) return null;
  return zScores.reduce((a, b) => a + b, 0) / zScores.length;
}

function makeScore(z: number | null, avail: number, total: number): CategoryScore {
  if (z === null) return { score: null, z_score: null, percentile: null, available_count: avail, total_count: total };
  const capped = Math.max(-3, Math.min(3, z));
  const p = normalCDF(capped) * 100;
  return {
    score: parseFloat((p / 10).toFixed(2)),
    z_score: parseFloat(capped.toFixed(2)),
    percentile: parseFloat(p.toFixed(1)),
    available_count: avail,
    total_count: total,
  };
}

function adaptEquity(raw: RawAssetBlock | undefined): EquityData {
  if (!raw?.available) {
    return { ticker: '', price: null, usd_return_1m: null, return_1m: null, return_3m: null, return_6m: null, return_12m: null, z_score: null, percentile: null, peer_relative: null };
  }
  const z = getAvgZ(raw);
  return {
    ticker: raw.ticker || '',
    price: raw.last_price || null,
    usd_return_1m: raw.returns?.['1M'] ? raw.returns['1M'] / 100 : null,
    return_1m: raw.returns?.['1M'] ? raw.returns['1M'] / 100 : null,
    return_3m: raw.returns?.['3M'] ? raw.returns['3M'] / 100 : null,
    return_6m: raw.returns?.['6M'] ? raw.returns['6M'] / 100 : null,
    return_12m: raw.returns?.['12M'] ? raw.returns['12M'] / 100 : null,
    z_score: z !== null ? parseFloat(z.toFixed(2)) : null,
    percentile: z !== null ? parseFloat((normalCDF(z) * 100).toFixed(1)) : null,
    peer_relative: null,
  };
}

function adaptBond(raw: RawAssetBlock | undefined): BondData {
  if (!raw?.available) {
    return { available: false, yield_10y: null, yield_change_1m: null, yield_change_3m: null, bond_etf: null, cds_spread: null, z_score: null, percentile: null, peer_relative: null };
  }
  const z = getAvgZ(raw);
  return {
    available: true,
    yield_10y: null, // Pipeline provides ETF returns, not yields
    yield_change_1m: raw.returns?.['1M'] ? raw.returns['1M'] / 100 : null,
    yield_change_3m: raw.returns?.['3M'] ? raw.returns['3M'] / 100 : null,
    bond_etf: raw.bond_proxy || null,
    cds_spread: null,
    z_score: z !== null ? parseFloat(z.toFixed(2)) : null,
    percentile: z !== null ? parseFloat((normalCDF(z) * 100).toFixed(1)) : null,
    peer_relative: null,
  };
}

function adaptCurrency(raw: RawAssetBlock | undefined): CurrencyData {
  if (!raw?.available) {
    return { pair: '', rate: null, return_1m: null, return_3m: null, return_6m: null, return_12m: null, z_score: null, percentile: null, peer_relative: null };
  }
  const z = getAvgZ(raw);
  return {
    pair: raw.currency_pair || '',
    rate: raw.last_price || null,
    return_1m: raw.returns?.['1M'] ? raw.returns['1M'] / 100 : null,
    return_3m: raw.returns?.['3M'] ? raw.returns['3M'] / 100 : null,
    return_6m: raw.returns?.['6M'] ? raw.returns['6M'] / 100 : null,
    return_12m: raw.returns?.['12M'] ? raw.returns['12M'] / 100 : null,
    z_score: z !== null ? parseFloat(z.toFixed(2)) : null,
    percentile: z !== null ? parseFloat((normalCDF(z) * 100).toFixed(1)) : null,
    peer_relative: null,
  };
}

function adaptFingerprint(futures: Record<string, RawFuturesAsset>): GlobalFingerprint {
  const nameMap: Record<string, string> = {
    SPY: 'S&P 500', QQQ: 'Nasdaq', TLT: 'US 10Y Bond', SHY: 'US 2Y Bond',
    UUP: 'US Dollar', USO: 'WTI Oil', CPER: 'Copper', GLD: 'Gold',
    VIXY: 'VIX', DBA: 'Agriculture',
  };

  const assets: FuturesAsset[] = Object.entries(futures).map(([ticker, raw]) => {
    const m1w = raw.metrics?.['1M'];
    const z = m1w?.z_score ?? 0;
    const direction: 'up' | 'down' | 'flat' = z > 0.5 ? 'up' : z < -0.5 ? 'down' : 'flat';
    return {
      name: raw.name || nameMap[ticker] || ticker,
      ticker,
      price: raw.last_price,
      change_1d: raw.returns?.['1M'] ? raw.returns['1M'] / 100 / 21 : null, // rough daily from monthly
      change_1w: raw.returns?.['1M'] ? raw.returns['1M'] / 100 / 4.3 : null, // rough weekly from monthly
      change_1m: raw.returns?.['1M'] ? raw.returns['1M'] / 100 : null,
      z_score: parseFloat(z.toFixed(2)),
      percentile: parseFloat((normalCDF(z) * 100).toFixed(1)),
      direction,
    };
  });

  // Detect regime
  const spy = assets.find(a => a.ticker === 'SPY');
  const tlt = assets.find(a => a.ticker === 'TLT');
  const uup = assets.find(a => a.ticker === 'UUP');
  const gld = assets.find(a => a.ticker === 'GLD');
  const uso = assets.find(a => a.ticker === 'USO');
  const cper = assets.find(a => a.ticker === 'CPER');
  const vixy = assets.find(a => a.ticker === 'VIXY');

  const stocksDown = (spy?.z_score ?? 0) < -0.5;
  const stocksUp = (spy?.z_score ?? 0) > 0.5;
  const bondsUp = (tlt?.z_score ?? 0) > 0.5;
  const bondsDown = (tlt?.z_score ?? 0) < -0.5;
  const dollarUp = (uup?.z_score ?? 0) > 0.5;
  const goldUp = (gld?.z_score ?? 0) > 0.5;
  const oilUp = (uso?.z_score ?? 0) > 0.5;
  const copperDown = (cper?.z_score ?? 0) < -0.5;
  const vixHigh = (vixy?.z_score ?? 0) > 1.0;

  let regime: MarketRegime = 'Neutral';
  let explanation = 'No strong cross-asset signal detected. Markets are relatively calm.';
  const signals: string[] = [];
  let confidence = 0.5;

  if (vixHigh) {
    regime = 'Risk-Off';
    explanation = 'VIX is elevated, indicating broad market fear and risk aversion.';
    signals.push('VIX elevated');
    confidence = 0.75;
  }
  if (stocksDown && bondsUp) {
    regime = 'Growth Scare';
    explanation = 'Stocks declining while bonds rally — classic flight to safety on growth fears.';
    signals.push('Stocks ↓ + Bonds ↑');
    confidence = 0.8;
  } else if (stocksDown && bondsDown) {
    regime = 'Inflation Scare';
    explanation = 'Both stocks and bonds selling off — market pricing higher rates or fiscal stress.';
    signals.push('Stocks ↓ + Bonds ↓');
    confidence = 0.75;
  } else if (stocksDown && dollarUp) {
    regime = 'Dollar Squeeze';
    explanation = 'Dollar strengthening as risk assets decline — global dollar tightening.';
    signals.push('Stocks ↓ + Dollar ↑');
    confidence = 0.7;
  } else if (stocksDown && goldUp) {
    regime = 'Credit Stress';
    explanation = 'Gold rising as stocks fall — safe-haven bid indicating credit or systemic concerns.';
    signals.push('Stocks ↓ + Gold ↑');
    confidence = 0.7;
  } else if (stocksDown && oilUp) {
    regime = 'Energy Shock';
    explanation = 'Oil rising while stocks fall — energy/geopolitical shock pressuring the economy.';
    signals.push('Stocks ↓ + Oil ↑');
    confidence = 0.7;
  } else if (stocksUp && !copperDown) {
    regime = 'Risk-On';
    explanation = 'Broad risk appetite with equities rising. Growth expectations appear healthy.';
    signals.push('Stocks ↑');
    confidence = 0.65;
  }

  if (goldUp) signals.push('Gold ↑ = safe-haven demand');
  if (copperDown) signals.push('Copper ↓ = industrial weakness');
  if (oilUp) signals.push('Oil ↑');
  if (dollarUp) signals.push('Dollar ↑');

  return {
    assets,
    regime,
    regime_confidence: confidence,
    regime_explanation: explanation,
    fingerprint_signals: signals,
  };
}

function classifyFromScores(assetP: number, macroP: number, riskP: number, curP: number, alpha: number, country: string, region: string): CountryLabelResult {
  let label: CountryLabel = 'Unclassified';
  let explanation = '';
  const supporting: string[] = [];
  const risks: string[] = [];

  if (assetP < 30 && curP < 30 && riskP < 30) {
    label = 'Crisis Risk';
    explanation = `${country} shows broad weakness across assets and currency, with elevated risk indicators. This warrants close monitoring for potential systemic stress.`;
    risks.push('Weak assets', 'Currency pressure', 'Elevated risk');
  } else if (assetP > 70 && alpha > 0 && riskP > 50 && curP > 40) {
    label = 'True Alpha';
    explanation = `${country} is outperforming its ${region} peers with genuine alpha. Asset strength is supported by acceptable risk and currency stability.`;
    supporting.push('Strong assets', 'Positive alpha', 'Stable currency');
  } else if (assetP > 70 && (riskP < 40 || curP < 40)) {
    label = 'Fake Alpha';
    explanation = `${country}'s asset prices look strong on the surface, but underlying risk or currency weakness suggests the outperformance may not be sustainable.`;
    supporting.push('Strong asset prices');
    if (riskP < 40) risks.push('Elevated risk');
    if (curP < 40) risks.push('Currency weakness');
  } else if (riskP > 50 && assetP < 50 && curP > 50) {
    label = 'Hidden Alpha';
    explanation = `${country} shows stability in risk and currency metrics but asset prices haven't reflected this yet — a potential value opportunity.`;
    supporting.push('Stable risk', 'Currency strength');
    risks.push('Assets underperforming');
  } else if (Math.abs(alpha) < 0.25) {
    label = 'Beta';
    explanation = `${country} is largely moving in line with the global and ${region} benchmarks. Country-specific factors are minimal.`;
  } else {
    label = alpha > 0 ? 'Positive Drift' : 'Negative Drift';
    explanation = `${country} shows moderate deviation from benchmarks but doesn't cleanly fit a specific attribution category.`;
  }

  return { label, confidence: Math.min(0.95, 0.65 + Math.abs(alpha) * 0.1 + (assetP > 80 || assetP < 20 ? 0.1 : 0)), explanation, supporting_factors: supporting, risk_factors: risks };
}

