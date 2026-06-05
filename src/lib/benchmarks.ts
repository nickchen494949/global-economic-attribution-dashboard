// ============================================================
// Global Economic Attribution Dashboard — Peer Benchmarks
// ============================================================

import type {
  CountryData,
  PeerDimension,
  PeerBenchmark,
  CountryClassification,
} from './types';

// ------------------------------------------------------------
// Get Peer Group Members
// Returns all countries sharing the same value for the given
// peer dimension. For global_role, any overlap counts.
// ------------------------------------------------------------
export function getPeerGroup(
  country: CountryClassification,
  allCountries: CountryData[],
  dimension: PeerDimension
): CountryData[] {
  switch (dimension) {
    case 'global':
      return allCountries;

    case 'region':
      return allCountries.filter(
        (c) => c.classification.region === country.region
      );

    case 'development_stage':
      return allCountries.filter(
        (c) => c.classification.development_stage === country.development_stage
      );

    case 'global_role':
      return allCountries.filter((c) =>
        c.classification.global_roles.some((role) =>
          country.global_roles.includes(role)
        )
      );

    case 'openness_type':
      return allCountries.filter(
        (c) => c.classification.openness_type === country.openness_type
      );

    case 'external_vulnerability':
      return allCountries.filter(
        (c) =>
          c.classification.external_vulnerability ===
          country.external_vulnerability
      );

    default:
      return allCountries;
  }
}

// ------------------------------------------------------------
// Compute Peer Benchmark
// Aggregates scores across a peer group and identifies the
// best/worst countries and dispersion.
// ------------------------------------------------------------
export function computePeerBenchmark(
  peers: CountryData[],
  dimension: PeerDimension,
  groupName: string
): PeerBenchmark {
  if (peers.length === 0) {
    return {
      dimension,
      group_name: groupName,
      group_size: 0,
      avg_asset_score: null,
      avg_macro_score: null,
      avg_risk_score: null,
      best_country: null,
      worst_country: null,
      dispersion: null,
    };
  }

  // Collect valid asset scores
  const assetScores = peers
    .map((c) => ({ country: c.classification.country, score: c.scores.asset_score.percentile }))
    .filter((x): x is { country: string; score: number } => x.score !== null);

  const macroScores = peers
    .map((c) => ({ country: c.classification.country, score: c.scores.macro_score.percentile }))
    .filter((x): x is { country: string; score: number } => x.score !== null);

  const riskScores = peers
    .map((c) => ({ country: c.classification.country, score: c.scores.risk_score.percentile }))
    .filter((x): x is { country: string; score: number } => x.score !== null);

  // Averages
  const avgAsset =
    assetScores.length > 0
      ? Math.round(
          (assetScores.reduce((a, b) => a + b.score, 0) / assetScores.length) *
            100
        ) / 100
      : null;

  const avgMacro =
    macroScores.length > 0
      ? Math.round(
          (macroScores.reduce((a, b) => a + b.score, 0) / macroScores.length) *
            100
        ) / 100
      : null;

  const avgRisk =
    riskScores.length > 0
      ? Math.round(
          (riskScores.reduce((a, b) => a + b.score, 0) / riskScores.length) *
            100
        ) / 100
      : null;

  // Best and worst by composite (asset + macro + risk average)
  const composites = peers.map((c) => {
    const a = c.scores.asset_score.percentile ?? 50;
    const m = c.scores.macro_score.percentile ?? 50;
    const r = c.scores.risk_score.percentile ?? 50;
    return {
      country: c.classification.country,
      composite: (a + m + r) / 3,
    };
  });

  const sortedComposites = [...composites].sort(
    (a, b) => b.composite - a.composite
  );

  const bestCountry =
    sortedComposites.length > 0 ? sortedComposites[0].country : null;
  const worstCountry =
    sortedComposites.length > 0
      ? sortedComposites[sortedComposites.length - 1].country
      : null;

  // Dispersion: standard deviation of asset scores
  let dispersion: number | null = null;
  if (assetScores.length >= 2 && avgAsset !== null) {
    const variance =
      assetScores.reduce((sum, x) => sum + (x.score - avgAsset) ** 2, 0) /
      (assetScores.length - 1);
    dispersion = Math.round(Math.sqrt(variance) * 100) / 100;
  }

  return {
    dimension,
    group_name: groupName,
    group_size: peers.length,
    avg_asset_score: avgAsset,
    avg_macro_score: avgMacro,
    avg_risk_score: avgRisk,
    best_country: bestCountry,
    worst_country: worstCountry,
    dispersion,
  };
}

// ------------------------------------------------------------
// Compute Country Alpha (Residual)
// Alpha = country asset score − peer average asset score
// Returns null if either input is null.
// ------------------------------------------------------------
export function computeCountryAlpha(
  countryAssetScore: number | null,
  peerAssetScore: number | null
): number | null {
  if (countryAssetScore === null || peerAssetScore === null) return null;
  return Math.round((countryAssetScore - peerAssetScore) * 1000) / 1000;
}

