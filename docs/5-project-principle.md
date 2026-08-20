# 프로젝트 구조 설계 원칙: 온리원이벤트

## 변경이력
| 버전 | 일시 | 변경 내용 |
|---|---|---|
| v1.1 | 2026-08-13 | 참여신청 중복 판정을 UNIQUE 위반 예외 catch 방식에서 `INSERT ... ON CONFLICT`로 교체(예외 catch는 PostgreSQL 트랜잭션을 abort시켜 같은 트랜잭션 내 룰렛 추첨이 실패하는 문제가 있었음), 쿼리 함수의 트랜잭션 재사용 패턴(pool/client 공용 인터페이스, release 누락 방지) 명시 |
| v1.2 | 2026-08-13 | swagger.json 신규 작성에 따른 교차 검토 반영: 1절의 "에러 코드 4개"를 PRD 4절/5절이 이미 확정한 실제 개수(비즈니스 4종 + VALIDATION_ERROR + INTERNAL_ERROR = 6개)와 일치하도록 수정 |
| v1.3 | 2026-08-13 | 환경변수명을 `DATABASE_URL`에서 `DB_CONN_STRING`으로 확정(PRD v1.5와 동일), `.env` 위치를 `backend/.env`로 명시 |
| v1.4 | 2026-08-13 | 실제 구현 중 `PORT`(기본 3000), `FRONTEND_ORIGIN`(기본 `http://localhost:5173`) 선택 환경변수 추가. 5개 필수 변수와 구분해 명시, CORS 설정을 하드코딩에서 `FRONTEND_ORIGIN` 참조로 변경 |
| v1.5 | 2026-08-14 | docs 정합성 재검토: PRD 참조 버전을 실제 최신본(v1.6)으로 갱신 |
| v1.6 | 2026-08-14 | **백엔드 한정 예외 명시**: `backend/CLAUDE.md`가 SOLID·Clean Architecture를 명시적으로 요구함에 따라, 백엔드는 실제로 이 문서 1절의 "레이어 3개 고정" 원칙을 적용하지 않고 domain/application/infrastructure/interfaces 4계층 구조로 구현되어 있다(사용자의 명시적 선택). 이 문서 1·2·6절의 백엔드 레이어·디렉토리 서술은 최초 설계 의도를 보여주는 기록으로 남기되, **실제 백엔드 구조의 최종 근거는 `backend/CLAUDE.md`와 실제 코드**이며 이 문서와 충돌할 경우 그쪽을 따른다. 프론트엔드(FE) 관련 원칙은 이 변경의 영향을 받지 않는다 |
| v1.7 | 2026-08-20 | 사용자 요청으로 P0/P1 우선순위 구분 제거(PRD v1.7과 정합) — 1절의 "참여 방식 2종(P0)"/"P1 폼 제출형 추가" 표현 정리, 6·7절 디렉토리 트리의 `# P0`/`[P1]` 태그 전부 제거(우선순위가 아니라 9-plan.md 체크박스로 구현 여부를 추적). 6·7절은 v1.6에 따라 여전히 최초 설계 의도의 기록이며, 실제 백엔드 구조의 최종 근거는 `backend/CLAUDE.md`다 |
| v1.8 | 2026-08-20 | 사용자 요청으로 JWT 시크릿을 `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` 2개에서 `JWT_SECRET` 1개로 통합(**Access/Refresh가 같은 시크릿을 공유하도록 보안 설계 변경** — 하나가 유출되면 다른 토큰도 위조 가능해짐, 사용자가 트레이드오프를 인지하고 명시적으로 선택). 만료 시간을 하드코딩(`1h`/`14d`)에서 `JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN` 환경변수로 뺌(기본값은 기존과 동일하게 유지, PRD의 Refresh 14일 규칙 변경 없음). 필수 환경변수가 5개에서 4개로 줄어듦 |
| v1.9 | 2026-08-20 | 백엔드 실구현 대비 정합성 감사 반영: (1) 이벤트 삭제(FR-2.6/BE-12) 도입으로 실제 에러 코드가 7개(`EVENT_HAS_ENTRIES` 추가)인데 "6개"로 남아있던 서술 전체 수정, (2) 연락처 형식 검증 언급이 실제로는 필수값 검증만 하는 코드와 달라 문구 수정, (3) PRD 참조 버전을 v1.6→v1.8로 갱신 |
| v1.10 | 2026-08-20 | 프론트엔드 FE-1~FE-14 완료(실제 구현 완성)에 따른 정합성 감사 반영: 6절 프론트엔드 디렉토리 트리를 실제 최종 구조로 갱신(`statusLabels.js`/`toastStore.js`/`mypageApi.js`/`queryClient.js`/`Badge.jsx`/`ConfirmDialog.jsx`/`RequireAuth.jsx`/`RequireAdmin.jsx`/`styles/` 등 실제로 만들어진 파일 추가, 실제로는 만들지 않고 인라인 편집으로 대체한 `AdminConsentNotePage.jsx` 서술 정정). "아직 구현되지 않은 파일도 미리 정해둔 것" 문구를 "실제 구현 기준"으로 수정(더 이상 계획 단계가 아님). 부수적으로 다른 문서들에 남아있던 "도메인 정의서 v1.7" 참조를 실제 최신본 v1.8로 갱신(1·3·4·7·8절 관련 문서 목록) |

