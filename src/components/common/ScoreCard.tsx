interface ScoreCardProps {
  label: string
  value: number | null
  percentile: number | null
  detail?: string
  size?: 'sm' | 'md' | 'lg'
}

export function getScoreColor(percentile: number | null): string {
  if (percentile === null) return 'var(--color-missing)'
  if (percentile >= 60) return 'var(--color-strong)'
  if (percentile >= 40) return 'var(--color-neutral)'
  return 'var(--color-weak)'
}

export function getPercentileLabel(p: number | null): string {
  if (p === null) return 'N/A'
  if (p >= 80) return 'Very Strong'
  if (p >= 60) return 'Strong'
  if (p >= 40) return 'Neutral'
  if (p >= 20) return 'Weak'
  return 'Very Weak'
}

export function ScoreCard({ label, value, percentile, detail, size = 'md' }: ScoreCardProps) {
  const color = getScoreColor(percentile)
  const pLabel = getPercentileLabel(percentile)

  const valueFontSize = size === 'lg' ? '2.25rem' : size === 'sm' ? '1.25rem' : '1.75rem'

  return (
    <div className="glass-card score-card">
      <div className="score-label">{label}</div>
      <div className="score-value" style={{ color, fontSize: valueFontSize }}>
        {value !== null ? value.toFixed(1) : '—'}
      </div>
      {percentile !== null && (
        <div style={{ marginBottom: '0.5rem' }}>
          <PercentileBar percentile={percentile} />
        </div>
      )}
      <div className="score-detail">
        {percentile !== null ? (
          <span>
            <span style={{ color }}>{pLabel}</span>
            {' · '}
            <span>{percentile.toFixed(0)}th percentile</span>
          </span>
        ) : (
          <span className="data-unavailable">Data unavailable</span>
        )}
        {detail && <span> · {detail}</span>}
      </div>
    </div>
  )
}

interface PercentileBarProps {
  percentile: number
  height?: number
}

export function PercentileBar({ percentile, height = 6 }: PercentileBarProps) {
  const color = getScoreColor(percentile)

  return (
    <div className="percentile-bar" style={{ height }}>
      <div
        className="percentile-bar-fill"
        style={{
          width: `${Math.min(100, Math.max(0, percentile))}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
        }}
      />
    </div>
  )
}
