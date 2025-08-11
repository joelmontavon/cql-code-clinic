import { Router } from 'express';
import cqlRoutes from './cqlRoutes.js';
import healthRoutes from './healthRoutes.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// API Info endpoint
router.get('/', (req, res) => {
  sendSuccess(res, {
    name: 'CQL Code Clinic API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Backend API for CQL Code Clinic - Interactive Clinical Quality Language Learning Platform',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      cql: '/api/cql',
      documentation: '/api/docs'
    }
  }, 'CQL Code Clinic API is running');
});

// Mount route modules
router.use('/health', healthRoutes);
router.use('/cql', cqlRoutes);

export default router;