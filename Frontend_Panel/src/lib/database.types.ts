// ============================================================
// STP VERITABANI TİP TANIMLARI
// ============================================================
// Supabase public şemasındaki tabloların TypeScript tipleri.
// Tüm servisler bu dosyayı referans almalıdır.
// Kaynak: Canlı Supabase şeması (tesxmqhkegotxenoljzl)
// ============================================================

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          task_code: string;
          title: string;
          description: string | null;
          assigned_to: string;
          assigned_by: string;
          status: 'onay_bekliyor' | 'beklemede' | 'devam_ediyor' | 'dogrulama' | 'tamamlandi' | 'reddedildi' | 'iptal';
          priority: 'kritik' | 'yuksek' | 'normal' | 'dusuk';
          evidence_required: boolean;
          evidence_provided: boolean;
          evidence_urls: string[] | null;
          error_code: string | null;
          error_message: string | null;
          retry_count: number;
          started_at: string | null;
          completed_at: string | null;
          parent_task_id: string | null;
          metadata: Record<string, unknown>;
          is_archived: boolean;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_code: string;
          title: string;
          description?: string | null;
          assigned_to: string;
          assigned_by?: string;
          status?: string;
          priority?: string;
          evidence_required?: boolean;
          evidence_provided?: boolean;
          evidence_urls?: string[] | null;
          error_code?: string | null;
          error_message?: string | null;
          retry_count?: number;
          started_at?: string | null;
          completed_at?: string | null;
          parent_task_id?: string | null;
          metadata?: Record<string, unknown>;
          is_archived?: boolean;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          [K in keyof Database['public']['Tables']['tasks']['Row']]?: Database['public']['Tables']['tasks']['Row'][K] | (K extends 'status' | 'priority' ? string : never);
        };
      };
      audit_logs: {
        Row: {
          log_id: number;
          task_id: string | null;
          action_code: string;
          operator_id: string | null;
          details: Record<string, unknown>;
          timestamp: string;
        };
        Insert: {
          log_id?: number;
          task_id?: string | null;
          action_code: string;
          operator_id?: string | null;
          details: Record<string, unknown>;
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
      };
      board_decisions: {
        Row: {
          id: string;
          decision_code: string;
          title: string;
          description: string | null;
          category: 'DEPLOYMENT' | 'SCHEMA_CHANGE' | 'SECURITY' | 'ROLLBACK' | 'CONFIG_CHANGE';
          status: 'pending' | 'approved' | 'rejected' | 'sealed';
          requested_by: string;
          agent_strategic_vote: string | null;
          agent_strategic_reason: string | null;
          agent_strategic_confidence: number | null;
          agent_strategic_at: string | null;
          agent_technical_vote: string | null;
          agent_technical_reason: string | null;
          agent_technical_confidence: number | null;
          agent_technical_at: string | null;
          agent_security_vote: string | null;
          agent_security_reason: string | null;
          agent_security_confidence: number | null;
          agent_security_at: string | null;
          consensus_result: string | null;
          seal_hash: string | null;
          sealed_at: string | null;
          vote_source: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          decision_code: string;
          title: string;
          description?: string | null;
          category: string;
          status?: string;
          requested_by: string;
          agent_strategic_vote?: string | null;
          agent_strategic_reason?: string | null;
          agent_strategic_confidence?: number | null;
          agent_strategic_at?: string | null;
          agent_technical_vote?: string | null;
          agent_technical_reason?: string | null;
          agent_technical_confidence?: number | null;
          agent_technical_at?: string | null;
          agent_security_vote?: string | null;
          agent_security_reason?: string | null;
          agent_security_confidence?: number | null;
          agent_security_at?: string | null;
          consensus_result?: string | null;
          seal_hash?: string | null;
          sealed_at?: string | null;
          vote_source?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          [K in keyof Database['public']['Tables']['board_decisions']['Row']]?: string | number | boolean | null | Record<string, unknown>;
        };
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          body: string;
          severity: 'info' | 'warning' | 'error' | 'critical';
          channel: string;
          is_read: boolean;
          task_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      self_learning_logs: {
        Row: {
          id: string;
          error_code: string;
          pattern_type: string;
          frequency: number;
          context: Record<string, unknown>;
          recommendation: string | null;
          resolved: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['self_learning_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['self_learning_logs']['Row']>;
      };
    };
  };
}

// ── Kısayol Tip Aliasları ────────────────────────────────────
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type BoardDecisionRow = Database['public']['Tables']['board_decisions']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type SelfLearningRow = Database['public']['Tables']['self_learning_logs']['Row'];
