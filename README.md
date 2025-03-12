# DashTo - Dashboard & TodoList

Une application moderne de tableau de bord et de gestion de tâches construite avec Electron et React.

## Fonctionnalités

- Interface utilisateur moderne et réactive
- Gestion complète des tâches (ajout, édition, suppression)
- Priorités pour les tâches (faible, moyenne, élevée)
- Tableau de bord avec statistiques et graphiques
- Mode sombre/clair
- Personnalisation des couleurs
- Interface responsive

## Captures d'écran

(Les captures d'écran seront ajoutées après le premier lancement)

## Prérequis

- Node.js (v14 ou supérieur)
- npm ou yarn

## Installation

1. Clonez ce dépôt
   ```
   git clone https://github.com/votre-nom/dashto.git
   cd dashto
   ```

2. Installez les dépendances
   ```
   npm install
   ```

3. Lancez l'application en mode développement
   ```
   npm run dev
   ```

## Utilisation

### Démarrage

```
npm start
```

### Développement

```
npm run dev
```

### Construction du package

```
npm run build
```

## Structure du projet

```
dashto/
├── dist/               # Fichiers compilés
├── node_modules/       # Dépendances
├── src/                # Code source
│   ├── components/     # Composants React
│   ├── hooks/          # Hooks personnalisés
│   ├── store/          # Gestion de l'état
│   ├── styles/         # Fichiers CSS
│   ├── utils/          # Utilitaires
│   ├── App.js          # Composant principal
│   └── index.js        # Point d'entrée
├── .gitignore          # Fichiers ignorés par Git
├── index.html          # Page HTML principale
├── main.js             # Point d'entrée Electron
├── package.json        # Dépendances et scripts
├── preload.js          # Script de préchargement Electron
├── README.md           # Documentation
└── webpack.config.js   # Configuration de build
```

## Personnalisation

Vous pouvez personnaliser l'application en modifiant les paramètres dans l'onglet "Paramètres" de l'application.

## Licence

ISC

## Auteur

Votre nom

---

Fait avec ❤️ et Electron 