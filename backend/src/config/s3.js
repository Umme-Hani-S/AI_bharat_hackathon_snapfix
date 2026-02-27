const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const serverVariables = require('../../../serverVariables.js')

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || serverVariables.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || serverVariables.AWS_SECRET_ACCESS_KEY
const region = process.env.AWS_REGION || serverVariables.AWS_REGION || 'us-east-1'
const bucket = process.env.AWS_S3_BUCKET_NAME || serverVariables.AWS_S3_BUCKET_NAME || ''

const s3 = new S3Client({
  region,
  credentials:
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined,
})

const storage = multerS3({
  s3,
  bucket,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `issues/${uniqueSuffix}-${file.originalname}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

module.exports = { upload, s3 }

