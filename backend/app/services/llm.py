from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Any, Dict

from langchain.schema import HumanMessage, SystemMessage
from langchain_community.chat_models import ChatOllama

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def _get_client() -> ChatOllama:
    return ChatOllama(
        base_url=settings.OLLAMA_HOST,
        model=settings.OLLAMA_MODEL,
        temperature=0.15,
    )


class LLMUnavailableError(RuntimeError):
    """Raised when the local LLM service cannot be reached."""


async def _invoke(system_prompt: str, user_prompt: str) -> str:
    def _run() -> str:
        try:
            response = _get_client().invoke(
                [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_prompt),
                ]
            )
            return response.content
        except Exception as exc:  # pylint: disable=broad-except
            raise LLMUnavailableError("Unable to reach local Ollama instance.") from exc

    return await asyncio.to_thread(_run)


async def extract_resume_insights(resume_text: str) -> Dict[str, Any]:
    prompt = (
        "You are a resume parsing assistant. Extract the following as JSON keys:\n"
        "summary, years_experience, top_skills (array), industries (array), "
        "keywords (array). Use concise bullet-style text. Resume:\n\n"
        f"{resume_text}"
    )
    try:
        raw = await _invoke("Return strictly valid JSON.", prompt)
        return _safe_json(raw)
    except LLMUnavailableError:
        return {
            "summary": resume_text[:200],
            "years_experience": None,
            "top_skills": [],
            "industries": [],
            "keywords": [],
        }


async def score_job_match(resume_text: str, job_description: str) -> float:
    prompt = (
        "Compare the user's resume and the job description. Return only a number between 0 and 100 "
        "representing the match score considering skills, experience level, and keywords.\n"
        f"Resume:\n{resume_text}\n\nJob:\n{job_description}"
    )
    raw = await _invoke("Return only the number.", prompt)
    try:
        return max(0.0, min(100.0, float(raw.strip())))
    except ValueError:
        return 50.0


async def generate_tailored_resume(
    resume_text: str,
    job_description: str,
    instructions: str | None = None,
    match_score: float | None = None,
) -> str:
    guidance = (
        "Rewrite the resume so it remains truthful but spotlights the most relevant achievements for the job. "
        "Return ONLY the finished resume text (no analysis, headings such as 'Thoughts', or explanations). "
        "Use ATS-friendly bullet points and replace em dashes with simple punctuation.\n"
        f"Job description:\n{job_description}\n\nOriginal resume:\n{resume_text}\n"
    )
    if match_score is not None:
        guidance += f"\nCurrent match score: {match_score:.1f}. Improve upon it.\n"
    if instructions:
        guidance += f"\nUser instructions: {instructions}\n"
    return await _invoke("You are an expert resume rewriter.", guidance)


async def generate_cover_letter(
    resume_text: str,
    job_description: str,
    company: str,
    instructions: str | None = None,
) -> str:
    guidance = (
        "Draft a personalized cover letter referencing the role and resume achievements. "
        "Return ONLY the final letter text (no commentary) with greeting, intro, two concise body paragraphs, and a closing. "
        "Avoid em dashes and keep under 220 words.\n"
        f"Company: {company}\nJob description:\n{job_description}\n\nResume:\n{resume_text}\n"
    )
    if instructions:
        guidance += f"\nAdditional instructions: {instructions}\n"
    return await _invoke("You are a top-tier tech recruiter and writer.", guidance)


async def adapt_text(action: str, text: str, job_description: str | None = None) -> str:
    instructions_map = {
        "regenerate": "Rewrite from scratch with improved clarity.",
        "improve": "Polish writing, fix grammar, strengthen impact.",
        "shorten": "Reduce length by 20% while keeping key substance.",
        "professional": "Increase formality and executive polish.",
        "match_jd": "Align language and keywords with the job description.",
    }
    extra = ""
    if job_description and action == "match_jd":
        extra = f"\nJob description:\n{job_description}\n"
    prompt = (
        f"{instructions_map.get(action, 'Improve this text for readability.')} "
        "Respond only with the rewritten text, no meta commentary, and avoid em dashes."
        f"{extra}\n\nOriginal text:\n{text}"
    )
    return await _invoke("You are a detail-oriented editor.", prompt)


def _safe_json(raw: str) -> Dict[str, Any]:
    import json

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "summary": raw[:250],
            "years_experience": None,
            "top_skills": [],
            "industries": [],
            "keywords": [],
        }
