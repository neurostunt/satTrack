/**
 * Space-Track.org Proxy API Route
 * Handles authentication and TLE data fetching from Space-Track.org
 */

import { fetchWithTimeout, handleApiError, validateRequired } from '../utils/apiHelpers'

// Log immediately when module loads (for debugging)
console.log('🚀 Space-Track API handler module loaded at:', new Date().toISOString())

export default defineEventHandler(async (event: any) => {
  // Log at the absolute start - before any operations
  const startTime = Date.now()
  console.log('🚀 Space-Track API handler STARTED at:', new Date().toISOString())
  
  try {
    // Log event details immediately
    try {
      console.log('🚀 Space-Track event received:', {
        hasEvent: !!event,
        hasNode: !!event?.node,
        hasReq: !!event?.node?.req,
        url: event?.node?.req?.url,
        method: event?.node?.req?.method
      })
    } catch (logError) {
      console.error('❌ Failed to log event details:', logError)
    }

    let method
    try {
      method = getMethod(event)
      console.log('🚀 Space-Track method extracted:', method)
    } catch (methodError: any) {
      console.error('❌ Failed to get method:', methodError.message)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to extract HTTP method: ${methodError.message}`
      })
    }

    console.log('Space-Track API called:', { 
      method, 
      url: event.node?.req?.url,
      timestamp: new Date().toISOString() 
    })

    if (method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed'
      })
    }

    let body
    try {
      body = await readBody(event)
    } catch (bodyError: any) {
      console.error('❌ Failed to read request body:', bodyError.message)
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid request body: ${bodyError.message}`
      })
    }

    const { username, password, action } = body || {}

    console.log('Request body parsed:', {
      username: username ? `${username.substring(0, 3)}***` : 'missing',
      password: password ? `***${password.length} chars` : 'missing',
      action: action || 'missing',
      hasNoradIds: !!(body?.noradIds),
      noradIdsCount: Array.isArray(body?.noradIds) ? body.noradIds.length : 0
    })

    // Validate credentials
    try {
      validateRequired(body, ['username', 'password'], 'Space-Track')
    } catch (validationError: any) {
      console.error('❌ Validation error:', validationError.message)
      throw validationError
    }

    try {
      switch (action) {
        case 'login':
          return await handleLogin(username, password)

        case 'fetchTLE':
          if (!body.noradIds) {
            throw createError({
              statusCode: 400,
              statusMessage: 'NORAD IDs are required for fetchTLE action'
            })
          }
          return await handleFetchTLE(username, password, body.noradIds)

        default:
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid action: ${action || 'undefined'}. Supported actions: login, fetchTLE`
          })
      }
    } catch (handlerError: any) {
      console.error('❌ Handler error:', {
        action,
        error: handlerError.message,
        stack: handlerError.stack?.substring(0, 500)
      })
      handleApiError(handlerError, 'Space-Track')
    }
  } catch (error: any) {
    // Top-level error handler - catch everything
    const errorDetails = {
      message: error?.message || 'Unknown error',
      statusCode: error?.statusCode || error?.status,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
      elapsed: Date.now() - startTime
    }
    
    // Use multiple logging methods to ensure we see the error
    console.error('❌ Space-Track API top-level error:', errorDetails)
    console.error('❌ Full error object:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error keys:', Object.keys(error || {}))
    
    // Also log to stderr directly (might be captured differently)
    process.stderr?.write?.(`Space-Track Error: ${JSON.stringify(errorDetails)}\n`)
    
    // If it's already a createError, re-throw it
    if (error?.statusCode || error?.status) {
      console.error('❌ Re-throwing createError:', error.statusCode || error.status)
      throw error
    }
    
    // Otherwise, wrap it using handleApiError (which will throw)
    console.error('❌ Wrapping error with handleApiError')
    try {
      handleApiError(error, 'Space-Track')
    } catch (handleError: any) {
      // If handleApiError itself fails, create a basic error
      console.error('❌ handleApiError also failed:', handleError.message)
      throw createError({
        statusCode: 500,
        statusMessage: `Space-Track API error: ${error?.message || 'Unknown error'}`
      })
    }
  }
})

/**
 * Handle Space-Track login
 */
async function handleLogin(username: string, password: string) {
  const loginResponse = await $fetch('https://www.space-track.org/ajaxauth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `identity=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  })

  return {
    success: true,
    message: 'Login successful',
    data: loginResponse
  }
}

/**
 * Handle TLE data fetching from Space-Track
 */
