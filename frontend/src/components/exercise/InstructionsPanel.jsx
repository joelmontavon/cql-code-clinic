import React, { useState } from 'react';
import { Card, Collapse, Button } from 'react-bootstrap';
import { Book, ChevronDown, ChevronRight, Lightbulb } from 'react-bootstrap-icons';

/**
 * Instructions Panel Component
 * Displays exercise instructions and content
 * Migrated from instruct-able.vue
 */
export function InstructionsPanel({ 
  exercise,
  className = '',
  showIcon = true 
}) {
  const [expandedHints, setExpandedHints] = useState(new Set());
  
  const toggleHint = (hintIndex) => {
    const newExpanded = new Set(expandedHints);
    if (newExpanded.has(hintIndex)) {
      newExpanded.delete(hintIndex);
    } else {
      newExpanded.add(hintIndex);
    }
    setExpandedHints(newExpanded);
  };
  if (!exercise) {
    return (
      <Card className={`h-100 ${className}`}>
        <Card.Header className="d-flex align-items-center">
          {showIcon && <Book className="me-2" size={20} />}
          <h5 className="mb-0">Instructions</h5>
        </Card.Header>
        <Card.Body className="d-flex align-items-center justify-content-center text-muted">
          <div className="text-center">
            <Book size={48} className="mb-3 opacity-50" />
            <p>Select an exercise to view instructions</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`h-100 ${className}`}>
      <Card.Header>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            {showIcon && <Book className="me-2" size={20} />}
            <h5 className="mb-0">{exercise.title || exercise.name}</h5>
          </div>
          {exercise.difficulty && (
            <div className="d-flex align-items-center">
              {exercise.estimatedTime && (
                <small className="text-muted me-2">{exercise.estimatedTime} min</small>
              )}
              <span className={`badge ${
                exercise.difficulty === 'beginner' ? 'bg-success' :
                exercise.difficulty === 'intermediate' ? 'bg-warning' : 'bg-danger'
              }`}>
                {exercise.difficulty}
              </span>
            </div>
          )}
        </div>
        {exercise.description && (
          <div className="mt-1">
            <small className="text-muted">{exercise.description}</small>
          </div>
        )}
      </Card.Header>
      <Card.Body>
        {/* Legacy content support for old exercises */}
        {exercise.content && exercise.content.length > 0 && (
          <div 
            className="exercise-content mb-4"
            dangerouslySetInnerHTML={{ 
              __html: Array.isArray(exercise.content) 
                ? exercise.content.join('') 
                : exercise.content 
            }}
          />
        )}
        
        {/* New CQF exercise format */}
        {exercise.learningObjectives && exercise.learningObjectives.length > 0 && (
          <div>
            <h6 className="mb-3">Learning Objectives</h6>
            <ul className="list-unstyled">
              {exercise.learningObjectives.map((objective, index) => (
                <li key={index} className="mb-2 d-flex">
                  <span className="badge bg-primary me-2 mt-1" style={{ fontSize: '0.7em' }}>
                    {index + 1}
                  </span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Prerequisites */}
        {exercise.prerequisites && exercise.prerequisites.length > 0 && (
          <div className="mt-4">
            <h6 className="mb-2">Prerequisites</h6>
            <div className="d-flex flex-wrap gap-1">
              {exercise.prerequisites.map((prereq, index) => (
                <span key={index} className="badge bg-secondary">
                  {prereq}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Hints */}
        {exercise.hints && exercise.hints.length > 0 && (
          <div className="mt-4">
            <div className="d-flex align-items-center mb-3">
              <Lightbulb className="text-warning me-2" size={20} />
              <h6 className="mb-0">Hints</h6>
            </div>
            <div className="hints-container">
              {exercise.hints.map((hint, index) => {
                const isExpanded = expandedHints.has(index);
                return (
                  <div key={index} className="hint-item mb-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => toggleHint(index)}
                      className="d-flex align-items-center w-100 text-start"
                      style={{ 
                        border: '1px solid #dee2e6',
                        borderRadius: '0.375rem'
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="me-2" size={14} />
                      ) : (
                        <ChevronRight className="me-2" size={14} />
                      )}
                      <small>
                        Hint for: <code className="text-primary">{hint.trigger}</code>
                      </small>
                    </Button>
                    <Collapse in={isExpanded}>
                      <div>
                        <div className="mt-2 p-3 bg-light border-start border-primary border-3">
                          <small className="text-muted d-block">
                            {hint.message}
                          </small>
                        </div>
                      </div>
                    </Collapse>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* No content fallback */}
        {!exercise.content && !exercise.learningObjectives && (
          <div className="text-muted text-center py-4">
            <Book size={32} className="mb-3 opacity-50" />
            <p>No instructions available for this exercise.</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}