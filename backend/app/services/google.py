from __future__ import annotations

import io
from datetime import datetime, timezone
from types import MethodType
from typing import Optional

import httpx
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google_auth_oauthlib.flow import Flow

from app.core.config import get_settings

settings = get_settings()


def _build_flow() -> Flow:
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "project_id": "job-application-assistant",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "javascript_origins": [],
            }
        },
        scopes=settings.GOOGLE_SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    return flow


def generate_google_auth_url(state: Optional[str] = None) -> str:
    flow = _build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
    )
    return auth_url


def exchange_code_for_tokens(code: str) -> Credentials:
    flow = _build_flow()
    flow.fetch_token(code=code)
    return flow.credentials


async def fetch_google_profile(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


def build_drive_client(creds: Credentials):
    return build("drive", "v3", credentials=creds)


def normalize_expiry(expiry: datetime | None) -> datetime:
    if expiry is None:
        return datetime.now(timezone.utc)
    if expiry.tzinfo is None:
        return expiry.replace(tzinfo=timezone.utc)
    return expiry.astimezone(timezone.utc)


def _google_expiry(expiry: datetime | None) -> datetime | None:
    if expiry is None:
        return None
    return normalize_expiry(expiry).replace(tzinfo=None)


def credentials_from_tokens(access_token: str, refresh_token: str, expiry: datetime | None) -> Credentials:
    normalized_expiry = normalize_expiry(expiry)
    creds = Credentials(
        access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=settings.GOOGLE_SCOPES,
        expiry=_google_expiry(normalized_expiry),
    )
    _patch_refresh(creds)
    _patch_before_request(creds)
    return creds


def _patch_refresh(creds: Credentials) -> None:
    original_refresh = creds.refresh

    def _refresh(self, request, **kwargs):  # type: ignore[override]
        original_refresh(request, **kwargs)
        if self.expiry is not None:
            self.expiry = _google_expiry(self.expiry)

    creds.refresh = MethodType(_refresh, creds)


def _patch_before_request(creds: Credentials) -> None:
    original_before_request = creds.before_request

    def _before_request(self, request, method, url, headers):  # type: ignore[override]
        if self.expiry is not None:
            self.expiry = _google_expiry(self.expiry)
        return original_before_request(request, method, url, headers)

    creds.before_request = MethodType(_before_request, creds)


def upload_text_document_to_drive(
    *,
    creds: Credentials,
    file_name: str,
    mime_type: str,
    content: str,
) -> str:
    drive = build_drive_client(creds)
    media = MediaIoBaseUpload(io.BytesIO(content.encode("utf-8")), mimetype=mime_type)
    file_metadata = {"name": file_name}
    created = drive.files().create(body=file_metadata, media_body=media, fields="id, webViewLink").execute()
    return created["webViewLink"]
