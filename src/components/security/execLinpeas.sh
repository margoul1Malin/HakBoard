#!/bin/bash
# Script pour exécuter LinPEAS directement depuis le dépôt GitHub
# Ce script télécharge la dernière version de LinPEAS et l'exécute

echo "[*] Démarrage de l'analyse LinPEAS..."
echo "[*] Téléchargement de LinPEAS depuis GitHub..."

# URL de la dernière version de LinPEAS
LINPEAS_URL="https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/linPEAS/linpeas.sh"

# Créer un répertoire temporaire
TEMP_DIR=$(mktemp -d)
TEMP_FILE="$TEMP_DIR/linpeas.sh"

echo "[*] Téléchargement de LinPEAS vers $TEMP_FILE"

# Télécharger LinPEAS
if command -v curl > /dev/null 2>&1; then
    curl -s -o "$TEMP_FILE" "$LINPEAS_URL"
    DOWNLOAD_STATUS=$?
elif command -v wget > /dev/null 2>&1; then
    wget -q -O "$TEMP_FILE" "$LINPEAS_URL"
    DOWNLOAD_STATUS=$?
else
    echo "[!] Erreur: curl ou wget est requis pour télécharger LinPEAS"
    exit 1
fi

# Vérifier si le téléchargement a réussi
if [ $DOWNLOAD_STATUS -ne 0 ]; then
    echo "[!] Erreur lors du téléchargement de LinPEAS"
    exit 1
fi

echo "[+] LinPEAS téléchargé avec succès"
echo "[*] Exécution de LinPEAS..."
echo "==========================================="

# Rendre le script exécutable
chmod +x "$TEMP_FILE"

# Exécuter LinPEAS
bash "$TEMP_FILE" -a 2>&1

# Nettoyer les fichiers temporaires
rm -rf "$TEMP_DIR"

echo "==========================================="
echo "[+] Analyse LinPEAS terminée"

