from pathlib import Path
import sys
import pandas as pd
import numpy as np
import pickle
import math

from sklearn.metrics import mean_absolute_error, mean_squared_error

PROJECT_ROOT = Path('.').resolve()
DATA_PROCESSED = PROJECT_ROOT / 'data' / 'processed'
MODELS_DIR = PROJECT_ROOT / 'models'
RESULTS_DIR = PROJECT_ROOT / 'results'

sys.path.append(str(PROJECT_ROOT))
import utils_recommender as ur
ratings = pd.read_csv(DATA_PROCESSED / 'ratings_full_with_predictions.csv')
courses = pd.read_csv(DATA_PROCESSED / 'cleaned_courses.csv')

print(ratings.shape, courses.shape)
# Content-based
with open(MODELS_DIR / 'tfidf_similarity.pkl', 'rb') as f:
    tfidf_sim = pickle.load(f)

# Collaborative (already predicted)
with open(MODELS_DIR / '06_pred_user_knn.pkl', 'rb') as f:
    pred_user_knn = pickle.load(f)

print("✅ Models loaded")
course_ids = courses['COURSE_ID'].tolist()
course_index = {cid: idx for idx, cid in enumerate(course_ids)}
def predict_content(user_id, item_id, k=5):
    if item_id not in course_index:
        return np.nan

    idx = course_index[item_id]
    sim_scores = tfidf_sim.iloc[idx].values

    user_history = ratings[ratings['user'] == user_id]

    sims = []
    for _, row in user_history.iterrows():
        if row['item'] in course_index:
            sims.append((sim_scores[course_index[row['item']]], row['rating']))

    if len(sims) == 0:
        return np.nan

    sims = sorted(sims, reverse=True)[:k]

    num = sum(sim * rating for sim, rating in sims)
    den = sum(abs(sim) for sim, _ in sims)

    return num / den if den != 0 else np.nan
def predict_cf(user_id, item_id):
    try:
        return pred_user_knn.loc[user_id, item_id]
    except:
        return np.nan
ALPHA = 0.6

def hybrid_predict(user_id, item_id):
    cf_pred = predict_cf(user_id, item_id)
    cb_pred = predict_content(user_id, item_id)

    if np.isnan(cf_pred) and np.isnan(cb_pred):
        return np.nan
    elif np.isnan(cf_pred):
        return cb_pred
    elif np.isnan(cb_pred):
        return cf_pred
    else:
        return ALPHA * cf_pred + (1 - ALPHA) * cb_pred
preds, truths = [], []

for _, row in ratings.iterrows():
    pred = hybrid_predict(row['user'], row['item'])
    if not np.isnan(pred):
        preds.append(pred)
        truths.append(row['rating'])

mae = mean_absolute_error(truths, preds)
rmse = math.sqrt(mean_squared_error(truths, preds))

print("MAE :", mae)
print("RMSE:", rmse)
def get_top_n(user_id, n=10):
    items = courses['COURSE_ID'].tolist()
    scores = []

    for item in items:
        score = hybrid_predict(user_id, item)
        if not np.isnan(score):
            scores.append((item, score))

    scores = sorted(scores, key=lambda x: x[1], reverse=True)
    return [i[0] for i in scores[:n]]
def evaluate_ranking(n=10):
    recalls, hits, ndcgs = [], [], []

    users = ratings['user'].unique()[:200]

    for user in users:
        true_items = ratings[ratings['user'] == user]['item'].tolist()

        recs = get_top_n(user, n)
        hit_set = set(recs) & set(true_items)

        recalls.append(len(hit_set) / len(true_items))
        hits.append(1 if len(hit_set) > 0 else 0)

        dcg = sum(1/np.log2(i+2) for i, item in enumerate(recs) if item in true_items)
        idcg = sum(1/np.log2(i+2) for i in range(min(len(true_items), n)))
        ndcgs.append(dcg/idcg if idcg > 0 else 0)

    return np.mean(recalls), np.mean(hits), np.mean(ndcgs)


recall, hitrate, ndcg = evaluate_ranking()

print("Recall:", recall)
print("HitRate:", hitrate)
print("NDCG:", ndcg)
results = pd.DataFrame([{
    "Model": "Hybrid (TFIDF + UserKNN)",
    "MAE": mae,
    "RMSE": rmse,
    "Recall@10": recall,
    "HitRate@10": hitrate,
    "NDCG@10": ndcg
}])

results.to_csv(RESULTS_DIR / "hybrid_results.csv", index=False)
results