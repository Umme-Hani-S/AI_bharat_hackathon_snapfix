# SnapFix AI - Requirements Document

## 1. Project Overview

### 1.1 Product Name
SnapFix AI - AI-Powered Issue Reporting SaaS

### 1.2 Product Vision
A modern, full-stack SaaS application that revolutionizes maintenance issue reporting and resolution through AI-powered automation, GPS validation, and multi-channel accessibility.

### 1.3 Target Users
- **SaaS Owners**: Platform administrators managing multiple client organizations
- **Super Admins**: Elevated administrators with cross-organization access
- **Client Admins**: Organization owners managing their entire company
- **Head of Staff**: Site managers overseeing departments and teams
- **Field Staff**: Field workers creating and resolving issues on-site
- **Tenants**: Property residents raising tickets through multiple channels
- **Vendors**: External service providers handling assigned work

### 1.4 Business Goals
- Streamline maintenance issue reporting and resolution workflows
- Reduce resolution time through AI-powered triage and routing
- Ensure accountability with GPS validation and image verification
- Enable offline-first mobile experience for field workers
- Provide multi-channel access for tenants (QR code, WhatsApp, email, web)
- Deliver real-time analytics and SLA tracking

---

## 2. Functional Requirements

### 2.1 User Management

#### 2.1.1 Authentication
- **FR-AUTH-001**: Users must register with email, password, name, and organization
- **FR-AUTH-002**: Users must login with email and password
- **FR-AUTH-003**: System must issue JWT tokens for authenticated sessions
- **FR-AUTH-004**: Tokens must expire and require refresh
- **FR-AUTH-005**: System must support role-based access control (RBAC)

#### 2.1.2 User Roles
- **FR-ROLE-001**: Support 7 distinct user roles: saas-owner, superadmin, client, head-of-staff, field-staff, tenants, vendors
- **FR-ROLE-002**: SaaS owners must have full platform access across all clients
- **FR-ROLE-003**: Super admins must have elevated cross-organization permissions
- **FR-ROLE-004**: Client admins must manage only their organization
- **FR-ROLE-005**: Head of staff must manage assigned departments/sites
- **FR-ROLE-006**: Field staff must create and resolve assigned issues
- **FR-ROLE-007**: Tenants must raise tickets via multiple channels with privacy protection
- **FR-ROLE-008**: Vendors must see only assigned tickets and update resolution status

#### 2.1.3 User Profile Management
- **FR-USER-001**: Users must update their profile information
- **FR-USER-002**: Users must upload profile pictures
- **FR-USER-003**: Admins must create, edit, and deactivate users
- **FR-USER-004**: System must track user activity and last login

### 2.2 Issue/Ticket Management

#### 2.2.1 Issue Creation
- **FR-ISSUE-001**: Users must create issues with title, description, and/or images
- **FR-ISSUE-002**: System must require GPS coordinates for all issue creation
- **FR-ISSUE-003**: Users must upload up to 10 images per issue
- **FR-ISSUE-004**: System must support issue creation via web, mobile app, QR code, WhatsApp, and email
- **FR-ISSUE-005**: Issues must be associated with a site, category, and department
- **FR-ISSUE-006**: System must assign priority levels: low, medium, high, critical
- **FR-ISSUE-007**: System must support offline issue creation with automatic sync

#### 2.2.2 Issue Assignment
- **FR-ASSIGN-001**: Admins must manually assign issues to users or departments
- **FR-ASSIGN-002**: System must support auto-assignment based on rules
- **FR-ASSIGN-003**: System must notify assigned users via push notifications
- **FR-ASSIGN-004**: System must track assignment history

#### 2.2.3 Issue Status Management
- **FR-STATUS-001**: Issues must have statuses: open, in-progress, resolved, closed
- **FR-STATUS-002**: Field staff must update issue status
- **FR-STATUS-003**: System must track status change history with timestamps
- **FR-STATUS-004**: System must prevent unauthorized status changes

#### 2.2.4 Issue Resolution
- **FR-RESOLVE-001**: Users must provide resolution description and/or images
- **FR-RESOLVE-002**: System must require GPS coordinates for resolution
- **FR-RESOLVE-003**: System must validate resolution GPS within 50m of creation GPS
- **FR-RESOLVE-004**: System must use AI to verify resolution completeness
- **FR-RESOLVE-005**: System must reject resolutions that fail AI validation
- **FR-RESOLVE-006**: System must track resolution time and SLA compliance

