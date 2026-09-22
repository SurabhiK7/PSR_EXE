const { logInfo, logWarn, logError } = require('./logger');

const MAX_BODY_LOG_LENGTH = 2000;
const ID = '[0-9a-fA-F]{24}';

// Plain-English description for each known API action, checked in order (first match wins).
// Keeping this as a simple list of "method + path pattern -> sentence" is much easier to
// read in the log file than raw "GET /api/projects/64f... -> 200" lines.
const ACTIONS = [
  { method: 'POST', regex: new RegExp(`^/api/projects/(${ID})/send-communication$`), build: (m) => `Sent PSR communication for project ${m[1]}` },
  { method: 'POST', regex: new RegExp(`^/api/projects/(${ID})/communication-preview$`), build: (m) => `Previewed PSR communication for project ${m[1]}` },
  { method: 'GET', regex: /^\/api\/projects\/by-pr\/([^/]+)$/, build: (m) => `Viewed project by PR ID ${m[1]}` },
  { method: 'GET', regex: new RegExp(`^/api/projects/(${ID})$`), build: (m) => `Viewed project ${m[1]}` },
  { method: 'PUT', regex: new RegExp(`^/api/projects/(${ID})$`), build: (m) => `Updated project ${m[1]}` },
  { method: 'DELETE', regex: new RegExp(`^/api/projects/(${ID})$`), build: (m) => `Deleted project ${m[1]}` },
  { method: 'POST', regex: /^\/api\/projects$/, build: () => 'Created a new project' },
  { method: 'GET', regex: /^\/api\/projects$/, build: () => 'Viewed project list' },

  { method: 'GET', regex: new RegExp(`^/api/projects/(${ID})/updates$`), build: (m) => `Viewed updates for project ${m[1]}` },
  { method: 'POST', regex: new RegExp(`^/api/projects/(${ID})/updates$`), build: (m) => `Added update to project ${m[1]}` },
  { method: 'PUT', regex: new RegExp(`^/api/updates/(${ID})$`), build: (m) => `Updated update entry ${m[1]}` },
  { method: 'DELETE', regex: new RegExp(`^/api/updates/(${ID})$`), build: (m) => `Deleted update entry ${m[1]}` },

  { method: 'GET', regex: new RegExp(`^/api/projects/(${ID})/milestones$`), build: (m) => `Viewed milestones for project ${m[1]}` },
  { method: 'POST', regex: new RegExp(`^/api/projects/(${ID})/milestones$`), build: (m) => `Added milestone to project ${m[1]}` },
  { method: 'PUT', regex: new RegExp(`^/api/milestones/(${ID})$`), build: (m) => `Updated milestone ${m[1]}` },
  { method: 'DELETE', regex: new RegExp(`^/api/milestones/(${ID})$`), build: (m) => `Deleted milestone ${m[1]}` },

  { method: 'GET', regex: new RegExp(`^/api/projects/(${ID})/risks$`), build: (m) => `Viewed risks for project ${m[1]}` },
  { method: 'POST', regex: new RegExp(`^/api/projects/(${ID})/risks$`), build: (m) => `Added risk to project ${m[1]}` },
  { method: 'PUT', regex: new RegExp(`^/api/risks/(${ID})$`), build: (m) => `Updated risk ${m[1]}` },
  { method: 'DELETE', regex: new RegExp(`^/api/risks/(${ID})$`), build: (m) => `Deleted risk ${m[1]}` },

  { method: 'GET', regex: new RegExp(`^/api/projects/(${ID})/contacts$`), build: (m) => `Viewed contacts for project ${m[1]}` },
  { method: 'POST', regex: new RegExp(`^/api/projects/(${ID})/contacts$`), build: (m) => `Added contact to project ${m[1]}` },
  { method: 'PUT', regex: new RegExp(`^/api/contacts/(${ID})$`), build: (m) => `Updated contact ${m[1]}` },
  { method: 'DELETE', regex: new RegExp(`^/api/contacts/(${ID})$`), build: (m) => `Deleted contact ${m[1]}` },

  { method: 'GET', regex: new RegExp(`^/api/projects/(${ID})/documents$`), build: (m) => `Viewed documents for project ${m[1]}` },
  { method: 'POST', regex: new RegExp(`^/api/projects/(${ID})/documents$`), build: (m) => `Uploaded document to project ${m[1]}` },
  { method: 'GET', regex: new RegExp(`^/api/documents/(${ID})/download$`), build: (m) => `Downloaded document ${m[1]}` },
  { method: 'DELETE', regex: new RegExp(`^/api/documents/(${ID})$`), build: (m) => `Deleted document ${m[1]}` },

  { method: 'GET', regex: new RegExp(`^/api/projects/(${ID})/history$`), build: (m) => `Viewed update history for project ${m[1]}` },

  { method: 'GET', regex: /^\/api\/users$/, build: () => 'Viewed user list' },
  { method: 'POST', regex: /^\/api\/users$/, build: () => 'Created a new user' },
  { method: 'PUT', regex: new RegExp(`^/api/users/(${ID})$`), build: (m) => `Updated user ${m[1]}` },
  { method: 'DELETE', regex: new RegExp(`^/api/users/(${ID})$`), build: (m) => `Deleted user ${m[1]}` },

  { method: 'GET', regex: /^\/api\/settings$/, build: () => 'Viewed settings' },
  { method: 'PUT', regex: /^\/api\/settings$/, build: () => 'Updated settings' },

  { method: 'GET', regex: /^\/api\/permissions$/, build: () => 'Viewed permissions' },
  { method: 'PUT', regex: /^\/api\/permissions$/, build: () => 'Updated permissions' },

  { method: 'GET', regex: /^\/api\/reports\/summary$/, build: () => 'Viewed reports summary' },
  { method: 'GET', regex: /^\/api\/reports\/recent-activity$/, build: () => 'Viewed recent activity feed' },
  { method: 'GET', regex: new RegExp(`^/api/reports/projects/(${ID})/pdf$`), build: (m) => `Downloaded PDF report for project ${m[1]}` },
];

