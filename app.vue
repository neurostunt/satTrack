<template>
  <div class="min-h-screen space-gradient">
    <!-- Header -->
    <header class="bg-space-800/50 backdrop-blur-sm border-b border-space-700">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <NuxtLink to="/" class="text-xl font-bold text-primary-400">
            SatTrack
          </NuxtLink>

          <!-- Navigation -->
          <nav class="flex items-center space-x-6">
            <NuxtLink
              to="/"
              class="text-space-300 hover:text-white transition-colors"
              :class="{ 'text-white': $route.path === '/' }"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/schedule"
              class="text-space-300 hover:text-white transition-colors"
              :class="{ 'text-white': $route.path === '/schedule' }"
            >
              Pass Schedule
            </NuxtLink>
            <NuxtLink
              to="/settings"
              class="text-space-300 hover:text-white transition-colors"
              :class="{ 'text-white': $route.path === '/settings' }"
            >
              Settings
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <PWAStatus />
      <NuxtPage />
      <Toast />
    </main>
  </div>
</template>

<script setup>
// PWA is automatically handled by @vite-pwa/nuxt
// UnoCSS provides utility classes for styling
</script>
