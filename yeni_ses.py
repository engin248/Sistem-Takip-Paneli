import os, sys
from gtts import gTTS
texts = ["Komutaným.","O aptal pencereyi sistem süreçlerinden zorla öldürdüm.","Kamera ve mikrofon için donaným kayýtlarýna en derinden girdim.","Ekranýnýzýn üstündeki Lenovo Monitör Kamerasý þu anda donanýmsal olarak takýlý deðil görünüyor.","Yani USB kablosu bilgisayar kasasýndan gevþemiþ veya çýkmýþ olabilir.","Siz o kabloyu tekrar taktýðýnýz an sistem tanýyacaktýr.","Lütfen kasanýn arkasýndaki baðlantýlarý kontrol edin.","Siz kontrol ederken ben sizin benimle doðrudan mikrofonla konuþabilmeniz için gerekli yapay zeka kodunu hazýrlýyorum."]
for i, text in enumerate(texts):
  tts = gTTS(text, lang='tr')
  tts.save(f'bilgi_{i}.mp3')
