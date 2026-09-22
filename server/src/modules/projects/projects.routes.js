const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const Project = require('./project.model');
const Update = require('../updates/update.model');
const Milestone = require('../milestones/milestone.model');
const Risk = require('../risks/risk.model');
const Contact = require('../contacts/contact.model');
const Document = require('../documents/document.model');
const { uploadDir } = require('../documents/upload.middleware');
const History = require('../history/history.model');
const Setting = require('../settings/setting.model');
const { openInOutlook } = require('../communication/mailer');
const { generateReportPdf } = require('../reports/reportGenerator');
const { isAzureMailConfigured, sendMailViaGraph } = require('../communication/azureMailer');
const { buildCommunicationHtml, buildCommunicationSubject, getLogoPngBuffer, LOGO_CID } = require('../communication/communicationTemplate');

const EMAIL_RE = /^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/;

// The admin-configured Settings values, if saved - fall back to buildCommunicationHtml's/
// generateReportPdf's own defaults (the static branding.js constants) when a field is unset.
async function getBrandingSettings() {
  const settings = await Setting.findOne({ key: 'app-settings' }).lean();
  return {
    emailFooter: settings?.emailFooter || undefined,
    orgName: settings?.organizationName || undefined,
    tagline: settings?.organizationTagline || undefined,
  };
}

