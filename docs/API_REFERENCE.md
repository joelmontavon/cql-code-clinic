# CQL Code Clinic API Reference 🚀

Complete API documentation for the CQL Code Clinic platform. This RESTful API enables programmatic access to exercises, user progress, CQL execution, and analytics.

## Table of Contents

- [Authentication](#authentication)
- [Base URL and Versioning](#base-url-and-versioning)
- [Request/Response Format](#requestresponse-format)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Core Endpoints](#core-endpoints)
- [SDK and Libraries](#sdk-and-libraries)
- [Webhooks](#webhooks)
- [Examples](#examples)

## Authentication

The CQL Code Clinic API uses JWT (JSON Web Tokens) for authentication.

### Getting an Access Token

**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "student"
    }
  }
}
```

### Using the Access Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refreshing Tokens

**POST** `/api/auth/refresh`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Base URL and Versioning

- **Production**: `https://api.cqlclinic.com/v1`
- **Staging**: `https://staging-api.cqlclinic.com/v1`
- **Local Development**: `http://localhost:3001/api`

## Request/Response Format

### Content Types
- **Request**: `application/json`
- **Response**: `application/json`

### Standard Response Structure

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "metadata": {
    "timestamp": "2023-12-15T10:30:00Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Valid email address is required"
      }
    ]
  },
  "metadata": {
    "timestamp": "2023-12-15T10:30:00Z",
    "requestId": "req-12345"
  }
}
```

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- **Authenticated Users**: 1000 requests/hour
- **CQL Execution**: 100 requests/hour
- **File Uploads**: 50 requests/hour
- **Anonymous**: 100 requests/hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200  | OK | Request successful |
| 201  | Created | Resource created successfully |
| 400  | Bad Request | Invalid request data |
| 401  | Unauthorized | Authentication required |
| 403  | Forbidden | Insufficient permissions |
| 404  | Not Found | Resource not found |
| 422  | Unprocessable Entity | Validation error |
| 429  | Too Many Requests | Rate limit exceeded |
| 500  | Internal Server Error | Server error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTHENTICATION_ERROR` | Invalid credentials |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND_ERROR` | Resource not found |
| `RATE_LIMIT_ERROR` | Too many requests |
| `CQL_EXECUTION_ERROR` | CQL code execution failed |
| `INTERNAL_ERROR` | Unexpected server error |

## Core Endpoints

### 🔐 Authentication

#### Login
**POST** `/api/auth/login`

Authenticate user and receive access tokens.

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "rememberMe": "boolean"
}
```

#### Register
**POST** `/api/auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "role": "student|instructor|admin"
}
```

#### Logout
**POST** `/api/auth/logout`

Invalidate current session and tokens.

#### Password Reset
**POST** `/api/auth/reset-password`

Request password reset email.

**Request:**
```json
{
  "email": "string"
}
```

### 👤 User Management

#### Get User Profile
**GET** `/api/users/profile`

Get current user's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "student",
    "profile": {
      "avatar": "https://...",
      "bio": "Healthcare professional...",
      "preferences": {
        "theme": "dark",
        "notifications": true
      }
    },
    "stats": {
      "exercisesCompleted": 45,
      "totalTime": 3600,
      "streak": 7
    }
  }
}
```

#### Update User Profile
**PUT** `/api/users/profile`

Update user profile information.

**Request:**
```json
{
  "name": "string",
  "bio": "string",
  "preferences": {
    "theme": "light|dark",
    "notifications": "boolean"
  }
}
```

#### Get User Progress
**GET** `/api/users/progress?track=beginner&detailed=true`

Get detailed user progress information.

**Parameters:**
- `track` (optional): Filter by learning track
- `detailed` (optional): Include detailed statistics

### 📚 Exercises

#### List Exercises
**GET** `/api/exercises?track=beginner&difficulty=1&page=1&limit=20`

Get paginated list of exercises.

**Parameters:**
- `track` (optional): Learning track (beginner, intermediate, advanced)
- `difficulty` (optional): Difficulty level (1-5)
- `category` (optional): Exercise category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "exercises": [
      {
        "id": "exercise-123",
        "title": "Basic Patient Selection",
        "description": "Learn to filter patient records",
        "difficulty": 1,
        "track": "beginner",
        "category": "filtering",
        "estimatedTime": 15,
        "prerequisites": [],
        "learningObjectives": [
          "Understand basic filtering syntax",
          "Apply where clauses effectively"
        ],
        "status": "completed|in_progress|locked"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### Get Exercise Details
**GET** `/api/exercises/:id`

Get detailed exercise information including instructions and starter code.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exercise-123",
    "title": "Basic Patient Selection",
    "description": "Learn to filter patient records using CQL where clauses",
    "instructions": "Write a CQL query that selects all patients with diabetes...",
    "starterCode": "library Example\nusing FHIR version '4.0.1'\n\n// Your code here",
    "solution": "// Solution code (only for instructors)",
    "testCases": [
      {
        "name": "Basic functionality",
        "description": "Should return correct patient count",
        "expectedOutput": "5 patients"
      }
    ],
    "hints": [
      {
        "level": 1,
        "text": "Start by defining a library name"
      },
      {
        "level": 2,
        "text": "Use the [Patient] resource to access patient data"
      }
    ],
    "resources": [
      {
        "title": "CQL Documentation",
        "url": "https://cql.hl7.org/",
        "type": "documentation"
      }
    ]
  }
}
```

