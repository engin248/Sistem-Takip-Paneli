## Plan: Komuta-Haberleşme-Planlama Zinciri

Bu taslak, verdiğiniz öncelik sırasını aynen korur: önce Komuta Merkezi eksikleri, sonra haberleşme standardı, sonra planlama departmanının iş emri/proje/operasyon planı üretimi ve üretime devir. Amaç, her görevde sıfır inisiyatifle zorunlu şablon, kontrol kapısı, test/doğrulama ve final kalite güvence onayıyla ilerlemek.

### Steps
1. Komuta Merkezi eksik envanterini çıkar ve `DoD` sabitle: page.tsx, AgentPanel.tsx, PlanningPanel.tsx.
2. Zorunlu görev şablonunu tanımla ve kilitle: teknoloji, etki, test, kalite, checkpoint, `QA` onayı.
3. Haberleşme SOP’sini kur: mesaj türleri, ACK/Retry, eskalasyon, audit akışı eventBus.ts, route.ts, `logAudit()`.
4. Planlama departmanı çıktısını standartlaştır: süreç planı, iş emri, proje planı, operasyon planı planningService.ts, route.ts.
5. Planlama→Üretim devir hattını kur: görev paketi, ekip ataması, checkpoint takibi orchestrator.ts, agentWorker.ts, `runAgentWorker()`.
6. Süreç yönetişimini kalıcılaştır: kurallar, istisna prosedürü, uyum denetimi SISTEM_KURALLARI.md, STP_MIMARI_VE_PROTOKOL.md, STP_VIZYON_VE_YOLHARITASI.md.

### Further Considerations
1. Ekip rol dağılımını bu şekilde kilitleyelim mi: Komuta/Haberleşme/Planlama/Üretim + her ekipte minimum 3 üye?
2. Final kalite onayı tek kapı mı olsun, yoksa P0-P1 görevlerde çift onay mı?
3. Bu plan taslağını onaylıyor musunuz; onay sonrası adım-1’in detaylı görev listesine geçeyim mi?