import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TodayPage } from './components/today/TodayPage'
import { CountryDetailPage } from './components/country/CountryDetailPage'
import { PeerGroupPage } from './components/peers/PeerGroupPage'
import { FingerprintPage } from './components/fingerprint/FingerprintPage'
import { DataQualityPage } from './components/quality/DataQualityPage'
import { useDashboardData } from './hooks/useDashboardData'

const REFRESH_INTERVAL_SEC = 300; // 5 minutes

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const data = useDashboardData()
  const [refreshing, setRefreshing] = useState(false)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC)

  // Countdown timer for next auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return REFRESH_INTERVAL_SEC;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    setCountdown(REFRESH_INTERVAL_SEC);
    // Trigger the refresh via the window hook
    if ((window as any).__refreshDashboard) {
      (window as any).__refreshDashboard();
    }
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile menu toggle */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        {/* Refresh bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {data.is_sample_data ? '⚠ Sample data' : `✓ Live data · ${data.last_updated}`}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Next refresh: {formatCountdown(countdown)}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
              padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              transition: 'all 0.15s ease', opacity: refreshing ? 0.6 : 1,
            }}
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            >
              <path d="M1 7a6 6 0 0111.2-3M13 7a6 6 0 01-11.2 3" />
              <path d="M12.2 1v3h-3M1.8 13v-3h3" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {data.is_sample_data && (
          <div className="sample-data-banner">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a1 1 0 011 1v4a1 1 0 01-2 0V4a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
            </svg>
            <span>
              Displaying sample data for demonstration. Run <code style={{background:'rgba(255,255,255,0.1)', padding:'1px 6px', borderRadius:'4px', fontSize:'0.75rem'}}>python3 scripts/update_data.py</code> to fetch live market data.
            </span>
          </div>
        )}

        <Routes>
          <Route path="/" element={<TodayPage data={data} />} />
          <Route path="/country/:code" element={<CountryDetailPage data={data} />} />
          <Route path="/peers" element={<PeerGroupPage data={data} />} />
          <Route path="/fingerprint" element={<FingerprintPage data={data} />} />
          <Route path="/quality" element={<DataQualityPage data={data} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
