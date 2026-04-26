from pathlib import Path
import importlib.util
import threading
import wave
import json

results = {}

assistant_path = Path(r"C:\Users\Esisya\Desktop\Global_Turkce_Ses_Asistani\vscode_turkce_ses_asistani.py")
log_dir = Path(r"C:\Users\Esisya\Desktop\Global_Turkce_Ses_Asistani\logs")
log_dir.mkdir(parents=True, exist_ok=True)
mic_out = log_dir / "canli_test_mic_2026-04-26.wav"
tts_out = log_dir / "canli_test_tts_2026-04-26.mp3"

spec = importlib.util.spec_from_file_location("desktop_assistant_module", assistant_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
results["assistant_import"] = "PASS"

# Real TTS playback + explicit TTS file generation
app = module.VoiceAssistantApp.__new__(module.VoiceAssistantApp)
app.tts_lock = threading.Lock()
app.speaking = False
app.ui_language = "tr"
app.voice_gender = "male"
module.VoiceAssistantApp.speak_text(app, "Canlı test tamam. Masaüstü ses asistanı çalışıyor.")
results["tts_playback"] = "PASS"

import asyncio
from edge_tts import Communicate

async def build_tts_file() -> None:
    communicator = Communicate("Canlı test kaydı. Masaüstü ses asistanı çalışıyor.", "tr-TR-AhmetNeural")
    await communicator.save(str(tts_out))

asyncio.run(build_tts_file())
results["tts_file"] = str(tts_out)
results["tts_file_exists"] = tts_out.exists()
results["tts_file_size"] = tts_out.stat().st_size if tts_out.exists() else 0

import sounddevice as sd
apis = sd.query_hostapis()
devices = sd.query_devices()

candidates = []
for idx, d in enumerate(devices):
    if int(d.get("max_input_channels", 0)) <= 0:
        continue
    api_name = apis[d["hostapi"]]["name"]
    candidates.append((idx, d["name"], api_name, int(d.get("default_samplerate", 44100))))

results["mic_candidate_count"] = len(candidates)

mic_ok = False
trials = []
for idx, name, api_name, default_rate in candidates:
    rates = [default_rate, 44100, 48000, 16000]
    seen = set()
    for r in rates:
        if r in seen:
            continue
        seen.add(r)
        trial = {"device": idx, "name": name, "api": api_name, "rate": r}
        try:
            duration = 2.0
            frames = sd.rec(int(duration * r), samplerate=r, channels=1, dtype="int16", device=idx)
            sd.wait()
            with wave.open(str(mic_out), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(r)
                wf.writeframes(frames.tobytes())
            trial["result"] = "PASS"
            trials.append(trial)
            results["mic_record"] = "PASS"
            results["mic_selected"] = trial
            mic_ok = True
            break
        except Exception as exc:
            trial["result"] = "FAIL"
            trial["error"] = str(exc)
            trials.append(trial)
    if mic_ok:
        break

if not mic_ok:
    results["mic_record"] = "FAIL"

results["mic_trials"] = trials
results["mic_file"] = str(mic_out)
results["mic_file_exists"] = mic_out.exists()
results["mic_file_size"] = mic_out.stat().st_size if mic_out.exists() else 0

print(json.dumps(results, ensure_ascii=False, indent=2))
