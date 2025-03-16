const { contextBridge, ipcRenderer } = require('electron');

// Exposer les API protégées aux scripts du renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Opérations CRUD pour les todos
  getTodos: () => {
    try {
      const todos = JSON.parse(localStorage.getItem('todos')) || [];
      return Promise.resolve(todos);
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
  
  // Écouteurs d'événements
  on: (channel, callback) => {
    const validChannels = ['sh-output', 'ps1-output', 'script-download-complete'];
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
    const validChannels = ['sh-output', 'ps1-output', 'script-download-complete'];
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
  exportToPDF: (options) => ipcRenderer.invoke('export-to-pdf', options)
}); 