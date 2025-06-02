<template>
  <div class="page-container">
    <!-- Toggle pour passer d'un mode à l'autre -->
    <div class="toggle-container" @click="toggleMode">
      <div class="toggle-ball" :class="{ 'toggle-on': mode === 'live' }"></div>
      <span class="toggle-label">{{ mode === 'live' ? 'Live' : 'Model' }}</span>
    </div>

    <div class="display-area">
      <!-- Mode "Model" -->
      <div v-if="mode === 'model'" class="image-container">
        <!-- Canvas pour afficher l'image et les boucles d'oreilles -->
        <canvas ref="modelCanvas" class="image-canvas"></canvas>

        <!-- Vue de l'image uploadée avec RA -->
        <div v-if="isUploaded" class="uploaded-image-view">
        
          <!-- Flèche en haut à gauche pour revenir aux photos du modèle -->
          <button class="back-button" @click="backToDefault">
            <i class="fas fa-arrow-left"></i>
          </button>

          <div class="menu-container">
            <!-- Bouton principal -->
            <button class="main-button" @click="toggleMenu">
              <i class="fas fa-plus"></i>
            </button>

            <!-- The arc menu items -->
            <div class="circular-menu" :class="{ 'open': isMenuOpen }">
              <!-- Category approach -->
              <button class="menu-item" @click="openCategoryOverlay">
                <i class="fas fa-gem"></i>
              </button>
              <!-- Bouton de téléchargement de l'image -->
              <button class="menu-item" @click="downloadImage">
                <i class="fas fa-download"></i>
              </button>
              <!-- Bouton pour partager l'image sur les réseaux sociaux -->
              <button class="menu-item" @click="shareImage">
                <i class="fas fa-share-alt"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation des images du mannequin (si !isUploaded) -->
        <div v-if="!isUploaded" class="default-image-view">
          <div class="arrow arrow-left" @click="prevImage">←</div>
          <div class="arrow arrow-right" @click="nextImage">→</div>
          
          <!-- Bouton pour choisir des boucles d'oreilles -->
          <button class="choose-earrings-button" @click="chooseEarrings">
            <i class="fas fa-gem"></i> 
          </button>


        </div>

        <!-- Bouton d'upload -->
        <button class="upload-button" @click="triggerFileInput" aria-label="Ouvrir la galerie">
          <i class="fas fa-images"></i>
        </button>

        <!-- Input de fichier caché -->
        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          @change="handleFileUpload"
          style="display: none;"
        />
      </div>

      <!-- Mode "Live" -->
      <div v-else class="live-container">
        <video ref="video" autoplay playsinline class="responsive-media"></video>
        <canvas ref="liveCanvas" class="overlay-canvas"></canvas>
        <div class="capture-button" @click="capturePhoto"></div>

        <!-- Bouton pour choisir des boucles d'oreilles -->
        <button class="choose-earrings-button" @click="chooseEarrings">
          <i class="fas fa-gem"></i>
        </button>
      </div>
    </div>

    <!-- Désélection des boucles -->
    <div v-if="selectedEarrings.length" class="deselect-earrings-container">
      <button @click="clearEarrings" class="deselect-earrings-button">
        ✕ Annuler la sélection
      </button>
    </div>

    <!-- Modal de prévisualisation de la photo capturée -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="close-icon" @click="closeModal">
          <i class="fas fa-times"></i>
        </div>
        <img :src="capturedImage" alt="Captured" class="preview-image" />
        <div class="modal-buttons">
          <a :href="capturedImage" download="photo.png" class="modal-btn" aria-label="Télécharger la photo">
            <i class="fas fa-download"></i>
          </a>
          <button class="modal-btn" @click="shareImage" aria-label="Partager la photo">
            <i class="fas fa-share-alt"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Pop up pour choix de catégorie ("Boucles" ou "Bagues") -->
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
          Fermer
        </button>
      </div>
    </div>

    <!-- SLIDER SWIPER Pop up : s'ouvre quand showCarousel = true -->
    <div v-if="showCarousel" class="swiper-overlay">
      <div class="swiper-content">
        <button class="close-btn" @click="showCarousel = false">Fermer</button>
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
                <div v-if="selectedEarrings.find(e => e.url === item.url)" class="selected-indicator">
                  Sélectionné
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      </div>
    </div>
  </div>
