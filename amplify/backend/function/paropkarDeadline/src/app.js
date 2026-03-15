/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
})

/**
 * POST /deadline/calculate
 * Body: { startDate: "YYYY-MM-DD", daysToAdd: number }
 * Returns the calculated deadline date
 */
app.post('/deadline/calculate', function(req, res) {
  const { startDate, daysToAdd } = req.body

  if (!startDate || daysToAdd === undefined) {
    return res.status(400).json({ error: 'startDate and daysToAdd are required' })
  }

  const start = new Date(startDate)
  if (isNaN(start.getTime())) {
    return res.status(400).json({ error: 'Invalid startDate format. Use YYYY-MM-DD' })
  }

  const deadline = new Date(start)
  deadline.setDate(deadline.getDate() + Number(daysToAdd))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))

  res.json({
    startDate: start.toISOString().split('T')[0],
    daysAdded: Number(daysToAdd),
    deadline: deadline.toISOString().split('T')[0],
    daysRemaining,
    isOverdue: daysRemaining < 0
  })
})

/**
 * GET /deadline/remaining?deadline=YYYY-MM-DD
 * Returns how many days remain until a given deadline
 */
app.get('/deadline/remaining', function(req, res) {
  const { deadline } = req.query

  if (!deadline) {
    return res.status(400).json({ error: 'deadline query param is required' })
  }

  const deadlineDate = new Date(deadline)
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ error: 'Invalid deadline format. Use YYYY-MM-DD' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))

  res.json({
    deadline,
    daysRemaining,
    isOverdue: daysRemaining < 0
  })
})

app.listen(3000, function() {
  console.log("App started")
})

module.exports = app
