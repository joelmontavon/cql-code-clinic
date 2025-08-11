/**
 * Exercise Importer and Manager
 * Integrates CQF exercises with the existing exercise system
 */

import { CQF_EXERCISES, EXERCISE_MODULES } from '../data/cqf-exercises.js';

/**
 * Exercise Importer Service
 * Handles importing and managing CQF exercises
 */
export class ExerciseImporter {
  constructor() {
    this.exercises = new Map();
    this.modules = new Map();
    this.loadExercises();
  }

  /**
   * Load all exercises into memory
   */
  loadExercises() {
    // Load individual exercises
    CQF_EXERCISES.forEach(exercise => {
      this.exercises.set(exercise.id, this.enhanceExercise(exercise));
    });

    // Load modules
    EXERCISE_MODULES.forEach(module => {
      this.modules.set(module.id, module);
    });

    console.log(`Loaded ${this.exercises.size} CQF exercises across ${this.modules.size} modules`);
  }

  /**
   * Enhance exercise with additional metadata and validation
   */
  enhanceExercise(exercise) {
    return {
      ...exercise,
      // Add exercise navigation
      navigation: this.getExerciseNavigation(exercise.id),
      
      // Enhance validation rules
      validation: {
        ...exercise.validation,
        customValidators: this.createCustomValidators(exercise)
      },
      
      // Add progress tracking
      progress: {
        started: false,
        completed: false,
        attempts: 0,
        bestScore: 0,
        timeSpent: 0
      },
      
      // Add metadata
      metadata: {
        source: 'CQF Exercises',
        lastUpdated: new Date().toISOString(),
        version: exercise.version || '1.0.0'
      }
    };
  }

  /**
   * Get exercise navigation (previous/next)
   */
  getExerciseNavigation(exerciseId) {
    const exerciseList = Array.from(this.exercises.keys());
    const currentIndex = exerciseList.indexOf(exerciseId);
    
    return {
      hasPrevious: currentIndex > 0,
      hasNext: currentIndex < exerciseList.length - 1,
      previousId: currentIndex > 0 ? exerciseList[currentIndex - 1] : null,
      nextId: currentIndex < exerciseList.length - 1 ? exerciseList[currentIndex + 1] : null,
      currentIndex: currentIndex + 1,
      totalCount: exerciseList.length
    };
  }

  /**
   * Create custom validators for exercise
   */
  createCustomValidators(exercise) {
    const validators = [];

    // Check for required elements
    if (exercise.validation?.requiredElements) {
      validators.push({
        name: 'Required Elements',
        validate: (code) => {
          const missing = exercise.validation.requiredElements.filter(element => 
            !code.includes(element)
          );
          return {
            isValid: missing.length === 0,
            message: missing.length > 0 
              ? `Missing required elements: ${missing.join(', ')}` 
              : 'All required elements present'
          };
        }
      });
    }

    // Syntax validation
    if (exercise.validation?.checkSyntax) {
      validators.push({
        name: 'Syntax Check',
        validate: (code) => {
          const hasBasicSyntax = code.includes('library') && 
                               code.includes('define') &&
                               !code.includes('TODO');
          return {
            isValid: hasBasicSyntax,
            message: hasBasicSyntax ? 'Syntax looks good' : 'Please complete all TODO items and ensure proper CQL syntax'
          };
        }
      });
    }

    // Custom test validators
    if (exercise.validation?.customTests) {
      exercise.validation.customTests.forEach((test, index) => {
        validators.push({
          name: test.description || `Custom Test ${index + 1}`,
          validate: (code) => {
            try {
              const result = test.test(code);
              return {
                isValid: result,
                message: result ? test.description : `Failed: ${test.description}`
              };
            } catch (error) {
              return {
                isValid: false,
                message: `Test error: ${error.message}`
              };
            }
          }
        });
      });
    }

    return validators;
  }

  /**
   * Get all exercises
   */
  getAllExercises() {
    return Array.from(this.exercises.values());
  }

  /**
   * Get exercise by ID
   */
  getExerciseById(id) {
    return this.exercises.get(id);
  }

