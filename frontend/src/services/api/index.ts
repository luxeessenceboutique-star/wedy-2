// Barrel re-export — lets existing call sites migrate with a single import-path
// change (`from '.../lib/api'` → `from '@/services/api'`) instead of having to
// know which domain module each symbol now lives in.
export * from './client';
export * from './auth';
export * from './employees';
export * from './departments';
export * from './contractTypes';
export * from './templates';
export * from './documents';
export * from './dashboard';
export * from './requests';
export * from './leaves';
export * from './analytics';
export * from './copilot';
export * from './payroll';
export * from './auditLogs';
export * from './interns';
export * from './cv';
export * from './performance';
export * from './users';
export * from './assets';
export * from './notifications';
export * from './webhooks';
export * from './orgchart';
export * from './recruitment';
export * from './visio';
export * from './planningNotes';