function parseEmails(value) {
  return String(value || '')
    .split(';')
    .map((e) => e.trim())
    .filter(Boolean);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A blank update (no content in either field) carries no real information - never counted as
// a "latest update" or shown in communication history.
function hasUpdateContent(u) {
  return Boolean((u.currentUpdate || '').trim() || (u.nextSteps || '').trim());
}

const MIME_TYPES = {
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS: 'application/vnd.ms-excel',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPT: 'application/vnd.ms-powerpoint',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  PNG: 'image/png',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  TXT: 'text/plain',
};

// Resolves selected document IDs (from the "Attachments to include" checkboxes) to files that
// actually exist on disk, scoped to the given project so a caller can't reference another
// project's documents.
async function resolveSelectedDocuments(projectId, documentIds) {
  if (!documentIds || !documentIds.length) return [];
  const docs = await Document.find({ _id: { $in: documentIds }, project: projectId });
  return docs
    .map((doc) => ({ doc, absolutePath: path.join(uploadDir, path.basename(doc.filePath)) }))
    .filter(({ absolutePath }) => fs.existsSync(absolutePath));
}

const router = express.Router();

// GET /api/projects - search
router.get('/', async (req, res) => {
  try {
    const { q, projectStage, status } = req.query;
    const filter = {};

    if (q) {
      const regex = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ prId: regex }, { accountName: regex }, { projectManager: regex }];
    }
    if (projectStage) filter.projectStage = projectStage;
    if (status) filter.status = status;

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
    const prId = String(req.body.prId || '').trim();
    if (!prId) return res.status(400).json({ message: 'PR-ID is required.' });

    const existing = await Project.findOne({ prId });
    if (existing) return res.status(400).json({ message: `PR-ID "${prId}" is already in use. Please choose a different PR-ID.` });

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
    if (err.code === 11000) {
      return res.status(400).json({ message: 'That PR-ID is already in use. Please choose a different PR-ID.' });
    }
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    // PR-ID is set once at creation and cannot be changed via update.
    const { prId, ...updateData } = req.body;

    Object.assign(existing, updateData, {
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
      previousValue: `${project.prId} - ${project.accountName}`,
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

    const [updatesRaw, milestones, risks, contacts] = await Promise.all([
      Update.find({ project: project._id }).sort({ createdAt: -1 }).lean(),
      Milestone.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
      Risk.find({ project: project._id }).sort({ date: -1 }).lean(),
      Contact.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
    ]);
    const updates = updatesRaw.filter(hasUpdateContent);

    const savedLatest = updates[0] || null;
    const overrides = req.body || {};
    // Blank strings (the wizard's Latest Update form always starts empty, even in update mode)
    // must NOT count as a real override - only genuinely typed text should replace the saved
    // content in the preview.
    const overrideCurrentUpdate = typeof overrides.currentUpdate === 'string' ? overrides.currentUpdate : '';
    const overrideNextSteps = typeof overrides.nextSteps === 'string' ? overrides.nextSteps : '';
    const hasMeaningfulOverride = Boolean(overrideCurrentUpdate.trim() || overrideNextSteps.trim());
    // If the saved latest update is still a draft, an override is continuing to edit that same
    // record in place (so it stays excluded from history, same as the real record would be).
    // If it's already published (or there's no saved update yet), an override represents a
    // brand-new entry that hasn't been added yet - so nothing existing should be excluded from
    // history on its account.
    const editingExistingDraft = hasMeaningfulOverride && Boolean(savedLatest?.isDraft);
    const latestUpdate = hasMeaningfulOverride
      ? {
          currentUpdate: overrideCurrentUpdate.trim() ? overrideCurrentUpdate : savedLatest?.currentUpdate || '',
          nextSteps: overrideNextSteps.trim() ? overrideNextSteps : savedLatest?.nextSteps || '',
          createdAt: editingExistingDraft ? savedLatest.createdAt : new Date(),
          isDraft: true,
        }
      : savedLatest;
    // Exclude the saved latest record from history whenever it's the thing being shown as
    // "Latest Update" (either shown as-is, or being edited in place as a draft) - only a
    // genuinely new (non-draft-continuing) entry leaves every existing record in history.
    const historyUpdates = !hasMeaningfulOverride || editingExistingDraft ? updates.slice(1) : updates;

    const html = await buildCommunicationHtml({ project, latestUpdate, updates, historyUpdates, milestones, risks, contacts, ...(await getBrandingSettings()) });
    const subject = buildCommunicationSubject(project);
    res.json({ html, subject });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:id/send-communication - builds the HTML status report communication
// and either sends it automatically via Microsoft Graph (if Azure is configured, with the PDF
// report attached) or sends it through the local desktop Outlook app (same HTML as the message
// body - no PDF attachment) using the signed-in mailbox.
router.post('/:id/send-communication', async (req, res) => {
  let pdfPath;
  let logoTmpPath;
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

    const [updatesRaw, milestones, risks, contacts] = await Promise.all([
      Update.find({ project: project._id }).sort({ createdAt: -1 }).lean(),
      Milestone.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
      Risk.find({ project: project._id }).sort({ date: -1 }).lean(),
      Contact.find({ project: project._id }).sort({ createdAt: 1 }).lean(),
    ]);
    const updates = updatesRaw.filter(hasUpdateContent);
    const latestUpdate = updates[0] || null;

    const selectedDocuments = await resolveSelectedDocuments(project._id, req.body.documentIds);

    const subject = buildCommunicationSubject(project);
    const branding = await getBrandingSettings();
    const html = await buildCommunicationHtml({ project, latestUpdate, updates, milestones, risks, contacts, ...branding });

    // Prefer fully automated sending via Microsoft Graph once Azure AD credentials are
    // configured. Until then, fall back to opening a pre-filled draft in the local desktop
    // Outlook app (unchanged existing behavior) — the user reviews and sends it themselves.
    if (isAzureMailConfigured()) {
      if (!toEmails.length) {
        return res.status(400).json({ message: 'At least one "To" recipient is required to send automatically.' });
      }
      try {
        pdfPath = await generateReportPdf({ project, latestUpdate, updates, milestones, risks, contacts, ...branding });
        const attachments = [
          {
            name: `${project.prId}-status-report.pdf`,
            contentType: 'application/pdf',
            contentBytes: fs.readFileSync(pdfPath).toString('base64'),
          },
          ...selectedDocuments.map(({ doc, absolutePath }) => ({
            name: doc.documentName,
            contentType: MIME_TYPES[doc.fileType] || 'application/octet-stream',
            contentBytes: fs.readFileSync(absolutePath).toString('base64'),
          })),
        ];
        await sendMailViaGraph({
          to: toEmails,
          cc: ccEmails,
          subject,
          html,
          attachments,
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

    if (!toEmails.length) {
      return res.status(400).json({ message: 'At least one "To" recipient is required to send.' });
    }

    try {
      // Outlook's Word-based HTML renderer doesn't reliably display base64 data-URI images, so
      // the message gets its own HTML variant referencing the logo via cid: + an inline attachment.
      let outlookHtml = html;
      const inlineImages = [];
      const logoBuffer = await getLogoPngBuffer();
      if (logoBuffer) {
        logoTmpPath = path.join(os.tmpdir(), `pcp-logo-${crypto.randomUUID()}.png`);
        fs.writeFileSync(logoTmpPath, logoBuffer);
        inlineImages.push({ path: logoTmpPath, contentId: LOGO_CID });
        outlookHtml = await buildCommunicationHtml(
          { project, latestUpdate, updates, milestones, risks, contacts, ...branding },
          { logoSrc: `cid:${LOGO_CID}` }
        );
      }

      await openInOutlook({
        to: toEmails.join(';'),
        cc: ccEmails.join(';') || undefined,
        subject,
        html: outlookHtml,
        attachmentPaths: selectedDocuments.map(({ absolutePath }) => absolutePath),
        inlineImages,
      });
    } catch (mailErr) {
      return res.status(502).json({ message: mailErr.message });
    }

    await History.create({
      project: project._id,
      user: project.lastUpdatedBy || 'System',
      action: 'Communication Sent',
      previousValue: '',
      newValue: `Sent via Outlook to: ${toEmails.join(', ')}`,
    });

    res.json({ message: 'Email sent via Outlook.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    if (pdfPath) fs.unlink(pdfPath, () => {});
    if (logoTmpPath) fs.unlink(logoTmpPath, () => {});
  }
});

module.exports = router;
