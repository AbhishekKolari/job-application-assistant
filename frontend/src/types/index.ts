export type MatchStatus = 'Not Applied' | 'Applied' | 'Interview' | 'Offer' | 'Rejected'

export interface UserProfile {
  id: string
  name: string
  email: string
}

export interface ResumeFile {
  resume_id: string
  file_url: string
  parsed_text: string
  uploaded_at: string
  original_filename?: string | null
}

export interface JobSearchQuery {
  title: string
  location?: string
  city?: string
  country?: string
  experience_level?: string
  work_mode?: 'remote' | 'hybrid' | 'on-site'
  salary_min?: number
  salary_max?: number
  include_keywords?: string[]
  exclude_keywords?: string[]
}

export interface JobPosting {
  id: string
  title: string
  company: string
  location: string
  description: string
  snippet?: string | null
  url: string
  application_link?: string | null
  match_score?: number | null
  work_mode?: string | null
  experience_level?: string | null
  skills: string[]
  posting_date?: string | null
  company_logo_url?: string | null
}

export interface JobScoreResponse {
  job_id: string
  match_score: number
}

export interface TailoringResponse {
  tailoring_id: string
  job_id: string
  tailored_resume_text: string
  tailored_coverletter_text: string
  match_score: number
}

export interface TailoringActionResponse {
  updated_text: string
}

export interface TailoringRecord extends TailoringResponse {
  drive_resume_url?: string | null
  drive_coverletter_url?: string | null
}

export interface ApplicationRecord {
  job_id: string
  job_title: string
  company: string
  status: string
  match_score?: number | null
  application_link?: string | null
  tailored_resume_url?: string | null
  tailored_cover_letter_url?: string | null
  updated_at: string
}

export interface DashboardSummary {
  total_jobs: number
  applied: number
  interviews: number
  offers: number
  rejections: number
  weekly_applications: Array<{ week: string; count: number }>
  status_over_time: Array<Record<string, number | string>>
}
