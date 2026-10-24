// Expiry status is computed here, deterministically — never by the LLM.
const { addDays, daysBetween, todayInIndia } = require('./dates');

// Validity periods from .kiro/specs/certificate_rules.kiro
const VALIDITY_DAYS = {
  income_certificate: 365,
  caste_certificate: 730,
};

const EXPIRING_SOON_DAYS = 30;

/**
 * @param {{certificateType?: string|null, issueDate?: string|null, expiryDate?: string|null}} fields
 *   Dates must already be validated YYYY-MM-DD strings (or null).
 * @param {{today?: string}} [opts] today as YYYY-MM-DD; defaults to today in IST.
 */
function computeExpiry(fields, { today = todayInIndia() } = {}) {
  let expiryDate = fields.expiryDate || null;
  let expirySource = expiryDate ? 'document' : null;

  if (!expiryDate && fields.issueDate && VALIDITY_DAYS[fields.certificateType]) {
    expiryDate = addDays(fields.issueDate, VALIDITY_DAYS[fields.certificateType] - 1);
    expirySource = 'derived_from_validity';
  }

  if (!expiryDate) {
    return { expiryDate: null, expirySource: null, status: 'UNKNOWN', daysRemaining: null };
  }

  const daysRemaining = daysBetween(today, expiryDate);
  let status = 'VALID';
  if (daysRemaining < 0) status = 'EXPIRED';
  else if (daysRemaining <= EXPIRING_SOON_DAYS) status = 'EXPIRING_SOON';

  return { expiryDate, expirySource, status, daysRemaining };
}

module.exports = { computeExpiry, VALIDITY_DAYS, EXPIRING_SOON_DAYS };
