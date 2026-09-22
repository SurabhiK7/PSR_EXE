const mongoose = require('mongoose');
const { ORG_NAME, TAGLINE } = require('../../config/branding');

const { Schema } = mongoose;

// Singleton document (there will only ever be one) holding organization-wide settings.
const settingSchema = new Schema(
  {
    key: { type: String, default: 'app-settings', unique: true },
    organizationName: { type: String, default: ORG_NAME },
    organizationTagline: { type: String, default: TAGLINE },
    supportEmail: { type: String, default: '' },
    emailFooter: { type: String, default: `This is an automated message from the ${ORG_NAME} PSR Communication Tool.` },
    notifyOnSubmit: { type: Boolean, default: true },
    notifyOnDelete: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
