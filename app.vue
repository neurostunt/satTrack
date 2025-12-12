<template>
  <div class="min-h-screen space-gradient">
    <PWAStatus />
    <NuxtPage />
    <!-- PWA Install Button -->
    <ClientOnly>
      <PWAInstallButton />
    </ClientOnly>
  </div>
</template>

<script setup>
// PWA is automatically handled by @vite-pwa/nuxt
// UnoCSS provides utility classes for styling

// Detect touch capability
const hasTouch = () => {
  if (typeof navigator === 'undefined') return false
  return navigator.maxTouchPoints > 0
}

// Detect mobile device
const isMobile = () => {
  if (typeof window === 'undefined') return false
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || ''
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
  const isMobileUserAgent = mobileRegex.test(userAgent)
  
  // Check for touch support
  const hasTouchScreen = 'ontouchstart' in window || hasTouch()
  
  // Check screen width (mobile typically < 768px)
  const isSmallScreen = window.innerWidth < 768
  
  return isMobileUserAgent || (hasTouchScreen && isSmallScreen)
}

// Enable mobile debugging console (only in dev mode and on mobile devices)
if (import.meta.dev && isMobile()) {
  import('vconsole').then((VConsole) => {
    new VConsole.default()
  })
}

// Preload polar plot background SVG for better performance
// This ensures the SVG is ready before any pass cards are opened
import { preloadPolarPlotBackground } from '~/composables/pass-predict/usePolarPlotBackground'

// Preload the background SVG immediately
preloadPolarPlotBackground()
</script>
