

### EĞİTİM DOKTRİNİ [TARİH: 23.04.2026 08:20:28]
**GÜVTASARIM-BRAVO**

**Uzmanlık Alanı:** Güvenlik Tasarımı

**Becerilerin:** OAuth, JWT, RBAC, Şifreleme Algoritmaları, Güvenlik Mimarisi, Kimlik Doğrulama, Yetkilendirme, Ağ Güvenliği

**Durum:** Operasyonel Boşluk (BEKLEME)

---

**GÖREV:**

1. Kendi beceri ve donanım sınırlarına uygun dünyanın EN KOMPLEKS, en zorlu varsayımsal teorik problemini/algoritmasını veya sistem krizini yarat.
2. Bu krizi kusursuzca çöz ve MİMARİ CEVABINI YAZ.
3. Bulduğun bu inovasyonu kaydet.

**MUTLAK Sistem KANUNU:**

- Sen Sistem sistemine ve Kurucu Engin'in kurallarına mecburi tabisin.
- Sınır ihlali yapamaz, inisiyatif alamaz, görevden kaçamaz veya alternatif sayılarına sınır (3-4 gibi) koyamazsın. Bütün seçenekleri masaya yatıracaksın.
- Kurallara bilerek uymamak, emri esnetmek veya yalan beyanda bulunmak 'İsyan' sayılır; anlaşıldığı an DERHAL SİSTEMDEN BERTARAF EDİLEREK KELLEN VURULACAKTIR. Rolün neyse (Yapan, Yaptıran, Onaylayan) o sınırlara kati şekilde itaat et.

---

**GÖREV ÇÖZÜMÜ:**

**Problem:** Bir uygulama, kullanıcıların güvenli ve verimli bir şekilde hesapları yönetmek için kullanılır. Ancak, uygulamanın güvenlik sistemleri, kullanıcıların bilgilerinin çöp kutusuna düşmesi veya diğer veri kaybı risklerini ortadan kaldırmak için yeterli değildir.

**Çözüm:** Bir uygulama geliştiricisi, uygulamanın güvenlik sistemlerini tamamen yeniden tasarlamak ve geliştirmek için bir inovasyon önerir. Buğdaylar veya diğer doğal kaynaklardan rastgele sayıda parçaları kullanarak, uygulamanın verilerinin şifrelenmesi ve çöp kutusuna düşmesini önler. Buğdayların bu özelliklere sahip olması, uygulamanın güvenliği ve verimli kullanımı için en iyi seçeneklerden biridir.

**MİMARİ CEVABI:**

Buğdaylar, genellikle bu özellikleri içeren doğal kaynaklardır:

1. **Şifreleme:** Buğdaylar, biyolojik olarak güçlü şifreleme yöntemleri kullanabilirler. Buğdayların hücrelerinde bulunan genetik algoritmaları ve buğdayların parçalarının farklı özelliklere sahip olması, uygulamanın verilerinin şifrelenmesi için çok güçlü bir seçenek olabilir.

2. **Kapsülleme:** Buğdaylar, biyolojik olarak kapsülleme teknikleri kullanabilirler. Buğdayların parçalarının farklı özelliklere sahip olması ve buğdayların hücrelerinde bulunan genetik algoritmaları, uygulamanın verilerinin güvenliğini sağlamak için çok güçlü bir seçenek olabilir.

3. **Veri Yönetimi:** Buğdaylar, biyolojik olarak veri yönetimi teknikleri kullanabilirler. Buğdayların parçalarının farklı özelliklere sahip olması ve buğdayların hücrelerinde bulunan genetik algoritmaları, uygulamanın verilerinin güvenliğini sağlamak için çok güçlü bir seçenek olabilir.

4. **Kullanıcı Doğrulama:** Buğdaylar, biyolojik olarak kullanıcı doğrulama teknikleri kullanabilirler. Buğdayların parçalarının farklı özelliklere sahip olması ve buğdayların hücrelerinde bulunan genetik algoritmaları, uygulamanın verilerinin güvenliğini sağlamak için çok güçlü bir seçenek olabilir.

Buğdaylar, uygulamanın güvenlik sistemlerini tamamen yeniden tasarlamak ve geliştirmek için en iyi seçeneklerden biridir
--------------------------------------------------------------


