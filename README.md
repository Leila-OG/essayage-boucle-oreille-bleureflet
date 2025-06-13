# Essayage Virtuel de Boucles d’Oreilles – Computer Vision & Réalité Augmentée

## Objectif du projet (Projet de fin d'étude proposé par l'entreprise Bleu Reflet)

Ce projet vise à créer une application web interactive permettant l’**essayage virtuel de boucles d’oreilles** à partir d’une photo ou d’un flux vidéo en direct. L’objectif est d’offrir une **expérience client immersive** dans le secteur de la joaillerie, en combinant **vision par ordinateur**, **deep learning**, **web interactif** et **rendu temps réel**.

Deux modes sont disponibles :
- **Mode "Model"** : upload ou sélection d’image
- **Mode "Live"** : capture via webcam

**N.B.** Le projet a été réalisé en équipe (de 5 personnes). Pour ma part, j'ai participé au développement du Backend (**Entraînement du modèle YOLO pour la reconnaissance des oreilles**) et du Frontend (**optimisation de l'interface utilisateur**).

---

## Structure du projet
### Backend (Flask ou FastAPI)
**Répertoire : `/api`**

- `api.py` – Point d’entrée du serveur backend
  - `detect_ear()` : reçoit une image, applique YOLOv8 pour la détection de l’oreille, puis extrait les landmarks avec un autoencodeur.
  - `orientation()` : calcule l’orientation du visage (yaw, pitch, roll) via MediaPipe.
  - `health_check()` : vérifie que l’API fonctionne (en développement).

**Répertoire : `/models`**

- `/yolo/` – contient les poids du modèle YOLOv8 (`yolov8s.pt`)
- `/landmarks/` – contient les modèles d’autoencodeur (.pt ou .tflite)

---

### Frontend (Vue.js)
**Répertoire : `/src`**

- `AppRefactored.vue` – Composant principal, gère les états et les vues
- `main.js` – Point d’entrée Vue
- `style.css` – Style global de l’application

**Composants :**

- `ModelView.vue` : upload et gestion d’image modèle
- `LiveView.vue` : capture vidéo en direct, détection en temps réel avec MediaPipe
- `EarringSelection.vue` : carrousel de boucles d’oreilles
- `ToggleMode.vue` : bascule entre modes "Model" / "Live"
- `CircularMenu.vue` : menu interactif pour partager, télécharger, changer de bijou

**Utilitaires JS (dans `/utils`) :**

- `canvasUtils.js` : redimensionnement de l’image des boucles, ajustement selon l’orientation
- `api.js` : gestion des appels réseau, envoie l’image à `/api/detect-ear` et traite la réponse

**Assets :**

- Images de boucles d’oreilles, organisées par catégorie et style

---

## Flux de données

1. L'utilisateur active la webcam (`LiveView.vue`) ou charge une image (`ModelView.vue`)
2. Une image est envoyée à `/api/detect-ear`
3. YOLOv8 détecte la bounding box de l’oreille → autoencodeur extrait les landmarks
4. JSON renvoyé : `{ ear_side, landmarks, confidence, orientation }`
5. Le frontend place la boucle d’oreille à la bonne position en tenant compte de l’orientation

---

## Installation & Lancement

### Backend (Python 3.9+)
```bash
git clone https://...
conda create -n earring_env python=3.9
pip install -r requirements.txt
python api/api.py
```

### Frontend 
```
npm install
npm run dev (ou `npm run build` + `npm run preview` en production)
npm run dev -- --host 0.0.0.0 depuis le serveur
```

## Roadmap / Evolutions 
- Dockerisation pour QA & déploiement
- Passage à un serveur GPU pour meilleure scalabilité
- Amélioration de la fluidité du mode Live
