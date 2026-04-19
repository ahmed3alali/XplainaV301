# rawModelsProcessing — Data Pipeline & Model Prototyping

## Overview

This folder is the **starting point of the entire project**. It contains a sequence of Jupyter notebooks that take the raw IBM course-rating dataset, clean it, explore it, build both Content-Based and Collaborative Filtering models in isolation, evaluate them, and finally export the trained artefacts that every downstream component depends on.

The notebooks are numbered in the order they should be executed. The outputs (processed CSVs and serialised model pickles) are written to `../data/processed/` and `../models/`.

---

## Input Data (`../data/raw/`)

| File | Description |
|---|---|
| `ratings.csv` | User–course interaction records. Each row has three columns: `user` (integer user ID), `item` (string course ID), `rating` (integer 1–3). The dataset contains **≈ 233 k rows** across **≈ 33 k distinct users** and **307 distinct courses**. |
| `course_genre.csv` | Binary genre matrix. One row per course, 14 genre columns: `Database`, `Python`, `CloudComputing`, `DataAnalysis`, `Containers`, `MachineLearning`, `ComputerVision`, `DataScience`, `BigData`, `Chatbot`, `R`, `BackendDev`, `FrontendDev`, `Blockchain`. A value of 1 means the course belongs to that genre. |

---

## Notebooks — Execution Order & Purpose

### `01_EDA_Clean.ipynb` — Exploratory Data Analysis & Cleaning

**What it does:**
- Loads `ratings.csv` and `course_genre.csv`.
- Computes distribution statistics: rating frequency, per-user rating counts, per-course rating counts.
- Identifies and removes duplicate records, checks for NaN entries.
- Merges the genre matrix onto the ratings to produce a unified view.
- Writes `../data/processed/cleaned_courses.csv` — the authoritative course list with genre columns attached.
- Writes `../data/processed/unrated_courses_from_eda.csv` — courses that appear in the genre file but have **zero** user ratings (cold-start items).

**Problem addressed:**  
The raw dataset has courses that no user has ever rated. Including them in training a CF model would add noise. This notebook separates them so they can be handled separately (see notebook 04).

---

### `02_Content_Based_Before_Clean.ipynb` — Content-Based Filtering (Phase 1)

**What it does:**
Builds the first version of the Content-Based Filtering (CBF) model **before** the predicted-rating augmentation step.

**Technique — TF-IDF + Bag-of-Words Cosine Similarity:**
1. For each course, a text document is constructed by concatenating the course title (lowercased) with the names of its active genre tags (e.g., `"machine learning with python python machinelearning datascience"`).
2. Two vectorisers are fitted:
   - **TF-IDF** (`TfidfVectorizer`, `stop_words='english'`): weights terms by how distinctive they are across the corpus. Common words like "introduction" get lower weights; specialised words like "blockchain" get higher weights.
   - **Bag-of-Words** (`CountVectorizer`): raw term counts, useful as a baseline.
3. **Cosine Similarity** is computed between every pair of course vectors, producing a $307 \times 307$ similarity matrix. Cosine similarity is preferred over Euclidean distance because it is length-invariant — two courses with the same genre mix but different text lengths are still treated equally.
4. Evaluation uses **Precision@10**, **Recall@10**, **NDCG@10**, and **Hit Rate** against held-out user ratings (80/20 user-level split). The surrogate prediction for rating is a weighted average of ratings from a user's training courses, weighted by their cosine similarity to the target course.

**Output:**  
Similarity matrices are saved to `../models/tfidf_similarity.pkl` and `../models/bow_similarity.pkl`.

---

### `03_Collaborative_Filtering_Before_Clean.ipynb` — CF (Phase 1, Sparse Data)

**What it does:**
Trains User-KNN and Item-KNN on the **original sparse** ratings matrix (only real ratings, no augmentation).

**Technique — K-Nearest-Neighbours Collaborative Filtering:**
1. A **User–Item matrix** $U$ is constructed via `pivot_table`, resulting in a $33k \times 307$ matrix where most cells are NaN (the matrix is extremely sparse — < 3% dense).
2. **User-KNN**: For each user $u$, find the $k = 20$ most similar other users using **cosine similarity** on their rating vectors (NaN treated as 0). The predicted rating for item $i$ is:

   $$\hat{r}_{u,i} = \frac{\sum_{v \in \text{neighbours}(u)} \text{sim}(u,v) \cdot r_{v,i}}{\sum_{v \in \text{neighbours}(u)} \text{sim}(u,v)}$$

   Only neighbours who have actually rated item $i$ contribute (rated mask = $r_{v,i} > 0$).

3. **Item-KNN**: Same idea transposed — find the $k$ most similar items to a target item, then predict by weighting over user ratings of those similar items.

4. Evaluation: RMSE, MAE on held-out test ratings; Precision@10, Recall@10, NDCG@10, Hit Rate@10, Coverage for ranking quality.

**Problem identified:**  
Because the matrix is so sparse, most user–item pairs yield a prediction of 0 (no neighbour has ever rated that course). This motivates the augmentation step in notebook 04.

---

