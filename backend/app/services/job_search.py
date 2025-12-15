from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4

import httpx

from app.core.config import get_settings
from app.schemas import JobSearchQuery

settings = get_settings()

COUNTRY_ALIASES: Dict[str, str] = {
    "united states": "us",
    "united states of america": "us",
    "usa": "us",
    "us": "us",
    "canada": "ca",
    "ca": "ca",
    "netherlands": "nl",
    "united arab emirates": "ae",
    "uae": "ae",
    "united kingdom": "gb",
    "uk": "gb",
    "great britain": "gb",
    "england": "gb",
    "germany": "de",
    "france": "fr",
    "india": "in",
    "singapore": "sg",
    "australia": "au",
}


async def fetch_job_postings(query: JobSearchQuery, resume_text: str | None = None) -> List[Dict[str, Any]]:
    """Fetch job postings from external provider or fall back to curated samples."""
    provider = settings.JOB_SEARCH_PROVIDER.lower()
    if provider == "jsearch" and settings.JOB_SEARCH_API_KEY:
        jobs = await _fetch_from_jsearch(query)
    else:
        jobs = _fallback_jobs(query)

    for job in jobs:
        job.setdefault("match_score", None)
    return jobs


async def _fetch_from_jsearch(query: JobSearchQuery) -> List[Dict[str, Any]]:
    location_fragment = (query.city or query.location or "").strip()
    search_query = query.title.strip()
    if location_fragment:
        search_query = f"{search_query} in {location_fragment}"

    params = {
        "query": search_query,
        "page": 1,
        "num_pages": 1,
    }
    country_code = _country_code(query.country)
    if country_code:
        params["country"] = country_code
    if query.city:
        params["city"] = query.city
    headers = {"x-rapidapi-key": settings.JOB_SEARCH_API_KEY, "x-rapidapi-host": "jsearch.p.rapidapi.com"}
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get("https://jsearch.p.rapidapi.com/search", params=params, headers=headers)
        resp.raise_for_status()
        payload = resp.json()
    data = payload.get("data", [])
    results = []
    for job in data:
        work_mode = job.get("job_is_remote")
        if isinstance(work_mode, bool):
            work_mode = "remote" if work_mode else "on-site"
        elif work_mode is not None:
            work_mode = str(work_mode)

        results.append(
            {
                "id": job.get("job_id") or str(uuid4()),
                "title": job.get("job_title", query.title),
                "company": job.get("employer_name", "Unknown"),
                "location": job.get("job_city") or job.get("job_country") or query.location or query.city or query.country or "Remote",
                "description": job.get("job_description", ""),
                "snippet": job.get("job_highlights", {}).get("Qualifications", [""])[0] if job.get("job_highlights") else "",
                "url": job.get("job_google_link") or job.get("job_apply_link") or "",
                "application_link": job.get("job_apply_link"),
                "work_mode": work_mode,
                "experience_level": job.get("job_required_experience", {}).get("required_experience_in_months"),
                "skills": job.get("job_required_skills") or [],
                "posting_date": _parse_date(job.get("job_posted_at_datetime_utc")),
                "company_logo_url": job.get("employer_logo"),
            }
        )
    return results


def _fallback_jobs(query: JobSearchQuery) -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    fallback_location = query.city or query.location or "Remote"
    return [
        {
            "id": str(uuid4()),
            "title": query.title,
            "company": "Lumina Analytics",
            "location": fallback_location,
            "description": (
                "We are looking for a driven professional to own end-to-end data workflows, partner "
                "with product teams, and present insights to executives."

                "Join the experimentation platform team to build scalable ML-powered products. "
                "You will lead experimentation design, collaborate with engineering, and present findings."

                "Join the experimentation platform team to build scalable ML-powered products. "
                "You will lead experimentation design, collaborate with engineering, and present findings."
            ),
            "snippet": "Partner with cross-functional teams, build dashboards, drive insights.",
            "url": "https://example.com/jobs/lumina",
            "application_link": "https://example.com/jobs/lumina/apply",
            # "match_score": 72.0,
            "work_mode": query.work_mode or "hybrid",
            "experience_level": query.experience_level or "mid",
            "skills": ["SQL", "Python", "Looker"],
            "posting_date": now,
            "company_logo_url": None,
        },
        {
            "id": str(uuid4()),
            "title": query.title,
            "company": "Nova Research",
            "location": fallback_location,
            "description": (
                "Join the experimentation platform team to build scalable ML-powered products. "
                "You will lead experimentation design, collaborate with engineering, and present findings."
            ),
            "snippet": "Lead experimentation design and communicate results.",
            "url": "https://example.com/jobs/nova",
            "application_link": "https://example.com/jobs/nova/apply",
            # "match_score": 65.0,
            "work_mode": "remote",
            "experience_level": "senior",
            "skills": ["Python", "ML", "Airflow"],
            "posting_date": now,
            "company_logo_url": None,
        },
    ]


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        return None


def _country_code(country: str | None) -> str | None:
    if not country:
        return None
    cleaned = country.strip().lower()
    if not cleaned:
        return None
    if len(cleaned) == 2 and cleaned.isalpha():
        return cleaned
    return COUNTRY_ALIASES.get(cleaned)
