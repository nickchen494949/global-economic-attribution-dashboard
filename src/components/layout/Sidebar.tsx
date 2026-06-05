import { NavLink } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {

  const navItems = [
    { path: '/', label: 'Today', icon: <TodayIcon /> },
    { path: '/peers', label: 'Peer Groups', icon: <PeersIcon /> },
    { path: '/fingerprint', label: 'Global Fingerprint', icon: <FingerprintIcon /> },
    { path: '/quality', label: 'Data Quality', icon: <QualityIcon /> },
    { path: '/backtest', label: 'Backtest', icon: <BacktestIcon /> },
  ]

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0
        }}>
          🌐
        </div>
        <h1>Global Economic Attribution</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
            end={item.path === '/'}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '0 1.25rem', marginTop: 'auto' }}>
        <div style={{
          padding: '0.75rem',
          background: 'rgba(99, 102, 241, 0.06)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(99, 102, 241, 0.12)',
        }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Framework
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Attribution-first analysis.<br/>
            No predictions. No signals.
          </div>
        </div>
      </div>
    </aside>
  )
}

function TodayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="3" />
      <path d="M6 6h1M11 6h1M6 10h6" />
    </svg>
  )
}

function PeersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="12" cy="12" r="3" />
      <path d="M9 3l3 3M9 15l-3-3" />
    </svg>
  )
}

function FingerprintIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9h3l2-4 3 8 2-4h4" />
    </svg>
  )
}

function QualityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v12h12" />
      <path d="M7 11V8M10 11V6M13 11V4" />
    </svg>
  )
}

function BacktestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14l4-4 3 3 7-7" />
      <path d="M12 6h4v4" />
    </svg>
  )
}
