import { ref, computed } from 'vue'
import { useSecureStorage } from './useSecureStorage'
import type { StorageSettings } from '~/types/storage'

// Default settings
const defaultSettings: StorageSettings = {
  trackedSatellites: [],
  spaceTrackUsername: '',
  spaceTrackPassword: '',
  satnogsToken: '',
  n2yoApiKey: '',
  updateInterval: 5000,
  observationLocation: {
    latitude: 44.958341,
    longitude: 20.416665,
    altitude: 0
  },
  transmitterFilters: {
    showOnly2m70cm: false
  },
  gridSquare: 'KN04FXQL',
  useGPS: true,
  minElevation: 20,
  distanceUnits: 'km',
  compassType: 'true', // Always use True North for satellite tracking (azimuth coordinates are in True North)
  autoUpdateTLE: false,
  soundAlerts: false,
  highAccuracyGPS: false,
  autoCalibrateCompass: false,
  enableDeviceOrientation: false
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
    
    // Get runtime config from .env file (if available)
    let envCredentials = {
      spaceTrackUsername: '',
      spaceTrackPassword: '',
      satnogsToken: '',
      n2yoApiKey: ''
    }
    
    try {
      const config = useRuntimeConfig()
      envCredentials = {
        spaceTrackUsername: config.public.spaceTrackUsername || '',
        spaceTrackPassword: config.public.spaceTrackPassword || '',
        satnogsToken: config.public.satnogsToken || '',
        n2yoApiKey: config.public.n2yoApiKey || ''
      }
    } catch {
      // Runtime config not available (e.g., during SSR)
      console.log('Runtime config not available, skipping .env credentials')
    }
    
    if (storedSettings) {
      // Migrate old transmitterFilters format to new format if needed
      let transmitterFilters: any = storedSettings.transmitterFilters || defaultSettings.transmitterFilters

      // Check if old format exists and migrate to new simple format
      if (transmitterFilters && typeof transmitterFilters === 'object') {
        // If it has old format fields, migrate to new format
        if ('radioAmateur' in transmitterFilters || 'amateur' in transmitterFilters || 'weather' in transmitterFilters) {
          // Old format - migrate to new simple format
          // If any old filter was enabled, default to false (show all)
          // User can enable the new filter if they want
          transmitterFilters = {
            showOnly2m70cm: false
          }
        } else if (!('showOnly2m70cm' in transmitterFilters)) {
          // Ensure new field exists
          transmitterFilters = { ...defaultSettings.transmitterFilters }
        }
      } else {
        transmitterFilters = { ...defaultSettings.transmitterFilters }
      }

      // Ensure the field exists with proper default
      if (transmitterFilters.showOnly2m70cm === undefined) {
        transmitterFilters.showOnly2m70cm = false
      }

      // Merge stored settings with .env credentials
      // Priority: stored settings > .env values (only use .env if stored value is empty)
      const mergedCredentials = {
        spaceTrackUsername: storedSettings.spaceTrackUsername || envCredentials.spaceTrackUsername,
        spaceTrackPassword: storedSettings.spaceTrackPassword || envCredentials.spaceTrackPassword,
        satnogsToken: storedSettings.satnogsToken || envCredentials.satnogsToken,
        n2yoApiKey: storedSettings.n2yoApiKey || envCredentials.n2yoApiKey
      }

      // Deep clone to ensure nested objects are mutable
      settings.value = {
        ...defaultSettings,
        ...storedSettings,
        ...mergedCredentials, // Override with merged credentials
        transmitterFilters,
        observationLocation: {
          ...defaultSettings.observationLocation,
          ...storedSettings.observationLocation
        }
      }
    } else {
      // No stored settings, use .env credentials if available
      settings.value = {
        ...defaultSettings,
        ...envCredentials
      }
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
      names: satellite.names,
      image: satellite.image || undefined // Include image field
    })) // Convert Proxy Objects to plain objects

    const cleanSettings: StorageSettings = {
      trackedSatellites: cleanTrackedSatellites,
      spaceTrackUsername: settings.value.spaceTrackUsername,
      spaceTrackPassword: settings.value.spaceTrackPassword,
      satnogsToken: settings.value.satnogsToken,
      n2yoApiKey: settings.value.n2yoApiKey,
      updateInterval: settings.value.updateInterval,
      observationLocation: settings.value.observationLocation,
      transmitterFilters: { ...settings.value.transmitterFilters },
      gridSquare: settings.value.gridSquare,
      useGPS: settings.value.useGPS,
      minElevation: settings.value.minElevation,
      distanceUnits: settings.value.distanceUnits,
      compassType: settings.value.compassType,
      autoUpdateTLE: settings.value.autoUpdateTLE,
      soundAlerts: settings.value.soundAlerts,
      highAccuracyGPS: settings.value.highAccuracyGPS,
      autoCalibrateCompass: settings.value.autoCalibrateCompass,
      enableDeviceOrientation: settings.value.enableDeviceOrientation
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
    settings,
    isSettingsLoaded,
    loadSettings,
    saveSettings,
    resetSettings,
    updateSettings: async (updates: Partial<StorageSettings>) => {
      settings.value = { ...settings.value, ...updates }
      await saveSettings()
    }
  }
}

