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
 */
async function handleSatcat(noradId: number) {
  const url = `https://celestrak.org/satcat/records.php?CATNR=${noradId}&FORMAT=JSON`
  console.log('Making request to CelesTrak SATCAT:', url)

  const response = await fetchWithTimeout(url, { method: 'GET' }, 15000)

  console.log('CelesTrak SATCAT API response status:', response.status)

  if (!response.ok) {
    // For non-200 status codes, return null data instead of throwing error
    // This is expected - not all satellites have SATCAT data
    console.log(`CelesTrak SATCAT returned ${response.status} for NORAD ${noradId} - no data available`)
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId}`
    )
  }

  // Read response as text first (we can always parse JSON from text, but can't read text after JSON parse fails)
  const textData = await response.text()
  
  // Check if it's an error message (expected case - no data available)
  if (textData.includes('No SATCAT') || textData.includes('not found') || textData.includes('No records')) {
    console.log(`No SATCAT data available for NORAD ${noradId} (expected)`)
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId}`
    )
  }

  // Try to parse as JSON
  let data: any
  try {
    data = JSON.parse(textData)
  } catch {
    // Invalid JSON format - log as warning but return null
    console.warn(`CelesTrak SATCAT returned invalid JSON for NORAD ${noradId}:`, textData.substring(0, 100))
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId}`
    )
  }

  // Validate data structure
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log(`No SATCAT data available for NORAD ${noradId} (expected)`)
    return createSuccessResponse(
      null,
      'satcat',
      `No SATCAT data available for NORAD ${noradId}`
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
