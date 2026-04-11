# XplainaV301: Explainable Hybrid Course Recommendation Engine

Welcome to the **XplainaV301** project! 

The primary goal of this application is not just to recommend online courses accurately but to do what most modern machine learning systems fail to do: **Explain themselves visually and logically to the user.** By integrating Collaborative Filtering mechanisms with Content-Based algorithms and layering SHAP/LIME Explainable AI (XAI) over it, Xplaina translates complex algorithmic vectors into human-readable insights.

This repository is massive—it spans from raw Jupyter Data Science notebooks and serialized ML models up to a robust Next.js frontend application hooked into a FastAPI orchestration layer natively authenticated via PostgreSQL.

---

## 🏗️ Architecture Overview

The system architecture is generally split into 3 distinct functional roles:
1. **Data Science & ML Prototyping (`/rawModelsProcessing`, `/data`, `/models`, `/figures`)**: The playground where datasets were cleaned, algorithms like TF-IDF and User-KNN were benchmarked against HitRate and RMSE, and finalized models were serialized (`.pkl`).
2. **The Prediction Backend (`/backend`, `/HybridModel`)**: A high-performance Python FastAPI server importing the finalized pickled ML models, acting as a gateway taking JSON inputs over HTTP to score recommendations on-the-fly.
3. **The User Interface (`/frontend`)**: A visually engaging Next.js 14 React UI that manages sessions with FastAPI, maps courses, and graphs our SHAP/LIME backend predictions beautifully using ReCharts.

---

## 🗂️ Absolute Project Folder Breakdown

### 1. `/rawModelsProcessing` (The Data Science Sandbox)
*This folder contains all the experimental pipeline notebooks validating the ML algorithms from ground zero.*
- **`01_EDA_Clean.ipynb`**: Exploratory Data Analysis. Cleans missing dataset rows, extracts features, and assesses rating distributions.
- **`02_Content_Based_Before_Clean.ipynb` & `05_Content_Based_After_Clean.ipynb`**: Tests how well suggesting courses solely based on text descriptors/genres performs before and after the dataset was refined.
- **`03...` & `06_Collaborative_Filtering_After_Clean`**: Notebook & Python scripts calculating User-KNN. It suggests courses based purely on what other users who had similar course trajectories took.
- **`04_Predict_Unrated_And_Merge_Clean.ipynb`**: Handles matrix completion. Ingests unrated courses and attempts to predict how subsets of users would rate them to build a robust `[user, item, rating]` matrix.
- **`07_Final_Comparison_Clean.ipynb`**: Puts Collaborative vs. Content-Based head-to-head calculating Top-10 Hit Rates (HR@10), NDCG, and Mean Absolute Errors (MAE).
- **`FINAL_FIXED_TFIDF_BOW.ipynb`**: The finalized notebook used to extract Bag-of-Words and TF-IDF vectors from course titles and descriptions.

### 2. `/HybridModel` (Core Production Intelligence)
*When Data Science meets software engineering. This folder stores the final production orchestration pipelines the backend will use to merge algorithms.*
- **`H1_Hybrid_Recommender.ipynb`**: The master notebook mathematically combining Collaborative Filtering and TF-IDF Content calculations to generate an aggregated "Hybrid Score" multiplied against a tuning weight (`alpha`).
- **`H2_Explainability.ipynb`**: Deep dive into generating SHAP/LIME values to extract numerical influences highlighting *why* the hybrid model chose a course.
- **`utils_hybrid.py`**: A python script exposing the `hybrid_scores_for_user` function for fast runtime ingestion.
- **`utils_explainability.py`**: The production code that dynamically builds small Ridge Regression surrogate models around a given course vector, extracting the SHAP/LIME graph metrics arrays dynamically!

### 3. `/data` (The Data Lakes)
- **`/raw`**: Contains the untouched raw datasets `ratings.csv` (over 5MB of historical student ratings) and `course_genre.csv`.
- **`/processed`**: The final optimized outputs of our `/rawModelsProcessing` notebooks.
  - `ratings_full_with_predictions.csv`: The finalized user-to-item rating matrix.
  - `final_courses.csv`: The consolidated, mapped IDs, titles, and genre boolean maps of every course.

