import { PrismaClient } from '@prisma/client';
import winston from 'winston';

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Hint Management Service
 * Handles hint analytics, personalization, and optimization
 */
export class HintService {
  constructor() {
    this.hintCache = new Map();
    this.analyticsBuffer = [];
  }

  /**
   * Get personalized hints for a user and exercise
   * @param {string} userId - User ID
   * @param {string} exerciseId - Exercise ID
   * @param {Object} context - Current context (code, error, time)
   * @returns {Promise<Object>} Personalized hints
   */
  async getPersonalizedHints(userId, exerciseId, context) {
    try {
      // Get user's hint preferences and history
      const userProfile = await this.getUserHintProfile(userId);
      
      // Get base exercise hints
      const baseHints = await this.getExerciseHints(exerciseId);
      
      // Generate contextual hints
      const contextualHints = await this.generateContextualHints(context, exerciseId);
      
      // Personalize hint timing and content
      const personalizedHints = this.personalizeHints(
        baseHints, 
        contextualHints, 
        userProfile, 
        context
      );

      // Log hint request for analytics
      await this.logHintRequest(userId, exerciseId, context, personalizedHints);

      return {
        baseHints: personalizedHints.base,
        contextualHints: personalizedHints.contextual,
        recommendations: personalizedHints.recommendations,
        timing: personalizedHints.timing,
        userProfile: userProfile
      };

    } catch (error) {
      logger.error('Failed to get personalized hints:', error);
      throw error;
    }
  }

  /**
   * Track hint usage and effectiveness
   * @param {string} userId - User ID
   * @param {string} exerciseId - Exercise ID
   * @param {Object} hintData - Hint usage data
   * @returns {Promise<void>}
   */
  async trackHintUsage(userId, exerciseId, hintData) {
    try {
      // Store hint usage in database
      await prisma.hintUsage.create({
        data: {
          userId,
          exerciseId,
          hintLevel: hintData.level,
          hintType: hintData.type,
          timeToReveal: hintData.timeToReveal,
          codeAtTime: hintData.codeAtTime,
          wasHelpful: hintData.wasHelpful,
          leadToSolution: hintData.leadToSolution,
          timestamp: new Date()
        }
      });

      // Update user hint profile
      await this.updateUserHintProfile(userId, hintData);

      // Add to analytics buffer
      this.analyticsBuffer.push({
        userId,
        exerciseId,
        ...hintData,
        timestamp: Date.now()
      });

      // Process analytics if buffer is full
      if (this.analyticsBuffer.length >= 100) {
        await this.processAnalytics();
      }

    } catch (error) {
      logger.error('Failed to track hint usage:', error);
    }
  }

