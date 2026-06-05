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

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Data Quality</h2>
        <p>Coverage, freshness, and confidence for each country</p>
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
