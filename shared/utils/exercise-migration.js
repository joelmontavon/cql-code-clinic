/**
 * Exercise Migration Utilities
 * Tools for migrating existing exercises to the new schema format
 */

import { validateExerciseData, performQualityChecks } from './exercise-validator.js';

/**
 * Migrates the existing Vue.js exercise data to new schema format
 * @param {Array} legacyExercises - Original exercise data from store.js
 * @returns {Array} - Migrated exercises in new schema format
 */
export function migrateLegacyExercises(legacyExercises) {
  const migrated = legacyExercises.map((exercise, index) => {
    const newExercise = {
      id: generateExerciseId(exercise.name, index),
      version: "1.0.0",
      title: exercise.name || `Exercise ${index + 1}`,
      description: exercise.description || 'Legacy exercise migration',
      difficulty: determineDifficulty(exercise, index),
      estimatedTime: estimateTime(exercise),
      prerequisites: determinePrerequisites(index),
      concepts: extractConcepts(exercise),
      tags: generateTags(exercise, index),
      type: determineType(exercise),
      
      content: {
        instructions: Array.isArray(exercise.content) 
          ? exercise.content.join('\n\n')
          : exercise.content || 'No instructions available',
        hints: generateHints(exercise),
        resources: []
      },
      
      files: migrateFiles(exercise.tabs || []),
      
      validation: migrateValidation(exercise),
      
      feedback: {
        success: generateSuccessMessage(exercise),
        failure: generateFailureMessage(exercise),
        commonErrors: extractCommonErrors(exercise)
      },
      
      analytics: {
        trackingEnabled: true,
        events: ["start", "complete", "hint-used", "error-encountered"],
        metadata: {
          learningObjectives: extractLearningObjectives(exercise)
        }
      },
      
      metadata: {
        author: "CQL Code Clinic Migration",
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        source: "Legacy Vue.js Store",
        license: "CC-BY-4.0",
        reviewStatus: "review"
      }
    };
    
    return newExercise;
  });
  
  return migrated;
}

/**
 * Generates a proper exercise ID from name and index
 */
function generateExerciseId(name, index) {
  if (name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return `legacy-exercise-${index + 1}`;
}

/**
 * Determines difficulty based on exercise content and position
 */
function determineDifficulty(exercise, index) {
  const contentStr = Array.isArray(exercise.content) 
    ? exercise.content.join(' ')
    : (exercise.content || '');
  const content = contentStr.toLowerCase();
  const title = (exercise.name || '').toLowerCase();
  
  // Exercise 1 is beginner
  if (index === 0) return 'beginner';
  
  // Look for complexity indicators
  if (content.includes('advanced') || content.includes('complex')) return 'advanced';
  if (content.includes('intermediate') || index > 5) return 'intermediate';
  if (content.includes('basic') || content.includes('simple') || index < 3) return 'beginner';
  
  // Default progression
  return index < 2 ? 'beginner' : index < 5 ? 'intermediate' : 'advanced';
}

/**
 * Estimates completion time based on content length and complexity
 */
function estimateTime(exercise) {
  const content = exercise.content || '';
  const contentLength = Array.isArray(content) 
    ? content.join('').length 
    : content.length;
  
  const hasCode = exercise.tabs && exercise.tabs.length > 0;
  const codeComplexity = hasCode ? exercise.tabs[0].template?.length || 0 : 0;
  
  // Base time estimation
  let time = Math.max(5, Math.ceil(contentLength / 100) * 2);
  
  // Add time for code complexity
  if (codeComplexity > 100) time += 5;
  if (codeComplexity > 300) time += 10;
  
  // Cap at reasonable limits
  return Math.min(45, time);
}

/**
 * Determines prerequisites based on exercise position
 */
function determinePrerequisites(index) {
  if (index === 0) return [];
  if (index === 1) return ['legacy-exercise-1'];
  if (index === 2) return ['legacy-exercise-1', 'legacy-exercise-2'];
  
  // For higher indices, depend on previous 1-2 exercises
  const prerequisites = [];
  if (index > 0) prerequisites.push(`legacy-exercise-${index}`);
  if (index > 1) prerequisites.push(`legacy-exercise-${index - 1}`);
  
  return prerequisites.slice(0, 3); // Limit to 3 prerequisites
}

/**
 * Extracts CQL concepts from exercise content
 */
function extractConcepts(exercise) {
  const contentStr = Array.isArray(exercise.content) 
    ? exercise.content.join(' ')
    : (exercise.content || '');
  const content = contentStr.toLowerCase();
  const title = (exercise.name || '').toLowerCase();
  const allText = `${title} ${content}`.toLowerCase();
  
  const conceptMap = {
    'whitespace': ['whitespace', 'space', 'tab'],
    'comments': ['comment', '//'],
    'operators': ['operator', 'comparison', 'arithmetic', '+', '-', '*', '/', '=', '!=', '<', '>'],
    'syntax': ['syntax', 'grammar', 'structure'],
    'expressions': ['expression', 'define'],
    'identifiers': ['identifier', 'name', 'variable'],
    'case-sensitivity': ['case', 'sensitive', 'upper', 'lower'],
    'literals': ['literal', 'string', 'number'],
    'types': ['type', 'string', 'integer', 'boolean'],
    'functions': ['function', 'call'],
    'logic': ['and', 'or', 'not', 'logic'],
    'comparisons': ['compare', 'equal', 'greater', 'less']
  };
  
  const concepts = [];
  for (const [concept, keywords] of Object.entries(conceptMap)) {
    if (keywords.some(keyword => allText.includes(keyword))) {
      concepts.push(concept);
    }
  }
  
  // Always include syntax as a concept
  if (!concepts.includes('syntax')) {
    concepts.unshift('syntax');
  }
  
  return concepts.slice(0, 5); // Limit to 5 concepts
}

/**
 * Generates appropriate tags for the exercise
 */
function generateTags(exercise, index) {
  const tags = ['legacy', 'migrated'];
  const concepts = extractConcepts(exercise);
  const difficulty = determineDifficulty(exercise, index);
  
  tags.push(difficulty);
  tags.push(...concepts.slice(0, 3)); // Add top 3 concepts as tags
  
  // Add positional tags
  if (index === 0) tags.push('first', 'introduction');
  if (index < 3) tags.push('fundamentals');
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Determines exercise type based on content and structure
 */
function determineType(exercise) {
  const contentStr = Array.isArray(exercise.content) 
    ? exercise.content.join(' ')
    : (exercise.content || '');
  const content = contentStr.toLowerCase();
  const title = (exercise.name || '').toLowerCase();
  
  if (title.includes('tutorial') || content.includes('learn about')) return 'tutorial';
  if (title.includes('challenge') || content.includes('challenge')) return 'challenge';
  if (title.includes('debug') || content.includes('fix')) return 'debug';
  if (title.includes('assessment') || title.includes('test')) return 'assessment';
  
  // Default to practice for most exercises
  return 'practice';
}

/**
 * Migrates file tabs to new file structure
 */
function migrateFiles(tabs) {
  if (!tabs || !Array.isArray(tabs)) return [];
  
  return tabs.map((tab, index) => ({
    name: tab.name || `exercise-${index + 1}.cql`,
    template: tab.template || '',
    solution: tab.key || tab.solution || '',
    readonly: false,
    hidden: false,
    language: determineLanguage(tab.name || 'file.cql')
  }));
}

/**
 * Determines file language from extension
 */
function determineLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'cql': return 'cql';
    case 'md': return 'markdown';
    case 'json': return 'json';
    case 'txt': return 'text';
    default: return 'cql';
  }
}

