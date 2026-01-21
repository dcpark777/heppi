import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || `sydplove-bingo-card-${process.env.ENVIRONMENT || 'prod'}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { cardId, imageUriOrUrlOrKey } = req.body

    if (!imageUriOrUrlOrKey) {
      return res.status(200).json({ success: true })
    }

    let key = imageUriOrUrlOrKey
    
    // If it's an S3 URI (s3://bucket/key), extract the key
    if (imageUriOrUrlOrKey.startsWith('s3://')) {
      const match = imageUriOrUrlOrKey.match(/^s3:\/\/([^/]+)\/(.+)$/)
      if (match) {
        key = match[2] // Extract key part
      } else {
        return res.status(400).json({ success: false, error: 'Invalid S3 URI format' })
      }
    }
    // If it's a full HTTPS URL, extract the key
    else if (imageUriOrUrlOrKey.startsWith('http://') || imageUriOrUrlOrKey.startsWith('https://')) {
      const urlObj = new URL(imageUriOrUrlOrKey)
      key = urlObj.pathname.substring(1) // Remove leading slash
      if (!key || (!key.startsWith('tiles/') && !key.startsWith('bingo/'))) {
        return res.status(400).json({ success: false, error: 'Invalid S3 URL format' })
      }
      
      // Convert old bingo/ prefix to tiles/
      if (key.startsWith('bingo/')) {
        key = key.replace(/^bingo\//, 'tiles/')
      }
      
      // If key contains cardId (old format), remove it
      const oldFormatMatch = key.match(/^tiles\/[^/]+\/([0-9]+-[0-9]+)/)
      if (oldFormatMatch) {
        key = key.replace(/^tiles\/[^/]+\//, 'tiles/')
      }
    }
    // Otherwise, assume it's already an S3 key
    
    // Validate key format
    if (!key.startsWith('tiles/')) {
      return res.status(400).json({ success: false, error: 'Invalid S3 key format' })
    }
    
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      )
      return res.status(200).json({ success: true })
    } catch (error) {
      // Ignore if file doesn't exist
      if (error.name === 'NoSuchKey') {
        return res.status(200).json({ success: true })
      }
      throw error
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    })
  }
}

