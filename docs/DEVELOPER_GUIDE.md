# CQL Code Clinic Developer Guide 🛠️

This guide provides comprehensive documentation for developers working on the CQL Code Clinic platform, including architecture, APIs, development setup, and contribution guidelines.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [API Documentation](#api-documentation)
- [Frontend Development](#frontend-development)
- [Backend Development](#backend-development)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

CQL Code Clinic is built with a modern, scalable architecture designed for interactive learning and real-time code execution.

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[React Web App]
        PWA[Progressive Web App]
    end
    
    subgraph "API Gateway"
        LB[Load Balancer]
        AUTH[Authentication]
        RATE[Rate Limiting]
    end
    
    subgraph "Application Services"
        API[Node.js API Server]
        CQL[CQL Execution Service]
        HINT[AI Hint Service]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[File Storage]
    end
    
    subgraph "External Services"
        FHIR[FHIR Server]
        TERM[Terminology Services]
        AI[OpenAI API]
    end
    
    WEB --> LB
    PWA --> LB
    LB --> AUTH
    AUTH --> API
    API --> CQL
    API --> HINT
    API --> POSTGRES
    API --> REDIS
    CQL --> FHIR
    HINT --> AI
```

### Technology Stack

#### Frontend
- **React 18** - UI framework with concurrent features
- **TypeScript** - Type safety and enhanced developer experience
- **Vite** - Fast development server and build tool
- **Monaco Editor** - Professional code editor (VS Code engine)
- **React Query** - Server state management and caching
- **React Bootstrap** - UI component library
- **React Router v6** - Client-side routing

#### Backend
- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe backend development
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **JWT** - Authentication and authorization

#### CQL Execution
- **Java 11+** - CQL execution runtime
- **CQL Engine** - Reference implementation
- **FHIR R4** - Healthcare data model
- **Docker** - Containerized execution environment

#### DevOps & Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Local development orchestration
- **GitHub Actions** - CI/CD pipeline
- **Prometheus** - Metrics collection
- **Grafana** - Observability and dashboards

## Development Setup

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (Recommended) ([Download](https://code.visualstudio.com/))

### VS Code Extensions

Install these recommended extensions:
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml"
  ]
}
```

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/cql-code-clinic.git
   cd cql-code-clinic
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies
   npm run setup
   
   # Or install individually
   npm install                    # Root dependencies
   cd frontend && npm install     # Frontend dependencies
   cd ../backend && npm install   # Backend dependencies
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment files
   cp .env.example .env.local
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env.local
   
   # Edit configuration files with your settings
   ```

4. **Start Development Services**
   ```bash
   # Start all services (database, redis, backend, frontend)
   npm run dev
   
   # Or start services individually
   npm run dev:services    # Database and Redis only
   npm run dev:backend     # Backend API server
   npm run dev:frontend    # Frontend development server
   ```

5. **Access the Application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:3001
   - **API Docs**: http://localhost:3001/docs
   - **Database**: localhost:5432 (PostgreSQL)
   - **Redis**: localhost:6379

### Environment Variables

#### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_CQL_RUNNER_URL=http://localhost:8080
VITE_ENABLE_DEBUG=true
VITE_DEMO_MODE=false
```

#### Backend (.env.local)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/cql_clinic
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-key
OPENAI_API_KEY=your-openai-key (optional)
CQL_RUNNER_URL=http://localhost:8080
```

## API Documentation

### Authentication

All API endpoints (except public ones) require authentication using JWT tokens.

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Using the Token
Include the token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Core API Endpoints

#### Exercises

**List Exercises**
```http
GET /api/exercises?difficulty=beginner&category=basics&page=1&limit=20
Authorization: Bearer {token}
```

**Get Exercise**
```http
GET /api/exercises/:id
Authorization: Bearer {token}
```

**Submit Solution**
```http
POST /api/exercises/:id/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "library Example\ndefine \"Test\": 'Hello World'",
  "notes": "My solution explanation"
}
```

#### CQL Execution

**Execute CQL Code**
```http
POST /api/cql/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "library Example\ndefine \"Test\": 1 + 1",
  "options": {
    "timeout": 30000,
    "includeDebugInfo": false
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "results": {
      "Test": 2
    },
    "executionTime": 127,
    "warnings": [],
    "errors": []
  }
}
```

#### User Progress

**Get Progress**
```http
GET /api/users/progress
Authorization: Bearer {token}
```

**Update Progress**
```http
PUT /api/exercises/:id/progress
Authorization: Bearer {token}
Content-Type: application/json

{
  "completed": true,
  "timeSpent": 300,
  "attempts": 2,
  "score": 85
}
```

### API Client Usage

#### JavaScript/TypeScript
```typescript
import { APIClient } from './services/apiClient';

const client = new APIClient({
  baseURL: 'http://localhost:3001/api',
  token: 'your-jwt-token'
});

// Execute CQL code
const result = await client.cql.execute({
  code: 'library Test\ndefine "Hello": "World"'
});

// Get exercises
const exercises = await client.exercises.list({
  difficulty: 'beginner',
  page: 1,
  limit: 20
});

// Submit solution
const submission = await client.exercises.submit('exercise-123', {
  code: 'your-solution-code'
});
```

#### Python
```python
from cql_clinic_client import CQLClinicClient

client = CQLClinicClient(
    base_url='http://localhost:3001/api',
    token='your-jwt-token'
)

# Execute CQL code
result = client.cql.execute(
    code='library Test\ndefine "Hello": "World"'
)

# Get exercises
exercises = client.exercises.list(difficulty='beginner')
```

#### cURL Examples
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Execute CQL
curl -X POST http://localhost:3001/api/cql/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "library Test\ndefine \"Hello\": \"World\""}'

# Get exercises
curl -X GET "http://localhost:3001/api/exercises?difficulty=beginner" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Frontend Development

### Project Structure
```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Generic components
│   │   ├── exercises/       # Exercise-specific components
│   │   ├── editor/          # Code editor components
│   │   ├── auth/           # Authentication components
│   │   └── onboarding/     # User onboarding
│   ├── pages/              # Route components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   ├── contexts/           # React contexts
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles
├── public/                 # Static assets
└── package.json           # Dependencies and scripts
```

### Key Components

#### Exercise Interface
```tsx
import React from 'react';
import { useExercise } from '../hooks/useExercise';
import { CodeEditor } from '../components/editor/CodeEditor';
import { ResultsPanel } from '../components/exercises/ResultsPanel';

export function ExerciseInterface({ exerciseId }: { exerciseId: string }) {
  const {
    exercise,
    code,
    setCode,
    executeCode,
    isLoading,
    results,
    error
  } = useExercise(exerciseId);

  return (
    <div className="exercise-interface">
      <div className="exercise-content">
        <h2>{exercise?.title}</h2>
        <div dangerouslySetInnerHTML={{ __html: exercise?.instructions }} />
      </div>
      
      <div className="exercise-workspace">
        <CodeEditor
          value={code}
          onChange={setCode}
          language="cql"
          onExecute={executeCode}
        />
        
        <ResultsPanel
          results={results}
          error={error}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
```

#### Custom Hooks

**useExercise Hook**
```tsx
export function useExercise(exerciseId: string) {
  const [exercise, setExercise] = useState(null);
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeCode = async () => {
    setIsLoading(true);
    try {
      const result = await cqlAPI.execute(code);
      setResults(result);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    exercise,
    code,
    setCode,
    executeCode,
    isLoading,
    results
  };
}
```

### State Management

We use a combination of React Query for server state and React Context for global client state:

```tsx
// QueryClient setup
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2
    }
  }
});

