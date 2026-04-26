from pathlib import Path
import sys

assistant = Path(r"C:\Users\Esisya\Desktop\Global_Turkce_Ses_Asistani\vscode_turkce_ses_asistani.py")
shortcut = Path(r"C:\Users\Esisya\Desktop\Global Türkçe Ses Asistanı.lnk")
requirements = Path(r"C:\Users\Esisya\Desktop\Global_Turkce_Ses_Asistani\requirements_turkce_ses_asistani.txt")

missing = False

for path in [assistant, shortcut, requirements]:
    state = "ok" if path.exists() else "missing"
    print(f"{path.name}={state}")
    if state != "ok":
        missing = True

if assistant.exists():
    text = assistant.read_text(encoding="utf-8")
    keys = [
        "try_direct_write_to_focused_control",
        "window_guard_blocked",
        "append_audit_log",
        "SUPPORTED_DIRECT_WRITE_CLASSES",
    ]
    for key in keys:
        state = "ok" if key in text else "missing"
        print(f"{key}={state}")
        if state != "ok":
            missing = True

sys.exit(1 if missing else 0)
