const mongoose = require('mongoose');
const { ORG_NAME } = require('../../config/branding');

const { Schema } = mongoose;

const contactSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    group: { type: String, enum: [ORG_NAME, 'External'], default: ORG_NAME },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: '' },
    email: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    company: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);
