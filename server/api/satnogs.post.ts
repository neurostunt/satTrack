/**
 * SatNOGS DB API Proxy
 * Handles satellite data, TLE, transmitters, and search functionality
 *
 * Note: Read-only (GET) requests do not require authentication
 * Authentication is only needed for write operations (POST, PUT, DELETE)
 */

import { fetchWithTimeout, buildHeaders, handleApiError, validateRequired, createSuccessResponse } from '../utils/apiHelpers'

export default defineEventHandler(async (event: any) => {
  try {
    const method = getMethod(event)
    
    console.log('📡 SatNOGS API called:', { 
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
      console.error('❌ SatNOGS: Failed to read request body:', bodyError.message)
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid request body: ${bodyError.message}`
      })
    }

    const { token, action, ...params } = body || {}

    console.log('📡 SatNOGS Request body parsed:', { 
      token: token ? token.substring(0, 8) + '...' : 'none', 
      action: action || 'missing',
      params: Object.keys(params),
      hasNoradId: !!(params?.noradId),
      noradId: params?.noradId
    })

    // Validate action
    if (!action) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Action is required'
      })
    }

    // Handle special actions that need custom processing
    if (action === 'transmitters') {
      console.log('📡 SatNOGS: Handling transmitters action')
      return await handleTransmitters(body, token)
    }

    if (action === 'combined-data') {
      console.log('📡 SatNOGS: Handling combined-data action')
      return await handleCombinedData(params, token)
    }

    // Build URL for standard actions
    console.log('📡 SatNOGS: Building URL for action:', action)
    const url = buildSatnogsUrl(action, params)

    if (!url) {
      console.error('❌ SatNOGS: Unknown action:', action)
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown action: ${action}`
      })
    }

    console.log('📡 SatNOGS: Making request to:', url)

    // Make request with optional authentication
    const headers = buildHeaders(token)
    console.log('📡 SatNOGS: Request headers:', { 
      hasAuth: !!headers.Authorization,
      userAgent: headers['User-Agent']
    })

    let response
    try {
      response = await fetchWithTimeout(url, { method: 'GET', headers }, 15000)
    } catch (fetchError: any) {
      console.error('❌ SatNOGS: Fetch error:', {
        message: fetchError.message,
        name: fetchError.name
      })
      throw fetchError
    }

    console.log('📡 SatNOGS API response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ SatNOGS API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500)
      })
      throw createError({
        statusCode: response.status,
        statusMessage: `SatNOGS API error: ${response.status} ${response.statusText}`
      })
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError: any) {
      console.error('❌ SatNOGS: Failed to parse JSON response:', jsonError.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'SatNOGS API returned invalid JSON response'
      })
    }

    console.log('📡 SatNOGS: Response data received:', {
      action,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      hasData: !!data
    })

    // Client-side filtering for search
    if (action === 'search' && Array.isArray(data)) {
      const beforeFilter = data.length
      data = filterSearchResults(data, params.query, params.limit || 20)
      console.log('📡 SatNOGS: Search filtered:', { before: beforeFilter, after: data.length })
    }

    const result = createSuccessResponse(
      data,
      action,
      action === 'test' ? 'SatNOGS API authentication successful' : `SatNOGS API ${action} successful`
    )

    console.log('✅ SatNOGS: Request successful for action:', action)
    return result

  } catch (error: any) {
    // Enhanced error logging
    const errorDetails = {
      message: error?.message || 'Unknown error',
      statusCode: error?.statusCode || error?.status,
      name: error?.name,
      stack: error?.stack?.substring(0, 500)
    }
    
    console.error('❌ SatNOGS API top-level error:', errorDetails)
    console.error('❌ Full error object:', error)
    
    handleApiError(error, 'SatNOGS')
  }
})

/**
 * Build SatNOGS API URL based on action
 */
function buildSatnogsUrl(action: string, params: any): string | null {
  const baseUrl = 'https://db.satnogs.org/api'

  switch (action) {
    case 'test':
      // Test with ISS (NORAD ID 25544)
      return `${baseUrl}/satellites/?norad_cat_id=25544`

    case 'tle':
      validateRequired(params, ['noradId'], 'SatNOGS')
      return `${baseUrl}/tle/?norad_cat_id=${params.noradId}&format=json`

    case 'satellites':
      // If noradId is provided, fetch specific satellite, otherwise fetch list
      if (params.noradId) {
        return `${baseUrl}/satellites/?norad_cat_id=${params.noradId}`
      }
    {
      const limit = params.limit || 100
      return `${baseUrl}/satellites/?limit=${limit}`
    }

    case 'search':
      validateRequired(params, ['query'], 'SatNOGS')
      // Fetch 500 satellites for client-side filtering
      return `${baseUrl}/satellites/?limit=500`

    case 'transmitter-details':
      validateRequired(params, ['transmitterId'], 'SatNOGS')
      return `${baseUrl}/transmitters/${params.transmitterId}/`

    case 'telemetry':
      validateRequired(params, ['satId'], 'SatNOGS')
      return `${baseUrl}/telemetry/?satellite=${params.satId}`

    default:
      return null
  }
}

/**
 * Handle transmitters endpoint (special case with query params)
 * Falls back to AMSAT if SatNOGS returns no data
 */
