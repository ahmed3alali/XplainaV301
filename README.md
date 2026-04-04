# Full Recommender System Project

This project was rebuilt from scratch to match the professor's required workflow.

## Project Goal

Build and compare three stages:

1. **Content-Based Filtering before merging**
2. **Collaborative Filtering before merging**
3. **Predict ratings for unrated courses using regression, append them to ratings, then merge and evaluate again**

## Folder Structure

- `data/raw/`
  - `ratings.csv`
  - `course_genre.csv`

- `data/processed/`
  - `final_courses.csv`
  - `unrated_courses.csv`
  - `predicted_unrated_courses_with_titles.csv`
  - `ratings_full_with_predictions.csv`
  - `final_complete_merged_dataset.csv`

- `notebooks/`
  - `01_EDA_Clean.ipynb`
  - `02_Content_Based_Before_Clean.ipynb`
  - `03_Collaborative_Filtering_Before_Clean.ipynb`
  - `04_Predict_Unrated_And_Merge_Clean.ipynb`
  - `05_Content_Based_After_Clean.ipynb`
  - `06_Collaborative_Filtering_After_Clean.ipynb`
  - `07_Final_Comparison_Clean.ipynb`

- `utils_recommender.py`
- `results/`
- `figures/`
- `models/`

## Running Order

Run the notebooks in this exact order:

1. `01_EDA_Clean.ipynb`
2. `02_Content_Based_Before_Clean.ipynb`
3. `03_Collaborative_Filtering_Before_Clean.ipynb`
4. `04_Predict_Unrated_And_Merge_Clean.ipynb`
5. `05_Content_Based_After_Clean.ipynb`
6. `06_Collaborative_Filtering_After_Clean.ipynb`
7. `07_Final_Comparison_Clean.ipynb`

## Important Methodological Notes

- `ratings.csv` intentionally contains only `user`, `item`, and `rating`.
- Content-based filtering is done using course metadata only.
- Collaborative filtering is done using ratings only.
- Merging is delayed until after predicting the missing courses.
- Regression is trained on **rated courses only**, using course features to predict average course rating.
- Predicted unrated courses are added to the ratings table using synthetic user IDs (`-1, -2, -3, ...`) so that every course appears in the final merged dataset.

## Main Deliverables Produced

- `predicted_unrated_courses_with_titles.csv`
- `ratings_full_with_predictions.csv`
- `final_complete_merged_dataset.csv`
- comparison CSV files inside `results/`

## Best Academic Summary

The project separates content-based and collaborative filtering during the baseline stage to avoid information leakage. Then, because many courses do not appear in `ratings.csv`, a supervised regression stage is introduced to estimate ratings for previously unrated courses using course metadata. These predicted ratings are appended to the original ratings dataset, allowing the construction of a complete merged dataset in which all courses appear with both metadata and rating values.