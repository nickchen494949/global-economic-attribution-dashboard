// ============================================================
// Global Economic Attribution Dashboard — Type Definitions
// ============================================================

// ---- Country Classification ----

export type Region =
  | 'North America'
  | 'Europe'
  | 'East Asia'
  | 'Southeast Asia'
  | 'South Asia'
  | 'Middle East / North Africa'
  | 'Latin America'
  | 'Africa'
  | 'Oceania';

export type DevelopmentStage =
  | 'Developed Market'
  | 'Advanced Emerging Market'
  | 'Emerging Market'
  | 'Frontier Market'
  | 'Crisis / High-Risk Market';

export type GlobalRole =
  | 'Resource Exporter'
  | 'Manufacturing Exporter'
  | 'Technology Core'
  | 'Financial Center'
  | 'Logistics / Port / Transit Hub'
  | 'Tourism / Service Economy'
  | 'Large Domestic Demand Economy'
  | 'Dollar System Core'
  | 'Dollar-Dependent Economy';

export type OpennessType =
  | 'Small Open Economy'
  | 'Medium Open Economy'
  | 'Large Domestic Economy';

export type ExternalVulnerability = 'Strong' | 'Neutral' | 'Fragile';

export interface CountryClassification {
  country: string;
  code: string;
  ticker_equity: string;
  currency_pair: string;
  bond_proxy: string | null;
  region: Region;
  development_stage: DevelopmentStage;
  global_roles: GlobalRole[];
  openness_type: OpennessType;
  external_vulnerability: ExternalVulnerability;
}

// ---- Asset Data ----

export interface ReturnData {
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_12m: number | null;
  z_score: number | null;
  percentile: number | null;
  peer_relative: number | null;
}

export interface EquityData extends ReturnData {
  ticker: string;
  price: number | null;
  usd_return_1m: number | null;
}

export interface BondData {
  available: boolean;
  yield_10y: number | null;
  yield_change_1m: number | null;
  yield_change_3m: number | null;
  bond_etf: string | null;
  cds_spread: number | null;
  z_score: number | null;
  percentile: number | null;
  peer_relative: number | null;
}

export interface CurrencyData extends ReturnData {
  pair: string;
  rate: number | null;
}

export interface AssetPanel {
  equity: EquityData;
  bond: BondData;
  currency: CurrencyData;
}

// ---- Macro Data ----

export interface MacroIndicator {
  value: number | null;
  available: boolean;
  z_score: number | null;
  percentile: number | null;
  source: string;
  last_updated: string | null;
}

export interface GrowthData {
  gdp_growth: MacroIndicator;
  pmi: MacroIndicator;
  industrial_production: MacroIndicator;
  retail_sales: MacroIndicator;
  exports: MacroIndicator;
}

export interface LaborData {
  unemployment: MacroIndicator;
  wage_growth: MacroIndicator;
  jobless_claims: MacroIndicator;
}

export interface InflationData {
  cpi_yoy: MacroIndicator;
  core_cpi: MacroIndicator;
  ppi: MacroIndicator;
  food_energy_pressure: MacroIndicator;
}

export interface ExternalBalanceData {
  current_account_pct_gdp: MacroIndicator;
  trade_balance: MacroIndicator;
  fx_reserves: MacroIndicator;
  export_growth: MacroIndicator;
  import_growth: MacroIndicator;
}

export interface FiscalDebtData {
  fiscal_balance_pct_gdp: MacroIndicator;
  govt_debt_pct_gdp: MacroIndicator;
  yield_10y: MacroIndicator;
  sovereign_cds: MacroIndicator;
}

export interface CreditCycleData {
  private_credit_growth: MacroIndicator;
  bank_lending: MacroIndicator;
  household_debt: MacroIndicator;
  corporate_debt: MacroIndicator;
  credit_spread: MacroIndicator;
  bank_stock_performance: MacroIndicator;
}

export interface MacroPanel {
  growth: GrowthData;
  labor: LaborData;
  inflation: InflationData;
  external_balance: ExternalBalanceData;
  fiscal_debt: FiscalDebtData;
  credit_cycle: CreditCycleData;
}

// ---- Scores ----

export interface CategoryScore {
  score: number | null;
  z_score: number | null;
  percentile: number | null;
  available_count: number;
  total_count: number;
}

export interface CountryScores {
  asset_score: CategoryScore;
  equity_score: CategoryScore;
  bond_score: CategoryScore;
  currency_score: CategoryScore;
  macro_score: CategoryScore;
  growth_score: CategoryScore;
  labor_score: CategoryScore;
  inflation_score: CategoryScore;
  external_balance_score: CategoryScore;
  fiscal_score: CategoryScore;
  credit_score: CategoryScore;
  risk_score: CategoryScore;
  country_alpha: number | null;
  true_alpha: number | null;
}

// ---- Peer Benchmarks ----

export type PeerDimension =
  | 'global'
  | 'region'
  | 'development_stage'
  | 'global_role'
  | 'openness_type'
  | 'external_vulnerability';

export interface PeerBenchmark {
  dimension: PeerDimension;
  group_name: string;
  group_size: number;
  avg_asset_score: number | null;
  avg_macro_score: number | null;
  avg_risk_score: number | null;
  best_country: string | null;
  worst_country: string | null;
  dispersion: number | null;
}

// ---- Country Labels ----

export type CountryLabel =
  | 'True Alpha'
  | 'Fake Alpha'
  | 'Hidden Alpha'
  | 'Beta'
  | 'Crisis Risk'
  | 'Unclassified'
  | 'Positive Drift'
  | 'Negative Drift';

export interface CountryLabelResult {
  label: CountryLabel;
  confidence: number;
  explanation: string;
  supporting_factors: string[];
  risk_factors: string[];
}

// ---- Global Fingerprint ----

export interface FuturesAsset {
  name: string;
  ticker: string;
  price: number | null;
  change_1d: number | null;
  change_1w: number | null;
  change_1m: number | null;
  z_score: number | null;
  percentile: number | null;
  direction: 'up' | 'down' | 'flat';
}

export type MarketRegime =
  | 'Growth Scare'
  | 'Inflation Scare'
  | 'Dollar Squeeze'
  | 'Energy Shock'
  | 'Commodity Boom'
  | 'Risk-On'
  | 'Risk-Off'
  | 'Credit Stress'
  | 'Tech/Semiconductor Shock'
  | 'Country-Specific'
  | 'Neutral';

export interface GlobalFingerprint {
  assets: FuturesAsset[];
  regime: MarketRegime;
  regime_confidence: number;
  regime_explanation: string;
  fingerprint_signals: string[];
}

// ---- Data Quality ----

export interface DataQuality {
  country: string;
  available_count: number;
  missing_count: number;
  total_fields: number;
  last_updated: string;
  data_source: string;
  confidence: 'High' | 'Medium' | 'Low';
  missing_fields: string[];
}

// ---- Full Country Data ----

export interface CountryData {
  classification: CountryClassification;
  assets: AssetPanel;
  macro: MacroPanel;
  scores: CountryScores;
  peer_benchmarks: Record<PeerDimension, PeerBenchmark>;
  label: CountryLabelResult;
  data_quality: DataQuality;
}

// ---- Dashboard State ----

export interface DashboardData {
  countries: CountryData[];
  global_fingerprint: GlobalFingerprint;
  last_updated: string;
  data_version: string;
  is_sample_data: boolean;
}
