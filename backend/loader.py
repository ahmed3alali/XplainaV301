import pickle
import pandas as pd
from pathlib import Path

# Paths to data and models relative to project root
class AppState:
    def __init__(self):
        self.ratings_full = pd.DataFrame()
        self.courses_df = pd.DataFrame()
        self.cf_predictions = {}
        self.sim_df = pd.DataFrame()
        self.train_df = pd.DataFrame()
        self.test_df = pd.DataFrame()

state = AppState()

def load_all_data():
    """Loads CSVs and precomputed pickles into memory."""
    print("Loading data into memory...")
    
    # Try to find the root directory (handles both local dev and container deployment)
    current_dir = Path(__file__).parent.resolve()
    
    # 1. Try parent directory (local structure)
    root_dir = current_dir.parent
    processed_dir = root_dir / "data" / "processed"
    models_dir = root_dir / "models"
    
    # 2. Fallback to local (if only backend folder was deployed)
    if not models_dir.exists():
        processed_dir = current_dir / "data" / "processed"
        models_dir = current_dir / "models"
    
    # 1. Load CSVs
    try:
        state.ratings_full = pd.read_csv(processed_dir / "ratings_full_with_predictions.csv")
        state.courses_df = pd.read_csv(processed_dir / "final_courses.csv")
        print(f"Loaded CSVs: ratings {len(state.ratings_full)}, courses {len(state.courses_df)}")
    except Exception as e:
        print(f"Warning: Could not load CSVs: {e}")
        
    # 2. Load CF Model Dict (Default: User-KNN)
    try:
        import gzip
        user_knn_path_gz = models_dir / "06_pred_user_knn.gz"
        user_knn_path_pkl = models_dir / "06_pred_user_knn.pkl"
        
        if user_knn_path_gz.exists():
            with gzip.open(user_knn_path_gz, "rb") as f:
                state.cf_predictions = pickle.load(f)
            print(f"Loaded User-KNN predictions (GZ) for {len(state.cf_predictions)} users.")
        elif user_knn_path_pkl.exists():
            with open(user_knn_path_pkl, "rb") as f:
                state.cf_predictions = pickle.load(f)
            print(f"Loaded User-KNN predictions (PKL) for {len(state.cf_predictions)} users.")
        else:
            print("Warning: User-KNN model not found (.gz or .pkl).")
    except Exception as e:
        print(f"Warning: Failed to load CF predictions: {e}")

    # 3. Load Content Similarity Matrix
    try:
        sim_path_gz = models_dir / "tfidf_similarity.gz"
        sim_path_pkl = models_dir / "tfidf_similarity.pkl"
        
        if sim_path_gz.exists():
            with gzip.open(sim_path_gz, "rb") as f:
                state.sim_df = pickle.load(f)
            print(f"Loaded TF-IDF Similarity Matrix (GZ): {state.sim_df.shape}")
        elif sim_path_pkl.exists():
            with open(sim_path_pkl, "rb") as f:
                state.sim_df = pd.read_pickle(f)
            print(f"Loaded TF-IDF Similarity Matrix (PKL): {state.sim_df.shape}")
        else:
            print("Warning: tfidf_similarity not found (.gz or .pkl).")
    except Exception as e:
        print(f"Warning: Failed to load similarity matrix: {e}")
        
    # 4. Generate pseudo train_df, test_df
    try:
        import sys
        if str(root_dir) not in sys.path:
            sys.path.insert(0, str(root_dir))
        from utils_recommender import train_test_split_by_user
        state.train_df, state.test_df = train_test_split_by_user(state.ratings_full)
        print(f"Data split: train {len(state.train_df)}, test {len(state.test_df)}")
    except ImportError:
        # Fallback split
        print("Import of utils_recommender failed, falling back to simple split by user.")
        state.train_df = state.ratings_full.sample(frac=0.8, random_state=42)
        state.test_df = state.ratings_full.drop(state.train_df.index)

def get_state() -> AppState:
    return state
