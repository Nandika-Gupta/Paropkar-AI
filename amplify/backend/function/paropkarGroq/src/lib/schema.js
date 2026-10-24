const { z } = require('zod');
const { isISODate } = require('./dates');

const CERTIFICATE_TYPES = ['income_certificate', 'caste_certificate', 'domicile_certificate', 'other'];

const isoDate = z.string().refine(isISODate, { message: 'must be a real date in YYYY-MM-DD format' });
const text = z.string().trim().min(1);

// Fields the LLM must return. Extra keys are stripped, missing keys fail.
const ExtractionSchema = z.object({
  certificateType: z.enum(CERTIFICATE_TYPES).nullable(),
  holderName: text.nullable(),
  issueDate: isoDate.nullable(),
  expiryDate: isoDate.nullable(),
  issuingAuthority: text.nullable(),
  state: text.nullable(),
  confidence: z.number().min(0).max(1),
});

const FIELD_NAMES = ['certificateType', 'holderName', 'issueDate', 'expiryDate', 'issuingAuthority', 'state'];

/** Returns { success: true, data } or { success: false, errors: string[] }. */
function validateExtraction(value) {
  const result = ExtractionSchema.safeParse(value);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}

module.exports = { ExtractionSchema, CERTIFICATE_TYPES, FIELD_NAMES, validateExtraction };
