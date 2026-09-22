const express = require('express');
const Permission = require('./permission.model');

const router = express.Router();

async function getOrCreateMatrix() {
  let doc = await Permission.findOne({ key: 'permission-matrix' });
  if (!doc) doc = await Permission.create({ key: 'permission-matrix' });
  return doc;
}

// GET /api/permissions
router.get('/', async (req, res) => {
  try {
    const doc = await getOrCreateMatrix();
    res.json({
      matrix: doc.matrix,
      roles: Permission.ROLES,
      permissionKeys: Permission.PERMISSION_KEYS,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/permissions
router.put('/', async (req, res) => {
  try {
    const doc = await getOrCreateMatrix();
    doc.matrix = req.body.matrix || doc.matrix;
    doc.markModified('matrix');
    await doc.save();
    res.json({
      matrix: doc.matrix,
      roles: Permission.ROLES,
      permissionKeys: Permission.PERMISSION_KEYS,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