- 관련 문서: [1-domain-definition.md](./1-domain-definition.md)(도메인 정의서 v1.8), [2-usecase.md](./2-usecase.md), [3-prd.md](./3-prd.md)(PRD v1.8), [4-user-scenario.md](./4-user-scenario.md)
- **이 문서의 역할**: PRD 4절에서 이미 확정된 기술 스택(React 19 + Zustand + TanStack Query / Node.js + Express + `pg` / PostgreSQL 17 / 쿠키 없는 Access·Refresh JWT)을 그대로 전제하고, "그 스택으로 코드를 어떻게 배치할지"만 다룬다. 스택 재논의·신규 도구 도입 제안은 이 문서의 범위가 아니다.

## 1. 모든 스택에 공통인 최상위 원칙

- **필요해지기 전에는 만들지 않는다.** 폼 제출형(FR-2.3), 마이페이지(FR-2.1/2.2), 동의 메모(FR-2.4), rate limit(FR-2.5), 삭제/엑셀 다운로드(FR-2.6) 같은 후행 기능은 6·7절 트리에 파일명과 책임만 미리 표시해 두되, 실제 폴더·코드는 착수 시점에 만든다. 지금 빈 폴더나 빈 파일을 미리 파 두지 않는다 — PRD가 이미 "3일 안에 실제로 쓰는 것만" 우선 확정했기 때문에, 코드 구조도 같은 기준을 따라야 나중에 버릴 코드가 없다.
- **레이어는 3개로 고정한다(프론트: 화면-상태-API, 백엔드: 라우트-핸들러-쿼리).** 서비스/리포지토리/유스케이스 같은 중간 레이어를 추가하지 않는다 — 테이블 5개, API 10여 개 규모에서 레이어를 늘리면 코드를 찾는 시간이 로직을 짜는 시간보다 길어진다.
- **도메인 규칙은 문서(도메인 정의서 6~8절)의 표현 그대로 코드 한 곳에만 존재한다.** 같은 검증(대상유형 불일치, 동의 필수, 중복 방지)을 프론트·백엔드 양쪽에 구현하되, 서버 쪽이 항상 최종 판정이며 프론트 검증은 UX용 사본일 뿐임을 주석 등으로 명시하지 않아도 되게, 서버 검증 로직을 함수 하나로 모아 재사용한다(레이어 2 참고).
- **설정 가능한 값을 늘리지 않는다.** 환경변수 4개, 에러 코드 7개, 참여 방식 3종(단순/폼 제출형/룰렛)처럼 PRD가 정한 목록 밖의 옵션·플래그·전략 패턴을 만들지 않는다. 목록이 실제로 늘어나는 시점에 그때 확장한다.
- **파일·폴더는 기능이 생길 때 만든다.** 빈 `services/`, `utils/`, `hooks/` 같은 범용 폴더를 미리 만들지 않고, 실제로 두 번째로 재사용되는 코드가 나올 때 그 코드를 옮길 폴더를 만든다.

