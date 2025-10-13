/**
 * Composable for real-time satellite search using SatNOGS API
 * Provides debounced search functionality for both satellite names and NORAD IDs
 */

export const useSatelliteSearch = () => {
  const isLoading = ref(false)
  const error = ref(null)
  const searchResults = ref([])
  const searchQuery = ref('')
  const searchTimeout = ref(null)

  /**
   * Search satellites by name or NORAD ID
   * @param {string} query - Search query (satellite name or NORAD ID)
   * @param {string} token - SatNOGS API token
   * @param {number} limit - Maximum number of results (default: 20)
   * @returns {Promise<Array>} Array of satellite search results
   */
  const searchSatellites = async (query, token, limit = 20) => {
    // For numeric queries (NORAD ID), require at least 3 digits
    // For text queries (satellite names), require at least 3 characters
    const minLength = /^\d+$/.test(query) ? 3 : 3

    if (!query || query.length < minLength) {
      searchResults.value = []
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/satnogs', {
        method: 'POST',
        body: {
          action: 'search',
          query: query.trim(),
          limit
          // Note: token is not required for search action
        }
      })

      if (response.success) {
        const rawResults = response.data || []
        const formattedResults = rawResults.map(formatSatellite)
        searchResults.value = formattedResults
        return formattedResults
      } else {
        throw new Error(response.message || 'Search failed')
      }
    } catch (err) {
      error.value = err.message || 'Search failed'
      console.error('Satellite search error:', err)
      searchResults.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Debounced search function
   * Triggers search after user stops typing for 300ms
   * @param {string} query - Search query
   * @param {string} token - SatNOGS API token (not used for search, kept for compatibility)
   * @param {number} limit - Maximum number of results
   */
  const debouncedSearch = (query, token, limit = 20) => {
    // Clear existing timeout
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
    }

    // Set new timeout
    searchTimeout.value = setTimeout(() => {
      searchSatellites(query, token, limit)
    }, 300)
  }

  /**
   * Clear search results and reset state
   */
  const clearSearch = () => {
    searchResults.value = []
    searchQuery.value = ''
    error.value = null
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
      searchTimeout.value = null
    }
  }

  /**
   * Format satellite for display
   * @param {Object} satellite - Satellite object from SatNOGS API
   * @returns {Object} Formatted satellite object
   */
  const formatSatellite = (satellite) => {
    return {
      noradId: satellite.norad_cat_id,
      name: satellite.name,
      names: satellite.names || '',
      status: satellite.status,
      operator: satellite.operator || 'Unknown',
      countries: satellite.countries || '',
      launched: satellite.launched,
      website: satellite.website || '',
      image: satellite.image || '',
      satId: satellite.sat_id
    }
  }

  /**
   * Check if query is a NORAD ID (numeric)
   * @param {string} query - Search query
   * @returns {boolean} True if query is numeric
   */
  const isNoradId = (query) => {
    return /^\d+$/.test(query.trim())
  }

  /**
   * Get search suggestions based on current query
   * @param {string} query - Current search query
   * @returns {Array} Array of formatted satellite suggestions
   */
  const getSuggestions = (query) => {
    if (!query || query.length < 3) return []

    return searchResults.value
      .map(formatSatellite)
      .filter(sat =>
        sat.name.toLowerCase().includes(query.toLowerCase()) ||
        sat.names.toLowerCase().includes(query.toLowerCase()) ||
        sat.noradId.toString().includes(query)
      )
      .slice(0, 10) // Limit to 10 suggestions
  }

  // Cleanup timeout on unmount
  onUnmounted(() => {
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
    }
  })

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    searchResults: readonly(searchResults),
    searchQuery,

    // Methods
    searchSatellites,
    debouncedSearch,
    clearSearch,
    formatSatellite,
    isNoradId,
    getSuggestions
  }
}
