import { useLocation, useNavigate } from 'react-router-dom'
import { Filter } from 'lucide-react'

import { JobMatchCard } from '../components/JobMatchCard'
import { useWorkspaceStore } from '../store/workspace'

export const JobResultsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const instructions = (location.state as { instructions?: string })?.instructions
  const { jobs, jobScores } = useWorkspaceStore()

  if (jobs.length === 0) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <section
          className="glass-card"
          style={{
            padding: '2rem',
            maxWidth: 560,
            textAlign: 'center',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <p className="pill" style={{ width: 'fit-content', justifySelf: 'center' }}>
            No matches yet
          </p>
          <h2 style={{ margin: 0 }}>We couldn’t find roles for that search</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Try a different city or broaden the title/keywords. Some regions require a specific country selection for the job API.
          </p>
          {instructions && (
            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>
              “{instructions}”
            </p>
          )}
          <button
            className="accent-button"
            onClick={() => navigate('/', { state: { focusSearch: true } })}
            style={{ justifySelf: 'center', marginTop: '0.5rem' }}
          >
            Refine search
          </button>
        </section>
      </div>
    )
  }

  const scoredCount = jobs.filter((job) => typeof (jobScores[job.id] ?? job.match_score) === 'number').length

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '0.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="pill" style={{ background: 'rgba(99,102,241,0.12)', width: 'fit-content' }}>
              Search snapshot
            </p>
            <h2 style={{ margin: '0.2rem 0' }}>{jobs.length} tailored matches</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Score each role as you review it to surface the most promising leads. Add to the tracker when you’re ready.
            </p>
            {instructions && (
              <p style={{ marginTop: '0.4rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                “{instructions}”
              </p>
            )}
          </div>
          <button
            className="accent-button"
            onClick={() => navigate('/', { state: { focusSearch: true } })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          >
            <Filter size={16} />
            Refine search
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          }}
        >
          <MetricCard label="Roles scored" value={scoredCount.toString()} />
          <MetricCard label="Remote roles" value={`${jobs.filter((j) => j.work_mode === 'remote').length}`} />
          <MetricCard label="New this week" value={jobs.filter((j) => !!j.posting_date).length.toString()} />
        </div>
      </section>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {jobs.map((job) => (
          <JobMatchCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div
    className="glass-card"
    style={{
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem',
      borderRadius: 20,
    }}
  >
    <span className="text-muted" style={{ fontSize: 13 }}>
      {label}
    </span>
    <strong style={{ fontSize: 22 }}>{value}</strong>
  </div>
)
