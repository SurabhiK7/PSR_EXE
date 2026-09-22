const { customAlphabet } = require('nanoid');
const Project = require('../models/Project');
const { ORG_NAME } = require('../config/branding');

const nanoid = customAlphabet('0123456789', 4);

// Generates a PR-ID in the form <ORG_NAME>-<year>-<4 digit sequence>
async function generateProjectId() {
  const year = new Date().getFullYear();
  const prefix = `${ORG_NAME}-${year}-`;

  const count = await Project.countDocuments({ prId: new RegExp(`^${prefix}`) });
  let sequence = count + 1;
  let candidate = `${prefix}${String(sequence).padStart(4, '0')}`;

  // Ensure uniqueness in case of race conditions
  // eslint-disable-next-line no-await-in-loop
  while (await Project.exists({ prId: candidate })) {
    sequence += 1;
    candidate = `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  return candidate;
}

module.exports = { generateProjectId, nanoid };
