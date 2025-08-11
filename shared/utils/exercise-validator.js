/**
 * Exercise Validator
 * Validates exercise data against the exercise schema
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load schema from JSON file
const exerciseSchema = JSON.parse(
  readFileSync(join(__dirname, '../schemas/exercise-schema.json'), 'utf8')
);

// Create AJV instance with formats support
const ajv = new Ajv({ 
  allErrors: true,
  verbose: true,
  strict: false
});
addFormats(ajv);

// Compile schema
const validateExercise = ajv.compile(exerciseSchema);

/**
 * Validates an exercise object against the schema
 * @param {object} exercise - Exercise object to validate
 * @returns {object} - Validation result with success flag and errors
 */
export function validateExerciseData(exercise) {
  const valid = validateExercise(exercise);
  
  if (valid) {
    return {
      success: true,
      errors: [],
      warnings: []
    };
  }

  const errors = validateExercise.errors.map(error => ({
    path: error.instancePath || error.schemaPath,
    message: error.message,
    data: error.data,
    allowedValues: error.params?.allowedValues,
    severity: 'error'
  }));

  return {
    success: false,
    errors,
    warnings: []
  };
}

/**
 * Performs additional quality checks beyond schema validation
 * @param {object} exercise - Exercise object to check
 * @returns {object} - Quality assessment with warnings and suggestions
 */
export function performQualityChecks(exercise) {
  const warnings = [];
  const suggestions = [];
  let qualityScore = 100;

  // Check content quality
  if (exercise.content?.instructions) {
    const instructions = exercise.content.instructions;
    
    // Check instruction length
    if (instructions.length < 100) {
      warnings.push('Instructions are very short - consider adding more detail');
      qualityScore -= 10;
    }
    
    // Check for code examples
    if (!instructions.includes('```') && !instructions.includes('<pre>')) {
      suggestions.push('Consider adding code examples to the instructions');
      qualityScore -= 5;
    }
    
    // Check for images or diagrams
    if (!instructions.includes('![') && !instructions.includes('<img')) {
      suggestions.push('Consider adding diagrams or images to enhance learning');
      qualityScore -= 3;
    }
  }

  // Check hints quality
  if (exercise.content?.hints) {
    if (exercise.content.hints.length === 0) {
      suggestions.push('Consider adding progressive hints to help struggling learners');
      qualityScore -= 10;
    } else if (exercise.content.hints.length < 3) {
      suggestions.push('Consider adding more hint levels for better progressive disclosure');
      qualityScore -= 5;
    }
  }

  // Check validation robustness
  if (exercise.validation) {
    if (!exercise.validation.testCases && !exercise.validation.patterns && !exercise.validation.customValidator) {
      warnings.push('Exercise has weak validation - consider adding test cases or patterns');
      qualityScore -= 15;
    }
    
    if (exercise.validation.strategy === 'exact-match') {
      suggestions.push('Consider using pattern-match or semantic-match for more flexible validation');
      qualityScore -= 5;
    }
  }

  // Check file structure
  if (exercise.files) {
    const cqlFiles = exercise.files.filter(f => f.name.endsWith('.cql'));
    if (cqlFiles.length === 0) {
      warnings.push('Exercise has no CQL files - this may not be appropriate for CQL learning');
      qualityScore -= 20;
    }
    
    // Check for solution files
    const hasSolutions = exercise.files.some(f => f.solution);
    if (!hasSolutions) {
      suggestions.push('Consider providing reference solutions for comparison and validation');
      qualityScore -= 8;
    }
  }

  // Check prerequisites and progression
  if (exercise.difficulty === 'intermediate' || exercise.difficulty === 'advanced') {
    if (!exercise.prerequisites || exercise.prerequisites.length === 0) {
      suggestions.push('Consider adding prerequisites for intermediate/advanced exercises');
      qualityScore -= 5;
    }
  }

  // Check concept coverage
  if (exercise.concepts && exercise.concepts.length === 1) {
    suggestions.push('Consider whether this exercise teaches additional concepts');
    qualityScore -= 3;
  }

  // Check feedback quality
  if (exercise.feedback?.commonErrors && exercise.feedback.commonErrors.length === 0) {
    suggestions.push('Consider adding common error patterns and explanations');
    qualityScore -= 10;
  }

  return {
    qualityScore: Math.max(0, qualityScore),
    warnings,
    suggestions,
    recommendations: generateRecommendations(exercise, qualityScore)
  };
}

/**
 * Generates improvement recommendations based on exercise analysis
 * @param {object} exercise - Exercise object
 * @param {number} qualityScore - Current quality score
 * @returns {Array} - Array of recommendation objects
 */
