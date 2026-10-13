import {
  birthdayToDate,
  formatBirthday,
  getDayOfLife,
  localDateString,
  parseBirthday,
  validateBirthday,
} from '../lifeDay';

function localDate(year: number, month: number, day: number, hour = 12): Date {
  const date = new Date(0);
  date.setHours(hour, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date;
}

/**
 * Model a specific zone's local calendar view independently of the runner's TZ.
 * The timestamp is real, while local getters expose the supplied wall date.
 */
function zonedDate(iso: string, year: number, month: number, day: number): Date {
  const date = new Date(iso);
  jest.spyOn(date, 'getFullYear').mockReturnValue(year);
  jest.spyOn(date, 'getMonth').mockReturnValue(month - 1);
  jest.spyOn(date, 'getDate').mockReturnValue(day);
  return date;
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('parseBirthday', () => {
  it.each([
    ['0001-01-01', { year: 1, month: 1, day: 1 }],
    ['0004-02-29', { year: 4, month: 2, day: 29 }],
    ['0099-12-31', { year: 99, month: 12, day: 31 }],
    ['2000-02-29', { year: 2000, month: 2, day: 29 }],
    ['2024-02-29', { year: 2024, month: 2, day: 29 }],
    ['9999-12-31', { year: 9999, month: 12, day: 31 }],
  ])('accepts %s', (value, expected) => {
    expect(parseBirthday(value as string)).toEqual(expected);
  });

  it.each([
    '',
    '2024-2-01',
    '2024-02-1',
    '24-02-01',
    '2024/02/01',
    ' 2024-02-01',
    '2024-02-01 ',
    '2024-02-01\n',
    '2024-02-01T00:00:00Z',
    '0000-01-01',
    '10000-01-01',
    '-001-01-01',
    '2024-00-01',
    '2024-13-01',
    '2024-01-00',
    '2024-01-32',
    '2024-04-31',
    '2024-06-31',
    '2024-09-31',
    '2024-11-31',
    '2024-02-30',
    '2023-02-29',
    '1900-02-29',
    '2100-02-29',
    '0001-02-29',
    '0100-02-29',
  ])('rejects %j instead of silently normalizing it', value => {
    expect(parseBirthday(value)).toBeNull();
  });
});

describe('getDayOfLife', () => {
  it('counts the birthday as day one at any time of day', () => {
    expect(getDayOfLife('2024-05-20', localDate(2024, 5, 20, 0))).toBe(1);
    expect(getDayOfLife('2024-05-20', localDate(2024, 5, 20, 23))).toBe(1);
  });

  it.each([
    ['2024-01-31', 2024, 2, 1, 2],
    ['2023-12-31', 2024, 1, 1, 2],
    ['2024-02-28', 2024, 3, 1, 3],
    ['2023-02-28', 2023, 3, 1, 2],
    ['2000-02-28', 2000, 3, 1, 3],
    ['1900-02-28', 1900, 3, 1, 2],
    ['2024-02-29', 2025, 2, 28, 366],
    ['2023-01-01', 2024, 1, 1, 366],
    ['2024-01-01', 2025, 1, 1, 367],
    ['0001-01-01', 1, 1, 1, 1],
    ['0001-12-31', 2, 1, 1, 2],
    ['0004-02-28', 4, 3, 1, 3],
    ['0099-12-31', 100, 1, 1, 2],
    ['0001-01-01', 100, 1, 1, 36160],
    ['0001-01-01', 9999, 12, 31, 3652059],
  ] as const)('counts from %s through %s-%s-%s', (birthday, year, month, day, expected) => {
    expect(getDayOfLife(birthday, localDate(year, month, day))).toBe(expected);
  });

  it('uses the current date when now is omitted', () => {
    jest.useFakeTimers();
    jest.setSystemTime(localDate(2024, 6, 3));
    expect(getDayOfLife('2024-06-01')).toBe(3);
  });

  it('throws meaningful errors for invalid birthdays, future dates, and invalid now', () => {
    expect(() => getDayOfLife('2024-02-30', localDate(2024, 3, 1))).toThrow(/valid birthday/i);
    expect(() => getDayOfLife('2025-01-01', localDate(2024, 12, 31))).toThrow(/future/i);
    expect(() => getDayOfLife('2024-01-01', new Date(NaN))).toThrow(/current date is invalid/i);
  });

  it('advances one day over a 23-hour spring DST day', () => {
    const before = zonedDate('2024-03-10T00:00:00-05:00', 2024, 3, 10);
    const after = zonedDate('2024-03-11T00:00:00-04:00', 2024, 3, 11);
    expect(after.getTime() - before.getTime()).toBe(23 * 60 * 60 * 1000);
    expect(getDayOfLife('2024-03-10', before)).toBe(1);
    expect(getDayOfLife('2024-03-10', after)).toBe(2);
  });

  it('advances one day over a 25-hour autumn DST day', () => {
    const before = zonedDate('2024-11-03T00:00:00-04:00', 2024, 11, 3);
    const after = zonedDate('2024-11-04T00:00:00-05:00', 2024, 11, 4);
    expect(after.getTime() - before.getTime()).toBe(25 * 60 * 60 * 1000);
    expect(getDayOfLife('2024-11-03', before)).toBe(1);
    expect(getDayOfLife('2024-11-03', after)).toBe(2);
  });

  it('does not advance during the repeated autumn DST hour', () => {
    const first = zonedDate('2024-11-03T01:30:00-04:00', 2024, 11, 3);
    const second = zonedDate('2024-11-03T01:30:00-05:00', 2024, 11, 3);
    expect(second.getTime() - first.getTime()).toBe(60 * 60 * 1000);
    expect(getDayOfLife('2024-11-02', first)).toBe(2);
    expect(getDayOfLife('2024-11-02', second)).toBe(2);
  });

  it('uses the local date when UTC is already tomorrow', () => {
    const now = zonedDate('2024-05-20T23:30:00-07:00', 2024, 5, 20);
    expect(now.getUTCDate()).toBe(21);
    expect(getDayOfLife('2024-05-20', now)).toBe(1);
    expect(validateBirthday('2024-05-21', now)).toMatch(/future/i);
  });

  it('uses the local date when UTC is still yesterday', () => {
    const now = zonedDate('2024-05-20T00:30:00+14:00', 2024, 5, 20);
    expect(now.getUTCDate()).toBe(19);
    expect(getDayOfLife('2024-05-19', now)).toBe(2);
    expect(validateBirthday('2024-05-20', now)).toBeNull();
  });
});

describe('localDateString and birthdayToDate', () => {
  it.each(['0001-01-01', '0004-02-29', '0099-12-31', '0100-01-01', '2024-02-29', '9999-12-31'])(
    'round-trips %s through local picker components',
    value => {
      const date = birthdayToDate(value);
      expect(localDateString(date)).toBe(value);
      expect(date.getFullYear()).toBe(Number(value.slice(0, 4)));
      expect(date.getHours()).toBe(12);
    },
  );

  it('serializes local calendar fields instead of slicing UTC ISO strings', () => {
    const date = zonedDate('2024-01-01T00:30:00+14:00', 2024, 1, 1);
    expect(date.toISOString().slice(0, 10)).toBe('2023-12-31');
    expect(localDateString(date)).toBe('2024-01-01');
  });

  it('rejects invalid Date values and out-of-range serialization years', () => {
    expect(() => localDateString(new Date(NaN))).toThrow(/invalid date/i);
    expect(() => localDateString(localDate(0, 1, 1))).toThrow(/year/i);
    expect(() => localDateString(localDate(10000, 1, 1))).toThrow(/year/i);
  });

  it('rejects invalid picker dates but allows valid future picker dates', () => {
    expect(() => birthdayToDate('2023-02-29')).toThrow(/valid birthday/i);
    expect(localDateString(birthdayToDate('9999-12-31'))).toBe('9999-12-31');
  });
});

describe('formatBirthday', () => {
  it('formats the local birthday using the device locale', () => {
    const expected = birthdayToDate('2000-02-29').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(formatBirthday('2000-02-29')).toBe(expected);
    expect(formatBirthday('2000-02-29')).not.toBe('');
  });

  it('preserves a birthday on a date skipped by the current time zone', () => {
    const expected = new Date('2011-12-30T12:00:00Z').toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
    expect(formatBirthday('2011-12-30')).toBe(expected);
  });

  it('rejects impossible birthdays', () => {
    expect(() => formatBirthday('1900-02-29')).toThrow(/valid birthday/i);
  });
});

describe('validateBirthday', () => {
  it('accepts birthdays through the current local date', () => {
    const now = localDate(2024, 5, 20, 0);
    expect(validateBirthday('0001-01-01', now)).toBeNull();
    expect(validateBirthday('2024-05-19', now)).toBeNull();
    expect(validateBirthday('2024-05-20', now)).toBeNull();
  });

  it('reports human-readable invalid and future date errors', () => {
    const now = localDate(2024, 5, 20, 23);
    expect(validateBirthday('', now)).toMatch(/valid birthday.*YYYY-MM-DD/i);
    expect(validateBirthday('2024-02-30', now)).toMatch(/valid birthday/i);
    expect(validateBirthday('2024-05-21', now)).toMatch(/future/i);
    expect(validateBirthday('2025-01-01', now)).toMatch(/future/i);
    expect(validateBirthday('2024-01-01', new Date(NaN))).toMatch(/current date is invalid/i);
  });

  it('uses today by default', () => {
    jest.useFakeTimers();
    jest.setSystemTime(localDate(2024, 5, 20));
    expect(validateBirthday('2024-05-20')).toBeNull();
    expect(validateBirthday('2024-05-21')).toMatch(/future/i);
  });
});
