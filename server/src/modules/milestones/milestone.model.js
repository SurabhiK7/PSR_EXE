const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_CODES = ['Green', 'Yellow', 'Red', 'Blue'];

const milestoneSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    phase: { type: String, required: true, trim: true },
    baselineStartDate: { type: Date },
    forecastActualStartDate: { type: Date },
    baselineEndDate: { type: Date },
    forecastActualEndDate: { type: Date },
    status: { type: String, enum: STATUS_CODES, default: 'Green' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Milestone', milestoneSchema);
module.exports.STATUS_CODES = STATUS_CODES;