// App context
const AppContext = createContext({});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
        {children}
      </AppContext.Provider>
    </QueryClientProvider>
  );
}
```

### Building for Production

```bash
# Build frontend
npm run build:frontend

# Build with type checking
npm run type-check:frontend && npm run build:frontend

# Preview production build
npm run preview:frontend
```

## Backend Development

### Project Structure
```
backend/
├── src/
│   ├── controllers/         # Route controllers
│   ├── services/           # Business logic
│   ├── middleware/         # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API route definitions
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration
│   └── types/             # TypeScript types
├── prisma/                # Database schema and migrations
├── tests/                 # Test files
└── package.json          # Dependencies and scripts
```

### Express Server Setup

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { exercisesRouter } from './routes/exercises';
import { cqlRouter } from './routes/cql';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/cql', cqlRouter);

// Error handling
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default app;
```

### Database Models (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  exerciseSubmissions ExerciseSubmission[]
  progressRecords     ProgressRecord[]
  
  @@map("users")
}

model Exercise {
  id           String   @id @default(uuid())
  title        String
  description  String
  difficulty   String
  instructions String
  starterCode  String
  solution     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  submissions ExerciseSubmission[]
  
  @@map("exercises")
}

model ExerciseSubmission {
  id         String   @id @default(uuid())
  userId     String
  exerciseId String
  code       String
  score      Int?
  completed  Boolean  @default(false)
  createdAt  DateTime @default(now())
  
  // Relations
  user     User     @relation(fields: [userId], references: [id])
  exercise Exercise @relation(fields: [exerciseId], references: [id])
  
  @@map("exercise_submissions")
}
```

### Service Layer Example

```typescript
// src/services/exerciseService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ExerciseService {
  async getExercises(filters: {
    difficulty?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { difficulty, category, page = 1, limit = 20 } = filters;
    
    const where: any = {};
    if (difficulty) where.difficulty = difficulty;
    if (category) where.category = category;

    const exercises = await prisma.exercise.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.exercise.count({ where });

    return {
      exercises,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async submitSolution(userId: string, exerciseId: string, code: string) {
    // Validate and execute the code
    const executionResult = await this.executeCode(code);
    
    // Calculate score
    const score = this.calculateScore(executionResult);
    
    // Save submission
    return await prisma.exerciseSubmission.create({
      data: {
        userId,
        exerciseId,
        code,
        score,
        completed: score >= 70
      }
    });
  }

  private async executeCode(code: string) {
    // Integration with CQL execution service
    // Implementation details...
  }

  private calculateScore(result: any): number {
    // Scoring logic based on execution results
    // Implementation details...
    return 85;
  }
}
```

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Exercises Table
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  instructions TEXT,
  starter_code TEXT,
  solution TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Exercise Submissions Table
```sql
CREATE TABLE exercise_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  exercise_id UUID REFERENCES exercises(id),
  code TEXT NOT NULL,
  score INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  execution_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Migrations

Run migrations:
```bash
# Generate migration
npx prisma migrate dev --name add_new_feature

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## Testing

### Frontend Testing

We use Vitest and React Testing Library:

```typescript
// src/components/__tests__/ExerciseInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ExerciseInterface } from '../ExerciseInterface';

// Mock the API
vi.mock('../services/api', () => ({
  executeCode: vi.fn(() => Promise.resolve({ result: 'success' }))
}));

describe('ExerciseInterface', () => {
  it('renders exercise content', () => {
    render(<ExerciseInterface exerciseId="test-123" />);
    expect(screen.getByText('Exercise Title')).toBeInTheDocument();
  });

  it('executes code when run button is clicked', async () => {
    render(<ExerciseInterface exerciseId="test-123" />);
    
    const runButton = screen.getByText('Run Code');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(screen.getByText('success')).toBeInTheDocument();
    });
  });
});
```

Run frontend tests:
```bash
npm run test:frontend
npm run test:frontend:coverage
npm run test:frontend:watch
```

### Backend Testing

We use Jest and Supertest:

```typescript
// src/routes/__tests__/exercises.test.ts
import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Exercises API', () => {
  beforeEach(async () => {
    // Setup test data
    await prisma.exercise.create({
      data: {
        title: 'Test Exercise',
        difficulty: 'beginner',
        instructions: 'Test instructions'
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.exercise.deleteMany();
  });

  it('GET /api/exercises returns exercises list', async () => {
    const response = await request(app)
      .get('/api/exercises')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.exercises).toHaveLength(1);
  });

  it('POST /api/exercises/:id/submit requires authentication', async () => {
    await request(app)
      .post('/api/exercises/test-123/submit')
      .send({ code: 'test code' })
      .expect(401);
  });
});
```

Run backend tests:
```bash
npm run test:backend
npm run test:backend:coverage
npm run test:backend:watch
```

### End-to-End Testing

We use Playwright for E2E tests:

```typescript
// e2e/exercise.spec.ts
import { test, expect } from '@playwright/test';

