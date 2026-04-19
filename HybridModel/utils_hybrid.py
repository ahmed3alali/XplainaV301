"""
utils_hybrid.py
===============
Utility functions for the Hybrid Recommendation System.

Combines:
  - Content-Based Filtering  (TF-IDF / BoW cosine similarity)
  - Collaborative Filtering  (User-KNN / Item-KNN)

into a unified weighted-hybrid scorer with shared evaluation helpers.

Directory layout expected (relative to the hybrid/ notebook):
  ../data/raw/          ratings.csv, course_genre.csv
  ../data/processed/    final_courses.csv, ratings_full_with_predictions.csv
  ../models/            06_pred_user_knn.pkl, 06_pred_item_knn.pkl  (optional)
  ../results/           (written here)
  ../figures/           (written here)
"""

from __future__ import annotations

from pathlib import Path
import warnings
import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore")

# ── re-export helpers that notebooks already use from utils_recommender ────────
import sys

def _add_project_root(hybrid_notebook_dir: Path) -> None:
    """Add project root (parent of hybrid/) to sys.path so utils_recommender is importable."""
    root = (hybrid_notebook_dir / "..").resolve()
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))


# ── directory helpers ──────────────────────────────────────────────────────────

def ensure_dirs(*dirs) -> None:
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)


# ── data loading ───────────────────────────────────────────────────────────────

def load_hybrid_data(data_raw: Path, data_processed: Path):
    """
    Returns
    -------
    ratings_full : DataFrame  – full ratings (real + predicted rows)
    courses      : DataFrame  – cleaned courses with genre columns
    """
    ratings_full = pd.read_csv(data_processed / "ratings_full_with_predictions.csv")
    courses = pd.read_csv(data_processed / "final_courses.csv")
    return ratings_full, courses


def load_cf_models(models_dir: Path):
    """
    Load pre-trained CF prediction dicts saved by notebook 06.

    Returns (pred_user_knn, pred_item_knn).
    If the pickle files do not exist, returns (None, None) and prints a warning.
    """
    u_path = models_dir / "06_pred_user_knn.pkl"
    i_path = models_dir / "06_pred_item_knn.pkl"

    if not u_path.exists() or not i_path.exists():
        print(
            "[utils_hybrid] WARNING: CF model pickles not found in "
            f"{models_dir}.\n"
            "  Run notebook 06 first, or train CF models inline (see build_cf_predictions)."
        )
        return None, None

    with open(u_path, "rb") as f:
        pred_user_knn = pickle.load(f)
    with open(i_path, "rb") as f:
        pred_item_knn = pickle.load(f)
    print(f"[utils_hybrid] Loaded CF models from {models_dir}")
    return pred_user_knn, pred_item_knn


# ── train / test split (identical contract to utils_recommender) ───────────────

def train_test_split_by_user(
    ratings_df: pd.DataFrame,
    min_user_ratings: int = 5,
    test_size: float = 0.2,
    seed: int = 42,
):
    ratings_df = ratings_df.copy()
    train_parts, test_parts = [], []
    for user, grp in ratings_df.groupby("user"):
        if len(grp) < min_user_ratings:
            train_parts.append(grp)
            continue
        n_test = max(1, int(round(len(grp) * test_size)))
        test_idx = grp.sample(n=n_test, random_state=seed).index
        train_parts.append(grp.drop(index=test_idx))
        test_parts.append(grp.loc[test_idx])
    train_df = pd.concat(train_parts, ignore_index=True)
    test_df = (
        pd.concat(test_parts, ignore_index=True)
        if test_parts
        else pd.DataFrame(columns=ratings_df.columns)
    )
    return train_df, test_df


# ── content-based helpers ──────────────────────────────────────────────────────

GENRE_COLS = [
    "Database", "Python", "CloudComputing", "DataAnalysis", "Containers",
    "MachineLearning", "ComputerVision", "DataScience", "BigData",
    "Chatbot", "R", "BackendDev", "FrontendDev", "Blockchain",
]


