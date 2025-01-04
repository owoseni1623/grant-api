const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

exports.registerUser = async (req, res) => {
  const {
    firstName,
    middleInitial,
    lastName,
    email,
    primaryPhone,
    mobilePhone,
    password,
    confirmPassword
  } = req.body;

  // Additional client-side validation
  if (password !== confirmPassword) {
    return res.status(400).json({ 
      message: 'Validation Error', 
      errors: [{ 
        field: 'confirmPassword', 
        message: 'Passwords must match exactly' 
      }]
    });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Validation Error',
        errors: [{ 
          field: 'email', 
          message: 'Email is already registered' 
        }]
      });
    }

    // Create new user
    const user = new User({
      firstName,
      middleInitial: middleInitial || '',
      lastName,
      email,
      primaryPhone,
      mobilePhone: mobilePhone || '',
      password
    });

    // Save user with detailed validation
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      token
    });
  } catch (error) {
    console.error('Registration Error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));

      return res.status(400).json({ 
        message: 'Validation Error', 
        errors 
      });
    }

    // Generic server error
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if user exists
    const user = await User.findOne({ email });
   
    // Check password
    if (user && (await user.comparePassword(password))) {
      // Generate token
      const token = generateToken(user._id);
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        token
      });
    } else {
      res.status(401).json({ 
        message: 'Invalid credentials',
        field: ['email', 'password']
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      message: 'Server error during login', 
      error: error.message 
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    // Find user by ID (from protect middleware) and exclude password
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      primaryPhone: user.primaryPhone,
      mobilePhone: user.mobilePhone
    });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    res.status(500).json({ 
      message: 'Server error fetching profile', 
      error: error.message 
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        message: 'No account found with this email',
        field: 'email'
      });
    }

    // Generate reset token 
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Optional: Add reset token fields to User model if needed
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // NOTE: In a real app, you would send an email with the reset link here
    res.json({ 
      message: 'Password reset token has been generated' 
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ 
      message: 'Server error processing password reset', 
      error: error.message 
    });
  }
};

module.exports.generateToken = generateToken;