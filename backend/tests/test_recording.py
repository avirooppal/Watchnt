from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_recording_capability_is_advertised():
    assert client.get('/recording/capabilities').json() == {'video': True}


def test_recording_chunks_playback_and_transcript_are_independent():
    meeting = client.post('/meeting', json={'title': 'Recording fixture'}).json()['id']
    base = f'/meeting/{meeting}/recording'
    first = b'\x1a\x45\xdf\xa3synthetic-webm'
    def chunk(index, data):
        return client.put(f'{base}/chunks/{index}', files={'file': ('chunk.webm', data, 'video/webm')})
    assert client.get(base).status_code == 404
    assert chunk(0, b'not webm').status_code == 422
    assert chunk(-1, first).status_code == 422
    assert chunk(0, first).status_code == 200
    assert chunk(0, first).status_code == 200  # Retrying never duplicates bytes.
    assert chunk(0, first + b'changed').status_code == 409
    assert chunk(2, b'tail').status_code == 200
    assert client.post(base + '/complete').status_code == 409
    assert chunk(1, b'middle').status_code == 200
    assert client.post(base + '/complete').status_code == 200
    assert client.post(base + '/complete').status_code == 200
    assert client.get(base).content == first + b'middletail'
    assert client.get('/meeting/' + meeting).json()['recording_available'] is True
    assert chunk(3, b'late').status_code == 409
    response = client.get(base, headers={'Range': 'bytes=0-3'})
    assert response.status_code == 206 and response.content == first[:4]
    assert client.delete('/meeting/' + meeting).status_code == 200
    assert client.get(base).status_code == 404


def test_recording_rejects_unknown_meeting_and_empty_chunks():
    assert client.post('/meeting/00000000-0000-0000-0000-000000000000/recording/complete').status_code == 404
    meeting = client.post('/meeting', json={'title': 'Empty recording'}).json()['id']
    base = f'/meeting/{meeting}/recording'
    assert client.put(base + '/chunks/0', files={'file': ('chunk.webm', b'')}).status_code == 413
    assert client.post(base + '/complete').status_code == 404
