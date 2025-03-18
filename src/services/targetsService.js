// Service pour gérer les cibles (équipements, adresses IP, sous-domaines, serveurs, etc.)
import { v4 as uuidv4 } from 'uuid';

// Clé pour le stockage local
const TARGETS_KEY = 'targets_data';

// Fonction pour obtenir toutes les cibles
export const getAllTargets = () => {
  try {
    const targetsJson = localStorage.getItem(TARGETS_KEY);
    if (!targetsJson) {
      return [];
    }
    return JSON.parse(targetsJson);
  } catch (error) {
    console.error('Erreur lors de la récupération des cibles:', error);
    return [];
  }
};

// Fonction pour obtenir une cible par son ID
export const getTargetById = (id) => {
  try {
    const targets = getAllTargets();
    return targets.find(target => target.id === id) || null;
  } catch (error) {
    console.error('Erreur lors de la récupération de la cible:', error);
    return null;
  }
};

// Fonction pour ajouter une nouvelle cible
export const addTarget = (target) => {
  try {
    const targets = getAllTargets();
    
    // Vérifier si l'adresse IP ou le nom d'hôte existe déjà
    const exists = targets.some(t => 
      (target.ipAddress && t.ipAddress === target.ipAddress) || 
      (target.hostname && t.hostname === target.hostname)
    );
    
    if (exists) {
      return { success: false, message: 'Une cible avec cette adresse IP ou ce nom d\'hôte existe déjà.' };
    }
    
    // Ajouter un ID unique et les dates
    const newTarget = {
      ...target,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: target.status || 'unknown',
      vulnerabilities: target.vulnerabilities || [],
      notes: target.notes || '',
      tags: target.tags || []
    };
    
    targets.push(newTarget);
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    
    return { success: true, message: 'Cible ajoutée avec succès.', data: newTarget };
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la cible:', error);
    return { success: false, message: 'Erreur lors de l\'ajout de la cible.' };
  }
};

// Fonction pour mettre à jour une cible
export const updateTarget = (id, updatedTarget) => {
  try {
    const targets = getAllTargets();
    const targetIndex = targets.findIndex(target => target.id === id);
    
    if (targetIndex === -1) {
      return { success: false, message: 'Cible non trouvée.' };
    }
    
    // Vérifier si l'adresse IP ou le nom d'hôte existe déjà sur une autre cible
    const duplicateExists = targets.some(t => 
      t.id !== id && (
        (updatedTarget.ipAddress && t.ipAddress === updatedTarget.ipAddress) || 
        (updatedTarget.hostname && t.hostname === updatedTarget.hostname)
      )
    );
    
    if (duplicateExists) {
      return { success: false, message: 'Une autre cible avec cette adresse IP ou ce nom d\'hôte existe déjà.' };
    }
    
    // Mettre à jour la cible
    targets[targetIndex] = {
      ...targets[targetIndex],
      ...updatedTarget,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    
    return { success: true, message: 'Cible mise à jour avec succès.', data: targets[targetIndex] };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la cible:', error);
    return { success: false, message: 'Erreur lors de la mise à jour de la cible.' };
  }
};

// Fonction pour supprimer une cible
export const deleteTarget = (id) => {
  try {
    const targets = getAllTargets();
    const updatedTargets = targets.filter(target => target.id !== id);
    
    if (targets.length === updatedTargets.length) {
      return { success: false, message: 'Cible non trouvée.' };
    }
    
    localStorage.setItem(TARGETS_KEY, JSON.stringify(updatedTargets));
    
    return { success: true, message: 'Cible supprimée avec succès.' };
  } catch (error) {
    console.error('Erreur lors de la suppression de la cible:', error);
    return { success: false, message: 'Erreur lors de la suppression de la cible.' };
  }
};

// Fonction pour ajouter une vulnérabilité à une cible
export const addVulnerabilityToTarget = (targetId, vulnerability) => {
  try {
    const targets = getAllTargets();
    const targetIndex = targets.findIndex(target => target.id === targetId);
    
    if (targetIndex === -1) {
      return { success: false, message: 'Cible non trouvée.' };
    }
    
    // Ajouter un ID unique à la vulnérabilité
    const newVulnerability = {
      ...vulnerability,
      id: uuidv4(),
      discoveredAt: new Date().toISOString()
    };
    
    // Ajouter la vulnérabilité à la cible
    if (!targets[targetIndex].vulnerabilities) {
      targets[targetIndex].vulnerabilities = [];
    }
    
    targets[targetIndex].vulnerabilities.push(newVulnerability);
    targets[targetIndex].updatedAt = new Date().toISOString();
    
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    
    return { 
      success: true, 
      message: 'Vulnérabilité ajoutée avec succès.', 
      data: newVulnerability 
    };
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la vulnérabilité:', error);
    return { success: false, message: 'Erreur lors de l\'ajout de la vulnérabilité.' };
  }
};

// Fonction pour mettre à jour le statut d'une cible
export const updateTargetStatus = (targetId, status) => {
  try {
    const targets = getAllTargets();
    const targetIndex = targets.findIndex(target => target.id === targetId);
    
    if (targetIndex === -1) {
      return { success: false, message: 'Cible non trouvée.' };
    }
    
    targets[targetIndex].status = status;
    targets[targetIndex].updatedAt = new Date().toISOString();
    
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    
    return { 
      success: true, 
      message: 'Statut de la cible mis à jour avec succès.', 
      data: targets[targetIndex] 
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de la cible:', error);
    return { success: false, message: 'Erreur lors de la mise à jour du statut de la cible.' };
  }
};

// Fonction pour rechercher des cibles
export const searchTargets = (query) => {
  try {
    if (!query) {
      return getAllTargets();
    }
    
    const targets = getAllTargets();
    const searchLower = query.toLowerCase();
    
    return targets.filter(target => 
      (target.name && target.name.toLowerCase().includes(searchLower)) ||
      (target.ipAddress && target.ipAddress.includes(searchLower)) ||
      (target.hostname && target.hostname.toLowerCase().includes(searchLower)) ||
      (target.description && target.description.toLowerCase().includes(searchLower)) ||
      (target.tags && target.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  } catch (error) {
    console.error('Erreur lors de la recherche de cibles:', error);
    return [];
  }
};

// Fonction pour filtrer les cibles par tag
export const filterTargetsByTag = (tag) => {
  try {
    if (!tag) {
      return getAllTargets();
    }
    
    const targets = getAllTargets();
    const tagLower = tag.toLowerCase();
    
    return targets.filter(target => 
      target.tags && target.tags.some(t => t.toLowerCase() === tagLower)
    );
  } catch (error) {
    console.error('Erreur lors du filtrage des cibles par tag:', error);
    return [];
  }
};

// Fonction pour filtrer les cibles par statut
export const filterTargetsByStatus = (status) => {
  try {
    if (!status) {
      return getAllTargets();
    }
    
    const targets = getAllTargets();
    
    return targets.filter(target => target.status === status);
  } catch (error) {
    console.error('Erreur lors du filtrage des cibles par statut:', error);
    return [];
  }
};

// Exporter les fonctions du service
export const targetsService = {
  getAllTargets,
  getTargetById,
  addTarget,
  updateTarget,
  deleteTarget,
  addVulnerabilityToTarget,
  updateTargetStatus,
  searchTargets,
  filterTargetsByTag,
  filterTargetsByStatus
};