"""
OLLAMA FAILOVER WATCHDOG
========================
Her 5 saniyede Ollama'yi kontrol eder.
Cevaplamazsa gguf_failover_server.py'yi baslatir.
Ollama geri gelirse failover'i durdurur.
Kim yapti: Antigravity AI | Tarih: 2026-04-26
========================
"""

import os
import sys
import time
import subprocess
import urllib.request
import json
import signal

OLLAMA_URL = "http://localhost:11434"
FAILOVER_URL = "http://localhost:11435"
CHECK_INTERVAL = 5  # saniye
FAILOVER_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gguf_failover_server.py")

failover_process = None
ollama_was_down = False


def check_endpoint(url, timeout=3):
    try:
        req = urllib.request.Request(url, method="GET")
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.status == 200
    except Exception:
        return False


def start_failover():
    global failover_process
    if failover_process and failover_process.poll() is None:
        print("[WATCHDOG] Failover zaten calisiyor")
        return
    print("[WATCHDOG] >>> OLLAMA COKTU — FAILOVER BASLATILIYOR <<<")
    failover_process = subprocess.Popen(
        [sys.executable, FAILOVER_SCRIPT],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    # Failover'in hazir olmasini bekle
    for _ in range(30):
        time.sleep(1)
        if check_endpoint(FAILOVER_URL):
            print("[WATCHDOG] FAILOVER HAZIR — yerel GGUF devrede!")
            return
    print("[WATCHDOG] UYARI: Failover baslatildi ama henuz hazir degil")


def stop_failover():
    global failover_process
    if failover_process and failover_process.poll() is None:
        print("[WATCHDOG] Ollama geri geldi — failover durduruluyor")
        if os.name == "nt":
            failover_process.terminate()
        else:
            os.kill(failover_process.pid, signal.SIGTERM)
        failover_process.wait(timeout=10)
        failover_process = None
        print("[WATCHDOG] Failover durduruldu — Ollama ana hat")


def main():
    global ollama_was_down

    print("=" * 60)
    print("  OLLAMA FAILOVER WATCHDOG")
    print(f"  Ollama: {OLLAMA_URL}")
    print(f"  Failover: {FAILOVER_URL}")
    print(f"  Kontrol araligi: {CHECK_INTERVAL}s")
    print("=" * 60)

    while True:
        ollama_ok = check_endpoint(OLLAMA_URL)
        failover_ok = check_endpoint(FAILOVER_URL)

        if ollama_ok:
            if ollama_was_down:
                print(f"[WATCHDOG] [{time.strftime('%H:%M:%S')}] Ollama GERI GELDI")
                stop_failover()
                ollama_was_down = False
            else:
                # Her 60 saniyede bir durum raporu
                if int(time.time()) % 60 < CHECK_INTERVAL:
                    print(f"[WATCHDOG] [{time.strftime('%H:%M:%S')}] Ollama: OK | Failover: {'HAZIR' if failover_ok else 'KAPALI'}")
        else:
            if not ollama_was_down:
                print(f"[WATCHDOG] [{time.strftime('%H:%M:%S')}] !!! OLLAMA YANIT VERMIYOR !!!")
                ollama_was_down = True
                start_failover()
            else:
                if int(time.time()) % 30 < CHECK_INTERVAL:
                    print(f"[WATCHDOG] [{time.strftime('%H:%M:%S')}] Ollama: CEVRIMDISI | Failover: {'AKTIF' if failover_ok else 'HAZIRLANIYOR'}")

        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[WATCHDOG] Durduruldu")
        stop_failover()
