/**
 * N2YO.com API Proxy
 * Handles CORS and API key management for N2YO satellite data
 */

import { fetchWithTimeout, handleApiError, validateRequired, createSuccessResponse } from '../utils/apiHelpers'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { action, apiKey, ...params } = body

    // Validate API key
    if (!apiKey) {
      throw createError({
        status: 400,
        statusText: 'N2YO API key is required'
      })
    }

    // Build URL based on action
    const url = buildN2YOUrl(action, apiKey, params)

    console.log(`🛰️ N2YO API request: ${action}`, { url: url.replace(apiKey, '***') })

    // Make request with timeout
    const response = await fetchWithTimeout(url, {}, 15000)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`🛰️ N2YO API error: ${response.status}`, errorText)

      throw createError({
        status: response.status,
        statusText: `N2YO API error: ${response.status} ${response.statusText}`
      })
    }

    const responseData = await response.json()

    // Check for API errors in response
    if (responseData.error) {
      console.error('🛰️ N2YO API response error:', responseData.error)
      throw createError({
        status: 400,
        statusText: `N2YO API error: ${responseData.error}`
      })
    }

    console.log(`🛰️ N2YO API success: ${action}`, {
      transactionsCount: responseData.info?.transactionscount,
      passesCount: responseData.info?.passescount || responseData.passes?.length || 'N/A'
    })

    // Add server-side timestamp to response for consistent time calculations across devices
    // This ensures all devices use the same reference time, eliminating differences due to
    // system clock drift or timezone differences
    const serverTimestamp = Date.now()
    const responseWithTimestamp = {
      ...responseData,
      serverTimestamp // Server-side timestamp in milliseconds (UTC)
    }

    return createSuccessResponse(responseWithTimestamp, action)

  } catch (error) {
    handleApiError(error, 'N2YO')
  }
})

/**
 * Build N2YO API URL based on action
 */
function buildN2YOUrl(action: string, apiKey: string, params: any): string {
  const baseUrl = 'https://api.n2yo.com/rest/v1/satellite'

  switch (action) {
    case 'radiopasses': {
      validateRequired(params, ['noradId', 'observerLat', 'observerLng'], 'N2YO')
      const { noradId, observerLat, observerLng, observerAlt = 0, days = 3, minElevation = 10 } = params
      return `${baseUrl}/radiopasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${days}/${minElevation}&apiKey=${apiKey}`
    }

    case 'tle': {
      validateRequired(params, ['noradId'], 'N2YO')
      return `${baseUrl}/tle/${params.noradId}&apiKey=${apiKey}`
    }

    case 'positions': {
      validateRequired(params, ['noradId', 'observerLat', 'observerLng'], 'N2YO')
      const { noradId, observerLat, observerLng, observerAlt = 0, seconds = 60 } = params
      return `${baseUrl}/positions/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${seconds}&apiKey=${apiKey}`
    }

    case 'above': {
      // Get satellites above observer location (includes catalog info like launch date)
      validateRequired(params, ['observerLat', 'observerLng'], 'N2YO')
      const { observerLat, observerLng, observerAlt = 0, searchRadius = 70, categoryId = 0 } = params
      return `${baseUrl}/above/${observerLat}/${observerLng}/${observerAlt}/${searchRadius}/${categoryId}&apiKey=${apiKey}`
    }

    case 'test':
      // Test connection with ISS (NORAD ID 25544)
      return `${baseUrl}/tle/25544&apiKey=${apiKey}`

    default:
      throw createError({
        status: 400,
        statusText: `Unknown action: ${action}. Supported actions: radiopasses, tle, positions, above, test`
      })
  }
}
