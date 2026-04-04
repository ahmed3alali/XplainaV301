import nbformat

def add_save_cell(notebook_path, code):
    with open(notebook_path, 'r') as f:
        nb = nbformat.read(f, as_version=4)
    
    new_cell = nbformat.v4.new_code_cell(code)
    nb.cells.append(new_cell)
    
    with open(notebook_path, 'w') as f:
        nbformat.write(nb, f)

code_03 = """
with open(MODELS_DIR / '03_pred_user_knn.pkl', 'wb') as f:
    pickle.dump(pred_user_knn, f)
with open(MODELS_DIR / '03_pred_item_knn.pkl', 'wb') as f:
    pickle.dump(pred_item_knn, f)
print('Saved 03 models as pkl')
"""

code_06 = """
with open(MODELS_DIR / '06_pred_user_knn.pkl', 'wb') as f:
    pickle.dump(pred_user_knn_after, f)
with open(MODELS_DIR / '06_pred_item_knn.pkl', 'wb') as f:
    pickle.dump(pred_item_knn_after, f)
print('Saved 06 models as pkl')
"""

add_save_cell('rawModelsProcessing/03_Collaborative_Filtering_Before_Clean.ipynb', code_03)
add_save_cell('rawModelsProcessing/06_Collaborative_Filtering_After_Clean.ipynb', code_06)
print("Added save cells to notebooks")
