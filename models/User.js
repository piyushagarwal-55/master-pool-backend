const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@lnmiit\.ac\.in$/, 'Please use a valid LNMIIT email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    sparse: true
  },
  rollNumber: {
    type: String,
    sparse: true,
    uppercase: true
  },
  phone: {
    type: String,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Extract roll number from email
userSchema.pre('save', function(next) {
  if (this.email && !this.rollNumber) {
    const match = this.email.match(/^([^@]+)@lnmiit\.ac\.in$/);
    if (match) {
      this.rollNumber = match[1].toUpperCase();
      this.username = this.rollNumber;
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
