const express = require('express');
const Contact = require('./contact.model');
const Project = require('../projects/project.model');
const History = require('../history/history.model');

const router = express.Router();

// GET /api/projects/:projectId/contacts
router.get('/projects/:projectId/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find({ project: req.params.projectId }).sort({ createdAt: 1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:projectId/contacts
router.post('/projects/:projectId/contacts', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const contact = new Contact({ ...req.body, project: project._id });
    await contact.save();

    await History.create({
      project: project._id,
      user: req.body.addedBy || 'System',
      action: 'Contact Added',
      previousValue: '',
      newValue: contact.name,
    });

    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/contacts/:id
router.put('/contacts/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    const previousValue = contact.name;
    // Never let the request body reassign a record to a different project.
    const { project, ...updateData } = req.body;
    Object.assign(contact, updateData);
    await contact.save();

    await History.create({
      project: contact.project,
      user: req.body.updatedBy || 'System',
      action: 'Contact Updated',
      previousValue,
      newValue: contact.name,
    });

    res.json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/contacts/:id - requires a reason, stored in audit history
router.delete('/contacts/:id', async (req, res) => {
  try {
    const reason = String(req.body?.reason || req.query.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A reason for deletion is required.' });

    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    await contact.deleteOne();

    await History.create({
      project: contact.project,
      user: req.body?.deletedBy || 'System',
      action: 'Contact Deleted',
      previousValue: contact.name,
      newValue: '',
      reason,
    });

    res.json({ message: 'Contact deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
