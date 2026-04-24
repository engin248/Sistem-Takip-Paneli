require('dotenv').config();
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');

const PORT = 2525; // NVR e-posta ayarlarından bu portu girmeniz istenecek.
const LOCAL_DB_PATH = path.join(__dirname, 'yerel_performans_sayimi.json');

const logEvent = (msg) => {
    console.log(`[KAMERA-ALARM] ${new Date().toISOString()} - ${msg}`);
};

const server = new SMTPServer({
  secure: false, 
  authOptional: true, // NVR tarafında şifreye gerek bırakmaz
  onData(stream, session, callback) {
    simpleParser(stream, async (err, parsed) => {
      if (err) {
        logEvent(`Mail Parse Hatası: ${err.message}`);
        return callback(err);
      }
      
      const subject = parsed.subject || '';
      const textBody = parsed.text || '';
      logEvent(`Sinyal Alındı! Konu: "${subject}"`);
      
      let cameraId = "Bilinmeyen Kamera";
      // IP ve ID ayıklama (Basit regex veya String kontrolü)
      if (subject.includes('D1') || textBody.includes('D1') || textBody.includes('.201')) cameraId = "D1 (IP Camera 01)";
      else if (subject.includes('D2') || textBody.includes('D2') || textBody.includes('.202')) cameraId = "D2 (IP Camera 02)";
      else if (subject.includes('D3') || textBody.includes('D3') || textBody.includes('.203')) cameraId = "D3 (IP Camera 03)";
      else cameraId = subject.substring(0, 50) || "Genel Kamera"; 

      logEvent(`Kamera Tespit Edildi: ${cameraId} -> OTONOM SİSTEME VE YEREL VERİTABANINA AKTARILIYOR`);

      // 1. SADECE LOCAL BİLGİSAYAR ALTYAPISI (Lokal JSON Dosyasına Kayıt)
      try {
          let records = [];
          if (fs.existsSync(LOCAL_DB_PATH)) {
              records = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
          }
          records.push({
              tarih: new Date().toISOString(),
              kamera: cameraId,
              islem_adedi: 1,
              bilgi: subject
          });
          fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(records, null, 2));
      } catch (localErr) {
          logEvent(`[LOKAL HATA] Yerel Yazma Hatası: ${localErr.message}`);
      }

      // 2. OTONOM (MDS-160) SİSTEM ENJEKSİYONU: YEREL RADAR (ANA KOMUTA)
      try {
          const radar = require('../shared/lokalRadar');
          const gorevKodu = "KAMERA-ALRM-" + Math.floor(Math.random() * 99999);
          const baslik = `GÜVENLİK İHLALİ TESPİT EDİLDİ! Kaynak: ${cameraId}. Detay: ${subject}. Acil inceleme gereklidir!`;
          
          const radarSonuc = radar.gorevEkle({
              task_code: gorevKodu,
              title: baslik,
              priority: "yuksek"
          });

          if (!radarSonuc.success) {
              logEvent(`[RADAR HATA] Otonom sisteme aktarılamadı: ${radarSonuc.error}`);
          } else {
              logEvent(`[RADAR BAŞARILI] Emir Ana Komutaya Düştü! Görev Kodu: ${gorevKodu} (ÖNCELİK: YÜKSEK)`);
          }
      } catch (dbErr) {
          logEvent(`[RADAR KRİTİK HATA] Bağlantı Çöktü: ${dbErr.message}`);
      }

      callback();
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`[KAMERA DEPARTMANI] SADECE LOCAL DİNLEYİCİ AKTİF (Port: ${PORT})`);
    console.log(`Veriler SADECE => ${LOCAL_DB_PATH} dosyasına yazılacak.`);
    console.log(`=======================================================`);
});