def build_content_similarity(courses_df: pd.DataFrame, method: str = "tfidf"):
    """
    Build a course×course cosine-similarity matrix from course text + genre tags.

    Parameters
    ----------
    courses_df : must contain COURSE_ID, TITLE, and the GENRE_COLS columns.
    method     : 'tfidf' or 'bow'

    Returns
    -------
    sim_df : pd.DataFrame  (COURSE_ID × COURSE_ID)
    """
    from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    df = courses_df.copy()
    if "num_genres" not in df.columns:
        df["num_genres"] = df[GENRE_COLS].sum(axis=1)

    def _to_text(row):
        title = str(row["TITLE"]).strip().lower()
        tags = " ".join(c.lower() for c in GENRE_COLS if row[c] == 1)
        return f"{title} {tags}".strip()

    docs = df.apply(_to_text, axis=1)

    if method == "tfidf":
        vec = TfidfVectorizer(stop_words="english")
    else:
        from sklearn.feature_extraction.text import CountVectorizer
        vec = CountVectorizer(stop_words="english")

    matrix = vec.fit_transform(docs)
    cos_mat = cosine_similarity(matrix)
    idx = df["COURSE_ID"].tolist()
    return pd.DataFrame(cos_mat, index=idx, columns=idx)


# ── collaborative filtering helpers ───────────────────────────────────────────

def build_user_item_matrix(ratings_df: pd.DataFrame) -> pd.DataFrame:
    return ratings_df.pivot_table(index="user", columns="item", values="rating")


def build_cf_predictions(train_utility: pd.DataFrame, k: int = 20):
    """
    Train User-KNN and Item-KNN and return their prediction dicts.
    Delegates to utils_recommender if available, else uses inline implementation.
    """
    try:
        import utils_recommender as ur
        pred_user = ur.user_knn_predictions(train_utility, k=k)
        pred_item = ur.item_knn_predictions(train_utility, k=k)
        return pred_user, pred_item
    except ImportError:
        pass

    # ── inline fallback ────────────────────────────────────────────────────────
    from sklearn.neighbors import NearestNeighbors

    users = train_utility.index.tolist()
    items = train_utility.columns.tolist()
    mat = train_utility.fillna(0).values.astype(np.float32)

    # User-KNN
    knn_u = NearestNeighbors(
        n_neighbors=min(k + 1, len(users)), metric="cosine",
        algorithm="brute", n_jobs=-1
    )
    knn_u.fit(mat)
    dists, idxs = knn_u.kneighbors(mat)
    n_sims = 1 - dists[:, 1:]
    n_rats = mat[idxs[:, 1:]]
    rated = n_rats > 0
    weighted = (n_rats * n_sims[:, :, None] * rated).sum(axis=1)
    weights = (n_sims[:, :, None] * rated).sum(axis=1)
    u_preds = np.divide(weighted, weights, out=np.zeros_like(weighted), where=weights != 0)
    pred_user = {u: pd.Series(u_preds[i], index=items) for i, u in enumerate(users)}

    # Item-KNN
    item_mat = mat.T
    knn_i = NearestNeighbors(
        n_neighbors=min(k + 1, len(items)), metric="cosine",
        algorithm="brute", n_jobs=-1
    )
    knn_i.fit(item_mat)
    dists_i, idxs_i = knn_i.kneighbors(item_mat)
    i_preds = np.zeros_like(mat, dtype=np.float32)
    for ii in range(len(items)):
        nbr = idxs_i[ii, 1:]
        sims = 1 - dists_i[ii, 1:]
        nbr_r = mat[:, nbr]
        rated_i = nbr_r > 0
        w = (nbr_r * sims * rated_i).sum(axis=1)
        ws = (sims * rated_i).sum(axis=1)
        i_preds[:, ii] = np.divide(w, ws, out=np.zeros(len(users), dtype=np.float32), where=ws != 0)
    pred_item = {u: pd.Series(i_preds[i], index=items) for i, u in enumerate(users)}

    return pred_user, pred_item


