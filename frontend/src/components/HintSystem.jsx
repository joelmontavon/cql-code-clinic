import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Alert, Badge, Collapse } from 'react-bootstrap';
import { Lightbulb, ChevronDown, ChevronUp, Clock, Target } from 'react-bootstrap-icons';
import { useHintSystem } from '../hooks/useHintSystem.js';
import { ExerciseContext } from '../contexts/ExerciseContext.js';

/**
 * Progressive Hint System Component
 * Provides contextual, progressive hints to help users learn CQL
 */
export function HintSystem({ 
  exercise, 
  currentCode, 
  lastError, 
  timeSpent,
  onHintUsed 
}) {
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState(new Set());
  const [currentHintLevel, setCurrentHintLevel] = useState(0);
  
  const {
    availableHints,
    contextualHints,
    shouldSuggestHint,
    getNextHint,
    trackHintUsage,
    hintAnalytics
  } = useHintSystem({
    exercise,
    currentCode,
    lastError,
    timeSpent
  });

  // Auto-suggest hints based on context and timing
  useEffect(() => {
    if (shouldSuggestHint && !showHints) {
      // Gentle auto-suggestion after struggle indicators
      const timer = setTimeout(() => {
        setShowHints(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldSuggestHint, showHints]);

  const handleHintReveal = (hintIndex) => {
    const newRevealed = new Set(revealedHints);
    newRevealed.add(hintIndex);
    setRevealedHints(newRevealed);
    
    const hint = availableHints[hintIndex];
    trackHintUsage(hint);
    onHintUsed?.(hint);
  };

  const getHintIcon = (level) => {
    const icons = {
      1: <Lightbulb className="text-info" />,
      2: <Target className="text-warning" />,
      3: <ChevronDown className="text-primary" />,
      4: <ChevronUp className="text-success" />,
      5: <Clock className="text-danger" />
    };
    return icons[level] || <Lightbulb />;
  };

  const getHintVariant = (level) => {
    const variants = {
      1: 'info',
      2: 'warning', 
      3: 'primary',
      4: 'success',
      5: 'danger'
    };
    return variants[level] || 'secondary';
  };

  const getLevelDescription = (level) => {
    const descriptions = {
      1: 'Gentle Nudge',
      2: 'Specific Guidance', 
      3: 'Detailed Explanation',
      4: 'Code Example',
      5: 'Complete Solution'
    };
    return descriptions[level] || 'Hint';
  };

  if (!availableHints?.length && !contextualHints?.length) {
    return null;
  }

  return (
    <Card className="hint-system mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <Lightbulb className="text-warning" />
          <span className="fw-bold">Hints Available</span>
          {shouldSuggestHint && (
            <Badge bg="warning" className="ms-2 animate-pulse">
              Struggling? Try a hint!
            </Badge>
          )}
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setShowHints(!showHints)}
        >
          {showHints ? <ChevronUp /> : <ChevronDown />}
          {showHints ? 'Hide Hints' : 'Show Hints'}
        </Button>
      </Card.Header>

      <Collapse in={showHints}>
        <Card.Body>
          {/* Contextual Hints - Appear first based on current state */}
          {contextualHints?.length > 0 && (
            <div className="contextual-hints mb-4">
              <h6 className="text-muted mb-3">
                <Target className="me-2" />
                Based on your current code:
              </h6>
              {contextualHints.map((hint, index) => (
                <Alert key={`contextual-${index}`} variant="info" className="py-2">
                  <div className="d-flex align-items-start gap-2">
                    <Lightbulb className="text-info mt-1 flex-shrink-0" />
                    <span>{hint.text}</span>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Progressive Hints - Reveal in order */}
          {availableHints?.length > 0 && (
            <div className="progressive-hints">
              <h6 className="text-muted mb-3">
                <ChevronDown className="me-2" />
                Progressive Hints:
              </h6>
              
              {availableHints.map((hint, index) => {
                const isRevealed = revealedHints.has(index);
                const canReveal = index === 0 || revealedHints.has(index - 1);
                
                return (
                  <div key={`hint-${index}`} className="hint-item mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        {getHintIcon(hint.level)}
                        <Badge bg={getHintVariant(hint.level)} className="me-2">
                          Level {hint.level}
                        </Badge>
                        <span className="fw-semibold">{getLevelDescription(hint.level)}</span>
                      </div>
                      
                      {!isRevealed && canReveal && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleHintReveal(index)}
                          className="reveal-hint-btn"
                        >
                          Reveal Hint
                        </Button>
                      )}
                      
                      {!isRevealed && !canReveal && (
                        <Badge bg="secondary">
                          Complete previous hint first
                        </Badge>
                      )}
                    </div>

                    {isRevealed && (
                      <Alert variant={getHintVariant(hint.level)} className="mb-0">
                        <div className="hint-content">
                          {hint.text}
                          
                          {hint.code && (
                            <div className="mt-2">
                              <code className="d-block p-2 bg-light rounded text-dark">
                                {hint.code}
                              </code>
                            </div>
                          )}
                          
                          {hint.explanation && (
                            <div className="mt-2 text-muted small">
                              <strong>Why this helps:</strong> {hint.explanation}
                            </div>
                          )}
                        </div>
                      </Alert>
                    )}
                    
                    {!isRevealed && !canReveal && (
                      <div className="locked-hint-preview bg-light p-2 rounded text-muted">
                        <em>This hint will be available after you reveal the previous one...</em>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hint Analytics - Show user their hint usage */}
          {hintAnalytics && (
            <div className="hint-analytics mt-4 pt-3 border-top">
              <div className="row g-3 text-center">
                <div className="col-4">
                  <div className="text-muted small">Hints Used</div>
                  <div className="fw-bold">{hintAnalytics.hintsUsed}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Success Rate</div>
                  <div className="fw-bold">{hintAnalytics.successRate}%</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Learning Speed</div>
                  <div className="fw-bold">{hintAnalytics.learningSpeed}</div>
                </div>
              </div>
            </div>
          )}
        </Card.Body>
      </Collapse>
    </Card>
  );
}

export default HintSystem;