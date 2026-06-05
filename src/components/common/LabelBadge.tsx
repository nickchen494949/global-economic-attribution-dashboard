import type { CountryLabel } from '../../lib/types'

interface LabelBadgeProps {
  label: CountryLabel
  size?: 'sm' | 'md'
}

const labelConfig: Record<CountryLabel, { className: string; icon: string }> = {
  'True Alpha': { className: 'label-badge--true-alpha', icon: '◆' },
  'Fake Alpha': { className: 'label-badge--fake-alpha', icon: '◇' },
  'Hidden Alpha': { className: 'label-badge--hidden-alpha', icon: '◈' },
  'Beta': { className: 'label-badge--beta', icon: '●' },
  'Crisis Risk': { className: 'label-badge--crisis-risk', icon: '▲' },
  'Positive Drift': { className: 'label-badge--positive-drift', icon: '📈' },
  'Negative Drift': { className: 'label-badge--negative-drift', icon: '📉' },
  'Unclassified': { className: 'label-badge--unclassified', icon: '○' },
}

export function LabelBadge({ label, size = 'md' }: LabelBadgeProps) {
  const config = labelConfig[label] || labelConfig['Unclassified']
  const sizeStyle = size === 'sm' ? { fontSize: '0.6875rem', padding: '0.125rem 0.5rem' } : {}

  return (
    <span className={`label-badge ${config.className}`} style={sizeStyle}>
      <span>{config.icon}</span>
      {label}
    </span>
  )
}
