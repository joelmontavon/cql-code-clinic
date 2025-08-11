import express from 'express';
import { z } from 'zod';
import tutorialService from '../services/tutorialService.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for tutorial operations
const tutorialRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many tutorial requests. Please slow down.' }
});

// Validation schemas
const getTutorialsSchema = z.object({
  query: z.object({
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    category: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional(),
    tags: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    isPublished: z.string().transform(val => val === 'true').optional()
  })
});

const createTutorialSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(2000),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    category: z.string().min(1).max(50),
    estimatedTime: z.number().int().min(5).max(300),
    type: z.enum(['guided', 'interactive', 'branching', 'assessment']),
    tags: z.array(z.string()).max(10).optional(),
    steps: z.array(z.object({
      id: z.string().optional(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      type: z.string().optional(),
      instructions: z.string().optional(),
      code: z.string().optional(),
      codeSection: z.object({
        editable: z.boolean(),
        language: z.string().default('cql')
      }).optional(),
      validation: z.object({
        required: z.boolean(),
        type: z.string().optional(),
        criteria: z.string().optional(),
        successMessage: z.string().optional(),
        failureMessage: z.string().optional()
      }).optional(),
      expectedOutcome: z.string().optional(),
      autoAdvance: z.object({
        enabled: z.boolean(),
        delay: z.number().optional()
      }).optional()
    })).min(1).max(50),
    isPublished: z.boolean().optional()
  })
});

const updateProgressSchema = z.object({
  body: z.object({
    currentStep: z.number().int().min(0),
    stepsCompleted: z.array(z.number().int()),
    timeSpent: z.number().int().min(0),
    checkpointsCompleted: z.array(z.number().int()).optional(),
    userChoices: z.record(z.string(), z.any()).optional(),
    isCompleted: z.boolean().optional()
  })
});

const trackEventSchema = z.object({
  body: z.object({
    tutorialId: z.string().uuid(),
    event: z.string(),
    step: z.number().int().optional(),
    timestamp: z.number().int(),
    eventData: z.record(z.string(), z.any()).optional()
  })
});

const validateStepSchema = z.object({
  body: z.object({
    stepIndex: z.number().int().min(0),
    data: z.record(z.string(), z.any()),
    validation: z.record(z.string(), z.any())
  })
});

const rateTutorialSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    feedback: z.string().max(1000).optional()
  })
});

/**
 * GET /api/tutorials
 * Get all tutorials with filtering and pagination
 */
router.get('/tutorials',
  tutorialRateLimit,
  validateRequest(getTutorialsSchema),
  async (req, res) => {
    try {
      const {
        difficulty,
        category,
        type,
        search,
        tags,
        page = 1,
        limit = 20,
        isPublished = true
      } = req.query;

      const filters = {
        difficulty,
        category,
        type,
        search,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
        isPublished
      };

      const result = await tutorialService.getTutorials(filters, { page, limit });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error getting tutorials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tutorials'
      });
    }
  }
);

/**
 * GET /api/tutorials/:id
 * Get a specific tutorial by ID
 */
router.get('/tutorials/:id',
  tutorialRateLimit,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const tutorial = await tutorialService.getTutorial(id, userId);

      res.json({
        success: true,
        data: tutorial
      });

    } catch (error) {
      console.error('Error getting tutorial:', error);
      if (error.message === 'Tutorial not found') {
        res.status(404).json({
          success: false,
          error: 'Tutorial not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get tutorial'
        });
      }
    }
  }
);

/**
 * POST /api/tutorials
 * Create a new tutorial (authenticated users only)
 */
router.post('/tutorials',
  authenticate,
  validateRequest(createTutorialSchema),
  async (req, res) => {
    try {
      const tutorialData = req.body;
      const authorId = req.user.id;

      const tutorial = await tutorialService.createTutorial(tutorialData, authorId);

      res.status(201).json({
        success: true,
        data: tutorial
      });

    } catch (error) {
      console.error('Error creating tutorial:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create tutorial'
      });
    }
  }
);

/**
 * PUT /api/tutorials/:id
 * Update an existing tutorial
 */
router.put('/tutorials/:id',
  authenticate,
  validateRequest(createTutorialSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const tutorial = await tutorialService.updateTutorial(id, updates, userId);

      res.json({
        success: true,
        data: tutorial
      });

    } catch (error) {
      console.error('Error updating tutorial:', error);
      if (error.message === 'Tutorial not found') {
        res.status(404).json({
          success: false,
          error: 'Tutorial not found'
        });
      } else if (error.message === 'Insufficient permissions') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update tutorial'
        });
      }
    }
  }
);

/**
 * DELETE /api/tutorials/:id
 * Delete a tutorial
 */
router.delete('/tutorials/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await tutorialService.deleteTutorial(id, userId);

      res.json({
        success: true,
        message: 'Tutorial deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting tutorial:', error);
      if (error.message === 'Tutorial not found') {
        res.status(404).json({
          success: false,
          error: 'Tutorial not found'
        });
      } else if (error.message === 'Insufficient permissions') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete tutorial'
        });
      }
    }
  }
);

/**
 * GET /api/tutorials/:id/state
 * Get tutorial progress state for the current user
 */
router.get('/tutorials/:id/state',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const progress = await tutorialService.getTutorialProgress(userId, id);

      res.json({
        success: true,
        data: progress
      });

    } catch (error) {
      console.error('Error getting tutorial state:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tutorial state'
      });
    }
  }
);

/**
 * PUT /api/tutorials/:id/state
 * Update tutorial progress state
 */
