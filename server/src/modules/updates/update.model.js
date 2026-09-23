const mongoose = require('mongoose');

const { Schema } = mongoose;

const updateSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    currentUpdate: { type: String, default: '' },
    nextSteps: { type: String, default: '' },
    updatedBy: { type: String, default: '' },

    isDraft: { type: Boolean, default: true },
    sentAt: { type: Date },
    sentTo: { type: String, default: '' },
    sentCc: { type: String, default: '' },

    // Snapshot of the project's reporting period at the time this update was saved - shown in
    // the communication's History section instead of a raw timestamp, so each past entry
    // reflects the reporting period it actually reported on.
    reportingPeriodStartDate: { type: Date },
    reportingPeriodEndDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Update', updateSchema);
