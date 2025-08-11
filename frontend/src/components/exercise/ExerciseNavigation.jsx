import React from 'react';
import { Card, ListGroup, Button, Badge, ProgressBar } from 'react-bootstrap';
import { 
  ChevronLeft, 
  ChevronRight,
  CheckCircleFill,
  Circle,
  PlayCircleFill,
  Bookmark
} from 'react-bootstrap-icons';

/**
 * Exercise Navigation Component
 * Handles navigation between exercises and shows progress
 * Migrated from app.js navigation functionality
 */
export function ExerciseNavigation({
  exercises = [],
  currentIndex = 0,
  completedExercises = new Set(),
  onExerciseSelect = () => {},
  onNext = () => {},
  onPrevious = () => {},
  className = '',
  showProgress = true,
  compact = false
}) {
  const totalExercises = exercises.length;
  const completedCount = completedExercises.size;
  const progressPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalExercises - 1;

  // Get exercise status
  const getExerciseStatus = (index) => {
    if (completedExercises.has(index)) return 'completed';
    if (index === currentIndex) return 'current';
    if (index < currentIndex) return 'available';
    return 'locked';
  };

  // Get exercise icon
  const getExerciseIcon = (index) => {
    const status = getExerciseStatus(index);
    switch (status) {
      case 'completed':
        return <CheckCircleFill className="text-success" />;
      case 'current':
        return <PlayCircleFill className="text-primary" />;
      case 'available':
        return <Circle className="text-muted" />;
      default:
        return <Circle className="text-light" />;
    }
  };

  // Get exercise variant
  const getExerciseVariant = (index) => {
    const status = getExerciseStatus(index);
    switch (status) {
      case 'completed':
        return 'success';
      case 'current':
        return 'primary';
      case 'available':
        return 'light';
      default:
        return 'light';
    }
  };

  if (compact) {
    return (
      <Card className={`${className}`}>
        <Card.Body className="d-flex align-items-center justify-content-between py-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
          >
            <ChevronLeft />
          </Button>

          <div className="text-center flex-grow-1 mx-3">
            <div className="fw-medium">
              Exercise {currentIndex + 1} of {totalExercises}
            </div>
            <div className="small text-muted">
              {exercises[currentIndex]?.title || exercises[currentIndex]?.name}
            </div>
          </div>

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
          >
            <ChevronRight />
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <Card.Header>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <Bookmark className="me-2" size={18} />
            <h6 className="mb-0">Exercises</h6>
          </div>
          
          {showProgress && (
            <Badge bg="secondary">
              {completedCount}/{totalExercises}
            </Badge>
          )}
        </div>
        
        {showProgress && (
          <ProgressBar 
            now={progressPercentage} 
            className="mt-2"
            style={{ height: '4px' }}
            variant="success"
          />
        )}
      </Card.Header>

      <Card.Body className="p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <ListGroup variant="flush">
          {exercises.map((exercise, index) => {
            const status = getExerciseStatus(index);
            const isClickable = status !== 'locked';
            
            return (
              <ListGroup.Item
                key={index}
                action={isClickable}
                active={index === currentIndex}
                disabled={!isClickable}
                onClick={() => isClickable && onExerciseSelect(index)}
                className="d-flex align-items-center"
                style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
              >
                <div className="me-3">
                  {getExerciseIcon(index)}
                </div>
                
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-medium">
                        {exercise.title || exercise.name || `Exercise ${index + 1}`}
                      </div>
                      {exercise.description && (
                        <div className="text-muted small">
                          {exercise.description}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-end">
                      <Badge bg={getExerciseVariant(index)} className="ms-2">
                        {index + 1}
                      </Badge>
                      
                      <div className="small text-muted mt-1">
                        {exercise.difficulty && (
                          <span className="me-2">{exercise.difficulty}</span>
                        )}
                        {exercise.estimatedTime && (
                          <span>{exercise.estimatedTime} min</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </Card.Body>

      <Card.Footer>
        <div className="d-flex justify-content-between">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="me-1" />
            Previous
          </Button>

          <div className="d-flex align-items-center text-muted small">
            <span>{currentIndex + 1} of {totalExercises}</span>
          </div>

          <Button
            variant="outline-primary"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
          >
            Next
            <ChevronRight className="ms-1" />
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}