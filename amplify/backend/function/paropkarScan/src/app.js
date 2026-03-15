/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const AWS = require('aws-sdk')

const app = express()
app.use(bodyParser.json({ limit: '10mb' }))
app.use(awsServerlessExpressMiddleware.eventContext())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
})

const textract = new AWS.Textract({ region: process.env.REGION || 'us-east-1' })

/**
 * POST /scan
 * Body: { imageBase64: "<base64 string>" }
 * Sends image to Textract and returns extracted text
 */
app.post('/scan', async function(req, res) {
  const { imageBase64 } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  const imageBuffer = Buffer.from(imageBase64, 'base64')

  try {
    const result = await textract.detectDocumentText({
      Document: { Bytes: imageBuffer }
    }).promise()

    // Extract all LINE blocks as plain text
    const lines = result.Blocks
      .filter(b => b.BlockType === 'LINE')
      .map(b => b.Text)

    res.json({
      success: true,
      text: lines.join('\n'),
      lines,
      blockCount: result.Blocks.length
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, function() {
  console.log("App started")
})

module.exports = app
