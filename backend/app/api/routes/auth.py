from __future__ import annotations

from datetime import datetime, timezone

from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import create_access_token, get_current_user
from app.db.session import get_session
from app.models.models import User
from app.schemas import AuthResponse, GoogleAuthURLResponse, Token, UserRead
from app.services.google import (
    credentials_from_tokens,
    exchange_code_for_tokens,
    fetch_google_profile,
    generate_google_auth_url,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/url", response_model=GoogleAuthURLResponse)
async def google_auth_url(redirect: str | None = None) -> GoogleAuthURLResponse:
    return GoogleAuthURLResponse(url=generate_google_auth_url(state=redirect))


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    creds = exchange_code_for_tokens(code)
    profile = await fetch_google_profile(creds.token)

    email = profile.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Unable to fetch Google profile email.")

    user = await _get_or_create_user(session, profile, creds)
    token = create_access_token(user.id)
    auth_response = AuthResponse(
        token=Token(access_token=token),
        user=UserRead(id=user.id, name=user.name, email=user.email),
    )

    if state:
        params = urlencode({"token": auth_response.token.access_token})
        return RedirectResponse(url=f"{state}?{params}", status_code=303)

    return auth_response


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead(id=current_user.id, name=current_user.name, email=current_user.email)


async def _get_or_create_user(session: AsyncSession, profile: dict, creds) -> User:
    result = await session.execute(select(User).where(User.email == profile["email"]))
    user = result.scalar_one_or_none()

    expires = creds.expiry or datetime.now(timezone.utc)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if user:
        user.name = profile.get("name") or user.name
        user.google_sub = profile.get("id") or user.google_sub
        user.google_access_token = creds.token
        user.google_refresh_token = creds.refresh_token or user.google_refresh_token
        user.google_token_expiry = expires
    else:
        user = User(
            name=profile.get("name") or profile.get("given_name") or "User",
            email=profile["email"],
            google_sub=profile.get("id"),
            google_access_token=creds.token,
            google_refresh_token=creds.refresh_token,
            google_token_expiry=expires,
        )
        session.add(user)

    await session.commit()
    await session.refresh(user)
    return user
