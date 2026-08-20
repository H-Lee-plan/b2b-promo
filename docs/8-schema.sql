-- 온리원이벤트 스키마
-- 관련 문서: 8-erd.md, 1-domain-definition.md(v1.7) 4~7절, 3-prd.md(v1.4) 8절, 5-project-principle.md 2·3·7절
-- 마이그레이션 툴 없이 이 파일 1개로 관리한다(5-project-principle.md 7절). 시드 데이터는 seed.js 몫.
-- 이 파일이 최종 산출물이며, 실제 구현 시 내용 그대로 backend/src/infrastructure/db/schema.sql로 복사해 사용한다(두 경로는 같은 내용, 다른 위치일 뿐 별개 스키마가 아니다).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 회원(관리자/일반 참여자). 관리자 계정은 앱 회원가입이 아닌 시딩으로만 생성된다.
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role          text NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    company_name  text NOT NULL,
    name          text NOT NULL,
    phone         text NOT NULL
);

CREATE TABLE events (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title              text NOT NULL,
    description        text,
    target_type        text NOT NULL CHECK (target_type IN ('MEMBER_ONLY', 'GUEST_ONLY', 'COMMON')),
    participation_type text NOT NULL CHECK (participation_type IN ('SIMPLE', 'FORM', 'ROULETTE')),
    start_at           timestamptz NOT NULL,
    end_at             timestamptz NOT NULL,
    is_pinned          boolean NOT NULL DEFAULT false,
    status             text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ONGOING', 'CLOSED')),
    created_at         timestamptz NOT NULL DEFAULT now(),
    form_fields        jsonb                                                   -- 폼 제출형(FORM)에서만 사용. 관리자가 정의한 필드명 배열(예: ["회사명", "요청사항"])
);

-- 목록 정렬(마감임박순 + 상단노출 강조, 도메인 정의서 7절)용 인덱스
CREATE INDEX idx_events_list_order ON events (is_pinned DESC, end_at ASC);

-- 룰렛 게임형(participation_type = 'ROULETTE') 이벤트에만 사용되는 경품 후보. 그 외 참여 방식은 행이 없다.
CREATE TABLE prizes (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE, -- 이벤트 삭제 시 경품도 함께 정리(경품은 이벤트 없이 존재할 이유가 없음)
    name     text NOT NULL,
    weight   integer NOT NULL CHECK (weight >= 1)
);

CREATE TABLE entries (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT, -- 참여신청 이력 보존을 위해 이벤트 삭제 자체를 막는다(도메인상 이벤트는 종료만 하고 삭제하지 않음)
    user_id      uuid REFERENCES users(id) ON DELETE SET NULL,           -- 회원 탈퇴해도 신청 이력은 남기되 회원 연결만 해제
    guest_email  text,                                                    -- 비회원 식별 기준(도메인 정의서 5절). 회원이면 null
    guest_phone  text,
    guest_info   jsonb,
    form_data    jsonb,                                                   -- 폼 제출형(FORM)에서만 사용
    consented_at timestamptz NOT NULL,
    status       text NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'CANCELED', 'WON', 'LOST')),
    prize_id     uuid REFERENCES prizes(id) ON DELETE SET NULL,           -- 룰렛 게임형에서 확정된 경품 참조, 그 외 null
    applied_at   timestamptz NOT NULL DEFAULT now(),
    user_agent   text,                                                    -- 참여 요청의 User-Agent 그대로 저장(PRD 8절 모바일 참여 비중 집계용, 선택)
    consent_note text                                                     -- 관리자가 사후 작성하는 동의 보유 내용(FR-2.4). 참여 성립과 무관, 선택
);

-- (이벤트, 회원) 조합 유일 (도메인 정의서 5절, user_id가 null인 비회원 행은 제외)
-- 참여신청 INSERT는 이 인덱스를 ON CONFLICT 대상으로 지정해 예외 없이 충돌을 감지한다(5-project-principle.md 2절: 트랜잭션을 abort시키지 않기 위함)
CREATE UNIQUE INDEX uq_entries_event_user ON entries (event_id, user_id) WHERE user_id IS NOT NULL;
-- (이벤트, 비회원 이메일) 조합 유일 (guest_email이 null인 회원 행은 제외). guest_email은 애플리케이션 레이어에서 trim+소문자 정규화 후 저장한다(도메인 정의서 7절)
CREATE UNIQUE INDEX uq_entries_event_guest_email ON entries (event_id, guest_email) WHERE guest_email IS NOT NULL;
-- 이벤트별 참여신청 목록 조회(관리자 신청자 목록)용 인덱스
CREATE INDEX idx_entries_event_id ON entries (event_id);

CREATE TABLE refresh_tokens (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 회원 삭제 시 토큰도 함께 폐기
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL
);

-- refresh 재발급/회전 시 사용자별 토큰 조회용 인덱스
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
