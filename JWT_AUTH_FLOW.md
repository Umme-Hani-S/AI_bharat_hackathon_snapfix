# JWT Authentication Flow in Snapfix

## Overview

Snapfix uses **bcrypt + JWT + custom protect middleware** with client-based multi-tenancy. Each JWT token contains `userId`, `clientId`, and `role` to ensure proper access control. Tokens are signed with a secure `JWT_SECRET` stored in environment variables.

## Step-by-Step Flow

### 1. User Logs In (Email + Password)

**Frontend Request:**
```typescript
POST /api/auth/login
{
  email: "tech@store.com",
  password: "123456"
}
```

### 2. Backend Verifies Credentials

**Backend Process:**
1. Find user in database by email
2. Check password using bcrypt comparison
3. Verify user has `clientId` assigned
4. Check client exists and is `active`
5. Get user role (`field-staff`, `admin`, `head-of-staff`)

**Validation Checks:**
- ✅ User exists
- ✅ Password matches
- ✅ User has clientId
- ✅ Client exists
- ✅ Client status is `active`
- ✅ User belongs to client

### 3. Backend Creates JWT Token

**JWT Payload:**
```javascript
{
  userId: "abc123",
  clientId: "xyz001",
  role: "admin"
}
```

**Token Generation:**
```javascript
const token = jwt.sign(
  { 
    userId: user._id.toString(),
    clientId: user.clientId.toString(),
    role: user.role
  },
  process.env.JWT_SECRET, // Secret key from .env file
  { 
    expiresIn: '30d',
    issuer: 'snapfix',
    audience: 'snapfix-users'
  }
)
```

**Response:**
```json
{
  "user": {
    "id": "abc123",
    "name": "John Doe",
    "email": "tech@store.com",
    "role": "admin",
    "clientId": "xyz001"
  },
  "token": "eyJhbGci...longstring"
}
```

**Token is signed with:** `JWT_SECRET` from `.env` file

### 4. Frontend Stores JWT

**Storage Method:** localStorage (can be upgraded to HttpOnly cookies)

**Stored Data:**
- `localStorage.token` - JWT token
- `localStorage.user` - User data (JSON string)
- `localStorage.authTimestamp` - Login timestamp

**Code:**
```typescript
localStorage.setItem('token', token)
localStorage.setItem('user', JSON.stringify(user))
localStorage.setItem('authTimestamp', Date.now().toString())
```

### 5. User Makes API Calls

**Automatic Token Attachment:**
```typescript
// Axios interceptor adds token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**Request Header:**
```
Authorization: Bearer eyJhbGci...
```

### 6. Backend Verifies JWT on Every API Request

**Middleware: `protect` (Custom JWT verification)**

**Verification Steps:**
1. Extract token from `Authorization: Bearer <token>` header (or `req.cookies.token`)
2. Verify JWT signature using `JWT_SECRET` from `.env`
3. Decode token to get `userId`, `clientId`, `role`
4. Verify user exists in database
5. Verify client exists and (if not a SaaS owner org) is `active`
6. Verify user belongs to client
7. Attach user data to `req.user`

**Code (Protect Middleware):**
```javascript
// backend/src/middleware/auth.js
const getTokenFromRequest = (req) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1]
  }
  return req.cookies?.token || null
}

const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req)
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' })
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'snapfix',
    audience: 'snapfix-users',
  })

  const { userId, clientId, role } = decoded

  const user = await User.findById(userId).select('-password')
  const client = await Client.findById(clientId)

  if (client.userType !== 'saas-owner' && client.status !== 'active') {
    return res.status(403).json({ message: `Client is ${client.status}` })
  }

  req.user = {
    userId: user._id.toString(),
    clientId: clientId.toString(),
    role,
    email: user.email,
    name: user.name,
  }

  return next()
}
```

### 7. Backend Attaches User Data to Request

**After Validation:**
```javascript
req.user = {
  userId: "abc123",
  clientId: "xyz001",
  role: "admin",
  email: "tech@store.com",
  name: "John Doe"
}
```

**Note:** User data is attached by the custom `protect` middleware after successful token validation.

**Usage in Controllers:**
```javascript
router.get('/issues', protect, async (req, res) => {
  // Access user data
  const { userId, clientId, role } = req.user
  
  // Filter by client
  const issues = await Issue.find({ 
    clientId: req.user.clientId 
  })
  
  res.json(issues)
})
```

## Role-Based Access Control

**Middleware: `authorize`**

**Usage:**
```javascript
const { protect, authorize } = require('../middleware/auth')

