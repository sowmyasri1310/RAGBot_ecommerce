FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies to compile TS)
RUN npm ci

# Copy TypeScript source and configurations
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Remove development source and devDependencies to optimize image size
RUN npm prune --production

# Expose server port
EXPOSE 5000

# Start server
CMD ["node", "dist/index.js"]
