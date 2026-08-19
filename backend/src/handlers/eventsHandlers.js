const pool = require('../db/pool');
const eventsQueries = require('../db/queries/eventsQueries');
const prizesQueries = require('../db/queries/prizesQueries');
const { AppError } = require('../shared/errors');
const { TARGET_TYPE, EVENT_STATUS, PARTICIPATION_TYPE } = require('../shared/enums');

const CREATABLE_PARTICIPATION_TYPES = [PARTICIPATION_TYPE.SIMPLE, PARTICIPATION_TYPE.ROULETTE];

function computeEffectiveStatus(event, now) {
  if (event.status === EVENT_STATUS.CLOSED) return EVENT_STATUS.CLOSED;
  if (now >= new Date(event.endAt)) return EVENT_STATUS.CLOSED;
  if (now >= new Date(event.startAt)) return EVENT_STATUS.ONGOING;
  return EVENT_STATUS.SCHEDULED;
}

function toEventResponse(event, prizes, now) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    targetType: event.targetType,
    participationType: event.participationType,
    startAt: event.startAt,
    endAt: event.endAt,
    isPinned: event.isPinned,
    status: computeEffectiveStatus(event, now),
    createdAt: event.createdAt,
    prizes,
  };
}

function validatePrizeList(prizes) {
  if (!Array.isArray(prizes) || prizes.length < 1) {
    throw new AppError('VALIDATION_ERROR', '룰렛 게임형은 경품이 1건 이상 필요합니다.');
  }
  return prizes.map((prize) => {
    if (
      !prize ||
      typeof prize.name !== 'string' ||
      !prize.name ||
      !Number.isInteger(prize.weight) ||
      prize.weight < 1
    ) {
      throw new AppError('VALIDATION_ERROR', '경품 name/weight가 올바르지 않습니다(weight는 1 이상 정수).');
    }
    return { name: prize.name, weight: prize.weight };
  });
}

function validateEventCreate(body) {
  const { title, description, targetType, participationType, startAt, endAt, isPinned, prizes } = body;

  if (!title || typeof title !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'title은 필수입니다.');
  }
  if (!Object.values(TARGET_TYPE).includes(targetType)) {
    throw new AppError('VALIDATION_ERROR', 'targetType이 올바르지 않습니다.');
  }
  if (!CREATABLE_PARTICIPATION_TYPES.includes(participationType)) {
    throw new AppError('VALIDATION_ERROR', 'participationType은 SIMPLE 또는 ROULETTE만 가능합니다.');
  }
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    throw new AppError('VALIDATION_ERROR', 'startAt/endAt이 올바르지 않습니다.');
  }
  if (typeof isPinned !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', 'isPinned은 boolean이어야 합니다.');
  }

  const validPrizes = participationType === PARTICIPATION_TYPE.ROULETTE ? validatePrizeList(prizes) : [];

  return {
    title,
    description: description ?? null,
    targetType,
    participationType,
    startAt: startDate,
    endAt: endDate,
    isPinned,
    prizes: validPrizes,
  };
}

async function listEvents(req, res, next) {
  try {
    const events = await eventsQueries.findAll();
    const now = new Date();
    const results = await Promise.all(
      events.map(async (event) => {
        const prizes = event.participationType === PARTICIPATION_TYPE.ROULETTE ? await prizesQueries.findByEventId(event.id) : [];
        return toEventResponse(event, prizes, now);
      })
    );
    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
}

async function getEvent(req, res, next) {
  try {
    const event = await eventsQueries.findById(req.params.eventId);
    if (!event) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }
    const prizes = event.participationType === PARTICIPATION_TYPE.ROULETTE ? await prizesQueries.findByEventId(event.id) : [];
    res.status(200).json(toEventResponse(event, prizes, new Date()));
  } catch (err) {
    next(err);
  }
}

