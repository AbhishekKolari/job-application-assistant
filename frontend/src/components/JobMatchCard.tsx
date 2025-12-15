import { Link } from 'react-router-dom'
import { Building2, MapPin, ExternalLink, WandSparkles, FilePlus2, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import type { JobPosting } from '../types'
import { scoreToColor, truncate } from '../utils/format'
import { useWorkspaceStore } from '../store/workspace'
import { dashboardApi, jobApi } from '../api/routes'

interface JobMatchCardProps {
  job: JobPosting
}

export const JobMatchCard = ({ job }: JobMatchCardProps) => {
  const { setSelectedJob, selectedResume, jobScores, setJobScore } = useWorkspaceStore()
  const [expanded, setExpanded] = useState(false)
  const storedScore = jobScores[job.id] ?? job.match_score ?? null
  const [score, setScore] = useState<number | null>(storedScore)
  const [trackerAdded, setTrackerAdded] = useState(false)
  const [trackerError, setTrackerError] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)

  useEffect(() => {
    setScore(storedScore)
  }, [storedScore])

  const scoreMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResume) throw new Error('Select a resume first to compute match scores.')
      const response = await jobApi.score(job.id, selectedResume.resume_id)
      return response.match_score
    },
    onSuccess: (value) => {
      setScore(value)
      setJobScore(job.id, value)
      setInlineError(null)
    },
    onError: (error: unknown) => {
      setInlineError(error instanceof Error ? error.message : 'Unable to score job right now.')
    },
  })

  const trackerMutation = useMutation({
    mutationFn: async () => {
      setTrackerError(null)
      await dashboardApi.create({ job_id: job.id })
    },
    onSuccess: () => {
      setTrackerAdded(true)
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        if (error.message.includes('Job already tracked')) {
          setTrackerAdded(true)
          return
        }
        setTrackerError(error.message)
      } else {
        setTrackerError('Something went wrong. Try again.')
      }
    },
  })

  const handleToggle = () => {
    setExpanded((prev) => !prev)
  }

  const descriptionPreview = useMemo(() => truncate(job.description, 220), [job.description])
  const isTruncated = job.description.length > 220

  return (
    <article
      className="glass-card"
      style={{
        padding: '1.1rem',
        display: 'grid',
        gap: '0.5rem',
        borderRadius: 20,
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h4 style={{ margin: 0 }}>{job.title}</h4>
          <p style={{ margin: '0.2rem 0', color: 'var(--text-muted)' }}>
            <Building2 size={14} style={{ marginRight: 6 }} />
            {job.company}
          </p>
          <p style={{ margin: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <MapPin size={13} />
            {job.location} · {job.work_mode?.toUpperCase()}
          </p>
        </div>
        <div style={{ textAlign: 'right', minWidth: 140 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Match score</p>
          {score !== null ? (
            <strong style={{ fontSize: 24, color: scoreToColor(score) }}>{score.toFixed(0)}%</strong>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!selectedResume) {
                  setInlineError('Select a resume before scoring.')
                  return
                }
                scoreMutation.mutate()
              }}
              disabled={!selectedResume || scoreMutation.isPending}
              className="pill"
              style={{
                border: '1px solid var(--border-color)',
                background: 'transparent',
                width: '100%',
                justifyContent: 'center',
                marginTop: 4,
                cursor: selectedResume ? 'pointer' : 'not-allowed',
              }}
            >
              {scoreMutation.isPending ? <Loader2 size={16} className="spin" /> : 'Score job'}
            </button>
          )}
          {!selectedResume && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upload & select a resume to score</span>
          )}
          {inlineError && (
            <span style={{ fontSize: 12, color: '#f97316', display: 'block' }}>{inlineError}</span>
          )}
        </div>
      </div>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>{expanded ? job.description : descriptionPreview}</p>
      {isTruncated && (
        <button
          type="button"
          onClick={handleToggle}
          className="pill"
          style={{
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            width: 'fit-content',
          }}
        >
          {expanded ? 'Hide details' : 'See more'}
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {job.skills?.slice(0, 4).map((skill) => (
            <span key={skill} className="pill" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', fontSize: 12 }}>
              {skill}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => trackerMutation.mutate()}
            disabled={trackerAdded || trackerMutation.isPending}
            className="pill"
            style={{
              border: '1px solid var(--border-color)',
              color: trackerAdded ? '#22c55e' : 'var(--text-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {trackerMutation.isPending ? <Loader2 size={14} className="spin" /> : <FilePlus2 size={14} />}
            {trackerAdded ? 'Added' : 'Add to tracker'}
          </button>
          <Link
            to="/workspace"
            onClick={() => setSelectedJob(job)}
            className="pill"
            style={{ background: 'rgba(87,99,255,0.15)', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <WandSparkles size={15} />
            Tailor
          </Link>
          <a href={job.application_link || job.url} target="_blank" rel="noreferrer" className="pill" style={{ border: '1px solid var(--border-color)' }}>
            Apply <ExternalLink size={14} />
          </a>
        </div>
      </div>
      {trackerError && (
        <p style={{ margin: 0, color: '#f97316', fontSize: 12 }}>
          {trackerError}
        </p>
      )}
    </article>
  )
}
