import { Router } from 'express';
import { healthController } from '../controllers/healthController.js';
import { validateQuery } from '../middleware/validation.js';
import { HealthCheckQuerySchema } from '../utils/validation.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Comprehensive health check
 * @access  Public
 */
router.get(
  '/',
  validateQuery(HealthCheckQuerySchema),
  healthController.healthCheck.bind(healthController)
);

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe (for Kubernetes)
 * @access  Public
 */
router.get(
  '/live',
  healthController.liveness.bind(healthController)
);

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe (for Kubernetes)
 * @access  Public
 */
router.get(
  '/ready',
  healthController.readiness.bind(healthController)
);

export default router;