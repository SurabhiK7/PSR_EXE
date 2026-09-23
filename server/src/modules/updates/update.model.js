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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Update', updateSchema);
