// ============================================================
// ZOD VALIDATION SCHEMAS — G-0 GİRİŞ FİLTRESİ
// ============================================================
// Tüm dış girdiler (form, API, Telegram) bu şemalardan geçer.
// Geçemeyen veri sisteme ASLA girmez.
//
// Hata Kodu: ERR-STP001-001 (genel validasyon)
// Doktrin: Kirli veri = Kirli audit. Tolerans SIFIR.
// ============================================================

import { z } from 'zod';
import { ERR, processError } from '@/lib/errorCore';

// ─── GÖREV DURUMLARI ────────────────────────────────────────
export const TaskStatusEnum = z.enum([
  'beklemede',
  'devam_ediyor',
  'dogrulama',
  'tamamlandi',
  'reddedildi',
  'iptal',
]);

// ─── GÖREV ÖNCELİKLERİ ─────────────────────────────────────
export const TaskPriorityEnum = z.enum([
  'kritik',
  'yuksek',
  'normal',
  'dusuk',
]);

// ─── GÖREV OLUŞTURMA ŞEMASI ────────────────────────────────
export const CreateTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'Görev başlığı en az 3 karakter olmalı')
    .max(500, 'Görev başlığı en fazla 500 karakter olabilir')
    .trim(),
  description: z
    .string()
    .max(2000, 'Açıklama en fazla 2000 karakter olabilir')
    .trim()
    .nullable()
    .optional(),
  priority: TaskPriorityEnum.default('normal'),
  assigned_to: z
    .string()
    .min(1, 'Atanan kişi boş olamaz')
    .max(100, 'Atanan kişi adı en fazla 100 karakter')
    .trim()
    .default('SISTEM'),
  due_date: z
    .string()
    .nullable()
    .optional(),
});

// ─── GÖREV DÜZENLEME ŞEMASI (PUT/PATCH) ─────────────────────
// Partial update: Sadece gönderilen alanlar güncellenir
export const UpdateTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'Görev başlığı en az 3 karakter olmalı')
    .max(500, 'Görev başlığı en fazla 500 karakter olabilir')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Açıklama en fazla 2000 karakter olabilir')
    .trim()
    .nullable()
    .optional(),
  priority: TaskPriorityEnum.optional(),
  assigned_to: z
    .string()
    .min(1, 'Atanan kişi boş olamaz')
    .max(100)
    .trim()
    .optional(),
  status: TaskStatusEnum.optional(),
  due_date: z
    .string()
    .nullable()
    .optional(),
});

// ─── GÖREV DURUM GÜNCELLEME ŞEMASI ──────────────────────────
export const UpdateTaskStatusSchema = z.object({
  taskId: z.string().uuid('Geçersiz görev ID formatı'),
  newStatus: TaskStatusEnum,
});

// ─── GÖREV SİLME ŞEMASI ────────────────────────────────────
export const DeleteTaskSchema = z.object({
  taskId: z.string().uuid('Geçersiz görev ID formatı'),
});

// ─── BOARD KARAR ŞEMASI ─────────────────────────────────────
export const BoardDecisionSchema = z.object({
  title: z
    .string()
    .min(3, 'Karar başlığı en az 3 karakter olmalı')
    .max(300, 'Karar başlığı en fazla 300 karakter olabilir')
    .trim(),
  description: z
    .string()
    .max(1000, 'Açıklama en fazla 1000 karakter olabilir')
    .trim()
    .optional(),
  category: z.enum([
    'DEPLOYMENT',
    'SCHEMA_CHANGE',
    'SECURITY',
    'ROLLBACK',
    'CONFIG_CHANGE',
  ]),
});

// ─── BROWSER API ŞEMASI ─────────────────────────────────────
export const BrowserActionSchema = z.object({
  action: z.enum(['navigate', 'search', 'screenshot', 'extract', 'health']),
  url: z.string().url('Geçerli bir URL gerekli').optional(),
  query: z.string().min(1).max(500).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
  selectors: z.record(z.string(), z.string()).optional(),
});

// ─── AUDIT LOG ŞEMASI ───────────────────────────────────────
export const AuditLogSchema = z.object({
  operation_type: z.enum(['CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'SYSTEM', 'REJECT']),
  action_description: z
    .string()
    .min(1, 'Açıklama zorunlu')
    .max(2000),
  task_id: z.string().uuid().nullable().optional(),
  error_code: z.string().max(50).nullable().optional(),
  error_severity: z.enum(['INFO', 'WARNING', 'CRITICAL', 'FATAL']).nullable().optional(),
  status: z.string().max(50).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

// ============================================================
// GUARD FONKSİYONU — Tüm validasyonlar buradan geçer
// ============================================================
// Başarılı → { success: true, data: T }
// Başarısız → { success: false, errors: string[] }
// Her başarısız girişim errorCore'a loglanır.
// ============================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  context: { kaynak: string; islem: string }
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const zodErrors = result.error.issues ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = zodErrors.map((e: any) =>
    `${(e.path ?? []).join('.')}: ${e.message ?? 'Geçersiz'}`
  );

  processError(ERR.SYSTEM_GENERAL, new Error(`ZOD Validasyon Hatası: ${errors.join('; ')}`), {
    kaynak: context.kaynak,
    islem: context.islem,
    hatalar: errors,
    girdi_tipi: typeof input,
  }, 'WARNING');

  return { success: false, errors };
}

// ─── TİP ÇIKARIMlari ───────────────────────────────────────
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;
export type BoardDecisionInput = z.infer<typeof BoardDecisionSchema>;
export type BrowserActionInput = z.infer<typeof BrowserActionSchema>;
export type AuditLogInput = z.infer<typeof AuditLogSchema>;
