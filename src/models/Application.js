const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    ssn: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    gender: {
      type: String,
      trim: true
    },
    ethnicity: {
      type: String,
      trim: true
    }
  },
  
  employmentInfo: {
    employmentStatus: {
      type: String,
      trim: true
    },
    incomeLevel: {
      type: String,
      trim: true
    },
    educationLevel: {
      type: String,
      trim: true
    },
    citizenshipStatus: {
      type: String,
      trim: true
    }
  },
  
  addressInfo: {
    streetAddress: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zip: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  fundingInfo: {
    fundingType: {
      type: String,
      required: true,
      trim: true
    },
    fundingAmount: {
      type: Number,
      required: true
    },
    timeframe: {
      type: String,
      trim: true
    },
    fundingPurpose: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  documents: {
    idCardFront: {
      type: String,
      required: true
    },
    idCardBack: {
      type: String,
      required: true
    }
  },
  
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  
  statusHistory: [{
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  agreeToCommunication: {
    type: Boolean,
    default: false
  },
  
  termsAccepted: {
    type: Boolean,
    required: true,
    default: false
  }
}, {
  timestamps: true
});

const Application = mongoose.model('Application', ApplicationSchema);

module.exports = Application;