const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_OPTIONS = ['Open', 'In Progress', 'Mitigated', 'Closed'];

const riskSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    riskIssue: { type: String, required: true, trim: true },
    dateRaised: { type: Date, default: Date.now },
    description: { type: String, required: true },
    impact: { type: String, default: '' },
    owner: { type: String, default: '' },
    status: { type: String, enum: STATUS_OPTIONS, default: 'Open' },
    mitigationRemarks: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Risk', riskSchema);
module.exports.STATUS_OPTIONS = STATUS_OPTIONS;
