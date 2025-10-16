import { ref, computed, readonly } from 'vue'
import secureStorage from '~/utils/secureStorage'

// Default settings
const defaultSettings = {
  trackedSatellites: [],
  spaceTrackUsername: '',
  spaceTrackPassword: '',
  satnogsToken: '',
  updateInterval: 5000,
  distanceUnits: 'km',
  compassType: 'magnetic',
  autoUpdateTLE: false,
  soundAlerts: false,
  highAccuracyGPS: false,
  autoCalibrateCompass: false,
  minimumElevation: 5.0,

  // Transmitter filters
  transmitterFilters: {
    amateur: true,
    fm: true,
    cw: true,
    aprs: true,
    sstv: true,
    telemetry: true,
    voice: true,
    repeater: true,
    beacon: true,
    weather: true,
    communication: true
  }
}

// Reactive state
const settings = ref({ ...defaultSettings })

// Computed
const isSettingsLoaded = computed(() => Object.keys(settings.value).length > 0)

// Functions
const loadSettings = async () => {
  try {
    const storedSettings = await secureStorage.getSettings()
    if (storedSettings) {
      settings.value = { ...defaultSettings, ...storedSettings }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    settings.value = { ...defaultSettings }
  }
}

const saveSettings = async () => {
  try {
    // Create a clean settings object without functions or circular references
    const cleanTrackedSatellites = settings.value.trackedSatellites.map(satellite => ({
      noradId: satellite.noradId,
      name: satellite.name,
      status: satellite.status,
      names: satellite.names
    })) // Convert Proxy Objects to plain objects

    console.log('🔍 Debug: Original trackedSatellites:', settings.value.trackedSatellites)
    console.log('🔍 Debug: Clean trackedSatellites:', cleanTrackedSatellites)

    const cleanSettings = {
      trackedSatellites: cleanTrackedSatellites,
      spaceTrackUsername: settings.value.spaceTrackUsername,
      spaceTrackPassword: settings.value.spaceTrackPassword,
      satnogsToken: settings.value.satnogsToken,
      updateInterval: settings.value.updateInterval,
      distanceUnits: settings.value.distanceUnits,
      compassType: settings.value.compassType,
      autoUpdateTLE: settings.value.autoUpdateTLE,
      soundAlerts: settings.value.soundAlerts,
      highAccuracyGPS: settings.value.highAccuracyGPS,
      autoCalibrateCompass: settings.value.autoCalibrateCompass,
      minimumElevation: settings.value.minimumElevation,
      transmitterFilters: { ...settings.value.transmitterFilters } // Deep copy the filters object
    }

    console.log('🔍 Debug: Saving clean settings:', cleanSettings)
    await secureStorage.storeSettings(cleanSettings)
    console.log('Settings saved successfully')
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

const resetSettings = () => {
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
    updateSettings: (updates) => {
      settings.value = { ...settings.value, ...updates }
    }
  }
}
