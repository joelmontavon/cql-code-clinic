# Multi-stage build for React frontend
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Install development dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build

# Install all dependencies (including dev)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Set build-time environment variables
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG NODE_ENV=production

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV NODE_ENV=${NODE_ENV}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install additional tools
RUN apk add --no-cache \
    curl \
    ca-certificates

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx.default.conf /etc/nginx/conf.d/default.conf

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nginx -u 1001 && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Testing stage
FROM build AS test

# Install testing dependencies
RUN npm install --save-dev \
    @testing-library/react \
    @testing-library/jest-dom \
    @testing-library/user-event \
    vitest \
    jsdom

# Copy test files
COPY src/ ./src/
COPY tests/ ./tests/
COPY vitest.config.js ./

# Run tests
RUN npm run test:ci

# Linting stage  
FROM build AS lint

# Install linting dependencies
RUN npm install --save-dev \
    eslint \
    @typescript-eslint/parser \
    @typescript-eslint/eslint-plugin \
    eslint-plugin-react \
    eslint-plugin-react-hooks \
    prettier

# Run linting
RUN npm run lint && npm run format:check

# Security scanning stage
FROM base AS security

# Install security scanning tools
RUN npm install -g npm-audit-resolver audit-ci

# Copy package files
COPY package*.json ./

# Run security audit
RUN npm audit --audit-level=moderate || true
RUN npx audit-ci --moderate || true

# Final optimized production image
FROM nginx:alpine AS final

# Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache \
    curl \
    ca-certificates \
    tini

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy built assets with correct ownership
COPY --from=build --chown=appuser:appgroup /app/dist /usr/share/nginx/html

# Copy optimized nginx configuration
COPY --chown=appuser:appgroup nginx.conf /etc/nginx/nginx.conf
COPY --chown=appuser:appgroup nginx.default.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid && \
    chmod -R 755 /usr/share/nginx/html

# Security hardening
RUN chmod -R 644 /usr/share/nginx/html && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} \;

# Switch to non-root user
USER appuser

# Add labels for better maintainability
LABEL maintainer="CQL Code Clinic Team"
LABEL version="1.0.0"
LABEL description="CQL Code Clinic Frontend - React Application"
LABEL org.opencontainers.image.source="https://github.com/your-org/cql-code-clinic"

# Health check with better configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Expose port
EXPOSE 3000

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]