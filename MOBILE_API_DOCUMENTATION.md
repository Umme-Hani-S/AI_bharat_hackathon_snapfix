# SnapFix Mobile API Documentation

## Table of Contents
1. [Overview](#overview)
2. [All Mobile API Endpoints (Quick Reference)](#all-mobile-api-endpoints-quick-reference)
3. [Authentication](#authentication)
4. [Base URL](#base-url)
5. [API Endpoints](#api-endpoints)
6. [GPS Location Requirements](#gps-location-requirements)
7. [AI Analysis & Validation](#ai-analysis--validation)
8. [Image Handling](#image-handling)
9. [Error Handling](#error-handling)
10. [Edge Cases & Best Practices](#edge-cases--best-practices)
11. [Mobile App Development Guidelines](#mobile-app-development-guidelines)
12. [Code Examples](#code-examples)

---

## Overview

The SnapFix Mobile API is designed for mobile applications to create, manage, and resolve maintenance issues. The API includes:

- **GPS Location Tracking**: All issues require GPS coordinates for creation and resolution
- **AI-Powered Analysis**: Automatic issue classification, priority assessment, and resolution validation
- **Image Processing**: Support for multiple images with AI analysis
- **Real-time Validation**: GPS location matching and AI image comparison for resolution verification

### Key Features
- ✅ GPS location capture required for all issue operations
- ✅ AI-powered issue classification and priority assessment
- ✅ Image comparison between issue and resolution
- ✅ GPS location matching (50m tolerance) for resolution validation
- ✅ Comprehensive error handling with detailed messages
- ✅ Role-based access control
- ✅ Pagination support for large datasets
- ✅ Activity comments (created, status, resolved, edit, assigned) on issues

---

## All Mobile API Endpoints (Quick Reference)

Base path: `/api/mobile`. All endpoints except **Login** and **Register** require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Authentication** |
| POST | `/auth/login` | Login; returns token and user |
| POST | `/auth/register` | Register new user |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Logout (client removes token) |
| **Issues** |
| GET | `/issues` | List issues (paginated, role-filtered) |
| GET | `/issues/:id` | Get single issue (includes `comments`) |
| POST | `/issues` | Create issue (form-data; GPS + description or images) |
| PATCH | `/issues/:id/status` | Update status (open, in-progress, resolved, closed) |
| PATCH | `/issues/:id/due-date` | Update due date (body: `{ dueDate }`) |
| PATCH | `/issues/:id/category` | Update category (body: `{ category }`) |
| PATCH | `/issues/:id/assign` | Assign/reassign user (body: `{ userId }`) |
| PATCH | `/issues/:id/resolve` | Resolve issue (form-data; GPS + description or image) |
| POST | `/issues/:id/ai-suggestions` | Get AI suggestions for issue |
| **Categories** |
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| **Sites** |
| GET | `/sites` | List sites |
| GET | `/sites/:id` | Get single site |
| POST | `/sites` | Create site |
| **Departments** |
| GET | `/departments` | List departments |
| POST | `/departments` | Create department |
| **Users** |
| GET | `/users` | List users (admin) |
| GET | `/users/by-role/:role` | List users by role (admin) |
| **Dashboard** |
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/dashboard/quick` | Quick stats (open/assigned counts) |
| **Device** |
| POST | `/device/register` | Register device token (push) |
| POST | `/device/unregister` | Unregister device token |
| **Notifications** |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark notification as read |
| **Locations** |
| GET | `/location-list` | List locations (optional `?siteId=`) |
| **Health** |
| GET | `/health` | Health check (no auth) |

---

## Authentication

All API endpoints (except login/register) require JWT authentication.

### Login

**Endpoint:** `POST /api/mobile/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "field-staff",
    "clientId": "client_id",
    "sites": [...],
    "departments": [...]
  }
}
```

### Using the Token

Include the token in the Authorization header for all authenticated requests:

```
Authorization: Bearer <token>
```

---

## Base URL

```
Production: https://api.snapfix.com/api/mobile
Development: http://localhost:5000/api/mobile
```

---

## API Endpoints

### 1. Create Issue

**Endpoint:** `POST /api/mobile/issues`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Required Fields:**
- `siteId` (string, MongoDB ObjectId) - Site where issue occurred
- `latitude` (number, -90 to 90) - GPS latitude coordinate
- `longitude` (number, -180 to 180) - GPS longitude coordinate
- Either `description` (string) OR `images` (file[]) - At least one required

**Optional Fields:**
- `title` (string) - Issue title (AI will generate if not provided)
- `description` (string) - Detailed issue description
- `images` (file[]) - Array of image files (max 10)
- `categoryId` (string) - Category ID (AI will suggest if not provided)
- `department` (string) - Department ID (AI will suggest if not provided)
- `priority` (string) - Priority level: `low`, `medium`, `high`, `critical` (AI will assess if not provided)
- `locationId` (string) - Specific location within site
- `dueDate` (string, ISO 8601) - Due date for resolution
- `platform` (string) - Platform identifier: `mobile-ios`, `mobile-android`, `mobile-web`, `web`, `public`, `api` (defaults to `mobile-android` for mobile API)

**Request Example:**
```javascript
const formData = new FormData();
formData.append('siteId', '507f1f77bcf86cd799439011');
formData.append('latitude', '12.9716');
formData.append('longitude', '77.5946');
formData.append('description', 'Pothole on main road');
formData.append('images', imageFile1);
formData.append('images', imageFile2);
formData.append('priority', 'high');
formData.append('platform', 'mobile-android'); // or 'mobile-ios'
```

**Success Response (201):**
```json
{
  "_id": "issue_id",
  "title": "Pothole on Main Road",
  "description": "Pothole on main road",
  "status": "open",
  "priority": "high",
  "images": ["https://s3.amazonaws.com/..."],
  "site": {
    "_id": "site_id",
    "name": "Main Site"
  },
  "createdGps": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "platform": "mobile-android",
  "aiReportAnalysis": {
    "suggestedPersonal": ["Maintenance Team"],
    "potentialRisks": ["Vehicle damage", "Safety hazard"],
    "aiIssueTitle": "Pothole on Main Road"
  },
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 400 | `GPS_REQUIRED` | GPS location is required | Latitude/longitude missing |
| 400 | `INVALID_GPS` | Invalid GPS coordinates | Coordinates not valid numbers |
| 400 | `INVALID_GPS_RANGE` | GPS coordinates are out of valid range | Lat not in [-90, 90] or lng not in [-180, 180] |
| 400 | `MISSING_DESCRIPTION_AND_IMAGE` | Either a description or an image is required | Both description and images missing |
| 400 | `REQUIRES_USER_INPUT` | AI needs more information | AI couldn't process, needs description or clearer image |
| 400 | `IMAGE_UNCLEAR` | The provided image is unclear | Image is blurry or cannot be analyzed |
| 400 | `REQUIRES_USER_INPUT_REPEATED` | This image has been submitted multiple times | Same image submitted 3+ times without description |

---

### 2. Get All Issues

**Endpoint:** `GET /api/mobile/issues`

**Authentication:** Required

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `status` (string, optional) - Filter by status: `open`, `in-progress`, `resolved`, `closed`
- `priority` (string, optional) - Filter by priority: `low`, `medium`, `high`, `critical`

**Response:**
```json
{
  "issues": [
    {
      "_id": "issue_id",
      "title": "Issue Title",
      "description": "Issue description",
      "status": "open",
      "priority": "high",
      "images": ["url1", "url2"],
      "createdGps": {
        "latitude": 12.9716,
        "longitude": 77.5946
      },
      "site": {
        "_id": "site_id",
        "name": "Site Name"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

---

### 3. Get Issue by ID

**Endpoint:** `GET /api/mobile/issues/:id`

**Authentication:** Required

**Response:** Full issue object including populated `site`, `department`, `category`, `userId`, `assignedTo`, and **`comments`** (activity log). Each comment has `type` (created, status, resolved, edit, assigned), `message`, `userId` (populated), `createdAt`, and optional `payload`.

**Example (excerpt):**
```json
{
  "_id": "issue_id",
  "title": "Issue Title",
  "description": "Issue description",
  "status": "open",
  "priority": "high",
  "dueDate": "2026-03-01T00:00:00.000Z",
  "images": ["url1", "url2"],
  "createdGps": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "resolvedGps": { "latitude": 12.9717, "longitude": 77.5947 },
  "aiReportAnalysis": {...},
  "aiResolutionAnalysis": {...},
  "site": {...},
  "department": {...},
  "category": {...},
  "assignedTo": {...},
  "comments": [
    { "type": "created", "message": "Issue created by user", "userId": {...}, "createdAt": "..." },
    { "type": "status", "message": "Status changed from Open to In Progress", "payload": { "oldStatus": "open", "newStatus": "in-progress" } }
  ]
}
```

---

### 4. Resolve Issue

**Endpoint:** `PATCH /api/mobile/issues/:id/resolve`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Required Fields:**
- `latitude` (number) - GPS latitude coordinate
- `longitude` (number) - GPS longitude coordinate
- Either `resolutionDescription` (string) OR `resolutionImage` (file) - At least one required

**Optional Fields:**
- `resolutionDescription` (string) - Description of how issue was resolved
- `resolutionImage` (file) - Image showing resolved state

**Request Example:**
```javascript
const formData = new FormData();
formData.append('resolutionDescription', 'Pothole filled and sealed');
formData.append('resolutionImage', imageFile);
formData.append('latitude', '12.9716');
formData.append('longitude', '77.5946');
```

**Success Response (200):**
```json
{
  "issue": {
    "_id": "issue_id",
    "status": "resolved",
    "resolutionDescription": "Pothole filled and sealed",
    "resolutionImages": ["https://s3.amazonaws.com/..."],
    "resolvedGps": {
      "latitude": 12.9716,
      "longitude": 77.5946
    },
    "aiResolutionAnalysis": {
      "resolved": true,
      "aiConfidence": 0.95,
      "reasoning": "The resolution image clearly shows the pothole has been filled and sealed...",
      "imageComparison": "The original issue image shows a significant pothole. The resolution image shows the same location with the pothole properly filled and sealed with asphalt...",
      "gpsMatch": true,
      "gpsDistance": 15,
      "missingDetails": []
    }
  },
  "validation": {
    "resolved": true,
    "aiConfidence": 0.95,
    "reasoning": "...",
    "imageComparison": "...",
    "gpsMatch": true,
    "gpsDistance": 15
  }
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 400 | `GPS_REQUIRED` | GPS location is required for resolution | Latitude/longitude missing |
| 400 | `INVALID_GPS` | Invalid GPS coordinates | Coordinates not valid numbers |
| 400 | `MISSING_CREATION_GPS` | Issue does not have creation GPS location | Cannot validate resolution location |
| 400 | `GPS_MISMATCH` | GPS location mismatch | Resolution location >50m away from issue location |
| 400 | AI validation failed | AI could not confirm resolution | Resolution doesn't match issue |

**GPS Mismatch Response:**
```json
{
  "message": "GPS location mismatch. You are 75m away from the issue location (50m tolerance). Please resolve the issue at the correct location.",
  "code": "GPS_MISMATCH",
  "distance": 75,
  "tolerance": 50,
  "createdGps": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "resolvedGps": {
    "latitude": 12.9720,
    "longitude": 77.5950
  }
}
```

---

### 5. Update Issue Status

**Endpoint:** `PATCH /api/mobile/issues/:id/status`

**Authentication:** Required

**Request:**
```json
{
  "status": "in-progress"
}
```

**Valid Status Values:** `open`, `in-progress`, `resolved`, `closed`

**Permissions:** User must be allowed to update this issue (creator, assigned user, department member, or admin). An activity comment is recorded.

---

### 6. Update Due Date

**Endpoint:** `PATCH /api/mobile/issues/:id/due-date`

**Authentication:** Required

**Content-Type:** `application/json`

**Request:**
```json
{
  "dueDate": "2026-03-01T00:00:00.000Z"
}
```

- `dueDate` (string, optional): ISO 8601 date. Use `null` or omit to clear the due date.
- Past dates are rejected with `400`.

**Success Response (200):** Returns the updated issue (populated). An "edit" activity comment is recorded when the date changes.

---

### 7. Update Category

**Endpoint:** `PATCH /api/mobile/issues/:id/category`

**Authentication:** Required

**Content-Type:** `application/json`

**Request:**
```json
{
  "category": "507f1f77bcf86cd799439012"
}
```

- `category` (string, optional): Category ID (MongoDB ObjectId). Use `null` or empty string to clear.
- Category must belong to the same client; otherwise `400` is returned.

**Success Response (200):** Returns the updated issue (populated). An "edit" activity comment is recorded when the category changes.

---

### 8. Assign / Reassign Issue

**Endpoint:** `PATCH /api/mobile/issues/:id/assign`

**Authentication:** Required

**Content-Type:** `application/json`

**Request:**
```json
{
  "userId": "507f1f77bcf86cd799439014"
}
```

- `userId` (string, optional): User ID to assign. Use `null` or omit to unassign.
- Only admins (saas-owner, superadmin, client) can assign. Returns `403` otherwise.
- User must belong to the same client. An "assigned" activity comment is recorded.

**Success Response (200):** Returns the updated issue (populated).

---

### 10. Get Categories

**Endpoint:** `GET /api/mobile/categories`

**Authentication:** Required

**Response:**
```json
[
  {
    "_id": "category_id",
    "name": "Plumbing",
    "description": "Plumbing related issues"
  }
]
```

---

### 11. Get Sites

**Endpoint:** `GET /api/mobile/sites`

**Authentication:** Required

**Response:**
```json
[
  {
    "_id": "site_id",
    "name": "Main Office",
    "code": "MAIN-001"
  }
]
```

---

### 12. Get Departments

**Endpoint:** `GET /api/mobile/departments`

**Authentication:** Required

**Response:**
```json
[
  {
    "_id": "dept_id",
    "name": "Maintenance",
    "isCompliance": false
  }
]
```

---

### 13. Get Locations

**Endpoint:** `GET /api/mobile/location-list`

**Authentication:** Required

**Query Parameters:**
- `siteId` (string, optional) - Filter by site ID

**Response:**
```json
[
  {
    "_id": "location_id",
    "name": "Building A - Floor 2",
    "siteId": {
      "_id": "site_id",
      "name": "Main Office"
    }
  }
]
```

---

### 14. Get Users

**Endpoint:** `GET /api/mobile/users`

**Authentication:** Required (admin only: saas-owner, superadmin, client)

**Response:** Array of users (id, name, email, roles, siteIds, departmentIds, etc.). Used for assignment dropdowns.

---

### 15. Get Users by Role

**Endpoint:** `GET /api/mobile/users/by-role/:role`

**Authentication:** Required (admin only)

**Path:** `role` – one of: `field-staff`, `head-of-staff`, `vendors`, `tenants`

**Response:** Array of users filtered by role.

---

### 16. Dashboard Stats

**Endpoint:** `GET /api/mobile/dashboard/stats`

**Authentication:** Required

**Response:** Aggregated stats (total, open, in-progress, resolved, closed, recent counts, priority breakdown). Filtered by user role.

---

### 17. Dashboard Quick Stats

**Endpoint:** `GET /api/mobile/dashboard/quick`

**Authentication:** Required

**Response:** Lightweight stats (e.g. open count, assigned count) for fast loading.

---

### 18. Register Device Token

**Endpoint:** `POST /api/mobile/device/register`

**Authentication:** Required

**Request:**
```json
{
  "deviceToken": "device_fcm_token_here",
  "platform": "android"
}
```
`platform`: `ios` or `android`. Used for push notifications.

---

### 19. Unregister Device Token

**Endpoint:** `POST /api/mobile/device/unregister`

**Authentication:** Required

**Request:**
```json
{
  "deviceToken": "device_fcm_token_here"
}
```

---

### 20. Get Notifications

**Endpoint:** `GET /api/mobile/notifications`

**Authentication:** Required

**Query Parameters:** `limit` (default 50), `offset` (default 0)

**Response:** List of notifications for the user (e.g. assigned issues, department updates).

---

### 21. Mark Notification as Read

**Endpoint:** `PATCH /api/mobile/notifications/:id/read`

**Authentication:** Required

**Path:** `id` – notification ID.

**Response:** Updated notification or success.

---

### 22. Health Check

**Endpoint:** `GET /api/mobile/health`

**Authentication:** Not required

**Response:** API status and list of available endpoints.

---

## GPS Location Requirements

### Why GPS is Required

GPS coordinates are mandatory for:
1. **Issue Creation**: Ensures issues are reported from the actual location
2. **Issue Resolution**: Validates that resolution occurs at the same location (within 50m tolerance)

### GPS Capture Best Practices

1. **Request High Accuracy:**
   ```javascript
   navigator.geolocation.getCurrentPosition(
     successCallback,
     errorCallback,
     {
       enableHighAccuracy: true,
       timeout: 10000,
       maximumAge: 0
     }
   );
   ```

2. **Handle Permissions:**
   - Request location permission before showing issue creation form
   - Show clear explanation of why location is needed
   - Handle permission denial gracefully

3. **Validate Coordinates:**
   - Latitude: -90 to 90
   - Longitude: -180 to 180
   - Check for null/undefined values
   - Verify coordinates are numbers, not strings

4. **Error Handling:**
   - `PERMISSION_DENIED`: Show permission request dialog
   - `POSITION_UNAVAILABLE`: Retry or allow manual entry
   - `TIMEOUT`: Retry with longer timeout

### GPS Tolerance

- **Creation**: No tolerance check (any valid GPS accepted)
- **Resolution**: Must be within **50 meters** of creation location
- **Calculation**: Uses Haversine formula for distance calculation

---

## AI Analysis & Validation

### Issue Creation AI Analysis

When creating an issue, the AI automatically:

1. **Analyzes Images** (if provided):
   - Identifies issue type
   - Assesses severity
   - Suggests category and department
   - Determines priority level

2. **Generates Title** (if not provided):
   - Creates descriptive title based on image/description

3. **Suggests Personnel**:
   - Recommends appropriate team members
   - Identifies potential risks

**AI Response Fields:**
```json
{
  "aiReportAnalysis": {
    "suggestedPersonal": ["Maintenance Team", "Safety Officer"],
    "potentialRisks": ["Safety hazard", "Property damage"],
    "aiIssueTitle": "Large Pothole on Main Road"
  }
}
```

### Resolution AI Validation

When resolving an issue, the AI:

1. **Compares Images**:
   - Original issue images vs resolution images
   - Verifies same location/area
   - Confirms issue is actually resolved

2. **Validates Resolution**:
   - Checks if fix addresses all issue aspects
   - Assesses completeness of resolution
   - Identifies any remaining problems

3. **GPS Verification**:
   - Validates resolution location matches issue location
   - Includes GPS match status in analysis

**AI Validation Response:**
```json
{
  "resolved": true,
  "aiConfidence": 0.95,
  "reasoning": "The resolution image clearly shows the pothole has been properly filled and sealed. The same location is visible in both images, confirming the fix was applied correctly.",
  "imageComparison": "Original image shows a significant pothole (approximately 30cm diameter, 10cm depth). Resolution image shows the same location with the pothole completely filled with asphalt and properly sealed. No remaining damage visible.",
  "gpsMatch": true,
  "gpsDistance": 15,
  "missingDetails": []
}
```

### AI Edge Cases

#### 1. Unclear Image
**Error Code:** `IMAGE_UNCLEAR`

**Scenario:** Image is blurry, too dark, or cannot be analyzed

**Handling:**
- Request user to provide clearer image
- Or ask for detailed description
- Show error: "The provided image is unclear. Please provide a clearer image or add a description."

#### 2. Requires User Input
**Error Code:** `REQUIRES_USER_INPUT`

**Scenario:** AI cannot determine issue details from image alone

**Handling:**
- If image provided but unclear: Request description
- If description provided but vague: Request clearer image or more details
- Show error: "AI needs more information. Please provide a description or upload a clearer image."

#### 3. Repeated Image Submission
**Error Code:** `REQUIRES_USER_INPUT_REPEATED`

**Scenario:** Same image submitted 3+ times without description

**Handling:**
- Block submission until description is provided
- Show error: "This image has been submitted multiple times. Please provide a description or submit a different image."

#### 4. AI Validation Failure
**Scenario:** AI cannot confirm resolution is valid

**Handling:**
- Resolution is rejected
- Show detailed reasoning from AI
- Request better resolution evidence (clearer image or more detailed description)

---

## Image Handling

### Image Requirements

1. **Format:** JPEG, PNG, or other common image formats
2. **Size:** Recommended max 10MB per image
3. **Count:** Up to 10 images per issue creation
4. **Resolution:** Higher resolution recommended for better AI analysis

### Image Upload Best Practices

1. **Compress Before Upload:**
   ```javascript
   // Example: Compress image before upload
   const compressImage = async (file, maxWidth = 1920, quality = 0.8) => {
     // Use image compression library
     // Return compressed file
   };
   ```

2. **Show Preview:**
   - Display image preview before upload
   - Allow user to remove/replace images
   - Show upload progress

3. **Handle Errors:**
   - Network failures: Retry upload
   - Size limits: Compress or reject
   - Format issues: Convert or reject

### Image Comparison for Resolution

The AI compares:
- **Location**: Same area visible in both images
- **Issue State**: Original problem vs resolved state
- **Completeness**: All aspects of issue addressed

**Best Practices:**
- Take resolution image from same angle as issue image
- Ensure good lighting
- Include surrounding context
- Show before/after clearly

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  // Additional fields based on error type
}
```

### Common Error Codes

| Code | HTTP Status | Description | Action |
|------|-------------|-------------|--------|
| `GPS_REQUIRED` | 400 | GPS coordinates missing | Request location permission |
| `INVALID_GPS` | 400 | Invalid GPS format | Validate coordinates |
| `GPS_MISMATCH` | 400 | Resolution location too far | Move to correct location |
| `MISSING_DESCRIPTION_AND_IMAGE` | 400 | No description or image | Require at least one |
| `REQUIRES_USER_INPUT` | 400 | AI needs more info | Request additional details |
| `IMAGE_UNCLEAR` | 400 | Image cannot be analyzed | Request clearer image |
| `REQUIRES_USER_INPUT_REPEATED` | 400 | Same image submitted multiple times | Require description |
| `MISSING_CREATION_GPS` | 400 | Issue has no creation GPS | Cannot validate resolution |
| `401` | 401 | Unauthorized | Re-authenticate |
| `403` | 403 | Forbidden | Check permissions |
| `404` | 404 | Not found | Verify resource exists |
| `500` | 500 | Server error | Retry or report |

### Error Handling Best Practices

1. **Show User-Friendly Messages:**
   ```javascript
   const errorMessages = {
     'GPS_REQUIRED': 'Location access is required. Please enable location services.',
     'GPS_MISMATCH': 'You are too far from the issue location. Please move to the correct location.',
     'IMAGE_UNCLEAR': 'The image is unclear. Please take a clearer photo.',
     // ...
   };
   ```

2. **Retry Logic:**
   - Network errors: Retry with exponential backoff
   - GPS errors: Retry location capture
   - AI errors: Allow user to resubmit with more details

3. **Logging:**
   - Log all errors for debugging
   - Include user context (without sensitive data)
   - Track error frequency

---

## Edge Cases & Best Practices

### Edge Case 1: No Internet Connection

**Scenario:** User creates issue offline

**Handling:**
1. Store issue data locally
2. Queue for upload when connection restored
3. Show sync status indicator
4. Retry upload automatically

**Implementation:**
```javascript
// Store in local database
await localDB.save('pending_issues', issueData);

// When online, sync
if (navigator.onLine) {
  await syncPendingIssues();
}
```

### Edge Case 2: GPS Permission Denied

**Scenario:** User denies location permission

**Handling:**
1. Show clear explanation of why location is needed
2. Provide link to app settings
3. Allow manual location entry (if absolutely necessary)
4. Show warning that manual entry may cause resolution validation issues

### Edge Case 3: GPS Accuracy Issues

**Scenario:** GPS returns inaccurate location (indoor, poor signal)

**Handling:**
1. Request high accuracy GPS
2. Show accuracy indicator
3. Allow user to retry
4. Warn if accuracy is poor (>20m)

### Edge Case 4: Large Image Files

**Scenario:** User uploads very large images

**Handling:**
1. Compress images before upload
2. Show compression progress
3. Warn if file still too large
4. Provide option to reduce quality

### Edge Case 5: Multiple Rapid Submissions

**Scenario:** User submits same issue multiple times quickly

**Handling:**
1. Debounce submission button
2. Show "Submitting..." state
3. Prevent duplicate submissions
4. Check for similar recent issues

### Edge Case 6: AI Analysis Timeout

**Scenario:** AI analysis takes too long

**Handling:**
1. Show loading indicator
2. Set reasonable timeout (30-60 seconds)
3. Allow user to cancel and retry
4. Fallback to manual classification if AI fails

### Edge Case 7: Resolution GPS Mismatch

**Scenario:** User tries to resolve issue from different location

**Handling:**
1. Show clear error with distance
2. Display issue location on map
3. Provide navigation to correct location
4. Allow override with admin permission (if applicable)

---

## Mobile App Development Guidelines

### 1. Architecture Recommendations

**Recommended Stack:**
- **React Native** or **Flutter** for cross-platform
- **Redux** or **Context API** for state management
- **React Query** or **SWR** for API calls
- **AsyncStorage** or **SQLite** for offline storage

### 2. State Management

```javascript
// Example: Issue state structure
const issueState = {
  issues: [],
  currentIssue: null,
  pendingIssues: [], // Offline issues
  filters: {
    status: null,
    priority: null,
    page: 1
  },
  loading: false,
  error: null
};
```

### 3. API Client Setup

```javascript
// API client with interceptors
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.snapfix.com/api/mobile',
  timeout: 30000,
});

// Request interceptor: Add token
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      await clearAuth();
      navigateToLogin();
    }
    return Promise.reject(error);
  }
);
```

### 4. GPS Service

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

  static calculateDistance(lat1, lon1, lat2, lon2) {
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
  }
}
```

### 5. Image Handling Service

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

  static async uploadImages(images) {
    const formData = new FormData();
    for (let i = 0; i < images.length; i++) {
      const compressed = await this.compressImage(images[i]);
      formData.append('images', compressed, `image_${i}.jpg`);
    }
    return formData;
  }
}
```

### 6. Offline Support

```javascript
class OfflineService {
  static async savePendingIssue(issueData) {
    const pending = await localDB.get('pending_issues') || [];
    pending.push({
      ...issueData,
      id: generateId(),
      timestamp: Date.now(),
      synced: false
    });
    await localDB.set('pending_issues', pending);
  }

  static async syncPendingIssues() {
    if (!navigator.onLine) return;

    const pending = await localDB.get('pending_issues') || [];
    const unsynced = pending.filter(p => !p.synced);

    for (const issue of unsynced) {
      try {
        await apiClient.post('/issues', issue);
        issue.synced = true;
      } catch (error) {
        console.error('Failed to sync issue:', error);
      }
    }

    await localDB.set('pending_issues', pending.filter(p => !p.synced));
  }
}
```

### 7. Error Handling Service

```javascript
class ErrorHandler {
  static getUserFriendlyMessage(error) {
    const code = error.response?.data?.code;
    const message = error.response?.data?.message || error.message;

    const errorMessages = {
      'GPS_REQUIRED': 'Location access is required. Please enable location services in your device settings.',
      'INVALID_GPS': 'Invalid location coordinates. Please try capturing location again.',
      'GPS_MISMATCH': 'You are too far from the issue location. Please move to the correct location to resolve this issue.',
      'MISSING_DESCRIPTION_AND_IMAGE': 'Please provide either a description or upload an image to create the issue.',
      'REQUIRES_USER_INPUT': 'AI needs more information. Please provide a clearer description or upload a better image.',
      'IMAGE_UNCLEAR': 'The image is unclear or blurry. Please take a clearer photo or provide a description.',
      'REQUIRES_USER_INPUT_REPEATED': 'This image has been submitted multiple times. Please provide a description or take a different photo.',
      'MISSING_CREATION_GPS': 'This issue was created without GPS location. Cannot validate resolution location.',
    };

    return errorMessages[code] || message || 'An error occurred. Please try again.';
  }

  static handleError(error, context) {
    const userMessage = this.getUserFriendlyMessage(error);
    
    // Show user-friendly message
    showToast(userMessage, 'error');
    
    // Log for debugging
    console.error(`Error in ${context}:`, error);
    
    // Track error analytics
    analytics.track('api_error', {
      code: error.response?.data?.code,
      context,
      message: error.message
    });
  }
}
```

---

## Code Examples

### Example 1: Create Issue with GPS and Images

```javascript
async function createIssue(issueData) {
  try {
    // 1. Get GPS location
    const location = await GPSService.getCurrentLocation();
    
    // 2. Prepare form data
    const formData = new FormData();
    formData.append('siteId', issueData.siteId);
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());
    formData.append('description', issueData.description);
    
    // 3. Compress and add images
    if (issueData.images && issueData.images.length > 0) {
      for (const image of issueData.images) {
        const compressed = await ImageService.compressImage(image);
        formData.append('images', compressed, image.name);
      }
    }
    
    // 4. Add optional fields
    if (issueData.priority) {
      formData.append('priority', issueData.priority);
    }
    if (issueData.categoryId) {
      formData.append('categoryId', issueData.categoryId);
    }
    
    // 5. Submit
    const response = await apiClient.post('/issues', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        updateUploadProgress(percentCompleted);
      },
    });
    
    return response.data;
  } catch (error) {
    ErrorHandler.handleError(error, 'createIssue');
    
    // Handle specific error codes
    if (error.response?.data?.code === 'GPS_REQUIRED') {
      // Request location permission
      await requestLocationPermission();
      // Retry
      return createIssue(issueData);
    }
    
    if (error.response?.data?.code === 'REQUIRES_USER_INPUT') {
      // Show form to add description
      showDescriptionRequiredDialog();
    }
    
    throw error;
  }
}
```

### Example 2: Resolve Issue with Validation

```javascript
async function resolveIssue(issueId, resolutionData) {
  try {
    // 1. Get current GPS location
    const location = await GPSService.getCurrentLocation();
    
    // 2. Check distance from issue location (optional pre-check)
    const issue = await apiClient.get(`/issues/${issueId}`);
    if (issue.data.createdGps) {
      const distance = GPSService.calculateDistance(
        issue.data.createdGps.latitude,
        issue.data.createdGps.longitude,
        location.latitude,
        location.longitude
      );
      
      if (distance > 50) {
        throw new Error({
          code: 'GPS_MISMATCH',
          message: `You are ${Math.round(distance)}m away from the issue location. Please move closer.`,
          distance
        });
      }
    }
    
    // 3. Prepare form data
    const formData = new FormData();
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());
    
    if (resolutionData.description) {
      formData.append('resolutionDescription', resolutionData.description);
    }
    
    if (resolutionData.image) {
      const compressed = await ImageService.compressImage(resolutionData.image);
      formData.append('resolutionImage', compressed, 'resolution.jpg');
    }
    
    // 4. Submit resolution
    const response = await apiClient.patch(
      `/issues/${issueId}/resolve`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    // 5. Show validation results
    if (response.data.validation) {
      showValidationModal(response.data.validation);
    }
    
    return response.data;
  } catch (error) {
    ErrorHandler.handleError(error, 'resolveIssue');
    
    if (error.response?.data?.code === 'GPS_MISMATCH') {
      // Show map with issue location
      showIssueLocationMap(error.response.data);
      // Allow user to navigate to location
      showNavigationButton(error.response.data.createdGps);
    }
    
    throw error;
  }
}
```

### Example 3: Handle AI Analysis Errors

```javascript
async function handleIssueCreation(issueData) {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      return await createIssue(issueData);
    } catch (error) {
      const code = error.response?.data?.code;
      
      if (code === 'IMAGE_UNCLEAR') {
        // Show dialog to retake photo
        const shouldRetry = await showDialog({
          title: 'Image Unclear',
          message: 'The image is blurry or unclear. Would you like to take another photo?',
          buttons: ['Retake Photo', 'Add Description', 'Cancel']
        });
        
        if (shouldRetry === 'Retake Photo') {
          // Open camera again
          const newImage = await openCamera();
          issueData.images = [newImage];
          retryCount++;
          continue;
        } else if (shouldRetry === 'Add Description') {
          // Show description input
          const description = await showDescriptionInput();
          issueData.description = description;
          retryCount++;
          continue;
        } else {
          throw error;
        }
      } else if (code === 'REQUIRES_USER_INPUT') {
        // Show form to add more details
        const additionalInfo = await showAdditionalInfoForm();
        issueData.description = additionalInfo.description || issueData.description;
        if (additionalInfo.newImage) {
          issueData.images = [additionalInfo.newImage];
        }
        retryCount++;
        continue;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Example 4: Offline Issue Creation

```javascript
async function createIssueWithOfflineSupport(issueData) {
  try {
    // Try to create online
    if (navigator.onLine) {
      return await createIssue(issueData);
    } else {
      // Save offline
      await OfflineService.savePendingIssue(issueData);
      showToast('Issue saved offline. Will sync when connection is restored.', 'info');
      return { offline: true, id: generateId() };
    }
  } catch (error) {
    // If online but request failed, save offline
    if (navigator.onLine && error.code !== 'GPS_REQUIRED') {
      await OfflineService.savePendingIssue(issueData);
      showToast('Issue saved offline due to error. Will sync when possible.', 'warning');
      return { offline: true, id: generateId() };
    }
    throw error;
  }
}

// Sync when online
window.addEventListener('online', async () => {
  await OfflineService.syncPendingIssues();
  showToast('Pending issues synced successfully.', 'success');
});
```

---

## Testing Checklist

### Pre-Production Testing

- [ ] GPS capture works on all target devices
- [ ] Image upload works with various image sizes
- [ ] Offline mode saves and syncs correctly
- [ ] Error messages are user-friendly
- [ ] AI validation handles all edge cases
- [ ] GPS mismatch detection works correctly
- [ ] Image compression doesn't degrade quality too much
- [ ] Network timeout handling works
- [ ] Permission requests are clear
- [ ] Retry logic works for failed requests

### Edge Case Testing

- [ ] No internet connection
- [ ] GPS permission denied
- [ ] Poor GPS signal (indoor)
- [ ] Very large images (>10MB)
- [ ] Multiple rapid submissions
- [ ] AI analysis timeout
- [ ] Resolution from wrong location
- [ ] Unclear/blurry images
- [ ] Same image submitted multiple times

---

## Support & Contact

For API support, please contact:
- **Email:** api-support@snapfix.com
- **Documentation:** https://docs.snapfix.com
- **Status Page:** https://status.snapfix.com

---

## Changelog

### Version 1.0.0 (Current)
- Initial release
- GPS location tracking
- AI-powered analysis
- Image comparison for resolution
- Comprehensive error handling

---

## Platform Tracking

### Overview

Every issue created includes a `platform` field that identifies the source platform. This helps with:
- Analytics and reporting
- Platform-specific feature optimization
- Debugging and support
- Usage pattern analysis

### Platform Values

| Value | Description | Default For |
|-------|-------------|-------------|
| `web` | Desktop or mobile web browser | Web API (`/api/issues`) |
| `mobile-ios` | iOS native mobile app | Mobile API (if explicitly set) |
| `mobile-android` | Android native mobile app | Mobile API (default) |
| `mobile-web` | Mobile web browser (PWA) | Auto-detected |
| `public` | Public API endpoint | Public API (`/api/issues/public`) |
| `api` | Server-to-server API calls | Server-side |

### Setting Platform in Mobile Apps

**For Native Mobile Apps (React Native, Flutter, etc.):**

```javascript
// React Native example
import { Platform } from 'react-native';

const formData = new FormData();
formData.append('platform', Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android');
```

```dart
// Flutter example
import 'dart:io';

String platform = Platform.isIOS ? 'mobile-ios' : 'mobile-android';
formData.fields['platform'] = platform;
```

**For Web Applications:**

The platform is auto-detected from the user agent, but can be explicitly set:

```javascript
// Explicitly set platform
formData.append('platform', 'web');
```

### Platform Detection Helper (Web)

```javascript
function detectPlatform() {
  if (typeof window === 'undefined') return 'api';
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for Android
  if (/android/i.test(userAgent)) {
    // Check if PWA (standalone mode)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return 'mobile-android';
    }
    return 'mobile-web';
  }
  
  // Check for iOS
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    // Check if PWA (standalone mode)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return 'mobile-ios';
    }
    return 'mobile-web';
  }
  
  return 'web';
}
```

### Platform in API Responses

The platform field is included in all issue responses:

```json
{
  "_id": "issue_id",
  "title": "Issue Title",
  "platform": "mobile-android",
  "createdGps": {...},
  ...
}
```

### Querying Issues by Platform

You can filter issues by platform in your application:

```javascript
// Get all mobile app issues
const mobileIssues = issues.filter(issue => 
  issue.platform === 'mobile-ios' || issue.platform === 'mobile-android'
);

// Get web issues
const webIssues = issues.filter(issue => issue.platform === 'web');
```

---

**Last Updated:** February 2025  
**API Version:** 1.2.0

### Changelog (v1.2.0)
- Added **Update Due Date** (`PATCH /issues/:id/due-date`).
- Added **Update Category** (`PATCH /issues/:id/category`).
- Documented **Assign/Reassign** (`PATCH /issues/:id/assign`).
- Documented **Users**, **Dashboard**, **Device**, **Notifications**, **Health**.
- Issue responses now include **activity comments** (`comments` array).
- Added quick reference table of all mobile API endpoints.

