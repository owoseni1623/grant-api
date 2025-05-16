const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRATION } = require('../config/constants');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email 
    }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRATION }
  );
};

module.exports = { generateToken };