import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const tokenCache = new Map()

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function parseTargetUrl(targetUrl) {
  const parsed = new URL(targetUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('invalid protocol')
  }
  return parsed
}

async function getBearerToken(origin, phoneNumber, password) {
  const cacheKey = `${origin}:${phoneNumber}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { token: cached.token, loginStatus: 200 }
  }

  const loginRes = await fetch(`${origin}/api/Login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ phoneNumber, password }),
  })

  if (!loginRes.ok) {
    return { token: null, loginStatus: loginRes.status }
  }

  const loginBody = await loginRes.json()
  const token = loginBody?.data?.token
  if (!token) {
    return { token: null, loginStatus: 401 }
  }

  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + 55 * 60 * 1000,
  })

  return { token, loginStatus: 200 }
}

async function checkUpstream(targetUrl, auth) {
  const parsed = parseTargetUrl(targetUrl)
  const headers = { accept: 'text/plain, application/json, */*' }

  if (auth?.phoneNumber && auth?.password) {
    const { token, loginStatus } = await getBearerToken(
      parsed.origin,
      auth.phoneNumber,
      auth.password,
    )
    if (!token) {
      return { status: loginStatus || 401, ok: false }
    }
    headers.Authorization = `Bearer ${token}`
  }

  const upstream = await fetch(parsed.toString(), { method: 'GET', headers })
  return { status: upstream.status, ok: upstream.ok }
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function apiCheckProxy() {
  const handleCheck = async (req, res) => {
    let targetUrl
    let auth

    if (req.method === 'GET') {
      targetUrl = new URL(req.url ?? '', 'http://localhost').searchParams.get(
        'url',
      )
    } else if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req))
        targetUrl = body.url
        auth = body.auth
      } catch {
        sendJson(res, 400, { error: 'invalid body' })
        return
      }
    } else {
      res.statusCode = 405
      res.end()
      return
    }

    if (!targetUrl) {
      sendJson(res, 400, { error: 'missing url' })
      return
    }

    try {
      parseTargetUrl(targetUrl)
    } catch {
      sendJson(res, 400, { error: 'invalid url' })
      return
    }

    try {
      const result = await checkUpstream(targetUrl, auth)
      sendJson(res, 200, result)
    } catch (err) {
      sendJson(res, 502, {
        status: 0,
        ok: false,
        error: err instanceof Error ? err.message : 'fetch failed',
      })
    }
  }

  const attach = (middlewares) => {
    middlewares.use('/api/check', (req, res) => {
      handleCheck(req, res)
    })
  }

  return {
    name: 'api-check-proxy',
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiCheckProxy()],
})
