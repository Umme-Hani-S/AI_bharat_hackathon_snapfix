# Postman API Guide - Create Issue

## Issue Creation Types

There are **3 types of issue creation** in SnapFix:

1. **Web Issues** (`/api/issues`) - Created from React web application (IssueReport.tsx) - requires authentication
2. **Mobile Issues** (`/api/mobile/issues`) - Created from mobile app via mobile API - requires authentication
3. **Public Issues** (`/api/issues/public`) - Created from public React page (PublicIssueReport.tsx) via QR code scan - no authentication

---

## 📸 How to Send Images in Postman

### Step-by-Step Instructions:

1. **Set Request Method:** Select `POST`
2. **Enter URL:** `http://localhost:5000/api/issues` (or your production URL)
3. **Go to Body Tab:**
   - Select `form-data` (NOT `raw` or `x-www-form-urlencoded`)
4. **Add Fields:**
   - For text fields: Key = field name, Type = `Text`, Value = your value
   - For image: Key = `image`, Type = `File`, Value = [Click "Select Files" to choose image]
5. **Add Headers:**
   - `Authorization: Bearer YOUR_JWT_TOKEN` (for organization endpoint only)
   - **DO NOT** manually set `Content-Type: multipart/form-data` - Postman sets this automatically

### Visual Guide:

```
┌─────────────────────────────────────┐
│ Body Tab                            │
├─────────────────────────────────────┤
│ ○ none  ○ form-data  ○ x-www-form  │
│   ○ raw  ○ binary  ○ GraphQL        │
│                                      │
│ Key          Type    Value           │
│ ─────────────────────────────────── │
│ description  Text    Issue desc...   │
│ priority     Text    high            │
│ siteId       Text    507f1f77...     │
│ image        File    [Select Files]  │ ← Click here to upload
└─────────────────────────────────────┘
```

---

## Endpoint 1: Create Issue (Organization) - Requires Authentication

**Method:** `POST`  
**URL:** `http://localhost:5000/api/issues` (or your production URL)  
**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```
**Note:** Do NOT manually set `Content-Type` header - Postman will set it automatically for form-data.

### Using Form-Data (Required for Image Upload)

**Body Tab Settings:**
- Select `form-data` (NOT raw JSON)

**Fields to Add:**

| Key | Type | Value | Required |
|-----|------|-------|----------|
| `title` | Text | "Broken door handle in main entrance" | Optional |
| `description` | Text | "The door handle is loose and needs repair" | Optional* |
| `priority` | Text | "high" | Optional (default: "medium") |
| `siteId` | Text | "507f1f77bcf86cd799439011" | **Required** |
| `category` | Text | "507f1f77bcf86cd799439012" | Optional |
| `department` | Text | "507f1f77bcf86cd799439013" | Optional |
| `assignedTo` | Text | "507f1f77bcf86cd799439014" | Optional |
| `dueDate` | Text | "2024-12-31T23:59:59.000Z" | Optional |
| `image` | **File** | **[Click "Select Files" button]** | Optional* |

**Important for Image Upload:**
- Key name must be exactly: `image`
- Type must be: `File` (not Text)
- Click the "Select Files" button to choose your image file
- Supported formats: JPG, PNG, GIF, etc.

**Note:** Either `description` or `image` must be provided.

### Sample Raw JSON (Without Image)

If you want to use raw JSON (without image upload), you can use this:

```json
{
  "title": "Broken door handle in main entrance",
  "description": "The door handle is loose and needs immediate repair. It's affecting security.",
  "priority": "high",
  "siteId": "507f1f77bcf86cd799439011",
  "category": "507f1f77bcf86cd799439012",
  "department": "507f1f77bcf86cd799439013",
  "assignedTo": "507f1f77bcf86cd799439014",
  "dueDate": "2024-12-31T23:59:59.000Z"
}
```

**Important:** For raw JSON, set `Content-Type: application/json` header. However, you cannot upload images with raw JSON - use form-data for that.

### Minimal Required Fields

```json
{
  "description": "Issue description here",
  "priority": "medium",
  "siteId": "507f1f77bcf86cd799439011"
}
```

---

## Endpoint 2: Create Issue (Public) - No Authentication Required

**Method:** `POST`  
**URL:** `http://localhost:5000/api/issues/public`  
**Headers:**
```
Content-Type: multipart/form-data
```

### Using Form-Data (Required for Image Upload)

**Body Tab Settings:**
- Select `form-data` (NOT raw JSON)

**Fields to Add:**

| Key | Type | Value | Required |
|-----|------|-------|----------|
| `title` | Text | "Leaky faucet in restroom" | Optional |
| `description` | Text | "The faucet is dripping continuously" | Optional* |
| `priority` | Text | "medium" | Optional (default: "medium") |
| `locationId` | Text | "507f1f77bcf86cd799439015" | **Required** |
| `siteId` | Text | "507f1f77bcf86cd799439011" | Optional |
| `category` | Text | "507f1f77bcf86cd799439012" | Optional |
| `department` | Text | "507f1f77bcf86cd799439013" | Optional |
| `dueDate` | Text | "2024-12-31T23:59:59.000Z" | Optional |
| `image` | **File** | **[Click "Select Files" button]** | Optional* |

**Note:** Either `description` or `image` must be provided.

### Sample Raw JSON (Without Image)

