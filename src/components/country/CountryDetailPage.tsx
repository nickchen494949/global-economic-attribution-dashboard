import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import type { DashboardData, CountryData, CategoryScore, ValuationData } from '../../lib/types'
import { LabelBadge } from '../common/LabelBadge'
import { ScoreCard, getScoreColor, PercentileBar, getPercentileLabel } from '../common/ScoreCard'

interface CountryDetailPageProps {
  data: DashboardData
}

export function CountryDetailPage({ data }: CountryDetailPageProps) {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const country = useMemo(() =>
    data.countries.find(c => c.classification.code === code),
    [data.countries, code]
  )

  if (!country) {
    return (
      <div className="animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Country not found</div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--accent-primary)', color: 'white', border: 'none',
            padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          }}
        >
          Back to Today
        </button>
      </div>
    )
  }

  const c = country.classification
  const s = country.scores

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none', border: 'none', color: 'var(--accent-primary)',
          fontSize: '0.8125rem', cursor: 'pointer', marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', gap: '0.375rem',
        }}
      >
        ← Back to Today
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{c.country}</h2>
            <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>{c.code}</span>
            <LabelBadge label={country.label.label} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Tag>{c.region}</Tag>
            <Tag>{c.development_stage}</Tag>
            <Tag>{c.openness_type}</Tag>
            <Tag color={c.external_vulnerability === 'Strong' ? 'var(--color-strong)' : c.external_vulnerability === 'Fragile' ? 'var(--color-weak)' : 'var(--color-neutral)'}>
              Ext. Vulnerability: {c.external_vulnerability}
            </Tag>
            {c.global_roles.map(r => <Tag key={r}>{r}</Tag>)}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="glass-card-static" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', borderLeft: `3px solid ${getLabelColor(country.label.label)}` }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {country.label.explanation}
        </div>
        {country.label.supporting_factors.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {country.label.supporting_factors.map((f, i) => (
              <span key={i} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', background: 'var(--color-strong-bg)', color: 'var(--color-strong)', borderRadius: '100px', border: '1px solid var(--color-strong-border)' }}>
                ✓ {f}
              </span>
            ))}
          </div>
        )}
        {country.label.risk_factors.length > 0 && (
          <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {country.label.risk_factors.map((f, i) => (
              <span key={i} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', background: 'var(--color-weak-bg)', color: 'var(--color-weak)', borderRadius: '100px', border: '1px solid var(--color-weak-border)' }}>
                ⚠ {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Scores */}
      <div className="grid-4 stagger-children" style={{ marginBottom: '1.25rem' }}>
        <ScoreCard label="Asset Score" value={s.asset_score.z_score} percentile={s.asset_score.percentile} detail={`${s.asset_score.available_count}/${s.asset_score.total_count} available`} />
        <ScoreCard label="Macro Score" value={s.macro_score.z_score} percentile={s.macro_score.percentile} detail={`${s.macro_score.available_count}/${s.macro_score.total_count} available`} />
        <ScoreCard label="Risk Score" value={s.risk_score.z_score} percentile={s.risk_score.percentile} />
        <ScoreCard
          label="Country Alpha"
          value={s.country_alpha}
          percentile={s.country_alpha !== null ? Math.min(99, Math.max(1, 50 + (s.country_alpha * 25))) : null}
          detail="Asset Score vs Global"
        />
      </div>

      {/* Alpha Attribution */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          Alpha Attribution — Asset Score vs Peer Benchmarks
        </div>
        <div className="grid-3" style={{ gap: '0.75rem' }}>
          <AlphaResidualCard label="vs Global" value={s.alpha_vs_global} group={country.peer_benchmarks.global.group_name} size={country.peer_benchmarks.global.group_size} />
          <AlphaResidualCard label="vs Region" value={s.alpha_vs_region} group={country.peer_benchmarks.region.group_name} size={country.peer_benchmarks.region.group_size} />
          <AlphaResidualCard label="vs Dev Stage" value={s.alpha_vs_development_stage} group={country.peer_benchmarks.development_stage.group_name} size={country.peer_benchmarks.development_stage.group_size} />
          <AlphaResidualCard label="vs Role" value={s.alpha_vs_global_role} group={country.peer_benchmarks.global_role.group_name} size={country.peer_benchmarks.global_role.group_size} />
          <AlphaResidualCard label="vs Openness" value={s.alpha_vs_openness} group={country.peer_benchmarks.openness_type.group_name} size={country.peer_benchmarks.openness_type.group_size} />
          <AlphaResidualCard label="vs Ext. Vuln." value={s.alpha_vs_external_vulnerability} group={country.peer_benchmarks.external_vulnerability.group_name} size={country.peer_benchmarks.external_vulnerability.group_size} />
        </div>
      </div>

      {/* Valuation Panel */}
      <ValuationPanel valuation={country.valuation} ticker={country.assets.equity.ticker} />

      {/* Asset Panel */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          Asset Panel
        </div>
        <div className="grid-3">
          {/* Equity */}
          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              📊 Equity — {country.assets.equity.ticker || 'N/A'}
            </div>
            <ReturnGrid data={country.assets.equity} />
            <ScoreMini label="Score" percentile={s.equity_score.percentile} />
          </div>

          {/* Bond */}
          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              📈 Bond
            </div>
            {country.assets.bond.available ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <DataRow label="10Y Yield" value={country.assets.bond.yield_10y !== null ? `${country.assets.bond.yield_10y.toFixed(2)}%` : '—'} />
                  <DataRow label="1M Change" value={country.assets.bond.yield_change_1m !== null ? `${country.assets.bond.yield_change_1m > 0 ? '+' : ''}${(country.assets.bond.yield_change_1m * 100).toFixed(0)}bps` : '—'} />
                </div>
                {country.assets.bond.sovereign_spread !== null && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <DataRow
                      label="Sovereign Spread"
                      value={`+${country.assets.bond.sovereign_spread.toFixed(2)}%`}
                      color={country.assets.bond.sovereign_spread < 2 ? 'var(--color-strong)' : country.assets.bond.sovereign_spread <= 5 ? '#f59e0b' : 'var(--color-weak)'}
                    />
                    <DataRow label="vs US Treasury" value="" />
                  </div>
                )}
                <ScoreMini label="Score" percentile={s.bond_score.percentile} />
              </>
            ) : (
              <div className="data-unavailable" style={{ padding: '1rem 0' }}>Bond data unavailable for this market</div>
            )}
          </div>

          {/* Currency */}
          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              💱 Currency — {country.assets.currency.pair || 'N/A'}
            </div>
            <ReturnGrid data={country.assets.currency} />
            <ScoreMini label="Score" percentile={s.currency_score.percentile} />
          </div>
        </div>
      </div>

      {/* Macro Panel */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          Macro Fundamentals
        </div>
        <div className="grid-3">
          <MacroCategory title="📊 Growth" score={s.growth_score} data={country.macro.growth} fields={['gdp_growth', 'pmi', 'industrial_production', 'retail_sales', 'exports']} labels={['GDP Growth', 'PMI', 'Industrial Prod.', 'Consumption Growth', 'Export Growth']} />
          <MacroCategory title="👷 Labor" score={s.labor_score} data={country.macro.labor} fields={['unemployment', 'wage_growth', 'jobless_claims']} labels={['Unemployment', 'Wage Growth', 'Jobless Claims']} />
          <MacroCategory title="🔥 Inflation" score={s.inflation_score} data={country.macro.inflation} fields={['cpi_yoy', 'core_cpi', 'ppi', 'food_energy_pressure']} labels={['CPI YoY', 'Core CPI', 'PPI', 'Food/Energy']} />
          <MacroCategory title="🌍 External Balance" score={s.external_balance_score} data={country.macro.external_balance} fields={['current_account_pct_gdp', 'trade_balance', 'fx_reserves', 'export_growth', 'import_growth']} labels={['Current Acct % GDP', 'Trade % GDP', 'FX Reserves', 'Export Growth', 'Import Growth']} />
          <MacroCategory title="💰 Fiscal / Debt" score={s.fiscal_score} data={country.macro.fiscal_debt} fields={['fiscal_balance_pct_gdp', 'govt_debt_pct_gdp', 'yield_10y', 'sovereign_cds']} labels={['Fiscal Balance % GDP', 'Govt Debt % GDP', '10Y Yield', 'Sovereign CDS']} />
          <MacroCategory title="🏦 Credit Cycle" score={s.credit_score} data={country.macro.credit_cycle} fields={['private_credit_growth', 'bank_lending', 'household_debt', 'corporate_debt', 'credit_spread', 'bank_stock_performance']} labels={['Private Credit % GDP', 'Bank Lending', 'Household Debt', 'Corporate Debt', 'Credit Spread', 'Bank Stocks']} />
        </div>
      </div>

      {/* Peer Comparison */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          Peer Benchmarks
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Group</th>
                <th>Size</th>
                <th>Avg Asset</th>
                <th>Avg Macro</th>
                <th>Best</th>
                <th>Worst</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(country.peer_benchmarks).map(([dim, bench]) => (
                <tr key={dim}>
                  <td style={{ fontWeight: 600, fontSize: '0.75rem' }}>{formatDimension(dim)}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{bench.group_name}</td>
                  <td style={{ fontSize: '0.75rem' }}>{bench.group_size}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: bench.avg_asset_score !== null ? getScoreColor(zToP(bench.avg_asset_score)) : 'var(--text-muted)' }}>
                      {bench.avg_asset_score !== null ? bench.avg_asset_score.toFixed(2) : '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: bench.avg_macro_score !== null ? getScoreColor(zToP(bench.avg_macro_score)) : 'var(--text-muted)' }}>
                      {bench.avg_macro_score !== null ? bench.avg_macro_score.toFixed(2) : '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-strong)' }}>{bench.best_country || '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-weak)' }}>{bench.worst_country || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
// --- Valuation Panel ---

function formatAum(aum: number | null): string {
  if (aum === null) return '—'
  if (aum >= 1e9) return `$${(aum / 1e9).toFixed(1)}B`
  if (aum >= 1e6) return `$${(aum / 1e6).toFixed(1)}M`
  return `$${aum.toFixed(0)}`
}

function ValuationPanel({ valuation, ticker }: { valuation: ValuationData; ticker: string }) {
  if (!valuation.available) {
    return (
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
          Valuation
        </div>
        <div className="data-unavailable" style={{ padding: '0.5rem 0' }}>
          No valuation data — no equity ETF
        </div>
      </div>
    )
  }

  const zColor = valuation.valuation_z === null ? 'var(--text-tertiary)'
    : valuation.valuation_z > 0.5 ? 'var(--color-strong)'
    : valuation.valuation_z > -0.5 ? '#f59e0b'
    : 'var(--color-weak)'

  return (
    <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
        Valuation — {ticker || 'N/A'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {valuation.dividend_yield !== null && (
          <ValuationMetric label="Dividend Yield" value={`${valuation.dividend_yield.toFixed(2)}%`} />
        )}
        {valuation.beta !== null && (
          <ValuationMetric label="Beta" value={valuation.beta.toFixed(2)} />
        )}
        {valuation.aum !== null && (
          <ValuationMetric label="AUM" value={formatAum(valuation.aum)} />
        )}
        {valuation.pe_ratio !== null && (
          <ValuationMetric label="P/E Ratio" value={valuation.pe_ratio.toFixed(1)} />
        )}
        {valuation.pb_ratio !== null && (
          <ValuationMetric label="P/B Ratio" value={valuation.pb_ratio.toFixed(2)} />
        )}
        {valuation.earnings_yield !== null && (
          <ValuationMetric label="Earnings Yield" value={`${valuation.earnings_yield.toFixed(2)}%`} />
        )}
      </div>
      {valuation.valuation_z !== null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Valuation Z-Score</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: zColor, fontVariantNumeric: 'tabular-nums' }}>
            {valuation.valuation_z >= 0 ? '+' : ''}{valuation.valuation_z.toFixed(2)}
          </span>
        </div>
      )}
      {valuation.valuation_percentile !== null && (
        <PercentileBar percentile={valuation.valuation_percentile} height={4} />
      )}
      {valuation.note && (
        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
          {valuation.note}
        </div>
      )}
    </div>
  )
}

function ValuationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

// --- Helper Components ---

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: '0.6875rem', padding: '0.125rem 0.5rem',
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderRadius: '100px', color: color || 'var(--text-secondary)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function ReturnGrid({ data }: { data: { return_1m: number | null; return_3m: number | null; return_6m: number | null; return_12m: number | null } }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <DataRow label="1M" value={formatReturn(data.return_1m)} color={returnColor(data.return_1m)} />
      <DataRow label="3M" value={formatReturn(data.return_3m)} color={returnColor(data.return_3m)} />
      <DataRow label="6M" value={formatReturn(data.return_6m)} color={returnColor(data.return_6m)} />
      <DataRow label="12M" value={formatReturn(data.return_12m)} color={returnColor(data.return_12m)} />
    </div>
  )
}

function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: color || 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function ScoreMini({ label, percentile }: { label: string; percentile: number | null }) {
  if (percentile === null) return <div className="data-unavailable">{label}: N/A</div>
  const color = getScoreColor(percentile)
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>
          {getPercentileLabel(percentile)} ({percentile.toFixed(0)})
        </span>
      </div>
      <PercentileBar percentile={percentile} height={4} />
    </div>
  )
}

function MacroCategory({ title, score, data, fields, labels }: {
  title: string
  score: CategoryScore
  data: any
  fields: string[]
  labels: string[]
}) {
  return (
    <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
        {score.percentile !== null && (
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem',
            borderRadius: '100px', color: getScoreColor(score.percentile),
            background: score.percentile >= 60 ? 'var(--color-strong-bg)' : score.percentile >= 40 ? 'var(--color-neutral-bg)' : 'var(--color-weak-bg)',
          }}>
            {score.percentile.toFixed(0)}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {fields.map((field, i) => {
          const indicator = data[field]
          if (!indicator) return null
          const isStale = isMacroStale(indicator.last_updated)
          const updatedLabel = formatLastUpdated(indicator.last_updated)
          return (
            <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {labels[i]}
                {updatedLabel && (
                  <span style={{
                    fontSize: '0.5625rem',
                    color: isStale ? '#d97706' : 'var(--text-muted)',
                    fontWeight: isStale ? 600 : 400,
                  }}>
                    {isStale ? '⚠ ' : ''}{updatedLabel}
                  </span>
                )}
              </span>
              {indicator.available ? (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                  color: indicator.percentile !== null ? getScoreColor(indicator.percentile) : 'var(--text-primary)',
                }}>
                  {indicator.value !== null ? formatMacroValue(field, indicator.value) : '—'}
                  {indicator.percentile !== null && (
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', marginLeft: '0.25rem' }}>
                      ({indicator.percentile.toFixed(0)})
                    </span>
                  )}
                </span>
              ) : (
                <span className="data-unavailable" style={{ fontSize: '0.6875rem' }}>N/A</span>
              )}
            </div>
          )
        })}
      </div>
      {score.percentile !== null && (
        <div style={{ marginTop: '0.5rem' }}>
          <PercentileBar percentile={score.percentile} height={3} />
        </div>
      )}
    </div>
  )
}


