const { AppError } = require('../../../domain/errors/AppError');

const CSV_HEADER = ['구분', '업체명', '담당자', '이메일', '동의시각', '경품', '상태'];

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

class ExportEntriesCsvUseCase {
  constructor({ eventRepository, entryRepository }) {
    this.eventRepository = eventRepository;
    this.entryRepository = entryRepository;
  }

  async execute(eventId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }

    const entries = await this.entryRepository.findByEventId(eventId);
    const rows = entries.map((entry) => {
      const isMember = entry.userId !== null;
      const companyName = isMember ? entry.user?.companyName : entry.guestInfo?.companyName;
      const contactName = isMember ? entry.user?.name : entry.guestInfo?.name;
      const email = isMember ? entry.user?.email : entry.guestEmail;
      const consentedAt = entry.consentedAt instanceof Date ? entry.consentedAt.toISOString() : entry.consentedAt;
      return [
        isMember ? '회원' : '비회원',
        companyName,
        contactName,
        email,
        consentedAt,
        entry.prize?.name ?? '',
        entry.status,
      ]
        .map(csvEscape)
        .join(',');
    });

    // 선행 BOM: 엑셀이 UTF-8 CSV를 인코딩 오인식하지 않도록 함
    return '﻿' + [CSV_HEADER.join(','), ...rows].join('\r\n');
  }
}

module.exports = ExportEntriesCsvUseCase;