</template>

  <script setup>
  import { ref, onMounted, watch } from 'vue';
  import { nextTick } from 'vue';
  import axios from 'axios';
  
  // Swiper et ses styles
  import { Swiper, SwiperSlide } from 'swiper/vue';
  import 'swiper/css';
  import 'swiper/css/navigation';  // pour les flèches "Navigation"
  import { Navigation } from 'swiper/modules';
  
  // Images de mannequin
  import model1 from '@/assets/images/Model/Model1.jpeg';
  import model2 from '@/assets/images/Model/Model2.jpg';
  import model3 from '@/assets/images/Model/Model3.jpg';
  
  // Hard-coded example images for “Boucles” and “Bagues”
  import BoucleBleue from '@/assets/images/Boucles/pendu/950_bleu_65mm/042_BleuIrise65_MagicBlue-frbb746242640_65_left_950_500.png'
  import BoucleCreole from '@/assets/images/Boucles/pendu/950_creole_50mm/042_CreoleOr_RefCreolissime_50_right_50mm_950_974.png'
  import BoucleEventail from '@/assets/images/Boucles/pendu/950_eventailrouge_45mm/042_eventailRougeOr45_RET026B0_45_left_950_572.png'
  
  // Example images pour "Bagues"
  import BagueOr from '@/assets/images/Bagues/bague_or.png'
  import BagueArg from '@/assets/images/Bagues/bague_argent.png'
  
  // States 
  const mode             = ref('model');
  const video            = ref(null);
  const liveCanvas       = ref(null);
  const modelCanvas      = ref(null);
  const defaultImages    = ref([model1, model2,model3]);
  const currentIndex     = ref(0);
  const uploadedImage    = ref(null);
  const isUploaded       = ref(false);
  const capturedImage    = ref(null);
  const showModal        = ref(false);
  const fileInput        = ref(null);
  const isMenuOpen       = ref(false);

  var predictions = null;
  var orientation = null;
  
  
  /*
     PARTIE SLIDER
     - showCategorySelection : overlay "choisissez la catégorie"
     - showCarousel          : overlay "swiper" (affiche items)
     - earringModels         : images de type "Boucles"
     - earcuffModels         : images de type "Bagues"
     - displayedItems        : la liste d'items à afficher (selon la catégorie choisie)
     - activeCategoryTitle   : titre dynamique "Boucles" ou "Bagues"
     - selectedEarrings      : boucles/bagues sélectionnées
  */
  const showCategorySelection = ref(false);
  const showCarousel          = ref(false);
  const earringModels         = ref([]);
  const earcuffModels         = ref([]);
  const displayedItems        = ref([]);
  const activeCategoryTitle   = ref('');
  const selectedEarrings      = ref([]);
  

  // Nouveau mapping pour la pose :
  // - earring => on place le bijou sur Lobe 1 (center), Lobe 2 (outer)
  // - earcuff => on place le bijou sur Helix 2 (center), Helix 3 (outer)
  const landmarkMap = {
    earring: {
      centerName: 'Lobe 1',
      outerName:  'Lobe 2'
    },
    earcuff: {
      centerName: 'Helix 2',
      outerName:  'Helix 3'
    }
  };
  
  
  /* Met à l'échelle la boucle d'oreille*/
  async function mise_a_echelle(distancePx, url) {
  
    // Charger l'image depuis l'URL
    const img = new Image();
    img.src = url;
  
    // Retourner une promesse pour attendre que l'image soit chargée
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Dimensions originales de l'image
        const originalWidth  = img.width;
        const originalHeight = img.height;
        const echelle=distancePx/originalHeight
  
        // Calculer les nouvelles dimensions
        const scaledWidth  = Math.round(originalWidth  * echelle);
        const scaledHeight = Math.round(originalHeight * echelle);
  
        // Créer un canvas pour redimensionner l'image
        const canvas = document.createElement('canvas');
        canvas.width  = scaledWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext('2d');
  
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
  
        // Récupérer l'image redimensionnée sous forme de DataURL
        const scaledImageUrl = canvas.toDataURL();
        // Résoudre la promesse
        resolve(scaledImageUrl);
      };
  
      img.onerror = (errorEvent) => {
        console.error("Impossible de charger l’image :", url, errorEvent);
        reject("Erreur lors du chargement de l'image : " + errorEvent);
      };
    });
  }
  