async function handleFetchTLE(username: string, password: string, noradIds: number[]) {
  validateRequired({ noradIds }, ['noradIds'], 'Space-Track')

  if (!Array.isArray(noradIds)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'NORAD IDs must be an array'
    })
  }

  const baseUrl = 'https://www.space-track.org'

  // Step 1: Login and get session cookie
  console.log('Logging into Space-Track.org...')
  const loginResponse = await fetchWithTimeout(
    `${baseUrl}/ajaxauth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `identity=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    },
    15000
  )

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text()
    console.error('Login failed:', loginResponse.status, errorText)
    throw new Error(`Login failed with status: ${loginResponse.status} - ${errorText}`)
  }

  // Verify login was successful - Space-Track returns JSON with error message if login fails
  const loginBody = await loginResponse.text()
  try {
    const loginData = JSON.parse(loginBody)
    if (loginData.error || loginData.Login || loginData === '""') {
      // Space-Track returns error in JSON or empty string on failure
      throw new Error(`Space-Track login failed: ${loginData.error || loginData.Login || 'Invalid credentials'}`)
    }
  } catch (parseError: any) {
    // If not JSON, check if it's an error message
    if (parseError.name === 'SyntaxError') {
      // Not JSON - might be HTML error page or plain text
      if (loginBody && loginBody.length > 0 && !loginBody.includes('"Login"')) {
        console.warn('Unexpected login response format (not JSON):', loginBody.substring(0, 100))
      }
    } else {
      // Re-throw if it's not a JSON parse error
      throw parseError
    }
  }

  // Extract session cookie - handle both single and multiple cookies
  // Space-Track uses 'spacetrack_session' cookie for authentication
  let cookies = ''
  
  // Try getSetCookie() first (Node.js 18+)
  if (typeof loginResponse.headers.getSetCookie === 'function') {
    const setCookieHeaders = loginResponse.headers.getSetCookie()
    if (setCookieHeaders.length > 0) {
      // Extract cookie values from Set-Cookie headers
      cookies = setCookieHeaders.map(cookie => {
        // Extract just the name=value part (before semicolon)
        const match = cookie.match(/^([^=]+=[^;]+)/)
        return match ? match[1] : cookie.split(';')[0]
      }).join('; ')
    }
  }
  
  // Fallback: try to get from set-cookie header directly (all Node versions)
  if (!cookies) {
    const setCookieHeader = loginResponse.headers.get('set-cookie')
    if (setCookieHeader) {
      // Handle both single cookie and multiple cookies (comma-separated)
      const cookieStrings = setCookieHeader.includes(',') 
        ? setCookieHeader.split(',').map(c => c.trim())
        : [setCookieHeader.trim()]
      
      // Extract cookie values from header string
      const cookieParts = cookieStrings.map(c => {
        // Extract just the name=value part (before semicolon)
        const match = c.match(/^([^=]+=[^;]+)/)
        return match ? match[1] : c.split(';')[0]
      })
      cookies = cookieParts.join('; ')
    }
  }

  if (cookies) {
    console.log('Session cookie received:', cookies.substring(0, 100) + '...')
  } else {
    console.warn('⚠️ No session cookie received from Space-Track login')
  }

  console.log('Login successful, fetching TLE data...')

  // Step 2: Fetch TLE data using session cookie  // Space-Track deprecated tle_latest on 2026-01-12, use 'gp' class instead
  // Use comma-separated NORAD IDs in predicate format
  // Format: /class/gp/NORAD_CAT_ID/25544,25338,28654/orderby/NORAD_CAT_ID,EPOCH desc/format/json
  const noradIdString = noradIds.join(',')
  const tleUrl = `${baseUrl}/basicspacedata/query/class/gp/NORAD_CAT_ID/${noradIdString}/orderby/NORAD_CAT_ID,EPOCH desc/format/json`

  console.log('Fetching TLE from Space-Track (gp class):', tleUrl)
  console.log('Using cookies:', cookies ? 'Yes' : 'No')
  console.log('NORAD IDs count:', noradIds.length)

  const tleResponse = await fetchWithTimeout(
    tleUrl,
    {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'SatTrack/1.0'
      },
      // Important: Don't redirect automatically, Space-Track might redirect on auth failure
      redirect: 'manual'
    },
    20000 // 20 second timeout for TLE data
  )

  if (!tleResponse.ok) {
    const errorText = await tleResponse.text()
    console.error('TLE fetch failed:', tleResponse.status, errorText.substring(0, 200))
    
    // Check if it's an HTML error page (common for 404/500 errors)
    if (errorText.includes('<!doctype') || errorText.includes('<html')) {
      // Try to extract meaningful error message from HTML
      const titleMatch = errorText.match(/<title>(.*?)<\/title>/i)
      const errorMsg = titleMatch ? titleMatch[1] : `HTTP ${tleResponse.status} error`
      
      // If 404, it might be an authentication issue or invalid endpoint
      if (tleResponse.status === 404) {
        throw new Error(`Space-Track API endpoint not found (404). This may indicate: 1) Invalid session cookie, 2) Incorrect API endpoint format, or 3) Space-Track API changes. Error: ${errorMsg}`)
      }
      
      throw new Error(`TLE fetch failed with status: ${tleResponse.status} - ${errorMsg}`)
    }
    
    throw new Error(`TLE fetch failed with status: ${tleResponse.status} - ${errorText.substring(0, 200)}`)
  }

  // Check if response is JSON
  const contentType = tleResponse.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const responseText = await tleResponse.text()
    console.error('Unexpected response type:', contentType, responseText.substring(0, 200))
    throw new Error(`Space-Track API returned non-JSON response. Content-Type: ${contentType}`)
  }

  const tleData = await tleResponse.json()
  
  // Handle case where Space-Track returns empty array or error in JSON
  if (!Array.isArray(tleData)) {
    console.error('Unexpected TLE data format:', typeof tleData, tleData)
    throw new Error('Space-Track API returned unexpected data format')
  }
  
  console.log('TLE data fetched successfully:', tleData.length, 'satellites')

  return {
    success: true,
    message: 'TLE data fetched successfully from Space-Track.org',
    data: tleData,
    isFallback: false
  }
}