// Turns "GET /api/projects/64f.../milestones" into "Viewed milestones for project 64f...".
// Falls back to the raw method + path for anything not in the list above, so nothing is lost.
function describeAction(method, originalUrl) {
  const pathOnly = originalUrl.split('?')[0];
  const action = ACTIONS.find((a) => a.method === method && a.regex.test(pathOnly));
  return action ? action.build(pathOnly.match(action.regex)) : `${method} ${pathOnly}`;
}

function safeBody(body) {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) return undefined;
  try {
    const json = JSON.stringify(body);
    return json.length > MAX_BODY_LOG_LENGTH ? `${json.slice(0, MAX_BODY_LOG_LENGTH)}...(truncated)` : JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 * Logs every /api request/response to the activity log file as a plain-English sentence
 * (e.g. "Added milestone to project 64f...") plus status code, duration, and (for 4xx/5xx
 * responses) the request body and the error message the route sent back - so every add,
 * view, update, and delete in the app shows up in the log without touching each route file.
 */
function requestLogger(req, res, next) {
  if (!req.originalUrl.startsWith('/api')) return next();

  const start = process.hrtime.bigint();
  let responseBody;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const action = describeAction(req.method, req.originalUrl);
    const meta = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      meta.requestBody = safeBody(req.body);
      meta.responseBody = responseBody;
      logError(`${action} - failed`, meta);
    } else if (res.statusCode >= 400) {
      meta.requestBody = safeBody(req.body);
      meta.responseBody = responseBody;
      logWarn(`${action} - failed`, meta);
    } else {
      logInfo(action, meta);
    }
  });

  next();
}

module.exports = requestLogger;