/*Renvoie la bonne image de boucle doreille selon lorientation du visage*/
  async function renvoiebonneboucle(itemUrl, predictions,orientation) {
    if (!predictions || !predictions.length) {
      console.error("Aucune prédiction détectée");
      return null;
    }
  
    // Array pour stocker les URLs modifiées pour chaque oreille
    const scaledUrls = [];
    
    for (const prediction of predictions) {
      const distancePx = prediction.distance_px;
      const earSide = prediction.ear_side;
  
      const yaw = orientation.yaw;
      if (yaw == null) {
        console.warn("orientation.yaw est inexistant -> on annule la reconstruction path");
        return itemUrl; // On renvoie juste l’URL d’origine, ou un fallback
      }
  
      //Détermine un nouveau numéro d’image selon l'angle d'orientation du visage
      console.log('yaw =', orientation.yaw, 'earSide =', earSide);
      const imageNumber = getEarringImageNumber(yaw, earSide, 65);
  
      console.log('imageNumber', imageNumber);
      if (imageNumber == null) {
        console.warn("L'angle calculé est hors intervalle 0-90, pas de reconstruction");
        return itemUrl;
      }
  
      const formattedNumber = imageNumber.toString().padStart(3, '0');
  
      //Reconstruit l’URL => par ex. "/src/assets/images/Boucles/950_bleu_65mm/007_Bleu.png"
      
      console.log('itemUrl', itemUrl);
      console.log('formattedNumber', formattedNumber);
      // Remplacement des 3 premiers caractères dans le nom de fichier
      const reconstructedPath = itemUrl.replace(
        /\/([^\/]*)$/, // Match la partie après le dernier slash
        (_, fileName) => {
          const updatedFileName = fileName.replace(/^\d{3}/, formattedNumber);
          return `/${updatedFileName}`;
        }
      );
      console.log('reconstructedPath',reconstructedPath)
  
      //Appel la mise à échelle
      const scaledImageUrl = await mise_a_echelle(distancePx, reconstructedPath);
      //Ajoute l'URL modifiée à l'array
      scaledUrls.push({ earSide, scaledImageUrl });
    }
    return scaledUrls;  
  }
 
  
  //garantit que les images et éléments sont prêts dès le chargement du composant
  onMounted(() => {
    loadAllItems();
    loadMannequinImage();
  });
  //met à jour l'affichage en fonction des actions de l'utilisateur
  watch(currentIndex, () => {
    if (!isUploaded.value) {
      loadMannequinImage();
    }
  });
  
  
  //menu pour choisir boucle/télécharger l'image et la partager sur les réseaux
  function toggleMenu() {
    isMenuOpen.value = !isMenuOpen.value;
  }
  
  
  //pop up d'affichage de choix entre selection de bagues ou de boucles d'oreilles
  function chooseEarrings() {
    showCategorySelection.value = true 
  }
  
  //Affiche les images de la catégorie choisi par l'utilisateur (boucles ou bagues d'oreilles)
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
  
  
  //ferme le menu circulaire et affiche le menu de choix de catégorie (boucles ou bagues)
  function openCategoryOverlay() {
    isMenuOpen.value = false
    showCategorySelection.value = true
  }
  
  
  //charge les images des bijoux et les stocke dans des variables + label bague ou boucle
  function loadAllItems() {
    earringModels.value = [
      {
        name: '',  
        type: 'earring',
        url: BoucleBleue
      },
      {
        name: '',
        type: 'earring',
        url: BoucleCreole   
      },
      {
        name: '',
        type: 'earring',
        url: BoucleEventail 
      }
    ];
    earcuffModels.value = [
    {
        name: '',
        type: 'earcuff',
        url: BagueArg
      },
      {
        name: '',
        type: 'earcuff',
        url: BagueOr 
      }
    ];
  }
  
  
  //Ajoute ou retire un bijou sélectionné de la liste
  function toggleSelection(selectedItem) {
    // Vérifie si le bijou est déjà sélectionné en cherchant son URL dans selectedEarrings
    const index = selectedEarrings.value.findIndex(
      (i) => i.url === selectedItem.url
    );
  
    if (index === -1) {
      // Si le bijou n'est pas dans la liste, on l'ajoute
      selectedEarrings.value.push(selectedItem);
    } else {
      // Si le bijou est déjà dans la liste, on le retire
      selectedEarrings.value.splice(index, 1);
    }
    console.log("Items sélectionnés :", selectedEarrings.value);
  
    // On redessine l'image si on est en mode "model"
    if (mode.value === 'model') {
      if (uploadedImage.value) {
        initializeCanvas(uploadedImage.value);
      } else {
        initializeCanvas(defaultImages.value[currentIndex.value]);
      }
    }
  }
  
  
  //supprime toutes les boucles d'oreilles sélectionnées et réinitialise l'affichage sur le mannequin ou en mode live.
  function clearEarrings() {
    //Supprime toutes les boucles d'oreilles sélectionnées
    selectedEarrings.value = [];
    console.log('Boucles désélectionnées.');
    //trouve le bon canvas en fonction du mode (model ou live)
    const canvas = mode.value === 'model' ? modelCanvas.value : liveCanvas.value;
    if (canvas) {
      //efface tout le contenu du canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0, canvas.width, canvas.height);
    }
    //recharge l'image du mannequin ou l'image uploadée
    if (mode.value === 'model') {
      if (uploadedImage.value) {
        initializeCanvas(uploadedImage.value);
      } else {
        initializeCanvas(defaultImages.value[currentIndex.value]);
      }
    }
  }
  
