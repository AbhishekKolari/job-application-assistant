from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, HttpUrl

from app.models.models import ApplicationStatusEnum


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    token: Token
    user: "UserRead"


class GoogleAuthURLResponse(BaseModel):
    url: HttpUrl


class UserRead(BaseModel):
    id: str
    name: str
    email: EmailStr


class ResumeUploadResponse(BaseModel):
    resume_id: str
    file_url: str
    parsed_text: str
    uploaded_at: datetime
    original_filename: Optional[str] = None


class JobSearchQuery(BaseModel):
    title: str
    location: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    experience_level: Optional[str] = None
    work_mode: Optional[Literal["remote", "hybrid", "on-site"]] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    include_keywords: List[str] = []
    exclude_keywords: List[str] = []


class JobPostingRead(BaseModel):
    id: str
    title: str
    company: str
    location: str
    description: str
    snippet: Optional[str] = None
    url: HttpUrl
    application_link: Optional[HttpUrl] = None
    match_score: Optional[float] = None
    work_mode: Optional[str] = None
    experience_level: Optional[str] = None
    skills: List[str] = []
    posting_date: Optional[datetime] = None
    company_logo_url: Optional[HttpUrl] = None


class JobSearchRequest(BaseModel):
    query: JobSearchQuery
    resume_id: Optional[str] = None


class JobScoreRequest(BaseModel):
    resume_id: str


class JobScoreResponse(BaseModel):
    job_id: str
    match_score: float


class TailoringRequest(BaseModel):
    job_id: str
    resume_id: Optional[str] = None
    instructions: Optional[str] = None


class TailoringResponse(BaseModel):
    tailoring_id: str
    job_id: str
    tailored_resume_text: str
    tailored_coverletter_text: str
    match_score: float


class TailoringActionRequest(BaseModel):
    tailoring_id: str
    action: Literal["regenerate", "improve", "shorten", "professional", "match_jd"]
    editor: Literal["resume", "cover_letter"]
    user_edits: Optional[str] = None


class TailoringActionResponse(BaseModel):
    updated_text: str


class SaveToDriveRequest(BaseModel):
    tailoring_id: str
    save_resume: bool = True
    save_cover_letter: bool = True


class SaveToDriveResponse(BaseModel):
    resume_url: Optional[HttpUrl] = None
    cover_letter_url: Optional[HttpUrl] = None


class TailoringRecord(TailoringResponse):
    drive_resume_url: Optional[str] = None
    drive_coverletter_url: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    job_id: str
    status: ApplicationStatusEnum
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None


class ApplicationCreateRequest(BaseModel):
    job_id: str
    status: ApplicationStatusEnum = ApplicationStatusEnum.NOT_APPLIED
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None


class DashboardSummary(BaseModel):
    total_jobs: int
    applied: int
    interviews: int
    offers: int
    rejections: int
    weekly_applications: List[dict]
    status_over_time: List[dict]


class ApplicationRecord(BaseModel):
    job_id: str
    job_title: str
    company: str
    status: ApplicationStatusEnum
    match_score: Optional[float] = None
    application_link: Optional[HttpUrl] = None
    tailored_resume_url: Optional[HttpUrl] = None
    tailored_cover_letter_url: Optional[HttpUrl] = None
    updated_at: datetime


UserRead.model_rebuild()
AuthResponse.model_rebuild()