async function createEvent(req, res, next) {
  const client = await pool.connect();
  try {
    const validated = validateEventCreate(req.body || {});

    await client.query('BEGIN');
    const event = await eventsQueries.insert(validated, client);
    if (validated.participationType === PARTICIPATION_TYPE.ROULETTE) {
      await prizesQueries.replaceForEvent(event.id, validated.prizes, client);
    }
    await client.query('COMMIT');

    const prizes = validated.participationType === PARTICIPATION_TYPE.ROULETTE ? await prizesQueries.findByEventId(event.id) : [];
    res.status(201).json(toEventResponse(event, prizes, new Date()));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

async function updateEvent(req, res, next) {
  const client = await pool.connect();
  try {
    const eventId = req.params.eventId;
    const existing = await eventsQueries.findById(eventId);
    if (!existing) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }

    const now = new Date();
    const effectiveStatus = computeEffectiveStatus(existing, now);
    if (effectiveStatus === EVENT_STATUS.CLOSED) {
      throw new AppError('VALIDATION_ERROR', '종료된 이벤트는 수정할 수 없습니다.');
    }

    const body = req.body || {};
    if (effectiveStatus === EVENT_STATUS.ONGOING) {
      if ('targetType' in body || 'participationType' in body || 'startAt' in body) {
        throw new AppError(
          'VALIDATION_ERROR',
          '진행중 이벤트는 참여대상유형/참여방식/시작일시를 변경할 수 없습니다.'
        );
      }
      if ('prizes' in body) {
        // 진행중 이벤트는 이미 참여신청이 확정 경품(prizeId)을 참조하고 있을 수 있다.
        // 경품을 교체하면 DELETE+INSERT로 인해 기존 참조가 ON DELETE SET NULL로 끊어지므로
        // (도메인 6절 "확정된 결과는 재추첨 불가·영구 보존") 진행중에는 경품 수정 자체를 막는다.
        throw new AppError('VALIDATION_ERROR', '진행중 이벤트는 경품 목록을 변경할 수 없습니다.');
      }
    }

    const merged = {
      title: body.title ?? existing.title,
      description: 'description' in body ? body.description : existing.description,
      targetType: body.targetType ?? existing.targetType,
      participationType: body.participationType ?? existing.participationType,
      startAt: body.startAt ? new Date(body.startAt) : new Date(existing.startAt),
      endAt: body.endAt ? new Date(body.endAt) : new Date(existing.endAt),
      isPinned: 'isPinned' in body ? body.isPinned : existing.isPinned,
    };

    if (effectiveStatus === EVENT_STATUS.ONGOING && body.endAt) {
      if (merged.endAt <= new Date(existing.endAt)) {
        throw new AppError('VALIDATION_ERROR', '진행중 이벤트의 종료일시는 연장만 가능합니다.');
      }
    }

    if (!Object.values(TARGET_TYPE).includes(merged.targetType)) {
      throw new AppError('VALIDATION_ERROR', 'targetType이 올바르지 않습니다.');
    }
    if (!CREATABLE_PARTICIPATION_TYPES.includes(merged.participationType)) {
      throw new AppError('VALIDATION_ERROR', 'participationType은 SIMPLE 또는 ROULETTE만 가능합니다.');
    }
    if (
      Number.isNaN(merged.startAt.getTime()) ||
      Number.isNaN(merged.endAt.getTime()) ||
      merged.endAt <= merged.startAt
    ) {
      throw new AppError('VALIDATION_ERROR', 'startAt/endAt이 올바르지 않습니다.');
    }
    if (typeof merged.isPinned !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', 'isPinned은 boolean이어야 합니다.');
    }

    // prizesToPersist === null이면 기존 경품 행을 건드리지 않는다(FK로 참조 중인 prizeId가
    // 불필요하게 끊어지지 않도록, 요청에 prizes가 실제로 포함된 경우에만 교체한다).
    let prizesToPersist = null;
    if (merged.participationType === PARTICIPATION_TYPE.ROULETTE) {
      if (body.prizes !== undefined) {
        prizesToPersist = validatePrizeList(body.prizes);
      } else {
        const existingPrizes = await prizesQueries.findByEventId(eventId);
        if (existingPrizes.length < 1) {
          throw new AppError('VALIDATION_ERROR', '룰렛 게임형은 경품이 1건 이상 필요합니다.');
        }
      }
    } else {
      const existingPrizes = await prizesQueries.findByEventId(eventId);
      prizesToPersist = existingPrizes.length > 0 ? [] : null;
    }

    await client.query('BEGIN');
    const updated = await eventsQueries.update(eventId, merged, client);
    if (prizesToPersist !== null) {
      await prizesQueries.replaceForEvent(eventId, prizesToPersist, client);
    }
    await client.query('COMMIT');

    const prizes = merged.participationType === PARTICIPATION_TYPE.ROULETTE ? await prizesQueries.findByEventId(eventId) : [];
    res.status(200).json(toEventResponse(updated, prizes, now));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

async function closeEvent(req, res, next) {
  try {
    const eventId = req.params.eventId;
    const existing = await eventsQueries.findById(eventId);
    if (!existing) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }

    const now = new Date();
    const effectiveStatus = computeEffectiveStatus(existing, now);
    if (effectiveStatus !== EVENT_STATUS.ONGOING) {
      throw new AppError('VALIDATION_ERROR', '진행중인 이벤트만 종료할 수 있습니다.');
    }

    const closed = await eventsQueries.close(eventId);
    const prizes = closed.participationType === PARTICIPATION_TYPE.ROULETTE ? await prizesQueries.findByEventId(eventId) : [];
    res.status(200).json(toEventResponse(closed, prizes, now));
  } catch (err) {
    next(err);
  }
}

module.exports = { listEvents, getEvent, createEvent, updateEvent, closeEvent, computeEffectiveStatus };
