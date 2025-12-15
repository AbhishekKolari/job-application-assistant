from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile
from pypdf import PdfReader
from docx import Document

from app.core.config import get_settings

settings = get_settings()


async def save_upload_file(upload_file: UploadFile) -> tuple[Path, str]:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_suffix = Path(upload_file.filename or "").suffix or ".bin"
    unique_name = f"{uuid.uuid4()}{file_suffix}"
    destination = settings.UPLOAD_DIR / unique_name

    async with aiofiles.open(destination, "wb") as out_file:
        while chunk := await upload_file.read(1024 * 1024):
            await out_file.write(chunk)

    original_name = upload_file.filename or unique_name
    await upload_file.close()
    return destination, original_name


def extract_text(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(file_path)
    if suffix in {".docx", ".doc"}:
        return _extract_docx(file_path)
    return file_path.read_text(encoding="utf-8", errors="ignore")


def _extract_pdf(path: Path) -> str:
    reader = PdfReader(path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(path: Path) -> str:
    document = Document(path)
    return "\n".join(paragraph.text for paragraph in document.paragraphs)
