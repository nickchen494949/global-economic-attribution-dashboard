import { useState, useEffect } from 'react';

interface BacktestResults {
  status: string;
  months_available: number;
  months_needed?: number;
  message?: string;
  date_range?: string;
  last_updated?: string;
  snapshots?: string[];
  labels?: Record<string, Record<string, {
    avg_return: number | null;
    std?: number;
    hit_rate?: number;
    information_ratio?: number;
    n_observations: number;
    note?: string;
  }>>;
}

export function BacktestPage() {
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/backtest_results.json')
      .then(r => r.json())
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <h1 className="page-title">Label Backtest</h1>
        <div className="glass-card-static" style={{ padding: '2rem', textAlign: 'center' }}>
          Loading backtest results...
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="page-content">
        <h1 className="page-title">Label Backtest</h1>
        <div className="glass-card-static" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No backtest results available yet.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Run <code>python3 scripts/backtest.py</code> to generate results.
          </p>
        </div>
      </div>
    );
  }

  const isInsufficient = results.status === 'insufficient_data';

  return (
    <div className="page-content">
      <h1 className="page-title">Label Backtest</h1>
      <p className="page-subtitle">
        Forward return validation — do labels predict future performance?
      </p>

      {/* Status card */}
      <div className="glass-card-static" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem', fontWeight: 600,
            background: isInsufficient ? 'var(--amber-subtle)' : 'var(--green-subtle)',
            color: isInsufficient ? 'var(--amber-text)' : 'var(--green-text)',
          }}>
            {isInsufficient ? '⏳ Accumulating Data' : '✓ Active'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {results.months_available} month(s) of data
            {results.date_range && ` · ${results.date_range}`}
          </span>
          {results.last_updated && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Updated: {results.last_updated.split('T')[0]}
            </span>
          )}
        </div>
      </div>

      {isInsufficient ? (
        <div className="glass-card-static" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Insufficient Data for Backtest
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            {results.message || `Need at least ${results.months_needed || 3} months of classification snapshots to compute forward returns.`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
            Each monthly pipeline run stores a classification snapshot. Backtest results will appear automatically once enough data accumulates.
          </p>
          {results.snapshots && results.snapshots.length > 0 && (
            <div style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Snapshots stored: </span>
              {results.snapshots.map((s, i) => (
                <span key={s} style={{
                  padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card-hover)', fontSize: '0.75rem',
                  marginLeft: i > 0 ? '0.25rem' : 0,
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Results table */
        <div className="glass-card-static" style={{ padding: '1.25rem', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
            Forward Return by Label
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Label</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>1M Avg</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>1M Hit%</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>1M IR</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>3M Avg</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>3M Hit%</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>3M IR</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Obs</th>
              </tr>
            </thead>
            <tbody>
              {results.labels && Object.entries(results.labels).map(([label, horizons]) => {
                const m1 = horizons['1M'] || {};
                const m3 = horizons['3M'] || {};
                return (
                  <tr key={label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{label}</td>
                    <td style={{
                      textAlign: 'right', padding: '0.5rem',
                      color: m1.avg_return != null ? (m1.avg_return > 0 ? 'var(--green-text)' : 'var(--red-text)') : 'var(--text-muted)',
                    }}>
                      {m1.avg_return != null ? `${m1.avg_return > 0 ? '+' : ''}${m1.avg_return.toFixed(3)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                      {m1.hit_rate != null ? `${(m1.hit_rate * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                      {m1.information_ratio != null ? m1.information_ratio.toFixed(2) : '—'}
                    </td>
                    <td style={{
                      textAlign: 'right', padding: '0.5rem',
                      color: m3.avg_return != null ? (m3.avg_return > 0 ? 'var(--green-text)' : 'var(--red-text)') : 'var(--text-muted)',
                    }}>
                      {m3.avg_return != null ? `${m3.avg_return > 0 ? '+' : ''}${m3.avg_return.toFixed(3)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                      {m3.hit_rate != null ? `${(m3.hit_rate * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                      {m3.information_ratio != null ? m3.information_ratio.toFixed(2) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>
                      {m1.n_observations || m3.n_observations || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Methodology */}
      <div className="glass-card-static" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Methodology</h3>
        <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: '1.5rem' }}>
          <li>Each monthly pipeline run stores a classification snapshot of all country scores</li>
          <li>Forward returns are computed as the change in composite z-score at T+1M and T+3M</li>
          <li>Hit rate = % of observations where forward return was positive</li>
          <li>Information ratio = avg return / std deviation of returns</li>
          <li>Minimum 3 observations required per cell</li>
          <li>Labels are classified from equity z-score, macro z-score, and sovereign spread thresholds</li>
        </ul>
      </div>
    </div>
  );
}
