import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================
// OPERATÖR KİMLİK DEPOSU — Devtools + Persist
// ============================================================
// Aktif operatörün kimliğini yönetir + localStorage'da saklar.
// File-level locking: Görevlerin assigned_to alanı ile
// operatör kimliği karşılaştırılarak yazma yetkisi kontrol edilir.
// ============================================================

export type OperatorRole = 'OPERATÖR' | 'YÖNETİCİ' | 'ADMIN' | 'SİSTEM';

export interface Operator {
  /** Operatör adı — tasks.assigned_to ile eşleşir */
  name: string;
  /** Operatör rolü — YÖNETİCİ ve ADMIN tüm görevlere erişir */
  role: OperatorRole;
}

interface OperatorState {
  operator: Operator;
  setOperator: (operator: Operator) => void;
  /** Operatörün belirtilen göreve yazma yetkisi var mı? */
  canWrite: (taskAssignedTo: string) => boolean;
  /** Operatör yüksek yetkili mi? (YÖNETİCİ/ADMIN) */
  isElevated: () => boolean;
}

// ── YÜKSEK YETKİLİ ROLLER — tüm görevlere yazma erişimi ────
// SİSTEM rolü: varsayılan operatör — otonom işlemler bu rolle çalışır
const ELEVATED_ROLES: OperatorRole[] = ['YÖNETİCİ', 'ADMIN', 'SİSTEM'];

export const useOperatorStore = create<OperatorState>()(
  devtools(
    persist(
      (set, get) => ({
        // Varsayılan operatör — ilk kurulumda değiştirilmelidir
        operator: {
          name: 'SISTEM',
          role: 'SİSTEM',
        },

        setOperator: (operator) => set({ operator }, false, 'setOperator'),

        canWrite: (taskAssignedTo: string): boolean => {
          const { operator } = get();

          // 1. Yüksek yetkili roller her göreve yazabilir
          if (ELEVATED_ROLES.includes(operator.role)) {
            return true;
          }

          // 2. Normal operatör — sadece kendisine atanmış görevlere yazabilir
          return operator.name.toUpperCase() === taskAssignedTo.toUpperCase();
        },

        isElevated: (): boolean => {
          const { operator } = get();
          return ELEVATED_ROLES.includes(operator.role);
        },
      }),
      { name: 'stp-operator' }
    ),
    { name: 'STP-OperatorStore', enabled: process.env.NODE_ENV !== 'production' }
  )
);
