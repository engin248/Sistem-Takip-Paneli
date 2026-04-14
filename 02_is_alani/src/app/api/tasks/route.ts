// ============================================================
// TASKS API ROUTE — Orkestratör
// ============================================================
// GET  → taskQueryHandler.ts  (list | agents | suggest | auto-assign)
// POST → taskMutationHandler.ts (görev oluştur)
// PUT  → taskMutationHandler.ts (görev güncelle)
// DELETE → taskMutationHandler.ts (görev sil)
// ============================================================

import { type NextRequest } from 'next/server';
import { handleTaskQuery } from './taskQueryHandler';
import { handleTaskCreate, handleTaskUpdate, handleTaskDelete } from './taskMutationHandler';

export const GET = (req: NextRequest) => handleTaskQuery(req);
export const POST = (req: NextRequest) => handleTaskCreate(req);
export const PUT = (req: NextRequest) => handleTaskUpdate(req);
export const DELETE = (req: NextRequest) => handleTaskDelete(req);
