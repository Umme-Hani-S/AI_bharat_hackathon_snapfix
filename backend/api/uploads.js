const express = require('express')
const crypto = require('crypto')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { protect } = require('../src/middleware/auth');
const { AWS_S3_BUCKET_NAME , AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY} = require('../../serverVariables')

const router = express.Router()

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId:AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
})

const getBucketName = () =>
    AWS_S3_BUCKET_NAME||
    process.env.AWS_S3_BUCKET_NAME || 'snapfix-bucket'

router.get('/presign', protect, async (req, res) => {
  try {
    const bucket = getBucketName()

    if (!bucket) {
      return res
        .status(500)
        .json({ error: 'Missing AWS bucket configuration' })
    }

    const fileType = req.query.fileType || 'image/jpeg'
    const directory = req.query.directory || 'uploads'
    const fileName = crypto.randomBytes(16).toString('hex')
    const key = `${directory}/${fileName}`

    const params = {
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    }

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand(params),
      { expiresIn: 60 }
    )

    const fileUrl = `https://${bucket}.s3.${AWS_REGION}.amazonaws.com/${key}`

    res.json({ uploadUrl, fileUrl, key })
  } catch (error) {
    console.error('Failed to generate upload URL', error)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
})

module.exports = router


