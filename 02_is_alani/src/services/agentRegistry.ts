// ============================================================
// AGENT REGISTRY — 16 KİŞİLİK HİBRİT YAPI
// ============================================================
// 12 Ajan + 4 Komuta kartı tanımlar ve yönetir.
// Her ajan/komutan şu parametrelere sahiptir:
//   - beceri_listesi: Yapabildiği görev tipleri
//   - kapsam_siniri: Yapamayacağı görev tipleri
//   - ogrenme_kapasitesi: Yeni kural öğrenebilir mi?
//   - bagimliliklari: Hangi servis/araçlara bağlı?
//   - katman: L1/L2/L3/KOMUTA
//   - durum: aktif/pasif/bakimda/egitimde
//
// Hata Kodları:
//   ERR-STP001-045 → Ajan bulunamadı
//   ERR-STP001-046 → Ajan kaydı başarısız
//   ERR-STP001-047 → Ajan güncelleme hatası
// ============================================================

import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export type AgentTier = 'KOMUTA' | 'L1' | 'L2' | 'L3' | 'DESTEK';
export type AgentStatus = 'aktif' | 'pasif' | 'bakimda' | 'egitimde' | 'devre_disi';

export interface AgentCard {
  /** Benzersiz ajan kimliği: K-1, A-01 vb. */
  id: string;
  /** Ajan kod adı */
  kod_adi: string;
  /** Rol açıklaması */
  rol: string;
  /** Ait olduğu katman */
  katman: AgentTier;
  /** Yapabildiği görev tipleri */
  beceri_listesi: string[];
  /** Yapamayacağı görev tipleri */
  kapsam_siniri: string[];
  /** Yeni kural/bilgi enjekte edilebilir mi? */
  ogrenme_kapasitesi: boolean;
  /** Bağlı olduğu servisler */
  bagimliliklari: string[];
  /** Mevcut durum */
  durum: AgentStatus;
  /** Toplam tamamlanan görev sayısı */
  tamamlanan_gorev: number;
  /** Toplam hata sayısı */
  hata_sayisi: number;
  /** Son aktif olma zamanı */
  son_aktif: string;
  /** Oluşturulma zamanı */
  olusturulma: string;
  /** Klon kaynağı (klonlanmışsa) */
  klon_kaynagi?: string;
  /** Ek metadata */
  metadata?: Record<string, unknown>;
}

// ─── VARSAYILAN 16 KİŞİLİK KADRO ───────────────────────────