#### 2.2.5 Issue Search and Filtering
- **FR-SEARCH-001**: Users must search issues by title, description, ID
- **FR-FILTER-001**: Users must filter issues by status, priority, site, category, department
- **FR-FILTER-002**: Users must filter issues by date range
- **FR-FILTER-003**: System must support pagination for large result sets

### 2.3 AI-Powered Features

#### 2.3.1 AI Issue Analysis
- **FR-AI-001**: System must analyze uploaded images to identify issue type
- **FR-AI-002**: System must generate issue titles from images when not provided
- **FR-AI-003**: System must suggest appropriate category and department
- **FR-AI-004**: System must assess priority level based on image analysis
- **FR-AI-005**: System must identify potential risks and suggest personnel
- **FR-AI-006**: System must handle unclear images by requesting user input
- **FR-AI-007**: System must prevent repeated submission of same unclear image

#### 2.3.2 AI Resolution Validation
- **FR-AI-RES-001**: System must compare issue images with resolution images
- **FR-AI-RES-002**: System must verify resolution addresses all issue aspects
- **FR-AI-RES-003**: System must provide confidence score for resolution validation
- **FR-AI-RES-004**: System must provide detailed reasoning for validation results
- **FR-AI-RES-005**: System must identify missing resolution details

### 2.4 GPS and Location Management

#### 2.4.1 GPS Requirements
- **FR-GPS-001**: System must capture GPS coordinates (latitude, longitude) for all issues
- **FR-GPS-002**: System must validate GPS coordinates are within valid ranges
- **FR-GPS-003**: System must request high-accuracy GPS from devices
- **FR-GPS-004**: System must calculate distance between issue and resolution locations
- **FR-GPS-005**: System must enforce 50m tolerance for resolution GPS matching

#### 2.4.2 Location Hierarchy
- **FR-LOC-001**: System must support multi-level location hierarchy: Site > Location
- **FR-LOC-002**: Users must create and manage sites
- **FR-LOC-003**: Users must create and manage locations within sites
- **FR-LOC-004**: System must display issues on map view

### 2.5 Organization Management

#### 2.5.1 Client/Organization Management
- **FR-ORG-001**: SaaS owners must create and manage client organizations
- **FR-ORG-002**: Organizations must have types: saas-owner, client
- **FR-ORG-003**: Organizations must have statuses: active, inactive, suspended
- **FR-ORG-004**: System must isolate data between client organizations
- **FR-ORG-005**: Client admins must update their organization details

#### 2.5.2 Site Management
- **FR-SITE-001**: Admins must create, edit, and delete sites
- **FR-SITE-002**: Sites must have name, code, and address
- **FR-SITE-003**: System must track issue metrics per site
- **FR-SITE-004**: Users must filter issues by site

#### 2.5.3 Department/Team Management
- **FR-DEPT-001**: Admins must create, edit, and delete departments
- **FR-DEPT-002**: Departments must be assigned to sites
- **FR-DEPT-003**: System must track active tickets per department
- **FR-DEPT-004**: System must support compliance departments

#### 2.5.4 Category Management
- **FR-CAT-001**: Admins must create, edit, and delete categories
- **FR-CAT-002**: Categories must support subcategories
- **FR-CAT-003**: Categories must have color coding
- **FR-CAT-004**: System must track ticket count per category

### 2.6 Dashboard and Analytics

#### 2.6.1 Dashboard Metrics
- **FR-DASH-001**: System must display key metrics: open tickets, avg resolution time, resolved today, SLA at risk
- **FR-DASH-002**: System must show issues raised vs resolved chart
- **FR-DASH-003**: System must show issues by status pie chart
- **FR-DASH-004**: System must show issues by category pie chart
- **FR-DASH-005**: System must show SLA performance visualization
- **FR-DASH-006**: System must display recent tickets list
- **FR-DASH-007**: Users must filter dashboard by site

#### 2.6.2 Reports
- **FR-REPORT-001**: System must generate issue reports by date range
- **FR-REPORT-002**: System must export reports to CSV/Excel
- **FR-REPORT-003**: System must generate SLA compliance reports
- **FR-REPORT-004**: System must generate user performance reports

### 2.7 Notifications

#### 2.7.1 Push Notifications
- **FR-NOTIF-001**: System must send push notifications for new assignments
- **FR-NOTIF-002**: System must send push notifications for status changes
- **FR-NOTIF-003**: System must send push notifications for SLA escalations
- **FR-NOTIF-004**: Users must configure notification preferences

