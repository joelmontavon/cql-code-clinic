/**
 * Content Import Orchestrator
 * Coordinates content imports from multiple sources and manages the import workflow
 */

import cqfImporter from '../importers/cqf-importer.js';
import cookingWithCQLImporter from '../importers/cooking-with-cql-importer.js';
import contentProcessor from './content-processor.js';
import { validateExerciseBatch } from './exercise-validator.js';
import { migrateLegacyExercises } from './exercise-migration.js';

/**
 * Content Import Orchestrator
 * Manages the complete content import workflow
 */
class ContentImportOrchestrator {
  constructor() {
    this.importers = new Map();
    this.importLog = [];
    this.importedContent = {
      exercises: [],
      sources: [],
      analytics: {},
      quality: {}
    };
    
    this.registerDefaultImporters();
  }

  /**
   * Orchestrates a complete content import from multiple sources
   * @param {Object} options - Import configuration
   * @returns {Promise<Object>} Complete import results
   */
  async orchestrateImport(options = {}) {
    const config = {
      sources: ['legacy', 'cqf', 'cooking-with-cql'],
      processContent: true,
      validateQuality: true,
      generateReports: true,
      mergeDuplicates: true,
      ...options
    };

    this.log('info', 'Starting content import orchestration');
    this.log('info', `Sources: ${config.sources.join(', ')}`);

    const results = {
      sources: {},
      processed: {
        exercises: [],
        failed: [],
        duplicates: []
      },
      analytics: {},
      quality: {},
      reports: {},
      summary: {},
      log: []
    };

    try {
      // Phase 1: Import from all sources
      await this.importFromSources(config.sources, results);
      
      // Phase 2: Merge and deduplicate content
      if (config.mergeDuplicates) {
        await this.mergeContent(results);
      }
      
      // Phase 3: Process and enhance content
      if (config.processContent) {
        await this.processContent(results);
      }
      
      // Phase 4: Quality validation
      if (config.validateQuality) {
        await this.validateQuality(results);
      }
      
      // Phase 5: Generate reports
      if (config.generateReports) {
        await this.generateReports(results);
      }
      
      // Phase 6: Create summary
      results.summary = this.createSummary(results);
      
      this.log('info', 'Content import orchestration completed successfully');
      this.importedContent = results;
      
      return results;
      
    } catch (error) {
      this.log('error', 'Content import orchestration failed', error.message);
      results.error = error.message;
      throw error;
    }
  }

  /**
   * Imports content from specified sources
   * @param {Array} sources - Source names to import from
   * @param {Object} results - Results object to update
   */
  async importFromSources(sources, results) {
    this.log('info', 'Phase 1: Importing from sources');

    const importPromises = sources.map(async (sourceName) => {
      try {
        if (!this.importers.has(sourceName)) {
          throw new Error(`Unknown source: ${sourceName}`);
        }

        this.log('info', `Importing from ${sourceName}...`);
        
        const importer = this.importers.get(sourceName);
        const sourceResults = await importer.import();
        
        results.sources[sourceName] = {
          exercises: sourceResults.exercises || sourceResults,
          count: (sourceResults.exercises || sourceResults).length,
          status: 'success',
          importTime: new Date().toISOString()
        };
        
        this.log('success', `Imported ${results.sources[sourceName].count} exercises from ${sourceName}`);
        
      } catch (error) {
        this.log('error', `Failed to import from ${sourceName}`, error.message);
        results.sources[sourceName] = {
          exercises: [],
          count: 0,
          status: 'failed',
          error: error.message,
          importTime: new Date().toISOString()
        };
      }
    });

    await Promise.all(importPromises);
  }

  /**
   * Merges content from multiple sources and handles duplicates
   * @param {Object} results - Results object to update
   */
  async mergeContent(results) {
    this.log('info', 'Phase 2: Merging and deduplicating content');

    const allExercises = [];
    const duplicateTracker = new Map(); // Track by title and content similarity

    // Collect all exercises from sources
    Object.values(results.sources).forEach(sourceResult => {
      if (sourceResult.exercises) {
        sourceResult.exercises.forEach(exercise => {
          allExercises.push(exercise);
        });
      }
    });

    // Deduplicate exercises
    const uniqueExercises = [];
    const duplicates = [];

    for (const exercise of allExercises) {
      const fingerprint = this.createExerciseFingerprint(exercise);
      
      if (duplicateTracker.has(fingerprint)) {
        const existing = duplicateTracker.get(fingerprint);
        duplicates.push({
          duplicate: exercise,
          original: existing,
          similarity: this.calculateSimilarity(exercise, existing)
        });
        
        // Keep the one with higher quality score
        if ((exercise.metadata?.qualityScore || 0) > (existing.metadata?.qualityScore || 0)) {
          // Replace existing with this one
          const index = uniqueExercises.findIndex(ex => ex.id === existing.id);
          if (index >= 0) {
            uniqueExercises[index] = exercise;
          }
          duplicateTracker.set(fingerprint, exercise);
        }
      } else {
        duplicateTracker.set(fingerprint, exercise);
        uniqueExercises.push(exercise);
      }
    }

    results.processed.exercises = uniqueExercises;
    results.processed.duplicates = duplicates;

    this.log('info', `Merged ${allExercises.length} exercises into ${uniqueExercises.length} unique exercises`);
    this.log('info', `Found ${duplicates.length} duplicates`);
  }

