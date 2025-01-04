const mongoose = require('mongoose');

const grantApplicationSchema = new mongoose.Schema({
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    ssn: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    gender: String,
    ethnicity: String,
  },
  employmentInfo: {
    employmentStatus: String,
    incomeLevel: String,
    educationLevel: String,
    citizenshipStatus: String
  },
  addressInfo: {
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true }
  },
  fundingInfo: {
    fundingType: { type: String, required: true },
    fundingAmount: { type: Number, required: true },
    fundingPurpose: { type: String, required: true },
    timeframe: String
  },
  documents: {
    idCardFront: { type: String, required: true },
    idCardBack: { type: String, required: true }
  },
  agreeToCommunication: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED'], 
    default: 'PENDING' 
  },
  createdAt: { type: Date, default: Date.now }
});

const grantSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  deadline: Date,
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
  createdAt: { type: Date, default: Date.now }
});

const GrantApplication = mongoose.model('GrantApplication', grantApplicationSchema);
const Grant = mongoose.model('Grant', grantSchema);

module.exports = {
  GrantApplication,
  Grant
};