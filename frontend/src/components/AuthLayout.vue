<template>
  <div class="auth-shell">
    <!-- left decorative panel -->
    <div class="panel-left" aria-hidden="true">
      <div class="panel-bg"></div>
      <div class="panel-content">
        <div class="brand-mark">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <polygon points="26,4 48,42 4,42" stroke="#c8a97e" stroke-width="1.2" fill="none"/>
            <polygon points="26,48 4,10 48,10" stroke="#c8a97e" stroke-width="1.2" fill="none" opacity="0.45"/>
            <circle cx="26" cy="26" r="3" fill="#c8a97e" opacity="0.8"/>
          </svg>
        </div>
        <div class="brand-name">EDAE</div>
        <div class="brand-tagline">Identity. <em>Refined.</em></div>
        <div class="panel-ornament">
          <svg width="160" height="1" viewBox="0 0 160 1">
            <line x1="0" y1="0.5" x2="70" y2="0.5" stroke="rgba(200,169,126,0.3)" stroke-width="1"/>
            <circle cx="80" cy="0.5" r="1.5" fill="rgba(200,169,126,0.5)"/>
            <line x1="90" y1="0.5" x2="160" y2="0.5" stroke="rgba(200,169,126,0.3)" stroke-width="1"/>
          </svg>
        </div>
        <p class="panel-quote">
          "Secure by design,<br>human by intention."
        </p>
      </div>
      <div class="panel-grid"></div>
    </div>

    <!-- right form panel -->
    <div class="panel-right">
      <div class="form-wrapper">
        <div class="form-mark">
          <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
            <polygon points="26,4 48,42 4,42" stroke="#c8a97e" stroke-width="1.5" fill="none"/>
            <polygon points="26,48 4,10 48,10" stroke="#c8a97e" stroke-width="1.5" fill="none" opacity="0.45"/>
            <circle cx="26" cy="26" r="3" fill="#c8a97e" opacity="0.8"/>
          </svg>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// layout shell — no props
</script>

<style scoped>
.auth-shell {
  display: flex;
  min-height: 100vh;
}

/* ── Left decorative panel ── */
.panel-left {
  display: none;
  position: relative;
  flex: 0 0 42%;
  overflow: hidden;
}

@media (min-width: 900px) {
  .panel-left { display: flex; align-items: center; justify-content: center; }
}

.panel-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 35% 45%, #19122e 0%, transparent 70%),
    radial-gradient(ellipse 60% 80% at 70% 80%, #0e1a2e 0%, transparent 65%),
    #09090f;
}

.panel-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(200,169,126,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,169,126,0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 80% 90% at 50% 50%, black 20%, transparent 80%);
}

.panel-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 56px;
  gap: 0;
  animation: fadeSlideUp 0.9s ease both;
}

.brand-mark {
  margin-bottom: 24px;
  filter: drop-shadow(0 0 20px rgba(200,169,126,0.3));
}

.brand-name {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 10px;
}

.brand-tagline {
  font-family: var(--font-display);
  font-size: 42px;
  font-weight: 300;
  line-height: 1.15;
  color: var(--text);
  margin-bottom: 28px;
  letter-spacing: -0.01em;
}

.brand-tagline em {
  font-style: italic;
  color: var(--accent);
}

.panel-ornament {
  margin-bottom: 28px;
}

.panel-quote {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  font-weight: 300;
  color: var(--text-2);
  line-height: 1.7;
  letter-spacing: 0.01em;
}

/* ── Right form panel ── */
.panel-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  position: relative;
  background: var(--bg);
}

.panel-right::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 50% at 50% 40%, rgba(200,169,126,0.03) 0%, transparent 70%);
  pointer-events: none;
}

.form-wrapper {
  width: 100%;
  max-width: 420px;
  animation: fadeSlideUp 0.7s ease both;
}

.form-mark {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
  filter: drop-shadow(0 0 12px rgba(200,169,126,0.25));
}

@media (min-width: 900px) {
  .form-mark { display: none; }
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