//charge l'image (mannequin ou image uploadée) et dessine les boucle d'oreilles sur le canvas
  async function initializeCanvas(imageSrc) {
    //vérifie si on est en mode model, si on est en mode live on fait rien
    if (mode.value !== 'model') return;
    //vérifie que le canvas existe
    const canvas = modelCanvas.value;
    const ctx    = canvas.getContext('2d');
    if (!canvas) {
      console.warn("Canvas is not yet mounted or not available");
      return;
    }
  
    // Vérifie si les prédictions sont disponibles
    if (!predictions || !orientation) {
      console.warn("Pas de données de prédictions -> skip draw"); // prediction == null & orientation == null car on a pas encore appelé l'api
      return;
    }
    //charge l'image 
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      //adapte la taille du canvas à l'image
      canvas.width  = img.width;
      canvas.height = img.height;
      //efface l'ancien affichage et dessine la nouvelle image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      //si l'utilisateur a sélectionné des boucles d'oreilles, on les dessine au bon endroit
      if (selectedEarrings.value.length) {
        drawEarring(predictions, orientation);
      }
    };
  }
  
  
  
  //Dessine les boucles d'oreilles sur le canvas
  async function drawEarring(predictions,orientation) {
    console.log("drawEarring → predictions:", predictions);
    if (!selectedEarrings.value.length || !predictions.length) return;
  
    const canvas = modelCanvas.value;
    const ctx    = canvas.getContext('2d');
  
    //Repeind le fond
    const bg = new Image();
    bg.src = uploadedImage.value || defaultImages.value[currentIndex.value];
    
    //On attend que le background soit chargé
    bg.onload = async () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  
      //Convertit le fond en fichier pour l'API
      
      console.log("Image src:", bg.src);
  
      const imageSrc = bg.src;
      const blob     = await (await fetch(imageSrc)).blob();
      const file     = new File([blob], 'model_bg.jpg', { type: 'image/jpg' });
  
      //Boucle sur chaque boucle
      for (const item of selectedEarrings.value) {
        // => "earring" ou "earcuff"
        const { centerName, outerName } = landmarkMap[item.type];
        for (const prediction of predictions) {
          const centerLandmark = prediction.landmarks.find(
            (l) => l.name === centerName
          );
          const outerLandmark = prediction.landmarks.find(
            (l) => l.name === outerName
          );
  
          if (!centerLandmark || !outerLandmark) {
            console.warn("Landmarks manquants pour", item.type, centerName, outerName);
            continue;
          }
          //Appele renvoiebonneboucle pour avoir l’image déjà redimensionnée
          const scaledUrls = await renvoiebonneboucle(item.url, [prediction],orientation);
          if (!scaledUrls.length) continue;
          // On prend la première URL retournée
          const scaledImageUrl = scaledUrls[0].scaledImageUrl;
  
          //Dessine l’image redimensionnée
          const earringImg = new Image();
          earringImg.src = scaledImageUrl;
          // On attend le chargement
          await new Promise((resolve, reject) => {
            earringImg.onload = resolve;
            earringImg.onerror = reject;
          });
  
          // earringImg.width / height => c’est la taille déjà mise à l’échelle
          const eW = earringImg.width;
          const eH = earringImg.height;
  
          // Coordonnées du centre du landmark
          const [xC, yC] = centerLandmark.coordinates;
  
          // On centre l’image sur le point centerLandmark
          const x = xC - eW / 2; // Centrer horizontalement
          const y = yC ; // Centrer verticalement
  
          ctx.drawImage(earringImg, x, y, eW, eH);
        }
      }
    };
  }

  


  
  //passer aux photos suivantes du mannequin
  function backToDefault() {
    uploadedImage.value = null;
    isUploaded.value    = false;
    predictions = null; 
    orientation = null;
    loadMannequinImage();
  }
 
  const mannequinCache = new Map();
  // key: url de l’image mannequin
  // value: { predictions, orientation }
  
  function nextImage() {
    currentIndex.value = (currentIndex.value + 1) % defaultImages.value.length;
    loadMannequinImage();
  }
  
  function prevImage() {
    currentIndex.value = (currentIndex.value - 1 + defaultImages.value.length) % defaultImages.value.length;
    loadMannequinImage();
  }
  
  async function loadMannequinImage() {
    const imageSrc = defaultImages.value[currentIndex.value];
    
    // Vérifier le cache
    if (mannequinCache.has(imageSrc)) {
      const data = mannequinCache.get(imageSrc);
      predictions = data.predictions;
      orientation = data.orientation;
      initializeCanvas(imageSrc);
      return;
    }
  
    // Sinon appeler l’API
    predictions = null;
    orientation = null;
  
    const blob = await (await fetch(imageSrc)).blob();
    const file = new File([blob], "mannequin.jpg", { type: "image/jpeg" });
  
    const { predictions: p, orientation: o } = await fetchCoordinates(file);
    console.log("Mannequin predictions:", p);
    console.log("Mannequin orientation:", o);
    predictions = p;
    orientation = o;
  
    // Mise en cache
    mannequinCache.set(imageSrc, { predictions, orientation });
  
    initializeCanvas(imageSrc);
  }
  
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image valide");
      return;
    }
  
    // Remettre à zéro l'ancien "uploadedImage" et l'ancien set de prédictions
    predictions         = null;
    orientation         = null;
    isUploaded.value    = false;  
  
    // Lire l'image en base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      uploadedImage.value = event.target.result;
      isUploaded.value    = true;
  
      // On appelle l’API *une seule fois* ici
      const { predictions: preds, orientation: orient } = await fetchCoordinates(file);
      console.log("API predictions (upload) :", preds);
      console.log("API orientation (upload) :", orient);
      predictions = preds;
      orientation = orient;
  
      // Puis on dessine
      initializeCanvas(uploadedImage.value);
    };
  
    reader.readAsDataURL(file);
  
    // Pour libérer la mémoire du file input après pour éviter d'accumuler un historique
    // (optionnel, mais ça évite de garder la référence)
    e.target.value = "";
  }
 

  function toggleMode() {
  if (mode.value === 'model') {
    mode.value = 'live';
    startLive(); // lance le mode live
  } else {
    mode.value = 'model';
    stopLive(); //arrête le mode live

    // Réinitialisation pour le mode modèle
    nextTick(() => {
      if (isUploaded.value && uploadedImage.value) {
        initializeCanvas(uploadedImage.value);
      } else {
        loadMannequinImage(); // Charger les images par défaut si aucune image n'est uploadée
      }
    });
  }
}

  
  //Renvoie l'url de la bonne image de boucle d'oreille selon l'orientation du visage
  function getEarringImageNumber(angle, side, totalImages) {
      if (Math.abs(angle) < 0 || Math.abs(angle) > 90) {
        console.error("L'angle doit être compris entre 0 et 90 degrés.");
        return null;
      }
      const imageIndex = Math.floor((Math.abs(angle) / 180) * (totalImages - 1));
      const imageNumber = side === "left" 
        ? imageIndex
        : totalImages - imageIndex - 1;
      return imageNumber;
  }
  
  //capturePhoto => manually capture => show in modal => predict */
  function capturePhoto() {
    if (!video.value) return;
    const c = document.createElement('canvas');
    c.width  = video.value.videoWidth;
    c.height = video.value.videoHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(video.value, 0, 0, c.width, c.height);
  
    capturedImage.value = c.toDataURL('image/png');
    showModal.value = true;
    
    c.toBlob(async blob => {
      const file = new File([blob], 'manual_capture.jpg', { type: 'image/jpeg' });
      const preds = await fetchCoordinates(file);
      console.log("Pred capture photo:", preds);
    }, "image/jpeg");
  }
  
  
  //closeModal => hide photo modal */
  function closeModal() {
    showModal.value = false;
  }
  
  
  //triggerFileInput => open gallery */
  function triggerFileInput() {
    fileInput.value && fileInput.value.click()
  }
  

  const predictionCache = new Map();      // pour la gestion de memoire
  
  function hashImageFile(file) {
    // Fonction de hash : simple concaténation du nom, taille et date modif.
    // Dans l'idéal, on ferait un vrai hash (MD5/SHA1) du contenu binaire,
    // mais pour un proto c’est suffisant.
    return file.name + '_' + file.size + '_' + file.lastModified;
  }
  
  async function fetchCoordinates(file) {
    const key = hashImageFile(file);
  
    // Vérifier dans le cache
    if (predictionCache.has(key)) {
      console.log("Résultat récupéré du cache");
      return predictionCache.get(key);
    }
    // Sinon on appelle l'API
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post('http://127.0.0.1:5000/api/detect-ear', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // Stocker dans le cache
      const result = {
        predictions: res.data.predictions || [],
        orientation: res.data.orientation || {}
      };
      predictionCache.set(key, result);
  
      return result;
  
    } catch (err) {
      console.error("API error", err);
      return {
        predictions: [],
        orientation: {}
      };
    }
  }
  let isFetchingLive = false;
  
  
  


  ////////////////////////////////VIDEO MODE///////////////////////////////////////////////////////
 

