# Production Deployment Guide

## Overview

In production, you **do NOT need Vite running**. The backend serves the pre-built static files.

## Production Flow

1. **Build the frontend** → Creates optimized static files in `frontend/dist`
2. **Start the backend** → Serves both API and frontend static files on port 5000
3. **No Vite dev server needed** → Everything runs from the backend

## Production Deployment Steps

### Step 1: Build Frontend

```bash
npm run build
```

This runs:
- `npm run build:frontend` 
- Which runs: `cd frontend && npm run build`
- Which runs: `tsc && vite build`
- Output: `frontend/dist/` (optimized, minified static files)

### Step 2: Set Environment Variables

Create/update `.env` file:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
FRONTEND_URL=http://localhost:5000
```

### Step 3: Start Production Server

```bash
npm start
```

Or:

```bash
NODE_ENV=production node app.js
```

### Step 4: Verify

- **Backend API**: `http://localhost:5000/api/health`
- **Frontend App**: `http://localhost:5000/` (served by backend)
- **API Endpoints**: `http://localhost:5000/api/*`

## How It Works

### Development Mode
```
Frontend (Vite) → Port 3000 → Proxies /api/* → Backend Port 5000
Backend (Express) → Port 5000 → API only
```

### Production Mode
```
Backend (Express) → Port 5000 → Serves:
  - /api/* → API endpoints
  - /* → Frontend static files from frontend/dist/
```

## Production Scripts

### Build Only
```bash
npm run build
```

### Start Production Server
```bash
npm start
# or
npm run start:prod
```

### Build + Start (One Command)
```bash
npm run build && npm start
```

## What Happens in Production

1. **Backend checks `NODE_ENV === 'production'`**
2. **Serves static files** from `frontend/dist/`:
   ```javascript
   app.use(express.static(frontendBuildPath))
   ```
3. **Serves React app** for all non-API routes:
   ```javascript
   app.get('*', (req, res) => {
     res.sendFile(path.join(frontendBuildPath, 'index.html'))
   })
   ```
4. **API routes** still work: `/api/auth/login`, `/api/issues`, etc.

## File Structure After Build

```
snapfix-v1/
├── frontend/
│   ├── dist/              ← Built static files (production)
│   │   ├── index.html
│   │   ├── assets/
│   │   │   ├── index-[hash].js
│   │   │   └── index-[hash].css
│   │   └── ...
│   └── src/               ← Source files (development)
├── backend/
├── app.js                 ← Production entry point
└── package.json
```

## Production Checklist

- [ ] Run `npm run build` to create `frontend/dist/`
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Set production `MONGODB_URI`
- [ ] Set production `JWT_SECRET` (strong, unique)
- [ ] Start with `npm start`
- [ ] Verify API: `http://localhost:5000/api/health`
- [ ] Verify Frontend: `http://localhost:5000/`
- [ ] Test login flow
- [ ] No Vite dev server running

## Important Notes

✅ **DO:**
- Build before deploying: `npm run build`
- Use `NODE_ENV=production`
- Serve from single port (5000)
- Use production MongoDB URI
- Use strong JWT_SECRET

❌ **DON'T:**
- Run Vite dev server in production
- Use development MongoDB in production
- Expose `.env` file
- Run `npm run dev` in production

## Deployment Platforms

### Railway / Render / Heroku

1. Set `NODE_ENV=production` in environment variables
2. Add build command: `npm run build`
3. Add start command: `npm start`
4. Backend will serve everything on port 5000

### Docker

```dockerfile
# Build stage
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18
WORKDIR /app
COPY --from=builder /app .
RUN npm install --production
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
```

## Summary

**Production = Build Once, Serve Forever**

1. `npm run build` → Creates `frontend/dist/`
2. `npm start` → Backend serves everything on port 5000
3. **No Vite needed** → Static files are pre-built

The backend becomes a full-stack server serving both API and frontend!

