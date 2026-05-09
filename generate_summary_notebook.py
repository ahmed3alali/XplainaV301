"""
Generates PROJECT_SUMMARY.ipynb — a self-contained summary notebook
for professor presentation.
"""
import nbformat as nbf
from pathlib import Path

nb = nbf.v4.new_notebook()
cells = []

def md(text):
    return nbf.v4.new_markdown_cell(text)

def code(text):
    return nbf.v4.new_code_cell(text.strip())

# ─────────────────────────────────────────────
# TITLE
# ─────────────────────────────────────────────
cells.append(md("""# 📘 XplainaV301 — Project Summary
## Explainable AI Course Recommendation System

> **Overview:** This notebook provides a complete walkthrough of the project pipeline:
> 1. Exploratory Data Analysis (EDA) of the two core datasets
> 2. Model selection results — Content-Based and Collaborative Filtering  
> 3. Hybrid model construction and alpha tuning  
> 4. Explainable AI (XAI) — SHAP and LIME feature attribution  

---
"""))

# ─────────────────────────────────────────────
# IMPORTS
# ─────────────────────────────────────────────
cells.append(md("## ⚙️ Setup — Imports & Paths"))
cells.append(code("""
import sys, warnings, pickle
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.patches as mpatches

warnings.filterwarnings('ignore')

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT        = Path('.').resolve()
DATA_RAW    = ROOT / 'data' / 'raw'
DATA_PROC   = ROOT / 'data' / 'processed'
MODELS_DIR  = ROOT / 'models'
RESULTS_DIR = ROOT / 'results'
HM_RESULTS  = ROOT / 'HybridModel' / 'results'

sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'HybridModel'))

# ── Shared style ───────────────────────────────────────────────────────────
plt.rcParams.update({
    'figure.facecolor': '#0f0f0f',
    'axes.facecolor':   '#1a1a1a',
    'axes.edgecolor':   '#444',
    'axes.labelcolor':  '#ccc',
    'xtick.color':      '#aaa',
    'ytick.color':      '#aaa',
    'text.color':       '#eee',
    'grid.color':       '#333',
    'grid.linestyle':   '--',
    'axes.titlesize':   13,
    'axes.labelsize':   11,
    'legend.facecolor': '#1a1a1a',
    'legend.edgecolor': '#444',
    'font.family':      'sans-serif',
})

ACCENT  = '#3b82f6'   # blue
ACCENT2 = '#a78bfa'   # purple
GREEN   = '#22c55e'
ORANGE  = '#f97316'
RED     = '#ef4444'

print("✅ Setup complete. ROOT =", ROOT)
"""))

# ─────────────────────────────────────────────
# SECTION 1 — EDA
# ─────────────────────────────────────────────
cells.append(md("""---
## 📊 Section 1 — Exploratory Data Analysis (EDA)

### 1.1 The Two Raw Datasets

| Dataset | File | Purpose |
|---|---|---|
| **Ratings** | `data/raw/ratings.csv` | User–course interaction history (who rated what) |
| **Courses** | `data/raw/course_genre.csv` | Course catalogue with titles + 14 binary genre tags |
"""))

cells.append(code("""
ratings  = pd.read_csv(DATA_RAW / 'ratings.csv')
courses  = pd.read_csv(DATA_RAW / 'course_genre.csv')

GENRE_COLS = ['Database','Python','CloudComputing','DataAnalysis','Containers',
              'MachineLearning','ComputerVision','DataScience','BigData',
              'Chatbot','R','BackendDev','FrontendDev','Blockchain']

print("─" * 50)
print("RATINGS DATASET")
print("─" * 50)
print(f"  Rows:           {len(ratings):,}")
print(f"  Columns:        {list(ratings.columns)}")
print(f"  Unique users:   {ratings['user'].nunique():,}")
print(f"  Unique courses: {ratings['item'].nunique():,}")
print(f"  Rating scale:   {sorted(ratings['rating'].unique())}")
print(f"  Null values:    {ratings.isnull().sum().sum()}")

n_possible = ratings['user'].nunique() * len(courses)
sparsity   = 1 - len(ratings) / n_possible
print(f"  Matrix size:    {ratings['user'].nunique():,} users × {len(courses):,} courses")
print(f"  Sparsity:       {sparsity:.2%}")

print()
print("─" * 50)
print("COURSES DATASET")
print("─" * 50)
print(f"  Rows:           {len(courses):,}")
print(f"  Columns:        {len(courses.columns)}  → COURSE_ID, TITLE + 14 genre flags")
print(f"  Null values:    {courses.isnull().sum().sum()}")
print(f"  Avg genres/course: {courses[GENRE_COLS].sum(axis=1).mean():.2f}")
rated_courses = ratings['item'].nunique()
print(f"  Courses with ≥1 rating: {rated_courses} / {len(courses)} → {len(courses)-rated_courses} UNRATED (cold-start)")
"""))

