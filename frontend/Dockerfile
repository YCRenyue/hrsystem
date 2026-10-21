# Build stage
ARG DOCKER_REGISTRY=docker.io
FROM ${DOCKER_REGISTRY}/library/node:22-alpine AS build

WORKDIR /app

# Accept build arguments
ARG REACT_APP_API_URL

# Set environment variable for build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Keep production builds within the memory available on the 2 GiB ECS host.
ENV GENERATE_SOURCEMAP=false \
    DISABLE_ESLINT_PLUGIN=true \
    NODE_OPTIONS=--max-old-space-size=1024

# Build the app (will use REACT_APP_API_URL from ENV)
RUN npm run build

# Production stage
FROM ${DOCKER_REGISTRY}/library/nginx:alpine

# Install curl for health check
RUN apk add --no-cache curl

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ > /dev/null 2>&1 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
