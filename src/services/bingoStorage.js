// API base URL - empty string means same origin (Vercel will handle routing)
const API_BASE = import.meta.env.VITE_API_BASE || ''

/**
 * Get current username from sessionStorage
 */
function getCurrentUsername() {
  return sessionStorage.getItem('sydplove_username') || 'unknown'
}

/**
 * Generate tile ID for a specific tile
 * Format: {row}-{col} (e.g., "0-0", "2-3")
 */
function getTileId(row, col) {
  return `${row}-${col}`
}

/**
 * Save a single bingo tile independently
 * @param {string|string[]} imageUrls - S3 URL(s) or array of S3 URLs (for localStorage fallback, base64 not supported)
 */
export async function saveBingoTile(cardId, row, col, content, completed, completedAt = null, username = null, imageUrls = null, previewImageIndex = 0) {
  const tileId = getTileId(row, col)
  const updatedBy = username || getCurrentUsername()

  try {
    const response = await fetch(`${API_BASE}/api/save-tile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tileId,
        row,
        col,
        content,
        completed,
        completedAt,
        username: updatedBy,
        imageUrls,
        previewImageIndex,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error saving tile:', error)
    
    // Fallback to localStorage on error
    try {
      const key = `bingo-tile-${tileId}`
      const imagesArray = imageUrls ? (Array.isArray(imageUrls) ? imageUrls : [imageUrls]) : []
      localStorage.setItem(key, JSON.stringify({
        row,
        col,
        content,
        completed,
        images: imagesArray,
        previewImageIndex: previewImageIndex,
        updatedAt: new Date().toISOString(),
        updatedBy,
      }))
      console.warn('Fell back to localStorage - tile saved locally but NOT synced to DynamoDB')
      return { success: true, fallback: true }
    } catch (localError) {
      console.error('Failed to save even to localStorage:', localError)
      return { success: false, error: error.message }
    }
  }
}

/**
 * Load bingo card state - loads all tiles for a card
 */
export async function loadBingoCard(cardId) {
  try {
    const response = await fetch(`${API_BASE}/api/load-card?cardId=${encodeURIComponent(cardId || '')}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    
    if (result.success) {
      return {
        success: true,
        tiles: result.tiles || [],
      }
    }
    return result
  } catch (error) {
    console.error('Error loading card:', error)
    
    // Fallback to localStorage on error
    try {
      const tiles = []
      for (let row = 0; row < 5; row++) {
        tiles[row] = []
        for (let col = 0; col < 5; col++) {
          const tileId = getTileId(row, col)
          const key = `bingo-tile-${tileId}`
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored)
            // Support both old single image format and new array format
            const imageData = data.images || data.imageData || null
            const imagesArray = imageData ? (Array.isArray(imageData) ? imageData : [imageData]).filter(Boolean) : []
            tiles[row][col] = {
              content: data.content || '',
              completed: data.completed || false,
              completedAt: data.completedAt || null,
              updatedBy: data.updatedBy || null,
              images: imagesArray,
              previewImageIndex: data.previewImageIndex !== undefined ? data.previewImageIndex : 0
            }
          } else {
            tiles[row][col] = { content: '', completed: false, completedAt: null, updatedBy: null, images: [], previewImageIndex: 0 }
          }
        }
      }
      console.warn('Fell back to localStorage due to API error')
      return {
        success: true,
        tiles,
        fallback: true
      }
    } catch (localError) {
      console.error('Failed to load from localStorage:', localError)
      return { success: false, error: error.message }
    }
  }
}

/**
 * Record a content change
 */
export async function recordContentChange(cardId, row, col, oldContent, newContent, username = null) {
  try {
    const response = await fetch(`${API_BASE}/api/record-content-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId,
        row,
        col,
        oldContent,
        newContent,
        username: username || getCurrentUsername(),
      }),
    })

    if (!response.ok) {
      // Silently fail for change tracking
      return { success: true }
    }

    const result = await response.json()
    return result
  } catch (error) {
    // Silently fail for change tracking
    console.error('Error recording content change:', error)
    return { success: true }
  }
}

/**
 * Record a status change
 */
export async function recordStatusChange(cardId, row, col, oldStatus, newStatus, username = null) {
  try {
    const response = await fetch(`${API_BASE}/api/record-status-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId,
        row,
        col,
        oldStatus,
        newStatus,
        username: username || getCurrentUsername(),
      }),
    })

    if (!response.ok) {
      // Silently fail for change tracking
      return { success: true }
    }

    const result = await response.json()
    return result
  } catch (error) {
    // Silently fail for change tracking
    console.error('Error recording status change:', error)
    return { success: true }
  }
}

/**
 * Get change history
 * Scans all changes and sorts by timestamp (most recent first)
 */
export async function getChangeHistory(cardId, limit = 100) {
  try {
    const response = await fetch(`${API_BASE}/api/get-change-history?limit=${limit}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error getting change history:', error)
    return { success: false, error: error.message, changes: [] }
  }
}
