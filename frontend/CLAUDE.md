# b2b-promotion 프론트엔드앱 개발을 위한 지침

## 개발 시 참조할 문서

작업 전 관련 문서를 먼저 확인할 것. 충돌 시 우선순위는 도메인 정의서 → PRD → 프로젝트 구조 원칙 → 그 외 순.

| 문서 | 파일 | 내용 |
|---|---|---|
| 도메인 정의서 | [../docs/1-domain-definition.md](../docs/1-domain-definition.md) | 엔티티, 상태전이, 비즈니스 규칙, 예외 케이스, MVP 범위 — 모든 규칙의 최종 근거 |
| PRD | [../docs/3-prd.md](../docs/3-prd.md) | 기술스택, FR 목록, 화면 목록, 일정 |
| 사용자 시나리오 | [../docs/4-user-scenario.md](../docs/4-user-scenario.md) | S-1~S-10 골든패스/예외 흐름 — 화면 상태 분기·에러 문구 근거 |
| 프로젝트 구조 설계 원칙 | [../docs/5-project-principle.md](../docs/5-project-principle.md) | 레이어, 네이밍, 디렉토리 구조(6절 프론트엔드 구조 포함) |
| 와이어프레임 | [../docs/7-wireframe.md](../docs/7-wireframe.md) | 화면별 레이아웃 (ASCII, 반응형 768px 기준) |
| 스타일 가이드 | [../docs/10-style.md](../docs/10-style.md) | 색상·타이포그래피·간격·컴포넌트·모션 규칙 |
| 실행 계획 | [../docs/9-plan.md](../docs/9-plan.md) | FE Task 단위 분해, 선행 Task, 완료조건 |
| API 스펙 | [../docs/swagger.json](../docs/swagger.json) | OpenAPI 3.0 스펙 — 백엔드 응답 형식·에러 코드의 최종 근거 |

각 문서 상단의 변경이력/버전이 최신 근거이므로, 여기 표기된 설명이 아니라 파일 상단을 직접 확인할 것.

## 기술 스택 (3-prd.md 4절 근거)

- **React 19**
- **Zustand** — 로그인 상태 + 토큰(Access/Refresh) 보관. HttpOnly 쿠키 미사용이므로 localStorage persist 적용
- **TanStack Query** — 서버 상태 전부. 401 응답 시 `/auth/refresh`로 재발급 후 원요청 재시도하는 인터셉터 구성
- 앱 부팅 시 localStorage에 Refresh Token이 있으면 즉시 silent refresh(Access 재발급) 후 라우팅 진행, 실패 시 로그아웃 상태로 취급

다른 상태관리 라이브러리, 별도 정규화 스토어, 데이터 페칭 라이브러리를 새로 추가하지 말 것 — 이미 정해진 스택 그대로 사용한다.