# ── hybrid scoring ─────────────────────────────────────────────────────────────

def _normalize_series(s: pd.Series) -> pd.Series:
    """Min-max normalize a Series to [0, 1]. Returns zeros if range is 0."""
    mn, mx = s.min(), s.max()
    if mx == mn:
        return pd.Series(0.0, index=s.index)
    return (s - mn) / (mx - mn)


def _normalize_cf_series(s: pd.Series) -> pd.Series:
    """
    Smooth CF normalization that avoids the bimodal 0% / 67-100% problem.

    The User-KNN model stores 0 for items where no neighbour has a rating
    (structural sparsity), not a true "lowest rating".  Including those zeros
    in a global min-max normalisation compresses all real predictions into the
    top third of the [0, 1] range, making every CF score appear as '0% or~100%'.

    Fix: normalise *only* within the sub-set of items that have an actual
    prediction (> 0).  Those items are spread smoothly across [0, 1], while
    items with no prediction stay at 0 (= no collaborative signal).
    """
    nz_mask = s > 0
    if not nz_mask.any():
        return pd.Series(0.0, index=s.index)

    nz = s[nz_mask]
    mn, mx = nz.min(), nz.max()
    result = pd.Series(0.0, index=s.index)
    if mx > mn:
        result[nz_mask] = (nz - mn) / (mx - mn)
    else:
        # All predicted values are identical → give them all a mid-range score
        result[nz_mask] = 0.5
    return result


def build_dynamic_cf_series(
    selected_items: list,
    cf_predictions: dict,
    train_df: pd.DataFrame,
    all_items: list,
    k_neighbors: int = 15,
) -> pd.Series:
    """
    Build a CF signal for a cold-start (new / real) user by finding the K most
    similar dataset users based on shared course selection, then blending their
    pre-computed CF predictions weighted by Jaccard similarity.

    This solves the problem where real users (not in ratings.csv) always receive
    a CF score of 0, making their recommendations purely content-based while
    showing a misleading '0% CF' in the explanation modal.

    Parameters
    ----------
    selected_items : list of course IDs the user has completed / selected
    cf_predictions : pre-computed CF dict  {dataset_user_id → pd.Series}
    train_df       : training ratings DataFrame  (columns: user, item, rating)
    all_items      : full list of course IDs that defines the output index
    k_neighbors    : number of similar dataset users to blend  (default 15)

    Returns
    -------
    pd.Series (item → blended CF score), zeros where no signal exists
    """
    selected_set = set(selected_items)
    if not selected_set or not cf_predictions:
        return pd.Series(0.0, index=all_items)

    # Build a {user → set-of-items} map from the training ratings
    user_items_map = train_df.groupby("user")["item"].apply(set).to_dict()

    # Compute Jaccard similarity between this user and every dataset user
    similarities: list[tuple] = []
    for u, u_items in user_items_map.items():
        if u not in cf_predictions:
            continue
        intersection = len(selected_set & u_items)
        if intersection == 0:
            continue   # no overlap at all → skip
        union = len(selected_set | u_items)
        sim = intersection / union
        similarities.append((u, sim))

    if not similarities:
        return pd.Series(0.0, index=all_items)

    # Keep only the top-K most similar neighbours
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_neighbours = similarities[:k_neighbors]

    # Weighted blend of their pre-computed CF predictions
    total_weight = sum(sim for _, sim in top_neighbours)
    blended = pd.Series(0.0, index=all_items, dtype=np.float64)
    for u, sim in top_neighbours:
        pred = cf_predictions[u].reindex(all_items).fillna(0.0)
        blended += (sim / total_weight) * pred

    return blended


