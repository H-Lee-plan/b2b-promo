const { AppError } = require('../../../domain/errors/AppError');
const { TARGET_TYPE, PARTICIPATION_TYPE } = require('../../../domain/enums');

const CREATABLE_PARTICIPATION_TYPES = [PARTICIPATION_TYPE.SIMPLE, PARTICIPATION_TYPE.FORM, PARTICIPATION_TYPE.ROULETTE];

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

function validateFormFields(formFields) {
  if (!Array.isArray(formFields) || formFields.length < 1) {
    throw new AppError('VALIDATION_ERROR', '폼 제출형은 필드가 1건 이상 필요합니다.');
  }
  return formFields.map((field) => {
    if (typeof field !== 'string' || !field.trim()) {
      throw new AppError('VALIDATION_ERROR', '폼 필드명은 비어 있지 않은 문자열이어야 합니다.');
    }
    return field;
  });
}

function validateEventFields({ title, description, targetType, participationType, startAt, endAt, isPinned }) {
  if (!title || typeof title !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'title은 필수입니다.');
  }
  if (!Object.values(TARGET_TYPE).includes(targetType)) {
    throw new AppError('VALIDATION_ERROR', 'targetType이 올바르지 않습니다.');
  }
  if (!CREATABLE_PARTICIPATION_TYPES.includes(participationType)) {
    throw new AppError('VALIDATION_ERROR', 'participationType은 SIMPLE, FORM 또는 ROULETTE만 가능합니다.');
  }

  const startDate = startAt instanceof Date ? startAt : new Date(startAt);
  const endDate = endAt instanceof Date ? endAt : new Date(endAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    throw new AppError('VALIDATION_ERROR', 'startAt/endAt이 올바르지 않습니다.');
  }
  if (typeof isPinned !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', 'isPinned은 boolean이어야 합니다.');
  }

  return {
    title,
    description: description ?? null,
    targetType,
    participationType,
    startAt: startDate,
    endAt: endDate,
    isPinned,
  };
}

module.exports = { validatePrizeList, validateFormFields, validateEventFields, CREATABLE_PARTICIPATION_TYPES };
