// Verhoeff multiplication table
const d = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];

// Verhoeff permutation table
const p = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];

// Verhoeff inverse table
const inv = [0,4,3,2,1,9,8,7,6,5];

/**
 * Validates an Aadhaar number using the Verhoeff checksum algorithm.
 * @param {string} number - The Aadhaar number to validate.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAadhaar(number) {
  if (typeof number !== 'string' || !/^[0-9]{12}$/.test(number)) {
    return { valid: false, error: 'Aadhaar number must be exactly 12 digits' };
  }

  const digits = number.split('').reverse().map(Number);
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }

  if (c !== 0) {
    return { valid: false, error: 'Invalid Aadhaar number (checksum failed)' };
  }

  return { valid: true };
}

/**
 * Masks an Aadhaar number, exposing only the last 4 digits.
 * @param {string} number - A 12-digit Aadhaar number string.
 * @returns {string} e.g. "XXXX XXXX 9012"
 */
export function maskAadhaar(number) {
  return 'XXXX XXXX ' + number.slice(-4);
}

/**
 * Validates an Indian phone number.
 * @param {string} phone
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePhone(phone) {
  if (/^\+91[0-9]{10}$/.test(phone)) {
    return { valid: true };
  }
  return { valid: false, error: 'Phone number must be in the format +91 followed by 10 digits' };
}

/**
 * Validates a 6-digit numeric OTP.
 * @param {string} otp
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateOtp(otp) {
  if (/^[0-9]{6}$/.test(otp)) {
    return { valid: true };
  }
  return { valid: false, error: 'OTP must be exactly 6 digits' };
}