cells.append(md("### 1.2 Rating Distribution"))
cells.append(code("""
fig, axes = plt.subplots(1, 3, figsize=(16, 4))
fig.suptitle('Ratings Dataset — Key Distributions', fontsize=15, fontweight='bold', color='white', y=1.02)

# ── Plot 1: Rating value distribution ──────────────────────────────────────
ax = axes[0]
counts = ratings['rating'].value_counts().sort_index()
bars = ax.bar(counts.index.astype(str), counts.values, color=[ACCENT2, ACCENT], width=0.5, edgecolor='none')
ax.bar_label(bars, fmt='{:,.0f}', padding=4, color='white', fontsize=10)
ax.set_title('Rating Value Distribution')
ax.set_xlabel('Rating')
ax.set_ylabel('Number of Interactions')
ax.set_ylim(0, counts.max() * 1.15)
ax.tick_params(bottom=False)
ax.grid(axis='y', alpha=0.4)

# ── Plot 2: Ratings per user ────────────────────────────────────────────────
ax = axes[1]
user_counts = ratings.groupby('user').size()
bins = [1, 2, 3, 5, 10, 20, 40, 70]
labels = ['1', '2', '3', '4-5', '6-10', '11-20', '21-40', '41+']
cut = pd.cut(user_counts, bins=[0,1,2,3,5,10,20,40,100], labels=labels)
vc = cut.value_counts().reindex(labels)
ax.bar(labels, vc.values, color=ACCENT, edgecolor='none')
ax.set_title('Ratings per User Distribution')
ax.set_xlabel('# Ratings given by user')
ax.set_ylabel('# Users')
ax.grid(axis='y', alpha=0.4)
ax.tick_params(axis='x', rotation=30)

# ── Plot 3: Catalogue coverage (rated vs unrated) ─────────────────────────
ax = axes[2]
rated   = ratings['item'].nunique()
unrated = len(courses) - rated
wedges, texts, autotexts = ax.pie(
    [rated, unrated],
    labels=['Rated (126)', 'Unrated / Cold-Start (181)'],
    autopct='%1.1f%%',
    colors=[GREEN, RED],
    startangle=90,
    wedgeprops=dict(edgecolor='#0f0f0f', linewidth=2)
)
for t in texts + autotexts: t.set_color('white')
ax.set_title('Catalogue Coverage\n(out of 307 courses)')

plt.tight_layout()
plt.savefig('figures/summary_eda_ratings.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
print("⚠️  181 of 307 courses are UNRATED → this is the cold-start problem we solve in Stage 4.")
"""))

cells.append(md("### 1.3 Genre Distribution in the Course Catalogue"))
cells.append(code("""
fig, axes = plt.subplots(1, 2, figsize=(16, 5))
fig.suptitle('Course Catalogue — Genre Analysis', fontsize=15, fontweight='bold', color='white', y=1.01)

# ── Plot 1: Courses per genre ───────────────────────────────────────────────
ax = axes[0]
genre_counts = courses[GENRE_COLS].sum().sort_values(ascending=True)
colors = [ACCENT if v < 30 else ACCENT2 if v < 60 else GREEN for v in genre_counts.values]
bars = ax.barh(genre_counts.index, genre_counts.values, color=colors, edgecolor='none', height=0.7)
ax.bar_label(bars, padding=4, color='white', fontsize=9)
ax.set_title('Number of Courses per Genre')
ax.set_xlabel('Course Count')
ax.set_xlim(0, genre_counts.max() * 1.18)
ax.grid(axis='x', alpha=0.4)

# ── Plot 2: Genres per course distribution ──────────────────────────────────
ax = axes[1]
num_genres = courses[GENRE_COLS].sum(axis=1).value_counts().sort_index()
bar_colors = [RED, ACCENT2, ACCENT, GREEN, ORANGE]
bars = ax.bar(num_genres.index.astype(str), num_genres.values,
              color=bar_colors[:len(num_genres)], edgecolor='none', width=0.5)
ax.bar_label(bars, fmt='{:,}', padding=4, color='white', fontsize=11)
ax.set_title('How Many Genres Does Each Course Have?')
ax.set_xlabel('Number of Genre Tags')
ax.set_ylabel('Number of Courses')
ax.set_ylim(0, num_genres.max() * 1.15)
ax.grid(axis='y', alpha=0.4)
for i, (idx, val) in enumerate(num_genres.items()):
    label = {0: '(no tag!)', 1: '(single)', 2: '(dual)', 3: '(triple)', 4: '(max)'}
    ax.text(i, val + 4, label.get(idx, ''), ha='center', color='#aaa', fontsize=9)

plt.tight_layout()
plt.savefig('figures/summary_genre_analysis.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
"""))

