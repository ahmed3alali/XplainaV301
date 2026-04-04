import json

with open('HybridModel/08_Hybrid_Model.ipynb', 'r') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell['cell_type'] != 'code':
        continue
    source = ''.join(cell['source'])
    if 'def predict_content(' in source:
        cell['source'] = [
            "def predict_content(user_id, item_id, k=5):\n",
            "    if item_id not in tfidf_sim.columns:\n",
            "        return np.nan\n",
            "\n",
            "    sim_scores = tfidf_sim[item_id]\n",
            "\n",
            "    user_history = train_df[train_df['user'] == user_id]\n",
            "\n",
            "    sims = []\n",
            "    for _, row in user_history.iterrows():\n",
            "        if row['item'] in sim_scores.index:\n",
            "            sims.append((sim_scores[row['item']], row['rating']))\n",
            "\n",
            "    if len(sims) == 0:\n",
            "        return np.nan\n",
            "\n",
            "    sims = sorted(sims, reverse=True)[:k]\n",
            "\n",
            "    num = sum(sim * rating for sim, rating in sims)\n",
            "    den = sum(abs(sim) for sim, _ in sims)\n",
            "\n",
            "    return num / den if den != 0 else np.nan\n"
        ]
    elif 'def predict_cf(' in source:
        cell['source'] = [
            "def predict_cf(user_id, item_id):\n",
            "    try:\n",
            "        if user_id in pred_user_knn and item_id in pred_user_knn[user_id].index:\n",
            "            return pred_user_knn[user_id][item_id]\n",
            "        return np.nan\n",
            "    except:\n",
            "        return np.nan\n"
        ]

with open('HybridModel/08_Hybrid_Model.ipynb', 'w') as f:
    json.dump(nb, f, indent=1)
    # Add a newline at EOF
    f.write('\n')

