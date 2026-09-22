const express = require('express');
const path = require('path');
const fs = require('fs');
const Document = require('./document.model');
const History = require('../history/history.model');
const { upload, uploadDir } = require('./upload.middleware');

const router = express.Router();

// GET /api/projects/:projectId/documents
router.get('/projects/:projectId/documents', async (req, res) => {
  try {
    const documents = await Document.find({ project: req.params.projectId }).sort({ uploadDate: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:projectId/documents
router.post('/projects/:projectId/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const doc = new Document({
      project: req.params.projectId,
      documentName: req.body.documentName || req.file.originalname,
      uploadedBy: req.body.uploadedBy || 'Unknown',
      fileType: path.extname(req.file.originalname).replace('.', '').toUpperCase(),
      filePath: `/uploads/${req.file.filename}`,
      size: req.file.size,
    });
    await doc.save();

    await History.create({
      project: req.params.projectId,
      user: doc.uploadedBy,
      action: 'Document Uploaded',
      previousValue: '',
      newValue: doc.documentName,
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/documents/:id - toggle whether this document is included when sending communications
router.patch('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if ('includeInCommunication' in req.body) {
      doc.includeInCommunication = Boolean(req.body.includeInCommunication);
    }
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/documents/:id/download
router.get('/documents/:id/download', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const filePath = path.join(uploadDir, path.basename(doc.filePath));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on disk' });
    res.download(filePath, doc.documentName);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/documents/:id - requires a reason, stored in audit history
router.delete('/documents/:id', async (req, res) => {
  try {
    const reason = String(req.body?.reason || req.query.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A reason for deletion is required.' });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const filePath = path.join(uploadDir, path.basename(doc.filePath));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await doc.deleteOne();

    await History.create({
      project: doc.project,
      user: req.body?.deletedBy || 'System',
      action: 'Document Deleted',
      previousValue: doc.documentName,
      newValue: '',
      reason,
    });

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
