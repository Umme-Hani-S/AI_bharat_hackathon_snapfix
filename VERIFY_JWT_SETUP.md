# Verify JWT Setup

## ✅ Configuration Check

Your authentication stack now uses only:
- **bcrypt** for password hashing
- **jsonwebtoken** for issuing/verifying tokens
- **`protect` middleware** for request-level authorization

No Passport layers or extra token identifiers are required.

## Current Setup

### 1. Token Generation (`backend/api/auth.js`)
- ✅ Includes `userId`, `clientId`, and `role` in the payload
- ✅ Uses `process.env.JWT_SECRET` from `.env`
- ✅ Sets issuer: `snapfix`
- ✅ Sets audience: `snapfix-users`
- ✅ Expires in 30 days

```javascript
const token = jwt.sign(
  {
    userId: user._id.toString(),
    clientId: user.clientId.toString(),
    role: user.role,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: '30d',
    issuer: 'snapfix',
    audience: 'snapfix-users',
  }
)
```

### 2. Token Validation (`backend/src/middleware/auth.js`)
- ✅ Extracts token from `Authorization: Bearer <token>` header (or cookie)
- ✅ Verifies JWT signature using `process.env.JWT_SECRET`
- ✅ Verifies user exists
- ✅ Verifies client exists (and is active unless it is the SaaS owner org)
- ✅ Verifies user belongs to client
- ✅ Attaches user details to `req.user`

### 3. Middleware Usage
- ✅ `protect` guards every authenticated route
- ✅ `authorize(...roles)` adds role-based checks on top

## Verify Your .env File

Make sure your `.env` file at the root contains:

```env
JWT_SECRET=your-unique-secret-key-here
MONGODB_URI=your-mongodb-connection-string
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

## Test the Setup

### 1. Start Backend
```bash
npm run dev:backend
```

You should see:
```
✅ MongoDB Connected: ...
🚀 Backend API running on port 5000
```

### 2. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@snapfix.com","password":"12345678"}'
```

Expected response:
```json
{
  "user": {
    "id": "...",
    "name": "SnapFix Admin",
    "email": "admin@snapfix.com",
    "role": "saas-owner",
    "clientId": "..."
  },
  "token": "eyJhbGci..." 
}
```

### 3. Test Protected Route

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer your-token-here"
```

## Troubleshooting

### Issue: "JWT_SECRET is not defined"
- **Fix**: Make sure `.env` file exists at root and contains `JWT_SECRET`
- **Fix**: Restart backend server after adding to `.env`

### Issue: "Not authorized, token missing"
- **Fix**: Ensure the frontend attaches `Authorization: Bearer <token>`
- **Fix**: Confirm the interceptor is reading from localStorage

### Issue: "Token expired"
- **Fix**: Re-login to generate a new token
- **Fix**: Confirm system clock is correct

## Security Checklist

- [x] JWT_SECRET is in `.env` file (not committed to Git)
- [x] `.env` is in `.gitignore`
- [x] JWT_SECRET is long and random (32+ characters)
- [x] Token expiration set (30 days)
- [x] Issuer and audience validated
- [x] `protect` middleware enabled on every protected route

## Next Steps

1. ✅ Keep `JWT_SECRET` safe and private
2. 🚀 Start backend server: `npm run dev:backend`
3. 🔐 Log in to generate a token
4. 🛡️ Hit a protected route with the token

Your JWT setup (bcrypt + JWT + protect) is ready! 🚀

