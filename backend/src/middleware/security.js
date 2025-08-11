import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import validator from 'validator';
import winston from 'winston';
import crypto from 'crypto';
import { body, validationResult, param, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import performanceService from '../services/performanceService.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Security Configuration
 */
const SECURITY_CONFIG = {
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: 'Too many requests from this IP, please try again later.'
  },
  slowDown: {
    windowMs: parseInt(process.env.SLOW_DOWN_WINDOW) || 15 * 60 * 1000, // 15 minutes
    delayAfter: parseInt(process.env.SLOW_DOWN_AFTER) || 50,
    delayMs: parseInt(process.env.SLOW_DOWN_DELAY) || 500
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secure-secret-key',
    expiration: process.env.JWT_EXPIRATION || '24h',
    issuer: process.env.JWT_ISSUER || 'cql-clinic',
    audience: process.env.JWT_AUDIENCE || 'cql-clinic-users'
  },
  csrf: {
    secret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex')
  },
  content: {
    maxSize: parseInt(process.env.MAX_CONTENT_SIZE) || 10 * 1024 * 1024, // 10MB
    maxCqlLength: parseInt(process.env.MAX_CQL_LENGTH) || 50000 // 50KB
  }
};

/**
 * Comprehensive security headers middleware
 * Implements security headers following OWASP recommendations
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some CSS frameworks
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Monaco Editor
        "'unsafe-eval'", // Required for CQL execution
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "ws:",
        process.env.NODE_ENV === 'development' ? 'http://localhost:*' : ''
      ].filter(Boolean),
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  
  crossOriginEmbedderPolicy: false, // Disabled for Monaco Editor compatibility
  
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  noSniff: true,
  
  xssFilter: true,
  
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  crossOriginOpenerPolicy: false, // Disabled for popup compatibility
  
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  }
});

/**
 * Rate limiting middleware with different limits for different endpoints
 */
export const createRateLimit = (options = {}) => {
  const {
    windowMs = SECURITY_CONFIG.rateLimit.windowMs,
    maxRequests = SECURITY_CONFIG.rateLimit.maxRequests,
    message = SECURITY_CONFIG.rateLimit.message,
    keyGenerator = (req) => req.ip,
    skip = () => false,
    onLimitReached = null
  } = options;

  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    keyGenerator,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
      
      if (onLimitReached) {
        onLimitReached(req, res);
      }
      
      performanceService.trackError(req.performanceTrackingId, 'rate_limit_exceeded', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * Slow down middleware to gradually increase response time
 */
export const createSlowDown = (options = {}) => {
  const {
    windowMs = SECURITY_CONFIG.slowDown.windowMs,
    delayAfter = SECURITY_CONFIG.slowDown.delayAfter,
    delayMs = SECURITY_CONFIG.slowDown.delayMs,
    keyGenerator = (req) => req.ip
  } = options;

  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    keyGenerator,
    onLimitReached: (req, res) => {
      logger.warn('Slow down triggered', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method
      });
    }
  });
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body, query, and params
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid input data'
    });
  }
};

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const cleanKey = sanitizeValue(key);
    
    // Sanitize value
    sanitized[cleanKey] = sanitizeObject(value);
  }
  
  return sanitized;
}

/**
 * Sanitize individual value
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Remove XSS attempts
    let cleaned = xss(value, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // Additional sanitization
    cleaned = validator.escape(cleaned);
    
    return cleaned;
  }
  
  return value;
}

/**
 * MongoDB injection prevention
 */
