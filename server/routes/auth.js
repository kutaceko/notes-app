const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Note = require('../models/Note');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Uživatelské jméno a heslo jsou povinné.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Heslo musí mít alespoň 6 znaků.' });
  }

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Uživatelské jméno je již obsazené.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, password_hash });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, username: user.username });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Chyba serveru při registraci.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Uživatelské jméno a heslo jsou povinné.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Neplatné uživatelské jméno nebo heslo.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Neplatné uživatelské jméno nebo heslo.' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Chyba serveru při přihlášení.' });
  }
});

// Delete account (requires password confirmation)
router.delete('/account', authenticate, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Pro zrušení účtu je nutné zadat heslo.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Uživatel nenalezen.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Nesprávné heslo.' });
    }

    // Delete all user's notes, then the user
    await Note.deleteMany({ user_id: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'Účet a všechny poznámky byly úspěšně smazány.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Chyba serveru při rušení účtu.' });
  }
});

module.exports = router;
