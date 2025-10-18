/**
 * Space-Track.org Proxy API Route
 * Handles CORS by making server-side requests
 */

// Nuxt server functions are auto-imported
declare const defineEventHandler: any
declare const getMethod: any
declare const createError: any
declare const readBody: any
declare const $fetch: any

export default defineEventHandler(async (event: any) => {
  const method = getMethod(event)

  console.log('Space-Track API called:', { method, timestamp: new Date().toISOString() })

  if (method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  const body = await readBody(event)
  const { username, password, action } = body

  console.log('Request body:', {
    username: username ? `${username.substring(0, 3)}***` : 'missing',
    password: password ? `***${password.length} chars` : 'missing',
    action
  })

  if (!username || !password) {
    console.error('Missing credentials')
    throw createError({
      statusCode: 400,
      statusMessage: 'Username and password required'
    })
  }

  try {
    if (action === 'login') {
      // Login to Space-Track.org
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

    if (action === 'fetchTLE') {
      const { noradIds } = body

      if (!noradIds || !Array.isArray(noradIds)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'NORAD IDs array required'
        })
      }

      try {
        // Use Node.js built-in fetch with manual cookie management
        const baseUrl = 'https://www.space-track.org'
        let cookies = ''

        // Step 1: Login and save session cookie (like curl -c cookies.txt)
        console.log('Logging into Space-Track.org...')
        const loginController = new AbortController()
        const loginTimeout = setTimeout(() => loginController.abort(), 15000) // 15 second timeout
        
        let loginResponse
        try {
          loginResponse = await fetch(`${baseUrl}/ajaxauth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `identity=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
            signal: loginController.signal
          })
          clearTimeout(loginTimeout)
        } catch (error: any) {
          clearTimeout(loginTimeout)
          if (error.name === 'AbortError') {
            throw new Error('Space-Track.org login timeout - endpoint took too long to respond')
          }
          throw error
        }

        // Extract cookies from login response
        const setCookieHeader = loginResponse.headers.get('set-cookie')
        if (setCookieHeader) {
          cookies = setCookieHeader
          console.log('Session cookie received:', cookies.substring(0, 50) + '...')
        }

        if (!loginResponse.ok) {
          const errorText = await loginResponse.text()
          console.error('Login failed:', loginResponse.status, errorText)
          throw new Error(`Login failed with status: ${loginResponse.status} - ${errorText}`)
        }

        console.log('Login successful, fetching TLE data...')

        // Step 2: Query using saved cookie (like curl -b cookies.txt)
        const noradIdString = noradIds.join(',')
        const tleController = new AbortController()
        const tleTimeout = setTimeout(() => tleController.abort(), 20000) // 20 second timeout for TLE data
        
        let tleResponse
        try {
          tleResponse = await fetch(`${baseUrl}/basicspacedata/query/class/tle_latest/NORAD_CAT_ID/${noradIdString}/format/json`, {
            headers: {
              'Cookie': cookies
            },
            signal: tleController.signal
          })
          clearTimeout(tleTimeout)
        } catch (error: any) {
          clearTimeout(tleTimeout)
          if (error.name === 'AbortError') {
            throw new Error('Space-Track.org TLE fetch timeout - endpoint took too long to respond')
          }
          throw error
        }

        if (!tleResponse.ok) {
          const errorText = await tleResponse.text()
          console.error('TLE fetch failed:', tleResponse.status, errorText)
          throw new Error(`TLE fetch failed with status: ${tleResponse.status} - ${errorText}`)
        }

        const tleData = await tleResponse.json()
        console.log('TLE data fetched successfully:', tleData.length, 'satellites')

        return {
          success: true,
          message: 'TLE data fetched successfully from Space-Track.org',
          data: tleData,
          isFallback: false
        }
      } catch (loginError) {
        // If login fails, throw error - no fallback data
        console.error('Space-Track.org login failed:', loginError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Space-Track.org authentication failed',
          data: {
            error: loginError instanceof Error ? loginError.message : 'Unknown error',
            details: 'Check credentials and try again'
          }
        })
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid action'
    })

  } catch (error) {
    console.error('Space-Track API error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    throw createError({
      statusCode: 500,
      statusMessage: 'Space-Track API request failed',
      data: {
        error: errorMessage,
        details: 'Check credentials and try again'
      }
    })
  }
})
