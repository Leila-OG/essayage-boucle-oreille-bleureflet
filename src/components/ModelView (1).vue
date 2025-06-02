<template>
  <div class="image-container">
    <!-- Canvas pour afficher l'image / mannequin -->
    <canvas ref="modelCanvas" class="image-canvas"></canvas>

    <!-- Vue de l'image uploadée avec RA -->
    <div v-if="isUploaded" class="uploaded-image-view">
      <!-- Flèche en haut à gauche pour revenir aux photos du modèle -->
      <button class="back-button" @click="$emit('backToDefault')">
        <i class="fas fa-arrow-left"></i>
      </button>

    <!-- Menu circulaire -->
    <CircularMenu
        :isMenuOpen="isMenuOpen"
        @toggleMenu="$emit('toggleMenu')"
        @openCategoryOverlay="$emit('openCategoryOverlay')"
        @downloadImage="$emit('downloadImage')"
        @shareImage="$emit('shareImage')"
      />
    </div>

    <!-- Navigation des images du mannequin (si !isUploaded) -->
    <div v-if="!isUploaded" class="default-image-view">
      <div class="arrow arrow-left" @click="$emit('prevImage')"><i class="fas fa-chevron-left"></i></div>
      <div class="arrow arrow-right" @click="$emit('nextImage')"><i class="fas fa-chevron-right"></i></div>
      <!-- Bouton pour choisir des boucles d'oreilles (centré en bas) -->
      <button class="choose-earrings-button" @click="$emit('openCategoryOverlay')">
        <i class="fas fa-gem"></i>
      </button>
    </div>

    <!-- Bouton d'upload -->
    <button class="upload-button" @click="triggerFileInput" aria-label="Ouvrir la galerie">
      <i class="fas fa-images"></i>
    </button>

    <!-- Zoom Slider vertical -->
    <div class="zoom-slider-container">
      -
      <!-- <input type="range" id="zoom-slider" min="1" max="3" step="0.1" v-model="zoomLevel"> -->
      <input 
        type="range" 
        id="zoom-slider" 
        min="1" 
        max="3" 
        step="0.1" 
        v-model="zoomLevel"
      />
      +
    </div>

    <!-- Input de fichier caché -->
    <input
      type="file"
      ref="fileInput"
      accept="image/*"
      @change="onFileChange"
      style="display: none;"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { renvoieBonneBoucle } from '@/utils/canvasUtils.js'
import CircularMenu from './CircularMenu.vue'


/* PROPS : */
const props = defineProps({
  defaultImages: Array,
  currentIndex: Number,
  isUploaded: Boolean,
  uploadedImage: String,
  isMenuOpen: Boolean,
  predictions: [Array, Object],
  orientation: Object,
  selectedEarrings: Array,
  zoomLevel: Number
})

/* EMITS : */
const emit = defineEmits([
  'prevImage','nextImage','openCategoryOverlay','toggleMenu','downloadImage','shareImage',
  'backToDefault','handleFileUpload', 'update:zoomLevel'
])

// REFS
const modelCanvas = ref(null)
const fileInput = ref(null)
const zoomLevel = ref(1) // Valeur dynamique du zoom


/** 
 * Définition du mapping de landmarks 
 * (peut aussi être importé depuis un fichier, 
 * ou passé en prop si vous préférez)
 */
 const landmarkMap = {
  earring: {
    positions: [
      { centerName: 'Lobe 1', outerName: 'Lobe 2' },
      { centerName: 'Lobe 2', outerName: 'Lobe 3' },
      { centerName: 'Lobe 3', outerName: 'Helix 6' },   // helix 6 le plus proche de lobe 3 
      // etc. autant de positions que vous souhaitez
    ]
  },
  earcuff: {
    positions: [
      { centerName: 'Helix 2', outerName: 'Helix 3' },
      { centerName: 'Helix 3', outerName: 'Helix 4' },
    ]
  }
}

// MONTAGE : on dessine le canvas au départ
onMounted(() => {
  drawCanvas()  // au montage
})


