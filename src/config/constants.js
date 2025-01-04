module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'privateKey',
    JWT_EXPIRATION: '7d',
    SALT_ROUNDS: 10,
  };