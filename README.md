# Lalaothèque - Fanorona & Jeux de Faritany 🇲🇬

Bienvenue dans la **Lalaothèque**, une collection d'applications mobiles dédiée aux jeux de stratégie traditionnels malgaches, développée avec **React Native** et **Expo**.

## 🎮 Jeux Inclus

1. **Fanorona Sivy** :
   - Le jeu de société stratégique emblématique de Madagascar.
   - Mode Humain vs Humain.
   - Mode Humain vs Intelligence Artificielle (IA).
   - *Architecture IA* : Minimax avec élagage Alpha-Beta et évaluation par Réseau de Neurones.

2. **Le Jeu des Points** :
   - Jeu de conquête territoriale et d'encerclement.
   - Mode 2 Joueurs.
   - Grille dynamique et redimensionnement automatique en cas d'égalité.
   - Plateau de jeu immersif et tactile.

## 🚀 Technologies Utilisées
- **Framework** : React Native & Expo
- **Langage** : TypeScript
- **Style & SVG** : `react-native-svg`
- **Moteur Logique** : Algorithmes TypeScript intégrés sans dépendances externes lourdes pour l'IA.

## 📱 Comment Lancer le Projet (Local)

Assurez-vous d'avoir [Node.js](https://nodejs.org/) et [Git](https://git-scm.com/) installés.

1. **Cloner le repository** :
   ```bash
   git clone git@github.com:TkAbeleon/Fanorona-Jeux_de_Faritany.git
   cd Fanorona-Collection
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement Expo** :
   ```bash
   npx expo start
   ```

4. **Tester sur votre appareil** :
   Scannez le QR Code apparu dans le terminal avec l'application **Expo Go** (disponible sur Android et iOS).

## 💡 Remarques UI / Ergonomie
L'interface a été récemment repensée pour être le plus immersif possible sur appareil mobile (mode portrait) :
- Les plateaux de jeu occupent un espace maximal.
- Les zones de contrôles des deux joueurs sont disposées en face-à-face (en haut et en bas de l'écran) procurant une expérience authentique de duel.

## 📜 Licence
Ce projet est développé par **TkAbeleon**. Tous droits réservés.
