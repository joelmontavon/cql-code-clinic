import { PrismaClient } from '@prisma/client';
import winston from 'winston';

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Tutorial Management Service
 * Handles tutorial creation, management, progress tracking, and analytics
 */
export class TutorialService {
  constructor() {
    this.tutorialCache = new Map();
    this.progressCache = new Map();
  }

  /**
   * Get all tutorials with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Tutorials and metadata
   */
  async getTutorials(filters = {}, pagination = {}) {
    try {
      const where = {};
      
      // Apply filters
      if (filters.difficulty) where.difficulty = filters.difficulty;
      if (filters.category) where.category = filters.category;
      if (filters.type) where.type = filters.type;
      if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;
      
      // Search in title and description
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasSome: filters.tags
        };
      }

      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const [tutorials, total] = await Promise.all([
        prisma.tutorial.findMany({
          where,
          include: {
            author: {
              select: { id: true, name: true, email: true }
            },
            _count: {
              select: {
                tutorialProgresses: true,
                tutorialCompletions: true,
                tutorialRatings: true
              }
            }
          },
          orderBy: [
            { featured: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        prisma.tutorial.count({ where })
      ]);

      // Add computed fields
      const enrichedTutorials = tutorials.map(tutorial => ({
        ...tutorial,
        completionRate: tutorial._count.tutorialProgresses > 0 ? 
          (tutorial._count.tutorialCompletions / tutorial._count.tutorialProgresses) * 100 : 0,
        popularity: tutorial._count.tutorialProgresses,
        averageRating: 0 // Will be calculated separately if needed
      }));

      return {
        tutorials: enrichedTutorials,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Failed to get tutorials:', error);
      throw error;
    }
  }

  /**
   * Get a single tutorial by ID
   * @param {string} tutorialId - Tutorial ID
   * @param {string} userId - User ID (optional, for progress tracking)
   * @returns {Promise<Object>} Tutorial with progress information
   */
  async getTutorial(tutorialId, userId = null) {
    try {
      // Check cache first
      const cacheKey = `${tutorialId}-${userId || 'anonymous'}`;
      if (this.tutorialCache.has(cacheKey)) {
        return this.tutorialCache.get(cacheKey);
      }

      const tutorial = await prisma.tutorial.findUnique({
        where: { id: tutorialId },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          tutorialRatings: {
            select: { rating: true }
          },
          _count: {
            select: {
              tutorialProgresses: true,
              tutorialCompletions: true
            }
          }
        }
      });

      if (!tutorial) {
        throw new Error('Tutorial not found');
      }

      // Get user progress if userId provided
      let userProgress = null;
      if (userId) {
        userProgress = await prisma.tutorialProgress.findUnique({
          where: {
            userId_tutorialId: {
              userId,
              tutorialId
            }
          }
        });
      }

      // Calculate average rating
      const averageRating = tutorial.tutorialRatings.length > 0 ?
        tutorial.tutorialRatings.reduce((sum, r) => sum + r.rating, 0) / tutorial.tutorialRatings.length : 0;

      const enrichedTutorial = {
        ...tutorial,
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: tutorial._count.tutorialProgresses > 0 ? 
          (tutorial._count.tutorialCompletions / tutorial._count.tutorialProgresses) * 100 : 0,
        userProgress: userProgress ? {
          currentStep: userProgress.currentStep,
          stepsCompleted: userProgress.stepsCompleted,
          timeSpent: userProgress.timeSpent,
          lastAccessed: userProgress.lastAccessed,
          isCompleted: userProgress.isCompleted
        } : null
      };

      // Cache for 5 minutes
      this.tutorialCache.set(cacheKey, enrichedTutorial);
      setTimeout(() => this.tutorialCache.delete(cacheKey), 5 * 60 * 1000);

      return enrichedTutorial;

    } catch (error) {
      logger.error('Failed to get tutorial:', error);
      throw error;
    }
  }

  /**
   * Create a new tutorial
   * @param {Object} tutorialData - Tutorial data
   * @param {string} authorId - Author user ID
   * @returns {Promise<Object>} Created tutorial
   */
  async createTutorial(tutorialData, authorId) {
    try {
      const tutorial = await prisma.tutorial.create({
        data: {
          ...tutorialData,
          authorId,
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      logger.info('Tutorial created:', { tutorialId: tutorial.id, authorId });
      return tutorial;

    } catch (error) {
      logger.error('Failed to create tutorial:', error);
      throw error;
    }
  }

  /**
   * Update an existing tutorial
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} updates - Tutorial updates
   * @param {string} userId - User ID (must be author or admin)
   * @returns {Promise<Object>} Updated tutorial
   */
  async updateTutorial(tutorialId, updates, userId) {
    try {
      // Verify permission to edit
      const existingTutorial = await prisma.tutorial.findUnique({
        where: { id: tutorialId },
        select: { authorId: true }
      });

      if (!existingTutorial) {
        throw new Error('Tutorial not found');
      }

      // TODO: Add proper permission check (author or admin)
      // if (existingTutorial.authorId !== userId) {
      //   throw new Error('Insufficient permissions');
      // }

      const tutorial = await prisma.tutorial.update({
        where: { id: tutorialId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Clear cache
      this.clearTutorialCache(tutorialId);

      logger.info('Tutorial updated:', { tutorialId, userId });
      return tutorial;

    } catch (error) {
      logger.error('Failed to update tutorial:', error);
      throw error;
    }
  }

  /**
   * Delete a tutorial
   * @param {string} tutorialId - Tutorial ID
   * @param {string} userId - User ID (must be author or admin)
   * @returns {Promise<void>}
   */
  async deleteTutorial(tutorialId, userId) {
    try {
      // Verify permission and get tutorial
      const tutorial = await prisma.tutorial.findUnique({
        where: { id: tutorialId },
        select: { authorId: true, title: true }
      });

      if (!tutorial) {
        throw new Error('Tutorial not found');
      }

      // TODO: Add proper permission check
      // if (tutorial.authorId !== userId) {
      //   throw new Error('Insufficient permissions');
      // }

      // Delete related data first
      await prisma.$transaction(async (tx) => {
        await tx.tutorialEvent.deleteMany({ where: { tutorialId } });
        await tx.tutorialProgress.deleteMany({ where: { tutorialId } });
        await tx.tutorialCompletion.deleteMany({ where: { tutorialId } });
        await tx.tutorialRating.deleteMany({ where: { tutorialId } });
        await tx.tutorial.delete({ where: { id: tutorialId } });
      });

      // Clear cache
      this.clearTutorialCache(tutorialId);

      logger.info('Tutorial deleted:', { tutorialId, title: tutorial.title, userId });

    } catch (error) {
      logger.error('Failed to delete tutorial:', error);
      throw error;
    }
  }

  /**
   * Get or create tutorial progress for a user
   * @param {string} userId - User ID
   * @param {string} tutorialId - Tutorial ID
   * @returns {Promise<Object>} Tutorial progress
   */
  async getTutorialProgress(userId, tutorialId) {
    try {
      let progress = await prisma.tutorialProgress.findUnique({
        where: {
          userId_tutorialId: {
            userId,
            tutorialId
          }
        }
      });

      if (!progress) {
        progress = await prisma.tutorialProgress.create({
          data: {
            userId,
            tutorialId,
            currentStep: 0,
            stepsCompleted: [],
            timeSpent: 0,
            startedAt: new Date(),
            lastAccessed: new Date()
          }
        });
      }

      return progress;

    } catch (error) {
      logger.error('Failed to get tutorial progress:', error);
      throw error;
    }
  }

  /**
   * Update tutorial progress
   * @param {string} userId - User ID
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} progressData - Progress update data
   * @returns {Promise<Object>} Updated progress
   */
  async updateTutorialProgress(userId, tutorialId, progressData) {
    try {
      const progress = await prisma.tutorialProgress.upsert({
        where: {
          userId_tutorialId: {
            userId,
            tutorialId
          }
        },
        update: {
          ...progressData,
          lastAccessed: new Date()
        },
        create: {
          userId,
          tutorialId,
          currentStep: 0,
          stepsCompleted: [],
          timeSpent: 0,
          startedAt: new Date(),
          lastAccessed: new Date(),
          ...progressData
        }
      });

      // Clear progress cache
      this.progressCache.delete(`${userId}-${tutorialId}`);

      return progress;

    } catch (error) {
      logger.error('Failed to update tutorial progress:', error);
      throw error;
    }
  }

  /**
   * Complete a tutorial
   * @param {string} userId - User ID
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} completionData - Completion data
   * @returns {Promise<Object>} Completion record
   */
  async completeTutorial(userId, tutorialId, completionData) {
    try {
      // Update progress to completed
      await this.updateTutorialProgress(userId, tutorialId, {
        isCompleted: true,
        completedAt: new Date(),
        ...completionData
      });

      // Create completion record
      const completion = await prisma.tutorialCompletion.create({
        data: {
          userId,
          tutorialId,
          timeSpent: completionData.timeSpent || 0,
          stepsCompleted: completionData.totalSteps || 0,
          completedAt: new Date()
        }
      });

      logger.info('Tutorial completed:', { userId, tutorialId, timeSpent: completionData.timeSpent });
      return completion;

    } catch (error) {
      logger.error('Failed to complete tutorial:', error);
      throw error;
    }
  }

  /**
   * Track tutorial events for analytics
   * @param {string} userId - User ID
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} eventData - Event data
   * @returns {Promise<void>}
   */
  async trackTutorialEvent(userId, tutorialId, eventData) {
    try {
      await prisma.tutorialEvent.create({
        data: {
          userId,
          tutorialId,
          eventType: eventData.event,
          step: eventData.step,
          eventData: eventData,
          timestamp: new Date(eventData.timestamp || Date.now())
        }
      });

    } catch (error) {
      logger.warn('Failed to track tutorial event:', error);
      // Don't throw error to avoid disrupting user experience
    }
  }

  /**
   * Validate a tutorial step
   * @param {string} tutorialId - Tutorial ID
   * @param {number} stepIndex - Step index
   * @param {Object} data - Data to validate
   * @param {Object} validation - Validation rules
   * @returns {Promise<Object>} Validation result
   */
  async validateTutorialStep(tutorialId, stepIndex, data, validation) {
    try {
      // Simple validation logic - could be expanded
      let isValid = true;
      const errors = [];
      const feedback = [];

      if (validation.type === 'code') {
        // Code validation
        const { code } = data;
        if (!code || !code.trim()) {
          isValid = false;
          errors.push('Code cannot be empty');
        }

        // Check for required patterns
        if (validation.requiredPatterns) {
          for (const pattern of validation.requiredPatterns) {
            const regex = new RegExp(pattern.regex, pattern.flags || 'i');
            if (!regex.test(code)) {
              isValid = false;
              errors.push(pattern.message || `Code must match pattern: ${pattern.regex}`);
            }
          }
        }

        // Check for forbidden patterns
        if (validation.forbiddenPatterns) {
          for (const pattern of validation.forbiddenPatterns) {
            const regex = new RegExp(pattern.regex, pattern.flags || 'i');
            if (regex.test(code)) {
              isValid = false;
              errors.push(pattern.message || `Code contains forbidden pattern: ${pattern.regex}`);
            }
          }
        }
      }

      // Custom validation function
      if (validation.customValidator) {
        try {
          const customResult = validation.customValidator(data);
          if (!customResult.isValid) {
            isValid = false;
            errors.push(...customResult.errors);
          }
          feedback.push(...(customResult.feedback || []));
        } catch (error) {
          logger.warn('Custom validator failed:', error);
        }
      }

      return {
        isValid,
        errors,
        feedback,
        nextStep: isValid ? stepIndex + 1 : stepIndex
      };

    } catch (error) {
      logger.error('Failed to validate tutorial step:', error);
      return {
        isValid: false,
        errors: ['Validation failed'],
        feedback: ['Unable to validate your answer. Please try again.']
      };
    }
  }

  /**
   * Get tutorial analytics
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Tutorial analytics
   */
  async getTutorialAnalytics(tutorialId, options = {}) {
    try {
      const { timeRange = '30d' } = options;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === '7d') startDate.setDate(endDate.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(endDate.getDate() - 30);
      else if (timeRange === '90d') startDate.setDate(endDate.getDate() - 90);

      const [
        tutorial,
        totalStarts,
        totalCompletions,
        averageTimeSpent,
        stepDropoff,
        userRatings
      ] = await Promise.all([
        // Basic tutorial info
        prisma.tutorial.findUnique({
          where: { id: tutorialId },
          select: { title: true, steps: true }
        }),
        
        // Total starts
        prisma.tutorialProgress.count({
          where: {
            tutorialId,
            startedAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        
        // Total completions
        prisma.tutorialCompletion.count({
          where: {
            tutorialId,
            completedAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        
        // Average time spent
        prisma.tutorialCompletion.aggregate({
          where: {
            tutorialId,
            completedAt: {
              gte: startDate,
              lte: endDate
            }
          },
          _avg: {
            timeSpent: true
          }
        }),
        
        // Step dropoff analysis
        this.getStepDropoffAnalysis(tutorialId, startDate, endDate),
        
        // User ratings
        prisma.tutorialRating.findMany({
          where: {
            tutorialId,
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          select: { rating: true, feedback: true }
        })
      ]);

      const completionRate = totalStarts > 0 ? (totalCompletions / totalStarts) * 100 : 0;
      const averageRating = userRatings.length > 0 ?
        userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length : 0;

      return {
        tutorial: {
          id: tutorialId,
          title: tutorial?.title,
          totalSteps: tutorial?.steps?.length || 0
        },
        metrics: {
          totalStarts,
          totalCompletions,
          completionRate: Math.round(completionRate * 10) / 10,
          averageTimeSpent: Math.round(averageTimeSpent._avg.timeSpent || 0),
          averageRating: Math.round(averageRating * 10) / 10,
          totalRatings: userRatings.length
        },
        stepAnalytics: stepDropoff,
        timeRange: {
          start: startDate,
          end: endDate,
          range: timeRange
        }
      };

    } catch (error) {
      logger.error('Failed to get tutorial analytics:', error);
      throw error;
    }
  }

  /**
   * Get step dropoff analysis
   * @param {string} tutorialId - Tutorial ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Step analytics
   */
  async getStepDropoffAnalysis(tutorialId, startDate, endDate) {
    try {
      const events = await prisma.tutorialEvent.findMany({
        where: {
          tutorialId,
          eventType: { in: ['step_started', 'step_completed'] },
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          eventType: true,
          step: true,
          userId: true
        }
      });

      // Analyze step completion rates
      const stepStats = {};
      const userSteps = {};

      events.forEach(event => {
        const step = event.step;
        
        if (!stepStats[step]) {
          stepStats[step] = { started: 0, completed: 0 };
        }
        
        if (!userSteps[event.userId]) {
          userSteps[event.userId] = {};
        }

        if (event.eventType === 'step_started') {
          if (!userSteps[event.userId][step]) {
            stepStats[step].started++;
            userSteps[event.userId][step] = { started: true, completed: false };
          }
        } else if (event.eventType === 'step_completed') {
          if (!userSteps[event.userId][step]?.completed) {
            stepStats[step].completed++;
            if (userSteps[event.userId][step]) {
              userSteps[event.userId][step].completed = true;
            }
          }
        }
      });

      // Convert to array and calculate rates
      return Object.entries(stepStats).map(([step, stats]) => ({
        step: parseInt(step),
        started: stats.started,
        completed: stats.completed,
        completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
        dropoffRate: stats.started > 0 ? ((stats.started - stats.completed) / stats.started) * 100 : 0
      })).sort((a, b) => a.step - b.step);

    } catch (error) {
      logger.error('Failed to get step dropoff analysis:', error);
      return [];
    }
  }

  /**
   * Rate a tutorial
   * @param {string} userId - User ID
   * @param {string} tutorialId - Tutorial ID
   * @param {number} rating - Rating (1-5)
   * @param {string} feedback - Optional feedback
   * @returns {Promise<Object>} Rating record
   */
  async rateTutorial(userId, tutorialId, rating, feedback = '') {
    try {
      const ratingRecord = await prisma.tutorialRating.upsert({
        where: {
          userId_tutorialId: {
            userId,
            tutorialId
          }
        },
        update: {
          rating,
          feedback,
          updatedAt: new Date()
        },
        create: {
          userId,
          tutorialId,
          rating,
          feedback,
          createdAt: new Date()
        }
      });

      // Clear tutorial cache to refresh average rating
      this.clearTutorialCache(tutorialId);

      return ratingRecord;

    } catch (error) {
      logger.error('Failed to rate tutorial:', error);
      throw error;
    }
  }

  /**
   * Get tutorial recommendations for a user
   * @param {string} userId - User ID
   * @param {Object} criteria - Recommendation criteria
   * @returns {Promise<Array>} Recommended tutorials
   */
  async getTutorialRecommendations(userId, criteria = {}) {
    try {
      // Get user's completed tutorials and skill level
      const userProgress = await prisma.tutorialProgress.findMany({
        where: { userId, isCompleted: true },
        select: { tutorialId: true, tutorial: { select: { difficulty: true, category: true } } }
      });

      const completedTutorialIds = userProgress.map(p => p.tutorialId);
      const userSkillLevel = this.determineUserSkillLevel(userProgress);

      // Build recommendation query
      const where = {
        isPublished: true,
        id: { notIn: completedTutorialIds }
      };

      // Filter by difficulty based on user skill level
      if (criteria.difficulty || userSkillLevel) {
        where.difficulty = criteria.difficulty || userSkillLevel;
      }

      // Filter by category if specified
      if (criteria.category) {
        where.category = criteria.category;
      }

      // Get recommended tutorials
      const recommendations = await prisma.tutorial.findMany({
        where,
        include: {
          author: {
            select: { name: true }
          },
          tutorialRatings: {
            select: { rating: true }
          },
          _count: {
            select: { tutorialCompletions: true }
          }
        },
        orderBy: [
          { featured: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 10
      });

      // Score and sort recommendations
      return recommendations.map(tutorial => {
        const avgRating = tutorial.tutorialRatings.length > 0 ?
          tutorial.tutorialRatings.reduce((sum, r) => sum + r.rating, 0) / tutorial.tutorialRatings.length : 0;
        
        const popularityScore = tutorial._count.tutorialCompletions;
        const score = (avgRating * 0.3) + (popularityScore * 0.7);

        return {
          ...tutorial,
          averageRating: avgRating,
          recommendationScore: score
        };
      }).sort((a, b) => b.recommendationScore - a.recommendationScore);

    } catch (error) {
      logger.error('Failed to get tutorial recommendations:', error);
      return [];
    }
  }

  // Helper methods
  determineUserSkillLevel(userProgress) {
    if (userProgress.length === 0) return 'beginner';
    
    const difficulties = userProgress.map(p => p.tutorial.difficulty);
    const advancedCount = difficulties.filter(d => d === 'advanced').length;
    const intermediateCount = difficulties.filter(d => d === 'intermediate').length;
    
    if (advancedCount >= 2) return 'advanced';
    if (intermediateCount >= 3) return 'intermediate';
    return 'beginner';
  }

  clearTutorialCache(tutorialId) {
    // Clear all cache entries for this tutorial
    for (const [key] of this.tutorialCache.entries()) {
      if (key.startsWith(tutorialId)) {
        this.tutorialCache.delete(key);
      }
    }
  }
}

export default new TutorialService();