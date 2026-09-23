import asyncio
import json

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from api.config import router
from core.deps import get_db
from database.db import Base
from database.models import Settings, Meeting
from schemas.config import SettingsUpdate
from services.providers.catalog import PROVIDERS, NEW_CLOUD_PROVIDERS, API_KEY_FIELDS
from services.providers.llm.cloud import CloudProvider
from services.providers.llm_factory import LLMProviderFactory


@pytest.fixture
def isolated_api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: db
        with TestClient(app) as client:
            yield client, db
    engine.dispose()


def test_catalog_and_key_roundtrip(isolated_api):
    client, db = isolated_api
    catalog = client.get('/providers').json()
    assert {p['id'] for p in catalog} == set(PROVIDERS)
    assert sum(p['cloud'] for p in catalog) == 12
    assert all(set(p) == {'id', 'label', 'cloud', 'default_model', 'docs_url'} for p in catalog)
    keys = {field: 'secret-for-' + field for field in API_KEY_FIELDS}
    response = client.post('/config', json=keys)
    assert response.status_code == 200
    masked = {field: response.json()[field] for field in keys}
    assert all('****' in value and value != keys[field] for field, value in masked.items())
    assert client.post('/config', json=masked).status_code == 200
    assert all(getattr(db.get(Settings, 'default'), field) == key for field, key in keys.items())
    client.post('/config', json={'anthropic_api_key': ''})
    assert db.get(Settings, 'default').anthropic_api_key == ''
    assert db.get(Settings, 'default').ollama_cloud_api_key == keys['ollama_cloud_api_key']
    assert client.post('/config', json={'llm_provider': 'unknown'}).status_code == 422


def test_switch_requires_new_consent(isolated_api):
    client, _ = isolated_api
    client.post('/config', json={'llm_provider': 'openai', 'cloud_text_consent': 'yes'})
    assert client.post('/config', json={'llm_provider': 'anthropic'}).json()['cloud_text_consent'] == 'no'
    assert client.post('/config', json={'llm_provider': 'ollama_cloud', 'cloud_text_consent': 'yes'}).json()['cloud_text_consent'] == 'yes'


@pytest.mark.parametrize('name', NEW_CLOUD_PROVIDERS)
def test_diagnostics_use_only_selected_provider(isolated_api, monkeypatch, name):
    client, _ = isolated_api
    from unittest.mock import AsyncMock
    monkeypatch.setattr('services.providers.transcription.local_whisper.load_model', lambda _: None)
    generate = AsyncMock(return_value='OK')
    monkeypatch.setattr(CloudProvider, 'generate_response', generate)
    client.post('/config', json={'llm_provider': name, 'llm_model': 'test-model', name + '_api_key': 'test-secret', 'cloud_text_consent': 'yes'})
    checks = client.post('/config/test').json()
    assert set(checks) == {'whisper', name}
    assert checks[name]['status'] == 'ok'
    generate.assert_awaited_once()
    assert 'no meeting data' in generate.call_args.args[0]


@pytest.mark.parametrize('name', NEW_CLOUD_PROVIDERS)
def test_consent_key_and_model_required(name):
    settings = Settings(llm_provider=name, llm_model='account-model')
    with pytest.raises(ValueError, match='consent'):
        LLMProviderFactory.create(settings)
    settings.cloud_text_consent = 'yes'
    with pytest.raises(ValueError, match='API key'):
        LLMProviderFactory.create(settings)
    setattr(settings, name + '_api_key', 'test-secret')
    assert isinstance(LLMProviderFactory.create(settings), CloudProvider)
    if not PROVIDERS[name].default_model:
        with pytest.raises(ValueError, match='model ID'):
            CloudProvider(name, 'test-secret', '')
    assert SettingsUpdate(llm_provider=name).llm_provider == name


def mock_http(monkeypatch, handler):
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    monkeypatch.setattr('services.providers.llm.cloud.httpx.AsyncClient', lambda **kwargs: client)