### 4. `/models` & `/figures` (Serialized Data & Graphs)
- **`/models/06_pred_user_knn.pkl`**: A serialized Collaborative Filtering prediction matrix. Saves the FastAPI backend from having to crunch math against millions of ratings on boot!
- **`/models/tfidf_similarity.pkl`**: The matrix containing raw similarity metric distances between essentially every course and every other course based on their genres and textual descriptions.
- **`/figures`**: Contains visual PNG graphs (like `comparison_cf_RMSE.png` or `eda_genre_distribution.png`) automatically plotted during the Notebook phases for paper/reporting comparisons.

### 5. `/backend` (The Rest-API Orchestrator)
*The Python FastAPI server exposing the ML brains over `http://localhost:8000`.*
- **`main.py`**: Provides the main API endpoints (`/recommend`, `/recommend/dynamic`, `/explain`, `/courses`). 
- **`loader.py`**: Runs specifically utilizing FastAPI's `@asynccontextmanager lifespan`. It loads `/data` and `/models` into RAM at runtime startup so HTTP requests reply within milliseconds rather than seconds.
- **`api_auth.py` & `auth.py`**: Provides pure FastAPI JWT authentication completely replacing traditional Supabase GoTrue limits. Hashing, salting, custom `users` database Postgres executions.
- **`test_run.py` & `test_xai_local.py`**: Local CLI test scripts asserting that endpoints render accurate JSONs.

### 6. `/frontend` (Next.js Application)
*The Next.js user interface hosted on `http://localhost:3000`.*
- **`/src/app/page.jsx`**: The root routing guard checking if you need to login or sending you to the dashboard.
- **`/src/app/dashboard/page.jsx`**: Displays a side-nav of "Courses You've Taken" retrieved from the JWT session and fetches "Recommended for You" displaying accurate percentage hybrid matches.
- **`/src/app/select-courses/page.jsx`**: The enrollment UI. If a real user joins natively, they must declare what courses they've already taken here. This triggers Dynamic Content-Based filtering for cold-started accounts!
- **`/src/app/login` & `/src/app/signup`**: The authentication gateway mapping precisely to the Python `/auth` routes.
- **`/src/components/ExplainModal.jsx`**: The crown jewel of the XAI implementation. Given a user and a recommended course, it fetches the raw `/explain` endpoint data and instantly builds horizontal visual bar-graphs exposing the Top Positive and Negative variables explicitly validating *why* the course was pushed top-deck.

### 7. Global Configs
- **`schema.sql`** & **`fix_db.sql`**: Foundational PostgreSQL scripts deployed natively on Supabase granting proper `users` tables, mapping `user_courses` configurations, and deliberately suspending Row-Level-Security (RLS) policies allowing FastAPI backend service orchestration absolute oversight.

---

## 👥 Real Users vs. Dataset Users (The Two Flows)

Xplaina natively addresses two distinctly different user bases seamlessly:

### 1. The Legacy Dataset User (Static Collaborative Predictions)
The system was trained utilizing the CSV files loaded in `/data`. These legacy student IDs (For example, dataset ID `2`) have deep collaborative filtering structures pre-loaded into the `/models/06_pred_user_knn.pkl` files.
- **Login Flow**: They log in exactly with their ID digits and a hardcoded universal simulation password: `test000`.
- **Recommendation Path**: Since their matrices are pre-computed, hitting recommendations calculates their explicit `hybrid_scores_for_user()` blending historical CF weights against mapped CB weights instantly. 

### 2. The New Real User (Dynamic Cold Start Content Validation)
A modern user signing up from `/signup` does not exist in the legacy python ML `.pkl` dictionaries! They arrive possessing strict UUIDs generated by our pure Postgres `public.users` table. 
- **The "Cold Start" Problem**: How do you predict a user if you have no context of their likes?
- **The Solution Path**: Upon signup, Xplaina diverts them straight to `/select-courses`. By capturing precisely what courses they declare here in real-time we bypass the missing User-KNN vectors and funnel their queries straight into the `POST /recommend/dynamic` API endpoint—heavily biasing exclusively toward Context-Based genre and text similarities!