# HybridModel — Hybrid Recommender, Explainability & LLM Layer

## Overview

This folder is the **machine-learning core** of the XplainaV301 system. It takes the pre-trained artefacts produced by `rawModelsProcessing/` (the TF-IDF similarity matrix and the KNN prediction dictionaries) and combines them into a **weighted hybrid recommendation model**. On top of the recommender it adds a full explainability stack (SHAP + LIME via a local surrogate model) and an LLM layer that turns numeric scores into human-readable natural-language explanations.

The folder is structured as Python utility modules (importable at runtime by the backend API) plus three Jupyter notebooks for experimentation and evaluation.

---

## Artefacts Received from `rawModelsProcessing/`

| Artefact | Path | Purpose |
|---|---|---|
| `tfidf_similarity.pkl` | `../models/tfidf_similarity.pkl` | $307 \times 307$ course–course cosine-similarity matrix |
| `06_pred_user_knn.pkl` | `../models/06_pred_user_knn.pkl` | Dict `{user_id → pd.Series(course_id → predicted_rating)}` for 34 082 users |
| `06_pred_item_knn.pkl` | `../models/06_pred_item_knn.pkl` | Same but from Item-KNN |
| `final_courses.csv` | `../data/processed/` | Course metadata with genre binary columns |
| `ratings_full_with_predictions.csv` | `../data/processed/` | Full ratings (real + synthetic) used for train/test splits |

---

## File Map

```
HybridModel/
├── utils_hybrid.py          # Core scoring engine — CF, Content-Based, Hybrid blend
├── utils_explainability.py  # SHAP + LIME surrogate-model explainability
├── utils_llm.py             # Prompt builder + OpenAI / Claude API wrapper
├── H1_Hybrid_Recommender.ipynb   # Hybrid model experiments & alpha sweep
├── H2_Explainability.ipynb       # SHAP / LIME experiments
├── H3_LLM_Explanations.ipynb     # LLM prompt engineering experiments
└── models/                  # Intermediate pickles for notebook experiments
    ├── H1_hybrid_recs_best.pkl
    ├── H1_hybrid_meta.pkl
    └── H1_sim_df_tfidf.pkl
```

---

## `utils_hybrid.py` — The Scoring Engine

This is the most important file in the folder. Every recommendation served by the API is computed by calling functions from this module.

### Genre Vocabulary

```python
GENRE_COLS = [
    "Database", "Python", "CloudComputing", "DataAnalysis", "Containers",
    "MachineLearning", "ComputerVision", "DataScience", "BigData",
    "Chatbot", "R", "BackendDev", "FrontendDev", "Blockchain",
]
```

14 binary genre features, shared consistently across all modules. They are used as both content-similarity features and as the feature space for the SHAP/LIME surrogate model.

---

### Content-Based Filtering Signal

**Function: `build_content_similarity(courses_df, method='tfidf')`**

Builds the course×course cosine-similarity matrix from scratch (used in notebooks; at runtime the pre-computed pickle is loaded instead).

1. For each course, concatenate `TITLE` (lowercase) with the names of active genre tags into a single text document.
2. Vectorise with `TfidfVectorizer` (or `CountVectorizer` for BoW).
3. Compute pairwise cosine similarity to produce a $307 \times 307$ `pd.DataFrame` indexed and columned by `COURSE_ID`.

**At inference time:**  
A user's content score for a candidate course is the **mean cosine similarity** between that candidate and all courses the user has previously taken:

$$\text{content}(u, i) = \frac{1}{|\text{seen}(u)|} \sum_{j \in \text{seen}(u)} \text{sim}(j, i)$$

This gives higher scores to courses that are collectively similar to the user's existing history, rewarding topical coherence.

---

### Collaborative Filtering Signal

**Functions: `build_cf_predictions()`, `user_knn_predictions()`, `item_knn_predictions()`**

At runtime, instead of re-training, the pre-computed dicts from `../models/06_pred_user_knn.pkl` are loaded directly. These dicts map every user to a `pd.Series` of predicted ratings (scale 1–3).

**Critical problem solved — CF Normalization:**

The raw KNN predictions have a **bimodal distribution**: courses rated by at least one similar neighbour get predictions in the 2.0–3.0 band; courses no neighbour has ever rated get a prediction of exactly 0. If these are normalized together with a global min-max, the 0s stay at 0% and everything else clusters at 67–100%, making CF scores look binary ("0% or 100%").

