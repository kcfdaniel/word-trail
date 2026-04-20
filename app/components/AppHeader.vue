<template>
  <header class="app-header">
    <div class="app-header-left">
      <slot />
    </div>
    <div class="app-header-right">
      <slot name="right" />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.app-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .app-header {
    padding: 0.625rem 1rem;
  }
}
</style>
