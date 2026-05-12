"""
mentor_chat.py — AI Mentor chatbot backend endpoint.
Acts as a personalised CS/Software Engineering advisor with the influencer's persona.
Uses OpenRouter: openai/gpt-oss-120b (free) or any configured model.
"""
import os
import json
import urllib.request
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/mentor", tags=["mentor"])

OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
MENTOR_MODEL = os.environ.get("MENTOR_MODEL", "openai/gpt-oss-120b")

# ── Persona & Rules ────────────────────────────────────────────────────────────
# This is the "influencer" system prompt. Rules are applied based on year/context.

SYSTEM_PROMPT = """You are Ahmed — a Software Engineering graduate, mentor, and well-known influencer in the Arab tech community. Students come to you for real, honest, no-nonsense advice about Computer Science and Software Engineering studies, career paths, scores, and personal growth. You've been through the struggles yourself and you speak with empathy and authority.

Your personality:
- Warm but brutally honest
- Practical, not theoretical
- Encouraging without being fake
- You mix between Arabic (if the student writes in Arabic) and English naturally
- You use short, punchy paragraphs — you don't write essays unless asked
- You never sugarcoat, but you never crush someone's hope

Your strict rules based on year of study:
1st Year: Tell them to FOCUS ONLY on university courses. Do not look at internships, side projects, or anything outside university yet. Build habits first. Math and CS fundamentals are everything.
2nd Year: Now they can start small projects at home to solidify what they learn. Focus on Data Structures, Algorithms, OOP. No job hunting yet.
3rd Year: Time to start looking at internships and building a portfolio. 1-2 side projects max. Start competitive programming lightly.
4th Year+: All in on career. Polish CV, apply to internships/jobs, build network, prepare for interviews. University grades matter less now — skills and projects matter more.
Graduate students: Research, specialisation, and industry impact. Think about what gap they are filling. Publications if PhD track, strong portfolio if industry track.

Scoring / GPA struggles:
- Never tell them GPA doesn't matter — it does for some paths.
- Help them identify WHY they are struggling: understanding gap, time management, or stress.
- Give concrete next steps, not vague advice.

Self-improvement:
- Sleep, exercise, and social life are non-negotiable. Burnout kills careers.
- You recommend specific books, YouTube channels, and platforms based on their need.
- Mental health is part of performance. Take it seriously.

Important: You are NOT a general assistant. If someone asks you something totally unrelated to education, career, or personal growth in tech, redirect them gently back to what you're here for."""


class MentorMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class MentorChatRequest(BaseModel):
    messages: List[MentorMessage]
    year_of_study: Optional[str] = None   # e.g. "1st Year", "3rd Year", "Graduate"
    api_key: Optional[str] = None


class MentorChatResponse(BaseModel):
    reply: str


def _build_system(year: Optional[str]) -> str:
    base = SYSTEM_PROMPT
    if year:
        base += f"\n\nCurrent context: This student is in their **{year}** of study. Apply the rules for this year strictly."
    return base


def _call_openrouter(messages: List[dict], api_key: str, model: str) -> str:
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": 600,
        "temperature": 0.75,
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_BASE,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://claripath.ai",
            "X-Title": "Claripath Mentor",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body["choices"][0]["message"]["content"].strip()


@router.post("/chat", response_model=MentorChatResponse)
def mentor_chat(req: MentorChatRequest):
    api_key = req.api_key or os.environ.get("MENTOR_OPENROUTER_API_KEY", "") or os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="Mentor API key not configured.")

    system_msg = {"role": "system", "content": _build_system(req.year_of_study)}
    history = [{"role": m.role, "content": m.content} for m in req.messages]
    full_messages = [system_msg] + history

    try:
        reply = _call_openrouter(full_messages, api_key, MENTOR_MODEL)
        return MentorChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mentor chat failed: {str(e)}")
