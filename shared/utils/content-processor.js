/**
 * Content Processor
 * Processes and enhances imported exercise content
 */

import { validateExerciseData, performQualityChecks } from './exercise-validator.js';

/**
 * Content Processing Pipeline
 * Handles content enhancement, validation, and quality improvement
 */
class ContentProcessor {
  constructor() {
    this.processors = new Map();
    this.qualityEnhancers = new Map();
    this.contentAnalyzers = new Map();
    
    // Register default processors
    this.registerDefaultProcessors();
  }

  /**
   * Processes content through the enhancement pipeline
   * @param {Array} exercises - Raw exercises to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processContent(exercises, options = {}) {
    const results = {
      processed: [],
      failed: [],
      enhanced: [],
      analytics: {},
      log: []
    };

    this.log(results, 'info', `Starting content processing for ${exercises.length} exercises`);

    try {
      // Phase 1: Content Enhancement
      const enhancedExercises = await this.enhanceContent(exercises, results);
      
      // Phase 2: Quality Improvement
      const qualityImprovedExercises = await this.improveQuality(enhancedExercises, results);
      
      // Phase 3: Content Analysis
      const analyzedResults = await this.analyzeContent(qualityImprovedExercises, results);
      
      // Phase 4: Final Validation
      const finalResults = await this.validateContent(analyzedResults, results);
      
      // Phase 5: Generate Analytics
      results.analytics = this.generateContentAnalytics(finalResults, results);
      
      this.log(results, 'info', 'Content processing completed successfully');
      return results;
      
    } catch (error) {
      this.log(results, 'error', 'Content processing failed', error.message);
      throw error;
    }
  }

  /**
   * Enhanced content with additional metadata and improvements
   * @param {Array} exercises - Exercises to enhance
   * @param {Object} results - Results object to update
   * @returns {Array} Enhanced exercises
   */
  async enhanceContent(exercises, results) {
    this.log(results, 'info', 'Phase 1: Content Enhancement');
    const enhanced = [];

    for (const exercise of exercises) {
      try {
        let enhancedExercise = { ...exercise };

        // Apply content enhancers
        for (const [name, enhancer] of this.processors.entries()) {
          if (enhancer.phase === 'enhance') {
            enhancedExercise = await enhancer.process(enhancedExercise);
            this.log(results, 'debug', `Applied enhancer: ${name} to ${exercise.title}`);
          }
        }

        enhanced.push(enhancedExercise);
        this.log(results, 'success', `Enhanced exercise: ${exercise.title}`);

      } catch (error) {
        this.log(results, 'error', `Failed to enhance exercise: ${exercise.title}`, error.message);
        results.failed.push({ exercise, error: error.message, phase: 'enhance' });
      }
    }

    return enhanced;
  }

  /**
   * Improves content quality through automated enhancements
   * @param {Array} exercises - Exercises to improve
   * @param {Object} results - Results object to update
   * @returns {Array} Quality-improved exercises
   */
  async improveQuality(exercises, results) {
    this.log(results, 'info', 'Phase 2: Quality Improvement');
    const improved = [];

    for (const exercise of exercises) {
      try {
        let improvedExercise = { ...exercise };

        // Check current quality
        const qualityCheck = performQualityChecks(exercise);
        
        // Apply quality improvers if needed
        if (qualityCheck.qualityScore < 80) {
          for (const [name, improver] of this.qualityEnhancers.entries()) {
            improvedExercise = await improver.process(improvedExercise, qualityCheck);
            this.log(results, 'debug', `Applied quality improver: ${name}`);
          }

          // Re-check quality
          const newQualityCheck = performQualityChecks(improvedExercise);
          this.log(results, 'info', 
            `Quality improved: ${qualityCheck.qualityScore} -> ${newQualityCheck.qualityScore}`
          );
        }

        improved.push(improvedExercise);
        results.enhanced.push(improvedExercise);

      } catch (error) {
        this.log(results, 'error', `Failed to improve quality: ${exercise.title}`, error.message);
        results.failed.push({ exercise, error: error.message, phase: 'quality' });
      }
    }

    return improved;
  }

  /**
   * Analyzes content for patterns and insights
   * @param {Array} exercises - Exercises to analyze
   * @param {Object} results - Results object to update
   * @returns {Array} Analyzed exercises
   */
  async analyzeContent(exercises, results) {
    this.log(results, 'info', 'Phase 3: Content Analysis');
    
    // Apply content analyzers
    for (const [name, analyzer] of this.contentAnalyzers.entries()) {
      try {
        const analysis = await analyzer.analyze(exercises);
        results.analytics[name] = analysis;
        this.log(results, 'info', `Completed analysis: ${name}`);
      } catch (error) {
        this.log(results, 'error', `Failed analysis: ${name}`, error.message);
      }
    }

    return exercises;
  }

