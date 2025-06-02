<template>
  <div class="live-container">
    <video ref="video" autoplay playsinline class="responsive-media"></video>
    <canvas ref="liveCanvas" class="overlay-canvas"></canvas>
    <div class="capture-button" @click="capturePhoto"></div>

    <button class="choose-earrings-button" @click="$emit('chooseEarrings')">
      <i class="fas fa-gem"></i>
    </button>

    <button class="modal-btn" @click="$emit('downloadImage')" aria-label="Télécharger">
      <i class="fas fa-download"></i>
    </button>
    <button class="modal-btn" @click="$emit('shareImage')" aria-label="Partager">
      <i class="fas fa-share-alt"></i>
    </button>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

// Refs Vue pour le DOM
const video = ref(null);
const liveCanvas = ref(null);

// Stockage des données de suivi du visage
const liveData = ref({
  angleDeg: 0,
  leftEarDistance: 0,
  rightEarDistance: 0
});

// Détection faciale avec FaceMesh
let faceMesh = null;
let camera = null;
//pour le lissage (arrondis) des angles d'orientation du visage
//let smoothedAngle = 0;
//const ALPHA = 0.8;
//const ZERO_BAND = 5;

// Props et événements Vue
const props = defineProps({
  selectedEarrings: Array    // Boucles choisies par l'utilisateur
});

// Émissions
const emit = defineEmits(["chooseEarrings", "photoCaptured", "downloadImage", "shareImage"]);

/** === 🟢 DÉMARRE LE MODE LIVE 🟢 === */
function startLive() {
  if (!video.value) {
    console.warn("🔴 Vidéo non prête !");
    return;
  }

  if (faceMesh || camera) return;

  faceMesh = new window.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(onResults);

  camera = new window.Camera(video.value, {
    onFrame: async () => {
      if (faceMesh) { // 🔥 Vérification ajoutée
        await faceMesh.send({ image: video.value });
      } else {
        console.warn("FaceMesh non initialisé !");
      }
    }
  });
  camera.start();
}

/** === 🔴 STOPPE LE MODE LIVE 🔴 === */
function stopLive() {
  if (camera) {
    camera.stop();
    camera = null;
  }
  if (faceMesh) {
    faceMesh.close && faceMesh.close();
    faceMesh = null;
  }
}

/** === 📌 Estimer l'orientation YAW de la tête via les yeux === */
function estimateYawFromEyes(landmarks, w, h) {
  const leftEyeLm = landmarks[33];  // Coin intérieur de l'œil gauche
  const rightEyeLm = landmarks[263]; // Coin intérieur de l'œil droit
  if (!leftEyeLm || !rightEyeLm) return null;

  const pL = { x: leftEyeLm.x * w, y: leftEyeLm.y * h };
  const pR = { x: rightEyeLm.x * w, y: rightEyeLm.y * h };

  const dx = pR.x - pL.x;
  const dy = pR.y - pL.y;

  // Calcul de l'angle d'orientation en degrés
  let angleRad = Math.atan2(dy, dx);
  let angleDeg = angleRad * (180 / Math.PI);

  return Math.round(angleDeg);
}

/**fonction auxiliaire
* Calcule la distance en pixels entre deux landmarks indexA et indexB 
* dans un tableau FaceMesh "landmarks", 
* sur un canvas de dimensions (w,h).
*/
 function getLandmarksDistancePx(landmarks, indexA, indexB, w, h) {
  const lmA = landmarks[indexA];
  const lmB = landmarks[indexB];
  if (!lmA || !lmB) {
    console.warn(`Landmark manquant: index ${indexA} ou ${indexB}`);
    return 0;
  }
  const pA = getPixelCoordinates(lmA, w, h);
  const pB = getPixelCoordinates(lmB, w, h);
  
  const dx = pB.x - pA.x;
  const dy = pB.y - pA.y;
  return Math.hypot(dx, dy);
}

// Fonctions auxiliaires qui permet de convertir les landmarks en pixels
function getPixelCoordinates(lm, w, h) {
  return { x: lm.x * w, y: lm.y * h };
}

//fonction auxiliaire qui permet de tracer une droite à partir de 2 landmarks
function drawExtendedLine(lm1, lm2, w, h, extension) {
  const p1 = getPixelCoordinates(lm1, w, h);
  const p2 = getPixelCoordinates(lm2, w, h);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  return {
    start: {
      x: p1.x - (dx / d) * extension,
      y: p1.y - (dy / d) * extension
    },
    end: {
      x: p2.x + (dx / d) * extension,
      y: p2.y + (dy / d) * extension
    }
  };
}


