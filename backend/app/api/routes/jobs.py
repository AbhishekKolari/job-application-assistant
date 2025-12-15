from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import get_current_user
from app.db.session import get_session
from app.models.models import JobPosting, JobSearchHistory, ResumeFile, User
from app.schemas import JobPostingRead, JobScoreRequest, JobScoreResponse, JobSearchRequest
from app.services.job_search import fetch_job_postings
from app.services import llm

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/search", response_model=list[JobPostingRead])
async def search_jobs(
    payload: JobSearchRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[JobPostingRead]:
    resume_text = None
    if payload.resume_id:
        result = await session.execute(
            select(ResumeFile).where(
                ResumeFile.id == payload.resume_id,
                ResumeFile.user_id == current_user.id,
            )
        )
        resume = result.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")
        resume_text = resume.parsed_text

    search = JobSearchHistory(user_id=current_user.id, query_parameters=payload.query.model_dump())
    session.add(search)
    await session.flush()

    jobs = await fetch_job_postings(payload.query, resume_text)

    db_jobs: list[JobPosting] = []
    for job in jobs:
        db_job = JobPosting(
            search_id=search.id,
            title=job["title"],
            company=job["company"],
            location=job["location"],
            description=job["description"],
            snippet=job.get("snippet"),
            url=job["url"] or job.get("application_link") or "",
            application_link=job.get("application_link"),
            match_score=job["match_score"],
            work_mode=job.get("work_mode"),
            experience_level=str(job.get("experience_level")) if job.get("experience_level") else None,
            skills=job.get("skills"),
            posting_date=job.get("posting_date"),
            company_logo_url=job.get("company_logo_url"),
        )
        session.add(db_job)
        db_jobs.append(db_job)

    await session.commit()

    return [
        JobPostingRead(
            id=db_job.id,
            title=db_job.title,
            company=db_job.company,
            location=db_job.location,
            description=db_job.description,
            snippet=db_job.snippet,
            url=db_job.url,
            application_link=db_job.application_link,
            match_score=db_job.match_score,
            work_mode=db_job.work_mode,
            experience_level=db_job.experience_level,
            skills=db_job.skills or [],
            posting_date=db_job.posting_date,
            company_logo_url=db_job.company_logo_url,
        )
        for db_job in db_jobs
    ]


@router.get("/{job_id}", response_model=JobPostingRead)
async def get_job_detail(
    job_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> JobPostingRead:
    stmt = (
        select(JobPosting)
        .join(JobSearchHistory, JobPosting.search_id == JobSearchHistory.id)
        .where(JobPosting.id == job_id, JobSearchHistory.user_id == current_user.id)
    )
    result = await session.execute(stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobPostingRead(
        id=job.id,
        title=job.title,
        company=job.company,
        location=job.location,
        description=job.description,
        snippet=job.snippet,
        url=job.url,
        application_link=job.application_link,
        match_score=job.match_score,
        work_mode=job.work_mode,
        experience_level=job.experience_level,
        skills=job.skills or [],
        posting_date=job.posting_date,
        company_logo_url=job.company_logo_url,
    )


@router.post("/{job_id}/score", response_model=JobScoreResponse)
async def score_job_match(
    job_id: str,
    payload: JobScoreRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> JobScoreResponse:
    job_stmt = (
        select(JobPosting)
        .join(JobSearchHistory, JobPosting.search_id == JobSearchHistory.id)
        .where(JobPosting.id == job_id, JobSearchHistory.user_id == current_user.id)
    )
    result = await session.execute(job_stmt)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    resume_stmt = select(ResumeFile).where(
        ResumeFile.id == payload.resume_id,
        ResumeFile.user_id == current_user.id,
    )
    resume_result = await session.execute(resume_stmt)
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    score = await llm.score_job_match(resume.parsed_text, job.description)
    job.match_score = score
    job.updated_at = datetime.utcnow()
    await session.commit()

    return JobScoreResponse(job_id=job.id, match_score=score)
