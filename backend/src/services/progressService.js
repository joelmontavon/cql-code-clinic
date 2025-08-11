import { PrismaClient } from '@prisma/client';
import winston from 'winston';

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Progress Tracking and Analytics Service
 * Manages user progress, learning analytics, and achievement tracking
 */
export class ProgressService {
  constructor() {
    this.progressCache = new Map();
    this.analyticsCache = new Map();
  }

  /**
   * Track exercise submission and update progress
   * @param {string} userId - User ID
   * @param {string} exerciseId - Exercise ID
   * @param {Object} submissionData - Submission details
   * @returns {Promise<Object>} Updated progress
   */
  async trackExerciseSubmission(userId, exerciseId, submissionData) {
    try {
      const {
        code,
        isCorrect,
        timeSpent,
        hintsUsed,
        attempts,
        score,
        errors,
        testResults
      } = submissionData;

      // Get or create exercise progress
      let progress = await prisma.exerciseProgress.findUnique({
        where: {
          userId_exerciseId: {
            userId,
            exerciseId
          }
        }
      });

      const isFirstAttempt = !progress;
      const isNewCompletion = !progress?.isCompleted && isCorrect;

      if (!progress) {
        progress = await prisma.exerciseProgress.create({
          data: {
            userId,
            exerciseId,
            status: isCorrect ? 'completed' : 'in_progress',
            isCompleted: isCorrect,
            attempts: 1,
            hintsUsed: hintsUsed || 0,
            timeSpent: timeSpent || 0,
            bestScore: score || 0,
            firstAttemptAt: new Date(),
            lastAttemptAt: new Date(),
            completedAt: isCorrect ? new Date() : null
          }
        });
      } else {
        // Update existing progress
        const updates = {
          status: isCorrect ? 'completed' : progress.status,
          attempts: progress.attempts + 1,
          hintsUsed: Math.max(progress.hintsUsed, hintsUsed || 0),
          timeSpent: progress.timeSpent + (timeSpent || 0),
          lastAttemptAt: new Date()
        };

        if (isCorrect && !progress.isCompleted) {
          updates.isCompleted = true;
          updates.completedAt = new Date();
        }

        if (score && score > progress.bestScore) {
          updates.bestScore = score;
        }

        progress = await prisma.exerciseProgress.update({
          where: {
            userId_exerciseId: {
              userId,
              exerciseId
            }
          },
          data: updates
        });
      }

      // Create submission record
      const submission = await prisma.exerciseSubmission.create({
        data: {
          userId,
          exerciseId,
          code,
          isCorrect,
          score: score || 0,
          timeSpent: timeSpent || 0,
          hintsUsed: hintsUsed || 0,
          errors: errors || [],
          testResults: testResults || {},
          submittedAt: new Date()
        }
      });

      // Track learning events
      await this.trackLearningEvent(userId, {
        type: isFirstAttempt ? 'exercise_started' : 'exercise_attempted',
        exerciseId,
        data: {
          isCorrect,
          attempts,
          timeSpent,
          hintsUsed,
          score
        }
      });

      if (isNewCompletion) {
        await this.trackLearningEvent(userId, {
          type: 'exercise_completed',
          exerciseId,
          data: {
            attempts: progress.attempts,
            timeSpent: progress.timeSpent,
            hintsUsed: progress.hintsUsed,
            score: progress.bestScore
          }
        });

        // Check for achievements
        await this.checkAndAwardAchievements(userId, exerciseId, progress);
      }

      // Update user skill level
      await this.updateUserSkillLevel(userId);

      // Clear cache
      this.clearUserCache(userId);

      return {
        progress,
        submission,
        isFirstAttempt,
        isNewCompletion,
        achievements: isNewCompletion ? await this.getNewAchievements(userId) : []
      };

    } catch (error) {
      logger.error('Failed to track exercise submission:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive user progress overview
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User progress overview
   */
  async getUserProgress(userId) {
    try {
      const cacheKey = `user_progress_${userId}`;
      if (this.progressCache.has(cacheKey)) {
        return this.progressCache.get(cacheKey);
      }

      const [
        exerciseProgress,
        tutorialProgress,
        achievements,
        learningStreak,
        skillLevel,
        totalStats
      ] = await Promise.all([
        this.getExerciseProgress(userId),
        this.getTutorialProgress(userId),
        this.getUserAchievements(userId),
        this.getLearningStreak(userId),
        this.getUserSkillLevel(userId),
        this.getTotalUserStats(userId)
      ]);

      const overview = {
        user: await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            createdAt: true
          }
        }),
        exercise: exerciseProgress,
        tutorial: tutorialProgress,
        achievements,
        learningStreak,
        skillLevel,
        totalStats,
        lastUpdated: new Date()
      };

      // Cache for 5 minutes
      this.progressCache.set(cacheKey, overview);
      setTimeout(() => this.progressCache.delete(cacheKey), 5 * 60 * 1000);

      return overview;

    } catch (error) {
      logger.error('Failed to get user progress:', error);
      throw error;
    }
  }

