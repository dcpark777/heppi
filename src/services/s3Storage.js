// API base URL - empty string means same origin (Vercel will handle routing)
const API_BASE = import.meta.env.VITE_API_BASE || ''

// Get environment (dev or prod) from env var, default to dev for local development
const ENV = import.meta.env.VITE_ENVIRONMENT || 'dev'
const BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME || `sydplove-bingo-card-${ENV}`

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

  try {
    const response = await fetch(`${API_BASE}/api/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId,
        row,
        col,
        base64Image,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error uploading image:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete image from S3 by S3 URI, URL, or key
 * @param {string} cardId - The bingo card ID (unused, kept for compatibility)
 * @param {string} imageUriOrUrlOrKey - S3 URI (s3://bucket/key), HTTPS URL, or S3 key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteTileImageByUrl(cardId, imageUriOrUrlOrKey) {
  if (!imageUriOrUrlOrKey) {
    return { success: true }
  }

  try {
    const response = await fetch(`${API_BASE}/api/delete-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId,
        imageUriOrUrlOrKey,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error deleting image:', error)
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
  // This function is legacy - we can't easily delete by row/col without knowing the exact key
  // For now, just return success (the deleteTileImageByUrl function handles actual deletion)
  return { success: true }
}

/**
 * Get image URL (handles S3 URIs, S3 keys, HTTPS URLs, and base64 data URLs)
 * @param {string} imageUrlOrData - S3 URI (s3://bucket/key), S3 key, HTTPS URL, or base64 data URL
 * @returns {string} The image URL
 */
export function getImageUrl(imageUrlOrData) {
  if (!imageUrlOrData) return null
  
  // If it's already a base64 data URL or full HTTPS URL, return as-is
  if (imageUrlOrData.startsWith('data:') || imageUrlOrData.startsWith('http://') || imageUrlOrData.startsWith('https://')) {
    return imageUrlOrData
  }
  
  // If it's an S3 URI (s3://bucket/key), extract bucket and key
  if (imageUrlOrData.startsWith('s3://')) {
    const match = imageUrlOrData.match(/^s3:\/\/([^/]+)\/(.+)$/)
    if (match) {
      const [, bucket, key] = match
      return `https://${bucket}.s3.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
    }
    // Fallback if parsing fails
    return imageUrlOrData
  }
  
  // Otherwise, assume it's an S3 key (backward compatibility) and construct URL
  // Use the bucket from environment or default
  const bucket = BUCKET_NAME
  return `https://${bucket}.s3.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com/${imageUrlOrData}`
}
