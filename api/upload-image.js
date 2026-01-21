import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
    const { cardId, row, col, base64Image } = req.body

    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'No image data provided' })
    }

    // Convert base64 to buffer
    const base64Data = base64Image.split(',')[1] || base64Image
    const buffer = Buffer.from(base64Data, 'base64')

    // Extract content type
    const match = base64Image.match(/^data:image\/(\w+);base64,/)
    const contentType = match ? `image/${match[1]}` : 'image/jpeg'
    let extension = match ? match[1] : 'jpg'
    if (extension === 'jpeg') extension = 'jpg'

    // Generate S3 key
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const key = `tiles/${row}-${col}/images/${timestamp}-${random}.${extension}`

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    )

    const s3Path = `s3://${BUCKET_NAME}/${key}`
    return res.status(200).json({ success: true, imageUrl: s3Path })
  } catch (error) {
    console.error('Error uploading image:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    })
  }
}