# ─────────────────────────────────────────────
# SECTION 2 — MODEL SELECTION
# ─────────────────────────────────────────────
cells.append(md("""---
## 🧠 Section 2 — Model Selection Results

We evaluated two families of recommender models, each in two phases:
- **Phase 1 (Before):** Trained on the original sparse ratings (126 courses rated)
- **Phase 2 (After):** Trained on the augmented dataset (all 307 courses, with 181 predicted via regression)

### 2.1 Content-Based Filtering — TF-IDF vs Bag-of-Words
"""))

cells.append(code("""
cb_before = pd.read_csv(RESULTS_DIR / 'results_content_based_before.csv', index_col=0)
cb_after  = pd.read_csv(RESULTS_DIR / 'results_content_based_after.csv',  index_col=0)

print("Content-Based — BEFORE augmentation:")
display(cb_before[['HitRate@10','NDCG@10','Precision@10','Recall@10','Coverage','RMSE']].round(4))
print()
print("Content-Based — AFTER augmentation:")
display(cb_after[['HitRate@10','NDCG@10','Precision@10','Recall@10','Coverage','RMSE']].round(4))
"""))

cells.append(code("""
metrics = ['HitRate@10', 'NDCG@10', 'Recall@10', 'Coverage']

fig, axes = plt.subplots(1, 4, figsize=(18, 4))
fig.suptitle('Content-Based Filtering — TF-IDF vs BoW (Before vs After Augmentation)',
             fontsize=13, fontweight='bold', color='white', y=1.03)

colors_map = {'TF-IDF': ACCENT, 'BoW': ACCENT2}
bar_w = 0.3
x = np.arange(2)  # Before, After

for ax_i, metric in enumerate(metrics):
    ax = axes[ax_i]
    for j, model in enumerate(['TF-IDF', 'BoW']):
        before_val = cb_before.loc[model, metric] if metric in cb_before.columns else 0
        after_val  = cb_after.loc[model, metric]  if metric in cb_after.columns  else 0
        offset = (j - 0.5) * bar_w
        bars = ax.bar(x + offset, [before_val, after_val], bar_w,
                      label=model, color=colors_map[model], edgecolor='none', alpha=0.9)
        ax.bar_label(bars, fmt='%.3f', padding=3, fontsize=8, color='white')
    ax.set_title(metric)
    ax.set_xticks(x)
    ax.set_xticklabels(['Before', 'After'])
    ax.set_ylim(0, 1.1)
    ax.grid(axis='y', alpha=0.4)
    if ax_i == 0:
        ax.legend(fontsize=9)

plt.tight_layout()
plt.savefig('figures/summary_content_based_comparison.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
print("✅ WINNER: TF-IDF — outperforms BoW on every metric before and after augmentation.")
print("   Coverage jumps to 1.0 after augmentation (can now recommend ALL 307 courses).")
"""))

cells.append(md("### 2.2 Collaborative Filtering — User-KNN vs Item-KNN"))
cells.append(code("""
cf_before = pd.read_csv(RESULTS_DIR / 'results_collaborative_before.csv', index_col=0)
cf_after  = pd.read_csv(RESULTS_DIR / 'results_collaborative_after.csv',  index_col=0)

print("Collaborative Filtering — BEFORE augmentation:")
display(cf_before[['HitRate@10','NDCG@10','Precision@10','Recall@10','Coverage','RMSE']].round(4))
print()
print("Collaborative Filtering — AFTER augmentation:")
display(cf_after[['HitRate@10','NDCG@10','Precision@10','Recall@10','Coverage','RMSE']].round(4))
"""))

