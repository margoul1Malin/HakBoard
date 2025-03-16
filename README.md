# HakBoard

HakBoard est une plateforme de cybersécurité tout-en-un qui intègre de nombreux outils et fonctionnalités pour les professionnels de la sécurité informatique. Cette application Electron offre une interface moderne et intuitive pour effectuer diverses tâches de sécurité, de reconnaissance et d'analyse.

## Fonctionnalités principales

### Tableau de bord
- Vue d'ensemble des activités récentes
- Statistiques et métriques de sécurité
- Accès rapide aux fonctionnalités principales

### Gestion des tâches
- Liste de tâches personnalisable
- Suivi des progrès
- Priorisation des activités de sécurité

### Recherche d'exploits
- **ExploitDB Search**: Recherche d'exploits dans la base de données Exploit-DB
- **Exploits sauvegardés**: Gestion et organisation des exploits enregistrés pour une utilisation ultérieure

### Gestion des cibles
- Liste des cibles organisée
- Stockage des informations sur les cibles
- Suivi des tests et des vulnérabilités par cible

### Outils de scan
- **Scanner réseau**: Analyse des réseaux avec Nmap
- **SQLyzer**: Détection des vulnérabilités SQL
- **WebAlyzer**: Analyse des applications web
- **SSL/TLS Scanner**: Vérification des configurations SSL/TLS et détection des vulnérabilités

### Recherche IoT
- **Shodan**: Recherche d'appareils IoT, serveurs et systèmes connectés via l'API Shodan
- **ZoomEye**: Alternative à Shodan pour la recherche d'appareils connectés à Internet

### Outils pour les e-mails
- **OSINT Email**: Recherche d'informations sur les adresses e-mail
- **Phisher**: Création et gestion de campagnes de phishing pour les tests
- **Sender**: Outil d'envoi d'e-mails pour les tests

### Outils pour les téléphones
- **OSINT Phone**: Recherche d'informations sur les numéros de téléphone
- **Smooding**: Envoi de SMS pour les tests
- **Smishing**: Création et gestion de campagnes de phishing par SMS

### Outils de sécurité
- **PrivEsc Check**: Vérification des possibilités d'élévation de privilèges sur les systèmes Linux et Windows
  - Intégration de PEASS-ng (Privilege Escalation Awesome Scripts Suite)
  - Support pour LinPEAS et WinPEAS

### Coffre-fort
- Stockage sécurisé des informations sensibles
- Gestion des mots de passe et des identifiants
- Chiffrement des données

### Paramètres
- Personnalisation de l'interface (thème clair/sombre)
- Configuration des API (Shodan, ZoomEye, etc.)
- Préférences utilisateur

## Architecture technique

L'application est construite avec:
- **Electron**: Pour l'application de bureau multi-plateforme
- **React**: Pour l'interface utilisateur
- **Node.js**: Pour les fonctionnalités backend
- **Tailwind CSS**: Pour le design responsive et moderne

## Structure du projet
```
src
├── App.js                      # Point d'entrée principal de l'application
├── components                  # Composants React organisés par fonctionnalité
│   ├── common                  # Composants communs réutilisables
│   ├── Dashboard.jsx           # Tableau de bord principal
│   ├── emails                  # Outils liés aux e-mails
│   ├── exploitdb               # Recherche et gestion des exploits
│   ├── iot                     # Recherche d'appareils IoT (Shodan, ZoomEye)
│   ├── phones                  # Outils liés aux téléphones
│   ├── scanner                 # Outils de scan (réseau, web, SQL, SSL/TLS)
│   ├── security                # Outils de sécurité (PrivEsc)
│   ├── Settings.jsx            # Paramètres de l'application
│   ├── Sidebar.jsx             # Barre latérale de navigation
│   ├── targets                 # Gestion des cibles
│   ├── TodoList.jsx            # Gestion des tâches
│   └── vault                   # Coffre-fort pour les informations sensibles
├── context                     # Contextes React pour la gestion d'état
├── scripts                     # Scripts pour diverses fonctionnalités
├── services                    # Services pour les API et la gestion des données
├── styles                      # Styles CSS
└── utils                       # Utilitaires et modèles de données
```

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-utilisateur/HakBoard.git

# Accéder au répertoire
cd HakBoard

# Installer les dépendances
npm install

# Lancer l'application
npm start
```

## Dépendances externes

Certaines fonctionnalités nécessitent des outils externes:
- Nmap pour le scanner réseau
- Python pour certains scripts
- Accès aux API (Shodan, ZoomEye, etc.)

## Avertissement

Cette application est conçue pour les professionnels de la sécurité informatique et les tests légitimes. Utilisez ces outils de manière responsable et uniquement sur des systèmes pour lesquels vous avez l'autorisation explicite.

## Développement futur

Fonctionnalités prévues pour les prochaines versions:
- Intégration d'autres moteurs de recherche IoT
- Visualisation des données sur des cartes
- Rapports automatisés
- Intégration avec d'autres outils de sécurité
