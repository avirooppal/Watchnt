import json

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from database.db import Base
from database.models import Settings, Meeting
from docker_start import configure, ensure_ollama, ensure_whisper, warm_ollama, OLLAMA_URL
from schemas.config import SettingsUpdate


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_fresh_install_and_restart_preserve_user_choices(db, monkeypatch):
    monkeypatch.setenv("WATCHNT_DEFAULT_LLM_MODEL", "qwen3:1.7b")
    settings = configure(db)
    assert (settings.llm_provider, settings.llm_model, settings.ollama_base_url) == (
        "ollama", "qwen3:1.7b", OLLAMA_URL)
    assert settings.cloud_text_consent == "no"
    settings.llm_model = "custom-model"
    db.add(Meeting(id="keep", title="Existing meeting"))
    db.commit()
    assert configure(db).llm_model == "custom-model"
    assert db.get(Meeting, "keep").title == "Existing meeting"


@pytest.mark.parametrize("host", ["localhost", "127.0.0.1", "[::1]", "host.docker.internal"])
def test_existing_local_ollama_routes_to_container(db, host):
    db.add(Settings(id="default", ollama_base_url=f"http://{host}:11434/api/generate", llm_model="existing-model"))
    db.commit()
    settings = configure(db)
    assert settings.ollama_base_url == OLLAMA_URL
    assert settings.llm_model == "existing-model"


def test_cloud_settings_and_custom_endpoint_are_preserved(db):
    db.add(Settings(id="default", llm_provider="openai", llm_model="saved-model",
                    openai_api_key="saved-key", cloud_text_consent="yes"))
    db.commit()
    settings = configure(db)
    assert (settings.llm_provider, settings.llm_model, settings.openai_api_key, settings.cloud_text_consent) == (
        "openai", "saved-model", "saved-key", "yes")
    settings.llm_provider = "ollama"
    settings.ollama_base_url = "http://host.docker.internal:9999/api/generate"
    db.commit()
    assert configure(db).ollama_base_url == "http://host.docker.internal:9999/api/generate"


def test_ollama_cloud_start_skips_local_llm(db, monkeypatch, tmp_path):
    import docker_start
    from unittest.mock import Mock
    db.add(Settings(id="default", llm_provider="ollama_cloud", llm_model="cloud-model",
                    ollama_cloud_api_key="saved-key", cloud_text_consent="yes"))
    db.commit()
    monkeypatch.setattr(docker_start, 'Path', lambda _: tmp_path)
    monkeypatch.setattr(docker_start, 'init_db', lambda: None)
    monkeypatch.setattr(docker_start, 'SessionLocal', lambda: db)
    whisper, download, warm = Mock(), Mock(), Mock()
    monkeypatch.setattr(docker_start, 'ensure_whisper', whisper)
    monkeypatch.setattr(docker_start, 'ensure_ollama', download)
    monkeypatch.setattr(docker_start, 'warm_ollama', warm)
    docker_start.prepare()
    whisper.assert_called_once_with('base')
    download.assert_not_called()
    warm.assert_not_called()
    saved = db.get(Settings, 'default')
    assert saved.ollama_cloud_api_key == 'saved-key' and saved.llm_model == 'cloud-model'


def test_docker_hostname_only_allowed_in_docker(monkeypatch):
    monkeypatch.delenv("WATCHNT_DOCKER", raising=False)
    with pytest.raises(ValueError):
        SettingsUpdate(ollama_base_url=OLLAMA_URL)
    monkeypatch.setenv("WATCHNT_DOCKER", "1")
    assert SettingsUpdate(ollama_base_url=OLLAMA_URL).ollama_base_url == OLLAMA_URL
    for url in ["http://other-container:11434/api/generate", "https://ollama/api/generate", "http://user:pass@ollama/api/generate"]:
        with pytest.raises(ValueError):
            SettingsUpdate(ollama_base_url=url)


@pytest.mark.parametrize("events, error", [
    ([{"status": "success"}], None),
    ([{"error": "download failed"}], "download failed"),
    ([{"status": "pulling manifest"}], "before success"),
])
def test_model_download_must_complete(monkeypatch, events, error):
    monkeypatch.setenv("WATCHNT_DOCKER", "1")
    paths = []
    def handle(request):
        paths.append(request.url.path)
        if request.url.path == "/api/show":
            return httpx.Response(404)
        assert json.loads(request.content)["model"] == "test-model"
        return httpx.Response(200, content="\n".join(json.dumps(event) for event in events))
    client = httpx.Client(transport=httpx.MockTransport(handle))
    monkeypatch.setattr("docker_start.httpx.Client", lambda **kwargs: client)
    if error:
        with pytest.raises(RuntimeError, match=error):
            ensure_ollama(OLLAMA_URL, "test-model")
    else:
        ensure_ollama(OLLAMA_URL, "test-model")
    assert paths == ["/api/show", "/api/pull"]


def test_cached_model_does_not_download(monkeypatch):
    monkeypatch.setenv("WATCHNT_DOCKER", "1")
    def handle(request):
        assert request.url.path == "/api/show"
        return httpx.Response(200, json={})
    client = httpx.Client(transport=httpx.MockTransport(handle))
    monkeypatch.setattr("docker_start.httpx.Client", lambda **kwargs: client)
    ensure_ollama(OLLAMA_URL, "cached-model")


@pytest.mark.parametrize("cache", ["complete", "missing", "tokenizer.json", "model.bin", "config.json", "vocabulary.txt"])
def test_whisper_only_downloads_missing_files(monkeypatch, tmp_path, cache):
    from unittest.mock import Mock
    for name in ("tokenizer.json", "model.bin", "config.json", "vocabulary.txt"):
        if cache != name:
            (tmp_path / name).write_text("fixture")
    def download(model, local_files_only=False):
        if local_files_only and cache == "missing":
            raise FileNotFoundError("No cached snapshot")
        return str(tmp_path)
    download_mock = Mock(side_effect=download)
    load_mock = Mock()
    monkeypatch.setattr("faster_whisper.utils.download_model", download_mock)
    monkeypatch.setattr("services.providers.transcription.local_whisper.load_model", load_mock)
    ensure_whisper("base")
    assert download_mock.call_args_list[0].kwargs == {"local_files_only": True}
    assert download_mock.call_count == (1 if cache == "complete" else 2)
    load_mock.assert_called_once_with("base")


@pytest.mark.parametrize("status", [200, 500])
def test_model_warmup_finishes_before_readiness(monkeypatch, status):
    def handle(request):
        assert request.url.path == "/api/generate"
        assert json.loads(request.content) == {"model": "test-model", "stream": False, "keep_alive": -1}
        return httpx.Response(status, json={"done": True})
    client = httpx.Client(transport=httpx.MockTransport(handle))
    def create_client(**kwargs):
        assert kwargs["timeout"] == 600
        return client
    monkeypatch.setattr("docker_start.httpx.Client", create_client)
    if status == 200:
        warm_ollama(OLLAMA_URL, "test-model")
    else:
        with pytest.raises(httpx.HTTPStatusError):
            warm_ollama(OLLAMA_URL, "test-model")
