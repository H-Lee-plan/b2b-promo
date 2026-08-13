# 기술 아키텍처 다이어그램: 온리원이벤트

- 버전: v1.0 (2026-08-13)
- 관련 문서: [3-prd.md](./3-prd.md)(PRD v1.3 4절 기술 스택/아키텍처 개요, 6절 일정), [5-project-principle.md](./5-project-principle.md)(프로젝트 구조 설계 원칙)
- **이 문서의 역할**: 기술 스택을 새로 정하거나 재논의하지 않는다. PRD 4절·5절 문서에서 이미 확정된 스택(단일 VM + Caddy + Express + PostgreSQL, React 19 SPA, 레이어 3개 고정)을 그대로 전제하고, "이미 정해진 것들이 어떻게 배치·연결되는지"만 Mermaid로 시각화한다. 1인 개발/3일 일정, 오버엔지니어링 금지 원칙에 따라 실제로 쓰지 않는 컴포넌트(큐, 캐시, 마이크로서비스 등)는 그리지 않는다.

## 1. 전체 배포 구조도

```mermaid
flowchart LR
    participant(["참여자 브라우저<br/>(모바일/데스크톱)"])
    admin(["관리자 브라우저"])

    subgraph vm["단일 VM"]
        caddy["Caddy<br/>(TLS 자동 발급, 리버스 프록시)"]
        express["Node.js + Express<br/>(React 19 빌드 정적 서빙 + REST API)"]
        pg[("PostgreSQL 17")]

        caddy --> express
        express -- "pg (node-postgres)" --> pg
    end

    participant --> caddy
    admin --> caddy
```

참여자·관리자 모두 같은 경로로 들어온다. Caddy가 TLS를 처리해 Express로 넘기고, Express 하나가 React 빌드 정적 파일 서빙과 API 응답을 모두 담당하며 PostgreSQL 하나에만 접속한다. 큐·캐시·별도 알림 서비스는 없다.

## 2. 요청 처리 레이어 흐름도

```mermaid
flowchart LR
    subgraph frontend["프론트엔드 (React 19 SPA)"]
        pages["Pages<br/>(React 19 컴포넌트)"]
        query["TanStack Query 훅<br/>(서버 상태 캐시)"]
        apiClient["API client<br/>(fetch 래퍼)"]
        authStore["Zustand<br/>(Access/Refresh JWT 보관)"]

        pages --> query --> apiClient
        apiClient -.토큰 읽기/401 시 refresh.-> authStore
    end

    subgraph backend["백엔드 (Node.js + Express)"]
        routes["Routes<br/>(Express Router)"]
        handlers["Handlers<br/>(도메인 규칙 검증)"]
        queries["Queries<br/>(pg, ORM 없음)"]

        routes --> handlers --> queries
    end

    pg[("PostgreSQL 17")]

    apiClient -- "HTTP/JSON" --> routes
    queries --> pg
```

프론트는 Pages → TanStack Query 훅 → API client 단방향 의존, Zustand는 인증 토큰만 보관하고 서버 데이터를 중복 저장하지 않는다. 백엔드는 Routes → Handlers → Queries 3계층 고정이며, 도메인 규칙(대상유형 검증, 동의, 중복 방지, 룰렛 추첨)은 전부 Handlers에 모여 있다.

## 3. 프론트엔드 컴포넌트 구조

화면 9개(P0)와 [P1] 화면 3개가 공용 `components/` 3개를 어떻게 나눠 쓰는지만 보여준다. Pages → TanStack Query 훅 → API client 흐름은 2번 다이어그램 그대로이므로 여기서는 화살표 하나로만 표시한다.

