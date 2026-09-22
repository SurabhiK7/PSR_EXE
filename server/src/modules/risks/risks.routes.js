const express = require('express');
const Risk = require('./risk.model');
const Project = require('../projects/project.model');
const History = require('../history/history.model');

const router = express.Router();

// GET /api/projects/:projectId/risks
router.get('/projects/:projectId/risks', async (req, res) => {
  try {
    const risks = await Risk.find({ project: req.params.projectId }).sort({ dateRaised: -1 });
    res.json(risks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:projectId/risks
router.post('/projects/:projectId/risks', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const risk = new Risk({ ...req.body, project: project._id });
    await risk.save();

    await History.create({
      project: project._id,
      user: req.body.addedBy || 'System',
      action: 'Risk Added',
      previousValue: '',
      newValue: risk.riskIssue,
    });

    res.status(201).json(risk);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/risks/:id
router.put('/risks/:id', async (req, res) => {
  try {
    const risk = await Risk.findById(req.params.id);
    if (!risk) return res.status(404).json({ message: 'Risk not found' });

    const previousValue = risk.riskIssue;
    // Never let the request body reassign a record to a different project.
    const { project, ...updateData } = req.body;
    Object.assign(risk, updateData);
    await risk.save();

    await History.create({
      project: risk.project,
      user: req.body.updatedBy || 'System',
      action: 'Risk Updated',
      previousValue,
      newValue: risk.riskIssue,
    });

    res.json(risk);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/risks/:id - requires a reason, stored in audit history
router.delete('/risks/:id', async (req, res) => {
  try {
    const reason = String(req.body?.reason || req.query.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A reason for deletion is required.' });

    const risk = await Risk.findById(req.params.id);
    if (!risk) return res.status(404).json({ message: 'Risk not found' });

    await risk.deleteOne();

    await History.create({
      project: risk.project,
      user: req.body?.deletedBy || 'System',
      action: 'Risk Deleted',
      previousValue: risk.riskIssue,
      newValue: '',
      reason,
    });

    res.json({ message: 'Risk deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
