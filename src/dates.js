export function toDate(value, fieldName = 'date') {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date;
}

export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function buildHistoryDays(now, historyDays) {
  const today = startOfUtcDay(now);
  const first = addUtcDays(today, -(historyDays - 1));
  return Array.from({ length: historyDays }, (_, index) => {
    const start = addUtcDays(first, index);
    const end = addUtcDays(start, 1);
    return {
      date: toDateKey(start),
      start,
      end
    };
  });
}

export function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}
