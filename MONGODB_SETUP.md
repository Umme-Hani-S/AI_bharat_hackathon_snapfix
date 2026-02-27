# MongoDB Connection Setup Guide

## Fixing Authentication Errors

If you're seeing `bad auth: authentication failed` error, follow these steps:

### 1. Check Your Connection String Format

Your MongoDB Atlas connection string should look like this:

```
mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

**Important Notes:**
- Replace `username` with your MongoDB Atlas username
- Replace `password` with your MongoDB Atlas password (URL-encode special characters)
- Replace `cluster` with your cluster name
- Replace `dbname` with your database name

### 2. URL-Encode Special Characters in Password

If your password contains special characters like `@`, `#`, `%`, etc., you need to URL-encode them:

- `@` becomes `%40`
- `#` becomes `%23`
- `%` becomes `%25`
- `&` becomes `%26`
- `/` becomes `%2F`
- `:` becomes `%3A`
- `?` becomes `%3F`
- `=` becomes `%3D`

**Example:**
If your password is `P@ssw0rd#123`, it should be `P%40ssw0rd%23123` in the connection string.

### 3. Verify MongoDB Atlas Settings

1. **Database User:**
   - Go to MongoDB Atlas → Database Access
   - Make sure your user exists and has the correct password
   - User should have "Read and write to any database" or appropriate permissions

2. **Network Access:**
   - Go to MongoDB Atlas → Network Access
   - Add your IP address (or `0.0.0.0/0` for development - **not recommended for production**)
   - Wait a few minutes for changes to propagate

3. **Cluster Status:**
   - Make sure your cluster is running (not paused)
   - Free tier clusters pause after inactivity

### 4. Update Your .env File

Create or update `.env` file at the root of your project:

```env
MONGODB_URI=mongodb+srv://username:encodedpassword@cluster.mongodb.net/snapfix?retryWrites=true&w=majority
```

### 5. Test Connection

After updating your `.env` file, restart your server:

```bash
node app.js
```

You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
```

### Common Issues

**Issue: "authentication failed"**
- Solution: Check username/password, URL-encode special characters

**Issue: "ENOTFOUND" or "getaddrinfo"**
- Solution: Check internet connection, verify cluster is running

**Issue: "IP not whitelisted"**
- Solution: Add your IP to MongoDB Atlas Network Access

**Issue: "Cluster is paused"**
- Solution: Resume your cluster in MongoDB Atlas dashboard

### Quick Test

You can test your connection string using MongoDB Compass or the MongoDB shell:

```bash
mongosh "your-connection-string-here"
```

If this works, your connection string is correct!

