<template>
  <svg
    :class="[
      'transition-transform duration-300',
      { 'rotate-180': isExpanded },
      iconClass
    ]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
  </svg>
</template>

<script setup>
defineProps({
  isExpanded: {
    type: Boolean,
    default: false
  },
  iconClass: {
    type: String,
    default: 'w-4 h-4 text-space-400'
  }
})
</script>

