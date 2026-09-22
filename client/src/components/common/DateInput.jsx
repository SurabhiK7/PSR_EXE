import { DatePicker } from '@fluentui/react-datepicker-compat';

// Wraps Fluent's DatePicker so every date field in the app gets the same attractive, fully
// styled calendar popup (the native <input type="date"> calendar cannot be themed). The public
// props stay identical to the previous native version: `value` is an ISO `yyyy-mm-dd` string and
// `onChange(e, { value })` reports the same string, so no call site needs to change.

const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const calendarStrings = {
  days: DAYS_LONG,
  shortDays: DAYS_SHORT,
  months: MONTHS,
  shortMonths: MONTHS_SHORT,
  goToToday: 'Go to today',
};

// Parse using local date parts so an ISO date never shifts a day across time zones.
function isoToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateToIso(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDMY(date) {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

// Fluent's default text-input parser assumes MM/DD/YYYY, which silently swaps day/month (or
// fails outright for day > 12) against our DD/MM/YYYY formatDate - so manually typed dates must
// be parsed to match.
function parseDMY(text) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((text || '').trim());
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function DateInput({ value, onChange, disabled, style, ...rest }) {
  return (
    <DatePicker
      value={isoToDate(value)}
      onSelectDate={(date) => onChange?.(null, { value: dateToIso(date) })}
      formatDate={formatDMY}
      parseDate={parseDMY}
      placeholder="DD/MM/YYYY"
      disabled={disabled}
      allowTextInput
      highlightCurrentMonth
      highlightSelectedMonth
      showGoToToday
      strings={calendarStrings}
      root={{ style: { width: '100%', ...style } }}
      {...rest}
    />
  );
}
