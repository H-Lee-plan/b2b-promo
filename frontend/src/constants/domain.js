// 백엔드 backend/src/domain/enums.js와 스펠링까지 동일하게 유지할 것 (모노레포/공유 패키지 금지)
export const TARGET_TYPE = { MEMBER_ONLY: 'MEMBER_ONLY', GUEST_ONLY: 'GUEST_ONLY', COMMON: 'COMMON' };
export const PARTICIPATION_TYPE = { SIMPLE: 'SIMPLE', FORM: 'FORM', ROULETTE: 'ROULETTE' };
export const EVENT_STATUS = { SCHEDULED: 'SCHEDULED', ONGOING: 'ONGOING', CLOSED: 'CLOSED' };
export const ENTRY_STATUS = { APPLIED: 'APPLIED', CANCELED: 'CANCELED', WON: 'WON', LOST: 'LOST' };
export const USER_ROLE = { ADMIN: 'ADMIN', MEMBER: 'MEMBER' };
