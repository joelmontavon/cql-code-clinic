import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  ProgressBar, 
  Badge, 
  Alert, 
  Spinner,
  Nav,
  Tab,
  ListGroup,
  Container
} from 'react-bootstrap';
import { 
  Trophy, 
  Target, 
  Clock, 
  BookOpen, 
  Award, 
  TrendingUp,
  Calendar,
  Star,
  CheckCircle,
  PlayCircle,
  Brain,
  Zap
} from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Progress Tracker Component
 * Displays comprehensive user progress, analytics, and achievements
 */
export function ProgressTracker({ userId, compactView = false }) {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    if (userId) {
      loadProgressData();
    }
  }, [userId]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/progress/user/${userId}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        setProgressData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load progress data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load progress data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading progress...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Unable to Load Progress</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (!progressData) {
    return (
      <Alert variant="info">
        <Alert.Heading>No Progress Data</Alert.Heading>
        <p>Start completing exercises to see your progress here!</p>
      </Alert>
    );
  }

  if (compactView) {
    return <CompactProgressView data={progressData} />;
  }

  return (
    <Container fluid className="progress-tracker">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <Target className="me-2 text-primary" />
          Learning Progress
        </h2>
        <Badge bg="primary" className="fs-6">
          Level {progressData.skillLevel?.currentLevel} - {progressData.skillLevel?.levelName}
        </Badge>
      </div>

      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="overview">Overview</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="exercises">Exercises</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="tutorials">Tutorials</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="achievements">Achievements</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="analytics">Analytics</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            <OverviewTab data={progressData} />
          </Tab.Pane>
          <Tab.Pane eventKey="exercises">
            <ExercisesTab data={progressData.exercise} />
          </Tab.Pane>
          <Tab.Pane eventKey="tutorials">
            <TutorialsTab data={progressData.tutorial} />
          </Tab.Pane>
          <Tab.Pane eventKey="achievements">
            <AchievementsTab achievements={progressData.achievements} />
          </Tab.Pane>
          <Tab.Pane eventKey="analytics">
            <AnalyticsTab userId={userId} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
}

/**
 * Compact Progress View for sidebars/dashboards
 */
