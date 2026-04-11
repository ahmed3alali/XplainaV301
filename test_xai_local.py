# test_xai_local.py
import pandas as pd
import os
import warnings
from pathlib import Path

# Silence warnings for clean output
warnings.filterwarnings("ignore")

# 1. Add paths so we can import from HybridModel
from HybridModel.utils_hybrid import load_hybrid_data, load_cf_models
from HybridModel.utils_explainability import explain_recommendation
from HybridModel.utils_llm import get_llm_explanation

# 2. Setup paths
root = Path('.').resolve()
data_raw = root / "data" / "raw"
data_processed = root / "data" / "processed"
models_dir = root / "models"

print("--- Initializing Data ---")
try:
    # 2. Load Data
    ratings_full, courses = load_hybrid_data(data_raw, data_processed)
    train_df = ratings_full.sample(frac=0.8, random_state=42)
    pred_user, _ = load_cf_models(models_dir)
    sim_df = pd.read_pickle(models_dir / "tfidf_similarity.pkl")

    # 3. Test Explainability for User 2 on course 'ML0101EN'
    print("\n--- Generating SHAP/LIME Explanation for User 2 ---")
    exp = explain_recommendation(
        user=2, 
        course_id='ML0101EN', 
        train_df=train_df, 
        cf_predictions=pred_user, 
        sim_df=sim_df, 
        courses_df=courses
    )

    print(f"Course: {exp.title}")
    print(f"Hybrid Score: {exp.hybrid_score:.4f}")
    print(f"Breakdown: CF={exp.cf_score:.2f}, Content={exp.content_score:.2f} (alpha={exp.alpha})")
    print(f"Top Genres Matched: {exp.top_genres_matched}")
    
    # Sort and show top 3 SHAP drivers
    shap_top = sorted(exp.shap_values.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"Top 3 SHAP Drivers: {shap_top}")

    # 4. Generate LLM Prompt Preview
    print("\n--- LLM Prompt Preview ---")
    llm_res = get_llm_explanation(exp, courses, provider='claude')
    print("DEMO PROMPT:")
    print("-" * 30)
    print(llm_res.prompt_used)
    print("-" * 30)
    print("\nSUCCESS: Local XAI logic is working correctly.")

except Exception as e:
    print(f"\nERROR: Could not complete XAI test. Details: {str(e)}")
