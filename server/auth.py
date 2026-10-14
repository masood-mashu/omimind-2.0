"""Supabase Auth verification for user-facing API routes."""

from __future__ import annotations

import logging
import os

import httpx
from fastapi import Header, HTTPException

logger = logging.getLogger("omimind.auth")


def require_user_id(authorization: str | None = Header(default=None)) -> str:
    """Validate the caller's Supabase access token and return its verified user ID."""
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    if not supabase_url or not publishable_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to access your meeting memory")

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authentication session")

    try:
        response = httpx.get(
            f"{supabase_url}/auth/v1/user",
            headers={"apikey": publishable_key, "Authorization": f"Bearer {token}"},
            timeout=8.0,
        )
    except httpx.HTTPError as exc:
        logger.warning("Supabase identity check failed (%s)", exc.__class__.__name__)
        raise HTTPException(status_code=503, detail="Could not verify your sign-in right now") from exc

    if response.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="Your sign-in has expired. Please sign in again")
    if response.status_code != 200:
        logger.warning("Supabase identity check returned HTTP %s", response.status_code)
        raise HTTPException(status_code=503, detail="Could not verify your sign-in right now")

    try:
        user_id = str(response.json().get("id", "")).strip()
    except (ValueError, AttributeError):
        user_id = ""
    if not user_id:
        raise HTTPException(status_code=401, detail="Sign-in did not provide a user identity")
    return user_id
