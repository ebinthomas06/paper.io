# --- Stage 1: Build the React Frontend ---
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Build the React app (creates the 'build' folder)
RUN npm run build

# --- Stage 2: The Final Game Server ---
FROM node:18-alpine

WORKDIR /app

# Copy package files again (for server dependencies)
COPY package*.json ./
RUN npm install --production

# Copy the Server Code
COPY server/ ./server/

# Copy the "Built" React App from Stage 1
# We move it from /app/build (Stage 1) to /app/build (Stage 2)
COPY --from=builder /app/build ./build

# Expose the game port
EXPOSE 4000

# Start the Game
CMD ["node", "server/index.js"]