from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends
import os
from supabase import create_client
from pydantic import BaseModel
from typing import List, Any
import sys
import pandas as pd
from pathlib import Path

# Add backend and project root to sys.path so we can import universally
backend_dir = Path(__file__).parent.resolve()
root_dir = backend_dir.parent.resolve()

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

env_path = backend_dir / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ[k] = v

from api_auth import router as auth_router, get_current_user

from schemas import (
    CourseOut, RecommendationOut, ExplanationOut, 
    LLMExplainRequest, LLMExplainResponse, DynamicRecommendRequest, DynamicExplainRequest
)
from loader import load_all_data, get_state

try:
    from HybridModel.utils_hybrid import (
        hybrid_scores_for_user, build_dynamic_cf_series,
        _normalize_cf_series, _normalize_series, GENRE_COLS
    )
    from HybridModel.utils_explainability import explain_recommendation, build_surrogate_model, explain_with_shap, explain_with_lime, ExplanationResult
    from HybridModel.utils_llm import get_llm_explanation
except ImportError:
    from utils_hybrid import (
        hybrid_scores_for_user, build_dynamic_cf_series,
        _normalize_cf_series, _normalize_series, GENRE_COLS
    )
    from utils_explainability import explain_recommendation, build_surrogate_model, explain_with_shap, explain_with_lime, ExplanationResult
    from utils_llm import get_llm_explanation


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_data()
    yield
    print("Shutting down model API")

