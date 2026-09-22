const mongoose = require('mongoose');

const { Schema } = mongoose;

const historySchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    user: { type: String, required: true },
    action: {
      type: String,
      enum: [
        'Project Created',
        'Project Updated',
        'Project Deleted',
        'Update Saved as Draft',
        'Update Published',
        'Update Deleted',
        'Milestone Added',
        'Milestone Updated',
        'Milestone Deleted',
        'Risk Added',
        'Risk Updated',
        'Risk Deleted',
        'Contact Added',
        'Contact Updated',
        'Contact Deleted',
        'Document Uploaded',
        'Document Deleted',
        'Communication Sent',
      ],
      required: true,
    },
    previousValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    reason: { type: String, default: '' },
  },
  { timestamps: false }
);

module.exports = mongoose.model('History', historySchema);
