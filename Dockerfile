# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the library and the application (SSR)
RUN npm run build:ssr && cp src/server/preview.html dist/ng-awesome-node-auth-prj/server/preview.html

# --- Stage 2: Runtime ---
FROM node:22-alpine

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Create uploads directory
RUN mkdir -p public/uploads

# Expose the application port
EXPOSE 4200

# Set environment to production by default
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/ng-awesome-node-auth-prj/server/server.mjs"]
