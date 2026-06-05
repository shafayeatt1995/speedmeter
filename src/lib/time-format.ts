const LOCALE = undefined;

export const TIME_12H_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

export const DATE_TIME_12H_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

export function formatClockTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString(LOCALE, TIME_12H_OPTIONS);
}

export function formatClockDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(LOCALE, DATE_TIME_12H_OPTIONS);
}
