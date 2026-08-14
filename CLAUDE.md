# b2b-promo 프로젝트의 최상위 지침

## 반드시 준수할 최우선 지침

- 모든 대화는 한국어로 할 것
- 오버엔지니어링 금지

## 개발할 때 다음 사항을 준수할 것

- 안드레 카파시 CLAUDE.md
- https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/refs/heads/main/CLAUDE.md

## 문서 구조 (docs/)

작업 전 관련 문서를 먼저 확인할 것. 충돌 시 우선순위는 도메인 정의서 → PRD → 프로젝트 구조 원칙 → 그 외 순.

| 파일 | 내용 | 비고 |
|---|---|---|
| `docs/1-domain-definition.md` | 도메인 정의서 (엔티티, 상태전이, 비즈니스 규칙, 예외 케이스, MVP 범위) | 최신 v1.7. 모든 규칙의 최종 근거 |
| `docs/2-usecase.md` | 유스케이스 다이어그램 (Mermaid) | 최신 v1.0 |
| `docs/3-prd.md` | PRD (기술스택, FR 목록 FR-1.0~1.11/FR-2.1~2.6, P0/P1 구분, 일정) | 최신 v1.6 |
| `docs/4-user-scenario.md` | 사용자 시나리오 S-1~S-10 (골든패스/예외 흐름) | 최신 v1.2 |
| `docs/5-project-principle.md` | 프로젝트 구조 설계 원칙 (레이어, 네이밍, 디렉토리 구조, 보안/운영 규칙) | 최신 v1.5 |
| `docs/6-arch-diagram.md` | 기술 아키텍처 다이어그램 (Mermaid) | 최신 v1.3 |
| `docs/7-wireframe.md` | 화면별 와이어프레임 (ASCII, 반응형 768px 기준) | 최신 v1.2 |
| `docs/8-erd.md` | ERD (Mermaid) | 최신 v1.0 |
| `docs/8-schema.sql` | 실제 DDL (`backend/src/db/schema.sql`와 동일 내용) | |
| `docs/9-plan.md` | 실행 계획 — Task 단위 분해, 선행 Task, 체크박스 완료조건 | 최신 v1.4, 작업 진행 시 이 문서의 체크박스를 갱신할 것 |
| `docs/swagger.json` | OpenAPI 3.0 스펙 (P0 API만) | |
| `asset/` | 와이어프레임 등 시각 자료(SVG) | |

각 문서 상단의 `## 변경이력` 표(버전/일시/변경 내용)가 최신 버전의 근거이며, 자주 갱신되므로 여기 표기된 값이 아니라 파일 상단을 직접 확인할 것.
