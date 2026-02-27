# SnapFix - Design Document

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App (React Native/Flutter)          │
│  - Dashboard      │  - Offline Support                           │
│  - Admin Panel    │  - GPS Capture                               │
│  - Reports        │  - Camera Integration                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Express.js Server                                               │
│  - Authentication Middleware (JWT)                               │
│  - Rate Limiting                                                 │
│  - CORS Protection                                               │
│  - Request Validation                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  API Routes                                                      │
│  - Auth Routes        - Issue Routes      - User Routes          │
│  - Site Routes        - Category Routes   - Department Routes    │
│  - Mobile API Routes  - Client Routes     - Location Routes      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Access Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Mongoose Models                                                 │
│  - User Model         - Issue Model       - Client Model         │
│  - Site Model         - Category Model    - Department Model     │
│  - Location Model     - Log Model                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  MongoDB Atlas    │  AWS S3         │  OpenAI API                │
│  (Database)       │  (Image Store)  │  (AI Analysis)             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: JavaScript (CommonJS)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer with Multer-S3
- **Validation**: Express Validator
- **Security**: Helmet, CORS, bcryptjs

#### Cloud Services
- **Database**: MongoDB Atlas
- **Image Storage**: AWS S3
- **AI Processing**: OpenAI API (GPT-4 Vision)

#### Mobile (Future)
- **Framework**: React Native or Flutter
- **Offline Storage**: AsyncStorage or SQLite
- **API Client**: Axios with React Query

---

## 2. Database Design

### 2.1 Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Client     │◄────────│     User     │────────►│     Site     │
│              │ 1     * │              │ *     * │              │
│ - userType   │         │ - roles[]    │         │ - name       │
│ - status     │         │ - clientId   │         │ - code       │
└──────────────┘         └──────────────┘         └──────────────┘
                                │                         │
                                │ *                       │ 1
                                │                         │
                                ▼                         ▼ *
                         ┌──────────────┐         ┌──────────────┐
                         │    Issue     │────────►│   Location   │
                         │              │ *     1 │              │
                         │ - status     │         │ - name       │
                         │ - priority   │         │ - siteId     │
                         │ - createdGps │         └──────────────┘
                         │ - resolvedGps│
                         └──────────────┘
                                │
                                │ *
                                ▼ 1
                         ┌──────────────┐
                         │  Department  │
                         │              │
                         │ - name       │
                         │ - siteId     │
                         └──────────────┘
                                │
                                │ *
                                ▼ 1
                         ┌──────────────┐
                         │   Category   │
                         │              │
                         │ - name       │
                         │ - color      │
                         └──────────────┘
```


### 2.2 Data Models

#### 2.2.1 User Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  roles: [String] (enum: ['saas-owner', 'superadmin', 'client', 'head-of-staff', 'field-staff', 'tenants', 'vendors']),
  clientId: ObjectId (ref: 'Client', required),
  sites: [ObjectId] (ref: 'Site'),
  departments: [ObjectId] (ref: 'Department'),
  profilePicture: String,
  phone: String,
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2.2 Issue Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  status: String (enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open'),
  priority: String (enum: ['low', 'medium', 'high', 'critical'], default: 'medium'),
  images: [String] (S3 URLs),
  resolutionImages: [String] (S3 URLs),
  resolutionDescription: String,
  createdGps: {
    latitude: Number (required),
    longitude: Number (required)
  },
  resolvedGps: {
    latitude: Number,
    latitude: 679
    kuneomLyume hbds a
     
     hsdbs
     bhsad
     
    latitide : Number , 
    longtitude:Number , 
    jhdk

    longitude: Number
  },
  siteId: ObjectId (ref: 'Site', required),
  categoryId: ObjectId (ref: 'Category'),
  departmentId: ObjectId (ref: 'Department'),
  locationId: ObjectId (ref: 'Location'),
  assignedTo: ObjectId (ref: 'User'),
  createdBy: ObjectId (ref: 'User', required),
  clientId: ObjectId (ref: 'Client', required),
  aiReportAnalysis: {
    suggestedPersonal: [String],
    potentialRisks: [String],
    aiIssueTitle: String
  },
  aiResolutionAnalysis: {
    resolved: Boolean,
    aiConfidence: Number,
    reasoning: String,
    imageComparison: String,
    gpsMatch: Boolean,
    gpsDistance: Number,
    missingDetails: [String]
  },
  platform: String (enum: ['mobile-ios', 'mobile-android', 'mobile-web', 'web', 'public', 'api']),
  dueDate: Date,
  resolvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2.3 Client Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  code: String (unique),
  userType: String (enum: ['saas-owner', 'client'], default: 'client'),
  status: String (enum: ['active', 'inactive', 'suspended'], default: 'active'),
  contactEmail: String,
  contactPhone: String,
  address: String,
  logo: String,
  subscription: {
    plan: String,
    startDate: Date,
    endDate: Date,
    isActive: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2.4 Site Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  code: String (required),
  clientId: ObjectId (ref: 'Client', required),
  address: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  qrCode: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2.5 Department Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  clientId: ObjectId (ref: 'Client', required),
  siteId: ObjectId (ref: 'Site'),
  isCompliance: Boolean (default: false),
  description: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2.6 Category Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  color: String,
  subcategories: [String],
  clientId: ObjectId (ref: 'Client', required),
  icon: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2.7 Location Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  siteId: ObjectId (ref: 'Site', required),
  description: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2.8 Log Model
```javascript
{
  _id: ObjectId,
  issueId: ObjectId (ref: 'Issue', required),
  userId: ObjectId (ref: 'User', required),
  action: String (required),
  details: Object,
  timestamp: Date (default: Date.now)
}
```

### 2.3 Database Indexes

```javascript
// User indexes
User.index({ email: 1 }, { unique: true })
User.index({ clientId: 1 })
User.index({ roles: 1 })

