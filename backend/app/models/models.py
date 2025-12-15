from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, JSON, DateTime
from sqlmodel import Field, Relationship, SQLModel


class TimestampedBase(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class User(TimestampedBase, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, index=True)
    name: str
    email: str = Field(index=True, unique=True)
    google_sub: Optional[str] = Field(default=None, unique=True, index=True)
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_token_expiry: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    resumes: list["ResumeFile"] = Relationship(back_populates="user")
    searches: list["JobSearchHistory"] = Relationship(back_populates="user")
    tailorings: list["ResumeTailoring"] = Relationship(back_populates="user")
    applications: list["ApplicationStatus"] = Relationship(back_populates="user")


class ResumeFile(TimestampedBase, table=True):
    __tablename__ = "resume_files"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, index=True)
    user_id: str = Field(foreign_key="users.id")
    file_url: str
    parsed_text: str
    original_filename: Optional[str] = None

    user: User = Relationship(back_populates="resumes")


class JobSearchHistory(TimestampedBase, table=True):
    __tablename__ = "job_search_history"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, index=True)
    user_id: str = Field(foreign_key="users.id")
    query_parameters: dict = Field(sa_column=Column(JSON))

    user: User = Relationship(back_populates="searches")
    postings: list["JobPosting"] = Relationship(back_populates="search")


class JobPosting(TimestampedBase, table=True):
    __tablename__ = "job_postings"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, index=True)
    search_id: str = Field(foreign_key="job_search_history.id")
    title: str
    company: str
    location: str
    description: str
    snippet: Optional[str] = None
    url: str
    application_link: Optional[str] = None
    match_score: Optional[float] = None
    work_mode: Optional[str] = None
    experience_level: Optional[str] = None
    skills: Optional[list[str]] = Field(default=None, sa_column=Column(JSON))
    posting_date: Optional[datetime] = None
    company_logo_url: Optional[str] = None

    search: JobSearchHistory = Relationship(back_populates="postings")
    tailorings: list["ResumeTailoring"] = Relationship(back_populates="job_posting")
    applications: list["ApplicationStatus"] = Relationship(back_populates="job_posting")


class ResumeTailoring(TimestampedBase, table=True):
    __tablename__ = "resume_tailorings"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, index=True)
    user_id: str = Field(foreign_key="users.id")
    job_id: str = Field(foreign_key="job_postings.id")
    tailored_resume_text: str
    tailored_coverletter_text: str
    match_score: float = Field(default=0.0)
    saved_to_drive: bool = Field(default=False)
    drive_resume_url: Optional[str] = None
    drive_coverletter_url: Optional[str] = None

    user: User = Relationship(back_populates="tailorings")
    job_posting: JobPosting = Relationship(back_populates="tailorings")


class ApplicationStatusEnum(str, Enum):
    NOT_APPLIED = "Not Applied"
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    OFFER = "Offer"
    REJECTED = "Rejected"


class ApplicationStatus(TimestampedBase, table=True):
    __tablename__ = "application_status"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True, index=True)
    user_id: str = Field(foreign_key="users.id")
    job_id: str = Field(foreign_key="job_postings.id")
    status: str = Field(default=ApplicationStatusEnum.NOT_APPLIED)
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None

    user: User = Relationship(back_populates="applications")
    job_posting: JobPosting = Relationship(back_populates="applications")
