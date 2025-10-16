import { ref, computed, readonly } from 'vue'
import { useSecureStorage } from './useSecureStorage'
import type { StorageSettings } from '~/types/storage'

// Default settings
const defaultSettings: StorageSettings = {
  trackedSatellites: [],
  spaceTrackUsername: '',
  spaceTrackPassword: '',
  satnogsToken: '',
  updateInterval: 5000,
  observationLocation: {
    latitude: 44.958341,
    longitude: 20.416665,
    altitude: 0
  },
  transmitterFilters: {
    amateur: true,
    data: true,
    voice: true,
    repeater: true,
    beacon: true,
    weather: true,
    communication: true
  },
  gridSquare: 'KN04FXQL',
  useGPS: true,
  minElevation: 5.0
}

// Reactive state
const settings = ref({ ...defaultSettings })

// Use storage composable
const storage = useSecureStorage()

// Computed
const isSettingsLoaded = computed(() => Object.keys(settings.value).length > 0)

// Functions
const loadSettings = async (): Promise<void> => {
  try {
    const storedSettings = await storage.getSettings()
    if (storedSettings) {
      settings.value = { ...defaultSettings, ...storedSettings }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    settings.value = { ...defaultSettings }
  }
}

const saveSettings = async (): Promise<void> => {
  try {
    // Create a clean settings object without functions or circular references
    const cleanTrackedSatellites = settings.value.trackedSatellites.map((satellite: any) => ({
      noradId: satellite.noradId,
      name: satellite.name,
      status: satellite.status,
      names: satellite.names
    })) // Convert Proxy Objects to plain objects

    const cleanSettings: StorageSettings = {
      trackedSatellites: cleanTrackedSatellites,
      spaceTrackUsername: settings.value.spaceTrackUsername,
      spaceTrackPassword: settings.value.spaceTrackPassword,
      satnogsToken: settings.value.satnogsToken,
      updateInterval: settings.value.updateInterval,
      observationLocation: settings.value.observationLocation,
      transmitterFilters: { ...settings.value.transmitterFilters },
      gridSquare: settings.value.gridSquare,
      useGPS: settings.value.useGPS,
      minElevation: settings.value.minElevation
    }

    await storage.storeSettings(cleanSettings)
    console.log('Settings saved successfully')
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

const resetSettings = (): void => {
  settings.value = { ...defaultSettings }
}

// Export composable
export const useSettings = () => {
  return {
    settings: readonly(settings),
    isSettingsLoaded,
    loadSettings,
    saveSettings,
    resetSettings,
    updateSettings: (updates: Partial<StorageSettings>) => {
      settings.value = { ...settings.value, ...updates }
    }
  }
}
