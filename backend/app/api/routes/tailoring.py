from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import get_current_user
from app.db.session import get_session
from app.models.models import JobPosting, ResumeFile, ResumeTailoring, User
from app.schemas import (
    SaveToDriveRequest,
    SaveToDriveResponse,
    TailoringActionRequest,
    TailoringActionResponse,
    TailoringRequest,
    TailoringResponse,
)
from app.services import llm
from app.services.google import (
    credentials_from_tokens,
    normalize_expiry,
    upload_text_document_to_drive,
)

router = APIRouter(prefix="/tailoring", tags=["tailoring"])


@router.post("/", response_model=TailoringResponse)
async def create_tailoring(
    payload: TailoringRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> TailoringResponse:
    resume = await _get_resume(session, payload.resume_id, current_user.id)
    job = await _get_job(session, payload.job_id)

    match_score = await llm.score_job_match(resume.parsed_text, job.description)
    tailored_resume = await llm.generate_tailored_resume(
        resume.parsed_text, job.description, payload.instructions, match_score
    )
    cover_letter = await llm.generate_cover_letter(
        resume.parsed_text, job.description, job.company, payload.instructions
    )

    tailoring = ResumeTailoring(
        user_id=current_user.id,
        job_id=job.id,
        tailored_resume_text=tailored_resume,
        tailored_coverletter_text=cover_letter,
        match_score=match_score,
    )
    session.add(tailoring)
    await session.commit()
    await session.refresh(tailoring)

    return TailoringResponse(
        tailoring_id=tailoring.id,
        job_id=job.id,
        tailored_resume_text=tailoring.tailored_resume_text,
        tailored_coverletter_text=tailoring.tailored_coverletter_text,
        match_score=match_score,
    )


@router.post("/actions", response_model=TailoringActionResponse)
async def tailoring_action(
    payload: TailoringActionRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> TailoringActionResponse:
    tailoring = await session.get(ResumeTailoring, payload.tailoring_id)
    if not tailoring or tailoring.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tailoring not found.")

    job = await session.get(JobPosting, tailoring.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    text = payload.user_edits or (
        tailoring.tailored_resume_text if payload.editor == "resume" else tailoring.tailored_coverletter_text
    )
    updated_text = await llm.adapt_text(payload.action, text, job.description)

    if payload.editor == "resume":
        tailoring.tailored_resume_text = updated_text
    else:
        tailoring.tailored_coverletter_text = updated_text

    await session.commit()

    return TailoringActionResponse(updated_text=updated_text)


@router.post("/save", response_model=SaveToDriveResponse)
async def save_to_drive(
    payload: SaveToDriveRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SaveToDriveResponse:
    tailoring = await session.get(ResumeTailoring, payload.tailoring_id)
    if not tailoring or tailoring.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tailoring not found.")

    job = await session.get(JobPosting, tailoring.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if not current_user.google_access_token or not current_user.google_refresh_token or not current_user.google_token_expiry:
        raise HTTPException(status_code=400, detail="User missing Google Drive tokens.")

    normalized_expiry = normalize_expiry(current_user.google_token_expiry)
    if normalized_expiry != current_user.google_token_expiry:
        current_user.google_token_expiry = normalized_expiry
        await session.commit()

    creds = credentials_from_tokens(
        current_user.google_access_token,
        current_user.google_refresh_token,
        normalized_expiry,
    )

    resume_url = cover_letter_url = None

    if payload.save_resume:
        resume_url = upload_text_document_to_drive(
            creds=creds,
            file_name=f"resume_{job.title}_{job.company}.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            content=tailoring.tailored_resume_text,
        )

    if payload.save_cover_letter:
        cover_letter_url = upload_text_document_to_drive(
            creds=creds,
            file_name=f"coverletter_{job.title}_{job.company}.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            content=tailoring.tailored_coverletter_text,
        )

    tailoring.saved_to_drive = True
    tailoring.drive_resume_url = resume_url
    tailoring.drive_coverletter_url = cover_letter_url
    await session.commit()

    return SaveToDriveResponse(resume_url=resume_url, cover_letter_url=cover_letter_url)


async def _get_resume(session: AsyncSession, resume_id: str | None, user_id: str) -> ResumeFile:
    if resume_id:
        resume = await session.get(ResumeFile, resume_id)
        if resume and resume.user_id == user_id:
            return resume
        raise HTTPException(status_code=404, detail="Resume not found.")
    result = await session.execute(select(ResumeFile).where(ResumeFile.user_id == user_id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=400, detail="Please upload a resume first.")
    return resume


async def _get_job(session: AsyncSession, job_id: str) -> JobPosting:
    job = await session.get(JobPosting, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