#### 2.7.2 Multi-Channel Notifications
- **FR-NOTIF-MC-001**: System must support email notifications
- **FR-NOTIF-MC-002**: System must support SMS notifications (future)
- **FR-NOTIF-MC-003**: System must support WhatsApp notifications (future)

### 2.8 Image Management

#### 2.8.1 Image Upload
- **FR-IMG-001**: System must support JPEG, PNG image formats
- **FR-IMG-002**: System must compress images before upload
- **FR-IMG-003**: System must store images in AWS S3
- **FR-IMG-004**: System must generate presigned URLs for secure access
- **FR-IMG-005**: System must support up to 10 images per issue

#### 2.8.2 Image Processing
- **FR-IMG-PROC-001**: System must validate image clarity before AI analysis
- **FR-IMG-PROC-002**: System must detect duplicate image submissions
- **FR-IMG-PROC-003**: System must resize images for optimal storage

### 2.9 Mobile App Features

#### 2.9.1 Offline Support
- **FR-MOBILE-001**: Mobile app must support offline issue creation
- **FR-MOBILE-002**: Mobile app must queue offline issues for sync
- **FR-MOBILE-003**: Mobile app must sync automatically when online
- **FR-MOBILE-004**: Mobile app must show sync status indicator

#### 2.9.2 Mobile-Specific Features
- **FR-MOBILE-005**: Mobile app must capture GPS automatically
- **FR-MOBILE-006**: Mobile app must support camera integration
- **FR-MOBILE-007**: Mobile app must compress images before upload
- **FR-MOBILE-008**: Mobile app must show upload progress
- **FR-MOBILE-009**: Mobile app must support platform identification (iOS/Android)

### 2.10 Multi-Channel Ticket Creation

#### 2.10.1 QR Code Access
- **FR-QR-001**: System must generate unique QR codes per site/location
- **FR-QR-002**: Tenants must scan QR code to create tickets
- **FR-QR-003**: QR code must pre-fill site and location information

#### 2.10.2 WhatsApp Integration
- **FR-WA-001**: Tenants must create tickets via WhatsApp
- **FR-WA-002**: System must parse WhatsApp messages for issue details
- **FR-WA-003**: System must send ticket updates via WhatsApp

#### 2.10.3 Email Integration
- **FR-EMAIL-001**: Tenants must create tickets via email
- **FR-EMAIL-002**: System must parse email subject and body for issue details
- **FR-EMAIL-003**: System must send ticket updates via email

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-PERF-001**: API response time must be < 500ms for 95% of requests
- **NFR-PERF-002**: Dashboard must load within 2 seconds
- **NFR-PERF-003**: Image upload must support files up to 10MB
- **NFR-PERF-004**: System must handle 1000 concurrent users
- **NFR-PERF-005**: AI analysis must complete within 30 seconds

### 3.2 Security
- **NFR-SEC-001**: All API endpoints must use HTTPS
- **NFR-SEC-002**: Passwords must be hashed using bcrypt
- **NFR-SEC-003**: JWT tokens must expire after 24 hours
- **NFR-SEC-004**: System must implement rate limiting on API endpoints
- **NFR-SEC-005**: System must sanitize all user inputs
- **NFR-SEC-006**: System must implement CORS protection
- **NFR-SEC-007**: System must use Helmet.js for security headers

### 3.3 Scalability
- **NFR-SCALE-001**: System must scale horizontally to handle increased load
- **NFR-SCALE-002**: Database must support sharding for multi-tenancy
- **NFR-SCALE-003**: Image storage must use CDN for global distribution
- **NFR-SCALE-004**: System must support 100+ client organizations

### 3.4 Reliability
- **NFR-REL-001**: System uptime must be 99.9%
- **NFR-REL-002**: System must implement automatic failover
- **NFR-REL-003**: System must backup data daily
- **NFR-REL-004**: System must recover from failures within 5 minutes

### 3.5 Usability
- **NFR-USE-001**: UI must be responsive on mobile, tablet, and desktop
- **NFR-USE-002**: UI must follow WCAG 2.1 Level AA guidelines
- **NFR-USE-003**: Error messages must be user-friendly and actionable
- **NFR-USE-004**: System must support dark theme
- **NFR-USE-005**: UI must load within 3 seconds on 3G connection

### 3.6 Maintainability
- **NFR-MAINT-001**: Code must follow ESLint standards
- **NFR-MAINT-002**: Code must have 80% test coverage
- **NFR-MAINT-003**: API must be documented with OpenAPI/Swagger
- **NFR-MAINT-004**: System must log all errors and warnings

