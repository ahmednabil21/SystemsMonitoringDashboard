import { runApiCheck } from '../lib/apiCheck.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  let targetUrl
  let auth

  if (req.method === 'GET') {
    targetUrl = req.query?.url
  } else if (req.method === 'POST') {
    targetUrl = req.body?.url
    auth = req.body?.auth
  } else {
    res.status(405).end()
    return
  }

  const { body, statusCode, error } = await runApiCheck({ targetUrl, auth })

  if (error) {
    res.status(statusCode).json({ error })
    return
  }

  res.status(statusCode).json(body)
}
