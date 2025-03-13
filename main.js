const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

let win;

// Variable pour stocker le chemin de Nmap
let nmapPath = null;

function createWindow() {
  console.log('Création de la fenêtre principale');
  
  win = new BrowserWindow({ 
    width: 1200, 
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Permettre l'accès au localStorage
      webSecurity: false
    }
  });
  
  // Définir une politique de sécurité de contenu
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://gitlab.com https://www.exploit-db.com https://cve.mitre.org https://nvd.nist.gov https://api.hunter.io https://haveibeenpwned.com https://leakcheck.io; img-src 'self' data: blob:; frame-src 'self' blob:;"
        ]
      }
    });
  });
  
  console.log('Chargement du fichier HTML:', path.join(__dirname, 'index.html'));
  win.loadFile('index.html');
  
  // Ouvrir les outils de développement
  win.webContents.openDevTools();
  
  // Événement lorsque la page est chargée
  win.webContents.on('did-finish-load', () => {
    console.log('Page chargée avec succès');
  });
  
  // Événement en cas d'erreur de chargement
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Erreur de chargement:', errorCode, errorDescription);
  });
}

// Gestionnaire IPC pour exécuter des commandes système
ipcMain.handle('execute-command', (event, command) => {
  return new Promise((resolve, reject) => {
    console.log('Exécution de la commande:', command);
    
    // Options pour l'exécution de la commande
    const options = { 
      maxBuffer: 1024 * 1024 * 10,
      // Ajouter les variables d'environnement pour Python
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8'  // Assurer l'encodage correct pour Python
      }
    };
    
    exec(command, options, (error, stdout, stderr) => {
      if (error && error.code !== 0) {
        console.error('Erreur lors de l\'exécution de la commande:', error);
        reject({ error: error.message, code: error.code });
        return;
      }
      
      resolve({ stdout, stderr });
    });
  });
});

// Gestionnaire IPC pour obtenir la plateforme
ipcMain.handle('get-platform', () => {
  return process.platform;
});

// Gestionnaire IPC pour stocker le chemin de Nmap
ipcMain.handle('set-nmap-path', (event, path) => {
  console.log('Stockage du chemin Nmap:', path);
  nmapPath = path;
  return true;
});

// Gestionnaire IPC pour récupérer le chemin de Nmap
ipcMain.handle('get-nmap-path', () => {
  return nmapPath;
});

// Gestionnaire pour obtenir le chemin de l'application
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

app.whenReady().then(() => {
  console.log('Application prête');
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});