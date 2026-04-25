<template>
  <div class="otp-root">
    <div class="otp-boxes">
      <input
        v-for="(_, i) in 6"
        :key="i"
        :ref="el => { if (el) inputs[i] = el }"
        class="otp-box"
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
}

.otp-boxes {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.otp-box {
  width: 48px;
  height: 56px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-bottom: 2px solid var(--muted);
  color: var(--text);
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  border-radius: 4px;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.otp-box:focus {
  border-color: var(--accent);
  border-bottom-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-dim), 0 4px 16px var(--accent-dim);
}

.otp-box:not(:placeholder-shown):not(:focus) {
  border-bottom-color: var(--accent);
}
</style>
