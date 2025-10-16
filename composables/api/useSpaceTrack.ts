/**
 * Space-Track.org API Composable
 * Handles login, session management, and TLE data fetching
 */

import { ref, readonly } from 'vue'
import { USER_AGENT } from '~/constants/api'
import type { TLEData } from '~/types/satellite'

export const useSpaceTrack = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const isLoggedIn = ref<boolean>(false)
  const sessionCookie = ref<string | null>(null)

  /**
   * Login to Space-Track.org via proxy
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      console.log('Attempting Space-Track.org login via proxy...')

      const response = await fetch('/api/space-track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        },
        body: JSON.stringify({
          username,
          password,
          action: 'login'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log('Space-Track.org login successful')
        isLoggedIn.value = true
        return true
      }

      console.error('Space-Track.org login failed:', data.message)
      error.value = data.message || 'Login failed'
      isLoggedIn.value = false
      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login error'
      console.error('Space-Track.org login error:', err)
      isLoggedIn.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch TLE data for specified NORAD IDs via proxy
   */
  const fetchTLEData = async (noradIds: number[], username: string, password: string): Promise<TLEData[]> => {
    try {
      isLoading.value = true
      error.value = null
      console.log('Fetching TLE data for NORAD IDs:', noradIds)

      const response = await fetch('/api/space-track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        },
        body: JSON.stringify({
          username,
          password,
          action: 'fetchTLE',
          noradIds
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log('TLE data fetched successfully:', data.data.length, 'satellites')
        return data.data
      } else {
        console.error('TLE data fetch failed:', data.message)
        error.value = data.message || 'TLE fetch failed'
        throw new Error(`TLE fetch failed: ${data.message}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'TLE fetch error'
      console.error('TLE data fetch error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Test connection to Space-Track.org
   */
  const testConnection = async (username: string, password: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null

      // Test by fetching TLE data for ISS (NORAD ID 25544)
      const testData = await fetchTLEData([25544], username, password)
      return testData && testData.length > 0
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Connection test failed'
      console.error('Connection test failed:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get session status
   */
  const getSessionStatus = (): boolean => {
    return isLoggedIn.value
  }

  /**
   * Logout from Space-Track.org
   */
  const logout = (): void => {
    sessionCookie.value = null
    isLoggedIn.value = false
    error.value = null
    console.log('Logged out from Space-Track.org')
  }

  /**
   * Clear error state
   */
  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    isLoggedIn: readonly(isLoggedIn),
    sessionCookie: readonly(sessionCookie),

    // Methods
    login,
    fetchTLEData,
    testConnection,
    getSessionStatus,
    logout,
    clearError
  }
}
