# b2b-promotion 백엔드 개발을 위한 지침

## 반드시 준수할 사항

- SOLID 원칙을 반드시 지킬 것
- Clean Architecture를 반드시 구현할 것

## 개발 시 참조할 문서

작업 전 관련 문서를 먼저 확인할 것. 충돌 시 우선순위는 도메인 정의서 → PRD → 프로젝트 구조 원칙 → 그 외 순.

| 문서 | 파일 | 내용 |
|---|---|---|
| 도메인 정의서 | [../docs/1-domain-definition.md](../docs/1-domain-definition.md) | 엔티티, 상태전이, 비즈니스 규칙, 예외 케이스, MVP 범위 — 모든 규칙의 최종 근거 |
| PRD | [../docs/3-prd.md](../docs/3-prd.md) | 기술스택, FR 목록, 일정 |
| 프로젝트 구조 설계 원칙 | [../docs/5-project-principle.md](../docs/5-project-principle.md) | 레이어, 네이밍, 디렉토리 구조, 보안/운영 규칙 |
| ERD | [../docs/8-erd.md](../docs/8-erd.md) | ERD (Mermaid) |
| DDL | [../docs/8-schema.sql](../docs/8-schema.sql) | 실제 DDL (`backend/src/infrastructure/db/schema.sql`와 동일 내용) |
| 실행 계획 | [../docs/9-plan.md](../docs/9-plan.md) | Task 단위 분해, 완료조건 |
| API 스펙 | [../docs/swagger.json](../docs/swagger.json) | OpenAPI 3.0 스펙 (초기 구현 범위 API만) |

각 문서 상단의 변경이력/버전이 최신 근거이므로, 여기 표기된 설명이 아니라 파일 상단을 직접 확인할 것.
