<template>
  <!-- Desktop: Top Navigation Bar -->
  <nav class="hidden md:block fixed top-0 left-0 right-0 bg-space-900/95 backdrop-blur-sm border-b border-space-700 z-50">
    <div class="flex items-center justify-center gap-2 px-4 py-3 max-w-4xl mx-auto">
      <!-- Home / Dashboard -->
      <NuxtLink 
        to="/"
        class="nav-item-desktop"
        :class="{ 'nav-item-active': $route.path === '/' }"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
        <span class="nav-label-desktop">Home</span>
      </NuxtLink>

      <!-- Pass Predict -->
      <NuxtLink 
        to="/pass-predict"
        class="nav-item-desktop"
        :class="{ 'nav-item-active': $route.path === '/pass-predict' }"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        <span class="nav-label-desktop">Pass Predictions</span>
      </NuxtLink>

      <!-- Settings -->
      <NuxtLink 
        to="/settings"
        class="nav-item-desktop"
        :class="{ 'nav-item-active': $route.path === '/settings' }"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span class="nav-label-desktop">Settings</span>
      </NuxtLink>
    </div>
  </nav>

  <!-- Mobile: Bottom Navigation Bar -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-space-900 border-t border-space-700 z-50 safe-area-bottom">
    <div class="flex items-stretch px-2 py-2">
      <!-- Home / Dashboard -->
      <NuxtLink 
        to="/"
        class="nav-item"
        :class="{ 'nav-item-active': $route.path === '/' }"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
        <span class="nav-label">Home</span>
      </NuxtLink>

      <!-- Pass Predict -->
      <NuxtLink 
        to="/pass-predict"
        class="nav-item"
        :class="{ 'nav-item-active': $route.path === '/pass-predict' }"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        <span class="nav-label">Passes</span>
      </NuxtLink>

      <!-- Settings -->
      <NuxtLink 
        to="/settings"
        class="nav-item"
        :class="{ 'nav-item-active': $route.path === '/settings' }"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span class="nav-label">Settings</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
</script>

<style scoped>
/* Desktop Navigation */
.nav-item-desktop {
  @apply flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200;
  @apply no-underline;
  color: #ffffff !important;
  flex: 1;
  max-width: 200px;
  text-align: center;
}

.nav-item-desktop:hover {
  color: #7dd3fc !important;
  background: rgba(30, 41, 59, 0.5);
}

.nav-label-desktop {
  @apply text-sm font-semibold;
  white-space: nowrap;
}

/* Mobile Navigation */
.nav-item {
  @apply flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200;
  @apply no-underline;
  color: #ffffff !important;
  flex: 1;
  text-align: center;
}

.nav-item:hover {
  color: #7dd3fc !important;
  background: rgba(30, 41, 59, 0.5);
}

.nav-item-active {
  @apply bg-space-800/70;
  color: #7dd3fc !important;
  text-shadow: 0 0 10px rgba(125, 211, 252, 0.5);
}

.nav-label {
  @apply text-xs font-semibold;
  white-space: nowrap;
}

/* Safe area for devices with notches/home indicators */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>

