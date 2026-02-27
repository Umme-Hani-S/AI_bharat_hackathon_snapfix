# Quick Start - Fix Backend Not Running

## Problem
The backend `/api/auth/login` endpoint is not getting hit because the backend server is not running.

## Solution

### Step 1: Create `.env` file

Create a `.env` file in the **root directory** (`snapfix-v1/.env`) with:

```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:5000
```

### Step 2: Get MongoDB Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (if needed)
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database password
6. Replace `<dbname>` with `snapfix`

Example:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/snapfix?retryWrites=true&w=majority
```

### Step 3: Start Backend Server

**Option A: Start both frontend and backend**
```bash
npm run dev
```

**Option B: Start backend only**
```bash
npm run dev:backend
```

You should see:
```
✅ MongoDB Connected: ...
🚀 Backend API running on port 5000
📱 Frontend dev server should run on port 3000
```

### Step 4: Verify Backend is Running

Open browser and go to:
```
http://localhost:5000/api/health
```

Should return:
```json
{"status":"ok","message":"SnapFix API is running"}
```

### Step 5: Test Login

1. Make sure frontend is running on port 3000 (dev) or 5000 (production)
2. Go to `http://localhost:3000/login` (development) or `http://localhost:5000/login` (production)
3. Try to login

## Route Verification

The login route is set up as:
- **Route file**: `backend/api/auth.js`
- **Route path**: `POST /login`
- **Mounted at**: `app.use('/api/auth', authRoutes)` in `app.js`
- **Full URL**: `POST http://localhost:5000/api/auth/login` (backend always on 5000)

## Debugging

If the route is still not being hit:

1. **Check backend is running:**
   ```bash
   # Check if port 5000 is in use
   netstat -ano | findstr :5000
   ```

2. **Check backend logs:**
   - Look for "🔐 Login attempt:" in console when you try to login
   - Check for MongoDB connection errors
   - Check for any other errors

3. **Check frontend proxy:**
   - Frontend should proxy `/api/*` to `http://localhost:5000/api/*`
   - Check `frontend/vite.config.ts` proxy configuration
   - Frontend dev server runs on port 3000 in development

4. **Test directly:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@snapfix.com","password":"12345678"}'
   ```

## Common Issues

### Issue: "MONGODB_URI is not defined"
- **Fix**: Create `.env` file with `MONGODB_URI`

### Issue: "ECONNREFUSED"
- **Fix**: Backend server is not running. Start it with `npm run dev:backend`

### Issue: "MongoDB connection error"
- **Fix**: Check your MongoDB connection string is correct
- **Fix**: Make sure your IP is whitelisted in MongoDB Atlas (use `0.0.0.0/0` for development)

### Issue: Route not found
- **Fix**: Make sure backend server started successfully
- **Fix**: Check route is mounted correctly in `app.js`

