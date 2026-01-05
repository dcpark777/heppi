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
 * Format: bingo/{cardId}/{row}-{col}.{ext}
 */
function getImageKey(cardId, row, col, extension = 'jpg') {
  return `bingo/${cardId}/${row}-${col}.${extension}`
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
    const extension = match ? match[1] : 'jpg'
    
    // Convert base64 to Uint8Array (required by AWS SDK v3 in browser)
    const uint8Array = base64ToUint8Array(base64Image)
    console.log('Converted image to Uint8Array, size:', uint8Array.length, 'bytes')
    
    // Generate S3 key
    const key = getImageKey(cardId, row, col, extension)
    console.log('Uploading to S3:', { bucket: BUCKET_NAME, key, contentType })
    
    // Upload to S3
    // Try with ACL first, fallback without ACL if bucket policy handles public access
    let command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: uint8Array,
      ContentType: contentType,
      ACL: 'public-read',
    })
    
    try {
      await s3Client.send(command)
    } catch (aclError) {
      // If ACL fails (bucket might have ACLs disabled), try without ACL
      // The bucket policy should handle public access
      if (aclError.name === 'AccessControlListNotSupported' || aclError.message?.includes('ACL')) {
        console.warn('ACL not supported, using bucket policy for public access')
        command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: uint8Array,
          ContentType: contentType,
        })
        await s3Client.send(command)
      } else {
        throw aclError
      }
    }
    
    // Construct public URL
    const imageUrl = `https://${BUCKET_NAME}.s3.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
    
    return { success: true, imageUrl }
  } catch (error) {
    console.error('Error uploading image to S3:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      bucket: BUCKET_NAME,
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
    })
    
    // Don't fallback to base64 - fail the upload so we don't exceed DynamoDB limits
    return { success: false, error: error.message || error.name || 'Unknown error' }
  }
}

/**
 * Delete image from S3
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

