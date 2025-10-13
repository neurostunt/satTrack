export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { token, action, ...params } = body

    console.log('SatNOGS API called:', { method: 'POST', timestamp: new Date().toISOString() })
    console.log('Request body:', { token: token ? token.substring(0, 8) + '...' : 'none', action, ...params })

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SatNOGS API token is required'
      })
    }

    let url = ''
    let method = 'GET'

    switch (action) {
      case 'test':
        // Use a minimal API endpoint for testing authentication
        // This should return just the ISS satellite data
        url = 'https://db.satnogs.org/api/satellites/?norad_cat_id=25544'
        break
      case 'tle':
        const tleNoradId = params.noradId
        if (!tleNoradId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'noradId is required for TLE requests'
          })
        }
        url = `https://db.satnogs.org/api/tle/?norad_cat_id=${tleNoradId}&format=json`
        break
      case 'satellites':
        const limit = params.limit || 100
        url = `https://db.satnogs.org/api/satellites/?limit=${limit}`
        break
      case 'search':
        const searchQuery = params.query
        const searchLimit = params.limit || 20

        if (!searchQuery) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Search query is required'
          })
        }
        // Check if query is numeric (NORAD ID) or text (satellite name)
        if (/^\d+$/.test(searchQuery)) {
          // Search by NORAD ID
          url = `https://db.satnogs.org/api/satellites/?norad_cat_id=${searchQuery}`
        } else {
          // Search by satellite name - fetch more results and filter client-side
          // The SatNOGS search parameter doesn't seem to work reliably
          url = `https://db.satnogs.org/api/satellites/?limit=500`
        }
        break
      case 'transmitters':
        // Fetch transmitters for a specific satellite using NORAD ID
        const { noradId: transmitterNoradId, satId: transmitterSatId } = body
        if (!transmitterNoradId && !transmitterSatId) {
          return { success: false, message: 'NORAD ID or Sat ID is required' }
        }

        let transmittersUrl = 'https://db.satnogs.org/api/transmitters/'
        const transmitterParams = new URLSearchParams()

        if (transmitterNoradId) {
          transmitterParams.append('satellite__norad_cat_id', transmitterNoradId.toString())
        }
        if (transmitterSatId) {
          transmitterParams.append('sat_id', transmitterSatId.toString())
        }

        // Add filters for active transmitters (removed service filter to include all types)
        transmitterParams.append('status', 'active')

        if (transmitterParams.toString()) {
          transmittersUrl += `?${transmitterParams.toString()}`
        }

        console.log(`Fetching transmitters from: ${transmittersUrl}`)

        const transmitterApiResponse = await fetch(transmittersUrl, {
          headers: {
            'Authorization': `Token ${token}`,
            'User-Agent': 'SatTrack/1.0'
          }
        })

        if (!transmitterApiResponse.ok) {
          throw new Error(`SatNOGS transmitters API error: ${transmitterApiResponse.status}`)
        }

        const transmitterApiData = await transmitterApiResponse.json()
        console.log(`Found ${transmitterApiData.length} transmitters`)

        return {
          success: true,
          message: `Found ${transmitterApiData.length} transmitters`,
          data: transmitterApiData,
          action: 'transmitters'
        }
      case 'transmitter-details':
        const transmitterId = params.transmitterId
        if (!transmitterId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'transmitterId is required for transmitter details'
          })
        }
        url = `https://db.satnogs.org/api/transmitters/${transmitterId}/`
        break
      case 'combined-data':
        const noradId = params.noradId
        if (!noradId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'noradId is required for combined data requests'
          })
        }
        // First get satellite info to find SatNOGS ID
        const satelliteResponse = await fetch(`https://db.satnogs.org/api/satellites/?norad_cat_id=${noradId}`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        })

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

        // Get transmitters for this satellite
        // Try by satellite ID first, then by NORAD ID if satellite ID is null
        let transmittersResponse
        if (satnogsId) {
          transmittersResponse = await fetch(`https://db.satnogs.org/api/transmitters/?sat_id=${satnogsId}`, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          })
        } else {
          // Fallback: search transmitters by NORAD ID using the correct parameter
          // Get all transmitters for this satellite (not just amateur radio)
          transmittersResponse = await fetch(`https://db.satnogs.org/api/transmitters/?satellite__norad_cat_id=${noradId}`, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          })
        }

        if (!transmittersResponse.ok) {
          throw createError({
            statusCode: transmittersResponse.status,
            statusMessage: `Failed to fetch transmitters: ${transmittersResponse.statusText}`
          })
        }

        const transmittersData = await transmittersResponse.json()

        return {
          success: true,
          message: 'Combined satellite and transponder data retrieved successfully',
          data: {
            satellite: satelliteData[0],
            transmitters: transmittersData,
            noradId: noradId,
            satnogsId: satnogsId
          },
          action
        }
      case 'telemetry':
        const telemetrySatId = params.satId
        if (!telemetrySatId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'satId is required for telemetry requests'
          })
        }
        url = `https://db.satnogs.org/api/telemetry/?satellite=${telemetrySatId}`
        break
      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Unknown action: ${action}`
        })
    }

    console.log('Making request to:', url)

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SatTrack/1.0'
      }
    })

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

    // Client-side filtering for search by name
    if (action === 'search' && Array.isArray(data) && !/^\d+$/.test(params.query)) {
      const searchQuery = params.query.toLowerCase()
      const searchLimit = params.limit || 20

      data = data.filter(satellite =>
        satellite.name.toLowerCase().includes(searchQuery) ||
        (satellite.names && satellite.names.toLowerCase().includes(searchQuery))
      ).slice(0, searchLimit)
    }

    return {
      success: true,
      message: action === 'test' ? 'SatNOGS API authentication successful' : `SatNOGS API ${action} successful`,
      data,
      action
    }

  } catch (error: any) {
    console.error('SatNOGS API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `SatNOGS API request failed: ${error.message}`
    })
  }
})
