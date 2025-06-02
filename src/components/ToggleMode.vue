<template>
  <div class="toggle-container" @click="onToggleClick">
    <div class="toggle-ball" :class="{ 'toggle-on': currentValue === 'live' }"></div>
    <span class="toggle-label">{{ currentValue === 'live' ? 'Live' : 'Model' }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Props :
 *  - modelValue : string => 'model' ou 'live'
 */
const props = defineProps({
  modelValue: {
    type: String,
    default: 'model'
  }
})

/**
 * Évents :
 *  - update:modelValue (v-model)
 */
const emit = defineEmits(['update:modelValue'])

const currentValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function onToggleClick() {
  currentValue.value = (currentValue.value === 'model') ? 'live' : 'model'
}
</script>
