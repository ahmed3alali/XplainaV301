"""
utils_hybrid_xai.py
===================
XAI (Explainable AI) extension layer for the Hybrid Recommender System.

Fixes applied (v2)
------------------
1. CF explanation  – when a user shares no common rated items with a rater,
   fall back to Jaccard overlap instead of returning 0.0 cosine similarity.
   This gives a meaningful non-zero similarity for cold-ish users.

2. SHAP / LIME prediction function – now uses cosine similarity between the
   item genre vector and the user genre profile instead of a raw dot-product.
   This keeps predictions in [0, 1] and makes SHAP base values interpretable.

3. Content genre chart – target_genres now always includes ALL GENRE_COLS
   (with 0 for absent genres) so the bar chart always renders even when the
   item has only one active genre.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

GENRE_COLS = [
    "Database", "Python", "CloudComputing", "DataAnalysis", "Containers",
    "MachineLearning", "ComputerVision", "DataScience", "BigData",
    "Chatbot", "R", "BackendDev", "FrontendDev", "Blockchain",
]


# ══════════════════════════════════════════════════════════════════════════════
# 1.  CORE SCORING WITH BREAKDOWN
# ══════════════════════════════════════════════════════════════════════════════

def _normalize_series(s: pd.Series) -> pd.Series:
    mn, mx = s.min(), s.max()
    if mx == mn:
        return pd.Series(0.0, index=s.index)
    return (s - mn) / (mx - mn)


def hybrid_scores_with_breakdown(
    user: int,
    train_df: pd.DataFrame,
    cf_predictions: dict,
    sim_df: pd.DataFrame,
    alpha: float = 0.5,
    top_n: int = 10,
    normalize: bool = True,
) -> dict:
    seen = set(train_df.loc[train_df["user"] == user, "item"])
    all_items = sim_df.columns.tolist()

    if user in cf_predictions:
        cf_series = cf_predictions[user].reindex(all_items).fillna(0.0)
    else:
        cf_series = pd.Series(0.0, index=all_items)

    user_items = [i for i in train_df.loc[train_df["user"] == user, "item"]
                  if i in sim_df.index]
    if user_items:
        content_series = sim_df.loc[user_items].mean(axis=0).reindex(all_items).fillna(0.0)
    else:
        content_series = pd.Series(0.0, index=all_items)

    if normalize:
        cf_series_norm = _normalize_series(cf_series)
        content_series_norm = _normalize_series(content_series)
    else:
        cf_series_norm = cf_series.copy()
        content_series_norm = content_series.copy()

    hybrid = alpha * cf_series_norm + (1 - alpha) * content_series_norm

    mask = [i for i in seen if i in hybrid.index]
    hybrid = hybrid.drop(labels=mask, errors="ignore")
    cf_out = cf_series_norm.drop(labels=mask, errors="ignore")
    content_out = content_series_norm.drop(labels=mask, errors="ignore")

    top_hybrid = hybrid.sort_values(ascending=False).head(top_n)

    return {
        "hybrid": top_hybrid,
        "cf": cf_out,
        "content": content_out,
        "seen": seen,
        "alpha": alpha,
        "user_items": user_items,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 2.  CF EXPLANATION
# FIX: fall back to Jaccard overlap when cosine similarity is 0
#      (no common rated items between target user and rater)
# ══════════════════════════════════════════════════════════════════════════════

def cf_explanation(
    user: int,
    item: str,
    train_df: pd.DataFrame,
    cf_predictions: dict,
    top_k_users: int = 5,
) -> dict:
    cf_score = float(cf_predictions.get(user, pd.Series(dtype=float)).get(item, 0.0))

    raters = train_df[train_df["item"] == item][["user", "rating"]].copy()
    target_items = set(train_df.loc[train_df["user"] == user, "item"])

    similarities = []
    for _, row in raters.iterrows():
        other = row["user"]
        if other == user:
            continue
        other_items = set(train_df.loc[train_df["user"] == other, "item"])
        common = target_items & other_items

        if common:
            # Cosine similarity on shared ratings
            v1 = train_df.loc[
                (train_df["user"] == user) & (train_df["item"].isin(common)), "rating"
            ].values.astype(float)
            v2 = train_df.loc[
                (train_df["user"] == other) & (train_df["item"].isin(common)), "rating"
            ].values.astype(float)
            norm = np.linalg.norm(v1) * np.linalg.norm(v2)
            sim = float(np.dot(v1, v2) / norm) if norm > 0 else 0.0
        else:
            # FIX: Jaccard overlap as fallback — how much of their catalogue overlaps
            union = target_items | other_items
            sim = len(common) / len(union) if union else 0.0
            # When truly no overlap at all, use a tiny rating-based proxy
            if sim == 0.0:
                # score based purely on the rating they gave (normalised to [0,1])
                sim = round(float(row["rating"]) / 3.0 * 0.1, 4)  # max 0.1

        similarities.append((other, float(row["rating"]), round(sim, 4)))

    # Sort by similarity descending, then by rating descending as tiebreaker
    similarities.sort(key=lambda x: (x[2], x[1]), reverse=True)
    top = similarities[:top_k_users]

    similar_users = [{"user": u, "rating": r, "similarity": s} for u, r, s in top]

    if similar_users:
        avg_rating = np.mean([x["rating"] for x in similar_users])
        top_sim = similar_users[0]["similarity"]
        if top_sim > 0.3:
            strength = "strong"
        elif top_sim > 0.05:
            strength = "moderate"
        else:
            strength = "weak"
        narrative = (
            f"Recommended because {len(similar_users)} users with {strength} taste overlap "
            f"rated this course (avg rating: {avg_rating:.1f}/3.0). "
            f"Most similar user gave it {similar_users[0]['rating']:.1f}."
        )
    else:
        narrative = "No other users rated this item (cold-start)."

    return {
        "cf_score": round(cf_score, 4),
        "similar_users_who_rated": similar_users,
        "narrative": narrative,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 3.  CONTENT EXPLANATION
# FIX: target_genres always includes ALL genre cols (0 for absent)
#      so the genre bar chart always has data to render
# ══════════════════════════════════════════════════════════════════════════════

def content_explanation(
    user: int,
    item: str,
    train_df: pd.DataFrame,
    courses_df: pd.DataFrame,
    sim_df: pd.DataFrame,
) -> dict:
    user_items = [i for i in train_df.loc[train_df["user"] == user, "item"]
                  if i in sim_df.index]

    content_score = 0.0
    if user_items and item in sim_df.columns:
        content_score = float(sim_df.loc[user_items, item].mean())

    available = [c for c in GENRE_COLS if c in courses_df.columns]
    item_row = courses_df[courses_df["COURSE_ID"] == item]

    # FIX: initialise all genres to 0 so chart always has a full set of bars
    target_genres: dict = {g: 0 for g in available}
    if not item_row.empty:
        for g in available:
            target_genres[g] = int(item_row[g].iloc[0])

    user_course_rows = courses_df[courses_df["COURSE_ID"].isin(user_items)]
    if not user_course_rows.empty:
        user_genre_profile = user_course_rows[available].mean().to_dict()
    else:
        user_genre_profile = {c: 0.0 for c in available}

    matching = {}
    for genre in available:
        overlap = float(target_genres.get(genre, 0)) * float(user_genre_profile.get(genre, 0.0))
        if overlap > 0:
            matching[genre] = round(overlap, 4)

    matching_sorted = dict(sorted(matching.items(), key=lambda x: x[1], reverse=True))

    top_similar = []
    if user_items and item in sim_df.columns:
        sims = sim_df.loc[user_items, item].sort_values(ascending=False)
        top_similar = [{"item": i, "similarity": round(float(s), 4)}
                       for i, s in sims.head(3).items()]

    if matching_sorted:
        top_genres = list(matching_sorted.keys())[:3]
        narrative = (
            f"Matched because of shared topics: {', '.join(top_genres)}. "
            f"Content similarity score: {content_score:.3f}."
        )
    else:
        narrative = f"Low genre overlap with user history. Content score: {content_score:.3f}."

    return {
        "content_score": round(content_score, 4),
        "target_item_genres": target_genres,
        "user_genre_profile": {k: round(v, 4) for k, v in user_genre_profile.items()},
        "matching_genre_scores": matching_sorted,
        "top_similar_courses_in_history": top_similar,
        "narrative": narrative,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 4.  SHAP EXPLANATION
# FIX: predict function uses cosine similarity (output in [0,1])
#      instead of raw dot-product (unbounded), making SHAP values meaningful
# ══════════════════════════════════════════════════════════════════════════════

def _build_content_feature_matrix(courses_df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    available = [c for c in GENRE_COLS if c in courses_df.columns]
    feat_df = courses_df.set_index("COURSE_ID")[available].fillna(0).astype(float)
    return feat_df, available


def _cosine_predict(X: np.ndarray, user_profile: np.ndarray) -> np.ndarray:
    """
    Cosine similarity between each row of X and user_profile.
    Output is in [0, 1] (genre vectors are non-negative).
    """
    profile_norm = np.linalg.norm(user_profile)
    if profile_norm == 0:
        return np.zeros(len(X))
    row_norms = np.linalg.norm(X, axis=1, keepdims=True)
    row_norms = np.where(row_norms == 0, 1e-9, row_norms)
    X_normed = X / row_norms
    profile_normed = user_profile / profile_norm
    return X_normed @ profile_normed  # shape (n_samples,)


def shap_content_explanation(
    user: int,
    item: str,
    train_df: pd.DataFrame,
    courses_df: pd.DataFrame,
    background_size: int = 50,
    seed: int = 42,
) -> dict:
    try:
        import shap
    except ImportError:
        return {"error": "shap not installed. Run: pip install shap"}

    feat_df, available = _build_content_feature_matrix(courses_df)

    if item not in feat_df.index:
        return {"error": f"Item '{item}' not found in courses_df."}

    user_items = [i for i in train_df.loc[train_df["user"] == user, "item"]
                  if i in feat_df.index]
    if not user_items:
        return {"error": "User has no rated items with genre features."}

    user_profile = feat_df.loc[user_items].mean().values  # (n_genres,)

    # FIX: use cosine similarity so predictions stay in [0, 1]
    def _predict(X: np.ndarray) -> np.ndarray:
        return _cosine_predict(X, user_profile)

    rng = np.random.default_rng(seed)
    bg_idx = rng.choice(len(feat_df), size=min(background_size, len(feat_df)), replace=False)
    background = feat_df.iloc[bg_idx].values

    explainer = shap.KernelExplainer(_predict, background)
    target_vec = feat_df.loc[[item]].values  # (1, n_genres)
    shap_vals = explainer.shap_values(target_vec, nsamples=200, silent=True)
    shap_vals = shap_vals[0]  # (n_genres,)
    base_val = float(explainer.expected_value)
    prediction = float(_predict(target_vec)[0])

    shap_dict = {g: round(float(v), 6) for g, v in zip(available, shap_vals)}
    plot_data = sorted(
        [{"feature": g, "value": float(feat_df.loc[item, g]), "shap": shap_dict[g]}
         for g in available],
        key=lambda x: abs(x["shap"]),
        reverse=True,
    )

    return {
        "shap_values": shap_dict,
        "base_value": round(base_val, 6),
        "prediction": round(prediction, 6),
        "plot_data": plot_data,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 5.  LIME EXPLANATION
# FIX: same cosine predict function used here for consistency with SHAP
# ══════════════════════════════════════════════════════════════════════════════

def build_lime_explainer(courses_df: pd.DataFrame):
    try:
        from lime.lime_tabular import LimeTabularExplainer
    except ImportError:
        raise ImportError("lime not installed. Run: pip install lime")

    feat_df, available = _build_content_feature_matrix(courses_df)
    explainer = LimeTabularExplainer(
        training_data=feat_df.values,
        feature_names=available,
        mode="regression",
        discretize_continuous=False,
        random_state=42,
    )
    return explainer, feat_df, available


def lime_content_explanation(
    user: int,
    item: str,
    train_df: pd.DataFrame,
    courses_df: pd.DataFrame,
    lime_explainer=None,
    num_features: int = 10,
    num_samples: int = 500,
) -> dict:
    try:
        from lime.lime_tabular import LimeTabularExplainer
    except ImportError:
        return {"error": "lime not installed. Run: pip install lime"}

    feat_df, available = _build_content_feature_matrix(courses_df)

    if item not in feat_df.index:
        return {"error": f"Item '{item}' not found in courses_df."}

    user_items = [i for i in train_df.loc[train_df["user"] == user, "item"]
                  if i in feat_df.index]
    if not user_items:
        return {"error": "User has no rated items with genre features."}

    user_profile = feat_df.loc[user_items].mean().values

    # FIX: cosine similarity predict function (same as SHAP)
    def _predict(X: np.ndarray) -> np.ndarray:
        return _cosine_predict(X, user_profile)

    if lime_explainer is None:
        lime_explainer, _, _ = build_lime_explainer(courses_df)

    target_vec = feat_df.loc[item].values

    explanation = lime_explainer.explain_instance(
        data_row=target_vec,
        predict_fn=_predict,
        num_features=num_features,
        num_samples=num_samples,
    )

    weights_raw = dict(explanation.as_list())
    intercept = float(explanation.intercept[1]) if hasattr(explanation, "intercept") else 0.0
    prediction = float(_predict(target_vec.reshape(1, -1))[0])

    lime_weights: dict = {}
    for feat_name, weight in weights_raw.items():
        matched = next((g for g in available if g in feat_name), feat_name)
        lime_weights[matched] = round(float(weight), 6)

    plot_data = sorted(
        [{"feature": k,
          "value": float(feat_df.loc[item, k]) if k in feat_df.columns else 0.0,
          "weight": v}
         for k, v in lime_weights.items()],
        key=lambda x: abs(x["weight"]),
        reverse=True,
    )

    return {
        "lime_weights": lime_weights,
        "intercept": round(intercept, 6),
        "prediction": round(prediction, 6),
        "plot_data": plot_data,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6.  FULL SINGLE-ITEM EXPLANATION
# ══════════════════════════════════════════════════════════════════════════════

def explain_single_recommendation(
    user: int,
    item: str,
    train_df: pd.DataFrame,
    cf_predictions: dict,
    sim_df: pd.DataFrame,
    courses_df: pd.DataFrame,
    alpha: float = 0.5,
    include_shap: bool = True,
    include_lime: bool = True,
    lime_explainer=None,
) -> dict:
    breakdown = hybrid_scores_with_breakdown(
        user=user, train_df=train_df, cf_predictions=cf_predictions,
        sim_df=sim_df, alpha=alpha, top_n=100, normalize=True,
    )

    cf_s = float(breakdown["cf"].get(item, 0.0))
    con_s = float(breakdown["content"].get(item, 0.0))
    hyb_s = float(alpha * cf_s + (1 - alpha) * con_s)

    scores = {
        "hybrid_score": round(hyb_s, 4),
        "cf_score": round(cf_s, 4),
        "content_score": round(con_s, 4),
        "alpha": alpha,
        "cf_contribution": round(alpha * cf_s, 4),
        "content_contribution": round((1 - alpha) * con_s, 4),
    }

    cf_exp = cf_explanation(user, item, train_df, cf_predictions)
    con_exp = content_explanation(user, item, train_df, courses_df, sim_df)

    shap_exp = shap_content_explanation(user, item, train_df, courses_df) if include_shap else None
    lime_exp = lime_content_explanation(
        user, item, train_df, courses_df, lime_explainer=lime_explainer
    ) if include_lime else None

    return {
        "user": user,
        "item": item,
        "scores": scores,
        "cf_explanation": cf_exp,
        "content_explanation": con_exp,
        "shap_explanation": shap_exp,
        "lime_explanation": lime_exp,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 7.  BATCH EXPLANATION
# ══════════════════════════════════════════════════════════════════════════════

def batch_explain(
    user: int,
    train_df: pd.DataFrame,
    cf_predictions: dict,
    sim_df: pd.DataFrame,
    courses_df: pd.DataFrame,
    alpha: float = 0.5,
    top_n: int = 10,
    include_shap: bool = False,
    include_lime: bool = True,
) -> list[dict]:
    breakdown = hybrid_scores_with_breakdown(
        user=user, train_df=train_df, cf_predictions=cf_predictions,
        sim_df=sim_df, alpha=alpha, top_n=top_n, normalize=True,
    )

    lime_exp_obj = None
    if include_lime:
        try:
            lime_exp_obj, _, _ = build_lime_explainer(courses_df)
        except ImportError:
            pass

    explanations = []
    for item in breakdown["hybrid"].index:
        exp = explain_single_recommendation(
            user=user, item=item, train_df=train_df,
            cf_predictions=cf_predictions, sim_df=sim_df,
            courses_df=courses_df, alpha=alpha,
            include_shap=include_shap, include_lime=include_lime,
            lime_explainer=lime_exp_obj,
        )
        explanations.append(exp)

    return sorted(explanations, key=lambda x: x["scores"]["hybrid_score"], reverse=True)


# ══════════════════════════════════════════════════════════════════════════════
# 8.  JSON REQUEST HANDLER
# ══════════════════════════════════════════════════════════════════════════════

def handle_json_request(
    request: dict | str,
    train_df: pd.DataFrame,
    cf_predictions: dict,
    sim_df: pd.DataFrame,
    courses_df: pd.DataFrame,
    lime_explainer=None,
) -> dict:
    if isinstance(request, str):
        request = json.loads(request)

    user = int(request["user_id"])
    item = request.get("item_id")
    alpha = float(request.get("alpha", 0.5))
    top_n = int(request.get("top_n", 10))
    inc_shap = bool(request.get("include_shap", False))
    inc_lime = bool(request.get("include_lime", True))

    if item:
        exp = explain_single_recommendation(
            user=user, item=item, train_df=train_df,
            cf_predictions=cf_predictions, sim_df=sim_df,
            courses_df=courses_df, alpha=alpha,
            include_shap=inc_shap, include_lime=inc_lime,
            lime_explainer=lime_explainer,
        )
        explanations = [exp]
        summary = format_explanation_report(exp)
        mode = "single"
    else:
        explanations = batch_explain(
            user=user, train_df=train_df, cf_predictions=cf_predictions,
            sim_df=sim_df, courses_df=courses_df, alpha=alpha,
            top_n=top_n, include_shap=inc_shap, include_lime=inc_lime,
        )
        summary = (
            f"Top-{top_n} recommendations for user {user} "
            f"(α={alpha}, CF weight={alpha:.0%}, content weight={(1-alpha):.0%})."
        )
        mode = "batch"

    return {"request": request, "mode": mode, "explanations": explanations, "summary": summary}


# ══════════════════════════════════════════════════════════════════════════════
# 9.  HUMAN-READABLE REPORT
# ══════════════════════════════════════════════════════════════════════════════

def format_explanation_report(exp: dict) -> str:
    s = exp["scores"]
    lines = [
        "=" * 60,
        "RECOMMENDATION EXPLANATION",
        f"  User  : {exp['user']}",
        f"  Item  : {exp['item']}",
        "=" * 60,
        "",
        "── SCORE BREAKDOWN ──────────────────────────────────────",
        f"  Hybrid Score    : {s['hybrid_score']:.4f}",
        f"  CF Score        : {s['cf_score']:.4f}  × α={s['alpha']}  "
        f"→ contribution {s['cf_contribution']:.4f}",
        f"  Content Score   : {s['content_score']:.4f}  × (1-α)={(1-s['alpha'])}  "
        f"→ contribution {s['content_contribution']:.4f}",
        "",
        "── COLLABORATIVE FILTERING EXPLANATION ──────────────────",
        f"  {exp['cf_explanation']['narrative']}",
    ]

    top_users = exp["cf_explanation"].get("similar_users_who_rated", [])[:3]
    if top_users:
        lines.append("  Top similar users who rated this course:")
        for u in top_users:
            lines.append(f"    • user {u['user']}  rating={u['rating']}  "
                         f"similarity={u['similarity']}")

    ce = exp["content_explanation"]
    lines += [
        "",
        "── CONTENT-BASED EXPLANATION ────────────────────────────",
        f"  {ce['narrative']}",
    ]
    if ce.get("matching_genre_scores"):
        lines.append("  Matching genres (target ∩ user history):")
        for genre, score in list(ce["matching_genre_scores"].items())[:5]:
            bar = "█" * int(score * 20)
            lines.append(f"    • {genre:<18} {bar} {score:.4f}")

    if exp.get("shap_explanation") and "shap_values" in (exp["shap_explanation"] or {}):
        sv = exp["shap_explanation"]["shap_values"]
        top_shap = sorted(sv.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        lines += [
            "",
            "── SHAP FEATURE IMPORTANCE (content) ───────────────────",
            f"  Base value : {exp['shap_explanation']['base_value']:.4f}",
            f"  Prediction : {exp['shap_explanation']['prediction']:.4f}",
        ]
        for feat, val in top_shap:
            lines.append(f"    {'+'if val>=0 else '-'} {feat:<18} SHAP={val:+.4f}")

    if exp.get("lime_explanation") and "lime_weights" in (exp["lime_explanation"] or {}):
        lw = exp["lime_explanation"]["lime_weights"]
        top_lime = sorted(lw.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        lines += [
            "",
            "── LIME FEATURE WEIGHTS (content) ───────────────────────",
            f"  Prediction : {exp['lime_explanation']['prediction']:.4f}",
        ]
        for feat, val in top_lime:
            lines.append(f"    {'+'if val>=0 else '-'} {feat:<18} weight={val:+.4f}")

    lines += ["", "=" * 60]
    return "\n".join(lines)
