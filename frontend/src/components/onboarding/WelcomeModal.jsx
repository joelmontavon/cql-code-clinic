import React, { useState, useEffect } from 'react';
import { 
  Modal, Button, Card, Badge, Row, Col, Form, Alert,
  ProgressBar, Carousel, Image
} from 'react-bootstrap';
import { 
  Play, BookOpen, Trophy, Users, ArrowRight, CheckCircle,
  PersonCheck, Target, Clock, Lightbulb
} from 'react-bootstrap-icons';

/**
 * Welcome Modal Component
 * First-time user onboarding experience with interactive tour and setup
 */
export function WelcomeModal({ 
  show, 
  onHide, 
  onStartTutorial, 
  onSkipTutorial,
  user 
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [userProfile, setUserProfile] = useState({
    role: '',
    experience: '',
    goals: [],
    learningStyle: ''
  });
  const [profileCompleted, setProfileCompleted] = useState(false);

  const welcomeSlides = [
    {
      title: "Welcome to CQL Code Clinic! 🏥",
      content: "Your interactive platform for mastering Clinical Quality Language",
      image: "/assets/welcome/cql-intro.png",
      highlights: [
        "Interactive exercises with real-time feedback",
        "Progressive learning from basics to advanced",
        "Professional CQL development environment",
        "Track your progress and earn achievements"
      ]
    },
    {
      title: "Learn by Doing 💻",
      content: "Practice CQL in our Monaco Editor with full syntax highlighting",
      image: "/assets/welcome/editor-demo.png",
      highlights: [
        "VS Code-powered editor with CQL support",
        "Real-time syntax validation",
        "Smart autocompletion and IntelliSense",
        "Instant code execution and results"
      ]
    },
    {
      title: "Guided Learning Path 🎯",
      content: "Follow structured courses designed for healthcare professionals",
      image: "/assets/welcome/learning-path.png",
      highlights: [
        "Beginner to advanced tracks",
        "Interactive tutorials with hints",
        "Real-world clinical scenarios",
        "Progress tracking and analytics"
      ]
    },
    {
      title: "Professional Development 🏆",
      content: "Build skills that matter in healthcare technology",
      image: "/assets/welcome/achievements.png",
      highlights: [
        "Industry-relevant CQL skills",
        "Achievement badges and certificates",
        "Portfolio-worthy projects",
        "Community recognition"
      ]
    }
  ];

  const roleOptions = [
    { value: 'healthcare-professional', label: '🏥 Healthcare Professional', description: 'Clinician, nurse, or healthcare worker' },
    { value: 'developer', label: '💻 Software Developer', description: 'Programmer new to healthcare data' },
    { value: 'analyst', label: '📊 Data Analyst', description: 'Working with healthcare analytics' },
    { value: 'student', label: '🎓 Student', description: 'Learning healthcare informatics' },
    { value: 'researcher', label: '🔬 Researcher', description: 'Academic or clinical researcher' },
    { value: 'other', label: '👤 Other', description: 'Other professional background' }
  ];

  const experienceOptions = [
    { value: 'none', label: '🌱 Complete Beginner', description: 'New to CQL and clinical data' },
    { value: 'some-clinical', label: '🏥 Clinical Background', description: 'Healthcare experience, new to CQL' },
    { value: 'some-programming', label: '💻 Programming Background', description: 'Coding experience, new to CQL' },
    { value: 'some-cql', label: '📊 Some CQL Knowledge', description: 'Basic CQL exposure' },
    { value: 'experienced', label: '🚀 CQL Experienced', description: 'Looking to advance skills' }
  ];

  const goalOptions = [
    { value: 'quality-measures', label: 'Quality Measures', icon: '📏' },
    { value: 'clinical-decision-support', label: 'Clinical Decision Support', icon: '🎯' },
    { value: 'data-analysis', label: 'Healthcare Data Analysis', icon: '📊' },
    { value: 'fhir-integration', label: 'FHIR Integration', icon: '🔗' },
    { value: 'career-development', label: 'Career Development', icon: '🚀' },
    { value: 'certification', label: 'Professional Certification', icon: '🏆' },
    { value: 'research', label: 'Clinical Research', icon: '🔬' },
    { value: 'education', label: 'Teaching Others', icon: '👨‍🏫' }
  ];

  const learningStyles = [
    { value: 'hands-on', label: '🛠️ Hands-on Practice', description: 'Learn by doing exercises' },
    { value: 'guided', label: '👨‍🏫 Guided Tutorials', description: 'Step-by-step instructions' },
    { value: 'example-driven', label: '📝 Example-driven', description: 'Learn from real examples' },
    { value: 'theory-first', label: '📚 Theory First', description: 'Understand concepts then practice' }
  ];

  const handleProfileUpdate = (field, value) => {
    setUserProfile(prev => {
      const updated = { ...prev, [field]: value };
      
      // Check if profile is complete
      const isComplete = updated.role && updated.experience && 
                        updated.goals.length > 0 && updated.learningStyle;
      setProfileCompleted(isComplete);
      
      return updated;
    });
  };

  const handleGoalToggle = (goalValue) => {
    setUserProfile(prev => {
      const goals = prev.goals.includes(goalValue)
        ? prev.goals.filter(g => g !== goalValue)
        : [...prev.goals, goalValue];
      
      const updated = { ...prev, goals };
      const isComplete = updated.role && updated.experience && 
                        updated.goals.length > 0 && updated.learningStyle;
      setProfileCompleted(isComplete);
      
      return updated;
    });
  };

  const handleStartJourney = () => {
    // Save user profile preferences
    localStorage.setItem('cql-clinic-profile', JSON.stringify(userProfile));
    
    // Start with recommended tutorial based on profile
    const recommendedTutorial = getRecommendedTutorial(userProfile);
    onStartTutorial(recommendedTutorial);
  };

  const getRecommendedTutorial = (profile) => {
    // Simple recommendation logic based on user profile
    if (profile.experience === 'none') {
      return 'welcome-to-cql';
    } else if (profile.experience === 'some-clinical') {
      return 'cql-for-clinicians';
    } else if (profile.experience === 'some-programming') {
      return 'cql-for-developers';
    } else {
      return 'cql-intermediate-start';
    }
  };

  const renderWelcomeSlides = () => (
    <Carousel 
      activeIndex={currentSlide} 
      onSelect={setCurrentSlide}
      indicators={false}
      controls={false}
      className="welcome-carousel"
    >
      {welcomeSlides.map((slide, index) => (
        <Carousel.Item key={index}>
          <div className="text-center py-4">
            <h3 className="mb-3">{slide.title}</h3>
            <p className="text-muted mb-4">{slide.content}</p>
            
            {slide.image && (
              <div className="mb-4">
                <Image 
                  src={slide.image} 
                  alt={slide.title}
                  fluid 
                  rounded 
                  style={{ maxHeight: '200px' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <Row className="g-2">
              {slide.highlights.map((highlight, idx) => (
                <Col md={6} key={idx}>
                  <div className="d-flex align-items-center text-start">
                    <CheckCircle className="text-success me-2 flex-shrink-0" />
                    <small>{highlight}</small>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );

  const renderProfileSetup = () => (
    <div className="profile-setup">
      <div className="text-center mb-4">
        <PersonCheck size={48} className="text-primary mb-3" />
        <h4>Let's personalize your experience</h4>
        <p className="text-muted">Help us recommend the best learning path for you</p>
      </div>

      <Form>
        {/* Role Selection */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold d-flex align-items-center">
            <Target className="me-2" />
            What's your professional background?
          </Form.Label>
          {roleOptions.map(option => (
            <Form.Check
              key={option.value}
              type="radio"
              id={`role-${option.value}`}
              name="role"
              label={
                <div>
                  <div className="fw-semibold">{option.label}</div>
                  <small className="text-muted">{option.description}</small>
                </div>
              }
              checked={userProfile.role === option.value}
              onChange={() => handleProfileUpdate('role', option.value)}
              className="mb-2"
            />
          ))}
        </Form.Group>

        {/* Experience Level */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold d-flex align-items-center">
            <BookOpen className="me-2" />
            What's your CQL experience level?
          </Form.Label>
          {experienceOptions.map(option => (
            <Form.Check
              key={option.value}
              type="radio"
              id={`experience-${option.value}`}
              name="experience"
              label={
                <div>
                  <div className="fw-semibold">{option.label}</div>
                  <small className="text-muted">{option.description}</small>
                </div>
              }
              checked={userProfile.experience === option.value}
              onChange={() => handleProfileUpdate('experience', option.value)}
              className="mb-2"
            />
          ))}
        </Form.Group>

        {/* Learning Goals */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold d-flex align-items-center">
            <Trophy className="me-2" />
            What are your learning goals? (select all that apply)
          </Form.Label>
          <Row className="g-2">
            {goalOptions.map(option => (
              <Col md={6} key={option.value}>
                <Form.Check
                  type="checkbox"
                  id={`goal-${option.value}`}
                  label={`${option.icon} ${option.label}`}
                  checked={userProfile.goals.includes(option.value)}
                  onChange={() => handleGoalToggle(option.value)}
                />
              </Col>
            ))}
          </Row>
        </Form.Group>

        {/* Learning Style */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold d-flex align-items-center">
            <Lightbulb className="me-2" />
            How do you prefer to learn?
          </Form.Label>
          {learningStyles.map(option => (
            <Form.Check
              key={option.value}
              type="radio"
              id={`style-${option.value}`}
              name="learningStyle"
              label={
                <div>
                  <div className="fw-semibold">{option.label}</div>
                  <small className="text-muted">{option.description}</small>
                </div>
              }
              checked={userProfile.learningStyle === option.value}
              onChange={() => handleProfileUpdate('learningStyle', option.value)}
              className="mb-2"
            />
          ))}
        </Form.Group>
      </Form>
    </div>
  );

  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === welcomeSlides.length - 1;
  const showProfileSetup = currentSlide >= welcomeSlides.length;
  const totalSteps = welcomeSlides.length + 1;
  const progress = ((currentSlide + 1) / totalSteps) * 100;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header className="border-bottom-0 pb-0">
        <div className="w-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Modal.Title className="h5 mb-0">
              Get Started with CQL Code Clinic
            </Modal.Title>
            <Button
              variant="link"
              size="sm"
              onClick={onSkipTutorial}
              className="text-muted"
            >
              Skip for now
            </Button>
          </div>
          <ProgressBar
            now={progress}
            variant="primary"
            style={{ height: '4px' }}
            className="mb-0"
          />
          <div className="text-center mt-1">
            <small className="text-muted">
              Step {currentSlide + 1} of {totalSteps}
            </small>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="px-4 py-3">
        {showProfileSetup ? renderProfileSetup() : renderWelcomeSlides()}
      </Modal.Body>

      <Modal.Footer className="border-top-0 pt-0">
        <div className="d-flex justify-content-between w-100">
          <Button
            variant="outline-secondary"
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={isFirstSlide}
          >
            Previous
          </Button>

          <div className="d-flex align-items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`step-dot ${i === currentSlide ? 'active' : ''} ${i < currentSlide ? 'completed' : ''}`}
                onClick={() => setCurrentSlide(i)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>

          {showProfileSetup ? (
            <Button
              variant="success"
              onClick={handleStartJourney}
              disabled={!profileCompleted}
              className="d-flex align-items-center gap-2"
            >
              <Play />
              Start My Journey
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                if (isLastSlide) {
                  setCurrentSlide(currentSlide + 1);
                } else {
                  setCurrentSlide(currentSlide + 1);
                }
              }}
              className="d-flex align-items-center gap-2"
            >
              {isLastSlide ? 'Set Up Profile' : 'Next'}
              <ArrowRight />
            </Button>
          )}
        </div>
      </Modal.Footer>

      <style jsx>{`
        .welcome-carousel .carousel-item {
          min-height: 400px;
          padding: 2rem 1rem;
        }
        
        .step-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #e9ecef;
          transition: all 0.2s ease;
        }
        
        .step-dot.active {
          background-color: #007bff;
          transform: scale(1.2);
        }
        
        .step-dot.completed {
          background-color: #28a745;
        }
        
        .profile-setup {
          max-height: 500px;
          overflow-y: auto;
        }
        
        .profile-setup .form-check {
          padding: 0.75rem;
          border: 1px solid #e9ecef;
          border-radius: 0.375rem;
          margin-bottom: 0.5rem;
          transition: all 0.2s ease;
        }
        
        .profile-setup .form-check:hover {
          border-color: #007bff;
          background-color: #f8f9fa;
        }
        
        .profile-setup .form-check-input:checked ~ .form-check-label {
          color: #007bff;
        }
      `}</style>
    </Modal>
  );
}

export default WelcomeModal;