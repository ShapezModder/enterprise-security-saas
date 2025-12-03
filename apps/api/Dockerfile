FROM node:18

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

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Run migrations and start (mark stuck migration as rolled back first)
CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back 20251203_add_selected_stages || true && npx prisma migrate deploy && npm start"]
