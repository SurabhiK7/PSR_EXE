const express = require('express');
const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const Update = require('../models/Update');
const Milestone = require('../models/Milestone');
const Risk = require('../models/Risk');
const Contact = require('../models/Contact');
const History = require('../models/History');
const { generateProjectId } = require('../utils/generateProjectId');
const { openInOutlook } = require('../utils/mailer');
const { generateReportPdf } = require('../utils/reportGenerator');
const { isAzureMailConfigured, sendMailViaGraph } = require('../utils/azureMailer');
const { buildCommunicationHtml, buildCommunicationSubject } = require('../utils/communicationTemplate');

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

function parseEmails(value) {
  return String(value || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

const router = express.Router();

// GET /api/projects - search
router.get('/', async (req, res) => {
  try {
    const { q, projectStage } = req.query;
    const filter = {};

    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ prId: regex }, { accountName: regex }, { projectManager: regex }];
    }
    if (projectStage) filter.projectStage = projectStage;

    const projects = await Project.find(filter).sort({ lastUpdatedDate: -1 }).lean();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/by-pr/:prId - lookup used by the Update/View/Delete PSR PR-ID fetch flows
router.get('/by-pr/:prId', async (req, res) => {
  try {
    const project = await Project.findOne({ prId: req.params.prId.trim() });
    if (!project) return res.status(404).json({ message: 'No project found for that PR-ID.' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const prId = await generateProjectId();
    const project = new Project({
      ...req.body,
      prId,
      lastUpdatedBy: req.body.projectManager || 'System',
      lastUpdatedDate: new Date(),
    });
    await project.save();

    await History.create({
      project: project._id,
      user: project.projectManager || 'System',
      action: 'Project Created',
      previousValue: '',
      newValue: `Project ${project.prId} created`,
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    Object.assign(existing, req.body, {
      lastUpdatedDate: new Date(),
      lastUpdatedBy: req.body.lastUpdatedBy || existing.lastUpdatedBy,
    });
    await existing.save();

    await History.create({
      project: existing._id,
      user: req.body.lastUpdatedBy || 'System',
      action: 'Project Updated',
      previousValue: '',
      newValue: 'Project information updated',
    });

    res.json(existing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/projects/:id - requires a reason, stored in audit history
router.delete('/:id', async (req, res) => {
  try {
    const reason = String(req.body?.reason || req.query.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A reason for deletion is required.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await Promise.all([
      Update.deleteMany({ project: project._id }),
      Milestone.deleteMany({ project: project._id }),
      Risk.deleteMany({ project: project._id }),
      Contact.deleteMany({ project: project._id }),
    ]);
    await project.deleteOne();

    await History.create({
      project: project._id,
      user: req.body?.deletedBy || 'System',
      action: 'Project Deleted',
      previousValue: `${project.prId} — ${project.accountName}`,
      newValue: '',
      reason,
    });

    res.json({ message: 'Project deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:id/communication-preview - renders the same HTML communication
// template used for sending, populated with real-time data (optionally overriding the
// Latest Update fields with an in-progress, not-yet-saved draft from the wizard). Used by
// the client's Preview dialog (iframe) and the Download action. Nothing is persisted.
router.post('/:id/communication-preview', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const [updates, milestones, risks, contacts] = await Promise.all([
      Update.find({ project: project._id }).sort({ createdAt: -1 }).lean(),
      Milestone.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
      Risk.find({ project: project._id }).sort({ date: -1 }).lean(),
      Contact.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
    ]);

    const savedLatest = updates[0] || null;
    const overrides = req.body || {};
    const hasOverride = ['currentUpdate', 'nextSteps', 'risksDependencies'].some((k) => k in overrides);
    const latestUpdate = hasOverride
      ? {
          currentUpdate: overrides.currentUpdate ?? savedLatest?.currentUpdate ?? '',
          nextSteps: overrides.nextSteps ?? savedLatest?.nextSteps ?? '',
          risksDependencies: overrides.risksDependencies ?? savedLatest?.risksDependencies ?? '',
          createdAt: savedLatest?.createdAt || new Date(),
          isDraft: true,
        }
      : savedLatest;

    const html = buildCommunicationHtml({ project, latestUpdate, updates, milestones, risks, contacts });
    const subject = buildCommunicationSubject(project);
    res.json({ html, subject });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:id/send-communication - builds the HTML status report communication
// and either sends it automatically via Microsoft Graph (if Azure is configured) or opens it
// as an Outlook draft (with the same HTML as the message body, plus a PDF attachment) for the
// user to review and send manually.
router.post('/:id/send-communication', async (req, res) => {
  let pdfPath;
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const toEmails = parseEmails(req.body.to);
    const ccEmails = parseEmails(req.body.cc);
    if (toEmails.length && !toEmails.every((e) => EMAIL_RE.test(e))) {
      return res.status(400).json({ message: 'One or more recipient email addresses are invalid.' });
    }
    if (ccEmails.length && !ccEmails.every((e) => EMAIL_RE.test(e))) {
      return res.status(400).json({ message: 'One or more CC email addresses are invalid.' });
    }

    const [updates, milestones, risks, contacts] = await Promise.all([
      Update.find({ project: project._id }).sort({ createdAt: -1 }).lean(),
      Milestone.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
      Risk.find({ project: project._id }).sort({ date: -1 }).lean(),
      Contact.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
    ]);
    const latestUpdate = updates[0] || null;

    pdfPath = await generateReportPdf({ project, latestUpdate, updates, milestones, risks, contacts });

    const subject = buildCommunicationSubject(project);
    const html = buildCommunicationHtml({ project, latestUpdate, updates, milestones, risks, contacts });

    // Prefer fully automated sending via Microsoft Graph once Azure AD credentials are
    // configured. Until then, fall back to opening a pre-filled draft in the local desktop
    // Outlook app (unchanged existing behavior) — the user reviews and sends it themselves.
    if (isAzureMailConfigured()) {
      if (!toEmails.length) {
        return res.status(400).json({ message: 'At least one "To" recipient is required to send automatically.' });
      }
      try {
        const attachmentBase64 = fs.readFileSync(pdfPath).toString('base64');
        await sendMailViaGraph({
          to: toEmails,
          cc: ccEmails,
          subject,
          html,
          attachmentBase64,
          attachmentName: `${project.prId}-status-report.pdf`,
        });
      } catch (mailErr) {
        return res.status(502).json({ message: mailErr.message });
      }

      await History.create({
        project: project._id,
        user: project.lastUpdatedBy || 'System',
        action: 'Communication Sent',
        previousValue: '',
        newValue: `Sent automatically via Azure to: ${toEmails.join(', ')}`,
      });

      return res.json({ message: 'Email sent automatically via Azure.' });
    }

    try {
      await openInOutlook({
        to: toEmails.join(','),
        cc: ccEmails.join(',') || undefined,
        subject,
        html,
        attachmentPath: pdfPath,
      });
    } catch (mailErr) {
      return res.status(502).json({ message: mailErr.message });
    }

    await History.create({
      project: project._id,
      user: project.lastUpdatedBy || 'System',
      action: 'Communication Sent',
      previousValue: '',
      newValue: toEmails.length ? `Report attached, pre-filled to: ${toEmails.join(', ')}` : 'Report attached; recipients added manually in Outlook',
    });

    res.json({ message: 'Opened in Outlook with the report attached. Add recipients if needed and click Send there.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    if (pdfPath) fs.unlink(pdfPath, () => {});
  }
});

module.exports = router;
