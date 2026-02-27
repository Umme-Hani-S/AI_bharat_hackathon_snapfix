# -----------------------------
# 1️⃣ Frontend build stage
# -----------------------------
    FROM node:20-alpine AS frontend-build

    WORKDIR /frontend
    COPY frontend/package.json frontend/package-lock.json* ./
    RUN npm install
    COPY frontend/ .
    RUN npm run build
        
    # -----------------------------
    # 2️⃣ Backend runtime stage
    # -----------------------------
    
    FROM node:20-alpine
    
    WORKDIR /app
    
    # Copy root files
    COPY package.json package-lock.json ./
    
    # Copy backend package.json
    COPY backend/package.json ./backend/
    
    # Install backend dependencies ONLY
    RUN cd backend && npm install --omit=dev
    
    # Copy backend source code
    COPY backend ./backend
    
    # Copy root app.js (entry file)
    COPY app.js serverVariables.js ./
    
    
    
    # Copy built frontend from stage 1
    COPY --from=frontend-build /frontend/dist ./frontend/dist
    
    ENV NODE_ENV=production
    EXPOSE 5000
    
    CMD ["node", "app.js"]