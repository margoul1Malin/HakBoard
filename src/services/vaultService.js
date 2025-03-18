// Service pour gérer le coffre-fort numérique (mots de passe, clés API, etc.)
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

// Clé pour le stockage local
const VAULT_KEY = 'secure_vault_data';
const MASTER_PASSWORD_HASH_KEY = 'master_password_hash';
const VAULT_INITIALIZED_KEY = 'vault_initialized';

// Fonction pour vérifier si le coffre-fort est initialisé
export const isVaultInitialized = () => {
  try {
    return localStorage.getItem(VAULT_INITIALIZED_KEY) === 'true';
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'initialisation du coffre-fort:', error);
    return false;
  }
};

// Fonction pour initialiser le coffre-fort avec un mot de passe maître
export const initializeVault = (masterPassword) => {
  try {
    if (isVaultInitialized()) {
      return { success: false, message: 'Le coffre-fort est déjà initialisé.' };
    }

    // Hasher le mot de passe maître
    const passwordHash = CryptoJS.SHA256(masterPassword).toString();
    
    // Stocker le hash du mot de passe
    localStorage.setItem(MASTER_PASSWORD_HASH_KEY, passwordHash);
    
    // Initialiser le coffre-fort vide et le chiffrer
    const emptyVault = [];
    const encryptedVault = CryptoJS.AES.encrypt(
      JSON.stringify(emptyVault),
      masterPassword
    ).toString();
    
    // Stocker le coffre-fort chiffré
    localStorage.setItem(VAULT_KEY, encryptedVault);
    localStorage.setItem(VAULT_INITIALIZED_KEY, 'true');
    
    return { success: true, message: 'Coffre-fort initialisé avec succès.' };
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du coffre-fort:', error);
    return { success: false, message: 'Erreur lors de l\'initialisation du coffre-fort.' };
  }
};

// Fonction pour vérifier le mot de passe maître
export const verifyMasterPassword = (masterPassword) => {
  try {
    const storedHash = localStorage.getItem(MASTER_PASSWORD_HASH_KEY);
    if (!storedHash) {
      return false;
    }
    
    const inputHash = CryptoJS.SHA256(masterPassword).toString();
    return storedHash === inputHash;
  } catch (error) {
    console.error('Erreur lors de la vérification du mot de passe maître:', error);
    return false;
  }
};

// Fonction pour obtenir tous les éléments du coffre-fort
export const getVaultItems = (masterPassword) => {
  try {
    if (!verifyMasterPassword(masterPassword)) {
      return { success: false, message: 'Mot de passe maître incorrect.', data: [] };
    }
    
    const encryptedVault = localStorage.getItem(VAULT_KEY);
    if (!encryptedVault) {
      return { success: true, data: [] };
    }
    
    // Déchiffrer le coffre-fort
    const bytes = CryptoJS.AES.decrypt(encryptedVault, masterPassword);
    const decryptedVault = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    
    return { success: true, data: decryptedVault };
  } catch (error) {
    console.error('Erreur lors de la récupération des éléments du coffre-fort:', error);
    return { success: false, message: 'Erreur lors de la récupération des éléments du coffre-fort.', data: [] };
  }
};

// Fonction pour ajouter un élément au coffre-fort
export const addVaultItem = (masterPassword, item) => {
  try {
    const result = getVaultItems(masterPassword);
    
    if (!result.success) {
      return result;
    }
    
    const vaultItems = result.data;
    
    // Ajouter un ID unique et la date de création
    const newItem = {
      ...item,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    vaultItems.push(newItem);
    
    // Chiffrer et stocker le coffre-fort mis à jour
    const encryptedVault = CryptoJS.AES.encrypt(
      JSON.stringify(vaultItems),
      masterPassword
    ).toString();
    
    localStorage.setItem(VAULT_KEY, encryptedVault);
    
    return { success: true, message: 'Élément ajouté avec succès.', data: newItem };
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'un élément au coffre-fort:', error);
    return { success: false, message: 'Erreur lors de l\'ajout d\'un élément au coffre-fort.' };
  }
};

