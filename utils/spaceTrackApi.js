/**
 * Space-Track.org API Integration
 * Handles login, session management, and TLE data fetching
 */

class SpaceTrackAPI {
  constructor() {
    this.baseUrl = 'https://www.space-track.org'
    this.sessionCookie = null
    this.isLoggedIn = false
  }

  /**
   * Login to Space-Track.org via proxy
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   * @returns {Promise<boolean>} - Success status
   */
  async login(username, password) {
    try {
      console.log('Attempting Space-Track.org login via proxy...')
      
      const response = await fetch('/api/space-track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        this.isLoggedIn = true
        return true
      }
      
      console.error('Space-Track.org login failed:', data.message)
      this.isLoggedIn = false
      return false
    } catch (error) {
      console.error('Space-Track.org login error:', error)
      this.isLoggedIn = false
      return false
    }
  }

  /**
   * Fetch TLE data for specified NORAD IDs via proxy
   * @param {number[]} noradIds - Array of NORAD catalog IDs
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   * @returns {Promise<Object>} - TLE data with metadata
   */
  async fetchTLEData(noradIds, username, password) {
    try {
      console.log('Fetching TLE data for NORAD IDs:', noradIds)
      
      const response = await fetch('/api/space-track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error(`TLE fetch failed: ${data.message}`)
      }
    } catch (error) {
      console.error('TLE data fetch error:', error)
      throw error
    }
  }

  /**
   * Test connection to Space-Track.org
   * @param {string} username - Space-Track username
   * @param {string} password - Space-Track password
   * @returns {Promise<boolean>} - Connection test result
   */
  async testConnection(username, password) {
    try {
      const loginSuccess = await this.login(username, password)
      if (loginSuccess) {
        // Test with a simple query
        const testData = await this.fetchTLEData([25544], username, password) // ISS
        return testData && testData.length > 0
      }
      return false
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * Get session status
   * @returns {boolean} - Login status
   */
  getSessionStatus() {
    return this.isLoggedIn
  }

  /**
   * Logout from Space-Track.org
   */
  logout() {
    this.sessionCookie = null
    this.isLoggedIn = false
    console.log('Logged out from Space-Track.org')
  }
}

// Create singleton instance
const spaceTrackAPI = new SpaceTrackAPI()

export default spaceTrackAPI
