# SnapFix Mobile App Development Guide

This guide provides comprehensive documentation for developing a mobile application for the SnapFix AI-powered issue reporting SaaS platform.

## 📱 Overview

The SnapFix mobile app enables users to:
- Report issues with photo uploads
- View and manage tickets
- Get AI-powered suggestions
- Track issue status and analytics
- Manage sites, teams, and categories
- Access real-time notifications
- Assign issues to users or departments
- Accept and resolve assigned issues

## 🛠️ Technology Stack

### Primary Framework: **Flutter**

The mobile app will be developed using **Flutter** (Dart) for the following reasons:
- **Cross-platform**: Single codebase for both iOS and Android
- **Performance**: Native-like performance with compiled code
- **Rich UI**: Beautiful, customizable UI components
- **Large ecosystem**: Extensive package library (pub.dev)
- **Hot reload**: Fast development iteration
- **Consistent design**: Material Design and Cupertino widgets

### Recommended Packages

- **State Management**: Provider, Riverpod, or Bloc
- **HTTP Client**: Dio or http package
- **Local Storage**: SharedPreferences or Hive
- **Image Picker**: image_picker package
- **Navigation**: go_router or flutter_navigation
- **Authentication**: secure_storage for tokens
- **Image Caching**: cached_network_image
- **Push Notifications**: firebase_messaging

## 👥 User Roles

The SnapFix platform supports multiple user roles with different permissions:

### Role Hierarchy

1. **SaaS Owner** (`saas-owner`)
   - SnapFix product owner
   - Full platform access, manages all clients
   - Can view and manage all issues across all organizations

2. **Super Admin** (`superadmin`)
   - Elevated permissions across organizations
   - Can manage multiple client organizations

3. **Client Admin** (`client`)
   - Owner of the organization
   - Manages their entire organization
   - Can view all issues, users, sites, and departments within their organization
   - Can assign issues to users or departments

4. **Head of Staff** (`head-of-staff`)
   - Site admin / Manager role
   - Manages issues in their assigned departments
   - Can assign issues to field staff
   - Can accept and resolve issues in their departments

5. **Field Staff** (`field-staff`)
   - Field user / Regular staff member
   - Can snap photos to report issues instantly
   - Works offline—tickets sync automatically when connectivity returns
   - Can view issues they created or assigned to them
   - GPS auto-tagging and push notifications

6. **Vendors** (`vendors`)
   - External service providers/contractors
   - See only tickets assigned to them
   - Can update status, add resolution notes and photos
   - Get notified instantly for new and escalated work
   - SLA alerts

7. **Tenants** (`tenants`)
   - Property tenants/residents
   - Can raise tickets via QR code, WhatsApp, email, or web link
   - Track requests in real-time
   - Privacy-protected view (only see their own tickets)
   - Multi-channel access

For detailed role documentation, see [ROLE_ARCHITECTURE.md](./ROLE_ARCHITECTURE.md).

## 🔌 Mobile API Integration

### Base Configuration

The mobile API is available at:
- **Development**: `http://localhost:5000/api/mobile`
- **Production**: `https://your-production-api.com/api/mobile`

All API requests require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

**Note**: Mobile APIs are optimized for mobile apps with pagination, lighter payloads, and mobile-specific features.

### Mobile API Optimizations

The mobile APIs (`/api/mobile/*`) are specifically optimized for mobile applications:

1. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters
2. **Lighter Payloads**: Responses include only essential data to reduce bandwidth
3. **Mobile-Specific Features**: 
   - Device token registration for push notifications
   - Mobile-optimized notification endpoints
   - Dashboard quick stats for faster loading
4. **Role-Based Filtering**: All endpoints automatically filter data based on user role
5. **Image Upload Support**: Optimized for mobile image uploads with proper multipart/form-data handling

### Authentication Endpoints

#### Login
- **Endpoint**: `POST /api/mobile/auth/login`
- **Body**: 
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: 
  ```json
  {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "field-staff",
      "clientId": "client_id",
      "roles": ["field-staff"],
      "siteIds": [],
      "departmentIds": []
    },
    "token": "jwt_token_here"
  }
  ```

