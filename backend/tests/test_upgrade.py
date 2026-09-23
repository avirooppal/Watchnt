import asyncio
import json
from unittest.mock import AsyncMock
import numpy as np
import pytest
from fastapi.testclient import TestClient
from main import app
from services.llm_service import LLMService, parse_json_response
from services.providers.llm_factory import LLMProviderFactory
from services.providers.transcription_factory import TranscriptionProviderFactory
from database.models import Settings
from database.db import init_db

client = TestClient(app)

def test_cloud_stt_is_rejected_and_legacy_routes_local():
    assert client.post("/config", json={"transcription_provider": "openai"}).status_code == 422
    provider = TranscriptionProviderFactory.create(Settings(transcription_provider="openai", transcription_model="whisper-1"))
    assert provider.__class__.__name__ == "LocalWhisperProvider"
    assert provider.model_size == "base"

def test_cloud_text_requires_consent():
    with pytest.raises(ValueError, match="consent"):
        LLMProviderFactory.create(Settings(llm_provider="openai", openai_api_key="test"))
    provider = LLMProviderFactory.create(Settings(llm_provider="openai", openai_api_key="test", cloud_text_consent="yes"))
    assert provider.__class__.__name__ == "OpenAIProvider"

def test_remote_ollama_rejected():
    assert client.post("/config", json={"ollama_base_url":"https://remote.example/api/generate"}).status_code == 422

def test_short_secrets_are_masked_and_mask_not_written():
    client.post("/config", json={"groq_api_key":"short"})
    assert client.get("/config").json()["groq_api_key"] == "********"
    client.post("/config", json={"groq_api_key":"********"})
    from database.db import SessionLocal
    with SessionLocal() as db:
        assert db.get(Settings,"default").groq_api_key == "short"

def test_parse_fenced_and_prefixed_json():
    assert parse_json_response('```json\n[{"task":"hi"}]\n```') == [{"task":"hi"}]
    assert parse_json_response('Result: {"people":[]}') == {"people":[]}
    with pytest.raises(ValueError): parse_json_response('{"incomplete":')

def test_validation_retries_wrong_shape_then_succeeds(monkeypatch):
    service = LLMService()
    generate = AsyncMock(side_effect=['{"task":"wrong shape"}', '[{"task":"Ship", "priority":"High", "confidence":"High"}]'])
    monkeypatch.setattr(service, "_generate", generate)
    result = asyncio.run(service.extract_actions("Alex will ship the patch."))
    assert result["status"] == "completed"
    assert result["data"][0]["task"] == "Ship"
    assert generate.await_count == 2
    assert "original multilingual" in generate.call_args.args[0]

def test_bad_output_is_explicit_failure(monkeypatch):
    service = LLMService()
    generate = AsyncMock(return_value='{"invalid":1}')
    monkeypatch.setattr(service, "_generate", generate)
    result = asyncio.run(service.generate_summary("hello"))
    assert result["status"] == "failed" and result["data"] is None
    assert generate.await_count == 3

def test_bad_transcript_is_not_persisted():
    meeting = client.post('/meeting',json={'title':'Validate'}).json()
    response = client.post('/upload_transcript',data={'meeting_id':meeting['id'],'transcript_json':'[{"text":12}]'})
    assert response.status_code == 422

def test_stream_offsets_and_channel_labels(monkeypatch):
    class Fake:
        def transcribe(self, audio):
            return [{"start":0.,"end":len(audio)/16000,"text":"hello","confidence":.8}]
    monkeypatch.setattr(TranscriptionProviderFactory, 'create', lambda _: Fake())
    with client.websocket_connect('/ws/transcribe',headers={'origin':'chrome-extension://test'}) as socket:
        socket.send_json({'sampleRate':16000,'channels':2})
        assert socket.receive_json()['ready']
        packet = np.full((16000,2), .1,dtype='<f4').tobytes()
        socket.send_bytes(packet)
        first=socket.receive_json()
        assert {s['speaker'] for s in first['segments']} == {'Me','Others'}
        assert first['processed_seconds'] == 1
        socket.send_bytes(packet)
        second=socket.receive_json()
        assert second['segments'][0]['start'] == 1
        assert second['processed_seconds'] == 2

def test_stream_rejects_bad_format():
    from starlette.websockets import WebSocketDisconnect
    with client.websocket_connect('/ws/transcribe',headers={'origin':'chrome-extension://test'}) as socket:
        socket.send_json({'sampleRate':48000,'channels':1})
        with pytest.raises(WebSocketDisconnect):socket.receive_json()

def test_stream_rejects_remote_origin():
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect('/ws/transcribe',headers={'origin':'https://evil.example'}):pass

