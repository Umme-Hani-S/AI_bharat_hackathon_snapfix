const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')
require('dotenv').config()
const serverVariables = require('./serverVariables')
const connectDB = require('./backend/src/config/database')
const authRoutes = require('./backend/api/auth')
const issueRoutes = require('./backend/api/issues')
const clientRoutes = require('./backend/api/clients')
const uploadRoutes = require('./backend/api/uploads')
const userRoutes = require('./backend/api/users')
const siteRoutes = require('./backend/api/sites')
const locationRoutes = require('./backend/api/locations')
const departmentRoutes = require('./backend/api/departments')
const categoryRoutes = require('./backend/api/categories')
const mobileRoutes = require('./backend/api/mobile')
const logRoutes = require('./backend/api/logs')

const app = express()
// Port configuration:
// Development: Backend on 5000, Frontend dev server on 3000 (proxies to backend)
// Production: Backend on 5000 serves both API and frontend static files
const PORT = process.env.PORT || 5000

// Connect to MongoDB (non-blocking, but will exit if connection fails)
connectDB().catch((error) => {
  console.error('❌ Failed to connect to MongoDB. Server will not start.')
  console.error('Please check your MONGODB_URI in .env file')
  process.exit(1)
})

// Trust proxy (required for rate limiting behind Nginx/reverse proxy)
// Only trust localhost proxy (Nginx on same server) - more secure than trusting all proxies
app.set('trust proxy', 1) // Trust only 1 proxy hop (Nginx)

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Vite dev server
}))
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Check both NODE_ENV and ENVIRONMENT for production mode
    // Also check if NODE_ENV contains 'production' (handles malformed .env files)
    const nodeEnv = process.env.NODE_ENV || ''
    const isProduction = nodeEnv.includes('production') || serverVariables.ENVIRONMENT === 'production'
    
    // Base production origins - always include these
    const productionOrigins = [
      'http://16.176.20.144',
      'http://16.112.123.28',
      'https://16.176.20.144',
      'http://app.snapfix.site',
      'https://app.snapfix.site',
    ]
    
    // Development origins
    const developmentOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default port
      'https://sky-considerations-paso-reconstruction.trycloudflare.com', // Cloudflare tunnel for local QR scanning
    ]
    
    // Get FRONTEND_URL from both sources
    const frontendUrl = process.env.FRONTEND_URL || serverVariables.FRONTEND_URL
    
    // Combine origins based on environment
    const allowedOrigins = isProduction
      ? [...productionOrigins, frontendUrl].filter(Boolean)
      : [...developmentOrigins, frontendUrl].filter(Boolean)
    
    // Debug logging (always log in production to help diagnose issues)
    console.log(`🌐 CORS check - Origin: ${origin}`)
    console.log(`   Production mode: ${isProduction}`)
    console.log(`   NODE_ENV: ${nodeEnv}`)
    console.log(`   ENVIRONMENT: ${serverVariables.ENVIRONMENT}`)
    console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`)
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Debug: Log all API requests (before routes)
app.use('/api', (req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`)
  next()
})

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  // Skip validation warnings since we're properly configuring trust proxy
  validate: {
    trustProxy: false, // Skip trust proxy validation (we handle it explicitly above)
  },
})
app.use('/api/', limiter)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/issues', issueRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/users', userRoutes)
app.use('/api/sites', siteRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/mobile', mobileRoutes)
app.use('/api/logs', logRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SnapFix API is running' })
})

// Config endpoint (public, returns non-sensitive config like API keys for frontend)
app.get('/api/config', (req, res) => {
  // For QR code scanning and public issue reporting:
  // - In development: use LOCAL_QR_URL if set, otherwise fall back to app.snapfix.site
  // - In production: always use app.snapfix.site
  const isDevelopment = 
    process.env.NODE_ENV === 'development' || 
    process.env.ENVIRONMENT === 'development' ||
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === 'dev'
  
  const productionPublicUrl = 'https://app.snapfix.site'
  const qrPublicUrl = isDevelopment 
    ? (serverVariables.LOCAL_QR_URL || productionPublicUrl)
    : productionPublicUrl
  
  res.json({
    googleMapsApiKey: serverVariables.GOOGLE_MAPS_API_KEY || null,
    publicUrl: qrPublicUrl,
  })
})

// Handle 404 for API routes
// This middleware catches any unmatched /api/* routes
// Note: Must be after all other /api routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ 
      error: 'Not Found', 
      message: `API endpoint ${req.method} ${req.path} not found` 
    })
  } else {
    next() // Let other routes handle non-API paths
  }
})

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, 'frontend', 'dist')
  
  // Serve static files (CSS, JS, images, etc.) from the dist folder
  app.use(express.static(frontendBuildPath))
  
  // Serve React app for all non-API routes (SPA routing)
  // This must come AFTER API routes and static files
  // Use app.use with a catch-all that excludes /api routes
  app.use((req, res, next) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'))
    } else {
      next()
    }
  })
} else {
  // In development mode, backend runs on 5000, frontend dev server on 3000
  app.get('/', (req, res) => {
    res.json({ 
      message: 'SnapFix API Server',
      status: 'running',
      port: PORT,
      frontend: 'Run frontend dev server on port 3000 (proxies to this server)'
    })
  })
}

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 Frontend dev server should run on port 3000`)
    console.log(`🌐 Access frontend at: http://localhost:3000`)
    console.log(`🔌 API endpoints at: http://localhost:${PORT}/api`)
  } else {
    console.log(`🌐 Frontend served from: http://localhost:${PORT}`)
  }
})

module.exports = app

