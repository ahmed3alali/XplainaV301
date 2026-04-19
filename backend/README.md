# backend — FastAPI REST API

## Overview

This folder is the **server-side application** that bridges the machine-learning models (built in `rawModelsProcessing/` and `HybridModel/`) with the Next.js frontend. It is a FastAPI application that:

1. Loads all model artefacts into memory once at startup.
2. Handles user authentication (signup, login, JWT issuance).
3. Serves course recommendations and XAI explanations through a clean REST API.
4. Manages per-user course selections in a Supabase PostgreSQL database.

The server runs on `http://localhost:8000` and is started with:

```bash
python -m uvicorn main:app --reload --port 8000
```

---

## File Map

```
backend/
├── main.py          # FastAPI app — all route handlers
├── api_auth.py      # Authentication router (signup, login)
├── auth.py          # JWT + bcrypt helpers
├── loader.py        # Model artefact loader — runs once at startup
├── schemas.py       # Pydantic request/response models
├── requirements.txt # Python dependencies
└── .env             # Supabase URL + ANON key (not committed)
```

---

## `loader.py` — Startup Data Loading

**Function: `load_all_data()`**

Called once when the FastAPI application starts (via `lifespan` context manager in `main.py`). Reads all model artefacts from disk into the global `AppState` singleton so they are shared across all requests with zero repeated I/O.

| Attribute | Source file | Type | Notes |
|---|---|---|---|
| `ratings_full` | `data/processed/ratings_full_with_predictions.csv` | `pd.DataFrame` | ≈233 k rows (real + synthetic users) |
| `courses_df` | `data/processed/final_courses.csv` | `pd.DataFrame` | 307 courses with genre binary columns |
| `cf_predictions` | `models/06_pred_user_knn.pkl` | `dict[int, pd.Series]` | 34 082 users → predicted ratings |
| `sim_df` | `models/tfidf_similarity.pkl` | `pd.DataFrame` | 307×307 TF-IDF cosine similarity |
| `train_df` | Derived at startup | `pd.DataFrame` | 80% of `ratings_full`, per-user split |
| `test_df` | Derived at startup | `pd.DataFrame` | 20% of `ratings_full`, for evaluation |

Train/test split uses `train_test_split_by_user` from `utils_recommender.py`: users with fewer than 5 ratings are kept entirely in train to prevent empty test sets.

---

## `auth.py` — JWT & Password Utilities

Pure utility module with no routes.

### Password Hashing — bcrypt

```python
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
```

`bcrypt` is used instead of SHA-256/MD5 because it is deliberately slow (computationally expensive), making brute-force and rainbow-table attacks infeasible. Each hash includes a random salt, so identical passwords produce different hashes.

### JWT Token — HS256

```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "xplaina_super_secret_key_v3")
ALGORITHM  = "HS256"
EXPIRE     = 60 * 24 * 7  # 7 days
```

Tokens are signed with HMAC-SHA256 and contain:
- `sub`: the user's ID (UUID string for real users, numeric string for dataset users)
- `type`: `"real_user"` or `"dataset_user"`
- `exp`: Unix timestamp of expiry

Tokens are verified on every protected endpoint by `get_current_user()` in `api_auth.py`.

---

## `api_auth.py` — Authentication Router

### Two-class User Model

The system distinguishes exactly two types of users:

| User type | `type` claim | Identity | Password |
|---|---|---|---|
| **Dataset user** | `dataset_user` | Numeric IBM learning ID (e.g. `2`) | Fixed shared password `test000` |
| **Real user** | `real_user` | UUID from Supabase `users` table | Bcrypt-hashed, stored in Supabase |

This dual model was necessary because the ratings dataset contains ~33 000 pre-existing user IDs with historical ratings that power the CF model, but the application must also onboard brand-new users who have no historical data.

### `POST /auth/signup`

1. Query Supabase `users` table to check if the email is already registered.
2. Hash the password with bcrypt.
3. Insert a new row into `users` (columns: `id` UUID, `email`, `password_hash`).
4. Issue a JWT with `type = "real_user"` and `sub = uuid`.
5. Return the token and metadata to the frontend.

### `POST /auth/login`

**Hybrid login logic:**

