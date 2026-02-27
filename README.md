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
snapfix_aws/                  # Project root (repo root)
├── app.js                    # Main backend entry point (run from here)
├── serverVariables.js        # Server config / env helpers
├── package.json              # Root package.json with workspaces + scripts
├── .env                      # Environment variables (create from .env.example)
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/              # API client functions
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── store/            # Zustand stores
│   │   └── ...
│   └── ...
├── backend/                  # Backend API (routes, models, config)
│   ├── api/                  # API route files
│   │   ├── auth.js           # Authentication routes
│   │   ├── issues.js         # Issue/Ticket routes
│   │   ├── mobile/           # Mobile API
│   │   └── ...
│   └── src/
│       ├── config/           # database.js, s3.js, openai.js
│       ├── models/            # Mongoose models (User, Issue, Site, Client, etc.)
│       └── middleware/       # auth.js (JWT)
└── ...
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account
- AWS account (for S3)
- OpenAI API key

### Installation

1. **Install dependencies (from project root):**
   ```bash
   npm install
   ```
   This installs root, frontend, and backend dependencies (npm workspaces).

2. **Create `.env` at the project root:**
   ```bash
   copy .env.example .env   # Windows
   # or: cp .env.example .env   # macOS/Linux
   ```
   Edit `.env` and set at least:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret_key_min_32_chars
   FRONTEND_URL=http://localhost:3000
   ```
   Add AWS S3, OpenAI, and Google Maps keys when you need those features (see `.env.example`).

3. **Run development**

   **Option A – Both frontend and backend (from root):**
   ```bash
   npm run dev
   ```
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000` (proxies `/api` to backend)

   **Option B – Backend via debugger + frontend in terminal**  
   If you run the backend with your IDE debugger (e.g. launch “Node.js” on `app.js` from root):
   - Start **frontend only** in a terminal:
     ```bash
     npm run dev -w frontend
     ```
   - Open `http://localhost:3000` in the browser. API calls go to port 5000.

   **Option C – Backend and frontend in separate terminals:**
   ```bash
   # Terminal 1 – backend (from root)
   npm run dev:backend
   # or: node app.js

   # Terminal 2 – frontend (from root)
   npm run dev -w frontend
   ```
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

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

All commands are run from the **project root** unless noted.

### Root
| Script | Description |
|--------|-------------|
| `npm install` | Install all dependencies (root + frontend + backend workspaces) |
| `npm run dev` | Run frontend (3000) and backend (5000) concurrently |
| `npm run dev:backend` | Run backend only (`node app.js`, port 5000) |
| `npm run dev -w frontend` | Run frontend dev server only (port 3000) |
| `npm run build` | Build frontend for production → `frontend/dist/` |
| `npm start` | Production: serve API + frontend from port 5000 |
| `npm run seed:admin` | Seed admin user (backend workspace) |

### Frontend (from root with `-w frontend`, or from `frontend/`)
- `npm run dev -w frontend` — Vite dev server (port 3000)
- `npm run build -w frontend` — Production build
- From `frontend/`: `npm run dev`, `npm run build`, `npm run preview`

**Note:** In production, the backend serves the built frontend from `frontend/dist/`; no Vite dev server is needed.

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

- **Backend entry point**: `app.js` at the project root (run with `node app.js` or your IDE debugger from root).
- **API routes**: `backend/api/` (auth, issues, clients, sites, mobile, etc.).
- **Models & config**: `backend/src/` (config, models, middleware).
- **Frontend**: React + Vite in `frontend/`; dev server proxies `/api` to `http://localhost:5000`.
- **Environment**: `.env` at the project root. See `.env.example` for variables.
- **Docker**: Optional; used for production deployment with Nginx and SSL. See `PRODUCTION_DEPLOYMENT.md` and `docker-compose.yml`.

## 📄 License

MIT