/**
 * Migrates validation logic from eval function
 */
function migrateValidation(exercise) {
  const validation = {
    strategy: 'pattern-match',
    patterns: [],
    passingScore: 70,
    timeLimit: 10
  };
  
  // If there's an eval function, create custom validation
  if (exercise.tabs?.[0]?.eval) {
    validation.strategy = 'custom-function';
    validation.customValidator = `
      // Migrated from legacy eval function
      // WARNING: This needs manual review and testing
      function validateExercise(userCode, executionResult) {
        try {
          const answers = { code: userCode, status: executionResult?.status || 'success' };
          const key = ${JSON.stringify(exercise.tabs[0].key || '')};
          
          // Original eval logic (needs review):
          ${exercise.tabs[0].eval.toString()}
          
          const result = eval(answers, key);
          return {
            score: result ? 100 : 0,
            passed: result,
            feedback: result ? 'Exercise completed successfully!' : 'Please review your solution.'
          };
        } catch (error) {
          return {
            score: 0,
            passed: false,
            feedback: 'Validation error: ' + error.message
          };
        }
      }
    `;
  } else {
    // Create basic pattern validation from solution
    const solution = exercise.tabs?.[0]?.key || exercise.tabs?.[0]?.solution;
    if (solution) {
      validation.patterns.push({
        pattern: escapeRegex(solution.trim()),
        description: 'Code should match the expected solution pattern',
        required: true,
        points: 100
      });
    }
  }
  
  return validation;
}

/**
 * Escapes special regex characters for literal matching
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates progressive hints for the exercise
 */
function generateHints(exercise) {
  const hints = [];
  const content = exercise.content || '';
  const solution = exercise.tabs?.[0]?.key || exercise.tabs?.[0]?.solution || '';
  
  // Generate generic hints based on exercise type
  hints.push({
    level: 1,
    text: "Read the instructions carefully and identify what you need to accomplish."
  });
  
  hints.push({
    level: 2, 
    text: "Look at the code in the editor. What needs to be changed or added?"
  });
  
  if (solution.includes('//') || solution.includes('/*')) {
    hints.push({
      level: 3,
      text: "This exercise involves using comments. Remember the two types: // for single-line and /* */ for multi-line."
    });
  }
  
  if (solution.includes('!=') || solution.includes('<=') || solution.includes('>=')) {
    hints.push({
      level: 3,
      text: "Check the operators being used. Make sure they have the correct syntax."
    });
  }
  
  hints.push({
    level: 4,
    text: "If you're stuck, try comparing your code with the expected pattern in the instructions."
  });
  
  return hints.slice(0, 5);
}

