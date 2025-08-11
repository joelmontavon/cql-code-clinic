/**
 * Exercise Service
 * Handles exercise loading, caching, search, and management
 */

import axios from 'axios';
import { validateExerciseData, performQualityChecks } from '../../../shared/utils/exercise-validator.js';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const exerciseCache = new Map();
const searchCache = new Map();

/**
 * Exercise Service Class
 * Provides comprehensive exercise management capabilities
 */
class ExerciseService {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.axios = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add request/response interceptors
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // Request interceptor
    this.axios.interceptors.request.use(
      config => {
        console.log(`Exercise API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('Exercise API Request Error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.axios.interceptors.response.use(
      response => {
        console.log(`Exercise API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        console.error('Exercise API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Loads all exercises with caching
   * @returns {Promise<Array>} Array of exercises
   */
  async loadExercises() {
    const cacheKey = 'all-exercises';
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      console.log('Returning cached exercises:', cached.length);
      return cached;
    }
    
    try {
      // For now, use local migrated exercises
      // TODO: Replace with actual API call when backend is ready
      const { createTestMigration } = await import('../utils/exercise-migration-demo.js');
      const exercises = createTestMigration();
      
      // Validate exercises
      const validExercises = exercises.filter(exercise => {
        const validation = validateExerciseData(exercise);
        if (!validation.success) {
          console.warn(`Invalid exercise ${exercise.id}:`, validation.errors);
          return false;
        }
        return true;
      });
      
      // Cache valid exercises
      this.setCache(cacheKey, validExercises);
      console.log(`Loaded ${validExercises.length} valid exercises`);
      
      return validExercises;
    } catch (error) {
      console.error('Failed to load exercises:', error);
      throw new Error('Failed to load exercises: ' + error.message);
    }
  }
  
  /**
   * Loads a single exercise by ID
   * @param {string} exerciseId - Exercise ID
   * @returns {Promise<Object>} Exercise object
   */
  async loadExercise(exerciseId) {
    const cacheKey = `exercise-${exerciseId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Load from all exercises
    const exercises = await this.loadExercises();
    const exercise = exercises.find(ex => ex.id === exerciseId);
    
    if (!exercise) {
      throw new Error(`Exercise not found: ${exerciseId}`);
    }
    
    // Cache individual exercise
    this.setCache(cacheKey, exercise);
    return exercise;
  }
  
  /**
   * Searches exercises based on criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching exercises
   */
  async searchExercises(criteria = {}) {
    const cacheKey = JSON.stringify(criteria);
    const cached = this.getFromCache(cacheKey, searchCache);
    
    if (cached) {
      return cached;
    }
    
    const exercises = await this.loadExercises();
    let results = [...exercises];
    
    // Apply filters
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      results = results.filter(exercise => 
        exercise.title.toLowerCase().includes(query) ||
        exercise.description.toLowerCase().includes(query) ||
        exercise.content.instructions.toLowerCase().includes(query) ||
        exercise.concepts.some(concept => concept.toLowerCase().includes(query)) ||
        exercise.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (criteria.difficulty) {
      results = results.filter(exercise => exercise.difficulty === criteria.difficulty);
    }
    
    if (criteria.type) {
      results = results.filter(exercise => exercise.type === criteria.type);
    }
    
    if (criteria.concepts && criteria.concepts.length > 0) {
      results = results.filter(exercise =>
        criteria.concepts.some(concept => exercise.concepts.includes(concept))
      );
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(exercise =>
        criteria.tags.some(tag => exercise.tags.includes(tag))
      );
    }
    
    if (criteria.estimatedTimeMin !== undefined) {
      results = results.filter(exercise => exercise.estimatedTime >= criteria.estimatedTimeMin);
    }
    
    if (criteria.estimatedTimeMax !== undefined) {
      results = results.filter(exercise => exercise.estimatedTime <= criteria.estimatedTimeMax);
    }
    
    // Apply sorting
    if (criteria.sortBy) {
      results = this.sortExercises(results, criteria.sortBy, criteria.sortOrder);
    }
    
    // Apply pagination
    if (criteria.limit || criteria.offset) {
      const start = criteria.offset || 0;
      const end = start + (criteria.limit || results.length);
      results = results.slice(start, end);
    }
    
    // Cache results
    this.setCache(cacheKey, results, searchCache);
    
    return results;
  }
  
  /**
   * Sorts exercises by specified criteria
   * @param {Array} exercises - Exercises to sort
   * @param {string} sortBy - Sort field
   * @param {string} sortOrder - 'asc' or 'desc'
   * @returns {Array} Sorted exercises
   */
  sortExercises(exercises, sortBy, sortOrder = 'asc') {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    
    return exercises.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
          aVal = difficultyOrder[a.difficulty] || 0;
          bVal = difficultyOrder[b.difficulty] || 0;
          break;
        case 'estimatedTime':
          aVal = a.estimatedTime || 0;
          bVal = b.estimatedTime || 0;
          break;
        case 'created':
          aVal = new Date(a.metadata?.created || 0);
          bVal = new Date(b.metadata?.created || 0);
          break;
        case 'modified':
          aVal = new Date(a.metadata?.modified || 0);
          bVal = new Date(b.metadata?.modified || 0);
          break;
        case 'quality':
          aVal = a.metadata?.qualityScore || 0;
          bVal = b.metadata?.qualityScore || 0;
          break;
        default:
          aVal = a[sortBy];
          bVal = b[sortBy];
      }
      
      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });
  }
  
  /**
   * Gets exercise recommendations based on user progress
   * @param {Object} userProgress - User's progress data
   * @param {Object} options - Recommendation options
   * @returns {Promise<Array>} Recommended exercises
   */
  async getRecommendations(userProgress, options = {}) {
    const exercises = await this.loadExercises();
    const recommendations = [];
    
    // Get completed exercise IDs
    const completedIds = new Set(Object.keys(userProgress.exerciseProgress || {})
      .filter(id => userProgress.exerciseProgress[id].completed));
    
    // Find next exercises based on prerequisites
    const availableExercises = exercises.filter(exercise => {
      // Skip completed exercises unless reviewing
      if (completedIds.has(exercise.id) && !options.includeCompleted) {
        return false;
      }
      
      // Check prerequisites
      if (exercise.prerequisites && exercise.prerequisites.length > 0) {
        const prerequisitesMet = exercise.prerequisites.every(prereqId => 
          completedIds.has(prereqId)
        );
        if (!prerequisitesMet) {
          return false;
        }
      }
      
      return true;
    });
    
    // Score exercises for recommendation
    for (const exercise of availableExercises) {
      let score = 0;
      
      // Difficulty progression
      const userLevel = this.estimateUserLevel(userProgress);
      const difficultyMatch = this.getDifficultyMatch(exercise.difficulty, userLevel);
      score += difficultyMatch * 40;
      
      // Concept reinforcement
      const conceptScore = this.getConceptReinforcementScore(exercise, userProgress);
      score += conceptScore * 30;
      
      // Recency and engagement
      const engagementScore = this.getEngagementScore(exercise, userProgress);
      score += engagementScore * 20;
      
      // Quality score
      const qualityScore = (exercise.metadata?.qualityScore || 70) / 100;
      score += qualityScore * 10;
      
      recommendations.push({
        exercise,
        score,
        reason: this.getRecommendationReason(exercise, userProgress, difficultyMatch, conceptScore)
      });
    }
    
    // Sort by score and return top recommendations
    recommendations.sort((a, b) => b.score - a.score);
    
    const limit = options.limit || 5;
    return recommendations.slice(0, limit);
  }
  
  /**
   * Gets analytics for exercises
   * @returns {Promise<Object>} Exercise analytics
   */
  async getExerciseAnalytics() {
    const exercises = await this.loadExercises();
    
    const analytics = {
      total: exercises.length,
      byDifficulty: {},
      byType: {},
      byConcept: {},
      qualityDistribution: { high: 0, medium: 0, low: 0 },
      averageEstimatedTime: 0,
      totalConcepts: new Set(),
      recentlyAdded: 0
    };
    
    let totalTime = 0;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    exercises.forEach(exercise => {
      // By difficulty
      analytics.byDifficulty[exercise.difficulty] = (analytics.byDifficulty[exercise.difficulty] || 0) + 1;
      
      // By type
      analytics.byType[exercise.type] = (analytics.byType[exercise.type] || 0) + 1;
      
      // By concept
      exercise.concepts.forEach(concept => {
        analytics.byConcept[concept] = (analytics.byConcept[concept] || 0) + 1;
        analytics.totalConcepts.add(concept);
      });
      
      // Quality distribution
      const quality = exercise.metadata?.qualityScore || 70;
      if (quality >= 85) analytics.qualityDistribution.high++;
      else if (quality >= 70) analytics.qualityDistribution.medium++;
      else analytics.qualityDistribution.low++;
      
      // Time estimation
      totalTime += exercise.estimatedTime || 15;
      
      // Recently added
      if (exercise.metadata?.created && new Date(exercise.metadata.created).getTime() > oneWeekAgo) {
        analytics.recentlyAdded++;
      }
    });
    
    analytics.averageEstimatedTime = Math.round(totalTime / exercises.length);
    analytics.totalConcepts = analytics.totalConcepts.size;
    
    return analytics;
  }
  
  /**
   * Validates exercise prerequisites and dependencies
   * @param {Array} exercises - Exercises to validate
   * @returns {Object} Validation results
   */
  validateExerciseDependencies(exercises) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      dependencyGraph: {}
    };
    
    const exerciseIds = new Set(exercises.map(ex => ex.id));
    
    exercises.forEach(exercise => {
      const deps = [];
      
      // Check prerequisites
      if (exercise.prerequisites) {
        exercise.prerequisites.forEach(prereqId => {
          if (!exerciseIds.has(prereqId)) {
            results.errors.push(`Exercise ${exercise.id} references missing prerequisite: ${prereqId}`);
            results.valid = false;
          }
          deps.push(prereqId);
        });
      }
      
      results.dependencyGraph[exercise.id] = deps;
    });
    
    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(results.dependencyGraph);
    if (circularDeps.length > 0) {
      results.errors.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
      results.valid = false;
    }
    
    return results;
  }
  
  // Utility methods
  
  getFromCache(key, cache = exerciseCache) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }
  
  setCache(key, data, cache = exerciseCache) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clearCache() {
    exerciseCache.clear();
    searchCache.clear();
  }
  
  estimateUserLevel(userProgress) {
    const completed = Object.keys(userProgress.exerciseProgress || {})
      .filter(id => userProgress.exerciseProgress[id].completed);
    
    if (completed.length === 0) return 'beginner';
    if (completed.length < 5) return 'beginner';
    if (completed.length < 15) return 'intermediate';
    return 'advanced';
  }
  
  getDifficultyMatch(exerciseDifficulty, userLevel) {
    const difficultyLevels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const exerciseLevel = difficultyLevels[exerciseDifficulty] || 1;
    const currentLevel = difficultyLevels[userLevel] || 1;
    
    const diff = Math.abs(exerciseLevel - currentLevel);
    if (diff === 0) return 1.0; // Perfect match
    if (diff === 1) return 0.7; // Close match
    if (diff === 2) return 0.4; // Moderate match
    return 0.1; // Poor match
  }
  
  getConceptReinforcementScore(exercise, userProgress) {
    // Score based on how much the exercise reinforces concepts the user has struggled with
    const strugglingConcepts = this.getStrugglingConcepts(userProgress);
    const overlap = exercise.concepts.filter(concept => strugglingConcepts.includes(concept));
    return overlap.length / Math.max(exercise.concepts.length, 1);
  }
  
  getEngagementScore(exercise, userProgress) {
    // Score based on user's engagement patterns
    // TODO: Implement based on actual user behavior
    return 0.5; // Neutral score for now
  }
  
  getRecommendationReason(exercise, userProgress, difficultyMatch, conceptScore) {
    if (difficultyMatch >= 0.8) {
      return `Perfect difficulty match for your current level`;
    }
    if (conceptScore >= 0.6) {
      return `Reinforces concepts you're learning: ${exercise.concepts.slice(0, 2).join(', ')}`;
    }
    if (exercise.type === 'challenge') {
      return `Challenge exercise to test your skills`;
    }
    return `Next step in your CQL learning journey`;
  }
  
  getStrugglingConcepts(userProgress) {
    // Analyze user progress to identify concepts they're struggling with
    // TODO: Implement based on actual progress data
    return [];
  }
  
  detectCircularDependencies(dependencyGraph) {
    const visiting = new Set();
    const visited = new Set();
    const cycles = [];
    
    function dfs(node, path) {
      if (visiting.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).join(' -> ') + ` -> ${node}`);
        return;
      }
      
      if (visited.has(node)) return;
      
      visiting.add(node);
      const deps = dependencyGraph[node] || [];
      
      for (const dep of deps) {
        dfs(dep, [...path, node]);
      }
      
      visiting.delete(node);
      visited.add(node);
    }
    
    for (const node of Object.keys(dependencyGraph)) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
    
    return cycles;
  }
}

// Create singleton instance
const exerciseService = new ExerciseService();

// Export service instance and class
export { exerciseService as default, ExerciseService };