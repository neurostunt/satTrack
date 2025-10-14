<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">Additional Settings</h3>

      <div class="space-y-4">
        <!-- Update Interval -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Update Interval</label>
          <select
            :value="settings.updateInterval"
            @change="$emit('update:settings', { ...settings, updateInterval: $event.target.value })"
            class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="1000">1 second</option>
            <option value="2000">2 seconds</option>
            <option value="5000">5 seconds</option>
            <option value="10000">10 seconds</option>
          </select>
        </div>

        <!-- Units -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Distance Units</label>
          <select
            :value="settings.units"
            @change="$emit('update:settings', { ...settings, units: $event.target.value })"
            class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="metric">Metric (km)</option>
            <option value="imperial">Imperial (miles)</option>
          </select>
        </div>

        <!-- Compass Type -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Compass Type</label>
          <select
            :value="settings.compassType"
            @change="$emit('update:settings', { ...settings, compassType: $event.target.value })"
            class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="magnetic">Magnetic</option>
            <option value="true">True North</option>
          </select>
        </div>

        <!-- Minimum Elevation -->
        <div>
          <label class="block text-xs font-medium text-space-300 mb-1">Minimum Elevation for Pass Schedule</label>
          <div class="flex items-center gap-2">
            <input
              :value="settings.minimumElevation"
              @input="$emit('update:settings', { ...settings, minimumElevation: parseFloat($event.target.value) || 0 })"
              type="number"
              min="0"
              max="90"
              step="0.1"
              placeholder="5.0"
              class="flex-1 bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
            />
            <span class="text-xs text-space-400">degrees</span>
          </div>
          <p class="text-xs text-space-500 mt-1">
            Only passes with elevation above this value will be calculated and displayed
          </p>
        </div>

        <!-- Auto-update TLE -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">Auto-update TLE data</label>
          <input
            :checked="settings.autoUpdateTLE"
            @change="$emit('update:settings', { ...settings, autoUpdateTLE: $event.target.checked })"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-2"
          />
        </div>

        <!-- Sound alerts -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">Sound alerts</label>
          <input
            :checked="settings.soundAlerts"
            @change="$emit('update:settings', { ...settings, soundAlerts: $event.target.checked })"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-2"
          />
        </div>

        <!-- High accuracy mode -->
        <div class="flex items-center justify-between">
          <label class="text-sm text-space-300">High accuracy GPS</label>
          <input
            :checked="settings.highAccuracyMode"
            @change="$emit('update:settings', { ...settings, highAccuracyMode: $event.target.checked })"
            type="checkbox"
            class="w-4 h-4 text-primary-600 bg-space-800 border-space-600 rounded focus:ring-primary-500 focus:ring-2"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings'])
</script>
