const express = require('express');
const Milestone = require('./milestone.model');
const Project = require('../projects/project.model');
const History = require('../history/history.model');

const router = express.Router();

// GET /api/projects/:projectId/milestones
router.get('/projects/:projectId/milestones', async (req, res) => {
  try {
    const milestones = await Milestone.find({ project: req.params.projectId }).sort({ createdAt: 1 });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:projectId/milestones
router.post('/projects/:projectId/milestones', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const milestone = new Milestone({ ...req.body, project: project._id });
    await milestone.save();

    await History.create({
      project: project._id,
      user: req.body.addedBy || 'System',
      action: 'Milestone Added',
      previousValue: '',
      newValue: milestone.phase,
    });

    res.status(201).json(milestone);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/milestones/:id
router.put('/milestones/:id', async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    const previousValue = milestone.phase;
    // Never let the request body reassign a record to a different project.
    const { project, ...updateData } = req.body;
    Object.assign(milestone, updateData);
    await milestone.save();

    await History.create({
      project: milestone.project,
      user: req.body.updatedBy || 'System',
      action: 'Milestone Updated',
      previousValue,
      newValue: milestone.phase,
    });

    res.json(milestone);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/milestones/:id - requires a reason, stored in audit history
router.delete('/milestones/:id', async (req, res) => {
  try {
    const reason = String(req.body?.reason || req.query.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A reason for deletion is required.' });

    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    await milestone.deleteOne();

    await History.create({
      project: milestone.project,
      user: req.body?.deletedBy || 'System',
      action: 'Milestone Deleted',
      previousValue: milestone.phase,
      newValue: '',
      reason,
    });

    res.json({ message: 'Milestone deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
