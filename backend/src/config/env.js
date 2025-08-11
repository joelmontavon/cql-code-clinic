import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().min(1).max(65535)).default(3001),
  
  // API Configuration
  API_PREFIX: z.string().default('/api'),
  API_VERSION: z.string().default('v1'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().transform(str => str.split(',').map(s => s.trim())),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default(100),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['combined', 'common', 'dev', 'short', 'tiny']).default('combined'),
  
  // CQL Service Configuration
  CQL_EXECUTION_SERVICE_URL: z.string().url().default('http://localhost:8080'),
  CQL_REQUEST_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).default(30000),
  
  // Optional Database Configuration
  DATABASE_URL: z.string().optional(),
  
  // Optional Redis Configuration
  REDIS_URL: z.string().optional(),
  
  // Optional JWT Configuration
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRE: z.string().default('24h'),
  
  // Security
  HELMET_ENABLED: z.string().transform(val => val.toLowerCase() === 'true').default(true),
  COMPRESSION_ENABLED: z.string().transform(val => val.toLowerCase() === 'true').default(true),
  
  // Monitoring
  ENABLE_REQUEST_LOGGING: z.string().transform(val => val.toLowerCase() === 'true').default(true),
  ENABLE_ERROR_LOGGING: z.string().transform(val => val.toLowerCase() === 'true').default(true),
});

// Validate and parse environment variables
const env = envSchema.parse(process.env);

export default env;

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';