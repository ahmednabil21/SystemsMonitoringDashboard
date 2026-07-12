const tokenCache = new Map()

export function parseTargetUrl(targetUrl) {
  const parsed = new URL(targetUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('invalid protocol')
  }
  return parsed
}

function buildLoginBody(auth) {
  if (auth.loginStyle === 'pascal') {
    return { Phone: auth.phoneNumber, Password: auth.password }
  }
  return { phoneNumber: auth.phoneNumber, password: auth.password }
}

function extractToken(loginBody) {
  return loginBody?.data?.token ?? loginBody?.Data?.Token ?? null
}

function getLoginMessage(body) {
  if (!body || typeof body !== 'object') return ''
  return String(body.message ?? body.Message ?? '').trim()
}

/** API is up but credentials rejected (e.g. 400 اسم المستخدم غير صحيح) */
export function isCredentialValidationResponse(status, body) {
  if (status !== 400 && status !== 401) return false

  const message = getLoginMessage(body).toLowerCase()
  if (!message) return status === 400 || status === 401

  const hints = [
    'اسم المستخدم',
    'غير صحيح',
    'invalid',
    'password',
    'phone',
    'username',
    'credential',
    'كلمة المرور',
    'المستخدم',
    'login',
    'phoneNumber',
  ]

  return hints.some((hint) => message.includes(hint))
}

function onlineFromLogin(status, body) {
  if (status === 200 && extractToken(body)) return true
  if (status === 200 && (body?.error === false || body?.Error === false)) {
    return true
  }
  return isCredentialValidationResponse(status, body)
}

function toMonitorResult(loginStatus, body) {
  if (onlineFromLogin(loginStatus, body)) {
    return { status: 200, ok: true }
  }
  return { status: loginStatus || 0, ok: false }
}

async function postLogin(loginUrl, auth) {
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(buildLoginBody(auth)),
  })

  let body = null
  try {
    body = await loginRes.json()
  } catch {
    /* non-JSON body */
  }

  return { status: loginRes.status, body, token: extractToken(body) }
}

export async function getBearerToken(origin, auth) {
  const loginUrl = auth.loginUrl ?? `${origin}/api/Login`
  const cacheKey = `${loginUrl}:${auth.phoneNumber}:${auth.loginStyle ?? 'default'}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { token: cached.token, loginStatus: 200, serviceOnline: true }
  }

  const login = await postLogin(loginUrl, auth)

  if (onlineFromLogin(login.status, login.body) && !login.token) {
    return {
      token: null,
      loginStatus: login.status,
      serviceOnline: true,
    }
  }

  if (!login.token) {
    return {
      token: null,
      loginStatus: login.status,
      serviceOnline: isCredentialValidationResponse(login.status, login.body),
    }
  }

  tokenCache.set(cacheKey, {
    token: login.token,
    expiresAt: Date.now() + 55 * 60 * 1000,
  })

  return { token: login.token, loginStatus: 200, serviceOnline: true }
}

async function checkViaLogin(targetUrl, auth) {
  const login = await postLogin(targetUrl, auth)
  return toMonitorResult(login.status, login.body)
}

export async function checkUpstream(targetUrl, auth) {
  if (auth?.phoneNumber && auth?.password && auth.monitorLogin) {
    return checkViaLogin(targetUrl, auth)
  }

  const parsed = parseTargetUrl(targetUrl)
  const headers = { accept: 'text/plain, application/json, */*' }

  if (auth?.phoneNumber && auth?.password) {
    const { token, loginStatus, serviceOnline } = await getBearerToken(
      parsed.origin,
      {
        ...auth,
        loginUrl: auth.loginUrl ?? `${parsed.origin}/api/Login`,
      },
    )

    if (serviceOnline && !token) {
      return { status: 200, ok: true }
    }

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
    const startedAt = Date.now()
    const result = await checkUpstream(targetUrl, auth)
    return {
      body: {
        ...result,
        responseTimeMs: Date.now() - startedAt,
      },
      statusCode: 200,
    }
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
