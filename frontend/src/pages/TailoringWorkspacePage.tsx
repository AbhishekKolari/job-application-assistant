import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Loader2, WandSparkles, RefreshCw, Sliders, Sparkles, Scissors, Save } from 'lucide-react'

import { TailoringEditor } from '../components/TailoringEditor'
import { useWorkspaceStore } from '../store/workspace'
import { tailoringApi } from '../api/routes'
import { scoreToColor } from '../utils/format'

const ACTIONS = [
  { key: 'regenerate', label: 'Regenerate', icon: RefreshCw },
  { key: 'improve', label: 'Polish tone', icon: Sparkles },
  { key: 'shorten', label: 'Tighten', icon: Scissors },
  { key: 'professional', label: 'Make formal', icon: Sliders },
  { key: 'match_jd', label: 'Match JD', icon: WandSparkles },
] as const

export const TailoringWorkspacePage = () => {
  const navigate = useNavigate()
  const { selectedJob, selectedResume, tailoring, setTailoring, jobScores, setJobScore } = useWorkspaceStore()
  const [instructions, setInstructions] = useState('')
  const [resumeText, setResumeText] = useState(tailoring?.tailored_resume_text ?? '')
  const [coverLetterText, setCoverLetterText] = useState(tailoring?.tailored_coverletter_text ?? '')
  const tailoringMatchesJob = useMemo(
    () => !!tailoring && !!selectedJob && tailoring.job_id === selectedJob.id,
    [tailoring, selectedJob],
  )

  const cachedScore =
    (selectedJob && jobScores[selectedJob.id]) ??
    (tailoringMatchesJob && tailoring ? tailoring.match_score : selectedJob?.match_score ?? null)

  useEffect(() => {
    if (!selectedJob || !selectedResume) {
      navigate('/', { replace: true })
    }
  }, [selectedJob, selectedResume, navigate])

  useEffect(() => {
    if (tailoringMatchesJob && tailoring) {
      setResumeText(tailoring.tailored_resume_text)
      setCoverLetterText(tailoring.tailored_coverletter_text)
    } else if (selectedJob) {
      setResumeText('')
      setCoverLetterText('')
    }
  }, [tailoring, tailoringMatchesJob, selectedJob])

  useEffect(() => {
    setInstructions('')
  }, [selectedJob?.id])

  const generateMutation = useMutation({
    mutationFn: () =>
      tailoringApi.create({
        job_id: selectedJob!.id,
        resume_id: selectedResume?.resume_id,
        instructions: instructions || undefined,
      }),
    onSuccess: (data) => {
      setTailoring({
        ...data,
        drive_resume_url: undefined,
        drive_coverletter_url: undefined,
      })
      setResumeText(data.tailored_resume_text)
      setCoverLetterText(data.tailored_coverletter_text)
      setJobScore(data.job_id, data.match_score)
    },
  })

  const actionMutation = useMutation({
    mutationFn: (payload: { action: (typeof ACTIONS)[number]['key']; editor: 'resume' | 'cover_letter'; content: string }) =>
      tailoringApi.action({
        tailoring_id: tailoring!.tailoring_id,
        action: payload.action,
        editor: payload.editor,
        user_edits: payload.content,
      }),
    onSuccess: (data, variables) => {
      if (variables.editor === 'resume') {
        setResumeText(data.updated_text)
      } else {
        setCoverLetterText(data.updated_text)
      }
    },
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      tailoringApi.saveToDrive({
        tailoring_id: tailoring!.tailoring_id,
        save_resume: true,
        save_cover_letter: true,
      }),
    onSuccess: (data) => {
      if (tailoring) {
        setTailoring({
          ...tailoring,
          drive_resume_url: data.resume_url,
          drive_coverletter_url: data.cover_letter_url,
        })
      }
    },
  })

  if (!selectedJob || !selectedResume) return null

  const canTailor = !!selectedJob && !!selectedResume

  const handleAction = (action: (typeof ACTIONS)[number]['key'], editor: 'resume' | 'cover_letter') => {
    if (!tailoring) return
    const content = editor === 'resume' ? resumeText : coverLetterText
    actionMutation.mutate({ action, editor, content })
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="pill" style={{ background: 'rgba(99,102,241,0.12)', width: 'fit-content' }}>
              Tailoring for {selectedJob.company}
            </p>
            <h2 style={{ margin: 0 }}>{selectedJob.title}</h2>
            <p style={{ margin: '0.3rem 0', color: 'var(--text-muted)', maxWidth: 640 }}>{selectedJob.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {typeof cachedScore === 'number' ? (
                <span
                  className="pill"
                  style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-color)',
                    color: scoreToColor(cachedScore),
                    fontWeight: 600,
                  }}
                >
                  Match score · {cachedScore.toFixed(1)}%
                </span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Score this role from the results page to see it here.
                </span>
              )}
            </div>
          </div>
          <div style={{ minWidth: 220 }}>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add optional instructions (tone, highlights, metrics)..."
              style={{
                width: '100%',
                borderRadius: 16,
                border: '1px solid var(--border-color)',
                padding: '0.8rem 1rem',
                resize: 'none',
                fontFamily: 'inherit',
                background: 'var(--bg-muted)',
              }}
            />
          </div>
        </div>
        <button
          className="accent-button"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !canTailor}
          style={{ justifySelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {generateMutation.isPending ? <Loader2 className="spin" size={18} /> : <WandSparkles size={18} />}
          Generate tailored package
        </button>
      </section>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={() => handleAction(action.key, 'resume')}
              disabled={!tailoring || actionMutation.isPending}
              className="pill"
              style={{
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: tailoring ? 'pointer' : 'not-allowed',
                opacity: actionMutation.isPending ? 0.6 : 1,
              }}
            >
              <Icon size={16} />
              {action.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <TailoringEditor
          label="Tailored resume"
          initialContent={resumeText}
          onChange={setResumeText}
          placeholder="Resume content will appear here after generation."
          readonly={!tailoring}
        />
        <TailoringEditor
          label="Cover letter"
          initialContent={coverLetterText}
          onChange={setCoverLetterText}
          placeholder="Cover letter content will appear here after generation."
          readonly={!tailoring}
        />
      </div>

      <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0 }}>
            Export directly to Google Drive to keep your tailored documents organized. Requires Google auth connection.
          </p>
          {tailoring?.drive_resume_url && (
            <p style={{ margin: 0, fontSize: 13 }}>
              Saved links:{' '}
              <a href={tailoring.drive_resume_url} target="_blank" rel="noreferrer">
                Resume
              </a>{' '}
              ·{' '}
              <a href={tailoring.drive_coverletter_url ?? '#'} target="_blank" rel="noreferrer">
                Cover letter
              </a>
            </p>
          )}
        </div>
        <button
          className="accent-button"
          onClick={() => saveMutation.mutate()}
          disabled={!tailoring || saveMutation.isPending}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          {saveMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
          Save to Drive
        </button>
      </div>
    </div>
  )
}
