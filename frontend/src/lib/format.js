export function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDday(endAt, status) {
  if (status === 'CLOSED') return '마감됨';
  const end = new Date(endAt);
  const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((endDateOnly - todayOnly) / (1000 * 60 * 60 * 24));
  return days <= 0 ? '오늘 마감' : `D-${days} 마감`;
}
