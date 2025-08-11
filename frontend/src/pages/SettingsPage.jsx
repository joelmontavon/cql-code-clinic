import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Alert } from 'react-bootstrap';
import { Gear, Palette, Book, Download, TrashFill, CheckCircle } from 'react-bootstrap-icons';
import { useSettings } from '../hooks/useSettings';

/**
 * Settings Page Component
 * User preferences and account management
 */
export function SettingsPage() {
  const { settings, updateSetting, saveSettings: saveSettingsHook, resetSettings: resetSettingsHook } = useSettings();
  const [showSaved, setShowSaved] = useState(false);

  // Save settings with UI feedback
  const saveSettings = () => {
    try {
      saveSettingsHook(settings);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Reset all settings with confirmation
  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettingsHook();
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }
  };

  // Export progress data
  const exportProgress = () => {
    const progressData = {
      exportDate: new Date().toISOString(),
      settings: settings,
      // Could add actual progress data here
      exercises: JSON.parse(localStorage.getItem('cql-exercise-store') || '{}'),
    };
    
    const blob = new Blob([JSON.stringify(progressData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cql-clinic-progress-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear all progress
  const clearProgress = () => {
    if (window.confirm('Are you sure you want to clear all exercise progress? This cannot be undone.')) {
      localStorage.removeItem('cql-exercise-store');
      alert('Progress cleared successfully. Refresh the page to see changes.');
    }
  };

  // updateSetting is now provided by the hook

  return (
    <Container fluid className="py-4">
      <Row>
        <Col xs={12}>
          <div className="d-flex align-items-center mb-4">
            <Gear className="me-2" size={24} />
            <h2 className="mb-0">Settings</h2>
          </div>
          
          {showSaved && (
            <Alert variant="success" className="d-flex align-items-center">
              <CheckCircle className="me-2" />
              Settings saved successfully!
            </Alert>
          )}
        </Col>
      </Row>

      <Row>
        {/* Editor Preferences */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <div className="d-flex align-items-center">
                <Palette className="me-2" size={20} />
                <h5 className="mb-0">Editor Preferences</h5>
              </div>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Theme</Form.Label>
                  <Form.Select 
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value)}
                  >
                    <option value="vs-light">Light Theme</option>
                    <option value="vs-dark">Dark Theme</option>
                    <option value="hc-black">High Contrast</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Font Size: {settings.fontSize}px</Form.Label>
                  <Form.Range
                    min="10"
                    max="24"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Font Family</Form.Label>
                  <Form.Select 
                    value={settings.fontFamily}
                    onChange={(e) => updateSetting('fontFamily', e.target.value)}
                  >
                    <option value="Monaco, Menlo, monospace">Monaco (Default)</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="'Fira Code', monospace">Fira Code</option>
                    <option value="'Source Code Pro', monospace">Source Code Pro</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Word Wrap</Form.Label>
                  <Form.Select 
                    value={settings.wordWrap}
                    onChange={(e) => updateSetting('wordWrap', e.target.value)}
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                    <option value="wordWrapColumn">At Column</option>
                  </Form.Select>
                </Form.Group>

                <Form.Check 
                  type="checkbox"
                  label="Enable Auto-complete"
                  checked={settings.autoComplete}
                  onChange={(e) => updateSetting('autoComplete', e.target.checked)}
                  className="mb-2"
                />

                <Form.Check 
                  type="checkbox"
                  label="Highlight Matching Brackets"
                  checked={settings.bracketMatching}
                  onChange={(e) => updateSetting('bracketMatching', e.target.checked)}
                />
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Learning Preferences */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <div className="d-flex align-items-center">
                <Book className="me-2" size={20} />
                <h5 className="mb-0">Learning Preferences</h5>
              </div>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Exercise Difficulty Filter</Form.Label>
                  <Form.Select 
                    value={settings.difficultyFilter}
                    onChange={(e) => updateSetting('difficultyFilter', e.target.value)}
                  >
                    <option value="all">All Exercises</option>
                    <option value="beginner">Beginner Only</option>
                    <option value="intermediate">Intermediate Only</option>
                    <option value="advanced">Advanced Only</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Hint Frequency</Form.Label>
                  <Form.Select 
                    value={settings.hintFrequency}
                    onChange={(e) => updateSetting('hintFrequency', e.target.value)}
                  >
                    <option value="minimal">Minimal - Only when stuck</option>
                    <option value="normal">Normal - Context-aware hints</option>
                    <option value="frequent">Frequent - Proactive guidance</option>
                    <option value="disabled">Disabled - No hints</option>
                  </Form.Select>
                </Form.Group>

                <Form.Check 
                  type="checkbox"
                  label="Auto-advance to next exercise on completion"
                  checked={settings.autoAdvance}
                  onChange={(e) => updateSetting('autoAdvance', e.target.checked)}
                  className="mb-2"
                />

                <Form.Check 
                  type="checkbox"
                  label="Enable detailed progress tracking"
                  checked={settings.progressTracking}
                  onChange={(e) => updateSetting('progressTracking', e.target.checked)}
                  className="mb-2"
                />

                <Form.Check 
                  type="checkbox"
                  label="Show completion toast notifications"
                  checked={settings.showCompletionToasts}
                  onChange={(e) => updateSetting('showCompletionToasts', e.target.checked)}
                  className="mb-2"
                />

                <Form.Check 
                  type="checkbox"
                  label="Play success sounds"
                  checked={settings.playSuccessSounds}
                  onChange={(e) => updateSetting('playSuccessSounds', e.target.checked)}
                />
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Data Management */}
        <Col xs={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Data Management</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex flex-wrap gap-3">
                <Button 
                  variant="primary" 
                  onClick={saveSettings}
                  className="d-flex align-items-center"
                >
                  <CheckCircle className="me-2" size={16} />
                  Save Settings
                </Button>

                <Button 
                  variant="outline-secondary"
                  onClick={exportProgress}
                  className="d-flex align-items-center"
                >
                  <Download className="me-2" size={16} />
                  Export Progress
                </Button>

                <Button 
                  variant="outline-warning"
                  onClick={resetSettings}
                  className="d-flex align-items-center"
                >
                  Reset Settings
                </Button>

                <Button 
                  variant="outline-danger"
                  onClick={clearProgress}
                  className="d-flex align-items-center"
                >
                  <TrashFill className="me-2" size={16} />
                  Clear All Progress
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}