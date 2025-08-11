import winston from 'winston';
import { mkdirSync } from 'fs';
import env, { isDevelopment } from './env.js';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack && isDevelopment) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'cql-code-clinic-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs to `combined.log`
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Add console transport for development
if (isDevelopment) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        let log = `${timestamp} ${level}: ${message}`;
        if (stack && isDevelopment) {
          log += `\n${stack}`;
        }
        return log;
      })
    )
  }));
}

// Create logs directory if it doesn't exist
try {
  mkdirSync('logs', { recursive: true });
} catch (error) {
  // Directory already exists or cannot be created
  console.warn('Could not create logs directory:', error);
}

export default logger;