import cv2
import mediapipe as mp
import os
import sqlite3
import threading
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, Response, jsonify
from flask_cors import CORS

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
load_dotenv()

app = Flask(__name__)
CORS(app)

# Tamamen LOKAL izolasyon: Veri dışarı çıkamaz
LOCAL_DB_DIR = os.path.join("..", "Local_Veri_Arsivi")
LOCAL_DB_PATH = os.path.join(LOCAL_DB_DIR, "personel_performans.db")

output_frame = None
lock = threading.Lock()

def init_db():
    os.makedirs(LOCAL_DB_DIR, exist_ok=True)
    conn = sqlite3.connect(LOCAL_DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS islem_kayitlari (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kamera_id TEXT,
            personel_isim TEXT,
            tarih DATETIME,
            islem_adedi INTEGER,
            birim_ucret REAL
        )
    ''')
    conn.commit()
    conn.close()

def log_event(kamera_id, personel_isim, count_incr, birim_ucret):
    conn = sqlite3.connect(LOCAL_DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO islem_kayitlari (kamera_id, personel_isim, tarih, islem_adedi, birim_ucret)
        VALUES (?, ?, ?, ?, ?)
    ''', (kamera_id, personel_isim, datetime.now().isoformat(), count_incr, birim_ucret))
    conn.commit()
    conn.close()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [LOKAL ARŞİV] {personel_isim} (+{count_incr} İşlem)")

def generate_frames():
    global output_frame, lock
    while True:
        with lock:
            if output_frame is None:
                continue
            ret, buffer = cv2.imencode('.jpg', output_frame)
            frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        time.sleep(0.04)

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/stats')
def get_stats():
    conn = sqlite3.connect(LOCAL_DB_PATH)
    c = conn.cursor()
    
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    stats = []
    c.execute("SELECT DISTINCT personel_isim, kamera_id, birim_ucret FROM islem_kayitlari")
    personel_list = c.fetchall()
    
    if not personel_list:
        personel_list = [("İstasyon 1", "CAM-A1", 2.5)]
        
    for p_isim, k_id, ucret in personel_list:
        c.execute("SELECT SUM(islem_adedi) FROM islem_kayitlari WHERE personel_isim=? AND tarih >= ?", (p_isim, today.isoformat()))
        gunluk = c.fetchone()[0] or 0
        
        c.execute("SELECT SUM(islem_adedi) FROM islem_kayitlari WHERE personel_isim=? AND tarih >= ?", (p_isim, week_start.isoformat()))
        haftalik = c.fetchone()[0] or 0
        
        c.execute("SELECT SUM(islem_adedi) FROM islem_kayitlari WHERE personel_isim=? AND tarih >= ?", (p_isim, month_start.isoformat()))
        aylik = c.fetchone()[0] or 0
        
        stats.append({
            "id": p_isim.replace(" ", "-"),
            "kameraId": k_id,
            "isim": p_isim,
            "istasyon": "Fiziksel Band",
            "gunlukIs": gunluk,
            "haftalikIs": haftalik,
            "aylikIs": aylik,
            "birimUcret": ucret,
            "aktiflikOrani": 100 if gunluk > 0 else 0,
            "durum": "CALISIYOR" if gunluk > 0 else "YOK"
        })
        
    conn.close()
    return jsonify(stats)

def watcher_thread(env_key, kamera_isim, personel_isim, birim_ucret):
    global output_frame, lock
    init_db()
    
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils
    
    kamera_url = os.getenv(env_key)
    if not kamera_url:
        return
        
    cap = cv2.VideoCapture(int(kamera_url) if kamera_url.isdigit() else kamera_url)
    
    islem_durumu = "BEKLIYOR"
    sayac = 0
    
    print(f"AI KAMERA MOTORU BAŞLADI: {personel_isim} ({kamera_isim})")

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(2)
            cap = cv2.VideoCapture(int(kamera_url) if kamera_url.isdigit() else kamera_url)
            continue
            
        frame_resized = cv2.resize(frame, (640, 360))
        h, w, c = frame_resized.shape
        frame_rgb = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
        results = hands.process(frame_rgb)
        
        islem_cizgisi = int(h * 0.6)
        cv2.line(frame_resized, (0, islem_cizgisi), (w, islem_cizgisi), (0, 255, 255), 2)
        cv2.putText(frame_resized, f"{kamera_isim} Sayim: {sayac}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        
        eller_islemde_mi = False
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame_resized, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                idx_y = int(hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP].y * h)
                if idx_y > islem_cizgisi:
                    eller_islemde_mi = True
                    
        if eller_islemde_mi and islem_durumu == "BEKLIYOR":
            islem_durumu = "ISLEM_YAPILIYOR"
            cv2.circle(frame_resized, (w-40, 40), 10, (0,0,255), -1) 
        elif not eller_islemde_mi and islem_durumu == "ISLEM_YAPILIYOR":
            sayac += 1
            log_event(kamera_isim, personel_isim, 1, birim_ucret)
            islem_durumu = "BEKLIYOR"

        # Sadece İstasyon 1'in yayınını Flask web sunucusuna basıyoruz (demo amaçlı)
        if env_key == "RTSP_CAMERA_1":
            with lock:
                output_frame = frame_resized.copy()

if __name__ == "__main__":
    stations = [
        {"env_key": "RTSP_CAMERA_1", "camId": "CAM-A1", "isim": "İstasyon 1", "ucret": 2.5},
        {"env_key": "RTSP_CAMERA_2", "camId": "CAM-A2", "isim": "İstasyon 2", "ucret": 2.5},
        {"env_key": "RTSP_CAMERA_3", "camId": "CAM-A3", "isim": "İstasyon 3", "ucret": 2.5}
    ]
    
    for s in stations:
        if os.getenv(s["env_key"]):
            t = threading.Thread(target=watcher_thread, args=(s["env_key"], s["camId"], s["isim"], s["ucret"]))
            t.daemon = True
            t.start()
            
    print("AI KAMERA MOTORU BAŞLADI: YEREL ARŞİV AKTİF. PORT 5001")
    app.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)
