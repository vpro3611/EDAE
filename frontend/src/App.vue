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
  --bg:        #07070f;
  --surface:   #0d0d1b;
  --surface-2: #13132a;
  --accent:    #c8a97e;
  --accent-dim: rgba(200, 169, 126, 0.12);
  --accent-glow: rgba(200, 169, 126, 0.25);
  --text:      #ede8dc;
  --text-2:    #9690a0;
  --muted:     #4a4a62;
  --border:    rgba(255, 255, 255, 0.07);
  --border-accent: rgba(200, 169, 126, 0.35);
  --error:     #e06060;
  --success:   #5ac988;
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-ui:   'Syne', system-ui, sans-serif;
}

html, body {
  height: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

::selection {
  background: var(--accent-dim);
  color: var(--accent);
}

:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}
</style>
