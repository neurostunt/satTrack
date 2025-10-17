<template>
  <div
    class="bg-space-900 border border-space-600 rounded p-3"
    :class="{ 
      'bg-space-800': isExpanded,
      'passing-card': isPassing
    }"
  >
    <!-- Clickable Header -->
    <PassHeader
      :pass="pass"
      :is-expanded="isExpanded"
      :is-passing="isPassing"
      :format-time-until-pass="formatTimeUntilPass"
      :get-pass-status="getPassStatus"
      @toggle="toggleExpanded"
    />

    <!-- Collapsible Content -->
    <Transition
      name="slide-down"
      enter-active-class="transition-all duration-700 ease-out"
      leave-active-class="transition-all duration-500 ease-in"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[2000px] opacity-100"
      leave-from-class="max-h-[2000px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div
        v-show="isExpanded"
        class="overflow-hidden"
      >
        <PassDetails
          :pass="pass"
          :get-t-l-e-data="getTLEData"
          :get-satellite-data="getSatelliteData"
          :format-pass-time="formatPassTime"
          :format-pass-duration="formatPassDuration"
          :format-time-until-pass="formatTimeUntilPass"
          :get-pass-status="getPassStatus"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import PassHeader from './PassHeader.vue'
import PassDetails from './PassDetails.vue'

defineProps({
  pass: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  isPassing: {
    type: Boolean,
    default: false
  },
  formatTimeUntilPass: {
    type: Function,
    required: true
  },
  getPassStatus: {
    type: Function,
    required: true
  },
  getTLEData: {
    type: Function,
    required: true
  },
  getSatelliteData: {
    type: Function,
    required: true
  },
  formatPassTime: {
    type: Function,
    required: true
  },
  formatPassDuration: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['toggle'])

const toggleExpanded = () => {
  emit('toggle')
}
</script>