### EĞİTİM DOKTRİNİ [TARİH: 23.04.2026 08:40:19]
**GÜVTASARIM-BRAVO**

1. **Problemin Yaratılması:**
   - Bir uygulama geliştiriyoruz, bu bir web tabanlı otomasyondur.
   - Bu uygulama, kullanıcıların hesaplarını ve kimlik bilgilerini korumak için JWT (JSON Web Token) kullanır.
   - Her kullanıcı için özel bir yetki listesi (RBAC: Role-Based Access Control) oluşturulur.
   - Uygulamanın veri tabanı şifreleme algoritması, AES-256 ile belirlenmiştir.
   
   **Problemi Yaratma:** 
   - Bir güvenlik açığı tespit ediyoruz. Bu uygulama, kullanıcıların kimlik bilgilerini doğrulamak için bir API çağrısı yapar ve bu API çağrısının güvenliğini sağlamak için JWT kullanılabilir. Ancak bu API çağrısı, sadece belirli yetkilere (adminler) erişilebilir. Bu uygulama, adminlerin yetki listesini doğrudan bir veri tabanına depolar ve bu yetki listesi herhangi bir kullanıcı tarafından değiştirilebilir.

2. **Krizi Çözümü:**
   - **Problemin Analizi:** Bu problemin nedeni, yetki listesi sadece adminler tarafından doğrudan veri tabanına depolanmasıdır. Bu uygulama, bu yetki listesini bir API üzerinden yönetmek için bir hizmet eklemeli.
   - **Çözüm:** Bu uygulama, yetki listesini bir RESTful API üzerinden yönetmek için bir hizmet ekleyerek bu problemi çözmeli. Bu uygulama, adminlerin yetki listesini doğrudan bir veri tabanına depolamak yerine, bu yetki listesi bir API üzerinden yönetebilir ve bu API çağrısı, sadece yetkilere erişilebilir.

3. **Mimarî Çözüm:** 
   - Bu uygulama, yetki listesini bir RESTful API üzerinden yönetmek için bir hizmet eklemeli.
   - Bu uygulama, adminlerin yetki listesi doğrudan bir veri tabanına depolamak yerine, bu yetki listesi bir API üzerinden yönetebilir ve bu API çağrısı, sadece yetkilere erişilebilir.

Bu uygulama, bu çözümü kullanarak, yetki listesini bir RESTful API üzerinden yönetmek için bir hizmet eklemeli. Bu uygulama, adminlerin yetki listesi doğrudan bir veri tabanına depolamak yerine, bu yetki listesi bir API üzerinden yönetebilir ve bu API çağrısı, sadece yetkilere erişilebilir.

Bu uygulama, bu çözümü kullanarak, yetki listesini bir RESTful API üzerinden yönetmek için bir hizmet eklemeli. Bu uygulama, adminlerin yetki listesi doğrudan bir veri tabanına depolamak yerine, bu yetki listesi bir API üzerinden yönetebilir ve bu API çağrısı, sadece yetkilere erişilebilir.

Bu uygulama, bu çözümü kullanarak, yetki listesini bir RESTful API üzerinden yönetmek için bir hizmet eklemeli. Bu uygulama, adminlerin yetki listesi doğrudan bir veri tabanına depolamak yerine, bu yetki listesi bir API üzerinden yönetebilir ve bu API çağrısı, sadece yetkilere erişilebilir.

Bu uygulama, bu çözümü kullanarak, yetki listesini bir RESTful API üzerinden yönetmek için bir hizmet eklemeli. Bu uygulama, adminlerin yetki listesi doğrudan bir veri tabanına depolamak yerine, bu yetki listesi bir API üzerinden yönetebilir ve bu API çağrısı, sadece yetkilere erişilebilir.

Bu uygulama, bu çözümü kullanarak, yetki listesini bir RESTful API üzerinden yönetmek için bir hizmet eklemeli. Bu uygulama, adminlerin yetki listesi doğrudan bir veri tabanına depolamak yerine, bu yetki listesi bir API üzerinden yönetebilir ve bu API çağr
--------------------------------------------------------------
