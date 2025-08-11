import React, { useState, useRef } from 'react';
import { 
  Card, Form, Button, Row, Col, Alert, Badge, Modal, 
  Accordion, InputGroup, ListGroup, Tab, Tabs
} from 'react-bootstrap';
import { 
  Plus, Trash, Eye, Save, Upload, Download, 
  ArrowUp, ArrowDown, Copy, Play, CheckCircle
} from 'react-bootstrap-icons';
import MonacoEditor from '@monaco-editor/react';
import { tutorialAPI } from '../services/tutorialAPI.js';
import { InteractiveTutorial } from './InteractiveTutorial.jsx';

/**
 * Tutorial Authoring Component
 * Advanced tool for creating and editing interactive tutorials
 */
export function TutorialAuthoring({ tutorial: existingTutorial, onSave, onCancel }) {
  const [tutorial, setTutorial] = useState(existingTutorial || {
    title: '',
    description: '',
    difficulty: 'beginner',
    category: 'basics',
    estimatedTime: 15,
    type: 'guided',
    tags: [],
    steps: []
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fileInputRef = useRef(null);

  // Tutorial metadata form handlers
  const updateTutorialField = (field, value) => {
    setTutorial(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Step management
  const addStep = (insertAfter = tutorial.steps.length - 1) => {
    const newStep = {
      id: generateStepId(),
      title: 'New Step',
      description: '',
      type: 'instruction',
      code: '',
      codeSection: {
        editable: false,
        language: 'cql'
      },
      instructions: '',
      expectedOutcome: '',
      validation: null,
      checkpoint: null,
      highlights: [],
      callouts: [],
      autoAdvance: null,
      branches: []
    };

    const newSteps = [...tutorial.steps];
    newSteps.splice(insertAfter + 1, 0, newStep);
    
    setTutorial(prev => ({
      ...prev,
      steps: newSteps
    }));

    setCurrentStepIndex(insertAfter + 1);
  };

  const removeStep = (stepIndex) => {
    if (tutorial.steps.length <= 1) return;

    const newSteps = tutorial.steps.filter((_, index) => index !== stepIndex);
    setTutorial(prev => ({
      ...prev,
      steps: newSteps
    }));

    // Adjust current step index
    if (currentStepIndex >= newSteps.length) {
      setCurrentStepIndex(newSteps.length - 1);
    }
  };

  const duplicateStep = (stepIndex) => {
    const stepToDuplicate = tutorial.steps[stepIndex];
    const duplicatedStep = {
      ...stepToDuplicate,
      id: generateStepId(),
      title: `${stepToDuplicate.title} (Copy)`
    };

    const newSteps = [...tutorial.steps];
    newSteps.splice(stepIndex + 1, 0, duplicatedStep);
    
    setTutorial(prev => ({
      ...prev,
      steps: newSteps
    }));

    setCurrentStepIndex(stepIndex + 1);
  };

  const moveStep = (stepIndex, direction) => {
    const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    
    if (newIndex < 0 || newIndex >= tutorial.steps.length) return;

    const newSteps = [...tutorial.steps];
    [newSteps[stepIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[stepIndex]];
    
    setTutorial(prev => ({
      ...prev,
      steps: newSteps
    }));

    setCurrentStepIndex(newIndex);
  };

  const updateStep = (stepIndex, field, value) => {
    const newSteps = [...tutorial.steps];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      [field]: value
    };
    
    setTutorial(prev => ({
      ...prev,
      steps: newSteps
    }));
  };

  // Validation
  const validateTutorial = () => {
    const errors = [];

    if (!tutorial.title.trim()) {
      errors.push('Tutorial title is required');
    }

    if (!tutorial.description.trim()) {
      errors.push('Tutorial description is required');
    }

    if (tutorial.steps.length === 0) {
      errors.push('Tutorial must have at least one step');
    }

    tutorial.steps.forEach((step, index) => {
      if (!step.title.trim()) {
        errors.push(`Step ${index + 1}: Title is required`);
      }

      if (step.type === 'instruction' && !step.instructions.trim()) {
        errors.push(`Step ${index + 1}: Instructions are required for instruction steps`);
      }

      if (step.validation && step.validation.required && !step.validation.criteria) {
        errors.push(`Step ${index + 1}: Validation criteria is required when validation is enabled`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save tutorial
  const handleSave = async () => {
    if (!validateTutorial()) {
      return;
    }

    setSaving(true);
    try {
      let savedTutorial;
      if (existingTutorial?.id) {
        savedTutorial = await tutorialAPI.updateTutorial(existingTutorial.id, tutorial);
      } else {
        savedTutorial = await tutorialAPI.createTutorial(tutorial);
      }

      onSave?.(savedTutorial);
    } catch (error) {
      console.error('Failed to save tutorial:', error);
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  // Import/Export
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setTutorial({
          ...imported,
          id: undefined // Remove ID for imported tutorials
        });
        setShowImportModal(false);
      } catch (error) {
        console.error('Failed to import tutorial:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(tutorial, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tutorial.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tutorial.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Helper functions
  const generateStepId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const getCurrentStep = () => {
    return tutorial.steps[currentStepIndex];
  };

  if (previewMode) {
    return (
      <div className="tutorial-preview">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>Tutorial Preview</h4>
          <Button variant="outline-secondary" onClick={() => setPreviewMode(false)}>
            Exit Preview
          </Button>
        </div>
        <InteractiveTutorial
          tutorial={tutorial}
          onComplete={() => setPreviewMode(false)}
          onExit={() => setPreviewMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="tutorial-authoring">
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">
            {existingTutorial ? 'Edit Tutorial' : 'Create New Tutorial'}
          </h4>
          <div className="d-flex gap-2">
            <Button variant="outline-info" size="sm" onClick={() => setPreviewMode(true)}>
              <Eye className="me-1" />
              Preview
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={handleExport}>
              <Download className="me-1" />
              Export
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="me-1" />
              Import
            </Button>
            <Button variant="success" onClick={handleSave} disabled={saving}>
              <Save className="me-1" />
              {saving ? 'Saving...' : 'Save Tutorial'}
            </Button>
            <Button variant="outline-secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </Card.Header>

        <Card.Body>
          {validationErrors.length > 0 && (
            <Alert variant="danger">
              <h6>Please fix the following errors:</h6>
              <ul className="mb-0">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Tabs defaultActiveKey="general" className="mb-4">
            {/* General Settings Tab */}
            <Tab eventKey="general" title="General">
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Tutorial Title *</Form.Label>
                    <Form.Control
                      type="text"
                      value={tutorial.title}
                      onChange={(e) => updateTutorialField('title', e.target.value)}
                      placeholder="Enter tutorial title"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={tutorial.category}
                      onChange={(e) => updateTutorialField('category', e.target.value)}
                    >
                      <option value="basics">CQL Basics</option>
                      <option value="clinical-data">Clinical Data</option>
                      <option value="quality-measures">Quality Measures</option>
                      <option value="advanced">Advanced CQL</option>
                      <option value="debugging">Debugging</option>
                      <option value="best-practices">Best Practices</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Difficulty</Form.Label>
                    <Form.Select
                      value={tutorial.difficulty}
                      onChange={(e) => updateTutorialField('difficulty', e.target.value)}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Estimated Time (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min="5"
                      max="120"
                      value={tutorial.estimatedTime}
                      onChange={(e) => updateTutorialField('estimatedTime', parseInt(e.target.value))}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Tutorial Type</Form.Label>
                    <Form.Select
                      value={tutorial.type}
                      onChange={(e) => updateTutorialField('type', e.target.value)}
                    >
                      <option value="guided">Guided Walkthrough</option>
                      <option value="interactive">Interactive Practice</option>
                      <option value="branching">Branching Tutorial</option>
                      <option value="assessment">Assessment Tutorial</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Tags</Form.Label>
                    <Form.Control
                      type="text"
                      value={tutorial.tags?.join(', ') || ''}
                      onChange={(e) => updateTutorialField('tags', 
                        e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                      )}
                      placeholder="Enter tags separated by commas"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={tutorial.description}
                  onChange={(e) => updateTutorialField('description', e.target.value)}
                  placeholder="Describe what this tutorial teaches"
                />
              </Form.Group>
            </Tab>

            {/* Steps Tab */}
            <Tab eventKey="steps" title={`Steps (${tutorial.steps.length})`}>
              <Row>
                <Col md={4}>
                  <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Tutorial Steps</h6>
                      <Button variant="outline-primary" size="sm" onClick={() => addStep()}>
                        <Plus />
                      </Button>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <ListGroup variant="flush">
                        {tutorial.steps.map((step, index) => (
                          <ListGroup.Item
                            key={step.id}
                            action
                            active={index === currentStepIndex}
                            onClick={() => setCurrentStepIndex(index)}
                            className="d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <div className="fw-semibold">Step {index + 1}</div>
                              <div className="text-muted small">
                                {step.title || 'Untitled Step'}
                              </div>
                            </div>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveStep(index, 'up');
                                }}
                                disabled={index === 0}
                              >
                                <ArrowUp />
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveStep(index, 'down');
                                }}
                                disabled={index === tutorial.steps.length - 1}
                              >
                                <ArrowDown />
                              </Button>
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateStep(index);
                                }}
                              >
                                <Copy />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeStep(index);
                                }}
                                disabled={tutorial.steps.length === 1}
                              >
                                <Trash />
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={8}>
                  {getCurrentStep() && (
                    <StepEditor
                      step={getCurrentStep()}
                      stepIndex={currentStepIndex}
                      onUpdate={updateStep}
                    />
                  )}
                </Col>
              </Row>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Import Tutorial</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Select a tutorial JSON file to import:</p>
          <Form.Control
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
          />
          <Alert variant="warning" className="mt-3 mb-0">
            <small>
              Importing will replace the current tutorial. Make sure to export your current work first.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/**
 * Step Editor Component
 * Editor for individual tutorial steps
 */
function StepEditor({ step, stepIndex, onUpdate }) {
  const updateStepField = (field, value) => {
    onUpdate(stepIndex, field, value);
  };

  const updateCodeSection = (field, value) => {
    const newCodeSection = {
      ...step.codeSection,
      [field]: value
    };
    onUpdate(stepIndex, 'codeSection', newCodeSection);
  };

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">Step {stepIndex + 1} Editor</h6>
      </Card.Header>
      <Card.Body>
        <Form.Group className="mb-3">
          <Form.Label>Step Title *</Form.Label>
          <Form.Control
            type="text"
            value={step.title || ''}
            onChange={(e) => updateStepField('title', e.target.value)}
            placeholder="Enter step title"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Step Type</Form.Label>
          <Form.Select
            value={step.type || 'instruction'}
            onChange={(e) => updateStepField('type', e.target.value)}
          >
            <option value="instruction">Instruction</option>
            <option value="practice">Practice Exercise</option>
            <option value="checkpoint">Knowledge Check</option>
            <option value="concept">Concept Explanation</option>
            <option value="example">Code Example</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={step.description || ''}
            onChange={(e) => updateStepField('description', e.target.value)}
            placeholder="Brief description of this step"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Instructions</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={step.instructions || ''}
            onChange={(e) => updateStepField('instructions', e.target.value)}
            placeholder="Detailed instructions for the user (HTML supported)"
          />
        </Form.Group>

        <Accordion className="mb-3">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Code Section</Accordion.Header>
            <Accordion.Body>
              <Form.Check
                type="switch"
                id="enable-code-section"
                label="Include code section"
                checked={!!step.codeSection}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateStepField('codeSection', {
                      editable: false,
                      language: 'cql'
                    });
                  } else {
                    updateStepField('codeSection', null);
                  }
                }}
                className="mb-3"
              />

              {step.codeSection && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Initial Code</Form.Label>
                    <MonacoEditor
                      height="200px"
                      language="cql"
                      value={step.code || ''}
                      onChange={(value) => updateStepField('code', value)}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false
                      }}
                    />
                  </Form.Group>

                  <Row>
                    <Col>
                      <Form.Check
                        type="switch"
                        id="code-editable"
                        label="Allow user to edit code"
                        checked={step.codeSection?.editable || false}
                        onChange={(e) => updateCodeSection('editable', e.target.checked)}
                      />
                    </Col>
                    <Col>
                      <Form.Group>
                        <Form.Label>Language</Form.Label>
                        <Form.Select
                          value={step.codeSection?.language || 'cql'}
                          onChange={(e) => updateCodeSection('language', e.target.value)}
                        >
                          <option value="cql">CQL</option>
                          <option value="json">JSON</option>
                          <option value="xml">XML</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Validation & Checkpoints</Accordion.Header>
            <Accordion.Body>
              <Form.Check
                type="switch"
                id="enable-validation"
                label="Enable step validation"
                checked={!!step.validation}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateStepField('validation', {
                      required: true,
                      criteria: '',
                      successMessage: 'Well done!',
                      failureMessage: 'Please try again.'
                    });
                  } else {
                    updateStepField('validation', null);
                  }
                }}
                className="mb-3"
              />

              {step.validation && (
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Success Message</Form.Label>
                      <Form.Control
                        type="text"
                        value={step.validation.successMessage || ''}
                        onChange={(e) => updateStepField('validation', {
                          ...step.validation,
                          successMessage: e.target.value
                        })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Failure Message</Form.Label>
                      <Form.Control
                        type="text"
                        value={step.validation.failureMessage || ''}
                        onChange={(e) => updateStepField('validation', {
                          ...step.validation,
                          failureMessage: e.target.value
                        })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        <Form.Group className="mb-3">
          <Form.Label>Expected Outcome</Form.Label>
          <Form.Control
            type="text"
            value={step.expectedOutcome || ''}
            onChange={(e) => updateStepField('expectedOutcome', e.target.value)}
            placeholder="What should the user achieve in this step?"
          />
        </Form.Group>
      </Card.Body>
    </Card>
  );
}

export default TutorialAuthoring;