import { useState, useMemo, useEffect } from 'react'
import type { CountryData, CountryLabel } from '../../lib/types'

interface SearchFilterProps {
  countries: CountryData[]
  onFilter: (filtered: CountryData[]) => void
}

export function SearchFilter({ countries, onFilter }: SearchFilterProps) {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [labelFilter, setLabelFilter] = useState<string>('all')

  const regions = useMemo(() => {
    const set = new Set(countries.map(c => c.classification.region))
    return Array.from(set).sort()
  }, [countries])

  const stages = useMemo(() => {
    const set = new Set(countries.map(c => c.classification.development_stage))
    return Array.from(set).sort()
  }, [countries])

  const labels: CountryLabel[] = ['True Alpha', 'Fake Alpha', 'Hidden Alpha', 'Beta', 'Crisis Risk']

  useEffect(() => {
    let filtered = countries

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(c =>
        c.classification.country.toLowerCase().includes(s) ||
        c.classification.code.toLowerCase().includes(s) ||
        c.classification.ticker_equity?.toLowerCase().includes(s)
      )
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(c => c.classification.region === regionFilter)
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(c => c.classification.development_stage === stageFilter)
    }

    if (labelFilter !== 'all') {
      filtered = filtered.filter(c => c.label.label === labelFilter)
    }

    onFilter(filtered)
  }, [search, regionFilter, stageFilter, labelFilter, countries, onFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
        >
          <circle cx="7" cy="7" r="5" />
          <path d="M11 11l3 3" />
        </svg>
        <input
          className="search-input"
          type="text"
          placeholder="Search country, code, or ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Filter:</span>

        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '100px',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '100px',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={labelFilter}
          onChange={e => setLabelFilter(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '100px',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Labels</option>
          {labels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        {(search || regionFilter !== 'all' || stageFilter !== 'all' || labelFilter !== 'all') && (
          <button
            onClick={() => {
              setSearch('')
              setRegionFilter('all')
              setStageFilter('all')
              setLabelFilter('all')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '0.375rem 0.5rem',
            }}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