test('complete exercise workflow', async ({ page }) => {
  // Navigate to exercise
  await page.goto('/exercises/basic-definitions');
  
  // Fill in code
  await page.fill('.monaco-editor textarea', 'library Test\ndefine "Hello": "World"');
  
  // Click run button
  await page.click('button:has-text("Run Code")');
  
  // Wait for results
  await expect(page.locator('.results-panel')).toContainText('World');
  
  // Submit solution
  await page.click('button:has-text("Submit")');
  
  // Verify success message
  await expect(page.locator('.alert-success')).toBeVisible();
});
```

## Deployment

### Production Build

```bash
# Build all services
npm run build

# Build individual services
npm run build:frontend
npm run build:backend
```

### Docker Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=${API_BASE_URL}

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Type check
        run: npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          docker build -t cql-clinic/frontend ./frontend
          docker build -t cql-clinic/backend ./backend
          
      - name: Deploy to production
        run: |
          # Deployment steps...
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/cql_clinic_prod
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secure-jwt-secret
OPENAI_API_KEY=your-openai-api-key
CQL_RUNNER_URL=http://cql-runner:8080
```

## Contributing

### Development Workflow

1. **Fork the Repository**
   ```bash
   git fork https://github.com/your-org/cql-code-clinic.git
   cd cql-code-clinic
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation as needed

4. **Run Quality Checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new exercise type"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Code Standards

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Testing Guidelines

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and service interactions
- **E2E Tests**: Test complete user workflows
- **Maintain 80%+ code coverage**

### Git Commit Messages

Follow conventional commit format:
```
type(scope): description

