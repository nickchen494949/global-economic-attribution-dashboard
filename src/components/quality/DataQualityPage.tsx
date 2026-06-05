import { useMemo } from 'react'
import type { DashboardData } from '../../lib/types'
import { getScoreColor, PercentileBar } from '../common/ScoreCard'

interface DataQualityPageProps {
  data: DashboardData
}

export function DataQualityPage({ data }: DataQualityPageProps) {
  const countries = [...data.countries].sort((a, b) =>
    b.data_quality.confidence === a.data_quality.confidence
      ? b.data_quality.available_count - a.data_quality.available_count
      : confidenceRank(b.data_quality.confidence) - confidenceRank(a.data_quality.confidence)
  )

  const totalFields = countries.reduce((sum, c) => sum + c.data_quality.total_fields, 0)
  const totalAvailable = countries.reduce((sum, c) => sum + c.data_quality.available_count, 0)
  const totalMissing = countries.reduce((sum, c) => sum + c.data_quality.missing_count, 0)
  const coveragePct = totalFields > 0 ? (totalAvailable / totalFields * 100) : 0

  // --- Audit computations ---
  const audit = useMemo(() => {
    // Last asset data update: find latest equity last_date from data_quality
    const assetDates = countries
      .map(c => c.data_quality.last_updated)
      .filter(d => d && d.length > 0)
      .sort()
      .reverse()
    const lastAssetUpdate = assetDates.length > 0 ? assetDates[0] : 'Unknown'

    // Last macro update: from dashboard last_updated
    const lastMacroUpdate = data.last_updated || 'Unknown'

    // Coverage counts
    const withEquity = countries.filter(c => c.assets.equity.ticker && c.assets.equity.return_1m !== null).length
    const withCurrency = countries.filter(c => c.assets.currency.pair && c.assets.currency.return_1m !== null).length
    const withBond = countries.filter(c => c.assets.bond.available).length

    // Macro coverage: count countries that have at least one macro indicator available
    const withMacro = countries.filter(c => {
      const m = c.macro
      const categories = [m.growth, m.labor, m.inflation, m.external_balance, m.fiscal_debt, m.credit_cycle]
      return categories.some(cat => {
        return Object.values(cat).some((ind: any) => ind?.available)
      })
    }).length

    // Countries missing equity data
    const missingEquity = countries
      .filter(c => !c.assets.equity.ticker || c.assets.equity.return_1m === null)
      .map(c => c.classification.country)

    return {
      lastAssetUpdate,
      lastMacroUpdate,
      withEquity,
      withCurrency,
      withBond,
      withMacro,
      missingEquity,
      isSampleData: data.is_sample_data,
    }
  }, [countries, data])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Data Quality</h2>
        <p>Coverage, freshness, and confidence for each country</p>
      </div>

      {/* Data Update Audit */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          Data Update Audit
        </div>

        {/* Sample data warning */}
        {audit.isSampleData && (
          <div style={{
            padding: '0.5rem 0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)',
            background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)',
            color: '#d97706', fontSize: '0.75rem', fontWeight: 600,
          }}>
            ⚠ Sample Data Mode — Run the data pipeline to fetch live market data
          </div>
        )}

        <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
          {/* Market Data (Daily) */}
          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              📊 Market Data
              <span style={{ fontSize: '0.5625rem', padding: '0.0625rem 0.375rem', background: 'var(--color-strong-bg)', color: 'var(--color-strong)', borderRadius: '100px', border: '1px solid var(--color-strong-border)' }}>Daily</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <AuditRow label="Last Update" value={audit.lastAssetUpdate} />
              <AuditRow label="Equity Coverage" value={`${audit.withEquity} / ${countries.length} countries`} highlight={audit.withEquity === countries.length} />
              <AuditRow label="Currency Coverage" value={`${audit.withCurrency} / ${countries.length} countries`} highlight={audit.withCurrency === countries.length} />
              <AuditRow label="Bond Coverage" value={`${audit.withBond} / ${countries.length} countries`} />
              <AuditRow label="Source" value="Yahoo Finance (yfinance)" />
            </div>
          </div>

          {/* Macro Data (Annual/Quarterly) */}
          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              🏦 Macro Data
              <span style={{ fontSize: '0.5625rem', padding: '0.0625rem 0.375rem', background: 'var(--color-neutral-bg)', color: 'var(--color-neutral)', borderRadius: '100px', border: '1px solid var(--color-neutral-border)' }}>Annual / Quarterly</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <AuditRow label="Dashboard Updated" value={audit.lastMacroUpdate} />
              <AuditRow label="Macro Coverage" value={`${audit.withMacro} / ${countries.length} countries`} highlight={audit.withMacro === countries.length} />
              <AuditRow label="Source" value="World Bank + TradingEconomics" />
              <AuditRow label="Sample Data" value={audit.isSampleData ? 'Yes' : 'No'} warn={audit.isSampleData} />
            </div>
          </div>
        </div>

        {/* Missing equity list */}
        {audit.missingEquity.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-weak)', marginBottom: '0.375rem' }}>
              Countries Missing Equity Data ({audit.missingEquity.length})
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {audit.missingEquity.map(name => (
                <span key={name} style={{
                  fontSize: '0.5625rem', padding: '0.0625rem 0.375rem',
                  background: 'var(--color-weak-bg)', color: 'var(--color-weak)',
                  borderRadius: '100px', border: '1px solid var(--color-weak-border)',
                }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid-4 stagger-children" style={{ marginBottom: '1.25rem' }}>
        <div className="glass-card-static score-card">
          <div className="score-label">Total Countries</div>
          <div className="score-value" style={{ color: 'var(--accent-primary-hover)' }}>{countries.length}</div>
        </div>
        <div className="glass-card-static score-card">
          <div className="score-label">Overall Coverage</div>
          <div className="score-value" style={{ color: coveragePct > 70 ? 'var(--color-strong)' : coveragePct > 50 ? 'var(--color-neutral)' : 'var(--color-weak)' }}>
            {coveragePct.toFixed(1)}%
          </div>
          <div className="score-detail">{totalAvailable} / {totalFields} fields</div>
        </div>
        <div className="glass-card-static score-card">
          <div className="score-label">Available Data Points</div>
          <div className="score-value" style={{ color: 'var(--color-strong)' }}>{totalAvailable}</div>
        </div>
        <div className="glass-card-static score-card">
          <div className="score-label">Missing Data Points</div>
          <div className="score-value" style={{ color: totalMissing > 0 ? 'var(--color-neutral)' : 'var(--color-strong)' }}>{totalMissing}</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card-static" style={{ padding: '1rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Available</th>
                <th>Missing</th>
                <th>Coverage</th>
                <th>Last Updated</th>
                <th>Source</th>
                <th>Confidence</th>
                <th>Missing Fields</th>
              </tr>
            </thead>
            <tbody>
              {countries.map(c => {
                const q = c.data_quality
                const coverage = q.total_fields > 0 ? (q.available_count / q.total_fields * 100) : 0

                return (
                  <tr key={c.classification.code}>
                    <td>
                      <div className="country-name">
                        <span>{c.classification.country}</span>
                        <span className="country-code">{c.classification.code}</span>
                      </div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-strong)' }}>
                      {q.available_count}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: q.missing_count > 0 ? 'var(--color-weak)' : 'var(--color-strong)' }}>
                      {q.missing_count}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 60 }}>
                          <PercentileBar percentile={coverage} height={4} />
                        </div>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                          color: getScoreColor(coverage),
                        }}>
                          {coverage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {q.last_updated}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {q.data_source}
                    </td>
                    <td>
                      <ConfidenceBadge level={q.confidence} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '200px' }}>
                        {q.missing_fields.length === 0 ? (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--color-strong)' }}>Complete</span>
                        ) : (
                          q.missing_fields.slice(0, 3).map((f, i) => (
                            <span key={i} style={{
                              fontSize: '0.5625rem', padding: '0.0625rem 0.375rem',
                              background: 'var(--color-weak-bg)', color: 'var(--color-weak)',
                              borderRadius: '100px', border: '1px solid var(--color-weak-border)',
                            }}>
                              {f}
                            </span>
                          ))
                        )}
                        {q.missing_fields.length > 3 && (
                          <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                            +{q.missing_fields.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AuditRow({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{
        fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        color: warn ? '#d97706' : highlight ? 'var(--color-strong)' : 'var(--text-primary)',
      }}>
        {value}
      </span>
    </div>
  )
}

function ConfidenceBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const config = {
    High: { color: 'var(--color-strong)', bg: 'var(--color-strong-bg)', border: 'var(--color-strong-border)' },
    Medium: { color: 'var(--color-neutral)', bg: 'var(--color-neutral-bg)', border: 'var(--color-neutral-border)' },
    Low: { color: 'var(--color-weak)', bg: 'var(--color-weak-bg)', border: 'var(--color-weak-border)' },
  }
  const c = config[level]

  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 600,
      padding: '0.125rem 0.5rem', borderRadius: '100px',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {level}
    </span>
  )
}

function confidenceRank(c: 'High' | 'Medium' | 'Low'): number {
  return { High: 3, Medium: 2, Low: 1 }[c]
}

