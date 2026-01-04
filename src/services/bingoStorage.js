import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

// Check if AWS is configured
const isAWSConfigured = () => {
  return !!(import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY)
}

// Initialize AWS client (only if credentials are provided)
let client = null
let docClient = null

if (isAWSConfigured()) {
  client = new DynamoDBClient({
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  })
  docClient = DynamoDBDocumentClient.from(client)
}

const BINGO_CARD_TABLE = import.meta.env.VITE_BINGO_CARD_TABLE || 'bingo-cards'
const BINGO_CHANGES_TABLE = import.meta.env.VITE_BINGO_CHANGES_TABLE || 'bingo-changes'

/**
 * Save bingo card state (content and status)
 */
export async function saveBingoCard(cardId, tiles) {
  if (!isAWSConfigured()) {
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

    await docClient.send(
      new PutCommand({
        TableName: BINGO_CARD_TABLE,
        Item: item,
      })
    )

    return { success: true }
  } catch (error) {
    console.error('Error saving bingo card:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Load bingo card state
 */
export async function loadBingoCard(cardId) {
  if (!isAWSConfigured()) {
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
    const result = await docClient.send(
      new GetCommand({
        TableName: BINGO_CARD_TABLE,
        Key: { cardId },
      })
    )

    if (result.Item) {
      return {
        success: true,
        tiles: JSON.parse(result.Item.tiles),
        updatedAt: result.Item.updatedAt,
      }
    }

    return { success: true, tiles: null }
  } catch (error) {
    console.error('Error loading bingo card:', error)
    return { success: false, error: error.message }
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