// --- Helpers ---

function formatReturn(v: number | null): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

function returnColor(v: number | null): string {
  if (v === null) return 'var(--text-muted)'
  if (v > 0.01) return 'var(--color-strong)'
  if (v < -0.01) return 'var(--color-weak)'
  return 'var(--text-secondary)'
}

function formatMacroValue(field: string, value: number): string {
  // FX reserves — display in billions
  if (field === 'fx_reserves') {
    if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
    return `$${value.toFixed(0)}`
  }
  // Fields that are % of GDP or % values
  if (field.includes('pct_gdp') || field === 'trade_balance') {
    return `${value.toFixed(1)}%`
  }
  // Growth rates and inflation rates
  if (field.includes('growth') || field.includes('cpi') || field.includes('ppi') ||
      field === 'unemployment' || field === 'exports' || field === 'retail_sales' ||
      field === 'industrial_production' || field === 'wage_growth') {
    return `${value.toFixed(1)}%`
  }
  // Credit as % of GDP
  if (field === 'private_credit_growth' || field.includes('debt') || field.includes('credit')) {
    return `${value.toFixed(1)}%`
  }
  // CDS spread in bps
  if (field === 'sovereign_cds' || field === 'credit_spread') {
    return `${value.toFixed(0)}bp`
  }
  // Yield
  if (field.includes('yield')) {
    return `${value.toFixed(2)}%`
  }
  // PMI index
  if (field === 'pmi') return value.toFixed(1)
  // Default
  return value.toFixed(2)
}