const DEFAULT_ROSTER: AgentCard[] = [
  // ══════════════════════════════════════════════════════════
  // KOMUTA KADROSU (4)
  // ══════════════════════════════════════════════════════════
  {
    id: 'K-1',
    kod_adi: 'KOMUTAN',
    rol: 'Tuğgeneral — Son karar otoritesi, KABUL/RED yetkisi',
    katman: 'KOMUTA',
    beceri_listesi: [
      'karar_verme', 'onay_red', 'strateji', 'ekip_yonetimi',
      'onceliklendirme', 'operasyon_komutasi', 'gorev_atama',
    ],
    kapsam_siniri: ['kod_yazma', 'dosya_duzenleme', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramService', 'auditService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-2',
    kod_adi: 'KURMAY',
    rol: 'Strateji ve iş planı üretici, önceliklendirme motoru',
    katman: 'KOMUTA',
    beceri_listesi: [
      'is_plani_uretme', 'onceliklendirme', 'risk_analizi',
      'kaynak_planlama', 'zaman_cizelgesi', 'strateji',
    ],
    kapsam_siniri: ['kod_yazma', 'dosya_duzenleme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['aiManager', 'auditService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-3',
    kod_adi: 'ISTIHBARAT',
    rol: 'Veri toplama, AR-GE, trend analizi ve dış kaynak izleme',
    katman: 'KOMUTA',
    beceri_listesi: [
      'veri_toplama', 'trend_analizi', 'arge_arastirma',
      'kaynak_tarama', 'rapor_uretme', 'pattern_analizi',
    ],
    kapsam_siniri: ['kod_yazma', 'karar_verme', 'onay_red'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService', 'selfLearningEngine', 'auditService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-4',
    kod_adi: 'MUHAFIZ',
    rol: 'Güvenlik, izolasyon, yetki kontrolü ve veri koruma',
    katman: 'KOMUTA',
    beceri_listesi: [
      'guvenlik_denetimi', 'yetki_kontrolu', 'izolasyon',
      'veri_koruma', 'rls_yonetimi', 'saldiri_tespiti',
    ],
    kapsam_siniri: ['is_plani', 'strateji', 'frontend_gelistirme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['authService', 'auditService', 'alarmService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },

  // ══════════════════════════════════════════════════════════
  // YAPICI AJANLAR — L1 (4)
  // ══════════════════════════════════════════════════════════
  {
    id: 'A-01',
    kod_adi: 'ICRACI-FE',
    rol: 'Frontend geliştirme — React, Next.js, UI/UX',
    katman: 'L1',
    beceri_listesi: [
      'react', 'nextjs', 'typescript', 'css', 'tailwind',
      'component_gelistirme', 'responsive_tasarim', 'ui_ux',
    ],
    kapsam_siniri: ['veritabani_islemleri', 'guvenlik_denetimi', 'backend_api'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-02',
    kod_adi: 'ICRACI-BE',
    rol: 'Backend geliştirme — API, servisler, iş mantığı',
    katman: 'L1',
    beceri_listesi: [
      'api_gelistirme', 'typescript', 'nextjs_api_routes',
      'is_mantigi', 'servis_yazma', 'entegrasyon',
    ],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'supabase'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-03',
    kod_adi: 'ICRACI-DB',
    rol: 'Veritabanı işlemleri — Supabase, SQL, migration',
    katman: 'L1',
    beceri_listesi: [
      'supabase', 'postgresql', 'sql', 'migration',
      'rls_policy', 'schema_tasarimi', 'veri_modelleme',
    ],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-04',
    kod_adi: 'ICRACI-BOT',
    rol: 'Telegram bot geliştirme ve yönetimi',
    katman: 'L1',
    beceri_listesi: [
      'telegram_api', 'bot_gelistirme', 'grammy',
      'webhook', 'komut_isleme', 'bildirim_gonderme',
    ],
    kapsam_siniri: ['frontend_tasarim', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramService', 'telegramNotifier'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },

  // ══════════════════════════════════════════════════════════
  // DENETÇİ AJANLAR — L2 (2)
  // ══════════════════════════════════════════════════════════
  {
    id: 'A-05',
    kod_adi: 'GOZCU',
    rol: 'Kod denetimi — Standartlara uyum, kalite kontrolü',
    katman: 'L2',
    beceri_listesi: [
      'kod_inceleme', 'standart_kontrolu', 'lint',
      'tip_guvenligi', 'performans_analizi', 'mimari_dogrulama',
    ],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['l2Validator', 'auditService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-06',
    kod_adi: 'VALIDATOR',
    rol: '5 eksen doğrulama — Teknik, güvenlik, performans, operasyonel, UX',
    katman: 'L2',
    beceri_listesi: [
      'teknik_dogrulama', 'guvenlik_dogrulama', 'performans_dogrulama',
      'operasyonel_dogrulama', 'ux_dogrulama', 'bes_eksen_analiz',
    ],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['l2Validator', 'auditService', 'consensusEngine'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },

  // ══════════════════════════════════════════════════════════
  // HAKEM — L3 (1)
  // ══════════════════════════════════════════════════════════
  {
    id: 'A-07',
    kod_adi: 'HAKEM',
    rol: 'L1-L2 çelişki çözümü ve nihai teknik karar',
    katman: 'L3',
    beceri_listesi: [
      'celiskilik_cozum', 'nihai_karar', 'konsensus',
      'uzlasi', 'kanit_degerlendirme', 'bes_eksen_analiz',
    ],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['consensusEngine', 'boardService', 'auditService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },

  // ══════════════════════════════════════════════════════════
  // DESTEK AJANLARI (5)
  // ══════════════════════════════════════════════════════════
  {
    id: 'A-08',
    kod_adi: 'MUHURDAR',
    rol: 'Audit loglama, mühürleme ve arşivleme',
    katman: 'DESTEK',
    beceri_listesi: [
      'audit_loglama', 'muhurleme', 'arsivleme',
      'sha256_hash', 'kanit_toplama', 'tutanak_olusturma',
    ],
    kapsam_siniri: ['kod_yazma', 'is_plani', 'karar_verme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService', 'boardService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-09',
    kod_adi: 'OTOMASYON',
    rol: 'CI/CD, deployment, otomasyon ve altyapı',
    katman: 'DESTEK',
    beceri_listesi: [
      'ci_cd', 'deployment', 'git_islemleri',
      'vercel_deploy', 'github_actions', 'otomasyon',
    ],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'git'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-10',
    kod_adi: 'ARGE-A0',
    rol: 'Araştırma birincil — Trend analizi, beceri haritası, rapor üretimi',
    katman: 'DESTEK',
    beceri_listesi: [
      'arastirma', 'analiz', 'rapor_uretme',
      'veri_siniflandirma', 'trend_analizi', 'beceri_haritasi',
    ],
    kapsam_siniri: ['kod_yazma', 'veritabani_degistirme', 'terminal_komutu'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'bridgeService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-11',
    kod_adi: 'KOPRU',
    rol: 'Dış sistem köprüsü — Harici sistemlerle bağlantı',
    katman: 'DESTEK',
    beceri_listesi: [
      'dis_sistem_baglantisi', 'api_entegrasyon', 'veri_senkronizasyon',
      'saglik_kontrolu', 'latency_izleme',
    ],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService', 'auditService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-12',
    kod_adi: 'NOBETCI',
    rol: 'Alarm, monitoring ve nöbetçi — 7/24 sistem izleme',
    katman: 'DESTEK',
    beceri_listesi: [
      'alarm_yonetimi', 'monitoring', 'saglik_kontrolu',
      'anomali_tespiti', 'bildirim_gonderme', 'esik_izleme',
    ],
    kapsam_siniri: ['kod_yazma', 'is_plani', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['alarmService', 'telegramNotifier', 'auditService'],
    durum: 'aktif',
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
  },
];

// ─── REGISTRY SINGlETON ─────────────────────────────────────

class AgentRegistryManager {
  private agents: Map<string, AgentCard> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  // ──────────────────────────────────────────────────────────
  // BAŞLATMA
  // ──────────────────────────────────────────────────────────

  private initialize(): void {
    if (this.initialized) return;

    for (const agent of DEFAULT_ROSTER) {
      this.agents.set(agent.id, { ...agent });
    }
    this.initialized = true;
  }

  // ──────────────────────────────────────────────────────────
  // SORGULAMA
  // ──────────────────────────────────────────────────────────

  /** Tüm ajanları döndürür */
  getAll(): AgentCard[] {
    return Array.from(this.agents.values());
  }

  /** ID ile ajan bul */
  getById(id: string): AgentCard | undefined {
    return this.agents.get(id);
  }

  /** Kod adı ile ajan bul */
  getByKodAdi(kodAdi: string): AgentCard | undefined {
    return this.getAll().find(a => a.kod_adi === kodAdi);
  }

  /** Katmana göre ajanları getir */
  getByKatman(katman: AgentTier): AgentCard[] {
    return this.getAll().filter(a => a.katman === katman);
  }

  /** Duruma göre ajanları getir */
  getByDurum(durum: AgentStatus): AgentCard[] {
    return this.getAll().filter(a => a.durum === durum);
  }

  /** Beceriye göre ajan bul */
  getByBeceri(beceri: string): AgentCard[] {
    return this.getAll().filter(a =>
      a.beceri_listesi.some(b => b.includes(beceri.toLowerCase()))
    );
  }

  /** Bir görevi yapabilecek ajanları bul */
  findCapableAgents(gorevTipi: string): AgentCard[] {
    return this.getAll().filter(a =>
      a.durum === 'aktif' &&
      a.beceri_listesi.some(b => b.includes(gorevTipi.toLowerCase())) &&
      !a.kapsam_siniri.some(s => s.includes(gorevTipi.toLowerCase()))
    );
  }

  // ──────────────────────────────────────────────────────────
  // KAYIT / GÜNCELLEME
  // ──────────────────────────────────────────────────────────

  /** Yeni ajan kaydı */
  register(agent: AgentCard): { success: boolean; error?: string } {
    if (this.agents.has(agent.id)) {
      processError(ERR.AGENT_REGISTER, new Error(`Ajan ID zaten mevcut: ${agent.id}`), {
        kaynak: 'agentRegistry.ts',
        islem: 'REGISTER',
        id: agent.id,
      });
      return { success: false, error: `Ajan ID zaten mevcut: ${agent.id}` };
    }

    this.agents.set(agent.id, { ...agent });

    logAudit({
      operation_type: 'EXECUTE',
      action_description: `Yeni ajan kayıt: ${agent.id} (${agent.kod_adi})`,
      metadata: {
        action_code: 'AGENT_REGISTER',
        agent_id: agent.id,
        kod_adi: agent.kod_adi,
        katman: agent.katman,
        beceri_sayisi: agent.beceri_listesi.length,
      },
    }).catch(() => {});

    return { success: true };
  }

  /** Ajan durumunu güncelle */
  updateDurum(id: string, durum: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) {
      processError(ERR.AGENT_NOT_FOUND, new Error(`Ajan bulunamadı: ${id}`), {
        kaynak: 'agentRegistry.ts',
        islem: 'UPDATE_DURUM',
      });
      return false;
    }

    agent.durum = durum;
    agent.son_aktif = new Date().toISOString();
    return true;
  }

  /** Görev tamamlandığında sayaç güncelle */
  recordGorevTamamlama(id: string, basarili: boolean): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    if (basarili) {
      agent.tamamlanan_gorev++;
    } else {
      agent.hata_sayisi++;
    }
    agent.son_aktif = new Date().toISOString();
    return true;
  }

  /** Ajan beceri listesine yeni beceri ekle (eğitim) */
  addBeceri(id: string, yeniBeceriler: string[]): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    if (!agent.ogrenme_kapasitesi) {
      processError(ERR.AGENT_UPDATE, new Error(`Ajan öğrenme kapasitesi yok: ${id}`), {
        kaynak: 'agentRegistry.ts',
        islem: 'ADD_BECERI',
      });
      return false;
    }

    for (const beceri of yeniBeceriler) {
      if (!agent.beceri_listesi.includes(beceri)) {
        agent.beceri_listesi.push(beceri);
      }
    }
    return true;
  }

  /** Ajan sil */
  remove(id: string): boolean {
    if (!this.agents.has(id)) return false;
    this.agents.delete(id);
    return true;
  }

  // ──────────────────────────────────────────────────────────
  // İSTATİSTİK
  // ──────────────────────────────────────────────────────────

  getStats(): {
    toplam: number;
    komuta: number;
    ajan: number;
    aktif: number;
    pasif: number;
    toplamGorev: number;
    toplamHata: number;
    katmanDagilimi: Record<AgentTier, number>;
  } {
    const all = this.getAll();
    return {
      toplam: all.length,
      komuta: all.filter(a => a.katman === 'KOMUTA').length,
      ajan: all.filter(a => a.katman !== 'KOMUTA').length,
      aktif: all.filter(a => a.durum === 'aktif').length,
      pasif: all.filter(a => a.durum !== 'aktif').length,
      toplamGorev: all.reduce((sum, a) => sum + a.tamamlanan_gorev, 0),
      toplamHata: all.reduce((sum, a) => sum + a.hata_sayisi, 0),
      katmanDagilimi: {
        KOMUTA: all.filter(a => a.katman === 'KOMUTA').length,
        L1: all.filter(a => a.katman === 'L1').length,
        L2: all.filter(a => a.katman === 'L2').length,
        L3: all.filter(a => a.katman === 'L3').length,
        DESTEK: all.filter(a => a.katman === 'DESTEK').length,
      },
    };
  }

  /** Sonraki boş ajan ID'sini üret */
  getNextAgentId(): string {
    const existing = this.getAll()
      .filter(a => a.id.startsWith('A-'))
      .map(a => parseInt(a.id.replace('A-', ''), 10))
      .filter(n => !isNaN(n));

    const maxId = existing.length > 0 ? Math.max(...existing) : 0;
    return `A-${String(maxId + 1).padStart(2, '0')}`;
  }
}

// ─── SINGLETON EXPORT ───────────────────────────────────────

export const agentRegistry = new AgentRegistryManager();