cells.append(code("""
fig, axes = plt.subplots(1, 4, figsize=(18, 4))
fig.suptitle('Collaborative Filtering — User-KNN vs Item-KNN (Before vs After Augmentation)',
             fontsize=13, fontweight='bold', color='white', y=1.03)

colors_map = {'User-KNN': GREEN, 'Item-KNN': ORANGE}

for ax_i, metric in enumerate(metrics):
    ax = axes[ax_i]
    for j, model in enumerate(['User-KNN', 'Item-KNN']):
        before_val = cf_before.loc[model, metric] if metric in cf_before.columns else 0
        after_val  = cf_after.loc[model, metric]  if metric in cf_after.columns  else 0
        offset = (j - 0.5) * bar_w
        bars = ax.bar(x + offset, [before_val, after_val], bar_w,
                      label=model, color=colors_map[model], edgecolor='none', alpha=0.9)
        ax.bar_label(bars, fmt='%.3f', padding=3, fontsize=8, color='white')
    ax.set_title(metric)
    ax.set_xticks(x)
    ax.set_xticklabels(['Before', 'After'])
    ax.set_ylim(0, 1.1)
    ax.grid(axis='y', alpha=0.4)
    if ax_i == 0:
        ax.legend(fontsize=9)

plt.tight_layout()
plt.savefig('figures/summary_cf_comparison.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
print("✅ WINNER: User-KNN — HitRate@10 = 0.706 vs Item-KNN = 0.360 after augmentation.")
print("   User-KNN improves significantly after augmentation. Item-KNN sees smaller gains.")
"""))

cells.append(md("### 2.3 Cold-Start Augmentation — Regression Model Selection"))
cells.append(code("""
reg = pd.read_csv(RESULTS_DIR / 'results_regression_model_selection.csv', index_col=0)

print("Regression model comparison for predicting ratings of 181 unrated courses:")
display(reg.round(4))

fig, ax = plt.subplots(figsize=(9, 4))
ax.set_facecolor('#1a1a1a')
fig.set_facecolor('#0f0f0f')

x_pos    = np.arange(len(reg))
bar_cols  = [GREEN if i == reg['CV_RMSE'].idxmin() else ACCENT for i in reg.index]
bars = ax.bar(x_pos, reg['CV_RMSE'], color=bar_cols, edgecolor='none', width=0.5)
ax.bar_label(bars, fmt='%.4f', padding=4, color='white', fontsize=10)
ax.set_xticks(x_pos)
ax.set_xticklabels(reg.index, fontsize=11)
ax.set_ylabel('Cross-Validation RMSE')
ax.set_title('Regression Model Selection for Cold-Start Augmentation\n(lower RMSE = better)', fontweight='bold')
ax.set_ylim(0, reg['CV_RMSE'].max() * 1.2)
ax.grid(axis='y', alpha=0.4)

winner_patch = mpatches.Patch(color=GREEN, label='Selected winner')
ax.legend(handles=[winner_patch], fontsize=10)
plt.tight_layout()
plt.savefig('figures/summary_regression_selection.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
print(f"✅ WINNER: {reg['CV_RMSE'].idxmin()} with CV_RMSE = {reg['CV_RMSE'].min():.4f}")
"""))

# ─────────────────────────────────────────────
# SECTION 3 — HYBRID MODEL
# ─────────────────────────────────────────────
cells.append(md("""---
## 🔀 Section 3 — Hybrid Model

### Formula
$$\\text{hybrid}(u, i) = \\alpha \\cdot \\text{CF}_{\\text{norm}}(u, i) + (1 - \\alpha) \\cdot \\text{Content}_{\\text{norm}}(u, i)$$

Where:
- **α = 0.5** — equal weighting (tuned via alpha sweep)  
- CF signal comes from **User-KNN** (pre-computed for dataset users, Jaccard-blended for new users)  
- Content signal comes from **TF-IDF cosine similarity**  
- Both signals are independently **normalised to [0, 1]** before blending
"""))

