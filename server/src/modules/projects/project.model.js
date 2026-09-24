const mongoose = require('mongoose');

const { Schema } = mongoose;

const PROJECT_STAGES = ['In Progress', 'At Risk', 'Delayed', 'On Hold', 'Completed', 'Closed'];
const PROJECT_STATUSES = ['Draft', 'Submitted'];

const projectSchema = new Schema(
  {
    prId: { type: String, required: true, unique: true, index: true },
    accountName: { type: String, required: true, trim: true },
    projectManager: { type: String, required: true, trim: true },
    projectScope: { type: String, default: '' },
    projectStartDate: { type: Date, required: true },
    reportingPeriodStartDate: { type: Date },
    reportingPeriodEndDate: { type: Date },
    projectStage: { type: String, enum: PROJECT_STAGES, default: 'In Progress' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'Draft' },
    // Wizard step index (0-based) active when "Save as Draft" was last clicked, so continuing
    // a draft from the Drafts page reopens the same step instead of always starting at step 0.
    draftStep: { type: Number, default: 0 },
    // Set whenever "Save as Draft" is clicked on an already-Submitted project (unpublished
    // in-progress edits), so it can still be surfaced on the Drafts page even though `status`
    // itself must stay 'Submitted'. Cleared once those edits are actually published.
    draftSavedAt: { type: Date, default: null },

    lastUpdatedBy: { type: String, default: '' },
    lastUpdatedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

projectSchema.index({ accountName: 'text', prId: 'text', projectManager: 'text' });

module.exports = mongoose.model('Project', projectSchema);
module.exports.PROJECT_STAGES = PROJECT_STAGES;
module.exports.PROJECT_STATUSES = PROJECT_STATUSES;
