/* Amplify Params - DO NOT EDIT
	ENV
	REGION
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

const polly = new AWS.Polly({ region: process.env.REGION || 'us-east-1' })

/**
 * POST /speak
 * Body: { text: "...", voiceId?: "Aditi" | "Joanna" | etc., languageCode?: "hi-IN" | "en-US" }
 * Returns base64-encoded MP3 audio
 */
app.post('/speak', async function(req, res) {
  const { text, voiceId = 'Aditi', languageCode = 'hi-IN' } = req.body

  if (!text) {
    return res.status(400).json({ error: 'text is required' })
  }

  if (text.length > 3000) {
    return res.status(400).json({ error: 'text must be 3000 characters or fewer' })
  }

  try {
    const result = await polly.synthesizeSpeech({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: voiceId,
      LanguageCode: languageCode
    }).promise()

    const audioBase64 = result.AudioStream.toString('base64')

    res.json({
      success: true,
      audioBase64,
      contentType: 'audio/mpeg',
      voiceId,
      languageCode
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /speak/voices
 * Returns available Polly voices
 */
app.get('/speak/voices', async function(req, res) {
  const { languageCode } = req.query

  try {
    const params = languageCode ? { LanguageCode: languageCode } : {}
    const result = await polly.describeVoices(params).promise()
    res.json({ voices: result.Voices })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, function() {
  console.log("App started")
})

module.exports = app