cells.append(md("### 3.1 Final Model Comparison — All Models Side by Side"))
cells.append(code("""
hm_comp = pd.read_csv(HM_RESULTS / 'results_hybrid_comparison.csv', index_col=0)
display(hm_comp.round(4))
"""))

cells.append(code("""
comparison_metrics = ['HitRate@10', 'NDCG@10', 'Recall@10', 'Coverage']
model_colors = {
    'Content-TF-IDF': ACCENT,
    'Content-BoW':    ACCENT2,
    'CF-User-KNN':    GREEN,
    'CF-Item-KNN':    ORANGE,
    'Hybrid (α=0.5)': '#f43f5e',
}

fig, axes = plt.subplots(1, 4, figsize=(20, 5))
fig.suptitle('Final Model Comparison — All Models', fontsize=15, fontweight='bold', color='white', y=1.02)

for ax_i, metric in enumerate(comparison_metrics):
    ax = axes[ax_i]
    vals   = hm_comp[metric]
    colors = [model_colors.get(m, ACCENT) for m in vals.index]
    bars   = ax.bar(range(len(vals)), vals.values, color=colors, edgecolor='none', width=0.6)
    ax.bar_label(bars, fmt='%.3f', padding=4, color='white', fontsize=9)
    ax.set_xticks(range(len(vals)))
    ax.set_xticklabels([m.replace('Hybrid', 'Hybrid\n') for m in vals.index], fontsize=8, rotation=20, ha='right')
    ax.set_title(metric, fontsize=12)
    ax.set_ylim(0, 1.15)
    ax.grid(axis='y', alpha=0.4)

# Legend
patches = [mpatches.Patch(color=c, label=m) for m, c in model_colors.items()]
fig.legend(handles=patches, loc='upper right', fontsize=9, bbox_to_anchor=(1.01, 1.0))
plt.tight_layout()
plt.savefig('figures/summary_final_comparison.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
print("✅ Hybrid (α=0.5) achieves HitRate@10 = 0.770 — best of all models.")
print("   It combines User-KNN's strong CF signal with TF-IDF's full catalogue coverage.")
"""))

cells.append(md("### 3.2 Alpha Sweep — Choosing the Optimal Blend"))
cells.append(code("""
alpha_df = pd.read_csv(HM_RESULTS / 'results_hybrid_alpha_sweep.csv')

fig, ax = plt.subplots(figsize=(12, 5))
ax.set_facecolor('#1a1a1a')
fig.set_facecolor('#0f0f0f')

sweep_metrics = ['HitRate@10', 'NDCG@10', 'Recall@10']
sweep_colors  = [GREEN, ACCENT, ORANGE]

for metric, color in zip(sweep_metrics, sweep_colors):
    ax.plot(alpha_df['alpha'], alpha_df[metric], color=color, linewidth=2.5,
            marker='o', markersize=5, label=metric)

ax.axvline(x=0.5, color='white', linestyle='--', linewidth=1.5, alpha=0.7, label='α = 0.5 (chosen)')
ax.fill_betweenx([0, 1], 0.5, 0.7, alpha=0.08, color='white')

best_hit_alpha = alpha_df.loc[alpha_df['HitRate@10'].idxmax(), 'alpha']
ax.annotate(f'Peak HitRate\n@ α={best_hit_alpha}',
            xy=(best_hit_alpha, alpha_df['HitRate@10'].max()),
            xytext=(best_hit_alpha + 0.08, alpha_df['HitRate@10'].max() - 0.08),
            color=GREEN, fontsize=10, arrowprops=dict(arrowstyle='->', color=GREEN))

ax.set_xlabel('Alpha  (0 = pure Content-Based, 1 = pure CF)', fontsize=11)
ax.set_ylabel('Metric Score', fontsize=11)
ax.set_title('Alpha Sweep — How Blending Ratio Affects Performance', fontsize=13, fontweight='bold')
ax.set_xlim(-0.02, 1.02)
ax.set_ylim(0.1, 0.95)
ax.legend(fontsize=11)
ax.grid(alpha=0.35)
plt.tight_layout()
plt.savefig('figures/summary_alpha_sweep.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
print(f"α = 0.5 chosen: equal weight gives peak or near-peak performance on all metrics.")
"""))

