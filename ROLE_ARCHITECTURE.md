# Role Architecture in Snapfix

## Current Structure

### User Model (`backend/src/models/User.js`)
- **`roles`**: User's role and permissions (array, can have multiple roles)
  - `'saas-owner'` - SnapFix product owner (platform administrator)
  - `'superadmin'` - Super admin with elevated permissions
  - `'client'` - Client Admin (owner of the organization)
  - `'head-of-staff'` - Site admin (manager within organization)
  - `'field-staff'` - Field user (regular staff member)
  - `'tenants'` - Tenants (can raise tickets via multiple channels)
  - `'vendors'` - Vendors (external service providers)

### Client Model (`backend/src/models/Client.js`)
- **`userType`**: Type of organization
  - `'saas-owner'` - Snapfix's own organization (platform owner)
  - `'client'` - Regular client organization (customer)

## Role Descriptions

### 1. SaaS Owner (`saas-owner`)
- **Who**: SnapFix product owner
- **Description**: Full platform administrator with complete access to all clients and platform settings
- **Permissions**:
  - Manage all clients and organizations
  - Access all issues across all clients
  - Configure platform settings
  - Full system administration
- **Access Level**: Highest (platform-wide)

### 2. Super Admin (`superadmin`)
- **Who**: Elevated administrator
- **Description**: Super admin with elevated permissions that can manage across organizations
- **Permissions**:
  - Cross-organization management
  - Elevated permissions beyond regular admins
  - Can access multiple client organizations
- **Access Level**: Very High (cross-organization)

### 3. Client Admin (`client`)
- **Who**: Owner of the organization
- **Description**: Organization owner who manages their entire organization
- **Permissions**:
  - Manage all issues within their organization
  - Manage users, sites, departments, and categories
  - Assign issues to users or departments
  - View all analytics and reports for their organization
  - Full access to their organization's data
- **Access Level**: High (organization-wide)

### 4. Head of Staff (`head-of-staff`)
- **Who**: Site admin
- **Description**: Manager role within the organization, typically manages a site or department
- **Permissions**:
  - View and manage issues in their assigned departments
  - Assign issues to field staff
  - Accept and resolve issues in their departments
  - View analytics for their departments
  - Manage field staff within their scope
- **Access Level**: Medium-High (department/site-wide)

### 5. Field Staff (`field-staff`)
- **Who**: Field user
- **Description**: Regular staff member who works in the field
- **Permissions**:
  - Snap photos to report issues instantly
  - Create new issues/tickets
  - View issues they created
  - View issues assigned to them
  - Update status of assigned issues
  - Works offline—tickets sync automatically when connectivity returns
  - Get real-time status updates and ETAs
  - GPS auto-tagging
  - Push notifications
- **Access Level**: Medium (personal + assigned issues)

### 6. Tenants (`tenants`)
- **Who**: Property tenants/residents
- **Description**: End users who can raise tickets through multiple channels
- **Permissions**:
  - Raise tickets easily via QR code, WhatsApp, email, or web link
  - Track their requests in real-time
  - Receive updates until resolution
  - Privacy-protected view (only see their own tickets)
  - Multi-channel access
  - Live status tracking
- **Access Level**: Low (own tickets only)

### 7. Vendors (`vendors`)
- **Who**: External service providers/contractors
- **Description**: External vendors who handle assigned tickets
- **Permissions**:
  - See only tickets assigned to them
  - Update ticket status
  - Add resolution notes and photos
  - Get notified instantly for new and escalated work
  - Assigned-only visibility
  - Resolution photo upload
  - SLA alerts
- **Access Level**: Low-Medium (assigned tickets only)

## The Distinction

### Two Different Concepts:

1. **User Role** (in User table) - What the user can do
   - `saas-owner` = SnapFix product owner (manages all clients, full platform access)
   - `superadmin` = Super admin with elevated permissions (can manage across organizations)
   - `client` = Client Admin (owner of the organization)
   - `head-of-staff` = Site admin (manager within organization)
   - `field-staff` = Field user (regular staff member)
   - `tenants` = Tenants (can raise tickets via multiple channels)
   - `vendors` = Vendors (external service providers)

2. **Client Type** (in Client table) - What type of organization
   - `saas-owner` = Snapfix platform organization (manages all clients)
   - `client` = Regular client organization (customer)

## Architecture

**User.roles** - User permissions and access level (array)
- `saas-owner`, `superadmin`, `client`, `head-of-staff`, `field-staff`, `tenants`, `vendors`

**Client.userType** - Organization type
- `saas-owner` = Snapfix platform organization
- `client` = Regular client organization

## Usage Examples

### Snapfix Platform Owner
```javascript
User: { isSaasOwner: true, clientId: 'snapfix-org-id' }
Client: { userType: 'saas-owner', name: 'SnapFix' }
→ Can manage all clients, platform settings, full access
```

### Super Admin
```javascript
User: { isSuperAdmin: true, clientId: 'any-org-id' }
Client: { userType: 'client' or 'saas-owner' }
→ Elevated permissions, can manage across organizations
```

### Client Organization Admin
```javascript
User: { isClientAdmin: true, clientId: 'client-org-id' }
Client: { userType: 'client', name: 'Acme Corp' }
→ Can manage only their organization (owner of the organization)
```