**Fix — `_normalize_cf_series(s)`:**  
Normalize **only within the non-zero subset**, spreading the legitimate predictions smoothly across [0, 1], while items with no signal stay at 0 (they genuinely have no collaborative evidence):

```python
nz = s[s > 0]
result[nz_mask] = (nz - nz.min()) / (nz.max() - nz.min())
result[~nz_mask] = 0.0
```

---

### Cold-Start CF for New (Real) Users

**Function: `build_dynamic_cf_series(selected_items, cf_predictions, train_df, all_items, k_neighbors=15)`**

**Problem:** New users created through the signup flow are not in the KNN model — they have no row in `06_pred_user_knn.pkl`. Without this function their CF score would always be 0%.

**Solution — Jaccard-Weighted Neighbour Blending:**

1. Build a set of the new user's selected courses.
2. For every dataset user in `train_df`, compute the **Jaccard similarity** between their rated courses and the new user's selected courses:

   $$J(u, v) = \frac{|\text{courses}(u) \cap \text{courses}(v)|}{|\text{courses}(u) \cup \text{courses}(v)|}$$

3. Keep the top-15 most similar dataset users (those with $J > 0$).
4. Blend their pre-computed KNN predictions weighted by Jaccard similarity:

$$\text{CF}_{\text{dynamic}}(i) = \sum_{v \in \text{top-}k} \frac{J(u,v)}{\sum J} \cdot \hat{r}_{v,i}$$

This gives real users a meaningful CF signal derived from the behaviour of users with the most similar course history, effectively solving the cold-start problem without retraining any model.

---

### Hybrid Scoring

**Function: `hybrid_scores_for_user(user, train_df, cf_predictions, sim_df, alpha=0.5, top_n=10, normalize=True, user_items_override=None)`**

This is the main entry point called by the API for every recommendation request.

**Formula:**

$$\text{hybrid}(u, i) = \alpha \cdot \text{CF}_{\text{norm}}(u, i) + (1 - \alpha) \cdot \text{Content}_{\text{norm}}(u, i)$$

Where:
- $\alpha = 0.5$ by default (equal weighting; tunable via the API parameter)
- CF signal: from pre-computed KNN dict **or** dynamically built via `build_dynamic_cf_series` for new users
- Content signal: mean cosine similarity to the user's taken courses
- Both signals are independently normalised before blending so neither dominates due to scale differences

**`user_items_override` parameter:**  
Allows the API to pass a real user's selected course list directly, bypassing any lookup in `train_df`. This unifies the code path for dataset users and real users — both go through the same function, same normalisation, same hybrid formula.

**Final step:** Drop all courses the user has already taken, sort descending, return top-N.

---

### Evaluation Helpers

**Functions in `utils_hybrid.py`:**

| Function | Purpose |
|---|---|
| `train_test_split_by_user()` | Per-user 80/20 split, preserving users with < 5 ratings entirely in train set to avoid empty test sets |
| `evaluate_hybrid()` | Computes RMSE, MAE, HitRate@10, Precision@10, Recall@10, NDCG@10, Coverage |
| `alpha_sweep()` | Evaluates the hybrid at $\alpha \in \{0.0, 0.1, ..., 1.0\}$ to find the optimal blend |
| `plot_alpha_sweep()` | Line plot of metrics vs alpha |
| `plot_model_comparison()` | Bar chart comparing CBF, User-KNN, Item-KNN, Hybrid side by side |
| `recommend_for_user()` | Human-readable DataFrame of top-N with titles and genres (used in notebooks) |

---

## `utils_explainability.py` — SHAP + LIME Explainability

The explainability layer answers: *"Why was this specific course recommended to this specific user?"*

### Architecture: Local Surrogate Model

Rather than trying to explain the hybrid formula directly (which is a simple weighted sum and not directly attributable to features), the system trains a **local surrogate model** — a `RandomForestRegressor` — that approximates the hybrid scoring function using genre binary features as inputs.

**Step 1 — Build surrogate dataset:**  
For a given user, compute the hybrid score for all 307 courses using the same CF + Content pipeline. This produces a target vector $y \in \mathbb{R}^{307}$. The feature matrix $X$ is the 307×14 binary genre matrix. The surrogate learns to map genre profiles to hybrid scores.

**Step 2 — Train surrogate:**  
`RandomForestRegressor(n_estimators=100, max_depth=5)` is fit on $(X, y)$. Because $y$ is already computed (not a label that could leak), this is purely an approximation step.