function formatDimension(dim: string): string {
  const map: Record<string, string> = {
    'global': 'Global',
    'region': 'Region',
    'development_stage': 'Dev. Stage',
    'global_role': 'Global Role',
    'openness_type': 'Openness',
    'external_vulnerability': 'Ext. Vulnerability',
  }
  return map[dim] || dim
}

function getLabelColor(label: string): string {
  const map: Record<string, string> = {
    'True Alpha': 'var(--label-true-alpha)',
    'Fake Alpha': 'var(--label-fake-alpha)',
    'Hidden Alpha': 'var(--label-hidden-alpha)',
    'Beta': 'var(--label-beta)',
    'Crisis Risk': 'var(--label-crisis)',
  }
  return map[label] || 'var(--text-muted)'
}

// Simple z-to-percentile for display
function zToP(z: number): number {
  // Approximate normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return (z > 0 ? (1 - p) : p) * 100
}

function formatLastUpdated(lastUpdated: string | null): string {
  if (!lastUpdated) return ''
  // If it's just a year like "2024"
  if (/^\d{4}$/.test(lastUpdated)) return lastUpdated
  // If it's an ISO date string, extract the year
  const match = lastUpdated.match(/^(\d{4})-/)
  if (match) {
    const year = parseInt(match[1], 10)
    const currentYear = new Date().getFullYear()
    // If it's a recent ISO timestamp (this year or last year), it's "live" data
    if (year >= currentYear - 1) return 'Live'
    return match[1]
  }
  return lastUpdated
}

function isMacroStale(lastUpdated: string | null): boolean {
  if (!lastUpdated) return false
  let year: number | null = null
  if (/^\d{4}$/.test(lastUpdated)) {
    year = parseInt(lastUpdated, 10)
  } else {
    const match = lastUpdated.match(/^(\d{4})-/)
    if (match) year = parseInt(match[1], 10)
  }
  if (year === null) return false
  const currentYear = new Date().getFullYear()
  return (currentYear - year) >= 2
}

function AlphaResidualCard({ label, value, group, size }: { label: string; value: number | null; group: string; size: number }) {
  const color = value === null ? 'var(--text-tertiary)'
    : value > 0.3 ? 'var(--color-strong)'
    : value > 0 ? '#38bdf8'
    : value > -0.3 ? '#f59e0b'
    : 'var(--color-weak)';
  const sign = value !== null && value > 0 ? '+' : '';
  return (
    <div style={{
      padding: '0.75rem 1rem', background: 'var(--bg-card)',
      borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '0.375rem', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
        {value !== null ? `${sign}${value.toFixed(3)}` : '—'}
      </div>
      <div style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
        {group} ({size} countries)
      </div>
    </div>
  )
}
