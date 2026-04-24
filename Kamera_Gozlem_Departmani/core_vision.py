import cv2
import os
import json
import time
from datetime import datetime
from dotenv import load_dotenv

# Kameraların UDP üzerinden engellenmemesi için TCP Zorlaması (Timeout Düzeltmesi)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# Yapılandırmayı Yükle
load_dotenv()

# Log ve Sayaç Dosyası
LOCAL_DB_PATH = 'yerel_ai_sayimi.json'

def init_db():
    if not os.path.exists(LOCAL_DB_PATH):
        with open(LOCAL_DB_PATH, 'w', encoding='utf-8') as f:
            json.dump([], f)

def log_event(camera_name, count_incr):
    with open(LOCAL_DB_PATH, 'r+', encoding='utf-8') as f:
        try:
            records = json.load(f)
        except:
            records = []
            
        records.append({
            'tarih': datetime.now().isoformat(),
            'kamera': camera_name,
            'islem_adedi': count_incr,
            'bilgi': 'Yapay Zeka Gorsel Hareket/Item Tespiti'
        })
        f.seek(0)
        json.dump(records, f, indent=2)
        f.truncate()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [AI-GÖZLEM] {camera_name} için +{count_incr} Üretim Kaydedildi!")

def start_ai_watcher():
    init_db()
    
    # Kameraları .env üzerinden alıyoruz
    kameralar = [
        {"isim": "D1 (Kamera 1)", "url": os.getenv("RTSP_CAMERA_1")},
        {"isim": "D2 (Kamera 2)", "url": os.getenv("RTSP_CAMERA_2")}
    ]
    
    print("=================================================================")
    print(" SİSTEM TAKİP PANELİ - GERÇEK ZAMANLI AI GÖZLEM VE SAYIM MOTORU ")
    print("=================================================================")
    
    baglanti_olmayanlar = [k for k in kameralar if not k["url"] or k["url"] == ""]
    if len(baglanti_olmayanlar) == len(kameralar):
        print("KRİTİK HATA: Hiçbir kameranın RTSP URL'si ve şifresi girilmemiş!")
        print("Lütfen '.env' dosyasını açıp 'rtsp://admin:sifre@192.168.1.x/' formatında kameraları tanımlayın.")
        return

    # Örnek olarak ilk tanımlı kamerayı işliyoruz (Çoklu thread daha sonra açılır)
    hedef_kamera = [k for k in kameralar if k["url"]][0]
    print(f"Yapay Zeka {hedef_kamera['isim']} adresine bağlanıyor...")
    
    # Basit bir bilgisayarlı görü (AI) Hareket Analiz Kütüphanesi 
    # Not: Ultralytics (YOLOv8) bağlanmadan önce temel OpenCV ile başlatılır.
    cap = cv2.VideoCapture(hedef_kamera["url"])
    fgbg = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=50, detectShadows=True)
    
    sayac = 0
    bekleme_suresi = 0
    
    if not cap.isOpened():
        print(f"HATA: {hedef_kamera['isim']} adresine şifre veya ağ hatası yüzünden SIZILAMADI.")
        return
        
    print(f"{hedef_kamera['isim']} Sızma başarılı! Yapay Zeka görüntüleri izliyor ve üretime başladığında sayacak.")
    print("Sistemi kapatmak için bu ekranda CTRL+C tuşlarına basın.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Akış koptu, yeniden deneniyor...")
                time.sleep(2)
                cap = cv2.VideoCapture(hedef_kamera["url"])
                continue
                
            # Ön İşleme: Görüntüyü küçült ve gri yap (AI Performansı)
            frame_resized = cv2.resize(frame, (640, 360))
            fgmask = fgbg.apply(frame_resized)
            
            # Nesne alanını hesaplama (Büyük bir nesne veya el hareketi varsa üretildi say)
            contours, _ = cv2.findContours(fgmask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            buyuk_hareket_var = False
            for contour in contours:
                if cv2.contourArea(contour) > 5000: # Nesne boyutu eşiği
                    buyuk_hareket_var = True
                    # Ekrana yeşil kutu çizeriz (Ekranı canlı görmeseniz de AI arkada çizer)
                    x, y, w, h = cv2.boundingRect(contour)
                    cv2.rectangle(frame_resized, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            if buyuk_hareket_var and bekleme_suresi == 0:
                sayac += 1
                log_event(hedef_kamera['isim'], 1)
                bekleme_suresi = 50 # Aynı parça 50 kare (yaklaşık 2-3 sn) boyunca tekrar sayılmasın (Spam engeli)
            
            if bekleme_suresi > 0:
                bekleme_suresi -= 1
                
            # Eğer sistemi bir arayüze (monitöre) aktarmak istersek aşağıdaki satır açılır
            # cv2.imshow('AI SAYIM MOTORU', frame_resized)
            # if cv2.waitKey(1) & 0xFF == ord('q'):
            #    break

    except KeyboardInterrupt:
        print("AI Gözlem Motoru komutla durduruldu.")
    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    start_ai_watcher()
