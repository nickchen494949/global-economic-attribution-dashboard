import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardData, CountryData } from '../../lib/types'
import { LabelBadge } from '../common/LabelBadge'
import { getScoreColor } from '../common/ScoreCard'

interface PeerGroupPageProps {
  data: DashboardData
}

type GroupDimension = 'region' | 'development_stage' | 'global_role' | 'openness_type' | 'external_vulnerability'

const dimensions: { key: GroupDimension; label: string }[] = [
  { key: 'region', label: 'Region' },
  { key: 'development_stage', label: 'Development Stage' },
  { key: 'global_role', label: 'Global Role' },
  { key: 'openness_type', label: 'Openness / Size' },
  { key: 'external_vulnerability', label: 'External Vulnerability' },
]

export function PeerGroupPage({ data }: PeerGroupPageProps) {
  const [activeDim, setActiveDim] = useState<GroupDimension>('region')
  const navigate = useNavigate()

  const groups = useMemo(() => {
    const groupMap = new Map<string, CountryData[]>()

    data.countries.forEach(c => {
      let keys: string[] = []
      if (activeDim === 'region') keys = [c.classification.region]
      else if (activeDim === 'development_stage') keys = [c.classification.development_stage]
      else if (activeDim === 'global_role') keys = c.classification.global_roles
      else if (activeDim === 'openness_type') keys = [c.classification.openness_type]
      else if (activeDim === 'external_vulnerability') keys = [c.classification.external_vulnerability]

      keys.forEach(k => {
        if (!groupMap.has(k)) groupMap.set(k, [])
        groupMap.get(k)!.push(c)
      })
    })

    return Array.from(groupMap.entries())
      .map(([name, countries]) => {
        const assetScores = countries.map(c => c.scores.asset_score.z_score).filter((v): v is number => v !== null)
        const macroScores = countries.map(c => c.scores.macro_score.z_score).filter((v): v is number => v !== null)
        const riskScores = countries.map(c => c.scores.risk_score.z_score).filter((v): v is number => v !== null)

        const avgAsset = assetScores.length > 0 ? assetScores.reduce((a, b) => a + b, 0) / assetScores.length : null
        const avgMacro = macroScores.length > 0 ? macroScores.reduce((a, b) => a + b, 0) / macroScores.length : null
        const avgRisk = riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : null

        const sortedByAsset = [...countries].sort((a, b) => (b.scores.asset_score.percentile ?? 0) - (a.scores.asset_score.percentile ?? 0))
        const best = sortedByAsset[0]
        const worst = sortedByAsset[sortedByAsset.length - 1]

        // Dispersion = std dev of asset scores
        const dispersion = assetScores.length > 1
          ? Math.sqrt(assetScores.reduce((sum, v) => sum + Math.pow(v - (avgAsset ?? 0), 2), 0) / (assetScores.length - 1))
          : 0

        return {
          name,
          countries,
          count: countries.length,
          avgAsset,
          avgMacro,
          avgRisk,
          best,
          worst,
          dispersion,
        }
      })
      .sort((a, b) => (b.avgAsset ?? -10) - (a.avgAsset ?? -10))
  }, [data.countries, activeDim])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Peer Groups</h2>
        <p>Compare countries within peer dimensions · Equal-weight benchmarks</p>
      </div>

      {/* Dimension Tabs */}
      <div className="tab-bar">
        {dimensions.map(d => (
          <button
            key={d.key}
            className={`tab-item ${activeDim === d.key ? 'active' : ''}`}
            onClick={() => setActiveDim(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Group Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {groups.map(group => (
          <div key={group.name} className="glass-card-static" style={{ padding: '1.25rem 1.5rem' }}>
            {/* Group Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.125rem' }}>{group.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{group.count} countries</div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <MiniStat label="Avg Asset" value={group.avgAsset} />
                <MiniStat label="Avg Macro" value={group.avgMacro} />
                <MiniStat label="Avg Risk" value={group.avgRisk} />
                <MiniStat label="Dispersion" value={group.dispersion} neutral />
              </div>
            </div>

            {/* Best / Worst */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {group.best && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Best: <span style={{ color: 'var(--color-strong)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/country/${group.best.classification.code}`)}>{group.best.classification.country}</span>
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.25rem' }}>({group.best.scores.asset_score.percentile?.toFixed(0) ?? '—'})</span>
                </div>
              )}
              {group.worst && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Worst: <span style={{ color: 'var(--color-weak)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/country/${group.worst.classification.code}`)}>{group.worst.classification.country}</span>
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.25rem' }}>({group.worst.scores.asset_score.percentile?.toFixed(0) ?? '—'})</span>
                </div>
              )}
            </div>

            {/* Column headers */}
            {group.countries.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '160px 60px 60px 60px 60px 100px',
                gap: '0.75rem',
                padding: '0.375rem 0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '0.25rem',
                fontSize: '0.625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
              }}>
                <span>Country</span>
                <span style={{ textAlign: 'center' }}>Asset</span>
                <span style={{ textAlign: 'center' }}>Macro</span>
                <span style={{ textAlign: 'center' }}>Risk</span>
                <span style={{ textAlign: 'center' }}>Alpha</span>
                <span style={{ textAlign: 'right' }}>Label</span>
              </div>
            )}

            {/* Country List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {[...group.countries]
                .sort((a, b) => (b.scores.asset_score.percentile ?? 0) - (a.scores.asset_score.percentile ?? 0))
                .map(c => (
                <div
                  key={c.classification.code}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 60px 60px 60px 60px 100px',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.375rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    transition: 'background 0.15s ease',
                  }}
                  onClick={() => navigate(`/country/${c.classification.code}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 600 }}>{c.classification.country}</span>
                  <span style={{ fontWeight: 600, color: getScoreColor(c.scores.asset_score.percentile), fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
                    {c.scores.asset_score.percentile?.toFixed(0) ?? '—'}
                  </span>
                  <span style={{ fontWeight: 600, color: getScoreColor(c.scores.macro_score.percentile), fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
                    {c.scores.macro_score.percentile?.toFixed(0) ?? '—'}
                  </span>
                  <span style={{ fontWeight: 600, color: getScoreColor(c.scores.risk_score.percentile), fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
                    {c.scores.risk_score.percentile?.toFixed(0) ?? '—'}
                  </span>
                  <span style={{
                    fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'center',
                    color: (c.scores.country_alpha ?? 0) > 0.1 ? 'var(--color-strong)' : (c.scores.country_alpha ?? 0) < -0.1 ? 'var(--color-weak)' : 'var(--text-secondary)',
                  }}>
                    {c.scores.country_alpha !== null ? `${c.scores.country_alpha >= 0 ? '+' : ''}${c.scores.country_alpha.toFixed(2)}` : '—'}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <LabelBadge label={c.label.label} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value, neutral }: { label: string; value: number | null; neutral?: boolean }) {
  const color = neutral ? 'var(--text-primary)' : value !== null
    ? value > 0.3 ? 'var(--color-strong)' : value < -0.3 ? 'var(--color-weak)' : 'var(--color-neutral)'
    : 'var(--text-muted)'

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value !== null ? value.toFixed(2) : '—'}
      </div>
    </div>
  )
}