/** === 🎯 DÉTECTION FACIALE : TRAITEMENT DES RÉSULTATS 🎯 === */
function onResults(results) {
  if (!liveCanvas.value || !video.value) return;

  const w = (liveCanvas.value.width = video.value.videoWidth);
  const h = (liveCanvas.value.height = video.value.videoHeight);
  const ctx = liveCanvas.value.getContext('2d');

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Effet miroir
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  // Dessiner la frame vidéo
  ctx.drawImage(results.image, 0, 0, w, h);
  ctx.restore();

  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
  const landmarks = results.multiFaceLandmarks[0];
  // Calcul des angles et distances des oreilles
  let rawAngleDeg = estimateYawFromEyes(landmarks, w, h);
  //if (!Number.isFinite(rawAngleDeg)) {
    //return;
  //}
  // lissage exponentiel
  //smoothedAngle = ALPHA * smoothedAngle + (1 - ALPHA) * rawAngleDeg;
  // on clampe autour de 0
  //if (Math.abs(smoothedAngle) < ZERO_BAND) {
    //smoothedAngle = 0;
  //}
  //angle final = arrondi
  const angleDeg = estimateYawFromEyes(landmarks, w, h);
  const leftEarDistance = getLandmarksDistancePx(landmarks, 162, 177, w, h);
  const rightEarDistance = getLandmarksDistancePx(landmarks, 389, 361, w, h);

  liveData.value = { angleDeg, leftEarDistance, rightEarDistance };

  // Position des oreilles
  let earPositions = {
    left: null,
    right: null
  };

  earPositions.left = getEarPosition(landmarks, w, h, "left");
  earPositions.right = getEarPosition(landmarks, w, h, "right");
  console.log("Boucles sélectionnées :", props.selectedEarrings);

  // Affichage des boucles d'oreilles en live
  drawLiveEarrings(ctx, props.selectedEarrings, earPositions);
}

function getImageNumberLive(angleDeg, side, totalImages) {
  // On limite l’angle à 0..90
  if (Math.abs(angleDeg) < 0 || Math.abs(angleDeg) > 90) {
    console.error("Angle doit être entre 0 et 90° (approx). Reçu :", angleDeg);
    return null;
  }
  // Convertir l’angle 0..90 en un index 0..(totalImages-1)
  const imageIndex = Math.floor((Math.abs(angleDeg) / 180) * (totalImages - 1));

  // side='left' => index direct
  // side='right' => on inverse
  if (side === 'left') {
    return imageIndex;
  } else {
    return (totalImages - imageIndex - 1);
  }
}

/** === 🏷️ CALCUL POSITION OREILLE (LOBES) 🏷️ === */
function getEarPosition(landmarks, w, h, side) {
  const extension = 1000;
  let line1, line2;

  if (side === "left") {
    line1 = drawExtendedLine(landmarks[58], landmarks[172], w, h, extension);
    line2 = drawExtendedLine(landmarks[54], landmarks[234], w, h, extension);
  } else {
    line1 = drawExtendedLine(landmarks[284], landmarks[454], w, h, extension);
    line2 = drawExtendedLine(landmarks[288], landmarks[397], w, h, extension);
  }

  if (line1 && line2 && side=="left") {
    const inter = computeIntersection(line1.start, line1.end, line2.start, line2.end);
    const leftLimit = getPixelCoordinates(landmarks[50], w, h).x;
    if (inter) {
      if(inter.x<leftLimit){
      return { x: w - inter.x, y: inter.y };
    }
  }
  }

  if (line1 && line2 && side!="left") {
    const inter = computeIntersection(line1.start, line1.end, line2.start, line2.end);
    const rightLimit = getPixelCoordinates(landmarks[280], w, h).x;
    if (inter) {
      if(inter.x>rightLimit){
      return { x: w - inter.x, y: inter.y };
    }
  }
  }
  return null;
}

//fonction auxiliaire qui permet d'obtenir le point d'intersection de 2 droites
//ça va servir à déterminer la position du lobe qui est en fait l'intersection entre 2 droites
function computeIntersection(p1, p2, p3, p4) {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (denom === 0) return null;
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
}

