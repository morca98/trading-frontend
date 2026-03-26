FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies using npm
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Build the application
RUN npm run build || true

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
