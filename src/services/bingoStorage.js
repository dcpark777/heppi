import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

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
 */
function getTileId(cardId, row, col) {
  return `${cardId}-${row}-${col}`
}

/**
 * Save a single bingo tile independently
 */
export async function saveBingoTile(cardId, row, col, content, completed, completedAt = null, username = null) {
  const tileId = getTileId(cardId, row, col)
  const updatedBy = username || getCurrentUsername()

  if (!isAWSConfigured() || !docClient) {
    console.warn('AWS not configured - saving to localStorage as fallback')
    try {
      // Save individual tile to localStorage
      const key = `bingo-tile-${tileId}`
      localStorage.setItem(key, JSON.stringify({
        cardId,
        row,
        col,
        content,
        completed,
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
      cardId,
      row,
      col,
      content: content || '',
      completed: completed || false,
      updatedAt: now,
      completedAt: completedAt || (completed ? now : null),
      updatedBy,
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
        cardId,
        row,
        col,
        content,
        completed,
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
 * Save bingo card state (content and status) - DEPRECATED, use saveBingoTile instead
 * Kept for backward compatibility
 */
export async function saveBingoCard(cardId, tiles) {
  if (!isAWSConfigured() || !docClient) {
    console.warn('AWS not configured - saving to localStorage as fallback')
    try {
      localStorage.setItem(`bingo-card-${cardId}`, JSON.stringify({
        tiles,
        updatedAt: new Date().toISOString(),
      }))
      return { success: true, fallback: true }
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      return { success: false, error: error.message }
    }
  }

  try {
    const item = {
      cardId,
      tiles: JSON.stringify(tiles),
      updatedAt: new Date().toISOString(),
    }
    
    await docClient.send(
      new PutCommand({
        TableName: BINGO_CARD_TABLE,
        Item: item,
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Error saving bingo card to DynamoDB:', error)
    
    if (error.message?.includes('CORS') || error.message?.includes('Network') || error.name === 'NetworkError' || error.code === 'NetworkingError') {
      console.error('CORS or Network Error - DynamoDB cannot be accessed directly from browser')
    }
    
    if (error.name === 'AccessDeniedException' || error.code === 'AccessDeniedException') {
      console.error('Access Denied - Check IAM permissions')
    }
    
    // Fallback to localStorage on error
    try {
      localStorage.setItem(`bingo-card-${cardId}`, JSON.stringify({
        tiles,
        updatedAt: new Date().toISOString(),
      }))
      console.warn('Fell back to localStorage - changes saved locally but NOT synced to DynamoDB')
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
          const tileId = getTileId(cardId, row, col)
          const key = `bingo-tile-${tileId}`
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored)
            tiles[row][col] = {
              content: data.content || '',
              completed: data.completed || false,
              completedAt: data.completedAt || null,
              updatedBy: data.updatedBy || null
            }
          } else {
            tiles[row][col] = { content: '', completed: false, completedAt: null, updatedBy: null }
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
    // Try to use GSI first (more efficient), fall back to Scan if GSI doesn't exist
    let result
    try {
      result = await docClient.send(
        new QueryCommand({
          TableName: BINGO_CARD_TABLE,
          IndexName: 'cardId-index',
          KeyConditionExpression: 'cardId = :cardId',
          ExpressionAttributeValues: {
            ':cardId': cardId,
          },
        })
      )
    } catch (gsiError) {
      // GSI might not exist or query failed, fall back to Scan
      try {
        result = await docClient.send(
          new ScanCommand({
            TableName: BINGO_CARD_TABLE,
            FilterExpression: 'cardId = :cardId',
            ExpressionAttributeValues: {
              ':cardId': cardId,
            },
          })
        )
      } catch (scanError) {
        console.error('Both GSI query and Scan failed:', scanError)
        throw scanError
      }
    }

    // Initialize 5x5 grid with empty tiles
    const tiles = Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        content: '',
        completed: false,
        completedAt: null,
        updatedBy: null
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
            updatedBy: item.updatedBy || null
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
          const tileId = getTileId(cardId, row, col)
          const key = `bingo-tile-${tileId}`
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored)
            tiles[row][col] = {
              content: data.content || '',
              completed: data.completed || false,
              completedAt: data.completedAt || null,
              updatedBy: data.updatedBy || null
            }
          } else {
            tiles[row][col] = { content: '', completed: false, completedAt: null, updatedBy: null }
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
    const changeId = `${cardId}-${timestamp}-${row}-${col}`
    const userId = username || getCurrentUsername()

    await docClient.send(
      new PutCommand({
        TableName: BINGO_CHANGES_TABLE,
        Item: {
          changeId,
          cardId,
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
    const changeId = `${cardId}-${timestamp}-${row}-${col}`
    const userId = username || getCurrentUsername()

    await docClient.send(
      new PutCommand({
        TableName: BINGO_CHANGES_TABLE,
        Item: {
          changeId,
          cardId,
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
 * Get change history for a card
 * Note: This requires a GSI on cardId-timestamp. 
 * If GSI doesn't exist, returns empty array.
 */
export async function getChangeHistory(cardId, limit = 100) {
  try {
    // Try with GSI first
    const result = await docClient.send(
      new QueryCommand({
        TableName: BINGO_CHANGES_TABLE,
        IndexName: 'cardId-timestamp-index',
        KeyConditionExpression: 'cardId = :cardId',
        ExpressionAttributeValues: {
          ':cardId': cardId,
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit,
      })
    )

    return {
      success: true,
      changes: result.Items || [],
    }
  } catch (error) {
    // GSI might not exist - return empty for now
    // In production, you should create the GSI or use a different query pattern
    console.warn('GSI not found or query failed:', error.message)
    return { success: false, error: 'GSI not configured', changes: [] }
  }
}

