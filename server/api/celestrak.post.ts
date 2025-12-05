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

    if (action !== 'tle') {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown action: ${action}. Only 'tle' is supported`
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
