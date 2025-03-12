const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

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
  
  // Exécution de commandes système
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  
  // Autres fonctions IPC
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getNmapPath: () => ipcRenderer.invoke('get-nmap-path'),
  getAppPath: () => ipcRenderer.invoke('get-app-path')
}); 