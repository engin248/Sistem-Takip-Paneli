import asyncio
import audioop
import ctypes
import json
import os
import queue
import tempfile
import threading
import time
import urllib.request
import zipfile
from ctypes import wintypes
from pathlib import Path
import tkinter as tk
from tkinter import ttk

import keyboard
import pyperclip
import pygame
import sounddevice as sd
from deep_translator import GoogleTranslator
from edge_tts import Communicate
from langdetect import DetectorFactory, LangDetectException, detect
from vosk import KaldiRecognizer, Model

APP_DIR = Path(__file__).resolve().parent
MODELS_DIR = APP_DIR / "models"
LOGS_DIR = APP_DIR / "logs"
AUDIT_LOG_FILE = LOGS_DIR / "global_ses_asistani_audit.jsonl"
AUDIO_CACHE_DIR = LOGS_DIR / "tts_cache"
SAMPLE_RATE = 16000
WAKE_WORDS = ["asistan", "hey asistan", "tamam asistan", "مساعد", "يا مساعد"]
VOICE_THRESHOLD = 550
SILENCE_SECONDS = 1.1
CONFIDENCE_THRESHOLD = 0.72
WM_SETTEXT = 0x000C
SUPPORTED_DIRECT_WRITE_CLASSES = {
    "edit",
    "richedit20w",
    "richedit50w",
    "richeditd2dpt",
}
DEFAULT_UI_LANGUAGE = "tr"
DEFAULT_SOURCE_LANGUAGE = "tr"
DEFAULT_TARGET_LANGUAGE = "tr"
DEFAULT_VOICE_GENDER = "male"
VOICE_OPTIONS = {
    "tr": {"male": "tr-TR-AhmetNeural", "female": "tr-TR-EmelNeural"},
    "ar": {"male": "ar-SA-HamedNeural", "female": "ar-SA-ZariyahNeural"},
    "en": {"male": "en-US-GuyNeural", "female": "en-US-JennyNeural"},
    "de": {"male": "de-DE-ConradNeural", "female": "de-DE-KatjaNeural"},
    "fr": {"male": "fr-FR-HenriNeural", "female": "fr-FR-DeniseNeural"},
    "es": {"male": "es-ES-AlvaroNeural", "female": "es-ES-ElviraNeural"},
    "it": {"male": "it-IT-DiegoNeural", "female": "it-IT-ElsaNeural"},
    "ru": {"male": "ru-RU-DmitryNeural", "female": "ru-RU-SvetlanaNeural"},
    "fa": {"male": "fa-IR-FaridNeural", "female": "fa-IR-DilaraNeural"},
    "ur": {"male": "ur-PK-AsadNeural", "female": "ur-PK-UzmaNeural"},
}
STT_MODELS = {
    "tr": {
        "name": "vosk-model-small-tr-0.3",
        "url": "https://alphacephei.com/vosk/models/vosk-model-small-tr-0.3.zip",
        "script": "latin",
    },
    "ar": {
        "name": "vosk-model-ar-mgb2-0.4",
        "url": "https://alphacephei.com/vosk/models/vosk-model-ar-mgb2-0.4.zip",
        "script": "arabic",
    },
}
LANGUAGE_ALIASES = {
    "türkçe": ("tr", "Türkçe"),
    "turkce": ("tr", "Türkçe"),
    "tr": ("tr", "Türkçe"),
    "arapça": ("ar", "Arapça"),
    "arapca": ("ar", "Arapça"),
    "ar": ("ar", "Arapça"),
    "ingilizce": ("en", "İngilizce"),
    "english": ("en", "İngilizce"),
    "en": ("en", "İngilizce"),
    "almanca": ("de", "Almanca"),
    "deutsch": ("de", "Almanca"),
    "de": ("de", "Almanca"),
    "fransızca": ("fr", "Fransızca"),
    "fr": ("fr", "Fransızca"),
    "ispanyolca": ("es", "İspanyolca"),
    "es": ("es", "İspanyolca"),
    "italyanca": ("it", "İtalyanca"),
    "it": ("it", "İtalyanca"),
    "rusça": ("ru", "Rusça"),
    "rusca": ("ru", "Rusça"),
    "ru": ("ru", "Rusça"),
    "farsça": ("fa", "Farsça"),
    "farsca": ("fa", "Farsça"),
    "fa": ("fa", "Farsça"),
    "urduca": ("ur", "Urduca"),
    "urdu": ("ur", "Urduca"),
    "ur": ("ur", "Urduca"),
}
DEFAULT_PROFILE = {
    "name": "Genel",
    "keywords": [],
    "send_keys": ["enter"],
    "auto_send": True,
    "platforms": ["desktop", "web", "tablet", "mobile"],
    "language_profiles": {
        "default": {"source_language": "tr", "target_language": "tr", "ui_language": "tr"},
        "tr": {"source_language": "tr", "target_language": "tr", "ui_language": "tr"},
        "ar": {"source_language": "ar", "target_language": "ar", "ui_language": "ar"},
    },
}
PROFILES_FILE = APP_DIR / "global_ses_asistani_profiles.json"
DetectorFactory.seed = 0
APP_PROFILES = [
    {
        "name": "WhatsApp Web",
        "keywords": ["whatsapp"],
        "send_keys": ["enter"],
        "auto_send": True,
    },
    {
        "name": "Telegram",
        "keywords": ["telegram"],
        "send_keys": ["enter"],
        "auto_send": True,
    },
    {
        "name": "Local Panel",
        "keywords": ["localhost", "127.0.0.1", "sistem-takip-paneli", "local panel", "stp_local"],
        "send_keys": ["enter"],
        "auto_send": True,
    },
    {
        "name": "VS Code",
        "keywords": ["visual studio code", "vs code", "vscode"],
        "send_keys": ["enter"],
        "auto_send": True,
    },
    {
        "name": "Tarayıcı",
        "keywords": ["chrome", "edge", "firefox", "opera", "browser"],
        "send_keys": ["enter"],
        "auto_send": True,
    },
]


