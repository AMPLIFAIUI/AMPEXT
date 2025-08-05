// © 2025 AMPIQ All rights reserved.

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cors = require('cors');
const api = require('./api');
const { loadConfig } = require('./utils');

const app = express();
  const config = loadConfig();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
  const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false
  });
  app.use(limiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and extension origins
    const allowedOrigins = [
      'http://localhost',
      'http://127.0.0.1',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://'
    ];
    
    const isAllowed = allowedOrigins.some(allowed => 
      origin.startsWith(allowed) || origin.includes('localhost')
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging
app.use(morgan('combined', {
  skip: (req, res) => {
    // Skip logging for status checks
    return req.path === '/status';
  }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
  app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Mount API routes
app.use('/', api);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  });

// Global error handler
  app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
    res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
    });
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = config.server?.port || 3456;
const HOST = config.server?.host || '127.0.0.1';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 AMP Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Security: Helmet enabled, Rate limiting active`);
  console.log(`📝 Logging: Morgan enabled`);
  console.log(`🌐 CORS: Enabled for localhost and extensions`);
  
  // Log available endpoints
  console.log('\n📋 Available Endpoints:');
  console.log('   GET  /health        - Health check');
  console.log('   GET  /status        - Server status');
  console.log('   POST /persist       - Store memory chunks');
  console.log('   GET  /vault         - Retrieve memory chunks');
  console.log('   GET  /vault/search  - Search memory');
  console.log('   POST /vault/clear   - Clear memory');
  console.log('   GET  /vault/stats   - Vault statistics');
  console.log('   POST /chunks        - Store chunk (legacy)');
  console.log('   GET  /context       - Get context (legacy)');
  console.log('');
});

server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

module.exports = app;