async function handleTransmitters(body: any, token: string | null): Promise<any> {
  const { noradId, satId } = body

  if (!noradId && !satId) {
    return { success: false, message: 'NORAD ID or Sat ID is required' }
  }

  // Build query parameters
  const queryParams = new URLSearchParams()
  if (noradId) {
    queryParams.append('satellite__norad_cat_id', noradId.toString())
  }
  if (satId) {
    queryParams.append('sat_id', satId.toString())
  }
  queryParams.append('status', 'active')

  const url = `https://db.satnogs.org/api/transmitters/?${queryParams.toString()}`
  console.log(`Fetching transmitters from SatNOGS: ${url}`)

  const headers = buildHeaders(token, { 'User-Agent': 'SatTrack/1.0' })
  const response = await fetchWithTimeout(url, { headers }, 15000)

  if (!response.ok) {
    throw new Error(`SatNOGS transmitters API error: ${response.status}`)
  }

  let data = await response.json()
  console.log(`Found ${data.length} transmitters from SatNOGS`)

  // If SatNOGS returns no data and we have a NORAD ID, try AMSAT fallback
  if ((!data || data.length === 0) && noradId) {
    console.log(`No transmitters found in SatNOGS for NORAD ${noradId}, trying AMSAT fallback...`)
    try {
      const amsatResponse = await $fetch('/api/amsat', {
        method: 'POST',
        body: {
          action: 'transmitters',
          noradId
        }
      })

      if (amsatResponse?.success && amsatResponse.data && amsatResponse.data.length > 0) {
        console.log(`Found ${amsatResponse.data.length} transmitters from AMSAT (fallback)`)
        return createSuccessResponse(
          amsatResponse.data,
          'transmitters',
          `Found ${amsatResponse.data.length} transmitters from AMSAT (fallback)`
        )
      }
    } catch (amsatError) {
      console.error('AMSAT fallback failed:', amsatError)
    }
  }

  return createSuccessResponse(data, 'transmitters', `Found ${data.length} transmitters`)
}

/**
 * Handle combined-data endpoint (satellite + transmitters)
 * Falls back to AMSAT if SatNOGS returns no transmitter data
 */
async function handleCombinedData(params: any, token: string | null): Promise<any> {
  validateRequired(params, ['noradId'], 'SatNOGS')

  const { noradId } = params
  const baseUrl = 'https://db.satnogs.org/api'
  const headers = buildHeaders(token)

  // Step 1: Get satellite info
  const satelliteUrl = `${baseUrl}/satellites/?norad_cat_id=${noradId}`
  const satelliteResponse = await fetchWithTimeout(satelliteUrl, { headers }, 15000)

  if (!satelliteResponse.ok) {
    throw createError({
      statusCode: satelliteResponse.status,
      statusMessage: `Failed to fetch satellite data: ${satelliteResponse.statusText}`
    })
  }

  const satelliteData = await satelliteResponse.json()
  if (!satelliteData || satelliteData.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `No satellite found with NORAD ID: ${noradId}`
    })
  }

  const satnogsId = satelliteData[0].id

  // Step 2: Get transmitters from SatNOGS
  let transmittersData = []
  try {
    const transmittersUrl = satnogsId
      ? `${baseUrl}/transmitters/?sat_id=${satnogsId}`
      : `${baseUrl}/transmitters/?satellite__norad_cat_id=${noradId}`

    const transmittersResponse = await fetchWithTimeout(transmittersUrl, { headers }, 15000)

    if (!transmittersResponse.ok) {
      throw createError({
        statusCode: transmittersResponse.status,
        statusMessage: `Failed to fetch transmitters: ${transmittersResponse.statusText}`
      })
    }

    transmittersData = await transmittersResponse.json()
    console.log(`Found ${transmittersData.length} transmitters from SatNOGS for NORAD ${noradId}`)
  } catch (error) {
    console.warn(`Failed to fetch SatNOGS transmitters for NORAD ${noradId}:`, error)
  }

  // Step 3: If no transmitters from SatNOGS, try AMSAT fallback
  if ((!transmittersData || transmittersData.length === 0) && noradId) {
    console.log(`Trying AMSAT fallback for NORAD ${noradId}...`)
    try {
      const amsatResponse = await $fetch('/api/amsat', {
        method: 'POST',
        body: {
          action: 'transmitters',
          noradId
        }
      })

      if (amsatResponse?.success && amsatResponse.data && amsatResponse.data.length > 0) {
        console.log(`Found ${amsatResponse.data.length} transmitters from AMSAT (fallback)`)
        transmittersData = amsatResponse.data
      }
    } catch (amsatError) {
      console.error('AMSAT fallback failed:', amsatError)
    }
  }

  return createSuccessResponse(
    {
      satellite: satelliteData[0],
      transmitters: transmittersData,
      noradId,
      satnogsId
    },
    'combined-data',
    'Combined satellite and transponder data retrieved successfully'
  )
}

/**
 * Filter search results client-side
 */
function filterSearchResults(data: any[], query: string, limit: number): any[] {
  const searchQuery = query.toLowerCase()
  const isNumeric = /^\d+$/.test(query)

  if (isNumeric && data.length > 1) {
    // Filter by partial NORAD ID match
    return data
      .filter(sat => sat.norad_cat_id && sat.norad_cat_id.toString().includes(query))
      .slice(0, limit)
  } else if (!isNumeric) {
    // Filter by name
    return data
      .filter(sat =>
        sat.name?.toLowerCase().includes(searchQuery) ||
        sat.names?.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit)
  }

  return data.slice(0, limit)
}
