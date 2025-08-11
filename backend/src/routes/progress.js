import express from 'express';
import { z } from 'zod';
import progressService from '../services/progressService.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for progress endpoints
const progressRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many progress requests. Please slow down.' }
});

// Validation schemas
const trackSubmissionSchema = z.object({
  body: z.object({
    exerciseId: z.string().uuid(),
    code: z.string(),
    isCorrect: z.boolean(),
    timeSpent: z.number().int().min(0).optional(),
    hintsUsed: z.number().int().min(0).optional(),
    attempts: z.number().int().min(1).optional(),
    score: z.number().min(0).max(100).optional(),
    errors: z.array(z.string()).optional(),
    testResults: z.record(z.string(), z.any()).optional()
  })
});

const trackEventSchema = z.object({
  body: z.object({
    type: z.string(),
    exerciseId: z.string().uuid().optional(),
    tutorialId: z.string().uuid().optional(),
    data: z.record(z.string(), z.any()).optional()
  })
});

const analyticsQuerySchema = z.object({
  query: z.object({
    timeRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
    includeDetails: z.string().transform(val => val === 'true').optional()
  })
});

/**
 * POST /api/progress/exercise/submission
 * Track exercise submission and update progress
 */
router.post('/exercise/submission',
  authenticate,
  progressRateLimit,
  validateRequest(trackSubmissionSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const submissionData = req.body;

      const result = await progressService.trackExerciseSubmission(userId, submissionData.exerciseId, submissionData);

      res.json({
        success: true,
        data: result,
        message: result.isNewCompletion ? 'Exercise completed!' : 'Progress updated'
      });

    } catch (error) {
      console.error('Error tracking exercise submission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track exercise submission'
      });
    }
  }
);

/**
 * GET /api/progress/user/:userId
 * Get comprehensive user progress overview
 */
router.get('/user/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Users can only view their own progress unless they're admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view this user\'s progress'
        });
      }

      const progressData = await progressService.getUserProgress(userId);

      res.json({
        success: true,
        data: progressData
      });

    } catch (error) {
      console.error('Error getting user progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user progress'
      });
    }
  }
);

/**
 * GET /api/progress/exercises/:userId
 * Get detailed exercise progress for user
 */
router.get('/exercises/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Permission check
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const exerciseProgress = await progressService.getExerciseProgress(userId);

      res.json({
        success: true,
        data: exerciseProgress
      });

    } catch (error) {
      console.error('Error getting exercise progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get exercise progress'
      });
    }
  }
);

/**
 * GET /api/progress/tutorials/:userId
 * Get tutorial progress for user
 */
router.get('/tutorials/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Permission check
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const tutorialProgress = await progressService.getTutorialProgress(userId);

      res.json({
        success: true,
        data: tutorialProgress
      });

    } catch (error) {
      console.error('Error getting tutorial progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tutorial progress'
      });
    }
  }
);

/**
 * GET /api/progress/achievements/:userId
 * Get user achievements
 */
router.get('/achievements/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Permission check
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const achievements = await progressService.getUserAchievements(userId);

      res.json({
        success: true,
        data: achievements
      });

    } catch (error) {
      console.error('Error getting user achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user achievements'
      });
    }
  }
);

/**
 * GET /api/progress/streak/:userId
 * Get learning streak information
 */
router.get('/streak/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Permission check
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const streak = await progressService.getLearningStreak(userId);

      res.json({
        success: true,
        data: streak
      });

    } catch (error) {
      console.error('Error getting learning streak:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get learning streak'
      });
    }
  }
);

/**
 * GET /api/progress/analytics/:userId
 * Get learning analytics for a time period
 */
router.get('/analytics/:userId',
  authenticate,
  validateRequest(analyticsQuerySchema),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeRange, includeDetails } = req.query;
      
      // Permission check
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const analytics = await progressService.getLearningAnalytics(userId, {
        timeRange,
        includeDetails
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Error getting learning analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get learning analytics'
      });
    }
  }
);

/**
 * POST /api/progress/event
 * Track general learning events
 */
router.post('/event',
  authenticate,
  progressRateLimit,
  validateRequest(trackEventSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const eventData = req.body;

      const event = await progressService.trackLearningEvent(userId, eventData);

      res.json({
        success: true,
        data: event,
        message: 'Event tracked successfully'
      });

    } catch (error) {
      console.warn('Error tracking learning event:', error);
      // Don't fail the request for tracking errors
      res.json({
        success: true,
        message: 'Event tracking failed but request succeeded'
      });
    }
  }
);

/**
 * GET /api/progress/leaderboard
 * Get progress leaderboard (public data only)
 */
router.get('/leaderboard',
  optionalAuth,
  async (req, res) => {
    try {
      const { timeRange = '30d', limit = 10, category } = req.query;

      // This would be implemented to show public leaderboard data
      // For now, return a placeholder response
      const leaderboard = [];

      res.json({
        success: true,
        data: {
          leaderboard,
          timeRange,
          category: category || 'overall',
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard'
      });
    }
  }
);

/**
 * GET /api/progress/statistics
 * Get platform-wide progress statistics
 */
router.get('/statistics',
  optionalAuth,
  async (req, res) => {
    try {
      // This would be implemented to show platform statistics
      // For now, return placeholder data
      const statistics = {
        totalUsers: 0,
        totalExercisesCompleted: 0,
        totalTutorialsCompleted: 0,
        totalTimeSpent: 0,
        averageCompletionRate: 0,
        mostPopularExercises: [],
        recentAchievements: []
      };

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Error getting platform statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get platform statistics'
      });
    }
  }
);

/**
 * POST /api/progress/reset/:userId
 * Reset user progress (admin only)
 */
router.post('/reset/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { confirmReset } = req.body;

      // Admin only
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      if (!confirmReset) {
        return res.status(400).json({
          success: false,
          error: 'Reset confirmation required'
        });
      }

      // This would be implemented to reset user progress
      // For now, return placeholder response
      res.json({
        success: true,
        message: 'User progress reset functionality not yet implemented'
      });

    } catch (error) {
      console.error('Error resetting user progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset user progress'
      });
    }
  }
);

/**
 * GET /api/progress/export/:userId
 * Export user progress data
 */
router.get('/export/:userId',
  authenticate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { format = 'json' } = req.query;

      // Users can only export their own data unless they're admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const progressData = await progressService.getUserProgress(userId);

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="progress-${userId}.json"`);
        res.json(progressData);
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="progress-${userId}.csv"`);
        // CSV export would be implemented here
        res.send('CSV export not yet implemented');
      } else {
        res.status(400).json({
          success: false,
          error: 'Unsupported export format. Use json or csv.'
        });
      }

    } catch (error) {
      console.error('Error exporting user progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export user progress'
      });
    }
  }
);

/**
 * GET /api/progress/summary
 * Get current user's progress summary
 */
router.get('/summary',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const summary = {
        skillLevel: await progressService.getUserSkillLevel(userId),
        recentActivity: {
          exercisesCompleted: 0,
          tutorialsCompleted: 0,
          timeSpent: 0,
          streak: await progressService.getLearningStreak(userId)
        },
        quickStats: {
          totalExercises: 0,
          completedExercises: 0,
          totalTutorials: 0,
          completedTutorials: 0
        }
      };

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Error getting progress summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get progress summary'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Progress route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;