<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg:        #06060e;
  --surface:   #0c0c1a;
  --surface-2: #121228;
  --accent:    #c8a97e;
  --accent-dim: rgba(200, 169, 126, 0.11);
  --accent-glow: rgba(200, 169, 126, 0.22);
  --text:      #ece7db;
  --text-2:    #928c9e;
  --muted:     #48486a;
  --border:    rgba(255, 255, 255, 0.07);
  --border-accent: rgba(200, 169, 126, 0.32);
  --error:     #e06060;
  --success:   #5ac988;
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-ui:   'Syne', system-ui, sans-serif;
  --font-mono: 'DM Mono', 'Courier New', monospace;
}

html, body { height: 100%; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app { min-height: 100vh; }

::selection { background: var(--accent-dim); color: var(--accent); }

:focus-visible { outline: 1px solid var(--accent); outline-offset: 2px; }
</style>
