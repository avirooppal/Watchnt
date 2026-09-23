import asyncio
import json
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient
from main import app
from database.models import Settings
from services.llm_service import LLMService
from services.providers.llm.openrouter import OpenRouterProvider


def test_openrouter_stream_preserves_answer_not_reasoning(monkeypatch):
    def handle(request):
        payload = json.loads(request.content)
        assert payload['stream'] is True and payload['max_tokens'] == 8192
        assert request.headers['authorization'] == 'Bearer test-key'
        return httpx.Response(200, text=': keepalive\n\ndata: {"choices":[{"delta":{"reasoning":"hidden","content":"Hello"}}]}\n\ndata: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')
    client = httpx.AsyncClient(transport=httpx.MockTransport(handle))
    monkeypatch.setattr('services.providers.llm.openrouter.httpx.AsyncClient', lambda **_: client)
    assert asyncio.run(OpenRouterProvider('test-key', 'model').generate_response('synthetic')) == 'Hello world'


@pytest.mark.parametrize('body', [
    'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
    'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n',
    'data: {"error":{"code":429,"message":"private vendor data"}}\n\n',
    'data: [DONE]\n\n',
    'data: not-json\n\n',
])
def test_incomplete_stream_is_not_success(monkeypatch, body):
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(200, text=body)))
    monkeypatch.setattr('services.providers.llm.openrouter.httpx.AsyncClient', lambda **_: client)
    with pytest.raises(RuntimeError) as error:
        asyncio.run(OpenRouterProvider('test-key', 'model').generate_response('synthetic'))
    assert str(error.value) and 'private vendor data' not in str(error.value)


@pytest.mark.parametrize('recover', [True, False])
@pytest.mark.parametrize('timeout_type', [TimeoutError, asyncio.TimeoutError])
def test_timeout_retry_is_bounded_and_error_is_useful(monkeypatch, recover, timeout_type):
    service = LLMService()
    settings = Settings(llm_provider='openrouter', llm_model='test-model')
    monkeypatch.setattr(service, '_get_settings', lambda: settings)
    provider = AsyncMock()
    provider.timeout_seconds = 300
    provider.generate_response.side_effect = [timeout_type(), 'OK' if recover else timeout_type()]
    monkeypatch.setattr('services.llm_service.LLMProviderFactory.create', lambda _: provider)
    monkeypatch.setattr('services.llm_service.asyncio.sleep', AsyncMock())
    if recover:
        assert asyncio.run(service._generate('test')) == 'OK'
    else:
        with pytest.raises(RuntimeError, match='transcript is saved'):
            asyncio.run(service._generate('test'))
    assert provider.generate_response.await_count == 2


def test_legacy_empty_errors_get_recovery_message():
    from core.paths import MEETINGS_DIR
    from database.db import SessionLocal
    from database.models import Meeting
    from pathlib import Path
    client = TestClient(app)
    meeting = client.post('/meeting', json={'title': 'Legacy timeout'}).json()
    with SessionLocal() as db:
        db.get(Meeting, meeting['id']).status = 'FAILED'
        db.commit()
    (Path(MEETINGS_DIR)/meeting['id']/'meeting.json').write_text(json.dumps({'ai': {'summary': {'status': 'failed', 'error': ''}}}))
    assert 'saved transcript' in client.get('/meeting/'+meeting['id']+'/status').json()['error']


def test_provider_outage_stops_queued_sections(monkeypatch, tmp_path):
    from services.pipeline_service import PipelineService
    pipeline = PipelineService()
    monkeypatch.setattr(pipeline, 'update_status', lambda *args: None)
    monkeypatch.setattr(pipeline, 'update_meeting_metadata', lambda *args, **kwargs: None)
    monkeypatch.setattr(pipeline.llm_service, 'generate_title', AsyncMock(return_value='Synthetic'))
    failure = AsyncMock(return_value={'status':'failed','error':'openrouter timed out. Your transcript is saved.','metadata':{},'data':None})
    for name in ('generate_summary','generate_executive_brief','extract_actions','extract_decisions','generate_email','generate_timeline','extract_entities','generate_search_index'):
        monkeypatch.setattr(pipeline.llm_service, name, failure)
    asyncio.run(pipeline._process_post_transcription('synthetic', str(tmp_path), [{'text':'Synthetic meeting'}]))
    assert failure.await_count <= 2
    saved = json.loads((tmp_path/'meeting.json').read_text())
    assert all(block['status']=='failed' and block['error'] for block in saved['ai'].values())
