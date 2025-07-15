const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Trip'
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ tripId: 1, timestamp: -1 });
messageSchema.index({ tripId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
