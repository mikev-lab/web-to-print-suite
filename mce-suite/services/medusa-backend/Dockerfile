# --- Build Stage ---
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev) to build the app
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Run the build (this creates the .medusa/server directory)
RUN npm run build

# --- Production Stage ---
FROM node:20-slim

WORKDIR /app

# --- This is the new, critical part ---
# Copy the built server from the 'builder' stage
COPY --from=builder /app/.medusa/server .

# Install ONLY the production dependencies required by the build output
RUN npm install --omit=dev --legacy-peer-deps

# Expose the port and set the start command
EXPOSE 9000
CMD ["npm", "run", "start"]