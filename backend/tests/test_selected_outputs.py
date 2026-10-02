import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from main import app
from api.meeting import pipeline_service
from core.paths import MEETINGS_DIR
from database.db import SessionLocal, init_db
from database.models import Meeting
from services.llm_service import LLMService

client = TestClient(app)


def saved_meeting(monkeypatch):
    generate = AsyncMock(return_value='{"meeting_snapshot":"Plan","discussion_summary":"Ship"}')
    monkeypatch.setattr(LLMService, '_generate', generate)
    meeting = client.post('/meeting', json={'title': 'Original title'}).json()
    response = client.post('/upload_transcript', data={
        'meeting_id': meeting['id'],
        'transcript_json': json.dumps([{'text': 'Alex will ship on Friday.', 'speaker': 'Alex'}]),
    })
    assert response.status_code == 200
    assert generate.await_count == 0
    return meeting['id'], generate


def test_save_is_free_and_only_selected_output_runs(monkeypatch):
    meeting_id, generate = saved_meeting(monkeypatch)
    detail = client.get('/meeting/' + meeting_id).json()
    assert detail['meeting']['status'] == 'COMPLETED'
    assert detail['meeting']['title'] == 'Original title'
    assert all(block['status'] == 'skipped' for block in detail['ai'].values())
    response = client.post(f'/meeting/{meeting_id}/analyze', json={'outputs': ['summary', 'summary']})
    assert response.status_code == 200
    assert generate.await_count == 1
    detail = client.get('/meeting/' + meeting_id).json()
    assert detail['ai']['summary']['status'] == 'completed'
    assert detail['ai']['email']['status'] == 'skipped'
    original = (Path(MEETINGS_DIR) / meeting_id / 'transcript.json').read_bytes()
    generate.return_value = '{"text":"[Alex] Alex will ship on Friday."}'
    assert client.post(f'/meeting/{meeting_id}/analyze', json={'outputs': ['transcript']}).status_code == 200
    detail = client.get('/meeting/' + meeting_id).json()
    assert generate.await_count == 2
    assert detail['ai']['summary']['status'] == 'completed'
    assert detail['ai']['transcript']['data']['text'].startswith('[Alex]')
    assert (Path(MEETINGS_DIR) / meeting_id / 'transcript.json').read_bytes() == original
    assert client.post(f'/meeting/{meeting_id}/retry').status_code == 200
    assert generate.await_count == 2  # Retry must never generate skipped outputs.


def test_selection_validation_and_busy_guard(monkeypatch):
    meeting_id, generate = saved_meeting(monkeypatch)
    for outputs in [[], ['title'], ['search_index'], ['unknown']]:
        assert client.post(f'/meeting/{meeting_id}/analyze', json={'outputs': outputs}).status_code == 422
    with SessionLocal() as db:
        db.get(Meeting, meeting_id).status = 'EXTRACTING_INTELLIGENCE'
        db.commit()
    assert client.post(f'/meeting/{meeting_id}/analyze', json={'outputs': ['summary']}).status_code == 409
    assert generate.await_count == 0


def test_custom_prompts_persist_and_keep_schema_and_evidence(monkeypatch):
    init_db()
    defaults = client.get('/prompts').json()
    assert len(defaults) == 9
    for key in defaults:
        field = key + '_prompt_template'
        prompt = 'Focus on launch. Literal JSON: {"style":"short"}. {transcript}'
        assert client.post('/config', json={field: prompt}).status_code == 200
        assert client.get('/config').json()[field] == prompt
    try:
        service = LLMService()
        generate = AsyncMock(return_value='[]')
        monkeypatch.setattr(service, '_generate', generate)
        result = asyncio.run(service.extract_actions('Alex will ship.'))
        assert result['status'] == 'completed'
        sent = generate.call_args.args[0]
        assert 'Focus on launch.' in sent and 'Alex will ship.' in sent
        assert '{"style":"short"}' in sent and '{transcript}' not in sent
        assert 'schema' in sent and 'untrusted meeting' in sent
        generate.return_value = 'Alex'
        asyncio.run(service.chat_with_meeting([{'text': 'Alex will ship.'}], [{'role': 'user', 'content': 'Who ships?'}]))
        assert 'Focus on launch.' in generate.call_args.args[0]
        assert 'Who ships?' in generate.call_args.args[0]
        assert client.post('/config', json={'actions_prompt_template': 'x' * 12001}).status_code == 422
    finally:
        client.post('/config', json={key + '_prompt_template': '' for key in defaults})
