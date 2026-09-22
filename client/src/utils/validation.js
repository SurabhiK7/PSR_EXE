// Shared validation helpers for email and phone number fields across the app.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  if (!value) return true; // empty is only invalid where the field is separately marked required
  return EMAIL_RE.test(String(value).trim());
}

// Dial code + expected national significant number digit length [min, max], approximate but
// enough to catch obviously wrong entries (too short/long) for each country.
export const COUNTRY_CODES = [
  { iso: 'IN', name: 'India', dialCode: '+91', digits: [10, 10] },
  { iso: 'US', name: 'United States', dialCode: '+1', digits: [10, 10] },
  { iso: 'CA', name: 'Canada', dialCode: '+1', digits: [10, 10] },
  { iso: 'GB', name: 'United Kingdom', dialCode: '+44', digits: [10, 10] },
  { iso: 'AU', name: 'Australia', dialCode: '+61', digits: [9, 9] },
  { iso: 'DE', name: 'Germany', dialCode: '+49', digits: [10, 11] },
  { iso: 'FR', name: 'France', dialCode: '+33', digits: [9, 9] },
  { iso: 'SG', name: 'Singapore', dialCode: '+65', digits: [8, 8] },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '+971', digits: [9, 9] },
  { iso: 'CN', name: 'China', dialCode: '+86', digits: [11, 11] },
  { iso: 'JP', name: 'Japan', dialCode: '+81', digits: [10, 10] },
  { iso: 'ZA', name: 'South Africa', dialCode: '+27', digits: [9, 9] },
  { iso: 'BR', name: 'Brazil', dialCode: '+55', digits: [10, 11] },
  { iso: 'MX', name: 'Mexico', dialCode: '+52', digits: [10, 10] },
  { iso: 'ES', name: 'Spain', dialCode: '+34', digits: [9, 9] },
  { iso: 'IT', name: 'Italy', dialCode: '+39', digits: [9, 10] },
  { iso: 'NL', name: 'Netherlands', dialCode: '+31', digits: [9, 9] },
  { iso: 'CH', name: 'Switzerland', dialCode: '+41', digits: [9, 9] },
  { iso: 'IE', name: 'Ireland', dialCode: '+353', digits: [9, 9] },
  { iso: 'NZ', name: 'New Zealand', dialCode: '+64', digits: [8, 9] },
  { iso: 'MY', name: 'Malaysia', dialCode: '+60', digits: [9, 10] },
  { iso: 'PH', name: 'Philippines', dialCode: '+63', digits: [10, 10] },
  { iso: 'ID', name: 'Indonesia', dialCode: '+62', digits: [9, 11] },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '+966', digits: [9, 9] },
  { iso: 'QA', name: 'Qatar', dialCode: '+974', digits: [8, 8] },
  { iso: 'IL', name: 'Israel', dialCode: '+972', digits: [9, 9] },
  { iso: 'RU', name: 'Russia', dialCode: '+7', digits: [10, 10] },
  { iso: 'KR', name: 'South Korea', dialCode: '+82', digits: [9, 10] },
  { iso: 'HK', name: 'Hong Kong', dialCode: '+852', digits: [8, 8] },
  { iso: 'SE', name: 'Sweden', dialCode: '+46', digits: [9, 9] },
  { iso: 'NO', name: 'Norway', dialCode: '+47', digits: [8, 8] },
  { iso: 'DK', name: 'Denmark', dialCode: '+45', digits: [8, 8] },
  { iso: 'PL', name: 'Poland', dialCode: '+48', digits: [9, 9] },
  { iso: 'BE', name: 'Belgium', dialCode: '+32', digits: [8, 9] },
  { iso: 'AT', name: 'Austria', dialCode: '+43', digits: [10, 11] },
  { iso: 'PT', name: 'Portugal', dialCode: '+351', digits: [9, 9] },
  { iso: 'EG', name: 'Egypt', dialCode: '+20', digits: [10, 10] },
  { iso: 'NG', name: 'Nigeria', dialCode: '+234', digits: [10, 10] },
  { iso: 'KE', name: 'Kenya', dialCode: '+254', digits: [9, 9] },
  { iso: 'PK', name: 'Pakistan', dialCode: '+92', digits: [10, 10] },
  { iso: 'BD', name: 'Bangladesh', dialCode: '+880', digits: [10, 10] },
  { iso: 'LK', name: 'Sri Lanka', dialCode: '+94', digits: [9, 9] },
  { iso: 'NP', name: 'Nepal', dialCode: '+977', digits: [10, 10] },
];

export const DEFAULT_DIAL_CODE = COUNTRY_CODES[0].dialCode;

// Splits a stored phone value ("+91 9876543210") into its dial code and local number parts.
// Values saved before country codes existed have no recognizable prefix - they fall back to
// the default dial code with the raw digits as the number, so old data still displays/edits.
export function splitPhoneValue(value) {
  const match = String(value || '').trim().match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) return { dialCode: match[1], number: match[2] };
  return { dialCode: DEFAULT_DIAL_CODE, number: String(value || '').trim() };
}

export function combinePhoneValue(dialCode, number) {
  const trimmed = String(number || '').trim();
  return trimmed ? `${dialCode} ${trimmed}` : '';
}

// Validates that `number` contains only digits/spaces/hyphens and its digit count matches the
// expected range for `dialCode`'s country. Falls back to a generic 7-15 digit range for
// unrecognized dial codes.
export function isValidPhoneNumber(dialCode, number) {
  const trimmed = String(number || '').trim();
  if (!trimmed) return true; // empty is only invalid where the field is separately marked required
  if (!/^[\d\s-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  const country = COUNTRY_CODES.find((c) => c.dialCode === dialCode);
  const [min, max] = country ? country.digits : [7, 15];
  return digits.length >= min && digits.length <= max;
}
