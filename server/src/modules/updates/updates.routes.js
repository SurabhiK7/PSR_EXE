const express = require('express');
const Update = require('./update.model');
const Project = require('../projects/project.model');
const History = require('../history/history.model');

const router = express.Router();

// A blank update (no content in either field) carries no real information - never counted as
// a "latest update", shown in history, or listed as a resumable draft.
function hasContent(u) {
  return Boolean((u.currentUpdate || '').trim() || (u.nextSteps || '').trim());
}

// GET /api/projects/:projectId/updates - chronological update history
router.get('/projects/:projectId/updates', async (req, res) => {
  try {
    const updates = await Update.find({ project: req.params.projectId }).sort({ createdAt: -1 });
    res.json(updates.filter(hasContent));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:projectId/updates - create a new update (draft or final)
router.post('/projects/:projectId/updates', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (!String(req.body.currentUpdate || '').trim() && !String(req.body.nextSteps || '').trim()) {
      return res.status(400).json({ message: 'Enter a current update or next steps before saving.' });
    }

    const isDraft = req.body.isDraft !== false;
    const update = new Update({
      project: project._id,
      currentUpdate: req.body.currentUpdate || '',
      nextSteps: req.body.nextSteps || '',
      updatedBy: req.body.updatedBy || '',
      isDraft,
      reportingPeriodStartDate: project.reportingPeriodStartDate,
      reportingPeriodEndDate: project.reportingPeriodEndDate,
    });
    await update.save();

    if (!isDraft) {
      project.lastUpdatedBy = update.updatedBy || project.lastUpdatedBy;
      project.lastUpdatedDate = new Date();
      await project.save();
    }

    await History.create({
      project: project._id,
      user: update.updatedBy || 'System',
      action: isDraft ? 'Update Saved as Draft' : 'Update Submitted',
      previousValue: '',
      newValue: (update.currentUpdate || '').slice(0, 200),
    });

    res.status(201).json(update);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/updates/drafts - every unpublished "Latest Update" draft across all projects,
// used by the Drafts sidebar page so a PM can resume any in-progress update from one place.
router.get('/updates/drafts', async (req, res) => {
  try {
    const drafts = await Update.find({ isDraft: true })
      .sort({ updatedAt: -1 })
      .populate('project', 'prId accountName projectManager status')
      .lean();
    res.json(drafts.filter((d) => d.project && hasContent(d)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/updates/:id - edit an existing update (also used to finalize a draft)
router.put('/updates/:id', async (req, res) => {
  try {
    const update = await Update.findById(req.params.id);
    if (!update) return res.status(404).json({ message: 'Update not found' });

    const wasDraft = update.isDraft;
    const project = await Project.findById(update.project);
    Object.assign(update, {
      currentUpdate: req.body.currentUpdate ?? update.currentUpdate,
      nextSteps: req.body.nextSteps ?? update.nextSteps,
      updatedBy: req.body.updatedBy ?? update.updatedBy,
      isDraft: req.body.isDraft !== undefined ? req.body.isDraft : update.isDraft,
      // Refresh the snapshot to whatever the project's reporting period currently is, in case
      // Project Information was edited since this update was first started.
      reportingPeriodStartDate: project ? project.reportingPeriodStartDate : update.reportingPeriodStartDate,
      reportingPeriodEndDate: project ? project.reportingPeriodEndDate : update.reportingPeriodEndDate,
    });
    await update.save();

    if (wasDraft && !update.isDraft && project) {
      project.lastUpdatedBy = update.updatedBy || project.lastUpdatedBy;
      project.lastUpdatedDate = new Date();
      await project.save();
    }

    await History.create({
      project: update.project,
      user: update.updatedBy || 'System',
      action: update.isDraft ? 'Update Saved as Draft' : 'Update Submitted',
      previousValue: '',
      newValue: (update.currentUpdate || '').slice(0, 200),
    });

    res.json(update);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/updates/:id - requires a reason, stored in audit history
router.delete('/updates/:id', async (req, res) => {
  try {
    const reason = String(req.body?.reason || req.query.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A reason for deletion is required.' });

    const update = await Update.findById(req.params.id);
    if (!update) return res.status(404).json({ message: 'Update not found' });

    await update.deleteOne();

    await History.create({
      project: update.project,
      user: req.body?.deletedBy || 'System',
      action: 'Update Deleted',
      previousValue: (update.currentUpdate || '').slice(0, 200),
      newValue: '',
      reason,
    });

    res.json({ message: 'Update deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
