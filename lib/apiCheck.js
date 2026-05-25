const tokenCache = new Map()

export function parseTargetUrl(targetUrl) {
  const parsed = new URL(targetUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('invalid protocol')
  }
  return parsed
}

export async function getBearerToken(origin, phoneNumber, password) {
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

export async function checkUpstream(targetUrl, auth) {
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

export async function runApiCheck({ targetUrl, auth }) {
  if (!targetUrl) {
    return { error: 'missing url', statusCode: 400 }
  }

  try {
    parseTargetUrl(targetUrl)
  } catch {
    return { error: 'invalid url', statusCode: 400 }
  }

  try {
    const result = await checkUpstream(targetUrl, auth)
    return { body: result, statusCode: 200 }
  } catch (err) {
    return {
      statusCode: 502,
      body: {
        status: 0,
        ok: false,
        error: err instanceof Error ? err.message : 'fetch failed',
      },
    }
  }
}