### 3.7 Compatibility
- **NFR-COMPAT-001**: Frontend must support Chrome, Firefox, Safari, Edge (latest 2 versions)
- **NFR-COMPAT-002**: Mobile app must support iOS 13+ and Android 8+
- **NFR-COMPAT-003**: System must support MongoDB 5.0+
- **NFR-COMPAT-004**: System must support Node.js 18+

---

## 4. Technical Requirements

### 4.1 Technology Stack

#### 4.1.1 Frontend
- **TR-FE-001**: React 18 for UI library
- **TR-FE-002**: TypeScript for type safety
- **TR-FE-003**: Vite for build tool
- **TR-FE-004**: React Router v6 for routing
- **TR-FE-005**: Tailwind CSS for styling
- **TR-FE-006**: Zustand for state management
- **TR-FE-007**: Axios for HTTP client
- **TR-FE-008**: Recharts for data visualization

#### 4.1.2 Backend
- **TR-BE-001**: Node.js 18+ for runtime
- **TR-BE-002**: Express.js for web framework
- **TR-BE-003**: JavaScript (CommonJS) for backend code
- **TR-BE-004**: Mongoose for MongoDB ODM
- **TR-BE-005**: JWT for authentication
- **TR-BE-006**: Multer for file uploads
- **TR-BE-007**: Express Validator for input validation

#### 4.1.3 Database
- **TR-DB-001**: MongoDB Atlas for primary database
- **TR-DB-002**: Mongoose schemas for data modeling
- **TR-DB-003**: Database indexes for performance optimization

#### 4.1.4 Cloud Services
- **TR-CLOUD-001**: AWS S3 for image storage
- **TR-CLOUD-002**: AWS CloudFront for CDN (future)
- **TR-CLOUD-003**: OpenAI API for AI analysis

#### 4.1.5 Mobile
- **TR-MOBILE-001**: React Native or Flutter for cross-platform mobile app
- **TR-MOBILE-002**: AsyncStorage or SQLite for offline storage
- **TR-MOBILE-003**: React Query or SWR for API calls

### 4.2 API Requirements
- **TR-API-001**: RESTful API design
- **TR-API-002**: JSON request/response format
- **TR-API-003**: Multipart/form-data for file uploads
- **TR-API-004**: Bearer token authentication
- **TR-API-005**: Pagination for list endpoints
- **TR-API-006**: Error responses with consistent format

### 4.3 Environment Variables
- **TR-ENV-001**: PORT for server port
- **TR-ENV-002**: MONGODB_URI for database connection
- **TR-ENV-003**: JWT_SECRET for token signing
- **TR-ENV-004**: AWS credentials for S3 access
- **TR-ENV-005**: OPENAI_API_KEY for AI features
- **TR-ENV-006**: FRONTEND_URL for CORS configuration

### 4.4 Running the Application
- **TR-RUN-001**: Backend entry point is `app.js` at the **project root** (not inside `backend/`). Run from root: `node app.js` or `npm run dev:backend`.
- **TR-RUN-002**: Frontend is in `frontend/` (React + Vite). Run from root: `npm run dev -w frontend` (port 3000); it proxies `/api` to the backend (port 5000).
- **TR-RUN-003**: Full dev stack: `npm run dev` runs both frontend and backend concurrently. Backend can also be run via IDE debugger with frontend in a separate terminal.
- **TR-RUN-004**: Production: `npm run build` then `npm start`; backend serves API and static frontend from `frontend/dist/` on one port.
- **TR-RUN-005**: Docker is optional (production deployment with Nginx/SSL). See `README.md` and `PRODUCTION_DEPLOYMENT.md` for setup and run instructions.

---

## 5. Data Requirements

### 5.1 Data Models

#### 5.1.1 User Model
- id, name, email, password (hashed), roles (array), clientId, sites, departments, createdAt, updatedAt

#### 5.1.2 Issue Model
- id, title, description, status, priority, images, resolutionImages, resolutionDescription, createdGps, resolvedGps, siteId, categoryId, departmentId, locationId, assignedTo, createdBy, aiReportAnalysis, aiResolutionAnalysis, platform, dueDate, createdAt, updatedAt, resolvedAt

#### 5.1.3 Client Model
- id, name, code, userType, status, contactEmail, contactPhone, address, createdAt, updatedAt

#### 5.1.4 Site Model
- id, name, code, clientId, address, createdAt, updatedAt

