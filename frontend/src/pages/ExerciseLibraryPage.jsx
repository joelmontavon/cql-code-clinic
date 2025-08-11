/**
 * Exercise Library Page
 * Main page for browsing, searching, and managing exercises
 */

import React, { useState } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Nav,
  Card,
  Button
} from 'react-bootstrap';
import { 
  Grid3x3GapFill,
  ListUl,
  BarChartFill,
  Lightbulb,
  Plus
} from 'react-bootstrap-icons';
import ExerciseListView from '../components/exercise/ExerciseListView.jsx';
import ExerciseAnalyticsDashboard from '../components/analytics/ExerciseAnalyticsDashboard.jsx';
import ExerciseRecommendations from '../components/recommendations/ExerciseRecommendations.jsx';
import { useEnhancedExerciseStore } from '../stores/enhancedExerciseStore.js';
import { useNavigate } from 'react-router-dom';

const ExerciseLibraryPage = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const navigate = useNavigate();
  
  const { 
    exerciseProgress, 
    completedExercises,
    getSessionStatistics 
  } = useEnhancedExerciseStore();
  
  const handleExerciseSelect = (exercise) => {
    navigate(`/exercise/${exercise.id}`);
  };
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'browse':
        return (
          <ExerciseListView 
            onExerciseSelect={handleExerciseSelect}
          />
        );
        
      case 'recommendations':
        return (
          <Container fluid>
            <Row>
              <Col lg={8}>
                <ExerciseRecommendations 
                  userProgress={{ exerciseProgress, completedExercises }}
                  limit={10}
                  showReasons={true}
                />
              </Col>
              <Col lg={4}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">Your Progress</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Completed</span>
                        <strong>{completedExercises.size}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span>In Progress</span>
                        <strong>
                          {Object.keys(exerciseProgress).length - completedExercises.size}
                        </strong>
                      </div>
                    </div>
                    
                    <hr />
                    
                    <div className="mb-3">
                      <h6>Session Stats</h6>
                      {(() => {
                        const stats = getSessionStatistics();
                        return (
                          <div>
                            <div className="d-flex justify-content-between">
                              <span>Exercises Attempted</span>
                              <strong>{stats.exercisesAttempted}</strong>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span>Completion Rate</span>
                              <strong>{stats.completionRate.toFixed(1)}%</strong>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span>Total Executions</span>
                              <strong>{stats.totalExecutions}</strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="w-100"
                      onClick={() => setActiveTab('browse')}
                    >
                      Browse All Exercises
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        );
        
      case 'analytics':
        return <ExerciseAnalyticsDashboard />;
        
      default:
        return null;
    }
  };
  
  return (
    <div className="exercise-library-page">
      {/* Header */}
      <Container fluid className="bg-light py-4 mb-4">
        <Container>
          <Row>
            <Col>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="mb-1">Exercise Library</h1>
                  <p className="text-muted mb-0">
                    Explore, practice, and master CQL through interactive exercises
                  </p>
                </div>
                
                <Button 
                  variant="primary"
                  onClick={() => navigate('/exercise/create')}
                  className="d-none d-md-block"
                >
                  <Plus className="me-1" />
                  Create Exercise
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </Container>
      
      {/* Navigation Tabs */}
      <Container fluid>
        <Container>
          <Nav variant="tabs" className="mb-4">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'browse'}
                onClick={() => setActiveTab('browse')}
                className="d-flex align-items-center"
              >
                <ListUl className="me-2" />
                Browse Exercises
              </Nav.Link>
            </Nav.Item>
            
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'recommendations'}
                onClick={() => setActiveTab('recommendations')}
                className="d-flex align-items-center"
              >
                <Lightbulb className="me-2" />
                Recommendations
              </Nav.Link>
            </Nav.Item>
            
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'analytics'}
                onClick={() => setActiveTab('analytics')}
                className="d-flex align-items-center"
              >
                <BarChartFill className="me-2" />
                Analytics
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Container>
      </Container>
      
      {/* Tab Content */}
      <Container fluid className="flex-grow-1">
        {renderTabContent()}
      </Container>
      
      <style jsx>{`
        .exercise-library-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .nav-tabs .nav-link {
          border: none;
          color: var(--bs-secondary);
          font-weight: 500;
        }
        
        .nav-tabs .nav-link.active {
          background-color: transparent;
          border-bottom: 3px solid var(--bs-primary);
          color: var(--bs-primary);
        }
        
        .nav-tabs .nav-link:hover:not(.active) {
          border-color: transparent;
          color: var(--bs-primary);
        }
      `}</style>
    </div>
  );
};

export default ExerciseLibraryPage;