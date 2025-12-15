import type {
  ApplicationRecord,
  DashboardSummary,
  JobPosting,
  JobScoreResponse,
  JobSearchQuery,
  ResumeFile,
  TailoringResponse,
} from '../types'
import { apiClient } from './client'

export const resumeApi = {
  upload: async (file: File): Promise<ResumeFile> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<ResumeFile>('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  list: async (): Promise<ResumeFile[]> => {
    const { data } = await apiClient.get<ResumeFile[]>('/resumes')
    return data
  },
  remove: async (resumeId: string): Promise<void> => {
    await apiClient.delete(`/resumes/${resumeId}`)
  },
}

export const jobApi = {
  search: async (payload: { query: JobSearchQuery; resume_id?: string | null }): Promise<JobPosting[]> => {
    const { data } = await apiClient.post<JobPosting[]>('/jobs/search', payload)
    return data
  },
  detail: async (jobId: string): Promise<JobPosting> => {
    const { data } = await apiClient.get<JobPosting>(`/jobs/${jobId}`)
    return data
  },
  score: async (jobId: string, resumeId: string): Promise<JobScoreResponse> => {
    const { data } = await apiClient.post<JobScoreResponse>(`/jobs/${jobId}/score`, { resume_id: resumeId })
    return data
  },
}

export const tailoringApi = {
  create: async (payload: { job_id: string; resume_id?: string | null; instructions?: string }): Promise<TailoringResponse> => {
    const { data } = await apiClient.post<TailoringResponse>('/tailoring', payload)
    return data
  },
  action: async (payload: { tailoring_id: string; action: 'regenerate' | 'improve' | 'shorten' | 'professional' | 'match_jd'; editor: 'resume' | 'cover_letter'; user_edits?: string }) => {
    const { data } = await apiClient.post<{ updated_text: string }>('/tailoring/actions', payload)
    return data
  },
  saveToDrive: async (payload: { tailoring_id: string; save_resume?: boolean; save_cover_letter?: boolean }) => {
    const { data } = await apiClient.post<{ resume_url?: string; cover_letter_url?: string }>('/tailoring/save', payload)
    return data
  },
}

export const dashboardApi = {
  summary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary')
    return data
  },
  applications: async (): Promise<ApplicationRecord[]> => {
    const { data } = await apiClient.get<ApplicationRecord[]>('/dashboard/applications')
    return data
  },
  updateStatus: async (payload: { job_id: string; status: ApplicationRecord['status']; notes?: string; applied_at?: string }) => {
    const { data } = await apiClient.post<ApplicationRecord>('/dashboard/applications/status', payload)
    return data
  },
  create: async (payload: { job_id: string; status?: ApplicationRecord['status']; notes?: string; applied_at?: string }) => {
    const { data } = await apiClient.post<ApplicationRecord>('/dashboard/applications', payload)
    return data
  },
  remove: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/dashboard/applications/${jobId}`)
  },
}