## 2. 의존성/레이어 원칙

**프론트엔드: 화면(Pages) → 상태/API 훅 → API 클라이언트**
- Pages는 `fetch`/axios를 직접 호출하지 않는다. 반드시 TanStack Query 훅(`useQuery`/`useMutation`)을 거치고, 그 훅은 `api/*.js`의 함수만 호출한다. 서버 데이터는 전부 TanStack Query 캐시가 원본이며, Zustand는 오직 인증 토큰/로그인 사용자 정보(로컬 클라이언트 상태)만 보관한다 — PRD 4절이 이미 "서버 상태는 TanStack Query 전부"로 역할을 나눠놨으므로 두 스토어가 같은 데이터를 중복 보관하지 않게 강제한다.
- API 클라이언트(`api/client.js`)만 Zustand의 토큰을 읽어 헤더에 싣고, 401 시 Refresh 후 재시도한다. Pages/컴포넌트가 토큰 값을 직접 다루지 않는다.
- 의존 방향은 단방향(Pages → 훅 → api client)이며 역방향 참조(예: api 클라이언트가 특정 페이지를 import)는 금지.

**백엔드: 라우트 → 핸들러 → 쿼리**
- 라우트 파일은 URL·미들웨어 연결만 하고 로직이 없다.
- **도메인 규칙(이벤트 상태 lazy 계산, 대상유형 검증, 동의 필수, 룰렛 가중치 추첨, 중복 신청 분기)은 전부 핸들러 레이어에서 검증한다.** 쿼리 레이어는 SQL 실행과 snake_case↔camelCase 변환만 하고 비즈니스 판단을 하지 않는다 — ORM이 없어 쿼리 함수가 "그냥 SQL 실행기"로 남아야 어디에 무슨 규칙이 있는지 한눈에 찾을 수 있다(규칙을 쿼리 파일에 흩어두면 SQL과 비즈니스 로직이 섞여 3일 안에 디버깅이 안 된다).
- DB 접근은 오직 `db/queries/*.js`를 통해서만 한다. 핸들러가 `pool.query(...)`를 직접 호출하지 않는다(트랜잭션이 필요한 참여신청 처리만 예외로, 핸들러가 커넥션을 받아 여러 쿼리 함수에 넘겨 같은 트랜잭션으로 묶는다 — 룰렛 확정은 도메인 6절에 따라 반드시 단일 트랜잭션이어야 하므로). 쿼리 함수는 첫 인자로 실행 주체(`pool` 또는 트랜잭션 `client`, 둘 다 `pg`의 동일한 `.query()` 인터페이스)를 받아 트랜잭션 여부와 무관하게 같은 함수를 재사용한다. 트랜잭션은 `pool.connect()` → `BEGIN` → 쿼리들 → `COMMIT`, 에러 시 `ROLLBACK`, `finally`에서 반드시 `client.release()`한다(release 누락은 커넥션 풀 고갈로 이어진다).
- **중복 신청 판정은 예외 catch가 아니라 `INSERT ... ON CONFLICT (event_id, user_id/guest_email) DO NOTHING RETURNING id`로 처리한다.** PostgreSQL은 트랜잭션 도중 제약 위반 에러가 나면 그 트랜잭션 전체가 abort 상태가 되어 `ROLLBACK` 없이는 같은 트랜잭션의 이후 쿼리(룰렛 추첨 등)가 전부 실패한다 — "UNIQUE 위반을 catch하고 같은 트랜잭션에서 계속 진행"하는 설계는 코드가 되는 순간 깨진다. `ON CONFLICT`는 예외를 던지지 않으므로 반환 행이 없을 때만 기존 레코드 상태를 조회해 `APPLIED/WON/LOST`면 `DUPLICATE_ENTRY` 거부, `CANCELED`면 같은 트랜잭션에서 `UPDATE`로 재신청 전환한다.
- 별도의 "서비스" 레이어를 추가하지 않는다. 핸들러 함수 자체가 "요청 파싱 → 도메인 규칙 검증 → 쿼리 호출 → 응답 변환"을 순서대로 수행하는 것으로 충분하다(함수당 5~6단계 이내, 이 이상 길어지면 그때 분리).

