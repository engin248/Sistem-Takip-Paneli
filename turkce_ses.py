import os
try:
    from gtts import gTTS
except ImportError:
    os.system("pip install gTTS")
    from gtts import gTTS

texts = [
    "Komutanım. Attığınız resim Windows'un kendi Sesle Denetim menüsüdür. Maalesef Microsoft o menüye Türkçe desteği vermedi.",
    "Ama bunun bizim sistemimizle hiçbir alakası yok. O bozuk sistemi çöpe attım.",
    "Şu an duyduğunuz gibi size doğrudan saf Türkçe yapay zeka sesiyle hitap ediyorum.",
    "Eğer beni duyuyorsanız birinci seçenek olan Trendyol Motoruna mı, yoksa ikinci seçenek olan sonsuz döngü sistemine mi geçelim? Emrinizi bekliyorum."
]

for i, text in enumerate(texts):
    tts = gTTS(text, lang='tr')
    tts.save(f"cevap_{i}.mp3")
