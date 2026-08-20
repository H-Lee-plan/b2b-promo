// docs/10-style.md 2절 "상태값 → 색상 매핑" 표 그대로. tone은 components/Badge.jsx의 CSS 클래스 접미사다.
export const EVENT_STATUS_LABEL = { SCHEDULED: '등록', ONGOING: '진행중', CLOSED: '종료' };
export const EVENT_STATUS_TONE = { SCHEDULED: 'neutral', ONGOING: 'primary', CLOSED: 'muted' };

export const ENTRY_STATUS_LABEL = { APPLIED: '신청완료', CANCELED: '취소', WON: '당첨', LOST: '미당첨' };
export const ENTRY_STATUS_TONE = { APPLIED: 'primary', CANCELED: 'muted', WON: 'amber', LOST: 'neutral' };

export const TARGET_TYPE_LABEL = { MEMBER_ONLY: '회원 전용', GUEST_ONLY: '비회원 전용', COMMON: '공통' };
export const PARTICIPATION_TYPE_LABEL = { SIMPLE: '단순 참여', FORM: '폼 제출형', ROULETTE: '룰렛 게임형' };