## 3. 코드/네이밍 원칙

- **파일명은 캐멀케이스(camelCase)로 통일한다.** 백엔드는 `기능Routes.js` / `기능Handlers.js` / `기능Queries.js` 3분할(예: `entriesRoutes.js`, `entriesHandlers.js`, `entriesQueries.js`). 프론트는 API 함수 단위 `xxxApi.js`(예: `eventsApi.js`). 단, React 컴포넌트 파일(`pages/`, `components/`)은 PascalCase를 그대로 쓴다(`EventListPage.jsx`) — 이는 camelCase의 예외가 아니라 React 생태계 표준 컴포넌트 네이밍이므로 그대로 따른다. 점(`.`)으로 구분하는 kebab/dot 표기(`entries.routes.js` 등)는 쓰지 않는다.
- **JS/JSX만 사용, TypeScript는 도입하지 않는다.** PRD 4절 기술 스택에 TypeScript가 명시되어 있지 않으므로 타입 시스템·빌드 설정·`.d.ts` 관리 부담을 추가하지 않는다(오버엔지니어링 금지 원칙). 컴포넌트는 `.jsx`, 그 외 모듈은 `.js`를 쓴다.
- **함수명**: 도메인 정의서 3절 유스케이스 동사를 그대로 쓴다(`applyToEvent`, `closeEvent`, `cancelEntry`, `drawPrize`) — "핸들러 이름만 봐도 어떤 유스케이스인지" 알 수 있어야 도메인 문서와 코드가 따로 놀지 않는다.
- **DB 컬럼(snake_case) ↔ JS 필드(camelCase) 변환**은 쿼리 레이어의 출구 한 곳에서만 한다. 쿼리 함수는 SQL 결과 row를 camelCase 객체로 변환해 반환하고, 그 위 레이어(핸들러/프론트)는 snake_case를 절대 보지 않는다. 변환 함수는 `db/rowMapper.js` 하나로 공유(엔티티마다 매핑 함수를 새로 만들지 않고, 컬럼명 규칙이 `camelCase→snake_case` 기계적 변환이므로 범용 유틸 하나로 충분).
- **도메인 용어(Enum) 코드 표기**: 도메인 정의서 2절 Enum 값(참여 대상 유형/참여 방식/이벤트 상태/참여신청 상태)은 한글 값을 그대로 DB에 저장하지 않고, 코드 전역에서 아래 표기로 통일한다(문서의 한글 용어 ↔ 코드 상수를 1:1 고정해 어디서든 같은 스펠링을 쓰게 한다).

| 도메인 용어 | 코드 상수 |
|---|---|
| 회원 전용/비회원 전용/공통 | `MEMBER_ONLY` / `GUEST_ONLY` / `COMMON` |
| 단순 참여/폼 제출형/룰렛 게임형 | `SIMPLE` / `FORM` / `ROULETTE` |
| 등록/진행중/종료 | `SCHEDULED` / `ONGOING` / `CLOSED` |
| 신청완료/취소/당첨/미당첨 | `APPLIED` / `CANCELED` / `WON` / `LOST` |
| 관리자/일반 참여자 | `ADMIN` / `MEMBER` |

