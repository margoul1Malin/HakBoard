const { contextBridge, ipcRenderer } = require('electron');

// Importation des modules pour l'extraction des métadonnées


// Exposer les API protégées aux scripts du renderer
const electronAPI = {
  // Opérations CRUD pour les todos
  getTodos: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        return Promise.resolve(todos);
      } else {
        console.warn('localStorage n\'est pas disponible');
        return Promise.resolve([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des todos:', error);
      return Promise.resolve([]);
    }
  },
  
  addTodo: (todo) => {
    try {
      const todos = JSON.parse(localStorage.getItem('todos')) || [];
      todos.push(todo);
      localStorage.setItem('todos', JSON.stringify(todos));
      return Promise.resolve({ success: true, todo });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du todo:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  updateTodo: (updatedTodo) => {
    try {
      const todos = JSON.parse(localStorage.getItem('todos')) || [];
      const index = todos.findIndex(todo => todo.id === updatedTodo.id);
      if (index !== -1) {
        todos[index] = updatedTodo;
        localStorage.setItem('todos', JSON.stringify(todos));
        return Promise.resolve({ success: true, todo: updatedTodo });
      }
      return Promise.resolve({ success: false, message: 'Todo not found' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du todo:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  deleteTodo: (id) => {
    try {
      const todos = JSON.parse(localStorage.getItem('todos')) || [];
      const filteredTodos = todos.filter(todo => todo.id !== id);
      localStorage.setItem('todos', JSON.stringify(filteredTodos));
      return Promise.resolve({ success: true });
    } catch (error) {
      console.error('Erreur lors de la suppression du todo:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  // Gestion des paramètres
  getSettings: () => {
    try {
      const settings = JSON.parse(localStorage.getItem('app_settings')) || { darkMode: false };
      return Promise.resolve(settings);
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres:', error);
      return Promise.resolve({ darkMode: false });
    }
  },
  
  saveSettings: (settings) => {
    try {
      localStorage.setItem('app_settings', JSON.stringify(settings));
      return Promise.resolve({ success: true });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  // Gestion des vulnérabilités
  getVulnerabilities: () => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('vulnerabilities')) || [];
      return Promise.resolve(vulnerabilities);
    } catch (error) {
      console.error('Erreur lors de la récupération des vulnérabilités:', error);
      return Promise.resolve([]);
    }
  },
  
  getVulnerabilityById: (id) => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('vulnerabilities')) || [];
      const vulnerability = vulnerabilities.find(v => v.id === id);
      return Promise.resolve(vulnerability || null);
    } catch (error) {
      console.error('Erreur lors de la récupération de la vulnérabilité:', error);
      return Promise.resolve(null);
    }
  },
  
  addVulnerability: (vulnerability) => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('vulnerabilities')) || [];
      vulnerabilities.push(vulnerability);
      localStorage.setItem('vulnerabilities', JSON.stringify(vulnerabilities));
      return Promise.resolve({ success: true, vulnerability });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vulnérabilité:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  updateVulnerability: (updatedVulnerability) => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('vulnerabilities')) || [];
      const index = vulnerabilities.findIndex(v => v.id === updatedVulnerability.id);
      if (index !== -1) {
        vulnerabilities[index] = updatedVulnerability;
        localStorage.setItem('vulnerabilities', JSON.stringify(vulnerabilities));
        return Promise.resolve({ success: true, vulnerability: updatedVulnerability });
      }
      return Promise.resolve({ success: false, message: 'Vulnerability not found' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la vulnérabilité:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  deleteVulnerability: (id) => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('vulnerabilities')) || [];
      const filteredVulnerabilities = vulnerabilities.filter(v => v.id !== id);
      localStorage.setItem('vulnerabilities', JSON.stringify(filteredVulnerabilities));
      return Promise.resolve({ success: true });
    } catch (error) {
      console.error('Erreur lors de la suppression de la vulnérabilité:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  // Gestion des cibles
  getTargets: () => {
    try {
      const targets = JSON.parse(localStorage.getItem('targets')) || [];
      return Promise.resolve(targets);
    } catch (error) {
      console.error('Erreur lors de la récupération des cibles:', error);
      return Promise.resolve([]);
    }
  },
  
  getTargetById: (id) => {
    try {
      const targets = JSON.parse(localStorage.getItem('targets')) || [];
      const target = targets.find(t => t.id === id);
      return Promise.resolve(target || null);
    } catch (error) {
      console.error('Erreur lors de la récupération de la cible:', error);
      return Promise.resolve(null);
    }
  },
  
  // Exécution de commandes système via IPC
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  
  // Exécution spécifique de scripts PowerShell avec bypass AMSI via IPC
  executePS1: (scriptPath) => ipcRenderer.invoke('execute-ps1', scriptPath),
  
  // Exécution spécifique de scripts shell sous Linux via IPC
  executeSh: (scriptPath) => ipcRenderer.invoke('execute-sh', scriptPath),
  
  // Télécharger et exécuter un script depuis une URL
  downloadAndExecuteScript: (options) => ipcRenderer.invoke('download-and-execute-script', options),
  
  // Télécharger un script depuis GitHub vers un emplacement spécifique
  downloadGithubScript: (options) => ipcRenderer.invoke('download-github-script', options),
  
  // Écouteurs d'événements
  on: (channel, callback) => {
    const validChannels = ['sh-output', 'ps1-output', 'script-download-complete', 'packet-captured', 'shark-log', 'capture-stopped'];
    if (validChannels.includes(channel)) {
      // Convertir le callback IPC en fonction standard
      const subscription = (event, ...args) => callback(event, ...args);
      ipcRenderer.on(channel, subscription);
      
      // Retourner une fonction pour supprimer l'écouteur
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  
  // Supprimer un écouteur d'événements
  removeListener: (channel, callback) => {
    const validChannels = ['sh-output', 'ps1-output', 'script-download-complete', 'packet-captured', 'shark-log', 'capture-stopped'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  
  // Autres fonctions IPC
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  setNmapPath: (path) => ipcRenderer.invoke('set-nmap-path', path),
  getNmapPath: () => ipcRenderer.invoke('get-nmap-path'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Arrêter un processus en cours d'exécution
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  
  // Exporter en PDF
  exportToPDF: (options) => ipcRenderer.invoke('export-to-pdf', options),
  
  // Sélectionner un fichier avec boîte de dialogue native
  showOpenFileDialog: (options) => ipcRenderer.invoke('show-open-file-dialog', options),
  
  // Fonctions pour les tâches planifiées
  listScheduledTasks: () => ipcRenderer.invoke('list-scheduled-tasks'),
  addScheduledTask: (taskData) => ipcRenderer.invoke('add-scheduled-task', taskData),
  deleteScheduledTask: (taskData) => ipcRenderer.invoke('delete-scheduled-task', taskData),

  // Fonctions pour l'analyse des métadonnées
  parseImageMetadata: (filePath) => ipcRenderer.invoke('parse-image-metadata', filePath),
  parsePdfMetadata: (filePath) => ipcRenderer.invoke('parse-pdf-metadata', filePath),
  parseVideoMetadata: (filePath) => ipcRenderer.invoke('parse-video-metadata', filePath),

  // Fonction pour extraire les métadonnées d'une image

  // Méthodes pour electron-store (stockage persistant)
  getStoreValue: (key) => ipcRenderer.invoke('electron-store-get', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('electron-store-set', key, value),
  deleteStoreValue: (key) => ipcRenderer.invoke('electron-store-delete', key),
  
  // Méthodes pour le localStorage (maintenues pour compatibilité)
  getFromStorage: (key) => {
    try {
      // Essayer d'abord d'obtenir depuis electron-store
      return ipcRenderer.invoke('electron-store-get', key)
        .then(value => {
          if (value !== undefined) {
            return value;
          }
          // Fallback sur localStorage
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        });
    } catch (error) {
      console.error('Erreur lors de la lecture du stockage:', error);
      return Promise.resolve(null);
    }
  },

  setToStorage: (key, value) => {
    try {
      // Sauvegarder à la fois dans electron-store et localStorage
      ipcRenderer.invoke('electron-store-set', key, value);
      localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve(true);
    } catch (error) {
      console.error('Erreur lors de l\'écriture dans le stockage:', error);
      return Promise.resolve(false);
    }
  },

  // Fonctions pour l'analyse de paquets réseau (Shark)
  getNetworkInterfaces: () => ipcRenderer.invoke('getNetworkInterfaces'),
  startPacketCapture: (options) => ipcRenderer.invoke('startPacketCapture', options),
  stopPacketCapture: (captureId) => ipcRenderer.invoke('stopPacketCapture', captureId),
  exportToPcap: (packets) => ipcRenderer.invoke('exportToPcap', packets),
  
  // Exporter les paquets capturés au format PCAP dans un fichier ZIP
  exportToPcapZip: (packets) => ipcRenderer.invoke('exportToPcapZip', packets),
  
  // Gestionnaires d'événements pour Shark
  onPacketCaptured: (callback) => {
    const channelName = 'packet-captured';
    const subscription = (_, packet) => callback(packet);
    ipcRenderer.on(channelName, subscription);
    
    // Retourner une fonction pour nettoyer l'écouteur d'événement
    return () => {
      ipcRenderer.removeListener(channelName, subscription);
    };
  },
  
  onSharkLog: (callback) => {
    const channelName = 'shark-log';
    const subscription = (_, logEntry) => callback(logEntry);
    ipcRenderer.on(channelName, subscription);
    
    // Retourner une fonction pour nettoyer l'écouteur d'événement
    return () => {
      ipcRenderer.removeListener(channelName, subscription);
    };
  },
  
  onCaptureStop: (callback) => {
    const channelName = 'capture-stopped';
    const subscription = (_, data) => callback(data);
    ipcRenderer.on(channelName, subscription);
    
    // Retourner une fonction pour nettoyer l'écouteur d'événement
    return () => {
      ipcRenderer.removeListener(channelName, subscription);
    };
  },
};

// Exposer l'API aux scripts du renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);