def hybrid_scores_for_user(
    user: int,
    train_df: pd.DataFrame,
    cf_predictions: dict,        # user → pd.Series of item scores
    sim_df: pd.DataFrame,        # content similarity matrix (COURSE_ID × COURSE_ID)
    alpha: float = 0.5,          # weight for CF  (1-alpha → content)
    top_n: int = 10,
    normalize: bool = True,
    user_items_override: list | None = None,  # explicit course list (real / new users)
) -> pd.Series:
    """
    Compute a hybrid score for every unseen item for a single user.

    Score = alpha * CF_score + (1 - alpha) * Content_score

    Parameters
    ----------
    user               : user id (can be a fake sentinel for new/real users)
    train_df           : training ratings DataFrame  (user, item, rating)
    cf_predictions     : dict of {user: pd.Series(item → predicted_rating)}
    sim_df             : course×course cosine similarity DataFrame
    alpha              : blend weight in [0, 1]  (1 = pure CF, 0 = pure content)
    top_n              : number of recommendations to return
    normalize          : whether to normalize each signal before blending
    user_items_override: if supplied, use this list as the user's taken courses
                         instead of looking up train_df.  Enables real-user
                         (cold-start) support without a row in train_df.

    Returns
    -------
    pd.Series of (item → hybrid_score), sorted descending, length top_n
    """
    all_items = sim_df.columns.tolist()

    # ── Resolve what courses this user has already taken ───────────────────────
    if user_items_override is not None:
        taken_items = list(user_items_override)
    else:
        taken_items = train_df.loc[train_df["user"] == user, "item"].tolist()
    seen = set(taken_items)

    # ── CF signal ──────────────────────────────────────────────────────────────
    if user in cf_predictions:
        # Known dataset user: use their pre-computed KNN predictions directly
        cf_series = cf_predictions[user].reindex(all_items).fillna(0.0)
    elif taken_items:
        # Cold-start / real user: derive CF from similar dataset users
        cf_series = build_dynamic_cf_series(
            selected_items=taken_items,
            cf_predictions=cf_predictions,
            train_df=train_df,
            all_items=all_items,
        )
    else:
        cf_series = pd.Series(0.0, index=all_items)

    # ── Content signal ─────────────────────────────────────────────────────────
    user_items = [i for i in taken_items if i in sim_df.index]
    if user_items:
        content_series = sim_df.loc[user_items].mean(axis=0).reindex(all_items).fillna(0.0)
    else:
        content_series = pd.Series(0.0, index=all_items)

    # ── Normalize ──────────────────────────────────────────────────────────────
    if normalize:
        # Use CF-aware normalization (avoids bimodal 0%/100% artifact)
        cf_series = _normalize_cf_series(cf_series)
        content_series = _normalize_series(content_series)

    # ── Blend ──────────────────────────────────────────────────────────────────
    hybrid = alpha * cf_series + (1 - alpha) * content_series

    # Remove seen items and return top-N
    hybrid = hybrid.drop(labels=[i for i in seen if i in hybrid.index], errors="ignore")
    return hybrid.sort_values(ascending=False).head(top_n)


def build_hybrid_predictions(
    train_df: pd.DataFrame,
    cf_predictions: dict,
    sim_df: pd.DataFrame,
    alpha: float = 0.5,
    top_n: int = 10,
    normalize: bool = True,
) -> dict:
    """
    Build hybrid top-N recommendation lists for every user in cf_predictions.

    Returns
    -------
    dict : {user → pd.Series(item → hybrid_score)}
    """
    hybrid_recs = {}
    users = list(cf_predictions.keys())
    for u in users:
        hybrid_recs[u] = hybrid_scores_for_user(
            user=u,
            train_df=train_df,
            cf_predictions=cf_predictions,
            sim_df=sim_df,
            alpha=alpha,
            top_n=top_n,
            normalize=normalize,
        )
    return hybrid_recs


# ── evaluation ────────────────────────────────────────────────────────────────

