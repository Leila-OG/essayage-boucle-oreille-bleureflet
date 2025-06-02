/**
 * Redimensionne l'image boucle d'oreille pour qu'elle corresponde à la distancePx donnée.
 */
export async function miseAEchelle(distancePx, url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      // Dimensions originales de l'image
      const originalWidth = img.width;
      const originalHeight = img.height;
      const echelle = distancePx / originalHeight;

      // Nouvelles dimensions
      const scaledWidth = Math.round(originalWidth * echelle);
      const scaledHeight = Math.round(originalHeight * echelle);

      // Crée un canvas pour redimensionner l'image
      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      // Récupère l'image redimensionnée sous forme de DataURL
      const scaledImageUrl = canvas.toDataURL();
      resolve(scaledImageUrl);
    };

    img.onerror = (errorEvent) => {
      console.error("Impossible de charger l’image :", url, errorEvent);
      reject("Erreur lors du chargement de l'image : " + errorEvent);
    };
  });
}

/**
 * Calcule la bonne URL + redimensionne pour chaque oreille détectée.
 */
export async function renvoieBonneBoucle(itemUrl, predictions, orientation) {
  if (!predictions || !predictions.length) {
    console.error("Aucune prédiction détectée");
    return null;
  }

  // Array pour stocker les URLs modifiées pour chaque oreille
  const scaledUrls = [];

  for (const prediction of predictions) {
    const distancePx = prediction.distance_px;
    const earSide = prediction.ear_side;
    console.log("distancePx =", distancePx)

    const yaw = orientation.yaw;

    if (yaw == null) {
      console.warn("orientation.yaw est inexistant");
      // fallback au lieu d'annulation de la reconstruction path ??????????????????
      const fallbackScaled = await miseAEchelle(distancePx, itemUrl);
      scaledUrls.push({ earSide, scaledImageUrl: fallbackScaled });
      continue;
    }
    console.log('yaw =', orientation.yaw, 'earSide =', earSide);

    const imageNumber = getEarringImageNumber(yaw, earSide, 65);
    console.log('imageNumber', imageNumber);

    if (imageNumber == null) {
      console.warn("L'angle calculé est hors intervalle 0-90, on fait un fallback ?");
      const fallbackScaled = await miseAEchelle(distancePx, itemUrl);
      scaledUrls.push({ earSide, scaledImageUrl: fallbackScaled });
      continue;
    }

    const formattedNumber = String(imageNumber).padStart(3, '0');
    console.log('itemUrl', itemUrl);
    console.log('formattedNumber', formattedNumber);

    // Reconstruire le path
    const reconstructedPath = itemUrl.replace(/\/([^/]*)$/, (_, fileName) => {
      const updatedFileName = fileName.replace(/^\d{3}/, formattedNumber);   // /^\d{3}/
      return `/${updatedFileName}`;
    });
    console.log('reconstructedPath',reconstructedPath)

    // Appeler la mise à échelle
    try {
      const scaledImageUrl = await miseAEchelle(distancePx, reconstructedPath);
      scaledUrls.push({ earSide, scaledImageUrl });
    } catch(err) {
      console.error('Erreur mise à échelle', err);
    }
  }
  return scaledUrls;
}

function getEarringImageNumber(angle, side, totalImages) {
  if (Math.abs(angle) < 0 || Math.abs(angle) > 90) {
    console.error("L'angle doit être compris entre 0 et 90 degrés.");
    return null;
  }
  const imageIndex = Math.floor((Math.abs(angle) / 180) * (totalImages - 1));
  const imageNumber = side === "left" 
    ? imageIndex
    : totalImages - imageIndex - 1;
  console.log(`Calcul de l'imageNumber : angle=${angle}, side=${side}, imageNumber=${imageNumber}`);
  return imageNumber;
}