  /**
   * Get exercises by module
   */
  getExercisesByModule(moduleId) {
    const module = this.modules.get(moduleId);
    if (!module) return [];
    
    return module.exercises.map(exerciseId => this.exercises.get(exerciseId)).filter(Boolean);
  }

  /**
   * Get all modules
   */
  getAllModules() {
    return Array.from(this.modules.values());
  }

  /**
   * Get exercise statistics
   */
  getExerciseStats() {
    const exercises = this.getAllExercises();
    
    return {
      total: exercises.length,
      byDifficulty: {
        beginner: exercises.filter(e => e.difficulty === 'beginner').length,
        intermediate: exercises.filter(e => e.difficulty === 'intermediate').length,
        advanced: exercises.filter(e => e.difficulty === 'advanced').length
      },
      byModule: this.getAllModules().map(module => ({
        id: module.id,
        title: module.title,
        count: module.exercises.length
      })),
      totalEstimatedTime: exercises.reduce((total, ex) => total + ex.estimatedTime, 0)
    };
  }

  /**
   * Search exercises
   */
  searchExercises(query) {
    const searchTerm = query.toLowerCase();
    return this.getAllExercises().filter(exercise => 
      exercise.title.toLowerCase().includes(searchTerm) ||
      exercise.description.toLowerCase().includes(searchTerm) ||
      exercise.learningObjectives.some(obj => obj.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get recommended next exercise based on progress
   */
  getRecommendedNext(currentExerciseId, userProgress = {}) {
    const current = this.getExerciseById(currentExerciseId);
    if (!current) return null;

    // Get next exercise in sequence
    const navigation = current.navigation;
    if (navigation.hasNext) {
      const nextExercise = this.getExerciseById(navigation.nextId);
      
      // Check if user has completed prerequisites
      const hasPrerequisites = nextExercise.prerequisites.every(prereqId => 
        userProgress[prereqId]?.completed === true
      );
      
      if (hasPrerequisites) {
        return nextExercise;
      }
    }

    // Find alternative exercises at same level
    return this.getAllExercises().find(ex => 
      ex.difficulty === current.difficulty &&
      ex.id !== current.id &&
      ex.prerequisites.every(prereqId => userProgress[prereqId]?.completed === true)
    );
  }

  /**
   * Validate exercise solution
   */
  async validateSolution(exerciseId, userCode) {
    const exercise = this.getExerciseById(exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    const results = {
      isValid: false,
      score: 0,
      message: '',
      validationResults: [],
      hints: []
    };

    // Run custom validators
    const validators = exercise.validation.customValidators || [];
    let passedCount = 0;

    for (const validator of validators) {
      const result = validator.validate(userCode);
      results.validationResults.push({
        name: validator.name,
        ...result
      });
      
      if (result.isValid) passedCount++;
    }

    // Calculate score
    results.score = validators.length > 0 ? Math.round((passedCount / validators.length) * 100) : 0;
    results.isValid = passedCount === validators.length;

    // Generate message
    if (results.isValid) {
      results.message = `Excellent! You've completed all requirements. Score: ${results.score}%`;
    } else {
      const failedTests = results.validationResults.filter(r => !r.isValid);
      results.message = `${failedTests.length} validation(s) failed. Keep working!`;
    }

    // Add relevant hints
    results.hints = this.getRelevantHints(exercise, userCode);

    return results;
  }

  /**
   * Get relevant hints based on user code
   */
  getRelevantHints(exercise, userCode) {
    if (!exercise.hints) return [];

    return exercise.hints.filter(hint => 
      userCode.toLowerCase().includes(hint.trigger.toLowerCase())
    );
  }
}

// Create singleton instance
export const exerciseImporter = new ExerciseImporter();

// Export utility functions
export const getExercise = (id) => exerciseImporter.getExerciseById(id);
export const getAllExercises = () => exerciseImporter.getAllExercises();
export const getExercisesByModule = (moduleId) => exerciseImporter.getExercisesByModule(moduleId);
export const searchExercises = (query) => exerciseImporter.searchExercises(query);
export const validateExercise = (id, code) => exerciseImporter.validateSolution(id, code);

export default exerciseImporter;