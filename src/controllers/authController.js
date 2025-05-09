const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
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
      password,
      role: 'USER' // Default role
    });

    // Save user with detailed validation
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Send response
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
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
  authDebug.log('loginUser', { email, passwordLength: password?.length });
  
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    authDebug.log('User found', user ? { id: user._id, role: user.role } : 'No user found');
   
    // Check password with explicit debugging
    if (user) {
      const isMatch = await authDebug.comparePasswords(password, user.password, bcrypt);
      authDebug.log('Password match result', isMatch);
      
      if (isMatch) {
        // Generate token
        const token = generateToken(user._id, user.role);
        authDebug.log('Token generated', { token: token.substring(0, 15) + '...' });
        
        res.json({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          token
        });
        return;
      }
    }
    
    // If we get here, authentication failed
    authDebug.log('Authentication failed');
    res.status(401).json({ 
      message: 'Invalid credentials',
      fields: ['email', 'password']
    });
  } catch (error) {
    const errorDetails = authDebug.error('Login Error', error);
    res.status(500).json({ 
      message: 'Server error during login', 
      error: errorDetails.message 
    });
  }
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  authDebug.log('adminLogin', { email, passwordLength: password?.length });
  
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    authDebug.log('Admin user lookup', user ? { id: user._id, role: user.role } : 'No user found');
    
    // Check password and admin status
    if (user) {
      const isMatch = await authDebug.comparePasswords(password, user.password, bcrypt);
      authDebug.log('Admin password match', isMatch);
      
      if (isMatch) {
        authDebug.log('Admin role check', { role: user.role, isAdmin: user.role === 'ADMIN' });
        
        if (user.role !== 'ADMIN') {
          authDebug.log('Not an admin user');
          return res.status(403).json({ 
            message: 'Access denied. Admin privileges required.',
          });
        }
        
        // Generate token for admin
        const token = generateToken(user._id, user.role);
        authDebug.log('Admin token generated', { token: token.substring(0, 15) + '...' });
        
        res.json({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          token
        });
        return;
      }
    }
    
    // If we get here, authentication failed
    authDebug.log('Admin authentication failed');
    res.status(401).json({ 
      message: 'Invalid credentials',
      fields: ['email', 'password']
    });
  } catch (error) {
    const errorDetails = authDebug.error('Admin Login Error', error);
    res.status(500).json({ 
      message: 'Server error during admin login', 
      error: errorDetails.message 
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
      mobilePhone: user.mobilePhone,
      role: user.role
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

    // Store reset token fields to User model
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

exports.resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  
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
    // Hash the token from the request
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: 'Password reset token is invalid or has expired'
      });
    }
    
    // Update password and clear reset token fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Generate new token
    const newToken = generateToken(user._id, user.role);
    
    res.json({
      message: 'Password has been reset successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ 
      message: 'Server error resetting password', 
      error: error.message 
    });
  }
};

// Create admin user (for initial setup or testing)
exports.createAdminUser = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    adminSecret
  } = req.body;

  // Define both the environment variable and a hardcoded backup
  const expectedSecret = process.env.ADMIN_SECRET || 'motunrayo23!';
  
  // Normalize both strings by trimming whitespace and ensuring they're strings
  const normalizedProvided = String(adminSecret).trim();
  const normalizedExpected = String(expectedSecret).trim();
  
  // Verify admin creation secret with normalized values
  if (normalizedProvided !== normalizedExpected) {
    return res.status(403).json({ 
      message: 'Invalid admin creation secret',
      // Include additional info in development only
      debug: process.env.NODE_ENV === 'development' ? {
        providedLength: normalizedProvided.length,
        expectedLength: normalizedExpected.length
      } : undefined
    });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email is already registered'
      });
    }

    // Create new admin user
    const admin = new User({
      firstName,
      lastName,
      email,
      primaryPhone: req.body.primaryPhone || '0000000000', // Default if not provided
      password,
      role: 'ADMIN'
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin user created successfully',
      admin: {
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin Creation Error:', error);
    
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
    
    res.status(500).json({ 
      message: 'Server error creating admin user', 
      error: error.message 
    });
  }
};

// List all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ 
      message: 'Server error fetching users', 
      error: error.message 
    });
  }
};

module.exports.generateToken = generateToken;