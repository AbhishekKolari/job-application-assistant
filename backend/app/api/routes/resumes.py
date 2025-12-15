from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import get_current_user
from app.db.session import get_session
from app.models.models import ResumeFile, User
from app.schemas import ResumeUploadResponse
from app.services.parser import extract_text, save_upload_file

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ResumeUploadResponse:
    saved_path, original_name = await save_upload_file(file)
    parsed_text = extract_text(saved_path)

    resume = ResumeFile(
        user_id=current_user.id,
        file_url=str(saved_path),
        parsed_text=parsed_text,
        original_filename=original_name,
    )
    session.add(resume)
    await session.commit()
    await session.refresh(resume)

    return ResumeUploadResponse(
        resume_id=resume.id,
        file_url=resume.file_url,
        parsed_text=resume.parsed_text,
        uploaded_at=resume.created_at,
        original_filename=resume.original_filename,
    )


@router.get("/", response_model=list[ResumeUploadResponse])
async def list_resumes(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[ResumeUploadResponse]:
    result = await session.execute(
        select(ResumeFile).where(ResumeFile.user_id == current_user.id).order_by(ResumeFile.created_at.desc())
    )
    resumes = result.scalars().all()
    return [
        ResumeUploadResponse(
            resume_id=res.id,
            file_url=res.file_url,
            parsed_text=res.parsed_text,
            uploaded_at=res.created_at,
            original_filename=res.original_filename,
        )
        for res in resumes
    ]


@router.delete("/{resume_id}", status_code=204, response_class=Response)
async def delete_resume(
    resume_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    resume = await session.get(ResumeFile, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found.")

    file_path = Path(resume.file_url)
    await session.delete(resume)
    await session.commit()

    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        pass

    return Response(status_code=204)