feat: add user authentication
fix: resolve exercise loading issue
docs: update API documentation
test: add exercise service tests
```

## Troubleshooting

### Common Development Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev:frontend
```

#### Database Connection Issues
```bash
# Check database status
docker ps
docker logs cql-clinic-postgres

# Reset database
npm run db:reset

# Run migrations
npm run db:migrate
```

#### Monaco Editor Issues
```bash
# Clear Monaco cache
rm -rf node_modules/.cache/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Compilation Errors
```bash
# Check TypeScript configuration
npx tsc --showConfig

# Rebuild types
npm run type-check

# Clear TypeScript cache
rm -rf dist/ .tsbuildinfo
```

### Performance Issues

#### Frontend Optimization
```typescript
// Lazy load components
const ExerciseInterface = lazy(() => import('./ExerciseInterface'));

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Debounce API calls
const debouncedSearch = useDebounce(searchTerm, 300);
```

#### Backend Optimization
```typescript
// Database query optimization
const exercises = await prisma.exercise.findMany({
  select: {
    id: true,
    title: true,
    difficulty: true
  },
  where: { published: true },
  take: 20
});

// Cache frequently accessed data
const cachedExercises = await redis.get('exercises:beginner');
```

### Debugging

#### Frontend Debugging
```typescript
// Use React DevTools
console.log('Component state:', { user, exercises, isLoading });

// Add breakpoints in browser DevTools
debugger;

// Enable debug logging
localStorage.setItem('debug', 'cql-clinic:*');
```

#### Backend Debugging
```typescript
// Add detailed logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

logger.debug('Processing exercise submission', { userId, exerciseId });
```

#### Database Debugging
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM exercises WHERE difficulty = 'beginner';

-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC;
```

---

For additional help or questions, please:
- Check the [Issue Tracker](https://github.com/your-org/cql-code-clinic/issues)
- Join our [Discord Community](https://discord.gg/cql-clinic)
- Email: developers@cqlclinic.com

---

*Last updated: December 2023 | Version 1.0*