function generateRecommendations(exercise, qualityScore) {
  const recommendations = [];

  if (qualityScore < 70) {
    recommendations.push({
      priority: 'high',
      type: 'quality',
      message: 'This exercise needs significant improvement before publication',
      actions: [
        'Review and expand instructions',
        'Add comprehensive validation',
        'Include progressive hints',
        'Test with actual learners'
      ]
    });
  } else if (qualityScore < 85) {
    recommendations.push({
      priority: 'medium',
      type: 'enhancement',
      message: 'This exercise is good but could be enhanced',
      actions: [
        'Add more detailed feedback',
        'Consider additional test cases',
        'Enhance visual presentation'
      ]
    });
  }

  // Difficulty-specific recommendations
  if (exercise.difficulty === 'beginner') {
    recommendations.push({
      priority: 'medium',
      type: 'pedagogy',
      message: 'For beginner exercises, ensure extra support',
      actions: [
        'Provide detailed step-by-step instructions',
        'Include plenty of examples',
        'Add extensive hints and explanations',
        'Test with complete beginners'
      ]
    });
  }

  return recommendations;
}

/**
 * Validates multiple exercises and provides batch results
 * @param {Array} exercises - Array of exercise objects
 * @returns {object} - Batch validation results
 */
export function validateExerciseBatch(exercises) {
  const results = exercises.map((exercise, index) => {
    const validation = validateExerciseData(exercise);
    const quality = performQualityChecks(exercise);
    
    return {
      index,
      id: exercise.id || `exercise-${index}`,
      validation,
      quality,
      valid: validation.success,
      qualityScore: quality.qualityScore
    };
  });

  const summary = {
    total: exercises.length,
    valid: results.filter(r => r.valid).length,
    invalid: results.filter(r => !r.valid).length,
    averageQuality: results.reduce((sum, r) => sum + r.qualityScore, 0) / exercises.length,
    highQuality: results.filter(r => r.qualityScore >= 85).length,
    needsImprovement: results.filter(r => r.qualityScore < 70).length
  };

  return {
    results,
    summary,
    recommendations: generateBatchRecommendations(summary)
  };
}

/**
 * Generates recommendations for a batch of exercises
 * @param {object} summary - Batch validation summary
 * @returns {Array} - Batch recommendations
 */
function generateBatchRecommendations(summary) {
  const recommendations = [];

  if (summary.invalid > 0) {
    recommendations.push({
      priority: 'critical',
      type: 'validation',
      message: `${summary.invalid} exercises have schema validation errors`,
      action: 'Fix validation errors before proceeding'
    });
  }

  if (summary.needsImprovement > summary.total * 0.3) {
    recommendations.push({
      priority: 'high',
      type: 'quality',
      message: 'Many exercises need quality improvements',
      action: 'Conduct comprehensive review of exercise content and validation'
    });
  }

  if (summary.averageQuality < 75) {
    recommendations.push({
      priority: 'medium',
      type: 'enhancement',
      message: 'Overall exercise quality could be improved',
      action: 'Focus on adding better feedback, hints, and validation'
    });
  }

  return recommendations;
}

/**
 * Migration utility to convert legacy exercises to new schema
 * @param {object} legacyExercise - Exercise in old format
 * @returns {object} - Exercise in new schema format
 */
export function migrateLegacyExercise(legacyExercise, index = 0) {
  const migrated = {
    id: `legacy-exercise-${index + 1}`,
    version: '1.0.0',
    title: legacyExercise.name || `Exercise ${index + 1}`,
    description: legacyExercise.description || 'Legacy exercise migration',
    difficulty: 'beginner', // Default for legacy exercises
    estimatedTime: 15,
    prerequisites: [],
    concepts: ['syntax'], // Default concept
    tags: ['legacy', 'migrated'],
    type: 'practice',
    content: {
      instructions: Array.isArray(legacyExercise.content) 
        ? legacyExercise.content.join('\n\n')
        : legacyExercise.content || 'No instructions available'
    },
    files: [],
    validation: {
      strategy: 'pattern-match',
      patterns: [],
      passingScore: 70
    },
    feedback: {
      success: 'Great job! You completed this exercise.',
      commonErrors: []
    },
    metadata: {
      source: 'Legacy Migration',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      reviewStatus: 'draft'
    }
  };

  // Migrate files from tabs
  if (legacyExercise.tabs && Array.isArray(legacyExercise.tabs)) {
    migrated.files = legacyExercise.tabs.map((tab, tabIndex) => ({
      name: tab.name || `file-${tabIndex}.cql`,
      template: tab.template || '',
      solution: tab.key || tab.solution || '',
      readonly: false,
      language: 'cql'
    }));
  }

  // Migrate validation if eval function exists
  if (legacyExercise.tabs?.[0]?.eval) {
    migrated.validation.strategy = 'custom-function';
    migrated.validation.customValidator = `
      // Migrated from legacy eval function
      function validateExercise(userCode, result) {
        // Legacy validation logic needs manual review
        return { score: 100, passed: true, feedback: 'Please review validation logic' };
      }
    `;
  }

  return migrated;
}

export default {
  validateExerciseData,
  performQualityChecks,
  validateExerciseBatch,
  migrateLegacyExercise
};