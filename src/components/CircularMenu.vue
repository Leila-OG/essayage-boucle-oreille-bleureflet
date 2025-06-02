<template>
  <div class="menu-container">
    <button class="main-button" @click="onToggleMenu">
      <i class="fas fa-plus"></i>
    </button>
    <div class="circular-menu" :class="{ open: isMenuOpen }">
      <button class="menu-item" @click="$emit('openCategoryOverlay')">
        <i class="fas fa-gem"></i>
      </button>
      <button class="menu-item" @click="$emit('downloadImage')">
        <i class="fas fa-download"></i>
      </button>
      <button class="menu-item" @click="$emit('shareImage')">
        <i class="fas fa-share-alt"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue'

const props = defineProps({
  isMenuOpen: Boolean
})

const emit = defineEmits(['toggleMenu','openCategoryOverlay','downloadImage','shareImage'])
const isMenuOpen = ref(props.isMenuOpen);

watch(() => props.isMenuOpen, (newVal) => {
  isMenuOpen.value = newVal
})

function onToggleMenu() {
  emit('toggleMenu')
}
</script>
