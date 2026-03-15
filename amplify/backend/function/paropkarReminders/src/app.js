/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_PAROPKARREMINDERS_ARN
	STORAGE_PAROPKARREMINDERS_NAME
	STORAGE_PAROPKARREMINDERS_STREAMARN
Amplify Params - DO NOT EDIT */

const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const AWS = require('aws-sdk')

const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
})

const dynamo = new AWS.DynamoDB.DocumentClient()
const TABLE_NAME = process.env.STORAGE_PAROPKARREMINDERS_NAME || 'paropkarReminders'

/**
 * GET /reminders
 * Returns all reminders for a user
 * Query: ?userId=xxx
 */
app.get('/reminders', async function(req, res) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId query param is required' })

  try {
    const result = await dynamo.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId }
    }).promise()
    res.json({ reminders: result.Items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /reminders
 * Body: { userId, title, deadline, notes? }
 * Saves a new reminder to DynamoDB
 */
app.post('/reminders', async function(req, res) {
  const { userId, title, deadline, notes } = req.body

  if (!userId || !title || !deadline) {
    return res.status(400).json({ error: 'userId, title, and deadline are required' })
  }

  const item = {
    userId,
    reminderId: `${userId}_${Date.now()}`,
    title,
    deadline,
    notes: notes || '',
    createdAt: new Date().toISOString()
  }

  try {
    await dynamo.put({ TableName: TABLE_NAME, Item: item }).promise()
    res.json({ success: true, reminder: item })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /reminders/:reminderId
 * Query: ?userId=xxx
 */
app.delete('/reminders/:reminderId', async function(req, res) {
  const { reminderId } = req.params
  const { userId } = req.query

  if (!userId) return res.status(400).json({ error: 'userId query param is required' })

  try {
    await dynamo.delete({
      TableName: TABLE_NAME,
      Key: { userId, reminderId }
    }).promise()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, function() {
  console.log("App started")
})

module.exports = app
