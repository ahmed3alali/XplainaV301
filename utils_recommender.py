
from pathlib import Path
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, GroupShuffleSplit
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.neighbors import NearestNeighbors
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.model_selection import KFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.base import clone

GENRE_COLS = [
    'Database', 'Python', 'CloudComputing', 'DataAnalysis', 'Containers',
    'MachineLearning', 'ComputerVision', 'DataScience', 'BigData',
    'Chatbot', 'R', 'BackendDev', 'FrontendDev', 'Blockchain'
]

def ensure_dirs(*dirs):
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)

def load_base_data(data_raw: str | Path, data_processed: str | Path):
    data_raw = Path(data_raw)
    data_processed = Path(data_processed)
    ratings = pd.read_csv(data_raw / 'ratings.csv')
    course_genre = pd.read_csv(data_raw / 'course_genre.csv')
    final_courses = pd.read_csv(data_processed / 'final_courses.csv')
    return ratings, course_genre, final_courses

def add_num_genres(courses: pd.DataFrame) -> pd.DataFrame:
    courses = courses.copy()
    if 'num_genres' not in courses.columns:
        courses['num_genres'] = courses[GENRE_COLS].sum(axis=1)
    return courses

def build_course_text(df: pd.DataFrame) -> pd.Series:
    df = add_num_genres(df.copy())
    def _row_to_text(row):
        title = str(row['TITLE']).strip().lower()
        tags = ' '.join([c.lower() for c in GENRE_COLS if row[c] == 1])
        return f"{title} {tags}".strip()
    return df.apply(_row_to_text, axis=1)


## We create the content similaty 
def create_content_similarity(courses_df: pd.DataFrame):
    courses_df = add_num_genres(courses_df.copy())
    docs = build_course_text(courses_df)
    tfidf_vec = TfidfVectorizer(stop_words='english')
    bow_vec = CountVectorizer(stop_words='english')
    tfidf_matrix = tfidf_vec.fit_transform(docs)
    bow_matrix = bow_vec.fit_transform(docs)
    tfidf_cos = cosine_similarity(tfidf_matrix)
    bow_cos = cosine_similarity(bow_matrix)

    idx = courses_df['COURSE_ID'].tolist()
    tfidf_df = pd.DataFrame(tfidf_cos, index=idx, columns=idx)
    bow_df = pd.DataFrame(bow_cos, index=idx, columns=idx)
    return {
        'tfidf_vectorizer': tfidf_vec,
        'bow_vectorizer': bow_vec,
        'tfidf_similarity': tfidf_df,
        'bow_similarity': bow_df,
    }

def train_test_split_by_user(ratings_df: pd.DataFrame, min_user_ratings: int = 5, test_size: float = 0.2, seed: int = 42):
    # Split the ratings into training and testing sets, with each user having at least min_user_ratings ratings.
    # We define at least a number of min ratings or else it will be appendeed as a whole into the training array.


    ratings_df = ratings_df.copy()
    train_parts, test_parts = [], []
    for user, grp in ratings_df.groupby('user'):
        if len(grp) < min_user_ratings:
            train_parts.append(grp)
            continue
        n_test = max(1, int(round(len(grp) * test_size))) ## here we are taking the percentage of testing amount from the decided "grp"
        test_idx = grp.sample(n=n_test, random_state=seed).index
        train_parts.append(grp.drop(index=test_idx)) # to know what is your train part .. drop the test 
        test_parts.append(grp.loc[test_idx]) 
    train_df = pd.concat(train_parts, ignore_index=True) 
    test_df = pd.concat(test_parts, ignore_index=True) if test_parts else pd.DataFrame(columns=ratings_df.columns) 
    return train_df, test_df

def rmse(y_true, y_pred):
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))