router.put('/tutorials/:id/state',
  authenticate,
  validateRequest(updateProgressSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const progressData = req.body;

      const progress = await tutorialService.updateTutorialProgress(userId, id, progressData);

      res.json({
        success: true,
        data: progress
      });

    } catch (error) {
      console.error('Error updating tutorial state:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tutorial state'
      });
    }
  }
);

/**
 * DELETE /api/tutorials/:id/state
 * Clear tutorial progress state (reset)
 */
router.delete('/tutorials/:id/state',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Reset progress by creating a new progress record
      await tutorialService.updateTutorialProgress(userId, id, {
        currentStep: 0,
        stepsCompleted: [],
        timeSpent: 0,
        isCompleted: false,
        checkpointsCompleted: [],
        userChoices: {}
      });

      res.json({
        success: true,
        message: 'Tutorial state cleared'
      });

    } catch (error) {
      console.error('Error clearing tutorial state:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear tutorial state'
      });
    }
  }
);

/**
 * POST /api/tutorials/events
 * Track tutorial events for analytics
 */
router.post('/tutorials/events',
  authenticate,
  validateRequest(trackEventSchema),
  async (req, res) => {
    try {
      const eventData = req.body;
      const userId = req.user.id;

      await tutorialService.trackTutorialEvent(userId, eventData.tutorialId, eventData);

      res.json({
        success: true,
        message: 'Event tracked successfully'
      });

    } catch (error) {
      console.warn('Error tracking tutorial event:', error);
      // Don't fail the request for tracking errors
      res.json({
        success: true,
        message: 'Event tracking failed but request succeeded'
      });
    }
  }
);

/**
 * POST /api/tutorials/:id/complete
 * Mark tutorial as completed
 */
router.post('/tutorials/:id/complete',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const completionData = req.body;

      const completion = await tutorialService.completeTutorial(userId, id, completionData);

      res.json({
        success: true,
        data: completion
      });

    } catch (error) {
      console.error('Error completing tutorial:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete tutorial'
      });
    }
  }
);

/**
 * POST /api/tutorials/:id/validate
 * Validate a tutorial step
 */
router.post('/tutorials/:id/validate',
  authenticate,
  validateRequest(validateStepSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { stepIndex, data, validation } = req.body;

      const result = await tutorialService.validateTutorialStep(id, stepIndex, data, validation);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error validating tutorial step:', error);
      res.status(500).json({
        success: false,
        error: 'Validation failed'
      });
    }
  }
);

/**
 * GET /api/tutorials/:id/analytics
 * Get tutorial analytics (admin/instructor only)
 */
router.get('/tutorials/:id/analytics',
  authenticate,
  async (req, res) => {
    try {
      // Check permissions (simplified - should be more robust)
      if (!req.user.isAdmin && !req.user.isInstructor) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const { id } = req.params;
      const { timeRange = '30d', includeSteps = 'false', includeDropoff = 'true' } = req.query;

      const analytics = await tutorialService.getTutorialAnalytics(id, {
        timeRange,
        includeSteps: includeSteps === 'true',
        includeDropoff: includeDropoff === 'true'
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Error getting tutorial analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tutorial analytics'
      });
    }
  }
);

/**
 * POST /api/tutorials/:id/rating
 * Rate a tutorial
 */
router.post('/tutorials/:id/rating',
  authenticate,
  validateRequest(rateTutorialSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, feedback } = req.body;
      const userId = req.user.id;

      const ratingRecord = await tutorialService.rateTutorial(userId, id, rating, feedback);

      res.json({
        success: true,
        data: ratingRecord
      });

    } catch (error) {
      console.error('Error rating tutorial:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to rate tutorial'
      });
    }
  }
);

/**
 * POST /api/tutorials/recommendations
 * Get tutorial recommendations for the current user
 */
router.post('/tutorials/recommendations',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const criteria = req.body;

      const recommendations = await tutorialService.getTutorialRecommendations(userId, criteria);

      res.json({
        success: true,
        data: recommendations
      });

    } catch (error) {
      console.error('Error getting tutorial recommendations:', error);
      res.json({
        success: true,
        data: [] // Return empty array rather than error
      });
    }
  }
);

/**
 * GET /api/tutorials/progress
 * Get user's tutorial progress across all tutorials
 */
router.get('/tutorials/progress',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // This would be implemented as a method in tutorialService
      // For now, return a simple response
      res.json({
        success: true,
        data: {
          totalTutorials: 0,
          completedTutorials: 0,
          inProgressTutorials: 0,
          totalTimeSpent: 0
        }
      });

    } catch (error) {
      console.error('Error getting user tutorial progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tutorial progress'
      });
    }
  }
);

/**
 * GET /api/tutorials/search
 * Search tutorials
 */
router.get('/tutorials/search',
  tutorialRateLimit,
  async (req, res) => {
    try {
      const { q, difficulty, category, limit = 20 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long'
        });
      }

      const filters = {
        search: q,
        difficulty,
        category,
        isPublished: true
      };

      const result = await tutorialService.getTutorials(filters, { page: 1, limit: parseInt(limit) });

      res.json({
        success: true,
        data: result.tutorials
      });

    } catch (error) {
      console.error('Error searching tutorials:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }
);

/**
 * GET /api/tutorials/stats
 * Get tutorial statistics summary
 */
router.get('/tutorials/stats',
  async (req, res) => {
    try {
      // This would be implemented as a method in tutorialService
      res.json({
        success: true,
        data: {
          totalTutorials: 0,
          totalCompletions: 0,
          averageRating: 0,
          popularCategories: []
        }
      });

    } catch (error) {
      console.error('Error getting tutorial stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tutorial statistics'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Tutorial route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;