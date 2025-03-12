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
  
  deleteTodo: (todoId) => {
    try {
      const todos = JSON.parse(localStorage.getItem('todos')) || [];
      const newTodos = todos.filter(todo => todo.id !== todoId);
      localStorage.setItem('todos', JSON.stringify(newTodos));
      return Promise.resolve({ success: true, todoId });
    } catch (error) {
      console.error('Erreur lors de la suppression du todo:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  // Opérations pour les paramètres
  getSettings: () => {
    try {
      const defaultSettings = {
        darkMode: false,
        primaryColor: '#4f46e5',
        showCompletedTasks: true,
        enableNotifications: false,
        autoSave: true
      };
      const settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings;
      return Promise.resolve(settings);
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres:', error);
      return Promise.resolve({
        darkMode: false,
        primaryColor: '#4f46e5',
        showCompletedTasks: true,
        enableNotifications: false,
        autoSave: true
      });
    }
  },
  
  saveSettings: (settings) => {
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
      return Promise.resolve({ success: true, settings });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  // Opérations CRUD pour les vulnérabilités
  getVulnerabilities: () => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('dashto_vulnerabilities')) || [];
      return Promise.resolve(vulnerabilities);
    } catch (error) {
      console.error('Erreur lors de la récupération des vulnérabilités:', error);
      return Promise.resolve([]);
    }
  },
  
  getVulnerabilityById: (id) => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('dashto_vulnerabilities')) || [];
      const vulnerability = vulnerabilities.find(v => v.id === id);
      return Promise.resolve(vulnerability || null);
    } catch (error) {
      console.error('Erreur lors de la récupération de la vulnérabilité:', error);
      return Promise.resolve(null);
    }
  },
  
  addVulnerability: (vulnerability) => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('dashto_vulnerabilities')) || [];
      vulnerabilities.push(vulnerability);
      localStorage.setItem('dashto_vulnerabilities', JSON.stringify(vulnerabilities));
      return Promise.resolve({ success: true, vulnerability });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vulnérabilité:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  updateVulnerability: (updatedVulnerability) => {
    try {
      const vulnerabilities = JSON.parse(localStorage.getItem('dashto_vulnerabilities')) || [];
      const index = vulnerabilities.findIndex(v => v.id === updatedVulnerability.id);
      if (index !== -1) {
        vulnerabilities[index] = updatedVulnerability;
        localStorage.setItem('dashto_vulnerabilities', JSON.stringify(vulnerabilities));
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
      const vulnerabilities = JSON.parse(localStorage.getItem('dashto_vulnerabilities')) || [];
      const newVulnerabilities = vulnerabilities.filter(v => v.id !== id);
      localStorage.setItem('dashto_vulnerabilities', JSON.stringify(newVulnerabilities));
      return Promise.resolve({ success: true, id });
    } catch (error) {
      console.error('Erreur lors de la suppression de la vulnérabilité:', error);
      return Promise.resolve({ success: false, error });
    }
  },
  
  // Opérations CRUD pour les cibles
  getTargets: () => {
    try {
      const targets = JSON.parse(localStorage.getItem('dashto_targets')) || [];
      return Promise.resolve(targets);
    } catch (error) {
      console.error('Erreur lors de la récupération des cibles:', error);
      return Promise.resolve([]);
    }
  },
  
  getTargetById: (id) => {
    try {
      const targets = JSON.parse(localStorage.getItem('dashto_targets')) || [];
      const target = targets.find(t => t.id === id);
      return Promise.resolve(target || null);
    } catch (error) {
      console.error('Erreur lors de la récupération de la cible:', error);
      return Promise.resolve(null);
    }
  },
  
  // Fonctions pour exécuter des commandes système
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  
  // Fonctions pour obtenir des informations sur le système
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Fonctions pour gérer le chemin de Nmap
  setNmapPath: (path) => ipcRenderer.invoke('set-nmap-path', path),
  getNmapPath: () => ipcRenderer.invoke('get-nmap-path')
});

// Vous pouvez également exposer des variables d'environnement ou d'autres configurations
contextBridge.exposeInMainWorld('appConfig', {
  isDev: process.env.NODE_ENV === 'development',
}); 