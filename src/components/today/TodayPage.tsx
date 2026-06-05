import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardData, CountryData } from '../../lib/types'
import { LabelBadge } from '../common/LabelBadge'
import { getScoreColor, PercentileBar } from '../common/ScoreCard'
import { SearchFilter } from '../common/SearchFilter'

interface TodayPageProps {
  data: DashboardData
}

export function TodayPage({ data }: TodayPageProps) {
  const navigate = useNavigate()
  const [filtered, setFiltered] = useState<CountryData[]>(data.countries)
  const handleFilter = useCallback((f: CountryData[]) => setFiltered(f), [])

  // Keep filtered in sync when data changes (e.g. live data loads)
  useEffect(() => { setFiltered(data.countries) }, [data.countries])

  const trueAlpha = useMemo(() =>
    data.countries
      .filter(c => c.label.label === 'True Alpha')
      .sort((a, b) => (b.scores.asset_score.percentile ?? 0) - (a.scores.asset_score.percentile ?? 0))
      .slice(0, 5),
    [data.countries]
  )

  const hiddenAlpha = useMemo(() =>
    data.countries
      .filter(c => c.label.label === 'Hidden Alpha')
      .sort((a, b) => (b.scores.macro_score.percentile ?? 0) - (a.scores.macro_score.percentile ?? 0))
      .slice(0, 5),
    [data.countries]
  )

  const fakeAlpha = useMemo(() =>
    data.countries
      .filter(c => c.label.label === 'Fake Alpha')
      .sort((a, b) => (b.scores.asset_score.percentile ?? 0) - (a.scores.asset_score.percentile ?? 0))
      .slice(0, 5),
    [data.countries]
  )

  const crisisRisk = useMemo(() =>
    data.countries
      .filter(c => c.label.label === 'Crisis Risk')
      .sort((a, b) => (a.scores.risk_score.percentile ?? 100) - (b.scores.risk_score.percentile ?? 100))
      .slice(0, 5),
    [data.countries]
  )

  const biggestResiduals = useMemo(() =>
    [...data.countries]
      .filter(c => c.scores.country_alpha !== null)
      .sort((a, b) => Math.abs(b.scores.country_alpha ?? 0) - Math.abs(a.scores.country_alpha ?? 0))
      .slice(0, 8),
    [data.countries]
  )

  const regime = data.global_fingerprint

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Today</h2>
        <p>Global attribution overview · {data.last_updated}</p>
      </div>

      {/* Global Regime Card */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
              Global Market Regime
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="regime-badge" style={{
                background: getRegimeColor(regime.regime) + '18',
                color: getRegimeColor(regime.regime),
                border: `1px solid ${getRegimeColor(regime.regime)}33`,
              }}>
                {getRegimeIcon(regime.regime)} {regime.regime}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Confidence: {(regime.regime_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '500px' }}>
            {regime.regime_explanation}
          </div>
        </div>

        {/* Fingerprint mini-panel */}
        {regime.assets.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {regime.assets.slice(0, 10).map(asset => (
              <div key={asset.name} style={{
                padding: '0.5rem 0.75rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                minWidth: '100px',
              }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>{asset.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {asset.change_1w !== null ? `${asset.change_1w >= 0 ? '+' : ''}${(asset.change_1w * 100).toFixed(1)}%` : '—'}
                  </span>
                  <span style={{
                    color: asset.direction === 'up' ? 'var(--color-strong)' : asset.direction === 'down' ? 'var(--color-weak)' : 'var(--text-tertiary)',
                    fontSize: '0.75rem',
                  }}>
                    {asset.direction === 'up' ? '▲' : asset.direction === 'down' ? '▼' : '—'}
                  </span>
                </div>
                {/* Z-Score for each asset */}
                {asset.z_score !== null && (
                  <div style={{ fontSize: '0.625rem', color: zColor(asset.z_score), fontVariantNumeric: 'tabular-nums', marginTop: '0.125rem' }}>
                    z: {asset.z_score >= 0 ? '+' : ''}{asset.z_score.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Countries Grid */}
      <div className="grid-2 stagger-children" style={{ marginBottom: '1.25rem' }}>
        <CountryList
          title="◆ True Alpha"
          subtitle="Strong performance backed by fundamentals"
          countries={trueAlpha}
          color="var(--label-true-alpha)"
          onSelect={(code) => navigate(`/country/${code}`)}
        />
        <CountryList
          title="◈ Hidden Alpha"
          subtitle="Strong fundamentals, market hasn't priced in"
          countries={hiddenAlpha}
          color="var(--label-hidden-alpha)"
          onSelect={(code) => navigate(`/country/${code}`)}
        />
        <CountryList
          title="◇ Fake Alpha"
          subtitle="Strong price, weak fundamentals"
          countries={fakeAlpha}
          color="var(--label-fake-alpha)"
          onSelect={(code) => navigate(`/country/${code}`)}
        />
        <CountryList
          title="▲ Crisis Risk"
          subtitle="Weak across assets, macro, and risk"
          countries={crisisRisk}
          color="var(--label-crisis)"
          onSelect={(code) => navigate(`/country/${code}`)}
        />
      </div>

      {/* Biggest Residuals */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          Biggest Country Residuals (Alpha vs Global Benchmark)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {biggestResiduals.map(c => (
            <div
              key={c.classification.code}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', transition: 'background 0.15s ease',
              }}
              onClick={() => navigate(`/country/${c.classification.code}`)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '140px' }}>
                {c.classification.country}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: '30px' }}>
                {c.classification.code}
              </span>
              <div style={{ flex: 1 }}>
                <ResidualBar value={c.scores.country_alpha ?? 0} />
              </div>
              <span style={{
                fontWeight: 600, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums', minWidth: '50px', textAlign: 'right',
                color: (c.scores.country_alpha ?? 0) > 0 ? 'var(--color-strong)' : (c.scores.country_alpha ?? 0) < 0 ? 'var(--color-weak)' : 'var(--text-secondary)',
              }}>
                {(c.scores.country_alpha ?? 0) >= 0 ? '+' : ''}{(c.scores.country_alpha ?? 0).toFixed(2)}
              </span>
              <LabelBadge label={c.label.label} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Full Country Table — NOW WITH Z-SCORES */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          All Countries ({filtered.length})
        </div>

        <SearchFilter countries={data.countries} onFilter={handleFilter} />

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Region</th>
                <th style={{ textAlign: 'center' }}>Equity Z</th>
                <th style={{ textAlign: 'center' }}>Currency Z</th>
                <th style={{ textAlign: 'center' }}>Asset Z</th>
                <th style={{ textAlign: 'center' }}>Asset P</th>
                <th style={{ textAlign: 'center' }}>Macro P</th>
                <th style={{ textAlign: 'center' }}>Risk P</th>
                <th style={{ textAlign: 'center' }}>Alpha</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.classification.code}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/country/${c.classification.code}`)}
                >
                  <td>
                    <div className="country-name">
                      <span>{c.classification.country}</span>
                      <span className="country-code">{c.classification.code}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {c.classification.region}
                  </td>
                  {/* Equity Z-Score */}
                  <td style={{ textAlign: 'center' }}>
                    <ZScoreCell z={c.scores.equity_score.z_score} />
                  </td>
                  {/* Currency Z-Score */}
                  <td style={{ textAlign: 'center' }}>
                    <ZScoreCell z={c.scores.currency_score.z_score} />
                  </td>
                  {/* Asset Composite Z */}
                  <td style={{ textAlign: 'center' }}>
                    <ZScoreCell z={c.scores.asset_score.z_score} />
                  </td>
                  {/* Asset Percentile */}
                  <td>
                    <MiniScore percentile={c.scores.asset_score.percentile} />
                  </td>
                  {/* Macro Percentile */}
                  <td>
                    <MiniScore percentile={c.scores.macro_score.percentile} />
                  </td>
                  {/* Risk Percentile */}
                  <td>
                    <MiniScore percentile={c.scores.risk_score.percentile} />
                  </td>
                  {/* Alpha */}
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 600, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums',
                      color: (c.scores.country_alpha ?? 0) > 0.1 ? 'var(--color-strong)' : (c.scores.country_alpha ?? 0) < -0.1 ? 'var(--color-weak)' : 'var(--text-secondary)',
                    }}>
                      {c.scores.country_alpha !== null ? `${c.scores.country_alpha >= 0 ? '+' : ''}${c.scores.country_alpha.toFixed(2)}` : '—'}
                    </span>
                  </td>
                  <td>
                    <LabelBadge label={c.label.label} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// --- Helper Components ---

function ZScoreCell({ z }: { z: number | null }) {
  if (z === null) return <span className="data-unavailable">—</span>
  return (
    <span style={{
      fontWeight: 700, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums',
      color: zColor(z),
      padding: '0.125rem 0.375rem', borderRadius: '4px',
      background: Math.abs(z) > 1.0 ? `${zColor(z)}15` : 'transparent',
    }}>
      {z >= 0 ? '+' : ''}{z.toFixed(2)}
    </span>
  )
}

function zColor(z: number): string {
  if (z >= 1.0) return 'var(--color-strong)'
  if (z >= 0.3) return '#4ade80' // lighter green
  if (z <= -1.0) return 'var(--color-weak)'
  if (z <= -0.3) return '#f87171' // lighter red
  return 'var(--text-secondary)'
}

function CountryList({ title, subtitle, countries, color, onSelect }: {
  title: string
  subtitle: string
  countries: CountryData[]
  color: string
  onSelect: (code: string) => void
}) {
  return (
    <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color, marginBottom: '0.125rem' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{subtitle}</div>
      </div>
      {countries.length === 0 ? (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
          No countries in this category
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {countries.map((c, i) => (
            <div
              key={c.classification.code}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.5rem', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', transition: 'background 0.15s ease',
              }}
              onClick={() => onSelect(c.classification.code)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '16px' }}>{i + 1}</span>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>{c.classification.country}</span>
              <ZScoreCell z={c.scores.asset_score.z_score} />
              <MiniScore percentile={c.scores.asset_score.percentile} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniScore({ percentile }: { percentile: number | null }) {
  if (percentile === null) return <span className="data-unavailable">—</span>
  const color = getScoreColor(percentile)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <div style={{
        width: 40, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentile}%`, height: '100%', borderRadius: 2,
          background: color,
        }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', minWidth: '24px', textAlign: 'right' }}>
        {percentile.toFixed(0)}
      </span>
    </div>
  )
}

function ResidualBar({ value }: { value: number }) {
  const max = 2
  const pct = Math.min(100, (Math.abs(value) / max) * 100)
  const isPositive = value >= 0
  const color = isPositive ? 'var(--color-strong)' : 'var(--color-weak)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 8, gap: 0 }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {!isPositive && (
          <div style={{
            width: `${pct}%`, height: 6, borderRadius: 3,
            background: color, minWidth: 2,
          }} />
        )}
      </div>
      <div style={{ width: 1, height: 12, background: 'var(--border-default)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {isPositive && (
          <div style={{
            width: `${pct}%`, height: 6, borderRadius: 3,
            background: color, minWidth: 2,
          }} />
        )}
      </div>
    </div>
  )
}

function getRegimeColor(regime: string): string {
  const colors: Record<string, string> = {
    'Growth Scare': '#f59e0b', 'Inflation Scare': '#ef4444', 'Dollar Squeeze': '#ef4444',
    'Energy Shock': '#f97316', 'Commodity Boom': '#22c55e', 'Risk-On': '#22c55e',
    'Risk-Off': '#ef4444', 'Credit Stress': '#ef4444', 'Tech/Semiconductor Shock': '#8b5cf6',
    'Country-Specific': '#6366f1', 'Neutral': '#94a3b8',
  }
  return colors[regime] || '#94a3b8'
}

function getRegimeIcon(regime: string): string {
  const icons: Record<string, string> = {
    'Growth Scare': '📉', 'Inflation Scare': '🔥', 'Dollar Squeeze': '💵',
    'Energy Shock': '⛽', 'Commodity Boom': '📈', 'Risk-On': '🟢',
    'Risk-Off': '🔴', 'Credit Stress': '⚠️', 'Tech/Semiconductor Shock': '🔧',
    'Country-Specific': '🎯', 'Neutral': '⚖️',
  }
  return icons[regime] || '⚖️'
}
