const fs = require('fs');
const path = require('path');

// All activity (requests, business events, warnings, errors, crashes) is appended to a
// single local log file per day, as plain human-readable text, so it can be opened directly
// in VS Code and understood at a glance. This is a plain file on disk - nothing leaves the
// machine.
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function currentLogFile() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `activity-${today}.log`);
}

// "2026-09-17 11:09:43.026" - local time, sortable, no T/Z clutter.
function formatTimestamp(date) {
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  );
}

function stringifyValue(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Turns a (message, meta) pair into a readable multi-line block, e.g.:
 *
 * [2026-09-17 11:09:43.026] INFO   GET /api/reports/summary -> 304  (20.18ms, ip ::1)
 *
 * [2026-09-17 11:09:34.460] ERROR  Uncaught exception - process will exit
 *   error: listen EADDRINUSE: address already in use :::5000
 *   stack:
 *     Error: listen EADDRINUSE: address already in use :::5000
 *         at Server.setupListenHandle [as _listen2] (node:net:2167:16)
 *         ...
 */
function formatEntry(level, message, meta) {
  const header = `[${formatTimestamp(new Date())}] ${level.toUpperCase().padEnd(5)}  ${message}`;
  if (!meta || Object.keys(meta).length === 0) return `${header}\n`;

  // Request/response log lines (from requestLogger.js) - keep the common case to one line.
  const { method, path: reqPath, status, durationMs, ip, requestBody, responseBody, ...rest } = meta;
  const lines = [header];
  if (status !== undefined || durationMs !== undefined || ip !== undefined) {
    const parts = [];
    if (status !== undefined) parts.push(`status ${status}`);
    if (durationMs !== undefined) parts.push(`${durationMs}ms`);
    if (ip !== undefined) parts.push(`ip ${ip}`);
    lines[0] += `  (${parts.join(', ')})`;
  }
  if (requestBody !== undefined) lines.push(`  requestBody: ${stringifyValue(requestBody)}`);
  if (responseBody !== undefined) lines.push(`  responseBody: ${stringifyValue(responseBody)}`);

  // Error/warning metadata (error message + stack trace).
  if (rest.error !== undefined) lines.push(`  error: ${rest.error}`);
  if (rest.stack !== undefined) {
    lines.push('  stack:');
    rest.stack.split('\n').forEach((l) => lines.push(`    ${l}`));
  }
  Object.keys(rest)
    .filter((k) => k !== 'error' && k !== 'stack')
    .forEach((k) => lines.push(`  ${k}: ${stringifyValue(rest[k])}`));

  return `${lines.join('\n')}\n`;
}

// Saves the same entry to MongoDB (collection "activitylogs") in real time, so it can be
// queried later without opening the log file. Lazy-required and fire-and-forget: if Mongo
// isn't connected yet (or ever), this must never block or crash the rest of logging.
function saveToMongo(level, message, meta) {
  try {
    const ActivityLog = require('./activityLog.model');
    const { method, path: reqPath, status, durationMs, ip, requestBody, responseBody, error, stack, ...rest } = meta || {};
    ActivityLog.create({
      level,
      message,
      method,
      path: reqPath,
      status,
      durationMs,
      ip,
      requestBody,
      responseBody,
      error,
      stack,
      meta: Object.keys(rest).length ? rest : undefined,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[logger] Failed to save log entry to MongoDB:', err.message);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[logger] Failed to save log entry to MongoDB:', err.message);
  }
}

function write(level, message, meta) {
  const block = formatEntry(level, message, meta);
  try {
    fs.appendFileSync(currentLogFile(), block);
  } catch (writeErr) {
    // Last resort - never let logging itself crash the app.
    // eslint-disable-next-line no-console
    console.error('[logger] Failed to write log entry:', writeErr.message);
  }
  // Mirror to the console too, so `npm run dev` output is unchanged/still visible.
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(block.trimEnd());
  saveToMongo(level, message, meta);
}

module.exports = {
  logInfo: (message, meta) => write('info', message, meta),
  logWarn: (message, meta) => write('warn', message, meta),
  logError: (message, meta) => write('error', message, meta),
  LOG_DIR,
};

