import crypto from 'crypto';

/**
 * Comprehensive Security Configuration
 * Centralized security settings and policies
 */

// Environment-based security configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';

/**
 * Core Security Settings
 */
export const SECURITY_CONFIG = {
  // Environment settings
  environment: {
    isDevelopment: IS_DEVELOPMENT,
    isProduction: IS_PRODUCTION,
    nodeEnv: NODE_ENV
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || (IS_PRODUCTION ? 
      (() => { throw new Error('JWT_SECRET must be set in production') })() :
      'development-secret-key-change-in-production'
    ),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'cql-clinic',
    audience: process.env.JWT_AUDIENCE || 'cql-clinic-users',
    algorithm: 'HS256'
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || (IS_PRODUCTION ?
      (() => { throw new Error('SESSION_SECRET must be set in production') })() :
      crypto.randomBytes(32).toString('hex')
    ),
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    secure: IS_PRODUCTION, // HTTPS only in production
    httpOnly: true,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax'
  },

  // CSRF Protection
  csrf: {
    secret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex'),
    tokenLength: 32,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
  },

  // Rate Limiting Configuration
  rateLimit: {
    // Default API rate limit
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    },
    
    // Strict limits for authentication
    auth: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      message: 'Too many authentication attempts, please try again later.'
    },
    
    // Limits for CQL execution
    cqlExecution: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 20,
      message: 'Too many CQL execution requests, please try again later.'
    },
    
    // Password reset limits
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      message: 'Too many password reset requests, please try again later.'
    }
  },

  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for React and CSS frameworks
      "https://cdn.jsdelivr.net",
      "https://fonts.googleapis.com",
      "https://unpkg.com"
    ],
    scriptSrc: [
      "'self'",
      ...(IS_DEVELOPMENT ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
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
      ...(IS_DEVELOPMENT ? ["http://localhost:*", "ws://localhost:*"] : [])
    ].filter(Boolean),
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: IS_PRODUCTION
  },

  // CORS Configuration
  cors: {
    origin: IS_PRODUCTION ? 
      (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false) :
      true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Input Validation
  validation: {
    maxContentSize: 10 * 1024 * 1024, // 10MB
    maxCqlCodeSize: 50 * 1024, // 50KB
    maxStringLength: 1000,
    maxArrayLength: 100,
    allowedFileTypes: [
      'text/plain',
      'application/json',
      'text/csv'
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    sanitization: {
      stripHTML: true,
      escapeHTML: true,
      trimWhitespace: true
    }
  },

  // Password Policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    bannedPasswords: [
      'password', 'password123', '123456', 'qwerty', 'admin',
      'letmein', 'welcome', 'monkey', 'dragon', 'pass'
    ],
    hashRounds: 12, // bcrypt rounds
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    historyCount: 5 // Remember last 5 passwords
  },

  // Account Security
  account: {
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    inactivityTimeout: 2 * 60 * 60 * 1000, // 2 hours
    twoFactorAuth: {
      enabled: process.env.ENABLE_2FA === 'true',
      issuer: 'CQL Clinic',
      window: 1 // Allow 1 window (30 seconds) of drift
    },
    emailVerification: {
      required: IS_PRODUCTION,
      tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Threat Detection
  threatDetection: {
    enabled: true,
    suspiciousActivityThreshold: 10,
    automaticBlocking: IS_PRODUCTION,
    alerting: {
      enabled: process.env.SECURITY_ALERTS_ENABLED === 'true',
      webhookUrl: process.env.SECURITY_WEBHOOK_URL,
      emailAlerts: process.env.SECURITY_EMAIL_ALERTS === 'true',
      slackWebhook: process.env.SLACK_SECURITY_WEBHOOK
    },
    patterns: {
      sqlInjection: [
        /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
        /('|(\\)|(\-\-)|(\;)|(\|)|(\*)|(%27)|(%22)|(%2D)|(%7C))/i,
        /(exec|execute|sp_|xp_)/i
      ],
      xssAttempts: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe|<object|<embed|<form/i
      ],
      pathTraversal: [
        /\.\.[\/\\]/,
        /%2e%2e[%2f%5c]/i,
        /\.\.[%2f%5c]/i,
        /%c0%ae%c0%ae/i
      ],
      commandInjection: [
        /(\||&|;|\$\(|\`|<|>)/,
        /(nc|netcat|wget|curl|bash|sh|cmd|powershell)/i,
        /(\bcat\b|\bls\b|\bps\b|\bwhoami\b|\bid\b)/i
      ]
    }
  },

  // Logging and Monitoring
  logging: {
    level: IS_PRODUCTION ? 'info' : 'debug',
    securityEvents: {
      logLevel: 'warn',
      includeRequestData: !IS_PRODUCTION, // Sensitive data only in dev
      maxLogSize: 10 * 1024 * 1024, // 10MB
      retentionDays: 30
    },
    audit: {
      enabled: true,
      logAllRequests: IS_DEVELOPMENT,
      logFailedAuth: true,
      logAdminActions: true,
      logSecurityEvents: true
    }
  },

  // SSL/TLS Configuration
  tls: {
    minVersion: 'TLSv1.2',
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ].join(':'),
    honorCipherOrder: true,
    secureProtocol: 'TLSv1_2_method'
  },

  // Database Security
  database: {
    connectionTimeout: 5000,
    queryTimeout: 30000,
    maxConnections: 100,
    ssl: IS_PRODUCTION ? {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA,
      key: process.env.DB_SSL_KEY,
      cert: process.env.DB_SSL_CERT
    } : false,
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000
    }
  },

  // API Security
  api: {
    versioning: {
      enabled: true,
      defaultVersion: 'v1',
      supportedVersions: ['v1']
    },
    pagination: {
      maxLimit: 100,
      defaultLimit: 20
    },
    throttling: {
      enabled: true,
      burstLimit: 10,
      rateLimit: 1000 // requests per hour
    }
  },

  // File Upload Security
  fileUpload: {
    enabled: false, // Disabled by default
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['text/plain', 'application/json'],
    uploadDir: './uploads',
    scanForMalware: IS_PRODUCTION,
    quarantineDir: './quarantine'
  },

  // Development Security Overrides
  development: IS_DEVELOPMENT ? {
    skipRateLimit: process.env.SKIP_RATE_LIMIT === 'true',
    allowInsecureConnections: true,
    verboseLogging: true,
    mockAuthentication: process.env.MOCK_AUTH === 'true'
  } : {},

  // Production Security Requirements
  production: IS_PRODUCTION ? {
    requireHTTPS: true,
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    certificateTransparency: true,
    publicKeyPinning: process.env.HPKP_PINS ? {
      pins: process.env.HPKP_PINS.split(','),
      maxAge: 86400,
      includeSubDomains: true
    } : null
  } : {}
};

/**
 * Security Headers Configuration
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  ...(IS_PRODUCTION && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  })
};

/**
 * Validation Schemas
 */
export const VALIDATION_SCHEMAS = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255,
    normalize: true
  },
  username: {
    pattern: /^[a-zA-Z0-9_]{3,30}$/,
    minLength: 3,
    maxLength: 30
  },
  password: {
    minLength: SECURITY_CONFIG.password.minLength,
    maxLength: SECURITY_CONFIG.password.maxLength,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  },
  cqlCode: {
    maxLength: SECURITY_CONFIG.validation.maxCqlCodeSize,
    forbidden: [
      'eval', 'function', 'javascript:', '<script', 'document.',
      'window.', 'process.', 'require', 'import', 'export'
    ]
  }
};

/**
 * Security Utilities
 */
export const SECURITY_UTILS = {
  /**
   * Generate secure random string
   */
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Generate cryptographically secure random UUID
   */
  generateSecureUUID: () => {
    return crypto.randomUUID();
  },

  /**
   * Hash sensitive data
   */
  hashSensitiveData: (data, salt = null) => {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512');
    return {
      hash: hash.toString('hex'),
      salt: actualSalt
    };
  },

  /**
   * Verify hashed data
   */
  verifySensitiveData: (data, hash, salt) => {
    const computedHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    return computedHash === hash;
  },

  /**
   * Encrypt sensitive data
   */
  encryptData: (data, key = null) => {
    const actualKey = key || crypto.scryptSync(SECURITY_CONFIG.jwt.secret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', actualKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  },

  /**
   * Decrypt sensitive data
   */
  decryptData: (encryptedData, iv, key = null) => {
    const actualKey = key || crypto.scryptSync(SECURITY_CONFIG.jwt.secret, 'salt', 32);
    const decipher = crypto.createDecipher('aes-256-cbc', actualKey);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
};

/**
 * Environment-specific configuration validation
 */
if (IS_PRODUCTION) {
  // Validate critical production settings
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'DATABASE_URL'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }
}

export default {
  SECURITY_CONFIG,
  SECURITY_HEADERS,
  VALIDATION_SCHEMAS,
  SECURITY_UTILS
};