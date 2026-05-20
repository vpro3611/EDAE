<template>
  <div class="auth-shell">
    <!-- Full-page decorative background -->
    <div class="page-bg" aria-hidden="true">
      <div class="bg-layer"></div>
      <div class="bg-grid"></div>
      <div class="bg-shapes">
        <div class="shape shape-tri-lg"></div>
        <div class="shape shape-tri-sm"></div>
        <div class="shape shape-ring-lg"></div>
        <div class="shape shape-ring-sm"></div>
        <div class="shape shape-dots-a"></div>
        <div class="shape shape-dots-b"></div>
        <div class="shape shape-line-h"></div>
        <div class="shape shape-line-v"></div>
      </div>
    </div>

    <!-- Centered form -->
    <div class="form-pane">
      <div class="form-wrapper">
        <div class="form-mark">
          <svg width="32" height="32" viewBox="0 0 52 52" fill="none">
            <polygon points="26,4 48,42 4,42" stroke="#c8a97e" stroke-width="1.4" fill="none"/>
            <polygon points="26,48 4,10 48,10" stroke="#c8a97e" stroke-width="1.4" fill="none" opacity="0.4"/>
            <circle cx="26" cy="26" r="3" fill="#c8a97e" opacity="0.9"/>
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
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Full-page background ── */
.page-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.bg-layer {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 65% 55% at 25% 40%, #1c1135 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 78% 70%, #091628 0%, transparent 55%),
    radial-gradient(ellipse 40% 35% at 55% 15%, #120c28 0%, transparent 50%),
    #06060e;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(200,169,126,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,169,126,0.04) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 85%);
}

/* ── Floating geometric shapes ── */
.bg-shapes { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }

.shape { position: absolute; }

/* Large faint triangle — bottom-left */
.shape-tri-lg {
  width: 420px;
  height: 420px;
  bottom: -60px;
  left: -60px;
  opacity: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 420 420' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='210,20 400,390 20,390' stroke='rgba(200,169,126,0.07)' stroke-width='1' fill='none'/%3E%3C/svg%3E") center/contain no-repeat;
  animation: reveal 1.4s 0.2s ease forwards, drift1 30s 1.6s ease-in-out infinite;
}

/* Medium triangle — top-right */
.shape-tri-sm {
  width: 220px;
  height: 220px;
  top: 6%;
  right: 8%;
  opacity: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='110,12 208,198 12,198' stroke='rgba(200,169,126,0.06)' stroke-width='1' fill='none'/%3E%3Cpolygon points='110,208 12,22 208,22' stroke='rgba(200,169,126,0.04)' stroke-width='1' fill='none'/%3E%3C/svg%3E") center/contain no-repeat;
  animation: reveal 1.4s 0.5s ease forwards, drift2 24s 1.6s ease-in-out infinite;
}

/* Large ring — top-left */
.shape-ring-lg {
  width: 280px;
  height: 280px;
  top: -40px;
  left: 15%;
  border: 1px solid rgba(200,169,126,0.07);
  border-radius: 50%;
  opacity: 0;
  animation: reveal 1.4s 0.7s ease forwards, drift3 28s 1.6s ease-in-out infinite;
}

.shape-ring-lg::after {
  content: '';
  position: absolute;
  inset: 24px;
  border: 1px solid rgba(200,169,126,0.04);
  border-radius: 50%;
}

/* Small ring — bottom-right */
.shape-ring-sm {
  width: 160px;
  height: 160px;
  bottom: 12%;
  right: 6%;
  border: 1px solid rgba(200,169,126,0.08);
  border-radius: 50%;
  opacity: 0;
  animation: reveal 1.4s 0.9s ease forwards, drift2 20s 1.6s ease-in-out infinite reverse;
}

/* Dot grid — right side */
.shape-dots-a {
  width: 130px;
  height: 130px;
  top: 40%;
  right: 12%;
  background-image: radial-gradient(circle, rgba(200,169,126,0.2) 1px, transparent 1px);
  background-size: 14px 14px;
  opacity: 0;
  animation: reveal 1.4s 1.0s ease forwards, drift1 22s 1.6s ease-in-out infinite;
}

/* Dot grid — left mid */
.shape-dots-b {
  width: 80px;
  height: 80px;
  top: 28%;
  left: 8%;
  background-image: radial-gradient(circle, rgba(200,169,126,0.15) 1px, transparent 1px);
  background-size: 11px 11px;
  opacity: 0;
  animation: reveal 1.4s 1.1s ease forwards, drift3 26s 1.6s ease-in-out infinite;
}

/* Horizontal accent line — upper area */
.shape-line-h {
  height: 1px;
  width: 200px;
  top: 18%;
  right: 18%;
  opacity: 0;
  background: linear-gradient(90deg, transparent, rgba(200,169,126,0.18), transparent);
  animation: reveal 1.8s 1.2s ease forwards;
}

/* Vertical accent line — left */
.shape-line-v {
  width: 1px;
  height: 160px;
  bottom: 22%;
  left: 22%;
  opacity: 0;
  background: linear-gradient(transparent, rgba(200,169,126,0.14), transparent);
  animation: reveal 1.8s 1.3s ease forwards;
}

/* ── Form pane (centered over background) ── */
.form-pane {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 100vh;
}

.form-wrapper {
  width: 100%;
  max-width: 420px;
  background: rgba(6, 6, 14, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 48px 44px;
  backdrop-filter: blur(24px);
  box-shadow:
    0 0 0 1px rgba(200,169,126,0.04),
    0 24px 80px rgba(0, 0, 0, 0.55),
    0 4px 16px rgba(0, 0, 0, 0.3);
  animation: cardReveal 0.7s ease both;
  position: relative;
}

.form-wrapper::before {
  content: '';
  position: absolute;
  top: 0; left: 16px; right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200,169,126,0.28), transparent);
  border-radius: 1px;
}

.form-mark {
  display: flex;
  justify-content: center;
  margin-bottom: 36px;
  filter: drop-shadow(0 0 16px rgba(200,169,126,0.32));
}

@media (max-width: 500px) {
  .form-wrapper { padding: 36px 24px; }
}

/* ── Keyframes ── */
@keyframes reveal {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes cardReveal {
  from { opacity: 0; transform: translateY(20px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes drift1 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  40%      { transform: translate(22px, -16px) rotate(6deg); }
  70%      { transform: translate(-12px, 24px) rotate(-4deg); }
}

@keyframes drift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  35%      { transform: translate(-24px, 18px) scale(1.05); }
  70%      { transform: translate(16px, -22px) scale(0.95); }
}

@keyframes drift3 {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-16px, -24px); }
}
</style>
