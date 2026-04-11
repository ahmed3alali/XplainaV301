import numpy as np
import pandas as pd
import shap
import lime
import lime.lime_tabular
import json
import warnings
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Tuple
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor

warnings.filterwarnings("ignore")

import sys
def _add_project_root():
    root = Path(__file__).parent.parent.resolve()
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

try:
    from utils_hybrid import GENRE_COLS, _normalize_series
except ImportError:
    _add_project_root()
    try:
        from HybridModel.utils_hybrid import GENRE_COLS, _normalize_series
    except ImportError:
        # Fallback if imports fail
        GENRE_COLS = [
            "Database", "Python", "CloudComputing", "DataAnalysis", "Containers",
            "MachineLearning", "ComputerVision", "DataScience", "BigData",
            "Chatbot", "R", "BackendDev", "FrontendDev", "Blockchain",
        ]
        def _normalize_series(s: pd.Series) -> pd.Series:
            mn, mx = s.min(), s.max()
            if mx == mn:
                return pd.Series(0.0, index=s.index)
            return (s - mn) / (mx - mn)

@dataclass
class ExplanationResult:
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

    def to_dict(self):
        return asdict(self)

def build_user_surrogate_data(user: int, train_df: pd.DataFrame, cf_predictions: dict, sim_df: pd.DataFrame, courses_df: pd.DataFrame, alpha=0.5):
    """Builds a local dataset mapping course genres to hybrid scores for a given user."""
    all_items = sim_df.columns.tolist()
    
    # CF Signal
    if user in cf_predictions:
        cf_series = cf_predictions[user].reindex(all_items).fillna(0.0)
    else:
        cf_series = pd.Series(0.0, index=all_items)
        
    # Content Signal
    user_items = [i for i in train_df.loc[train_df["user"] == user, "item"] if i in sim_df.index]
    if user_items:
        content_series = sim_df.loc[user_items].mean(axis=0).reindex(all_items).fillna(0.0)
    else:
        content_series = pd.Series(0.0, index=all_items)
        
    cf_norm = _normalize_series(cf_series)
    content_norm = _normalize_series(content_series)
    
    hybrid = alpha * cf_norm + (1 - alpha) * content_norm
    
    # Genres as features
    genres_df = courses_df.set_index('COURSE_ID')[GENRE_COLS].reindex(all_items).fillna(0)
    
    return genres_df, hybrid, cf_norm, content_norm, user_items

def build_surrogate_model(X: pd.DataFrame, y: pd.Series) -> RandomForestRegressor:
    """Trains a local surrogate model on the user's dataset to approximate the hybrid scoring."""
    model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
    model.fit(X, y)
    return model

def explain_with_shap(model, X_train: pd.DataFrame, x_instance: pd.Series) -> Dict[str, float]:
    """Computes SHAP values using TreeExplainer on the surrogate model."""
    explainer = shap.TreeExplainer(model, X_train)
    # Filter shap warnings regarding additivity if they pop up
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        shap_values = explainer.shap_values(x_instance.values.reshape(1, -1), check_additivity=False)
    
    vals = shap_values[0] if isinstance(shap_values, list) else shap_values[0]
    return {col: float(val) for col, val in zip(X_train.columns, vals)}

def explain_with_lime(model, X_train: pd.DataFrame, x_instance: pd.Series) -> Dict[str, float]:
    """Computes LIME local approximation weights on the surrogate model."""
    explainer = lime.lime_tabular.LimeTabularExplainer(
        X_train.values,
        feature_names=X_train.columns.tolist(),
        class_names=['hybrid_score'],
        mode='regression',
        random_state=42
    )
    # Silence output if possible
    exp = explainer.explain_instance(x_instance.values, model.predict, num_features=len(X_train.columns))
    
    # Map LIME human-readable conditions back to base features
    lime_dict = {}
    for condition, weight in exp.as_list():
        # LIME conditions look like "Python > 0.00"
        for col in X_train.columns:
            if col in condition:
                lime_dict[col] = float(weight)
                break
    
    # Ensure all columns exist in dict, defaulting to 0
    return {col: lime_dict.get(col, 0.0) for col in X_train.columns}

