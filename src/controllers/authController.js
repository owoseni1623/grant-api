const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../src/config/config');

// Import environment configuration
const env = require('../../env-config');

const generateToken = (userId, role) => {
  const secret = env.JWT_SECRET;
  
  if (!secret) {
    console.error('JWT_SECRET is not defined in environment variables.');
    throw new Error('JWT configuration error: Secret key is missing');
  }
  
  return jwt.sign({ userId, role }, secret, {
    expiresIn: '30d'
  });
};

/**
 * Verify if the current token is valid
 * @param {Object} req - Express request object (with user attached by authenticateToken middleware)
 * @param {Object} res - Express response object
 */
exports.verifyToken = async (req, res) => {
  // If middleware successfully attached user to request, token is valid
  try {
    res.status(200).json({
      valid: true,
      user: {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Token Verification Error:', error);
    res.status(401).json({ 
      valid: false,
      message: 'Invalid token' 
    });
  }
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
  console.log('loginUser', { email, passwordLength: password?.length });
  
  try {
    // Validate JWT_SECRET early
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is missing');
      return res.status(500).json({ 
        message: 'Server configuration error',
        error: 'Authentication system not properly configured'
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    console.log('User found', user ? { id: user._id, role: user.role } : 'No user found');
   
    // Check password
    if (user) {
      // Use the comparePassword method defined in your User model
      const isMatch = await user.comparePassword(password);
      console.log('Password match result', isMatch);
      
      if (isMatch) {
        try {
          // Generate token with try/catch
          const token = generateToken(user._id, user.role);
          console.log('Token generated', { token: token.substring(0, 15) + '...' });
          
          res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            token
          });
        } catch (tokenError) {
          console.error('Token generation error:', tokenError);
          return res.status(500).json({ 
            message: 'Error generating authentication token', 
            error: tokenError.message 
          });
        }
        return;
      }
    }
    
    // If we get here, authentication failed
    console.log('Authentication failed');
    res.status(401).json({ 
      message: 'Invalid credentials',
      fields: ['email', 'password']
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      message: 'Server error during login', 
      error: error.message 
    });
  }
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log('adminLogin', { email, passwordLength: password?.length });
  
  try {
    // Validate JWT_SECRET early
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is missing');
      return res.status(500).json({ 
        message: 'Server configuration error',
        error: 'Authentication system not properly configured'
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    console.log('Admin user lookup', user ? { id: user._id, role: user.role } : 'No user found');
    
    // Check password and admin status
    if (user) {
      const isMatch = await user.comparePassword(password);
      console.log('Admin password match', isMatch);
      
      if (isMatch) {
        console.log('Admin role check', { role: user.role, isAdmin: user.role === 'ADMIN' });
        
        if (user.role !== 'ADMIN') {
          console.log('Not an admin user');
          return res.status(403).json({ 
            message: 'Access denied. Admin privileges required.',
          });
        }
        
        try {
          // Generate token for admin with try/catch
          const token = generateToken(user._id, user.role);
          console.log('Admin token generated', { token: token.substring(0, 15) + '...' });
          
          res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            token
          });
        } catch (tokenError) {
          console.error('Token generation error:', tokenError);
          return res.status(500).json({ 
            message: 'Error generating authentication token', 
            error: tokenError.message 
          });
        }
        return;
      }
    }
    
    // If we get here, authentication failed
    console.log('Admin authentication failed');
    res.status(401).json({ 
      message: 'Invalid credentials',
      fields: ['email', 'password']
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ 
      message: 'Server error during admin login', 
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
      message: 'Password reset token has been generated',
      // In a real app, you would not send the token back to the client
      resetToken 
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

// Export the generateToken function 
exports.generateToken = generateToken;