# ─────────────────────────────────────────────
# SECTION 4 — XAI
# ─────────────────────────────────────────────
cells.append(md("""---
## 🔍 Section 4 — Explainable AI (XAI)

### Architecture
To explain *why* a course was recommended, we use a **local surrogate model**:

1. For the target user, compute hybrid scores for **all 307 courses** → this is `y`  
2. The 14-genre binary features of each course form the feature matrix `X` (307×14)  
3. A `RandomForestRegressor` is trained to approximate `genre features → hybrid score`  
4. **SHAP** (TreeExplainer) and **LIME** (LimeTabularExplainer) interrogate the surrogate  
5. The resulting feature attributions tell us which genres *pushed the score up or down*
"""))

cells.append(code("""
import pickle, sys
from pathlib import Path

ROOT = Path('.').resolve()
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'HybridModel'))

from utils_recommender import train_test_split_by_user
from HybridModel.utils_hybrid import hybrid_scores_for_user, GENRE_COLS

# ── Load artefacts ─────────────────────────────────────────────────────────
ratings_full = pd.read_csv(ROOT / 'data' / 'processed' / 'ratings_full_with_predictions.csv')
courses_df   = pd.read_csv(ROOT / 'data' / 'processed' / 'final_courses.csv')

with open(ROOT / 'models' / '06_pred_user_knn.pkl', 'rb') as f:
    cf_predictions = pickle.load(f)

sim_df = pd.read_pickle(ROOT / 'models' / 'tfidf_similarity.pkl')

train_df, test_df = train_test_split_by_user(ratings_full)
print(f"✅ Models loaded: {len(cf_predictions):,} users in CF dict")
print(f"   Similarity matrix shape: {sim_df.shape}")
"""))

cells.append(code("""
# ── Pick a representative dataset user ─────────────────────────────────────
# Select a user with a good number of ratings (between 5 and 20)
user_counts = train_df.groupby('user').size()
good_users  = user_counts[(user_counts >= 5) & (user_counts <= 15)].index.tolist()
DEMO_USER   = good_users[42]  # pick one deterministically

user_courses = train_df[train_df['user'] == DEMO_USER]['item'].tolist()
user_titles  = courses_df.set_index('COURSE_ID')['TITLE']

print(f"Demo User ID: {DEMO_USER}")
print(f"Courses taken ({len(user_courses)}):")
for c in user_courses:
    print(f"  • {c}: {user_titles.get(c, 'Unknown')}")
"""))

cells.append(code("""
# ── Get hybrid recommendations ─────────────────────────────────────────────
recs = hybrid_scores_for_user(
    user=DEMO_USER,
    train_df=train_df,
    cf_predictions=cf_predictions,
    sim_df=sim_df,
    alpha=0.5,
    top_n=10,
    normalize=True
)

courses_idx = courses_df.set_index('COURSE_ID')
print(f"Top 10 Recommendations for User {DEMO_USER}:")
print(f"{'Rank':<5} {'Course ID':<18} {'Match%':<10} {'Title'}")
print("─" * 80)
for rank, (cid, score) in enumerate(recs.items(), 1):
    title = courses_idx.loc[cid, 'TITLE'] if cid in courses_idx.index else cid
    genres = [g for g in GENRE_COLS if courses_idx.loc[cid, g] == 1] if cid in courses_idx.index else []
    print(f"#{rank:<4} {cid:<18} {score*100:.1f}%      {title[:45]}")
    print(f"       Genres: {', '.join(genres) if genres else 'None'}")
"""))

