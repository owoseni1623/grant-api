const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Check for MongoDB URI in environment variables
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('\x1b[31m%s\x1b[0m', '❌ FATAL ERROR: MONGODB_URI is not defined!');
      console.error('Steps to resolve:');
      console.error('1. Check your .env file');
      console.error('2. Ensure MONGODB_URI is correctly set');
      throw new Error('MongoDB connection URI is missing. Check your .env file!');
    }

    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,  // Timeout after 30 seconds
      socketTimeoutMS: 45000,           // Close sockets after 45 seconds
      connectTimeoutMS: 30000,          // Return error after 30 seconds
      maxPoolSize: 10,                  // Maintain up to 10 socket connections
      minPoolSize: 5,                   // Maintain at least 5 socket connections
      family: 4                         // Use IPv4, skip trying IPv6
    };

    // Attempt to connect to MongoDB
    const conn = await mongoose.connect(mongoUri, options);

    console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB Connected Successfully!');
    console.log(`MongoDB Host: ${conn.connection.host}`);
    
    // Set up connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB reconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('\x1b[33m%s\x1b[0m', '💡 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Error during MongoDB disconnect:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB Connection FAILED:', {
      message: error.message,
      stack: error.stack
    });
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;