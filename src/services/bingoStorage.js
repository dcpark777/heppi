import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

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

// Initialize AWS client (only if credentials are provided)
let client = null
let docClient = null

if (isAWSConfigured()) {
  try {
    client = new DynamoDBClient({
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
      },
      // Add request handler for better error reporting
      requestHandler: {
        requestTimeout: 10000, // 10 second timeout
      },
    })
    docClient = DynamoDBDocumentClient.from(client)
  } catch (error) {
    console.error('Failed to initialize AWS client:', error)
  }
}

// Get environment (dev or prod) from env var, default to dev for local development
const ENV = import.meta.env.VITE_ENVIRONMENT || 'dev'
const BINGO_CARD_TABLE = import.meta.env.VITE_BINGO_CARD_TABLE || `bingo-cards-${ENV}`
const BINGO_CHANGES_TABLE = import.meta.env.VITE_BINGO_CHANGES_TABLE || `bingo-changes-${ENV}`

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
 * @param {string} imageUrl - S3 URL or base64 data URL (for localStorage fallback)
 */
export async function saveBingoTile(cardId, row, col, content, completed, completedAt = null, username = null, imageUrl = null) {
  const tileId = getTileId(row, col)
  const updatedBy = username || getCurrentUsername()

  if (!isAWSConfigured() || !docClient) {
    console.warn('AWS not configured - saving to localStorage as fallback')
    try {
      // Save individual tile to localStorage
      const key = `bingo-tile-${tileId}`
      localStorage.setItem(key, JSON.stringify({
        row,
        col,
        content,
        completed,
        imageData: imageUrl || null,
        updatedAt: new Date().toISOString(),
        updatedBy,
      }))
      return { success: true, fallback: true }
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      return { success: false, error: error.message }
    }
  }

  try {
    const now = new Date().toISOString()
    const item = {
      tileId,
      row,
      col,
      content: content || '',
      completed: completed || false,
      updatedAt: now,
      completedAt: completedAt || (completed ? now : null),
      updatedBy,
      // Store S3 URL or null (not base64 - that goes to S3)
      imageData: imageUrl || null,
    }
    
    await docClient.send(
      new PutCommand({
        TableName: BINGO_CARD_TABLE,
        Item: item,
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Error saving tile to DynamoDB:', error)
    
    if (error.message?.includes('CORS') || error.message?.includes('Network') || error.name === 'NetworkError' || error.code === 'NetworkingError') {
      console.error('CORS or Network Error - DynamoDB cannot be accessed directly from browser')
    }
    
    if (error.name === 'AccessDeniedException' || error.code === 'AccessDeniedException') {
      console.error('Access Denied - Check IAM permissions')
    }
    
    // Fallback to localStorage on error
    try {
      const key = `bingo-tile-${tileId}`
      localStorage.setItem(key, JSON.stringify({
        row,
        col,
        content,
        completed,
        imageData: imageUrl || null,
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
  if (!isAWSConfigured() || !docClient) {
    console.warn('AWS not configured - loading from localStorage as fallback')
    try {
      // Load all tiles from localStorage
      const tiles = []
      for (let row = 0; row < 5; row++) {
        tiles[row] = []
        for (let col = 0; col < 5; col++) {
          const tileId = getTileId(row, col)
          const key = `bingo-tile-${tileId}`
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored)
            tiles[row][col] = {
              content: data.content || '',
              completed: data.completed || false,
              completedAt: data.completedAt || null,
              updatedBy: data.updatedBy || null,
              imageData: data.imageData || null
            }
          } else {
            tiles[row][col] = { content: '', completed: false, completedAt: null, updatedBy: null, imageData: null }
          }
        }
      }
      return {
        success: true,
        tiles,
        fallback: true
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  try {
    // Scan all tiles (there's only one card, so we can scan the entire table)
    // With only 25 tiles, this is efficient
    const result = await docClient.send(
      new ScanCommand({
        TableName: BINGO_CARD_TABLE,
      })
    )

    // Initialize 5x5 grid with empty tiles
    const tiles = Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        content: '',
        completed: false,
        completedAt: null,
        updatedBy: null,
        imageData: null
      }))
    )

    // Populate tiles from DynamoDB results
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach(item => {
        const row = typeof item.row === 'number' ? item.row : parseInt(item.row, 10)
        const col = typeof item.col === 'number' ? item.col : parseInt(item.col, 10)
        
        if (!isNaN(row) && !isNaN(col) && row >= 0 && row < 5 && col >= 0 && col < 5) {
          tiles[row][col] = {
            content: item.content || '',
            completed: item.completed === true || item.completed === 'true',
            completedAt: item.completedAt || null,
            updatedBy: item.updatedBy || null,
            imageData: item.imageData || null
          }
        }
      })
    }

    return {
      success: true,
      tiles,
    }
  } catch (error) {
    console.error('Error loading bingo card from DynamoDB:', error)
    
    // Check for CORS errors
    if (error.message?.includes('CORS') || 
        error.message?.includes('Network') || 
        error.name === 'NetworkError' ||
        error.code === 'NetworkingError' ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('network error')) {
      console.error('CORS or Network Error - DynamoDB cannot be accessed directly from browser')
    }
    
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
              tiles[row][col] = {
                content: data.content || '',
                completed: data.completed || false,
                completedAt: data.completedAt || null,
                updatedBy: data.updatedBy || null,
                imageData: data.imageData || null
              }
            } else {
              tiles[row][col] = { content: '', completed: false, completedAt: null, updatedBy: null, imageData: null }
            }
          }
        }
      console.warn('Fell back to localStorage due to DynamoDB error')
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
  if (!isAWSConfigured()) {
    // Silently skip if AWS not configured
    return { success: true }
  }

  try {
    const timestamp = new Date().toISOString()
    const changeId = `${timestamp}-${row}-${col}`
    const userId = username || getCurrentUsername()

    await docClient.send(
      new PutCommand({
        TableName: BINGO_CHANGES_TABLE,
        Item: {
          changeId,
          type: 'content',
          row,
          col,
          oldValue: oldContent,
          newValue: newContent,
          timestamp,
          userId,
        },
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Error recording content change:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Record a status change
 */
export async function recordStatusChange(cardId, row, col, oldStatus, newStatus, username = null) {
  if (!isAWSConfigured()) {
    // Silently skip if AWS not configured
    return { success: true }
  }

  try {
    const timestamp = new Date().toISOString()
    const changeId = `${timestamp}-${row}-${col}`
    const userId = username || getCurrentUsername()

    await docClient.send(
      new PutCommand({
        TableName: BINGO_CHANGES_TABLE,
        Item: {
          changeId,
          type: 'status',
          row,
          col,
          oldValue: oldStatus.toString(),
          newValue: newStatus.toString(),
          timestamp,
          userId,
        },
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Error recording status change:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get change history
 * Scans all changes and sorts by timestamp (most recent first)
 */
export async function getChangeHistory(cardId, limit = 100) {
  try {
    // Scan all changes (there's only one card)
    const result = await docClient.send(
      new ScanCommand({
        TableName: BINGO_CHANGES_TABLE,
        Limit: limit * 2, // Get more items to sort and limit client-side
      })
    )

    // Sort by timestamp descending (most recent first) and limit
    const changes = (result.Items || [])
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeB - timeA // Descending
      })
      .slice(0, limit)

    return {
      success: true,
      changes,
    }
  } catch (error) {
    console.error('Error getting change history:', error)
    return { success: false, error: error.message, changes: [] }
  }
}