// Issue indexes
Issue.index({ clientId: 1, status: 1 })
Issue.index({ siteId: 1, status: 1 })
Issue.index({ assignedTo: 1, status: 1 })
Issue.index({ createdBy: 1 })
Issue.index({ createdAt: -1 })
Issue.index({ status: 1, priority: 1 })

// Site indexes
Site.index({ clientId: 1 })
Site.index({ code: 1 }, { unique: true })

// Department indexes
Department.index({ clientId: 1 })
Department.index({ siteId: 1 })

// Category indexes
Category.index({ clientId: 1 })

// Location indexes
Location.index({ siteId: 1 })
```

---

## 3. API Design

### 3.1 API Structure

```
/api
├── /auth
│   ├── POST /register
│   ├── POST /login
│   └── POST /logout
├── /users
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PATCH /:id
│   └── DELETE /:id
├── /issues
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PATCH /:id
│   ├── PATCH /:id/status
│   └── POST /:id/ai-suggestions
├── /sites
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PATCH /:id
│   └── DELETE /:id
├── /departments
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PATCH /:id
│   └── DELETE /:id
├── /categories
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PATCH /:id
│   └── DELETE /:id
├── /locations
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PATCH /:id
│   └── DELETE /:id
├── /clients
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PATCH /:id
│   └── DELETE /:id
└── /mobile
    ├── /auth
    │   └── POST /login
    ├── /issues
    │   ├── GET /
    │   ├── GET /:id
    │   ├── POST /
    │   └── PATCH /:id/resolve
    ├── /categories
    │   └── GET /
    ├── /sites
    │   └── GET /
    ├── /departments
    │   └── GET /
    └── /locations
        └── GET /
```

### 3.2 Authentication Flow

```
┌─────────┐                 ┌─────────┐                 ┌──────────┐
│ Client  │                 │  API    │                 │ Database │
└────┬────┘                 └────┬────┘                 └────┬─────┘
     │                           │                           │
     │ POST /api/auth/login      │                           │
     │ { email, password }       │                           │
     ├──────────────────────────►│                           │
     │                           │ Find user by email        │
     │                           ├──────────────────────────►│
     │                           │                           │
     │                           │◄──────────────────────────┤
     │                           │ User data                 │
     │                           │                           │
     │                           │ Compare password (bcrypt) │
     │                           │                           │
     │                           │ Generate JWT token        │
     │                           │                           │
     │◄──────────────────────────┤                           │
     │ { token, user }           │                           │
     │                           │                           │
     │ Subsequent requests       │                           │
     │ Authorization: Bearer token│                          │
     ├──────────────────────────►│                           │
     │                           │ Verify JWT token          │
     │                           │                           │
     │                           │ Decode userId, clientId   │
     │                           │                           │
     │                           │ Fetch user & client       │
     │                           ├──────────────────────────►│
     │                           │                           │
     │                           │◄──────────────────────────┤
     │                           │ User & client data        │
     │                           │                           │
     │◄──────────────────────────┤                           │
     │ Response data             │                           │
     │                           │                           │