function CompactProgressView({ data }) {
  return (
    <Card className="compact-progress">
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          <Trophy className="text-warning me-2" size={20} />
          <div>
            <div className="fw-bold">Level {data.skillLevel?.currentLevel}</div>
            <small className="text-muted">{data.skillLevel?.levelName}</small>
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <small>Progress to next level</small>
            <small>{Math.round(data.skillLevel?.progressToNextLevel || 0)}%</small>
          </div>
          <ProgressBar
            now={data.skillLevel?.progressToNextLevel || 0}
            size="sm"
            variant="primary"
          />
        </div>

        <Row className="g-2">
          <Col xs={6}>
            <div className="text-center">
              <div className="fw-bold text-success">{data.exercise?.summary?.completedCount || 0}</div>
              <small className="text-muted">Completed</small>
            </div>
          </Col>
          <Col xs={6}>
            <div className="text-center">
              <div className="fw-bold text-primary">{data.learningStreak?.currentStreak || 0}</div>
              <small className="text-muted">Day Streak</small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

/**
 * Overview Tab Component
 */
function OverviewTab({ data }) {
  const { exercise, tutorial, skillLevel, learningStreak, totalStats } = data;

  return (
    <div>
      {/* Skill Level and XP */}
      <Row className="mb-4">
        <Col>
          <Card className="skill-level-card">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-1">
                    <Brain className="me-2 text-primary" />
                    Level {skillLevel?.currentLevel} - {skillLevel?.levelName}
                  </h5>
                  <p className="text-muted mb-2">{skillLevel?.experiencePoints} XP</p>
                </div>
                <div className="skill-level-badge">
                  <div className="level-circle">
                    <span className="level-number">{skillLevel?.currentLevel}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Progress to Level {skillLevel?.currentLevel + 1}</small>
                  <small>{Math.round(skillLevel?.progressToNextLevel || 0)}%</small>
                </div>
                <ProgressBar
                  now={skillLevel?.progressToNextLevel || 0}
                  variant="primary"
                  style={{ height: '8px' }}
                />
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted">{skillLevel?.currentLevelXP} XP</small>
                  <small className="text-muted">{skillLevel?.nextLevelXP} XP</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <CheckCircle className="text-success mb-2" size={32} />
              <h4 className="mb-1">{exercise?.summary?.completedCount || 0}</h4>
              <p className="text-muted mb-0">Exercises Completed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <Zap className="text-primary mb-2" size={32} />
              <h4 className="mb-1">{learningStreak?.currentStreak || 0}</h4>
              <p className="text-muted mb-0">Day Streak</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <Clock className="text-warning mb-2" size={32} />
              <h4 className="mb-1">{formatTime(totalStats?.totalTimeSpent || 0)}</h4>
              <p className="text-muted mb-0">Time Spent</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card text-center">
            <Card.Body>
              <Star className="text-info mb-2" size={32} />
              <h4 className="mb-1">{exercise?.summary?.avgScore || 0}%</h4>
              <p className="text-muted mb-0">Average Score</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Progress Charts */}
      <Row>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">
                <Target className="me-2" />
                Exercise Progress
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="progress-summary">
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Completion Rate</span>
                    <span className="fw-bold">{exercise?.summary?.completionRate || 0}%</span>
                  </div>
                  <ProgressBar
                    now={exercise?.summary?.completionRate || 0}
                    variant="success"
                    className="mt-1"
                  />
                </div>
                
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{exercise?.summary?.completedCount || 0}</span>
                    <span className="stat-label">Completed</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{exercise?.summary?.inProgressCount || 0}</span>
                    <span className="stat-label">In Progress</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{exercise?.summary?.avgAttempts || 0}</span>
                    <span className="stat-label">Avg Attempts</span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">
                <BookOpen className="me-2" />
                Tutorial Progress
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="progress-summary">
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Completion Rate</span>
                    <span className="fw-bold">{tutorial?.summary?.completionRate || 0}%</span>
                  </div>
                  <ProgressBar
                    now={tutorial?.summary?.completionRate || 0}
                    variant="info"
                    className="mt-1"
                  />
                </div>
                
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{tutorial?.summary?.completedCount || 0}</span>
                    <span className="stat-label">Completed</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{tutorial?.summary?.inProgressCount || 0}</span>
                    <span className="stat-label">In Progress</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{tutorial?.summary?.totalTutorials || 0}</span>
                    <span className="stat-label">Available</span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Learning Streak */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">
                <Calendar className="me-2" />
                Learning Activity
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <div className="streak-stat">
                    <div className="streak-number">{learningStreak?.currentStreak || 0}</div>
                    <div className="streak-label">Current Streak</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="streak-stat">
                    <div className="streak-number">{learningStreak?.longestStreak || 0}</div>
                    <div className="streak-label">Longest Streak</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="streak-stat">
                    <div className="streak-number">{learningStreak?.activeDays || 0}</div>
                    <div className="streak-label">Active Days</div>
                  </div>
                </Col>
              </Row>
              
              {learningStreak?.weeklyActivity && (
                <div className="weekly-activity mt-4">
                  <h6>Weekly Activity</h6>
                  <div className="activity-bars">
                    {learningStreak.weeklyActivity.map((count, index) => (
                      <div key={index} className="activity-day">
                        <div
                          className="activity-bar"
                          style={{
                            height: `${Math.max(4, (count / Math.max(...learningStreak.weeklyActivity)) * 40)}px`
                          }}
                        />
                        <small>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/**
 * Exercises Tab Component
 */
function ExercisesTab({ data }) {
  if (!data) return <div>No exercise data available</div>;

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Exercise Statistics</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} sm={6} className="mb-3">
                  <div className="text-center">
                    <div className="h4 text-success">{data.summary?.completedCount || 0}</div>
                    <div className="text-muted">Completed</div>
                  </div>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <div className="text-center">
                    <div className="h4 text-primary">{data.summary?.inProgressCount || 0}</div>
                    <div className="text-muted">In Progress</div>
                  </div>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <div className="text-center">
                    <div className="h4 text-info">{data.summary?.avgScore || 0}%</div>
                    <div className="text-muted">Average Score</div>
                  </div>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <div className="text-center">
                    <div className="h4 text-warning">{formatTime(data.summary?.avgTimeSpent || 0)}</div>
                    <div className="text-muted">Avg Time</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Recently Completed</h6>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {data.completed?.slice(0, 5).map(progress => (
                  <ListGroup.Item key={progress.exerciseId} className="px-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{progress.exercise.title}</div>
                        <small className="text-muted">
                          Completed {formatTimeAgo(progress.completedAt)}
                        </small>
                      </div>
                      <div className="text-end">
                        <Badge bg="success">{progress.bestScore}%</Badge>
                        <div>
                          <small className="text-muted">
                            {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
                          </small>
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                )) || (
                  <ListGroup.Item className="text-center text-muted py-4">
                    No completed exercises yet
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">In Progress</h6>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {data.inProgress?.slice(0, 5).map(progress => (
                  <ListGroup.Item key={progress.exerciseId} className="px-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{progress.exercise.title}</div>
                        <small className="text-muted">
                          Last attempt {formatTimeAgo(progress.lastAttemptAt)}
                        </small>
                      </div>
                      <div className="text-end">
                        <PlayCircle className="text-primary" size={20} />
                        <div>
                          <small className="text-muted">
                            {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
                          </small>
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                )) || (
                  <ListGroup.Item className="text-center text-muted py-4">
                    No exercises in progress
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/**
 * Tutorials Tab Component
 */
function TutorialsTab({ data }) {
  if (!data) return <div>No tutorial data available</div>;

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Tutorial Progress</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-3">
                  <div className="text-center">
                    <div className="h4 text-success">{data.summary?.completedCount || 0}</div>
                    <div className="text-muted">Completed</div>
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div className="text-center">
                    <div className="h4 text-primary">{data.summary?.inProgressCount || 0}</div>
                    <div className="text-muted">In Progress</div>
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div className="text-center">
                    <div className="h4 text-info">{data.summary?.completionRate || 0}%</div>
                    <div className="text-muted">Completion Rate</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Completed Tutorials</h6>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {data.completed?.slice(0, 5).map(progress => (
                  <ListGroup.Item key={progress.tutorialId} className="px-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{progress.tutorial.title}</div>
                        <small className="text-muted">
                          Completed {formatTimeAgo(progress.completedAt)}
                        </small>
                      </div>
                      <CheckCircle className="text-success" size={20} />
                    </div>
                  </ListGroup.Item>
                )) || (
                  <ListGroup.Item className="text-center text-muted py-4">
                    No completed tutorials yet
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Continue Learning</h6>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {data.inProgress?.slice(0, 5).map(progress => (
                  <ListGroup.Item key={progress.tutorialId} className="px-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{progress.tutorial.title}</div>
                        <small className="text-muted">
                          Step {progress.currentStep + 1} of {progress.tutorial.steps?.length || 0}
                        </small>
                        <div className="mt-1">
                          <ProgressBar
                            now={(progress.currentStep / (progress.tutorial.steps?.length || 1)) * 100}
                            size="sm"
                          />
                        </div>
                      </div>
                      <PlayCircle className="text-primary" size={20} />
                    </div>
                  </ListGroup.Item>
                )) || (
                  <ListGroup.Item className="text-center text-muted py-4">
                    No tutorials in progress
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/**
 * Achievements Tab Component
 */
function AchievementsTab({ achievements }) {
  if (!achievements || achievements.length === 0) {
    return (
      <Alert variant="info">
        <Award className="me-2" />
        No achievements unlocked yet. Keep learning to earn your first achievement!
      </Alert>
    );
  }

  const recentAchievements = achievements.slice(0, 10);

  return (
    <div>
      <Row>
        {recentAchievements.map(achievement => (
          <Col md={6} lg={4} key={achievement.id} className="mb-3">
            <Card className="achievement-card">
              <Card.Body className="text-center">
                <div className="achievement-icon mb-3">
                  <span className="achievement-emoji">{achievement.icon || '🏆'}</span>
                </div>
                <h6 className="achievement-name">{achievement.name}</h6>
                <p className="achievement-description text-muted small">
                  {achievement.description}
                </p>
                <div className="achievement-meta">
                  <Badge bg="primary" className="me-2">{achievement.points} XP</Badge>
                  <small className="text-muted">
                    {formatTimeAgo(achievement.unlockedAt)}
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

/**
 * Analytics Tab Component
 */
function AnalyticsTab({ userId }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    if (userId) {
      loadAnalyticsData();
    }
  }, [userId, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/progress/analytics/${userId}?timeRange=${timeRange}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <div className="mt-2">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5>Learning Analytics</h5>
        <Nav variant="pills" className="small">
          {['7d', '30d', '90d', '1y'].map(range => (
            <Nav.Item key={range}>
              <Nav.Link
                active={timeRange === range}
                onClick={() => setTimeRange(range)}
                className="py-1 px-2"
              >
                {range}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      <Alert variant="info" className="text-center">
        <TrendingUp className="me-2" />
        Detailed analytics visualization would be implemented here with charts and graphs
        showing learning patterns, progress trends, and performance insights.
      </Alert>
    </div>
  );
}

// Helper functions
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default ProgressTracker;