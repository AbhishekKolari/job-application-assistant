import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { jobApi } from '../api/routes'
import { useWorkspaceStore } from '../store/workspace'
import type { JobSearchQuery } from '../types'

const COUNTRY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'United States', value: 'us' },
  { label: 'Netherlands', value: 'nl' },
  { label: 'United Arab Emirates', value: 'ae' },
  { label: 'Canada', value: 'ca' },
  { label: 'United Kingdom', value: 'gb' },
  { label: 'Germany', value: 'de' },
  { label: 'France', value: 'fr' },
  { label: 'India', value: 'in' },
  { label: 'Singapore', value: 'sg' },
  { label: 'Australia', value: 'au' },
  { label: 'Other / Not listed', value: '' },
]

const WORK_MODE_OPTIONS: Array<{ label: string; value: 'remote' | 'hybrid' | 'on-site' }> = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'On-site', value: 'on-site' },
]

const formatLocation = (city?: string | null, country?: string | null) => {
  const cityPart = city?.trim()
  const countryPart = country?.trim()
  if (cityPart && countryPart) {
    return `${cityPart}, ${countryPart.toUpperCase()}`
  }
  return cityPart || (countryPart ? countryPart.toUpperCase() : undefined)
}

const defaultQuery: JobSearchQuery = {
  title: 'AI Engineer',
  city: 'Amsterdam',
  country: 'nl',
  location: formatLocation('Amsterdam', 'nl'),
  experience_level: 'mid',
  work_mode: 'remote',
  include_keywords: ['AI', 'automation'],
  exclude_keywords: [],
}

export const JobSearchForm = () => {
  const navigate = useNavigate()
  const { selectedResume, setJobs } = useWorkspaceStore()

  const [query, setQuery] = useState<JobSearchQuery>(defaultQuery)
  const [smartFiltersEnabled, setSmartFiltersEnabled] = useState(false)
  const [includeKeywordsInput, setIncludeKeywordsInput] = useState((defaultQuery.include_keywords ?? []).join(', '))
  const [excludeKeywordsInput, setExcludeKeywordsInput] = useState((defaultQuery.exclude_keywords ?? []).join(', '))

  const searchMutation = useMutation({
    mutationFn: () =>
      jobApi.search({
        query,
        resume_id: selectedResume?.resume_id,
      }),
    onSuccess: (jobs) => {
      setJobs(jobs)
      navigate('/results')
    },
  })

  const updateQuery = <K extends keyof JobSearchQuery>(field: K, value: JobSearchQuery[K]) => {
    setQuery((prev) => ({ ...prev, [field]: value }))
  }

  const handleCityChange = (value: string) => {
    setQuery((prev) => {
      const city = value || undefined
      return {
        ...prev,
        city,
        location: formatLocation(city, prev.country),
      }
    })
  }

  const handleCountryChange = (value: string) => {
    setQuery((prev) => {
      const country = value || undefined
      return {
        ...prev,
        country,
        location: formatLocation(prev.city, country),
      }
    })
  }

  const handleKeywordInput = (value: string, field: 'include_keywords' | 'exclude_keywords') => {
    const tokens = value
      .split(',')
      .map((kw) => kw.trim())
      .filter(Boolean)
    setQuery((prev) => ({ ...prev, [field]: tokens }))
    if (field === 'include_keywords') {
      setIncludeKeywordsInput(value)
    } else {
      setExcludeKeywordsInput(value)
    }
  }

  const canSearch = Boolean(selectedResume)

  const handleSelect =
    <K extends 'experience_level' | 'work_mode'>(field: K) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateQuery(field, event.target.value as JobSearchQuery[K])
    }

  return (
    <section className="glass-card" style={{ padding: '1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="text-muted" style={{ margin: 0 }}>
            Step 2
          </p>
          <h3 style={{ margin: 0 }}>Define your ideal role</h3>
          <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)' }}>
            We’ll pull live postings and score them against your resume.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={smartFiltersEnabled}
          onClick={() => setSmartFiltersEnabled((prev) => !prev)}
          className="pill"
          style={{
            background: smartFiltersEnabled ? 'rgba(99,102,241,0.18)' : 'rgba(148,163,184,0.2)',
            color: smartFiltersEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={16} />
          {smartFiltersEnabled ? 'Smart filters on' : 'Smart filters off'}
        </button>
      </header>

      <form
        style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSearch) return
          searchMutation.mutate()
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span className="text-muted">Role title</span>
            <div className="input-shell">
              <Search size={16} />
              <input value={query.title} onChange={(e) => updateQuery('title', e.target.value)} required />
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span className="text-muted">City</span>
            <div className="input-shell">
              <MapPin size={16} />
              <input
                value={query.city ?? ''}
                onChange={(e) => handleCityChange(e.target.value)}
                placeholder="e.g. Singapore"
              />
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span className="text-muted">Country</span>
            <div className="input-shell select-shell">
              <select
                value={query.country ?? ''}
                onChange={(e) => handleCountryChange(e.target.value)}
                style={{ background: 'transparent', border: 'none', width: '100%', color: 'var(--text-primary)' }}
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value || 'other'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span className="text-muted">Experience level</span>
            <div className="input-shell select-shell">
              <select
                value={query.experience_level}
                onChange={handleSelect('experience_level')}
                style={{ background: 'transparent', border: 'none', width: '100%', color: 'var(--text-primary)' }}
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </select>
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="text-muted">Work mode</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {WORK_MODE_OPTIONS.map((option) => {
              const active = query.work_mode === option.value
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => updateQuery('work_mode', option.value)}
                  className="pill"
                  style={{
                    border: active ? '1px solid transparent' : '1px solid var(--border-color)',
                    background: active ? 'var(--accent-primary)' : 'var(--bg-muted)',
                    color: active ? '#fff' : 'var(--text-primary)',
                    fontWeight: 600,
                    padding: '0.4rem 0.8rem',
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {smartFiltersEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span className="text-muted">Min salary ($)</span>
              <div className="input-shell">
                <input
                  type="number"
                  min="0"
                  value={query.salary_min !== undefined ? String(query.salary_min) : ''}
                  onChange={(e) => updateQuery('salary_min', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 120000"
                />
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span className="text-muted">Max salary ($)</span>
              <div className="input-shell">
                <input
                  type="number"
                  min="0"
                  value={query.salary_max !== undefined ? String(query.salary_max) : ''}
                  onChange={(e) => updateQuery('salary_max', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 180000"
                />
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span className="text-muted">Include keywords</span>
              <div className="input-shell">
                <input
                  placeholder="LLM, automation..."
                  value={includeKeywordsInput}
                  onChange={(e) => handleKeywordInput(e.target.value, 'include_keywords')}
                />
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span className="text-muted">Exclude keywords</span>
              <div className="input-shell">
                <input
                  placeholder="contract, unpaid..."
                  value={excludeKeywordsInput}
                  onChange={(e) => handleKeywordInput(e.target.value, 'exclude_keywords')}
                />
              </div>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {!canSearch && (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Upload a resume first so we can score matches accurately.
            </span>
          )}
          <button
            className="accent-button"
            type="submit"
            disabled={searchMutation.isPending || !canSearch}
            style={{ justifySelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {searchMutation.isPending ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Find matching jobs
          </button>
        </div>
      </form>
    </section>
  )
}
