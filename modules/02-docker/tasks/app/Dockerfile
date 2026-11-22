# ZiDD 4.0 · DevOps Jadeja (@devops_jadeja) · github.com/jadeja-rajpal
# Task 3 · a better Dockerfile for a Node.js app

# 1. Small, pinned base image (not node:latest)
FROM node:22-alpine

LABEL maintainer="DevOps Jadeja (@devops_jadeja)" \
      org.opencontainers.image.title="zidd-dashboard" \
      org.opencontainers.image.source="https://github.com/jadeja-rajpal"

WORKDIR /app

# 2. Copy only the package files first, so this slow layer stays CACHED
#    when you change your code
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 3. Copy the code last: it changes most often
COPY --chown=node:node . .

# 4. Don't run as root. The node image already has a "node" user.
USER node

EXPOSE 3000

# 5. Docker marks the container (healthy) or (unhealthy)
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# 6. Exec form: node is PID 1 and receives SIGTERM on "docker stop"
CMD ["node", "server.js"]