  /**
   * Processes content through enhancement pipeline
   * @param {Object} results - Results object to update
   */
  async processContent(results) {
    this.log('info', 'Phase 3: Processing and enhancing content');

    try {
      const processingResults = await contentProcessor.processContent(
        results.processed.exercises,
        { enhanceQuality: true, validateContent: true }
      );

      results.processed.exercises = processingResults.processed;
      results.processed.failed.push(...processingResults.failed);
      results.analytics.processing = processingResults.analytics;

      this.log('info', `Content processing completed: ${processingResults.processed.length} processed, ${processingResults.failed.length} failed`);

    } catch (error) {
      this.log('error', 'Content processing failed', error.message);
      throw error;
    }
  }

  /**
   * Validates content quality across all exercises
   * @param {Object} results - Results object to update
   */
  async validateQuality(results) {
    this.log('info', 'Phase 4: Quality validation');

    try {
      const batchValidation = validateExerciseBatch(results.processed.exercises);
      
      results.quality = {
        validation: batchValidation,
        qualityDistribution: this.analyzeQualityDistribution(results.processed.exercises),
        recommendations: this.generateQualityRecommendations(batchValidation)
      };

      this.log('info', `Quality validation completed: ${batchValidation.summary.valid}/${batchValidation.summary.total} exercises valid`);

    } catch (error) {
      this.log('error', 'Quality validation failed', error.message);
      throw error;
    }
  }

  /**
   * Generates comprehensive import reports
   * @param {Object} results - Results object to update
   */
  async generateReports(results) {
    this.log('info', 'Phase 5: Generating reports');

    results.reports = {
      importSummary: this.generateImportSummaryReport(results),
      qualityReport: this.generateQualityReport(results),
      contentAnalysis: this.generateContentAnalysisReport(results),
      recommendations: this.generateRecommendationsReport(results)
    };

    this.log('info', 'Reports generated successfully');
  }

  /**
   * Creates a comprehensive summary of the import process
   * @param {Object} results - Complete results
   * @returns {Object} Summary object
   */
  createSummary(results) {
    const totalImported = Object.values(results.sources)
      .reduce((sum, source) => sum + source.count, 0);
    
    const successfulSources = Object.values(results.sources)
      .filter(source => source.status === 'success').length;

    return {
      sources: {
        total: Object.keys(results.sources).length,
        successful: successfulSources,
        failed: Object.keys(results.sources).length - successfulSources
      },
      exercises: {
        totalImported,
        unique: results.processed.exercises.length,
        duplicates: results.processed.duplicates.length,
        failed: results.processed.failed.length,
        valid: results.quality?.validation?.summary.valid || 0
      },
      quality: {
        averageScore: this.calculateAverageQualityScore(results.processed.exercises),
        highQuality: results.quality?.qualityDistribution?.high || 0,
        needsImprovement: results.quality?.qualityDistribution?.low || 0
      },
      completedAt: new Date().toISOString(),
      processingTime: this.calculateProcessingTime()
    };
  }

  // Importer registration and management

  registerDefaultImporters() {
    this.registerImporter('legacy', {
      import: async () => {
        // Import legacy exercises using existing migration
        const legacyExercises = [
          {
            name: 'Exercise 1',
            description: 'Whitespace and comments',
            content: ['Basic CQL syntax and comment handling'],
            tabs: [{ name: 'test.cql', template: 'This is a comment', key: '// This is a comment' }]
          }
        ];
        
        return migrateLegacyExercises(legacyExercises);
      }
    });

    this.registerImporter('cqf', {
      import: async () => {
        return await cqfImporter.importCQFExercises();
      }
    });

    this.registerImporter('cooking-with-cql', {
      import: async () => {
        return await cookingWithCQLImporter.importCookingWithCQLExercises();
      }
    });
  }

  registerImporter(name, importer) {
    this.importers.set(name, importer);
    this.log('info', `Registered importer: ${name}`);
  }

  // Utility methods

  createExerciseFingerprint(exercise) {
    // Create a fingerprint for duplicate detection
    const title = exercise.title.toLowerCase().replace(/[^\w]/g, '');
    const concepts = exercise.concepts.sort().join(',');
    const difficulty = exercise.difficulty;
    
    return `${title}_${concepts}_${difficulty}`;
  }

  calculateSimilarity(exercise1, exercise2) {
    // Simple similarity calculation
    let score = 0;
    
    // Title similarity
    if (exercise1.title === exercise2.title) score += 40;
    else if (exercise1.title.toLowerCase() === exercise2.title.toLowerCase()) score += 30;
    
    // Concept similarity
    const concepts1 = new Set(exercise1.concepts);
    const concepts2 = new Set(exercise2.concepts);
    const commonConcepts = [...concepts1].filter(c => concepts2.has(c));
    const conceptSimilarity = commonConcepts.length / Math.max(concepts1.size, concepts2.size);
    score += conceptSimilarity * 30;
    
    // Difficulty match
    if (exercise1.difficulty === exercise2.difficulty) score += 15;
    
    // Type match
    if (exercise1.type === exercise2.type) score += 15;
    
    return Math.round(score);
  }