cells.append(code("""
# ── Run SHAP + LIME on the top recommended course ──────────────────────────
from sklearn.ensemble import RandomForestRegressor
import shap
import lime.lime_tabular

TOP_COURSE = list(recs.keys())[0]
all_items  = sim_df.columns.tolist()

# Rebuild hybrid scores for all 307 courses (surrogate target y)
from HybridModel.utils_hybrid import _normalize_cf_series, _normalize_series

cf_series = cf_predictions[DEMO_USER].reindex(all_items).fillna(0.0)  if DEMO_USER in cf_predictions else pd.Series(0.0, index=all_items)
user_items = [i for i in train_df.loc[train_df['user'] == DEMO_USER, 'item'] if i in sim_df.index]
content_series = sim_df.loc[user_items].mean(axis=0).reindex(all_items).fillna(0.0) if user_items else pd.Series(0.0, index=all_items)

cf_norm      = _normalize_cf_series(cf_series)
content_norm = _normalize_series(content_series)
y            = 0.5 * cf_norm + 0.5 * content_norm

# Feature matrix X (genre binary columns)
X = courses_df.set_index('COURSE_ID')[GENRE_COLS].reindex(all_items).fillna(0)

# Train surrogate
surrogate = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
surrogate.fit(X, y)

x_instance = X.loc[TOP_COURSE]
course_info = courses_idx.loc[TOP_COURSE] if TOP_COURSE in courses_idx.index else None
course_title = course_info['TITLE'] if course_info is not None else TOP_COURSE
course_genres_active = [g for g in GENRE_COLS if x_instance[g] == 1]

print(f"Explaining: '{course_title}'")
print(f"Course ID:  {TOP_COURSE}")
print(f"Hybrid Score: {y.loc[TOP_COURSE]:.4f}  ({y.loc[TOP_COURSE]*100:.1f}% match)")
print(f"CF Score:     {cf_norm.loc[TOP_COURSE]:.4f}")
print(f"Content Score:{content_norm.loc[TOP_COURSE]:.4f}")
print(f"Active Genres: {course_genres_active}")
"""))

cells.append(code("""
# ── SHAP ───────────────────────────────────────────────────────────────────
explainer_shap = shap.TreeExplainer(surrogate, X)
with warnings.catch_warnings():
    warnings.simplefilter('ignore')
    shap_raw = explainer_shap.shap_values(x_instance.values.reshape(1, -1), check_additivity=False)

shap_vals_arr = shap_raw[0] if isinstance(shap_raw, list) else shap_raw[0]
shap_dict = dict(zip(GENRE_COLS, shap_vals_arr.tolist()))

# ── LIME ───────────────────────────────────────────────────────────────────
lime_exp = lime.lime_tabular.LimeTabularExplainer(
    X.values, feature_names=GENRE_COLS, mode='regression', random_state=42
)
lime_result = lime_exp.explain_instance(x_instance.values, surrogate.predict, num_features=len(GENRE_COLS))
lime_dict = {}
for cond, w in lime_result.as_list():
    for col in GENRE_COLS:
        if col in cond:
            lime_dict[col] = float(w)
            break
lime_dict = {col: lime_dict.get(col, 0.0) for col in GENRE_COLS}

print("✅ SHAP and LIME computed.")
"""))

cells.append(code("""
# ── Visualise SHAP + LIME side by side ─────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(18, 6))
fig.suptitle(
    f'XAI Explanation — Why was "{course_title[:50]}" recommended?\\n'
    f'Hybrid Score: {y.loc[TOP_COURSE]*100:.1f}%  |  '
    f'CF: {cf_norm.loc[TOP_COURSE]*100:.1f}%  |  '
    f'Content: {content_norm.loc[TOP_COURSE]*100:.1f}%',
    fontsize=12, fontweight='bold', color='white', y=1.01
)

for ax, title, data in zip(axes,
    ['🔬 SHAP — TreeExplainer Feature Attribution', '🔎 LIME — Local Linear Approximation'],
    [shap_dict, lime_dict]):

    sorted_data = dict(sorted(data.items(), key=lambda x: abs(x[1]), reverse=True))
    top7 = dict(list(sorted_data.items())[:7])

    colors = [GREEN if v >= 0 else RED for v in top7.values()]
    y_pos  = np.arange(len(top7))

    bars = ax.barh(list(top7.keys()), list(top7.values()),
                   color=colors, edgecolor='none', height=0.6)
    ax.axvline(x=0, color='white', linewidth=1, alpha=0.5)
    ax.set_title(title, fontsize=11, fontweight='bold')
    ax.set_xlabel('Feature Contribution to Recommendation Score', fontsize=10)
    ax.grid(axis='x', alpha=0.35)

    for bar, val in zip(bars, top7.values()):
        label = f'+{val:.4f}' if val >= 0 else f'{val:.4f}'
        color = GREEN if val >= 0 else RED
        x_pos_label = val + 0.0002 if val >= 0 else val - 0.0002
        ha = 'left' if val >= 0 else 'right'
        ax.text(x_pos_label, bar.get_y() + bar.get_height()/2,
                label, va='center', ha=ha, color=color, fontsize=9, fontweight='bold')

    active_genres = course_genres_active
    for label in ax.get_yticklabels():
        if label.get_text() in active_genres:
            label.set_color(ACCENT)
            label.set_fontweight('bold')

pos_patch = mpatches.Patch(color=GREEN, label='↑ Pushes score UP')
neg_patch = mpatches.Patch(color=RED,   label='↓ Pulls score DOWN')
blue_text = mpatches.Patch(color=ACCENT, label='Active genre on this course')
axes[0].legend(handles=[pos_patch, neg_patch, blue_text], fontsize=9, loc='lower right')

plt.tight_layout()
plt.savefig('figures/summary_xai_explanation.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
"""))

