import type { DashboardData, FuturesAsset, MarketRegime } from '../../lib/types'
import { getScoreColor, PercentileBar } from '../common/ScoreCard'

interface FingerprintPageProps {
  data: DashboardData
}

export function FingerprintPage({ data }: FingerprintPageProps) {
  const fp = data.global_fingerprint

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Global Market Fingerprint</h2>
        <p>Cross-asset signals reveal what the market is pricing</p>
      </div>

      {/* Regime Card */}
      <div className="glass-card-static" style={{
        padding: '1.5rem 2rem',
        marginBottom: '1.25rem',
        background: `linear-gradient(135deg, ${getRegimeColor(fp.regime)}10, transparent)`,
        borderLeft: `3px solid ${getRegimeColor(fp.regime)}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
              Current Market Regime
            </div>
            <div style={{
              fontSize: '1.75rem', fontWeight: 800,
              color: getRegimeColor(fp.regime),
              marginBottom: '0.5rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              {getRegimeIcon(fp.regime)} {fp.regime}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '600px' }}>
              {fp.regime_explanation}
            </div>
          </div>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `conic-gradient(${getRegimeColor(fp.regime)} ${fp.regime_confidence * 360}deg, rgba(255,255,255,0.06) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--bg-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.875rem', color: getRegimeColor(fp.regime),
            }}>
              {(fp.regime_confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Signals */}
        {fp.fingerprint_signals.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {fp.fingerprint_signals.map((sig, i) => (
              <span key={i} style={{
                fontSize: '0.6875rem', padding: '0.25rem 0.625rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-default)',
                borderRadius: '100px', color: 'var(--text-secondary)',
              }}>
                {sig}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Asset Grid */}
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
        Global Futures / ETF Panel
      </div>

      <div className="grid-auto stagger-children" style={{ marginBottom: '1.25rem' }}>
        {fp.assets.map(asset => (
          <AssetCard key={asset.name} asset={asset} />
        ))}
      </div>

      {/* Fingerprint Logic Reference */}
      <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
          Fingerprint Detection Logic
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {fingerprintRules.map((rule, i) => (
            <div key={i} style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: getRegimeColor(rule.regime), marginBottom: '0.25rem' }}>
                {rule.regime}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {rule.signal}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AssetCard({ asset }: { asset: FuturesAsset }) {
  const dirColor = asset.direction === 'up' ? 'var(--color-strong)'
    : asset.direction === 'down' ? 'var(--color-weak)'
    : 'var(--text-tertiary)'
  const dirIcon = asset.direction === 'up' ? '▲' : asset.direction === 'down' ? '▼' : '—'

  return (
    <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.125rem' }}>{asset.name}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{asset.ticker}</div>
        </div>
        <span style={{
          fontSize: '1.25rem', fontWeight: 800, color: dirColor,
          display: 'flex', alignItems: 'center', gap: '0.25rem',
        }}>
          {dirIcon}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <ChangeCell label="1D" value={asset.change_1d} />
        <ChangeCell label="1W" value={asset.change_1w} />
        <ChangeCell label="1M" value={asset.change_1m} />
      </div>

      {asset.z_score !== null && (
        <div style={{ marginBottom: '0.375rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>Z-Score</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: dirColor }}>
              {asset.z_score >= 0 ? '+' : ''}{asset.z_score.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {asset.percentile !== null && (
        <PercentileBar percentile={asset.percentile} height={4} />
      )}

      {asset.positioning && asset.positioning.net_speculative !== null && (
        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>COT Positioning</span>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            color: asset.positioning.net_speculative >= 0 ? 'var(--color-strong)' : 'var(--color-weak)',
          }}>
            Net Spec: {asset.positioning.net_speculative >= 0 ? '+' : ''}{formatNetSpec(asset.positioning.net_speculative)}
          </span>
        </div>
      )}
    </div>
  )
}

function ChangeCell({ label, value }: { label: string; value: number | null }) {
  if (value === null) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</div>
    </div>
  )

  const color = value > 0.001 ? 'var(--color-strong)' : value < -0.001 ? 'var(--color-weak)' : 'var(--text-secondary)'

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>
        {value >= 0 ? '+' : ''}{(value * 100).toFixed(1)}%
      </div>
    </div>
  )
}

function formatNetSpec(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toFixed(0)
}

const fingerprintRules = [
  { regime: 'Growth Scare', signal: 'Stocks ↓ + Bonds ↑ — Flight to safety as growth outlook weakens' },
  { regime: 'Inflation Scare', signal: 'Stocks ↓ + Bonds ↓ — Both assets sell off on rate/fiscal concerns' },
  { regime: 'Dollar Squeeze', signal: 'Stocks ↓ + Dollar ↑ — Global dollar tightening, risk-off' },
  { regime: 'Credit Stress', signal: 'Stocks ↓ + Gold ↑ — Safe-haven bid, credit risk rising' },
  { regime: 'Energy Shock', signal: 'Stocks ↓ + Oil ↑ — Energy/geopolitical shock pressuring economy' },
  { regime: 'Risk-Off', signal: 'Stocks ↓ + Copper ↓ — Industrial demand weakness, broad de-risking' },
  { regime: 'Risk-On', signal: 'Stocks ↑ + Commodities ↑ — Broad-based optimism, risk appetite strong' },
  { regime: 'Commodity Boom', signal: 'Oil ↑ + Copper ↑ + Commodity countries ↑ — Commodity super-cycle signals' },
  { regime: 'Tech/Semiconductor Shock', signal: 'Semiconductor countries ↓ together — Tech cycle downturn' },
  { regime: 'Country-Specific', signal: 'Only one country ↓ while peers stable — Idiosyncratic problem' },
]

function getRegimeColor(regime: string): string {
  const colors: Record<string, string> = {
    'Growth Scare': '#f59e0b',
    'Inflation Scare': '#ef4444',
    'Dollar Squeeze': '#ef4444',
    'Energy Shock': '#f97316',
    'Commodity Boom': '#22c55e',
    'Risk-On': '#22c55e',
    'Risk-Off': '#ef4444',
    'Credit Stress': '#ef4444',
    'Tech/Semiconductor Shock': '#8b5cf6',
    'Country-Specific': '#6366f1',
    'Neutral': '#94a3b8',
  }
  return colors[regime] || '#94a3b8'
}

function getRegimeIcon(regime: string): string {
  const icons: Record<string, string> = {
    'Growth Scare': '📉',
    'Inflation Scare': '🔥',
    'Dollar Squeeze': '💵',
    'Energy Shock': '⛽',
    'Commodity Boom': '📈',
    'Risk-On': '🟢',
    'Risk-Off': '🔴',
    'Credit Stress': '⚠️',
    'Tech/Semiconductor Shock': '🔧',
    'Country-Specific': '🎯',
    'Neutral': '⚖️',
  }
  return icons[regime] || '⚖️'
}
