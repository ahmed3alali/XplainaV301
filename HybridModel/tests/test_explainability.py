import pytest
import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add project root temporarily
root_dir = Path(__file__).parent.parent.parent.resolve()
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from HybridModel.utils_explainability import explain_recommendation

@pytest.fixture
def mock_data():
    genres = ["Database", "Python", "CloudComputing"]
    
    courses_df = pd.DataFrame([
        {"COURSE_ID": "C1", "TITLE": "Intro to DB", "Database": 1.0, "Python": 0.0, "CloudComputing": 0.0},
        {"COURSE_ID": "C2", "TITLE": "Python basics", "Database": 0.0, "Python": 1.0, "CloudComputing": 0.0},
        {"COURSE_ID": "C3", "TITLE": "Cloud scale", "Database": 0.0, "Python": 0.0, "CloudComputing": 1.0},
    ])
    
    train_df = pd.DataFrame([
        {"user": 1, "item": "C1"},
        {"user": 1, "item": "C2"},
    ])
    
    cf_predictions = {
        1: pd.Series({"C1": 0.9, "C2": 0.7, "C3": 0.4})
    }
    
    sim_df = pd.DataFrame(
        [[1.0, 0.2, 0.1],
         [0.2, 1.0, 0.3],
         [0.1, 0.3, 1.0]],
        index=["C1", "C2", "C3"],
        columns=["C1", "C2", "C3"]
    )
    
    return train_df, cf_predictions, sim_df, courses_df

def test_explain_recommendation(mock_data, monkeypatch):
    train_df, cf_predictions, sim_df, courses_df = mock_data
    
    # Needs to match GENRE_COLS length in actual utils or be patched
    import HybridModel.utils_explainability as ux
    monkeypatch.setattr(ux, 'GENRE_COLS', ["Database", "Python", "CloudComputing"])
    
    res = explain_recommendation(
        user=1,
        course_id="C3",
        train_df=train_df,
        cf_predictions=cf_predictions,
        sim_df=sim_df,
        courses_df=courses_df,
        alpha=0.5
    )
    
    assert res.course_id == "C3"
    assert res.title == "Cloud scale"
    assert 0 <= res.cf_score <= 1.0
    assert 0 <= res.content_score <= 1.0
    assert "CloudComputing" in res.top_genres_matched
    
    # SHAP and LIME should populate
    assert isinstance(res.shap_values, dict)
    assert isinstance(res.lime_values, dict)
    
    # At least some keys exist in shap/lime
    assert len(res.shap_values) > 0
    assert len(res.lime_values) > 0
    
    assert res.similar_courses is not None
