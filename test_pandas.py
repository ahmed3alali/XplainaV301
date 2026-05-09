import pandas as pd
import numpy as np

# Mock genres
GENRE_COLS = [
    "Database", "Python", "CloudComputing", "DataAnalysis", "Containers",
    "MachineLearning", "ComputerVision", "DataScience", "BigData",
    "Chatbot", "R", "BackendDev", "FrontendDev", "Blockchain",
]

df = pd.read_csv("data/processed/final_courses.csv")

valid_skills = ["FrontendDev", "BackendDev", "Database"]
valid_skills_set = set(valid_skills)
other_genre_cols = [g for g in GENRE_COLS if g not in valid_skills_set]

has_selected  = df[valid_skills].any(axis=1)
has_other     = df[other_genre_cols].any(axis=1) if other_genre_cols else pd.Series(False, index=df.index)
strict_mask   = has_selected & ~has_other
strict_ids    = df.loc[strict_mask, "COURSE_ID"].astype(str).tolist()

print("Strict IDs:", strict_ids)
print("Are excourses 87-93 in strict_ids?")
for i in range(87, 94):
    print(f"excourse{i}:", f"excourse{i}" in strict_ids)
