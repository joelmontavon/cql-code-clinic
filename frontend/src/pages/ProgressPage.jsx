import React from 'react';
import { Container, Row, Col, Card, ProgressBar, Badge } from 'react-bootstrap';
import { 
  CheckCircleFill, 
  Clock, 
  Circle 
} from 'react-bootstrap-icons';

const mockExercises = [
  { id: 1, name: 'Whitespace and comments', status: 'completed', time: '5 min' },
  { id: 2, name: 'Operators', status: 'in_progress', time: '8 min' },
  { id: 3, name: 'Case-Sensitivity', status: 'not_started', time: '6 min' },
];

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircleFill className="text-success" size={24} />;
    case 'in_progress':
      return <Clock className="text-primary" size={24} />;
    default:
      return <Circle className="text-muted" size={24} />;
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'completed':
      return <Badge bg="success">Completed</Badge>;
    case 'in_progress':
      return <Badge bg="primary">In Progress</Badge>;
    default:
      return <Badge bg="secondary">Not Started</Badge>;
  }
};

export function ProgressPage() {
  const completedCount = mockExercises.filter(ex => ex.status === 'completed').length;
  const totalCount = mockExercises.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h1 className="h2 fw-bold text-dark mb-4">Your Progress</h1>
          
          {/* Progress Overview */}
          <Row className="mb-4">
            <Col lg={4} className="mb-3">
              <Card className="card-exercise h-100">
                <Card.Body className="d-flex align-items-center">
                  <CheckCircleFill className="text-success me-3" size={32} />
                  <div>
                    <div className="h4 mb-1 fw-bold">{completedCount} / {totalCount}</div>
                    <div className="text-muted small">Completed</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={4} className="mb-3">
              <Card className="card-exercise h-100">
                <Card.Body className="d-flex align-items-center">
                  <Clock className="text-primary me-3" size={32} />
                  <div>
                    <div className="h4 mb-1 fw-bold">5 minutes</div>
                    <div className="text-muted small">Time Spent</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={4} className="mb-3">
              <Card className="card-exercise h-100">
                <Card.Body className="d-flex align-items-center">
                  <div className="bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" 
                       style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>
                    %
                  </div>
                  <div>
                    <div className="h4 mb-1 fw-bold">{progressPercent}%</div>
                    <div className="text-muted small">Progress</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Exercise Timeline */}
          <Card className="card-exercise">
            <Card.Header className="bg-white">
              <h5 className="mb-1 fw-semibold">Exercise Timeline</h5>
              <p className="text-muted small mb-0">Track your learning journey through CQL exercises</p>
            </Card.Header>
            
            <Card.Body>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-medium">Overall Progress</span>
                  <span className="text-muted">{progressPercent}%</span>
                </div>
                <ProgressBar 
                  now={progressPercent} 
                  variant="primary"
                  style={{ height: '8px' }}
                />
              </div>
              
              {/* Exercise list */}
              <div className="exercise-timeline">
                {mockExercises.map((exercise, index) => (
                  <div key={exercise.id} className={`exercise-step mb-4 ${exercise.status}`}>
                    <div className="d-flex align-items-start">
                      <div className="me-3 mt-1">
                        {getStatusIcon(exercise.status)}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="mb-1 fw-medium">
                              Exercise {exercise.id}: {exercise.name}
                            </h6>
                            <div className="d-flex align-items-center gap-2">
                              {getStatusBadge(exercise.status)}
                              <span className="text-muted small">{exercise.time}</span>
                            </div>
                          </div>
                        </div>
                        {exercise.status === 'in_progress' && (
                          <div className="mt-2">
                            <ProgressBar 
                              now={60} 
                              variant="primary"
                              size="sm"
                              style={{ height: '4px' }}
                            />
                            <div className="text-muted small mt-1">60% complete</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}