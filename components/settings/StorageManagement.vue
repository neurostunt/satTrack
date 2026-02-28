<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">Storage Management</h3>

      <div class="space-y-4">
        <!-- Storage Usage -->
        <div v-if="!isLoadingStorage && storageInfo.indexedDB" class="p-3 bg-space-800 border border-space-700 rounded text-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-space-300">Browser Storage:</span>
            <span class="text-primary-400">{{ storageInfo.indexedDB.used }} / {{ storageInfo.indexedDB.available }}</span>
          </div>
          <div class="w-full bg-space-700 rounded-full h-2 mb-2">
            <div
              class="bg-primary-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: storageInfo.indexedDB.percentage + '%' }"
            ></div>
          </div>
          <div class="text-space-400">
            <div>TLE Data: {{ storageInfo.indexedDB.ourData.tleData }}</div>
            <div>Transmitter Data: {{ storageInfo.indexedDB.ourData.transmitterData }}</div>
            <div>Settings: {{ storageInfo.indexedDB.ourData.settings }}</div>
            <div>Credentials: {{ storageInfo.indexedDB.ourData.credentials }}</div>
          </div>
        </div>

        <!-- Storage Actions -->
        <div class="flex gap-2 flex-wrap">
          <button
            @click="$emit('clear-tle-data')"
            class="btn-secondary text-xs px-3 py-1"
            :disabled="isClearingData"
          >
            {{ isClearingData ? 'Clearing...' : 'Clear TLE Data' }}
          </button>
          <button
            @click="$emit('clear-transmitter-data')"
            class="btn-secondary text-xs px-3 py-1"
            :disabled="isClearingData"
          >
            {{ isClearingData ? 'Clearing...' : 'Clear Transmitter Data' }}
          </button>
          <button
            @click="$emit('clear-all-data')"
            class="btn-danger text-xs px-3 py-1"
            :disabled="isClearingData"
          >
            {{ isClearingData ? 'Clearing...' : 'Clear All Data' }}
          </button>
          <button
            @click="$emit('load-example-satellites')"
            class="btn-primary text-xs px-3 py-1"
            :disabled="isLoadingExampleSatellites"
          >
            {{ isLoadingExampleSatellites ? 'Loading...' : 'Load Example Satellites' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  storageInfo: {
    type: Object,
    required: true
  },
  isLoadingStorage: {
    type: Boolean,
    default: false
  },
  isClearingData: {
    type: Boolean,
    default: false
  },
  isLoadingExampleSatellites: {
    type: Boolean,
    default: false
  }
})

defineEmits(['clear-tle-data', 'clear-transmitter-data', 'clear-all-data', 'load-example-satellites'])
</script>

<style scoped>
</style>
