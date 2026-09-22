const express = require('express');
const History = require('./history.model');

const router = express.Router();

// GET /api/projects/:projectId/history
router.get('/projects/:projectId/history', async (req, res) => {
  try {
    const history = await History.find({ project: req.params.projectId }).sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
