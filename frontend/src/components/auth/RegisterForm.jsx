import React, { useState } from 'react';
import { Form, Button, Card, Alert, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import { Eye, EyeSlash, Shield, Check, X, PersonPlus } from 'react-bootstrap-icons';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * Registration Form Component
 * Provides secure user registration with validation and progress indicators
 */
export function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    role: 'learner',
    agreeToTerms: false,
    subscribeNewsletter: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register, isAuthenticated, loading } = useAuth();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Update password strength in real-time
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const calculatePasswordStrength = (password) => {
    let score = 0;
    if (!password) return score;

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character diversity
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Common patterns (negative score)
    if (/(.)\1{2,}/.test(password)) score--; // Repeated characters
    if (/^[a-zA-Z]+$/.test(password) && password.length < 12) score--; // Only letters

    return Math.max(0, Math.min(5, score));
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'danger';
      case 2:
        return 'warning';
      case 3:
        return 'info';
      case 4:
      case 5:
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      case 5:
        return 'Very Strong';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (passwordStrength < 2) {
      newErrors.password = 'Password is too weak. Please choose a stronger password.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms acceptance
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        organization: formData.organization,
        role: formData.role,
        subscribeNewsletter: formData.subscribeNewsletter
      });

      if (result.success) {
        onSuccess?.(result.user);
      } else {
        setErrors({ general: result.error || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ 
        general: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { text: 'At least 8 characters', met: formData.password.length >= 8 },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(formData.password) },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
    { text: 'Contains number', met: /[0-9]/.test(formData.password) },
    { text: 'Contains special character', met: /[^A-Za-z0-9]/.test(formData.password) }
  ];

  return (
    <Card className="auth-form">
      <Card.Header className="text-center">
        <h4 className="mb-1">
          <PersonPlus className="me-2 text-primary" />
          Create Account
        </h4>
        <p className="text-muted mb-0">Join CQL Code Clinic</p>
      </Card.Header>

      <Card.Body>
        {errors.general && (
          <Alert variant="danger" className="mb-3">
            {errors.general}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Name Fields */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  isInvalid={!!errors.firstName}
                  placeholder="Enter your first name"
                  autoComplete="given-name"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.firstName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  isInvalid={!!errors.lastName}
                  placeholder="Enter your last name"
                  autoComplete="family-name"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.lastName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Email Field */}
          <Form.Group className="mb-3">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              isInvalid={!!errors.email}
              placeholder="Enter your email address"
              autoComplete="email"
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.email}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Password Field */}
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                isInvalid={!!errors.password}
                placeholder="Create a strong password"
                autoComplete="new-password"
                disabled={isLoading}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeSlash /> : <Eye />}
              </Button>
              <Form.Control.Feedback type="invalid">
                {errors.password}
              </Form.Control.Feedback>
            </InputGroup>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-muted">Password strength:</small>
                  <small className={`text-${getPasswordStrengthColor()}`}>
                    {getPasswordStrengthText()}
                  </small>
                </div>
                <div className="progress" style={{ height: '4px' }}>
                  <div
                    className={`progress-bar bg-${getPasswordStrengthColor()}`}
                    role="progressbar"
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
                
                {/* Password Requirements */}
                <div className="mt-2">
                  <small className="text-muted d-block mb-1">Requirements:</small>
                  <div className="password-requirements">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="d-flex align-items-center mb-1">
                        {req.met ? (
                          <Check className="text-success me-2" size={12} />
                        ) : (
                          <X className="text-muted me-2" size={12} />
                        )}
                        <small className={req.met ? 'text-success' : 'text-muted'}>
                          {req.text}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Form.Group>

          {/* Confirm Password Field */}
          <Form.Group className="mb-3">
            <Form.Label>Confirm Password</Form.Label>
            <InputGroup>
              <Form.Control
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                isInvalid={!!errors.confirmPassword}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isLoading}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeSlash /> : <Eye />}
              </Button>
              <Form.Control.Feedback type="invalid">
                {errors.confirmPassword}
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          {/* Optional Fields */}
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Organization (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.organization}
                  onChange={(e) => handleInputChange('organization', e.target.value)}
                  placeholder="Your company or organization"
                  autoComplete="organization"
                  disabled={isLoading}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  disabled={isLoading}
                >
                  <option value="learner">Learner</option>
                  <option value="instructor">Instructor</option>
                  <option value="developer">Developer</option>
                  <option value="researcher">Researcher</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Terms and Newsletter */}
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="agreeToTerms"
              label={
                <span>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </span>
              }
              checked={formData.agreeToTerms}
              onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
              isInvalid={!!errors.agreeToTerms}
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.agreeToTerms}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="subscribeNewsletter"
              label="Subscribe to updates and learning resources"
              checked={formData.subscribeNewsletter}
              onChange={(e) => handleInputChange('subscribeNewsletter', e.target.checked)}
              disabled={isLoading}
            />
          </Form.Group>

          {/* Register Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-100 mb-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </Form>
      </Card.Body>

      <Card.Footer className="text-center">
        <span className="text-muted">Already have an account? </span>
        <Button
          variant="link"
          className="p-0"
          onClick={onSwitchToLogin}
          disabled={isLoading}
        >
          Sign in here
        </Button>
      </Card.Footer>

      <style jsx>{`
        .auth-form {
          max-width: 500px;
          margin: 0 auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .auth-form .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 0.375rem 0.375rem 0 0 !important;
        }

        .auth-form .text-primary {
          color: white !important;
        }

        .form-control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }

        .password-requirements {
          max-height: 120px;
        }

        .progress {
          border-radius: 2px;
        }
      `}</style>
    </Card>
  );
}

export default RegisterForm;