/**
 * CelesTrak API Server Endpoint
 * Provides TLE data from CelesTrak as a tertiary fallback source
 *
 * CelesTrak is a free service that provides TLE data without authentication
 */

import { fetchWithTimeout, handleApiError, validateRequired, createSuccessResponse } from '../utils/apiHelpers'

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    const { noradId, action } = body

    console.log('CelesTrak API called:', { action, noradId, timestamp: new Date().toISOString() })

    validateRequired(body, ['noradId'], 'CelesTrak')

    if (action === 'satcat') {
      return await handleSatcat(noradId)
    }

    if (action !== 'tle') {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown action: ${action}. Supported actions: 'tle', 'satcat'`
      })
    }

    // Build CelesTrak URL
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`
    console.log('Making request to CelesTrak:', url)

    // Make request with timeout
    const response = await fetchWithTimeout(url, { method: 'GET' }, 15000)

    console.log('CelesTrak API response status:', response.status)

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `CelesTrak API error: ${response.status} ${response.statusText}`
      })
    }

    // Parse TLE format (3 lines: name, line1, line2)
    const textData = await response.text()
    const lines = textData.trim().split('\n')

    if (lines.length < 3 || !lines[0] || !lines[1] || !lines[2]) {
      throw createError({
        statusCode: 404,
        statusMessage: `No TLE data found for NORAD ${noradId} in CelesTrak`
      })
    }

    return createSuccessResponse(
      {
        tle0: lines[0].trim(),
        tle1: lines[1].trim(),
        tle2: lines[2].trim(),
        norad_cat_id: noradId,
        tle_source: 'CelesTrak',
        updated: new Date().toISOString()
      },
      'tle',
      `TLE data retrieved from CelesTrak for NORAD ${noradId}`
    )

  } catch (error: any) {
    handleApiError(error, 'CelesTrak')
  }
})

/**
 * Handle SATCAT (Satellite Catalog) data fetching from CelesTrak
 * Returns detailed satellite information including launch site, object type, size, etc.
 * 
 * Note: Returns null data (not an error) if SATCAT data is not available for a satellite.
 * This is expected behavior - not all satellites have SATCAT data.
 * 
 * IMPORTANT: CelesTrak is geo-blocked and only accessible from US IP addresses.
 * For production deployment, ensure the server is hosted in the US (e.g., AWS us-east-1, Vercel US region).
 * Alternative: Use a US-based proxy service for CelesTrak requests.
 * If server is not in US, this will return null gracefully without errors.
 */
async function handleSatcat(noradId: number) {
  const url = `https://celestrak.org/satcat/records.php?CATNR=${noradId}&FORMAT=JSON`

  let response: Response
  try {
    response = await fetchWithTimeout(url, { method: 'GET' }, 20000) // Increased timeout to 20s
  } catch {
    // Network errors, timeouts, geo-blocking, etc. - return null data gracefully
    // CelesTrak is geo-blocked outside the US - this is expected if server is not in US
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId} (CelesTrak unavailable)`
    )
  }

  if (!response.ok) {
    // For non-200 status codes, return null data instead of throwing error
    // This is expected - not all satellites have SATCAT data, or may be geo-blocked
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId}`
    )
  }

  // Read response as text first (we can always parse JSON from text, but can't read text after JSON parse fails)
  const textData = await response.text()
  const trimmedText = textData.trim()
  
  // Check for empty response
  if (trimmedText.length === 0) {
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId} (empty response)`
    )
  }
  
  // Check if it's an error message (expected case - no data available)
  if (trimmedText.includes('No SATCAT') || trimmedText.includes('not found') || trimmedText.includes('No records')) {
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId}`
    )
  }

  // Try to parse as JSON
  let data: any
  try {
    data = JSON.parse(trimmedText)
  } catch {
    // Invalid JSON format - return null gracefully
    console.error(`CelesTrak SATCAT returned invalid JSON for NORAD ${noradId}`)
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId} (invalid JSON)`
    )
  }

  // Validate data structure
  if (!data) {
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId}`
    )
  }
  
  if (!Array.isArray(data)) {
    // Maybe it's a single object? Try to handle it
    if (typeof data === 'object' && data.OBJECT_NAME) {
      data = [data]
    } else {
      return createSuccessResponse(
        null,
        'satcat',
        `No SATCAT data available for NORAD ${noradId} (unexpected format)`
      )
    }
  }
  
  if (data.length === 0) {
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId} (empty array)`
    )
  }

  // Return first result (should be only one for a specific NORAD ID)
  const satcatData = data[0]

  return createSuccessResponse(
    {
      objectName: satcatData.OBJECT_NAME,
      objectId: satcatData.OBJECT_ID, // International Designator
      noradCatId: satcatData.NORAD_CAT_ID,
      objectType: satcatData.OBJECT_TYPE, // PAY, R/B, DEB, etc.
      opsStatusCode: satcatData.OPS_STATUS_CODE, // + (operational), - (non-operational), etc.
      owner: satcatData.OWNER,
      launchDate: satcatData.LAUNCH_DATE,
      launchSite: satcatData.LAUNCH_SITE, // Launch site code
      decayDate: satcatData.DECAY_DATE || null,
      period: satcatData.PERIOD, // Orbital period in minutes
      inclination: satcatData.INCLINATION,
      apogee: satcatData.APOGEE, // km
      perigee: satcatData.PERIGEE, // km
      rcs: satcatData.RCS, // Radar Cross Section (size indicator) in m²
      orbitCenter: satcatData.ORBIT_CENTER,
      orbitType: satcatData.ORBIT_TYPE,
      dataStatusCode: satcatData.DATA_STATUS_CODE || null
    },
    'satcat',
    `SATCAT data retrieved from CelesTrak for NORAD ${noradId}`
  )
}
