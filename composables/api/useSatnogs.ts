/**
 * SatNOGS API Composable
 * Handles satellite data, transmitter data, and search functionality
 */

import { ref, readonly } from 'vue'
import { USER_AGENT, API_LIMITS } from '~/constants/api'
import type { Satellite, Transmitter } from '~/types/satellite'

export const useSatnogs = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const token = ref<string | null>(null)
  const isConnected = ref<boolean>(false)

  /**
   * Set API token
   */
  const setToken = (newToken: string): void => {
    token.value = newToken
    isConnected.value = !!newToken
  }

  /**
   * Get headers for API requests
   */
  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT
    }

    if (token.value) {
      headers['Authorization'] = `Token ${token.value}`
    }

    return headers
  }

  /**
   * Search satellites by name or NORAD ID
   */
  const searchSatellites = async (query: string, limit: number = API_LIMITS.SEARCH_RESULTS): Promise<Satellite[]> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Searching satellites for: "${query}"`)

      const response = await fetch('/api/satnogs', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          token: token.value,
          action: 'search',
          query,
          limit
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log(`Found ${data.data.length} satellites for "${query}"`)
        return data.data
      } else {
        console.error('Satellite search failed:', data.message)
        error.value = data.message || 'Search failed'
        throw new Error(`Search failed: ${data.message}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search error'
      console.error('Satellite search error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch TLE data for a satellite
   */
  const fetchTLE = async (noradId: number): Promise<any[]> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Fetching TLE data for NORAD ID: ${noradId}`)

      const response = await fetch('/api/satnogs', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          token: token.value,
          action: 'tle',
          noradId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log(`TLE data fetched for NORAD ID: ${noradId}`)
        return data.data
      } else {
        console.error('TLE fetch failed:', data.message)
        error.value = data.message || 'TLE fetch failed'
        throw new Error(`TLE fetch failed: ${data.message}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'TLE fetch error'
      console.error('TLE fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch transmitters for a satellite
   */
  const fetchTransmitters = async (noradId: number): Promise<any[]> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Fetching transmitters for NORAD ID: ${noradId}`)

      const response = await fetch('/api/satnogs', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          token: token.value,
          action: 'transmitters',
          noradId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log(`Found ${data.data.length} transmitters for NORAD ID: ${noradId}`)
        return data.data
      } else {
        console.error('Transmitter fetch failed:', data.message)
        error.value = data.message || 'Transmitter fetch failed'
        throw new Error(`Transmitter fetch failed: ${data.message}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Transmitter fetch error'
      console.error('Transmitter fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch combined satellite and transmitter data
   */
  const fetchCombinedData = async (noradId: number): Promise<any> => {
    try {
      isLoading.value = true
      error.value = null
      console.log(`Fetching combined data for NORAD ID: ${noradId}`)

      const response = await fetch('/api/satnogs', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          token: token.value,
          action: 'combined-data',
          noradId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log(`Combined data fetched for NORAD ID: ${noradId}`)
        return data.data
      } else {
        console.error('Combined data fetch failed:', data.message)
        error.value = data.message || 'Combined data fetch failed'
        throw new Error(`Combined data fetch failed: ${data.message}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Combined data fetch error'
      console.error('Combined data fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Test API connection
   */
  const testConnection = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null

      const response = await fetch('/api/satnogs', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          token: token.value,
          action: 'test'
        })
      })

      if (!response.ok) {
        error.value = 'Connection test failed'
        return false
      }

      const data = await response.json()
      isConnected.value = data.success
      return data.success
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Connection test failed'
      console.error('SatNOGS connection test failed:', err)
      isConnected.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get API status
   */
  const getStatus = (): { hasToken: boolean; isConnected: boolean } => {
    return {
      hasToken: !!token.value,
      isConnected: isConnected.value
    }
  }

  /**
   * Clear error state
   */
  const clearError = (): void => {
    error.value = null
  }

  /**
   * Clear token and reset connection
   */
  const clearToken = (): void => {
    token.value = null
    isConnected.value = false
    error.value = null
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    token: readonly(token),
    isConnected: readonly(isConnected),

    // Methods
    setToken,
    searchSatellites,
    fetchTLE,
    fetchTransmitters,
    fetchCombinedData,
    testConnection,
    getStatus,
    clearError,
    clearToken
  }
}
