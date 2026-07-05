from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_config():
    response = client.get("/config")
    assert response.status_code == 200
    data = response.json()
    assert "llm_provider" in data
    assert "transcription_provider" in data

def test_update_config():
    response = client.post("/config", json={"llm_model": "test-model"})
    assert response.status_code == 200
    assert response.json()["llm_model"] == "test-model"

def test_api_key_masking():
    client.post("/config", json={"openai_api_key": "sk-proj-abcdefghijklmnop"})
    response = client.get("/config")
    key = response.json()["openai_api_key"]
    assert "****" in key
    assert key.startswith("sk-p")
    assert key.endswith("mnop")
