import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { runApiCheck } from './lib/apiCheck.js'

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

    const { body, statusCode, error } = await runApiCheck({ targetUrl, auth })

    if (error) {
      sendJson(res, statusCode, { error })
      return
    }

    sendJson(res, statusCode, body)
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
