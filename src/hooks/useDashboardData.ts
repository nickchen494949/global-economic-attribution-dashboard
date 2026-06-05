import { useState, useEffect, useCallback } from 'react'
import type { DashboardData } from '../lib/types'
import { adaptPipelineData } from '../lib/adapter'

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
let cachedData: DashboardData | null = null;
let lastFetchTime = 0;

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData | null>(cachedData)

  const loadData = useCallback(async (force: boolean = false) => {
    if (!force && cachedData && (Date.now() - lastFetchTime) < AUTO_REFRESH_INTERVAL) {
      setData(cachedData);
      return;
    }

    // Try live data first
    try {
      const response = await fetch(`./data/dashboard_data.json?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const rawData = await response.json();
        // Check if it's pipeline format (has global_futures) or DashboardData format
        let adapted: DashboardData;
        if (rawData.global_futures && !rawData.global_fingerprint) {
          adapted = adaptPipelineData(rawData);
        } else {
          adapted = rawData as DashboardData;
        }
        cachedData = adapted;
        lastFetchTime = Date.now();
        setData(adapted);
        return;
      }
    } catch { /* fall through */ }

    // Fall back to sample data
    if (!cachedData) {
      try {
        const mod: any = await import('../data/sample_data');
        cachedData = mod.sampleDashboardData;
        lastFetchTime = Date.now();
        setData(mod.sampleDashboardData);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => loadData(true), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    (window as any).__refreshDashboard = () => loadData(true);
    return () => { delete (window as any).__refreshDashboard; };
  }, [loadData]);

  if (!data) {
    return {
      countries: [],
      global_fingerprint: { assets: [], regime: 'Neutral', regime_confidence: 0, regime_explanation: 'Loading...', fingerprint_signals: [] },
      last_updated: new Date().toISOString().split('T')[0],
      data_version: 'loading',
      is_sample_data: true,
    };
  }
  return data;
}
