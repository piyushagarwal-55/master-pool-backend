const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  departureLocation: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  departureTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Departure time must be in the future'
    }
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for efficient queries
tripSchema.index({ creatorId: 1 });
tripSchema.index({ departureTime: 1 });
tripSchema.index({ status: 1 });

module.exports = mongoose.model('Trip', tripSchema);