// Only admins can access
router.post('/clients', protect, authorize('admin'), createClient)

// Admins or head-of-staff can access
router.get('/reports', protect, authorize('admin', 'head-of-staff'), getReports)
```

**Implementation:**
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      })
    }
    
    next()
  }
}
```

## Security Features

### ✅ Implemented

1. **JWT Token Expiration** - 30 days
2. **Client Verification** - Every request checks client status
3. **User-Client Validation** - Ensures user belongs to client
4. **Role-Based Access Control** - `authorize` middleware
5. **Password Hashing** - bcrypt with 12 salt rounds
6. **Token Signature Verification** - Prevents tampering (via JWT_SECRET)
7. **Automatic Logout** - On token expiration or invalid token
8. **Protect Middleware** - Custom JWT verification flow

### 🔒 Token Security

**JWT Payload Structure:**
```javascript
{
  userId: "user_id",
  clientId: "client_id",
  role: "admin",
  iat: 1234567890,  // Issued at
  exp: 1234567890,  // Expires at
  iss: "snapfix",   // Issuer
  aud: "snapfix-users" // Audience
}
```

**Token Validation:**
- ✅ Signature verified with `JWT_SECRET` from `.env`
- ✅ Expiration checked automatically
- ✅ Payload structure validated
- ✅ User and client verified from database
- ✅ Issuer and audience validated
- ✅ Secure secret key (128+ characters recommended)

## Error Handling

### Common Errors

**401 Unauthorized:**
- No token provided
- Invalid token signature
- Token expired
- User not found

**403 Forbidden:**
- Client not found
- Client inactive
- User doesn't belong to client
- Insufficient role permissions

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: ['field-staff', 'admin', 'head-of-staff'],
  clientId: ObjectId (required, ref: 'Client'),
  team: ObjectId (ref: 'Team')
}
```

### Client Model (Organisation)
```javascript
{
  name: String,
  email: String (unique),
  companyName: String,
  status: ['active', 'inactive', 'pending'],
  users: [ObjectId] (ref: 'User'),
  ...
}
```

## Usage Examples

### Protected Route
```javascript
router.get('/dashboard', protect, async (req, res) => {
  const { userId, clientId, role } = req.user
  // Access granted, user data available
})
```

### Role-Protected Route
```javascript
router.post('/admin/users', 
  protect, 
  authorize('admin'), 
  async (req, res) => {
    // Only admins can access
  }
)
```

### Frontend Usage
```typescript
// Login
const response = await authApi.login({ email, password })
setAuth(response.user, response.token)

// Access user data
const { user, isAuthenticated } = useAuthStore()
console.log(user.clientId) // Available

// Make authenticated request
const issues = await api.get('/issues') // Token auto-attached
```

## Migration Notes

**For Existing Users:**
- Run seed script to assign clientId
- Update existing users to have clientId
- Re-login required to get new token format

**Breaking Changes:**
- Old tokens (with only `id`) will be rejected
- Users must re-login to get new token format
- Registration now requires `clientId`
- JWT_SECRET must be set in `.env` file

## Best Practices

1. **Always use `protect` middleware** for authenticated routes
2. **Use `authorize` middleware** for role-based access
3. **Filter by `clientId`** in all queries
4. **Never trust client data** - always verify from database
5. **Use HTTPS in production** for secure token transmission
6. **Keep JWT_SECRET secure** - never commit to version control
7. **Use strong JWT_SECRET** - minimum 32 characters, preferably 64+
8. **Consider HttpOnly cookies** for enhanced security (future)