```

### 3.3 Issue Creation Flow (Mobile)

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌─────────┐
│ Mobile  │         │  API    │         │   AWS    │         │ OpenAI  │
│  App    │         │ Server  │         │   S3     │         │   API   │
└────┬────┘         └────┬────┘         └────┬─────┘         └────┬────┘
     │                   │                   │                    │
     │ Capture GPS       │                   │                    │
     │ Take photo        │                   │                    │
     │                   │                   │                    │
     │ POST /api/mobile/issues               │                    │
     │ FormData: {       │                   │                    │
     │   siteId,         │                   │                    │
     │   latitude,       │                   │                    │
     │   longitude,      │                   │                    │
     │   description,    │                   │                    │
     │   images[]        │                   │                    │
     │ }                 │                   │                    │
     ├──────────────────►│                   │                    │
     │                   │ Validate GPS      │                    │
     │                   │ Validate inputs   │                    │
     │                   │                   │                    │
     │                   │ Upload images     │                    │
     │                   ├──────────────────►│                    │
     │                   │                   │                    │
     │                   │◄──────────────────┤                    │
     │                   │ S3 URLs           │                    │
     │                   │                   │                    │
     │                   │ Analyze image with AI                  │
     │                   ├───────────────────────────────────────►│
     │                   │                                        │
     │                   │◄───────────────────────────────────────┤
     │                   │ AI analysis result                     │
     │                   │ (title, category, priority, risks)     │
     │                   │                                        │
     │                   │ Save issue to DB                       │
     │                   │                                        │
     │◄──────────────────┤                                        │
     │ { issue data }    │                                        │
     │                   │                                        │
```

### 3.4 Issue Resolution Flow (Mobile)

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌─────────┐
│ Mobile  │         │  API    │         │   AWS    │         │ OpenAI  │
│  App    │         │ Server  │         │   S3     │         │   API   │
└────┬────┘         └────┬────┘         └────┬─────┘         └────┬────┘
     │                   │                   │                    │
     │ Capture GPS       │                   │                    │
     │ Take resolution   │                   │                    │
     │ photo             │                   │                    │
     │                   │                   │                    │
     │ PATCH /api/mobile/issues/:id/resolve  │                    │
     │ FormData: {       │                   │                    │
     │   latitude,       │                   │                    │
     │   longitude,      │                   │                    │
     │   resolutionDesc, │                   │                    │
     │   resolutionImage │                   │                    │
     │ }                 │                   │                    │
     ├──────────────────►│                   │                    │
     │                   │ Fetch issue       │                    │
     │                   │ Validate GPS      │                    │
     │                   │ (50m tolerance)   │                    │
     │                   │                   │                    │
     │                   │ Calculate distance│                    │
     │                   │ between GPS points│                    │
     │                   │                   │                    │
     │                   │ Upload resolution │                    │
     │                   │ image             │                    │
     │                   ├──────────────────►│                    │
     │                   │                   │                    │
     │                   │◄──────────────────┤                    │
     │                   │ S3 URL            │                    │
     │                   │                   │                    │
     │                   │ Compare images with AI                 │
     │                   │ (issue vs resolution)                  │
     │                   ├───────────────────────────────────────►│
     │                   │                                        │
     │                   │◄───────────────────────────────────────┤
     │                   │ AI validation result                   │
     │                   │ (resolved, confidence, reasoning)      │
     │                   │                                        │
     │                   │ Update issue status                    │
     │                   │ Save resolution data                   │
     │                   │                                        │
     │◄──────────────────┤                                        │
     │ { issue, validation }                                      │
     │                   │                                        │