app = FastAPI(title="XplainaV301 API", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler so unhandled exceptions still return CORS headers."""
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers=headers,
    )


app.include_router(auth_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/users/me")
def get_me(user: dict = Depends(get_current_user)):
    return user

@app.get("/courses/my-courses", response_model=List[CourseOut])
def my_courses(user: dict = Depends(get_current_user)):
    state = get_state()
    user_id = user.get("user_id")
    user_type = user.get("user_type")
    
    res = []
    
    if user_type == "dataset_user":
        user_ratings = state.ratings_full[state.ratings_full['user'] == int(user_id)]
        course_ids = set(user_ratings['item'].astype(str).tolist())
    else:
        try:
            url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
            key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
            sb = create_client(url, key)
            sb_res = sb.table("user_courses").select("course_id").eq("user_id", user_id).execute()
            course_ids = {str(d['course_id']) for d in sb_res.data}
        except Exception:
            course_ids = set()
            
    df = state.courses_df[state.courses_df['COURSE_ID'].astype(str).isin(course_ids)]
    for _, row in df.iterrows():
        genres = [g for g in GENRE_COLS if getattr(row, g, 0) == 1]
        res.append({
            "COURSE_ID": str(row["COURSE_ID"]),
            "TITLE": str(row["TITLE"]),
            "genres": genres
        })
    return res

class SelectedCoursesReq(BaseModel):
    selected_courses: List[str]

@app.post("/courses/my-courses")
def save_my_courses(req: SelectedCoursesReq, user: dict = Depends(get_current_user)):
    user_id = user.get("user_id")
    if user.get("user_type") == "dataset_user":
        return {"status": "ok", "message": "Dataset users are read-only"}
        
    try:
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
        key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
        sb = create_client(url, key)
        
        # Delete old selections
        sb.table("user_courses").delete().eq("user_id", user_id).execute()
        
        # Save each course
        if req.selected_courses:
            inserts = [{"user_id": user_id, "course_id": str(cid)} for cid in req.selected_courses]
            sb.table("user_courses").insert(inserts).execute()
            
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save courses: {str(e)}")

@app.get("/courses/all", response_model=List[CourseOut])
@app.get("/courses", response_model=List[CourseOut])
def get_courses(limit: int = 9999):
    state = get_state()
    if state.courses_df.empty:
        raise HTTPException(status_code=500, detail="Courses data not loaded.")
        
    res = []
    df = state.courses_df.head(limit)
    for _, row in df.iterrows():
        genres = [g for g in GENRE_COLS if getattr(row, g, 0) == 1]
        res.append({
            "COURSE_ID": row["COURSE_ID"],
            "TITLE": row["TITLE"],
            "genres": genres
        })
    return res

@app.get("/recommend/{user_id}", response_model=List[RecommendationOut])
def recommend(user_id: int, top_n: int = Query(10, ge=1, le=50), alpha: float = Query(0.5, ge=0.0, le=1.0)):
    state = get_state()
    try:
        recs = hybrid_scores_for_user(
            user=user_id,
            train_df=state.train_df,
            cf_predictions=state.cf_predictions,
            sim_df=state.sim_df,
            alpha=alpha,
            top_n=top_n,
            normalize=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    out = []
    courses_idx = state.courses_df.set_index('COURSE_ID')
    for course_id, score in recs.items():
        if course_id in courses_idx.index:
            row = courses_idx.loc[course_id]
            title = str(row['TITLE'])
            genres = [g for g in GENRE_COLS if row.get(g, 0) == 1]
        else:
            title = course_id
            genres = []
        out.append(RecommendationOut(course_id=course_id, title=title, hybrid_score=float(score), genres=genres))

    return out

@app.post("/recommend/dynamic", response_model=List[RecommendationOut])
def recommend_dynamic(req: DynamicRecommendRequest):
    """
    Recommend courses for a real (cold-start) user who is not in the ratings
    dataset.  We use `hybrid_scores_for_user` with `user_items_override` so
    the CF signal is derived from similar dataset users via Jaccard similarity,
    instead of being hard-coded to zero.  This gives real users the same
    hybrid treatment as dataset users.
    """
    state = get_state()

    # Use a sentinel user id that will never exist in cf_predictions,
    # so the function falls through to the cold-start CF branch.
    REAL_USER_SENTINEL = -999999

    recs = hybrid_scores_for_user(
        user=REAL_USER_SENTINEL,
        train_df=state.train_df,
        cf_predictions=state.cf_predictions,
        sim_df=state.sim_df,
        alpha=req.alpha,
        top_n=req.top_n,
        normalize=True,
        user_items_override=req.selected_courses,
    )

    out = []
    courses_idx = state.courses_df.set_index('COURSE_ID')
    for course_id, score in recs.items():
        if course_id in courses_idx.index:
            row = courses_idx.loc[course_id]
            title = str(row['TITLE'])
            genres = [g for g in GENRE_COLS if row.get(g, 0) == 1]
        else:
            title = course_id
            genres = []
        out.append(RecommendationOut(course_id=course_id, title=title, hybrid_score=float(score), genres=genres))
    return out

@app.get("/explain/{user_id}/{course_id}", response_model=ExplanationOut)
def explain(user_id: int, course_id: str, alpha: float = Query(0.5, ge=0.0, le=1.0)):
    state = get_state()
    try:
        explanation = explain_recommendation(
            user=user_id, 
            course_id=course_id, 
            train_df=state.train_df, 
            cf_predictions=state.cf_predictions, 
            sim_df=state.sim_df, 
            courses_df=state.courses_df, 
            alpha=alpha
        )
        return explanation.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")

@app.post("/explain/dynamic", response_model=ExplanationOut)
def explain_dynamic(req: DynamicExplainRequest):
    """
    Explanation for a real (cold-start) user.  CF signal is now derived from
    similar dataset users (same logic as /recommend/dynamic) so cf_score is
    no longer always 0%.
    """
    state = get_state()
    try:
        all_items = state.sim_df.columns.tolist()

        # ── CF signal via cold-start neighbour blending ──────────────────────
        user_items = [i for i in req.selected_courses if i in state.sim_df.index]
        cf_series = build_dynamic_cf_series(
            selected_items=user_items,
            cf_predictions=state.cf_predictions,
            train_df=state.train_df,
            all_items=all_items,
        )

        # ── Content signal ────────────────────────────────────────────
        if user_items:
            content_series = state.sim_df.loc[user_items].mean(axis=0).reindex(all_items).fillna(0.0)
        else:
            content_series = pd.Series(0.0, index=all_items)

        # ── Normalize ───────────────────────────────────────────────
        cf_norm = _normalize_cf_series(cf_series)
        content_norm = _normalize_series(content_series)

        # ── Blend ──────────────────────────────────────────────────
        y = req.alpha * cf_norm + (1 - req.alpha) * content_norm

        X = state.courses_df.set_index('COURSE_ID')[GENRE_COLS].reindex(all_items).fillna(0)
        model = build_surrogate_model(X, y)
        x_instance = X.loc[req.course_id]

        shap_vals = explain_with_shap(model, X, x_instance)
        lime_vals = explain_with_lime(model, X, x_instance)

        course_genres = state.courses_df.loc[state.courses_df['COURSE_ID'] == req.course_id, GENRE_COLS]
        matched = [g for g in GENRE_COLS if course_genres.iloc[0][g] == 1] if len(course_genres) > 0 else []

        similar_titles = []
        if user_items and req.course_id in state.sim_df.columns:
            sims = state.sim_df.loc[user_items, req.course_id].sort_values(ascending=False).head(3)
            titles_df = state.courses_df.set_index('COURSE_ID')['TITLE']
            similar_titles = [titles_df.get(sid, sid) for sid in sims.index]

        title = (
            state.courses_df.loc[state.courses_df['COURSE_ID'] == req.course_id, 'TITLE'].iloc[0]
            if req.course_id in state.courses_df['COURSE_ID'].values
            else req.course_id
        )

        explanation = ExplanationResult(
            course_id=str(req.course_id),
            title=str(title),
            hybrid_score=float(y.loc[req.course_id]),
            cf_score=float(cf_norm.loc[req.course_id]),
            content_score=float(content_norm.loc[req.course_id]),
            alpha=float(req.alpha),
            shap_values=shap_vals,
            lime_values=lime_vals,
            top_genres_matched=matched,
            similar_courses=similar_titles
        )
        return explanation.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")

@app.post("/llm-explain", response_model=LLMExplainResponse)
def llm_explain(req: LLMExplainRequest):
    state = get_state()
    try:
        explanation = explain_recommendation(
            user=req.user_id, 
            course_id=req.course_id, 
            train_df=state.train_df, 
            cf_predictions=state.cf_predictions, 
            sim_df=state.sim_df, 
            courses_df=state.courses_df, 
            alpha=req.alpha
        )
        
        llm_res = get_llm_explanation(
            explanation=explanation,
            courses_df=state.courses_df,
            provider=req.provider,
            api_key=req.api_key,
            model=req.model
        )
        
        return llm_res.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Explanation failed: {str(e)}")