- 이 상수는 프론트·백엔드 각각 한 군데(백엔드는 `shared/enums.js`, 프론트는 같은 값을 `constants/domain.js`에 복사)에만 선언한다. 코드 공유 패키지(모노레포 workspace 등)는 3일 프로젝트에 과하므로 값 복사로 충분히 해결한다.

## 4. 테스트/품질 원칙

PRD 7절 결정("테스트 자동화 스위트 없음, 룰렛 가중치 추첨과 중복 신청 방지만 자체 체크")을 그대로 따른다.

- **테스트한다**: (1) 룰렛 가중치 추첨 함수 — weight 합계 대비 각 경품이 대략 비례해서 뽑히는지, weight 0/음수를 거부하는지. (2) 중복 신청 판정 분기 — `INSERT ... ON CONFLICT` 반환 행이 없을 때 기존 상태가 `신청완료/당첨/미당첨`이면 거부, `취소`면 재신청 처리로 되돌리는지. 이 두 가지는 "돈(경품)과 데이터 정합성"이 걸려 있어 버그가 나면 운영 중 되돌릴 수 없다.
- **테스트하지 않는다**: 화면 렌더링, API 라우팅, 이벤트 CRUD, 인증 흐름 등 나머지 전부. 수동으로 브라우저에서 눈으로 확인한다(PRD 6절 일차별 완료 기준이 이미 "브라우저에서 동작 확인"으로 정의되어 있음).
- **형태**: Jest 등 테스트 프레임워크를 새로 설치하지 않는다. Node 내장 `assert` + `node --test`(Node 18+ 내장 테스트 러너)로 파일 2개(`drawPrize.test.js`, `duplicateEntry.test.js`)만 작성한다. 커버리지 목표, 테스트 피라미드, E2E 도구는 도입하지 않는다.

## 5. 설정/보안/운영 원칙

