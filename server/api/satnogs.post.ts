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
    const body = await readBody(event)
    const { token, action, ...params } = body

    console.log('SatNOGS API called:', { method: 'POST', timestamp: new Date().toISOString() })
    console.log('Request body:', { token: token ? token.substring(0, 8) + '...' : 'none', action, ...params })

    // Handle special actions that need custom processing
    if (action === 'transmitters') {
      return await handleTransmitters(body, token)
    }

    if (action === 'combined-data') {
      return await handleCombinedData(params, token)
    }

    // Build URL for standard actions
    const url = buildSatnogsUrl(action, params)

    if (!url) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown action: ${action}`
      })
    }

    console.log('Making request to:', url)

    // Make request with optional authentication
    const headers = buildHeaders(token)
    const response = await fetchWithTimeout(url, { method: 'GET', headers }, 15000)

    console.log('SatNOGS API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SatNOGS API error response:', errorText)
      throw createError({
        statusCode: response.status,
        statusMessage: `SatNOGS API error: ${response.status} ${response.statusText}`
      })
    }

    let data = await response.json()

    // Client-side filtering for search
    if (action === 'search' && Array.isArray(data)) {
      data = filterSearchResults(data, params.query, params.limit || 20)
    }

    return createSuccessResponse(
      data,
      action,
      action === 'test' ? 'SatNOGS API authentication successful' : `SatNOGS API ${action} successful`
    )

  } catch (error: any) {
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
      const limit = params.limit || 100
      return `${baseUrl}/satellites/?limit=${limit}`

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
  console.log(`Fetching transmitters from: ${url}`)

  const headers = buildHeaders(token, { 'User-Agent': 'SatTrack/1.0' })
  const response = await fetchWithTimeout(url, { headers }, 15000)

  if (!response.ok) {
    throw new Error(`SatNOGS transmitters API error: ${response.status}`)
  }

  const data = await response.json()
  console.log(`Found ${data.length} transmitters`)

  return createSuccessResponse(data, 'transmitters', `Found ${data.length} transmitters`)
}

/**
 * Handle combined-data endpoint (satellite + transmitters)
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

  // Step 2: Get transmitters
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

  const transmittersData = await transmittersResponse.json()

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