  /**
   * Validates processed content
   * @param {Array} exercises - Exercises to validate
   * @param {Object} results - Results object to update
   * @returns {Array} Validated exercises
   */
  async validateContent(exercises, results) {
    this.log(results, 'info', 'Phase 4: Final Validation');
    const validated = [];

    for (const exercise of exercises) {
      try {
        const validation = validateExerciseData(exercise);
        
        if (validation.success) {
          validated.push(exercise);
          results.processed.push(exercise);
          this.log(results, 'success', `Validated exercise: ${exercise.title}`);
        } else {
          this.log(results, 'error', `Validation failed: ${exercise.title}`, validation.errors);
          results.failed.push({ 
            exercise, 
            error: validation.errors, 
            phase: 'validation' 
          });
        }
      } catch (error) {
        this.log(results, 'error', `Validation error: ${exercise.title}`, error.message);
        results.failed.push({ exercise, error: error.message, phase: 'validation' });
      }
    }

    return validated;
  }

  /**
   * Generates analytics for the processed content
   * @param {Array} exercises - Final exercises
   * @param {Object} results - Processing results
   * @returns {Object} Content analytics
   */
  generateContentAnalytics(exercises, results) {
    const analytics = {
      summary: {
        total: exercises.length + results.failed.length,
        processed: exercises.length,
        failed: results.failed.length,
        enhanced: results.enhanced.length,
        successRate: exercises.length / (exercises.length + results.failed.length) * 100
      },
      quality: {
        averageScore: 0,
        distribution: { high: 0, medium: 0, low: 0 },
        improvements: 0
      },
      content: {
        byDifficulty: {},
        byType: {},
        byConcepts: {},
        averageTime: 0
      },
      issues: {
        byPhase: {},
        commonErrors: [],
        suggestions: []
      }
    };

    // Calculate quality metrics
    let totalQuality = 0;
    exercises.forEach(exercise => {
      const qualityScore = exercise.metadata?.qualityScore || 70;
      totalQuality += qualityScore;
      
      if (qualityScore >= 85) analytics.quality.distribution.high++;
      else if (qualityScore >= 70) analytics.quality.distribution.medium++;
      else analytics.quality.distribution.low++;
      
      // Content distribution
      analytics.content.byDifficulty[exercise.difficulty] = 
        (analytics.content.byDifficulty[exercise.difficulty] || 0) + 1;
      analytics.content.byType[exercise.type] = 
        (analytics.content.byType[exercise.type] || 0) + 1;
      
      exercise.concepts.forEach(concept => {
        analytics.content.byConcepts[concept] = 
          (analytics.content.byConcepts[concept] || 0) + 1;
      });
      
      analytics.content.averageTime += exercise.estimatedTime || 15;
    });

    analytics.quality.averageScore = exercises.length > 0 ? 
      totalQuality / exercises.length : 0;
    analytics.content.averageTime = exercises.length > 0 ? 
      Math.round(analytics.content.averageTime / exercises.length) : 0;
    analytics.quality.improvements = results.enhanced.length;

    // Analyze failures
    results.failed.forEach(failure => {
      analytics.issues.byPhase[failure.phase] = 
        (analytics.issues.byPhase[failure.phase] || 0) + 1;
    });

    return analytics;
  }

  /**
   * Registers default content processors
   */
  registerDefaultProcessors() {
    // Content enhancers
    this.registerProcessor('instructionEnhancer', {
      phase: 'enhance',
      process: async (exercise) => {
        // Enhance instructions with better formatting
        if (exercise.content?.instructions) {
          let instructions = exercise.content.instructions;
          
          // Add table of contents for long instructions
          if (instructions.length > 2000) {
            const toc = this.generateTableOfContents(instructions);
            instructions = toc + '\n\n' + instructions;
          }
          
          // Enhance code blocks
          instructions = instructions.replace(/```cql\n([\s\S]*?)\n```/g, 
            (match, code) => {
              return '```cql\n' + this.formatCQLCode(code) + '\n```';
            });
          
          exercise.content.instructions = instructions;
        }
        
        return exercise;
      }
    });

    this.registerProcessor('metadataEnhancer', {
      phase: 'enhance',
      process: async (exercise) => {
        // Add enhanced metadata
        exercise.metadata = {
          ...exercise.metadata,
          processedAt: new Date().toISOString(),
          contentWordCount: this.countWords(exercise.content?.instructions || ''),
          codeLineCount: this.countCodeLines(exercise.files || []),
          conceptCoverage: exercise.concepts?.length || 0
        };
        
        return exercise;
      }
    });

    // Quality enhancers
    this.registerQualityEnhancer('hintImprover', {
      process: async (exercise, qualityCheck) => {
        if (!exercise.content.hints || exercise.content.hints.length < 3) {
          exercise.content.hints = this.generateImprovedHints(exercise);
        }
        return exercise;
      }
    });

    this.registerQualityEnhancer('validationImprover', {
      process: async (exercise, qualityCheck) => {
        if (!exercise.validation.patterns || exercise.validation.patterns.length === 0) {
          exercise.validation.patterns = this.generateValidationPatterns(exercise);
        }
        return exercise;
      }
    });

    // Content analyzers
    this.registerContentAnalyzer('difficultyProgression', {
      analyze: async (exercises) => {
        return this.analyzeDifficultyProgression(exercises);
      }
    });

    this.registerContentAnalyzer('conceptCoverage', {
      analyze: async (exercises) => {
        return this.analyzeConceptCoverage(exercises);
      }
    });
  }

