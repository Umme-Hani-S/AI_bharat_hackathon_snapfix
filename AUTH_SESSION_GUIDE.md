# Authentication & Session Management Guide

## Overview

Snapfix uses **JWT (JSON Web Tokens)** for authentication and **localStorage** for session persistence. This provides a stateless, scalable authentication system.

## How It Works

### 1. **Login Flow**

```
User enters credentials → Backend validates → JWT token generated → Stored in localStorage → User authenticated
```

**Steps:**
1. User submits login form (`/auth/login`)
2. Backend validates email/password
3. Backend generates JWT token (expires in 30 days)
4. Token and user data stored in `localStorage`
5. Token automatically attached to all API requests
6. User redirected to dashboard

### 2. **Session Persistence**

**Storage:**
- `localStorage.token` - JWT token
- `localStorage.user` - User data (JSON string)
- `localStorage.authTimestamp` - Login timestamp

**Persistence Features:**
- ✅ Survives page refreshes
- ✅ Survives browser restarts
- ✅ Auto-validates on app load
- ✅ 30-day expiration (configurable)
- ✅ Automatic logout on token expiration

### 3. **Token Validation**

**On App Load:**
1. Check `localStorage` for token
2. Validate token age (max 30 days)
3. Verify token with server (`/auth/me`)
4. Restore user session if valid
5. Clear session if invalid

**On Every API Request:**
- Token automatically added to `Authorization: Bearer <token>` header
- Backend middleware validates token
- 401 response triggers automatic logout

### 4. **Logout Flow**

```
User clicks logout → Clear localStorage → Clear auth state → Redirect to login
```

**What Gets Cleared:**
- `localStorage.token`
- `localStorage.user`
- `localStorage.authTimestamp`
- Zustand auth state

## Implementation Details

### Frontend (`frontend/src/store/authStore.ts`)

**Key Functions:**
- `setAuth(user, token)` - Store auth data
- `logout()` - Clear all auth data
- `initialize()` - Restore session on app load
- `checkAuth()` - Validate token with server

**State:**
```typescript
{
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean
}
```

### Backend (`backend/api/auth.js`)

**Endpoints:**
- `POST /auth/login` - Authenticate user
- `POST /auth/register` - Create new user
- `GET /auth/me` - Validate token & get current user
- `POST /auth/logout` - Logout (client-side mainly)

**Token Generation:**
```javascript
jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' })
```

### Middleware (`backend/src/middleware/auth.js`)

**Protect Route:**
```javascript
router.get('/protected', protect, handler)
```

**What it does:**
1. Extract token from `Authorization` header
2. Verify JWT signature
3. Check token expiration
4. Load user from database
5. Attach user to `req.user`

### API Client (`frontend/src/api/client.ts`)

**Request Interceptor:**
- Automatically adds `Authorization: Bearer <token>` to all requests

**Response Interceptor:**
- Catches 401 (Unauthorized) responses
- Automatically logs out user
- Redirects to login page

## Security Features

### ✅ Implemented

1. **JWT Expiration** - Tokens expire after 30 days
2. **Token Validation** - Server validates every request
3. **Automatic Logout** - Invalid tokens trigger logout
4. **Password Hashing** - bcrypt with salt rounds
5. **HTTPS Ready** - Works with HTTPS in production
6. **XSS Protection** - localStorage (not httpOnly cookies, but acceptable for SPA)

### 🔒 Best Practices

1. **Environment Variables:**
   ```env
   JWT_SECRET=your-super-secret-key-min-32-chars
   ```

2. **Token Storage:**
   - ✅ localStorage (current) - Good for SPAs
   - ⚠️ Consider httpOnly cookies for enhanced security (requires CORS setup)

3. **Token Refresh:**
   - Current: 30-day expiration
   - Future: Implement refresh tokens for better security

4. **Session Timeout:**
   - Current: 30 days
   - Configurable in `backend/api/auth.js`:
     ```javascript
     expiresIn: '30d' // Change to '1h', '7d', etc.
     ```

## Usage Examples

### Login
```typescript
const { setAuth } = useAuthStore()
const response = await authApi.login({ email, password })
setAuth(response.user, response.token)
```

### Check Authentication
```typescript
const { isAuthenticated, user } = useAuthStore()
if (isAuthenticated) {
  console.log('Logged in as:', user.name)
}
```

### Logout
```typescript
const { logout } = useAuthStore()
logout() // Clears everything and redirects
```

### Protected Route
```typescript
<PrivateRoute>
  <Dashboard />
</PrivateRoute>
```

### Protected API Call
```typescript
// Token automatically added by interceptor
const response = await api.get('/issues')
```

## Troubleshooting

### "Not authorized, no token"
- **Cause:** Token not in localStorage
- **Fix:** User needs to login again

### "Not authorized, token failed"
- **Cause:** Token expired or invalid
- **Fix:** Automatic logout will trigger

### Session not persisting
- **Check:** Browser localStorage enabled?
- **Check:** Private/Incognito mode? (localStorage cleared on close)

### Infinite redirect loop
- **Check:** `/auth/me` endpoint working?
- **Check:** JWT_SECRET matches between requests?

## Future Enhancements

1. **Refresh Tokens**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days)
   - Automatic token refresh

2. **Remember Me**
   - Longer expiration for "remember me" option
   - Separate token type

3. **Multi-Device Sessions**
   - Track active sessions
   - Logout from all devices

4. **Session Management UI**
   - View active sessions
   - Revoke specific sessions

## Configuration

### Change Token Expiration

**Backend** (`backend/api/auth.js`):
```javascript
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || '', {
    expiresIn: '7d', // Change here
  })
}
```

**Frontend** (`frontend/src/store/authStore.ts`):
```typescript
// Change max session age
if (daysSinceLogin > 7) { // Change here
  // Session expired
}
```

### Change Storage Method

To use sessionStorage instead of localStorage:
```typescript
// In authStore.ts, replace:
localStorage.setItem → sessionStorage.setItem
localStorage.getItem → sessionStorage.getItem
localStorage.removeItem → sessionStorage.removeItem
```

**Note:** sessionStorage clears on tab close, localStorage persists.

## Summary

✅ **Current System:**
- JWT-based authentication
- localStorage persistence
- 30-day sessions
- Auto-validation on load
- Automatic logout on 401

✅ **Security:**
- Password hashing
- Token expiration
- Server-side validation
- Automatic cleanup

✅ **User Experience:**
- Persistent sessions
- No re-login needed
- Smooth authentication flow
- Loading states

