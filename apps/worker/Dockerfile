FROM node:18

# Install Docker CLI for running security tools
RUN apt-get update && apt-get install -y \
    docker.io \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3002

# Debug: List built files
RUN ls -R dist

# Start worker
CMD ["node", "dist/index.js"]
