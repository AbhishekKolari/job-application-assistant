import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CloudUpload, FileText, Loader2, Trash2 } from 'lucide-react'

import { resumeApi } from '../api/routes'
import { useWorkspaceStore } from '../store/workspace'
import type { ResumeFile } from '../types'

const getFileName = (resume: ResumeFile) => resume.original_filename || resume.file_url.split('/').pop() || 'resume.pdf'
const formatTimestamp = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const ResumeUploadCard = () => {
  const { setResumes, setSelectedResume, selectedResume, resumes: cachedResumes } = useWorkspaceStore()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: fetchedResumes = [], isLoading: isFetchingResumes } = useQuery<ResumeFile[]>({
    queryKey: ['resumes'],
    queryFn: () => resumeApi.list(),
  })

  useEffect(() => {
    const sameLength = cachedResumes.length === fetchedResumes.length
    const sameOrder =
      sameLength &&
      cachedResumes.every((resume, index) => resume.resume_id === fetchedResumes[index]?.resume_id)

    if (!sameOrder) {
      setResumes(fetchedResumes)
    }

    if (!selectedResume && fetchedResumes.length > 0) {
      setSelectedResume(fetchedResumes[0])
    }
  }, [fetchedResumes, cachedResumes, selectedResume, setResumes, setSelectedResume])

  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file),
    onSuccess: (resume) => {
      setResumes((prev) => {
        const next = [resume, ...prev.filter((r) => r.resume_id !== resume.resume_id)]
        return next
      })
      setSelectedResume(resume)
      queryClient.setQueryData<ResumeFile[]>(['resumes'], (prev) => {
        if (!prev) return [resume]
        return [resume, ...prev.filter((r) => r.resume_id !== resume.resume_id)]
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (resumeId: string) => resumeApi.remove(resumeId),
    onSuccess: (_, resumeId) => {
      setResumes((prev) => {
        const next = prev.filter((r) => r.resume_id !== resumeId)
        if (selectedResume?.resume_id === resumeId) {
          setSelectedResume(next[0] ?? null)
        }
        return next
      })
      queryClient.setQueryData<ResumeFile[]>(['resumes'], (prev) => prev?.filter((r) => r.resume_id !== resumeId) ?? [])
    },
    onSettled: () => {
      setPendingDeleteId(null)
    },
  })

  const hasResumes = cachedResumes.length > 0
  const uploadLabel = hasResumes ? 'Upload new version' : 'Upload resume'

  const orderedResumes = useMemo(
    () =>
      [...cachedResumes].sort(
        (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
      ),
    [cachedResumes],
  )

  const handleUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        uploadMutation.mutate(file)
      }
    },
    [uploadMutation],
  )

  const handleDelete = useCallback(
    (resumeId: string) => {
      setPendingDeleteId(resumeId)
      deleteMutation.mutate(resumeId)
    },
    [deleteMutation],
  )

  return (
    <section className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="text-muted" style={{ margin: 0 }}>
            Step 1
          </p>
          <h3 style={{ margin: 0 }}>Upload your base resume</h3>
          <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)' }}>
            We parse your resume to personalize every job recommendation.
          </p>
        </div>
        <label className="accent-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
          {uploadMutation.isPending ? <Loader2 size={18} className="spin" /> : <CloudUpload size={18} />}
          {uploadLabel}
          <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
      </div>
      <div
        style={{
          marginTop: '1.25rem',
          background: 'var(--bg-muted)',
          borderRadius: 16,
          padding: '1rem',
          border: '1px dashed var(--border-color)',
        }}
      >
        {isFetchingResumes || uploadMutation.isPending ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Loader2 size={18} className="spin" />
            <span>Processing resume…</span>
          </div>
        ) : selectedResume ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={22} color="var(--accent-primary)" />
            <div>
              <strong>{getFileName(selectedResume)}</strong>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                Uploaded {formatTimestamp(selectedResume.uploaded_at)}
              </p>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>No resume uploaded yet.</p>
        )}
      </div>
      {hasResumes && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Uploaded resumes
          </p>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {orderedResumes.map((resume) => {
              const isActive = selectedResume?.resume_id === resume.resume_id
              const isDeleting = pendingDeleteId === resume.resume_id && deleteMutation.isPending
              return (
                <div
                  key={resume.resume_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isActive ? 'rgba(105,114,255,0.12)' : 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 16,
                    padding: '0.4rem 0.8rem',
                    gap: '0.6rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedResume(resume)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      flex: 1,
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: 14 }}>{getFileName(resume)}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Uploaded {formatTimestamp(resume.uploaded_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(resume.resume_id)}
                    disabled={isDeleting}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: isDeleting ? 'wait' : 'pointer',
                      padding: 4,
                    }}
                    aria-label={`Delete ${getFileName(resume)}`}
                  >
                    {isDeleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