  /**
   * Get detailed exercise progress for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Exercise progress details
   */
  async getExerciseProgress(userId) {
    try {
      const [completedExercises, inProgressExercises, totalExercises] = await Promise.all([
        prisma.exerciseProgress.findMany({
          where: {
            userId,
            isCompleted: true
          },
          include: {
            exercise: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                category: true,
                estimatedTime: true
              }
            }
          },
          orderBy: {
            completedAt: 'desc'
          }
        }),
        
        prisma.exerciseProgress.findMany({
          where: {
            userId,
            isCompleted: false
          },
          include: {
            exercise: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                category: true,
                estimatedTime: true
              }
            }
          },
          orderBy: {
            lastAttemptAt: 'desc'
          }
        }),
        
        prisma.exercise.count({
          where: {
            isPublished: true
          }
        })
      ]);

      // Calculate progress statistics
      const completedCount = completedExercises.length;
      const inProgressCount = inProgressExercises.length;
      const completionRate = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

      // Calculate average metrics
      const avgTimeSpent = completedExercises.length > 0 ?
        completedExercises.reduce((sum, ex) => sum + ex.timeSpent, 0) / completedExercises.length : 0;

      const avgAttempts = completedExercises.length > 0 ?
        completedExercises.reduce((sum, ex) => sum + ex.attempts, 0) / completedExercises.length : 0;

      const avgScore = completedExercises.length > 0 ?
        completedExercises.reduce((sum, ex) => sum + ex.bestScore, 0) / completedExercises.length : 0;

      // Group by difficulty and category
      const byDifficulty = this.groupProgressByField(completedExercises, 'exercise.difficulty');
      const byCategory = this.groupProgressByField(completedExercises, 'exercise.category');

      return {
        summary: {
          totalExercises,
          completedCount,
          inProgressCount,
          completionRate: Math.round(completionRate * 10) / 10,
          avgTimeSpent: Math.round(avgTimeSpent),
          avgAttempts: Math.round(avgAttempts * 10) / 10,
          avgScore: Math.round(avgScore * 10) / 10
        },
        completed: completedExercises.slice(0, 10), // Recent 10
        inProgress: inProgressExercises.slice(0, 5), // Recent 5
        byDifficulty,
        byCategory
      };

    } catch (error) {
      logger.error('Failed to get exercise progress:', error);
      throw error;
    }
  }

  /**
   * Get tutorial progress for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Tutorial progress details
   */
  async getTutorialProgress(userId) {
    try {
      const [completedTutorials, inProgressTutorials, totalTutorials] = await Promise.all([
        prisma.tutorialProgress.findMany({
          where: {
            userId,
            isCompleted: true
          },
          include: {
            tutorial: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                category: true,
                estimatedTime: true
              }
            }
          },
          orderBy: {
            completedAt: 'desc'
          }
        }),
        
        prisma.tutorialProgress.findMany({
          where: {
            userId,
            isCompleted: false
          },
          include: {
            tutorial: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                category: true,
                estimatedTime: true,
                steps: true
              }
            }
          },
          orderBy: {
            lastAccessed: 'desc'
          }
        }),
        
        prisma.tutorial.count({
          where: {
            isPublished: true
          }
        })
      ]);

      const completedCount = completedTutorials.length;
      const inProgressCount = inProgressTutorials.length;
      const completionRate = totalTutorials > 0 ? (completedCount / totalTutorials) * 100 : 0;

      return {
        summary: {
          totalTutorials,
          completedCount,
          inProgressCount,
          completionRate: Math.round(completionRate * 10) / 10
        },
        completed: completedTutorials.slice(0, 10),
        inProgress: inProgressTutorials.slice(0, 5)
      };

    } catch (error) {
      logger.error('Failed to get tutorial progress:', error);
      throw error;
    }
  }

  /**
   * Get user achievements
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User achievements
   */
  async getUserAchievements(userId) {
    try {
      const achievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: true
        },
        orderBy: {
          unlockedAt: 'desc'
        }
      });

      return achievements.map(ua => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        category: ua.achievement.category,
        difficulty: ua.achievement.difficulty,
        icon: ua.achievement.icon,
        points: ua.achievement.points,
        unlockedAt: ua.unlockedAt,
        progress: ua.progress
      }));

    } catch (error) {
      logger.error('Failed to get user achievements:', error);
      return [];
    }
  }

  /**
   * Get learning streak information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Learning streak data
   */
  async getLearningStreak(userId) {
    try {
      // Get learning events from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const learningEvents = await prisma.learningEvent.findMany({
        where: {
          userId,
          createdAt: {
            gte: thirtyDaysAgo
          },
          type: {
            in: ['exercise_completed', 'tutorial_completed', 'lesson_completed']
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate current streak
      const currentStreak = this.calculateCurrentStreak(learningEvents);
      const longestStreak = this.calculateLongestStreak(learningEvents);
      const activeDays = this.getUniqueDays(learningEvents);

      return {
        currentStreak,
        longestStreak,
        activeDays: activeDays.length,
        lastActivityDate: learningEvents.length > 0 ? learningEvents[0].createdAt : null,
        weeklyActivity: this.getWeeklyActivity(learningEvents)
      };

    } catch (error) {
      logger.error('Failed to get learning streak:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        activeDays: 0,
        lastActivityDate: null,
        weeklyActivity: []
      };
    }
  }

  /**
   * Get user skill level and progression
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Skill level data
   */
  async getUserSkillLevel(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          skillLevel: true,
          experiencePoints: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const skillLevel = user.skillLevel || 1;
      const experiencePoints = user.experiencePoints || 0;

      // Calculate level progression
      const currentLevelXP = this.getXPRequiredForLevel(skillLevel);
      const nextLevelXP = this.getXPRequiredForLevel(skillLevel + 1);
      const progressToNextLevel = nextLevelXP > currentLevelXP ? 
        ((experiencePoints - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;

      return {
        currentLevel: skillLevel,
        experiencePoints,
        currentLevelXP,
        nextLevelXP,
        progressToNextLevel: Math.max(0, Math.min(100, progressToNextLevel)),
        levelName: this.getLevelName(skillLevel)
      };

    } catch (error) {
      logger.error('Failed to get user skill level:', error);
      return {
        currentLevel: 1,
        experiencePoints: 0,
        currentLevelXP: 0,
        nextLevelXP: 100,
        progressToNextLevel: 0,
        levelName: 'Beginner'
      };
    }
  }

  /**
   * Get comprehensive user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Total user stats
   */
  async getTotalUserStats(userId) {
    try {
      const [
        totalTimeSpent,
        totalSubmissions,
        totalHintsUsed,
        firstActivityDate
      ] = await Promise.all([
        // Total time spent across all exercises
        prisma.exerciseProgress.aggregate({
          where: { userId },
          _sum: { timeSpent: true }
        }),
        
        // Total submissions
        prisma.exerciseSubmission.count({
          where: { userId }
        }),
        
        // Total hints used
        prisma.exerciseProgress.aggregate({
          where: { userId },
          _sum: { hintsUsed: true }
        }),
        
        // First activity date
        prisma.exerciseProgress.findFirst({
          where: { userId },
          orderBy: { firstAttemptAt: 'asc' },
          select: { firstAttemptAt: true }
        })
      ]);

      return {
        totalTimeSpent: totalTimeSpent._sum.timeSpent || 0,
        totalSubmissions,
        totalHintsUsed: totalHintsUsed._sum.hintsUsed || 0,
        memberSince: firstActivityDate?.firstAttemptAt || null,
        daysActive: this.calculateDaysActive(firstActivityDate?.firstAttemptAt)
      };

    } catch (error) {
      logger.error('Failed to get total user stats:', error);
      return {
        totalTimeSpent: 0,
        totalSubmissions: 0,
        totalHintsUsed: 0,
        memberSince: null,
        daysActive: 0
      };
    }
  }

  /**
   * Track general learning events
   * @param {string} userId - User ID
   * @param {Object} eventData - Event details
   * @returns {Promise<Object>} Created event
   */
  async trackLearningEvent(userId, eventData) {
    try {
      const event = await prisma.learningEvent.create({
        data: {
          userId,
          type: eventData.type,
          exerciseId: eventData.exerciseId || null,
          tutorialId: eventData.tutorialId || null,
          data: eventData.data || {},
          createdAt: new Date()
        }
      });

      return event;

    } catch (error) {
      logger.warn('Failed to track learning event:', error);
      // Don't throw error to avoid disrupting user experience
    }
  }

  /**
   * Get learning analytics for a time period
   * @param {string} userId - User ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Learning analytics
   */
  async getLearningAnalytics(userId, options = {}) {
    try {
      const { timeRange = '30d', includeDetails = false } = options;
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [dailyActivity, weeklyProgress, categoryProgress] = await Promise.all([
        this.getDailyActivity(userId, startDate, endDate),
        this.getWeeklyProgress(userId, startDate, endDate),
        this.getCategoryProgress(userId, startDate, endDate)
      ]);

      return {
        timeRange: {
          start: startDate,
          end: endDate,
          range: timeRange
        },
        dailyActivity,
        weeklyProgress,
        categoryProgress,
        summary: {
          totalDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
          activeDays: dailyActivity.filter(day => day.activity > 0).length,
          avgDailyActivity: dailyActivity.reduce((sum, day) => sum + day.activity, 0) / dailyActivity.length
        }
      };

    } catch (error) {
      logger.error('Failed to get learning analytics:', error);
      throw error;
    }
  }

  // Helper methods

  updateUserSkillLevel(userId) {
    // Implementation for updating user skill level based on progress
    // This would calculate XP from completed exercises and update level
  }

  checkAndAwardAchievements(userId, exerciseId, progress) {
    // Implementation for checking and awarding achievements
    // This would check various achievement criteria and award new ones
  }

  getNewAchievements(userId) {
    // Implementation for getting recently awarded achievements
    // This would return achievements unlocked in the last session
  }

  groupProgressByField(progressArray, fieldPath) {
    const result = {};
    progressArray.forEach(item => {
      const value = fieldPath.split('.').reduce((obj, key) => obj[key], item);
      if (!result[value]) result[value] = 0;
      result[value]++;
    });
    return result;
  }

  calculateCurrentStreak(events) {
    // Implementation for calculating current learning streak
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    const eventDays = new Set(events.map(event => 
      event.createdAt.toDateString()
    ));

    while (eventDays.has(currentDate.toDateString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  calculateLongestStreak(events) {
    // Implementation for calculating longest learning streak
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    const eventDays = [...new Set(events.map(event => 
      event.createdAt.toDateString()
    ))].sort();

    eventDays.forEach(dayString => {
      const day = new Date(dayString);
      if (lastDate && (day - lastDate) === 24 * 60 * 60 * 1000) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDate = day;
    });

    return longestStreak;
  }

  getUniqueDays(events) {
    return [...new Set(events.map(event => 
      event.createdAt.toDateString()
    ))];
  }

  getWeeklyActivity(events) {
    const weeklyActivity = new Array(7).fill(0);
    events.forEach(event => {
      const dayOfWeek = event.createdAt.getDay();
      weeklyActivity[dayOfWeek]++;
    });
    return weeklyActivity;
  }

  getXPRequiredForLevel(level) {
    // XP required follows an exponential curve
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  getLevelName(level) {
    const levelNames = [
      'Novice', 'Beginner', 'Learner', 'Student', 'Apprentice',
      'Practitioner', 'Intermediate', 'Advanced', 'Expert', 'Master'
    ];
    return levelNames[Math.min(level - 1, levelNames.length - 1)] || 'Master';
  }

  calculateDaysActive(firstActivityDate) {
    if (!firstActivityDate) return 0;
    const now = new Date();
    const diffTime = Math.abs(now - firstActivityDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDailyActivity(userId, startDate, endDate) {
    // Implementation for getting daily activity data
    // This would return activity counts for each day in the range
  }

  getWeeklyProgress(userId, startDate, endDate) {
    // Implementation for getting weekly progress data
  }

  getCategoryProgress(userId, startDate, endDate) {
    // Implementation for getting progress by category
  }

  clearUserCache(userId) {
    // Clear all cache entries for this user
    for (const [key] of this.progressCache.entries()) {
      if (key.includes(userId)) {
        this.progressCache.delete(key);
      }
    }
  }
}

export default new ProgressService();