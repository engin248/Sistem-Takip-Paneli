import os
from gtts import gTTS

texts = [
    "Komutanım.",
    "O eziyet eden pencereyi sistem arka planından zorla kapattım. O iş bitti.",
    "Kamera ve mikrofon için donanım kayıtlarına en derinden girdim.",
    "Baktığım donanım kayıtlarına göre, ekranınızın üstündeki Lenovo Monitor Kamerası şu anda donanım olarak takılı değil görünüyor.",
    "O kameranın bir de mikrofonu olduğu için, USB kablosu bilgisayar kasasından gevşemiş veya çıkmış olabilir.",
    "Siz o kabloyu sadece kasaya tekrar sertçe taktığınız an sistem tanıyacaktır.",
    "Lütfen kasanın arkasındaki bağlantılarınızı kontrol edin.",
    "Siz o donanım kablosunu takarken, ben de sizin benimle doğrudan mikrofonla konuşabilmeniz için gerekli yapay zeka dinleme asistanını arka planda hazırlıyorum."
]

for i, text in enumerate(texts):
    tts = gTTS(text, lang='tr')
    tts.save(f'bilgi_{i}.mp3')