def ranking_metrics(top_items, relevant_items, k=10):
    top_items = list(top_items)[:k]
    relevant_items = set(relevant_items)

    hits = [1 if item in relevant_items else 0 for item in top_items]
    hit_rate = int(sum(hits) > 0)
    precision = np.mean(hits) if hits else 0.0
    recall = sum(hits) / max(len(relevant_items), 1)
    dcg = sum(hit / np.log2(i + 2) for i, hit in enumerate(hits))
    ideal_hits = [1] * min(len(relevant_items), k)
    idcg = sum(hit / np.log2(i + 2) for i, hit in enumerate(ideal_hits)) if ideal_hits else 0.0
    ndcg = dcg / idcg if idcg > 0 else 0.0
    return hit_rate, precision, recall, ndcg

def evaluate_content_model(sim_df: pd.DataFrame, ratings_df: pd.DataFrame, top_n: int = 10, n_users: int = 300, seed: int = 42):
    rng = np.random.default_rng(seed)
    user_counts = ratings_df['user'].value_counts()
    eligible_users = user_counts[user_counts >= 5].index.tolist()
    if not eligible_users:
        raise ValueError("No users with at least 5 ratings were found.")

    sampled_users = rng.choice(eligible_users, size=min(n_users, len(eligible_users)), replace=False)
    global_mean = ratings_df['rating'].mean()

    y_true, y_pred = [], []
    hits, precisions, recalls, ndcgs = [], [], [], []

    for u in sampled_users:
        user_df = ratings_df[ratings_df['user'] == u].copy()
        train_u, test_u = train_test_split(user_df, test_size=0.2, random_state=seed)

        train_items = [i for i in train_u['item'].tolist() if i in sim_df.index]
        test_items = [i for i in test_u['item'].tolist() if i in sim_df.index]
        if not train_items or not test_items:
            continue

        item_ratings = train_u.set_index('item')['rating'].to_dict()
        profile = sim_df.loc[train_items].mean(axis=0)
        profile = profile.drop(labels=train_items, errors='ignore')
        top_recs = profile.sort_values(ascending=False).head(top_n)
        hit, prec, rec, ndcg = ranking_metrics(top_recs.index.tolist(), test_items, k=top_n)
        hits.append(hit); precisions.append(prec); recalls.append(rec); ndcgs.append(ndcg)

        for item in test_items:
            sims = sim_df.loc[item, train_items].values.astype(float)
            rates = np.array([item_ratings[it] for it in train_items], dtype=float)
            denom = np.abs(sims).sum()
            pred = float(np.dot(sims, rates) / denom) if denom > 0 else float(np.mean(rates) if len(rates) else global_mean)
            y_true.append(float(test_u.loc[test_u['item'] == item, 'rating'].iloc[0]))
            y_pred.append(pred)

    return {
        'RMSE': rmse(y_true, y_pred),
        'MAE': float(mean_absolute_error(y_true, y_pred)),
        'HitRate@10': float(np.mean(hits)) if hits else 0.0,
        'Precision@10': float(np.mean(precisions)) if precisions else 0.0,
        'Recall@10': float(np.mean(recalls)) if recalls else 0.0,
        'NDCG@10': float(np.mean(ndcgs)) if ndcgs else 0.0,
        'Coverage': float(ratings_df['item'].nunique() / sim_df.shape[0])
    }

def build_user_item_matrix(ratings_df: pd.DataFrame):
    utility = ratings_df.pivot_table(index='user', columns='item', values='rating')
    return utility

def user_knn_predictions(train_utility: pd.DataFrame, k: int = 20):
    users = train_utility.index.tolist()
    items = train_utility.columns.tolist()
    mat = train_utility.fillna(0).values.astype(np.float32) # Converting the utility matrix to an array . matrix