def explain_recommendation(user: int, course_id: str, train_df: pd.DataFrame, cf_predictions: dict, sim_df: pd.DataFrame, courses_df: pd.DataFrame, alpha=0.5) -> ExplanationResult:
    """Explains a single recommendation for a user using SHAP and LIME."""
    X, y, cf_norm, content_norm, user_items = build_user_surrogate_data(user, train_df, cf_predictions, sim_df, courses_df, alpha)
    
    model = build_surrogate_model(X, y)
    x_instance = X.loc[course_id]
    
    shap_vals = explain_with_shap(model, X, x_instance)
    lime_vals = explain_with_lime(model, X, x_instance)
    
    # Matched genres reasoning
    course_genres = courses_df.loc[courses_df['COURSE_ID'] == course_id, GENRE_COLS]
    if len(course_genres) > 0:
        c_g = course_genres.iloc[0]
        matched = [g for g in GENRE_COLS if c_g[g] == 1]
    else:
        matched = []
    
    # Similar courses reasoning
    similar_titles = []
    if user_items and course_id in sim_df.columns:
        sims = sim_df.loc[user_items, course_id].sort_values(ascending=False).head(3)
        titles_df = courses_df.set_index('COURSE_ID')['TITLE']
        similar_titles = [titles_df.get(sid, sid) for sid in sims.index]
    
    title = courses_df.loc[courses_df['COURSE_ID'] == course_id, 'TITLE'].iloc[0] if course_id in courses_df['COURSE_ID'].values else course_id
    
    return ExplanationResult(
        course_id=str(course_id),
        title=str(title),
        hybrid_score=float(y.loc[course_id]),
        cf_score=float(cf_norm.loc[course_id]),
        content_score=float(content_norm.loc[course_id]),
        alpha=float(alpha),
        shap_values=shap_vals,
        lime_values=lime_vals,
        top_genres_matched=matched,
        similar_courses=similar_titles
    )

def explain_top_n(user: int, top_n_recs: pd.Series, train_df: pd.DataFrame, cf_predictions: dict, sim_df: pd.DataFrame, courses_df: pd.DataFrame, alpha=0.5) -> List[ExplanationResult]:
    """Batch explains the top N recommendations for a user."""
    X, y, cf_norm, content_norm, user_items = build_user_surrogate_data(user, train_df, cf_predictions, sim_df, courses_df, alpha)
    model = build_surrogate_model(X, y)
    
    results = []
    titles = courses_df.set_index('COURSE_ID')['TITLE']
    
    for course_id in top_n_recs.index:
        x_instance = X.loc[course_id]
        shap_vals = explain_with_shap(model, X, x_instance)
        lime_vals = explain_with_lime(model, X, x_instance)
        
        course_genres = courses_df.loc[courses_df['COURSE_ID'] == course_id, GENRE_COLS]
        matched = [g for g in GENRE_COLS if course_genres.iloc[0][g] == 1] if len(course_genres) > 0 else []
        
        similar_titles = []
        if user_items and course_id in sim_df.columns:
            sims = sim_df.loc[user_items, course_id].sort_values(ascending=False).head(3)
            similar_titles = [titles.get(sid, sid) for sid in sims.index]
        
        results.append(ExplanationResult(
            course_id=str(course_id),
            title=str(titles.get(course_id, course_id)),
            hybrid_score=float(y.loc[course_id]),
            cf_score=float(cf_norm.loc[course_id]),
            content_score=float(content_norm.loc[course_id]),
            alpha=float(alpha),
            shap_values=shap_vals,
            lime_values=lime_vals,
            top_genres_matched=matched,
            similar_courses=similar_titles
        ))
    return results

def save_explanations(results: List[ExplanationResult], path: str | Path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        json.dump([r.to_dict() for r in results], f, indent=2)