#### 5.1.5 Department Model
- id, name, clientId, siteId, isCompliance, createdAt, updatedAt

#### 5.1.6 Category Model
- id, name, description, color, subcategories, clientId, createdAt, updatedAt

#### 5.1.7 Location Model
- id, name, siteId, createdAt, updatedAt

### 5.2 Data Validation
- **DR-VAL-001**: All required fields must be validated
- **DR-VAL-002**: Email format must be validated
- **DR-VAL-003**: GPS coordinates must be within valid ranges
- **DR-VAL-004**: Enum fields must match allowed values
- **DR-VAL-005**: ObjectId references must exist

### 5.3 Data Privacy
- **DR-PRIV-001**: Tenants must only see their own tickets
- **DR-PRIV-002**: Vendors must only see assigned tickets
- **DR-PRIV-003**: Client data must be isolated from other clients
- **DR-PRIV-004**: PII must be encrypted at rest

---

## 6. Integration Requirements

### 6.1 Third-Party Integrations
- **IR-001**: OpenAI API for image analysis and text generation
- **IR-002**: AWS S3 for image storage
- **IR-003**: Google Maps API for location display (future)
- **IR-004**: WhatsApp Business API for messaging (future)
- **IR-005**: SendGrid or similar for email notifications (future)
- **IR-006**: Twilio for SMS notifications (future)

### 6.2 API Integrations
- **IR-API-001**: System must provide REST API for third-party integrations
- **IR-API-002**: System must support webhook notifications (future)
- **IR-API-003**: System must provide API documentation

---

## 7. Deployment Requirements

### 7.1 Production Environment
- **DR-PROD-001**: Backend must serve both API and frontend static files
- **DR-PROD-002**: Frontend must be built and optimized for production
- **DR-PROD-003**: Environment variables must be configured securely
- **DR-PROD-004**: HTTPS must be enforced
- **DR-PROD-005**: Database must use connection pooling

### 7.2 Deployment Platforms
- **DR-PLAT-001**: Support deployment on Railway, Render, AWS, DigitalOcean
- **DR-PLAT-002**: Support MongoDB Atlas for database
- **DR-PLAT-003**: Support AWS S3 for image storage

### 7.3 Monitoring and Logging
- **DR-MON-001**: System must log all errors
- **DR-MON-002**: System must track API performance metrics
- **DR-MON-003**: System must monitor database performance
- **DR-MON-004**: System must alert on critical errors

---

## 8. Future Enhancements

### 8.1 Planned Features
- Custom LLM model integration
- Queue system for AI processing
- Python microservice for AI processing
- Real-time notifications via WebSocket
- Issue comments and collaboration
- Advanced analytics dashboard
- Email notifications
- SMS notifications
- WhatsApp integration
- Mobile app (iOS and Android)
- Duplicate issue detection
- SLA escalation rules
- Checklists and SOPs
- Audit trail
- ITSM/CMMS integrations

### 8.2 Scalability Enhancements
- Microservices architecture
- Message queue (RabbitMQ/Kafka)
- Redis caching
- CDN for global distribution
- Multi-region deployment

---

## 9. Constraints and Assumptions

### 9.1 Constraints
- **CON-001**: OpenAI API rate limits may affect AI analysis speed
- **CON-002**: GPS accuracy depends on device capabilities
- **CON-003**: Offline mode limited to mobile app
- **CON-004**: Image storage costs scale with usage

### 9.2 Assumptions
- **ASM-001**: Users have smartphones with GPS and camera
- **ASM-002**: Users have internet connectivity for most operations
- **ASM-003**: Client organizations have active subscriptions
- **ASM-004**: AWS S3 and OpenAI services remain available

---

## 10. Success Criteria

### 10.1 User Adoption
- 80% of field staff use mobile app daily
- 90% of issues created with GPS and images
- 70% of tenants use multi-channel ticket creation

### 10.2 Performance Metrics
- Average issue resolution time reduced by 40%
- 95% SLA compliance rate
- 99.9% system uptime
- < 500ms API response time

### 10.3 Business Metrics
- 50+ client organizations onboarded
- 10,000+ issues processed monthly
- 95% user satisfaction score
- 30% reduction in operational costs

---

## Document Control

**Version**: 1.0  
**Last Updated**: February 2026  
**Author**: SnapFix Team  
**Status**: Draft  

**Application setup and run**: See `README.md` for install, `.env` setup, and development/production run instructions. See `QUICK_START.md` for troubleshooting backend and login.
