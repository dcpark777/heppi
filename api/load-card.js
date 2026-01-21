import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Scan all tiles (there's only one card, so we can scan the entire table)
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    )

    // Initialize 5x5 grid with empty tiles
    const tiles = Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({
        content: '',
        completed: false,
        completedAt: null,
        updatedBy: null,
        images: [],
        previewImageIndex: 0,
      }))
    )

    // Populate tiles from DynamoDB results
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach(item => {
        const row = typeof item.row === 'number' ? item.row : parseInt(item.row, 10)
        const col = typeof item.col === 'number' ? item.col : parseInt(item.col, 10)
        
        if (!isNaN(row) && !isNaN(col) && row >= 0 && row < 5 && col >= 0 && col < 5) {
          // Support both old single image format and new array format
          const imageData = item.images || item.imageData || null
          const imagesArray = imageData ? (Array.isArray(imageData) ? imageData : [imageData]).filter(Boolean) : []
          tiles[row][col] = {
            content: item.content || '',
            completed: item.completed === true || item.completed === 'true',
            completedAt: item.completedAt || null,
            updatedBy: item.updatedBy || null,
            images: imagesArray,
            previewImageIndex: item.previewImageIndex !== undefined ? item.previewImageIndex : 0,
          }
        }
      })
    }

    return res.status(200).json({ 
      success: true, 
      tiles,
    })
  } catch (error) {
    console.error('Error loading card:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    })
  }
}

