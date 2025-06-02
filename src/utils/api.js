import axios from 'axios';

const predictionCache = new Map();

function hashImageFile(file) {
  // Fonction de hash : simple concaténation du nom, taille et date modif.
  // Dans l'idéal, on ferait un vrai hash (MD5/SHA1) du contenu binaire,
  // mais pour un proto c’est suffisant.
  return file.name + '_' + file.size + '_' + file.lastModified;
}

export async function fetchCoordinates(file) {
  const key = hashImageFile(file);
  if (predictionCache.has(key)) {
    return predictionCache.get(key);
  }
  try {
    const formData = new FormData();
    formData.append('image', file);

    const res = await axios.post('http://127.0.0.1:5000/api/detect-ear', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const result = {
      predictions: res.data.predictions || [],
      orientation: res.data.orientation || {},
    };
    predictionCache.set(key, result);

    return result;
  } catch (err) {
    console.error("API error", err);
    return {
      predictions: [],
      orientation: {},
    };
  }
}
