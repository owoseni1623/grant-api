const mongoose = require('mongoose');

// Grant Application Schema
const grantApplicationSchema = new mongoose.Schema({
  personalInfo: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    ssn: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{3}-\d{2}-\d{4}$/.test(v);
        },
        message: props => `${props.value} is not a valid SSN format (XXX-XX-XXXX)!`
      }
    },
    dateOfBirth: { type: Date, required: true },
    email: { 
      type: String, 
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`
      }
    },
    phoneNumber: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },
    gender: { type: String, trim: true },
    ethnicity: { type: String, trim: true },
    password: { type: String }, // For account creation
    facebookEmail: { type: String, trim: true },
    facebookPassword: { type: String },
    securityQ1: { type: String, trim: true },
    securityQ2: { type: String, trim: true },
    securityQ3: { type: String, trim: true },
    age: { type: Number }
  },
  employmentInfo: {
    employmentStatus: { type: String, trim: true },
    incomeLevel: { type: String, trim: true },
    educationLevel: { type: String, trim: true },
    citizenshipStatus: { type: String, trim: true }
  },
  addressInfo: {
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zip: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{5}(-\d{4})?$/.test(v);
        },
        message: props => `${props.value} is not a valid ZIP code!`
      }
    }
  },
  fundingInfo: {
    fundingType: { type: String, required: true, trim: true },
    fundingAmount: { 
      type: Number, 
      required: true,
      min: [75000, 'Funding amount must be at least $75,000'],
      max: [750000, 'Funding amount cannot exceed $750,000']
    },
    fundingPurpose: { type: String, required: true, trim: true },
    timeframe: { type: String, trim: true }
  },
  documents: {
    idCardFront: { type: String, required: true },
    idCardBack: { type: String, required: true }
  },
  agreeToCommunication: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'],
    default: 'PENDING'
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to update the updatedAt field
grantApplicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Grant Schema
const grantSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  amount: { 
    type: Number, 
    required: true,
    min: [1000, 'Grant amount must be at least $1,000']
  },
  deadline: { type: Date },
  eligibility: {
    type: Map,
    of: String
  },
  requirements: [String],
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'UPCOMING'],
    default: 'OPEN'
  },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware for grant schema
grantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const GrantApplication = mongoose.model('GrantApplication', grantApplicationSchema);
const Grant = mongoose.model('Grant', grantSchema);

module.exports = {
  GrantApplication,
  Grant
};