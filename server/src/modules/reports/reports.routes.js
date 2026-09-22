const express = require('express');
const fs = require('fs');
const Project = require('../projects/project.model');
const Milestone = require('../milestones/milestone.model');
const Risk = require('../risks/risk.model');
const Update = require('../updates/update.model');
const Contact = require('../contacts/contact.model');
const History = require('../history/history.model');
const Setting = require('../settings/setting.model');
const { generateReportPdf } = require('./reportGenerator');

const router = express.Router();

// GET /api/reports/summary - aggregate analytics used by the Reports dashboard
router.get('/summary', async (req, res) => {
  try {
    const [projects, milestones, risks] = await Promise.all([
      Project.find().lean(),
      Milestone.find().lean(),
      Risk.find().lean(),
    ]);

    const byStage = {};
    projects.forEach((p) => {
      byStage[p.projectStage] = (byStage[p.projectStage] || 0) + 1;
    });

    const byRag = { Green: 0, Yellow: 0, Red: 0 };
    milestones.forEach((m) => {
      if (byRag[m.status] !== undefined) byRag[m.status] += 1;
    });

    const byImpact = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    risks.forEach((r) => {
      if (byImpact[r.impact] !== undefined) byImpact[r.impact] += 1;
    });

    const now = new Date();
    const overdueMilestones = milestones.filter(
      (m) => m.baselineEndDate && new Date(m.baselineEndDate) < now && !m.forecastActualEndDate && m.status !== 'Green'
    ).length;

    res.json({
      totalProjects: projects.length,
      byStage: Object.entries(byStage).map(([name, value]) => ({ name, value })),
      byRag: Object.entries(byRag).map(([name, value]) => ({ name, value })),
      byImpact: Object.entries(byImpact).map(([name, value]) => ({ name, value })),
      totalMilestones: milestones.length,
      overdueMilestones,
      totalOpenRisks: risks.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/recent-activity - latest audit history entries across all projects
router.get('/recent-activity', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8;
    const entries = await History.find().sort({ timestamp: -1 }).limit(limit).populate('project', 'prId accountName').lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/projects/:id/pdf - generate and download a project status report
router.get('/projects/:id/pdf', async (req, res) => {
  let pdfPath;
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const [updates, milestones, risks, contacts] = await Promise.all([
      Update.find({ project: project._id }).sort({ createdAt: -1 }).lean(),
      Milestone.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
      Risk.find({ project: project._id }).sort({ date: -1 }).lean(),
      Contact.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
    ]);
    const latestUpdate = updates[0] || null;

    const settings = await Setting.findOne({ key: 'app-settings' }).lean();
    pdfPath = await generateReportPdf({
      project,
      latestUpdate,
      updates,
      milestones,
      risks,
      contacts,
      emailFooter: settings?.emailFooter,
      orgName: settings?.organizationName,
      tagline: settings?.organizationTagline,
    });
    res.download(pdfPath, `${project.prId}-status-report.pdf`, (err) => {
      if (pdfPath) fs.unlink(pdfPath, () => {});
      if (err && !res.headersSent) res.status(500).json({ message: 'Failed to download report.' });
    });
  } catch (err) {
    if (pdfPath) fs.unlink(pdfPath, () => {});
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
