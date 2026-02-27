# SnapFix - AI-Powered Issue Reporting SaaS

A modern, full-stack SaaS application for AI-powered issue reporting and resolution.

## 🚀 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type safety
- **React Router v6** - Modern routing
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Beautiful icons
- **Recharts** - Data visualization

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **JavaScript** - Pure JavaScript (no TypeScript compilation needed)
- **MongoDB Atlas** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **AWS S3** - Image storage
- **OpenAI API** - AI chat completion

## 📁 Project Structure

```
snapfix-v1/
├── app.js                    # Main backend entry point (at root)
├── package.json              # Root package.json with scripts
├── .env                      # Environment variables (at root)
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── store/           # Zustand stores
│   │   └── ...
│   └── ...
├── backend/                  # Backend API
│   ├── api/                  # API route files
│   │   ├── auth.js          # Authentication routes
│   │   └── issues.js        # Issue/Ticket routes
│   └── src/                  # Core application code
│       ├── config/           # Configuration files
│       │   ├── database.js  # MongoDB connection
│       │   ├── s3.js        # AWS S3 configuration
│       │   └── openai.js    # OpenAI configuration
│       ├── models/           # Mongoose models
│       │   ├── User.js
│       │   ├── Issue.js
│       │   ├── Site.js
│       │   ├── Team.js
│       │   └── Category.js
│       └── middleware/       # Express middleware
│           └── auth.js       # JWT authentication
└── ...
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account
- AWS account (for S3)
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Create `.env` file at the root:**
   ```bash
   # At snapfix-v1 root level
   cp .env.example .env  # If you have an example file
   ```
   
   Or create `.env` manually at the root with:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development

   # MongoDB Atlas
   MONGODB_URI=your_mongodb_atlas_connection_string

   # JWT
   JWT_SECRET=your_jwt_secret_key_here

   # AWS S3
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your_s3_bucket_name

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

3. **Run Development Servers:**
   ```bash
   # From root directory - runs both frontend and backend
   npm run dev
   ```
   
   Or run separately:
   ```bash
   # Backend only (from root)
   npm run dev:backend
   # or
   node app.js

   # Frontend only
   npm run dev:frontend
   ```
   
   This starts:
   - Frontend on `http://localhost:3000`
   - Backend on `http://localhost:5000`

## 🎨 Features

- ✅ User authentication (Register/Login with JWT)
- ✅ Issue reporting with image uploads
- ✅ Dashboard with issue statistics and charts
- ✅ Issue detail view with status management
- ✅ AI-powered suggestions using OpenAI
- ✅ Beautiful, modern dark theme UI with Tailwind CSS
- ✅ Responsive design
- ✅ Image storage on AWS S3
- ✅ Sites, Teams, Users, Categories management
- ✅ Real-time charts and analytics

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Issues
- `GET /api/issues` - Get all issues (authenticated)
- `GET /api/issues/:id` - Get single issue
- `POST /api/issues` - Create new issue (with images)
- `PATCH /api/issues/:id/status` - Update issue status
- `POST /api/issues/:id/ai-suggestions` - Get AI suggestions

### Health Check
- `GET /api/health` - Server health status

## 🔒 Environment Variables

### Root `.env` file (required)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret for JWT tokens
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `OPENAI_API_KEY` - OpenAI API key
- `FRONTEND_URL` - Frontend URL for CORS

## 🚀 Production Deployment

### Quick Start

1. **Build the frontend:**
   ```bash
   npm run build
   ```
   This creates optimized static files in `frontend/dist/`

2. **Set production environment:**
   ```bash
   NODE_ENV=production
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the app:**
   - Frontend & API: `http://localhost:5000`
   - API only: `http://localhost:5000/api`

### Important Notes

✅ **In Production:**
- Backend serves both API and frontend static files
- **No Vite dev server needed** - `npm run build` is enough
- Single port (5000) for everything
- Pre-built, optimized static files from `frontend/dist/`

❌ **Not Needed in Production:**
- Vite dev server
- Separate frontend server
- `npm run dev` command

See `PRODUCTION_DEPLOYMENT.md` for detailed deployment guide.

### Deployment Platforms

**Recommended (Full-Stack):**
- **Railway** - Easy deployment, runs `npm run build && npm start`
- **Render** - Good free tier, automatic builds
- **AWS Elastic Beanstalk** - If already using AWS
- **DigitalOcean App Platform** - Simple and reliable

**Database:**
- **MongoDB Atlas** - Already configured, scales automatically

**Image Storage:**
- **AWS S3** - Already configured, use CloudFront for CDN

## 📋 Available Scripts

### Root Level
- `npm run dev` - Run both frontend (port 3000) and backend (port 5000) concurrently
- `npm run dev:frontend` - Run frontend dev server only (port 3000)
- `npm run dev:backend` - Run backend only (port 5000, always)
- `npm run build` - Build frontend for production (creates `frontend/dist/`)
- `npm start` - Run production server (serves API + frontend on port 5000)
- `npm run install:all` - Install all dependencies

### Frontend
- `cd frontend && npm run dev` - Start Vite dev server (development only)
- `cd frontend && npm run build` - Build for production (outputs to `dist/`)
- `cd frontend && npm run preview` - Preview production build locally

**Note:** In production, Vite is not needed. The backend serves the built files from `frontend/dist/`.

## 🔮 Future Enhancements

- Custom LLM model integration
- Queue system for AI processing
- Python microservice for AI processing
- Real-time notifications
- Issue comments and collaboration
- Advanced analytics dashboard
- Email notifications
- Mobile app

## 🏗️ Architecture Notes

- **Backend Entry Point**: `app.js` at the root level
- **API Routes**: Located in `backend/api/` folder
- **Models & Config**: Located in `backend/src/` folder
- **Frontend**: Standard React + Vite structure
- **Environment**: `.env` file should be at the root level

## 📄 License

MIT
