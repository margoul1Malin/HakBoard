#!/bin/bash

echo "Correction des permissions pour exécuter Electron en tant que root..."

# Réparer les permissions du répertoire electron complet
sudo chmod -R 755 ./node_modules/electron/dist/
sudo chown -R root:root ./node_modules/electron/dist/

# Correction des problèmes d'autorisation pour les fichiers de bibliothèques spécifiques
sudo chmod 755 ./node_modules/electron/dist/electron
sudo chmod 755 ./node_modules/electron/dist/*.so
sudo chmod 755 ./node_modules/electron/dist/*.bin
sudo chmod 755 ./node_modules/electron/dist/*.pak
sudo chmod 755 ./node_modules/electron/dist/*.dat

# Réparer les permissions des répertoires locaux
sudo chmod -R 755 .
sudo chown -R $USER:$USER .

# Corriger ~/.config pour éviter les problèmes de droits
mkdir -p ~/.config/electron
sudo chmod -R 777 ~/.config/electron

echo "----------------------------------------"
echo "Permissions corrigées."
echo "Si l'application ne démarre toujours pas correctement,"
echo "essayez de la lancer ainsi depuis un terminal non-root :"
echo ""
echo "pkexec env DISPLAY=\$DISPLAY XAUTHORITY=\$XAUTHORITY npm start -- --no-sandbox"
echo "----------------------------------------" 