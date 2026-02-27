FROM node:20-alpine

WORKDIR /app

# Install deps
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Serve static build
RUN npm install -g serve
EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]