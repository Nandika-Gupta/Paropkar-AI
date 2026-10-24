// Deterministic date helpers. Indian certificates are written day-first, so
// ambiguous numeric dates (05/06/2024) are always read as DD/MM/YYYY.

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISO(year, month, day) {
  if (year < 100) year += 2000;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return toISO(y, m, d) === value;
}

/**
 * Parse a date string in any common certificate format into YYYY-MM-DD.
 * Returns null when the value cannot be read as a real calendar date.
 */
function normalizeDate(value) {
  if (value === null || value === undefined) return null;
  let s = String(value).trim();
  if (!s) return null;

  // Common OCR confusions inside numeric dates: O->0, l/I->1
  if (/^[\dOolI]{1,4}[/.\-][\dOolI]{1,2}[/.\-][\dOolI]{2,4}$/.test(s)) {
    s = s.replace(/[Oo]/g, '0').replace(/[lI]/g, '1');
  }

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return toISO(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (m) return toISO(+m[3], +m[2], +m[1]);

  // 15 March 2024, 15-Mar-2024, 15th Mar, 2024
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-.]+([A-Za-z]+)[\s\-.,]+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return toISO(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);

  // March 15, 2024
  m = s.match(/^([A-Za-z]+)[\s\-.]+(\d{1,2})(?:st|nd|rd|th)?,?[\s\-.]+(\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return toISO(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);

  return null;
}

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

function daysBetween(fromISO, toISODate) {
  const [y1, m1, d1] = fromISO.split('-').map(Number);
  const [y2, m2, d2] = toISODate.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS);
}

/** Today's date in India (YYYY-MM-DD), independent of the Lambda's UTC clock. */
function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

module.exports = { normalizeDate, isISODate, addDays, daysBetween, todayInIndia };