export const preventMongoInjection = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('MongoDB injection attempt detected', {
      ip: req.ip,
      key,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Content length validation middleware
 */
export const validateContentLength = (req, res, next) => {
  const contentLength = parseInt(req.get('Content-Length')) || 0;
  
  if (contentLength > SECURITY_CONFIG.content.maxSize) {
    logger.warn('Content length exceeded', {
      ip: req.ip,
      contentLength,
      maxSize: SECURITY_CONFIG.content.maxSize,
      endpoint: req.path
    });
    
    return res.status(413).json({
      success: false,
      error: 'Content too large',
      maxSize: SECURITY_CONFIG.content.maxSize
    });
  }
  
  next();
};

/**
 * CQL code validation middleware
 */
export const validateCQLCode = [
  body('code')
    .isString()
    .isLength({ max: SECURITY_CONFIG.content.maxCqlLength })
    .withMessage(`CQL code must be less than ${SECURITY_CONFIG.content.maxCqlLength} characters`)
    .custom((code) => {
      // Check for potentially dangerous patterns
      const dangerousPatterns = [
        /eval\s*\(/i,
        /function\s*\(/i,
        /javascript:/i,
        /<script/i,
        /document\./i,
        /window\./i,
        /process\./i,
        /require\s*\(/i,
        /import\s+/i,
        /export\s+/i
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          throw new Error('CQL code contains potentially dangerous patterns');
        }
      }
      
      return true;
    }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('CQL validation failed', {
        ip: req.ip,
        errors: errors.array(),
        code: req.body.code?.substring(0, 100)
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid CQL code',
        details: errors.array()
      });
    }
    
    next();
  }
];

/**
 * Authentication middleware using JWT
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
    
    const decoded = jwt.verify(token, SECURITY_CONFIG.jwt.secret, {
      issuer: SECURITY_CONFIG.jwt.issuer,
      audience: SECURITY_CONFIG.jwt.audience
    });
    
    // Attach user information to request
    req.user = decoded;
    
    // Log authentication success
    logger.debug('User authenticated', {
      userId: decoded.id,
      username: decoded.username,
      ip: req.ip
    });
    
    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      ip: req.ip,
      error: error.message,
      userAgent: req.get('User-Agent')
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, SECURITY_CONFIG.jwt.secret, {
        issuer: SECURITY_CONFIG.jwt.issuer,
        audience: SECURITY_CONFIG.jwt.audience
      });
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't return an error, just continue without user
    logger.debug('Optional auth failed, continuing without user', {
      ip: req.ip,
      error: error.message
    });
    next();
  }
};

/**
 * Authorization middleware for role-based access
 */
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        userRoles,
        requiredRoles: roles,
        endpoint: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

/**
 * CSRF token validation middleware
 */
export const validateCSRF = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.get('X-CSRF-Token') || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn('CSRF validation failed', {
      ip: req.ip,
      method: req.method,
      endpoint: req.path,
      hasToken: !!token,
      hasSessionToken: !!sessionToken
    });
    
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }
  
  next();
};

/**
 * Generate CSRF token
 */
export const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

/**
 * Security audit logging middleware
 */
export const securityAuditLog = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log security-relevant events
    if (statusCode >= 400 || req.path.includes('/auth/') || req.path.includes('/admin/')) {
      logger.info('Security audit log', {
        method: req.method,
        url: req.url,
        path: req.path,
        statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        userId: req.user?.id,
        contentLength: res.get('Content-Length')
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Request ID middleware for tracing
 */
export const requestId = (req, res, next) => {
  const id = crypto.randomUUID();
  req.id = id;
  res.set('X-Request-ID', id);
  next();
};

/**
 * Common validation rules
 */
export const validationRules = {
  userId: param('userId').isUUID().withMessage('Invalid user ID format'),
  
  exerciseId: param('exerciseId').isAlphanumeric().isLength({ min: 1, max: 50 }).withMessage('Invalid exercise ID'),
  
  email: body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  
  password: body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be between 8 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]
};

/**
 * Different rate limits for different endpoints
 */
export const rateLimits = {
  // Strict limits for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later'
  }),
  
  // Moderate limits for API endpoints
  api: createRateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }),
  
  // Stricter limits for CQL execution
  cqlExecution: createRateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many CQL execution requests, please try again later'
  }),
  
  // Generous limits for static content
  static: createRateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000
  })
};

export default {
  securityHeaders,
  createRateLimit,
  createSlowDown,
  sanitizeInput,
  preventMongoInjection,
  validateContentLength,
  validateCQLCode,
  authenticateToken,
  optionalAuth,
  requireRole,
  validateCSRF,
  generateCSRFToken,
  securityAuditLog,
  requestId,
  validationRules,
  rateLimits
};