/**
 * Generates success message based on exercise content
 */
function generateSuccessMessage(exercise) {
  const title = exercise.name || 'Exercise';
  return `Excellent work! You've successfully completed "${title}". Keep up the great learning!`;
}

/**
 * Generates failure message with helpful guidance
 */
function generateFailureMessage(exercise) {
  return "Not quite right yet. Review the instructions and try again. Remember, learning takes practice!";
}

/**
 * Extracts common error patterns from the exercise
 */
function extractCommonErrors(exercise) {
  const commonErrors = [];
  const solution = exercise.tabs?.[0]?.key || exercise.tabs?.[0]?.solution || '';
  const template = exercise.tabs?.[0]?.template || '';
  
  // Generate common errors based on differences between template and solution
  if (template.includes('<>') && solution.includes('!=')) {
    commonErrors.push({
      pattern: '<>',
      explanation: 'CQL uses != for inequality, not <>',
      suggestion: 'Replace <> with !=',
      example: '4 != 5'
    });
  }
  
  if (template.includes('< =') && solution.includes('<=')) {
    commonErrors.push({
      pattern: '< =',
      explanation: 'Comparison operators cannot have spaces',
      suggestion: 'Remove the space between < and =',
      example: '4 <= 5'
    });
  }
  
  if (!solution.includes('//') && !solution.includes('/*') && solution !== template) {
    commonErrors.push({
      pattern: '^[^/]*$',
      explanation: 'The code needs to be commented out',
      suggestion: 'Add // at the beginning or wrap with /* */',
      example: '// This is a comment'
    });
  }
  
  return commonErrors;
}

/**
 * Extracts learning objectives from exercise content
 */
function extractLearningObjectives(exercise) {
  const objectives = [];
  const contentStr = Array.isArray(exercise.content) 
    ? exercise.content.join(' ')
    : (exercise.content || '');
  const content = contentStr.toLowerCase();
  const title = (exercise.name || '').toLowerCase();
  
  if (title.includes('whitespace') || content.includes('whitespace')) {
    objectives.push('Understand CQL whitespace handling');
  }
  
  if (title.includes('comment') || content.includes('comment')) {
    objectives.push('Learn to use CQL comment syntax');
  }
  
  if (title.includes('operator') || content.includes('operator')) {
    objectives.push('Master CQL operators and expressions');
  }
  
  if (title.includes('case') || content.includes('case-sensitive')) {
    objectives.push('Understand CQL case sensitivity rules');
  }
  
  return objectives;
}

/**
 * Performs batch migration with validation and quality checks
 * @param {Array} legacyExercises - Original exercises to migrate
 * @returns {Object} - Migration results with validation
 */
export function performBatchMigration(legacyExercises) {
  console.log('Starting migration of', legacyExercises.length, 'exercises...');
  
  // Migrate exercises
  const migrated = migrateLegacyExercises(legacyExercises);
  
  // Validate each migrated exercise
  const results = migrated.map((exercise, index) => {
    const validation = validateExerciseData(exercise);
    const quality = performQualityChecks(exercise);
    
    return {
      index,
      exercise,
      validation,
      quality,
      valid: validation.success,
      qualityScore: quality.qualityScore
    };
  });
  
  // Generate summary
  const summary = {
    total: legacyExercises.length,
    migrated: results.length,
    valid: results.filter(r => r.valid).length,
    invalid: results.filter(r => !r.valid).length,
    averageQuality: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
    highQuality: results.filter(r => r.qualityScore >= 80).length,
    needsReview: results.filter(r => r.qualityScore < 70).length
  };
  
  console.log('Migration completed:', summary);
  
  return {
    exercises: results.filter(r => r.valid).map(r => r.exercise),
    results,
    summary,
    recommendations: generateMigrationRecommendations(summary, results)
  };
}

/**
 * Generates recommendations for migration improvements
 */
function generateMigrationRecommendations(summary, results) {
  const recommendations = [];
  
  if (summary.invalid > 0) {
    recommendations.push({
      priority: 'high',
      type: 'validation',
      message: `${summary.invalid} exercises failed validation`,
      action: 'Review and fix validation errors before proceeding'
    });
  }
  
  if (summary.needsReview > summary.total * 0.5) {
    recommendations.push({
      priority: 'medium',
      type: 'quality',
      message: 'Many exercises need quality improvements',
      action: 'Review instructions, add hints, and improve validation'
    });
  }
  
  if (summary.averageQuality < 70) {
    recommendations.push({
      priority: 'medium',
      type: 'content',
      message: 'Overall exercise quality is low',
      action: 'Consider rewriting instructions and adding better examples'
    });
  }
  
  // Individual exercise recommendations
  results.filter(r => !r.valid || r.qualityScore < 70).forEach(result => {
    recommendations.push({
      priority: 'medium',
      type: 'individual',
      message: `Exercise "${result.exercise.title}" needs attention`,
      action: 'Review validation errors and quality suggestions',
      exerciseId: result.exercise.id
    });
  });
  
  return recommendations;
}

export default {
  migrateLegacyExercises,
  performBatchMigration
};