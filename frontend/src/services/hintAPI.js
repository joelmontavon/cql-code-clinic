import { apiClient } from './apiClient.js';

/**
 * Hint API Service
 * Handles all hint-related API communications
 */
export class HintAPI {
  constructor() {
    this.baseURL = '/api/hints';
  }

  /**
   * Get personalized hints for an exercise
   * @param {string} exerciseId - Exercise ID
   * @param {Object} context - Current context (code, error, time)
   * @returns {Promise<Object>} Personalized hints
   */
  async getPersonalizedHints(exerciseId, context) {
    try {
      const response = await apiClient.post(`${this.baseURL}/get`, {
        exerciseId,
        currentCode: context.currentCode,
        lastError: context.lastError,
        timeSpent: context.timeSpent,
        contextData: {
          completionEstimate: context.completionEstimate,
          syntaxIssues: context.syntaxIssues,
          conceptsDetected: context.conceptsDetected
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('Failed to get personalized hints:', error);
      throw new Error(error.response?.data?.error || 'Failed to get hints');
    }
  }

  /**
   * Track hint usage for analytics and personalization
   * @param {string} exerciseId - Exercise ID
   * @param {Object} hintData - Hint usage data
   * @returns {Promise<void>}
   */
  async trackHintUsage(exerciseId, hintData) {
    try {
      await apiClient.post(`${this.baseURL}/track-usage`, {
        exerciseId,
        hintData
      });
    } catch (error) {
      console.warn('Failed to track hint usage:', error);
      // Don't throw error to avoid blocking UI
    }
  }

  /**
   * Get user's hint profile and preferences
   * @returns {Promise<Object>} User hint profile
   */
  async getUserProfile() {
    try {
      const response = await apiClient.get(`${this.baseURL}/profile`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get hint profile:', error);
      throw new Error(error.response?.data?.error || 'Failed to get profile');
    }
  }

  /**
   * Update user hint preferences
   * @param {Object} preferences - New preferences
   * @returns {Promise<void>}
   */
  async updatePreferences(preferences) {
    try {
      await apiClient.put(`${this.baseURL}/preferences`, preferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw new Error(error.response?.data?.error || 'Failed to update preferences');
    }
  }

  /**
   * Get hint analytics for an exercise (admin/instructor only)
   * @param {string} exerciseId - Exercise ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Hint analytics
   */
  async getExerciseAnalytics(exerciseId, options = {}) {
    try {
      const params = new URLSearchParams({
        timeRange: options.timeRange || '30d',
        groupBy: options.groupBy || 'day'
      });

      const response = await apiClient.get(`${this.baseURL}/analytics/${exerciseId}?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get hint analytics:', error);
      throw new Error(error.response?.data?.error || 'Failed to get analytics');
    }
  }

  /**
   * Create contextual hint for an exercise (admin only)
   * @param {Object} hintData - Contextual hint data
   * @returns {Promise<Object>} Created contextual hint
   */
  async createContextualHint(hintData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/contextual`, hintData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create contextual hint:', error);
      throw new Error(error.response?.data?.error || 'Failed to create hint');
    }
  }

  /**
   * Get hint effectiveness report (admin only)
   * @returns {Promise<Object>} Effectiveness report
   */
  async getEffectivenessReport() {
    try {
      const response = await apiClient.get(`${this.baseURL}/effectiveness-report`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get effectiveness report:', error);
      throw new Error(error.response?.data?.error || 'Failed to get report');
    }
  }

  /**
   * Batch get hints for multiple exercises (for prefetching)
   * @param {Array} exerciseIds - Array of exercise IDs
   * @param {Object} context - Current context
   * @returns {Promise<Object>} Hints by exercise ID
   */
  async batchGetHints(exerciseIds, context) {
    try {
      const promises = exerciseIds.map(id => 
        this.getPersonalizedHints(id, context).catch(error => {
          console.warn(`Failed to get hints for exercise ${id}:`, error);
          return null; // Return null for failed requests
        })
      );

      const results = await Promise.all(promises);
      
      // Create map of exerciseId -> hints
      const hintsMap = {};
      exerciseIds.forEach((id, index) => {
        if (results[index]) {
          hintsMap[id] = results[index];
        }
      });

      return hintsMap;
    } catch (error) {
      console.error('Failed to batch get hints:', error);
      return {};
    }
  }

  /**
   * Report hint effectiveness after exercise completion
   * @param {string} exerciseId - Exercise ID
   * @param {Array} usageLog - Array of hint usage data
   * @param {boolean} exerciseCompleted - Whether exercise was completed
   * @returns {Promise<void>}
   */
  async reportHintEffectiveness(exerciseId, usageLog, exerciseCompleted) {
    try {
      // Mark successful hints based on exercise completion
      const effectivenessData = usageLog.map(usage => ({
        ...usage,
        leadToSolution: exerciseCompleted,
        wasHelpful: exerciseCompleted || usage.contextRelevance > 0.7
      }));

      // Track each hint with effectiveness data
      const promises = effectivenessData.map(data =>
        this.trackHintUsage(exerciseId, data)
      );

      await Promise.all(promises);
    } catch (error) {
      console.warn('Failed to report hint effectiveness:', error);
      // Don't throw error to avoid blocking UI
    }
  }

  /**
   * Get hint suggestions for current code context
   * @param {string} code - Current code
   * @param {string} error - Current error (if any)
   * @param {Array} exerciseConcepts - Exercise concepts
   * @returns {Array} Contextual hint suggestions
   */
  generateContextualSuggestions(code, error, exerciseConcepts) {
    const suggestions = [];

    // Syntax-based suggestions
    if (error.includes('syntax')) {
      if (!code.includes('library')) {
        suggestions.push({
          type: 'syntax',
          text: 'CQL files should start with a library declaration',
          priority: 0.9,
          example: 'library MyLibrary version \'1.0.0\''
        });
      }

      if (error.includes('define') && !code.includes('define')) {
        suggestions.push({
          type: 'syntax',
          text: 'Use define statements to create expressions',
          priority: 0.8,
          example: 'define "Expression Name": your_expression_here'
        });
      }
    }

    // Concept-based suggestions
    if (exerciseConcepts?.includes('clinical-data') && !code.includes('using')) {
      suggestions.push({
        type: 'concept',
        text: 'Clinical data exercises usually need a using statement',
        priority: 0.7,
        example: 'using FHIR version \'4.0.1\''
      });
    }

    if (exerciseConcepts?.includes('filtering') && !code.includes('where')) {
      suggestions.push({
        type: 'concept',
        text: 'Filtering in CQL is done with the where keyword',
        priority: 0.6,
        example: '[Resource] R where R.condition'
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if user should see hint suggestion
   * @param {Object} context - Current context
   * @param {Object} userProfile - User hint profile
   * @returns {boolean} Whether to suggest hints
   */
  shouldSuggestHints(context, userProfile) {
    if (!userProfile?.autoSuggestEnabled) return false;

    const { timeSpent = 0, lastError = '', currentCode = '' } = context;
    const userAvgLevel = userProfile.averageHintLevel || 2.5;

    // Adjust thresholds based on user's typical hint usage
    const timeThreshold = userAvgLevel < 2 ? 600 : userAvgLevel > 4 ? 180 : 300; // seconds
    
    // Suggest if struggling
    if (timeSpent > timeThreshold) return true;
    
    // Suggest if there are errors
    if (lastError.length > 0) return true;
    
    // Suggest if little progress after reasonable time
    if (timeSpent > 120 && currentCode.trim().length < 30) return true;
    
    return false;
  }

  /**
   * Get optimal hint timing based on user profile
   * @param {Object} userProfile - User hint profile
   * @param {Object} context - Current context
   * @returns {Object} Timing configuration
   */
  getOptimalTiming(userProfile, context) {
    const baseTimings = {
      autoSuggestDelay: 300, // 5 minutes
      nextHintDelay: 60,     // 1 minute
      urgentHintDelay: 30    // 30 seconds
    };

    if (!userProfile) return baseTimings;

    // Adjust based on user's hint effectiveness
    const effectivenessMultiplier = userProfile.effectivenessScore > 0.7 ? 1.2 : 0.8;
    
    // Adjust based on user's average hint level (higher level = needs more time)
    const levelMultiplier = (userProfile.averageHintLevel || 2.5) / 2.5;

    return {
      autoSuggestDelay: Math.round(baseTimings.autoSuggestDelay * effectivenessMultiplier),
      nextHintDelay: Math.round(baseTimings.nextHintDelay * levelMultiplier),
      urgentHintDelay: baseTimings.urgentHintDelay
    };
  }
}

// Create singleton instance
export const hintAPI = new HintAPI();
export default hintAPI;