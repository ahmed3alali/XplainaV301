from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class CourseOut(BaseModel):
    course_id: str = Field(..., alias="COURSE_ID")
    title: str = Field(..., alias="TITLE")
    genres: List[str]

class RecommendationOut(BaseModel):
    course_id: str
    title: str
    hybrid_score: float
    genres: List[str] = []

class ExplanationOut(BaseModel):
    course_id: str
    title: str
    hybrid_score: float
    cf_score: float
    content_score: float
    alpha: float
    shap_values: Dict[str, float]
    lime_values: Dict[str, float]
    top_genres_matched: List[str]
    similar_courses: List[str]

class DynamicRecommendRequest(BaseModel):
    selected_courses: List[str]
    top_n: int = 10
    alpha: float = 0.5

class DynamicExplainRequest(BaseModel):
    selected_courses: List[str]
    course_id: str
    alpha: float = 0.5

class LLMExplainRequest(BaseModel):
    user_id: int
    course_id: str
    provider: str = Field(default="claude", description="Provider to use: 'openai' or 'claude'")
    api_key: Optional[str] = Field(default=None, description="Optional API key. If not provided, it looks for env vars.")
    model: Optional[str] = Field(default=None, description="Override the default model for the provider.")
    alpha: float = Field(default=0.5, description="Alpha weight used in hybrid scoring to correctly frame the prompt.")

class LLMExplainResponse(BaseModel):
    course_id: str
    title: str
    prompt_used: str
    llm_response: str
    provider: str


# ── Skill-based onboarding ─────────────────────────────────────────────────────

class SkillRecommendRequest(BaseModel):
    selected_skills: List[str]
    top_n: int = 10
    alpha: float = 0.5

class SkillRecommendResponse(BaseModel):
    recommendations: List[RecommendationOut]
    extra_skills: List[str]  # genres in recs not originally selected
    seed_courses: List[str] = [] # The pure courses selected to trigger the model

class SaveProfileRequest(BaseModel):
    education_level: Optional[str] = None   # undergraduate | graduate | phd
    college_year: Optional[str] = None      # e.g. "2nd", "Year 1"
    interest_text: Optional[str] = None
    selected_skills: Optional[List[str]] = None
