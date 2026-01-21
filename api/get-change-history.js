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
const TABLE_NAME = process.env.BINGO_CHANGES_TABLE || `bingo-changes-${process.env.ENVIRONMENT || 'prod'}`

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const limit = parseInt(req.query.limit || '100', 10)

    // Scan all changes (there's only one card)
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
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

    return res.status(200).json({
      success: true,
      changes,
    })
  } catch (error) {
    console.error('Error getting change history:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      changes: [],
    })
  }
}