function startLive() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      if (video.value) {
        video.value.srcObject = stream;
        video.value.onloadedmetadata = () => {
          video.value.play();
          liveCanvas.value.width = video.value.videoWidth;
          liveCanvas.value.height = video.value.videoHeight;
          requestAnimationFrame(renderLive);
        };
      }
    })
    .catch(err => console.error('Erreur lors du démarrage du flux vidéo :', err));
}


function stopLive() {
  if (video.value?.srcObject) {
    const tracks = video.value.srcObject.getTracks()
    tracks.forEach(t => t.stop())
    video.value.srcObject = null
  }
  stopPollingApi()
}

// Boucle de rendu continue
function renderLive() {
  if (mode.value !== 'live') return;

  const videoEl = video.value;
  const canvas  = liveCanvas.value;
  if (!videoEl || !canvas) return;

  const ctx = canvas.getContext('2d');

  //On ajuste le canvas aux dimensions *réelles* du flux vidéo
  canvas.width  = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;

  //Effacer le canvas à chaque frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  //Dessiner les boucles si on a des prédictions
  if (predictions && predictions.length && selectedEarrings.value.length) {
    // drawEarring() doit *uniquement* dessiner l’image de la boucle, 
    // pas de background, car la vidéo est déjà visible derrière.
    drawEarring(predictions, orientation, true);
  }

  requestAnimationFrame(renderLive);
}




