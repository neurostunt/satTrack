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
        const { noradId: radioNoradId, observerLat: radioLat, observerLng: radioLng, observerAlt: radioAlt = 0, days: radioDays = 3, minElevation = 10 } = params
        
        if (!radioNoradId || !radioLat || !radioLng) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Missing required parameters: noradId, observerLat, observerLng'
          })
        }

        url = `https://api.n2yo.com/rest/v1/satellite/radiopasses/${radioNoradId}/${radioLat}/${radioLng}/${radioAlt}/${radioDays}/${minElevation}&apiKey=${apiKey}`
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
          statusMessage: `Unknown action: ${action}. Supported actions: radiopasses, tle, positions, above, test`
        })
    }

    console.log(`🛰️ N2YO API request: ${action}`, { url: url.replace(apiKey, '***') })

    // Make request to N2YO API with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    let response
    try {
      response = await fetch(url, {
        signal: controller.signal
      })
      clearTimeout(timeout)
    } catch (error: any) {
      clearTimeout(timeout)
      if (error.name === 'AbortError') {
        throw createError({
          statusCode: 504,
          statusMessage: 'N2YO API request timeout - endpoint took too long to respond'
        })
      }
      throw error
    }
    
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
    
    if ((error as any).statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `N2YO API proxy error: ${(error as any).message}`
    })
  }
})