# Building our KNN model. 
    knn = NearestNeighbors(n_neighbors=min(k + 1, len(users)), metric='cosine', algorithm='brute', n_jobs=-1)
    knn.fit(mat) # training the model on the matrix we got 
    distances, indices = knn.kneighbors(mat) ## for each user we got the nearest neighbors and the distance between them 


    # we drop the first column because it is the user itself 
    neighbor_idx = indices[:, 1:]
    neighbor_sims = 1 - distances[:, 1:] ## flips cosine distance into consine similarty (0 = opposite , 1 = identical)
    neigh_ratings = mat[neighbor_idx] ## we get his negibours ratings ... 
    rated_mask = neigh_ratings > 0 ## of course they should be grater than zero 


    weighted = (neigh_ratings * neighbor_sims[:, :, None] * rated_mask).sum(axis=1) # sum of weighted ratings of neighbors 
    weights = (neighbor_sims[:, :, None] * rated_mask).sum(axis=1) # sum of similarities of the neighbors 
    preds = np.divide(weighted, weights, out=np.zeros_like(weighted), where=weights != 0) # final prediction 


    # converting back to a dictionary 

    return {u: pd.Series(preds[i], index=items) for i, u in enumerate(users)}

def item_knn_predictions(train_utility: pd.DataFrame, k: int = 20):
    users = train_utility.index.tolist()
    items = train_utility.columns.tolist()
    mat = train_utility.fillna(0).values.astype(np.float32)
    item_mat = mat.T

    knn = NearestNeighbors(n_neighbors=min(k + 1, len(items)), metric='cosine', algorithm='brute', n_jobs=-1)
    knn.fit(item_mat)
    distances, indices = knn.kneighbors(item_mat)

    neigh_idx = indices[:, 1:]
    neigh_sims = 1 - distances[:, 1:]

    preds = np.zeros_like(mat, dtype=np.float32)
    for item_idx in range(len(items)):
        nbr_items = neigh_idx[item_idx]
        sims = neigh_sims[item_idx]
        nbr_ratings = mat[:, nbr_items]
        rated_mask = nbr_ratings > 0
        weighted = (nbr_ratings * sims * rated_mask).sum(axis=1)
        weights = (sims * rated_mask).sum(axis=1)
        preds[:, item_idx] = np.divide(weighted, weights, out=np.zeros(len(users), dtype=np.float32), where=weights != 0)

    return {u: pd.Series(preds[i], index=items) for i, u in enumerate(users)}

def evaluate_cf(predictions: dict, test_df: pd.DataFrame, train_df: pd.DataFrame, top_n: int = 10, n_users: int = 200, seed: int = 42):
    rng = np.random.default_rng(seed)
    users = list(predictions.keys())
    if not users:
        raise ValueError("Predictions dictionary is empty.")
    sampled_users = rng.choice(users, size=min(n_users, len(users)), replace=False)

    y_true, y_pred = [], []
    hits, precisions, recalls, ndcgs = [], [], [], []
    recommended = set()

    for u in sampled_users:
        if u not in predictions:
            continue
        pred_series = predictions[u].copy()
        seen = set(train_df.loc[train_df['user'] == u, 'item'])
        pred_series = pred_series.drop(labels=list(seen), errors='ignore')

        test_u = test_df[test_df['user'] == u]
        if test_u.empty:
            continue

        top_recs = pred_series.sort_values(ascending=False).head(top_n)
        recommended.update(top_recs.index.tolist())
        hit, prec, rec, ndcg = ranking_metrics(top_recs.index.tolist(), test_u['item'].tolist(), k=top_n)
        hits.append(hit); precisions.append(prec); recalls.append(rec); ndcgs.append(ndcg)

        for _, row in test_u.iterrows():
            item = row['item']
            if item in predictions[u].index:
                pred = float(predictions[u].get(item, np.nan))
                if np.isnan(pred) or pred == 0:
                    pred = float(train_df['rating'].mean())
                y_true.append(float(row['rating']))
                y_pred.append(pred)

    return {
        'RMSE': rmse(y_true, y_pred),
        'MAE': float(mean_absolute_error(y_true, y_pred)),
        'HitRate@10': float(np.mean(hits)) if hits else 0.0,
        'Precision@10': float(np.mean(precisions)) if precisions else 0.0,
        'Recall@10': float(np.mean(recalls)) if recalls else 0.0,
        'NDCG@10': float(np.mean(ndcgs)) if ndcgs else 0.0,
        'Coverage': float(len(recommended) / train_df['item'].nunique()) if train_df['item'].nunique() else 0.0
    }

