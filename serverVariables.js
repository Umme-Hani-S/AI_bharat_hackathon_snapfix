// Load environment variables once and expose them via CommonJS exports
const dotenv = require('dotenv')
dotenv.config()

module.exports = {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL,
  ENVIRONMENT: process.env.NODE_ENV,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  LOCAL_QR_URL: process.env.LOCAL_QR_URL,
}
