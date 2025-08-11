/**
 * Exercise Analytics Dashboard
 * Displays comprehensive analytics and insights about exercises
 */

import React from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  ProgressBar,
  ListGroup,
  Alert,
  Spinner
} from 'react-bootstrap';
import { 
  BarChart, 
  TrendingUp, 
  Award, 
  Clock, 
  BookOpen, 
  Target,
  PieChart,
  Activity
} from 'react-bootstrap-icons';
import { useExerciseAnalytics } from '../../hooks/useExerciseSearch.js';

const ExerciseAnalyticsDashboard = ({ className = '' }) => {
  const { analytics, isLoading, error } = useExerciseAnalytics();
  
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading analytics...</span>
        </Spinner>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Analytics Error</Alert.Heading>
        <p>Failed to load exercise analytics: {error.message}</p>
      </Alert>
    );
  }
  
  if (!analytics) {
    return (
      <Alert variant="info">
        <BookOpen className="me-2" />
        No analytics data available yet.
      </Alert>
    );
  }
  
  const renderDifficultyDistribution = () => {
    const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
    const colors = ['success', 'warning', 'danger', 'dark'];
    
    return (
      <Card className="h-100">
        <Card.Header>
          <Award className="me-2" />
          Difficulty Distribution
        </Card.Header>
        <Card.Body>
          {difficulties.map((difficulty, index) => {
            const count = analytics.byDifficulty[difficulty] || 0;
            const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
            
            return (
              <div key={difficulty} className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-capitalize">{difficulty}</span>
                  <span>{count} exercises</span>
                </div>
                <ProgressBar 
                  variant={colors[index]}
                  now={percentage} 
                  label={`${percentage.toFixed(1)}%`}
                />
              </div>
            );
          })}
        </Card.Body>
      </Card>
    );
  };
  
  const renderTypeDistribution = () => {
    const types = Object.keys(analytics.byType).sort();
    const colors = ['primary', 'info', 'warning', 'danger', 'success', 'secondary'];
    
    return (
      <Card className="h-100">
        <Card.Header>
          <PieChart className="me-2" />
          Exercise Types
        </Card.Header>
        <Card.Body>
          {types.map((type, index) => {
            const count = analytics.byType[type];
            const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
            
            return (
              <div key={type} className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-capitalize">{type}</span>
                  <Badge bg={colors[index % colors.length]}>{count}</Badge>
                </div>
                <ProgressBar 
                  variant={colors[index % colors.length]}
                  now={percentage} 
                  label={`${percentage.toFixed(1)}%`}
                />
              </div>
            );
          })}
        </Card.Body>
      </Card>
    );
  };
  
  const renderTopConcepts = () => {
    const sortedConcepts = Object.entries(analytics.byConcept)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    return (
      <Card className="h-100">
        <Card.Header>
          <Target className="me-2" />
          Top CQL Concepts
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            {sortedConcepts.map(([concept, count], index) => (
              <ListGroup.Item 
                key={concept}
                className="d-flex justify-content-between align-items-center px-0"
              >
                <div>
                  <Badge bg="outline-primary" className="me-2">
                    #{index + 1}
                  </Badge>
                  <span className="text-capitalize">{concept}</span>
                </div>
                <Badge bg="primary">{count} exercises</Badge>
              </ListGroup.Item>
            ))}
          </ListGroup>
          {sortedConcepts.length === 0 && (
            <p className="text-muted text-center mt-3">No concept data available</p>
          )}
        </Card.Body>
      </Card>
    );
  };
  
  const renderQualityOverview = () => {
    const { high, medium, low } = analytics.qualityDistribution;
    const total = high + medium + low;
    
    return (
      <Card className="h-100">
        <Card.Header>
          <TrendingUp className="me-2" />
          Quality Overview
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span>High Quality (85-100)</span>
              <span>{high} exercises</span>
            </div>
            <ProgressBar 
              variant="success"
              now={total > 0 ? (high / total) * 100 : 0} 
              label={total > 0 ? `${((high / total) * 100).toFixed(1)}%` : '0%'}
            />
          </div>
          
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span>Medium Quality (70-84)</span>
              <span>{medium} exercises</span>
            </div>
            <ProgressBar 
              variant="warning"
              now={total > 0 ? (medium / total) * 100 : 0} 
              label={total > 0 ? `${((medium / total) * 100).toFixed(1)}%` : '0%'}
            />
          </div>
          
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span>Needs Improvement (&lt;70)</span>
              <span>{low} exercises</span>
            </div>
            <ProgressBar 
              variant="danger"
              now={total > 0 ? (low / total) * 100 : 0} 
              label={total > 0 ? `${((low / total) * 100).toFixed(1)}%` : '0%'}
            />
          </div>
          
          {low > 0 && (
            <Alert variant="warning" className="mt-3 mb-0">
              <small>
                <strong>{low}</strong> exercises need quality improvements
              </small>
            </Alert>
          )}
        </Card.Body>
      </Card>
    );
  };
  
  return (
    <Container fluid className={`exercise-analytics-dashboard ${className}`}>
      <Row className="mb-4">
        <Col>
          <h2>Exercise Analytics</h2>
          <p className="text-muted">
            Comprehensive insights into your exercise library
          </p>
        </Col>
      </Row>
      
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <BookOpen size={32} className="text-primary mb-2" />
              <h3 className="mb-1">{analytics.total}</h3>
              <p className="text-muted mb-0">Total Exercises</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Target size={32} className="text-success mb-2" />
              <h3 className="mb-1">{analytics.totalConcepts}</h3>
              <p className="text-muted mb-0">CQL Concepts</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Clock size={32} className="text-info mb-2" />
              <h3 className="mb-1">{analytics.averageEstimatedTime} min</h3>
              <p className="text-muted mb-0">Avg. Duration</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Activity size={32} className="text-warning mb-2" />
              <h3 className="mb-1">{analytics.recentlyAdded}</h3>
              <p className="text-muted mb-0">Recently Added</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Charts and Detailed Analytics */}
      <Row>
        <Col lg={6} className="mb-4">
          {renderDifficultyDistribution()}
        </Col>
        <Col lg={6} className="mb-4">
          {renderTypeDistribution()}
        </Col>
      </Row>
      
      <Row>
        <Col lg={6} className="mb-4">
          {renderTopConcepts()}
        </Col>
        <Col lg={6} className="mb-4">
          {renderQualityOverview()}
        </Col>
      </Row>
      
      {/* Additional Insights */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <BarChart className="me-2" />
              Content Insights
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <div className="text-center">
                    <h5 className="text-primary">{analytics.qualityDistribution.high}</h5>
                    <p className="text-muted mb-0">High Quality Exercises</p>
                    <small className="text-success">
                      {analytics.total > 0 
                        ? `${((analytics.qualityDistribution.high / analytics.total) * 100).toFixed(1)}% of total`
                        : 'No data'
                      }
                    </small>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center">
                    <h5 className="text-warning">{Object.keys(analytics.byType).length}</h5>
                    <p className="text-muted mb-0">Exercise Types</p>
                    <small className="text-muted">
                      Diverse learning experiences
                    </small>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center">
                    <h5 className="text-info">{analytics.totalConcepts}</h5>
                    <p className="text-muted mb-0">CQL Concepts Covered</p>
                    <small className="text-muted">
                      Comprehensive coverage
                    </small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ExerciseAnalyticsDashboard;