**Step 3 — SHAP (SHapley Additive exPlanations):**

```python
explainer = shap.TreeExplainer(model, X_train)
shap_values = explainer.shap_values(x_instance)
```

SHAP values assign each feature (genre) a contribution to the prediction score relative to the base rate. A positive SHAP value for `MachineLearning` means belonging to that genre pushed the score up for this instance. SHAP is grounded in cooperative game theory (Shapley values) and guarantees consistency and local accuracy.

**Step 4 — LIME (Local Interpretable Model-Agnostic Explanations):**

```python
explainer = LimeTabularExplainer(X_train.values, mode='regression')
exp = explainer.explain_instance(x_instance.values, model.predict)
```

LIME perturbs the feature vector of the target course, observes how the surrogate's prediction changes, and fits a simple linear model to those perturbations. The linear coefficients become the LIME weights — positive weight = the genre increases the score, negative = it reduces it.

**`ExplanationResult` dataclass:**
```
course_id, title, hybrid_score, cf_score, content_score,
alpha, shap_values, lime_values, top_genres_matched, similar_courses
```

`top_genres_matched` = genres that are active (=1) on the recommended course, giving the user a plain-text reason.  
`similar_courses` = up to three courses from the user's history that are most similar to the recommended course (top cosine-similarity neighbours), explaining the content signal source.

---

## `utils_llm.py` — Natural Language Explanation Layer

Converts the numeric `ExplanationResult` into a 2–3 sentence student-friendly explanation using a real LLM.

### Prompt Construction (`build_llm_prompt`)

The prompt is built deterministically from the explanation struct:
- States the CF score and Content score so the LLM understands the model's confidence
- Lists matching genres (why the course fits the student's interest profile)
- Names similar courses from the student's history (why content recommends it)
- Identifies the top 3 positive SHAP feature names (what the AI explainer flagged as strongest)
- Asks the LLM for a friendly 2–3 sentence explanation addressed directly to the student

### LLM Providers

| Provider | Function | Default model |
|---|---|---|
| OpenAI | `call_openai()` | `gpt-3.5-turbo` |
| Anthropic (Claude) | `call_claude()` | `claude-3-haiku-20240307` |

The provider and API key are passed per-request by the frontend (via `/llm-explain` API endpoint), so the system is not locked to one provider. API keys are never stored server-side.

---

## Notebooks

### `H1_Hybrid_Recommender.ipynb`

Experiments with the hybrid model:
- Loads artefacts from `../models/` and `../data/processed/`
- Runs `alpha_sweep()` from $\alpha = 0$ to $\alpha = 1$ in steps of 0.1
- Plots HitRate, Precision, Recall, NDCG, Coverage as a function of $\alpha$
- Identifies the best $\alpha$ per metric
- Saves the best recommendation dict to `models/H1_hybrid_recs_best.pkl`

### `H2_Explainability.ipynb`

End-to-end test of the SHAP and LIME pipelines:
- Picks a sample user and a recommended course
- Runs `explain_recommendation()`, prints `ExplanationResult`
- Renders SHAP bar charts and LIME weight tables
- Validates that SHAP + LIME values are directionally consistent

### `H3_LLM_Explanations.ipynb`

Prompt engineering experiments:
- Takes an `ExplanationResult` and runs `build_llm_prompt()`
- Shows the raw prompt that would be sent to the LLM
- Tests API calls with different providers/models
- Used to iterate on prompt phrasing before finalising `utils_llm.py`

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Surrogate model for XAI | The hybrid formula is a differentiable linear combination, but SHAP/LIME need a feature-based model. A Random Forest trained to approximate $y$ lets us attribute scores to genre features in a principled way. |
| SHAP + LIME both used | They complement each other: SHAP provides global feature importance (Shapley axioms); LIME provides local linear approximation (intuitive coefficients). Showing both gives users confidence that the explanation is consistent. |
| `max_depth=5` on surrogate | Prevents overfitting to the 307-sample dataset while remaining complex enough to capture genre interactions. |
| `_normalize_cf_series` instead of `_normalize_series` for CF | Avoids the bimodal 0%/100% display bug caused by mixing structural zeros (no neighbour data) with genuine low-rating predictions in the same normalization window. |
| Jaccard for cold-start CF | Jaccard naturally handles asymmetric selections (a user who took 3/5 of your courses is more similar than one who took 3/100). It requires no matrix inversion and is $O(n_{\text{users}})$, making it fast enough for a request-time computation. |
