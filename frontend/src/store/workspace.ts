import { create } from 'zustand'

import type { JobPosting, ResumeFile, TailoringRecord } from '../types'

type Setter<T> = T | ((prev: T) => T)

interface WorkspaceState {
  resumes: ResumeFile[]
  selectedResume: ResumeFile | null
  jobs: JobPosting[]
  selectedJob: JobPosting | null
  tailoring: TailoringRecord | null
  jobScores: Record<string, number>
  setResumes: (resumes: Setter<ResumeFile[]>) => void
  setSelectedResume: (resume: ResumeFile | null) => void
  setJobs: (jobs: Setter<JobPosting[]>) => void
  setSelectedJob: (job: JobPosting | null) => void
  setTailoring: (data: TailoringRecord | null) => void
  setJobScore: (jobId: string, score: number) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  resumes: [],
  selectedResume: null,
  jobs: [],
  selectedJob: null,
  tailoring: null,
  jobScores: {},
  setResumes: (resumes) =>
    set((state) => ({
      resumes: typeof resumes === 'function' ? (resumes as (prev: ResumeFile[]) => ResumeFile[])(state.resumes) : resumes,
    })),
  setSelectedResume: (selectedResume) => set({ selectedResume }),
  setJobs: (jobs) =>
    set((state) => {
      const nextJobs =
        typeof jobs === 'function' ? (jobs as (prev: JobPosting[]) => JobPosting[])(state.jobs) : jobs
      const shouldResetScores = typeof jobs !== 'function'
      return {
        jobs: nextJobs,
        jobScores: shouldResetScores ? {} : state.jobScores,
      }
    }),
  setSelectedJob: (selectedJob) =>
    set((state) => {
      const shouldResetTailoring =
        !!selectedJob && !!state.tailoring && state.tailoring.job_id !== selectedJob.id
      return {
        selectedJob,
        tailoring: shouldResetTailoring ? null : state.tailoring,
      }
    }),
  setTailoring: (tailoring) => set({ tailoring }),
  setJobScore: (jobId, score) =>
    set((state) => {
      const updatedJobs = state.jobs.map((job) =>
        job.id === jobId ? { ...job, match_score: score } : job,
      )
      return {
        jobScores: { ...state.jobScores, [jobId]: score },
        jobs: updatedJobs,
      }
    }),
}))
