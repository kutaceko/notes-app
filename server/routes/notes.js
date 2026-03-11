const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const authenticate = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all notes (optionally filter by important)
router.get('/', async (req, res) => {
  const { important } = req.query;

  try {
    const filter = { user_id: req.user.id };
    if (important === 'true') {
      filter.important = true;
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ error: 'Chyba serveru při načítání poznámek.' });
  }
});

// Create a new note
router.post('/', async (req, res) => {
  const { title, text } = req.body;

  if (!title || !text) {
    return res.status(400).json({ error: 'Nadpis a text poznámky jsou povinné.' });
  }
  if (title.length > 255) {
    return res.status(400).json({ error: 'Nadpis může mít maximálně 255 znaků.' });
  }

  try {
    const note = await Note.create({ user_id: req.user.id, title, text });
    res.status(201).json(note);
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Chyba serveru při vytváření poznámky.' });
  }
});

// Toggle important status
router.patch('/:id/important', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Neplatné ID poznámky.' });
  }

  try {
    const note = await Note.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!note) {
      return res.status(404).json({ error: 'Poznámka nenalezena.' });
    }

    note.important = !note.important;
    await note.save();
    res.json(note);
  } catch (err) {
    console.error('Toggle important error:', err);
    res.status(500).json({ error: 'Chyba serveru při změně stavu poznámky.' });
  }
});

// Delete a note
router.delete('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Neplatné ID poznámky.' });
  }

  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!note) {
      return res.status(404).json({ error: 'Poznámka nenalezena.' });
    }

    res.json({ message: 'Poznámka byla smazána.' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Chyba serveru při mazání poznámky.' });
  }
});

module.exports = router;
