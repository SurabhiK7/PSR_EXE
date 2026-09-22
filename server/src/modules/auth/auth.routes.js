const express = require('express');
const User = require('../users/user.model');
const { hashPassword, verifyPassword } = require('./auth.utils');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status };
}

// POST /api/auth/signup - first-time account creation; sets the password for a new user.
router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'An account with that email already exists. Please log in instead.' });
    }

    const { salt, hash } = hashPassword(password);
    const user = await User.create({ name, email, passwordSalt: salt, passwordHash: hash });
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'An account with that email already exists. Please log in instead.' });
    }
    res.status(400).json({ message: err.message });
  }
});

// POST /api/auth/login - verifies email + password for an account created via signup.
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash +passwordSalt');
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'This account has been deactivated. Contact an administrator.' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
