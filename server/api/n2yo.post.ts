/**
 * N2YO.com API Proxy
 * Handles CORS and API key management for N2YO satellite data
 */

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { action, apiKey, ...params } = body

    if (!apiKey) {
      throw createError({
        statusCode: 400,
        statusMessage: 'N2YO API key is required'
      })
    }

    let url = ''
    let responseData = null

    switch (action) {
      case 'radiopasses':
        const { noradId, observerLat, observerLng, observerAlt = 0, days = 3, minElevation = 10 } = params
        
        if (!noradId || !observerLat || !observerLng) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Missing required parameters: noradId, observerLat, observerLng'
          })
        }

        url = `https://api.n2yo.com/rest/v1/satellite/radiopasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${days}/${minElevation}&apiKey=${apiKey}`
        break

      case 'tle':
        const { noradId: tleNoradId } = params
        
        if (!tleNoradId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Missing required parameter: noradId'
          })
        }

        url = `https://api.n2yo.com/rest/v1/satellite/tle/${tleNoradId}&apiKey=${apiKey}`
        break

      case 'positions':
        const { noradId: posNoradId, observerLat: posLat, observerLng: posLng, observerAlt: posAlt = 0, seconds = 60 } = params
        
        if (!posNoradId || !posLat || !posLng) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Missing required parameters: noradId, observerLat, observerLng'
          })
        }

        url = `https://api.n2yo.com/rest/v1/satellite/positions/${posNoradId}/${posLat}/${posLng}/${posAlt}/${seconds}&apiKey=${apiKey}`
        break

      case 'test':
        // Test connection with ISS (NORAD ID 25544)
        url = `https://api.n2yo.com/rest/v1/satellite/tle/25544&apiKey=${apiKey}`
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Unknown action: ${action}. Supported actions: radiopasses, tle, positions, test`
        })
    }

    console.log(`🛰️ N2YO API request: ${action}`, { url: url.replace(apiKey, '***') })

    // Make request to N2YO API
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`🛰️ N2YO API error: ${response.status}`, errorText)
      
      throw createError({
        statusCode: response.status,
        statusMessage: `N2YO API error: ${response.status} ${response.statusText}`
      })
    }

    responseData = await response.json()

    // Check for API errors in response
    if (responseData.error) {
      console.error('🛰️ N2YO API response error:', responseData.error)
      throw createError({
        statusCode: 400,
        statusMessage: `N2YO API error: ${responseData.error}`
      })
    }

    console.log(`🛰️ N2YO API success: ${action}`, {
      transactionsCount: responseData.info?.transactionscount,
      passesCount: responseData.passescount || 'N/A'
    })

    return {
      success: true,
      data: responseData,
      action,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('🛰️ N2YO API proxy error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `N2YO API proxy error: ${error.message}`
    })
  }
})
