/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	GROQ_API_KEY
Amplify Params - DO NOT EDIT */

const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const https = require('https')

const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
})

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

const SYSTEM_PROMPT = `You are Paropkar AI, a helpful assistant for Indian citizens managing government certificates.
You help with: income certificates, caste certificates, domicile certificates, Aadhaar, ration cards.
You know processing times by state, scholarship deadlines, and renewal procedures.
Keep responses SHORT (2-3 sentences max). Respond in the same language the user writes in.
If they mention a certificate type and state, calculate when they need to apply.
Always end with 1-2 actionable quick-reply options as JSON array in format: OPTIONS:["option1","option2"]`

function callGroq(userMessage) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 200,
      temperature: 0.7
    })

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

/**
 * POST /groq
 * Body: { message: string, language: string }
 * Returns AI response with optional quick-reply options
 */
app.post('/groq', async function(req, res) {
  const { message, language = 'hi-IN' } = req.body

  if (!message) return res.status(400).json({ error: 'message is required' })

  // Fallback if no API key configured
  if (!GROQ_API_KEY) {
    return res.json({
      text: 'आपका certificate जल्द expire होने वाला है। कृपया अपने नजदीकी Tahsildar office जाएं।',
      opts: ['Income Certificate', 'Caste Certificate']
    })
  }

  try {
    const groqRes = await callGroq(message)
    const content = groqRes.choices?.[0]?.message?.content || ''

    // Parse OPTIONS from response
    const optMatch = content.match(/OPTIONS:\s*(\[.*?\])/s)
    let opts = []
    let text = content.replace(/OPTIONS:\s*\[.*?\]/s, '').trim()

    if (optMatch) {
      try { opts = JSON.parse(optMatch[1]) } catch {}
    }

    res.json({ text, opts })
  } catch (err) {
    console.error('Groq error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, function() { console.log("App started") })
module.exports = app