/**
* renvoieBonneboucleLive
* @param {string} itemUrl    - l’URL de base de la boucle, ex. ".../042_bleu_65mm.png"
* @param {string} side       - 'left' ou 'right'
* @param {number} angleDeg   - l’angle yaw en degrés
* @param {number} distancePx - la distance en pixels pour redimensionner
* @returns {Promise<string|null>} l’URL final (DataURL) de la boucle redimensionnée, ou null
*/
async function renvoieBonneboucleLive(itemUrl, side, angleDeg, distancePx) {
  //Calcule le numéro d’image
  const totalImages = 65; // par exemple
  const imageNumber = getImageNumberLive(angleDeg, side, totalImages);
  if (imageNumber == null) {
    console.warn("angleDeg hors plage => on ne fait rien");
    return null;
  }

  // On Reconstruit le path => remplace les 3 premiers digits
  const formattedNumber = imageNumber.toString().padStart(3, '0');

  const reconstructedPath = itemUrl.replace(/\/([^\/]*)$/, (_, fileName) => {
    return '/' + fileName.replace(/^\d{3}/, formattedNumber);
  });

  //Mise à échelle => on veut un ratio = distancePx / hauteur
  const scaledUrl = await miseAEchelleLive(distancePx, reconstructedPath);
  return scaledUrl;
}

/**
* miseAEchelleLive
* Redimensionne l’image en fonction de distancePx (oreille).
* Suppose que l’image originale a une "hauteur" de base qu’on veut aligner à distancePx.
*/
async function miseAEchelleLive(distancePx, url) {
  // Charger l’image
  const img = new Image();
  img.src = url;

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const origWidth  = img.width;
      const origHeight = img.height;

      // Facteur d’échelle => la hauteur finale = distancePx
      const scale = distancePx / origHeight;

      const scaledW = Math.round(origWidth  * scale);
      const scaledH = Math.round(origHeight * scale);

      // On crée un canvas pour y dessiner l’image redimensionnée
      const canvas = document.createElement('canvas');
      canvas.width  = scaledW;
      canvas.height = scaledH;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, scaledW, scaledH);

      const scaledUrl = canvas.toDataURL();
      resolve(scaledUrl);
    };
    img.onerror = (err) => {
      console.error("Impossible de charger l'image (live) :", url, err);
      reject(err);
    };
  });
}

async function drawLiveEarrings(ctx, items, earPositions) {
  const angleDeg   = liveData.value.angleDeg;
  const leftDist   = liveData.value.leftEarDistance;
  const rightDist  = liveData.value.rightEarDistance;

  for (const item of items) {
    // On récupère "side" en fonction de quelle oreille on veut dessiner
    // Mais dans ce cas, on veut DESSINER 2 FOIS si 2 intersections ? 

    // =============== OREILLE GAUCHE ===============
    if (earPositions.left) {
      // On calcule l’URL final
      const scaledUrlLeft = await renvoieBonneboucleLive(
        item.url, 
        'left',    // side
        angleDeg, 
        leftDist
      );
      if (scaledUrlLeft) {
        const imgLeft = new Image();
        imgLeft.src = scaledUrlLeft;
        await new Promise((resolve, reject) => {
          imgLeft.onload  = resolve;
          imgLeft.onerror = reject;
        });
        const xLobe = earPositions.left.x;
        const yLobe = earPositions.left.y;

        // Dimensions de la boucle
        const eW = imgLeft.width;
        const eH = imgLeft.height;

        // On centre la tige de la boucle sur le point jaune
        ctx.drawImage(imgLeft, xLobe - eW/2, yLobe, eW, eH);
      }
    }

    // =============== OREILLE DROITE ===============
    if (earPositions.right) {
      const scaledUrlRight = await renvoieBonneboucleLive(
        item.url, 
        'right',   // side
        angleDeg, 
        rightDist
      );
      if (scaledUrlRight) {
        const imgRight = new Image();
        imgRight.src = scaledUrlRight;
        await new Promise((resolve, reject) => {
          imgRight.onload  = resolve;
          imgRight.onerror = reject;
        });
        const xLobe = earPositions.right.x;
        const yLobe = earPositions.right.y;

        const eW = imgRight.width;
        const eH = imgRight.height;

        // On centre la tige de la boucle sur le point jaune
        ctx.drawImage(imgRight, xLobe - eW/2, yLobe, eW, eH);
      }
    }

  }
}

/** === 📸 CAPTURE UNE PHOTO 📸 === */
const capturedImage = ref(null);
const showModal = ref(false);

function capturePhoto() {
  // capturedImage.value = liveCanvas.value.toDataURL("image/png");
  // showModal.value = true;

  if (!liveCanvas.value) {
    console.error("Canvas live introuvable");
    return;
  }
  const dataUrl = liveCanvas.value.toDataURL("image/png");
  emit("photoCaptured", dataUrl); // Envoie la capture au parent (TestRefactored)
}

onMounted(() => {
  startLive();
});

onBeforeUnmount(() => {
  stopLive();
});
</script>

