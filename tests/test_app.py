import json
from types import SimpleNamespace

import pytest

import app as plain


def reply(content):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


class FakeClient:
    def __init__(self, *contents):
        self.contents = list(contents)
        self.calls = []

    def chat_completion(self, messages, **kwargs):
        self.calls.append(messages)
        item = self.contents.pop(0)
        if isinstance(item, Exception):
            raise item
        return reply(item)


@pytest.fixture
def client():
    return plain.app.test_client()


def test_parse_json_handles_fences_and_chatter():
    assert plain.parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert plain.parse_json('Sure! Here it is: {"a": {"b": 2}} Hope it helps') == {"a": {"b": 2}}


def test_demo_mode_returns_sample_for_each_mode(client, monkeypatch):
    monkeypatch.setattr(plain, "client", None)
    for mode in ("letter", "terms", "asks"):
        data = client.post("/api/analyze", json={"mode": mode, "text": "hi"}).get_json()
        assert data["demo"] is True and data["result"]["title"]


def test_rejects_empty_long_and_unknown_mode(client):
    assert client.post("/api/analyze", json={"mode": "letter", "text": " "}).status_code == 400
    long = "x" * (plain.MAX_CHARS + 1)
    assert client.post("/api/analyze", json={"mode": "letter", "text": long}).status_code == 400
    assert client.post("/api/analyze", json={"mode": "nope", "text": "hi"}).status_code == 400


def test_model_retries_once_on_bad_json(client, monkeypatch):
    fake = FakeClient("not json at all", json.dumps({"title": "Bill", "summary": "Pay it"}))
    monkeypatch.setattr(plain, "client", fake)
    data = client.post("/api/analyze", json={"mode": "letter", "text": "hi", "language": "Hindi"}).get_json()
    assert data == {"demo": False, "result": {"title": "Bill", "summary": "Pay it"}}
    assert len(fake.calls) == 2
    assert "Hindi" in fake.calls[0][0]["content"]


def test_model_error_becomes_502(client, monkeypatch):
    monkeypatch.setattr(plain, "client", FakeClient(RuntimeError("rate limited")))
    res = client.post("/api/reply", json={"text": "hi", "reply_type": "Ask for more time"})
    assert res.status_code == 502 and "rate limited" in res.get_json()["error"]


def test_unknown_language_falls_back_to_english(client, monkeypatch):
    fake = FakeClient('{"subject": "s", "body": "b"}')
    monkeypatch.setattr(plain, "client", fake)
    client.post("/api/reply", json={"text": "hi", "language": "Klingon"})
    assert "Write all other text values in English" in fake.calls[0][0]["content"]
