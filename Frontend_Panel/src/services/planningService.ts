// src/services/planningService.ts
import { logAudit } from '@/services/auditService';
import { agentRegistry } from '@/services/agentRegistry';
import { supabase } from '@/lib/supabase';

export interface PlanItem {
  id: string;
  title: string;
  description?: string;
  assignee?: string; // agent id
  created_at: string;
  start_at?: string;
  due_at?: string;
  status: 'scheduled' | 'assigned' | 'in_progress' | 'done' | 'cancelled';
}

const plans: PlanItem[] = [];

function generateId(): string {
  return `P-${String(plans.length + 1).padStart(3, '0')}`;
}

export function createPlan(data: { title: string; description?: string; assignee?: string; start_at?: string; due_at?: string }): PlanItem {
  const id = generateId();
  const now = new Date().toISOString();
  const plan: PlanItem = {
    id,
    title: data.title,
    description: data.description,
    assignee: data.assignee,
    created_at: now,
    start_at: data.start_at,
    due_at: data.due_at,
    status: data.assignee ? 'assigned' : 'scheduled',
  };
  plans.push(plan);

  // Persist to Supabase plans table (if available)
  void (async () => {
    try {
      await supabase.from('plans').insert([{ plan_id: id, title: plan.title, description: plan.description || null, assignee: plan.assignee || null, status: plan.status, created_at: plan.created_at }]);
    } catch {
      // ignore DB errors — audit still recorded
    }
  })();

  void logAudit({
    operation_type: 'EXECUTE',
    action_description: `Plan oluşturuldu: ${id} — ${plan.title}`,
    metadata: { action_code: 'PLAN_CREATE', plan_id: id, assignee: plan.assignee },
  }).catch(() => {});

  // If assigned to an agent, update agent stats (mark assigned)
  if (plan.assignee) {
    const a = agentRegistry.getById(plan.assignee);
    if (a) {
      agentRegistry.updateDurum(a.id, 'aktif');
    }
  }

  return plan;
}

export function getPlans(): PlanItem[] {
  return plans.slice().reverse();
}

export function getPlanById(id: string): PlanItem | undefined {
  return plans.find(p => p.id === id);
}

export function assignPlan(id: string, agentId: string): boolean {
  const p = getPlanById(id);
  if (!p) return false;
  p.assignee = agentId;
  p.status = 'assigned';
  // Persist assignment to DB
  void (async () => {
    try {
      await supabase.from('plans').upsert({ plan_id: p.id, title: p.title, description: p.description || null, assignee: p.assignee, status: p.status, created_at: p.created_at }, { onConflict: 'plan_id' });
    } catch {
      // ignore
    }
  })();

  void logAudit({ operation_type: 'EXECUTE', action_description: `Plan ${id} atandı → ${agentId}`, metadata: { action_code: 'PLAN_ASSIGN', plan_id: id, agent: agentId } }).catch(() => {});
  agentRegistry.updateDurum(agentId, 'aktif');
  return true;
}