```

### 3.5 API Response Format

#### Success Response
```javascript
{
  // Single resource
  "data": { ... },
  
  // Or list of resources
  "data": [ ... ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

#### Error Response
```javascript
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": [ // Optional validation errors
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 4. Frontend Design

### 4.1 Component Architecture

```
src/
├── api/                    # API client functions
│   ├── auth.ts
│   ├── issues.ts
│   ├── users.ts
│   ├── sites.ts
│   ├── categories.ts
│   ├── departments.ts
│   └── client.ts
├── components/             # Reusable components
│   ├── Layout.tsx
│   ├── DateRangePicker.tsx
│   ├── DateTimePicker.tsx
│   └── LocationMap.tsx
├── pages/                  # Page components
│   ├── Dashboard.tsx
│   ├── Tickets.tsx
│   ├── IssueDetail.tsx
│   ├── IssueReport.tsx
│   ├── Sites.tsx
│   ├── Teams.tsx
│   ├── Users.tsx
│   ├── Categories.tsx
│   ├── Settings.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── store/                  # State management
│   └── authStore.ts
├── utils/                  # Utility functions
│   └── validation.ts
├── schemas/                # Validation schemas
│   ├── issues.ts
│   └── logs.ts
├── App.tsx                 # Main app component
└── main.tsx                # Entry point
```

### 4.2 State Management

#### Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}
```

#### Local State Management
- Component-level state using React hooks (useState, useReducer)
- Form state using controlled components
- API data caching using React Query (future enhancement)

### 4.3 Routing Structure

```typescript
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/public/report" element={<PublicIssueReport />} />
  
  {/* Protected routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<Layout />}>
      <Route index element={<Dashboard />} />
      <Route path="tickets" element={<Tickets />} />
      <Route path="tickets/:id" element={<IssueDetail />} />
      <Route path="report" element={<IssueReport />} />
      <Route path="sites" element={<Sites />} />
      <Route path="teams" element={<Teams />} />
      <Route path="users" element={<Users />} />
      <Route path="categories" element={<Categories />} />
      <Route path="settings" element={<Settings />} />
      <Route path="reports" element={<Reports />} />
      <Route path="logs" element={<Logs />} />
      
      {/* Admin routes */}
      <Route path="clients" element={<Clients />} />
      <Route path="clients/:id" element={<ClientDetail />} />
    </Route>
  </Route>
</Routes>
```

### 4.4 Design System

#### Color Palette (Dark Theme)
```css
--dark-bg: #0f172a;           /* Main background */
--dark-surface: #1e293b;      /* Card/panel background */
--dark-card: #334155;         /* Elevated card background */
--dark-border: #475569;       /* Border color */
--dark-text: #f1f5f9;         /* Primary text */
--dark-text-muted: #cbd5e1;   /* Secondary text */
--primary-600: #0284c7;       /* Primary brand color */
--primary-700: #0369a1;       /* Primary hover */
--success: #10b981;           /* Success state */
--warning: #f59e0b;           /* Warning state */
--error: #ef4444;             /* Error state */
--info: #3b82f6;              /* Info state */
```

#### Typography
```css
/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 
             'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 
             sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

#### Spacing
```css
/* Tailwind spacing scale */
0.5 = 0.125rem (2px)
1 = 0.25rem (4px)
2 = 0.5rem (8px)
3 = 0.75rem (12px)
4 = 1rem (16px)
6 = 1.5rem (24px)
8 = 2rem (32px)
12 = 3rem (48px)
16 = 4rem (64px)
```

#### Component Patterns

**Card Component**
```tsx
<div className="bg-dark-surface border border-dark-border rounded-lg p-6">
  {/* Card content */}
</div>
```

**Button Component**
```tsx
<button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
  {/* Button text */}
</button>
```

**Status Badge**
```tsx
<span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
  {/* Status text */}
</span>
```

---

## 5. Security Design

### 5.1 Authentication & Authorization

#### JWT Token Structure
```javascript
{
  userId: "user_id",
  clientId: "client_id",
  role: "field-staff",
  iat: 1234567890,
  exp: 1234654290
}
```

#### Token Storage
- **Web**: localStorage (with XSS protection)
- **Mobile**: Secure storage (Keychain/Keystore)

#### Authorization Middleware
```javascript
const protect = async (req, res, next) => {
  // 1. Extract token from Authorization header
  // 2. Verify JWT signature
  // 3. Decode payload
  // 4. Fetch user and client from database
  // 5. Verify user belongs to client
  // 6. Attach user to request object
  // 7. Call next()
}
```

#### Role-Based Access Control (RBAC)

```javascript
// Permission matrix
const permissions = {
  'saas-owner': {
    clients: ['create', 'read', 'update', 'delete'],
    issues: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    sites: ['create', 'read', 'update', 'delete'],
    all: true
  },
  'superadmin': {
    clients: ['read', 'update'],
    issues: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    sites: ['create', 'read', 'update', 'delete']
  },
  'client': {
    issues: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    sites: ['create', 'read', 'update', 'delete'],
    scope: 'organization'
  },
  'head-of-staff': {
    issues: ['create', 'read', 'update'],
    users: ['read'],
    scope: 'department'
  },
  'field-staff': {
    issues: ['create', 'read', 'update'],
    scope: 'assigned'
  },
  'tenants': {
    issues: ['create', 'read'],
    scope: 'own'
  },
  'vendors': {
    issues: ['read', 'update'],
    scope: 'assigned'
  }
};
```

### 5.2 Data Security

#### Password Hashing
```javascript
// Using bcryptjs with 10 salt rounds
const hashedPassword = await bcrypt.hash(password, 10);
const isMatch = await bcrypt.compare(password, hashedPassword);
```

#### Input Validation
```javascript
// Using express-validator
const validateIssueCreation = [
  body('siteId').isMongoId().withMessage('Invalid site ID'),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('description').optional().isString().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
];
```

#### SQL Injection Prevention
- Using Mongoose ODM with parameterized queries
- No raw MongoDB queries with user input

#### XSS Prevention
- React automatically escapes JSX content
- Sanitize HTML content if rendering user-generated HTML
- Use Content Security Policy headers

#### CSRF Protection
- SameSite cookie attribute
- CSRF tokens for state-changing operations (future)

### 5.3 API Security

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

#### CORS Configuration
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

#### Security Headers (Helmet)
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));
```

---

## 6. AI Integration Design

### 6.1 OpenAI API Integration

#### Issue Analysis Prompt
```javascript
const analyzeIssuePrompt = `
Analyze this maintenance issue image and provide:
1. A descriptive title (max 100 characters)
2. Suggested category (e.g., Plumbing, Electrical, HVAC)
3. Priority level (low, medium, high, critical)
4. Potential risks
5. Suggested personnel/department

Image description: ${description}

Respond in JSON format:
{
  "title": "...",
  "category": "...",
  "priority": "...",
  "risks": ["...", "..."],
  "suggestedPersonnel": ["...", "..."]
}
`;
```

#### Resolution Validation Prompt
```javascript
const validateResolutionPrompt = `
Compare these two images:
1. Original issue image
2. Resolution image

Determine if the issue has been properly resolved.

Provide:
1. Is the issue resolved? (true/false)
2. Confidence score (0-1)
3. Detailed reasoning
4. Image comparison analysis
5. Any missing details

Original issue description: ${issueDescription}
Resolution description: ${resolutionDescription}

Respond in JSON format:
{
  "resolved": true/false,
  "confidence": 0.95,
  "reasoning": "...",
  "imageComparison": "...",
  "missingDetails": ["...", "..."]
}
`;
```

### 6.2 AI Error Handling

```javascript
const handleAIAnalysis = async (imageUrl, description) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analyzeIssuePrompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 500
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('AI service temporarily unavailable');
    }
    if (error.code === 'invalid_image') {
      throw new Error('IMAGE_UNCLEAR');
    }
    throw error;
  }
};
```

### 6.3 Unclear Image Detection

```javascript
const detectUnclearImage = async (imageUrl) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Is this image clear enough to identify a maintenance issue? Respond with 'clear' or 'unclear'." 
          },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 10
  });
  
  const result = response.choices[0].message.content.toLowerCase();
  return result.includes('clear') && !result.includes('unclear');
};
```

### 6.4 Duplicate Image Detection

```javascript
// Store image hashes in UnclearImageSubmission model
const checkDuplicateImage = async (imageHash, userId) => {
  const submission = await UnclearImageSubmission.findOne({
    imageHash,
    userId
  });
  
  if (submission) {
    submission.submissionCount += 1;
    await submission.save();
    
    if (submission.submissionCount >= 3) {
      throw new Error('REQUIRES_USER_INPUT_REPEATED');
    }
  } else {
    await UnclearImageSubmission.create({
      imageHash,
      userId,
      submissionCount: 1
    });
  }
};
```

---

## 7. GPS and Location Design

### 7.1 GPS Validation

```javascript
const validateGPS = (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('INVALID_GPS');
  }
  
  if (latitude < -90 || latitude > 90) {
    throw new Error('INVALID_GPS_RANGE');
  }
  
  if (longitude < -180 || longitude > 180) {
    throw new Error('INVALID_GPS_RANGE');
  }
  
  return true;
};
```

### 7.2 GPS Distance Calculation (Haversine Formula)

```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};
```

### 7.3 GPS Matching for Resolution

```javascript
const validateResolutionGPS = (issueGps, resolutionGps) => {
  const distance = calculateDistance(
    issueGps.latitude,
    issueGps.longitude,
    resolutionGps.latitude,
    resolutionGps.longitude
  );
  
  const tolerance = 50; // 50 meters
  
  if (distance > tolerance) {
    throw new Error({
      code: 'GPS_MISMATCH',
      message: `GPS location mismatch. You are ${Math.round(distance)}m away from the issue location (${tolerance}m tolerance).`,
      distance,
      tolerance,
      createdGps: issueGps,
      resolvedGps: resolutionGps
    });
  }
  
  return { match: true, distance };
};
```

---

## 8. Image Storage Design

### 8.1 AWS S3 Configuration

```javascript
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET_NAME
};

const s3Client = new S3Client({
  region: s3Config.region,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey
  }
});
```

### 8.2 Image Upload with Multer-S3

```javascript
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: s3Config.bucket,
    acl: 'private',
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        userId: req.user.userId,
        uploadDate: new Date().toISOString()
      });
    },
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `issues/${req.user.clientId}/${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG allowed.'));
    }
  }
});
```

### 8.3 Presigned URL Generation

```javascript
const getPresignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: key
  });
  
  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600 // 1 hour
  });
  
  return url;
};
```

---

## 9. Mobile App Design

### 9.1 Mobile Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Screens                                                     │
│  - Login/Register    - Dashboard       - Issue List          │
│  - Issue Detail      - Create Issue    - Resolve Issue       │
│  - Profile           - Settings                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  - Auth Service      - Issue Service   - GPS Service         │
│  - Image Service     - Offline Service - Sync Service        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  - API Client (Axios)                                        │
│  - Local Storage (AsyncStorage/SQLite)                       │
│  - State Management (Redux/Context)                          │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Offline Support Design

#### Offline Queue Structure
```javascript
{
  pendingIssues: [
    {
      id: 'local-uuid',
      siteId: 'site_id',
      description: 'Issue description',
      images: ['local-file-path-1', 'local-file-path-2'],
      gps: { latitude: 12.9716, longitude: 77.5946 },
      timestamp: 1234567890,
      synced: false
    }
  ],
  pendingResolutions: [
    {
      issueId: 'issue_id',
      resolutionDescription: 'Resolution description',
      resolutionImage: 'local-file-path',
      gps: { latitude: 12.9716, longitude: 77.5946 },
      timestamp: 1234567890,
      synced: false
    }
  ]
}
```

#### Sync Strategy
```javascript
const syncPendingData = async () => {
  if (!navigator.onLine) return;
  
  // 1. Sync pending issues
  const pendingIssues = await localDB.getPendingIssues();
  for (const issue of pendingIssues) {
    try {
      await apiClient.post('/issues', issue);
      await localDB.markAsSynced(issue.id);
    } catch (error) {
      console.error('Failed to sync issue:', error);
    }
  }
  
  // 2. Sync pending resolutions
  const pendingResolutions = await localDB.getPendingResolutions();
  for (const resolution of pendingResolutions) {
    try {
      await apiClient.patch(`/issues/${resolution.issueId}/resolve`, resolution);
      await localDB.markAsSynced(resolution.id);
    } catch (error) {
      console.error('Failed to sync resolution:', error);
    }
  }
};

