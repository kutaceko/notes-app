const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 255,
  },
  text: {
    type: String,
    required: true,
  },
  important: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

noteSchema.index({ created_at: -1 });

module.exports = mongoose.model('Note', noteSchema);
