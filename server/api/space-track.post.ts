/**
 * Space-Track.org Proxy API Route
 * Handles authentication and TLE data fetching from Space-Track.org
 */

import { fetchWithTimeout, handleApiError, validateRequired } from '../utils/apiHelpers'

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

  // Validate credentials
  validateRequired(body, ['username', 'password'], 'Space-Track')

  try {
    switch (action) {
      case 'login':
        return await handleLogin(username, password)

      case 'fetchTLE':
        return await handleFetchTLE(username, password, body.noradIds)

      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid action: ${action}. Supported actions: login, fetchTLE`
        })
    }
  } catch (error) {
    handleApiError(error, 'Space-Track')
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

  // Extract session cookie
  const setCookieHeader = loginResponse.headers.get('set-cookie')
  const cookies = setCookieHeader || ''

  if (cookies) {
    console.log('Session cookie received:', cookies.substring(0, 50) + '...')
  }

  console.log('Login successful, fetching TLE data...')

  // Step 2: Fetch TLE data using session cookie
  const noradIdString = noradIds.join(',')
  const tleUrl = `${baseUrl}/basicspacedata/query/class/tle_latest/NORAD_CAT_ID/${noradIdString}/format/json`

  const tleResponse = await fetchWithTimeout(
    tleUrl,
    {
      headers: {
        'Cookie': cookies
      }
    },
    20000 // 20 second timeout for TLE data
  )

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
}
