/**
 * AMSAT Database API Proxy
 * Fetches transmitter data from AMSAT GitHub repository
 * Used as fallback when SatNOGS doesn't have transmitter data
 */

import { fetchWithTimeout, buildHeaders, handleApiError, validateRequired, createSuccessResponse } from '../utils/apiHelpers'
import { API_ENDPOINTS } from '~/constants/api'

// Cache for AMSAT data
let amsatActiveCache: any[] | null = null
let amsatAllCache: any[] | null = null
let amsatCacheTime: number = 0
const AMSAT_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event)
    const { action, ...params } = body

    console.log('AMSAT API called:', { method: 'POST', action, timestamp: new Date().toISOString() })

    if (action === 'transmitters') {
      return await handleTransmitters(params)
    }

    throw createError({
      statusCode: 400,
      statusMessage: `Unknown action: ${action}`
    })

  } catch (error: any) {
    handleApiError(error, 'AMSAT')
  }
})

/**
 * Handle transmitters endpoint
 * Fetches AMSAT transmitter data for a specific NORAD ID
 */
async function handleTransmitters(params: any): Promise<any> {
  validateRequired(params, ['noradId'], 'AMSAT')

  const { noradId } = params
  const noradIdStr = noradId.toString()

  // Try active frequencies first
  try {
    const activeData = await fetchAMSATActiveData()
    const activeResults = activeData.filter(item => item.norad_id === noradIdStr)

    if (activeResults.length > 0) {
      console.log(`Found ${activeResults.length} active AMSAT frequency records for NORAD ${noradId}`)
      const transmitters = activeResults.map((item, index) => convertAMSATToTransmitter(item, index))
      return createSuccessResponse(transmitters, 'transmitters', `Found ${transmitters.length} transmitters from AMSAT`)
    }
  } catch (error) {
    console.warn(`Failed to fetch active frequencies for NORAD ${noradId}, trying all frequencies:`, error)
  }

  // Fallback to all frequencies (includes historical/inactive)
  try {
    const allData = await fetchAMSATAllData()
    const allResults = allData.filter(item => item.norad_id === noradIdStr)

    if (allResults.length > 0) {
      console.log(`Found ${allResults.length} AMSAT frequency records (including inactive) for NORAD ${noradId}`)
      const transmitters = allResults.map((item, index) => convertAMSATToTransmitter(item, index))
      return createSuccessResponse(transmitters, 'transmitters', `Found ${transmitters.length} transmitters from AMSAT`)
    }
  } catch (error) {
    console.error(`Failed to fetch all frequencies for NORAD ${noradId}:`, error)
  }

  // No data found
  return createSuccessResponse([], 'transmitters', 'No AMSAT transmitter data found')
}

/**
 * Fetch AMSAT active frequencies data from GitHub
 */
async function fetchAMSATActiveData(): Promise<any[]> {
  const now = Date.now()
  if (amsatActiveCache && (now - amsatCacheTime) < AMSAT_CACHE_DURATION) {
    console.log('Using cached AMSAT active frequencies data')
    return amsatActiveCache
  }

  try {
    const url = `${API_ENDPOINTS.AMSAT.BASE_URL}${API_ENDPOINTS.AMSAT.ACTIVE_FREQUENCIES}`
    console.log(`Fetching AMSAT active frequencies from: ${url}`)

    const headers = buildHeaders(null, { 'Accept': 'application/json' })
    const response = await fetchWithTimeout(url, { method: 'GET', headers }, 15000)

    if (!response.ok) {
      throw new Error(`AMSAT API error: ${response.status}`)
    }

    const data = await response.json()
    amsatActiveCache = data
    amsatCacheTime = now

    console.log(`Fetched ${data.length} AMSAT active frequency records`)
    return data
  } catch (error) {
    console.error('Failed to fetch AMSAT active frequencies:', error)
    if (amsatActiveCache) {
      console.log('Using expired AMSAT active cache due to fetch error')
      return amsatActiveCache
    }
    throw error
  }
}

/**
 * Fetch AMSAT all frequencies data from GitHub (includes historical/inactive)
 */
