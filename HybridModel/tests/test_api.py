import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path
import pandas as pd

# Path magic
root_dir = Path(__file__).parent.parent.parent.resolve()
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from HybridModel.backend.main import app, lifespan
from HybridModel.backend.loader import state

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_loader(monkeypatch):
    """Mocks the app state so we don't need real CSVs for testing API routes."""
    # Build minimal state
    from HybridModel.backend.loader import AppState
    mock_state = AppState()
    
    mock_state.courses_df = pd.DataFrame([
        {"COURSE_ID": "C1", "TITLE": "Test 1", "Python": 1},
        {"COURSE_ID": "C2", "TITLE": "Test 2", "Database": 1}
    ])
    
    # We patch the state variable directly in the module
    monkeypatch.setattr("HybridModel.backend.main.get_state", lambda: mock_state)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_courses():
    response = client.get("/courses?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert "TITLE" in data[0]

def test_recommend_missing_data(monkeypatch):
    # Overwrite the actual logic to throw an error since mock_state doesn't have valid sim_df
    def dummy_hybrid(*args, **kwargs):
        return {"C1": 0.9, "C2": 0.8}
    monkeypatch.setattr("HybridModel.backend.main.hybrid_scores_for_user", dummy_hybrid)
    
    response = client.get("/recommend/1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["course_id"] == "C1"
    assert data[0]["hybrid_score"] == 0.9
