// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {

  // try {
  //   await mongoose.connect(process.env.MONGODB_URI, {
  //     useNewUrlParser: true,
  //     useUnifiedTopology: true,
  //   });
  //   console.log('MongoDB connected successfully');
  // } catch (error) {
  //   console.error('MongoDB connection failed:', error.message);
  //   // Exit process with failure
  //   process.exit(1);
  // }

  try {
    // Use MONGODB_URI instead of MONGO_URI
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('❌ FATAL ERROR: MONGODB_URI is not defined!');
      console.error('Steps to resolve:');
      console.error('1. Check your .env file');
      console.error('2. Ensure MONGODB_URI is correctly set');
      
      throw new Error('MongoDB connection URI is CRITICALLY missing. Check your .env file!');
    }

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 5
    };

    await mongoose.connect(mongoUri, options);
    console.log('✅ Successfully connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB Connection FAILED:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

module.exports = connectDB;