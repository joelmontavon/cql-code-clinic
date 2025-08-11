import express from 'express';
import { z } from 'zod';
import hintService from '../services/hintService.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for hint requests
const hintRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 hints per minute per user
  message: { error: 'Too many hint requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const getHintsSchema = z.object({
  body: z.object({
    exerciseId: z.string().uuid(),
    currentCode: z.string().optional(),
    lastError: z.string().optional(),
    timeSpent: z.number().min(0).optional(),
    contextData: z.object({
      completionEstimate: z.number().min(0).max(1).optional(),
      syntaxIssues: z.array(z.string()).optional(),
      conceptsDetected: z.array(z.string()).optional()
    }).optional()
  })
});

const trackHintUsageSchema = z.object({
  body: z.object({
    exerciseId: z.string().uuid(),
    hintData: z.object({
      level: z.number().int().min(1).max(5),
      type: z.enum(['progressive', 'contextual', 'syntax', 'performance', 'concept']),
      timeToReveal: z.number().min(0),
      codeAtTime: z.string(),
      wasHelpful: z.boolean().optional(),
      leadToSolution: z.boolean().optional(),
      contextRelevance: z.number().min(0).max(1).optional()
    })
  })
});

const updatePreferencesSchema = z.object({
  body: z.object({
    hintStyle: z.enum(['gentle', 'balanced', 'direct']).optional(),
    maxHintLevel: z.number().int().min(1).max(5).optional(),
    autoSuggestEnabled: z.boolean().optional()
  })
});

/**
 * GET /api/hints/:exerciseId
 * Get personalized hints for an exercise
 */
router.post('/hints/get', 
  authenticate,
  hintRateLimit,
  validateRequest(getHintsSchema),
  async (req, res) => {
    try {
      const { exerciseId, currentCode, lastError, timeSpent, contextData } = req.body;
      const userId = req.user.id;

      const context = {
        currentCode: currentCode || '',
        lastError: lastError || '',
        timeSpent: timeSpent || 0,
        ...contextData
      };

      const hints = await hintService.getPersonalizedHints(userId, exerciseId, context);

      res.json({
        success: true,
        data: hints,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting hints:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hints',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/hints/track-usage
 * Track hint usage for analytics and personalization
 */
router.post('/hints/track-usage',
  authenticate,
  validateRequest(trackHintUsageSchema),
  async (req, res) => {
    try {
      const { exerciseId, hintData } = req.body;
      const userId = req.user.id;

      await hintService.trackHintUsage(userId, exerciseId, hintData);

      res.json({
        success: true,
        message: 'Hint usage tracked successfully'
      });

    } catch (error) {
      console.error('Error tracking hint usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track hint usage'
      });
    }
  }
);

/**
 * GET /api/hints/profile
 * Get user's hint profile and preferences
 */
router.get('/hints/profile',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await hintService.getUserHintProfile(userId);

      res.json({
        success: true,
        data: profile
      });

    } catch (error) {
      console.error('Error getting hint profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hint profile'
      });
    }
  }
);

/**
 * PUT /api/hints/preferences
 * Update user hint preferences
 */
router.put('/hints/preferences',
  authenticate,
  validateRequest(updatePreferencesSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      await hintService.updateUserPreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Preferences updated successfully'
      });

    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
    }
  }
);

/**
 * GET /api/hints/analytics/:exerciseId
 * Get hint analytics for an exercise (admin/instructor only)
 */
router.get('/hints/analytics/:exerciseId',
  authenticate,
  async (req, res) => {
    try {
      // Check if user has analytics access
      if (!req.user.isAdmin && !req.user.isInstructor) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const { exerciseId } = req.params;
      const { timeRange = '30d', groupBy = 'day' } = req.query;

      const analytics = await hintService.getHintAnalytics(exerciseId, {
        timeRange,
        groupBy,
        includeTrends: true
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Error getting hint analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hint analytics'
      });
    }
  }
);

/**
 * POST /api/hints/contextual
 * Create or update contextual hints for an exercise (admin only)
 */
router.post('/hints/contextual',
  authenticate,
  async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { exerciseId, triggerCondition, hintContent, hintType, priority } = req.body;

      const contextualHint = await hintService.createContextualHint({
        exerciseId,
        triggerCondition,
        hintContent,
        hintType,
        priority
      });

      res.json({
        success: true,
        data: contextualHint
      });

    } catch (error) {
      console.error('Error creating contextual hint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create contextual hint'
      });
    }
  }
);

/**
 * GET /api/hints/effectiveness-report
 * Get hint effectiveness report across all exercises (admin only)
 */
router.get('/hints/effectiveness-report',
  authenticate,
  async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const report = await hintService.generateEffectivenessReport();

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating effectiveness report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Hint route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;