const jwt = require('jsonwebtoken');

const pool = require('../db/pool');
const eventsQueries = require('../db/queries/eventsQueries');
const prizesQueries = require('../db/queries/prizesQueries');
const entriesQueries = require('../db/queries/entriesQueries');
const { computeEffectiveStatus } = require('./eventsHandlers');
const { drawPrize } = require('../shared/drawPrize');
const { normalizeEmail, isValidEmailFormat } = require('../shared/normalizeEmail');
const { AppError } = require('../shared/errors');
const { loadEnv } = require('../config/env');
const { EVENT_STATUS, TARGET_TYPE, ENTRY_STATUS, PARTICIPATION_TYPE } = require('../shared/enums');

const LOSING_PRIZE_NAME = '미당첨';

function tryGetMember(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  try {
    const env = loadEnv();
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    return { userId: payload.userId, role: payload.role };
  } catch (err) {
    throw new AppError('VALIDATION_ERROR', '유효하지 않은 토큰입니다.', 401);
  }
}

function validateGuestFields(body) {
  const { guestEmail, guestPhone, guestInfo } = body;
  if (
    !guestEmail ||
    !isValidEmailFormat(guestEmail) ||
    !guestPhone ||
    !guestInfo ||
    typeof guestInfo !== 'object' ||
    !guestInfo.companyName ||
    !guestInfo.name ||
    !guestInfo.phone
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      '비회원 참여 시 guestEmail(형식 포함)/guestPhone/guestInfo가 모두 필요합니다.'
    );
  }
  return { guestEmail: normalizeEmail(guestEmail), guestPhone, guestInfo };
}

function toEntryResponse(entry, prize) {
  return {
    id: entry.id,
    eventId: entry.eventId,
    userId: entry.userId,
    guestEmail: entry.guestEmail,
    guestPhone: entry.guestPhone,
    guestInfo: entry.guestInfo,
    formData: entry.formData,
    consentedAt: entry.consentedAt,
    status: entry.status,
    prizeId: entry.prizeId,
    prize: prize ?? null,
    appliedAt: entry.appliedAt,
    consentNote: entry.consentNote,
  };
}

async function createEntry(req, res, next) {
  const client = await pool.connect();
  try {
    const { eventId } = req.params;
    const body = req.body || {};
    const member = tryGetMember(req);

    const event = await eventsQueries.findById(eventId, client);
    if (!event) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }

    const effectiveStatus = computeEffectiveStatus(event, new Date());
    if (effectiveStatus !== EVENT_STATUS.ONGOING) {
      throw new AppError('EVENT_CLOSED', '진행중인 이벤트가 아닙니다.');
    }

    if (event.targetType === TARGET_TYPE.MEMBER_ONLY && !member) {
      throw new AppError('TARGET_TYPE_MISMATCH', '회원 전용 이벤트입니다.');
    }
    if (event.targetType === TARGET_TYPE.GUEST_ONLY && member) {
      throw new AppError('TARGET_TYPE_MISMATCH', '비회원 전용 이벤트입니다.');
    }

    if (body.consent !== true) {
      throw new AppError('CONSENT_REQUIRED', '개인정보 동의가 필요합니다.');
    }

    const consentedAt = new Date();
    const userAgent = req.headers['user-agent'] || null;

    let guestEmail = null;
    let guestPhone = null;
    let guestInfo = null;
    if (!member) {
      ({ guestEmail, guestPhone, guestInfo } = validateGuestFields(body));
    }

    await client.query('BEGIN');

    let entry = member
      ? await entriesQueries.insertMemberEntry({ eventId, userId: member.userId, consentedAt, userAgent }, client)
      : await entriesQueries.insertGuestEntry(
          { eventId, guestEmail, guestPhone, guestInfo, consentedAt, userAgent },
          client
        );

    if (!entry) {
      const existing = member
        ? await entriesQueries.findExistingByMember(eventId, member.userId, client)
        : await entriesQueries.findExistingByGuestEmail(eventId, guestEmail, client);

      if (!existing) {
        throw new AppError('INTERNAL_ERROR', '참여신청 처리 중 오류가 발생했습니다.');
      }

      if (existing.status === ENTRY_STATUS.CANCELED) {
        entry = await entriesQueries.reapplyById(existing.id, { consentedAt, guestPhone, guestInfo }, client);
        if (!entry) {
          // 동시에 들어온 다른 요청이 먼저 CANCELED→APPLIED 전환을 마친 경우
          throw new AppError('DUPLICATE_ENTRY', '이미 참여하셨습니다.');
        }
      } else {
        throw new AppError('DUPLICATE_ENTRY', '이미 참여하셨습니다.');
      }
    }

    let prize = null;
    if (event.participationType === PARTICIPATION_TYPE.ROULETTE) {
      const prizes = await prizesQueries.findByEventId(eventId, client);
      const drawn = drawPrize(prizes);
      const status = drawn.name === LOSING_PRIZE_NAME ? ENTRY_STATUS.LOST : ENTRY_STATUS.WON;
      entry = await entriesQueries.setRouletteResult(entry.id, { prizeId: drawn.id, status }, client);
      prize = drawn;
    }

    await client.query('COMMIT');
    res.status(201).json(toEntryResponse(entry, prize));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { createEntry };
