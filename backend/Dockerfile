# Multi-stage build for Node.js backend
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    curl \
    ca-certificates \
    tini

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Install all dependencies (including dev)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Change ownership to node user
RUN chown -R nodeapp:nodejs /app

# Switch to non-root user
USER nodeapp

# Expose development port
EXPOSE 3001

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all dependencies (including dev)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Set proper permissions
RUN chown -R nodeapp:nodejs /app

# Production stage
FROM node:18-alpine AS production

# Install production system dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tini \
    && apk upgrade --no-cache

# Create app user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy application code
COPY --chown=nodeapp:nodejs src/ ./src/
COPY --chown=nodeapp:nodejs .env.example ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R nodeapp:nodejs /app && \
    chmod -R 755 /app && \
    chmod -R 644 /app/src && \
    find /app/src -type d -exec chmod 755 {} \;

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV NPM_CONFIG_LOGLEVEL=warn

# Switch to non-root user
USER nodeapp

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Add labels
LABEL maintainer="CQL Code Clinic Team"
LABEL version="1.0.0"
LABEL description="CQL Code Clinic Backend - Node.js API"

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "src/index.js"]