# CQL Code Clinic SDK Reference 📚

Official SDK documentation for integrating with the CQL Code Clinic platform. This SDK provides programmatic access to exercises, user progress, CQL execution, and analytics.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Core APIs](#core-apis)
- [SDK Methods](#sdk-methods)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [TypeScript Support](#typescript-support)
- [Contributing](#contributing)

## Installation

### JavaScript/TypeScript

```bash
# npm
npm install @cql-clinic/sdk

# yarn  
yarn add @cql-clinic/sdk

# pnpm
pnpm add @cql-clinic/sdk
```

### Python

```bash
# pip
pip install cql-clinic-sdk

# poetry
poetry add cql-clinic-sdk
```

### Go

```bash
go get github.com/cql-clinic/go-sdk
```

## Quick Start

### JavaScript/TypeScript

```typescript
import { CQLClinicSDK } from '@cql-clinic/sdk';

const client = new CQLClinicSDK({
  apiUrl: 'https://api.cqlclinic.com/v1',
  apiKey: 'your-api-key' // or use authentication
});

// Execute CQL code
const result = await client.cql.execute({
  code: 'library Example\ndefine "Test": 1 + 1'
});

console.log(result.data.results.Test); // 2
```

### Python

```python
from cql_clinic import CQLClinicClient

client = CQLClinicClient(
    api_url='https://api.cqlclinic.com/v1',
    api_key='your-api-key'
)

# Execute CQL code
result = client.cql.execute(
    code='library Example\ndefine "Test": 1 + 1'
)

print(result.data.results['Test'])  # 2
```

## Authentication

The SDK supports multiple authentication methods:

### API Key Authentication

```typescript
const client = new CQLClinicSDK({
  apiUrl: 'https://api.cqlclinic.com/v1',
  apiKey: 'your-api-key'
});
```

### JWT Token Authentication

```typescript
const client = new CQLClinicSDK({
  apiUrl: 'https://api.cqlclinic.com/v1',
  accessToken: 'your-jwt-token'
});
```

### Username/Password Authentication

```typescript
const client = new CQLClinicSDK({
  apiUrl: 'https://api.cqlclinic.com/v1'
});

await client.auth.login('user@example.com', 'password');
```

### Environment Variables

```bash
export CQL_CLINIC_API_URL=https://api.cqlclinic.com/v1
export CQL_CLINIC_API_KEY=your-api-key
```

```typescript
// SDK will automatically use environment variables
const client = new CQLClinicSDK();
```

## Core APIs

### CQL Execution API

Execute CQL code and get results.

```typescript
interface CQLExecuteRequest {
  code: string;
  options?: {
    timeout?: number;
    dataModel?: string;
    debugMode?: boolean;
    includeMetrics?: boolean;
  };
}

interface CQLExecuteResponse {
  success: boolean;
  data: {
    results: Record<string, any>;
    executionTime: number;
    warnings: string[];
    errors: string[];
    metrics?: {
      recordsProcessed: number;
      memoryUsed: string;
    };
  };
}
```

### Exercises API

Manage and interact with learning exercises.

```typescript
interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  instructions: string;
  starterCode?: string;
  solution?: string;
  learningObjectives: string[];
  estimatedTime: number;
}

interface ExerciseFilters {
  difficulty?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}
```

### User Progress API

Track user learning progress and achievements.

```typescript
interface UserProgress {
  userId: string;
  exerciseId: string;
  completed: boolean;
  score?: number;
  timeSpent: number;
  attempts: number;
  lastAttempt: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate?: string;
  progress?: {
    current: number;
    target: number;
  };
}
```

## SDK Methods

### Authentication Methods

#### `auth.login(email, password)`

Authenticate with email and password.

```typescript
await client.auth.login('user@example.com', 'password');
```

#### `auth.logout()`

Log out the current user.

```typescript
await client.auth.logout();
```

#### `auth.getCurrentUser()`

Get current authenticated user information.

```typescript
const user = await client.auth.getCurrentUser();
```

#### `auth.refreshToken()`

Refresh the authentication token.

```typescript
await client.auth.refreshToken();
```

### CQL Execution Methods

#### `cql.execute(request)`

Execute CQL code and return results.

```typescript
const result = await client.cql.execute({
  code: `
    library Example
    using FHIR version '4.0.1'
    
    define "PatientAge": 25
    define "IsAdult": PatientAge >= 18
  `,
  options: {
    timeout: 30000,
    debugMode: true
  }
});
```

#### `cql.validate(code)`

Validate CQL syntax without execution.

```typescript
const validation = await client.cql.validate(`
  library Example
  define "Test": 1 + 1
`);

if (!validation.data.valid) {
  console.log('Errors:', validation.data.errors);
}
```

#### `cql.format(code)`

Format CQL code with proper indentation and styling.

```typescript
const formatted = await client.cql.format('library Test define "X":1+1');
console.log(formatted.data.formattedCode);
```

### Exercise Methods

#### `exercises.list(filters?)`

Get a list of exercises with optional filtering.

```typescript
const exercises = await client.exercises.list({
  difficulty: 'beginner',
  category: 'basics',
  page: 1,
  limit: 20
});
```

#### `exercises.get(exerciseId)`

Get detailed information about a specific exercise.

```typescript
const exercise = await client.exercises.get('exercise-123');
```

#### `exercises.submit(exerciseId, submission)`

Submit a solution for an exercise.

```typescript
const result = await client.exercises.submit('exercise-123', {
  code: 'library Solution\ndefine "Answer": 42',
  notes: 'My approach was...'
});
```

#### `exercises.getHint(exerciseId, level?)`

Get a hint for an exercise.

```typescript
const hint = await client.exercises.getHint('exercise-123', 1);
```

#### `exercises.resetProgress(exerciseId)`

Reset progress for an exercise.

```typescript
await client.exercises.resetProgress('exercise-123');
```

### User Progress Methods

#### `progress.getOverview()`

Get overall learning progress summary.

```typescript
const overview = await client.progress.getOverview();
```

#### `progress.getExerciseProgress(exerciseId)`

Get progress for a specific exercise.

```typescript
const progress = await client.progress.getExerciseProgress('exercise-123');
```

#### `progress.updateProgress(exerciseId, progressData)`

Update progress for an exercise.

```typescript
await client.progress.updateProgress('exercise-123', {
  timeSpent: 300,
  completed: true,
  score: 85
});
```

#### `progress.getAchievements()`

Get user's achievements and badges.

```typescript
const achievements = await client.progress.getAchievements();
```

#### `progress.getAnalytics(timeRange?)`

Get detailed learning analytics.

```typescript
const analytics = await client.progress.getAnalytics('30d');
```

### Tutorial Methods

#### `tutorials.list(filters?)`

Get available tutorials.

```typescript
const tutorials = await client.tutorials.list({
  difficulty: 'beginner',
  type: 'guided'
});
```

#### `tutorials.get(tutorialId)`

Get tutorial details.

```typescript
const tutorial = await client.tutorials.get('tutorial-123');
```

#### `tutorials.startTutorial(tutorialId)`

Start a tutorial session.

```typescript
const session = await client.tutorials.startTutorial('tutorial-123');
```

#### `tutorials.updateProgress(tutorialId, stepIndex, data)`

Update tutorial step progress.

```typescript
await client.tutorials.updateProgress('tutorial-123', 2, {
  completed: true,
  timeSpent: 120
});
```

## Error Handling

The SDK provides comprehensive error handling with typed error responses.

### Error Types

```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

class CQLClinicError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
  }
}
```

### Error Handling Examples

```typescript
try {
  const result = await client.cql.execute({
    code: 'invalid cql code'
  });
} catch (error) {
  if (error instanceof CQLClinicError) {
    console.log('Error code:', error.code);
    console.log('Status code:', error.statusCode);
    console.log('Details:', error.details);
    
    switch (error.code) {
      case 'CQL_SYNTAX_ERROR':
        console.log('Fix your CQL syntax');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.log('Too many requests, wait and retry');
        break;
      case 'UNAUTHORIZED':
        console.log('Check your authentication');
        break;
    }
  }
}
```

### Retry Logic

```typescript
const client = new CQLClinicSDK({
  apiUrl: 'https://api.cqlclinic.com/v1',
  apiKey: 'your-api-key',
  retryConfig: {
    retries: 3,
    retryDelay: 1000,
    retryCondition: (error) => {
      return error.statusCode >= 500 || error.code === 'NETWORK_ERROR';
    }
  }
});
```

## Examples

### Complete Learning Session

```typescript
import { CQLClinicSDK } from '@cql-clinic/sdk';

async function completeLearningSession() {
  const client = new CQLClinicSDK({
    apiUrl: 'https://api.cqlclinic.com/v1'
  });

  // 1. Authenticate
  await client.auth.login('student@example.com', 'password');

  // 2. Get recommended exercises
  const exercises = await client.exercises.list({
    difficulty: 'beginner',
    limit: 5
  });

  // 3. Work through each exercise
  for (const exercise of exercises.data.exercises) {
    console.log(`Starting: ${exercise.title}`);
    
    // Get exercise details
    const details = await client.exercises.get(exercise.id);
    
    // Practice with starter code
    let code = details.data.starterCode || '';
    
    // Get hints if needed
    const hint = await client.exercises.getHint(exercise.id, 1);
    console.log('Hint:', hint.data.text);
    
    // Execute and test code
    const result = await client.cql.execute({ code });
    console.log('Result:', result.data.results);
    
    // Submit solution
    const submission = await client.exercises.submit(exercise.id, {
      code,
      notes: 'Completed with help from hints'
    });
    
    console.log(`Score: ${submission.data.score}`);
  }

  // 4. Check overall progress
  const progress = await client.progress.getOverview();
  console.log('Overall progress:', progress.data);

  // 5. View achievements
  const achievements = await client.progress.getAchievements();
  console.log('New achievements:', achievements.data.achievements);
}
```

### CQL Code Analysis Tool

```typescript
class CQLAnalyzer {
  constructor(private client: CQLClinicSDK) {}

  async analyzeCQLLibrary(code: string) {
    // 1. Validate syntax
    const validation = await this.client.cql.validate(code);
    
    if (!validation.data.valid) {
      return {
        valid: false,
        errors: validation.data.errors,
        suggestions: this.getSuggestions(validation.data.errors)
      };
    }

    // 2. Execute and analyze performance
    const execution = await this.client.cql.execute({
      code,
      options: { includeMetrics: true }
    });

    // 3. Format code
    const formatted = await this.client.cql.format(code);

    return {
      valid: true,
      results: execution.data.results,
      performance: execution.data.metrics,
      formattedCode: formatted.data.formattedCode,
      suggestions: this.getPerformanceSuggestions(execution.data.metrics)
    };
  }

  private getSuggestions(errors: any[]): string[] {
    // Analyze errors and provide helpful suggestions
    return errors.map(error => `Consider: ${error.suggestion}`);
  }

  private getPerformanceSuggestions(metrics: any): string[] {
    const suggestions = [];
    
    if (metrics.executionTime > 5000) {
      suggestions.push('Consider optimizing query performance');
    }
    
    if (metrics.memoryUsed > 100) {
      suggestions.push('Query uses significant memory, consider breaking into smaller parts');
    }
    
    return suggestions;
  }
}

// Usage
const analyzer = new CQLAnalyzer(client);
const analysis = await analyzer.analyzeCQLLibrary(cqlCode);
console.log(analysis);
```

### Progress Dashboard

```typescript
class ProgressDashboard {
  constructor(private client: CQLClinicSDK) {}

  async generateDashboard(userId?: string) {
    // Get comprehensive progress data
    const [overview, achievements, analytics] = await Promise.all([
      this.client.progress.getOverview(),
      this.client.progress.getAchievements(),
      this.client.progress.getAnalytics('30d')
    ]);

    return {
      summary: {
        completionRate: overview.data.overall.completionPercentage,
        exercisesCompleted: overview.data.overall.exercisesCompleted,
        timeSpent: overview.data.overall.timeSpent,
        currentStreak: overview.data.overall.streak
      },
      
      skillProgress: overview.data.skills,
      
      recentAchievements: achievements.data.achievements
        .filter(a => a.earnedDate)
        .sort((a, b) => new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime())
        .slice(0, 5),
      
      learningTrend: analytics.data.dailyProgress.map(day => ({
        date: day.date,
        exercisesCompleted: day.exercisesCompleted,
        timeSpent: day.timeSpent
      })),
      
      recommendations: await this.getRecommendations(overview.data)
    };
  }

  private async getRecommendations(progress: any): Promise<string[]> {
    const recommendations = [];
    
    // Analyze progress and suggest next steps
    if (progress.overall.completionPercentage < 25) {
      recommendations.push('Focus on completing beginner exercises');
    } else if (progress.overall.completionPercentage < 75) {
      recommendations.push('Try intermediate challenges');
    } else {
      recommendations.push('Ready for advanced projects');
    }
    
    return recommendations;
  }
}
```

## TypeScript Support

The SDK is built with TypeScript and provides full type definitions.

### Type Definitions

```typescript
// Exercise types
export interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  instructions: string;
  starterCode?: string;
  solution?: string;
  learningObjectives: string[];
  estimatedTime: number;
}

// CQL execution types
export interface CQLExecuteRequest {
  code: string;
  options?: {
    timeout?: number;
    dataModel?: string;
    debugMode?: boolean;
    includeMetrics?: boolean;
  };
}

export interface CQLExecuteResponse {
  success: boolean;
  data: {
    results: Record<string, any>;
    executionTime: number;
    warnings: string[];
    errors: string[];
    metrics?: {
      recordsProcessed: number;
      memoryUsed: string;
    };
  };
}

// Progress types
export interface UserProgress {
  userId: string;
  exerciseId: string;
  completed: boolean;
  score?: number;
  timeSpent: number;
  attempts: number;
  lastAttempt: string;
}
```

### Generic SDK Interface

```typescript
export interface CQLClinicSDKInterface {
  auth: {
    login(email: string, password: string): Promise<AuthResponse>;
    logout(): Promise<void>;
    getCurrentUser(): Promise<User>;
    refreshToken(): Promise<TokenResponse>;
  };
  
  cql: {
    execute(request: CQLExecuteRequest): Promise<CQLExecuteResponse>;
    validate(code: string): Promise<CQLValidateResponse>;
    format(code: string): Promise<CQLFormatResponse>;
  };
  
  exercises: {
    list(filters?: ExerciseFilters): Promise<ExerciseListResponse>;
    get(exerciseId: string): Promise<ExerciseResponse>;
    submit(exerciseId: string, submission: ExerciseSubmission): Promise<SubmissionResponse>;
    getHint(exerciseId: string, level?: number): Promise<HintResponse>;
    resetProgress(exerciseId: string): Promise<void>;
  };
  
  progress: {
    getOverview(): Promise<ProgressOverviewResponse>;
    getExerciseProgress(exerciseId: string): Promise<ExerciseProgressResponse>;
    updateProgress(exerciseId: string, data: ProgressUpdate): Promise<void>;
    getAchievements(): Promise<AchievementsResponse>;
    getAnalytics(timeRange?: string): Promise<AnalyticsResponse>;
  };
}
```

## Contributing

We welcome contributions to the SDK! Here's how to get started:

### Development Setup

```bash
# Clone the SDK repository
git clone https://github.com/cql-clinic/sdk-js.git
cd sdk-js

# Install dependencies
npm install

# Run tests
npm test

# Build the SDK
npm run build
```

### Adding New Features

1. **Add type definitions** in `src/types/`
2. **Implement the feature** in appropriate service class
3. **Add tests** in `__tests__/`
4. **Update documentation** in this file
5. **Submit a pull request**

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "CQL Execution"

# Run tests with coverage
npm run test:coverage
```

### Publishing

The SDK is published to npm with automated releases:

```bash
# Version bump and publish
npm version patch|minor|major
npm publish
```

---

For support or questions about the SDK:
- **GitHub Issues**: [SDK Issue Tracker](https://github.com/cql-clinic/sdk-js/issues)
- **Documentation**: [docs.cqlclinic.com/sdk](https://docs.cqlclinic.com/sdk)
- **Email**: sdk-support@cqlclinic.com

---

*Last updated: December 2023 | Version 1.0.0*