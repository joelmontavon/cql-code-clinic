import { Router } from 'express';
import { cqlController } from '../controllers/cqlController.js';
import { validateBody } from '../middleware/validation.js';
import { CQLExecutionRequestSchema, CQLFormatRequestSchema } from '../utils/validation.js';

const router = Router();

/**
 * @route   POST /api/cql/execute
 * @desc    Execute CQL code
 * @access  Public
 */
router.post(
  '/execute',
  validateBody(CQLExecutionRequestSchema),
  cqlController.executeCQL.bind(cqlController)
);

/**
 * @route   POST /api/cql/format
 * @desc    Format CQL code
 * @access  Public
 */
router.post(
  '/format',
  validateBody(CQLFormatRequestSchema),
  cqlController.formatCQL.bind(cqlController)
);

/**
 * @route   GET /api/cql/status
 * @desc    Get CQL service status
 * @access  Public
 */
router.get(
  '/status',
  cqlController.getServiceStatus.bind(cqlController)
);

export default router;