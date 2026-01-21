import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

// Initialize AWS client (credentials from server environment)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.BINGO_CARD_TABLE || `bingo-cards-${process.env.ENVIRONMENT || 'prod'}`

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tileId, row, col, content, completed, completedAt, username, imageUrls, previewImageIndex } = req.body

    if (row === undefined || col === undefined) {
      return res.status(400).json({ success: false, error: 'Row and col are required' })
    }

    const now = new Date().toISOString()
    const item = {
      tileId: tileId || `${row}-${col}`,
      row,
      col,
      content: content || '',
      completed: completed || false,
      updatedAt: now,
      completedAt: completedAt || (completed ? now : null),
      updatedBy: username || 'unknown',
      images: imageUrls ? (Array.isArray(imageUrls) ? imageUrls : [imageUrls]).filter(Boolean) : [],
      previewImageIndex: previewImageIndex !== undefined ? previewImageIndex : 0,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    )

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error saving tile:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    })
  }
}

