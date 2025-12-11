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
 */
async function handleSatcat(noradId: number) {
  const url = `https://celestrak.org/satcat/records.php?CATNR=${noradId}&FORMAT=JSON`
  console.log('Making request to CelesTrak SATCAT:', url)

  const response = await fetchWithTimeout(url, { method: 'GET' }, 15000)

  console.log('CelesTrak SATCAT API response status:', response.status)

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `CelesTrak SATCAT API error: ${response.status} ${response.statusText}`
    })
  }

  const data = await response.json()

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `No SATCAT data found for NORAD ${noradId} in CelesTrak`
    })
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
