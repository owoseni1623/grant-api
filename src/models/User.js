const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters long'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  middleInitial: {
    type: String,
    trim: true,
    maxlength: [1, 'Middle initial must be a single character']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters long'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(value) {
        return validator.isEmail(value);
      },
      message: 'Please provide a valid email address'
    }
  },
  primaryPhone: {
    type: String,
    required: [true, 'Primary phone number is required'],
    trim: true,
    validate: {
      validator: function(value) {
        return /^(\+\d{1,2}\s?)?(\d{10}|\d{3}[-.]?\d{3}[-.]?\d{4})$/.test(value);
      },
      message: 'Please provide a valid phone number'
    }
  },
  mobilePhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        return value === '' || /^(\+\d{1,2}\s?)?(\d{10}|\d{3}[-.]?\d{3}[-.]?\d{4})$/.test(value);
      },
      message: 'Please provide a valid mobile phone number'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(value) {
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        return hasUpperCase && hasLowerCase && hasNumber && value.length >= 8;
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
  },
  // New fields for profile page
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  organization: {
    type: String,
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position/title cannot exceed 100 characters']
  },
  memberSince: {
    type: Date,
    default: Date.now
  },
  // Original fields
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  },
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Virtual for avatar URL to ensure consistent URLs across sessions
UserSchema.virtual('avatarUrl').get(function() {
  if (this.avatar) {
    if (this.avatar.startsWith('http')) {
      return this.avatar;
    }
    // Use the specific backend URL for your application
    const baseUrl = process.env.API_URL || 'https://grant-api.onrender.com';
    return `${baseUrl}/${this.avatar.replace(/\\/g, '/')}`;
  }
  return null;
});

// Make sure virtuals are included in JSON conversion
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
 
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(12);
   
    // Hash the password along with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);
module.exports = User;