#### Submit Exercise Solution
**POST** `/api/exercises/:id/submit`

Submit solution for exercise evaluation.

**Request:**
```json
{
  "code": "library Example\nusing FHIR version '4.0.1'\n\ndefine \"Patients\": [Patient]",
  "notes": "My approach was to..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub-789",
    "status": "passed|failed",
    "score": 85,
    "feedback": {
      "overall": "Great work! Your solution correctly identifies diabetic patients.",
      "testResults": [
        {
          "name": "Basic functionality",
          "passed": true,
          "actualOutput": "5 patients",
          "expectedOutput": "5 patients"
        }
      ],
      "codeReview": {
        "strengths": ["Clean syntax", "Proper filtering"],
        "improvements": ["Consider performance optimization"]
      }
    },
    "executionTime": 127,
    "nextExercise": "exercise-124"
  }
}
```

### 🖥️ CQL Execution

#### Execute CQL Code
**POST** `/api/cql/execute`

Execute CQL code and return results.

**Request:**
```json
{
  "code": "library Example\nusing FHIR version '4.0.1'\n\ndefine \"Test\": 1 + 1",
  "options": {
    "timeout": 30000,
    "dataModel": "FHIR-4.0.1",
    "debugMode": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "exec-456",
    "results": {
      "Test": 2
    },
    "executionTime": 127,
    "statistics": {
      "recordsProcessed": 1000,
      "memoryUsed": "15MB"
    },
    "warnings": [],
    "debugInfo": {
      "steps": [
        {
          "operation": "define",
          "expression": "1 + 1",
          "result": 2
        }
      ]
    }
  }
}
```

#### Validate CQL Code
**POST** `/api/cql/validate`

Validate CQL syntax without execution.

**Request:**
```json
{
  "code": "library Example\nusing FHIR version '4.0.1'\n\ndefine \"Test\": 1 +"
}
```

**Response:**
```json
{
  "success": false,
  "data": {
    "valid": false,
    "errors": [
      {
        "line": 4,
        "column": 23,
        "message": "Expecting expression after '+' operator",
        "severity": "error"
      }
    ],
    "warnings": []
  }
}
```

### 📊 Progress and Analytics

#### Get Learning Progress
**GET** `/api/progress/overview`

Get comprehensive learning progress overview.

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "completionPercentage": 65,
      "exercisesCompleted": 45,
      "totalExercises": 69,
      "timeSpent": 7200,
      "streak": 7
    },
    "tracks": {
      "beginner": {
        "completionPercentage": 100,
        "exercisesCompleted": 20,
        "timeSpent": 3600
      },
      "intermediate": {
        "completionPercentage": 70,
        "exercisesCompleted": 21,
        "timeSpent": 2400
      },
      "advanced": {
        "completionPercentage": 20,
        "exercisesCompleted": 4,
        "timeSpent": 1200
      }
    },
    "skills": {
      "dataTypes": 95,
      "filtering": 85,
      "functions": 70,
      "temporal": 45,
      "optimization": 20
    },
    "recentActivity": [
      {
        "date": "2023-12-15",
        "exercisesCompleted": 3,
        "timeSpent": 45
      }
    ]
  }
}
```

#### Get Detailed Analytics
**GET** `/api/analytics/detailed?period=30d&metrics=accuracy,speed,completion`

Get detailed learning analytics.

**Parameters:**
- `period`: Time period (7d, 30d, 90d, 1y)
- `metrics`: Comma-separated metrics to include

### 🏆 Achievements

#### Get User Achievements
**GET** `/api/achievements`

Get user's earned achievements and badges.

**Response:**
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "first-query",
        "title": "First CQL Query",
        "description": "Completed your first CQL query",
        "icon": "🎯",
        "earnedDate": "2023-12-01T10:00:00Z",
        "rarity": "common"
      }
    ],
    "progress": [
      {
        "id": "speed-demon",
        "title": "Speed Demon",
        "description": "Complete 10 exercises in under 5 minutes each",
        "progress": 7,
        "target": 10,
        "icon": "⚡"
      }
    ],
    "stats": {
      "totalAchievements": 25,
      "earnedAchievements": 12,
      "rareAchievements": 2
    }
  }
}
```