#### Register User
- **Endpoint**: `POST /api/mobile/auth/register`
- **Body**: 
  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "password": "password123",
    "clientId": "client_id",
    "roles": ["field-staff"],
    "siteIds": [],
    "departmentIds": []
  }
  ```
- **Response**: `{ user: {...}, token: "..." }`

#### Get Current User
- **Endpoint**: `GET /api/mobile/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "field-staff",
    "clientId": "client_id",
    "client": {
      "id": "client_id",
      "name": "Client Name",
      "companyName": "Company Name"
    },
    "sites": [],
    "departments": []
  }
  ```

#### Logout
- **Endpoint**: `POST /api/mobile/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ message: "Logged out successfully" }`

### Issues API Endpoints

#### Get All Issues (with Pagination)
- **Endpoint**: `GET /api/mobile/issues?page=1&limit=20&status=open&priority=high`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 20) - Items per page
  - `status` (optional) - Filter by status: `open`, `in-progress`, `resolved`, `closed`
  - `priority` (optional) - Filter by priority: `low`, `medium`, `high`, `critical`
- **Response**: 
  ```json
  {
    "issues": [
      {
        "_id": "issue_id",
        "title": "Issue Title",
        "description": "Issue description",
        "status": "open",
        "priority": "high",
        "site": { "_id": "site_id", "name": "Site Name", "code": "SITE-001" },
        "department": { "_id": "dept_id", "name": "Department Name" },
        "category": { "_id": "cat_id", "name": "Category Name" },
        "assignedTo": { "_id": "user_id", "name": "User Name" },
        "images": ["url1", "url2"],
        "imageCount": 2,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
  ```
- **Filtering**: Issues are automatically filtered based on user role:
  - **SaaS owners**: All issues across all clients
  - **Super admins**: All issues within their client
  - **Client admins**: All issues within their organization
  - **Head of staff**: Issues in their departments
  - **Field staff**: Only issues they created or assigned to them
  - **Vendors**: Only issues assigned to them
  - **Tenants**: Only issues they created (privacy-protected view)

#### Get Single Issue
- **Endpoint**: `GET /api/mobile/issues/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Complete issue object with populated fields (site, department, category, userId, assignedTo)

#### Create Issue
- **Endpoint**: `POST /api/mobile/issues`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Body**: FormData with:
  - `description` (required) - Issue description
  - `siteId` (required) - Site ID
  - `categoryId` (optional) - Category ID
  - `department` (optional) - Department ID
  - `priority` (optional) - Priority: `low`, `medium`, `high`, `critical` (default: `medium`)
  - `title` (optional) - Title (auto-generated from description if not provided)
  - `images` (optional) - Multiple image files (up to 10)
- **Response**: Created issue object with populated fields

#### Update Issue Status
- **Endpoint**: `PATCH /api/mobile/issues/:id/status`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "status": "in-progress"
  }
  ```
- **Valid Status Values**: `open`, `in-progress`, `on-hold`, `resolved`, `closed`
- **Response**: Updated issue object
- **Permission Check**: User must have permission to update (see Assignment Rules below)

#### Resolve Issue
- **Endpoint**: `PATCH /api/mobile/issues/:id/resolve`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Body**: FormData with:
  - `resolutionDescription` (optional, but either this or image required)
  - `resolutionImage` (optional) - Single image file
- **Response**: 
  ```json
  {
    "issue": { /* updated issue object */ },
    "validation": { /* AI validation result */ }
  }
  ```
- **Permission Check**: User must have permission to resolve (see Assignment Rules below)
- **AI Validation**: Backend validates resolution using AI before accepting

#### Assign Issue to User
- **Endpoint**: `PATCH /api/mobile/issues/:id/assign`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "userId": "user_id_to_assign"
  }
  ```
  Or to unassign:
  ```json
  {
    "userId": null
  }
  ```
- **Response**: Updated issue object
- **Permissions**: Only admins, super admins, and client admins can assign issues

#### Get AI Suggestions
- **Endpoint**: `POST /api/mobile/issues/:id/ai-suggestions`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  {
    "suggestions": [
      "Suggestion 1",
      "Suggestion 2",
      "Suggestion 3"
    ],
    "analysis": "Full AI analysis text..."
  }
  ```

### Categories API Endpoints

#### Get All Categories
- **Endpoint**: `GET /api/mobile/categories`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  [
    {
      "_id": "category_id",
      "name": "Electrical",
      "description": "Electrical issues",
      "ticketCount": 5,
      "color": "#ef4444"
    }
  ]
  ```
- **Note**: Ticket counts are filtered based on user role

#### Create Category
- **Endpoint**: `POST /api/mobile/categories`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "name": "Category Name",
    "description": "Category description"
  }
  ```
- **Response**: Created category object

### Sites API Endpoints

#### Get All Sites
- **Endpoint**: `GET /api/mobile/sites`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  [
    {
      "_id": "site_id",
      "name": "Main Building",
      "code": "MB-001",
      "location": "123 Main Street",
      "description": "Main office building"
    }
  ]
  ```
- **Note**: Sites are filtered based on user role and assigned sites

#### Get Single Site
- **Endpoint**: `GET /api/mobile/sites/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Complete site object

#### Create Site
- **Endpoint**: `POST /api/mobile/sites`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "name": "Site Name",
    "code": "SITE-001",
    "location": "Address",
    "description": "Site description",
    "timeZone": "UTC"
  }
  ```
- **Response**: Created site object

### Departments API Endpoints

#### Get All Departments
- **Endpoint**: `GET /api/mobile/departments`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  [
    {
      "_id": "department_id",
      "name": "Maintenance",
      "isCompliance": false
    }
  ]
  ```
- **Note**: Departments are filtered based on user role

#### Create Department
- **Endpoint**: `POST /api/mobile/departments`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "name": "Department Name",
    "isCompliance": false
  }
  ```
- **Response**: Created department object

### Users API Endpoints

#### Get All Users
- **Endpoint**: `GET /api/mobile/users`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of user objects (for assignment dropdowns)
- **Permissions**: Only admins, super admins, and client admins can access
- **Response**: 
  ```json
  [
    {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "field-staff",
      "roles": ["field-staff"],
      "siteIds": [],
      "departmentIds": []
    }
  ]
  ```

#### Get Users by Role
- **Endpoint**: `GET /api/mobile/users/by-role/:role`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `role` - One of: `field-staff`, `head-of-staff`, `vendors`, `tenants`
- **Response**: Array of users filtered by role
- **Permissions**: Only admins, super admins, and client admins can access

### Dashboard API Endpoints

#### Get Dashboard Stats
- **Endpoint**: `GET /api/mobile/dashboard/stats`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  {
    "total": 50,
    "open": 20,
    "inProgress": 10,
    "resolved": 15,
    "closed": 5,
    "recent": 8,
    "byPriority": {
      "low": 10,
      "medium": 20,
      "high": 15,
      "critical": 5
    }
  }
  ```
- **Note**: Stats are filtered based on user role

#### Get Quick Stats
- **Endpoint**: `GET /api/mobile/dashboard/quick`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  {
    "open": 20,
    "assigned": 5
  }
  ```
- **Note**: Lighter payload for quick dashboard updates

### Device Management API Endpoints

#### Register Device Token
- **Endpoint**: `POST /api/mobile/device/register`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "deviceToken": "fcm_device_token_here",
    "platform": "android"
  }
  ```
- **Platform Values**: `ios`, `android`, `unknown`
- **Response**: `{ message: "Device registered successfully" }`

#### Unregister Device Token
- **Endpoint**: `POST /api/mobile/device/unregister`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "deviceToken": "fcm_device_token_here"
  }
  ```