// Fonction pour mettre à jour un élément du coffre-fort
export const updateVaultItem = (masterPassword, id, updatedItem) => {
  try {
    const result = getVaultItems(masterPassword);
    
    if (!result.success) {
      return result;
    }
    
    const vaultItems = result.data;
    const itemIndex = vaultItems.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return { success: false, message: 'Élément non trouvé.' };
    }
    
    // Mettre à jour l'élément
    vaultItems[itemIndex] = {
      ...vaultItems[itemIndex],
      ...updatedItem,
      updatedAt: new Date().toISOString()
    };
    
    // Chiffrer et stocker le coffre-fort mis à jour
    const encryptedVault = CryptoJS.AES.encrypt(
      JSON.stringify(vaultItems),
      masterPassword
    ).toString();
    
    localStorage.setItem(VAULT_KEY, encryptedVault);
    
    return { success: true, message: 'Élément mis à jour avec succès.', data: vaultItems[itemIndex] };
  } catch (error) {
    console.error('Erreur lors de la mise à jour d\'un élément du coffre-fort:', error);
    return { success: false, message: 'Erreur lors de la mise à jour d\'un élément du coffre-fort.' };
  }
};

// Fonction pour supprimer un élément du coffre-fort
export const deleteVaultItem = (masterPassword, id) => {
  try {
    const result = getVaultItems(masterPassword);
    
    if (!result.success) {
      return result;
    }
    
    const vaultItems = result.data;
    const updatedItems = vaultItems.filter(item => item.id !== id);
    
    if (vaultItems.length === updatedItems.length) {
      return { success: false, message: 'Élément non trouvé.' };
    }
    
    // Chiffrer et stocker le coffre-fort mis à jour
    const encryptedVault = CryptoJS.AES.encrypt(
      JSON.stringify(updatedItems),
      masterPassword
    ).toString();
    
    localStorage.setItem(VAULT_KEY, encryptedVault);
    
    return { success: true, message: 'Élément supprimé avec succès.' };
  } catch (error) {
    console.error('Erreur lors de la suppression d\'un élément du coffre-fort:', error);
    return { success: false, message: 'Erreur lors de la suppression d\'un élément du coffre-fort.' };
  }
};

// Fonction pour changer le mot de passe maître
export const changeMasterPassword = (currentPassword, newPassword) => {
  try {
    if (!verifyMasterPassword(currentPassword)) {
      return { success: false, message: 'Mot de passe maître actuel incorrect.' };
    }
    
    // Récupérer les éléments actuels
    const result = getVaultItems(currentPassword);
    
    if (!result.success) {
      return result;
    }
    
    const vaultItems = result.data;
    
    // Hasher le nouveau mot de passe
    const newPasswordHash = CryptoJS.SHA256(newPassword).toString();
    
    // Chiffrer le coffre-fort avec le nouveau mot de passe
    const encryptedVault = CryptoJS.AES.encrypt(
      JSON.stringify(vaultItems),
      newPassword
    ).toString();
    
    // Stocker le nouveau hash et le coffre-fort rechiffré
    localStorage.setItem(MASTER_PASSWORD_HASH_KEY, newPasswordHash);
    localStorage.setItem(VAULT_KEY, encryptedVault);
    
    return { success: true, message: 'Mot de passe maître changé avec succès.' };
  } catch (error) {
    console.error('Erreur lors du changement du mot de passe maître:', error);
    return { success: false, message: 'Erreur lors du changement du mot de passe maître.' };
  }
};

// Exporter les fonctions du service
export const vaultService = {
  isVaultInitialized,
  initializeVault,
  verifyMasterPassword,
  getVaultItems,
  addVaultItem,
  updateVaultItem,
  deleteVaultItem,
  changeMasterPassword
}; 