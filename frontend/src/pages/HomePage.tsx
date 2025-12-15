import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { ResumeUploadCard } from '../components/ResumeUploadCard'
import { JobSearchForm } from '../components/JobSearchForm'

export const HomePage = () => {
  const location = useLocation()
  const searchRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (location.state?.focusSearch && searchRef.current) {
      searchRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.state])

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        className="glass-card"
        style={{
          padding: '2.5rem',
          display: 'grid',
          gap: '1.25rem',
          background: 'linear-gradient(130deg, rgba(99,102,241,0.12), rgba(38,198,218,0.1))',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '2.75rem', maxWidth: 960, justifySelf: 'center', lineHeight: 1.15 }}>
          Accelerate every job application with
          <span className="gradient-text" style={{ display: 'block', marginTop: '0.35rem' }}>
            LLM-powered tailoring
          </span>
        </h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: 960, justifySelf: 'center' }}>
          Upload once, search across top job boards, and spin up ATS-friendly resumes and cover letters tuned to each description.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div className="pill" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            Match scoring
          </div>
          <div className="pill" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            Google Drive export
          </div>
          <div className="pill" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            Dashboard insights
          </div>
        </div>
      </section>
      <ResumeUploadCard />
      <section ref={searchRef}>
        <JobSearchForm />
      </section>
    </div>
  )
}
