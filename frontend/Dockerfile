FROM node:20-alpine

WORKDIR /app

# Copy the package.json and lockfile
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Install dependencies in the frontend directory
RUN cd frontend && npm install

# Copy shared directory
COPY shared/ ./shared/

# Copy the rest of the frontend code
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# Build the Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
