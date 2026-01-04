import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

// Check if AWS is configured
const isAWSConfigured = () => {
  const accessKey = import.meta.env.VITE_AWS_ACCESS_KEY_ID
  const secretKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
  const hasAccessKey = !!accessKey
  const hasSecretKey = !!secretKey
  const configured = hasAccessKey && hasSecretKey
  
  // Debug logging
  console.log('AWS Config Check:', {
    hasAccessKey,
    hasSecretKey,
    accessKeyPrefix: accessKey ? accessKey.substring(0, 8) + '...' : 'missing',
    secretKeyPrefix: secretKey ? '***' : 'missing',
    allEnvKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_AWS'))
  })
  
  if (!configured) {
    console.warn('AWS not configured - missing credentials')
    console.warn('Make sure:')
    console.warn('1. .env file exists in project root')
    console.warn('2. Dev server was restarted after creating .env')
    console.warn('3. Variables are prefixed with VITE_')
  } else {
    console.log('AWS configured - using DynamoDB')
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
    console.log('✅ AWS DynamoDB client initialized')
  } catch (error) {
    console.error('❌ Failed to initialize AWS client:', error)
  }
} else {
  console.warn('⚠️ AWS client not initialized - credentials missing')
}

const BINGO_CARD_TABLE = import.meta.env.VITE_BINGO_CARD_TABLE || 'bingo-cards'
const BINGO_CHANGES_TABLE = import.meta.env.VITE_BINGO_CHANGES_TABLE || 'bingo-changes'

/**
 * Generate tile ID for a specific tile
 */
function getTileId(cardId, row, col) {
  return `${cardId}-${row}-${col}`
}

/**
 * Save a single bingo tile independently
 */
export async function saveBingoTile(cardId, row, col, content, completed) {
  const tileId = getTileId(cardId, row, col)
  
  console.log('💾 saveBingoTile called:', {
    tileId,
    cardId,
    row,
    col,
    content: content.substring(0, 50),
    completed
  })

  if (!isAWSConfigured() || !docClient) {
    console.warn('⚠️ AWS not configured - saving to localStorage as fallback')
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
      }))
      console.log('✅ Saved tile to localStorage')
      return { success: true, fallback: true }
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error)
      return { success: false, error: error.message }
    }
  }

  try {
    const item = {
      tileId, // Partition key: cardId-row-col
      cardId,
      row,
      col,
      content: content || '',
      completed: completed || false,
      updatedAt: new Date().toISOString(),
    }

    console.log('💾 Saving tile to DynamoDB:', { 
      tileId, 
      table: BINGO_CARD_TABLE,
      content: content.substring(0, 50)
    })
    
    const result = await docClient.send(
      new PutCommand({
        TableName: BINGO_CARD_TABLE,
        Item: item,
      })
    )

    console.log('✅ Successfully saved tile to DynamoDB', {
      requestId: result.$metadata?.requestId,
      httpStatusCode: result.$metadata?.httpStatusCode
    })
    return { success: true }
  } catch (error) {
    console.error('❌ Error saving tile to DynamoDB:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId,
      statusCode: error.$metadata?.httpStatusCode
    })
    
    // Check for specific error types
    if (error.message?.includes('CORS') || error.message?.includes('Network') || error.name === 'NetworkError' || error.code === 'NetworkingError') {
      console.error('⚠️ CORS or Network Error - DynamoDB cannot be accessed directly from browser')
      console.error('💡 Solution: Use a backend API (Vercel Serverless Functions)')
    }
    
    if (error.name === 'AccessDeniedException' || error.code === 'AccessDeniedException') {
      console.error('⚠️ Access Denied - Check IAM permissions')
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
      }))
      console.warn('✅ Fell back to localStorage - tile saved locally but NOT synced to DynamoDB')
      return { success: true, fallback: true }
    } catch (localError) {
      console.error('❌ Failed to save even to localStorage:', localError)
      return { success: false, error: error.message }
    }
  }
}

/**
 * Save bingo card state (content and status) - DEPRECATED, use saveBingoTile instead
 * Kept for backward compatibility
 */
