import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import env from './config/env.js';
import logger from './config/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

// Create Express application
const app = express();

// Trust proxy configuration for development
if (env.NODE_ENV === 'development') {
  app.set('trust proxy', false); // Disable trust proxy for local development
}

// Security middleware
if (env.HELMET_ENABLED) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
}

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression middleware
if (env.COMPRESSION_ENABLED) {
  app.use(compression());
}

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
      retryAfter: Math.round(env.RATE_LIMIT_WINDOW_MS / 1000)
    });
  }
});

app.use(limiter);

// Request ID middleware (must be before logging)
app.use(requestIdMiddleware);

// Request logging
if (env.ENABLE_REQUEST_LOGGING) {
  const morganFormat = env.LOG_FORMAT;
  
  app.use(morgan(morganFormat, {
    stream: {
      write: (message) => {
        logger.info(message.trim());
      }
    },
    skip: (req) => {
      // Skip health check requests in production to reduce noise
      return env.NODE_ENV === 'production' && req.path.startsWith('/api/health');
    }
  }));
}

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Trust proxy configuration is handled above based on environment

// API routes
app.use(env.API_PREFIX, apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'CQL Code Clinic Backend',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Backend API for CQL Code Clinic - Interactive Clinical Quality Language Learning Platform',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      endpoints: {
        api: env.API_PREFIX,
        health: `${env.API_PREFIX}/health`,
        cql: `${env.API_PREFIX}/cql`
      }
    },
    message: 'CQL Code Clinic Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
if (env.ENABLE_ERROR_LOGGING) {
  app.use(errorHandler);
}

export default app;