def _rmse(y_true, y_pred):
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def _ranking_metrics(top_items, relevant_items, k=10):
    top_items = list(top_items)[:k]
    relevant_items = set(relevant_items)
    hits = [1 if item in relevant_items else 0 for item in top_items]
    hit_rate = int(sum(hits) > 0)
    precision = float(np.mean(hits)) if hits else 0.0
    recall = sum(hits) / max(len(relevant_items), 1)
    dcg = sum(h / np.log2(i + 2) for i, h in enumerate(hits))
    ideal = [1] * min(len(relevant_items), k)
    idcg = sum(h / np.log2(i + 2) for i, h in enumerate(ideal)) if ideal else 0.0
    ndcg = dcg / idcg if idcg > 0 else 0.0
    return hit_rate, precision, recall, ndcg


def evaluate_hybrid(
    hybrid_recs: dict,
    test_df: pd.DataFrame,
    train_df: pd.DataFrame,
    top_n: int = 10,
    n_users: int = 200,
    seed: int = 42,
) -> dict:
    """
    Evaluate hybrid recommendations.

    Ranking metrics (HitRate, Precision, Recall, NDCG) are computed from the
    top-N recommendation lists.  RMSE / MAE are computed by using the hybrid
    score as a proxy rating prediction.

    Returns
    -------
    dict with keys: RMSE, MAE, HitRate@10, Precision@10, Recall@10, NDCG@10, Coverage
    """
    rng = np.random.default_rng(seed)
    users = [u for u in hybrid_recs if u in test_df["user"].values]
    sampled = rng.choice(users, size=min(n_users, len(users)), replace=False)

    y_true, y_pred = [], []
    hits, precisions, recalls, ndcgs = [], [], [], []
    recommended: set = set()
    global_mean = train_df["rating"].mean()

    for u in sampled:
        rec_series = hybrid_recs[u]
        test_u = test_df[test_df["user"] == u]
        if test_u.empty:
            continue

        recommended.update(rec_series.index.tolist())
        hit, prec, rec, ndcg = _ranking_metrics(
            rec_series.index.tolist(), test_u["item"].tolist(), k=top_n
        )
        hits.append(hit)
        precisions.append(prec)
        recalls.append(rec)
        ndcgs.append(ndcg)

        # proxy rating: use hybrid score if item is in rec_series, else global mean
        for _, row in test_u.iterrows():
            item = row["item"]
            if item in rec_series.index:
                y_pred.append(float(rec_series[item]))
            else:
                y_pred.append(float(global_mean))
            y_true.append(float(row["rating"]))

    n_catalog = train_df["item"].nunique()
    return {
        "RMSE": _rmse(y_true, y_pred) if y_true else float("nan"),
        "MAE": float(mean_absolute_error(y_true, y_pred)) if y_true else float("nan"),
        "HitRate@10": float(np.mean(hits)) if hits else 0.0,
        "Precision@10": float(np.mean(precisions)) if precisions else 0.0,
        "Recall@10": float(np.mean(recalls)) if recalls else 0.0,
        "NDCG@10": float(np.mean(ndcgs)) if ndcgs else 0.0,
        "Coverage": float(len(recommended) / n_catalog) if n_catalog else 0.0,
    }


