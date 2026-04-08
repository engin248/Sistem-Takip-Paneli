// ============================================================
// i18n — ÇOKLU DİL SÖZLÜĞÜ (TR / AR)
// ============================================================
// Tüm UI metinleri tek merkezden yönetilir.
// Dil değişiminde tüm bileşenler buradan okur.
// Jenerik sabit metin YASAKTIR.
// ============================================================

export const translations = {
  tr: {
    // ── NavBar ────────────────────────────────────────────────
    panelTitle: 'STP-PANEL',
    panelSubtitle: 'Sistem Takip Paneli',

    // ── Dashboard Başlık ─────────────────────────────────────
    dashboardTitle: 'STP-OPERASYON MERKEZİ',
    accessLocked: 'ERİŞİM KİLİTLİ (AÇ)',
    accessOpen: 'ERİŞİM AÇIK (KİLİTLE)',
    systemOnline: 'SİSTEM ÇEVRİMİÇİ',
    sealSystem: 'SİSTEMİ MÜHÜRLE (JSON)',
    sealing: 'MÜHÜRLEME...',
    systemRestricted: 'Sistem Erişimi Kısıtlandı',
    unlockHint: 'Lütfen yukarıdaki butonu kullanarak kilidi açın.',
    systemError: 'Sistem Hatası:',
    newOrder: 'Yeni Emir Girişi',
    taskSchedule: 'Görev Çizelgesi',
    noActiveTasks: 'Aktif emir bulunmamaktadır.',

    // ── Stats ────────────────────────────────────────────────
    totalOrders: 'Toplam Emir',
    pending: 'Beklemede',
    completed: 'Tamamlanan',

    // ── TaskForm ─────────────────────────────────────────────
    placeholder: 'Yeni Görev Emri...',
    addButton: 'EKLE',

    // ── TaskCard ─────────────────────────────────────────────
    statusPending: 'BEKLEMEDE',
    statusInProgress: 'DEVAM EDİYOR',
    statusVerification: 'DOĞRULAMA',
    statusCompleted: 'TAMAMLANDI',
    statusRejected: 'REDDEDİLDİ',
    statusCancelled: 'İPTAL',
    confirmDelete: 'SİLİNSİN Mİ?',
    confirmArchive: 'GÖREV ARŞİVLENSİN MI?',

    // ── AuditLog ─────────────────────────────────────────────
    auditTitle: 'Denetim Günlüğü',
    refresh: 'YENİLE',
    noRecords: 'Kayıt bulunamadı.',

    // ── Notification Bell ────────────────────────────────────
    notifTitle: 'Bildirimler',
    notifEnabled: 'Bildirimler aktif',
    notifBlocked: 'Bildirimler engellendi',
    notifAskPermission: 'Bildirim izni bekleniyor',
    notifUnsupported: 'Bu tarayıcı bildirimleri desteklemiyor',
    notifEnableButton: 'BİLDİRİMLERİ AÇ',
    notifTestButton: 'TEST BİLDİRİMİ GÖNDER',
    notifSending: 'GÖNDERİLİYOR...',
    notifTestTitle: 'STP Test Bildirimi',
    notifTestBody: 'Bildirim sistemi başarıyla çalışıyor.',
    notifDeniedHint: 'Bildirimlere izin vermek için tarayıcı ayarlarından site izinlerini güncelleyin.',
    notifPwaHint: 'Ana ekrana ekleyerek tam uygulama deneyimi yaşayın.',

    // ── PWA Install ──────────────────────────────────────────
    pwaInstallTitle: 'Uygulamayı Kur',
    pwaInstallDesc: 'STP Paneli ana ekranınıza ekleyin.',
    pwaInstallButton: 'KUR',
    pwaLater: 'Sonra',

    // ── Yönetim Kurulu (Board Panel) ───────────────────────────
    boardTitle: 'YÖNETİM KURULU',
    boardSubtitle: 'Konsensüs Mühür Mekanizması',
    boardNewDecision: 'Yeni Karar Talebi',
    boardDecisionTitle: 'Karar Başlığı',
    boardDecisionDesc: 'Açıklama (opsiyonel)',
    boardCategory: 'Kategori',
    boardCatDeploy: 'DAĞITIM',
    boardCatSchema: 'ŞEMA DEĞİŞİKLİĞİ',
    boardCatSecurity: 'GÜVENLİK',
    boardCatRollback: 'GERİ ALMA',
    boardCatConfig: 'YAPILANDIRMA',
    boardSubmit: 'KURULA SUN',
    boardSubmitting: 'KURUL TOPLANTIYOR...',
    boardAgentStrategic: '🎯 Stratejik Ajan',
    boardAgentTechnical: '⚙️ Teknik Ajan',
    boardAgentSecurity: '🛡️ Güvenlik Ajanı',
    boardVoteApprove: 'ONAY',
    boardVoteReject: 'RED',
    boardVoteWaiting: 'BEKLİYOR',
    boardStatusPending: 'Beklemede',
    boardStatusApproved: 'Onaylandı',
    boardStatusRejected: 'Reddedildi',
    boardStatusSealed: 'MÜHÜRLÜ',
    boardConsensusSealed: '✅ KONSENSÜS SAĞLANDI — MÜHÜRLENDİ',
    boardConsensusRejected: '❌ KONSENSÜS REDDEDILDI',
    boardConsensusWaiting: '⏳ OYLAMA DEVAM EDİYOR',
    boardNoDecisions: 'Henüz kurul kararı bulunmuyor.',
    boardHistory: 'Karar Geçmişi',

    // ── File-level Locking (İzin/Kilit) ─────────────────────────
    permOperatorLabel: 'Aktif Operatör',
    permLockWarning: 'BU GÖREV BAŞKA OPERATÖRe ATANMIŞ',
    permDeniedToast: 'YAZMA YETKİSİ REDDEDİLDİ',
    permLockedBy: 'Atanan:',
    permYou: '(SİZ)',
    permReadOnly: 'SALT OKUNUR',
    permWritable: 'YAZMA YETKİSİ',
    permNoAccess: 'Bu görevi değiştirme yetkiniz bulunmuyor.',

    // ── Kanban Görev Panosu ──────────────────────────────────
    kanbanTitle: 'GÖREV PANOSU',
    kanbanTodo: 'YAPILACAK',
    kanbanDoing: 'YAPILIYOR',
    kanbanReview: 'DENETİMDE',
    kanbanSealed: 'MÜHÜRLENDİ',
    kanbanEmpty: 'Bu sütunda görev yok.',
    kanbanDropHere: 'Buraya bırak',
  },

  ar: {
    // ── NavBar ────────────────────────────────────────────────
    panelTitle: 'STP-لوحة',
    panelSubtitle: 'لوحة تتبع النظام',

    // ── Dashboard Başlık ─────────────────────────────────────
    dashboardTitle: 'مركز عمليات STP',
    accessLocked: 'الوصول مقفل (فتح)',
    accessOpen: 'الوصول مفتوح (قفل)',
    systemOnline: 'النظام متصل',
    sealSystem: 'ختم النظام (JSON)',
    sealing: 'جاري الختم...',
    systemRestricted: 'تم تقييد الوصول إلى النظام',
    unlockHint: 'يرجى استخدام الزر أعلاه لفتح القفل.',
    systemError: 'خطأ في النظام:',
    newOrder: 'إدخال أمر جديد',
    taskSchedule: 'جدول المهام',
    noActiveTasks: 'لا توجد أوامر نشطة.',

    // ── Stats ────────────────────────────────────────────────
    totalOrders: 'إجمالي الأوامر',
    pending: 'قيد الانتظار',
    completed: 'مكتمل',

    // ── TaskForm ─────────────────────────────────────────────
    placeholder: 'أمر مهمة جديد...',
    addButton: 'إضافة',

    // ── TaskCard ─────────────────────────────────────────────
    statusPending: 'قيد الانتظار',
    statusInProgress: 'قيد التنفيذ',
    statusVerification: 'التحقق',
    statusCompleted: 'مكتمل',
    statusRejected: 'مرفوض',
    statusCancelled: 'ملغى',
    confirmDelete: 'هل تريد الحذف؟',
    confirmArchive: 'هل تريد أرشفة المهمة؟',

    // ── AuditLog ─────────────────────────────────────────────
    auditTitle: 'سجل التدقيق',
    refresh: 'تحديث',
    noRecords: 'لم يتم العثور على سجلات.',

    // ── Notification Bell ────────────────────────────────────
    notifTitle: 'الإشعارات',
    notifEnabled: 'الإشعارات مفعلة',
    notifBlocked: 'تم حظر الإشعارات',
    notifAskPermission: 'في انتظار إذن الإشعارات',
    notifUnsupported: 'هذا المتصفح لا يدعم الإشعارات',
    notifEnableButton: 'تفعيل الإشعارات',
    notifTestButton: 'إرسال إشعار تجريبي',
    notifSending: 'جاري الإرسال...',
    notifTestTitle: 'إشعار تجريبي STP',
    notifTestBody: 'نظام الإشعارات يعمل بنجاح.',
    notifDeniedHint: 'لتفعيل الإشعارات، قم بتحديث إعدادات أذونات الموقع في المتصفح.',
    notifPwaHint: 'أضف إلى الشاشة الرئيسية للحصول على تجربة التطبيق الكاملة.',

    // ── PWA Install ──────────────────────────────────────────
    pwaInstallTitle: 'تثبيت التطبيق',
    pwaInstallDesc: 'أضف لوحة STP إلى شاشتك الرئيسية.',
    pwaInstallButton: 'تثبيت',
    pwaLater: 'لاحقاً',

    // ── Yönetim Kurulu (Board Panel) ───────────────────────────
    boardTitle: 'مجلس الإدارة',
    boardSubtitle: 'آلية ختم الإجماع',
    boardNewDecision: 'طلب قرار جديد',
    boardDecisionTitle: 'عنوان القرار',
    boardDecisionDesc: 'الوصف (اختياري)',
    boardCategory: 'الفئة',
    boardCatDeploy: 'النشر',
    boardCatSchema: 'تغيير المخطط',
    boardCatSecurity: 'الأمان',
    boardCatRollback: 'التراجع',
    boardCatConfig: 'التكوين',
    boardSubmit: 'تقديم للمجلس',
    boardSubmitting: 'المجلس يجتمع...',
    boardAgentStrategic: '🎯 الوكيل الاستراتيجي',
    boardAgentTechnical: '⚙️ الوكيل التقني',
    boardAgentSecurity: '🛡️ وكيل الأمان',
    boardVoteApprove: 'موافقة',
    boardVoteReject: 'رفض',
    boardVoteWaiting: 'بانتظار',
    boardStatusPending: 'قيد الانتظار',
    boardStatusApproved: 'موافق عليه',
    boardStatusRejected: 'مرفوض',
    boardStatusSealed: 'مختوم',
    boardConsensusSealed: '✅ تم الإجماع — تم الختم',
    boardConsensusRejected: '❌ تم رفض الإجماع',
    boardConsensusWaiting: '⏳ التصويت جارٍ',
    boardNoDecisions: 'لا توجد قرارات مجلس حتى الآن.',
    boardHistory: 'سجل القرارات',

    // ── File-level Locking (İzin/Kilit) ─────────────────────────
    permOperatorLabel: 'المشغل النشط',
    permLockWarning: 'هذه المهمة مخصصة لمشغل آخر',
    permDeniedToast: 'تم رفض إذن الكتابة',
    permLockedBy: 'مخصص لـ:',
    permYou: '(أنت)',
    permReadOnly: 'قراءة فقط',
    permWritable: 'إذن الكتابة',
    permNoAccess: 'ليس لديك صلاحية لتعديل هذه المهمة.',

    // ── Kanban Görev Panosu ──────────────────────────────────
    kanbanTitle: 'لوحة المهام',
    kanbanTodo: 'للتنفيذ',
    kanbanDoing: 'قيد التنفيذ',
    kanbanReview: 'قيد المراجعة',
    kanbanSealed: 'مختوم',
    kanbanEmpty: 'لا توجد مهام في هذا العمود.',
    kanbanDropHere: 'أسقط هنا',
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKeys = keyof typeof translations['tr'];

/** Çeviri sözlük tipi — her iki dil aynı anahtar setini paylaşır */
export type TranslationMap = {
  [K in TranslationKeys]: string;
};

/** Dil anahtarından çeviri sözlüğü döndürür */
export function t(lang: Lang): TranslationMap {
  return translations[lang] as TranslationMap;
}