  /**
   * Generate contextual hints based on current state
   * @param {Object} context - Current context (code, error, time)
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<Array>} Contextual hints
   */
  async generateContextualHints(context, exerciseId) {
    const hints = [];

    // Syntax error hints
    if (context.lastError?.includes('syntax')) {
      const syntaxHint = await this.generateSyntaxHint(context.lastError, context.currentCode);
      if (syntaxHint) hints.push(syntaxHint);
    }

    // Performance hints
    if (context.timeSpent > 600) { // 10 minutes
      const performanceHint = await this.generatePerformanceHint(context, exerciseId);
      if (performanceHint) hints.push(performanceHint);
    }

    // Concept hints based on exercise concepts
    const conceptHints = await this.generateConceptHints(context, exerciseId);
    hints.push(...conceptHints);

    // Logic hints for runtime errors
    if (context.lastError?.includes('runtime') || context.lastError?.includes('null')) {
      const logicHint = await this.generateLogicHint(context.lastError, context.currentCode);
      if (logicHint) hints.push(logicHint);
    }

    return hints.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get user's hint profile and preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User hint profile
   */
  async getUserHintProfile(userId) {
    try {
      const profile = await prisma.userHintProfile.findUnique({
        where: { userId },
        include: {
          hintUsages: {
            take: 50,
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      if (!profile) {
        // Create default profile for new user
        return await this.createDefaultHintProfile(userId);
      }

      // Calculate dynamic preferences based on usage
      const preferences = this.calculateHintPreferences(profile.hintUsages);

      return {
        ...profile,
        calculatedPreferences: preferences,
        hintStyle: profile.preferredHintStyle || 'balanced',
        maxLevel: profile.maxHintLevel || 5,
        autoSuggest: profile.autoSuggestEnabled ?? true,
        effectivenessScore: this.calculateEffectivenessScore(profile.hintUsages)
      };

    } catch (error) {
      logger.error('Failed to get user hint profile:', error);
      return await this.createDefaultHintProfile(userId);
    }
  }

  /**
   * Update user hint profile based on usage
   * @param {string} userId - User ID
   * @param {Object} hintData - Hint usage data
   * @returns {Promise<void>}
   */
  async updateUserHintProfile(userId, hintData) {
    try {
      const profile = await prisma.userHintProfile.findUnique({
        where: { userId }
      });

      if (profile) {
        // Update existing profile
        await prisma.userHintProfile.update({
          where: { userId },
          data: {
            totalHintsUsed: profile.totalHintsUsed + 1,
            averageHintLevel: this.calculateNewAverage(
              profile.averageHintLevel, 
              profile.totalHintsUsed, 
              hintData.level
            ),
            lastHintUsed: new Date(),
            successfulHints: profile.successfulHints + (hintData.leadToSolution ? 1 : 0)
          }
        });
      }
    } catch (error) {
      logger.error('Failed to update user hint profile:', error);
    }
  }

  /**
   * Get hints for a specific exercise
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<Array>} Exercise hints
   */
  async getExerciseHints(exerciseId) {
    // Try cache first
    if (this.hintCache.has(exerciseId)) {
      return this.hintCache.get(exerciseId);
    }

    try {
      const exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId },
        select: { content: true }
      });

      const hints = exercise?.content?.hints || [];
      
      // Cache for 5 minutes
      this.hintCache.set(exerciseId, hints);
      setTimeout(() => this.hintCache.delete(exerciseId), 5 * 60 * 1000);

      return hints;

    } catch (error) {
      logger.error('Failed to get exercise hints:', error);
      return [];
    }
  }

  /**
   * Personalize hints based on user profile and context
   * @param {Array} baseHints - Base exercise hints
   * @param {Array} contextualHints - Generated contextual hints
   * @param {Object} userProfile - User hint profile
   * @param {Object} context - Current context
   * @returns {Object} Personalized hints
   */
  personalizeHints(baseHints, contextualHints, userProfile, context) {
    const { hintStyle, maxLevel, effectivenessScore } = userProfile;

    // Filter base hints by user's max level preference
    const filteredBaseHints = baseHints.filter(hint => hint.level <= maxLevel);

    // Adjust hint content based on user style
    const personalizedBase = filteredBaseHints.map(hint => ({
      ...hint,
      text: this.adjustHintForStyle(hint.text, hintStyle),
      timing: this.calculateOptimalTiming(hint, userProfile, context)
    }));

    // Prioritize contextual hints for users who benefit from them
    const prioritizedContextual = contextualHints.map(hint => ({
      ...hint,
      priority: effectivenessScore > 0.7 ? hint.priority * 1.2 : hint.priority
    }));

    // Generate recommendations based on user pattern
    const recommendations = this.generateUserRecommendations(userProfile, context);

    return {
      base: personalizedBase,
      contextual: prioritizedContextual,
      recommendations,
      timing: this.calculateHintTiming(userProfile, context)
    };
  }

  /**
   * Generate syntax error hints
   * @param {string} error - Error message
   * @param {string} code - Current code
   * @returns {Promise<Object>} Syntax hint
   */
  async generateSyntaxHint(error, code) {
    const syntaxPatterns = {
      'library': {
        pattern: /library.*error/i,
        hint: 'Check your library declaration syntax: library LibraryName version \'1.0.0\'',
        priority: 0.9
      },
      'define': {
        pattern: /define.*error/i,
        hint: 'Define statements need a colon: define "Name": expression',
        priority: 0.8
      },
      'unexpected': {
        pattern: /unexpected.*token/i,
        hint: 'Look for missing quotes, parentheses, or other punctuation',
        priority: 0.7
      }
    };

    for (const [type, config] of Object.entries(syntaxPatterns)) {
      if (config.pattern.test(error)) {
        return {
          type: 'syntax',
          subType: type,
          text: config.hint,
          priority: config.priority,
          code: this.generateFixExample(type, code)
        };
      }
    }

    return {
      type: 'syntax',
      text: 'Check your CQL syntax for missing punctuation or keywords',
      priority: 0.6
    };
  }

  /**
   * Generate performance hints for users taking too long
   * @param {Object} context - Current context
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<Object>} Performance hint
   */
  async generatePerformanceHint(context, exerciseId) {
    const completionEstimate = this.estimateCompletion(context.currentCode, exerciseId);
    
    if (completionEstimate < 0.2) {
      return {
        type: 'performance',
        text: 'Try breaking the problem into smaller steps. Start with the basic structure.',
        priority: 0.8
      };
    }
    
    if (completionEstimate > 0.8) {
      return {
        type: 'performance',
        text: 'You\'re almost there! Review your code for any small syntax issues.',
        priority: 0.7
      };
    }

    return null;
  }

  /**
   * Process analytics buffer
   * @returns {Promise<void>}
   */
  async processAnalytics() {
    if (this.analyticsBuffer.length === 0) return;

    try {
      // Batch insert analytics data
      await prisma.hintAnalytics.createMany({
        data: this.analyticsBuffer.map(item => ({
          userId: item.userId,
          exerciseId: item.exerciseId,
          hintLevel: item.level,
          hintType: item.type,
          effectiveness: item.leadToSolution ? 1 : 0,
          timestamp: new Date(item.timestamp)
        }))
      });

      // Clear buffer
      this.analyticsBuffer = [];

      logger.info(`Processed ${this.analyticsBuffer.length} hint analytics records`);

    } catch (error) {
      logger.error('Failed to process hint analytics:', error);
    }
  }

  // Helper methods

  calculateHintPreferences(hintUsages) {
    if (!hintUsages || hintUsages.length === 0) {
      return { preferredLevel: 2, style: 'balanced' };
    }

    const averageLevel = hintUsages.reduce((sum, usage) => sum + usage.hintLevel, 0) / hintUsages.length;
    const successRate = hintUsages.filter(u => u.leadToSolution).length / hintUsages.length;

    return {
      preferredLevel: Math.round(averageLevel),
      style: successRate > 0.7 ? 'gentle' : successRate > 0.4 ? 'balanced' : 'direct',
      effectiveness: successRate
    };
  }

  calculateEffectivenessScore(hintUsages) {
    if (!hintUsages || hintUsages.length === 0) return 0.5;

    const successful = hintUsages.filter(u => u.leadToSolution).length;
    return successful / hintUsages.length;
  }

  calculateNewAverage(currentAvg, count, newValue) {
    return ((currentAvg * count) + newValue) / (count + 1);
  }

  adjustHintForStyle(text, style) {
    const styles = {
      gentle: (text) => `Consider this: ${text}`,
      balanced: (text) => text,
      direct: (text) => `You need to: ${text}`
    };

    return styles[style] ? styles[style](text) : text;
  }

  calculateOptimalTiming(hint, userProfile, context) {
    const baseTime = hint.level * 30; // 30 seconds per level
    const userMultiplier = userProfile.averageHintLevel / 3; // Adjust based on user preference
    const contextMultiplier = context.timeSpent > 300 ? 0.5 : 1; // Faster hints if struggling

    return Math.round(baseTime * userMultiplier * contextMultiplier);
  }

  generateUserRecommendations(userProfile, context) {
    const recommendations = [];

    if (userProfile.effectivenessScore < 0.3) {
      recommendations.push({
        type: 'learning',
        text: 'Consider starting with easier exercises to build confidence',
        priority: 0.8
      });
    }

    if (userProfile.averageHintLevel > 4) {
      recommendations.push({
        type: 'challenge', 
        text: 'Try solving without hints to test your understanding',
        priority: 0.6
      });
    }

    return recommendations;
  }

  async createDefaultHintProfile(userId) {
    try {
      return await prisma.userHintProfile.create({
        data: {
          userId,
          preferredHintStyle: 'balanced',
          maxHintLevel: 5,
          autoSuggestEnabled: true,
          totalHintsUsed: 0,
          averageHintLevel: 2.5,
          successfulHints: 0
        }
      });
    } catch (error) {
      logger.error('Failed to create default hint profile:', error);
      // Return minimal default profile
      return {
        preferredHintStyle: 'balanced',
        maxHintLevel: 5,
        autoSuggestEnabled: true,
        effectivenessScore: 0.5
      };
    }
  }

  generateFixExample(type, code) {
    const examples = {
      library: 'library HelloWorld version \'1.0.0\'',
      define: 'define "My Expression": 42'
    };

    return examples[type] || null;
  }

  estimateCompletion(code, exerciseId) {
    // Simple completion estimation based on code length and structure
    if (!code) return 0;
    
    const hasLibrary = /library\s+/i.test(code);
    const hasDefine = /define\s+/i.test(code);
    const lines = code.split('\n').filter(line => line.trim()).length;
    
    let completion = 0;
    if (hasLibrary) completion += 0.2;
    if (hasDefine) completion += 0.4;
    completion += Math.min(lines * 0.1, 0.4);
    
    return Math.min(completion, 1.0);
  }

  async generateConceptHints(context, exerciseId) {
    // This would be expanded with specific concept-based hint generation
    return [];
  }

  generateLogicHint(error, code) {
    if (error.includes('null')) {
      return {
        type: 'logic',
        text: 'Check for null values in your expressions. Use null-safe operators or conditionals.',
        priority: 0.7
      };
    }
    
    return null;
  }

  calculateHintTiming(userProfile, context) {
    return {
      autoSuggestDelay: userProfile.autoSuggestEnabled ? 120 : -1, // 2 minutes
      nextHintDelay: 60, // 1 minute between hints
      urgentHintDelay: 30 // 30 seconds for urgent hints
    };
  }
}

export default new HintService();