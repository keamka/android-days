export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const INVALID_BIRTHDAY = 'Enter a valid birthday in YYYY-MM-DD format (years 0001–9999).';
const FUTURE_BIRTHDAY = 'Birthday cannot be in the future.';
const INVALID_CURRENT_DATE = 'Current date is invalid.';

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Parse an exact Gregorian calendar date, without time-zone conversion. */
export function parseBirthday(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  // JavaScript's `$` can match before a final newline; require the whole string.
  if (!match || match[0] !== value) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12) {
    return null;
  }

  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > daysInMonth[month - 1]!) {
    return null;
  }

  return { year, month, day };
}

function localCalendarDate(date: Date): CalendarDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/** Map calendar components to a UTC ordinal, not an elapsed local duration. */
function dateOrdinal({ year, month, day }: CalendarDate): number {
  const date = new Date(0);
  // Date.UTC(year, ...) and new Date(year, ...) map years 0–99 to 1900–1999.
  // setUTCFullYear preserves the actual year, including 0001 through 0099.
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime() / MILLISECONDS_PER_DAY;
}

/** Serialize local calendar components; never use UTC ISO slicing for birthdays. */
export function localDateString(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Cannot format an invalid date.');
  }
  const { year, month, day } = localCalendarDate(date);
  if (year < 1 || year > 9999) {
    throw new Error('Date year must be between 0001 and 9999.');
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Return an actionable error, or null when the birthday is valid as of today. */
export function validateBirthday(value: string, now: Date = new Date()): string | null {
  const birthday = parseBirthday(value);
  if (!birthday) {
    return INVALID_BIRTHDAY;
  }
  if (!Number.isFinite(now.getTime())) {
    return INVALID_CURRENT_DATE;
  }
  if (dateOrdinal(birthday) > dateOrdinal(localCalendarDate(now))) {
    return FUTURE_BIRTHDAY;
  }
  return null;
}

/** Birthday is day 1; only changes to the local calendar date advance the count. */
export function getDayOfLife(birthday: string, now: Date = new Date()): number {
  const error = validateBirthday(birthday, now);
  if (error) {
    throw new Error(error);
  }
  // Validation above establishes that these components exist and precede today.
  const birthDate = parseBirthday(birthday)!;
  return dateOrdinal(localCalendarDate(now)) - dateOrdinal(birthDate) + 1;
}

/** Build a local-noon picker value, avoiding the usual midnight DST transitions. */
export function birthdayToDate(value: string): Date {
  const birthday = parseBirthday(value);
  if (!birthday) {
    throw new Error(INVALID_BIRTHDAY);
  }
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(birthday.year, birthday.month - 1, birthday.day);
  return date;
}

/** Format pure calendar components, including civil dates skipped by a time zone. */
export function formatBirthday(value: string): string {
  const birthday = parseBirthday(value);
  if (!birthday) throw new Error(INVALID_BIRTHDAY);
  const date = new Date(0);
  date.setUTCFullYear(birthday.year, birthday.month - 1, birthday.day);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
