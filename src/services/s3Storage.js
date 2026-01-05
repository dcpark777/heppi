import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Check if AWS is configured
const isAWSConfigured = () => {
  const accessKey = import.meta.env.VITE_AWS_ACCESS_KEY_ID
  const secretKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
  const configured = !!(accessKey && secretKey)
  
  if (!configured) {
    console.warn('AWS not configured - missing credentials. Check .env file and restart dev server.')
  }
  
  return configured
}

// Initialize S3 client (only if credentials are provided)
let s3Client = null

if (isAWSConfigured()) {
  try {
    s3Client = new S3Client({
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
      },
    })
  } catch (error) {
    console.error('Failed to initialize S3 client:', error)
  }
}

// Get environment (dev or prod) from env var, default to dev for local development
const ENV = import.meta.env.VITE_ENVIRONMENT || 'dev'
const BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME || `sydplove-bingo-card-${ENV}`

/**
 * Convert base64 data URL to Uint8Array for S3 upload
 * AWS SDK v3 requires Uint8Array in browser environment
 */
function base64ToUint8Array(base64String) {
  const base64Data = base64String.split(',')[1] || base64String
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  return new Uint8Array(byteNumbers)
}

/**
 * Generate S3 key for a tile image
 * Format: bingo/{cardId}/{row}-{col}-{timestamp}.{ext}
 * Uses timestamp for uniqueness to avoid collisions
 */
function getImageKey(cardId, row, col, extension = 'jpg') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9) // Add random string for extra uniqueness
  return `bingo/${cardId}/${row}-${col}-${timestamp}-${random}.${extension}`
}

/**
 * Upload image to S3
 * @param {string} cardId - The bingo card ID
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} base64Image - Base64 encoded image data URL
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export async function uploadTileImage(cardId, row, col, base64Image) {
  if (!base64Image) {
    return { success: false, error: 'No image data provided' }
  }

  if (!isAWSConfigured() || !s3Client) {
    console.warn('AWS not configured - cannot upload to S3')
    // Fallback: return the base64 data as-is (for localStorage fallback)
    return { success: true, imageUrl: base64Image, fallback: true }
  }

  try {
    // Extract content type and extension from base64 string
    const match = base64Image.match(/^data:image\/(\w+);base64,/)
    const contentType = match ? `image/${match[1]}` : 'image/jpeg'
    // Normalize extension (jpeg -> jpg for consistency)
    let extension = match ? match[1] : 'jpg'
    if (extension === 'jpeg') {
      extension = 'jpg'
    }
    
    // Convert base64 to Uint8Array (required by AWS SDK v3 in browser)
    const uint8Array = base64ToUint8Array(base64Image)
    
    // Generate S3 key with unique identifier (timestamp + random)
    const key = getImageKey(cardId, row, col, extension)
    
    // Upload to S3
    // Skip ACL since bucket has ObjectOwnership: BucketOwnerEnforced
    // The bucket policy handles public access
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: uint8Array,
      ContentType: contentType,
    })
    
    await s3Client.send(command)
    
    // Construct public URL
    const imageUrl = `https://${BUCKET_NAME}.s3.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
    
    return { success: true, imageUrl }
  } catch (error) {
    console.error('Error uploading image to S3:', error)
    
    // Don't fallback to base64 - fail the upload so we don't exceed DynamoDB limits
    return { success: false, error: error.message || error.name || 'Unknown error' }
  }
}

/**
 * Delete image from S3 by URL
 * @param {string} cardId - The bingo card ID
 * @param {string} imageUrl - Full S3 URL of the image to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteTileImageByUrl(cardId, imageUrl) {
  if (!isAWSConfigured() || !s3Client) {
    return { success: true, fallback: true }
  }

  if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
    return { success: true }
  }

  try {
    // Extract key from S3 URL
    // Format: https://bucket.s3.region.amazonaws.com/bingo/cardId/row-col-timestamp.ext
    const urlObj = new URL(imageUrl)
    const key = urlObj.pathname.substring(1) // Remove leading slash
    if (!key || !key.startsWith('bingo/')) {
      console.warn('Could not extract S3 key from URL:', imageUrl)
      return { success: false, error: 'Invalid S3 URL format' }
    }
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
    
    await s3Client.send(command)
    return { success: true }
  } catch (error) {
    // Ignore if file doesn't exist
    if (error.name === 'NoSuchKey') {
      return { success: true }
    }
    console.error('Error deleting image from S3:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete image from S3 (legacy - for single image support)
 * @param {string} cardId - The bingo card ID
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteTileImage(cardId, row, col) {
  if (!isAWSConfigured() || !s3Client) {
    return { success: true, fallback: true }
  }

  try {
    // Try common image extensions
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    for (const ext of extensions) {
      const key = getImageKey(cardId, row, col, ext)
      try {
        const command = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
        await s3Client.send(command)
      } catch (err) {
        // Ignore if file doesn't exist
        if (err.name !== 'NoSuchKey') {
          console.warn(`Error deleting ${key}:`, err)
        }
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting image from S3:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get image URL (handles both S3 URLs and base64 data URLs)
 * @param {string} imageUrlOrData - Either S3 URL or base64 data URL
 * @returns {string} The image URL
 */
export function getImageUrl(imageUrlOrData) {
  if (!imageUrlOrData) return null
  
  // If it's already a base64 data URL or full URL, return as-is
  if (imageUrlOrData.startsWith('data:') || imageUrlOrData.startsWith('http://') || imageUrlOrData.startsWith('https://')) {
    return imageUrlOrData
  }
  
  // Otherwise, assume it's an S3 key and construct URL
  return `https://${BUCKET_NAME}.s3.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com/${imageUrlOrData}`
}