### Head of Staff (Site Admin)
```javascript
User: { roles: ['head-of-staff'], clientId: 'client-org-id' }
Client: { userType: 'client', name: 'Acme Corp' }
→ Site admin role within their organization
```

### Field Staff (Field User)
```javascript
User: { roles: ['field-staff'], clientId: 'client-org-id' }
Client: { userType: 'client', name: 'Acme Corp' }
→ Field user who can create/view tickets, works offline
```

### Tenants
```javascript
User: { roles: ['tenants'], clientId: 'client-org-id' }
Client: { userType: 'client', name: 'Acme Corp' }
→ Can raise tickets via QR code, WhatsApp, email, web link
→ Privacy-protected view (only own tickets)
```

### Vendors
```javascript
User: { roles: ['vendors'], clientId: 'client-org-id' }
Client: { userType: 'client', name: 'Acme Corp' }
→ See only tickets assigned to them
→ Can update status, add resolution notes/photos
→ Get notified for new/escalated work
```

## Access Control Logic

### Middleware: `isSaaSAdmin`
Used in client management routes to restrict access to SaaS owners and superadmins:

```javascript
// backend/api/clients.js
const isSaaSAdmin = async (req, res, next) => {
  const user = await User.findById(req.user?.userId || req.user?.id)
  
  // Check if user is SaaS owner or superadmin
  if (user.role !== 'saas-owner' && user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. SaaS owner or superadmin only.' })
  }
  
  // For SaaS owner, verify they belong to SaaS owner organization
  if (user.role === 'saas-owner') {
    const client = await Client.findById(user.clientId)
    if (!client || client.userType !== 'saas-owner') {
      return res.status(403).json({ message: 'Access denied. Invalid SaaS owner organization.' })
    }
  }
  
  next()
}
```

### Helper Functions

```javascript
// Check if user is Snapfix platform owner
const isPlatformOwner = async (user) => {
  const client = await Client.findById(user.clientId)
  return user.isSaasOwner && client.userType === 'saas-owner'
}

// Check if user is superadmin
const isSuperAdmin = (user) => {
  return user.isSuperAdmin
}

// Check if user is client organization admin
const isClientAdmin = async (user) => {
  return user.isClientAdmin
}

// Check if user can manage clients (SaaS owner or superadmin)
const canManageClients = async (user) => {
  if (user.isSuperAdmin) return true
  if (user.isSaasOwner) {
    const client = await Client.findById(user.clientId)
    return client && client.userType === 'saas-owner'
  }
  return false
}
```

## Authentication Flow

In `backend/api/auth.js`, the login process:
1. Verifies user credentials
2. Checks user belongs to a client
3. For SaaS owner organization, skips client status check
4. For regular clients, verifies client is `active`

```javascript
// For SaaS owner organization, skip status check
// For regular clients, verify they are active
if (client.userType !== 'saas-owner' && client.status !== 'active') {
  return res.status(403).json({ 
    message: `Client is ${client.status}. Please contact support.` 
  })
}
```

## JWT Protect Middleware

In `backend/src/middleware/auth.js`, the `protect` middleware:
- Extracts the bearer token (or cookie) from each request
- Verifies the JWT signature using `JWT_SECRET`
- Ensures the payload contains `userId`, `clientId`, and `role`
- Verifies the user and client exist and belong together
- Allows SaaS owner organizations through even if their status is not `active`

## Summary

- **User.roles** = User permissions (saas-owner, superadmin, client, head-of-staff, field-staff, tenants, vendors)
- **Client.userType** = Organization type (saas-owner, client)
- **SaaS Owner** = SnapFix product owner, full platform access, manages all clients
- **Super Admin** = Elevated permissions across organizations
- **Client Admin** = Owner of the organization, manages only their organization
- **Head of Staff** = Site admin, manager role within organization
- **Field Staff** = Field user, regular staff member who works in the field
- **Tenants** = Can raise tickets via QR code, WhatsApp, email, web link. Privacy-protected view.
- **Vendors** = External service providers, see only assigned tickets, can resolve with notes/photos

## Role Hierarchy

```
saas-owner (highest)
  └─ SnapFix product owner, full platform access, manages all clients
  
superadmin
  └─ Elevated permissions, can manage across organizations
  
client (Client Admin)
  └─ Owner of the organization, manages only their organization
  
head-of-staff (Site Admin)
  └─ Site admin, manager role within organization
  
field-staff (Field User)
  └─ Field user, regular staff member who works in the field
  
vendors
  └─ External service providers, see only assigned tickets
  
tenants (lowest)
  └─ Can raise tickets via multiple channels, privacy-protected view
```

## Feature Matrix by Role

| Feature | SaaS Owner | Super Admin | Client Admin | Head of Staff | Field Staff | Vendors | Tenants |
|---------|-----------|-------------|--------------|---------------|-------------|---------|---------|
| Manage all clients | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage own organization | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage departments/sites | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View all organization issues | ✅ | ✅ | ✅ | ✅ (dept) | ❌ | ❌ | ❌ |
| Create issues | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| View own issues | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| View assigned issues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Resolve issues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Assign issues | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Multi-channel ticket creation | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Privacy-protected view | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Offline sync | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| GPS auto-tagging | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Resolution photos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| SLA alerts | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
