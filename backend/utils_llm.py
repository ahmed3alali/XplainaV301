"""
utils_llm.py — Plain-English LLM explanation of SHAP/LIME results via OpenRouter.
Uses model: openai/gpt-oss-120b (free tier).
"""
import os
import json
import urllib.request
import urllib.error
from typing import Optional

OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"


def _call_openrouter(prompt: str, api_key: str, model: str = DEFAULT_MODEL) -> str:
    """Make a raw HTTP call to OpenRouter (no external SDK needed)."""
    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 400,
        "temperature": 0.7,
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_BASE,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://claripath.ai",   # required by OpenRouter
            "X-Title": "Claripath XplainaV301",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body["choices"][0]["message"]["content"].strip()


def build_explanation_prompt(
    course_title: str,
    hybrid_score: float,
    cf_score: float,
    content_score: float,
    shap_values: dict,
    lime_values: dict,
    top_genres: list,
    similar_courses: list,
) -> str:
    """Build the prompt that will be sent to the LLM."""

    def top_k(d: dict, k: int = 5):
        return sorted(d.items(), key=lambda x: abs(x[1]), reverse=True)[:k]

    shap_top = top_k(shap_values)
    lime_top = top_k(lime_values)

    shap_lines = "\n".join(
        f"  - {name}: {'pushes TOWARDS' if v > 0 else 'pushes AWAY FROM'} this course (strength {abs(v):.3f})"
        for name, v in shap_top
    )
    lime_lines = "\n".join(
        f"  - {name}: {'positive' if v > 0 else 'negative'} influence (strength {abs(v):.3f})"
        for name, v in lime_top
    )

    similar_str = ", ".join(f'"{c}"' for c in similar_courses[:3]) if similar_courses else "None"
    genres_str = ", ".join(top_genres) if top_genres else "general topics"

    prompt = f"""You are a friendly AI tutor helping a student understand why an online learning platform recommended a course to them.

The platform recommended: "{course_title}"

The recommendation system used two signals:
- Collaborative Filtering (CF): What similar learners enjoyed → score {cf_score:.1%}
- Content-Based: How similar this course is to courses you engaged with → score {content_score:.1%}
- Overall Match Score: {hybrid_score:.1%}

Technical analysis (SHAP — shows which course topics pushed the score up or down):
{shap_lines}

Technical analysis (LIME — local approximation of the same decision):
{lime_lines}

Your interests matched these topics in this course: {genres_str}
Courses similar to this one in your history: {similar_str}

Now write a SHORT, friendly, plain-English paragraph (3–4 sentences MAX) that explains to the student WHY they were recommended "{course_title}". 
Do NOT use the words SHAP, LIME, or any technical jargon. 
Focus on what their learning history reveals and how this course builds on it.
Keep it warm, encouraging, and student-friendly."""

    return prompt


def get_dynamic_llm_explanation(
    course_title: str,
    hybrid_score: float,
    cf_score: float,
    content_score: float,
    shap_values: dict,
    lime_values: dict,
    top_genres: list,
    similar_courses: list,
    api_key: Optional[str] = None,
    model: str = DEFAULT_MODEL,
) -> str:
    """
    Returns a plain-English explanation string from the LLM.
    Falls back to a template-based explanation if the API call fails.
    """
    key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        return _template_fallback(course_title, top_genres, similar_courses, hybrid_score)

    prompt = build_explanation_prompt(
        course_title=course_title,
        hybrid_score=hybrid_score,
        cf_score=cf_score,
        content_score=content_score,
        shap_values=shap_values,
        lime_values=lime_values,
        top_genres=top_genres,
        similar_courses=similar_courses,
    )
    try:
        return _call_openrouter(prompt, key, model)
    except Exception as exc:
        print(f"[utils_llm] OpenRouter call failed: {exc}")
        return _template_fallback(course_title, top_genres, similar_courses, hybrid_score)


def _template_fallback(title: str, genres: list, similar: list, score: float) -> str:
    """Used when no API key is set or the call fails."""
    genre_str = " and ".join(genres[:2]) if genres else "topics you enjoy"
    similar_str = f' It shares a lot with courses like "{similar[0]}" that you have already engaged with.' if similar else ""
    return (
        f'We think you\'ll love "{title}" because it closely matches your interest in {genre_str}.'
        f'{similar_str} With an overall match of {score:.0%}, this course is a strong fit for where you are in your learning journey.'
    )