### 🔧 Admin Endpoints

#### Get System Status
**GET** `/api/admin/status`

Get system health and status information. (Admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "cache": "healthy",
      "cqlRunner": "healthy"
    },
    "metrics": {
      "activeUsers": 1250,
      "totalExercises": 150,
      "avgResponseTime": 145
    }
  }
}
```

#### Get User Management
**GET** `/api/admin/users?page=1&limit=20&role=student`

Get paginated user list with management options. (Admin only)

## SDK and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @cql-clinic/sdk
```

```javascript
import { CQLClinicSDK } from '@cql-clinic/sdk';

const client = new CQLClinicSDK({
  apiUrl: 'https://api.cqlclinic.com/v1',
  accessToken: 'your-access-token'
});

// Execute CQL code
const result = await client.cql.execute({
  code: 'define "Test": 1 + 1'
});

// Get exercises
const exercises = await client.exercises.list({
  track: 'beginner',
  page: 1,
  limit: 10
});

// Submit solution
const submission = await client.exercises.submit('exercise-123', {
  code: 'your-solution-code'
});
```

### Python SDK

```bash
pip install cql-clinic-sdk
```

```python
from cql_clinic import CQLClinicClient

client = CQLClinicClient(
    api_url='https://api.cqlclinic.com/v1',
    access_token='your-access-token'
)

# Execute CQL code
result = client.cql.execute(
    code='define "Test": 1 + 1'
)

# Get user progress
progress = client.progress.get_overview()
```

## Webhooks

### Setting up Webhooks

Configure webhooks to receive real-time notifications about user progress and system events.

**POST** `/api/webhooks/configure`

```json
{
  "url": "https://your-system.com/webhook",
  "events": [
    "exercise.completed",
    "achievement.earned",
    "user.registered"
  ],
  "secret": "webhook-secret-key"
}
```

### Webhook Events

#### Exercise Completion
```json
{
  "event": "exercise.completed",
  "timestamp": "2023-12-15T10:30:00Z",
  "data": {
    "userId": "user-123",
    "exerciseId": "exercise-456",
    "score": 85,
    "timeSpent": 300,
    "attempts": 2
  }
}
```

#### Achievement Earned
```json
{
  "event": "achievement.earned",
  "timestamp": "2023-12-15T10:30:00Z",
  "data": {
    "userId": "user-123",
    "achievementId": "week-warrior",
    "achievementTitle": "Week Warrior",
    "streak": 7
  }
}
```

### Verifying Webhooks

Verify webhook authenticity using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === `sha256=${digest}`;
}
```

## Examples

### Complete Learning Session

```javascript
// 1. Authenticate
const authResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'secure_password'
  })
});
const { accessToken } = await authResponse.json();

// 2. Get next exercise
const exercisesResponse = await fetch('/api/exercises?track=beginner&status=next', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { exercises } = await exercisesResponse.json();
const nextExercise = exercises[0];

// 3. Get exercise details
const exerciseResponse = await fetch(`/api/exercises/${nextExercise.id}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const exerciseDetails = await exerciseResponse.json();

// 4. Execute and test code
const executeResponse = await fetch('/api/cql/execute', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: exerciseDetails.starterCode + '\n// Student solution here'
  })
});
const executionResult = await executeResponse.json();

// 5. Submit solution
const submitResponse = await fetch(`/api/exercises/${nextExercise.id}/submit`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'final-solution-code',
    notes: 'My approach was to use efficient filtering...'
  })
});
const submissionResult = await submitResponse.json();
```

### Bulk Progress Analysis

```javascript
// Get detailed progress for multiple users (admin)
async function analyzeClassProgress(studentIds) {
  const results = await Promise.all(
    studentIds.map(async (studentId) => {
      const response = await fetch(`/api/admin/users/${studentId}/progress`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      return response.json();
    })
  );
  
  return {
    totalStudents: results.length,
    averageCompletion: results.reduce((sum, r) => 
      sum + r.data.overall.completionPercentage, 0) / results.length,
    strugglingStudents: results.filter(r => 
      r.data.overall.completionPercentage < 50),
    topPerformers: results.filter(r => 
      r.data.overall.completionPercentage > 90)
  };
}
```

---

## Support and Feedback

- **API Documentation**: Always up-to-date at [docs.cqlclinic.com](https://docs.cqlclinic.com)
- **SDK Issues**: Report at our [GitHub repository](https://github.com/cql-clinic/sdk)
- **API Support**: Contact [api-support@cqlclinic.com](mailto:api-support@cqlclinic.com)
- **Rate Limit Increases**: Enterprise customers can request higher limits

**Need a feature?** We're constantly improving our API based on user feedback. Submit feature requests through our [feedback portal](https://feedback.cqlclinic.com).