  // Processor registration methods
  registerProcessor(name, processor) {
    this.processors.set(name, processor);
  }

  registerQualityEnhancer(name, enhancer) {
    this.qualityEnhancers.set(name, enhancer);
  }

  registerContentAnalyzer(name, analyzer) {
    this.contentAnalyzers.set(name, analyzer);
  }

  // Utility methods
  generateTableOfContents(instructions) {
    const headings = instructions.match(/^#+\s+(.+)$/gm) || [];
    if (headings.length < 3) return '';
    
    let toc = '## Table of Contents\n\n';
    headings.forEach((heading, index) => {
      const level = heading.match(/^#+/)[0].length;
      const text = heading.replace(/^#+\s+/, '');
      const anchor = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
      toc += `${'  '.repeat(level - 2)}- [${text}](#${anchor})\n`;
    });
    
    return toc;
  }

  formatCQLCode(code) {
    // Basic CQL code formatting
    return code
      .split('\n')
      .map(line => line.trim())
      .join('\n');
  }

  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  countCodeLines(files) {
    return files.reduce((total, file) => {
      const lines = (file.template || '').split('\n').length;
      return total + lines;
    }, 0);
  }

  generateImprovedHints(exercise) {
    const hints = [];
    
    hints.push({
      level: 1,
      text: "Start by reading the instructions carefully and understanding what you need to accomplish."
    });
    
    hints.push({
      level: 2,
      text: "Look at the code template to see what parts need to be completed."
    });
    
    hints.push({
      level: 3,
      text: "Review the examples in the instructions for the correct syntax patterns."
    });
    
    if (exercise.files && exercise.files[0]?.solution) {
      hints.push({
        level: 4,
        text: "Compare your code structure with the expected solution format."
      });
      
      hints.push({
        level: 5,
        text: `Complete solution: ${exercise.files[0].solution}`
      });
    }
    
    return hints;
  }

  generateValidationPatterns(exercise) {
    const patterns = [];
    
    if (exercise.files && exercise.files[0]?.solution) {
      const solution = exercise.files[0].solution;
      const lines = solution.split('\n').filter(line => line.trim());
      
      lines.forEach((line, index) => {
        if (line.includes('define')) {
          patterns.push({
            pattern: line.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            description: `Should include definition: ${line.trim()}`,
            required: true,
            points: Math.floor(100 / lines.length)
          });
        }
      });
    }
    
    if (patterns.length === 0) {
      patterns.push({
        pattern: "define.*:",
        description: "Should include at least one CQL definition",
        required: true,
        points: 100
      });
    }
    
    return patterns;
  }

  analyzeDifficultyProgression(exercises) {
    const progression = exercises
      .sort((a, b) => a.metadata.created.localeCompare(b.metadata.created))
      .map(ex => ex.difficulty);
    
    const difficultyOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
    const issues = [];
    
    for (let i = 1; i < progression.length; i++) {
      const current = difficultyOrder.indexOf(progression[i]);
      const previous = difficultyOrder.indexOf(progression[i - 1]);
      
      if (current < previous - 1) {
        issues.push(`Exercise ${i + 1} has difficulty regression`);
      }
    }
    
    return {
      progression,
      issues,
      recommendation: issues.length > 0 ? 
        'Consider reordering exercises for better difficulty progression' : 
        'Difficulty progression is appropriate'
    };
  }

  analyzeConceptCoverage(exercises) {
    const allConcepts = new Set();
    const conceptFrequency = {};
    const conceptProgression = {};
    
    exercises.forEach((exercise, index) => {
      exercise.concepts.forEach(concept => {
        allConcepts.add(concept);
        conceptFrequency[concept] = (conceptFrequency[concept] || 0) + 1;
        
        if (!conceptProgression[concept]) {
          conceptProgression[concept] = { first: index, last: index, exercises: [] };
        }
        conceptProgression[concept].last = index;
        conceptProgression[concept].exercises.push(exercise.id);
      });
    });
    
    const coverage = {
      totalConcepts: allConcepts.size,
      frequency: conceptFrequency,
      progression: conceptProgression,
      gaps: [],
      recommendations: []
    };
    
    // Identify gaps
    const essentialConcepts = [
      'syntax', 'literals', 'expressions', 'functions', 
      'clinical-data', 'conditions', 'observations'
    ];
    
    essentialConcepts.forEach(concept => {
      if (!allConcepts.has(concept)) {
        coverage.gaps.push(concept);
      }
    });
    
    if (coverage.gaps.length > 0) {
      coverage.recommendations.push(
        `Add exercises covering: ${coverage.gaps.join(', ')}`
      );
    }
    
    return coverage;
  }

  log(results, level, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    
    results.log.push(logEntry);
    console.log(`[ContentProcessor] ${level.toUpperCase()}: ${message}`, details || '');
  }
}

// Export singleton instance
const contentProcessor = new ContentProcessor();

export { contentProcessor as default, ContentProcessor };