export async function saveBingoCard(cardId, tiles) {
  // Log what we're trying to save
  const tilesWithContent = tiles.flat().filter(t => t.content && t.content.trim() !== '')
  console.log('💾 saveBingoCard called:', {
    cardId,
    totalTiles: tiles.flat().length,
    tilesWithContent: tilesWithContent.length,
    sampleContent: tilesWithContent.slice(0, 3).map(t => t.content)
  })

  if (!isAWSConfigured() || !docClient) {
    console.warn('⚠️ AWS not configured - saving to localStorage as fallback')
    try {
      localStorage.setItem(`bingo-card-${cardId}`, JSON.stringify({
        tiles,
        updatedAt: new Date().toISOString(),
      }))
      console.log('✅ Saved to localStorage')
      return { success: true, fallback: true }
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error)
      return { success: false, error: error.message }
    }
  }

  try {
    const item = {
      cardId,
      tiles: JSON.stringify(tiles),
      updatedAt: new Date().toISOString(),
    }

    console.log('💾 Saving to DynamoDB:', { 
      cardId, 
      table: BINGO_CARD_TABLE, 
      tileCount: tiles.length,
      tilesData: JSON.stringify(tiles).substring(0, 200) + '...'
    })
    
    const result = await docClient.send(
      new PutCommand({
        TableName: BINGO_CARD_TABLE,
        Item: item,
      })
    )

    console.log('✅ Successfully saved to DynamoDB', {
      requestId: result.$metadata?.requestId,
      httpStatusCode: result.$metadata?.httpStatusCode
    })
    return { success: true }
  } catch (error) {
    console.error('❌ Error saving bingo card to DynamoDB:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId,
      statusCode: error.$metadata?.httpStatusCode
    })
    
    // Check for specific error types
    if (error.message?.includes('CORS') || error.message?.includes('Network') || error.name === 'NetworkError' || error.code === 'NetworkingError') {
      console.error('⚠️ CORS or Network Error - DynamoDB cannot be accessed directly from browser')
      console.error('💡 This is why changes on your phone are not persisting!')
      console.error('💡 Solution: Use a backend API (Vercel Serverless Functions)')
    }
    
    if (error.name === 'AccessDeniedException' || error.code === 'AccessDeniedException') {
      console.error('⚠️ Access Denied - Check IAM permissions')
    }
    
    // Fallback to localStorage on error
    try {
      localStorage.setItem(`bingo-card-${cardId}`, JSON.stringify({
        tiles,
        updatedAt: new Date().toISOString(),
      }))
      console.warn('✅ Fell back to localStorage - changes saved locally but NOT synced to DynamoDB')
      console.warn('⚠️ This means changes on your phone will NOT sync to other devices')
      return { success: true, fallback: true }
    } catch (localError) {
      console.error('❌ Failed to save even to localStorage:', localError)
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
              completed: data.completed || false
            }
          } else {
            tiles[row][col] = { content: '', completed: false }
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
    console.log('Loading tiles from DynamoDB:', { cardId, table: BINGO_CARD_TABLE })
    
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
      console.log('✅ Used GSI query to load tiles')
    } catch (gsiError) {
      // GSI might not exist, fall back to Scan
      console.warn('GSI not available, using Scan:', gsiError.message)
      result = await docClient.send(
        new ScanCommand({
          TableName: BINGO_CARD_TABLE,
          FilterExpression: 'cardId = :cardId',
          ExpressionAttributeValues: {
            ':cardId': cardId,
          },
        })
      )
    }

    console.log('DynamoDB scan result:', { itemCount: result.Items?.length || 0 })

    // Initialize 5x5 grid with empty tiles
    const tiles = Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        content: '',
        completed: false
      }))
    )

    // Populate tiles from DynamoDB results
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach(item => {
        const row = item.row
        const col = item.col
        if (row >= 0 && row < 5 && col >= 0 && col < 5) {
          tiles[row][col] = {
            content: item.content || '',
            completed: item.completed || false
          }
        }
      })
      console.log('✅ Loaded', result.Items.length, 'tiles from DynamoDB')
    } else {
      console.log('No tiles found in DynamoDB for cardId:', cardId)
    }

    return {
      success: true,
      tiles,
    }
  } catch (error) {
    console.error('❌ Error loading bingo card from DynamoDB:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId,
      stack: error.stack
    })
    
    // Check for CORS errors
    if (error.message?.includes('CORS') || 
        error.message?.includes('Network') || 
        error.name === 'NetworkError' ||
        error.code === 'NetworkingError' ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('network error')) {
      console.error('⚠️ CORS or Network Error - DynamoDB cannot be accessed directly from browser')
      console.error('💡 Solution: Use a backend API (Vercel Serverless Functions) or AWS Cognito')
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
              completed: data.completed || false
            }
          } else {
            tiles[row][col] = { content: '', completed: false }
          }
        }
      }
      console.warn('✅ Fell back to localStorage due to DynamoDB error')
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
export async function recordContentChange(cardId, row, col, oldContent, newContent) {
  if (!isAWSConfigured()) {
    // Silently skip if AWS not configured
    return { success: true }
  }

  try {
    const timestamp = new Date().toISOString()
    const changeId = `${cardId}-${timestamp}-${row}-${col}`

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
export async function recordStatusChange(cardId, row, col, oldStatus, newStatus) {
  if (!isAWSConfigured()) {
    // Silently skip if AWS not configured
    return { success: true }
  }

  try {
    const timestamp = new Date().toISOString()
    const changeId = `${cardId}-${timestamp}-${row}-${col}`

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

