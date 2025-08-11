# CQL Services Setup

This directory contains the local CQL execution infrastructure, consisting of:

1. **CQL Execution Service** (Backend) - Processes CQL code execution
2. **CQL Runner** (Frontend Interface) - Web-based CQL testing environment

## Architecture

```
Frontend (React) 
    ↓ HTTP API calls
Backend API (Node.js/Express) 
    ↓ HTTP requests  
CQL Execution Service (Java/Tomcat)
    ↓ CQL processing
CQL Runner (Angular Web UI)
```

## Quick Start

### Prerequisites

- **Java 8+** and **Maven 3.5+** (for CQL Execution Service)
- **Node.js 16+** and **npm** (for CQL Runner)
- **Docker** (recommended for containerized setup)

### Option 1: Docker Setup (Recommended)

```bash
# From the services directory
cd cql_execution_service
docker build -t cql-execution-service .

cd ../cql_runner
docker-compose up -d

# Services will be available at:
# CQL Execution Service: http://localhost:8080
# CQL Runner UI: http://localhost:4200
```

### Option 2: Manual Setup

#### CQL Execution Service

```bash
cd cql_execution_service
mvn install
mvn -Djetty.http.port=8080 jetty:run
```

#### CQL Runner

```bash
cd cql_runner
npm install
npm install -g @angular/cli@14.0.2
ng serve --host 0.0.0.0 --port 4200
```

## API Endpoints

### CQL Execution Service (Port 8080)

#### Execute CQL Code
- **POST** `/cql/evaluate`
- **Content-Type:** `application/json`

```json
{
  "code": "define \"Hello\": 'Hello World'",
  "terminologyServiceUri": "http://localhost:8080/baseR4",
  "dataServiceUri": "http://localhost:8080/baseR4",
  "patientId": "example-patient-id"
}
```

**Response:**
```json
[
  {
    "name": "Hello",
    "location": "[1:1]",
    "resultType": "System.String",
    "result": "Hello World"
  }
]
```

#### Format CQL Code
- **POST** `/cql/format`
- **Content-Type:** `application/json`

```json
{
  "code": "define \"Hello\":   'Hello World'"
}
```

## Integration with React Frontend

### Environment Configuration

Create `/frontend/.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_CQL_EXECUTION_SERVICE_URL=http://localhost:8080
```

### API Integration

The React frontend communicates with the CQL services through the Express.js API layer:

```javascript
// frontend/src/services/api.js
export const executeCQL = async (code) => {
  // Calls our Express API which proxies to CQL Execution Service
  return await apiService.executeCQL(code);
};
```

## Current Development Status

### ✅ Completed
- CQL Execution Service repository cloned
- CQL Runner repository cloned  
- Documentation and setup instructions created
- API endpoint specifications documented

### 🔄 In Progress
- Local service deployment (requires Java/Maven setup)
- Backend API integration layer
- Frontend service integration

### ⏳ Next Steps
1. Set up Java development environment
2. Build and deploy CQL Execution Service
3. Create Express.js proxy layer
4. Test CQL execution pipeline
5. Integrate with React frontend

## Testing CQL Execution

### Basic Test Examples

1. **Simple Expression**
```cql
define "Test": 1 + 1
```

2. **String Manipulation**
```cql
define "Greeting": 'Hello ' + 'World'
```

3. **Date Operations**
```cql
define "Today": Today()
```

### Expected Response Format

```json
[
  {
    "name": "Test",
    "location": "[1:1]",
    "resultType": "System.Integer", 
    "result": 2
  }
]
```

### Error Response Format

```json
[
  {
    "translator-error": "Translation error message",
    "name": "Expression Name",
    "location": "[row:col]",
    "error": "Runtime error details"
  }
]
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - CQL Execution Service: Default port 8080
   - CQL Runner: Default port 4200  
   - Express API: Default port 3001
   - React Frontend: Default port 3000

2. **CORS Issues**
   - Ensure CQL Execution Service allows cross-origin requests
   - Configure Express API as proxy to avoid CORS

3. **Java/Maven Missing**
   - Install OpenJDK 8+ and Maven 3.5+
   - Set JAVA_HOME environment variable

### Health Checks

```bash
# Check CQL Execution Service
curl http://localhost:8080/cql/evaluate -X POST \
  -H "Content-Type: application/json" \
  -d '{"code": "define \"Test\": 1 + 1"}'

# Check CQL Runner  
curl http://localhost:4200

# Check Express API
curl http://localhost:3001/api/health
```

## Development Workflow

1. **Start Services**
   ```bash
   # Terminal 1: CQL Execution Service
   cd services/cql_execution_service
   mvn jetty:run
   
   # Terminal 2: Express API (when created)
   cd backend  
   npm run dev
   
   # Terminal 3: React Frontend
   cd frontend
   npm run dev
   ```

2. **Test Integration**
   - Open React app: http://localhost:3000
   - Test CQL execution through UI
   - Monitor API calls and responses

3. **Debug Issues**
   - Check browser console for frontend errors
   - Check Express API logs for backend issues  
   - Check CQL Execution Service logs for CQL processing errors

## Security Considerations

### Development
- Services run without authentication for local development
- CORS enabled for localhost origins only

### Production  
- Implement proper authentication and authorization
- Use HTTPS for all service communication
- Rate limiting on CQL execution endpoints
- Input validation and sanitization

## Performance Considerations

- CQL compilation can be CPU intensive
- Consider caching compiled CQL expressions
- Monitor memory usage for complex CQL logic
- Implement request timeouts (default: 30 seconds)

## Future Enhancements

- WebSocket integration for real-time CQL execution
- CQL syntax highlighting and IntelliSense
- Caching layer for frequently executed CQL
- Performance monitoring and analytics
- Browser-based CQL execution using cql-execution library