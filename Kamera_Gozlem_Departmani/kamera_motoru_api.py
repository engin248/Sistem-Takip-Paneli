import cv2
import threading
import time
import os
from flask import Flask, Response, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# TCP zorlaması, kamera yayınlarında atlanan kare veya kopmaları engeller
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# Kullanıcı Bilgileri
RTSP_USER = "admin"
RTSP_PASS = "tuana1452."
NVR_IP = "192.168.1.200"

# Kamera Akışlarını Tutacağımız Sözlük
# Kamerayı sadece birisi izlerken açmak, sistemi yormamak için iyi bir pratiktir.
# Ancak şimdilik sürekli okuyacak şekilde basit tutalım.

class CameraStream:
    def __init__(self, cam_id):
        self.cam_id = cam_id
        self.frame = None
        self.is_running = True
        
        # Patronun gönderdiği NVR ekranından alınan KESİN doğru RTSP yayın linki formatı:
        # rtsp://<ip>:<port>/unicast/c<kanal no>/s<akış türü>/live
        self.rtsp_url = f"rtsp://{RTSP_USER}:{RTSP_PASS}@{NVR_IP}:554/unicast/c{self.cam_id}/s1/live"
        
        self.thread = threading.Thread(target=self.update, daemon=True)
        self.thread.start()

    def update(self):
        # KAYIT CİHAZINI (NVR) BOĞMAMAK İÇİN KADEMELİ BAŞLATMA (STAGGERING)
        # Her kamera ID'sine göre x 2 saniye bekleyecek. 
        # Örn: Kamera 1 -> 2sn, Kamera 2 -> 4sn, Kamera 12 -> 24sn sonra bağlanacak.
        time.sleep(self.cam_id * 2.0)
        
        while self.is_running:
            cap = cv2.VideoCapture(self.rtsp_url)
            if not cap.isOpened():
                print(f"[KAMERA {self.cam_id}] Bağlantı kurulamadı: {self.rtsp_url}. 5 saniye sonra tekrar denenecek...")
                time.sleep(5)
                continue
                
            print(f"[KAMERA {self.cam_id}] Bağlantı BAŞARILI!")
            
            while self.is_running:
                ret, frame = cap.read()
                if not ret:
                    print(f"[KAMERA {self.cam_id}] Yayın koptu. Yeniden bağlanılıyor...")
                    break
                
                # Kareyi küçük bir boyuta yeniden boyutlandır (Performans için)
                frame = cv2.resize(frame, (640, 360))
                
                # Kareyi JPEG formatında şifrele
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret:
                    self.frame = buffer.tobytes()
                    
            cap.release()

    def get_frame(self):
        return self.frame

# Sistem Başlangıcında Kameraları Başlat
print("SİSTEM TAKİP PANELİ - YAPAY ZEKA KAMERA MOTORU BAŞLATILIYOR...")
print("Kameralara bağlanılıyor, lütfen bekleyin...")
cameras = {}
for i in range(1, 13):
    cameras[i] = CameraStream(i)

def generate_frames(cam_id):
    camera = cameras.get(cam_id)
    while True:
        if not camera:
            time.sleep(0.1)
            continue
            
        frame = camera.get_frame()
        if frame is None:
            # Görüntü yoksa siyah bir ekran beklemesi yapılabilir veya boş dönülebilir
            time.sleep(0.1)
            continue
            
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed_<int:cam_id>')
def video_feed(cam_id):
    return Response(generate_frames(cam_id), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/stats')
def get_stats():
    # Frontend'in beklediği DUMMY veriyi şimdilik buradan dönebiliriz.
    # İleride yapay zeka buraya gerçek sayım verilerini basacak.
    return jsonify([])

if __name__ == '__main__':
    # Flask sunucusunu 5001 portunda başlatıyoruz
    # UI'daki hata mesajının aradığı port 5001'dir.
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
