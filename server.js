// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const connectDB = require('./src/config/db');
// const authRoutes = require('./src/routes/authRoutes');
// const grantRoutes = require('./src/routes/grantRoutes');
// const path = require('path');

// // Create Express app
// const app = express();

// // Comprehensive CORS configuration
// const corsOptions = {
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       'http://localhost:5173',
//       'http://127.0.0.1:5173',
//       'http://localhost:3000',
//       'http://127.0.0.1:3000'
//     ];

//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// };

// // Middleware
// app.use(cors(corsOptions));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Serve static files for uploaded documents
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Database connection
// connectDB();

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/grants', grantRoutes);

// // Preflight CORS handling
// app.options('*', cors(corsOptions));

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error('Unhandled Error:', err);

//   // Determine error status code
//   const statusCode = err.status ||
//     (err.name === 'ValidationError' ? 400 :
//     (err.name === 'UnauthorizedError' ? 401 : 500));

//   res.status(statusCode).json({
//     message: err.message || 'An unexpected error occurred',
//     ...(process.env.NODE_ENV !== 'production' && { error: err.stack })
//   });
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//   // Optional: Gracefully shut down the server
//   process.exit(1);
// });

// // Handle uncaught exceptions
// process.on('uncaughtException', (error) => {
//   console.error('Uncaught Exception:', error);
//   // Optional: Gracefully shut down the server
//   process.exit(1);
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// const server = app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// module.exports = app;



require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const grantRoutes = require('./src/routes/grantRoutes');
// const adminRoutes = require('./src/routes/adminRoutes');
const path = require('path');

// Create Express app
const app = express();

// Comprehensive CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/grants', grantRoutes);
// app.use('/api/admin', adminRoutes);

// Preflight CORS handling
app.options('*', cors(corsOptions));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // Determine error status code
  const statusCode = err.status ||
    (err.name === 'ValidationError' ? 400 :
    (err.name === 'UnauthorizedError' ? 401 : 500));

  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV !== 'production' && { error: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: Gracefully shut down the server
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Optional: Gracefully shut down the server
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = server;