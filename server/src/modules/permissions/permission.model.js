const mongoose = require('mongoose');

const { Schema } = mongoose;

const PERMISSION_KEYS = [
  'Create PSR',
  'Update PSR',
  'Delete PSR',
  'View PSR',
  'Send Communication',
  'Manage Users',
  'Manage Settings',
];

const ROLES = ['Admin', 'Project Manager', 'Service Delivery Manager', 'Early Engagement Owner'];

const DEFAULT_MATRIX = {
  Admin: [...PERMISSION_KEYS],
  'Project Manager': ['Create PSR', 'Update PSR', 'View PSR', 'Send Communication'],
  'Service Delivery Manager': ['Create PSR', 'Update PSR', 'View PSR', 'Send Communication'],
  'Early Engagement Owner': ['Create PSR', 'Update PSR', 'View PSR', 'Send Communication'],
};

// Singleton document holding the role -> permissions matrix.
const permissionSchema = new Schema(
  {
    key: { type: String, default: 'permission-matrix', unique: true },
    matrix: { type: Schema.Types.Mixed, default: DEFAULT_MATRIX },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
module.exports.PERMISSION_KEYS = PERMISSION_KEYS;
module.exports.ROLES = ROLES;
module.exports.DEFAULT_MATRIX = DEFAULT_MATRIX;
