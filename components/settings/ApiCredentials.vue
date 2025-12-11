<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">API Credentials</h3>
      <div class="space-y-4">
        <!-- Space-Track.org Credentials -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">Space-Track.org (TLE Data)</h4>
          <div class="grid grid-cols-2 gap-2">
            <div class="relative">
              <label class="block text-xs font-medium text-space-300 mb-1">Username</label>
              <input
                :value="localSettings.spaceTrackUsername"
                @input="handleInputChange('spaceTrackUsername', $event.target.value)"
                type="text"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
                placeholder="Enter username"
              />
            </div>
            <div class="relative">
              <label class="block text-xs font-medium text-space-300 mb-1">Password</label>
              <input
                :value="localSettings.spaceTrackPassword"
                @input="handleInputChange('spaceTrackPassword', $event.target.value)"
                type="password"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
                placeholder="Enter password"
              />
            </div>
          </div>
        </div>

        <!-- SatNOGS API Token -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">SatNOGS API (Transmitter Data)</h4>
          <div class="relative">
            <label class="block text-xs font-medium text-space-300 mb-1">API Token</label>
            <input
              :value="localSettings.satnogsToken"
              @input="handleInputChange('satnogsToken', $event.target.value)"
              type="password"
              class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
              placeholder="Enter your SatNOGS API token"
            />
            <div class="text-xs text-space-500 mt-1">
              Get your free API token from <a href="https://network.satnogs.org/users/edit/" target="_blank" class="text-primary-400 hover:text-primary-300">satnogs.org</a>
            </div>
          </div>
        </div>

        <!-- N2YO API Key -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">N2YO API (Pass Comparison)</h4>
          <div class="space-y-3">
            <div class="relative">
              <label class="block text-xs font-medium text-space-300 mb-1">API Key</label>
              <input
                :value="localSettings.n2yoApiKey"
                @input="handleInputChange('n2yoApiKey', $event.target.value)"
                type="password"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
                placeholder="Enter your N2YO API key"
              />
              <div class="text-xs text-space-500 mt-1">
                Get your free API key from <a href="https://www.n2yo.com/api/" target="_blank" class="text-primary-400 hover:text-primary-300">n2yo.com</a>
              </div>
            </div>

            <div class="relative">
              <label class="block text-xs font-medium text-space-300 mb-1">
                Minimum Elevation (degrees)
              </label>
              <input
                :value="localSettings.minElevation"
                @input="handleInputChange('minElevation', $event.target.value)"
                type="number"
                min="0"
                max="90"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
                placeholder="20"
              />
              <div class="text-xs text-space-500 mt-1">
                Minimum elevation angle for pass predictions (default: 20°)
              </div>
            </div>
          </div>
        </div>

        <!-- Save Credentials Button -->
        <div class="border-t border-space-600 pt-4 mt-4">
          <button
            @click="$emit('save-settings')"
            :disabled="isSavingSettings"
            class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-space-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg v-if="isSavingSettings" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isSavingSettings ? 'Saving...' : 'Save Credentials' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  isSavingSettings: {
    type: Boolean,
    default: false
  },
  updateSettings: {
    type: Function,
    required: true
  }
})

// Local reactive state for form inputs
const localSettings = ref({
  spaceTrackUsername: '',
  spaceTrackPassword: '',
  satnogsToken: '',
  n2yoApiKey: '',
  minElevation: 20
})

// Initialize local settings from props
onMounted(() => {
  localSettings.value = {
    spaceTrackUsername: props.settings.spaceTrackUsername || '',
    spaceTrackPassword: props.settings.spaceTrackPassword || '',
    satnogsToken: props.settings.satnogsToken || '',
    n2yoApiKey: props.settings.n2yoApiKey || '',
    minElevation: props.settings.minElevation || 20
  }
})

// Update local settings when props change
watch(() => props.settings, (newSettings) => {
  if (newSettings) {
    localSettings.value = {
      spaceTrackUsername: newSettings.spaceTrackUsername || '',
      spaceTrackPassword: newSettings.spaceTrackPassword || '',
      satnogsToken: newSettings.satnogsToken || '',
      n2yoApiKey: newSettings.n2yoApiKey || '',
      minElevation: newSettings.minElevation || 20
    }
  }
}, { deep: true })

// Handle input changes
const handleInputChange = (field, value) => {
  localSettings.value[field] = value
  // Update settings immediately
  props.updateSettings({
    [field]: value
  })
}
</script>

<style scoped>
/* Fix for password manager extensions like Dashlane */
.relative {
  position: relative;
  overflow: hidden;
}

.relative input {
  box-sizing: border-box;
  width: 100%;
}

/* Ensure proper spacing in grid */
.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-2 {
  gap: 0.5rem;
}
</style>