@pytest.mark.parametrize('name', NEW_CLOUD_PROVIDERS)
def test_wire_protocols(monkeypatch, name):
    spec = PROVIDERS[name]
    calls = []
    def handle(request):
        calls.append(request)
        assert str(request.url) == spec.endpoint
        payload = json.loads(request.content)
        assert payload['model'] == 'account-model'
        assert payload['messages'] == [{'role': 'user', 'content': 'Synthetic test prompt'}]
        assert payload['stream'] is False
        if spec.protocol == 'anthropic':
            assert request.headers['x-api-key'] == 'test-secret'
            assert request.headers['anthropic-version'] == '2023-06-01'
            assert 'authorization' not in request.headers
            assert payload['max_tokens'] > 0
            data = {'content': [{'type': 'thinking', 'thinking': 'hidden'}, {'type': 'text', 'text': ' OK '}], 'stop_reason': 'end_turn'}
        else:
            assert request.headers['authorization'] == 'Bearer test-secret'
            data = {'message': {'content': ' OK '}, 'done_reason': 'stop'} if spec.protocol == 'ollama' else {'choices': [{'message': {'content': ' OK ', 'reasoning_content': 'hidden'}, 'finish_reason': 'stop'}]}
        return httpx.Response(200, json=data)
    mock_http(monkeypatch, handle)
    assert asyncio.run(CloudProvider(name, 'test-secret', 'account-model').generate_response('Synthetic test prompt')) == 'OK'
    assert len(calls) == 1


@pytest.mark.parametrize('status', [301, 400, 401, 403, 404, 429, 500, 502])
def test_vendor_errors_do_not_expose_secrets(monkeypatch, status):
    mock_http(monkeypatch, lambda request: httpx.Response(status, text='SECRET KEY and MEETING TEXT'))
    with pytest.raises(RuntimeError, match=str(status)) as error:
        asyncio.run(CloudProvider('ollama_cloud', 'SECRET KEY', '').generate_response('MEETING TEXT'))
    assert 'SECRET KEY' not in str(error.value) and 'MEETING TEXT' not in str(error.value)


@pytest.mark.parametrize('data', [{}, {'choices': []}, {'choices': [{'message': {'content': None}}]}, {'choices': [{'message': {'content': 'partial'}, 'finish_reason': 'length'}]}])
def test_unusable_and_truncated_output_rejected(monkeypatch, data):
    mock_http(monkeypatch, lambda request: httpx.Response(200, json=data))
    with pytest.raises(RuntimeError):
        asyncio.run(CloudProvider('deepseek', 'test-secret', 'model').generate_response('test'))


def test_timeout_is_sanitized(monkeypatch):
    def handle(request):
        raise httpx.ReadTimeout('SECRET KEY', request=request)
    mock_http(monkeypatch, handle)
    with pytest.raises(RuntimeError, match='timed out') as error:
        asyncio.run(CloudProvider('ollama_cloud', 'test-secret', '').generate_response('test'))
    assert 'SECRET KEY' not in str(error.value)


@pytest.mark.parametrize('model', ['gemma4:31b-cloud', 'model:cloud'])
def test_local_cloud_alias_cannot_bypass_consent(model):
    with pytest.raises(ValueError, match='Ollama Cloud'):
        LLMProviderFactory.create(Settings(llm_provider='ollama', llm_model=model))


def test_old_database_migration_preserves_settings_and_meetings(monkeypatch):
    import database.db as database
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        for name in NEW_CLOUD_PROVIDERS:
            connection.execute(text(f'ALTER TABLE settings DROP COLUMN {name}_api_key'))
        connection.execute(text("INSERT INTO settings (id, transcription_provider, llm_provider, openai_api_key) VALUES ('default', 'local', 'openai', 'preserved-key')"))
        connection.execute(text("INSERT INTO meetings (id, title) VALUES ('existing', 'Preserved meeting')"))
    monkeypatch.setattr(database, 'engine', engine)
    database.init_db()
    database.init_db()
    assert set(API_KEY_FIELDS) <= {c['name'] for c in inspect(engine).get_columns('settings')}
    with Session(engine) as db:
        saved = db.get(Settings, 'default')
        assert saved.openai_api_key == 'preserved-key' and saved.llm_provider == 'openai'
        assert all(getattr(saved, name + '_api_key') == '' for name in NEW_CLOUD_PROVIDERS)
        assert db.get(Meeting, 'existing').title == 'Preserved meeting'
    engine.dispose()
