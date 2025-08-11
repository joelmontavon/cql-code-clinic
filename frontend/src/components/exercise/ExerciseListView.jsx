/**
 * Exercise List View
 * Displays exercises in a searchable, filterable list format
 */

import React, { useState } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  Button,
  ListGroup,
  Spinner,
  Alert,
  Pagination,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { 
  PlayFill, 
  Clock, 
  Award, 
  CheckCircleFill,
  Circle,
  BookmarkFill,
  Tag,
  Eye,
  TrophyFill
} from 'react-bootstrap-icons';
import ExerciseSearchPanel from './ExerciseSearchPanel.jsx';
import { useEnhancedExerciseStore } from '../../stores/enhancedExerciseStore.js';

const ExerciseListView = ({ onExerciseSelect, className = '' }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { 
    completedExercises, 
    exerciseProgress,
    setCurrentExercise,
    getExerciseProgress 
  } = useEnhancedExerciseStore();
  
  const handleSearchResults = (results, loading, error) => {
    setSearchResults(results || []);
    setIsSearchLoading(loading);
    setSearchError(error);
    setCurrentPage(1); // Reset pagination when search changes
  };
  
  const handleExerciseClick = (exercise) => {
    setCurrentExercise(exercise.id);
    onExerciseSelect?.(exercise);
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
  
  const getTypeColor = (type) => {
    switch (type) {
      case 'tutorial': return 'info';
      case 'practice': return 'primary';
      case 'challenge': return 'warning';
      case 'debug': return 'danger';
      case 'assessment': return 'success';
      default: return 'secondary';
    }
  };
  
  const renderExerciseCard = (exercise) => {
    const isCompleted = completedExercises.has(exercise.id);
    const progress = getExerciseProgress(exercise.id);
    
    return (
      <Card 
        key={exercise.id} 
        className={`mb-3 exercise-card ${isCompleted ? 'completed' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => handleExerciseClick(exercise)}
      >
        <Card.Body>
          <Row>
            <Col md={8}>
              <div className="d-flex align-items-center mb-2">
                <div className="me-2">
                  {isCompleted ? (
                    <CheckCircleFill className="text-success" size={20} />
                  ) : (
                    <Circle className="text-muted" size={20} />
                  )}
                </div>
                <Card.Title className="mb-0 flex-grow-1">
                  {exercise.title}
                </Card.Title>
                {progress.score && (
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Score: {progress.score}%</Tooltip>}
                  >
                    <Badge bg={progress.score >= 90 ? 'success' : progress.score >= 70 ? 'warning' : 'secondary'}>
                      <TrophyFill className="me-1" />
                      {progress.score}%
                    </Badge>
                  </OverlayTrigger>
                )}
              </div>
              
              <Card.Text className="text-muted mb-2">
                {exercise.description}
              </Card.Text>
              
              {/* Concepts and Tags */}
              <div className="mb-2">
                {exercise.concepts.slice(0, 3).map(concept => (
                  <Badge 
                    key={concept} 
                    bg="outline-primary" 
                    className="me-1 mb-1"
                    style={{ fontSize: '0.75em' }}
                  >
                    {concept}
                  </Badge>
                ))}
                {exercise.concepts.length > 3 && (
                  <Badge bg="outline-secondary" className="me-1 mb-1" style={{ fontSize: '0.75em' }}>
                    +{exercise.concepts.length - 3} more
                  </Badge>
                )}
              </div>
              
              {/* Prerequisites */}
              {exercise.prerequisites && exercise.prerequisites.length > 0 && (
                <div className="mb-2">
                  <small className="text-muted">
                    <BookmarkFill className="me-1" />
                    Prerequisites: {exercise.prerequisites.length} exercise{exercise.prerequisites.length !== 1 ? 's' : ''}
                  </small>
                </div>
              )}
            </Col>
            
            <Col md={4}>
              <div className="text-end">
                {/* Difficulty and Type */}
                <div className="mb-2">
                  <Badge 
                    bg={getDifficultyColor(exercise.difficulty)} 
                    className="me-2"
                  >
                    <Award className="me-1" />
                    {exercise.difficulty}
                  </Badge>
                  <Badge bg={getTypeColor(exercise.type)}>
                    <Tag className="me-1" />
                    {exercise.type}
                  </Badge>
                </div>
                
                {/* Estimated Time */}
                <div className="mb-2">
                  <small className="text-muted">
                    <Clock className="me-1" />
                    {exercise.estimatedTime || 15} min
                  </small>
                </div>
                
                {/* Progress Info */}
                {progress.attempts > 0 && (
                  <div className="mb-2">
                    <small className="text-muted">
                      Attempts: {progress.attempts}
                    </small>
                  </div>
                )}
                
                {/* Action Button */}
                <Button
                  variant={isCompleted ? "outline-primary" : "primary"}
                  size="sm"
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
  
  // Pagination calculations
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = searchResults.slice(startIndex, endIndex);
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const items = [];
    const maxVisiblePages = 5;
    
    // Calculate page range
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis
    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => setCurrentPage(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="start-ellipsis" />);
      }
    }
    
    // Page range
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item 
          key={page} 
          active={page === currentPage}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </Pagination.Item>
      );
    }
    
    // Last page and ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="end-ellipsis" />);
      }
      items.push(
        <Pagination.Item key={totalPages} onClick={() => setCurrentPage(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }
    
    return (
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.Prev 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          />
          {items}
          <Pagination.Next 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          />
        </Pagination>
      </div>
    );
  };
  
  return (
    <Container fluid className={`exercise-list-view ${className}`}>
      <Row>
        <Col>
          <h2 className="mb-4">Exercise Library</h2>
          
          {/* Search Panel */}
          <ExerciseSearchPanel 
            onResultsChange={handleSearchResults}
            className="mb-4"
          />
          
          {/* Loading State */}
          {isSearchLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading exercises...</span>
              </Spinner>
            </div>
          )}
          
          {/* Error State */}
          {searchError && (
            <Alert variant="danger">
              <Alert.Heading>Search Error</Alert.Heading>
              <p>{searchError.message}</p>
            </Alert>
          )}
          
          {/* Results */}
          {!isSearchLoading && !searchError && (
            <>
              {searchResults.length === 0 ? (
                <Alert variant="info">
                  <Eye className="me-2" />
                  No exercises found matching your criteria. Try adjusting your search or filters.
                </Alert>
              ) : (
                <>
                  {/* Results Summary */}
                  <div className="mb-3">
                    <small className="text-muted">
                      Showing {startIndex + 1}-{Math.min(endIndex, searchResults.length)} of {searchResults.length} exercises
                      {currentPage > 1 && ` (Page ${currentPage} of ${totalPages})`}
                    </small>
                  </div>
                  
                  {/* Exercise Cards */}
                  <div className="exercise-list">
                    {currentResults.map(exercise => renderExerciseCard(exercise))}
                  </div>
                  
                  {/* Pagination */}
                  {renderPagination()}
                </>
              )}
            </>
          )}
        </Col>
      </Row>
      
      <style jsx>{`
        .exercise-card {
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }
        
        .exercise-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          border-color: var(--bs-primary);
        }
        
        .exercise-card.completed {
          border-left: 4px solid var(--bs-success);
        }
        
        .badge-clickable {
          transition: all 0.2s ease;
        }
        
        .badge-clickable:hover {
          transform: scale(1.05);
        }
      `}</style>
    </Container>
  );
};

export default ExerciseListView;