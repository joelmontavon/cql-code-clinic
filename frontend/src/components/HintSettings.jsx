import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Card, Row, Col, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { Gear, Lightbulb, Clock, Target, TrendingUp } from 'react-bootstrap-icons';
import { useHint } from '../contexts/HintContext.jsx';

/**
 * Hint Settings Component
 * Allows users to customize their hint preferences and view their hint analytics
 */
export function HintSettings({ show, onHide }) {
  const {
    preferences,
    userProfile,
    hintAnalytics,
    updatePreferences,
    loading,
    error
  } = useHint();

  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Update local preferences when context preferences change
  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handlePreferenceChange = (key, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      await updatePreferences(localPreferences);
      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(`Failed to save preferences: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalPreferences({
      hintStyle: 'balanced',
      maxHintLevel: 5,
      autoSuggestEnabled: true
    });
  };

  const getHintStyleDescription = (style) => {
    const descriptions = {
      gentle: 'Subtle nudges and encouragement - great for building confidence',
      balanced: 'Mix of guidance and direct help - recommended for most users',
      direct: 'Clear, specific instructions - efficient for experienced learners'
    };
    return descriptions[style] || '';
  };

  const getEffectivenessColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getLearningSpeedColor = (speed) => {
    const colors = {
      Fast: 'success',
      Steady: 'primary',
      Thorough: 'info'
    };
    return colors[speed] || 'secondary';
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <Gear />
          Hint Settings
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {saveMessage && (
          <Alert variant={saveMessage.includes('Failed') ? 'danger' : 'success'} className="mb-4">
            {saveMessage}
          </Alert>
        )}

        <Row>
          {/* Preference Settings */}
          <Col md={7}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">
                  <Lightbulb className="me-2" />
                  Hint Preferences
                </h5>
              </Card.Header>
              <Card.Body>
                {/* Hint Style */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Hint Style</Form.Label>
                  <div className="mt-2">
                    {['gentle', 'balanced', 'direct'].map(style => (
                      <Form.Check
                        key={style}
                        type="radio"
                        id={`style-${style}`}
                        name="hintStyle"
                        label={
                          <div>
                            <span className="text-capitalize fw-semibold">{style}</span>
                            <div className="text-muted small">
                              {getHintStyleDescription(style)}
                            </div>
                          </div>
                        }
                        checked={localPreferences.hintStyle === style}
                        onChange={() => handlePreferenceChange('hintStyle', style)}
                        className="mb-2"
                      />
                    ))}
                  </div>
                </Form.Group>

                {/* Max Hint Level */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    Maximum Hint Level: {localPreferences.maxHintLevel}
                  </Form.Label>
                  <Form.Range
                    min={1}
                    max={5}
                    step={1}
                    value={localPreferences.maxHintLevel}
                    onChange={(e) => handlePreferenceChange('maxHintLevel', parseInt(e.target.value))}
                  />
                  <div className="d-flex justify-content-between text-muted small mt-1">
                    <span>Gentle nudges</span>
                    <span>Complete solutions</span>
                  </div>
                  <div className="mt-2 text-muted small">
                    Level {localPreferences.maxHintLevel}: {getLevelDescription(localPreferences.maxHintLevel)}
                  </div>
                </Form.Group>

                {/* Auto-suggest */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="auto-suggest"
                    label={
                      <div>
                        <span className="fw-semibold">Auto-suggest hints</span>
                        <div className="text-muted small">
                          Automatically suggest hints when you might be struggling
                        </div>
                      </div>
                    }
                    checked={localPreferences.autoSuggestEnabled}
                    onChange={(e) => handlePreferenceChange('autoSuggestEnabled', e.target.checked)}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>

          {/* Analytics and Profile */}
          <Col md={5}>
            {hintAnalytics && (
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">
                    <TrendingUp className="me-2" />
                    Your Hint Analytics
                  </h5>
                </Card.Header>
                <Card.Body>
                  {/* Hints Used */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted">Hints Used</span>
                      <Badge bg="info">{hintAnalytics.hintsUsed}</Badge>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted">Success Rate</span>
                      <Badge bg={getEffectivenessColor(hintAnalytics.successRate)}>
                        {hintAnalytics.successRate}%
                      </Badge>
                    </div>
                    <ProgressBar
                      variant={getEffectivenessColor(hintAnalytics.successRate)}
                      now={hintAnalytics.successRate}
                      style={{ height: '6px' }}
                    />
                  </div>

                  {/* Learning Speed */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted">Learning Speed</span>
                      <Badge bg={getLearningSpeedColor(hintAnalytics.learningSpeed)}>
                        {hintAnalytics.learningSpeed}
                      </Badge>
                    </div>
                  </div>

                  {/* Average Level */}
                  {hintAnalytics.averageLevel && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted">Average Hint Level</span>
                        <Badge bg="secondary">{hintAnalytics.averageLevel}</Badge>
                      </div>
                    </div>
                  )}

                  {/* Personalized Recommendations */}
                  {userProfile && (
                    <div className="mt-4 pt-3 border-top">
                      <h6 className="text-muted mb-2">Recommendations</h6>
                      {getPersonalizedRecommendations(hintAnalytics, userProfile).map((rec, index) => (
                        <Alert key={index} variant="info" className="py-2 mb-2">
                          <div className="d-flex align-items-start gap-2">
                            <Target className="text-info mt-1 flex-shrink-0" />
                            <small>{rec}</small>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Profile Summary */}
            {userProfile && (
              <Card>
                <Card.Header>
                  <h5 className="mb-0">
                    <Clock className="me-2" />
                    Profile Summary
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="row g-3 text-center">
                    <div className="col-6">
                      <div className="text-muted small">Total Hints</div>
                      <div className="fw-bold">{userProfile.totalHintsUsed || 0}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Effective Hints</div>
                      <div className="fw-bold">{hintAnalytics.effectiveHints || 0}</div>
                    </div>
                    <div className="col-12">
                      <div className="text-muted small">Member Since</div>
                      <div className="fw-bold">
                        {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Recently'}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Helper functions
function getLevelDescription(level) {
  const descriptions = {
    1: 'Gentle nudges and encouragement',
    2: 'Specific guidance without giving away solutions',
    3: 'Detailed explanations of concepts',
    4: 'Code examples and patterns',
    5: 'Complete solutions when needed'
  };
  return descriptions[level] || '';
}

function getPersonalizedRecommendations(analytics, profile) {
  const recommendations = [];
  
  if (analytics.successRate < 50) {
    recommendations.push('Consider starting with easier exercises to build confidence');
  }
  
  if (analytics.averageLevel > 4) {
    recommendations.push('Try solving exercises without hints to test your knowledge');
  }
  
  if (analytics.hintsUsed > 20 && analytics.successRate > 80) {
    recommendations.push('You\'re doing great! Consider tackling more challenging exercises');
  }
  
  if (profile.preferredHintStyle === 'gentle' && analytics.successRate < 60) {
    recommendations.push('Try "balanced" hint style for more direct guidance');
  }

  if (recommendations.length === 0) {
    recommendations.push('Keep up the great work! Your hint usage shows good learning progress');
  }
  
  return recommendations;
}

export default HintSettings;