- **Response**: `{ message: "Device unregistered successfully" }`

### Notifications API Endpoints

#### Get Notifications
- **Endpoint**: `GET /api/mobile/notifications?limit=50&offset=0`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `limit` (optional, default: 50) - Number of notifications
  - `offset` (optional, default: 0) - Pagination offset
- **Response**: 
  ```json
  {
    "notifications": [
      {
        "id": "issue_id",
        "type": "issue",
        "title": "Issue Update",
        "message": "Issue has been assigned to you",
        "data": {
          "issueId": "issue_id",
          "status": "open",
          "priority": "high"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "read": false
      }
    ],
    "total": 10,
    "hasMore": false
  }
  ```

#### Mark Notification as Read
- **Endpoint**: `PATCH /api/mobile/notifications/:id/read`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ message: "Notification marked as read" }`

### Health Check

#### API Health Status
- **Endpoint**: `GET /api/mobile/health`
- **Response**: 
  ```json
  {
    "status": "ok",
    "service": "mobile-api",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "endpoints": {
      "auth": "/api/mobile/auth",
      "issues": "/api/mobile/issues",
      "categories": "/api/mobile/categories",
      "sites": "/api/mobile/sites",
      "departments": "/api/mobile/departments",
      "users": "/api/mobile/users",
      "dashboard": "/api/mobile/dashboard",
      "device": "/api/mobile/device",
      "notifications": "/api/mobile/notifications"
    }
  }
  ```

## 🎯 Issue Assignment System

### Overview

The SnapFix platform supports flexible issue assignment with two levels:
1. **Department Assignment**: Issue assigned to a department (any user in that department can work on it)
2. **User Assignment**: Issue assigned to a specific user (only that user can work on it)

### Assignment Rules

#### When Issue is Assigned to a Specific User (`assignedTo` is set):
- **Only the assigned user** can:
  - Accept the issue (change status to 'in-progress')
  - Resolve the issue
  - Update the issue status
- **Other users** (even from the same department) **cannot** accept or resolve
- **Admins, Super Admins, and Client Admins** can always accept/resolve regardless of assignment

#### When Issue is Assigned to Department Only (`assignedTo` is null, but `department` is set):
- **Any user from that department** can:
  - Accept the issue (change status to 'in-progress')
  - Resolve the issue
  - Update the issue status
- Users must have the department in their `departmentIds` array

#### When No Assignment (`assignedTo` is null and `department` is null):
- **Only the issue creator** can accept/resolve (fallback behavior)
- **Admins** can always accept/resolve

### Issue Model Structure

Each issue object includes:
```json
{
  "_id": "string",
  "title": "string",
  "description": "string",
  "status": "open" | "in-progress" | "on-hold" | "resolved" | "closed",
  "priority": "low" | "medium" | "high" | "critical",
  "userId": "string (creator ID)",
  "assignedTo": "string | null (assigned user ID)",
  "department": "string | null (department ID)",
  "site": "string (site ID)",
  "category": "string | null (category ID)",
  "clientId": "string",
  "images": ["string (S3 URLs)"],
  "resolutionImages": ["string (S3 URLs)"],
  "resolutionDescription": "string",
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string",
  "resolutionTime": "ISO date string | null"
}
```

### UI Requirements for Assignment

#### Issue List Screen
- Display assignment status for each issue:
  - Show "Assigned to: [User Name]" if `assignedTo` is set
  - Show "Assigned to: [Department Name]" if only department is set
  - Show "Unassigned" if neither is set
- Visual indicators (badges/icons) for assignment status
- Filter options: "Assigned to me", "Assigned to my department", "Unassigned"

#### Issue Detail Screen
- Display assignment information prominently
- Show "Accept Issue" button only if user has permission
- Show "Resolve Issue" button only if user has permission
- For admins: Show "Assign" button to assign/unassign issues
- Display assigned user's name and avatar if assigned to user
- Display department name if assigned to department only

#### Assignment Screen (Admin Only)
- Dropdown/selector to choose a user from the client
- Option to "Assign to Department Only" (unassign from user)
- Option to "Unassign" (remove both user and department assignment)
- Show current assignment status
- List of users in the department if department-assigned

### Permission Checking

Before allowing users to accept or resolve issues, the app should:
1. Check if user is admin/super admin/client admin → Allow
2. Check if `assignedTo` is set:
   - If yes, verify current user ID matches `assignedTo` → Allow if match
   - If no, check if `department` is set:
     - If yes, verify user's `departmentIds` includes the issue's department → Allow if match
     - If no, verify user ID matches `userId` (creator) → Allow if match

**Note**: The backend also performs these checks, so the UI should handle 403 Forbidden responses gracefully.

## 📱 Key Features to Implement

### 1. Authentication Flow
- Login screen with email/password
- Registration screen (if allowed)
- Token storage using secure storage
- Auto-login on app launch if token exists
- Logout functionality
- Token refresh handling

### 2. Dashboard/Home Screen
- Overview statistics (total issues, open issues, resolved issues)
- Recent issues list
- Quick actions (Report Issue, View All Issues)
- Filter by status, priority, assignment

### 3. Issue Reporting
- Form with:
  - Title (optional, auto-generated)
  - Description (required)
  - Site selection (required)
  - Category selection (optional)
  - Priority selection (optional)
  - Department selection (optional)
- Image capture/selection (multiple images)
- Image preview before submission
- Form validation
- Success/error feedback

### 4. Issues List Screen
- List of issues with:
  - Title
  - Status badge
  - Priority indicator
  - Assignment status
  - Created date
  - Thumbnail image (if available)
- Pull-to-refresh
- Filter options:
  - Status (open, in-progress, resolved, closed)
  - Priority (low, medium, high, critical)
  - Assignment (assigned to me, my department, unassigned)
- Search functionality
- Sort options (date, priority, status)

### 5. Issue Detail Screen
- Full issue information
- Image gallery viewer
- Status update button (if permitted)
- Accept issue button (if permitted)
- Resolve issue button (if permitted)
- Assign button (admin only)
- AI suggestions section
- Resolution details (if resolved)
- Comments/activity timeline (if implemented)

### 6. Issue Resolution
- Resolution form with:
  - Description (optional but recommended)
  - Resolution image upload (optional)
- AI validation feedback
- Success confirmation
- Error handling for validation failures

### 7. Assignment Management (Admin)
- Assign issue to user
- Unassign from user (keep department assignment)
- Remove all assignments
- View assignment history

### 8. Profile/Settings
- User information display
- Role and permissions display
- Department and site associations
- App settings
- Logout option

## 🎨 UI/UX Requirements

### Design System
- **Theme**: Match the web app's dark theme
- **Colors**: Use consistent color scheme with web app
- **Typography**: Clear, readable fonts
- **Icons**: Consistent icon set (Material Icons or custom)

### User Experience
1. **Loading States**: Show loading indicators for all async operations
2. **Error Handling**: Display user-friendly error messages
3. **Offline Support**: Cache data and handle offline scenarios gracefully
4. **Pull to Refresh**: Implement on all list screens
5. **Image Optimization**: Compress images before upload
6. **Form Validation**: Validate inputs before submission with clear error messages
7. **Empty States**: Show helpful messages when lists are empty
8. **Confirmation Dialogs**: For destructive actions (delete, unassign, etc.)

### Navigation
- Bottom navigation bar for main sections:
  - Home/Dashboard
  - Issues List
  - Report Issue
  - Profile/Settings
- Stack navigation for detail screens
- Back button handling
- Deep linking support (optional)

## 📸 Image Handling

### Image Capture
- Camera integration for taking photos
- Gallery picker for selecting existing images
- Multiple image selection support
- Image preview before upload
- Image compression before upload (recommended: max 2MB per image)

### Image Display
- Thumbnail grid view
- Full-screen image viewer
- Zoom and pan functionality
- Image caching for offline viewing

## 🔔 Push Notifications

### Requirements
- Firebase Cloud Messaging (FCM) integration
- Notification permissions request
- Handle notification taps (navigate to relevant screen)
- Background notification handling
- Notification categories:
  - New issue assigned to you
  - Issue status changed
  - New comment on your issue
  - Issue resolved

### Implementation
- Register device token with backend
- Handle notification payloads
- Update UI when notifications received
- Badge count for unread notifications

## 🔒 Security Requirements

1. **Token Storage**: Use secure storage (flutter_secure_storage) for JWT tokens
2. **API Security**: Always use HTTPS in production
3. **Certificate Pinning**: Implement SSL pinning for production (optional but recommended)
4. **Input Validation**: Validate all user inputs before sending to API
5. **Error Messages**: Don't expose sensitive information in error messages
6. **Biometric Auth**: Optional biometric authentication for app access
7. **Session Management**: Handle token expiration and refresh

## 📋 Environment Configuration

### Development
- API Base URL: `http://localhost:5000/api/mobile` or your development server
- Enable debug logging
- Show debug indicators

