<template>
  <div class="page-container">
    <!-- Toggle Mode -->
    <ToggleMode v-model="mode" />

    <div class="display-area">
      <!-- Mode Model -->
      <ModelView
        v-if="mode === 'model'"
        :defaultImages="defaultImages"
        :currentIndex="currentIndex"
        :isUploaded="isUploaded"
        :uploadedImage="uploadedImage"

        :predictions="predictions"
        :orientation="orientation"
        :selectedEarrings="selectedEarrings"

        :isMenuOpen="isMenuOpen"
        :zoomLevel="zoomLevel"

        @prevImage="prevImage"
        @nextImage="nextImage"
        @toggleMenu="toggleMenu"
        @openCategoryOverlay="openCategoryOverlay"
        @downloadImage="downloadImage"
        @shareImage="shareImage"
        @backToDefault="backToDefault"
        @handleFileUpload="handleFileUpload"
        @update:zoomLevel="zoomLevel = $event"
      />

      <!-- Mode Live -->
      <LiveView
        v-if="mode === 'live'"
        :selectedEarrings="selectedEarrings"
        @chooseEarrings="chooseEarrings"
        @photoCaptured="onPhotoCaptured"
        @downloadImage="downloadImage"
        @shareImage="shareImage"
      />
    </div>


    <!-- Bouton pour désélectionner boucles -->
    <div v-if="selectedEarrings.length" class="deselect-earrings-container">
      <button @click="clearEarrings" class="deselect-earrings-button">
        <i class="fas fa-times"></i> Annuler la sélection
      </button>
    </div>


    <!-- Modal capture photo -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="close-icon" @click="closeModal">
          <i class="fas fa-times"></i>
        </div>
        <img :src="capturedImage" alt="Captured" class="preview-image" />
        <div class="modal-buttons">
          <a :href="capturedImage" download="photo.png" class="modal-btn" aria-label="Télécharger">
            <i class="fas fa-download"></i>
          </a>
          <button class="modal-btn" @click="shareImage" aria-label="Partager la photo">
            <i class="fas fa-share-alt"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Overlay Catégorie -->
    <div v-if="showCategorySelection" class="category-selection-overlay">
      <div class="category-content">
        <h2>Choisissez une catégorie</h2>
        <button class="category-button" @click="openCategory('earring')">
          Boucles d'oreilles
        </button>
        <button class="category-button" @click="openCategory('earcuff')">
          Bagues d'oreilles
        </button>
        <button class="close-btn" @click="showCategorySelection = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- EarringSelection (swiper) -->
    <EarringSelection
      v-if="showCarousel"
      :showCarousel="showCarousel"
      :displayedItems="displayedItems"
      :selectedEarrings="selectedEarrings"
      :activeCategoryTitle="activeCategoryTitle"

      @update:showCarousel="showCarousel = $event"
      @update:selectedEarrings="toggleSelectedEarrings($event)"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

// Composants
import ToggleMode from './components/ToggleMode.vue'
import ModelView from './components/ModelView.vue'
import LiveView from './components/LiveView.vue'; 
import EarringSelection from './components/EarringSelection.vue'

// Import API & images
import { fetchCoordinates } from './utils/api.js'

/** 
 * Images mannequins
 */
import model1 from '@/assets/images/Model/Model1.jpeg';
import model2 from '@/assets/images/Model/Model2.jpg';
import model3 from '@/assets/images/Model/Model3.jpg';


/** 
 * Images boucles & bagues (ex.)
 */
import BoucleBleue from '@/assets/images/Boucles/pendu/950_bleu_65mm/042_BleuIrise65_MagicBlue-frbb746242640_65_left_950_500.png'
import BoucleCreole from '@/assets/images/Boucles/pendu/950_creole_50mm/042_CreoleOr_RefCreolissime_50_right_50mm_950_974.png'
import BoucleEventail from '@/assets/images/Boucles/pendu/950_eventailrouge_45mm/042_eventailRougeOr45_RET026B0_45_left_950_572.png'
import BagueOr from '@/assets/images/Bagues/bague_or.png'
import BagueArg from '@/assets/images/Bagues/bague_argent.png'


/** 
 * State principal
 */
const mode = ref('model')
const zoomLevel = ref(1); 


// Mode Model
let predictions = null
let orientation = null

// Liste mannequins
const defaultImages = ref([model1, model2, model3])
const currentIndex = ref(0)
const isUploaded = ref(false)
const isMenuOpen = ref(false)
const uploadedImage = ref(null)

// Overlay / slider
const capturedImage = ref(null)
const showModal = ref(false)
const showCategorySelection = ref(false)
const showCarousel = ref(false)
const displayedItems = ref([])
const activeCategoryTitle = ref('')
const selectedEarrings = ref([])


// Items (earring/bague)
const earringModels = ref([
  { name: '', type: 'earring', url: BoucleBleue },
  { name: '', type: 'earring', url: BoucleCreole },
  { name: '', type: 'earring', url: BoucleEventail }
]);

const earcuffModels = ref([
  { name: '', type: 'earcuff', url: BagueArg },
  { name: '', type: 'earcuff', url: BagueOr }
]);


/** 
 * onMounted => charger mannequins & items
 */
 onMounted(() => {
  loadAllItems()
  loadMannequinImage()  // on commence en "model"
})

/** 
 * Charger l'image mannequin & appeler l'API
 */