```mermaid
flowchart TD
    subgraph pages["Pages"]
        subgraph pEvents["pages/events"]
            EventListPage
            EventDetailPage
            RouletteResultPage
        end
        subgraph pAuth["pages/auth"]
            LoginPage
            SignupPage
        end
        subgraph pAdmin["pages/admin"]
            AdminLoginPage
            AdminEventListPage
            AdminEventFormPage
            AdminEntryListPage
            AdminConsentNotePage["AdminConsentNotePage [P1]"]
        end
        subgraph pMypage["pages/mypage [P1]"]
            MyEntriesPage["MyEntriesPage [P1]"]
            MyProfilePage["MyProfilePage [P1]"]
        end
    end

    subgraph components["components (공용)"]
        Toast["Toast<br/>(에러 코드 6종 공용)"]
        ConsentCheckbox["ConsentCheckbox<br/>(회원/비회원 공용)"]
        FormFieldsInput["FormFieldsInput [P1]"]
    end

    query["TanStack Query 훅 → API client<br/>(2번 다이어그램 참고)"]

    EventDetailPage --> ConsentCheckbox
    EventDetailPage -. "참여방식이 폼 제출형일 때만" .-> FormFieldsInput
    pages -. "에러 발생 시" .-> Toast
    pages --> query
```

`Toast`는 이름대로 모든 Page에서 공용으로 쓰이므로 개별 화살표 대신 Pages 전체에서 한 번만 연결했고, `ConsentCheckbox`/`FormFieldsInput[P1]`은 실제로 쓰는 화면(`EventDetailPage`)이 하나뿐이라 그 화면에만 직접 연결했다.

## 4. 백엔드 컴포넌트 구조

Routes 4개(P0 3개 + [P1] 1개) → Handlers 4개 → `db/queries/` 5개 파일 단위 구성 관계를 보여준다. Handlers → PostgreSQL 흐름은 2번 다이어그램 그대로이므로 여기서는 화살표 하나로만 표시하고, 미들웨어는 3번 다이어그램의 `Toast`처럼 모든 routes가 공통으로 거치는 계층이라는 것만 한 번 표시한다.

```mermaid
flowchart TD
    subgraph routes["routes/"]
        authRoutes
        eventsRoutes
        entriesRoutes
        mypageRoutes["mypageRoutes [P1]"]
    end

    subgraph handlersG["handlers/"]
        authHandlers
        eventsHandlers
        entriesHandlers
        mypageHandlers["mypageHandlers [P1]"]
    end

    subgraph queriesG["db/queries/"]
        usersQueries
        eventsQueries
        prizesQueries
        entriesQueries
        refreshTokensQueries
    end

    subgraph middlewareG["middleware (공통 계층)"]
        auth["auth.js<br/>(JWT 검증)"]
        errorHandler["errorHandler.js"]
        requestLogger["requestLogger.js"]
        rateLimiter["rateLimiter.js [P1]"]
    end

    pg[("PostgreSQL 17<br/>(2번 다이어그램 참고)")]

    authRoutes --> authHandlers
    eventsRoutes --> eventsHandlers
    entriesRoutes --> entriesHandlers
    mypageRoutes --> mypageHandlers

    authHandlers --> usersQueries
    authHandlers --> refreshTokensQueries
    eventsHandlers --> eventsQueries
    eventsHandlers --> prizesQueries
    entriesHandlers --> eventsQueries
    entriesHandlers --> entriesQueries
    entriesHandlers --> prizesQueries
    mypageHandlers --> usersQueries
    mypageHandlers --> entriesQueries

    routes -. "모든 요청이 거침" .-> middlewareG
    queriesG --> pg
```

`entriesHandlers`는 참여신청 처리 중 이벤트 상태·대상유형 검증에 `eventsQueries`, 중복/신청 기록에 `entriesQueries`, 룰렛 가중치 추첨에 `prizesQueries`까지 3개를 함께 쓰는 가장 무거운 핸들러다(5절 원칙 그대로). 미들웨어는 개별 handlers로의 화살표를 그리지 않고 routes 전체에 한 번만 연결했다 — 인증이 필요 없는 라우트도 `errorHandler`/`requestLogger`는 공통으로 거치기 때문이다.