def alpha_sweep(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    cf_predictions: dict,
    sim_df: pd.DataFrame,
    alphas=None,
    top_n: int = 10,
    n_users: int = 200,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Evaluate the hybrid model for a range of alpha values and return a
    DataFrame of metric results.  Useful for selecting the best blend weight.

    Parameters
    ----------
    alphas : list of floats in [0, 1]  (default: 0.0, 0.1, …, 1.0)
    """
    if alphas is None:
        alphas = [round(a * 0.1, 1) for a in range(11)]

    rows = []
    for alpha in alphas:
        recs = build_hybrid_predictions(
            train_df=train_df,
            cf_predictions=cf_predictions,
            sim_df=sim_df,
            alpha=alpha,
            top_n=top_n,
            normalize=True,
        )
        metrics = evaluate_hybrid(recs, test_df, train_df, top_n=top_n, n_users=n_users, seed=seed)
        metrics["alpha"] = alpha
        rows.append(metrics)

    sweep_df = pd.DataFrame(rows).set_index("alpha")
    return sweep_df


# ── plotting helpers ───────────────────────────────────────────────────────────

def plot_alpha_sweep(sweep_df: pd.DataFrame, figures_dir: Path | None = None) -> None:
    """
    Plot key metrics as a function of alpha (CF weight).
    """
    metrics_to_plot = ["HitRate@10", "Precision@10", "Recall@10", "NDCG@10", "Coverage"]
    available = [m for m in metrics_to_plot if m in sweep_df.columns]

    fig, axes = plt.subplots(1, len(available), figsize=(3.5 * len(available), 4), sharey=False)
    if len(available) == 1:
        axes = [axes]

    for ax, metric in zip(axes, available):
        ax.plot(sweep_df.index, sweep_df[metric], marker="o", linewidth=2)
        best_alpha = sweep_df[metric].idxmax()
        ax.axvline(best_alpha, color="red", linestyle="--", linewidth=1, alpha=0.6,
                   label=f"best α={best_alpha}")
        ax.set_title(metric, fontsize=11)
        ax.set_xlabel("α  (CF weight)")
        ax.xaxis.set_major_locator(mticker.MultipleLocator(0.1))
        ax.legend(fontsize=8)

    fig.suptitle("Hybrid Model – Alpha Sweep", fontsize=13, y=1.02)
    plt.tight_layout()
    if figures_dir is not None:
        path = Path(figures_dir) / "hybrid_alpha_sweep.png"
        plt.savefig(path, bbox_inches="tight")
        print(f"Saved figure → {path}")
    plt.show()


def plot_model_comparison(results_df: pd.DataFrame, figures_dir: Path | None = None) -> None:
    """
    Bar chart comparing all three model families across key ranking metrics.

    results_df : DataFrame with model names as index and metric columns.
    """
    ranking_metrics = ["HitRate@10", "Precision@10", "Recall@10", "NDCG@10", "Coverage"]
    available = [m for m in ranking_metrics if m in results_df.columns]

    x = np.arange(len(available))
    width = 0.8 / max(len(results_df), 1)

    fig, ax = plt.subplots(figsize=(10, 5))
    for i, (model_name, row) in enumerate(results_df.iterrows()):
        vals = [row.get(m, 0) for m in available]
        ax.bar(x + i * width, vals, width=width, label=model_name)

    ax.set_xticks(x + width * (len(results_df) - 1) / 2)
    ax.set_xticklabels(available)
    ax.set_ylabel("Score")
    ax.set_title("Model Comparison – Ranking Metrics")
    ax.legend(loc="upper right")
    plt.tight_layout()
    if figures_dir is not None:
        path = Path(figures_dir) / "hybrid_model_comparison.png"
        plt.savefig(path, bbox_inches="tight")
        print(f"Saved figure → {path}")
    plt.show()


# ── single-user recommendation helper (useful for demos) ──────────────────────

def recommend_for_user(
    user: int,
    hybrid_recs: dict,
    courses_df: pd.DataFrame,
    top_n: int = 10,
) -> pd.DataFrame:
    """
    Return a human-readable recommendation table for a single user.

    Returns
    -------
    DataFrame with columns: COURSE_ID, TITLE, hybrid_score, [genre columns]
    """
    if user not in hybrid_recs:
        print(f"User {user} not in hybrid_recs.")
        return pd.DataFrame()

    top = hybrid_recs[user].head(top_n).reset_index()
    top.columns = ["COURSE_ID", "hybrid_score"]
    merged = top.merge(
        courses_df[["COURSE_ID", "TITLE"] + GENRE_COLS],
        on="COURSE_ID",
        how="left",
    )
    return merged
