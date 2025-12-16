<template>
  <div class="min-h-screen space-gradient">
    <PWAStatus />
    <NuxtPage />
  </div>
</template>

<script setup>
const hasTouch = () => {
  if (typeof navigator === 'undefined') return false
  return navigator.maxTouchPoints > 0
}

const isMobile = () => {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent || ''
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
  const isMobileUserAgent = mobileRegex.test(userAgent)
  const hasTouchScreen = 'ontouchstart' in window || hasTouch()
  const isSmallScreen = window.innerWidth < 768
  return isMobileUserAgent || (hasTouchScreen && isSmallScreen)
}

if (import.meta.dev && isMobile()) {
  import('vconsole').then((VConsole) => {
    new VConsole.default()
  })
}

import { preloadPolarPlotBackground } from '~/composables/pass-predict/usePolarPlotBackground'
preloadPolarPlotBackground()
</script>
