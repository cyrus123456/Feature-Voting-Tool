import { Env } from '../index'
import { corsHeaders } from '../utils/cors'
import { sendEmail, generateMagicLinkEmail } from '../utils/email'
import { verifyRecaptcha } from '../utils/recaptcha'
import { isAdminEmail, UserRole } from '../middleware/auth'

interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  status: string
  created_at: number
  last_login_at: number | null
}

interface Session {
  id: string
  user_id: string
  token: string
  expires_at: number
  created_at: number
}

/**
 * Request magic link login email
 * POST /api/auth/login
 * Body: { email: string }
 */
export async function handleLoginRequest(request: Request, env: Env): Promise<Response> {
  try {
    const body: any = await request.json()
    const email = body.email?.trim().toLowerCase()
    const recaptchaToken = body.recaptchaToken

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, env, 'login')
    if (!recaptchaResult.success) {
      return new Response(JSON.stringify({ error: recaptchaResult.error || 'Security verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find or create user
    let user = await getUserByEmail(env, email)
    if (!user) {
      user = await createUser(env, email)
    } else {
      // Check if user should be admin and update role if needed
      const shouldBeAdmin = await isAdminEmail(email, env)
      if (shouldBeAdmin && user.role !== 'admin') {
        await updateUserRole(env, user.id, 'admin')
        user.role = 'admin'
      }
    }

    // Create session token
    const session = await createSession(env, user.id)

    // Generate magic link
    const loginUrl = `${env.APP_URL}/auth/verify?token=${session.token}`

    // Send email
    const { html, text } = generateMagicLinkEmail(loginUrl, email)
    await sendEmail(env, {
      to: email,
      subject: 'Sign in to Feature Voting',
      html,
      text,
    })

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Check your email for a login link' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Login request error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to send login email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

/**
 * Verify magic link token and create session
 * GET /api/auth/verify?token=xxx
 */
export async function handleVerifyToken(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find session by token
    const session = await getSessionByToken(env, token)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if expired
    if (session.expires_at < Date.now()) {
      await deleteSession(env, session.id)
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user
    const user = await getUserById(env, session.user_id)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update last login
    await updateLastLogin(env, user.id)

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      token: session.token,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Verify token error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to verify token' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

/**
 * Get current user from session token
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
export async function handleGetCurrentUser(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.substring(7)
    const session = await getSessionByToken(env, token)

    if (!session || session.expires_at < Date.now()) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const user = await getUserById(env, session.user_id)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
        status: user.status,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Get current user error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to get user' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

/**
 * Logout (delete session)
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.substring(7)
    const session = await getSessionByToken(env, token)

    if (session) {
      await deleteSession(env, session.id)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Logout error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to logout' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

/**
 * SSO auto-login with signed link from external apps
 * GET /api/auth/sso?userId=xxx&expires=xxx&sig=xxx
 * sig = hex(HMAC-SHA256(`${userId}.${expires}`, SSO_SECRET))
 * Maps external userId to a synthetic user `sso-${userId}@sso.local`
 */
export async function handleSSOLogin(request: Request, env: Env): Promise<Response> {
  try {
    // Fail closed: SSO is a security boundary, no graceful degradation
    if (!env.SSO_SECRET) {
      return new Response(JSON.stringify({ error: 'SSO is not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const expires = url.searchParams.get('expires')
    const sig = url.searchParams.get('sig')

    if (!userId || !expires || !sig) {
      return new Response(JSON.stringify({ error: 'Missing SSO parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate formats. userId charset excludes '@' so the synthetic email stays well-formed
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid userId format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!/^\d{13}$/.test(expires)) {
      return new Response(JSON.stringify({ error: 'Invalid expires format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expiresAt = parseInt(expires, 10)
    const now = Date.now()

    // Link must not be expired nor valid for more than 10 minutes
    if (now > expiresAt) {
      return new Response(JSON.stringify({ error: 'SSO link expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (expiresAt - now > 10 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'Invalid SSO link' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify HMAC signature
    const signatureValid = await verifySSOSignature(env.SSO_SECRET, userId, expires, sig)
    if (!signatureValid) {
      return new Response(JSON.stringify({ error: 'Invalid SSO signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find or create the synthetic user
    const email = `sso-${userId}@sso.local`
    let user = await getUserByEmail(env, email)
    if (!user) {
      user = await createUser(env, email)
    }

    if (user.status === 'banned') {
      return new Response(JSON.stringify({ error: 'Account is banned' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create session and update last login
    const session = await createSession(env, user.id)
    await updateLastLogin(env, user.id)

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      token: session.token,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('SSO login error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to login via SSO' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

// Helper functions

/**
 * Compute HMAC-SHA256 over `${userId}.${expires}` and compare with provided
 * hex signature in constant time.
 */
async function verifySSOSignature(secret: string, userId: string, expires: string, sig: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${userId}.${expires}`))
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')

  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.toLowerCase().charCodeAt(i)
  }
  return diff === 0
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const result = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first()

  if (!result) return null

  return {
    id: result.id as string,
    email: result.email as string,
    name: result.name as string | null,
    avatar_url: result.avatar_url as string | null,
    role: (result.role as UserRole) || 'user',
    status: (result.status as string) || 'active',
    created_at: result.created_at as number,
    last_login_at: result.last_login_at as number | null,
  }
}

async function getUserById(env: Env, id: string): Promise<User | null> {
  const result = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first()

  if (!result) return null

  return {
    id: result.id as string,
    email: result.email as string,
    name: result.name as string | null,
    avatar_url: result.avatar_url as string | null,
    role: (result.role as UserRole) || 'user',
    status: (result.status as string) || 'active',
    created_at: result.created_at as number,
    last_login_at: result.last_login_at as number | null,
  }
}

async function createUser(env: Env, email: string): Promise<User> {
  const id = crypto.randomUUID()
  const now = Date.now()
  
  // Check if email should be admin
  const shouldBeAdmin = await isAdminEmail(email, env)
  const role = shouldBeAdmin ? 'admin' : 'user'

  await env.DB.prepare(`
    INSERT INTO users (id, email, role, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, email, role, 'active', now).run()

  return {
    id,
    email,
    name: null,
    avatar_url: null,
    role,
    status: 'active',
    created_at: now,
    last_login_at: null,
  }
}

async function createSession(env: Env, userId: string): Promise<Session> {
  const id = crypto.randomUUID()
  const token = crypto.randomUUID() + crypto.randomUUID() // Long token
  const now = Date.now()
  const expiresAt = now + (15 * 60 * 1000) // 15 minutes

  await env.DB.prepare(`
    INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, userId, token, expiresAt, now).run()

  return {
    id,
    user_id: userId,
    token,
    expires_at: expiresAt,
    created_at: now,
  }
}

async function getSessionByToken(env: Env, token: string): Promise<Session | null> {
  const result = await env.DB.prepare('SELECT * FROM user_sessions WHERE token = ?')
    .bind(token)
    .first()

  if (!result) return null

  return {
    id: result.id as string,
    user_id: result.user_id as string,
    token: result.token as string,
    expires_at: result.expires_at as number,
    created_at: result.created_at as number,
  }
}

async function deleteSession(env: Env, id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM user_sessions WHERE id = ?')
    .bind(id)
    .run()
}

async function updateLastLogin(env: Env, userId: string): Promise<void> {
  await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
    .bind(Date.now(), userId)
    .run()
}

async function updateUserRole(env: Env, userId: string, role: UserRole): Promise<void> {
  await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
    .bind(role, userId)
    .run()
}

// Export helper for other handlers to verify user session
export async function verifyUserSession(request: Request, env: Env): Promise<User | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const session = await getSessionByToken(env, token)

  if (!session || session.expires_at < Date.now()) {
    return null
  }

  return await getUserById(env, session.user_id)
}