def prepare_regression_dataset(courses_df: pd.DataFrame, ratings_df: pd.DataFrame):
    courses_df = add_num_genres(courses_df.copy())
    course_target = ratings_df.groupby('item', as_index=False)['rating'].mean().rename(columns={'item':'COURSE_ID', 'rating':'avg_rating'})
    reg_df = courses_df.merge(course_target, on='COURSE_ID', how='left')
    rated_df = reg_df[reg_df['avg_rating'].notna()].copy()
    unrated_df = reg_df[reg_df['avg_rating'].isna()].copy()
    return rated_df, unrated_df

def evaluate_regressors(rated_df: pd.DataFrame, random_state: int = 42):
    features = ['TITLE'] + GENRE_COLS + ['num_genres']
    X = rated_df[features].copy()
    y = rated_df['avg_rating'].astype(float)

    preprocessor = ColumnTransformer([
        ('title_tfidf', TfidfVectorizer(stop_words='english', max_features=400), 'TITLE'),
        ('numeric', Pipeline([
            ('imputer', SimpleImputer(strategy='most_frequent'))
        ]), GENRE_COLS + ['num_genres'])
    ])

    models = {
        'LinearRegression': LinearRegression(),
        'Ridge': Ridge(alpha=1.0),
        'RandomForest': RandomForestRegressor(n_estimators=300, random_state=random_state, n_jobs=-1, max_depth=None),
        'GradientBoosting': GradientBoostingRegressor(random_state=random_state),
    }

    cv = KFold(n_splits=min(5, len(rated_df)), shuffle=True, random_state=random_state)
    results = []

    for name, model in models.items():
        pipe = Pipeline([
            ('preprocessor', preprocessor),
            ('model', model)
        ])
        scores = cross_validate(
            pipe, X, y, cv=cv,
            scoring={'mae':'neg_mean_absolute_error', 'rmse':'neg_root_mean_squared_error'},
            n_jobs=1
        )
        results.append({
            'Model': name,
            'CV_MAE': -scores['test_mae'].mean(),
            'CV_RMSE': -scores['test_rmse'].mean()
        })

    results_df = pd.DataFrame(results).sort_values(['CV_RMSE', 'CV_MAE']).reset_index(drop=True)
    best_name = results_df.iloc[0]['Model']
    best_pipe = Pipeline([
        ('preprocessor', preprocessor),
        ('model', clone(models[best_name]))
    ])
    best_pipe.fit(X, y)
    return results_df, best_pipe

def predict_unrated_courses(best_model, unrated_df: pd.DataFrame):
    features = ['TITLE'] + GENRE_COLS + ['num_genres']
    preds = best_model.predict(unrated_df[features])
    out = unrated_df[['COURSE_ID', 'TITLE'] + GENRE_COLS + ['num_genres']].copy()
    out['predicted_rating'] = preds
    out['predicted_rating'] = out['predicted_rating'].clip(1.0, 3.0)  # dataset appears 1-3
    return out

def append_predicted_courses_to_ratings(ratings_df: pd.DataFrame, predicted_courses_df: pd.DataFrame, synthetic_user_start: int = -1):
    rows = []
    current_user = synthetic_user_start
    for _, row in predicted_courses_df.iterrows():
        rows.append({
            'user': current_user,
            'item': row['COURSE_ID'],
            'rating': row['predicted_rating']
        })
        current_user -= 1
    predicted_ratings = pd.DataFrame(rows)
    full_ratings = pd.concat([ratings_df.copy(), predicted_ratings], ignore_index=True)
    return predicted_ratings, full_ratings

def merge_courses_and_ratings(courses_df: pd.DataFrame, ratings_df: pd.DataFrame):
    return ratings_df.merge(courses_df, left_on='item', right_on='COURSE_ID', how='left')

def save_dataframe(df: pd.DataFrame, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
