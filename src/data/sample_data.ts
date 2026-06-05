// ============================================================
// Global Economic Attribution Dashboard — Sample Data
// ============================================================
// This file contains realistic sample data for all 38 countries.
// All data is synthetic but designed to tell a coherent macro story.
// ============================================================

import type {
  DashboardData,
  CountryData,
  CountryClassification,
  AssetPanel,
  EquityData,
  BondData,
  CurrencyData,
  MacroPanel,
  GrowthData,
  LaborData,
  InflationData,
  ExternalBalanceData,
  FiscalDebtData,
  CreditCycleData,
  MacroIndicator,
  CountryScores,
  CategoryScore,
  PeerBenchmark,
  PeerDimension,
  CountryLabelResult,
  CountryLabel,
  DataQuality,
  GlobalFingerprint,
  FuturesAsset,
  Region,
  DevelopmentStage,
  GlobalRole,
  OpennessType,
  ExternalVulnerability,
} from '../lib/types';

// ---- Helper Factories ----

function mi(value: number | null, z: number | null, pct: number | null, src: string, updated: string | null = '2025-06-04', avail = true): MacroIndicator {
  return { value, available: avail, z_score: z, percentile: pct, source: src, last_updated: updated };
}

function miNA(): MacroIndicator {
  return { value: null, available: false, z_score: null, percentile: null, source: 'N/A', last_updated: null };
}

function cs(score: number | null, z: number | null, pct: number | null, avail: number, total: number): CategoryScore {
  return { score, z_score: z, percentile: pct, available_count: avail, total_count: total };
}

function pb(dim: PeerDimension, group: string, size: number, aAsset: number | null, aMacro: number | null, aRisk: number | null, best: string | null, worst: string | null, disp: number | null): PeerBenchmark {
  return { dimension: dim, group_name: group, group_size: size, avg_asset_score: aAsset, avg_macro_score: aMacro, avg_risk_score: aRisk, best_country: best, worst_country: worst, dispersion: disp };
}

function eq(ticker: string, price: number | null, r1m: number | null, r3m: number | null, r6m: number | null, r12m: number | null, usd1m: number | null, z: number | null, pct: number | null, pr: number | null): EquityData {
  return { ticker, price, return_1m: r1m, return_3m: r3m, return_6m: r6m, return_12m: r12m, usd_return_1m: usd1m, z_score: z, percentile: pct, peer_relative: pr };
}

function bd(avail: boolean, y10: number | null, yc1m: number | null, yc3m: number | null, etf: string | null, cds: number | null, z: number | null, pct: number | null, pr: number | null): BondData {
  return { available: avail, yield_10y: y10, yield_change_1m: yc1m, yield_change_3m: yc3m, bond_etf: etf, cds_spread: cds, z_score: z, percentile: pct, peer_relative: pr };
}

function cx(pair: string, rate: number | null, r1m: number | null, r3m: number | null, r6m: number | null, r12m: number | null, z: number | null, pct: number | null, pr: number | null): CurrencyData {
  return { pair, rate, return_1m: r1m, return_3m: r3m, return_6m: r6m, return_12m: r12m, z_score: z, percentile: pct, peer_relative: pr };
}

function lbl(label: CountryLabel, confidence: number, explanation: string, supporting: string[], risks: string[]): CountryLabelResult {
  return { label, confidence, explanation, supporting_factors: supporting, risk_factors: risks };
}

function dq(country: string, avail: number, missing: number, total: number, src: string, conf: 'High' | 'Medium' | 'Low', missingFields: string[]): DataQuality {
  return { country, available_count: avail, missing_count: missing, total_fields: total, last_updated: '2025-06-04', data_source: src, confidence: conf, missing_fields: missingFields };
}

function clf(country: string, code: string, tickerEq: string, currPair: string, bondProxy: string | null, region: Region, dev: DevelopmentStage, roles: GlobalRole[], open: OpennessType, ext: ExternalVulnerability): CountryClassification {
  return { country, code, ticker_equity: tickerEq, currency_pair: currPair, bond_proxy: bondProxy, region, development_stage: dev, global_roles: roles, openness_type: open, external_vulnerability: ext };
}

function peerSet(
  globalBest: string | null, globalWorst: string | null,
  regionName: string, regionSize: number, regionAsset: number | null, regionMacro: number | null, regionRisk: number | null, regionBest: string | null, regionWorst: string | null,
  devName: string, devSize: number, devAsset: number | null, devMacro: number | null, devRisk: number | null, devBest: string | null, devWorst: string | null,
  roleName: string, roleSize: number, roleAsset: number | null, roleMacro: number | null, roleRisk: number | null, roleBest: string | null, roleWorst: string | null,
  openName: string, openSize: number, openAsset: number | null, openMacro: number | null, openRisk: number | null, openBest: string | null, openWorst: string | null,
  extName: string, extSize: number, extAsset: number | null, extMacro: number | null, extRisk: number | null, extBest: string | null, extWorst: string | null,
): Record<PeerDimension, PeerBenchmark> {
  return {
    global: pb('global', 'All Countries', 38, 52, 55, 50, globalBest, globalWorst, 18.5),
    region: pb('region', regionName, regionSize, regionAsset, regionMacro, regionRisk, regionBest, regionWorst, 12.0),
    development_stage: pb('development_stage', devName, devSize, devAsset, devMacro, devRisk, devBest, devWorst, 10.5),
    global_role: pb('global_role', roleName, roleSize, roleAsset, roleMacro, roleRisk, roleBest, roleWorst, 14.0),
    openness_type: pb('openness_type', openName, openSize, openAsset, openMacro, openRisk, openBest, openWorst, 11.0),
    external_vulnerability: pb('external_vulnerability', extName, extSize, extAsset, extMacro, extRisk, extBest, extWorst, 9.5),
  };
}

// ---- Global Fingerprint ----

const globalFingerprint: GlobalFingerprint = {
  assets: [
    { name: 'S&P 500', ticker: 'ES=F', price: 5320.50, change_1d: 0.35, change_1w: 1.20, change_1m: 2.80, z_score: 0.65, percentile: 74, direction: 'up' },
    { name: 'Nasdaq 100', ticker: 'NQ=F', price: 18950.00, change_1d: 0.52, change_1w: 1.85, change_1m: 3.50, z_score: 0.90, percentile: 82, direction: 'up' },
    { name: 'US 10Y Yield', ticker: 'ZN=F', price: 4.42, change_1d: 0.02, change_1w: 0.08, change_1m: -0.12, z_score: 0.30, percentile: 62, direction: 'up' },
    { name: 'US 2Y Yield', ticker: 'ZT=F', price: 4.88, change_1d: -0.01, change_1w: -0.05, change_1m: -0.18, z_score: -0.10, percentile: 46, direction: 'down' },
    { name: 'DXY', ticker: 'DX-Y.NYB', price: 104.25, change_1d: -0.15, change_1w: -0.45, change_1m: -1.20, z_score: -0.40, percentile: 34, direction: 'down' },
    { name: 'WTI Oil', ticker: 'CL=F', price: 78.50, change_1d: 0.80, change_1w: 2.10, change_1m: -3.50, z_score: -0.25, percentile: 40, direction: 'up' },
    { name: 'Copper', ticker: 'HG=F', price: 4.65, change_1d: 0.45, change_1w: 1.80, change_1m: 5.20, z_score: 1.10, percentile: 86, direction: 'up' },
    { name: 'Gold', ticker: 'GC=F', price: 2345.00, change_1d: 0.25, change_1w: 0.90, change_1m: 2.10, z_score: 0.75, percentile: 77, direction: 'up' },
    { name: 'VIX', ticker: 'VX=F', price: 13.80, change_1d: -0.35, change_1w: -1.20, change_1m: -2.50, z_score: -0.85, percentile: 20, direction: 'down' },
    { name: 'Agriculture', ticker: 'DBA', price: 22.15, change_1d: 0.10, change_1w: -0.30, change_1m: 1.40, z_score: 0.15, percentile: 56, direction: 'up' },
  ] as FuturesAsset[],
  regime: 'Risk-On',
  regime_confidence: 0.72,
  regime_explanation: 'Broad equity strength with falling VIX and weakening dollar suggest a risk-on environment. Copper strength signals reflation, while falling 2Y yields point to easing expectations.',
  fingerprint_signals: [
    'VIX below 15 — complacency zone',
    'DXY weakening supports EM assets',
    'Copper/Gold ratio rising — growth > fear',
    'Yield curve steepening modestly',
    'Tech outperformance accelerating',
  ],
};

// ---- Country Data: 38 Countries ----

// 1. United States — Beta (it IS the benchmark)
const us: CountryData = {
  classification: clf('United States', 'US', 'SPY', 'DX-Y.NYB', 'TLT', 'North America', 'Developed Market', ['Technology Core', 'Financial Center', 'Dollar System Core', 'Large Domestic Demand Economy'], 'Large Domestic Economy', 'Strong'),
  assets: {
    equity: eq('SPY', 532.10, 2.80, 5.10, 12.50, 24.30, 2.80, 0.65, 74, 0.0),
    bond: bd(true, 4.42, -0.12, 0.05, 'TLT', 15, 0.30, 62, 0.0),
    currency: cx('DX-Y.NYB', 104.25, -1.20, -2.10, 1.50, 3.80, -0.40, 34, 0.0),
  },
  macro: {
    growth: { gdp_growth: mi(2.5, 0.40, 66, 'BEA'), pmi: mi(51.3, 0.20, 58, 'ISM'), industrial_production: mi(0.8, -0.10, 48, 'Fed'), retail_sales: mi(0.3, 0.05, 52, 'Census'), exports: mi(2.1, 0.15, 55, 'Census') },
    labor: { unemployment: mi(3.9, -0.50, 72, 'BLS'), wage_growth: mi(4.1, 0.30, 64, 'BLS'), jobless_claims: mi(215000, -0.40, 68, 'DOL') },
    inflation: { cpi_yoy: mi(3.4, 0.45, 68, 'BLS'), core_cpi: mi(3.6, 0.55, 72, 'BLS'), ppi: mi(2.2, 0.20, 58, 'BLS'), food_energy_pressure: mi(0.5, -0.20, 42, 'BLS') },
    external_balance: { current_account_pct_gdp: mi(-3.0, -0.60, 28, 'BEA'), trade_balance: mi(-74.6, -0.50, 30, 'Census'), fx_reserves: mi(36.0, -0.10, 45, 'Fed'), export_growth: mi(2.1, 0.15, 55, 'Census'), import_growth: mi(1.8, 0.10, 52, 'Census') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-6.3, -1.20, 12, 'CBO'), govt_debt_pct_gdp: mi(123.0, 1.50, 15, 'Treasury'), yield_10y: mi(4.42, 0.30, 62, 'Treasury'), sovereign_cds: mi(15, -0.80, 85, 'Market') },
    credit_cycle: { private_credit_growth: mi(3.2, 0.10, 54, 'Fed'), bank_lending: mi(2.5, -0.15, 44, 'Fed'), household_debt: mi(76.0, 0.20, 55, 'Fed'), corporate_debt: mi(48.0, 0.35, 60, 'Fed'), credit_spread: mi(1.10, -0.30, 65, 'Market'), bank_stock_performance: mi(8.5, 0.45, 68, 'Market') },
  },
  scores: { asset_score: cs(55, 0.20, 58, 3, 3), equity_score: cs(74, 0.65, 74, 5, 5), bond_score: cs(62, 0.30, 62, 5, 5), currency_score: cs(34, -0.40, 34, 5, 5), macro_score: cs(56, 0.25, 60, 28, 28), growth_score: cs(56, 0.14, 56, 5, 5), labor_score: cs(68, -0.20, 68, 3, 3), inflation_score: cs(40, 0.25, 40, 4, 4), external_balance_score: cs(42, -0.19, 42, 5, 5), fiscal_score: cs(44, -0.30, 44, 4, 4), credit_score: cs(58, 0.11, 58, 6, 6), risk_score: cs(50, 0.0, 50, 31, 31), country_alpha: 0.0, true_alpha: 0.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'North America', 3, 55, 56, 50, 'United States', 'Mexico', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Technology Core', 8, 62, 58, 54, 'Taiwan', 'South Korea', 'Large Domestic Economy', 7, 52, 54, 48, 'India', 'Indonesia', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.92, 'US is the benchmark itself. Performance tracks global beta by definition.', ['Reserve currency issuer', 'Deepest capital markets', 'Technology sector leadership'], ['Fiscal deficit widening', 'Debt/GDP elevated', 'Persistent current account deficit']),
  data_quality: dq('United States', 28, 0, 28, 'Bloomberg / FRED', 'High', []),
};

