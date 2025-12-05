/**
 * Composable for real-time satellite search using SatNOGS API
 * Provides debounced search functionality for both satellite names and NORAD IDs
 */

import { ref, readonly } from 'vue'
import { useSatnogs } from './useSatnogs'
import type { Satellite } from '~/types/satellite'

export const useSatelliteSearch = () => {
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const searchResults = ref<Satellite[]>([])
  const searchQuery = ref<string>('')
  const searchTimeout = ref<NodeJS.Timeout | null>(null)

  // Use SatNOGS composable
  const satnogs = useSatnogs()

  /**
   * Search satellites by name or NORAD ID
   */
  const searchSatellites = async (query: string, token: string, limit: number = 20): Promise<Satellite[]> => {
    if (!query || query.length < 3) {
      searchResults.value = []
      return []
    }

    // Note: SatNOGS API doesn't require authentication for search operations
    isLoading.value = true
    error.value = null

    try {
      // Token is optional - only set if provided
      if (token) {
        satnogs.setToken(token)
      }
      const results = await satnogs.searchSatellites(query.trim(), limit)

      searchResults.value = results
      return results
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed'
      console.error('Satellite search error:', err)
      searchResults.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Debounced search function
   */
  const debouncedSearch = (query: string, token: string, limit: number = 20): void => {
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
  const clearSearch = (): void => {
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
   */
  const formatSatellite = (satellite: any): Satellite => {
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
   */
  const isNoradId = (query: string): boolean => {
    return /^\d+$/.test(query.trim())
  }

  /**
   * Get search suggestions based on current query
   */
  const getSuggestions = (query: string): Satellite[] => {
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
