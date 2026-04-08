import { create } from 'zustand';

// ============================================================
// OPERATÖR KİMLİK DEPOSU
// ============================================================
// Aktif operatörün kimliğini yönetir.
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
}

// ── YÜKSEK YETKİLİ ROLLER — tüm görevlere yazma erişimi ────
const ELEVATED_ROLES: OperatorRole[] = ['YÖNETİCİ', 'ADMIN'];

export const useOperatorStore = create<OperatorState>((set, get) => ({
  // Varsayılan operatör — ilk kurulumda değiştirilmelidir
  operator: {
    name: 'SISTEM',
    role: 'SİSTEM',
  },

  setOperator: (operator) => set({ operator }),

  canWrite: (taskAssignedTo: string): boolean => {
    const { operator } = get();

    // 1. Yüksek yetkili roller her göreve yazabilir
    if (ELEVATED_ROLES.includes(operator.role)) {
      return true;
    }

    // 2. Normal operatör — sadece kendisine atanmış görevlere yazabilir
    return operator.name.toUpperCase() === taskAssignedTo.toUpperCase();
  },
}));
