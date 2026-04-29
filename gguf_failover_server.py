"""
GGUF FAILOVER SERVER - Ollama Uyumlu Yerel API
================================================
Ollama cokerse bu sunucu devreye girer.
Kurul_Modelleri/ dizinindeki GGUF dosyalarini llama-cpp-python ile yukler.
Ollama API'si ile uyumlu /api/generate ve /api/chat endpoint'leri saglar.
Kim yapti: Antigravity AI | Tarih: 2026-04-26
================================================
"""

import os
import sys
import json
import time
import glob
from http.server import HTTPServer, BaseHTTPRequestHandler

from llama_cpp import Llama

# -- YAPILANDIRMA --
KURUL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Kurul_Modelleri")
FAILOVER_PORT = 11435
DEFAULT_MODEL = "03_Phi3-Mini"
N_CTX = 2048
N_GPU_LAYERS = 0  # CPU-only failover

loaded_models = {}
active_model_name = None


def get_gguf_path(model_name):
    for dirn in os.listdir(KURUL_DIR):
        dirpath = os.path.join(KURUL_DIR, dirn)
        if not os.path.isdir(dirpath):
            continue
        if model_name.lower() in dirn.lower():
            gguf_files = glob.glob(os.path.join(dirpath, "*.gguf"))
            if gguf_files:
                return gguf_files[0]
    fallback = os.path.join(KURUL_DIR, DEFAULT_MODEL)
    gguf_files = glob.glob(os.path.join(fallback, "*.gguf"))
    return gguf_files[0] if gguf_files else None


def load_model(model_name):
    global active_model_name
    if model_name in loaded_models:
        active_model_name = model_name
        return loaded_models[model_name]

    gguf_path = get_gguf_path(model_name)
    if not gguf_path:
        raise FileNotFoundError(f"GGUF bulunamadi: {model_name}")

    print(f"[FAILOVER] Model yukleniyor: {gguf_path}")
    start = time.time()
    model = Llama(model_path=gguf_path, n_ctx=N_CTX, n_gpu_layers=N_GPU_LAYERS, verbose=False)
    elapsed = time.time() - start
    print(f"[FAILOVER] Model yuklendi: {model_name} ({elapsed:.1f}s)")

    loaded_models[model_name] = model
    active_model_name = model_name
    return model


def list_available_models():
    models = []
    for dirn in sorted(os.listdir(KURUL_DIR)):
        dirpath = os.path.join(KURUL_DIR, dirn)
        if not os.path.isdir(dirpath):
            continue
        gguf_files = glob.glob(os.path.join(dirpath, "*.gguf"))
        for gf in gguf_files:
            size = os.path.getsize(gf)
            models.append({
                "name": dirn,
                "model": dirn,
                "size": size,
                "details": {"family": "gguf-failover", "parameter_size": f"{size / 1e9:.1f}B", "quantization_level": "Q4_K_M"},
            })
    return models


class OllamaCompatHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[FAILOVER-API] {args[0]}")

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        if self.path == "/api/tags":
            self._send_json({"models": list_available_models()})
        elif self.path == "/":
            self._send_json({"status": "FAILOVER_AKTIF", "port": FAILOVER_PORT, "model_sayisi": len(list_available_models())})
        else:
            self._send_json({"error": "Bilinmeyen endpoint"}, 404)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json({"error": "Gecersiz JSON"}, 400)
            return

        if self.path == "/api/generate":
            self._handle_generate(data)
        elif self.path == "/api/chat":
            self._handle_chat(data)
        else:
            self._send_json({"error": "Bilinmeyen endpoint"}, 404)

    def _handle_generate(self, data):
        model_name = data.get("model", DEFAULT_MODEL)
        prompt = data.get("prompt", "")
        try:
            model = load_model(model_name)
            result = model(prompt, max_tokens=data.get("max_tokens", 512), temperature=data.get("temperature", 0.7))
            response_text = result["choices"][0]["text"]
            self._send_json({"model": model_name, "response": response_text, "done": True, "failover": True})
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _handle_chat(self, data):
        model_name = data.get("model", DEFAULT_MODEL)
        messages = data.get("messages", [])
        prompt = ""
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt += f"System: {content}\n\n"
            elif role == "user":
                prompt += f"User: {content}\n\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n\n"
        prompt += "Assistant: "

        try:
            model = load_model(model_name)
            result = model(prompt, max_tokens=data.get("max_tokens", 512), temperature=data.get("temperature", 0.7))
            response_text = result["choices"][0]["text"]
            self._send_json({
                "model": model_name,
                "message": {"role": "assistant", "content": response_text},
                "done": True,
                "failover": True,
            })
        except Exception as e:
            self._send_json({"error": str(e)}, 500)


def main():
    print("=" * 60)
    print("  GGUF FAILOVER SERVER")
    print(f"  Port: {FAILOVER_PORT}")
    print(f"  Model dizini: {KURUL_DIR}")
    print(f"  Mevcut model: {len(list_available_models())}")
    print("=" * 60)

    # Baslangicta default modeli onceden yukle
    try:
        load_model(DEFAULT_MODEL)
    except Exception as e:
        print(f"[UYARI] Default model yuklenemedi: {e}")

    server = HTTPServer(("0.0.0.0", FAILOVER_PORT), OllamaCompatHandler)
    print(f"[FAILOVER] Sunucu dinliyor: http://localhost:{FAILOVER_PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