// 2. Canada — Beta
const ca: CountryData = {
  classification: clf('Canada', 'CA', 'EWC', 'CADUSD=X', null, 'North America', 'Developed Market', ['Resource Exporter', 'Financial Center'], 'Medium Open Economy', 'Strong'),
  assets: {
    equity: eq('EWC', 38.20, 1.50, 3.20, 8.10, 14.50, 1.80, 0.25, 60, -0.30),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('CADUSD=X', 0.735, 0.50, -0.80, -2.10, -3.50, 0.10, 54, 0.15),
  },
  macro: {
    growth: { gdp_growth: mi(1.5, -0.20, 42, 'StatCan'), pmi: mi(49.8, -0.30, 40, 'S&P Global'), industrial_production: mi(-0.3, -0.45, 34, 'StatCan'), retail_sales: mi(0.1, -0.15, 44, 'StatCan'), exports: mi(1.2, -0.05, 48, 'StatCan') },
    labor: { unemployment: mi(6.1, 0.30, 38, 'StatCan'), wage_growth: mi(4.8, 0.45, 70, 'StatCan'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(2.7, 0.10, 52, 'StatCan'), core_cpi: mi(2.9, 0.15, 55, 'StatCan'), ppi: mi(1.5, -0.10, 46, 'StatCan'), food_energy_pressure: mi(0.3, -0.30, 38, 'StatCan') },
    external_balance: { current_account_pct_gdp: mi(-0.8, -0.15, 44, 'StatCan'), trade_balance: mi(-1.2, -0.20, 42, 'StatCan'), fx_reserves: mi(106.0, 0.10, 55, 'BoC'), export_growth: mi(1.2, -0.05, 48, 'StatCan'), import_growth: mi(2.0, 0.10, 52, 'StatCan') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-1.4, -0.25, 42, 'Finance Canada'), govt_debt_pct_gdp: mi(107.0, 0.80, 25, 'Finance Canada'), yield_10y: mi(3.65, 0.15, 55, 'BoC'), sovereign_cds: mi(28, -0.50, 78, 'Market') },
    credit_cycle: { private_credit_growth: mi(4.5, 0.30, 60, 'BoC'), bank_lending: mi(3.8, 0.20, 58, 'BoC'), household_debt: mi(101.0, 0.90, 22, 'BoC'), corporate_debt: mi(55.0, 0.40, 55, 'BoC'), credit_spread: mi(1.30, -0.20, 58, 'Market'), bank_stock_performance: mi(5.2, 0.20, 58, 'Market') },
  },
  scores: { asset_score: cs(50, 0.10, 54, 2, 3), equity_score: cs(60, 0.25, 60, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(54, 0.10, 54, 5, 5), macro_score: cs(48, -0.05, 48, 27, 28), growth_score: cs(42, -0.23, 42, 5, 5), labor_score: cs(54, 0.38, 54, 2, 3), inflation_score: cs(48, -0.04, 48, 4, 4), external_balance_score: cs(48, -0.04, 48, 5, 5), fiscal_score: cs(50, 0.05, 50, 4, 4), credit_score: cs(52, 0.23, 52, 6, 6), risk_score: cs(48, -0.05, 48, 29, 31), country_alpha: -2.0, true_alpha: -1.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'North America', 3, 55, 56, 50, 'United States', 'Mexico', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Resource Exporter', 10, 50, 48, 45, 'Australia', 'Nigeria', 'Medium Open Economy', 12, 52, 50, 48, 'Poland', 'Turkey', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.85, 'Canada tracks global cycle with resource-sector tilt. Household debt remains a structural vulnerability.', ['Stable banking system', 'Resource base supports trade balance', 'Strong institutions'], ['Elevated household debt', 'Housing market correction risk', 'Slowing growth momentum']),
  data_quality: dq('Canada', 27, 1, 28, 'StatCan / BoC', 'High', ['jobless_claims']),
};

// 3. Mexico — Beta
const mx: CountryData = {
  classification: clf('Mexico', 'MX', 'EWW', 'MXNUSD=X', null, 'Latin America', 'Advanced Emerging Market', ['Manufacturing Exporter', 'Resource Exporter'], 'Medium Open Economy', 'Neutral'),
  assets: {
    equity: eq('EWW', 52.80, -1.20, 2.50, 5.80, 18.20, -0.80, 0.35, 64, 0.10),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('MXNUSD=X', 0.058, -0.80, -3.50, -5.20, -8.40, -0.65, 26, -0.50),
  },
  macro: {
    growth: { gdp_growth: mi(3.1, 0.65, 74, 'INEGI'), pmi: mi(52.1, 0.40, 66, 'S&P Global'), industrial_production: mi(2.5, 0.50, 70, 'INEGI'), retail_sales: mi(4.2, 0.70, 76, 'INEGI'), exports: mi(5.8, 0.80, 80, 'INEGI') },
    labor: { unemployment: mi(2.8, -0.80, 82, 'INEGI'), wage_growth: mi(10.5, 1.20, 88, 'INEGI'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(4.7, 0.70, 75, 'INEGI'), core_cpi: mi(4.4, 0.60, 72, 'INEGI'), ppi: mi(3.8, 0.40, 66, 'INEGI'), food_energy_pressure: mi(1.2, 0.35, 64, 'INEGI') },
    external_balance: { current_account_pct_gdp: mi(-1.3, -0.20, 42, 'Banxico'), trade_balance: mi(-3.5, -0.30, 38, 'INEGI'), fx_reserves: mi(215.0, 0.40, 65, 'Banxico'), export_growth: mi(5.8, 0.80, 80, 'INEGI'), import_growth: mi(4.5, 0.55, 72, 'INEGI') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-3.5, -0.60, 32, 'SHCP'), govt_debt_pct_gdp: mi(50.0, -0.10, 55, 'SHCP'), yield_10y: mi(9.80, 0.50, 35, 'Banxico'), sovereign_cds: mi(85, 0.10, 52, 'Market') },
    credit_cycle: { private_credit_growth: mi(7.8, 0.70, 76, 'Banxico'), bank_lending: mi(8.2, 0.75, 78, 'Banxico'), household_debt: mi(16.0, -1.00, 88, 'Banxico'), corporate_debt: mi(25.0, -0.50, 72, 'Banxico'), credit_spread: mi(2.50, 0.15, 45, 'Market'), bank_stock_performance: mi(12.5, 0.80, 80, 'Market') },
  },
  scores: { asset_score: cs(45, -0.15, 45, 2, 3), equity_score: cs(64, 0.35, 64, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(26, -0.65, 26, 5, 5), macro_score: cs(64, 0.50, 68, 27, 28), growth_score: cs(73, 0.61, 73, 5, 5), labor_score: cs(85, 0.20, 85, 2, 3), inflation_score: cs(31, 0.51, 31, 4, 4), external_balance_score: cs(59, 0.25, 59, 5, 5), fiscal_score: cs(44, -0.05, 44, 4, 4), credit_score: cs(73, 0.15, 73, 6, 6), risk_score: cs(55, 0.15, 55, 29, 31), country_alpha: 5.2, true_alpha: 3.8 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Latin America', 5, 48, 52, 42, 'Mexico', 'Argentina', 'Advanced Emerging Market', 9, 54, 56, 50, 'Taiwan', 'Turkey', 'Manufacturing Exporter', 9, 56, 55, 52, 'Taiwan', 'Bangladesh', 'Medium Open Economy', 12, 52, 50, 48, 'Poland', 'Turkey', 'Neutral', 12, 50, 52, 48, 'Taiwan', 'Philippines'),
  label: lbl('Beta', 0.78, 'Mexico benefits from nearshoring trend but currency weakness drags overall score. Strong growth fundamentals.', ['Nearshoring beneficiary', 'Low unemployment', 'Strong export growth'], ['Peso depreciation', 'Fiscal deficit widening', 'High policy rates']),
  data_quality: dq('Mexico', 27, 1, 28, 'INEGI / Banxico', 'High', ['jobless_claims']),
};

// 4. Brazil — Hidden Alpha
const br: CountryData = {
  classification: clf('Brazil', 'BR', 'EWZ', 'BRLUSD=X', null, 'Latin America', 'Advanced Emerging Market', ['Resource Exporter', 'Large Domestic Demand Economy'], 'Large Domestic Economy', 'Neutral'),
  assets: {
    equity: eq('EWZ', 30.50, -2.80, -5.20, -8.40, 2.50, -3.50, -0.70, 24, -1.20),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('BRLUSD=X', 0.195, -1.50, -6.80, -12.50, -15.20, -1.10, 14, -1.80),
  },
  macro: {
    growth: { gdp_growth: mi(2.9, 0.55, 72, 'IBGE'), pmi: mi(54.2, 0.80, 80, 'S&P Global'), industrial_production: mi(3.5, 0.70, 76, 'IBGE'), retail_sales: mi(5.8, 0.90, 82, 'IBGE'), exports: mi(8.2, 1.10, 86, 'MDIC') },
    labor: { unemployment: mi(7.8, -0.30, 58, 'IBGE'), wage_growth: mi(6.5, 0.55, 72, 'IBGE'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(3.9, 0.30, 62, 'IBGE'), core_cpi: mi(3.5, 0.15, 56, 'IBGE'), ppi: mi(2.8, 0.10, 54, 'IBGE'), food_energy_pressure: mi(0.8, 0.05, 52, 'IBGE') },
    external_balance: { current_account_pct_gdp: mi(-1.5, -0.25, 40, 'BCB'), trade_balance: mi(8.2, 0.60, 72, 'MDIC'), fx_reserves: mi(355.0, 0.70, 78, 'BCB'), export_growth: mi(8.2, 1.10, 86, 'MDIC'), import_growth: mi(3.5, 0.30, 62, 'MDIC') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-7.5, -1.40, 10, 'Treasury'), govt_debt_pct_gdp: mi(75.0, 0.40, 35, 'BCB'), yield_10y: mi(12.50, 0.80, 22, 'BCB'), sovereign_cds: mi(145, 0.30, 38, 'Market') },
    credit_cycle: { private_credit_growth: mi(8.5, 0.80, 80, 'BCB'), bank_lending: mi(9.2, 0.85, 82, 'BCB'), household_debt: mi(30.0, -0.30, 62, 'BCB'), corporate_debt: mi(35.0, 0.10, 52, 'BCB'), credit_spread: mi(3.20, 0.40, 35, 'Market'), bank_stock_performance: mi(-5.2, -0.60, 28, 'Market') },
  },
  scores: { asset_score: cs(22, -0.85, 20, 2, 3), equity_score: cs(24, -0.70, 24, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(14, -1.10, 14, 5, 5), macro_score: cs(65, 0.55, 70, 27, 28), growth_score: cs(79, 0.81, 79, 5, 5), labor_score: cs(65, 0.13, 65, 2, 3), inflation_score: cs(56, 0.15, 56, 4, 4), external_balance_score: cs(68, 0.43, 68, 5, 5), fiscal_score: cs(26, -0.48, 26, 4, 4), credit_score: cs(57, 0.21, 57, 6, 6), risk_score: cs(42, -0.28, 42, 29, 31), country_alpha: -18.5, true_alpha: 8.2 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Latin America', 5, 48, 52, 42, 'Mexico', 'Argentina', 'Advanced Emerging Market', 9, 54, 56, 50, 'Taiwan', 'Turkey', 'Resource Exporter', 10, 50, 48, 45, 'Australia', 'Nigeria', 'Large Domestic Economy', 7, 52, 54, 48, 'India', 'Indonesia', 'Neutral', 12, 50, 52, 48, 'Taiwan', 'Philippines'),
  label: lbl('Hidden Alpha', 0.82, 'Brazil shows weak asset performance but strong macro fundamentals. Growth is robust, exports are booming, and PMI is elevated. The market is pricing in fiscal risk that may be overstated.', ['Strong GDP growth at 2.9%', 'PMI above 54 — expansion', 'Record export performance', 'Ample FX reserves at $355B'], ['Fiscal deficit at -7.5% of GDP', 'BRL under severe pressure', 'High sovereign yields reflect risk premium', 'Political noise weighing on sentiment']),
  data_quality: dq('Brazil', 27, 1, 28, 'IBGE / BCB', 'High', ['jobless_claims']),
};

// 5. Chile — Beta
const cl: CountryData = {
  classification: clf('Chile', 'CL', 'ECH', 'CLPUSD=X', null, 'Latin America', 'Advanced Emerging Market', ['Resource Exporter'], 'Small Open Economy', 'Neutral'),
  assets: {
    equity: eq('ECH', 29.40, 3.20, 6.80, 10.50, 15.80, 3.80, 0.55, 71, 0.40),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('CLPUSD=X', 0.00108, 1.20, 2.50, 4.80, -1.20, 0.30, 62, 0.25),
  },
  macro: {
    growth: { gdp_growth: mi(2.2, 0.20, 58, 'BCCh'), pmi: mi(50.5, 0.05, 52, 'S&P Global'), industrial_production: mi(1.5, 0.15, 56, 'INE'), retail_sales: mi(2.8, 0.35, 64, 'INE'), exports: mi(4.5, 0.55, 72, 'BCCh') },
    labor: { unemployment: mi(8.5, 0.50, 32, 'INE'), wage_growth: mi(5.2, 0.40, 66, 'INE'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(3.5, 0.15, 56, 'INE'), core_cpi: mi(3.2, 0.10, 54, 'INE'), ppi: mi(2.0, -0.05, 48, 'INE'), food_energy_pressure: mi(0.4, -0.25, 40, 'INE') },
    external_balance: { current_account_pct_gdp: mi(-3.5, -0.55, 30, 'BCCh'), trade_balance: mi(1.5, 0.15, 56, 'BCCh'), fx_reserves: mi(45.0, 0.10, 50, 'BCCh'), export_growth: mi(4.5, 0.55, 72, 'BCCh'), import_growth: mi(2.5, 0.20, 58, 'BCCh') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-2.5, -0.40, 38, 'MoF'), govt_debt_pct_gdp: mi(38.0, -0.40, 65, 'MoF'), yield_10y: mi(5.80, 0.25, 45, 'BCCh'), sovereign_cds: mi(55, -0.30, 68, 'Market') },
    credit_cycle: { private_credit_growth: mi(3.5, 0.15, 56, 'BCCh'), bank_lending: mi(2.8, 0.05, 52, 'BCCh'), household_debt: mi(45.0, 0.15, 48, 'BCCh'), corporate_debt: mi(95.0, 0.80, 25, 'BCCh'), credit_spread: mi(1.80, -0.05, 52, 'Market'), bank_stock_performance: mi(6.8, 0.35, 64, 'Market') },
  },
  scores: { asset_score: cs(62, 0.40, 66, 2, 3), equity_score: cs(71, 0.55, 71, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(62, 0.30, 62, 5, 5), macro_score: cs(52, 0.10, 54, 27, 28), growth_score: cs(60, 0.26, 60, 5, 5), labor_score: cs(49, 0.45, 49, 2, 3), inflation_score: cs(50, -0.01, 50, 4, 4), external_balance_score: cs(53, 0.09, 53, 5, 5), fiscal_score: cs(54, -0.21, 54, 4, 4), credit_score: cs(50, 0.24, 50, 6, 6), risk_score: cs(56, 0.22, 56, 29, 31), country_alpha: 4.5, true_alpha: 2.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Latin America', 5, 48, 52, 42, 'Chile', 'Argentina', 'Advanced Emerging Market', 9, 54, 56, 50, 'Taiwan', 'Turkey', 'Resource Exporter', 10, 50, 48, 45, 'Australia', 'Nigeria', 'Small Open Economy', 12, 55, 54, 52, 'Singapore', 'Kenya', 'Neutral', 12, 50, 52, 48, 'Taiwan', 'Philippines'),
  label: lbl('Beta', 0.80, 'Chile is a copper-driven small open economy tracking global commodity cycle. Decent equity returns with moderate macro.', ['Copper export beneficiary', 'Manageable debt levels', 'Disinflation progress'], ['High unemployment', 'Current account deficit', 'Elevated corporate debt']),
  data_quality: dq('Chile', 27, 1, 28, 'BCCh / INE', 'High', ['jobless_claims']),
};

// 6. Argentina — Fake Alpha
const ar: CountryData = {
  classification: clf('Argentina', 'AR', 'ARGT', 'ARSUSD=X', null, 'Latin America', 'Crisis / High-Risk Market', ['Resource Exporter'], 'Medium Open Economy', 'Fragile'),
  assets: {
    equity: eq('ARGT', 52.30, 12.50, 35.80, 85.20, 180.50, 8.20, 2.10, 98, 3.50),
    bond: bd(false, null, null, null, null, 2200, null, null, null),
    currency: cx('ARSUSD=X', 0.00115, -4.50, -18.20, -42.50, -55.80, -2.80, 2, -3.20),
  },
  macro: {
    growth: { gdp_growth: mi(-1.5, -1.20, 12, 'INDEC'), pmi: mi(44.8, -1.30, 10, 'S&P Global'), industrial_production: mi(-8.5, -1.80, 5, 'INDEC'), retail_sales: mi(-12.0, -2.00, 3, 'INDEC'), exports: mi(-2.5, -0.50, 30, 'INDEC') },
    labor: { unemployment: mi(7.5, 0.40, 36, 'INDEC'), wage_growth: mi(180.0, 2.50, 99, 'INDEC'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(250.0, 2.80, 1, 'INDEC'), core_cpi: mi(230.0, 2.70, 2, 'INDEC'), ppi: mi(200.0, 2.50, 3, 'INDEC'), food_energy_pressure: mi(15.0, 2.20, 4, 'INDEC') },
    external_balance: { current_account_pct_gdp: mi(-0.5, -0.05, 48, 'BCRA'), trade_balance: mi(1.2, 0.10, 55, 'INDEC'), fx_reserves: mi(28.0, -1.50, 8, 'BCRA'), export_growth: mi(-2.5, -0.50, 30, 'INDEC'), import_growth: mi(-15.0, -1.80, 5, 'INDEC') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-4.0, -0.70, 28, 'Mecon'), govt_debt_pct_gdp: mi(85.0, 0.55, 30, 'Mecon'), yield_10y: mi(18.50, 1.80, 5, 'BCRA'), sovereign_cds: mi(2200, 2.50, 2, 'Market') },
    credit_cycle: { private_credit_growth: mi(150.0, 2.20, 98, 'BCRA'), bank_lending: mi(120.0, 2.00, 96, 'BCRA'), household_debt: mi(5.0, -1.50, 95, 'BCRA'), corporate_debt: mi(8.0, -1.40, 92, 'BCRA'), credit_spread: mi(15.00, 2.50, 2, 'Market'), bank_stock_performance: mi(45.0, 2.00, 96, 'Market') },
  },
  scores: { asset_score: cs(50, 0.00, 50, 2, 3), equity_score: cs(98, 2.10, 98, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(2, -2.80, 2, 5, 5), macro_score: cs(18, -1.80, 10, 27, 28), growth_score: cs(12, -1.36, 12, 5, 5), labor_score: cs(68, 1.45, 68, 2, 3), inflation_score: cs(3, 2.55, 3, 4, 4), external_balance_score: cs(29, -0.75, 29, 5, 5), fiscal_score: cs(16, 0.79, 16, 4, 4), credit_score: cs(80, 0.97, 80, 6, 6), risk_score: cs(25, -1.50, 15, 29, 31), country_alpha: 35.0, true_alpha: -25.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Latin America', 5, 48, 52, 42, 'Chile', 'Argentina', 'Crisis / High-Risk Market', 1, 50, 18, 25, 'Argentina', 'Argentina', 'Resource Exporter', 10, 50, 48, 45, 'Australia', 'Nigeria', 'Medium Open Economy', 12, 52, 50, 48, 'Poland', 'Turkey', 'Fragile', 8, 38, 32, 28, 'South Africa', 'Pakistan'),
  label: lbl('Fake Alpha', 0.90, 'Argentina shows spectacular equity returns driven by Milei reform optimism, but macro fundamentals are in crisis. 250% inflation, collapsing output, and depleted reserves signal extreme fragility.', ['Equity market surging on reform hopes', 'Fiscal adjustment underway', 'Import compression improving trade balance'], ['Hyperinflation at 250% YoY', 'GDP contracting -1.5%', 'FX reserves critically low at $28B', 'CDS spread at 2200bps — deep distress']),
  data_quality: dq('Argentina', 27, 1, 28, 'INDEC / BCRA', 'Medium', ['jobless_claims']),
};

// 7. United Kingdom — Beta
const gb: CountryData = {
  classification: clf('United Kingdom', 'GB', 'EWU', 'GBPUSD=X', 'IGLT.L', 'Europe', 'Developed Market', ['Financial Center', 'Tourism / Service Economy'], 'Medium Open Economy', 'Strong'),
  assets: {
    equity: eq('EWU', 35.80, 1.80, 4.50, 9.20, 12.80, 2.20, 0.30, 62, -0.10),
    bond: bd(true, 4.28, -0.08, 0.12, 'IGLT.L', 22, 0.20, 58, -0.05),
    currency: cx('GBPUSD=X', 1.275, 1.50, 2.80, 0.80, -1.50, 0.35, 64, 0.30),
  },
  macro: {
    growth: { gdp_growth: mi(0.6, -0.50, 32, 'ONS'), pmi: mi(51.0, 0.10, 54, 'S&P Global'), industrial_production: mi(-0.5, -0.40, 35, 'ONS'), retail_sales: mi(-0.2, -0.30, 38, 'ONS'), exports: mi(0.8, -0.10, 46, 'ONS') },
    labor: { unemployment: mi(4.3, 0.10, 50, 'ONS'), wage_growth: mi(5.7, 0.65, 74, 'ONS'), jobless_claims: mi(32000, 0.20, 45, 'ONS') },
    inflation: { cpi_yoy: mi(3.2, 0.25, 60, 'ONS'), core_cpi: mi(3.9, 0.45, 68, 'ONS'), ppi: mi(1.8, 0.05, 52, 'ONS'), food_energy_pressure: mi(0.6, -0.15, 44, 'ONS') },
    external_balance: { current_account_pct_gdp: mi(-3.8, -0.65, 25, 'ONS'), trade_balance: mi(-5.2, -0.50, 30, 'ONS'), fx_reserves: mi(195.0, 0.30, 60, 'BoE'), export_growth: mi(0.8, -0.10, 46, 'ONS'), import_growth: mi(1.5, 0.08, 52, 'ONS') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-4.5, -0.80, 22, 'OBR'), govt_debt_pct_gdp: mi(100.0, 0.70, 28, 'OBR'), yield_10y: mi(4.28, 0.20, 58, 'BoE'), sovereign_cds: mi(20, -0.60, 82, 'Market') },
    credit_cycle: { private_credit_growth: mi(2.0, -0.10, 46, 'BoE'), bank_lending: mi(1.5, -0.20, 42, 'BoE'), household_debt: mi(85.0, 0.50, 35, 'BoE'), corporate_debt: mi(65.0, 0.45, 38, 'BoE'), credit_spread: mi(1.25, -0.25, 60, 'Market'), bank_stock_performance: mi(4.2, 0.15, 56, 'Market') },
  },
  scores: { asset_score: cs(58, 0.28, 61, 3, 3), equity_score: cs(62, 0.30, 62, 5, 5), bond_score: cs(58, 0.20, 58, 5, 5), currency_score: cs(64, 0.35, 64, 5, 5), macro_score: cs(46, -0.12, 45, 28, 28), growth_score: cs(41, -0.24, 41, 5, 5), labor_score: cs(56, 0.32, 56, 3, 3), inflation_score: cs(44, 0.15, 44, 4, 4), external_balance_score: cs(43, -0.17, 43, 5, 5), fiscal_score: cs(48, -0.10, 48, 4, 4), credit_score: cs(46, 0.09, 46, 6, 6), risk_score: cs(52, 0.08, 52, 31, 31), country_alpha: 1.5, true_alpha: 0.8 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Sweden', 'Turkey', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Financial Center', 6, 56, 55, 55, 'Singapore', 'Hong Kong', 'Medium Open Economy', 12, 52, 50, 48, 'Poland', 'Turkey', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.84, 'UK economy stagnating with sticky inflation, but asset performance is moderate. Classic developed market beta profile.', ['GBP recovery supporting returns', 'Low CDS — sovereign credit strong', 'Services sector resilient'], ['Stagnant GDP growth', 'Sticky core inflation', 'Large current account deficit']),
  data_quality: dq('United Kingdom', 28, 0, 28, 'ONS / BoE', 'High', []),
};

// 8. Germany — Beta
const de: CountryData = {
  classification: clf('Germany', 'DE', 'EWG', 'EURUSD=X', null, 'Europe', 'Developed Market', ['Manufacturing Exporter', 'Technology Core'], 'Large Domestic Economy', 'Strong'),
  assets: {
    equity: eq('EWG', 33.50, 2.50, 8.20, 15.80, 22.50, 3.10, 0.75, 78, 0.45),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('EURUSD=X', 1.088, 1.80, 3.20, 1.50, -0.80, 0.45, 68, 0.35),
  },
  macro: {
    growth: { gdp_growth: mi(0.2, -0.75, 24, 'Destatis'), pmi: mi(45.8, -1.00, 16, 'S&P Global'), industrial_production: mi(-2.5, -0.85, 20, 'Destatis'), retail_sales: mi(-1.2, -0.50, 30, 'Destatis'), exports: mi(-0.5, -0.30, 38, 'Destatis') },
    labor: { unemployment: mi(5.9, 0.35, 38, 'BA'), wage_growth: mi(5.5, 0.60, 72, 'Destatis'), jobless_claims: mi(270000, 0.40, 38, 'BA') },
    inflation: { cpi_yoy: mi(2.4, -0.05, 48, 'Destatis'), core_cpi: mi(2.8, 0.10, 54, 'Destatis'), ppi: mi(-1.5, -0.80, 20, 'Destatis'), food_energy_pressure: mi(-0.2, -0.50, 30, 'Destatis') },
    external_balance: { current_account_pct_gdp: mi(6.5, 1.20, 90, 'Bundesbank'), trade_balance: mi(22.5, 0.80, 85, 'Destatis'), fx_reserves: mi(270.0, 0.40, 65, 'Bundesbank'), export_growth: mi(-0.5, -0.30, 38, 'Destatis'), import_growth: mi(-2.5, -0.55, 28, 'Destatis') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-1.8, -0.30, 42, 'BMF'), govt_debt_pct_gdp: mi(64.0, -0.20, 48, 'BMF'), yield_10y: mi(2.55, 0.10, 52, 'Bundesbank'), sovereign_cds: mi(12, -0.90, 88, 'Market') },
    credit_cycle: { private_credit_growth: mi(0.5, -0.50, 30, 'Bundesbank'), bank_lending: mi(-0.2, -0.60, 28, 'Bundesbank'), household_debt: mi(52.0, -0.10, 55, 'Bundesbank'), corporate_debt: mi(60.0, 0.20, 45, 'Bundesbank'), credit_spread: mi(0.95, -0.40, 70, 'Market'), bank_stock_performance: mi(15.0, 1.00, 84, 'Market') },
  },
  scores: { asset_score: cs(65, 0.55, 72, 2, 3), equity_score: cs(78, 0.75, 78, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(68, 0.45, 68, 5, 5), macro_score: cs(44, -0.20, 42, 28, 28), growth_score: cs(26, -0.78, 26, 5, 5), labor_score: cs(49, 0.45, 49, 3, 3), inflation_score: cs(38, -0.31, 38, 4, 4), external_balance_score: cs(61, 0.21, 61, 5, 5), fiscal_score: cs(58, -0.08, 58, 4, 4), credit_score: cs(52, -0.07, 52, 6, 6), risk_score: cs(55, 0.18, 55, 30, 31), country_alpha: 8.0, true_alpha: -3.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Sweden', 'Turkey', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Manufacturing Exporter', 9, 56, 55, 52, 'Taiwan', 'Bangladesh', 'Large Domestic Economy', 7, 52, 54, 48, 'India', 'Indonesia', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Fake Alpha', 0.68, 'German equities surging on ECB easing hopes and defense spending, but manufacturing recession deepens. Asset strength masks macro weakness.', ['Strong equity rally YTD', 'EUR appreciation boosting USD returns', 'Low sovereign CDS', 'Massive current account surplus'], ['Manufacturing PMI deep in contraction at 45.8', 'Industrial production falling', 'Credit growth stalling', 'Growth near zero']),
  data_quality: dq('Germany', 28, 0, 28, 'Destatis / Bundesbank', 'High', []),
};

// 9. France — Beta
const fr: CountryData = {
  classification: clf('France', 'FR', 'EWQ', 'EURUSD=X', null, 'Europe', 'Developed Market', ['Large Domestic Demand Economy', 'Tourism / Service Economy'], 'Large Domestic Economy', 'Strong'),
  assets: {
    equity: eq('EWQ', 38.90, 1.20, 5.50, 11.20, 16.80, 1.80, 0.40, 66, 0.15),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('EURUSD=X', 1.088, 1.80, 3.20, 1.50, -0.80, 0.45, 68, 0.35),
  },
  macro: {
    growth: { gdp_growth: mi(0.8, -0.40, 35, 'INSEE'), pmi: mi(49.5, -0.20, 42, 'S&P Global'), industrial_production: mi(-0.8, -0.45, 33, 'INSEE'), retail_sales: mi(0.5, 0.05, 52, 'INSEE'), exports: mi(1.2, 0.05, 52, 'INSEE') },
    labor: { unemployment: mi(7.5, 0.20, 40, 'INSEE'), wage_growth: mi(3.8, 0.25, 60, 'INSEE'), jobless_claims: mi(3200000, 0.30, 35, 'Pôle Emploi') },
    inflation: { cpi_yoy: mi(2.2, -0.15, 44, 'INSEE'), core_cpi: mi(2.5, 0.00, 50, 'INSEE'), ppi: mi(0.8, -0.30, 38, 'INSEE'), food_energy_pressure: mi(0.1, -0.40, 34, 'INSEE') },
    external_balance: { current_account_pct_gdp: mi(-0.8, -0.15, 44, 'Banque de France'), trade_balance: mi(-8.5, -0.60, 25, 'INSEE'), fx_reserves: mi(240.0, 0.35, 62, 'Banque de France'), export_growth: mi(1.2, 0.05, 52, 'INSEE'), import_growth: mi(0.8, -0.05, 48, 'INSEE') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-5.5, -1.00, 18, 'MoF'), govt_debt_pct_gdp: mi(112.0, 1.00, 20, 'MoF'), yield_10y: mi(3.05, 0.15, 55, 'Banque de France'), sovereign_cds: mi(25, -0.55, 80, 'Market') },
    credit_cycle: { private_credit_growth: mi(1.8, -0.15, 44, 'Banque de France'), bank_lending: mi(1.2, -0.25, 40, 'Banque de France'), household_debt: mi(67.0, 0.30, 42, 'Banque de France'), corporate_debt: mi(78.0, 0.55, 35, 'Banque de France'), credit_spread: mi(1.05, -0.35, 68, 'Market'), bank_stock_performance: mi(10.5, 0.65, 74, 'Market') },
  },
  scores: { asset_score: cs(58, 0.35, 64, 2, 3), equity_score: cs(66, 0.40, 66, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(68, 0.45, 68, 5, 5), macro_score: cs(42, -0.25, 40, 28, 28), growth_score: cs(43, -0.19, 43, 5, 5), labor_score: cs(45, 0.25, 45, 3, 3), inflation_score: cs(42, -0.21, 42, 4, 4), external_balance_score: cs(46, -0.11, 46, 5, 5), fiscal_score: cs(43, -0.18, 43, 4, 4), credit_score: cs(51, 0.13, 51, 6, 6), risk_score: cs(50, 0.05, 50, 30, 31), country_alpha: 2.5, true_alpha: -1.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Sweden', 'Turkey', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Large Domestic Demand Economy', 5, 50, 52, 48, 'India', 'Egypt', 'Large Domestic Economy', 7, 52, 54, 48, 'India', 'Indonesia', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.82, 'France tracks European cycle with large fiscal deficit as key vulnerability. Services sector supports modest growth.', ['Tourism-driven services resilience', 'Low credit spreads', 'EUR strength boosting returns'], ['Elevated fiscal deficit at -5.5% GDP', 'High government debt', 'Persistent trade deficit', 'Manufacturing weakness']),
  data_quality: dq('France', 28, 0, 28, 'INSEE / Banque de France', 'High', []),
};

// 10. Netherlands — Beta
const nl: CountryData = {
  classification: clf('Netherlands', 'NL', 'EWN', 'EURUSD=X', null, 'Europe', 'Developed Market', ['Logistics / Port / Transit Hub', 'Technology Core', 'Financial Center'], 'Small Open Economy', 'Strong'),
  assets: {
    equity: eq('EWN', 48.50, 3.50, 9.80, 18.20, 28.50, 4.10, 0.95, 83, 0.65),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('EURUSD=X', 1.088, 1.80, 3.20, 1.50, -0.80, 0.45, 68, 0.35),
  },
  macro: {
    growth: { gdp_growth: mi(0.5, -0.55, 28, 'CBS'), pmi: mi(50.2, 0.02, 51, 'S&P Global'), industrial_production: mi(-1.2, -0.55, 28, 'CBS'), retail_sales: mi(1.8, 0.20, 58, 'CBS'), exports: mi(0.5, -0.20, 42, 'CBS') },
    labor: { unemployment: mi(3.6, -0.60, 75, 'CBS'), wage_growth: mi(5.8, 0.70, 76, 'CBS'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(2.5, 0.00, 50, 'CBS'), core_cpi: mi(2.8, 0.10, 54, 'CBS'), ppi: mi(-0.5, -0.50, 30, 'CBS'), food_energy_pressure: mi(0.2, -0.35, 36, 'CBS') },
    external_balance: { current_account_pct_gdp: mi(9.5, 1.50, 95, 'DNB'), trade_balance: mi(8.0, 0.70, 80, 'CBS'), fx_reserves: mi(45.0, 0.10, 50, 'DNB'), export_growth: mi(0.5, -0.20, 42, 'CBS'), import_growth: mi(-0.8, -0.35, 36, 'CBS') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-0.5, 0.05, 55, 'MoF'), govt_debt_pct_gdp: mi(50.0, -0.40, 58, 'MoF'), yield_10y: mi(2.75, 0.12, 54, 'DNB'), sovereign_cds: mi(10, -0.95, 92, 'Market') },
    credit_cycle: { private_credit_growth: mi(1.5, -0.20, 42, 'DNB'), bank_lending: mi(1.0, -0.30, 38, 'DNB'), household_debt: mi(95.0, 0.75, 24, 'DNB'), corporate_debt: mi(110.0, 0.90, 18, 'DNB'), credit_spread: mi(0.85, -0.45, 72, 'Market'), bank_stock_performance: mi(12.0, 0.75, 78, 'Market') },
  },
  scores: { asset_score: cs(72, 0.70, 76, 2, 3), equity_score: cs(83, 0.95, 83, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(68, 0.45, 68, 5, 5), macro_score: cs(52, 0.08, 53, 27, 28), growth_score: cs(41, -0.22, 41, 5, 5), labor_score: cs(76, 0.05, 76, 2, 3), inflation_score: cs(43, -0.19, 43, 4, 4), external_balance_score: cs(65, 0.33, 65, 5, 5), fiscal_score: cs(65, -0.07, 65, 4, 4), credit_score: cs(45, 0.08, 45, 6, 6), risk_score: cs(62, 0.38, 62, 29, 31), country_alpha: 12.0, true_alpha: 5.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Netherlands', 'Turkey', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Technology Core', 8, 62, 58, 54, 'Taiwan', 'South Korea', 'Small Open Economy', 12, 55, 54, 52, 'Singapore', 'Kenya', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.75, 'Netherlands benefits from ASML-driven tech rally and strong external position. Household/corporate debt are structural concerns.', ['ASML semiconductor dominance', 'Massive current account surplus', 'Very low CDS spread', 'Strong labor market'], ['Private sector deleveraging', 'High household debt legacy', 'Manufacturing softness', 'Small open economy — vulnerable to trade shocks']),
  data_quality: dq('Netherlands', 27, 1, 28, 'CBS / DNB', 'High', ['jobless_claims']),
};

// 11. Switzerland — Beta
const ch: CountryData = {
  classification: clf('Switzerland', 'CH', 'EWL', 'CHFUSD=X', null, 'Europe', 'Developed Market', ['Financial Center', 'Manufacturing Exporter'], 'Small Open Economy', 'Strong'),
  assets: {
    equity: eq('EWL', 49.20, 1.00, 3.80, 8.50, 13.20, 2.50, 0.25, 60, -0.15),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('CHFUSD=X', 1.12, 2.50, 4.50, 3.80, 5.20, 0.80, 80, 0.75),
  },
  macro: {
    growth: { gdp_growth: mi(1.3, -0.10, 46, 'SECO'), pmi: mi(46.5, -0.85, 20, 'procure.ch'), industrial_production: mi(-1.0, -0.50, 30, 'FSO'), retail_sales: mi(0.8, 0.10, 54, 'FSO'), exports: mi(2.5, 0.25, 60, 'FSO') },
    labor: { unemployment: mi(2.3, -1.00, 88, 'SECO'), wage_growth: mi(1.8, -0.30, 38, 'FSO'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(1.4, -0.50, 30, 'FSO'), core_cpi: mi(1.2, -0.60, 28, 'FSO'), ppi: mi(-0.5, -0.55, 28, 'FSO'), food_energy_pressure: mi(-0.1, -0.45, 32, 'FSO') },
    external_balance: { current_account_pct_gdp: mi(8.5, 1.40, 94, 'SNB'), trade_balance: mi(5.5, 0.65, 75, 'FSO'), fx_reserves: mi(780.0, 1.20, 92, 'SNB'), export_growth: mi(2.5, 0.25, 60, 'FSO'), import_growth: mi(1.0, -0.05, 48, 'FSO') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(0.8, 0.40, 72, 'FFA'), govt_debt_pct_gdp: mi(38.0, -0.80, 72, 'FFA'), yield_10y: mi(0.85, -0.20, 42, 'SNB'), sovereign_cds: mi(8, -1.10, 95, 'Market') },
    credit_cycle: { private_credit_growth: mi(2.5, 0.00, 50, 'SNB'), bank_lending: mi(2.0, -0.10, 46, 'SNB'), household_debt: mi(130.0, 1.50, 5, 'SNB'), corporate_debt: mi(85.0, 0.60, 32, 'SNB'), credit_spread: mi(0.55, -0.65, 82, 'Market'), bank_stock_performance: mi(3.5, 0.05, 52, 'Market') },
  },
  scores: { asset_score: cs(60, 0.40, 66, 2, 3), equity_score: cs(60, 0.25, 60, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(80, 0.80, 80, 5, 5), macro_score: cs(55, 0.18, 57, 27, 28), growth_score: cs(42, -0.22, 42, 5, 5), labor_score: cs(63, -0.65, 63, 2, 3), inflation_score: cs(30, -0.53, 30, 4, 4), external_balance_score: cs(74, 0.49, 74, 5, 5), fiscal_score: cs(70, 0.18, 70, 4, 4), credit_score: cs(45, 0.13, 45, 6, 6), risk_score: cs(58, 0.28, 58, 29, 31), country_alpha: 3.0, true_alpha: 2.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Netherlands', 'Turkey', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Financial Center', 6, 56, 55, 55, 'Singapore', 'Hong Kong', 'Small Open Economy', 12, 55, 54, 52, 'Singapore', 'Kenya', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.88, 'Switzerland is a safe-haven beta with CHF strength as defining feature. Low inflation, fiscal surplus, and massive reserves provide stability.', ['Ultra-low unemployment at 2.3%', 'Fiscal surplus', 'Massive FX reserves at $780B', 'CHF safe-haven premium'], ['PMI deep in contraction territory', 'Household debt extremely elevated', 'Low inflation may signal demand weakness', 'Manufacturing sector struggling']),
  data_quality: dq('Switzerland', 27, 1, 28, 'FSO / SNB', 'High', ['jobless_claims']),
};

// 12. Sweden — Beta
const se: CountryData = {
  classification: clf('Sweden', 'SE', 'EWD', 'SEKUSD=X', null, 'Europe', 'Developed Market', ['Manufacturing Exporter', 'Technology Core'], 'Small Open Economy', 'Strong'),
  assets: {
    equity: eq('EWD', 36.80, 2.80, 7.50, 14.20, 20.50, 3.50, 0.70, 76, 0.40),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('SEKUSD=X', 0.098, 1.20, 3.50, 2.80, -2.50, 0.25, 60, 0.20),
  },
  macro: {
    growth: { gdp_growth: mi(0.3, -0.65, 26, 'SCB'), pmi: mi(48.5, -0.55, 28, 'Swedbank'), industrial_production: mi(-1.8, -0.65, 26, 'SCB'), retail_sales: mi(-0.5, -0.25, 40, 'SCB'), exports: mi(1.5, 0.10, 54, 'SCB') },
    labor: { unemployment: mi(8.2, 0.45, 34, 'SCB'), wage_growth: mi(3.5, 0.15, 56, 'MI'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(3.8, 0.40, 66, 'SCB'), core_cpi: mi(3.2, 0.20, 58, 'SCB'), ppi: mi(1.0, -0.15, 44, 'SCB'), food_energy_pressure: mi(0.5, -0.10, 46, 'SCB') },
    external_balance: { current_account_pct_gdp: mi(5.5, 1.05, 88, 'Riksbank'), trade_balance: mi(3.2, 0.40, 66, 'SCB'), fx_reserves: mi(55.0, 0.15, 52, 'Riksbank'), export_growth: mi(1.5, 0.10, 54, 'SCB'), import_growth: mi(0.5, -0.15, 44, 'SCB') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-0.8, -0.10, 48, 'ESV'), govt_debt_pct_gdp: mi(33.0, -0.90, 78, 'ESV'), yield_10y: mi(2.45, 0.08, 52, 'Riksbank'), sovereign_cds: mi(11, -0.92, 90, 'Market') },
    credit_cycle: { private_credit_growth: mi(1.0, -0.35, 36, 'Riksbank'), bank_lending: mi(0.5, -0.45, 32, 'Riksbank'), household_debt: mi(90.0, 0.65, 28, 'Riksbank'), corporate_debt: mi(70.0, 0.50, 38, 'Riksbank'), credit_spread: mi(0.90, -0.42, 72, 'Market'), bank_stock_performance: mi(8.0, 0.40, 66, 'Market') },
  },
  scores: { asset_score: cs(62, 0.45, 68, 2, 3), equity_score: cs(76, 0.70, 76, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(60, 0.25, 60, 5, 5), macro_score: cs(48, -0.08, 47, 27, 28), growth_score: cs(35, -0.41, 35, 5, 5), labor_score: cs(45, 0.30, 45, 2, 3), inflation_score: cs(54, 0.09, 54, 4, 4), external_balance_score: cs(61, 0.27, 61, 5, 5), fiscal_score: cs(67, 0.01, 67, 4, 4), credit_score: cs(45, -0.03, 45, 6, 6), risk_score: cs(55, 0.18, 55, 29, 31), country_alpha: 5.0, true_alpha: 1.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Netherlands', 'Turkey', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Manufacturing Exporter', 9, 56, 55, 52, 'Taiwan', 'Bangladesh', 'Small Open Economy', 12, 55, 54, 52, 'Singapore', 'Kenya', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.80, 'Sweden shows strong equity performance but weak domestic economy. Housing correction risk lingers. Classic Nordic beta.', ['Strong current account surplus', 'Low government debt', 'Technology sector strength (Ericsson, Spotify)'], ['GDP near zero', 'PMI in contraction', 'High household debt', 'Rising unemployment']),
  data_quality: dq('Sweden', 27, 1, 28, 'SCB / Riksbank', 'High', ['jobless_claims']),
};

// 13. Poland — Beta
const pl: CountryData = {
  classification: clf('Poland', 'PL', 'EPOL', 'PLNUSD=X', null, 'Europe', 'Advanced Emerging Market', ['Manufacturing Exporter', 'Large Domestic Demand Economy'], 'Medium Open Economy', 'Neutral'),
  assets: {
    equity: eq('EPOL', 24.80, 4.20, 12.50, 22.80, 35.50, 5.00, 1.15, 88, 1.00),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('PLNUSD=X', 0.255, 1.50, 4.20, 5.80, 8.50, 0.60, 73, 0.55),
  },
  macro: {
    growth: { gdp_growth: mi(3.5, 0.80, 80, 'GUS'), pmi: mi(48.8, -0.45, 32, 'S&P Global'), industrial_production: mi(1.2, 0.10, 54, 'GUS'), retail_sales: mi(5.5, 0.80, 80, 'GUS'), exports: mi(3.8, 0.45, 68, 'GUS') },
    labor: { unemployment: mi(5.0, -0.20, 58, 'GUS'), wage_growth: mi(12.5, 1.40, 92, 'GUS'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(2.8, 0.12, 55, 'GUS'), core_cpi: mi(3.8, 0.40, 66, 'GUS'), ppi: mi(0.5, -0.25, 40, 'GUS'), food_energy_pressure: mi(0.8, 0.05, 52, 'GUS') },
    external_balance: { current_account_pct_gdp: mi(0.5, 0.20, 58, 'NBP'), trade_balance: mi(1.8, 0.25, 60, 'GUS'), fx_reserves: mi(185.0, 0.50, 68, 'NBP'), export_growth: mi(3.8, 0.45, 68, 'GUS'), import_growth: mi(2.5, 0.20, 58, 'GUS') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-5.2, -0.95, 20, 'MoF'), govt_debt_pct_gdp: mi(50.0, -0.10, 55, 'MoF'), yield_10y: mi(5.60, 0.30, 42, 'NBP'), sovereign_cds: mi(42, -0.35, 72, 'Market') },
    credit_cycle: { private_credit_growth: mi(5.5, 0.40, 66, 'NBP'), bank_lending: mi(6.2, 0.50, 70, 'NBP'), household_debt: mi(22.0, -0.60, 75, 'NBP'), corporate_debt: mi(30.0, -0.40, 68, 'NBP'), credit_spread: mi(1.50, -0.10, 55, 'Market'), bank_stock_performance: mi(18.5, 1.15, 88, 'Market') },
  },
  scores: { asset_score: cs(75, 0.85, 80, 2, 3), equity_score: cs(88, 1.15, 88, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(73, 0.60, 73, 5, 5), macro_score: cs(60, 0.38, 65, 27, 28), growth_score: cs(63, 0.34, 63, 5, 5), labor_score: cs(75, 0.60, 75, 2, 3), inflation_score: cs(53, 0.08, 53, 4, 4), external_balance_score: cs(62, 0.28, 62, 5, 5), fiscal_score: cs(48, -0.08, 48, 4, 4), credit_score: cs(70, 0.23, 70, 6, 6), risk_score: cs(68, 0.60, 68, 29, 31), country_alpha: 18.0, true_alpha: 10.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Poland', 'Turkey', 'Advanced Emerging Market', 9, 54, 56, 50, 'Taiwan', 'Turkey', 'Manufacturing Exporter', 9, 56, 55, 52, 'Taiwan', 'Bangladesh', 'Medium Open Economy', 12, 52, 50, 48, 'Poland', 'Turkey', 'Neutral', 12, 50, 52, 48, 'Taiwan', 'Philippines'),
  label: lbl('True Alpha', 0.74, 'Poland shows strong equity and currency returns backed by solid GDP growth and wage-driven consumption. EU funds inflow supports outlook.', ['GDP growth at 3.5% — EU leader', 'Strong wage growth driving consumption', 'Healthy FX reserves', 'PLN appreciation'], ['Fiscal deficit widening to -5.2%', 'PMI still in contraction', 'Core inflation sticky', 'Defense spending pressure']),
  data_quality: dq('Poland', 27, 1, 28, 'GUS / NBP', 'High', ['jobless_claims']),
};

// 14. Turkey — Crisis Risk
const tr: CountryData = {
  classification: clf('Turkey', 'TR', 'TUR', 'TRYUSD=X', null, 'Europe', 'Emerging Market', ['Manufacturing Exporter', 'Large Domestic Demand Economy', 'Tourism / Service Economy'], 'Medium Open Economy', 'Fragile'),
  assets: {
    equity: eq('TUR', 42.50, 5.80, 15.20, 28.50, 55.80, 2.50, 0.85, 80, 0.60),
    bond: bd(false, null, null, null, null, 280, null, null, null),
    currency: cx('TRYUSD=X', 0.031, -3.20, -8.50, -18.20, -35.80, -1.50, 8, -2.20),
  },
  macro: {
    growth: { gdp_growth: mi(4.5, 1.10, 86, 'TUIK'), pmi: mi(50.8, 0.08, 53, 'S&P Global'), industrial_production: mi(3.0, 0.55, 72, 'TUIK'), retail_sales: mi(8.5, 1.10, 86, 'TUIK'), exports: mi(5.2, 0.70, 76, 'TUIK') },
    labor: { unemployment: mi(9.5, 0.55, 28, 'TUIK'), wage_growth: mi(65.0, 2.00, 96, 'TUIK'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(65.0, 2.20, 3, 'TUIK'), core_cpi: mi(55.0, 2.00, 4, 'TUIK'), ppi: mi(50.0, 1.90, 5, 'TUIK'), food_energy_pressure: mi(8.5, 1.50, 8, 'TUIK') },
    external_balance: { current_account_pct_gdp: mi(-4.5, -0.80, 20, 'TCMB'), trade_balance: mi(-8.5, -0.70, 22, 'TUIK'), fx_reserves: mi(135.0, 0.20, 55, 'TCMB'), export_growth: mi(5.2, 0.70, 76, 'TUIK'), import_growth: mi(8.5, 1.00, 84, 'TUIK') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-5.0, -0.90, 20, 'MoF'), govt_debt_pct_gdp: mi(32.0, -0.95, 80, 'MoF'), yield_10y: mi(28.00, 2.00, 3, 'TCMB'), sovereign_cds: mi(280, 0.80, 18, 'Market') },
    credit_cycle: { private_credit_growth: mi(55.0, 1.80, 95, 'TCMB'), bank_lending: mi(45.0, 1.60, 94, 'TCMB'), household_debt: mi(14.0, -1.10, 90, 'TCMB'), corporate_debt: mi(40.0, 0.20, 55, 'TCMB'), credit_spread: mi(5.50, 1.20, 10, 'Market'), bank_stock_performance: mi(25.0, 1.30, 90, 'Market') },
  },
  scores: { asset_score: cs(38, -0.30, 38, 2, 3), equity_score: cs(80, 0.85, 80, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(8, -1.50, 8, 5, 5), macro_score: cs(35, -0.55, 30, 27, 28), growth_score: cs(75, 0.78, 75, 5, 5), labor_score: cs(62, 1.28, 62, 2, 3), inflation_score: cs(5, 1.90, 5, 4, 4), external_balance_score: cs(48, 0.08, 48, 5, 5), fiscal_score: cs(46, 0.24, 46, 4, 4), credit_score: cs(72, 0.53, 72, 6, 6), risk_score: cs(30, -0.85, 22, 29, 31), country_alpha: 10.5, true_alpha: -15.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Europe', 8, 54, 52, 52, 'Netherlands', 'Turkey', 'Emerging Market', 8, 45, 42, 38, 'India', 'Egypt', 'Manufacturing Exporter', 9, 56, 55, 52, 'Taiwan', 'Bangladesh', 'Medium Open Economy', 12, 52, 50, 48, 'Poland', 'Turkey', 'Fragile', 8, 38, 32, 28, 'South Africa', 'Pakistan'),
  label: lbl('Crisis Risk', 0.78, 'Turkey has high equity returns but 65% inflation, lira collapse, and macro instability define a crisis-risk regime. Equity gains are illusory in USD terms.', ['Nominal equity rally in TRY', 'Strong GDP growth at 4.5%', 'Tourism revenue supporting current account', 'Low government debt at 32%'], ['Inflation at 65% — monetary policy failure', 'Lira collapsed -35% over 12 months', 'CDS at 280bps — significant credit risk', 'Overheating economy with credit boom']),
  data_quality: dq('Turkey', 27, 1, 28, 'TUIK / TCMB', 'Medium', ['jobless_claims']),
};

// 15. China — Beta
const cn: CountryData = {
  classification: clf('China', 'CN', 'FXI', 'CNYUSD=X', 'CBON', 'East Asia', 'Advanced Emerging Market', ['Manufacturing Exporter', 'Large Domestic Demand Economy', 'Technology Core'], 'Large Domestic Economy', 'Neutral'),
  assets: {
    equity: eq('FXI', 28.50, -1.50, 2.80, -5.20, -12.50, -1.80, -0.35, 36, -0.60),
    bond: bd(true, 2.35, -0.15, -0.35, 'CBON', 65, -0.80, 78, 0.20),
    currency: cx('CNYUSD=X', 0.138, -0.50, -1.20, -2.80, -4.50, -0.55, 28, -0.65),
  },
  macro: {
    growth: { gdp_growth: mi(5.2, 0.90, 82, 'NBS'), pmi: mi(50.8, 0.08, 53, 'NBS'), industrial_production: mi(5.6, 0.85, 80, 'NBS'), retail_sales: mi(2.3, -0.05, 48, 'NBS'), exports: mi(7.5, 1.00, 84, 'Customs') },
    labor: { unemployment: mi(5.2, 0.10, 48, 'NBS'), wage_growth: mi(3.5, 0.00, 50, 'NBS'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(0.3, -1.10, 14, 'NBS'), core_cpi: mi(0.6, -0.90, 18, 'NBS'), ppi: mi(-2.5, -1.30, 10, 'NBS'), food_energy_pressure: mi(-0.8, -0.80, 22, 'NBS') },
    external_balance: { current_account_pct_gdp: mi(1.5, 0.30, 62, 'SAFE'), trade_balance: mi(82.5, 1.20, 88, 'Customs'), fx_reserves: mi(3250.0, 1.80, 98, 'PBoC'), export_growth: mi(7.5, 1.00, 84, 'Customs'), import_growth: mi(2.0, 0.05, 52, 'Customs') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-7.0, -1.30, 12, 'MoF'), govt_debt_pct_gdp: mi(83.0, 0.50, 32, 'MoF'), yield_10y: mi(2.35, -0.80, 78, 'PBoC'), sovereign_cds: mi(65, 0.05, 52, 'Market') },
    credit_cycle: { private_credit_growth: mi(9.5, 0.85, 82, 'PBoC'), bank_lending: mi(10.2, 0.90, 82, 'PBoC'), household_debt: mi(62.0, 0.35, 42, 'PBoC'), corporate_debt: mi(160.0, 2.00, 3, 'PBoC'), credit_spread: mi(1.80, 0.10, 48, 'Market'), bank_stock_performance: mi(-2.5, -0.35, 36, 'Market') },
  },
  scores: { asset_score: cs(40, -0.30, 38, 3, 3), equity_score: cs(36, -0.35, 36, 5, 5), bond_score: cs(78, -0.80, 78, 5, 5), currency_score: cs(28, -0.55, 28, 5, 5), macro_score: cs(48, -0.05, 48, 27, 28), growth_score: cs(69, 0.56, 69, 5, 5), labor_score: cs(49, 0.05, 49, 2, 3), inflation_score: cs(16, -1.03, 16, 4, 4), external_balance_score: cs(77, 0.67, 77, 5, 5), fiscal_score: cs(44, -0.14, 44, 4, 4), credit_score: cs(49, 0.58, 49, 6, 6), risk_score: cs(44, -0.18, 44, 30, 31), country_alpha: -12.0, true_alpha: -8.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'East Asia', 5, 58, 55, 55, 'Taiwan', 'Hong Kong', 'Advanced Emerging Market', 9, 54, 56, 50, 'Taiwan', 'Turkey', 'Manufacturing Exporter', 9, 56, 55, 52, 'Taiwan', 'Bangladesh', 'Large Domestic Economy', 7, 52, 54, 48, 'India', 'Indonesia', 'Neutral', 12, 50, 52, 48, 'Taiwan', 'Philippines'),
  label: lbl('Beta', 0.70, 'China shows divergent macro: strong production/exports but deflationary consumer sector and property overhang. Assets underperform.', ['GDP at 5.2% — target on track', 'Massive trade surplus', 'Largest FX reserves globally', 'Industrial production robust'], ['Deflation risk — CPI near zero', 'Property sector stress ongoing', 'Corporate debt at 160% GDP — extreme', 'Consumer confidence weak']),
  data_quality: dq('China', 27, 1, 28, 'NBS / PBoC', 'Medium', ['jobless_claims']),
};

// 16. Japan — Beta
const jp: CountryData = {
  classification: clf('Japan', 'JP', 'EWJ', 'JPYUSD=X', 'BNDX', 'East Asia', 'Developed Market', ['Manufacturing Exporter', 'Technology Core', 'Financial Center'], 'Large Domestic Economy', 'Strong'),
  assets: {
    equity: eq('EWJ', 68.50, 3.20, 8.50, 18.50, 28.80, 1.80, 0.80, 79, 0.50),
    bond: bd(true, 1.05, 0.08, 0.25, 'BNDX', 18, 1.20, 15, -0.45),
    currency: cx('JPYUSD=X', 0.0064, -1.50, -3.80, -8.50, -12.20, -1.20, 12, -1.50),
  },
  macro: {
    growth: { gdp_growth: mi(1.8, 0.05, 52, 'Cabinet Office'), pmi: mi(50.5, 0.05, 52, 'au Jibun'), industrial_production: mi(2.0, 0.30, 62, 'METI'), retail_sales: mi(2.5, 0.25, 60, 'METI'), exports: mi(8.5, 1.10, 86, 'MoF') },
    labor: { unemployment: mi(2.6, -0.85, 85, 'MIC'), wage_growth: mi(2.8, 0.40, 66, 'MHLW'), jobless_claims: mi(1800000, -0.20, 55, 'MHLW') },
    inflation: { cpi_yoy: mi(2.8, 0.50, 70, 'MIC'), core_cpi: mi(2.2, 0.25, 60, 'MIC'), ppi: mi(0.8, -0.20, 42, 'BoJ'), food_energy_pressure: mi(1.5, 0.30, 62, 'MIC') },
    external_balance: { current_account_pct_gdp: mi(3.5, 0.65, 76, 'MoF'), trade_balance: mi(-3.5, -0.30, 38, 'MoF'), fx_reserves: mi(1250.0, 1.50, 96, 'MoF'), export_growth: mi(8.5, 1.10, 86, 'MoF'), import_growth: mi(3.0, 0.25, 60, 'MoF') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-5.8, -1.05, 16, 'MoF'), govt_debt_pct_gdp: mi(260.0, 2.50, 2, 'MoF'), yield_10y: mi(1.05, 1.20, 15, 'BoJ'), sovereign_cds: mi(18, -0.65, 82, 'Market') },
    credit_cycle: { private_credit_growth: mi(3.0, 0.10, 54, 'BoJ'), bank_lending: mi(3.5, 0.15, 56, 'BoJ'), household_debt: mi(68.0, 0.30, 40, 'BoJ'), corporate_debt: mi(115.0, 1.00, 15, 'BoJ'), credit_spread: mi(0.45, -0.70, 85, 'Market'), bank_stock_performance: mi(22.0, 1.25, 90, 'Market') },
  },
  scores: { asset_score: cs(45, -0.05, 46, 3, 3), equity_score: cs(79, 0.80, 79, 5, 5), bond_score: cs(15, 1.20, 15, 5, 5), currency_score: cs(12, -1.20, 12, 5, 5), macro_score: cs(55, 0.20, 58, 28, 28), growth_score: cs(62, 0.30, 62, 5, 5), labor_score: cs(69, -0.22, 69, 3, 3), inflation_score: cs(59, 0.21, 59, 4, 4), external_balance_score: cs(71, 0.44, 71, 5, 5), fiscal_score: cs(29, 0.75, 29, 4, 4), credit_score: cs(57, 0.18, 57, 6, 6), risk_score: cs(50, 0.05, 50, 31, 31), country_alpha: -5.0, true_alpha: -2.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'East Asia', 5, 58, 55, 55, 'Taiwan', 'Hong Kong', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Technology Core', 8, 62, 58, 54, 'Taiwan', 'South Korea', 'Large Domestic Economy', 7, 52, 54, 48, 'India', 'Indonesia', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.82, 'Japan equities rally on corporate governance reform, but yen weakness offsets USD returns. Massive govt debt is structural but manageable with domestic ownership.', ['Corporate governance reform driving equities', 'Ultra-low unemployment', 'Massive FX reserves', 'Export boom from weak yen'], ['Yen collapse — worst G10 currency', 'Govt debt at 260% GDP', 'Bond yields rising from YCC exit', 'Aging demographics']),
  data_quality: dq('Japan', 28, 0, 28, 'Cabinet Office / BoJ', 'High', []),
};

// 17. South Korea — Beta
const kr: CountryData = {
  classification: clf('South Korea', 'KR', 'EWY', 'KRWUSD=X', null, 'East Asia', 'Developed Market', ['Manufacturing Exporter', 'Technology Core'], 'Medium Open Economy', 'Neutral'),
  assets: {
    equity: eq('EWY', 62.50, 2.50, 5.80, 8.20, 12.50, 2.80, 0.35, 64, 0.10),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('KRWUSD=X', 0.00073, -0.80, -2.50, -5.20, -8.80, -0.50, 30, -0.45),
  },
  macro: {
    growth: { gdp_growth: mi(2.3, 0.25, 60, 'BoK'), pmi: mi(49.2, -0.35, 36, 'S&P Global'), industrial_production: mi(3.5, 0.55, 72, 'KOSTAT'), retail_sales: mi(-1.2, -0.50, 30, 'KOSTAT'), exports: mi(11.2, 1.30, 90, 'MOTIE') },
    labor: { unemployment: mi(2.8, -0.80, 82, 'KOSTAT'), wage_growth: mi(3.2, 0.10, 54, 'MOEL'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(2.7, 0.08, 53, 'KOSTAT'), core_cpi: mi(2.3, -0.05, 48, 'KOSTAT'), ppi: mi(1.8, 0.00, 50, 'BoK'), food_energy_pressure: mi(0.5, -0.10, 46, 'KOSTAT') },
    external_balance: { current_account_pct_gdp: mi(2.0, 0.35, 64, 'BoK'), trade_balance: mi(5.5, 0.65, 75, 'MOTIE'), fx_reserves: mi(420.0, 0.80, 82, 'BoK'), export_growth: mi(11.2, 1.30, 90, 'MOTIE'), import_growth: mi(5.5, 0.60, 72, 'MOTIE') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-2.5, -0.40, 38, 'MoSF'), govt_debt_pct_gdp: mi(54.0, 0.05, 52, 'MoSF'), yield_10y: mi(3.45, 0.15, 55, 'BoK'), sovereign_cds: mi(30, -0.45, 75, 'Market') },
    credit_cycle: { private_credit_growth: mi(4.0, 0.20, 58, 'BoK'), bank_lending: mi(3.5, 0.15, 56, 'BoK'), household_debt: mi(105.0, 1.00, 12, 'BoK'), corporate_debt: mi(110.0, 0.90, 18, 'BoK'), credit_spread: mi(0.75, -0.50, 78, 'Market'), bank_stock_performance: mi(5.5, 0.25, 60, 'Market') },
  },
  scores: { asset_score: cs(42, -0.15, 42, 2, 3), equity_score: cs(64, 0.35, 64, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(30, -0.50, 30, 5, 5), macro_score: cs(55, 0.18, 57, 27, 28), growth_score: cs(58, 0.29, 58, 5, 5), labor_score: cs(68, -0.35, 68, 2, 3), inflation_score: cs(49, -0.02, 49, 4, 4), external_balance_score: cs(71, 0.52, 71, 5, 5), fiscal_score: cs(55, 0.01, 55, 4, 4), credit_score: cs(47, 0.00, 47, 6, 6), risk_score: cs(48, -0.05, 48, 29, 31), country_alpha: -5.5, true_alpha: -3.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'East Asia', 5, 58, 55, 55, 'Taiwan', 'Hong Kong', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Technology Core', 8, 62, 58, 54, 'Taiwan', 'South Korea', 'Medium Open Economy', 12, 52, 50, 48, 'Poland', 'Turkey', 'Neutral', 12, 50, 52, 48, 'Taiwan', 'Philippines'),
  label: lbl('Beta', 0.80, 'South Korea is a semiconductor-cycle beta. Export boom driven by AI chip demand, but domestic consumption weak and household debt extreme.', ['Export growth at 11.2% — AI/semiconductor surge', 'Low unemployment', 'Strong FX reserves', 'Low credit spreads'], ['KRW weakness reducing USD returns', 'Household debt at 105% GDP', 'Retail sales contracting', 'PMI in contraction']),
  data_quality: dq('South Korea', 27, 1, 28, 'KOSTAT / BoK', 'High', ['jobless_claims']),
};

// 18. Taiwan — True Alpha
const tw: CountryData = {
  classification: clf('Taiwan', 'TW', 'EWT', 'TWDUSD=X', null, 'East Asia', 'Developed Market', ['Technology Core', 'Manufacturing Exporter'], 'Small Open Economy', 'Neutral'),
  assets: {
    equity: eq('EWT', 72.50, 5.50, 15.80, 28.50, 45.20, 5.80, 1.50, 93, 1.80),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('TWDUSD=X', 0.032, 0.80, 1.50, -1.20, -3.50, 0.15, 56, 0.10),
  },
  macro: {
    growth: { gdp_growth: mi(6.1, 1.50, 94, 'DGBAS'), pmi: mi(55.5, 1.20, 88, 'S&P Global'), industrial_production: mi(12.5, 1.80, 96, 'MOEA'), retail_sales: mi(5.5, 0.80, 80, 'MOEA'), exports: mi(15.8, 1.60, 95, 'Customs') },
    labor: { unemployment: mi(3.4, -0.55, 72, 'DGBAS'), wage_growth: mi(4.2, 0.35, 64, 'DGBAS'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(2.0, -0.20, 42, 'DGBAS'), core_cpi: mi(1.8, -0.30, 38, 'DGBAS'), ppi: mi(1.5, -0.10, 46, 'DGBAS'), food_energy_pressure: mi(0.3, -0.30, 38, 'DGBAS') },
    external_balance: { current_account_pct_gdp: mi(12.5, 1.80, 98, 'CBC'), trade_balance: mi(12.0, 1.40, 92, 'Customs'), fx_reserves: mi(570.0, 1.10, 90, 'CBC'), export_growth: mi(15.8, 1.60, 95, 'Customs'), import_growth: mi(10.5, 1.20, 88, 'Customs') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-1.0, -0.15, 46, 'MoF'), govt_debt_pct_gdp: mi(28.0, -1.10, 85, 'MoF'), yield_10y: mi(1.50, -0.30, 65, 'CBC'), sovereign_cds: mi(22, -0.55, 78, 'Market') },
    credit_cycle: { private_credit_growth: mi(6.0, 0.50, 70, 'CBC'), bank_lending: mi(7.2, 0.60, 72, 'CBC'), household_debt: mi(90.0, 0.65, 28, 'CBC'), corporate_debt: mi(65.0, 0.30, 42, 'CBC'), credit_spread: mi(0.65, -0.60, 80, 'Market'), bank_stock_performance: mi(15.0, 1.00, 84, 'Market') },
  },
  scores: { asset_score: cs(78, 1.00, 84, 2, 3), equity_score: cs(93, 1.50, 93, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(56, 0.15, 56, 5, 5), macro_score: cs(75, 1.00, 84, 27, 28), growth_score: cs(91, 1.42, 91, 5, 5), labor_score: cs(68, -0.10, 68, 2, 3), inflation_score: cs(41, -0.23, 41, 4, 4), external_balance_score: cs(93, 1.40, 93, 5, 5), fiscal_score: cs(69, -0.28, 69, 4, 4), credit_score: cs(63, 0.08, 63, 6, 6), risk_score: cs(78, 1.00, 82, 29, 31), country_alpha: 25.0, true_alpha: 22.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'East Asia', 5, 58, 55, 55, 'Taiwan', 'Hong Kong', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Technology Core', 8, 62, 58, 54, 'Taiwan', 'South Korea', 'Small Open Economy', 12, 55, 54, 52, 'Singapore', 'Kenya', 'Neutral', 12, 50, 52, 48, 'Taiwan', 'Philippines'),
  label: lbl('True Alpha', 0.95, 'Taiwan is the quintessential True Alpha — TSMC-driven equity outperformance is backed by exceptional macro fundamentals. 6.1% GDP growth, massive current account surplus, and booming exports make this the strongest risk/reward in the dataset.', ['GDP growth at 6.1% — global leader', 'Export growth at 15.8% on AI/semiconductor demand', 'Current account surplus at 12.5% GDP', 'Low government debt at 28% GDP', 'TSMC capex cycle driving industrial production'], ['Geopolitical risk (China/Taiwan tensions)', 'Semiconductor concentration risk', 'Household debt elevated', 'Small open economy — trade dependent']),
  data_quality: dq('Taiwan', 27, 1, 28, 'DGBAS / CBC', 'High', ['jobless_claims']),
};

// 19. Hong Kong — Beta
const hk: CountryData = {
  classification: clf('Hong Kong', 'HK', 'EWH', 'HKDUSD=X', null, 'East Asia', 'Developed Market', ['Financial Center', 'Logistics / Port / Transit Hub'], 'Small Open Economy', 'Strong'),
  assets: {
    equity: eq('EWH', 20.80, -0.50, 5.20, -2.50, -8.20, -0.50, -0.20, 42, -0.50),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('HKDUSD=X', 0.128, 0.00, 0.00, 0.00, -0.10, 0.00, 50, 0.00),
  },
  macro: {
    growth: { gdp_growth: mi(2.8, 0.40, 66, 'C&SD'), pmi: mi(49.5, -0.20, 42, 'S&P Global'), industrial_production: mi(-0.5, -0.30, 38, 'C&SD'), retail_sales: mi(-2.5, -0.55, 28, 'C&SD'), exports: mi(3.5, 0.40, 66, 'C&SD') },
    labor: { unemployment: mi(2.9, -0.75, 80, 'C&SD'), wage_growth: mi(2.5, 0.05, 52, 'C&SD'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(1.8, -0.35, 36, 'C&SD'), core_cpi: mi(1.5, -0.45, 32, 'C&SD'), ppi: miNA(), food_energy_pressure: mi(0.2, -0.35, 36, 'C&SD') },
    external_balance: { current_account_pct_gdp: mi(8.0, 1.30, 92, 'HKMA'), trade_balance: mi(-12.0, -0.80, 18, 'C&SD'), fx_reserves: mi(425.0, 0.85, 84, 'HKMA'), export_growth: mi(3.5, 0.40, 66, 'C&SD'), import_growth: mi(5.0, 0.55, 72, 'C&SD') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(-1.5, -0.25, 42, 'Treasury'), govt_debt_pct_gdp: mi(2.0, -2.00, 99, 'Treasury'), yield_10y: mi(4.35, 0.25, 40, 'HKMA'), sovereign_cds: mi(25, -0.55, 78, 'Market') },
    credit_cycle: { private_credit_growth: mi(-1.5, -0.60, 28, 'HKMA'), bank_lending: mi(-2.0, -0.65, 26, 'HKMA'), household_debt: mi(95.0, 0.75, 24, 'HKMA'), corporate_debt: mi(280.0, 2.50, 1, 'HKMA'), credit_spread: mi(1.20, -0.20, 58, 'Market'), bank_stock_performance: mi(-3.5, -0.40, 34, 'Market') },
  },
  scores: { asset_score: cs(38, -0.20, 40, 2, 3), equity_score: cs(42, -0.20, 42, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(50, 0.00, 50, 5, 5), macro_score: cs(48, -0.05, 48, 26, 28), growth_score: cs(48, 0.05, 48, 5, 5), labor_score: cs(66, -0.35, 66, 2, 3), inflation_score: cs(35, -0.38, 35, 3, 4), external_balance_score: cs(66, 0.34, 66, 5, 5), fiscal_score: cs(65, 0.11, 65, 4, 4), credit_score: cs(28, -0.10, 28, 6, 6), risk_score: cs(42, -0.15, 42, 28, 31), country_alpha: -10.0, true_alpha: -7.5 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'East Asia', 5, 58, 55, 55, 'Taiwan', 'Hong Kong', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Financial Center', 6, 56, 55, 55, 'Singapore', 'Hong Kong', 'Small Open Economy', 12, 55, 54, 52, 'Singapore', 'Kenya', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Unclassified', 0.65, 'Hong Kong is in structural transition — losing financial hub premium while maintaining HKD peg. China spillover dominates. Extreme corporate debt is a systemic concern.', ['Near-zero unemployment', 'Near-zero government debt', 'Massive FX reserves', 'HKD stability via peg'], ['Retail sales declining — consumer weakness', 'Corporate debt at 280% GDP — extreme', 'Property market correction ongoing', 'Credit contraction underway']),
  data_quality: dq('Hong Kong', 26, 2, 28, 'C&SD / HKMA', 'High', ['ppi', 'jobless_claims']),
};

// We store the first 19 countries here, remaining 19 are defined next.

// 20. Singapore — Beta
const sg: CountryData = {
  classification: clf('Singapore', 'SG', 'EWS', 'SGDUSD=X', null, 'Southeast Asia', 'Developed Market', ['Financial Center', 'Logistics / Port / Transit Hub'], 'Small Open Economy', 'Strong'),
  assets: {
    equity: eq('EWS', 24.50, 1.20, 4.80, 9.50, 11.20, 1.80, 0.20, 58, -0.20),
    bond: bd(false, null, null, null, null, null, null, null, null),
    currency: cx('SGDUSD=X', 0.752, 1.00, 2.20, 3.50, 2.80, 0.40, 66, 0.30),
  },
  macro: {
    growth: { gdp_growth: mi(2.5, 0.30, 62, 'MTI'), pmi: mi(50.8, 0.08, 53, 'S&P Global'), industrial_production: mi(1.8, 0.15, 56, 'EDB'), retail_sales: mi(1.2, 0.10, 54, 'DOS'), exports: mi(5.5, 0.65, 74, 'Enterprise SG') },
    labor: { unemployment: mi(2.0, -1.10, 92, 'MOM'), wage_growth: mi(4.5, 0.40, 66, 'MOM'), jobless_claims: miNA() },
    inflation: { cpi_yoy: mi(2.7, 0.08, 53, 'MAS'), core_cpi: mi(3.1, 0.18, 57, 'MAS'), ppi: mi(0.5, -0.25, 40, 'DOS'), food_energy_pressure: mi(0.4, -0.20, 42, 'DOS') },
    external_balance: { current_account_pct_gdp: mi(18.5, 2.00, 99, 'MAS'), trade_balance: mi(6.5, 0.70, 78, 'Enterprise SG'), fx_reserves: mi(380.0, 0.75, 80, 'MAS'), export_growth: mi(5.5, 0.65, 74, 'Enterprise SG'), import_growth: mi(4.0, 0.45, 68, 'Enterprise SG') },
    fiscal_debt: { fiscal_balance_pct_gdp: mi(1.5, 0.55, 75, 'MOF'), govt_debt_pct_gdp: mi(168.0, 1.80, 5, 'MOF'), yield_10y: mi(3.15, 0.10, 52, 'MAS'), sovereign_cds: mi(15, -0.80, 88, 'Market') },
    credit_cycle: { private_credit_growth: mi(3.5, 0.10, 54, 'MAS'), bank_lending: mi(2.8, 0.05, 52, 'MAS'), household_debt: mi(55.0, 0.00, 52, 'MAS'), corporate_debt: mi(120.0, 1.05, 14, 'MAS'), credit_spread: mi(0.70, -0.55, 80, 'Market'), bank_stock_performance: mi(6.5, 0.30, 62, 'Market') },
  },
  scores: { asset_score: cs(55, 0.25, 58, 2, 3), equity_score: cs(58, 0.20, 58, 5, 5), bond_score: cs(null, null, null, 0, 5), currency_score: cs(66, 0.40, 66, 5, 5), macro_score: cs(60, 0.35, 64, 27, 28), growth_score: cs(60, 0.24, 60, 5, 5), labor_score: cs(79, -0.35, 79, 2, 3), inflation_score: cs(48, 0.00, 48, 4, 4), external_balance_score: cs(80, 0.82, 80, 5, 5), fiscal_score: cs(55, 0.41, 55, 4, 4), credit_score: cs(52, -0.01, 52, 6, 6), risk_score: cs(58, 0.30, 58, 29, 31), country_alpha: 0.5, true_alpha: 1.0 },
  peer_benchmarks: peerSet('India', 'Pakistan', 'Southeast Asia', 6, 48, 46, 42, 'Singapore', 'Philippines', 'Developed Market', 13, 58, 60, 55, 'Taiwan', 'Hong Kong', 'Financial Center', 6, 56, 55, 55, 'Singapore', 'Hong Kong', 'Small Open Economy', 12, 55, 54, 52, 'Singapore', 'Kenya', 'Strong', 14, 58, 60, 55, 'Taiwan', 'Egypt'),
  label: lbl('Beta', 0.85, 'Singapore is the ASEAN safe haven with massive current account surplus and ultra-low unemployment. SGD strength as policy anchor.', ['Current account surplus at 18.5% GDP', 'Lowest unemployment in dataset at 2.0%', 'AAA-rated sovereign', 'SGD managed appreciation'], ['Corporate debt elevated', 'Govt debt headline high (CPF-driven)', 'Small open economy — trade exposure', 'Property market cooling']),
  data_quality: dq('Singapore', 27, 1, 28, 'DOS / MAS', 'High', ['jobless_claims']),
};

// Export Part 1 countries array for assembly
export const part1Countries = [us, ca, mx, br, cl, ar, gb, de, fr, nl, ch, se, pl, tr, cn, jp, kr, tw, hk, sg];