- **환경변수**: `backend/.env` 1개, PRD 4절의 4개 **필수** 변수(`DB_CONN_STRING`, `JWT_SECRET`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`)는 하나라도 없으면 부팅을 즉시 실패시킨다(`config/env.js`). `JWT_ACCESS_EXPIRES_IN`(기본 `1h`), `JWT_REFRESH_EXPIRES_IN`(기본 `14d`), `PORT`(기본 3000), `FRONTEND_ORIGIN`(기본 `http://localhost:5173`)은 **선택** 변수로, 코드에 기본값을 두고 `.env`에 없어도 부팅이 실패하지 않는다 — 로컬 포트·프론트 개발 서버 주소처럼 환경마다 달라질 수 있는 값이라 필수 목록에 넣지 않는다.
- **`.env`는 절대 커밋하지 않는다.** 루트 `.gitignore`에 `.env`가 이미 등록되어 있으므로 그대로 유지하고, 실제 값 대신 키 이름과 예시만 담은 `.env.example`을 커밋해 팀/재설치 시 참고하게 한다. 시크릿이 코드/문서/커밋 이력에 절대 남지 않는 것이 3일짜리 프로젝트에서도 유일하게 타협 불가한 운영 규칙이다.
- **환경 분리**: 별도의 `.env.development`/`.env.production` 다중 파일 체계를 만들지 않는다. 로컬과 운영 모두 같은 키를 값만 바꿔 쓰는 `.env` 하나로 충분(스테이징 환경 자체가 없음).
- **JWT**: HS256으로 서명하고 Access/Refresh 모두 단일 시크릿(`JWT_SECRET`)으로 서명한다(사용자의 명시적 선택 — v1.8). 만료 시간은 `JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN` 환경변수로 설정한다. payload에는 `userId`/`role`만 담고 이메일 등 개인정보는 넣지 않는다(토큰은 클라이언트에 그대로 저장되는 값이므로). 서명 검증은 `middleware/auth.js` 한 곳에서만 하고, 나머지 코드는 이 미들웨어를 통과한 `req.user`만 신뢰한다.
- **비밀번호 해시**: bcrypt, salt rounds 10. 이 규모의 트래픽에서 rounds를 더 올려 로그인 응답을 늦출 이유가 없다. 평문 비밀번호는 로그·에러 메시지 어디에도 남기지 않는다.
- **CORS**: 운영에서는 Express가 프론트 빌드(`dist/`)를 같은 오리진으로 정적 서빙하므로(4절 배포) CORS 설정 자체가 필요 없다. 로컬 개발에서만 Vite dev 서버(다른 포트)가 API를 호출하므로, 개발 환경(`NODE_ENV !== 'production'`)에 한해 `cors` 미들웨어에 `FRONTEND_ORIGIN`(기본값 `http://localhost:5173`) 오리진 하나만 허용 목록으로 넣는다. 쿠키를 쓰지 않으므로(4절) `credentials: true`나 와일드카드(`*`)는 쓰지 않는다.
- **에러 핸들링**: PRD 4절 포맷 `{ "error": { "code": "STRING_CODE", "message": "..." } }`을 Express 공통 에러 미들웨어 1개(`middleware/errorHandler.js`)에서만 생성한다. 개별 핸들러는 `throw new AppError('DUPLICATE_ENTRY', '...')` 형태로 던지기만 하고 응답 형식을 직접 만들지 않는다. 비즈니스 에러 코드 5개(`DUPLICATE_ENTRY`/`TARGET_TYPE_MISMATCH`/`EVENT_CLOSED`/`CONSENT_REQUIRED`/`EVENT_HAS_ENTRIES`)에 입력 검증 실패용 `VALIDATION_ERROR`(400)를 더한다. 그 외 예상 못한 예외는 전부 이 미들웨어가 500 + `INTERNAL_ERROR`로 통일 응답하고, 실제 에러 스택은 서버 로그에만 남기며 클라이언트 응답에는 절대 포함하지 않는다.
- **로깅**: Winston/Pino 등 로깅 라이브러리를 도입하지 않는다. 요청 단위로 `메서드 경로 상태코드 응답시간`을 한 줄 남기는 미들웨어 하나(5줄 내외)와, 500 에러 발생 시 스택을 `console.error`로 남기는 것으로 충분하다. 비밀번호·JWT 토큰·이메일/연락처 등 개인정보는 어떤 로그에도 남기지 않는다. 로그는 파일로 수집하지 않고 `pm2`의 표준출력 로그(`pm2 logs`)로 확인한다 — 3일 프로젝트에 로그 수집 인프라(ELK 등)는 과하다.
- **입력 검증**: Zod/Joi 같은 검증 라이브러리를 도입하지 않는다. 각 핸들러 진입부에서 필수 필드 존재 여부와 도메인 정의서 4절의 형식 규칙(이메일 형식, 비밀번호 8자 이상, `weight` 1 이상 정수)만 if문으로 직접 검사하고 연락처는 필수값 여부만 확인하며, 실패 시 `VALIDATION_ERROR`(400)로 응답한다. 검증 로직이 늘어나 핸들러가 지저분해지는 시점(예: 필드 5개 이상)이 오면 그때 해당 엔티티 하나에 한해 검증 함수를 분리한다.
- **인증/보안(그 외)**: Refresh Token은 해시로 `refresh_tokens` 테이블에 저장 후 재발급 시 회전. 관리자 API는 라우트 진입 시 role 미들웨어로 검증. 이 항목들은 PRD 7절에서 "절대 간소화 대상 아님"으로 못박혔으므로 축소하지 않는다. 반대로 재사용 탐지/전기기 로그아웃/Redis 세션 저장소는 PRD가 명시적으로 배제했으므로 추가하지 않는다.
- **배포**: 단일 VM, Express가 프론트 빌드 결과(`dist/`)를 정적 서빙, Caddy가 리버스 프록시+자동 TLS, `pm2`가 프로세스 관리. Docker/오케스트레이션 도입하지 않는다. 배포 스크립트는 `npm run build && pm2 restart` 수준의 셸 커맨드 몇 줄로 충분하며 별도 CI/CD 파이프라인을 구성하지 않는다.

## 6. 프론트엔드 디렉토리 구조

```
frontend/
  src/
    main.jsx                     # 앱 진입점, bootstrapAuth(silent refresh) 완료 후 렌더링
    App.jsx                      # 라우팅 정의(RequireAuth/RequireAdmin 가드 포함)
    constants/
      domain.js                  # Enum 상수(3절 표: targetType/participationType/status 등)
      statusLabels.js            # Enum → 한글 라벨/뱃지 톤 매핑(EVENT_STATUS_LABEL 등)
    store/
      authStore.js               # zustand: accessToken/refreshToken/user, persist(localStorage)
      toastStore.js               # zustand: 공통 Toast 상태(showError/showSuccess)
    api/
      client.js                  # fetch 래퍼, 401 인터셉트 + refresh 재시도(동시 요청 시 재발급 중복 방지)
      authApi.js                 # signup/login/logout/refresh
      eventsApi.js               # 목록/상세/등록/수정/종료/삭제
      entriesApi.js              # 참여신청 생성/목록/동의 보유 내용 작성/CSV 다운로드
      mypageApi.js                # 본인 참여 내역/취소/프로필 조회·수정/비밀번호 변경
    pages/
      events/
        EventListPage.jsx
        EventDetailPage.jsx      # 회원/비회원 참여 폼 분기, 폼 제출형은 FormFieldsInput 포함
        RouletteResultPage.jsx
      auth/
        LoginPage.jsx
        SignupPage.jsx
      admin/
        AdminLoginPage.jsx
        AdminEventListPage.jsx   # 종료·삭제 버튼 포함(삭제는 참여신청 0건일 때만 활성화, FR-2.6)
        AdminEventFormPage.jsx   # 등록/수정 공용, 룰렛 경품·폼 필드 입력 포함
        AdminEntryListPage.jsx   # 참여신청 건별 동의 보유 내용 인라인 편집(FR-2.4) + CSV 다운로드(FR-2.6)
      mypage/                    # FR-2.1/2.2
        MyEntriesPage.jsx        # 참여 내역/당첨 결과 조회 + 신청 취소(FR-2.2, 룰렛은 버튼 미노출)
        MyProfilePage.jsx        # 내 정보 조회/수정, 비밀번호 변경
    components/
      Toast.jsx                  # 공통 에러 토스트 1개(에러 코드 7종 공용)
      ConsentCheckbox.jsx        # 동의 문구 + 보유기간 고지 (회원/비회원 공용)
      FormFieldsInput.jsx        # FR-2.3 폼 제출형 이벤트의 관리자 정의 필드 입력(EventDetailPage에서 참여방식이 폼 제출형일 때만 사용)
      Badge.jsx                  # 이벤트/참여신청 상태 뱃지 공용
      ConfirmDialog.jsx          # 되돌릴 수 없는 액션(종료/삭제) 확인 다이얼로그 공용
      RequireAuth.jsx            # 로그인 필요 라우트 가드(mypage)
      RequireAdmin.jsx           # 관리자 전용 라우트 가드(admin)
    lib/
      format.js                  # 날짜/D-day 표시 포맷 등 최소 유틸
      queryClient.js             # TanStack Query 클라이언트(전역 에러 → Toast 연동)
      exportCsv.js                # FR-2.6 참여자 명단 CSV 다운로드(AdminEntryListPage에서 사용)
    styles/
      tokens.css                 # 10-style.md 2·3·4·5·7절 색상/타이포/간격/모서리/모션 토큰
      button.css                 # 공용 버튼 스타일
```

- FE-1~FE-14가 전부 완료되어 위 구조는 계획이 아니라 실제 구현 기준이다. `AdminConsentNotePage.jsx`는 별도 파일로 만들지 않고 `AdminEntryListPage.jsx` 내 인라인 편집(`ConsentNoteCell`)으로 구현했다(9-plan.md FE-13 완료조건 참고 — 계획 단계에서 이미 "또는 인라인 편집"을 허용해 두었다).
- `hooks/` 같은 범용 폴더는 두지 않는다. TanStack Query 훅은 각 `pages/*.jsx` 파일 상단에서 `api/*.js` 함수를 직접 `useQuery`/`useMutation`으로 감싸 쓴다(화면이 딱 8개뿐이라 재사용 훅 추출은 두 번째 사용처가 생길 때 판단).

## 7. 백엔드 디렉토리 구조

```
backend/
  src/
    server.js                    # express 초기화, 정적 서빙, 라우트 마운트
    config/
      env.js                     # .env 5개 변수 로드 및 검증
    db/
      pool.js                    # pg Pool
      schema.sql                 # users/events/prizes/entries/refresh_tokens + UNIQUE 제약(내용은 docs/8-schema.sql을 그대로 복사)
      seed.js                    # 관리자 계정 시딩(FR-1.0, bcrypt)
      rowMapper.js                # snake_case row → camelCase 객체 변환 공용 함수
    shared/
      enums.js                   # 3절 표의 Enum 상수(참여 대상유형/참여방식/상태 등)
      errors.js                  # AppError 클래스 + 7개 에러 코드 상수(비즈니스 5 + VALIDATION_ERROR + INTERNAL_ERROR)
    middleware/
      auth.js                    # JWT 검증 + role 체크
      errorHandler.js            # 공통 에러 응답 포맷 생성 (VALIDATION_ERROR/INTERNAL_ERROR 포함)
      requestLogger.js           # 메서드/경로/상태코드/응답시간 한 줄 로그
      rateLimiter.js             # FR-2.5 로그인 시도 rate limit (/auth/login에만 적용)
    routes/
      authRoutes.js
      eventsRoutes.js
      entriesRoutes.js
      mypageRoutes.js            # FR-2.1/2.2
    handlers/
      authHandlers.js            # signup/login/logout/refresh
      eventsHandlers.js          # 목록(정렬)/상세/등록/수정/종료, 상태 lazy 계산. CSV 다운로드용 전체 조회는 FR-2.6
      entriesHandlers.js         # 참여신청(대상유형·동의·중복 검증 + 룰렛 추첨, 트랜잭션), 목록 조회. 동의 보유 내용 작성(PATCH)은 FR-2.4, 폼 제출형 formData 검증은 FR-2.3
      mypageHandlers.js          # FR-2.1(참여내역·정보수정·비번변경)/FR-2.2(취소·재신청, 룰렛은 거부)
    db/queries/
      usersQueries.js
      eventsQueries.js
      prizesQueries.js
      entriesQueries.js
      refreshTokensQueries.js
    test/
      drawPrize.test.js          # 룰렛 가중치 추첨 자체 체크
      duplicateEntry.test.js     # 중복 신청 분기 자체 체크
```

- `handlers/entriesHandlers.js`가 도메인 정의서 6~8절 규칙(동의 필수, 대상유형 검증, 이벤트 상태 검증, 중복 판정, 가중치 추첨, 트랜잭션 확정)을 전부 담당하는 가장 무거운 파일이 되는 것은 의도된 결과다 — 참여신청이 이 프로젝트의 핵심 유스케이스이므로 규칙이 한 파일에 모여 있는 편이 흩어놓는 것보다 3일 안에 검증하기 쉽다.
- 아직 구현되지 않은 파일·엔드포인트도 이름과 책임만 미리 정해둔 것이며, 실제 코드는 착수 시점에 작성한다(1절 원칙). `mypageHandlers.js`의 취소/재신청은 도메인 6절 규칙(룰렛 게임형은 취소 불가, 재신청은 상태 전환)을 그대로 따른다.
