#!/bin/bash

# Définition des couleurs
BOLD='\e[1m'
RED='\e[31m'
GREEN='\e[32m'
YELLOW='\e[33m'
BLUE='\e[34m'
NC='\e[0m' # Réinitialisation des couleurs

echo -e "${BOLD}${BLUE}📢 Activation de l'Environnement Python...${NC}"
source env/bin/activate || { echo -e "${BOLD}${RED}❌ Erreur : Échec de l'activation de pyenv !${NC}"; exit 1; }

echo -e "${BOLD}${YELLOW}🔧 Configuration de l'accès X11 pour root...${NC}"
xhost +local:root && echo -e "${BOLD}${GREEN}✅ Accès X11 autorisé pour root.${NC}" || { echo -e "${BOLD}${RED}❌ Erreur lors de la configuration de X11 !${NC}"; exit 1; }

echo -e "${BOLD}${BLUE}⚙️  Compilation en cours...${NC}"
npm run webpack && echo -e "${BOLD}${GREEN}✅ Compilation réussie !${NC}" || { echo -e "${BOLD}${RED}❌ Erreur lors de la compilation !${NC}"; exit 1; }

echo -e "${BOLD}${YELLOW}🚀 Démarrage de l'application HakBoard avec privilèges root...${NC}"
sudo npm start -- --no-sandbox && echo -e "${BOLD}${GREEN}✅ Application démarrée avec succès.${NC}" || { echo -e "${BOLD}${RED}❌ Erreur lors du démarrage de l'application !${NC}"; exit 1; }

echo -e "${BOLD}${YELLOW}🔒 Révocation de l'accès X11 pour root...${NC}"
xhost -local:root && echo -e "${BOLD}${GREEN}✅ Accès X11 pour root révoqué.${NC}" || { echo -e "${BOLD}${RED}❌ Erreur lors de la révocation de l'accès X11 !${NC}"; exit 1; }

echo -e "${BOLD}${BLUE}🎉 Application fermée proprement.${NC}"
