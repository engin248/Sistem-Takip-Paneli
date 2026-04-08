import { supabase } from '@/lib/supabase';

export const logAudit = async (action: string, details: object) => {
  await supabase.from('audit_logs').insert([
    { action_code: action, details: details, timestamp: new Date().toISOString() }
  ]);
};
