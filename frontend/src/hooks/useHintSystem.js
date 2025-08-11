import { useState, useEffect, useCallback, useMemo } from 'react';
import { useExerciseStore } from '../stores/exerciseStore.js';

/**
 * Progressive Hint System Hook
 * Manages intelligent hint generation, timing, and analytics
 */
export function useHintSystem({ exercise, currentCode, lastError, timeSpent }) {
  const [hintUsageLog, setHintUsageLog] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    hintStyle: 'balanced', // gentle, balanced, direct
    autoSuggest: true,
    maxHintLevel: 5
  });

  const { updateExerciseProgress } = useExerciseStore();

  // Analyze code context for intelligent hint generation
  const codeAnalysis = useMemo(() => {
    if (!currentCode) return null;

    return {
      hasLibraryDeclaration: /library\s+\w+/i.test(currentCode),
      hasDefineStatements: /define\s+/i.test(currentCode),
      hasUsing: /using\s+/i.test(currentCode),
      linesOfCode: currentCode.split('\n').length,
      syntaxIssues: analyzeSyntax(currentCode),
      conceptsDetected: detectCQLConcepts(currentCode),
      completionEstimate: estimateCompletion(currentCode, exercise)
    };
  }, [currentCode, exercise]);

  // Determine if user is struggling and needs hint suggestion
  const shouldSuggestHint = useMemo(() => {
    const timeThresholds = {
      beginner: 300, // 5 minutes
      intermediate: 600, // 10 minutes  
      advanced: 900, // 15 minutes
      expert: 1200 // 20 minutes
    };

    const threshold = timeThresholds[exercise?.difficulty] || 600;
    const hasErrors = lastError?.length > 0;
    const longTime = timeSpent > threshold;
    const lowProgress = codeAnalysis?.completionEstimate < 0.2;
    const repeatedErrors = analyzeErrorPattern(hintUsageLog, lastError);

    return hasErrors || longTime || (lowProgress && timeSpent > 120) || repeatedErrors;
  }, [timeSpent, lastError, exercise?.difficulty, codeAnalysis, hintUsageLog]);

  // Generate contextual hints based on current state
  const contextualHints = useMemo(() => {
    if (!currentCode || !lastError) return [];

    const hints = [];

    // Syntax-based contextual hints
    if (lastError.includes('syntax error') || lastError.includes('parsing')) {
      hints.push({
        type: 'syntax',
        text: analyzeSyntaxError(lastError, currentCode),
        priority: 'high'
      });
    }

    // Missing library declaration
    if (!codeAnalysis?.hasLibraryDeclaration && currentCode.trim()) {
      hints.push({
        type: 'structure',
        text: 'CQL libraries need to start with a library declaration like "library MyLibrary version \'1.0.0\'"',
        priority: 'high'
      });
    }

    // Missing using statement for clinical data
    if (codeAnalysis?.hasDefineStatements && !codeAnalysis?.hasUsing && 
        exercise?.concepts?.includes('clinical-data')) {
      hints.push({
        type: 'structure',
        text: 'When working with clinical data, you typically need a "using" statement like "using FHIR version \'4.0.1\'"',
        priority: 'medium'
      });
    }

    // Concept-specific hints
    if (exercise?.concepts) {
      const conceptHints = generateConceptHints(exercise.concepts, codeAnalysis, currentCode);
      hints.push(...conceptHints);
    }

    return hints.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
  }, [currentCode, lastError, codeAnalysis, exercise]);

  // Get progressive hints from exercise data enhanced with context
  const availableHints = useMemo(() => {
    if (!exercise?.content?.hints) return [];

    return exercise.content.hints.map((hint, index) => ({
      ...hint,
      enhanced: enhanceHintWithContext(hint, codeAnalysis, currentCode),
      contextRelevance: calculateRelevance(hint, codeAnalysis, lastError)
    })).sort((a, b) => a.level - b.level);
  }, [exercise?.content?.hints, codeAnalysis, currentCode, lastError]);

  // Get the next most appropriate hint
  const getNextHint = useCallback(() => {
    // First prioritize contextual hints
    if (contextualHints.length > 0) {
      return contextualHints[0];
    }

    // Then return next progressive hint
    const usedLevels = new Set(hintUsageLog.map(log => log.level));
    const nextHint = availableHints.find(hint => !usedLevels.has(hint.level));
    
    return nextHint || null;
  }, [contextualHints, availableHints, hintUsageLog]);

  // Track hint usage for analytics
  const trackHintUsage = useCallback((hint) => {
    const usage = {
      hint,
      timestamp: Date.now(),
      codeAtTime: currentCode,
      errorAtTime: lastError,
      timeSpent,
      level: hint.level,
      type: hint.type || 'progressive',
      contextRelevance: hint.contextRelevance || 0
    };

    setHintUsageLog(prev => [...prev, usage]);

    // Update exercise progress
    updateExerciseProgress(exercise.id, {
      hintsUsed: hintUsageLog.length + 1,
      lastHintTime: Date.now(),
      hintPattern: [...hintUsageLog.map(h => h.level), hint.level]
    });
  }, [currentCode, lastError, timeSpent, exercise?.id, hintUsageLog, updateExerciseProgress]);

  // Calculate hint analytics
  const hintAnalytics = useMemo(() => {
    if (hintUsageLog.length === 0) return null;

    const totalHints = hintUsageLog.length;
    const uniqueLevels = new Set(hintUsageLog.map(h => h.level)).size;
    const averageLevel = hintUsageLog.reduce((sum, h) => sum + h.level, 0) / totalHints;
    
    // Calculate success rate based on progress after hints
    const progressAfterHints = hintUsageLog.filter(h => 
      h.contextRelevance > 0.7
    ).length / totalHints * 100;

    // Determine learning speed
    const learningSpeed = averageLevel < 2.5 ? 'Fast' : 
                         averageLevel < 4.0 ? 'Steady' : 'Thorough';

    return {
      hintsUsed: totalHints,
      uniqueLevels,
      averageLevel: averageLevel.toFixed(1),
      successRate: Math.round(progressAfterHints),
      learningSpeed,
      effectiveHints: hintUsageLog.filter(h => h.contextRelevance > 0.5).length
    };
  }, [hintUsageLog]);

  return {
    availableHints,
    contextualHints,
    shouldSuggestHint,
    getNextHint,
    trackHintUsage,
    hintAnalytics,
    userPreferences,
    setUserPreferences,
    codeAnalysis
  };
}