// Auto-sync when online
window.addEventListener('online', syncPendingData);
```

### 9.3 GPS Service Design

```javascript
class GPSService {
  static async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(this.handleGeolocationError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  static handleGeolocationError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Location permission denied');
      case error.POSITION_UNAVAILABLE:
        return new Error('Location unavailable');
      case error.TIMEOUT:
        return new Error('Location request timeout');
      default:
        return new Error('Unknown location error');
    }
  }
}
```

### 9.4 Image Compression Service

```javascript
class ImageService {
  static async compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
```

---

## 10. Performance Optimization

### 10.1 Database Optimization

#### Indexing Strategy
```javascript
// Compound indexes for common queries
Issue.index({ clientId: 1, status: 1, createdAt: -1 });
Issue.index({ siteId: 1, status: 1, priority: 1 });
Issue.index({ assignedTo: 1, status: 1 });

// Text index for search
Issue.index({ title: 'text', description: 'text' });
```

#### Query Optimization
```javascript
// Use lean() for read-only queries
const issues = await Issue.find({ status: 'open' })
  .lean()
  .select('title status priority createdAt')
  .limit(20);

// Use projection to limit fields
const issue = await Issue.findById(id)
  .select('title description status images')
  .populate('site', 'name code');
```

### 10.2 API Performance

#### Pagination
```javascript
const getPaginatedIssues = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const [issues, total] = await Promise.all([
    Issue.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Issue.countDocuments(query)
  ]);
  
