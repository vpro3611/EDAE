<template>
  <div class="otp-root">
    <div class="otp-boxes">
      <input
        v-for="(_, i) in 6"
        :key="i"
        :ref="el => { if (el) inputs[i] = el as HTMLInputElement }"
        class="otp-box"
        :class="{ filled: !!digits[i] }"
        type="text"
        inputmode="numeric"
        maxlength="1"
        :value="digits[i]"
        autocomplete="one-time-code"
        @keydown="onKeydown($event, i)"
        @input="onInput($event, i)"
        @paste="onPaste($event)"
        @focus="$event.target.select()"
      />
    </div>
    <div class="otp-progress" aria-hidden="true">
      <div
        v-for="i in 6"
        :key="i"
        class="otp-pip"
        :class="{ active: !!digits[i - 1] }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const digits = ref<string[]>(Array(6).fill(''))
const inputs = ref<HTMLInputElement[]>([])

onMounted(() => {
  inputs.value[0]?.focus()
})

function onInput(e: Event, i: number) {
  const target = e.target as HTMLInputElement
  const val = target.value.replace(/\D/g, '').slice(-1)
  digits.value[i] = val
  target.value = val
  emit('update:modelValue', digits.value.join(''))
  if (val && i < 5) inputs.value[i + 1]?.focus()
}

function onKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'Backspace') {
    if (digits.value[i]) {
      digits.value[i] = ''
      emit('update:modelValue', digits.value.join(''))
    } else if (i > 0) {
      inputs.value[i - 1]?.focus()
    }
  } else if (e.key === 'ArrowLeft' && i > 0) {
    inputs.value[i - 1]?.focus()
  } else if (e.key === 'ArrowRight' && i < 5) {
    inputs.value[i + 1]?.focus()
  }
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6)
  for (let i = 0; i < 6; i++) {
    digits.value[i] = text[i] ?? ''
    const input = inputs.value[i]
    if (input) input.value = digits.value[i]
  }
  emit('update:modelValue', digits.value.join(''))
  const nextEmpty = text.length < 6 ? text.length : 5
  inputs.value[nextEmpty]?.focus()
}
</script>

<style scoped>
.otp-root {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.otp-boxes {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.otp-box {
  width: 48px;
  height: 58px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
  text-align: center;
  border-radius: 6px;
  outline: none;
  caret-color: var(--accent);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
}

.otp-box:focus {
  border-color: var(--accent);
  background: rgba(200, 169, 126, 0.05);
  box-shadow: 0 0 0 2px rgba(200, 169, 126, 0.12), 0 4px 20px rgba(200, 169, 126, 0.08);
  transform: translateY(-1px);
}

.otp-box.filled {
  border-color: var(--border-accent);
  background: rgba(200, 169, 126, 0.07);
  color: var(--accent);
}

.otp-box.filled:focus {
  background: rgba(200, 169, 126, 0.1);
}

/* Progress indicator */
.otp-progress {
  display: flex;
  gap: 5px;
}

.otp-pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.25s, transform 0.2s;
}

.otp-pip.active {
  background: var(--accent);
  transform: scale(1.15);
}
</style>
