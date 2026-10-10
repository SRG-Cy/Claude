"""Plain Letter: turn confusing letters, terms and data requests into plain language.

Runs an open-weight model through Hugging Face Inference Providers, so no AI runs
on your own machine. Without an HF_TOKEN the app runs in demo mode with sample answers.
"""

import json
import os
import re
from datetime import date

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from huggingface_hub import InferenceClient

import demo
import prompts

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN", "").strip()
HF_MODEL = os.getenv("HF_MODEL", "Qwen/Qwen2.5-72B-Instruct")
MAX_CHARS = 30_000
LANGUAGES = [
    "English", "Hindi", "Malayalam", "Tamil", "Telugu", "Kannada", "Bengali",
    "Marathi", "Gujarati", "Punjabi", "Urdu", "Spanish", "French", "Arabic",
    "Portuguese", "Chinese (Simplified)",
]

app = Flask(__name__)
client = InferenceClient(api_key=HF_TOKEN) if HF_TOKEN else None


class ModelError(Exception):
    pass


def parse_json(text):
    """Pull the first JSON object out of a model reply, tolerating code fences."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


def ask_model(system, user, max_tokens=3000):
    """Call the open-weight model and return parsed JSON, retrying once on bad JSON."""
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    last_error = None
    for _ in range(2):
        try:
            out = client.chat_completion(
                messages, model=HF_MODEL, max_tokens=max_tokens, temperature=0.2
            )
        except Exception as exc:  # network, auth, rate limit, model unavailable
            raise ModelError(f"The AI service could not be reached: {exc}") from exc
        content = out.choices[0].message.content or ""
        try:
            return parse_json(content)
        except json.JSONDecodeError as exc:
            last_error = exc
            messages += [
                {"role": "assistant", "content": content},
                {"role": "user", "content": "That was not valid JSON. Reply with only the JSON object."},
            ]
    raise ModelError(f"The AI returned an unreadable answer ({last_error}). Please try again.")


def system_prompt(mode_prompt, language, **extra):
    rules = prompts.BASE_RULES.format(language=language, today=date.today().isoformat())
    return rules + "\n\n" + mode_prompt.format(**extra)


def read_input():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    language = data.get("language") if data.get("language") in LANGUAGES else "English"
    if not text:
        return data, None, language, "Please paste some text first."
    if len(text) > MAX_CHARS:
        return data, None, language, (
            f"That text is {len(text):,} characters. The limit is {MAX_CHARS:,}. "
            "Paste the most important part, or split it into two."
        )
    return data, text, language, None


@app.get("/")
def index():
    return render_template(
        "index.html", languages=LANGUAGES, demo_mode=client is None, model=HF_MODEL
    )


@app.post("/api/analyze")
def analyze():
    data, text, language, error = read_input()
    mode = data.get("mode")
    if mode not in prompts.MODES:
        error = "Unknown mode."
    if error:
        return jsonify(error=error), 400
    if client is None:
        return jsonify(result=demo.analysis(mode), demo=True)
    try:
        result = ask_model(system_prompt(prompts.MODES[mode], language), text)
    except ModelError as exc:
        return jsonify(error=str(exc)), 502
    return jsonify(result=result, demo=False)


@app.post("/api/reply")
def reply():
    data, text, language, error = read_input()
    if error:
        return jsonify(error=error), 400
    reply_type = (data.get("reply_type") or "General reply")[:100]
    name = (data.get("name") or "[your name]")[:80]
    if client is None:
        return jsonify(result=demo.reply(reply_type, name), demo=True)
    try:
        result = ask_model(
            system_prompt(prompts.REPLY, language, reply_type=reply_type, name=name),
            text,
            max_tokens=1200,
        )
    except ModelError as exc:
        return jsonify(error=str(exc)), 502
    return jsonify(result=result, demo=False)


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))