```json
{
  "title": "Leaky faucet in restroom",
  "description": "The faucet in the men's restroom on the 2nd floor is dripping continuously and needs repair.",
  "priority": "medium",
  "locationId": "507f1f77bcf86cd799439015",
  "siteId": "507f1f77bcf86cd799439011",
  "category": "507f1f77bcf86cd799439012",
  "department": "507f1f77bcf86cd799439013",
  "dueDate": "2024-12-31T23:59:59.000Z"
}
```

### Minimal Required Fields

```json
{
  "description": "Issue description here",
  "priority": "medium",
  "locationId": "507f1f77bcf86cd799439015"
}
```

---

## Priority Values

Valid priority values:
- `"low"`
- `"medium"` (default)
- `"high"`
- `"critical"`

## Date Format

Use ISO 8601 format for dates:
```
"2024-12-31T23:59:59.000Z"
```

## Example Postman Collection

### 1. Create Issue (Organization) - Form-Data

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/issues`
- Headers:
  - `Authorization: Bearer {{token}}`
- Body: `form-data`
  - `description`: "Test issue description"
  - `priority`: "high"
  - `siteId`: "YOUR_SITE_ID"
  - `image`: [File] (optional)

### 2. Create Issue (Organization) - Raw JSON

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/issues`
- Headers:
  - `Authorization: Bearer {{token}}`
  - `Content-Type: application/json`
- Body: `raw` (JSON)
```json
{
  "title": "Sample Issue Title",
  "description": "This is a sample issue description for testing",
  "priority": "high",
  "siteId": "YOUR_SITE_ID",
  "category": "YOUR_CATEGORY_ID",
  "department": "YOUR_DEPARTMENT_ID",
  "assignedTo": "YOUR_USER_ID",
  "dueDate": "2024-12-31T23:59:59.000Z"
}
```

### 3. Create Issue (Public) - Form-Data

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/issues/public`
- Headers: None (public endpoint)
- Body: `form-data`
  - `description`: "Public issue description"
  - `priority`: "medium"
  - `locationId`: "YOUR_LOCATION_ID"
  - `image`: [File] (optional)

### 4. Create Issue (Public) - Raw JSON

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/issues/public`
- Headers:
  - `Content-Type: application/json`
- Body: `raw` (JSON)
```json
{
  "title": "Public Issue Title",
  "description": "This is a public issue description",
  "priority": "medium",
  "locationId": "YOUR_LOCATION_ID",
  "siteId": "YOUR_SITE_ID",
  "category": "YOUR_CATEGORY_ID",
  "department": "YOUR_DEPARTMENT_ID",
  "dueDate": "2024-12-31T23:59:59.000Z"
}
```

---

## Getting IDs for Testing

To get valid IDs for testing, you can use these endpoints (with authentication):

1. **Get Sites:** `GET /api/sites`
2. **Get Locations:** `GET /api/locations?siteId=YOUR_SITE_ID`
3. **Get Categories:** `GET /api/categories`
4. **Get Departments:** `GET /api/departments`
5. **Get Users:** `GET /api/users`

---

## Response Examples

### Success Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "title": "Broken door handle in main entrance",
  "description": "The door handle is loose and needs repair",
  "status": "open",
  "priority": "high",
  "images": ["https://s3.amazonaws.com/bucket/image.jpg"],
  "site": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Main Office"
  },
  "category": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Maintenance"
  },
  "department": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Facilities"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Error Response (400 Bad Request)

```json
{
  "message": "Site is required"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "message": "Server error"
}
```

---

## 📸 Detailed Image Upload Instructions

### In Postman:

1. **Open Postman** and create a new request
2. **Set Method:** `POST`
3. **Set URL:** Your API endpoint
4. **Go to "Body" tab**
5. **Select "form-data"** (NOT "raw" or "x-www-form-urlencoded")
6. **Add your fields:**
   - For text fields: Type = `Text`
   - For image: Type = `File`
7. **For the image field:**
   - Key: `image` (exactly this name)
   - Type: Select `File` from dropdown (not Text)
   - Value: Click "Select Files" button and choose your image
8. **Add Authorization header** (for organization endpoint only):
   - Key: `Authorization`
   - Value: `Bearer YOUR_JWT_TOKEN`

### Example Screenshot Description:

```
Postman Body Tab (form-data selected):
┌─────────────────────────────────────────────┐
│ Key        │ Type │ Value                   │
├─────────────────────────────────────────────┤
│ description│ Text │ Issue description...    │
│ priority   │ Text │ high                    │
│ siteId     │ Text │ 507f1f77bcf86cd799439011│
│ image      │ File │ [Select Files] ← Click!  │
└─────────────────────────────────────────────┘
```

### Common Mistakes to Avoid:

❌ **Don't use "raw" JSON** - Images can't be uploaded as JSON  
❌ **Don't manually set Content-Type header** - Postman sets it automatically  
❌ **Don't use "Text" type for image** - Must use "File" type  
✅ **Use "form-data" body type**  
✅ **Set image field type to "File"**  
✅ **Click "Select Files" to choose image**

### Supported Image Formats:
- JPG/JPEG
- PNG
- GIF
- WebP
- Other common image formats

---

## Notes

1. **Image Upload:** Use `form-data` body type, not raw JSON, if you want to upload images
2. **Authentication:** Organization endpoint requires JWT token in `Authorization` header
3. **Public Endpoint:** No authentication required, but needs `locationId`
4. **Description/Image:** At least one must be provided (either description text or image file)
5. **IDs:** All IDs should be valid MongoDB ObjectIds (24 character hex strings)
6. **Content-Type:** Postman automatically sets `multipart/form-data` - don't set it manually

