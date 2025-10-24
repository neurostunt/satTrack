<template>
  <div class="min-h-screen space-gradient">
    <PWAStatus />
    <NuxtPage />
  </div>
</template>

<script setup>
// PWA is automatically handled by @vite-pwa/nuxt
// UnoCSS provides utility classes for styling

// Preload polar plot background SVG for better performance
// This ensures the SVG is ready before any pass cards are opened
import { preloadPolarPlotBackground } from '~/composables/pass-predict/usePolarPlotBackground'

// Preload the background SVG immediately
preloadPolarPlotBackground()
</script>