### `04_Predict_Unrated_And_Merge_Clean.ipynb` — Regression-Based Augmentation

**What it does:**
Fills the cold-start gap by **predicting ratings for the 147 unrated courses** using a supervised regression model trained on course features.

**Technique — Regression on Genre Features:**
1. For each course that **has** ratings, compute `avg_rating` (mean of all user ratings).
2. Train a set of regression models using course features (`TITLE` via TF-IDF, genre binary columns, `num_genres`):
   - `LinearRegression`
   - `Ridge` (L2 regularisation)
   - `RandomForestRegressor`
   - `GradientBoostingRegressor`
3. 5-fold cross-validation selects the best model by RMSE.
4. The best model predicts a rating between 1 and 3 for each unrated course (clipped to this range since the dataset uses a 1–3 scale).
5. Each unrated course is appended to the ratings table as a **synthetic user** (user IDs from −1 downward), creating `../data/processed/ratings_full_with_predictions.csv`.

**Why this matters:**  
Without this step, the CF model can never recommend courses that no user has rated. The regression proxy lets the system produce candidates from the entire 307-course catalogue.

**Outputs:**
- `../data/processed/ratings_full_with_predictions.csv` — extended ratings (real + synthetic).
- `../data/processed/final_courses.csv` — cleaned course list used by all later stages.
- `../data/processed/predicted_unrated_courses_with_titles.csv` — the 147 courses with their predicted ratings.

---

### `05_Content_Based_After_Clean.ipynb` — CBF Re-evaluation (Phase 2)

**What it does:**
Re-evaluates the TF-IDF content model **after** the augmented dataset is available. Confirms that the similarity matrix quality is unchanged (content similarity is not affected by rating augmentation) and that evaluation metrics are stable. Acts as a sanity check before moving to the final hybrid.

---

### `06_Collaborative_Filtering_After_Clean.ipynb` — CF (Phase 2, Augmented Data)

**What it does:**
Re-trains User-KNN and Item-KNN on `ratings_full_with_predictions.csv` (the augmented dataset including synthetic users and predicted ratings).

**Key difference from notebook 03:**  
The synthetic rows add coverage — courses that had no real ratings now appear in the item columns of the user–item matrix, so the CF model can recommend them.

**Outputs (the critical production artefacts):**
- `../models/06_pred_user_knn.pkl` — dict mapping each of the **34 082 users** (real + synthetic) to a `pd.Series` of predicted ratings for all 307 courses.
- `../models/06_pred_item_knn.pkl` — same structure but from Item-KNN.

These pickles are loaded at API startup by `backend/loader.py` and held in memory for the lifetime of the server.

---

### `07_Final_Comparison_Clean.ipynb` — Model Comparison & Ablation

**What it does:**
Side-by-side comparison of all models built so far:
- Content-Based (TF-IDF & BoW)
- User-KNN (before + after augmentation)
- Item-KNN (before + after augmentation)

Produces Precision@10, Recall@10, NDCG@10, Hit Rate@10, Coverage, RMSE, and MAE tables. Includes visualisations (bar charts, coverage curves) saved to `../figures/`.

---

### `FINAL_FIXED_TFIDF_BOW.ipynb` — TF-IDF Similarity Final Export

**What it does:**
Runs the final, clean version of TF-IDF vectorisation and saves the similarity matrix that the API actually uses at runtime (`../models/tfidf_similarity.pkl`). This is the definitive version of the content matrix — identical logic to notebook 02 but isolated so it can be re-run independently without re-running the whole pipeline.

---

### `TFIDF_BOW_Visualization.ipynb` — Similarity Visualisation

**What it does:**
Generates heatmaps, dendrograms, and top-similar-course tables for the TF-IDF and BoW similarity matrices. Used for QA (sanity checking that similar courses cluster correctly) and for the project report figures.

---

## Output Artefacts Consumed by Downstream Folders

| Artefact | Location | Consumed by |
|---|---|---|
| `final_courses.csv` | `data/processed/` | `backend/loader.py`, `HybridModel/` notebooks |
| `ratings_full_with_predictions.csv` | `data/processed/` | `backend/loader.py`, `HybridModel/` notebooks |
| `tfidf_similarity.pkl` | `models/` | `backend/loader.py` (runtime), `HybridModel/` |
| `bow_similarity.pkl` | `models/` | `HybridModel/` (evaluation only) |
| `06_pred_user_knn.pkl` | `models/` | `backend/loader.py` (runtime — primary CF model) |
| `06_pred_item_knn.pkl` | `models/` | `backend/loader.py` (runtime — secondary CF model) |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Rating scale 1–3 (not 1–5) | The IBM dataset uses a 3-point scale; models are clipped to this range. |
| Cosine similarity over Euclidean | Course vectors of different text lengths are still comparable; direction matters, not magnitude. |
| User-level train/test split | Prevents data leakage — held-out items come from the same users the model is evaluated on, not random rows. |
| Synthetic users have negative IDs | Keeps real user IDs (positive integers) distinguishable from model-generated augmentation rows (negative integers). |
| $k = 20$ neighbours | Empirically chosen via cross-validation in notebook 03/06; balances coverage and precision. |
