import React, { useState } from 'react';
import { Form, Button, Card, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { Eye, EyeSlash, Shield, Google, Github, Microsoft } from 'react-bootstrap-icons';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';

/**
 * Login Form Component
 * Provides secure user authentication with multiple options
 */
export function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState(null);

  const { login, loginWithProvider, isAuthenticated, loading } = useAuth();

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
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setAuthMethod('email');

    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe
      });

      if (result.success) {
        onSuccess?.(result.user);
      } else {
        setErrors({ general: result.error || 'Login failed. Please try again.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ 
        general: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    setAuthMethod(provider);

    try {
      const result = await loginWithProvider(provider);
      
      if (result.success) {
        onSuccess?.(result.user);
      } else {
        setErrors({ 
          general: result.error || `${provider} login failed. Please try again.` 
        });
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setErrors({ 
        general: `${provider} login encountered an error. Please try again.` 
      });
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const isMethodLoading = (method) => {
    return isLoading && authMethod === method;
  };

  return (
    <Card className="auth-form">
      <Card.Header className="text-center">
        <h4 className="mb-1">
          <Shield className="me-2 text-primary" />
          Sign In
        </h4>
        <p className="text-muted mb-0">Welcome back to CQL Code Clinic</p>
      </Card.Header>

      <Card.Body>
        {errors.general && (
          <Alert variant="danger" className="mb-3">
            {errors.general}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Email Field */}
          <Form.Group className="mb-3">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              isInvalid={!!errors.email}
              placeholder="Enter your email"
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
                placeholder="Enter your password"
                autoComplete="current-password"
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
          </Form.Group>

          {/* Remember Me and Forgot Password */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Form.Check
              type="checkbox"
              id="rememberMe"
              label="Remember me"
              checked={formData.rememberMe}
              onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
              disabled={isLoading}
            />
            <Link 
              to="/forgot-password" 
              className="text-decoration-none small"
              tabIndex={isLoading ? -1 : 0}
            >
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-100 mb-3"
            disabled={isLoading}
          >
            {isMethodLoading('email') ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </Form>

        {/* Social Login Divider */}
        <div className="text-center mb-3">
          <div className="d-flex align-items-center">
            <hr className="flex-grow-1" />
            <span className="px-3 text-muted small">or continue with</span>
            <hr className="flex-grow-1" />
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="d-grid gap-2">
          <Button
            variant="outline-danger"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            className="d-flex align-items-center justify-content-center"
          >
            {isMethodLoading('google') ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <Google className="me-2" />
            )}
            Continue with Google
          </Button>

          <Button
            variant="outline-dark"
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading}
            className="d-flex align-items-center justify-content-center"
          >
            {isMethodLoading('github') ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <Github className="me-2" />
            )}
            Continue with GitHub
          </Button>

          <Button
            variant="outline-primary"
            onClick={() => handleSocialLogin('microsoft')}
            disabled={isLoading}
            className="d-flex align-items-center justify-content-center"
          >
            {isMethodLoading('microsoft') ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <Microsoft className="me-2" />
            )}
            Continue with Microsoft
          </Button>
        </div>
      </Card.Body>

      <Card.Footer className="text-center">
        <span className="text-muted">Don't have an account? </span>
        <Button
          variant="link"
          className="p-0"
          onClick={onSwitchToRegister}
          disabled={isLoading}
        >
          Sign up here
        </Button>
      </Card.Footer>

      <style jsx>{`
        .auth-form {
          max-width: 400px;
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

        .btn-outline-danger:hover {
          background-color: #dc3545;
          border-color: #dc3545;
        }

        .btn-outline-dark:hover {
          background-color: #212529;
          border-color: #212529;
        }
      `}</style>
    </Card>
  );
}

export default LoginForm;