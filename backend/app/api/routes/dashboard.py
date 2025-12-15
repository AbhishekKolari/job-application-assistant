from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.security import get_current_user
from app.db.session import get_session
from app.models.models import (
    ApplicationStatus,
    ApplicationStatusEnum,
    JobPosting,
    JobSearchHistory,
    ResumeTailoring,
    User,
)
from app.schemas import (
    ApplicationRecord,
    ApplicationCreateRequest,
    ApplicationStatusUpdate,
    DashboardSummary,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DashboardSummary:
    statuses = await _fetch_statuses(session, current_user.id)
    counts = defaultdict(int)
    for status in statuses:
        counts[status.status] += 1

    weekly_data = _aggregate_weekly(statuses)
    status_over_time = _status_over_time(statuses)

    return DashboardSummary(
        total_jobs=len(statuses),
        applied=counts[ApplicationStatusEnum.APPLIED],
        interviews=counts[ApplicationStatusEnum.INTERVIEW],
        offers=counts[ApplicationStatusEnum.OFFER],
        rejections=counts[ApplicationStatusEnum.REJECTED],
        weekly_applications=weekly_data,
        status_over_time=status_over_time,
    )


@router.get("/applications", response_model=list[ApplicationRecord])
async def list_applications(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[ApplicationRecord]:
    statuses = await _fetch_statuses(session, current_user.id)
    records: list[ApplicationRecord] = []
    for status in statuses:
        job = status.job_posting
        if not job:
            continue
        resume_url = await _latest_tailoring_url(session, current_user.id, job.id, "resume")
        cover_url = await _latest_tailoring_url(session, current_user.id, job.id, "cover_letter")
        records.append(
            ApplicationRecord(
                job_id=job.id,
                job_title=job.title,
                company=job.company,
                status=status.status,
                match_score=job.match_score,
                application_link=job.application_link or job.url,
                tailored_resume_url=resume_url,
                tailored_cover_letter_url=cover_url,
                updated_at=status.updated_at,
            )
        )
    return records


@router.post("/applications", response_model=ApplicationRecord, status_code=201)
async def create_application(
    payload: ApplicationCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ApplicationRecord:
    job_stmt = (
        select(JobPosting)
        .join(JobSearchHistory, JobPosting.search_id == JobSearchHistory.id)
        .where(JobPosting.id == payload.job_id, JobSearchHistory.user_id == current_user.id)
    )
    job_result = await session.execute(job_stmt)
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    existing_stmt = select(ApplicationStatus).where(
        ApplicationStatus.user_id == current_user.id,
        ApplicationStatus.job_id == payload.job_id,
    )
    existing_result = await session.execute(existing_stmt)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Job already tracked.")

    status_entry = ApplicationStatus(
        user_id=current_user.id,
        job_id=payload.job_id,
        status=payload.status,
        notes=payload.notes,
        applied_at=payload.applied_at,
    )
    session.add(status_entry)
    await session.commit()
    await session.refresh(status_entry)

    resume_url = await _latest_tailoring_url(session, current_user.id, job.id, "resume")
    cover_url = await _latest_tailoring_url(session, current_user.id, job.id, "cover_letter")

    return ApplicationRecord(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        status=status_entry.status,
        match_score=job.match_score,
        application_link=job.application_link or job.url,
        tailored_resume_url=resume_url,
        tailored_cover_letter_url=cover_url,
        updated_at=status_entry.updated_at,
    )


@router.post("/applications/status", response_model=ApplicationRecord)
async def update_application_status(
    payload: ApplicationStatusUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ApplicationRecord:
    job = await session.get(JobPosting, payload.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    result = await session.execute(
        select(ApplicationStatus).where(
            ApplicationStatus.user_id == current_user.id,
            ApplicationStatus.job_id == job.id,
        )
    )
    status_entry = result.scalar_one_or_none()
    if status_entry:
        status_entry.status = payload.status
        status_entry.notes = payload.notes
        status_entry.applied_at = payload.applied_at
        status_entry.updated_at = datetime.utcnow()
    else:
        status_entry = ApplicationStatus(
            user_id=current_user.id,
            job_id=job.id,
            status=payload.status,
            notes=payload.notes,
            applied_at=payload.applied_at,
        )
        session.add(status_entry)

    await session.commit()
    await session.refresh(status_entry)

    resume_url = await _latest_tailoring_url(session, current_user.id, job.id, "resume")
    cover_url = await _latest_tailoring_url(session, current_user.id, job.id, "cover_letter")

    return ApplicationRecord(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        status=status_entry.status,
        match_score=job.match_score,
        application_link=job.application_link or job.url,
        tailored_resume_url=resume_url,
        tailored_cover_letter_url=cover_url,
        updated_at=status_entry.updated_at,
    )


@router.delete("/applications/{job_id}", status_code=204, response_class=Response)
async def delete_application(
    job_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    stmt = (
        select(ApplicationStatus)
        .options(selectinload(ApplicationStatus.job_posting))
        .where(ApplicationStatus.user_id == current_user.id, ApplicationStatus.job_id == job_id)
    )
    result = await session.execute(stmt)
    status_entry = result.scalar_one_or_none()
    if not status_entry:
        raise HTTPException(status_code=404, detail="Application not found.")

    await session.delete(status_entry)
    await session.commit()


async def _fetch_statuses(session: AsyncSession, user_id: str) -> list[ApplicationStatus]:
    result = await session.execute(
        select(ApplicationStatus)
        .where(ApplicationStatus.user_id == user_id)
        .order_by(ApplicationStatus.updated_at.desc())
        .options(selectinload(ApplicationStatus.job_posting))
    )
    return result.scalars().all()


def _aggregate_weekly(statuses: list[ApplicationStatus]) -> list[dict]:
    now = datetime.utcnow()
    start = now - timedelta(weeks=6)
    buckets = defaultdict(int)

    for status in statuses:
        event_date = status.applied_at or status.updated_at
        if event_date and event_date >= start:
            week_label = event_date.strftime("%Y-%W")
            buckets[week_label] += 1

    return [{"week": week, "count": buckets[week]} for week in sorted(buckets.keys())]


def _status_over_time(statuses: list[ApplicationStatus]) -> list[dict]:
    history = defaultdict(lambda: defaultdict(int))
    for status in statuses:
        event_date = (status.applied_at or status.updated_at or datetime.utcnow()).date().isoformat()
        history[event_date][status.status] += 1
    output = []
    for day in sorted(history.keys()):
        row = {"date": day}
        row.update(history[day])
        output.append(row)
    return output


async def _latest_tailoring_url(
    session: AsyncSession,
    user_id: str,
    job_id: str,
    kind: str,
) -> str | None:
    stmt = (
        select(ResumeTailoring)
        .where(ResumeTailoring.user_id == user_id, ResumeTailoring.job_id == job_id)
        .order_by(ResumeTailoring.updated_at.desc())
    )
    result = await session.execute(stmt)
    tailoring = result.scalars().first()
    if not tailoring:
        return None
    return tailoring.drive_resume_url if kind == "resume" else tailoring.drive_coverletter_url
