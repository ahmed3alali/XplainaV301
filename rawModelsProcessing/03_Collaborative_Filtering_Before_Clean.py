#!/usr/bin/env python
# coding: utf-8

# # Notebook 3 — Collaborative Filtering (Before Merging)
# 
# This notebook performs collaborative filtering directly on `ratings.csv` without merging course metadata.
# 
# Algorithms:
# - User-KNN (cosine)
# - Item-KNN (cosine)

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


ratings = pd.read_csv(DATA_RAW / 'ratings.csv')

train_df, test_df = ur.train_test_split_by_user(ratings, min_user_ratings=5, test_size=0.2, seed=42)

train_utility = ur.build_user_item_matrix(train_df)
print('Train shape:', train_df.shape)
print('Test shape :', test_df.shape)
print('Utility    :', train_utility.shape)


# In[3]:


pred_user_knn = ur.user_knn_predictions(train_utility, k=20)
pred_item_knn = ur.item_knn_predictions(train_utility, k=20)


# In[4]:


results_cf_before = pd.DataFrame({
    'User-KNN': ur.evaluate_cf(pred_user_knn, test_df, train_df, n_users=200),
    'Item-KNN': ur.evaluate_cf(pred_item_knn, test_df, train_df, n_users=200)
}).T.round(4)

results_cf_before


# In[ ]:





# In[5]:


results_cf_before.to_csv(RESULTS_DIR / 'results_collaborative_before.csv')
print('Saved:', RESULTS_DIR / 'results_collaborative_before.csv')

