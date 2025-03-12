// Service de gestion des données
import { v4 as uuidv4 } from 'uuid';

// Clés de stockage
const STORAGE_KEYS = {
  VULNERABILITIES: 'dashto_vulnerabilities',
  TARGETS: 'dashto_targets',
  TOOLS: 'dashto_tools',
  INCIDENTS: 'dashto_incidents',
  LOGS: 'dashto_logs',
  AUTOMATION_TASKS: 'dashto_automation_tasks',
  NOTIFICATIONS: 'dashto_notifications',
  VAULT_ITEMS: 'dashto_vault_items',
  REPORTS: 'dashto_reports',
  RED_TEAM_EXERCISES: 'dashto_red_team_exercises',
  SETTINGS: 'dashto_settings',
};

// Fonction générique pour récupérer des données
const getData = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Erreur lors de la récupération des données (${key}):`, error);
    return defaultValue;
  }
};

// Fonction générique pour sauvegarder des données
const saveData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde des données (${key}):`, error);
    return false;
  }
};

// Fonction générique pour ajouter un élément
const addItem = (key, item) => {
  try {
    const items = getData(key, []);
    const newItem = { ...item, id: item.id || uuidv4() };
    items.push(newItem);
    saveData(key, items);
    return newItem;
  } catch (error) {
    console.error(`Erreur lors de l'ajout d'un élément (${key}):`, error);
    return null;
  }
};

// Fonction générique pour mettre à jour un élément
const updateItem = (key, id, updatedItem) => {
  try {
    const items = getData(key, []);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedItem, id };
      saveData(key, items);
      return items[index];
    }
    return null;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour d'un élément (${key}):`, error);
    return null;
  }
};

// Fonction générique pour supprimer un élément
const deleteItem = (key, id) => {
  try {
    const items = getData(key, []);
    const newItems = items.filter(item => item.id !== id);
    saveData(key, newItems);
    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression d'un élément (${key}):`, error);
    return false;
  }
};

// Fonction générique pour récupérer un élément par ID
const getItemById = (key, id) => {
  try {
    const items = getData(key, []);
    return items.find(item => item.id === id) || null;
  } catch (error) {
    console.error(`Erreur lors de la récupération d'un élément (${key}):`, error);
    return null;
  }
};

// Fonction pour ajouter un log
const addLog = (type, source, message, details = {}, relatedEntityId = null, relatedEntityType = null) => {
  const log = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type,
    source,
    message,
    details,
    relatedEntityId,
    relatedEntityType,
  };
  addItem(STORAGE_KEYS.LOGS, log);
  return log;
};

// Service pour les vulnérabilités
export const vulnerabilityService = {
  getAll: async () => {
    console.log('vulnerabilityService.getAll - Récupération des vulnérabilités');
    try {
      const vulnerabilities = await window.electronAPI.getVulnerabilities();
      console.log('vulnerabilityService.getAll - Vulnérabilités récupérées:', vulnerabilities);
      return vulnerabilities;
    } catch (error) {
      console.error('Erreur lors de la récupération des vulnérabilités:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      return await window.electronAPI.getVulnerabilityById(id);
    } catch (error) {
      console.error(`Erreur lors de la récupération de la vulnérabilité ${id}:`, error);
      return null;
    }
  },
  
  add: async (vulnerability) => {
    try {
      if (!vulnerability.id) {
        vulnerability.id = `vuln-${uuidv4().substring(0, 8)}`;
      }
      const result = await window.electronAPI.addVulnerability(vulnerability);
      return result.success ? vulnerability : null;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vulnérabilité:', error);
      return null;
    }
  },
  
  update: async (vulnerability) => {
    try {
      const result = await window.electronAPI.updateVulnerability(vulnerability);
      return result.success ? vulnerability : null;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la vulnérabilité ${vulnerability.id}:`, error);
      return null;
    }
  },
  
  delete: async (id) => {
    try {
      const result = await window.electronAPI.deleteVulnerability(id);
      return result.success;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la vulnérabilité ${id}:`, error);
      return false;
    }
  },
  
  getBySeverity: async (severity) => {
    try {
      const vulnerabilities = await window.electronAPI.getVulnerabilities();
      return vulnerabilities.filter(v => v.severity === severity);
    } catch (error) {
      console.error(`Erreur lors de la récupération des vulnérabilités par sévérité ${severity}:`, error);
      return [];
    }
  },
  
  getByStatus: async (status) => {
    try {
      const vulnerabilities = await window.electronAPI.getVulnerabilities();
      return vulnerabilities.filter(v => v.status === status);
    } catch (error) {
      console.error(`Erreur lors de la récupération des vulnérabilités par statut ${status}:`, error);
      return [];
    }
  },
  
  getByTarget: async (targetId) => {
    try {
      const vulnerabilities = await window.electronAPI.getVulnerabilities();
      return vulnerabilities.filter(v => v.targetId === targetId);
    } catch (error) {
      console.error(`Erreur lors de la récupération des vulnérabilités par cible ${targetId}:`, error);
      return [];
    }
  }
};