  res.json({
    issues,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
};
```

#### Response Compression
```javascript
const compression = require('compression');
app.use(compression());
```

#### Caching Strategy (Future)
```javascript
// Redis caching for frequently accessed data
const getCachedSites = async (clientId) => {
  const cacheKey = `sites:${clientId}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Fetch from database
  const sites = await Site.find({ clientId }).lean();
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(sites));
  
  return sites;
};
```

### 10.3 Frontend Performance

#### Code Splitting
```javascript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tickets = lazy(() => import('./pages/Tickets'));
const IssueDetail = lazy(() => import('./pages/IssueDetail'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/tickets" element={<Tickets />} />
    <Route path="/tickets/:id" element={<IssueDetail />} />
  </Routes>
</Suspense>
```

#### Image Optimization
```javascript
// Lazy load images
<img 
  src={imageUrl} 
  loading="lazy" 
  alt="Issue" 
  className="w-full h-auto"
/>

// Use responsive images
<img 
  srcSet={`${imageUrl}?w=400 400w, ${imageUrl}?w=800 800w`}
  sizes="(max-width: 768px) 400px, 800px"
  src={imageUrl}
  alt="Issue"
/>
```

#### Debouncing and Throttling
```javascript
// Debounce search input
const debouncedSearch = useMemo(
  () => debounce((value) => {
    fetchIssues({ search: value });
  }, 500),
  []
);

// Throttle scroll events
const throttledScroll = useMemo(
  () => throttle(() => {
    handleInfiniteScroll();
  }, 200),
  []
);
```

---

## 11. Error Handling Design

### 11.1 Backend Error Handling

#### Global Error Handler
```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      code: 'INVALID_ID'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // Custom application errors
  if (err.code) {
    return res.status(err.statusCode || 400).json({
      message: err.message,
      code: err.code,
      ...err.data
    });
  }
  
  // Default server error
  res.status(500).json({
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

app.use(errorHandler);
```

#### Custom Error Classes
```javascript
class AppError extends Error {
  constructor(message, code, statusCode = 400, data = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.data = data;
  }
}

class GPSError extends AppError {
  constructor(message, code, data) {
    super(message, code, 400, data);
  }
}

class AIError extends AppError {
  constructor(message, code) {
    super(message, code, 400);
  }
}

// Usage
throw new GPSError(
  'GPS location mismatch',
  'GPS_MISMATCH',
  { distance: 75, tolerance: 50 }
);
```

### 11.2 Frontend Error Handling

#### API Error Handler
```javascript
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    const { message, code } = error.response.data;
    
    switch (code) {
      case 'GPS_REQUIRED':
        toast.error('Location access is required');
        break;
      case 'GPS_MISMATCH':
        toast.error(message);
        break;
      case 'INVALID_TOKEN':
      case 'TOKEN_EXPIRED':
        authStore.logout();
        navigate('/login');
        break;
      default:
        toast.error(message || 'An error occurred');
    }
  } else if (error.request) {
    // Request made but no response
    toast.error('Network error. Please check your connection.');
  } else {
    // Error in request setup
    toast.error('An unexpected error occurred');
  }
};
```

#### Error Boundary Component
```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

## 12. Testing Strategy

### 12.1 Backend Testing

#### Unit Tests
```javascript
// Example: GPS validation test
describe('GPS Validation', () => {
  test('should validate correct GPS coordinates', () => {
    expect(() => validateGPS(12.9716, 77.5946)).not.toThrow();
  });
  
  test('should reject invalid latitude', () => {
    expect(() => validateGPS(91, 77.5946)).toThrow('INVALID_GPS_RANGE');
  });
  
  test('should reject invalid longitude', () => {
    expect(() => validateGPS(12.9716, 181)).toThrow('INVALID_GPS_RANGE');
  });
});
```

#### Integration Tests
```javascript
// Example: Issue creation test
describe('POST /api/mobile/issues', () => {
  test('should create issue with valid data', async () => {
    const response = await request(app)
      .post('/api/mobile/issues')
      .set('Authorization', `Bearer ${token}`)
      .field('siteId', siteId)
      .field('latitude', '12.9716')
      .field('longitude', '77.5946')
      .field('description', 'Test issue')
      .attach('images', 'test-image.jpg')
      .expect(201);
    
    expect(response.body).toHaveProperty('_id');
    expect(response.body.status).toBe('open');
  });
});
```

### 12.2 Frontend Testing

#### Component Tests
```tsx
// Example: Button component test
describe('Button Component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  test('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### E2E Tests (Cypress/Playwright)
```javascript
// Example: Login flow test
describe('Login Flow', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

---

## 13. Deployment Architecture

### 13.1 Production Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Development                              │
├─────────────────────────────────────────────────────────────┤
│  1. Code changes pushed to Git repository                    │
│  2. CI/CD pipeline triggered (GitHub Actions)                │
│  3. Run tests (unit, integration)                            │
│  4. Build frontend (npm run build)                           │
│  5. Deploy to staging environment                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Staging Environment                      │
├─────────────────────────────────────────────────────────────┤
│  1. Run E2E tests                                            │
│  2. Manual QA testing                                        │
│  3. Performance testing                                      │
│  4. Security scanning                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Production Environment                   │
├─────────────────────────────────────────────────────────────┤
│  Platform: Railway / Render / AWS / DigitalOcean            │
│  - Node.js server (Express)                                  │
│  - Serves API + Frontend static files                        │
│  - MongoDB Atlas (Database)                                  │
│  - AWS S3 (Image storage)                                    │
│  - CloudFront CDN (optional)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 Environment Configuration

#### Development
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/snapfix
JWT_SECRET=dev-secret-key
FRONTEND_URL=http://localhost:3000
AWS_ACCESS_KEY_ID=dev-key
AWS_SECRET_ACCESS_KEY=dev-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=snapfix-dev
OPENAI_API_KEY=sk-...
```

#### Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/snapfix
JWT_SECRET=strong-random-secret-key
FRONTEND_URL=https://snapfix.com
AWS_ACCESS_KEY_ID=prod-key
AWS_SECRET_ACCESS_KEY=prod-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=snapfix-prod
OPENAI_API_KEY=sk-...
```

### 13.3 Build Process

```bash
# Install dependencies (from project root)
npm install

# Build frontend
npm run build
# Output: frontend/dist/

# Start production server
npm start
# Serves API on /api/* and frontend on /*
```

### 13.4 Server Configuration

#### Express Static File Serving
```javascript
// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}
```

### 13.5 Monitoring and Logging

#### Application Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

#### Health Check Endpoint
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

---

## 14. Scalability Considerations

### 14.1 Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                            │
│                     (Nginx/AWS ALB)                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Server 1   │    │   Server 2   │    │   Server 3   │
│  (Node.js)   │    │  (Node.js)   │    │  (Node.js)   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   MongoDB Atlas       │
                │   (Replica Set)       │
                └───────────────────────┘
```

### 14.2 Database Sharding Strategy

```javascript
// Shard by clientId for multi-tenancy
{
  shardKey: { clientId: 1 },
  unique: false
}

// Benefits:
// - Each client's data on separate shards
// - Better performance for large clients
// - Easier data isolation and compliance
```

### 14.3 Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Redis Cache │    │   MongoDB    │    │    AWS S3    │
│              │    │   Database   │    │ Image Store  │
│ - Sessions   │    │ - Issues     │    │ - Images     │
│ - Sites      │    │ - Users      │    │              │
│ - Categories │    │ - Clients    │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 14.4 CDN Integration

```
┌─────────────────────────────────────────────────────────────┐
│                     CloudFront CDN                           │
│                     (Edge Locations)                         │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Static      │    │   API        │    │   Images     │
│  Assets      │    │  Requests    │    │   (S3)       │
│  (Frontend)  │    │  (Backend)   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 15. Future Enhancements

### 15.1 Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
│                     (Kong/AWS API Gateway)                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┬──────────────┐
        │                   │                   │              │
        ▼                   ▼                   ▼              ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐  ┌────────┐
│   Auth       │    │   Issue      │    │   AI         │  │ Notif  │
│   Service    │    │   Service    │    │   Service    │  │ Service│
│   (Node.js)  │    │   (Node.js)  │    │   (Python)   │  │(Node.js│
└──────────────┘    └──────────────┘    └──────────────┘  └────────┘
        │                   │                   │              │
        └───────────────────┼───────────────────┴──────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Message Queue       │
                │   (RabbitMQ/Kafka)    │
                └───────────────────────┘
```

### 15.2 Real-Time Features

#### WebSocket Integration
```javascript
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('join-room', (clientId) => {
    socket.join(`client-${clientId}`);
  });
  
  socket.on('issue-created', (data) => {
    io.to(`client-${data.clientId}`).emit('new-issue', data);
  });
  
  socket.on('issue-updated', (data) => {
    io.to(`client-${data.clientId}`).emit('issue-update', data);
  });
});
```

### 15.3 Advanced Analytics

#### Data Warehouse Integration
```
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB (OLTP)                           │
│                     Operational Data                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ ETL Pipeline
┌─────────────────────────────────────────────────────────────┐
│                     Data Warehouse                           │
│                     (Snowflake/BigQuery)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     BI Tools                                 │
│                     (Tableau/Looker/Metabase)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 16. Security Best Practices

### 16.1 OWASP Top 10 Mitigation

1. **Injection**: Use Mongoose ODM, parameterized queries
2. **Broken Authentication**: JWT with secure storage, password hashing
3. **Sensitive Data Exposure**: HTTPS, encrypted storage, secure headers
4. **XML External Entities**: Not applicable (JSON API)
5. **Broken Access Control**: RBAC, middleware authorization
6. **Security Misconfiguration**: Helmet.js, secure defaults
7. **XSS**: React auto-escaping, CSP headers
8. **Insecure Deserialization**: Validate all inputs
9. **Using Components with Known Vulnerabilities**: Regular npm audit
10. **Insufficient Logging**: Winston logging, error tracking

### 16.2 Data Privacy Compliance

#### GDPR Compliance
- User consent for data collection
- Right to access personal data
- Right to delete personal data
- Data portability
- Privacy by design

#### Data Retention Policy
```javascript
// Auto-delete resolved issues after 2 years
const deleteOldIssues = async () => {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  await Issue.deleteMany({
    status: 'resolved',
    resolvedAt: { $lt: twoYearsAgo }
  });
};
```

---

## Document Control

**Version**: 1.0  
**Last Updated**: February 15, 2026  
**Author**: SnapFix Team  
**Status**: Draft  
**Related Documents**: requirements.md, IMPLEMENTATION_SUMMARY.md