### Production
- API Base URL: `https://your-production-api.com/api/mobile`
- Disable debug logging
- Remove debug indicators
- Enable error reporting (Sentry, Firebase Crashlytics)

## 📦 Postman Collection

A complete Postman collection is available for testing all mobile APIs:
- **File**: `SnapFix_Mobile_API.postman_collection.json`
- **Import**: Import this file into Postman to test all endpoints
- **Features**:
  - Pre-configured variables (base_url, auth_token, etc.)
  - Auto token management (login saves token automatically)
  - Example request bodies for all endpoints
  - Organized by functionality (Auth, Issues, Categories, etc.)

## 🧪 Testing Requirements

### Unit Tests
- API service tests
- State management tests
- Utility function tests
- Model/entity tests

### Widget Tests
- Component rendering tests
- User interaction tests
- Form validation tests

### Integration Tests
- Authentication flow
- Issue creation flow
- Issue resolution flow
- Assignment flow

## 📦 Build and Deployment

### iOS
- Configure Xcode project
- Set up App Store Connect
- Configure certificates and provisioning profiles
- Build archive
- Submit to App Store

### Android
- Configure Android project
- Set up Google Play Console
- Generate signing key
- Build APK/AAB
- Submit to Google Play Store

### Build Commands
```bash
# iOS
flutter build ios --release

# Android
flutter build apk --release
flutter build appbundle --release
```

