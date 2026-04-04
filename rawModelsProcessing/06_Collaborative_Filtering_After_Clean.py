#!/usr/bin/env python
# coding: utf-8

# # Notebook 6 — Collaborative Filtering (After Adding Predicted Courses)
# 
# This notebook re-runs collaborative filtering after adding one predicted rating row for each previously unrated course.

# In[1]:


from pathlib import Path
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import pickle
plt.rcParams.update({'figure.dpi': 120, 'axes.spines.top': False, 'axes.spines.right': False})

PROJECT_ROOT = Path('..').resolve()
DATA_RAW = PROJECT_ROOT / 'data' / 'raw'
DATA_PROCESSED = PROJECT_ROOT / 'data' / 'processed'
FIGURES_DIR = PROJECT_ROOT / 'figures'
MODELS_DIR = PROJECT_ROOT / 'models'
RESULTS_DIR = PROJECT_ROOT / 'results'

sys.path.append(str(PROJECT_ROOT))
import utils_recommender as ur
ur.ensure_dirs(FIGURES_DIR, MODELS_DIR, RESULTS_DIR)


# In[2]:


ratings_full = pd.read_csv(DATA_PROCESSED / 'ratings_full_with_predictions.csv')

train_df, test_df = ur.train_test_split_by_user(ratings_full, min_user_ratings=5, test_size=0.2, seed=42)
train_utility = ur.build_user_item_matrix(train_df)

print('Train shape:', train_df.shape)
print('Test shape :', test_df.shape)
print('Utility    :', train_utility.shape)


# In[3]:


pred_user_knn_after = ur.user_knn_predictions(train_utility, k=20)
pred_item_knn_after = ur.item_knn_predictions(train_utility, k=20)


# In[4]:


results_cf_after = pd.DataFrame({
    'User-KNN': ur.evaluate_cf(pred_user_knn_after, test_df, train_df, n_users=200),
    'Item-KNN': ur.evaluate_cf(pred_item_knn_after, test_df, train_df, n_users=200)
}).T.round(4)

results_cf_after


# In[5]:


results_cf_after.to_csv(RESULTS_DIR / 'results_collaborative_after.csv')
print('Saved:', RESULTS_DIR / 'results_collaborative_after.csv')

