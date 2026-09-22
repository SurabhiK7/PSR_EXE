const express = require('express');
const Setting = require('./setting.model');
const { isAzureMailConfigured, getMissingEnvVars } = require('../communication/azureMailer');

const router = express.Router();

async function getOrCreateSettings() {
  let settings = await Setting.findOne({ key: 'app-settings' });
  if (!settings) settings = await Setting.create({ key: 'app-settings' });
  return settings;
}

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      ...settings.toObject(),
      emailAutomation: {
        configured: isAzureMailConfigured(),
        missingEnvVars: getMissingEnvVars(),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    Object.assign(settings, {
      organizationName: req.body.organizationName ?? settings.organizationName,
      organizationTagline: req.body.organizationTagline ?? settings.organizationTagline,
      supportEmail: req.body.supportEmail ?? settings.supportEmail,
      emailFooter: req.body.emailFooter ?? settings.emailFooter,
      notifyOnSubmit: req.body.notifyOnSubmit ?? settings.notifyOnSubmit,
      notifyOnDelete: req.body.notifyOnDelete ?? settings.notifyOnDelete,
    });
    await settings.save();
    res.json({
      ...settings.toObject(),
      emailAutomation: {
        configured: isAzureMailConfigured(),
        missingEnvVars: getMissingEnvVars(),
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