## 🚀 Deployment Checklist

- [ ] Update API base URL for production
- [ ] Configure push notification certificates (FCM)
- [ ] Set up app icons and splash screens
- [ ] Configure app permissions (camera, storage, location, notifications)
- [ ] Test on both iOS and Android devices
- [ ] Set up crash reporting (Sentry, Firebase Crashlytics)
- [ ] Configure analytics (Firebase Analytics, Mixpanel)
- [ ] Prepare app store listings (screenshots, descriptions)
- [ ] Set up code signing certificates
- [ ] Test offline functionality
- [ ] Performance optimization
- [ ] Security audit
- [ ] Test assignment functionality thoroughly
- [ ] Test permission checks for all user roles

## 📚 Additional Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)
- [Flutter Packages](https://pub.dev/)
- [Backend API Documentation](./README.md#-api-endpoints)

## 🆘 Troubleshooting

### Common Issues

1. **Network Request Failed**
   - Check API URL is correct (should be `/api/mobile/*` for mobile endpoints)
   - Ensure backend is running
   - Check CORS settings on backend
   - Verify network permissions in app
   - Use `/api/mobile/health` endpoint to verify API is accessible

2. **Image Upload Fails**
   - Verify image size limits
   - Check multipart/form-data format
   - Ensure proper MIME types
   - Verify S3 configuration on backend

3. **Authentication Issues**
   - Verify token is being stored securely
   - Check token expiration
   - Ensure Authorization header is set correctly
   - Verify JWT_SECRET on backend

4. **Permission Denied (403)**
   - Check user role and permissions
   - Verify assignment rules (assignedTo vs department)
   - Ensure user belongs to correct department
   - Check if user is admin/super admin

5. **Assignment Not Working**
   - Verify user has admin role to assign
   - Check assignedTo field is being sent correctly
   - Ensure userId exists and belongs to same client
   - Verify permission checks on backend

## 📞 Support

For backend API issues, refer to the main [README.md](./README.md) file.

For mobile-specific issues:
- Flutter GitHub issues
- Flutter Discord/Slack communities
- Stack Overflow (tag: flutter)
- Backend API documentation

---

**Development Notes:**
- The backend API handles all permission checks server-side
- Always handle 403 Forbidden responses gracefully in the UI
- Assignment functionality is critical - test thoroughly with different user roles
- The `assignedTo` field is optional and can be null
- When `assignedTo` is null, check `department` field for department-level assignment
- Admins can always assign, accept, and resolve issues regardless of assignment

**Happy Coding! 🚀**
