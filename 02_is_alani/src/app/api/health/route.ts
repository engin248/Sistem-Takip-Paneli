// src/app/api/health/route.ts
// GET /api/health — pipeline dashboard tarafından çağrılır
// health-check'e proxy — tek kaynak, iki endpoint

export { GET } from '../health-check/route';