// Helper functions

function analyzeSyntax(code) {
  const issues = [];
  
  // Common CQL syntax issues
  if (!/library\s+\w+/i.test(code) && code.trim().length > 0) {
    issues.push('missing_library_declaration');
  }
  
  if (/define\s+[^:]*$/m.test(code)) {
    issues.push('incomplete_define_statement');
  }
  
  if (/\w+\s*\(/g.test(code) && !/\w+\s*\([^)]*\)/g.test(code)) {
    issues.push('unclosed_function_call');
  }
  
  return issues;
}

function detectCQLConcepts(code) {
  const concepts = [];
  
  if (/library\s+/i.test(code)) concepts.push('libraries');
  if (/using\s+/i.test(code)) concepts.push('includes');
  if (/define\s+/i.test(code)) concepts.push('definitions');
  if (/\[.*\]/g.test(code)) concepts.push('queries');
  if (/where\s+/i.test(code)) concepts.push('filtering');
  if (/exists\s*\(/i.test(code)) concepts.push('logic');
  if (/'[^']*'|"[^"]*"/g.test(code)) concepts.push('literals');
  if (/\d+/g.test(code)) concepts.push('literals');
  
  return concepts;
}

function estimateCompletion(code, exercise) {
  if (!exercise?.files?.[0]?.solution) return 0;
  
  const solution = exercise.files[0].solution;
  const codeWords = new Set(code.toLowerCase().match(/\b\w+\b/g) || []);
  const solutionWords = new Set(solution.toLowerCase().match(/\b\w+\b/g) || []);
  
  const commonWords = [...codeWords].filter(word => solutionWords.has(word));
  return commonWords.length / solutionWords.size;
}

function analyzeSyntaxError(error, code) {
  if (error.includes('library')) {
    return 'Make sure your library declaration follows the format: library LibraryName version \'1.0.0\'';
  }
  
  if (error.includes('define')) {
    return 'Define statements need a colon followed by an expression: define "Name": expression';
  }
  
  if (error.includes('unexpected')) {
    return 'Check for missing quotes, parentheses, or colons in your CQL syntax';
  }
  
  return 'Review the CQL syntax - there might be a missing punctuation mark or keyword';
}

function generateConceptHints(concepts, codeAnalysis, currentCode) {
  const hints = [];
  
  if (concepts.includes('clinical-data') && !codeAnalysis?.hasUsing) {
    hints.push({
      type: 'concept',
      text: 'Working with clinical data usually requires importing a data model with "using FHIR version \'4.0.1\'"',
      priority: 'medium'
    });
  }
  
  if (concepts.includes('filtering') && !currentCode.includes('where')) {
    hints.push({
      type: 'concept', 
      text: 'Filtering in CQL uses the "where" keyword to specify conditions',
      priority: 'medium'
    });
  }
  
  return hints;
}

function enhanceHintWithContext(hint, codeAnalysis, currentCode) {
  // Enhance base hints with contextual information
  let enhanced = { ...hint };
  
  if (hint.level === 1 && codeAnalysis?.syntaxIssues?.length > 0) {
    enhanced.text += ' (Start by checking your syntax)';
  }
  
  if (hint.level === 2 && codeAnalysis?.completionEstimate < 0.3) {
    enhanced.text += ' (You\'re on the right track, keep building)';
  }
  
  return enhanced;
}

function calculateRelevance(hint, codeAnalysis, lastError) {
  let relevance = 0.5; // Base relevance
  
  // Increase relevance based on current context
  if (hint.text?.toLowerCase().includes('syntax') && lastError?.includes('syntax')) {
    relevance += 0.3;
  }
  
  if (hint.text?.toLowerCase().includes('define') && !codeAnalysis?.hasDefineStatements) {
    relevance += 0.2;
  }
  
  return Math.min(relevance, 1.0);
}

function analyzeErrorPattern(hintLog, currentError) {
  if (hintLog.length < 2) return false;
  
  const recentErrors = hintLog.slice(-3).map(log => log.errorAtTime);
  const similarErrors = recentErrors.filter(error => 
    error && currentError && error.substring(0, 50) === currentError.substring(0, 50)
  );
  
  return similarErrors.length >= 2;
}

function getPriorityWeight(priority) {
  const weights = { high: 3, medium: 2, low: 1 };
  return weights[priority] || 1;
}

export default useHintSystem;