```python
if identifier.isdigit() and password == "test000":
    # Dataset user path — no DB lookup needed
    token = create_access_token({"sub": identifier, "type": "dataset_user"})

else:
    # Real user path — look up email in Supabase users table
    res = supabase.table("users").select("id, password_hash").eq("email", identifier).execute()
    verify_password(password, res.data[0]["password_hash"])
    token = create_access_token({"sub": uuid, "type": "real_user"})
```

The single login endpoint handles both user types transparently. The frontend does not need to know which type the user is — the `user_type` field in the response carries that information.

---

## `schemas.py` — Pydantic Models

| Schema | Direction | Fields |
|---|---|---|
| `CourseOut` | Response | `COURSE_ID`, `TITLE`, `genres: List[str]` |
| `RecommendationOut` | Response | `course_id`, `title`, `hybrid_score`, `genres: List[str]` |
| `ExplanationOut` | Response | `course_id`, `title`, `hybrid_score`, `cf_score`, `content_score`, `alpha`, `shap_values`, `lime_values`, `top_genres_matched`, `similar_courses` |
| `DynamicRecommendRequest` | Request body | `selected_courses: List[str]`, `top_n`, `alpha` |
| `DynamicExplainRequest` | Request body | `selected_courses`, `course_id`, `alpha` |
| `LLMExplainRequest` | Request body | `user_id`, `course_id`, `provider`, `api_key`, `model`, `alpha` |
| `LLMExplainResponse` | Response | `course_id`, `title`, `prompt_used`, `llm_response`, `provider` |

Pydantic validates all incoming requests automatically and serialises all responses. The `CourseOut` model uses field aliases (`COURSE_ID` → `course_id`) to bridge the CSV column naming convention with JSON camelCase.

---

## `main.py` — Route Handlers

### Application Lifecycle

```python
@asynccontextmanager
async def lifespan(app):
    load_all_data()   # Runs ONCE at startup — loads all pickles
    yield
    print("Shutting down")
```

### CORS Configuration

```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]
```

The `CORSMiddleware` is also replicated in the global exception handler (`global_exception_handler`) — otherwise FastAPI's default error responses would not carry CORS headers, causing the browser to silently swallow 500 errors.

---

### Course Endpoints

#### `GET /courses` / `GET /courses/all`
Returns the full course catalogue (up to 9 999 items by default — effectively all 307).  
Looks up genre columns from `courses_df` and produces `CourseOut` objects with a `genres: List[str]` field containing only the active genres.

#### `GET /courses/my-courses` *(protected)*
- **Dataset user**: queries `ratings_full` for all items the user has rated.
- **Real user**: queries the Supabase `user_courses` table (columns: `user_id`, `course_id`).

#### `POST /courses/my-courses` *(protected)*
- **Dataset user**: returns a no-op (historical data is read-only).
- **Real user**: deletes all existing rows from `user_courses` for this user, then bulk-inserts the new selection. This is an upsert-by-replace pattern — simple and atomic.

---

### Recommendation Endpoints

#### `GET /recommend/{user_id}`  
For **dataset users** who exist in the KNN model.

1. Calls `hybrid_scores_for_user(user=user_id, train_df, cf_predictions, sim_df, alpha, top_n)` from `HybridModel/utils_hybrid.py`.
2. Looks up title and genre for each recommended `course_id` in `courses_df` (O(1) via `.set_index('COURSE_ID')`).
3. Returns `List[RecommendationOut]` with `hybrid_score` and `genres`.

#### `POST /recommend/dynamic`  
For **real (cold-start) users** not in the KNN model.

Uses the same `hybrid_scores_for_user` function but passes `user_items_override=req.selected_courses` and a sentinel user ID (`-999999`) that is guaranteed not to exist in `cf_predictions`. This triggers the cold-start CF branch inside `utils_hybrid.py` which calls `build_dynamic_cf_series()` to derive a CF signal from similar dataset users via Jaccard similarity.

**This is the key architectural decision:** both user types go through **identical scoring logic**. The only difference is whether the CF signal comes from a pre-computed pickle or a runtime Jaccard-blending call.

---

### Explanation Endpoints

#### `GET /explain/{user_id}/{course_id}`  
For dataset users.