let pollingActive = false; // Initialise la variable pour le suivi de l'état du polling
let pollTimer = null; // Si ce n’est pas encore défini pour gérer les timers


function startPollingApi() {
  if (pollingActive) return
  pollingActive = true
  pollApi()
}

function stopPollingApi() {
  pollingActive = false
  clearTimeout(pollTimer)
  pollTimer = null
}

/**
 * pollApi = on capture un petit aperçu (320×240),
 * on appelle fetchCoordinates, on stocke le résultat
 * dans lastPredictions, on relance pollApi() dans X ms
 */
 async function pollApi() {
  if (!pollingActive || mode.value !== 'live') return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 320;
  tempCanvas.height = 240;
  const tmpCtx = tempCanvas.getContext('2d');

  // Vérifiez si la vidéo est prête
  if (!video.value || video.value.videoWidth === 0 || video.value.videoHeight === 0) {
    console.warn('Vidéo non prête ou dimensions invalides.');
    pollTimer = setTimeout(pollApi, 1000);
    return;
  }

  // Dessiner la vidéo sur le canvas temporaire
  tmpCtx.drawImage(video.value, 0, 0, tempCanvas.width, tempCanvas.height);

  // Compression en blob JPEG
  const blob = await new Promise((resolve) => {
    tempCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.5);
  });

  if (blob) {
    const file = new File([blob], 'live.jpg', { type: 'image/jpeg' });
    // Appel API pour récupérer predictions + orientation
    const res = await fetchCoordinates(file);
    console.log("Réponse de l'API (live):", res);

    // Stocker l'objet entier : { predictions: [...], orientation: {...} }
    if (res){
        predictions  = res.predictions;
        orientation  = res.orientation;
    }
  }

  // Relance le polling après 1 seconde
  pollTimer = setTimeout(pollApi, 1000);
}


  //Fonction pour télécharger l'image
  function downloadImage() {
    const c = modelCanvas.value
    if (!c) {
      alert('No model canvas found.')
      return
    }
    const dataURL = c.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataURL
    link.download = 'photo_boucles.png'
    link.click()
  }
  
  //Fonction pour partager l'image sur les réseaux sociaux
  function shareImage() {
    const c = modelCanvas.value
    if (!c) {
      alert('No model canvas for sharing.')
      return
    }
    c.toBlob(async (blob) => {
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
  }
  </script>