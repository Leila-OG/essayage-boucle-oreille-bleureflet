<template>
  <!-- On affiche le “slider overlay” seulement si showCarousel est true -->
  <div v-if="showCarousel" class="swiper-overlay">
    <div class="swiper-content">
      <button class="close-btn" @click="$emit('update:showCarousel', false)"><i class="fas fa-times"></i></button>
      <h2>{{ activeCategoryTitle }}</h2>

      <Swiper
        :modules="[Navigation]"
        navigation
        pagination
        :slides-per-view="1"
        space-between="20"
        class="my-swiper"
      >
        <SwiperSlide
          v-for="(item, index) in displayedItems"
          :key="index"
          @click="toggleSelection(item)"
        >
          <div class="slide-inner">
            <img :src="item.url" :alt="item.name" />
            <p>{{ item.name }}</p>
            <div 
              v-if="selectedEarrings.find(e => e.url === item.url)" 
              class="selected-indicator"
            >
              Sélectionné
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import 'swiper/css/navigation'
import { Navigation } from 'swiper/modules'

/** PROPS */
const props = defineProps({
  showCarousel: Boolean,
  displayedItems: Array,
  selectedEarrings: Array,
  activeCategoryTitle: String
})

/** EMITS */
const emit = defineEmits(['update:showCarousel','update:selectedEarrings'])

function toggleSelection(item) {
  // On clone le tableau pour le modifier
  let newSelection = [...props.selectedEarrings]
  const index = newSelection.findIndex(e => e.url === item.url)
  if (index === -1) {
    // On ajoute l’item
    newSelection.push(item)
  } else {
    // On le retire
    newSelection.splice(index, 1)
  }
  // On émet la mise à jour vers le parent
  emit('update:selectedEarrings', newSelection)
}
</script>
