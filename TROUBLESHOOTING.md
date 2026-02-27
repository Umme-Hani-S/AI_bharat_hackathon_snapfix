# Troubleshooting: API Calls Not Reaching Backend

## Problem: 502 Bad Gateway Error

If you're seeing `502 Bad Gateway` errors when trying to access `/api/auth/login` or other API endpoints, this means:

1. ✅ Nginx is running and serving the frontend
2. ❌ Nginx cannot reach the backend server on port 5000

## Quick Diagnosis

### Step 1: Check if Backend is Running

SSH into your server and run:

```bash
# Check if Node.js process is running on port 5000
sudo netstat -tlnp | grep :5000
# or
sudo ss -tlnp | grep :5000
# or
sudo lsof -i :5000
```

**Expected output:** Should show a Node.js process listening on port 5000

**If nothing shows:** Backend is not running → Go to Step 2

### Step 2: Check Backend Logs

If you're using PM2 or systemd:

```bash
# PM2
pm2 logs

# systemd
sudo journalctl -u snapfix-backend -f

# Direct process
# Check where you started the backend and look at console output
```

### Step 3: Test Backend Directly

```bash
# Test if backend responds directly (bypassing nginx)
curl http://127.0.0.1:5000/api/health

# Expected response:
# {"status":"ok","message":"SnapFix API is running"}
```

**If this works:** Backend is running, but nginx proxy might be misconfigured → Go to Step 4

**If this fails:** Backend is not running or crashed → Go to Step 5

### Step 4: Verify Nginx Configuration

```bash
# Check nginx config syntax
sudo nginx -t

# Check if nginx is using the correct config
sudo nginx -T | grep -A 10 "location /api"

# Reload nginx after any changes
sudo systemctl reload nginx
# or
sudo service nginx reload
```

**Make sure your nginx config has:**

```nginx
location /api {
    proxy_pass http://127.0.0.1:5000;
    # ... other headers
}
```

**Important:** The `proxy_pass` should point to `http://127.0.0.1:5000` (not `http://localhost:5000`)

### Step 5: Start/Restart Backend

#### Option A: Using PM2 (Recommended)

```bash
# Navigate to project directory
cd /path/to/snapfix-v1

# Start backend with PM2
pm2 start app.js --name snapfix-backend --env production

# Or if already running, restart it
pm2 restart snapfix-backend

# Check status
pm2 status
pm2 logs snapfix-backend
```

#### Option B: Using systemd

```bash
# Start service
sudo systemctl start snapfix-backend

# Check status
sudo systemctl status snapfix-backend

# View logs
sudo journalctl -u snapfix-backend -f
```

#### Option C: Manual Start (for testing)

```bash
cd /path/to/snapfix-v1

# Make sure .env file exists with:
# NODE_ENV=production
# PORT=5000
# MONGODB_URI=your-mongodb-uri
# JWT_SECRET=your-jwt-secret

# Start backend
NODE_ENV=production node app.js
```

**Expected output:**
```
✅ MongoDB Connected: ...
🚀 Backend API running on port 5000
🌐 Frontend served from: http://localhost:5000
```

## Common Issues & Solutions

### Issue 1: Backend Crashes on Startup

**Check MongoDB connection:**
```bash
# Verify MongoDB URI in .env
cat .env | grep MONGODB_URI

# Test MongoDB connection
mongosh "your-mongodb-uri"
```

**Check if port 5000 is already in use:**
```bash
sudo lsof -i :5000
# If something else is using it, either:
# 1. Kill that process
# 2. Change PORT in .env to different port (and update nginx)
```

### Issue 2: Nginx Can't Connect to Backend

**Check firewall:**
```bash
# Allow localhost connections (should be allowed by default)
sudo ufw status
```

**Check if backend is binding to correct interface:**
- Backend should listen on `0.0.0.0:5000` or `127.0.0.1:5000`
- Check `app.js` - it should use `app.listen(PORT, ...)` which defaults to all interfaces

### Issue 3: CORS Errors

If you see CORS errors in browser console, check `app.js` CORS configuration:

```javascript
// Make sure your production IP/domain is in allowedOrigins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'http://16.176.20.144',
      'https://16.176.20.144',
      // ... your domains
    ]
```

### Issue 4: Wrong Nginx Config Location

Make sure nginx is using the correct config file:

```bash
# Find active nginx config
sudo nginx -T | grep "server_name 16.176.20.144"

# Common locations:
# /etc/nginx/sites-available/snapfix
# /etc/nginx/conf.d/snapfix.conf
# /etc/nginx/nginx.conf
```

## Verification Checklist

After fixing, verify:

- [ ] Backend is running: `curl http://127.0.0.1:5000/api/health` returns OK
- [ ] Nginx can reach backend: `curl http://16.176.20.144/api/health` returns OK
- [ ] Frontend loads: `http://16.176.20.144/login` shows login page
- [ ] API calls work: Try logging in, check browser Network tab
- [ ] No 502 errors in browser console

## Quick Fix Script

```bash
#!/bin/bash
# Quick diagnostic script

echo "=== Checking Backend Status ==="
if sudo lsof -i :5000 > /dev/null 2>&1; then
    echo "✅ Backend is running on port 5000"
else
    echo "❌ Backend is NOT running on port 5000"
    echo "   Start it with: cd /path/to/snapfix && NODE_ENV=production node app.js"
fi

echo ""
echo "=== Testing Backend Directly ==="
if curl -s http://127.0.0.1:5000/api/health > /dev/null; then
    echo "✅ Backend responds to direct requests"
    curl http://127.0.0.1:5000/api/health
else
    echo "❌ Backend does not respond to direct requests"
fi

echo ""
echo "=== Testing Through Nginx ==="
if curl -s http://16.176.20.144/api/health > /dev/null; then
    echo "✅ Backend responds through nginx"
    curl http://16.176.20.144/api/health
else
    echo "❌ Backend does not respond through nginx"
    echo "   Check nginx configuration and reload: sudo systemctl reload nginx"
fi
```

Save as `check-backend.sh`, make executable: `chmod +x check-backend.sh`, run: `./check-backend.sh`




