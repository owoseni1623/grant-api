const mongoose = require('mongoose');

// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

// Get database configuration from environment
const getDatabaseConfig = () => {
  const mongoUri = process.env.MONGODB_URI;
  
  // Check if it's a local or remote URI
  const isLocal = mongoUri && (
    mongoUri.includes('localhost') || 
    mongoUri.includes('127.0.0.1') || 
    mongoUri.includes('mongo:27017')
  );
  
  const isAtlas = mongoUri && mongoUri.includes('mongodb.net');
  
  return {
    uri: mongoUri || 'mongodb://localhost:27017/grant-GOV',
    isLocal,
    isAtlas,
    options: {
      // Common options for all environments
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      
      // Additional options for Atlas connections
      ...(isAtlas && {
        retryWrites: true,
        w: 'majority',
        authSource: 'admin'
      }),
      
      // Additional options for local connections
      ...(isLocal && {
        family: 4,
        directConnection: true
      })
    }
  };
};

// Connection health check
const checkConnectionHealth = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  console.log(`📊 MongoDB connection state: ${states[state] || 'unknown'}`);
  return state === 1;
};

// Enhanced connection function with retry logic
const connectWithRetry = async (uri, options, attempt = 1) => {
  try {
    console.log(`🔄 MongoDB connection attempt ${attempt}/${maxConnectionAttempts}`);
    console.log(`📍 Connecting to: ${uri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    
    const conn = await mongoose.connect(uri, options);
    
    isConnected = true;
    connectionAttempts = 0;
    
    console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB Connected Successfully!');
    console.log(`🏠 Database Host: ${conn.connection.host}`);
    console.log(`📝 Database Name: ${conn.connection.name}`);
    console.log(`🔌 Connection ID: ${conn.connection.id}`);
    
    return conn;
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `❌ MongoDB connection attempt ${attempt} failed:`);
    console.error(`   Error: ${error.message}`);
    
    if (attempt < maxConnectionAttempts) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(uri, options, attempt + 1);
    } else {
      throw new Error(`Failed to connect to MongoDB after ${maxConnectionAttempts} attempts: ${error.message}`);
    }
  }
};

// Main connection function
const connectDB = async () => {
  try {
    // Prevent multiple connection attempts
    if (isConnected || mongoose.connection.readyState === 1) {
      console.log('📡 MongoDB already connected');
      return;
    }
    
    if (mongoose.connection.readyState === 2) {
      console.log('⏳ MongoDB connection in progress...');
      return;
    }
    
    const config = getDatabaseConfig();
    const { uri, options, isLocal, isAtlas } = config;
    
    // Display connection info
    console.log('\n' + '='.repeat(50));
    console.log('🔗 MONGODB CONNECTION SETUP');
    console.log('='.repeat(50));
    console.log(`📍 Connection Type: ${isAtlas ? 'MongoDB Atlas (Cloud)' : isLocal ? 'Local MongoDB' : 'Unknown'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚙️ Connection Options: ${JSON.stringify(options, null, 2)}`);
    console.log('='.repeat(50) + '\n');
    
    // Validate URI
    if (!uri) {
      throw new Error('MongoDB URI is not defined. Please check your environment configuration.');
    }
    
    // Special handling for different connection types
    if (isAtlas) {
      // Atlas-specific configurations
      console.log('☁️ Configuring for MongoDB Atlas...');
      options.ssl = true;
      options.authSource = 'admin';
    } else if (isLocal) {
      // Local MongoDB configurations
      console.log('🏠 Configuring for local MongoDB...');
      console.log('💡 Make sure MongoDB is running locally on port 27017');
    }
    
    // Set up connection event handlers before connecting
    setupConnectionHandlers();
    
    // Attempt connection with retry logic
    await connectWithRetry(uri, options);
    
    // Verify connection health
    setTimeout(() => {
      if (checkConnectionHealth()) {
        console.log('✅ MongoDB connection verified and healthy');
      }
    }, 1000);
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB Connection FAILED:');
    console.error(`   Message: ${error.message}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('\n💡 TROUBLESHOOTING TIPS:');
      console.log('   1. For local MongoDB:');
      console.log('      - Make sure MongoDB is installed and running');
      console.log('      - Run "mongod" to start MongoDB service');
      console.log('      - Check if port 27017 is available');
      console.log('   2. For MongoDB Atlas:');
      console.log('      - Check your internet connection');
      console.log('      - Verify your MongoDB Atlas credentials');
      console.log('      - Ensure your IP is whitelisted in Atlas');
      console.log('      - Check if your cluster is active');
      console.log('   3. Check your .env file configuration\n');
    }
    
    // Re-throw the error to be handled by the calling function
    throw error;
  }
};

// Set up connection event handlers
const setupConnectionHandlers = () => {
  // Remove existing listeners to prevent duplicates
  mongoose.connection.removeAllListeners();
  
  // Connection opened
  mongoose.connection.on('connected', () => {
    console.log('\x1b[32m%s\x1b[0m', '🔗 MongoDB connection established');
    isConnected = true;
  });
  
  // Connection error
  mongoose.connection.on('error', (err) => {
    console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB connection error:', err.message);
    isConnected = false;
  });
  
  // Connection disconnected
  mongoose.connection.on('disconnected', () => {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ MongoDB disconnected');
    isConnected = false;
    
    // Attempt reconnection in development
    if (process.env.NODE_ENV === 'development' && connectionAttempts < maxConnectionAttempts) {
      console.log('🔄 Attempting to reconnect...');
      setTimeout(() => {
        connectDB();
      }, 5000);
    }
  });
  
  // Connection reconnected
  mongoose.connection.on('reconnected', () => {
    console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB reconnected');
    isConnected = true;
    connectionAttempts = 0;
  });
  
  // Connection timeout
  mongoose.connection.on('timeout', () => {
    console.warn('\x1b[33m%s\x1b[0m', '⏰ MongoDB connection timeout');
  });
  
  // Connection close
  mongoose.connection.on('close', () => {
    console.log('\x1b[33m%s\x1b[0m', '🔌 MongoDB connection closed');
    isConnected = false;
  });
};

// Graceful shutdown function
const gracefulDisconnect = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
      console.log('\x1b[33m%s\x1b[0m', '✅ MongoDB connection closed gracefully');
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error during MongoDB disconnect:', error);
  }
};

// Health check function
const getConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    isConnected: state === 1,
    state: states[state] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    readyState: state
  };
};

// Handle application termination
process.on('SIGINT', async () => {
  console.log('\n📴 Received SIGINT signal, closing MongoDB connection...');
  await gracefulDisconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📴 Received SIGTERM signal, closing MongoDB connection...');
  await gracefulDisconnect();
  process.exit(0);
});

// Export functions
module.exports = {
  connectDB,
  gracefulDisconnect,
  getConnectionStatus,
  checkConnectionHealth
};