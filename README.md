# 온리원이벤트 (b2b-promo)

B2B 식품 유통 거래처를 위한 프로모션 이벤트 참여 웹앱입니다. 참여자는 로그인 없이(비회원) 또는 회원으로 이벤트에 참여할 수 있고, 관리자는 이벤트를 등록·운영·종료합니다.

## Demo Site

- 프론트엔드: https://hyojlee-abc-fe.vercel.app
- 백엔드 API: https://hyojlee-abc-be.vercel.app

## 문서 (docs/)

개발 과정에서 작성한 문서입니다. 충돌 시 우선순위는 도메인 정의서 → PRD → 프로젝트 구조 원칙 → 그 외 순서입니다.

| 문서 | 내용 |
|---|---|
| [1-domain-definition.md](docs/1-domain-definition.md) | 도메인 정의서 — 엔티티, 상태전이, 비즈니스 규칙, 예외 케이스, MVP 범위 (모든 규칙의 최종 근거) |
| [2-usecase.md](docs/2-usecase.md) | 유스케이스 다이어그램 (Mermaid) |
| [3-prd.md](docs/3-prd.md) | PRD — 기술스택, 기능 요구사항(FR) 목록, 일정 |
| [4-user-scenario.md](docs/4-user-scenario.md) | 사용자 시나리오 S-1~S-10 — 골든패스/예외 흐름 |
| [5-project-principle.md](docs/5-project-principle.md) | 프로젝트 구조 설계 원칙 — 레이어, 네이밍, 디렉토리 구조, 보안/운영 규칙 |
| [6-arch-diagram.md](docs/6-arch-diagram.md) | 기술 아키텍처 다이어그램 (Mermaid) |
| [7-wireframe.md](docs/7-wireframe.md) | 화면별 와이어프레임 (ASCII, 반응형 768px 기준) |
| [8-erd.md](docs/8-erd.md) | ERD (Mermaid) |
| [8-schema.sql](docs/8-schema.sql) | 실제 DDL |
| [9-plan.md](docs/9-plan.md) | 실행 계획 — Task 단위 분해, 완료조건 |
| [10-style.md](docs/10-style.md) | 스타일 가이드 — 색상·타이포그래피·간격·컴포넌트·모션 규칙 |
| [swagger.json](docs/swagger.json) | OpenAPI 3.0 스펙 |

각 문서 상단의 변경이력이 최신 버전의 근거입니다.

## 테스트용 계정

| 구분 | 이메일 | 비밀번호 | 비고 |
|---|---|---|---|
| 관리자 | `admin@example.com` | `U9uzQ0Ur02RYSK7kFQk2` | 백오피스(`/admin/login`) 전용, 앱 내 가입 경로 없음(DB 시딩) |
| 일반 회원 | `member@example.com` | `Member1234` | 참여자 화면(`/login`)용 데모 계정 |

비회원 참여는 로그인 없이 이벤트 상세에서 업체명/담당자명/이메일/연락처만 입력하면 됩니다.

## 간략한 테스트 시나리오

자세한 흐름은 [4-user-scenario.md](docs/4-user-scenario.md) 참고. 데모 사이트에서 아래 순서로 확인할 수 있습니다.

1. **관리자로 이벤트 등록** — `/admin/login`에서 관리자 계정으로 로그인 → "+ 이벤트 등록"으로 룰렛 게임형 이벤트 생성(참여 대상: 공통, 경품 1건 이상 등록 필요) → 목록에서 "진행중" 상태 확인
2. **비회원 참여(골든패스)** — 로그아웃 상태로 홈에서 방금 만든 이벤트 클릭 → 업체명/담당자명/이메일/연락처 입력 + 개인정보 동의 체크 → "참여하기" → 룰렛 결과 화면에서 당첨/미당첨 확인
3. **중복 참여 거부** — 같은 이메일로 같은 이벤트에 다시 참여 시도 → "이미 참여하셨습니다" 토스트로 거부되는지 확인
4. **회원가입 → 로그인 → 참여** — `/signup`에서 신규 가입 → 로그인 → 회원 전용 또는 공통 이벤트에 참여(개인정보 재입력 없이 동의만으로 참여됨) 확인
5. **마이페이지에서 취소/재신청** — `/mypage`에서 단순 참여형 이벤트는 취소 가능, 룰렛 게임형은 취소 버튼이 없음을 확인 → 취소 후 재참여 시 상태가 "신청완료"로 복귀하는지 확인
6. **관리자 조기 종료** — 관리자로 돌아가 이벤트를 "종료" → 참여자 화면에서 해당 이벤트가 "종료됨"으로 표시되고 참여가 더 이상 되지 않는지 확인
