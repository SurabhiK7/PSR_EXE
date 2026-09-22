require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');
const { logInfo, logError, LOG_DIR } = require('./config/logger');
const requestLogger = require('./config/requestLogger');

// Catch-all safety net: log anything that slips past all route-level try/catch blocks or
// Express error middleware, then exit so nodemon/a process manager can restart cleanly -
// matches Node's default "crash on unhandled error" behavior, just with a log entry first.
process.on('uncaughtException', (err) => {
  logError('Uncaught exception - process will exit', { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logError('Unhandled promise rejection - process will exit', { error: err.message, stack: err.stack });
  process.exit(1);
});

const projectsRouter = require('./modules/projects/projects.routes');
const updatesRouter = require('./modules/updates/updates.routes');
const milestonesRouter = require('./modules/milestones/milestones.routes');
const risksRouter = require('./modules/risks/risks.routes');
const contactsRouter = require('./modules/contacts/contacts.routes');
const documentsRouter = require('./modules/documents/documents.routes');
const historyRouter = require('./modules/history/history.routes');
const usersRouter = require('./modules/users/users.routes');
const settingsRouter = require('./modules/settings/settings.routes');
const permissionsRouter = require('./modules/permissions/permissions.routes');
const reportsRouter = require('./modules/reports/reports.routes');
const authRouter = require('./modules/auth/auth.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(requestLogger);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/projects', projectsRouter);
app.use('/api', updatesRouter); // /api/projects/:projectId/updates, /api/updates/:id
app.use('/api', milestonesRouter); // /api/projects/:projectId/milestones, /api/milestones/:id
app.use('/api', risksRouter); // /api/projects/:projectId/risks, /api/risks/:id
app.use('/api', contactsRouter); // /api/projects/:projectId/contacts, /api/contacts/:id
app.use('/api', documentsRouter); // /api/projects/:projectId/documents, /api/documents/:id
app.use('/api', historyRouter); // /api/projects/:projectId/history
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'PSR Communication Tool API' }));

// In production the client is built and served from this same process (single deployable
// service, no separate static host / CORS needed). Locally, Vite's dev server handles the UI.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logError(`Unhandled error in ${req.method} ${req.originalUrl}`, { error: err.message, stack: err.stack });
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

logInfo(`Activity log directory: ${LOG_DIR}`);

connectDB().then(() => {
  app.listen(PORT, () => {
    logInfo(`PSR Communication Tool API running on http://localhost:${PORT}`);
  });
});