Calls `explain_recommendation(user, course_id, train_df, cf_predictions, sim_df, courses_df, alpha)` from `HybridModel/utils_explainability.py`. This:
1. Rebuilds the hybrid scores for all 307 courses for this user.
2. Trains a `RandomForestRegressor` surrogate on (genre matrix → hybrid scores).
3. Runs SHAP (`TreeExplainer`) and LIME (`LimeTabularExplainer`) on the specific course instance.
4. Returns the full `ExplanationOut` struct with both sets of feature attributions.

#### `POST /explain/dynamic`  
For real users.

Same as above but uses `build_dynamic_cf_series()` to construct the CF signal before building the surrogate and running SHAP/LIME. Uses `_normalize_cf_series` (the smooth CF normalisation) and `_normalize_series` (standard min-max for content) before blending, matching the recommendation logic exactly.

#### `POST /llm-explain`  
Optional endpoint. Takes an existing explanation (from the dataset-user path), builds a structured prompt via `build_llm_prompt()`, and calls either OpenAI or Claude. The API key is passed per-request by the client — it is never stored on the server.

---

## Data Flow Diagram

```
Startup
  └─ loader.load_all_data()
       ├─ ratings_full_with_predictions.csv  ──► AppState.ratings_full
       ├─ final_courses.csv                  ──► AppState.courses_df
       ├─ 06_pred_user_knn.pkl               ──► AppState.cf_predictions
       └─ tfidf_similarity.pkl               ──► AppState.sim_df

POST /auth/login
  └─ identifier.isdigit()? ──► dataset_user JWT
     else ──► Supabase users table ──► real_user JWT

GET /recommend/{user_id}             POST /recommend/dynamic
  └─ hybrid_scores_for_user()          └─ hybrid_scores_for_user(
       ├─ CF: cf_predictions[user]           user_items_override=[...])
       └─ Content: sim_df mean               ├─ CF: build_dynamic_cf_series()
                                             └─ Content: sim_df mean
         ↓  both paths ↓
   _normalize_cf_series(cf)   +   _normalize_series(content)
   hybrid = α·cf + (1-α)·content
   drop seen → top-N → RecommendationOut[]

GET /explain/{user_id}/{course_id}
  └─ explain_recommendation()
       ├─ Rebuild hybrid scores (all 307 courses)
       ├─ Train RandomForestRegressor surrogate
       ├─ SHAP TreeExplainer ──► shap_values dict
       ├─ LIME LimeTabularExplainer ──► lime_values dict
       └─ ExplanationOut
```

---

## Environment Variables (`.env`)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
JWT_SECRET_KEY=xplaina_super_secret_key_v3
```

The `.env` file is read manually at startup (before FastAPI initialises) so that Supabase credentials are available both inside route handlers and in `get_supabase()`.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | Web framework — async routing, dependency injection, automatic OpenAPI docs |
| `uvicorn` | ASGI server |
| `pydantic` | Request validation and response serialisation |
| `pandas` / `numpy` | In-memory data manipulation for scoring |
| `scikit-learn` | RandomForestRegressor (surrogate model) |
| `shap` | TreeExplainer for SHAP values |
| `lime` | LimeTabularExplainer for local linear approximations |
| `pyjwt` | JWT encode/decode |
| `passlib[bcrypt]` / `bcrypt` | Password hashing |
| `supabase` | Supabase Python client (user management, course selections) |
| `google-auth` | Google OAuth2 token verification (infrastructure ready) |
| `openai` / `anthropic` | LLM API clients |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Lifespan-based model loading | All 111 MB pickles load once at startup; subsequent requests are microsecond-fast in-memory operations. |
| Single `/auth/login` endpoint for both user types | The frontend does not need separate login flows; the server inspects the identifier format and routes accordingly. |
| `user_items_override` parameter unifies both code paths | Rather than duplicating scoring logic for real vs dataset users, a single parameter controls which course list is used as the "seen" set and CF input. |
| CORSMiddleware + global exception handler | FastAPI's default 422 and 500 responses bypass the CORS middleware, causing the browser to reject error responses. The custom handler ensures every response — even errors — carries the correct `Access-Control-Allow-Origin` header. |
| Surrogate model rebuilt per explanation request | Storing 34 000 surrogate models would require gigabytes of RAM. A 307-sample Random Forest trains in < 100 ms, making per-request training fast enough. |
