import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.BINGO_CHANGES_TABLE || `bingo-changes-${process.env.ENVIRONMENT || 'prod'}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { cardId, row, col, oldContent, newContent, username } = req.body

    const timestamp = new Date().toISOString()
    const changeId = `${timestamp}-${row}-${col}`
    const userId = username || 'unknown'

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
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

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error recording content change:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    })
  }
}

