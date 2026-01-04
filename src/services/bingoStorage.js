import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

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
    })
    docClient = DynamoDBDocumentClient.from(client)
    console.log('AWS DynamoDB client initialized')
  } catch (error) {
    console.error('Failed to initialize AWS client:', error)
  }
}

const BINGO_CARD_TABLE = import.meta.env.VITE_BINGO_CARD_TABLE || 'bingo-cards'
const BINGO_CHANGES_TABLE = import.meta.env.VITE_BINGO_CHANGES_TABLE || 'bingo-changes'

/**
 * Save bingo card state (content and status)
 */
export async function saveBingoCard(cardId, tiles) {
  if (!isAWSConfigured() || !docClient) {
    console.warn('AWS not configured - saving to localStorage as fallback')
    try {
      localStorage.setItem(`bingo-card-${cardId}`, JSON.stringify({
        tiles,
        updatedAt: new Date().toISOString(),
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  try {
    const item = {
      cardId,
      tiles: JSON.stringify(tiles),
      updatedAt: new Date().toISOString(),
    }

    console.log('Saving to DynamoDB:', { cardId, table: BINGO_CARD_TABLE })
    await docClient.send(
      new PutCommand({
        TableName: BINGO_CARD_TABLE,
        Item: item,
      })
    )

    console.log('Successfully saved to DynamoDB')
    return { success: true }
  } catch (error) {
    console.error('Error saving bingo card to DynamoDB:', error)
    // Fallback to localStorage on error
    try {
      localStorage.setItem(`bingo-card-${cardId}`, JSON.stringify({
        tiles,
        updatedAt: new Date().toISOString(),
      }))
      console.warn('Fell back to localStorage due to DynamoDB error')
      return { success: true }
    } catch (localError) {
      return { success: false, error: error.message }
    }
  }
}

/**
 * Load bingo card state
 */
export async function loadBingoCard(cardId) {
  if (!isAWSConfigured() || !docClient) {
    console.warn('AWS not configured - loading from localStorage as fallback')
    try {
      const stored = localStorage.getItem(`bingo-card-${cardId}`)
      if (stored) {
        const data = JSON.parse(stored)
        return {
          success: true,
          tiles: data.tiles,
          updatedAt: data.updatedAt,
        }
      }
      return { success: true, tiles: null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  try {
    console.log('Loading from DynamoDB:', { cardId, table: BINGO_CARD_TABLE })
    const result = await docClient.send(
      new GetCommand({
        TableName: BINGO_CARD_TABLE,
        Key: { cardId },
      })
    )

    if (result.Item) {
      console.log('Successfully loaded from DynamoDB')
      return {
        success: true,
        tiles: JSON.parse(result.Item.tiles),
        updatedAt: result.Item.updatedAt,
      }
    }

    console.log('No data found in DynamoDB for cardId:', cardId)
    return { success: true, tiles: null }
  } catch (error) {
    console.error('Error loading bingo card from DynamoDB:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId
    })
    
    // Check for CORS errors
    if (error.message?.includes('CORS') || error.message?.includes('Network') || error.name === 'NetworkError') {
      console.error('⚠️ CORS or Network Error - DynamoDB cannot be accessed directly from browser')
      console.error('💡 Solution: Use a backend API (Vercel Serverless Functions) or AWS Cognito')
    }
    
    // Fallback to localStorage on error
    try {
      const stored = localStorage.getItem(`bingo-card-${cardId}`)
      if (stored) {
        const data = JSON.parse(stored)
        console.warn('Fell back to localStorage due to DynamoDB error')
        return {
          success: true,
          tiles: data.tiles,
          updatedAt: data.updatedAt,
        }
      }
      return { success: true, tiles: null }
    } catch (localError) {
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