  analyzeQualityDistribution(exercises) {
    const distribution = { high: 0, medium: 0, low: 0 };
    
    exercises.forEach(exercise => {
      const quality = exercise.metadata?.qualityScore || 70;
      if (quality >= 85) distribution.high++;
      else if (quality >= 70) distribution.medium++;
      else distribution.low++;
    });
    
    return distribution;
  }

  generateQualityRecommendations(batchValidation) {
    const recommendations = [];
    
    if (batchValidation.summary.invalid > 0) {
      recommendations.push(`Fix ${batchValidation.summary.invalid} exercises with validation errors`);
    }
    
    if (batchValidation.summary.needsImprovement > batchValidation.summary.total * 0.3) {
      recommendations.push('Many exercises need quality improvements');
    }
    
    if (batchValidation.summary.averageQuality < 75) {
      recommendations.push('Overall content quality could be improved');
    }
    
    return recommendations;
  }

  generateImportSummaryReport(results) {
    return {
      timestamp: new Date().toISOString(),
      sources: Object.keys(results.sources).map(sourceName => ({
        name: sourceName,
        status: results.sources[sourceName].status,
        exerciseCount: results.sources[sourceName].count,
        error: results.sources[sourceName].error
      })),
      totals: {
        imported: Object.values(results.sources).reduce((sum, s) => sum + s.count, 0),
        unique: results.processed.exercises.length,
        duplicates: results.processed.duplicates.length
      }
    };
  }

  generateQualityReport(results) {
    return {
      distribution: results.quality?.qualityDistribution || {},
      validation: {
        valid: results.quality?.validation?.summary.valid || 0,
        invalid: results.quality?.validation?.summary.invalid || 0,
        averageQuality: results.quality?.validation?.summary.averageQuality || 0
      },
      recommendations: results.quality?.recommendations || []
    };
  }

  generateContentAnalysisReport(results) {
    const exercises = results.processed.exercises;
    
    const analysis = {
      byDifficulty: {},
      byType: {},
      byConcepts: {},
      bySource: {},
      averageTime: 0
    };
    
    let totalTime = 0;
    
    exercises.forEach(exercise => {
      // Difficulty distribution
      analysis.byDifficulty[exercise.difficulty] = 
        (analysis.byDifficulty[exercise.difficulty] || 0) + 1;
      
      // Type distribution
      analysis.byType[exercise.type] = 
        (analysis.byType[exercise.type] || 0) + 1;
      
      // Concept frequency
      exercise.concepts.forEach(concept => {
        analysis.byConcepts[concept] = 
          (analysis.byConcepts[concept] || 0) + 1;
      });
      
      // Source distribution
      const source = exercise.metadata?.source || 'unknown';
      analysis.bySource[source] = 
        (analysis.bySource[source] || 0) + 1;
      
      totalTime += exercise.estimatedTime || 15;
    });
    
    analysis.averageTime = exercises.length > 0 ? 
      Math.round(totalTime / exercises.length) : 0;
    
    return analysis;
  }

  generateRecommendationsReport(results) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };
    
    // Immediate actions
    if (results.processed.failed.length > 0) {
      recommendations.immediate.push('Fix exercises that failed processing');
    }
    
    if (results.quality?.validation?.summary.invalid > 0) {
      recommendations.immediate.push('Resolve validation errors');
    }
    
    // Short-term actions
    if (results.quality?.qualityDistribution?.low > 0) {
      recommendations.shortTerm.push('Improve low-quality exercises');
    }
    
    if (results.processed.duplicates.length > 0) {
      recommendations.shortTerm.push('Review and merge duplicate exercises');
    }
    
    // Long-term actions
    recommendations.longTerm.push('Establish regular content review process');
    recommendations.longTerm.push('Create content creation guidelines');
    
    return recommendations;
  }

  calculateAverageQualityScore(exercises) {
    if (exercises.length === 0) return 0;
    
    const total = exercises.reduce((sum, ex) => 
      sum + (ex.metadata?.qualityScore || 70), 0);
    
    return Math.round(total / exercises.length);
  }

  calculateProcessingTime() {
    if (this.importLog.length < 2) return 0;
    
    const start = new Date(this.importLog[0].timestamp);
    const end = new Date(this.importLog[this.importLog.length - 1].timestamp);
    
    return end.getTime() - start.getTime();
  }

  log(level, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    
    this.importLog.push(logEntry);
    console.log(`[ImportOrchestrator] ${level.toUpperCase()}: ${message}`, details || '');
  }

  getImportLog() {
    return [...this.importLog];
  }

  getImportedContent() {
    return { ...this.importedContent };
  }
}

// Export singleton instance
const contentImportOrchestrator = new ContentImportOrchestrator();

export { contentImportOrchestrator as default, ContentImportOrchestrator };