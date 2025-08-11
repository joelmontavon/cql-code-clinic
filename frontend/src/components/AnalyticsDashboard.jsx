import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Nav, 
  Tab, 
  Alert, 
  Spinner,
  Badge,
  ProgressBar,
  ListGroup,
  Button,
  Form
} from 'react-bootstrap';
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  Target, 
  Clock,
  Award,
  BookOpen,
  Activity,
  Download,
  Calendar,
  PieChart,
  LineChart
} from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext.jsx';
import ProgressTracker from './ProgressTracker.jsx';

/**
 * Analytics Dashboard Component
 * Comprehensive dashboard for learning analytics and progress visualization
 */
export function AnalyticsDashboard({ userRole = 'learner' }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const { user, getAuthHeaders } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load different data based on user role
      const endpoints = getEndpointsForRole(userRole);
      const promises = endpoints.map(endpoint => 
        fetch(endpoint, { headers: getAuthHeaders() })
          .then(res => res.json())
      );

      const results = await Promise.all(promises);
      
      // Process and combine results
      const data = processResults(results, userRole);
      setDashboardData(data);

    } catch (err) {
      setError(err.message);
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEndpointsForRole = (role) => {
    const baseEndpoints = [
      `/api/progress/user/${user?.id}`,
      `/api/progress/analytics/${user?.id}?timeRange=${timeRange}`
    ];

    if (role === 'admin' || role === 'instructor') {
      baseEndpoints.push(
        '/api/progress/statistics',
        '/api/progress/leaderboard'
      );
    }

    return baseEndpoints;
  };

  const processResults = (results, role) => {
    const [userProgress, analytics, ...additionalData] = results;
    
    return {
      personal: userProgress.data,
      analytics: analytics.data,
      platform: role === 'admin' || role === 'instructor' ? additionalData[0]?.data : null,
      leaderboard: role === 'admin' || role === 'instructor' ? additionalData[1]?.data : null
    };
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" size="lg" />
          <div className="mt-2">Loading analytics dashboard...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">
          <Alert.Heading>Dashboard Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={loadDashboardData}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="analytics-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <BarChart className="me-2 text-primary" />
          Analytics Dashboard
        </h1>
        <div className="d-flex align-items-center gap-3">
          <Form.Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </Form.Select>
          <Button variant="outline-primary" size="sm">
            <Download className="me-1" />
            Export
          </Button>
        </div>
      </div>

      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="personal">
              <Target className="me-2" />
              Personal Progress
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="analytics">
              <TrendingUp className="me-2" />
              Learning Analytics
            </Nav.Link>
          </Nav.Item>
          {(userRole === 'admin' || userRole === 'instructor') && (
            <>
              <Nav.Item>
                <Nav.Link eventKey="platform">
                  <Users className="me-2" />
                  Platform Overview
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="reports">
                  <LineChart className="me-2" />
                  Reports
                </Nav.Link>
              </Nav.Item>
            </>
          )}
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="personal">
            <PersonalProgressTab data={dashboardData?.personal} userId={user?.id} />
          </Tab.Pane>
          <Tab.Pane eventKey="analytics">
            <AnalyticsTab data={dashboardData?.analytics} timeRange={timeRange} />
          </Tab.Pane>
          {(userRole === 'admin' || userRole === 'instructor') && (
            <>
              <Tab.Pane eventKey="platform">
                <PlatformOverviewTab data={dashboardData?.platform} />
              </Tab.Pane>
              <Tab.Pane eventKey="reports">
                <ReportsTab userRole={userRole} />
              </Tab.Pane>
            </>
          )}
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
}

/**
 * Personal Progress Tab
 */
function PersonalProgressTab({ data, userId }) {
  if (!data) {
    return <Alert variant="info">No personal progress data available.</Alert>;
  }

  return (
    <div>
      <ProgressTracker userId={userId} />
    </div>
  );
}

/**
 * Analytics Tab with detailed learning insights
 */
function AnalyticsTab({ data, timeRange }) {
  if (!data) {
    return (
      <Alert variant="info">
        <Activity className="me-2" />
        Analytics data will be available once you start completing exercises and tutorials.
      </Alert>
    );
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <Alert variant="primary" className="d-flex align-items-center">
            <TrendingUp className="me-2" size={20} />
            <div>
              <strong>Analytics Period:</strong> {getTimeRangeLabel(timeRange)}
              <br />
              <small>Track your learning patterns and identify areas for improvement</small>
            </div>
          </Alert>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">
                <Activity className="me-2" />
                Daily Activity Pattern
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="chart-placeholder">
                <div className="text-center py-5 text-muted">
                  <LineChart size={48} className="mb-3" />
                  <div>Daily activity chart would be displayed here</div>
                  <small>Shows learning activity over the selected time period</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">
                <PieChart className="me-2" />
                Time Distribution
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="chart-placeholder">
                <div className="text-center py-5 text-muted">
                  <PieChart size={48} className="mb-3" />
                  <div>Time distribution pie chart would be displayed here</div>
                  <small>Shows how time is spent across different categories</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body className="text-center">
              <Clock className="text-primary mb-2" size={32} />
              <h4>{data.summary?.totalDays || 0}</h4>
              <p className="text-muted mb-0">Total Days</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body className="text-center">
              <Target className="text-success mb-2" size={32} />
              <h4>{data.summary?.activeDays || 0}</h4>
              <p className="text-muted mb-0">Active Days</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body className="text-center">
              <TrendingUp className="text-info mb-2" size={32} />
              <h4>{Math.round(data.summary?.avgDailyActivity || 0)}</h4>
              <p className="text-muted mb-0">Avg Daily Activity</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">
                <BarChart className="me-2" />
                Learning Insights
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="insights-list">
                <div className="insight-item">
                  <Badge bg="success" className="me-2">Strength</Badge>
                  <span>Consistent daily learning habits</span>
                </div>
                <div className="insight-item">
                  <Badge bg="info" className="me-2">Trend</Badge>
                  <span>Increasing time spent on advanced exercises</span>
                </div>
                <div className="insight-item">
                  <Badge bg="warning" className="me-2">Opportunity</Badge>
                  <span>Consider working on tutorial completion rate</span>
                </div>
                <div className="insight-item">
                  <Badge bg="primary" className="me-2">Goal</Badge>
                  <span>Maintain current streak and aim for 30 days</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/**
 * Platform Overview Tab (Admin/Instructor only)
 */
function PlatformOverviewTab({ data }) {
  if (!data) {
    return <Alert variant="info">Platform statistics are being calculated...</Alert>;
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <Alert variant="warning">
            <Users className="me-2" />
            <strong>Platform Overview</strong> - Administrative view of platform-wide statistics and user engagement metrics.
          </Alert>
        </Col>
      </Row>

      <Row>
        <Col md={3} className="mb-4">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <Users className="text-primary mb-2" size={32} />
              <h3>{data.totalUsers || 0}</h3>
              <p className="text-muted mb-0">Total Users</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-4">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <Target className="text-success mb-2" size={32} />
              <h3>{data.totalExercisesCompleted || 0}</h3>
              <p className="text-muted mb-0">Exercises Completed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-4">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <BookOpen className="text-info mb-2" size={32} />
              <h3>{data.totalTutorialsCompleted || 0}</h3>
              <p className="text-muted mb-0">Tutorials Completed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-4">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <Clock className="text-warning mb-2" size={32} />
              <h3>{formatTime(data.totalTimeSpent || 0)}</h3>
              <p className="text-muted mb-0">Total Learning Time</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Most Popular Exercises</h6>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {data.mostPopularExercises?.length > 0 ? (
                  data.mostPopularExercises.slice(0, 5).map((exercise, index) => (
                    <ListGroup.Item key={exercise.id} className="d-flex justify-content-between align-items-center px-0">
                      <div>
                        <div className="fw-semibold">{exercise.title}</div>
                        <small className="text-muted">{exercise.category}</small>
                      </div>
                      <Badge bg="primary">{exercise.completions}</Badge>
                    </ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item className="text-center text-muted py-4 px-0">
                    No exercise data available
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Recent Achievements</h6>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {data.recentAchievements?.length > 0 ? (
                  data.recentAchievements.slice(0, 5).map((achievement, index) => (
                    <ListGroup.Item key={index} className="d-flex align-items-center px-0">
                      <Award className="text-warning me-2" size={20} />
                      <div>
                        <div className="fw-semibold">{achievement.userName}</div>
                        <small className="text-muted">unlocked "{achievement.achievementName}"</small>
                      </div>
                    </ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item className="text-center text-muted py-4 px-0">
                    No recent achievements
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Platform Engagement Metrics</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-3">
                  <div>
                    <div className="d-flex justify-content-between">
                      <span>Average Completion Rate</span>
                      <span className="fw-bold">{data.averageCompletionRate || 0}%</span>
                    </div>
                    <ProgressBar now={data.averageCompletionRate || 0} className="mt-1" />
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div>
                    <div className="d-flex justify-content-between">
                      <span>User Retention (7 days)</span>
                      <span className="fw-bold">{data.userRetention7d || 0}%</span>
                    </div>
                    <ProgressBar now={data.userRetention7d || 0} className="mt-1" variant="success" />
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div>
                    <div className="d-flex justify-content-between">
                      <span>Daily Active Users</span>
                      <span className="fw-bold">{data.dailyActiveUsers || 0}%</span>
                    </div>
                    <ProgressBar now={data.dailyActiveUsers || 0} className="mt-1" variant="info" />
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/**
 * Reports Tab (Admin/Instructor only)
 */
function ReportsTab({ userRole }) {
  const [reportType, setReportType] = useState('engagement');
  const [dateRange, setDateRange] = useState('30d');

  const reportTypes = [
    { value: 'engagement', label: 'User Engagement', icon: Activity },
    { value: 'progress', label: 'Learning Progress', icon: TrendingUp },
    { value: 'performance', label: 'Exercise Performance', icon: Target },
    { value: 'retention', label: 'User Retention', icon: Users }
  ];

  return (
    <div>
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Report Type</Form.Label>
            <Form.Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Date Range</Form.Label>
            <Form.Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="6m">Last 6 months</option>
              <option value="1y">Last year</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>&nbsp;</Form.Label>
            <Button variant="primary" className="w-100">
              <Download className="me-1" />
              Export
            </Button>
          </Form.Group>
        </Col>
      </Row>

      <Alert variant="info">
        <BarChart className="me-2" />
        <strong>Advanced Reporting</strong> - Detailed analytics reports would be generated here based on the selected criteria. This feature would include comprehensive charts, data tables, and export capabilities.
      </Alert>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">
                {reportTypes.find(type => type.value === reportType)?.label} Report
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5 text-muted">
                <BarChart size={64} className="mb-3" />
                <h5>Report Generation</h5>
                <p>Advanced reporting features would be implemented here with:</p>
                <ul className="list-unstyled">
                  <li>• Interactive charts and visualizations</li>
                  <li>• Data filtering and segmentation</li>
                  <li>• Export to multiple formats (PDF, CSV, Excel)</li>
                  <li>• Scheduled report generation</li>
                  <li>• Custom report builder</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// Helper functions
function getTimeRangeLabel(timeRange) {
  const labels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '1y': 'Last year'
  };
  return labels[timeRange] || timeRange;
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
  return `${Math.floor(seconds / 60)}m`;
}

export default AnalyticsDashboard;