// ------------------------------------------------------------
// Compute Multi-Role Benchmark
// For countries with multiple global_roles, compute a benchmark
// for each role group separately, then average across them.
// ------------------------------------------------------------
export function computeMultiRoleBenchmark(
  country: CountryClassification,
  allCountries: CountryData[]
): PeerBenchmark {
  const roles = country.global_roles;

  if (roles.length === 0) {
    return computePeerBenchmark(allCountries, 'global_role', 'No Role');
  }

  // Compute a benchmark for each role
  const roleBenchmarks = roles.map((role) => {
    const rolePeers = allCountries.filter((c) =>
      c.classification.global_roles.includes(role)
    );
    return computePeerBenchmark(rolePeers, 'global_role', role);
  });

  // Average across all role benchmarks
  const validAsset = roleBenchmarks
    .map((b) => b.avg_asset_score)
    .filter((v): v is number => v !== null);
  const validMacro = roleBenchmarks
    .map((b) => b.avg_macro_score)
    .filter((v): v is number => v !== null);
  const validRisk = roleBenchmarks
    .map((b) => b.avg_risk_score)
    .filter((v): v is number => v !== null);
  const validDispersion = roleBenchmarks
    .map((b) => b.dispersion)
    .filter((v): v is number => v !== null);

  const avgAsset =
    validAsset.length > 0
      ? Math.round(
          (validAsset.reduce((a, b) => a + b, 0) / validAsset.length) * 100
        ) / 100
      : null;
  const avgMacro =
    validMacro.length > 0
      ? Math.round(
          (validMacro.reduce((a, b) => a + b, 0) / validMacro.length) * 100
        ) / 100
      : null;
  const avgRisk =
    validRisk.length > 0
      ? Math.round(
          (validRisk.reduce((a, b) => a + b, 0) / validRisk.length) * 100
        ) / 100
      : null;
  const avgDispersion =
    validDispersion.length > 0
      ? Math.round(
          (validDispersion.reduce((a, b) => a + b, 0) / validDispersion.length) *
            100
        ) / 100
      : null;

  // Total unique peers across all roles
  const allRolePeers = new Set<string>();
  roleBenchmarks.forEach((b) => {
    // Approximate total from group sizes
    allRolePeers.add(b.group_name);
  });

  const totalPeers = roleBenchmarks.reduce((sum, b) => sum + b.group_size, 0);

  // Best/worst from the combined perspective
  const allBest = roleBenchmarks
    .map((b) => b.best_country)
    .filter((c): c is string => c !== null);
  const allWorst = roleBenchmarks
    .map((b) => b.worst_country)
    .filter((c): c is string => c !== null);

  return {
    dimension: 'global_role',
    group_name: roles.join(' + '),
    group_size: totalPeers,
    avg_asset_score: avgAsset,
    avg_macro_score: avgMacro,
    avg_risk_score: avgRisk,
    best_country: allBest.length > 0 ? allBest[0] : null,
    worst_country: allWorst.length > 0 ? allWorst[allWorst.length - 1] : null,
    dispersion: avgDispersion,
  };
}

// ------------------------------------------------------------
// Get All Peer Benchmarks
// Returns benchmarks for every peer dimension.
// ------------------------------------------------------------
export function getAllPeerBenchmarks(
  country: CountryClassification,
  allCountries: CountryData[]
): Record<PeerDimension, PeerBenchmark> {
  const dimensions: PeerDimension[] = [
    'global',
    'region',
    'development_stage',
    'global_role',
    'openness_type',
    'external_vulnerability',
  ];

  const result: Record<string, PeerBenchmark> = {};

  for (const dim of dimensions) {
    if (dim === 'global_role') {
      result[dim] = computeMultiRoleBenchmark(country, allCountries);
    } else {
      const peers = getPeerGroup(country, allCountries, dim);
      const groupName = getGroupName(country, dim);
      result[dim] = computePeerBenchmark(peers, dim, groupName);
    }
  }

  return result as Record<PeerDimension, PeerBenchmark>;
}

// ------------------------------------------------------------
// Helper: Get a human-readable name for the peer group.
// ------------------------------------------------------------
function getGroupName(
  country: CountryClassification,
  dimension: PeerDimension
): string {
  switch (dimension) {
    case 'global':
      return 'Global';
    case 'region':
      return country.region;
    case 'development_stage':
      return country.development_stage;
    case 'global_role':
      return country.global_roles.join(' + ');
    case 'openness_type':
      return country.openness_type;
    case 'external_vulnerability':
      return `${country.external_vulnerability} External`;
    default:
      return 'Unknown';
  }
}
