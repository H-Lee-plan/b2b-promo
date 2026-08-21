// 배포된 백엔드(https://hyojlee-abc-be.vercel.app)를 대상으로 한 API 레벨 E2E 스크립트.
// 프론트엔드가 아직 배포되지 않아 docs/4-user-scenario.md의 S-1~S-10을 API 호출로 재현한다.
// 실행: ADMIN_EMAIL=... ADMIN_PASSWORD=... node e2e/deployed/run-api-e2e.mjs
// (자격증명을 코드에 하드코딩하지 않는다 — 운영 관리자 비밀번호가 git 히스토리에 남는 것을 방지)
const BASE = 'https://hyojlee-abc-be.vercel.app/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ADMIN_EMAIL, ADMIN_PASSWORD 환경변수가 필요합니다.');
  process.exit(1);
}

const results = [];
function record(id, desc, pass, detail) {
  results.push({ id, desc, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${desc}${detail ? ' :: ' + JSON.stringify(detail) : ''}`);
}

async function call(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

const rand = () => Math.random().toString(36).slice(2, 8);
const now = Date.now();
const inPastISO = (daysAgo) => new Date(now - daysAgo * 86400000).toISOString();
const inFutureISO = (daysAhead) => new Date(now + daysAhead * 86400000).toISOString();

async function main() {
  // ---------- 준비: 관리자 로그인 ----------
  const adminLogin = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  record('SETUP', '관리자 로그인', adminLogin.status === 200 && Boolean(adminLogin.json?.accessToken), { status: adminLogin.status });
  const adminToken = adminLogin.json?.accessToken;

  // ---------- S-8: 이벤트 등록(골든패스) + 예외 ----------
  const noPrize = await call('POST', '/events', {
    token: adminToken,
    body: {
      title: `[E2E] 경품없는 룰렛_${rand()}`,
      targetType: 'COMMON',
      participationType: 'ROULETTE',
      startAt: inPastISO(1),
      endAt: inFutureISO(7),
      isPinned: false,
    },
  });
  record('S-8-exc1', '룰렛 이벤트를 경품 없이 등록 시도 시 거부', noPrize.status >= 400, { status: noPrize.status, code: noPrize.json?.error?.code, message: noPrize.json?.error?.message });

  const badWeight = await call('POST', '/events', {
    token: adminToken,
    body: {
      title: `[E2E] 가중치0_${rand()}`,
      targetType: 'COMMON',
      participationType: 'ROULETTE',
      startAt: inPastISO(1),
      endAt: inFutureISO(7),
      isPinned: false,
      prizes: [{ name: '상품권', weight: 0 }],
    },
  });
  record('S-8-exc2', '경품 weight 0으로 등록 시도 시 거부', badWeight.status >= 400, { status: badWeight.status, code: badWeight.json?.error?.code });

  const createRoulette = await call('POST', '/events', {
    token: adminToken,
    body: {
      title: `[E2E] 룰렛 이벤트_${rand()}`,
      description: 'API E2E 테스트용 룰렛(공통 대상)',
      targetType: 'COMMON',
      participationType: 'ROULETTE',
      startAt: inPastISO(1),
      endAt: inFutureISO(7),
      isPinned: true,
      prizes: [
        { name: '상품권', weight: 1 },
        { name: '커피쿠폰', weight: 5 },
        { name: '미당첨', weight: 94 },
      ],
    },
  });
  record('S-8', '룰렛 이벤트 등록(경품 3건, 상단노출)', createRoulette.status === 201, { status: createRoulette.status });
  const rouletteEventId = createRoulette.json?.id;

  const createMemberOnly = await call('POST', '/events', {
    token: adminToken,
    body: {
      title: `[E2E] 회원전용 이벤트_${rand()}`,
      targetType: 'MEMBER_ONLY',
      participationType: 'SIMPLE',
      startAt: inPastISO(1),
      endAt: inFutureISO(7),
      isPinned: false,
    },
  });
  record('S-3/S-6 준비', '회원 전용 단순참여 이벤트 등록', createMemberOnly.status === 201, { status: createMemberOnly.status });
  const memberOnlyEventId = createMemberOnly.json?.id;

  const createCommonSimple = await call('POST', '/events', {
    token: adminToken,
    body: {
      title: `[E2E] 공통 단순참여 이벤트_${rand()}`,
      targetType: 'COMMON',
      participationType: 'SIMPLE',
      startAt: inPastISO(1),
      endAt: inFutureISO(7),
      isPinned: false,
    },
  });
  record('S-7 준비', '공통 단순참여 이벤트 등록(취소/재신청용)', createCommonSimple.status === 201, { status: createCommonSimple.status });
  const commonSimpleEventId = createCommonSimple.json?.id;

  const createExpired = await call('POST', '/events', {
    token: adminToken,
    body: {
      title: `[E2E] 마감경과 이벤트_${rand()}`,
      targetType: 'COMMON',
      participationType: 'SIMPLE',
      startAt: inPastISO(10),
      endAt: inPastISO(1),
      isPinned: false,
    },
  });
  record('S-10 준비', '마감일 경과 이벤트 등록(lazy 종료 확인용)', createExpired.status === 201, { status: createExpired.status });
  const expiredEventId = createExpired.json?.id;

  // 진행중 이벤트 필드 잠금 확인
  const lockedEdit = await call('PATCH', `/events/${memberOnlyEventId}`, {
    token: adminToken,
    body: { targetType: 'COMMON' },
  });
  record('S-8-exc3', '진행중 이벤트의 참여대상유형 변경 시도 거부', lockedEdit.status >= 400, { status: lockedEdit.status, code: lockedEdit.json?.error?.code });

  // ---------- S-10: 마감 경과 이벤트가 목록/상세에서 종료로 계산되는지 ----------
  const listPublic1 = await call('GET', '/events');
  const expiredInList = listPublic1.json?.find((e) => e.id === expiredEventId);
  record('S-10', '마감 경과 이벤트가 목록에서 CLOSED로 lazy 계산됨', expiredInList?.status === 'CLOSED', { status: expiredInList?.status });

  const expiredDetail = await call('GET', `/events/${expiredEventId}`);
  record('S-10', '마감 경과 이벤트 상세 status도 CLOSED', expiredDetail.json?.status === 'CLOSED', { status: expiredDetail.json?.status });

  const expiredEntryAttempt = await call('POST', `/events/${expiredEventId}/entries`, {
    body: {
      consent: true,
      guestEmail: `expired_${rand()}@corp.co.kr`,
      guestPhone: '01000000000',
      guestInfo: { companyName: 'E2E', name: 'E2E', phone: '01000000000' },
    },
  });
  record('S-10', '마감 경과 이벤트 참여 시도 EVENT_CLOSED 거부', expiredEntryAttempt.status === 409 && expiredEntryAttempt.json?.error?.code === 'EVENT_CLOSED', { status: expiredEntryAttempt.status, code: expiredEntryAttempt.json?.error?.code });

  // ---------- S-2: 동의 없이 참여 거부 ----------
  const noConsent = await call('POST', `/events/${rouletteEventId}/entries`, {
    body: {
      consent: false,
      guestEmail: `noconsent_${rand()}@corp.co.kr`,
      guestPhone: '01011112222',
      guestInfo: { companyName: 'E2E', name: 'E2E', phone: '01011112222' },
    },
  });
  record('S-2', '미동의 참여 시도 CONSENT_REQUIRED 거부', noConsent.status === 400 && noConsent.json?.error?.code === 'CONSENT_REQUIRED', { status: noConsent.status, code: noConsent.json?.error?.code });

  // ---------- S-1/S-4/S-5: 비회원 룰렛 참여 골든패스 + 중복/재추첨 거부 ----------
  const guestEmail = `guest_${rand()}@corp.co.kr`;
  const firstEntry = await call('POST', `/events/${rouletteEventId}/entries`, {
    body: {
      consent: true,
      guestEmail,
      guestPhone: '01033334444',
      guestInfo: { companyName: '킴코퍼레이션', name: '김담당', phone: '01033334444' },
    },
  });
  record('S-1', '비회원 룰렛 참여 골든패스(추첨 확정)', firstEntry.status === 201 && ['WON', 'LOST'].includes(firstEntry.json?.status), {
    status: firstEntry.status,
    entryStatus: firstEntry.json?.status,
    prize: firstEntry.json?.prize?.name,
  });
  const isLost = firstEntry.json?.status === 'LOST';
  record('S-1-검증', '미당첨 결과의 경품명이 정확히 "미당첨"으로 매핑됨(과거 발견된 버그 재발 확인)', !isLost || firstEntry.json?.prize?.name === '미당첨', { prize: firstEntry.json?.prize?.name, entryStatus: firstEntry.json?.status });

  const dupEntry = await call('POST', `/events/${rouletteEventId}/entries`, {
    body: {
      consent: true,
      guestEmail,
      guestPhone: '01033334444',
      guestInfo: { companyName: '킴코퍼레이션', name: '김담당', phone: '01033334444' },
    },
  });
  record('S-4/S-5', '동일 이메일 중복 참여 시도 DUPLICATE_ENTRY 거부(재추첨 없음)', dupEntry.status === 409 && dupEntry.json?.error?.code === 'DUPLICATE_ENTRY', { status: dupEntry.status, code: dupEntry.json?.error?.code });

  // 동시 중복 요청(경합 조건) 확인 — 새 이메일로 동시에 2개 요청
  const raceEmail = `race_${rand()}@corp.co.kr`;
  const racePayload = {
    consent: true,
    guestEmail: raceEmail,
    guestPhone: '01099998888',
    guestInfo: { companyName: 'Race', name: 'Race', phone: '01099998888' },
  };
  const [raceA, raceB] = await Promise.all([
    call('POST', `/events/${rouletteEventId}/entries`, { body: racePayload }),
    call('POST', `/events/${rouletteEventId}/entries`, { body: racePayload }),
  ]);
  const raceStatuses = [raceA.status, raceB.status].sort();
  record('S-4 경합', '동시 중복 요청 시 정확히 1건만 성공(201+409)', raceStatuses[0] === 201 && raceStatuses[1] === 409, { statuses: raceStatuses });

  // ---------- S-3: 비회원의 회원 전용 이벤트 참여 거부 ----------
  const guestOnMemberOnly = await call('POST', `/events/${memberOnlyEventId}/entries`, {
    body: {
      consent: true,
      guestEmail: `blocked_${rand()}@corp.co.kr`,
      guestPhone: '01000000000',
      guestInfo: { companyName: 'E2E', name: 'E2E', phone: '01000000000' },
    },
  });
  record('S-3', '비회원의 회원전용 이벤트 참여 시도 TARGET_TYPE_MISMATCH 거부', guestOnMemberOnly.status === 403 && guestOnMemberOnly.json?.error?.code === 'TARGET_TYPE_MISMATCH', { status: guestOnMemberOnly.status, code: guestOnMemberOnly.json?.error?.code });

  // ---------- S-6: 회원가입 -> 로그인 -> 회원전용 참여 ----------
  const memberEmail = `member_${rand()}@corp.co.kr`;
  const memberPassword = 'password123';
  const signup = await call('POST', '/auth/signup', {
    body: { email: memberEmail, password: memberPassword, companyName: '이코퍼레이션', name: '이담당', phone: '01055556666' },
  });
  record('S-6', '회원가입 성공', signup.status === 201, { status: signup.status });

  const dupSignup = await call('POST', '/auth/signup', {
    body: { email: memberEmail, password: memberPassword, companyName: '이코퍼레이션', name: '이담당', phone: '01055556666' },
  });
  record('S-6-exc1', '중복 이메일 가입 시도 거부', dupSignup.status >= 400, { status: dupSignup.status, code: dupSignup.json?.error?.code });

  const wrongLogin = await call('POST', '/auth/login', { body: { email: memberEmail, password: 'wrongpassword' } });
  record('S-6-exc2', '오답 비밀번호 로그인 거부', wrongLogin.status === 401, { status: wrongLogin.status, message: wrongLogin.json?.error?.message });

  const memberLogin = await call('POST', '/auth/login', { body: { email: memberEmail, password: memberPassword } });
  record('S-6', '정상 로그인 성공(토큰 발급)', memberLogin.status === 200 && Boolean(memberLogin.json?.accessToken), { status: memberLogin.status });
  const memberToken = memberLogin.json?.accessToken;
  const memberRefreshToken = memberLogin.json?.refreshToken;

  const memberJoinMemberOnly = await call('POST', `/events/${memberOnlyEventId}/entries`, {
    token: memberToken,
    body: { consent: true },
  });
  record('S-6', '로그인한 회원의 회원전용 이벤트 참여(개인정보 입력 없이) 성공', memberJoinMemberOnly.status === 201 && memberJoinMemberOnly.json?.status === 'APPLIED', { status: memberJoinMemberOnly.status, entryStatus: memberJoinMemberOnly.json?.status });

  const memberDupJoin = await call('POST', `/events/${memberOnlyEventId}/entries`, { token: memberToken, body: { consent: true } });
  record('S-6-exc3', '동일 회원 재참여 DUPLICATE_ENTRY 거부', memberDupJoin.status === 409 && memberDupJoin.json?.error?.code === 'DUPLICATE_ENTRY', { status: memberDupJoin.status, code: memberDupJoin.json?.error?.code });

  // ---------- S-7: 취소 불가(룰렛) / 취소·재신청(단순) ----------
  const memberJoinSimple = await call('POST', `/events/${commonSimpleEventId}/entries`, { token: memberToken, body: { consent: true } });
  record('S-7 준비', '회원의 단순참여 이벤트 참여', memberJoinSimple.status === 201, { status: memberJoinSimple.status });
  const simpleEntryId = memberJoinSimple.json?.id;

  const memberJoinRoulette = await call('POST', `/events/${rouletteEventId}/entries`, { token: memberToken, body: { consent: true } });
  record('S-7 준비', '회원의 룰렛 이벤트 참여', memberJoinRoulette.status === 201, { status: memberJoinRoulette.status });
  const rouletteEntryId = memberJoinRoulette.json?.id;

  const myEntries = await call('GET', '/mypage/entries', { token: memberToken });
  record('S-7', '마이페이지 참여 내역 조회', myEntries.status === 200 && Array.isArray(myEntries.json) && myEntries.json.length >= 2, { status: myEntries.status, count: myEntries.json?.length });

  const cancelRoulette = await call('POST', `/mypage/entries/${rouletteEntryId}/cancel`, { token: memberToken });
  record('S-7', '룰렛 참여신청 취소 시도 서버가 거부(취소 불가 규칙)', cancelRoulette.status === 400, { status: cancelRoulette.status, code: cancelRoulette.json?.error?.code, message: cancelRoulette.json?.error?.message });

  const cancelSimple = await call('POST', `/mypage/entries/${simpleEntryId}/cancel`, { token: memberToken });
  record('S-7', '단순참여 취소 성공', cancelSimple.status === 200 && cancelSimple.json?.status === 'CANCELED', { status: cancelSimple.status, entryStatus: cancelSimple.json?.status });

  const reapply = await call('POST', `/events/${commonSimpleEventId}/entries`, { token: memberToken, body: { consent: true } });
  record('S-7', '재참여 시 새 레코드 아닌 기존 레코드가 APPLIED로 복귀', reapply.status === 201 && reapply.json?.id === simpleEntryId && reapply.json?.status === 'APPLIED', { status: reapply.status, sameId: reapply.json?.id === simpleEntryId, entryStatus: reapply.json?.status });

  // ---------- 인증/인가 방어선 ----------
  const unauthCreate = await call('POST', '/events', { body: { title: 'x', targetType: 'COMMON', participationType: 'SIMPLE', startAt: inPastISO(1), endAt: inFutureISO(1) } });
  record('보안', '인증 없이 이벤트 생성 시도 401 거부', unauthCreate.status === 401, { status: unauthCreate.status });

  const memberAsAdmin = await call('POST', '/events', { token: memberToken, body: { title: 'x', targetType: 'COMMON', participationType: 'SIMPLE', startAt: inPastISO(1), endAt: inFutureISO(1) } });
  record('보안', '일반 회원 토큰으로 이벤트 생성 시도 403 거부', memberAsAdmin.status === 403, { status: memberAsAdmin.status });

  // ---------- 토큰 재발급(silent refresh) ----------
  const refreshCall = await call('POST', '/auth/refresh', { body: { refreshToken: memberRefreshToken } });
  record('S-6', 'Refresh Token으로 Access Token 재발급 성공', refreshCall.status === 200 && Boolean(refreshCall.json?.accessToken), { status: refreshCall.status });
  // refresh는 토큰을 회전(rotate)시켜 이전 refreshToken을 즉시 폐기하므로, 이후 호출은 새로 발급된 토큰을 써야 한다.
  const rotatedRefreshToken = refreshCall.json?.refreshToken;

  const oldRefreshReuse = await call('POST', '/auth/refresh', { body: { refreshToken: memberRefreshToken } });
  record('S-6', '회전 전(폐기된) Refresh Token 재사용 거부', oldRefreshReuse.status >= 400, { status: oldRefreshReuse.status });

  const logoutCall = await call('POST', '/auth/logout', { token: memberToken, body: { refreshToken: rotatedRefreshToken } });
  record('S-6', '로그아웃 성공', logoutCall.status === 200 || logoutCall.status === 204, { status: logoutCall.status });

  const refreshAfterLogout = await call('POST', '/auth/refresh', { body: { refreshToken: rotatedRefreshToken } });
  record('S-6', '로그아웃 후 폐기된 Refresh Token 재사용 거부', refreshAfterLogout.status >= 400, { status: refreshAfterLogout.status });

  // ---------- S-8/S-9: 관리자 조기 종료 + 종료 후 신규 참여 차단 ----------
  const entriesBeforeClose = await call('GET', `/events/${rouletteEventId}/entries`, { token: adminToken });
  const countBeforeClose = entriesBeforeClose.json?.length;
  record('S-9 준비', '종료 전 참여신청 목록 조회(관리자)', entriesBeforeClose.status === 200, { status: entriesBeforeClose.status, count: countBeforeClose });

  const closeEvent = await call('POST', `/events/${rouletteEventId}/close`, { token: adminToken });
  record('S-8', '관리자 조기 종료 처리', closeEvent.status === 200 && closeEvent.json?.status === 'CLOSED', { status: closeEvent.status, eventStatus: closeEvent.json?.status });

  const entryAfterClose = await call('POST', `/events/${rouletteEventId}/entries`, {
    body: {
      consent: true,
      guestEmail: `afterclose_${rand()}@corp.co.kr`,
      guestPhone: '01000000000',
      guestInfo: { companyName: 'E2E', name: 'E2E', phone: '01000000000' },
    },
  });
  record('S-9', '종료 직후 신규 참여 EVENT_CLOSED 즉시 거부', entryAfterClose.status === 409 && entryAfterClose.json?.error?.code === 'EVENT_CLOSED', { status: entryAfterClose.status, code: entryAfterClose.json?.error?.code });

  const entriesAfterClose = await call('GET', `/events/${rouletteEventId}/entries`, { token: adminToken });
  record('S-9', '종료 후 참여신청 건수 변동 없음', entriesAfterClose.json?.length === countBeforeClose, { before: countBeforeClose, after: entriesAfterClose.json?.length });

  const closedEventDetail = await call('GET', `/events/${rouletteEventId}`);
  record('S-9', '참여자 화면에서도 종료 상태로 조회됨', closedEventDetail.json?.status === 'CLOSED', { status: closedEventDetail.json?.status });

  const emptyEntries = await call('GET', `/events/${expiredEventId}/entries`, { token: adminToken });
  record('S-9', '참여신청 0건 이벤트는 빈 배열로 응답(오류 아님)', emptyEntries.status === 200 && Array.isArray(emptyEntries.json) && emptyEntries.json.length === 0, { status: emptyEntries.status, count: emptyEntries.json?.length });

  // ---------- 요약 ----------
  const failed = results.filter((r) => !r.pass);
  console.log('\n==== 요약 ====');
  console.log(`총 ${results.length}건 중 통과 ${results.length - failed.length}건, 실패 ${failed.length}건`);
  if (failed.length) {
    console.log('실패 목록:');
    failed.forEach((f) => console.log(` - [${f.id}] ${f.desc} :: ${JSON.stringify(f.detail)}`));
  }

  console.log('\n__RESULTS_JSON_START__');
  console.log(JSON.stringify({ rouletteEventId, memberOnlyEventId, commonSimpleEventId, expiredEventId, memberEmail, guestEmail, results }, null, 2));
  console.log('__RESULTS_JSON_END__');
}

main().catch((err) => {
  console.error('스크립트 실행 중 예외:', err);
  process.exit(1);
});