class VoiceAssistantApp:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Global Türkçe Ses Asistanı")
        self.root.geometry("760x900")
        self.root.minsize(720, 760)
        self.root.configure(bg="#0f172a")
        self.root.attributes("-topmost", True)

        self.events: queue.Queue[tuple[str, str]] = queue.Queue()
        self.models: dict[str, Model] = {}
        self.model_lock = threading.Lock()
        self.profile_load_issues: list[str] = []
        self.app_profiles = self.load_profiles()
        self.recording = False
        self.transcribing = False
        self.auto_send = True
        self.audio_chunks: list[bytes] = []
        self.stream: sd.RawInputStream | None = None
        self.assistant_stream: sd.RawInputStream | None = None
        self.assistant_sample_rate = SAMPLE_RATE
        self.assistant_audio_queue: queue.Queue[bytes] = queue.Queue()
        self.last_transcript = ""
        self.last_spoken = ""
        self.last_clipboard_seen = ""
        self.clipboard_monitor_enabled = True
        self.auto_read_after_copy = True
        self.last_active_window = ""
        self.current_platform = "desktop"
        self.handsfree_enabled = True
        self.awaiting_followup = False
        self.speaking = False
        self.current_profile = DEFAULT_PROFILE.copy()
        self.pending_confirmation_text = ""
        self.pending_confirmation_confidence = 0.0
        self.awaiting_confirmation = False
        self.verify_before_send = True
        self.suppress_clipboard_until = 0.0
        self.tts_lock = threading.Lock()
        self.source_language = DEFAULT_SOURCE_LANGUAGE
        self.target_language = DEFAULT_TARGET_LANGUAGE
        self.ui_language = DEFAULT_UI_LANGUAGE
        self.voice_gender = DEFAULT_VOICE_GENDER
        self.translation_enabled = False
        self.last_translation = ""
        self.auto_detect_input_language = True
        self.detected_input_language = DEFAULT_SOURCE_LANGUAGE
        self.pending_target_window = ""

        LOGS_DIR.mkdir(parents=True, exist_ok=True)

        self._build_ui()
        self._register_hotkeys()
        self._push("status", "Hazır. Bilgisayardaki herhangi bir sohbet veya yazı kutusunu seçip konuşmaya başlayabilirsin.")
        self._push("hotkeys", self._hotkey_text())
        self._push("model", "Model ilk kullanımda otomatik indirilecek.")
        self._push("autosend", "açık")
        self._push("clipboard", "açık")
        self._push("assistant", "açık")
        self._push("profile", "Genel")
        for issue in self.profile_load_issues:
            self._push("status", issue)
        self._push("verify", "açık")
        self._push("translation", "kapalı")
        self._push("input-detect", "açık")
        self._push("languages", self.format_language_status())
        self._push("voice", self.format_voice_status())
        self.root.after(120, self._process_events)
        self.root.after(900, self._clipboard_loop)
        self.root.after(1200, self._window_loop)
        self._thread(self.start_handsfree_listener)
        self.root.protocol("WM_DELETE_WINDOW", self.shutdown)

    def _build_ui(self) -> None:
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#0f172a")
        style.configure("Card.TFrame", background="#111827")
        style.configure("TLabel", background="#111827", foreground="#e5e7eb", font=("Segoe UI", 11))
        style.configure("Title.TLabel", font=("Segoe UI", 18, "bold"), foreground="#f8fafc")
        style.configure("Status.TLabel", font=("Segoe UI", 12, "bold"), foreground="#93c5fd")
        style.configure("TButton", font=("Segoe UI", 11, "bold"), padding=10)
        style.map("TButton", background=[("active", "#2563eb")])

        outer = ttk.Frame(self.root, style="TFrame", padding=18)
        outer.pack(fill="both", expand=True)

        header = ttk.Frame(outer, style="Card.TFrame", padding=18)
        header.pack(fill="x")
        ttk.Label(header, text="Tam Entegre Global Türkçe Ses Asistanı", style="Title.TLabel").pack(anchor="w")
        ttk.Label(
            header,
            text="Komutu Türkçe söyle, aktif penceredeki herhangi bir sohbet veya yazı kutusuna otomatik yazsın. Seçili cevabı tek kısayolla Türkçe sesle okusun.",
            wraplength=650,
        ).pack(anchor="w", pady=(8, 0))

        status_card = ttk.Frame(outer, style="Card.TFrame", padding=18)
        status_card.pack(fill="x", pady=(14, 0))
        self.status_var = tk.StringVar(value="Durum: başlatılıyor")
        self.model_var = tk.StringVar(value="Model: beklemede")
        self.hotkeys_var = tk.StringVar(value=self._hotkey_text())
        self.auto_send_var = tk.StringVar(value="Oto gönder: açık")
        self.clipboard_var = tk.StringVar(value="Oto oku: açık")
        self.window_var = tk.StringVar(value="Aktif pencere: bekleniyor")
        self.assistant_var = tk.StringVar(value="Eller serbest asistan: açık")
        self.profile_var = tk.StringVar(value="Profil: Genel")
        self.verify_var = tk.StringVar(value="Doğrulama: açık")
        self.translation_var = tk.StringVar(value="Çeviri: kapalı")
        self.languages_var = tk.StringVar(value=f"Diller: giriş Türkçe | hedef Türkçe")
        self.voice_var = tk.StringVar(value="Ses: erkek | Türkçe")
        self.input_detect_var = tk.StringVar(value="Giriş dil algılama: açık")
        ttk.Label(status_card, textvariable=self.status_var, style="Status.TLabel").pack(anchor="w")
        ttk.Label(status_card, textvariable=self.model_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.hotkeys_var, wraplength=650).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.auto_send_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.clipboard_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.assistant_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.profile_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.verify_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.translation_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.languages_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.voice_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.input_detect_var).pack(anchor="w", pady=(8, 0))
        ttk.Label(status_card, textvariable=self.window_var, wraplength=650).pack(anchor="w", pady=(8, 0))

        controls = ttk.Frame(outer, style="Card.TFrame", padding=18)
        controls.pack(fill="x", pady=(14, 0))
        ttk.Button(controls, text="Kaydı Başlat / Bitir", command=self.toggle_recording).grid(row=0, column=0, padx=(0, 10), pady=5, sticky="ew")
        ttk.Button(controls, text="Seçili Metni Oku", command=self.read_selected_text).grid(row=0, column=1, padx=(0, 10), pady=5, sticky="ew")
        ttk.Button(controls, text="Oto Gönder Aç/Kapat", command=self.toggle_auto_send).grid(row=0, column=2, padx=(0, 10), pady=5, sticky="ew")
        ttk.Button(controls, text="Oto Okumayı Aç/Kapat", command=self.toggle_auto_read).grid(row=0, column=3, pady=5, sticky="ew")
        ttk.Button(controls, text="Doğrulamayı Aç/Kapat", command=self.toggle_verify_before_send).grid(row=1, column=0, columnspan=2, padx=(0, 10), pady=(8, 0), sticky="ew")
        ttk.Button(controls, text="Asistan Aç/Kapat", command=self.toggle_handsfree).grid(row=1, column=2, columnspan=2, pady=(8, 0), sticky="ew")
        ttk.Button(controls, text="Çeviriyi Aç/Kapat", command=self.toggle_translation).grid(row=2, column=0, columnspan=2, padx=(0, 10), pady=(8, 0), sticky="ew")
        ttk.Button(controls, text="Seçili Metni Çevir", command=self.translate_selected_text).grid(row=2, column=2, columnspan=2, pady=(8, 0), sticky="ew")
        ttk.Button(controls, text="Dil Algılamayı Aç/Kapat", command=self.toggle_input_language_detection).grid(row=3, column=0, columnspan=4, pady=(8, 0), sticky="ew")
        ttk.Button(controls, text="Ses Testi (Görsel)", command=self.run_visible_voice_test).grid(row=4, column=0, columnspan=4, pady=(8, 0), sticky="ew")
        controls.columnconfigure(0, weight=1)
        controls.columnconfigure(1, weight=1)
        controls.columnconfigure(2, weight=1)
        controls.columnconfigure(3, weight=1)

        transcript_card = ttk.Frame(outer, style="Card.TFrame", padding=18)
        transcript_card.pack(fill="both", expand=True, pady=(14, 0))
        ttk.Label(transcript_card, text="Son sesli komut").pack(anchor="w")
        self.transcript_box = tk.Text(transcript_card, height=8, wrap="word", bg="#020617", fg="#e5e7eb", insertbackground="#e5e7eb", font=("Consolas", 11))
        self.transcript_box.pack(fill="both", expand=True, pady=(8, 14))
        ttk.Label(transcript_card, text="Son okunan cevap").pack(anchor="w")
        self.response_box = tk.Text(transcript_card, height=8, wrap="word", bg="#020617", fg="#e5e7eb", insertbackground="#e5e7eb", font=("Consolas", 11))
        self.response_box.pack(fill="both", expand=True, pady=(8, 0))

    def _hotkey_text(self) -> str:
        return "Kısayollar: Zorunlu değil. İstersen Ctrl+Alt+Boşluk = konuş/yaz | Ctrl+Alt+R = seçili metni oku | Ctrl+Alt+S = oto gönder | Ctrl+Alt+W = oto oku | Ctrl+Alt+D = doğrulama | Ctrl+Alt+Q = çıkış"

    def _register_hotkeys(self) -> None:
        keyboard.add_hotkey("ctrl+alt+space", lambda: self._thread(self.toggle_recording))
        keyboard.add_hotkey("ctrl+alt+r", lambda: self._thread(self.read_selected_text))
        keyboard.add_hotkey("ctrl+alt+s", lambda: self._thread(self.toggle_auto_send))
        keyboard.add_hotkey("ctrl+alt+w", lambda: self._thread(self.toggle_auto_read))
        keyboard.add_hotkey("ctrl+alt+d", lambda: self._thread(self.toggle_verify_before_send))
        keyboard.add_hotkey("ctrl+alt+q", lambda: self.root.after(0, self.shutdown))

    def _push(self, kind: str, value: str) -> None:
        self.events.put((kind, value))

    def _process_events(self) -> None:
        while not self.events.empty():
            kind, value = self.events.get()
            if kind == "status":
                self.status_var.set(f"Durum: {value}")
            elif kind == "model":
                self.model_var.set(f"Model: {value}")
            elif kind == "hotkeys":
                self.hotkeys_var.set(value)
            elif kind == "transcript":
                self.transcript_box.delete("1.0", tk.END)
                self.transcript_box.insert(tk.END, value)
            elif kind == "response":
                self.response_box.delete("1.0", tk.END)
                self.response_box.insert(tk.END, value)
            elif kind == "autosend":
                self.auto_send_var.set(f"Oto gönder: {value}")
            elif kind == "clipboard":
                self.clipboard_var.set(f"Oto oku: {value}")
            elif kind == "assistant":
                self.assistant_var.set(f"Eller serbest asistan: {value}")
            elif kind == "profile":
                self.profile_var.set(f"Profil: {value}")
            elif kind == "verify":
                self.verify_var.set(f"Doğrulama: {value}")
            elif kind == "translation":
                self.translation_var.set(f"Çeviri: {value}")
            elif kind == "languages":
                self.languages_var.set(f"Diller: {value}")
            elif kind == "voice":
                self.voice_var.set(f"Ses: {value}")
            elif kind == "input-detect":
                self.input_detect_var.set(f"Giriş dil algılama: {value}")
            elif kind == "window":
                self.window_var.set(f"Aktif pencere: {value}")
        self.root.after(120, self._process_events)

    def format_language_status(self) -> str:
        source_name = self.get_language_display_name(self.source_language)
        target_name = self.get_language_display_name(self.target_language)
        detected_name = self.get_language_display_name(self.detected_input_language)
        detection_label = f"algılanan {detected_name}" if self.auto_detect_input_language else f"sabit {source_name}"
        return f"giriş {source_name} | hedef {target_name} | {detection_label}"

    def load_profiles(self) -> list[dict]:
        if PROFILES_FILE.exists():
            try:
                with PROFILES_FILE.open("r", encoding="utf-8") as handle:
                    data = json.load(handle)
                profiles = data.get("profiles") if isinstance(data, dict) else data
                if isinstance(profiles, list) and profiles:
                    normalized_profiles: list[dict] = []
                    for index, profile in enumerate(profiles, start=1):
                        if not isinstance(profile, dict):
                            self.profile_load_issues.append(f"profil {index}: sözlük formatında değil, atlandı")
                            continue
                        missing_fields = self.get_missing_profile_fields(profile)
                        if missing_fields:
                            self.profile_load_issues.append(
                                f"profil {index} ({profile.get('name', 'adsız')}): eksik alanlar var -> {', '.join(missing_fields)}"
                            )
                        normalized_profiles.append(self.normalize_profile_record(profile))
                    if normalized_profiles:
                        return normalized_profiles
            except Exception:
                self.profile_load_issues.append("profil dosyası okunamadı, kod içi varsayılan profil listesi kullanılacak")
        return [self.normalize_profile_record(profile) for profile in APP_PROFILES]

    def get_missing_profile_fields(self, profile: dict) -> list[str]:
        required_fields = ["name", "keywords", "send_keys", "auto_send", "platforms", "language_profiles"]
        missing = []
        for field in required_fields:
            value = profile.get(field)
            if value is None or value == "" or value == [] or value == {}:
                missing.append(field)
        return missing

    def normalize_profile_record(self, profile: dict) -> dict:
        merged = dict(profile or {})

        keywords = merged.get("keywords")
        if isinstance(keywords, str):
            keywords = [keywords]
        if isinstance(keywords, list):
            merged["keywords"] = [str(keyword).strip().lower() for keyword in keywords if str(keyword).strip()]

        send_keys = merged.get("send_keys")
        if isinstance(send_keys, str):
            send_keys = [send_keys]
        if isinstance(send_keys, list):
            merged["send_keys"] = [str(key).strip().lower() for key in send_keys if str(key).strip()]

        platforms = merged.get("platforms")
        if isinstance(platforms, str):
            platforms = [platforms]
        if isinstance(platforms, list):
            merged["platforms"] = [str(platform).strip().lower() for platform in platforms if str(platform).strip()]

        language_profiles = merged.get("language_profiles")
        if isinstance(language_profiles, dict):
            merged["language_profiles"] = language_profiles
        return merged

    def resolve_profile_runtime(self, profile: dict) -> dict:
        resolved = dict(DEFAULT_PROFILE)
        resolved.update(profile or {})
        if not resolved.get("name"):
            resolved["name"] = DEFAULT_PROFILE["name"]
            self.profile_load_issues.append("profil adı eksikti, Genel kullanıldı")
        if not resolved.get("keywords"):
            self.profile_load_issues.append(f"{resolved.get('name', 'Genel')}: anahtar kelime eksikti, genel eşleşme kullanılacak")
            resolved["keywords"] = []
        if not resolved.get("send_keys"):
            self.profile_load_issues.append(f"{resolved.get('name', 'Genel')}: gönderim tuşu eksikti, enter kullanılacak")
            resolved["send_keys"] = DEFAULT_PROFILE["send_keys"]
        if "auto_send" not in resolved:
            self.profile_load_issues.append(f"{resolved.get('name', 'Genel')}: auto_send eksikti, true varsayıldı")
            resolved["auto_send"] = DEFAULT_PROFILE["auto_send"]
        if not resolved.get("platforms"):
            self.profile_load_issues.append(f"{resolved.get('name', 'Genel')}: platform bilgisi eksikti, tüm platformlar kullanılacak")
            resolved["platforms"] = DEFAULT_PROFILE["platforms"]
        if not isinstance(resolved.get("language_profiles"), dict) or not resolved.get("language_profiles"):
            self.profile_load_issues.append(f"{resolved.get('name', 'Genel')}: dil profili eksikti, genel dil profili kullanılacak")
            resolved["language_profiles"] = DEFAULT_PROFILE["language_profiles"]
        return resolved

    def detect_window_platform(self, window_title: str) -> str:
        title = self.normalize_window_title(window_title)
        if not title or title == "bilinmiyor":
            return "desktop"
        browser_markers = (
            "chrome",
            "edge",
            "firefox",
            "opera",
            "brave",
            "browser",
            "web.whatsapp.com",
            "web.telegram.org",
            "localhost",
            "127.0.0.1",
            "http://",
            "https://",
            ".com",
            ".net",
            ".org",
        )
        if any(marker in title for marker in browser_markers):
            return "web"
        return "desktop"

    def profile_supports_platform(self, profile: dict, window_platform: str) -> bool:
        platforms = profile.get("platforms") or []
        if not platforms:
            return True
        normalized_platform = (window_platform or "desktop").strip().lower()
        return normalized_platform in {str(platform).strip().lower() for platform in platforms}

    def profile_match_score(self, profile: dict, window_title: str) -> int:
        title = self.normalize_window_title(window_title)
        score = 0
        for keyword in profile.get("keywords", []):
            normalized_keyword = str(keyword).strip().lower()
            if normalized_keyword and normalized_keyword in title:
                score = max(score, len(normalized_keyword))
        return score

    def format_voice_status(self) -> str:
        gender_text = "erkek" if self.voice_gender == "male" else "kadın"
        language_name = self.get_language_display_name(self.ui_language)
        return f"{gender_text} | {language_name}"

    def get_language_display_name(self, language_code: str) -> str:
        for code, display_name in LANGUAGE_ALIASES.values():
            if code == language_code:
                return display_name
        return language_code.upper()

    def resolve_language(self, text: str) -> tuple[str, str] | tuple[None, None]:
        normalized = (text or "").lower().strip()
        tokens = normalized.replace(",", " ").replace(".", " ").split()
        for alias, resolved in LANGUAGE_ALIASES.items():
            if alias in normalized and (" " in alias or alias in tokens):
                return resolved
        return None, None

    def update_language_and_voice_status(self) -> None:
        self._push("languages", self.format_language_status())
        self._push("voice", self.format_voice_status())

    def detect_language_from_text(self, text: str, fallback: str = DEFAULT_SOURCE_LANGUAGE) -> str:
        clean_text = (text or "").strip()
        if not clean_text:
            return fallback
        if any("\u0600" <= char <= "\u06FF" for char in clean_text):
            return "ar"
        try:
            detected = detect(clean_text)
            return detected if detected in VOICE_OPTIONS else fallback
        except LangDetectException:
            return fallback

    def score_transcription(self, language_code: str, text: str, confidence: float) -> float:
        clean_text = (text or "").strip()
        if not clean_text:
            return -1.0
        score = confidence
        if language_code == "ar" and any("\u0600" <= char <= "\u06FF" for char in clean_text):
            score += 0.35
        if language_code == "tr" and any(char in clean_text.lower() for char in "çğıöşü"):
            score += 0.2
        detected = self.detect_language_from_text(clean_text, fallback=language_code)
        if detected == language_code:
            score += 0.2
        return score

    def get_voice_name(self, language_code: str | None = None, gender: str | None = None) -> str:
        language_code = language_code or self.ui_language
        gender = gender or self.voice_gender
        voices = VOICE_OPTIONS.get(language_code) or VOICE_OPTIONS.get(DEFAULT_UI_LANGUAGE)
        return voices.get(gender, voices.get("male"))

    def translate_text(self, text: str, target_language: str, source_language: str = "auto") -> str:
        clean_text = (text or "").strip()
        if not clean_text:
            return ""
        if target_language == source_language:
            return clean_text
        try:
            translator = GoogleTranslator(source=source_language, target=target_language)
            return translator.translate(clean_text)
        except Exception as exc:
            self._push("status", f"çeviri hatası: {exc}")
            return clean_text

    def append_audit_log(self, event_type: str, **payload) -> None:
        record = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime()),
            "event": event_type,
            "active_window": self.last_active_window or self.get_active_window_title(),
            "profile": self.current_profile.get("name", "Genel"),
            "source_language": self.source_language,
            "target_language": self.target_language,
            "translation_enabled": self.translation_enabled,
        }
        record.update(payload)
        try:
            with AUDIT_LOG_FILE.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        except Exception:
            pass

    def normalize_window_title(self, title: str) -> str:
        return " ".join((title or "").lower().split())

    def get_focused_control_info(self) -> dict | None:
        class GUITHREADINFO(ctypes.Structure):
            _fields_ = [
                ("cbSize", wintypes.DWORD),
                ("flags", wintypes.DWORD),
                ("hwndActive", wintypes.HWND),
                ("hwndFocus", wintypes.HWND),
                ("hwndCapture", wintypes.HWND),
                ("hwndMenuOwner", wintypes.HWND),
                ("hwndMoveSize", wintypes.HWND),
                ("hwndCaret", wintypes.HWND),
                ("rcCaret", wintypes.RECT),
            ]

        try:
            user32 = ctypes.windll.user32
            foreground = user32.GetForegroundWindow()
            if not foreground:
                return None

            thread_id = user32.GetWindowThreadProcessId(foreground, None)
            gui_info = GUITHREADINFO(cbSize=ctypes.sizeof(GUITHREADINFO))
            if not user32.GetGUIThreadInfo(thread_id, ctypes.byref(gui_info)):
                return None

            focused_hwnd = gui_info.hwndFocus or gui_info.hwndActive or foreground
            if not focused_hwnd:
                return None

            class_buffer = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(focused_hwnd, class_buffer, 256)

            return {
                "hwnd": int(focused_hwnd),
                "class_name": class_buffer.value.strip(),
            }
        except Exception:
            return None

    def try_direct_write_to_focused_control(self, text: str) -> tuple[bool, str, dict | None]:
        info = self.get_focused_control_info()
        if not info:
            return False, "focused-control-not-found", None

        class_name = (info.get("class_name") or "").lower()
        if class_name not in SUPPORTED_DIRECT_WRITE_CLASSES:
            return False, f"unsupported-control:{class_name or 'unknown'}", info

        try:
            user32 = ctypes.windll.user32
            result = user32.SendMessageW(wintypes.HWND(info["hwnd"]), WM_SETTEXT, 0, text)
            return True, f"direct-write:{class_name}", {**info, "result": int(result)}
        except Exception as exc:
            return False, f"direct-write-error:{exc}", info

    def is_window_safe_for_send(self, expected_title: str, current_title: str) -> bool:
        expected = self.normalize_window_title(expected_title)
        current = self.normalize_window_title(current_title)
        if not expected or not current:
            return True
        if expected == current:
            return True

        expected_tokens = {token for token in expected.replace("-", " ").split() if len(token) > 2}
        current_tokens = {token for token in current.replace("-", " ").split() if len(token) > 2}
        if not expected_tokens or not current_tokens:
            return False

        overlap = len(expected_tokens & current_tokens)
        minimum_overlap = max(1, min(len(expected_tokens), len(current_tokens)) // 2)
        return overlap >= minimum_overlap

    def _list_input_devices(self) -> list[dict]:
        devices: list[dict] = []
        for index, info in enumerate(sd.query_devices()):
            if int(info.get("max_input_channels", 0)) <= 0:
                continue
            label = (info.get("name") or "").strip()
            devices.append({"index": index, "label": label})
        devices.sort(key=lambda item: (0 if "mikrofon" in item["label"].lower() else 1, item["index"]))
        return devices

    def _open_handsfree_stream(self) -> tuple[sd.RawInputStream, int]:
        rates_to_try = [SAMPLE_RATE, 44100, 48000]

        # Önce varsayılan cihaz
        for rate in rates_to_try:
            try:
                stream = sd.RawInputStream(
                    samplerate=rate,
                    blocksize=4000,
                    dtype="int16",
                    channels=1,
                    callback=self.handsfree_audio_callback,
                )
                return stream, rate
            except Exception:
                pass

        # Sonra listelenen giriş cihazları
        for device in self._list_input_devices():
            for rate in rates_to_try:
                try:
                    stream = sd.RawInputStream(
                        samplerate=rate,
                        blocksize=4000,
                        dtype="int16",
                        channels=1,
                        device=device["index"],
                        callback=self.handsfree_audio_callback,
                    )
                    self._push("status", f"mikrofon seçildi: {device['label']} @ {rate}Hz")
                    return stream, rate
                except Exception:
                    pass

        raise RuntimeError("uygun mikrofon başlatılamadı")

    def start_handsfree_listener(self) -> None:
        try:
            self.assistant_stream, self.assistant_sample_rate = self._open_handsfree_stream()
            self.assistant_stream.start()
            self._push("assistant", "açık")
            self._push("status", "eller serbest dinleme hazır. 'Asistan' diyerek komut verebilirsin")
            self.handsfree_loop()
        except Exception as exc:
            self._push("assistant", "başlatılamadı")
            self._push("status", f"eller serbest başlatma hatası: {exc}")

    def handsfree_audio_callback(self, indata, frames, time_info, status) -> None:
        if status:
            self._push("status", f"mikrofon uyarısı: {status}")
        chunk = bytes(indata)
        self.assistant_audio_queue.put(chunk)
        if self.recording:
            self.audio_chunks.append(chunk)

    def handsfree_loop(self) -> None:
        speech_buffer = bytearray()
        speech_started = False
        silence_duration = 0.0

        while True:
            try:
                chunk = self.assistant_audio_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            if not self.handsfree_enabled or self.speaking:
                speech_buffer.clear()
                speech_started = False
                silence_duration = 0.0
                continue

            rms = audioop.rms(chunk, 2)
            chunk_duration = len(chunk) / 2 / max(1, self.assistant_sample_rate)

            if rms >= VOICE_THRESHOLD:
                if not speech_started:
                    speech_started = True
                    speech_buffer = bytearray()
                speech_buffer.extend(chunk)
                silence_duration = 0.0
                continue

            if speech_started:
                speech_buffer.extend(chunk)
                silence_duration += chunk_duration
                if silence_duration >= SILENCE_SECONDS:
                    audio_data = bytes(speech_buffer)
                    speech_buffer.clear()
                    speech_started = False
                    silence_duration = 0.0
                    if len(audio_data) > 2000:
                        self._thread(self.handle_handsfree_segment, audio_data)

    def handle_handsfree_segment(self, audio_data: bytes) -> None:
        if self.transcribing or self.speaking:
            return
        self.transcribing = True
        try:
            text, confidence = self.transcribe_audio(audio_data)
            if not text:
                return
            self._push("transcript", text)
            normalized = text.lower().strip()

            if self.awaiting_confirmation:
                self.handle_confirmation_response(normalized)
                return

            if self.awaiting_followup:
                self.awaiting_followup = False
                self.execute_voice_command_or_type(text, confidence)
                return

            wake_word = self.extract_wake_word(normalized)
            if not wake_word:
                return

            remainder = normalized.replace(wake_word, "", 1).strip(" ,.:;!?-")
            if remainder:
                self.execute_voice_command_or_type(remainder, confidence)
            else:
                self.awaiting_followup = True
                self.say_async("Dinliyorum")
                self._push("status", "uyandırıldı, komut bekliyor")
        except Exception as exc:
            self._push("status", f"eller serbest hata: {exc}")
        finally:
            self.transcribing = False

    def transcribe_audio(self, audio_data: bytes) -> tuple[str, float]:
        candidate_languages = [self.source_language]
        if self.auto_detect_input_language:
            candidate_languages = ["tr", "ar"]
        elif self.source_language not in STT_MODELS:
            candidate_languages = [DEFAULT_SOURCE_LANGUAGE]

        best_text = ""
        best_confidence = 0.0
        best_score = -1.0
        best_language = self.source_language

        for language_code in dict.fromkeys(candidate_languages):
            text, confidence = self.transcribe_with_model(audio_data, language_code)
            score = self.score_transcription(language_code, text, confidence)
            if score > best_score:
                best_text = text
                best_confidence = confidence
                best_score = score
                best_language = language_code

        if best_text:
            self.detected_input_language = best_language
            if self.auto_detect_input_language:
                self.source_language = best_language
            self.update_language_and_voice_status()

        return best_text, best_confidence

    def extract_wake_word(self, text: str) -> str:
        for wake_word in WAKE_WORDS:
            if wake_word in text:
                return wake_word
        return ""

    def execute_voice_command_or_type(self, text: str, confidence: float = 1.0) -> None:
        normalized = text.lower().strip()
        if not normalized:
            return

        language_code, language_name = self.resolve_language(normalized)

        if any(phrase in normalized for phrase in ["kendini kapat", "çıkış yap", "asistan kapan"]):
            self.say_async("Kapatıyorum")
            self.root.after(0, self.shutdown)
            return

        if "sesi erkek yap" in normalized or "erkek ses" in normalized:
            self.voice_gender = "male"
            self.update_language_and_voice_status()
            self.say_async("Erkek ses seçildi")
            return

        if "sesi kadın yap" in normalized or "sesi bayan yap" in normalized or "kadın ses" in normalized or "bayan ses" in normalized:
            self.voice_gender = "female"
            self.update_language_and_voice_status()
            self.say_async("Kadın ses seçildi")
            return

        if language_code and ("ses dilini" in normalized or "sesi " in normalized and "yap" in normalized):
            self.ui_language = language_code
            self.update_language_and_voice_status()
            self.say_async(f"Ses dili {language_name} yapıldı", language_code=DEFAULT_UI_LANGUAGE)
            return

        if language_code and ("hedef dili" in normalized or "çeviri dili" in normalized):
            self.target_language = language_code
            self.translation_enabled = self.target_language != self.source_language
            self._push("translation", "açık" if self.translation_enabled else "kapalı")
            self.update_language_and_voice_status()
            self.say_async(f"Hedef dil {language_name} yapıldı")
            return

        if language_code and ("giriş dili" in normalized or "kaynak dili" in normalized or "konuşma dili" in normalized):
            self.source_language = language_code
            self.detected_input_language = language_code
            self.auto_detect_input_language = False
            self._push("input-detect", "kapalı")
            self.update_language_and_voice_status()
            self.say_async(f"Giriş dili {language_name} yapıldı")
            return

        if language_code and ("çevir" in normalized or "çeviriye al" in normalized) and ("dili" not in normalized):
            self.target_language = language_code
            self.translation_enabled = self.target_language != self.source_language
            self._push("translation", "açık" if self.translation_enabled else "kapalı")
            self.update_language_and_voice_status()
            self.say_async(f"Çeviri dili {language_name} olarak ayarlandı")
            return

        if "otomatik gönder kapat" in normalized or "gönder kapat" in normalized:
            if self.auto_send:
                self.toggle_auto_send()
            self.say_async("Otomatik gönder kapatıldı")
            return

        if "otomatik gönder aç" in normalized or "gönder aç" in normalized:
            if not self.auto_send:
                self.toggle_auto_send()
            self.say_async("Otomatik gönder açıldı")
            return

        if "otomatik okuma kapat" in normalized or "okumayı kapat" in normalized:
            if self.auto_read_after_copy:
                self.toggle_auto_read()
            self.say_async("Otomatik okuma kapatıldı")
            return

        if "otomatik okuma aç" in normalized or "okumayı aç" in normalized:
            if not self.auto_read_after_copy:
                self.toggle_auto_read()
            self.say_async("Otomatik okuma açıldı")
            return

        if "çeviriyi kapat" in normalized or "tercümeyi kapat" in normalized:
            if self.translation_enabled:
                self.toggle_translation()
            self.say_async("Çeviri kapatıldı")
            return

        if "çeviriyi aç" in normalized or "tercümeyi aç" in normalized:
            if not self.translation_enabled:
                self.toggle_translation()
            self.say_async("Çeviri açıldı")
            return

        if "otomatik dil algılamayı aç" in normalized or "dil algılamayı aç" in normalized:
            if not self.auto_detect_input_language:
                self.toggle_input_language_detection()
            self.say_async("Otomatik dil algılama açıldı")
            return

        if "otomatik dil algılamayı kapat" in normalized or "dil algılamayı kapat" in normalized:
            if self.auto_detect_input_language:
                self.toggle_input_language_detection()
            self.say_async("Otomatik dil algılama kapatıldı")
            return

        if "doğrulamayı kapat" in normalized or "kontrolü kapat" in normalized:
            if self.verify_before_send:
                self.toggle_verify_before_send()
            self.say_async("Doğrulama kapatıldı")
            return

        if "doğrulamayı aç" in normalized or "kontrolü aç" in normalized:
            if not self.verify_before_send:
                self.toggle_verify_before_send()
            self.say_async("Doğrulama açıldı")
            return

        if "asistanı kapat" in normalized or "eller serbest kapat" in normalized:
            if self.handsfree_enabled:
                self.toggle_handsfree()
            self.say_async("Eller serbest kapatıldı")
            return

        if "asistanı aç" in normalized or "eller serbest aç" in normalized:
            if not self.handsfree_enabled:
                self.toggle_handsfree()
            self.say_async("Eller serbest açıldı")
            return

        if "seçili metni oku" in normalized or normalized == "oku" or "cevabı oku" in normalized:
            self.read_selected_text()
            return

        if "seçili metni çevir" in normalized or "seçili yazıyı çevir" in normalized:
            self.translate_selected_text()
            return

        if self.verify_before_send or confidence < CONFIDENCE_THRESHOLD:
            preview_text = self.prepare_text_for_delivery(text)
            self.pending_confirmation_text = preview_text
            self.pending_confirmation_confidence = confidence
            self.awaiting_confirmation = True
            self.pending_target_window = self.get_active_window_title()
            profile_name = self.current_profile.get("name", "Genel")
            confidence_text = f"güven oranı yüzde {int(confidence * 100)}" if confidence > 0 else "güven oranı ölçülemedi"
            self._push("status", f"doğrulama bekleniyor ({confidence_text})")
            self.append_audit_log(
                "awaiting_confirmation",
                transcript=text,
                delivery_preview=preview_text,
                confidence=round(confidence, 4),
                expected_window=self.pending_target_window,
            )
            self.say_async(f"{profile_name} için şunu anladım: {preview_text}. Doğruysa evet de, yanlışsa hayır ya da tekrar de.")
            return

        prepared_text = self.prepare_text_for_delivery(text)
        expected_window = self.get_active_window_title()
        self.send_text_to_active_app(prepared_text, expected_window_title=expected_window)

    def _window_loop(self) -> None:
        try:
            title = self.get_active_window_title()
            if title and title != self.last_active_window:
                self.last_active_window = title
                self.current_profile = self.detect_app_profile(title)
                self.apply_profile_preferences(self.current_profile)
                self._push("profile", self.current_profile["name"])
                self._push("window", title)
        except Exception:
            pass
        self.root.after(1200, self._window_loop)

    def _clipboard_loop(self) -> None:
        try:
            if self.clipboard_monitor_enabled and time.time() >= self.suppress_clipboard_until:
                current = pyperclip.paste().strip()
                if current and current != self.last_clipboard_seen:
                    self.last_clipboard_seen = current
                    if self.auto_read_after_copy and len(current) > 2:
                        self._push("response", current)
                        self._thread(self._speak_clipboard_text, current)
        except Exception:
            pass
        self.root.after(900, self._clipboard_loop)

    def _speak_clipboard_text(self, text: str) -> None:
        try:
            self._push("status", "yeni kopyalanan metin otomatik okunuyor")
            self.speak_text(text)
            self._push("status", "okuma tamamlandı")
        except Exception as exc:
            self._push("status", f"oto okuma hatası: {exc}")

    def run_visible_voice_test(self) -> None:
        self._thread(self._run_visible_voice_test)

    def _run_visible_voice_test(self) -> None:
        test_text = "Ses testi başarılı. Asistan çalışıyor."
        try:
            self._push("transcript", "[TEST] Sesli test komutu çalıştırıldı")
            self._push("response", f"[TEST] {test_text}")
            self._push("status", "sesli test başlatıldı")
            self.speak_text(test_text)
            self._push("status", "sesli test tamamlandı")
        except Exception as exc:
            self._push("status", f"sesli test hatası: {exc}")

    def _thread(self, target, *args) -> None:
        threading.Thread(target=target, args=args, daemon=True).start()

    def ensure_model(self, language_code: str) -> Model:
        with self.model_lock:
            if language_code in self.models:
                return self.models[language_code]

            model_config = STT_MODELS.get(language_code) or STT_MODELS[DEFAULT_SOURCE_LANGUAGE]
            model_name = model_config["name"]
            model_dir = MODELS_DIR / model_name

            if not model_dir.exists():
                self._push("model", f"{language_code} modeli indiriliyor")
                MODELS_DIR.mkdir(parents=True, exist_ok=True)
                zip_path = APP_DIR / f"{model_name}.zip"
                urllib.request.urlretrieve(model_config["url"], zip_path)
                self._push("model", f"{language_code} modeli çıkarılıyor")
                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(MODELS_DIR)
                zip_path.unlink(missing_ok=True)

            self._push("model", f"{language_code} modeli yükleniyor")
            self.models[language_code] = Model(str(model_dir))
            self._push("model", f"{language_code} modeli hazır")
            return self.models[language_code]

    def transcribe_with_model(self, audio_data: bytes, language_code: str) -> tuple[str, float]:
        model = self.ensure_model(language_code)
        recognizer = KaldiRecognizer(model, SAMPLE_RATE)
        recognizer.SetWords(True)
        chunk_size = 4000
        for index in range(0, len(audio_data), chunk_size):
            recognizer.AcceptWaveform(audio_data[index:index + chunk_size])
        final_result = json.loads(recognizer.FinalResult())
        text = (final_result.get("text") or "").strip()
        words = final_result.get("result") or []
        confidences = [float(word.get("conf", 0.0)) for word in words if "conf" in word]
        average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return text, average_confidence

    def audio_callback(self, indata, frames, time_info, status) -> None:
        if status:
            self._push("status", f"mikrofon uyarısı: {status}")
        self.audio_chunks.append(bytes(indata))

    def toggle_recording(self) -> None:
        if self.transcribing:
            self._push("status", "hala önceki kayıt çözümleniyor")
            return

        if not self.recording:
            self.audio_chunks = []
            self.recording = True
            self._push("status", "dinliyor")
            return

        self.recording = False
        audio_data = b"".join(self.audio_chunks)
        if not audio_data:
            self._push("status", "ses alınamadı")
            return

        self.transcribing = True
        self._push("status", "Türkçe ses yazıya çevriliyor")
        self._thread(self.transcribe_and_type, audio_data)

    def transcribe_and_type(self, audio_data: bytes) -> None:
        try:
            text, confidence = self.transcribe_audio(audio_data)
            if not text:
                self._push("status", "ses çözüldü ama metin çıkmadı")
                return

            self.execute_voice_command_or_type(text, confidence)
        except Exception as exc:
            self._push("status", f"hata: {exc}")
        finally:
            self.transcribing = False

    def toggle_auto_send(self) -> None:
        self.auto_send = not self.auto_send
        self._push("autosend", "açık" if self.auto_send else "kapalı")
        self._push("status", "oto gönder ayarı güncellendi")

    def toggle_verify_before_send(self) -> None:
        self.verify_before_send = not self.verify_before_send
        self.awaiting_confirmation = False
        self.pending_confirmation_text = ""
        self._push("verify", "açık" if self.verify_before_send else "kapalı")
        self._push("status", "sesli doğrulama ayarı güncellendi")

    def toggle_translation(self) -> None:
        self.translation_enabled = not self.translation_enabled
        if not self.translation_enabled:
            self.target_language = self.source_language
        elif self.target_language == self.source_language:
            self.target_language = "ar"
        self._push("translation", "açık" if self.translation_enabled else "kapalı")
        self.update_language_and_voice_status()
        self._push("status", "çeviri ayarı güncellendi")

    def toggle_input_language_detection(self) -> None:
        self.auto_detect_input_language = not self.auto_detect_input_language
        if self.auto_detect_input_language:
            self.detected_input_language = self.source_language
        self._push("input-detect", "açık" if self.auto_detect_input_language else "kapalı")
        self.update_language_and_voice_status()
        self._push("status", "giriş dili algılama ayarı güncellendi")

    def toggle_auto_read(self) -> None:
        self.auto_read_after_copy = not self.auto_read_after_copy
        self.clipboard_monitor_enabled = self.auto_read_after_copy
        self._push("clipboard", "açık" if self.auto_read_after_copy else "kapalı")
        self._push("status", "otomatik okuma ayarı güncellendi")

    def toggle_handsfree(self) -> None:
        self.handsfree_enabled = not self.handsfree_enabled
        self.awaiting_followup = False
        self._push("assistant", "açık" if self.handsfree_enabled else "kapalı")
        self._push("status", "eller serbest asistan ayarı güncellendi")

    def read_selected_text(self) -> None:
        try:
            selected = self.copy_selected_text()
            if not selected:
                self._push("status", "okunacak seçili metin bulunamadı")
                return
            self.last_spoken = selected
            self._push("response", selected)
            self._push("status", "seçili metin sesli okunuyor")
            self.speak_text(selected, language_code=self.ui_language)
            self._push("status", "okuma tamamlandı")
        except Exception as exc:
            self._push("status", f"okuma hatası: {exc}")

    def translate_selected_text(self) -> None:
        try:
            selected = self.copy_selected_text()
            if not selected:
                self._push("status", "çevirilecek seçili metin bulunamadı")
                return
            translated = self.translate_text(selected, self.target_language, source_language="auto")
            self.last_translation = translated
            self._push("response", translated)
            self._push("status", f"seçili metin {self.get_language_display_name(self.target_language)} diline çevrildi")
            self.speak_text(translated, language_code=self.target_language)
        except Exception as exc:
            self._push("status", f"çeviri okuma hatası: {exc}")

    def prepare_text_for_delivery(self, text: str) -> str:
        clean_text = (text or "").strip()
        if not clean_text:
            return ""
        if not self.translation_enabled or self.target_language == self.source_language:
            return clean_text
        translated = self.translate_text(clean_text, self.target_language, source_language=self.source_language)
        self.last_translation = translated
        self._push("response", translated)
        return translated

    def say_async(self, text: str, language_code: str | None = None) -> None:
        self._thread(self.speak_text, text, language_code)

    def detect_app_profile(self, window_title: str) -> dict:
        title = self.normalize_window_title(window_title)
        self.current_platform = self.detect_window_platform(title)
        best_profile = None
        best_score = -1
        for raw_profile in self.app_profiles:
            profile = self.normalize_profile_record(raw_profile)
            if not self.profile_supports_platform(profile, self.current_platform):
                continue
            score = self.profile_match_score(profile, title)
            if score > best_score:
                best_profile = profile
                best_score = score
        if best_profile:
            return self.apply_language_profile(self.resolve_profile_runtime(best_profile))
        return self.apply_language_profile(self.resolve_profile_runtime(DEFAULT_PROFILE))

    def apply_language_profile(self, profile: dict) -> dict:
        merged = dict(DEFAULT_PROFILE)
        merged.update(profile)
        language_profiles = merged.get("language_profiles", {})
        selected_language = self.detected_input_language if self.auto_detect_input_language else self.source_language
        scoped = language_profiles.get(selected_language) or language_profiles.get("default") or {}
        merged.update(scoped)
        return merged

    def apply_profile_preferences(self, profile: dict) -> None:
        profile_source = profile.get("source_language")
        profile_target = profile.get("target_language")
        profile_ui = profile.get("ui_language")

        if profile_source and not self.auto_detect_input_language:
            self.source_language = profile_source
            self.detected_input_language = profile_source
        if profile_target:
            self.target_language = profile_target
            self.translation_enabled = self.target_language != self.source_language
            self._push("translation", "açık" if self.translation_enabled else "kapalı")
        if profile_ui:
            self.ui_language = profile_ui
        self.update_language_and_voice_status()

    def handle_confirmation_response(self, normalized_text: str) -> None:
        if any(word in normalized_text for word in ["evet", "doğru", "gönder", "tamam", "onay", "نعم", "صح", "ok"]):
            text = self.pending_confirmation_text
            self.awaiting_confirmation = False
            self.pending_confirmation_text = ""
            expected_window = self.pending_target_window
            self.pending_target_window = ""
            delivered = self.send_text_to_active_app(text, expected_window_title=expected_window)
            if delivered:
                self.say_async("Gönderildi")
            return

        if any(word in normalized_text for word in ["hayır", "yanlış", "iptal", "tekrar", "düzelt", "لا", "الغاء"]):
            self.awaiting_confirmation = False
            self.pending_confirmation_text = ""
            self.pending_target_window = ""
            self._push("status", "komut iptal edildi, yeniden dinleniyor")
            self.append_audit_log("confirmation_cancelled")
            self.say_async("Tamam. Yeniden söyle")
            return

        self.say_async("Lütfen evet ya da hayır diye cevap ver")

    def send_text_to_active_app(self, text: str, expected_window_title: str | None = None) -> bool:
        current_window = self.get_active_window_title()
        if expected_window_title and not self.is_window_safe_for_send(expected_window_title, current_window):
            self._push("status", "hedef pencere değiştiği için gönderim durduruldu")
            self.append_audit_log(
                "window_guard_blocked",
                transcript=text,
                expected_window=expected_window_title,
                current_window=current_window,
            )
            self.say_async("Pencere değişti. Güvenlik için gönderimi durdurdum")
            return False

        self.last_transcript = text
        self._push("transcript", text)
        profile_name = self.current_profile.get("name", "Genel")
        self._push("status", f"metin {profile_name} hedefine yazılıyor")
        direct_write_ok, delivery_method, control_info = self.try_direct_write_to_focused_control(text)
        if direct_write_ok:
            self._push("status", f"metin {profile_name} hedefine doğrudan yazıldı")
        else:
            self.paste_text(text)
            delivery_method = f"clipboard-fallback:{delivery_method}"

        should_send = self.auto_send and self.current_profile.get("auto_send", True)
        if should_send:
            time.sleep(0.12)
            for key in self.current_profile.get("send_keys", ["enter"]):
                keyboard.send(key)
            self._push("status", f"komut {profile_name} profiliyle gönderildi")
            self.append_audit_log(
                "message_sent",
                transcript=text,
                expected_window=expected_window_title or current_window,
                current_window=current_window,
                auto_send=True,
                delivery_method=delivery_method,
                control_info=control_info,
            )
        else:
            self._push("status", f"komut {profile_name} profiliyle yazıldı")
            self.append_audit_log(
                "message_written_only",
                transcript=text,
                expected_window=expected_window_title or current_window,
                current_window=current_window,
                auto_send=False,
                delivery_method=delivery_method,
                control_info=control_info,
            )
        return True

    def paste_text(self, text: str) -> None:
        old_clipboard = pyperclip.paste()
        try:
            self.suppress_clipboard_until = time.time() + 1.5
            self.last_clipboard_seen = text
            pyperclip.copy(text)
            time.sleep(0.08)
            keyboard.send("ctrl+v")
            time.sleep(0.08)
        finally:
            pyperclip.copy(old_clipboard)
            self.suppress_clipboard_until = time.time() + 0.5

    def copy_selected_text(self) -> str:
        old_clipboard = pyperclip.paste()
        self.suppress_clipboard_until = time.time() + 2.0
        pyperclip.copy("")
        time.sleep(0.05)
        keyboard.send("ctrl+c")

        copied = ""
        started = time.time()
        while time.time() - started < 1.8:
            copied = pyperclip.paste()
            if copied:
                break
            time.sleep(0.05)

        time.sleep(0.05)
        pyperclip.copy(old_clipboard)
        self.suppress_clipboard_until = time.time() + 0.5
        return copied.strip()

    def get_active_window_title(self) -> str:
        try:
            import ctypes

            user32 = ctypes.windll.user32
            hwnd = user32.GetForegroundWindow()
            length = user32.GetWindowTextLengthW(hwnd)
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            return buffer.value.strip() or "bilinmiyor"
        except Exception:
            return "bilinmiyor"

    def speak_text(self, text: str, language_code: str | None = None) -> None:
        with self.tts_lock:
            self.speaking = True
            temp_file: Path | None = None
            try:
                AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(prefix="stp_voice_reply_", suffix=".mp3", dir=AUDIO_CACHE_DIR, delete=False) as handle:
                    temp_file = Path(handle.name)
                selected_language = language_code or self.ui_language
                voice_name = self.get_voice_name(selected_language)
                asyncio.run(self._save_tts(text, temp_file, voice_name))
                if not pygame.mixer.get_init():
                    pygame.mixer.init()
                pygame.mixer.music.load(str(temp_file))
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    time.sleep(0.1)
            finally:
                try:
                    if pygame.mixer.get_init():
                        pygame.mixer.music.unload()
                except Exception:
                    pass
                if temp_file is not None:
                    try:
                        temp_file.unlink(missing_ok=True)
                    except Exception:
                        pass
                self.speaking = False

    async def _save_tts(self, text: str, file_path: Path, voice_name: str) -> None:
        communicate = Communicate(text, voice_name)
        await communicate.save(str(file_path))

    def shutdown(self) -> None:
        try:
            keyboard.unhook_all_hotkeys()
        except Exception:
            pass
        try:
            if self.stream is not None:
                self.stream.stop()
                self.stream.close()
        except Exception:
            pass
        try:
            if self.assistant_stream is not None:
                self.assistant_stream.stop()
                self.assistant_stream.close()
        except Exception:
            pass
        try:
            if pygame.mixer.get_init():
                pygame.mixer.music.stop()
                pygame.mixer.quit()
        except Exception:
            pass
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    app = VoiceAssistantApp()
    app.run()