const mannequinCache = new Map()
async function loadMannequinImage() {
  const imageSrc = defaultImages.value[currentIndex.value]
  if (mannequinCache.has(imageSrc)) {
    const data = mannequinCache.get(imageSrc)
    predictions = data.predictions
    orientation = data.orientation
    return // Le composant ModelView fera le dessin tout seul
  }
  // Sinon API
  predictions = null
  orientation = null

  const blob = await fetch(imageSrc).then(r => r.blob())
  const file = new File([blob], 'mannequin.jpg', { type: 'image/jpeg' })
  const { predictions: p, orientation: o } = await fetchCoordinates(file)
  predictions = p
  orientation = o
  mannequinCache.set(imageSrc, { predictions, orientation })
}

// Upload
async function handleFileUpload(file) {
  if (!file || (typeof file === 'string' && !file.startsWith('data:image'))) {
    alert("Veuillez sélectionner une image valide");
    return;
  }

  zoomLevel.value = 1; // Réinitialisation du zoom après upload

  // Réinitialiser les valeurs
  predictions = null;
  orientation = null;
  isUploaded.value = false;
  
  if (typeof file === 'string') {
    // Si c'est une URL base64 (après un upload)
    uploadedImage.value = file;
    isUploaded.value = true;

    await nextTick();

    // Appel API avec un Blob si disponible
    const blob = await fetch(file).then(r => r.blob());
    const { predictions: p, orientation: o } = await fetchCoordinates(blob);
    predictions = p;
    orientation = o;
  } else {
    // Si c'est un vrai fichier (upload depuis input file)
    const reader = new FileReader();
    reader.onload = async (e) => {
      uploadedImage.value = e.target.result;
      isUploaded.value = true;

      await nextTick();
      const { predictions: p, orientation: o } = await fetchCoordinates(file);
      predictions = p;
      orientation = o;
    };
    reader.readAsDataURL(file);
  }
}


// Capture photo in live
function onPhotoCaptured(dataUrl) {
  capturedImage.value = dataUrl;
  showModal.value = true;
}

// Back to default
function backToDefault() {
  uploadedImage.value = null
  isUploaded.value    = false
  predictions = null
  orientation = null
  loadMannequinImage()
}

// toggleMenu
function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}


/** 
 * Charger boucles / bagues
 */
function loadAllItems() {
  earringModels.value = [
    { name: '', type: 'earring', url: BoucleBleue },
    { name: '', type: 'earring', url: BoucleCreole },
    { name: '', type: 'earring', url: BoucleEventail },
  ]
  earcuffModels.value = [
    { name: '', type: 'earcuff', url: BagueArg },
    { name: '', type: 'earcuff', url: BagueOr },
  ]
}

// Next / Prev mannequins
function nextImage() {
  currentIndex.value = (currentIndex.value + 1) % defaultImages.value.length
  loadMannequinImage()
}
function prevImage() {
  currentIndex.value = (currentIndex.value - 1 + defaultImages.value.length) % defaultImages.value.length
  loadMannequinImage()
}

/** 
 * Choisir boucles => overlay
 */
 function chooseEarrings() {
  showCategorySelection.value = true
}
function openCategoryOverlay() {
  isMenuOpen.value = false
  showCategorySelection.value = true
}

/** 
 * Ouvrir le slider d'une catégorie
 */
function openCategory(category) {
  showCategorySelection.value = false
  showCarousel.value = true
  if (category === 'earring') {
    displayedItems.value = earringModels.value
    activeCategoryTitle.value = 'Boucles d\'oreilles'
  } else {
    displayedItems.value = earcuffModels.value
    activeCategoryTitle.value = 'Bagues d\'oreilles'
  }
}

// Dans EarringSelection, on va émettre `update:selectedEarrings` en renvoyant **toute** la liste
// ou on gère un toggle local. Ici, je montre comment fusionner proprement
function toggleSelectedEarrings(newList) {
  selectedEarrings.value = newList
}


/** 
 * Annuler la sélection
 */
function clearEarrings() {
  selectedEarrings.value = []
}

/** 
 * Télécharger le canvas 
 */
 function downloadImage() {
  const canvas = document.querySelector('.image-container .image-canvas')
  if (!canvas) return alert("No model canvas found.")
  const dataURL = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = dataURL
  link.download = 'photo_boucles.png'
  link.click()
}

/** 
 * Partager le canvas
 */
 function shareImage() {
  if (mode.value === 'model') {
    // ==== PARTAGER LE CANVAS DU MODELE ====
    const canvas = document.querySelector('.image-container .image-canvas')
    if (!canvas) {
      alert('No model canvas for sharing.')
      return
    }
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert('Impossible de créer une image depuis le canvas.')
        return
      }
      const file = new File([blob], 'photo_boucles.jpg', { type: 'image/jpeg' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Mon montage RA',
            text: 'Regarde mes boucles en RA !'
          })
        } catch (err) {
          console.error('Partage annulé ou erreur:', err)
        }
      } else {
        alert('Le partage n’est pas pris en charge par ce navigateur.')
      }
    }, 'image/jpeg')

  } else {
    // ==== PARTAGER LA PHOTO CAPTURÉE EN LIVE ====
    if (!capturedImage.value) {
      alert('Pas de photo live à partager.')
      return
    }
    // Convertir le dataURL (capturedImage) en blob
    fetch(capturedImage.value)
      .then(r => r.blob())
      .then(async (blob) => {
        const file = new File([blob], 'photo_live.jpg', { type: 'image/jpeg' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Mon montage RA (Live)',
              text: 'Regarde mes boucles en RA, mode Live !'
            })
          } catch (err) {
            console.error('Partage annulé ou erreur:', err)
          }
        } else {
          alert('Le partage n’est pas pris en charge par ce navigateur.')
        }
      })
  }
}

function closeModal() {
  showModal.value = false
}

</script>