def test_actions_persist_and_folder_can_be_cleared():
    from core.paths import MEETINGS_DIR
    from pathlib import Path
    meeting = client.post('/meeting',json={'title':'Tasks'}).json()
    path=Path(MEETINGS_DIR)/meeting['id']/'meeting.json'
    path.write_text(json.dumps({'ai':{'actions':{'data':[{'task':'Ship'}]}}}),encoding='utf8')
    response=client.patch(f"/meeting/{meeting['id']}/action/0",json={'completed':True})
    assert response.status_code == 200 and response.json()['completed']
    assert json.loads(path.read_text())['ai']['actions']['data'][0]['completed']
    assert any(a['meeting_id']==meeting['id'] and a['completed'] for a in client.get('/action-items').json())
    client.patch(f"/meeting/{meeting['id']}",json={'folder_id':'folder'})
    assert client.patch(f"/meeting/{meeting['id']}",json={'folder_id':None}).json()['folder_id'] is None

def test_migration_is_idempotent():
    init_db()
    init_db()
    assert client.get('/config').status_code == 200


def test_manual_language_and_invalid_language():
    assert client.post('/config', json={'transcription_language':'hi'}).status_code == 200
    assert client.post('/config', json={'transcription_language':'not-a-language'}).status_code == 422
    client.post('/config', json={'transcription_language':'auto'})

def test_smtp_export_cannot_send_meeting_data():
    response=client.post('/email/00000000-0000-0000-0000-000000000000',json={'to_email':'nobody@example.com'})
    assert response.status_code == 410

def test_old_sqlite_settings_get_additive_columns(monkeypatch):
    import database.db as database
    from sqlalchemy import create_engine, text, inspect
    engine=create_engine('sqlite://')
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE settings (id VARCHAR PRIMARY KEY, transcription_provider VARCHAR)"))
        connection.execute(text("INSERT INTO settings VALUES ('default', 'groq')"))
    monkeypatch.setattr(database,'engine',engine)
    database.init_db()
    database.init_db()
    columns={column['name'] for column in inspect(engine).get_columns('settings')}
    assert {'transcription_language','cloud_text_consent'} <= columns
    with engine.connect() as connection:
        assert connection.execute(text('SELECT transcription_provider FROM settings')).scalar()=='local'
    engine.dispose()

def test_review_survives_regenerated_artifact():
    from services.action_review import save_review, apply_reviews
    meeting=client.post('/meeting',json={'title':'Review survives'}).json()
    item={'task':'Ship','owner':'Alex'}
    save_review(meeting['id'],item,True)
    assert apply_reviews(meeting['id'],[{'task':'Ship','owner':'Alex','completed':False}])[0]['completed']

def test_pipeline_preserves_success_when_one_stage_fails(monkeypatch):
    from services.pipeline_service import PipelineService
    from core.paths import MEETINGS_DIR
    from pathlib import Path
    pipeline=PipelineService()
    meeting=client.post('/meeting',json={'title':'Partial pipeline'}).json()
    directory=Path(MEETINGS_DIR)/meeting['id']
    (directory/'transcript.json').write_text(json.dumps({'segments':[{'text':'Alex will ship','start':0,'end':10,'language':'en'}]}))
    monkeypatch.setattr(pipeline.llm_service,'generate_title',AsyncMock(return_value='Ship plan'))
    for name in ['generate_summary','generate_executive_brief','extract_actions','extract_decisions','generate_email','generate_timeline','extract_entities','generate_search_index']:
        value=[] if name in {'extract_actions','extract_decisions','generate_timeline','generate_search_index'} else {}
        monkeypatch.setattr(pipeline.llm_service,name,AsyncMock(return_value={'status':'completed','metadata':{},'data':value}))
    monkeypatch.setattr(pipeline.llm_service,'generate_email',AsyncMock(return_value={'status':'failed','data':None,'error':'Malformed output'}))
    asyncio.run(pipeline.process_transcript(meeting['id']))
    result=client.get('/meeting/'+meeting['id']).json()
    assert result['meeting']['status']=='FAILED'
    assert result['ai']['summary']['status']=='completed'
    assert result['ai']['email']['status']=='failed'
    assert result['transcript']['segments'][0]['text']=='Alex will ship'
    pipeline.llm_service.generate_email.return_value = {'status':'completed','metadata':{},'data':{}}
    asyncio.run(pipeline.process_transcript(meeting['id'], retry_failed=True))
    assert client.get('/meeting/'+meeting['id']).json()['meeting']['status'] == 'COMPLETED'
    assert pipeline.llm_service.generate_summary.await_count == 1
    assert pipeline.llm_service.generate_email.await_count == 2

@pytest.mark.parametrize('segments', [[], [{'text':'   '} ]])
def test_empty_capture_is_failure_with_visible_reason(segments):
    meeting = client.post('/meeting',json={'title':'Silent capture'}).json()
    response = client.post('/upload_transcript',data={'meeting_id':meeting['id'],'transcript_json':json.dumps(segments)})
    assert response.status_code == 200
    status = client.get(f"/meeting/{meeting['id']}/status").json()
    assert status['status'] == 'FAILED'
    assert 'No speech was captured' in status['error']
    detail = client.get(f"/meeting/{meeting['id']}").json()
    assert detail['meeting']['title'] == 'Silent capture'
    assert detail['capture_error'] == status['error']
    assert detail['transcript']['segments'] is not None
