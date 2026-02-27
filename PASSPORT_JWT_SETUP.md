# JWT Protect Middleware Setup

> **Heads up:** Passport has been removed. Authentication is now handled with bcrypt + JWT + a lightweight `protect` middleware. This document keeps the old filename for context but reflects the new implementation.

## Overview

- Passwords are hashed with **bcrypt**.
- Tokens are issued with **jsonwebtoken**.
- Every protected route uses the custom **`protect`** middleware.

## Implementation

### 1. Dependencies

Already installed (no Passport needed):

```bash
npm install bcryptjs jsonwebtoken
```

### 2. Token Generation (`backend/api/auth.js`)

```javascript
const jwt = require('jsonwebtoken')

const generateToken = (userId, clientId, role) => {
  return jwt.sign(
    { userId, clientId, role },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: 'snapfix',
      audience: 'snapfix-users',
    }
  )
}
```

### 3. Protect Middleware (`backend/src/middleware/auth.js`)

```javascript
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

  const user = await User.findById(decoded.userId).select('-password')
  const client = await Client.findById(decoded.clientId)

  if (client.userType !== 'saas-owner' && client.status !== 'active') {
    return res.status(403).json({ message: `Client is ${client.status}` })
  }

  req.user = {
    userId: user._id.toString(),
    clientId: client._id.toString(),
    role: decoded.role,
    email: user.email,
    name: user.name,
  }

  next()
}
```

### 4. Usage in Routes

```javascript
const { protect, authorize } = require('../middleware/auth')

router.get('/issues', protect, async (req, res) => {
  const issues = await Issue.find({ clientId: req.user.clientId })
  res.json(issues)
})

router.post(
  '/admin/users',
  protect,
  authorize('saas-owner', 'superadmin'),
  createUser
)
```

## Token Structure

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  clientId: "507f1f77bcf86cd799439012",
  role: "saas-owner",
  iat: 1703123456,
  exp: 1705715456,
  iss: "snapfix",
  aud: "snapfix-users"
}
```

## Security Features

1. **JWT Claims**
   - `iss`: `snapfix`
   - `aud`: `snapfix-users`
   - `exp`: 30 days
   - Custom: `userId`, `clientId`, `role`

2. **Validation Checks**
   - Signature verification via `JWT_SECRET`
   - Expiration enforcement
   - User + client existence checks
   - Client status enforcement (unless SaaS owner org)
   - User/client relationship validation

3. **Role-Based Guard**
   - `authorize(...roles)` ensures only specific roles hit a route

## Error Handling

- Missing token → `401 Not authorized, token missing`
- Invalid signature / expired token → `401 Token expired / Invalid token`
- Client inactive → `403 Client is inactive`
- Role mismatch → `403 Access denied`

## Testing

```bash
# Valid token
curl -X GET http://localhost:5000/api/issues \
  -H "Authorization: Bearer <token>"

# Invalid token
curl -X GET http://localhost:5000/api/issues \
  -H "Authorization: Bearer invalid-token"
```

## Next Steps

- [ ] (Optional) Add refresh tokens
- [ ] (Optional) Add token blacklist/rotation
- [x] ✅ Remove Passport dependency
- [x] ✅ Keep auth stack lean: bcrypt + JWT + protect