// WATCH : on redessine quand props.predictions, props.uploadedImage, etc. changent
watch(
  () => [props.predictions, props.selectedEarrings, props.uploadedImage],
  () => {
    drawCanvas()
  },
  { deep: true }
)

// Fix slider après upload
watch(() => zoomLevel.value, (newValue) => {
  console.log("Zoom Level changed:", newValue);
  emit('update:zoomLevel', Number(newValue)); // Mettre à jour TestRefactored.vue
  drawCanvas();
});



/* FONCTION drawCanvas */
async function drawCanvas() {
  if (!modelCanvas.value) return;

  const canvas = modelCanvas.value;
  const ctx = canvas.getContext('2d');

  // Déterminer l’image à afficher
  const imageSrc = props.isUploaded ? props.uploadedImage : props.defaultImages[props.currentIndex];
  if (!imageSrc) return;

  // Charger l’image de fond
  const bg = new Image();
  bg.src = imageSrc;
  await new Promise(resolve => (bg.onload = resolve));

  // Ajuster la taille du canvas et le nettoyer
  canvas.width = bg.width;
  canvas.height = bg.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Déterminer le landmark pour centrer le zoom
  let zoomCenterX = canvas.width / 2;
  let zoomCenterY = canvas.height / 2;

  if (props.predictions?.length) {
    const ear = props.predictions[0].landmarks?.find(l => l.name === 'Lobe 1');
    if (ear) {
      zoomCenterX = ear.coordinates[0];
      zoomCenterY = ear.coordinates[1];
    }
  }

  // Appliquer le zoom
  ctx.save();
  ctx.translate(zoomCenterX, zoomCenterY);
  ctx.scale(zoomLevel.value, zoomLevel.value);
  ctx.translate(-zoomCenterX, -zoomCenterY);

  // Dessiner l’image de fond
  ctx.drawImage(bg, 0, 0, bg.width, bg.height);

  // Dessiner les boucles d’oreilles aux bons emplacements
  if (props.predictions && props.selectedEarrings?.length) {
    for (let i = 0; i < props.selectedEarrings.length; i++) {
      const item = props.selectedEarrings[i];

      // Récupérer la liste des positions définies dans `landmarkMap`
      const positions = landmarkMap[item.type]?.positions;
      if (!positions || !positions.length) continue;

      // Alterner les slots si plusieurs boucles sont sélectionnées
      const slotIndex = i % positions.length;
      const { centerName, outerName } = positions[slotIndex];

      for (const prediction of props.predictions) {
        // Trouver les landmarks correspondants
        const centerLandmark = prediction.landmarks?.find(l => l.name === centerName);
        const outerLandmark = prediction.landmarks?.find(l => l.name === outerName);

        if (!centerLandmark || !outerLandmark) {
          console.warn('Landmarks manquants :', centerName, outerName);
          continue;
        }

        // Générer l’image de la boucle avec la bonne échelle
        const scaledUrls = await renvoieBonneBoucle(item.url, [prediction], props.orientation);
        if (!scaledUrls || !scaledUrls.length) continue;

        const scaledImageUrl = scaledUrls[0].scaledImageUrl;
        const earringImg = new Image();
        earringImg.src = scaledImageUrl;
        await new Promise(resolve => (earringImg.onload = resolve));

        // Positionner la boucle en tenant compte du zoom
        const eW = earringImg.width;
        const eH = earringImg.height;
        const x = (centerLandmark.coordinates[0] - eW / 2);
        const y = (centerLandmark.coordinates[1]);

        ctx.drawImage(earringImg, x, y, eW, eH);
      }
    }
  }

  // Restaurer le contexte initial du canvas
  ctx.restore();
}


function triggerFileInput() {
  fileInput.value?.click()
}

async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return;

  zoomLevel.value = 1; // Réinitialisation du zoom après upload
  emit('handleFileUpload', file)  // On délègue au parent la gestion du file
  e.target.value = '';

  await nextTick();
  drawCanvas(); // Redessiner après upload
}


</script>
