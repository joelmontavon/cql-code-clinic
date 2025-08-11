import { apiClient } from './apiClient.js';

/**
 * Tutorial API Service
 * Handles all tutorial-related API communications
 */
export class TutorialAPI {
  constructor() {
    this.baseURL = '/api/tutorials';
  }

  /**
   * Get available tutorials
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Available tutorials
   */
  async getTutorials(filters = {}) {
    try {
      const params = new URLSearchParams({
        difficulty: filters.difficulty || '',
        category: filters.category || '',
        type: filters.type || '',
        limit: filters.limit || 50
      });

      const response = await apiClient.get(`${this.baseURL}?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get tutorials:', error);
      throw new Error(error.response?.data?.error || 'Failed to load tutorials');
    }
  }

  /**
   * Get a specific tutorial by ID
   * @param {string} tutorialId - Tutorial ID
   * @returns {Promise<Object>} Tutorial data
   */
  async getTutorial(tutorialId) {
    try {
      const response = await apiClient.get(`${this.baseURL}/${tutorialId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get tutorial:', error);
      throw new Error(error.response?.data?.error || 'Failed to load tutorial');
    }
  }

  /**
   * Get tutorial state for resuming
   * @param {string} tutorialId - Tutorial ID
   * @returns {Promise<Object>} Saved tutorial state
   */
  async getTutorialState(tutorialId) {
    try {
      const response = await apiClient.get(`${this.baseURL}/${tutorialId}/state`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // No saved state
      }
      console.error('Failed to get tutorial state:', error);
      throw new Error('Failed to load tutorial progress');
    }
  }

  /**
   * Save tutorial state
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} state - Tutorial state to save
   * @returns {Promise<void>}
   */
  async saveTutorialState(tutorialId, state) {
    try {
      await apiClient.put(`${this.baseURL}/${tutorialId}/state`, {
        state,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Failed to save tutorial state:', error);
      // Don't throw error to avoid disrupting tutorial flow
    }
  }

  /**
   * Clear tutorial state (reset)
   * @param {string} tutorialId - Tutorial ID
   * @returns {Promise<void>}
   */
  async clearTutorialState(tutorialId) {
    try {
      await apiClient.delete(`${this.baseURL}/${tutorialId}/state`);
    } catch (error) {
      console.warn('Failed to clear tutorial state:', error);
    }
  }

  /**
   * Track tutorial events for analytics
   * @param {Object} eventData - Event data
   * @returns {Promise<void>}
   */
  async trackTutorialEvent(eventData) {
    try {
      await apiClient.post(`${this.baseURL}/events`, {
        ...eventData,
        userAgent: navigator.userAgent,
        timestamp: eventData.timestamp || Date.now()
      });
    } catch (error) {
      console.warn('Failed to track tutorial event:', error);
      // Don't throw to avoid disrupting tutorial flow
    }
  }

  /**
   * Complete a tutorial
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} completionData - Completion data
   * @returns {Promise<Object>} Completion result
   */
  async completeTutorial(tutorialId, completionData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/${tutorialId}/complete`, {
        ...completionData,
        completedAt: Date.now()
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
      throw new Error('Failed to record tutorial completion');
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
  async validateStep(tutorialId, stepIndex, data, validation) {
    try {
      const response = await apiClient.post(`${this.baseURL}/${tutorialId}/validate`, {
        stepIndex,
        data,
        validation
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to validate step:', error);
      return {
        isValid: false,
        errors: ['Validation failed'],
        feedback: 'Unable to validate your answer. Please check your code and try again.'
      };
    }
  }

  /**
   * Get tutorial analytics (for instructors/admins)
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Tutorial analytics
   */
  async getTutorialAnalytics(tutorialId, options = {}) {
    try {
      const params = new URLSearchParams({
        timeRange: options.timeRange || '30d',
        includeSteps: options.includeSteps || false,
        includeDropoff: options.includeDropoff || true
      });

      const response = await apiClient.get(
        `${this.baseURL}/${tutorialId}/analytics?${params}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to get tutorial analytics:', error);
      throw new Error('Failed to load tutorial analytics');
    }
  }

  /**
   * Create a new tutorial (admin only)
   * @param {Object} tutorialData - Tutorial data
   * @returns {Promise<Object>} Created tutorial
   */
  async createTutorial(tutorialData) {
    try {
      const response = await apiClient.post(this.baseURL, tutorialData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create tutorial:', error);
      throw new Error(error.response?.data?.error || 'Failed to create tutorial');
    }
  }

  /**
   * Update a tutorial (admin only)
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} updates - Tutorial updates
   * @returns {Promise<Object>} Updated tutorial
   */
  async updateTutorial(tutorialId, updates) {
    try {
      const response = await apiClient.put(`${this.baseURL}/${tutorialId}`, updates);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update tutorial:', error);
      throw new Error(error.response?.data?.error || 'Failed to update tutorial');
    }
  }

  /**
   * Delete a tutorial (admin only)
   * @param {string} tutorialId - Tutorial ID
   * @returns {Promise<void>}
   */
  async deleteTutorial(tutorialId) {
    try {
      await apiClient.delete(`${this.baseURL}/${tutorialId}`);
    } catch (error) {
      console.error('Failed to delete tutorial:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete tutorial');
    }
  }

  /**
   * Get user's tutorial progress
   * @returns {Promise<Array>} User's tutorial progress
   */
  async getUserTutorialProgress() {
    try {
      const response = await apiClient.get(`${this.baseURL}/progress`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get tutorial progress:', error);
      throw new Error('Failed to load tutorial progress');
    }
  }

  /**
   * Generate tutorial content using AI (admin only)
   * @param {Object} prompt - Content generation prompt
   * @returns {Promise<Object>} Generated content
   */
  async generateTutorialContent(prompt) {
    try {
      const response = await apiClient.post(`${this.baseURL}/generate`, {
        prompt,
        type: 'content_generation'
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate tutorial content:', error);
      throw new Error('Failed to generate tutorial content');
    }
  }

  /**
   * Import tutorial from external source
   * @param {Object} importData - Import configuration
   * @returns {Promise<Object>} Import result
   */
  async importTutorial(importData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/import`, importData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to import tutorial:', error);
      throw new Error(error.response?.data?.error || 'Failed to import tutorial');
    }
  }

  /**
   * Batch operations for multiple tutorials
   * @param {Array} tutorialIds - Array of tutorial IDs
   * @param {string} operation - Operation to perform
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Batch operation results
   */
  async batchTutorialOperation(tutorialIds, operation, options = {}) {
    try {
      const response = await apiClient.post(`${this.baseURL}/batch`, {
        tutorialIds,
        operation,
        options
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to perform batch tutorial operation:', error);
      throw new Error('Failed to perform batch operation');
    }
  }

  /**
   * Get tutorial recommendations for user
   * @param {Object} criteria - Recommendation criteria
   * @returns {Promise<Array>} Recommended tutorials
   */
  async getTutorialRecommendations(criteria = {}) {
    try {
      const response = await apiClient.post(`${this.baseURL}/recommendations`, {
        userLevel: criteria.userLevel,
        completedTutorials: criteria.completedTutorials,
        interests: criteria.interests,
        timeAvailable: criteria.timeAvailable
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get tutorial recommendations:', error);
      return []; // Return empty array rather than error
    }
  }

  /**
   * Search tutorials
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Search results
   */
  async searchTutorials(query, filters = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        difficulty: filters.difficulty || '',
        category: filters.category || '',
        limit: filters.limit || 20
      });

      const response = await apiClient.get(`${this.baseURL}/search?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to search tutorials:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Rate a tutorial
   * @param {string} tutorialId - Tutorial ID
   * @param {number} rating - Rating (1-5)
   * @param {string} feedback - Optional feedback
   * @returns {Promise<void>}
   */
  async rateTutorial(tutorialId, rating, feedback = '') {
    try {
      await apiClient.post(`${this.baseURL}/${tutorialId}/rating`, {
        rating,
        feedback,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to rate tutorial:', error);
      throw new Error('Failed to submit rating');
    }
  }

  /**
   * Report an issue with a tutorial
   * @param {string} tutorialId - Tutorial ID
   * @param {Object} issue - Issue details
   * @returns {Promise<void>}
   */
  async reportTutorialIssue(tutorialId, issue) {
    try {
      await apiClient.post(`${this.baseURL}/${tutorialId}/issues`, {
        ...issue,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to report tutorial issue:', error);
      throw new Error('Failed to report issue');
    }
  }

  /**
   * Get tutorial statistics summary
   * @returns {Promise<Object>} Tutorial statistics
   */
  async getTutorialStats() {
    try {
      const response = await apiClient.get(`${this.baseURL}/stats`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get tutorial stats:', error);
      return {
        totalTutorials: 0,
        totalCompletions: 0,
        averageRating: 0,
        popularCategories: []
      };
    }
  }
}

// Create singleton instance
export const tutorialAPI = new TutorialAPI();
export default tutorialAPI;