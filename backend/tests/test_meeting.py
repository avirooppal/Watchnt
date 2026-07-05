from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_meeting():
    response = client.post("/meeting", json={"title": "Test Meeting"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Meeting"
    assert "id" in data

def test_list_meetings():
    response = client.get("/meetings")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_nonexistent_meeting():
    response = client.get("/meeting/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404

def test_invalid_meeting_id_format():
    # Modified from plan.md. FastAPI path parameters do not capture slashes by default. 
    # Therefore /../../etc/passwd results in a 404 at the routing layer before validate_meeting_id is ever called.
    response = client.get("/meeting/invalid-id")
    assert response.status_code == 400

def test_create_and_delete():
    create = client.post("/meeting", json={"title": "Delete Me"})
    meeting_id = create.json()["id"]
    delete = client.delete(f"/meeting/{meeting_id}")
    assert delete.status_code == 200

def test_create_and_rename():
    create = client.post("/meeting", json={"title": "Original"})
    meeting_id = create.json()["id"]
    update = client.patch(f"/meeting/{meeting_id}", json={"title": "Renamed"})
    assert update.status_code == 200
    assert update.json()["title"] == "Renamed"
