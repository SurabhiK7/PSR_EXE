const mongoose = require('mongoose');

const { Schema } = mongoose;

// Mirrors what gets written to the activity-*.log file, so the same events can be queried
// from MongoDB in real time (e.g. from a future "Activity" admin page) instead of only
// being readable by opening the log file on disk.
const activityLogSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    level: { type: String, enum: ['info', 'warn', 'error'], required: true, index: true },
    message: { type: String, required: true },
    method: String,
    path: String,
    status: Number,
    durationMs: Number,
    ip: String,
    requestBody: Schema.Types.Mixed,
    responseBody: Schema.Types.Mixed,
    error: String,
    stack: String,
    meta: Schema.Types.Mixed, // anything else that doesn't fit the fields above
  },
  { collection: 'activityLogs' }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
