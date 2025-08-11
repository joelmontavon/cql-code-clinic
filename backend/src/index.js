import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', {
    promise,
    reason: reason instanceof Error ? reason.message : String(reason)
  });
  process.exit(1);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((error) => {
    if (error) {
      logger.error('Error during server shutdown', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    
    // Close other connections here (database, redis, etc.)
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Force shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 CQL Code Clinic Backend Server started on port ${env.PORT}`);
  
  logger.info('🏥 API Endpoints available:');
  logger.info(`   Root: http://localhost:${env.PORT}/`);
  logger.info(`   API: http://localhost:${env.PORT}${env.API_PREFIX}`);
  logger.info(`   Health: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  logger.info(`   CQL: http://localhost:${env.PORT}${env.API_PREFIX}/cql`);
  logger.info(`   CQL Execute: http://localhost:${env.PORT}${env.API_PREFIX}/cql/execute`);
  logger.info(`   CQL Format: http://localhost:${env.PORT}${env.API_PREFIX}/cql/format`);
  logger.info(`   CQL Status: http://localhost:${env.PORT}${env.API_PREFIX}/cql/status`);

  // Log environment-specific information
  if (env.NODE_ENV === 'development') {
    logger.info('🔧 Development mode features enabled');
    logger.info(`   Request Logging: ${env.ENABLE_REQUEST_LOGGING}`);
    logger.info(`   CORS Origins: ${env.CORS_ORIGIN.join(', ')}`);
    logger.info(`   Rate Limit: ${env.RATE_LIMIT_MAX_REQUESTS} requests per ${env.RATE_LIMIT_WINDOW_MS / 1000}s`);
  }
});