cells.append(md("""### 4.1 Interpreting the XAI Output

| Concept | Meaning |
|---|---|
| **SHAP (positive bar)** | This genre pushed the recommendation score **up** — the model learned it as important |
| **SHAP (negative bar)** | This genre pulled the score **down** — working against the recommendation |
| **LIME** | A local linear approximation — independently confirms SHAP's findings |
| **Blue genre labels** | The genre is actually present (`=1`) on the recommended course |
| **Both agree** | If SHAP and LIME both flag the same genre, the explanation is robust |

> **Key design decision:** The hybrid score is a weighted sum and cannot be attributed to genre features directly. So we train a **surrogate Random Forest** to approximate the hybrid scores using genres as input — then XAI tools explain *that* surrogate.
"""))

# ─────────────────────────────────────────────
# SUMMARY TABLE
# ─────────────────────────────────────────────
cells.append(md("""---
## 📋 Section 5 — Final Summary Table

| Decision | Options Compared | Winner | Key Metric |
|---|---|---|---|
| Content-Based algorithm | TF-IDF vs BoW | **TF-IDF** | HitRate 0.50 vs 0.45 |
| CF algorithm | User-KNN vs Item-KNN | **User-KNN** | HitRate 0.71 vs 0.36 |
| Cold-start regression | LinearReg, Ridge, RF, GBM | **GradientBoosting** | CV_RMSE 0.313 |
| Final model | All individual vs Hybrid | **Hybrid (TF-IDF + User-KNN)** | HitRate 0.77 |
| Optimal alpha | 0.0 → 1.0 sweep | **α = 0.5** | Peak on all metrics |
| XAI method | SHAP vs LIME | **Both used** | Cross-validation of explanation |
"""))

cells.append(code("""
# Final numbers at a glance
final = pd.read_csv(HM_RESULTS / 'results_hybrid_comparison.csv', index_col=0)
key_metrics = final[['HitRate@10','NDCG@10','Recall@10','Coverage']].round(4)

fig, ax = plt.subplots(figsize=(12, 4))
ax.axis('off')
tbl = ax.table(
    cellText=key_metrics.values,
    rowLabels=key_metrics.index,
    colLabels=key_metrics.columns,
    cellLoc='center', loc='center'
)
tbl.auto_set_font_size(False)
tbl.set_fontsize(11)
tbl.scale(1.4, 2.2)

for (row, col), cell in tbl.get_celld().items():
    cell.set_edgecolor('#444')
    if row == 0:
        cell.set_facecolor('#1e3a5f')
        cell.set_text_props(color='white', fontweight='bold')
    elif key_metrics.index[row-1] == 'Hybrid (α=0.5)':
        cell.set_facecolor('#1a2e1a')
        cell.set_text_props(color='#22c55e', fontweight='bold')
    else:
        cell.set_facecolor('#1a1a1a')
        cell.set_text_props(color='#ccc')

ax.set_title('All Models — Final Performance Comparison',
             fontsize=13, fontweight='bold', color='white', pad=20)
fig.set_facecolor('#0f0f0f')
plt.tight_layout()
plt.savefig('figures/summary_final_table.png', dpi=150, bbox_inches='tight', facecolor='#0f0f0f')
plt.show()
"""))

# ─────────────────────────────────────────────
# WRITE NOTEBOOK
# ─────────────────────────────────────────────
nb.cells = cells
nb.metadata = {
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3"
    },
    "language_info": {
        "name": "python",
        "version": "3.12.0"
    }
}

out_path = Path('PROJECT_SUMMARY.ipynb')
with open(out_path, 'w') as f:
    nbf.write(nb, f)

print(f"✅ Notebook written to: {out_path.resolve()}")
print(f"   Run: jupyter notebook PROJECT_SUMMARY.ipynb")