async function fetchAMSATAllData(): Promise<any[]> {
  const now = Date.now()
  if (amsatAllCache && (now - amsatCacheTime) < AMSAT_CACHE_DURATION) {
    console.log('Using cached AMSAT all frequencies data')
    return amsatAllCache
  }

  try {
    const url = `${API_ENDPOINTS.AMSAT.BASE_URL}${API_ENDPOINTS.AMSAT.ALL_FREQUENCIES}`
    console.log(`Fetching AMSAT all frequencies from: ${url}`)

    const headers = buildHeaders(null, { 'Accept': 'application/json' })
    const response = await fetchWithTimeout(url, { method: 'GET', headers }, 20000)

    if (!response.ok) {
      throw new Error(`AMSAT API error: ${response.status}`)
    }

    const data = await response.json()
    amsatAllCache = data
    amsatCacheTime = now

    console.log(`Fetched ${data.length} AMSAT all frequency records`)
    return data
  } catch (error) {
    console.error('Failed to fetch AMSAT all frequencies:', error)
    if (amsatAllCache) {
      console.log('Using expired AMSAT all cache due to fetch error')
      return amsatAllCache
    }
    throw error
  }
}

/**
 * Parse frequency string and return both low and high frequencies
 * Handles formats like: "435.310", "145.850-145.950", "145.640/145.660"
 */
function parseFrequencyRange(freqStr: string | null): { low: number | null; high: number | null } {
  if (!freqStr) return { low: null, high: null }

  // Handle multiple frequencies separated by / (take first)
  const parts = freqStr.split('/')
  const firstPart = parts[0] || freqStr

  // Handle ranges (e.g., "145.685-145.665")
  const rangeParts = firstPart.split('-')
  const lowStr = (rangeParts[0] || firstPart).trim()
  const highStr = rangeParts.length > 1 && rangeParts[1] ? rangeParts[1].trim() : null

  const lowFreq = parseFloat(lowStr)
  const highFreq = highStr ? parseFloat(highStr) : null

  // Convert MHz to Hz
  return {
    low: isNaN(lowFreq) ? null : lowFreq * 1000000,
    high: (highFreq && !isNaN(highFreq)) ? highFreq * 1000000 : null
  }
}

/**
 * Convert AMSAT frequency data to Transmitter format
 * Matches SatNOGS format with underscore field names
 */
function convertAMSATToTransmitter(amsatData: any, index: number): any {
  // Parse frequency ranges
  const downlinkRange = parseFrequencyRange(amsatData.downlink)
  const uplinkRange = parseFrequencyRange(amsatData.uplink)
  const beaconRange = parseFrequencyRange(amsatData.beacon)

  // Use beacon as downlink if no downlink specified
  const finalDownlinkLow = downlinkRange.low || beaconRange.low
  const finalDownlinkHigh = downlinkRange.high || beaconRange.high

  // Create clean description
  const description = amsatData.mode || 'Amateur radio satellite transmitter'

  // Determine transmitter type based on mode
  let type = 'unknown'
  const modeLower = (amsatData.mode || '').toLowerCase()
  if (modeLower && (modeLower.includes('fm') || modeLower.includes('ctcss'))) type = 'fm'
  if (modeLower && modeLower.includes('ssb')) type = 'ssb'
  if (modeLower && modeLower.includes('cw')) type = 'cw'
  if (modeLower && (modeLower.includes('bpsk') || modeLower.includes('fsk') || modeLower.includes('gmsk'))) type = 'digital'
  if (modeLower && modeLower.includes('beacon')) type = 'beacon'
  if (modeLower && modeLower.includes('telemetry')) type = 'telemetry'

  // Return in SatNOGS format with underscores
  return {
    id: `amsat-${amsatData.norad_id}-${index}`,
    noradId: parseInt(amsatData.norad_id),
    description,
    mode: amsatData.mode || 'Unknown',
    // Use underscore format to match SatNOGS API response
    downlink_low: finalDownlinkLow || undefined,
    downlink_high: finalDownlinkHigh || undefined,
    uplink_low: uplinkRange.low || undefined,
    uplink_high: uplinkRange.high || undefined,
    // Also include camelCase for compatibility
    downlinkLow: finalDownlinkLow || undefined,
    downlinkHigh: finalDownlinkHigh || undefined,
    uplinkLow: uplinkRange.low || undefined,
    uplinkHigh: uplinkRange.high || undefined,
    // Frequency fields
    frequency: finalDownlinkLow || uplinkRange.low || beaconRange.low || undefined,
    downlinkFrequency: finalDownlinkLow || undefined,
    uplinkFrequency: uplinkRange.low || undefined,
    callsign: amsatData.callsign || undefined,
    status: 'active' as const,
    type,
    invert: false,
    baud: null,
    modulation: amsatData.mode || undefined,
    source: 'amsat' // Mark as from AMSAT
  }
}

