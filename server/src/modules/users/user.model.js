const mongoose = require('mongoose');

const { Schema } = mongoose;

const USER_ROLES = ['Admin', 'Project Manager', 'Service Delivery Manager', 'Early Engagement Owner'];
const USER_STATUSES = ['Active', 'Inactive'];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    role: { type: String, enum: USER_ROLES, default: 'Project Manager' },
    status: { type: String, enum: USER_STATUSES, default: 'Active' },
    passwordHash: { type: String, select: false },
    passwordSalt: { type: String, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
module.exports.USER_ROLES = USER_ROLES;
module.exports.USER_STATUSES = USER_STATUSES;
