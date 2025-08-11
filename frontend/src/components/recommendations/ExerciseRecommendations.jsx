/**
 * Exercise Recommendations
 * Intelligent exercise suggestions based on user progress and performance
 */

import React from 'react';
import { 
  Card, 
  Badge, 
  Button, 
  Row, 
  Col,
  Alert,
  Spinner,
  ListGroup,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { 
  Lightbulb, 
  PlayFill, 
  Clock, 
  Award, 
  Target,
  TrendingUp,
  CheckCircleFill,
  ExclamationTriangleFill
} from 'react-bootstrap-icons';
import { useExerciseRecommendations } from '../../hooks/useExerciseSearch.js';
import { useEnhancedExerciseStore } from '../../stores/enhancedExerciseStore.js';

const ExerciseRecommendations = ({ 
  userProgress, 
  limit = 5, 
  showReasons = true, 
  className = '' 
}) => {
  const { setCurrentExercise, completedExercises } = useEnhancedExerciseStore();
  
  const { 
    recommendations, 
    isLoading, 
    error, 
    refetch 
  } = useExerciseRecommendations(userProgress, { 
    limit,
    includeCompleted: false 
  });
  
  const handleExerciseSelect = (exercise) => {
    setCurrentExercise(exercise.id);
  };
  
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      case 'expert': return 'dark';
      default: return 'secondary';
    }
  };
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'info';
    return 'secondary';
  };
  
  const renderRecommendationCard = (recommendation, index) => {
    const { exercise, score, reason } = recommendation;
    const isCompleted = completedExercises.has(exercise.id);
    
    return (
      <Card 
        key={exercise.id} 
        className={`mb-3 recommendation-card ${index === 0 ? 'top-recommendation' : ''}`}
      >
        <Card.Body>
          <Row>
            <Col md={8}>
              <div className="d-flex align-items-center mb-2">
                {index === 0 && (
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Top recommendation for you!</Tooltip>}
                  >
                    <Badge bg="warning" className="me-2">
                      <TrendingUp className="me-1" />
                      #1
                    </Badge>
                  </OverlayTrigger>
                )}
                
                <Card.Title className="mb-0 flex-grow-1">
                  {exercise.title}
                </Card.Title>
                
                {isCompleted && (
                  <CheckCircleFill className="text-success ms-2" size={16} />
                )}
              </div>
              
              <Card.Text className="text-muted mb-2">
                {exercise.description}
              </Card.Text>
              
              {showReasons && reason && (
                <Alert variant="light" className="mb-2 py-2">
                  <Lightbulb className="me-2" size={14} />
                  <small>{reason}</small>
                </Alert>
              )}
              
              {/* Concepts Preview */}
              <div className="mb-2">
                {exercise.concepts.slice(0, 3).map(concept => (
                  <Badge 
                    key={concept} 
                    bg="outline-primary" 
                    className="me-1"
                    style={{ fontSize: '0.75em' }}
                  >
                    {concept}
                  </Badge>
                ))}
                {exercise.concepts.length > 3 && (
                  <Badge 
                    bg="outline-secondary" 
                    className="me-1"
                    style={{ fontSize: '0.75em' }}
                  >
                    +{exercise.concepts.length - 3} more
                  </Badge>
                )}
              </div>
            </Col>
            
            <Col md={4}>
              <div className="text-end">
                {/* Recommendation Score */}
                <div className="mb-2">
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Recommendation confidence: {score.toFixed(1)}%</Tooltip>}
                  >
                    <Badge bg={getScoreColor(score)} className="mb-2">
                      <Target className="me-1" />
                      {score.toFixed(0)}%
                    </Badge>
                  </OverlayTrigger>
                </div>
                
                {/* Difficulty and Time */}
                <div className="mb-2">
                  <Badge 
                    bg={getDifficultyColor(exercise.difficulty)} 
                    className="me-2"
                  >
                    <Award className="me-1" />
                    {exercise.difficulty}
                  </Badge>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted">
                    <Clock className="me-1" />
                    {exercise.estimatedTime || 15} min
                  </small>
                </div>
                
                {/* Action Button */}
                <Button
                  variant={index === 0 ? "primary" : "outline-primary"}
                  size="sm"
                  onClick={() => handleExerciseSelect(exercise)}
                  className="w-100"
                >
                  <PlayFill className="me-1" />
                  {isCompleted ? 'Review' : 'Start'}
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };
  
  if (isLoading) {
    return (
      <div className={`exercise-recommendations ${className}`}>
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" />
          <p className="text-muted mt-2 mb-0">Finding recommendations...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`exercise-recommendations ${className}`}>
        <Alert variant="danger">
          <ExclamationTriangleFill className="me-2" />
          <strong>Recommendation Error:</strong> {error.message}
          <Button 
            variant="outline-danger" 
            size="sm" 
            className="ms-2"
            onClick={refetch}
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }
  
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className={`exercise-recommendations ${className}`}>
        <Alert variant="info">
          <Lightbulb className="me-2" />
          <strong>No recommendations available.</strong>
          <br />
          <small>
            Complete more exercises to get personalized recommendations, or browse all exercises to find something interesting.
          </small>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className={`exercise-recommendations ${className}`}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">
          <Lightbulb className="me-2" />
          Recommended for You
        </h5>
        {recommendations.length > 0 && (
          <Badge bg="primary">{recommendations.length} exercises</Badge>
        )}
      </div>
      
      <div className="recommendations-list">
        {recommendations.map((recommendation, index) => 
          renderRecommendationCard(recommendation, index)
        )}
      </div>
      
      <style jsx>{`
        .recommendation-card {
          transition: all 0.2s ease;
          border: 1px solid rgba(0,0,0,0.125);
        }
        
        .recommendation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .top-recommendation {
          border-left: 4px solid var(--bs-warning);
          background: linear-gradient(135deg, rgba(255,193,7,0.05) 0%, rgba(255,255,255,1) 100%);
        }
        
        .recommendation-card.top-recommendation:hover {
          border-left-color: var(--bs-warning);
          box-shadow: 0 6px 12px rgba(255,193,7,0.2);
        }
      `}</style>
    </div>
  );
};

// Higher Order Component for different recommendation contexts
export const NextStepRecommendations = (props) => (
  <ExerciseRecommendations 
    {...props}
    limit={3}
    showReasons={true}
  />
);

export const QuickStartRecommendations = (props) => (
  <ExerciseRecommendations 
    {...props}
    limit={5}
    showReasons={false}
  />
);

export const PersonalizedRecommendations = (props) => (
  <ExerciseRecommendations 
    {...props}
    limit={10}
    showReasons={true}
  />
);

export default ExerciseRecommendations;