// Service pour les cibles
export const targetService = {
  getAll: async () => {
    try {
      return await window.electronAPI.getTargets();
    } catch (error) {
      console.error('Erreur lors de la récupération des cibles:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      return await window.electronAPI.getTargetById(id);
    } catch (error) {
      console.error(`Erreur lors de la récupération de la cible ${id}:`, error);
      return null;
    }
  }
};

export const toolService = {
  getAll: () => getData(STORAGE_KEYS.TOOLS),
  getById: (id) => getItemById(STORAGE_KEYS.TOOLS, id),
  add: (tool) => {
    const result = addItem(STORAGE_KEYS.TOOLS, tool);
    if (result) {
      addLog('info', 'tool', `Nouvel outil ajouté: ${tool.name}`, {}, result.id, 'tool');
    }
    return result;
  },
  update: (id, tool) => {
    const result = updateItem(STORAGE_KEYS.TOOLS, id, tool);
    if (result) {
      addLog('info', 'tool', `Outil mis à jour: ${tool.name}`, {}, id, 'tool');
    }
    return result;
  },
  delete: (id) => {
    const tool = getItemById(STORAGE_KEYS.TOOLS, id);
    const result = deleteItem(STORAGE_KEYS.TOOLS, id);
    if (result && tool) {
      addLog('info', 'tool', `Outil supprimé: ${tool.name}`, {}, id, 'tool');
    }
    return result;
  },
  getByType: (type) => {
    const tools = getData(STORAGE_KEYS.TOOLS);
    return tools.filter(t => t.type === type);
  },
  getFavorites: () => {
    const tools = getData(STORAGE_KEYS.TOOLS);
    return tools.filter(t => t.favorites);
  },
};

export const incidentService = {
  getAll: () => getData(STORAGE_KEYS.INCIDENTS),
  getById: (id) => getItemById(STORAGE_KEYS.INCIDENTS, id),
  add: (incident) => {
    const result = addItem(STORAGE_KEYS.INCIDENTS, incident);
    if (result) {
      addLog('warning', 'incident', `Nouvel incident ajouté: ${incident.title}`, {}, result.id, 'incident');
    }
    return result;
  },
  update: (id, incident) => {
    const result = updateItem(STORAGE_KEYS.INCIDENTS, id, incident);
    if (result) {
      addLog('info', 'incident', `Incident mis à jour: ${incident.title}`, {}, id, 'incident');
    }
    return result;
  },
  delete: (id) => {
    const incident = getItemById(STORAGE_KEYS.INCIDENTS, id);
    const result = deleteItem(STORAGE_KEYS.INCIDENTS, id);
    if (result && incident) {
      addLog('info', 'incident', `Incident supprimé: ${incident.title}`, {}, id, 'incident');
    }
    return result;
  },
  getBySeverity: (severity) => {
    const incidents = getData(STORAGE_KEYS.INCIDENTS);
    return incidents.filter(i => i.severity === severity);
  },
  getByStatus: (status) => {
    const incidents = getData(STORAGE_KEYS.INCIDENTS);
    return incidents.filter(i => i.status === status);
  },
};

export const logService = {
  getAll: () => getData(STORAGE_KEYS.LOGS),
  getById: (id) => getItemById(STORAGE_KEYS.LOGS, id),
  add: addLog,
  delete: (id) => deleteItem(STORAGE_KEYS.LOGS, id),
  getByType: (type) => {
    const logs = getData(STORAGE_KEYS.LOGS);
    return logs.filter(l => l.type === type);
  },
  getBySource: (source) => {
    const logs = getData(STORAGE_KEYS.LOGS);
    return logs.filter(l => l.source === source);
  },
  getByRelatedEntity: (entityId, entityType) => {
    const logs = getData(STORAGE_KEYS.LOGS);
    return logs.filter(l => l.relatedEntityId === entityId && l.relatedEntityType === entityType);
  },
  clear: () => saveData(STORAGE_KEYS.LOGS, []),
};

export const automationService = {
  getAll: () => getData(STORAGE_KEYS.AUTOMATION_TASKS),
  getById: (id) => getItemById(STORAGE_KEYS.AUTOMATION_TASKS, id),
  add: (task) => {
    const result = addItem(STORAGE_KEYS.AUTOMATION_TASKS, task);
    if (result) {
      addLog('info', 'automation', `Nouvelle tâche d'automatisation ajoutée: ${task.name}`, {}, result.id, 'automation');
    }
    return result;
  },
  update: (id, task) => {
    const result = updateItem(STORAGE_KEYS.AUTOMATION_TASKS, id, task);
    if (result) {
      addLog('info', 'automation', `Tâche d'automatisation mise à jour: ${task.name}`, {}, id, 'automation');
    }
    return result;
  },
  delete: (id) => {
    const task = getItemById(STORAGE_KEYS.AUTOMATION_TASKS, id);
    const result = deleteItem(STORAGE_KEYS.AUTOMATION_TASKS, id);
    if (result && task) {
      addLog('info', 'automation', `Tâche d'automatisation supprimée: ${task.name}`, {}, id, 'automation');
    }
    return result;
  },
  getByStatus: (status) => {
    const tasks = getData(STORAGE_KEYS.AUTOMATION_TASKS);
    return tasks.filter(t => t.status === status);
  },
  getByType: (type) => {
    const tasks = getData(STORAGE_KEYS.AUTOMATION_TASKS);
    return tasks.filter(t => t.type === type);
  },
};

export const notificationService = {
  getAll: () => getData(STORAGE_KEYS.NOTIFICATIONS),
  getById: (id) => getItemById(STORAGE_KEYS.NOTIFICATIONS, id),
  add: (notification) => {
    const result = addItem(STORAGE_KEYS.NOTIFICATIONS, notification);
    return result;
  },
  update: (id, notification) => {
    const result = updateItem(STORAGE_KEYS.NOTIFICATIONS, id, notification);
    return result;
  },
  delete: (id) => deleteItem(STORAGE_KEYS.NOTIFICATIONS, id),
  markAsRead: (id) => {
    const notification = getItemById(STORAGE_KEYS.NOTIFICATIONS, id);
    if (notification) {
      return updateItem(STORAGE_KEYS.NOTIFICATIONS, id, { ...notification, read: true });
    }
    return null;
  },
  markAllAsRead: () => {
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    saveData(STORAGE_KEYS.NOTIFICATIONS, updatedNotifications);
    return updatedNotifications;
  },
  getUnread: () => {
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    return notifications.filter(n => !n.read);
  },
  getByPriority: (priority) => {
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    return notifications.filter(n => n.priority === priority);
  },
};

export const vaultService = {
  getAll: () => getData(STORAGE_KEYS.VAULT_ITEMS),
  getById: (id) => getItemById(STORAGE_KEYS.VAULT_ITEMS, id),
  add: (item) => {
    const result = addItem(STORAGE_KEYS.VAULT_ITEMS, item);
    if (result) {
      addLog('info', 'vault', `Nouvel élément ajouté au coffre-fort: ${item.name}`, {}, result.id, 'vault');
    }
    return result;
  },
  update: (id, item) => {
    const result = updateItem(STORAGE_KEYS.VAULT_ITEMS, id, item);
    if (result) {
      addLog('info', 'vault', `Élément du coffre-fort mis à jour: ${item.name}`, {}, id, 'vault');
    }
    return result;
  },
  delete: (id) => {
    const item = getItemById(STORAGE_KEYS.VAULT_ITEMS, id);
    const result = deleteItem(STORAGE_KEYS.VAULT_ITEMS, id);
    if (result && item) {
      addLog('info', 'vault', `Élément du coffre-fort supprimé: ${item.name}`, {}, id, 'vault');
    }
    return result;
  },
  getByType: (type) => {
    const items = getData(STORAGE_KEYS.VAULT_ITEMS);
    return items.filter(i => i.type === type);
  },
};

export const reportService = {
  getAll: () => getData(STORAGE_KEYS.REPORTS),
  getById: (id) => getItemById(STORAGE_KEYS.REPORTS, id),
  add: (report) => {
    const result = addItem(STORAGE_KEYS.REPORTS, report);
    if (result) {
      addLog('info', 'report', `Nouveau rapport créé: ${report.title}`, {}, result.id, 'report');
    }
    return result;
  },
  update: (id, report) => {
    const result = updateItem(STORAGE_KEYS.REPORTS, id, report);
    if (result) {
      addLog('info', 'report', `Rapport mis à jour: ${report.title}`, {}, id, 'report');
    }
    return result;
  },
  delete: (id) => {
    const report = getItemById(STORAGE_KEYS.REPORTS, id);
    const result = deleteItem(STORAGE_KEYS.REPORTS, id);
    if (result && report) {
      addLog('info', 'report', `Rapport supprimé: ${report.title}`, {}, id, 'report');
    }
    return result;
  },
  getByStatus: (status) => {
    const reports = getData(STORAGE_KEYS.REPORTS);
    return reports.filter(r => r.status === status);
  },
  getByType: (type) => {
    const reports = getData(STORAGE_KEYS.REPORTS);
    return reports.filter(r => r.type === type);
  },
};

export const redTeamService = {
  getAll: () => getData(STORAGE_KEYS.RED_TEAM_EXERCISES),
  getById: (id) => getItemById(STORAGE_KEYS.RED_TEAM_EXERCISES, id),
  add: (exercise) => {
    const result = addItem(STORAGE_KEYS.RED_TEAM_EXERCISES, exercise);
    if (result) {
      addLog('info', 'redteam', `Nouvel exercice Red Team créé: ${exercise.name}`, {}, result.id, 'redteam');
    }
    return result;
  },
  update: (id, exercise) => {
    const result = updateItem(STORAGE_KEYS.RED_TEAM_EXERCISES, id, exercise);
    if (result) {
      addLog('info', 'redteam', `Exercice Red Team mis à jour: ${exercise.name}`, {}, id, 'redteam');
    }
    return result;
  },
  delete: (id) => {
    const exercise = getItemById(STORAGE_KEYS.RED_TEAM_EXERCISES, id);
    const result = deleteItem(STORAGE_KEYS.RED_TEAM_EXERCISES, id);
    if (result && exercise) {
      addLog('info', 'redteam', `Exercice Red Team supprimé: ${exercise.name}`, {}, id, 'redteam');
    }
    return result;
  },
  getByStatus: (status) => {
    const exercises = getData(STORAGE_KEYS.RED_TEAM_EXERCISES);
    return exercises.filter(e => e.status === status);
  },
};

export const settingsService = {
  get: () => getData(STORAGE_KEYS.SETTINGS, {}),
  save: (settings) => {
    const result = saveData(STORAGE_KEYS.SETTINGS, settings);
    if (result) {
      addLog('info', 'settings', 'Paramètres mis à jour', {});
    }
    return result;
  },
}; 