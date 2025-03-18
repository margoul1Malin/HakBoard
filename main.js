const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const exifParser = require('exif-parser');
const { PDFDocument } = require('pdf-lib');
const ffmpeg = require('fluent-ffmpeg');
const Store = require('electron-store');

const store = new Store();

let win;

// Variable pour stocker le chemin de Nmap
let nmapPath = null;

function createWindow() {
  console.log('Création de la fenêtre principale');
  
  // Configurer les gestionnaires IPC pour electron-store
  ipcMain.handle('electron-store-get', (event, key) => {
    return store.get(key);
  });
  
  ipcMain.handle('electron-store-set', (event, key, value) => {
    store.set(key, value);
    return true;
  });
  
  ipcMain.handle('electron-store-delete', (event, key) => {
    store.delete(key);
    return true;
  });
  
  win = new BrowserWindow({ 
    width: 1200, 
    height: 800,
    title: 'HakBoard',
    icon: path.join(__dirname, 'images/hackericonpng.png'),
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
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
          "style-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' http://localhost:8080 https://gitlab.com https://www.shodan.io/ " +
          "https://www.exploit-db.com https://cve.mitre.org https://nvd.nist.gov " +
          "https://api.hunter.io https://haveibeenpwned.com https://leakcheck.io " +
          "https://api.twilio.com https://lookups.twilio.com https://apilayer.net " +
          "https://api.sendgrid.com https://api.github.com " +
          "https://www.virustotal.com https://virustotal.com; " + // Ajout de VirusTotal
          "img-src 'self' data: blob:; " +
          "frame-src 'self' blob:;"
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
  
  // Initialiser le stockage persistant
  const storageFilePath = path.join(app.getPath('userData'), 'storage.json');
  let storage = {};
  
  try {
    if (fs.existsSync(storageFilePath)) {
      storage = JSON.parse(fs.readFileSync(storageFilePath, 'utf8'));
      console.log('Storage loaded from:', storageFilePath);
    }
  } catch (error) {
    console.error('Erreur lors de la lecture du stockage:', error);
  }
  
  // Gestionnaires IPC pour le stockage persistant
  ipcMain.handle('get-from-storage', (event, key) => {
    return storage[key];
  });
  
  ipcMain.handle('set-to-storage', (event, key, value) => {
    storage[key] = value;
    try {
      fs.writeFileSync(storageFilePath, JSON.stringify(storage), 'utf8');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'écriture du stockage:', error);
      return false;
    }
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

// Gestionnaire IPC pour exécuter spécifiquement des scripts shell sous Linux
ipcMain.handle('execute-sh', (event, scriptPath) => {
  return new Promise((resolve, reject) => {
    console.log('Exécution du script shell:', scriptPath);
    
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(scriptPath)) {
        console.error('Le fichier script n\'existe pas:', scriptPath);
        reject({ error: `Le fichier script n'existe pas: ${scriptPath}` });
        return;
      }
      
      // Options pour l'exécution de la commande avec un buffer plus grand
      const options = { 
        maxBuffer: 1024 * 1024 * 100, // 100 Mo de buffer
        env: {
          ...process.env,
          TERM: 'xterm-256color', // Pour assurer la compatibilité des couleurs
          PYTHONIOENCODING: 'utf-8'
        }
      };
      
      // S'assurer que le script est exécutable
      fs.chmodSync(scriptPath, '755');
      
      // Exécuter le script shell
      const command = `bash "${scriptPath}"`;
      console.log('Exécution de la commande shell:', command);
      
      // Créer un processus enfant pour pouvoir streamer la sortie
      const childProcess = exec(command, options);
      
      let stdout = '';
      let stderr = '';
      
      // Capturer la sortie standard en temps réel et l'envoyer au renderer
      childProcess.stdout.on('data', (data) => {
        stdout += data;
        // Envoyer les données en temps réel au renderer
        event.sender.send('sh-output', { type: 'stdout', data });
      });
      
      // Capturer les erreurs en temps réel et les envoyer au renderer
      childProcess.stderr.on('data', (data) => {
        stderr += data;
        // Envoyer les erreurs en temps réel au renderer
        event.sender.send('sh-output', { type: 'stderr', data });
      });
      
      // Gérer la fin du processus
      childProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Le processus s'est terminé avec le code ${code}`);
          // Ne pas rejeter la promesse en cas d'erreur, car certains scripts peuvent
          // retourner des codes d'erreur même s'ils s'exécutent correctement
          resolve({ stdout, stderr, code });
          return;
        }
        
        resolve({ stdout, stderr });
      });
      
      // Gérer les erreurs du processus
      childProcess.on('error', (error) => {
        console.error('Erreur lors de l\'exécution du script shell:', error);
        reject({ error: error.message, code: error.code, stderr });
      });
    } catch (err) {
      console.error('Erreur lors de l\'exécution du script shell:', err);
      reject({ error: `Erreur lors de l'exécution du script shell: ${err.message}` });
    }
  });
});

// Gestionnaire IPC pour télécharger et exécuter un script depuis une URL
ipcMain.handle('download-and-execute-script', (event, { url, isWindows }) => {
  return new Promise((resolve, reject) => {
    console.log(`Téléchargement et exécution du script depuis: ${url}`);
    
    // Créer un dossier temporaire pour stocker le script
    const os = require('os');
    const path = require('path');
    const https = require('https');
    const http = require('http');
    
    const tempDir = path.join(os.tmpdir(), 'hakboard-scripts');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Générer un nom de fichier unique basé sur l'URL
    const scriptName = isWindows ? 
      `script_${Date.now()}.ps1` : 
      `script_${Date.now()}.sh`;
    
    const scriptPath = path.join(tempDir, scriptName);
    const fileStream = fs.createWriteStream(scriptPath);
    
    // Déterminer si l'URL utilise HTTP ou HTTPS
    const requester = url.startsWith('https') ? https : http;
    
    // Télécharger le script
    const request = requester.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject({ 
          error: `Échec du téléchargement: ${response.statusCode} ${response.statusMessage}`,
          code: response.statusCode
        });
        return;
      }
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Script téléchargé avec succès: ${scriptPath}`);
        
        // Rendre le script exécutable si on est sous Linux
        if (!isWindows) {
          fs.chmodSync(scriptPath, '755');
        }
        
        // Exécuter le script selon la plateforme
        if (isWindows) {
          // Utiliser la méthode existante pour exécuter un script PowerShell
          event.sender.send('script-download-complete', { path: scriptPath, platform: 'windows' });
        } else {
          // Utiliser la nouvelle méthode pour exécuter un script shell
          event.sender.send('script-download-complete', { path: scriptPath, platform: 'linux' });
        }
        
        resolve({ path: scriptPath });
      });
    });
    
    request.on('error', (error) => {
      console.error('Erreur lors du téléchargement du script:', error);
      reject({ error: `Erreur lors du téléchargement: ${error.message}` });
    });
  });
});

// Gestionnaire IPC pour télécharger un script GitHub vers un dossier spécifique
ipcMain.handle('download-github-script', (event, { url, destination }) => {
  return new Promise((resolve, reject) => {
    console.log(`Téléchargement du script GitHub vers: ${destination}`);
    
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const http = require('http');
    
    // Vérifier que le dossier de destination existe
    const destinationDir = path.dirname(destination);
    if (!fs.existsSync(destinationDir)) {
      try {
        fs.mkdirSync(destinationDir, { recursive: true });
      } catch (error) {
        console.error('Erreur lors de la création du dossier de destination:', error);
        reject({ error: `Impossible de créer le dossier de destination: ${error.message}` });
        return;
      }
    }
    
    // Créer le stream de fichier
    const fileStream = fs.createWriteStream(destination);
    
    // Déterminer si l'URL utilise HTTP ou HTTPS
    const requester = url.startsWith('https') ? https : http;
    
    // Télécharger le script
    const request = requester.get(url, (response) => {
      if (response.statusCode !== 200) {
        fileStream.close();
        reject({ 
          error: `Échec du téléchargement: ${response.statusCode} ${response.statusMessage}`,
          code: response.statusCode
        });
        return;
      }
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Script téléchargé avec succès: ${destination}`);
        
        // Rendre le script exécutable si extension .sh, .bash, .py, etc.
        if (destination.match(/\.(sh|bash|py|pl|rb)$/i)) {
          try {
            fs.chmodSync(destination, '755');
            console.log(`Permissions d'exécution accordées à: ${destination}`);
          } catch (error) {
            console.warn(`Impossible de modifier les permissions: ${error.message}`);
            // Continuer malgré l'erreur, ce n'est pas bloquant
          }
        }
        
        resolve({ 
          success: true,
          path: destination
        });
      });
    });
    
    request.on('error', (error) => {
      fileStream.close();
      console.error('Erreur lors du téléchargement du script:', error);
      reject({ error: `Erreur lors du téléchargement: ${error.message}` });
    });
    
    fileStream.on('error', (error) => {
      fileStream.close();
      console.error('Erreur d\'écriture fichier:', error);
      reject({ error: `Erreur lors de l'écriture du fichier: ${error.message}` });
    });
  });
});

// Gestionnaire IPC pour exécuter spécifiquement des scripts PowerShell
ipcMain.handle('execute-ps1', (event, scriptPath) => {
  return new Promise((resolve, reject) => {
    console.log('Exécution du script PowerShell:', scriptPath);
    
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(scriptPath)) {
        console.error('Le fichier script n\'existe pas:', scriptPath);
        reject({ error: `Le fichier script n'existe pas: ${scriptPath}` });
        return;
      }
      
      // Options pour l'exécution de la commande avec un buffer beaucoup plus grand
      const options = { 
        maxBuffer: 1024 * 1024 * 100, // Augmenter à 100 Mo au lieu de 10 Mo
        env: process.env
      };
      
      // Exécuter directement le script avec PowerShell
      const command = `powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`;
      console.log('Exécution de la commande PowerShell:', command);
      
      // Créer un processus enfant pour pouvoir streamer la sortie
      const childProcess = exec(command, options);
      
      let stdout = '';
      let stderr = '';
      
      // Capturer la sortie standard en temps réel et l'envoyer au renderer
      childProcess.stdout.on('data', (data) => {
        stdout += data;
        // Envoyer les données en temps réel au renderer
        event.sender.send('ps1-output', { type: 'stdout', data });
      });
      
      // Capturer les erreurs en temps réel et les envoyer au renderer
      childProcess.stderr.on('data', (data) => {
        stderr += data;
        // Envoyer les erreurs en temps réel au renderer
        event.sender.send('ps1-output', { type: 'stderr', data });
      });
      
      // Gérer la fin du processus
      childProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Le processus s'est terminé avec le code ${code}`);
          reject({ error: stderr || 'Erreur inconnue', code, stderr });
          return;
        }
        
        resolve({ stdout, stderr });
      });
      
      // Gérer les erreurs du processus
      childProcess.on('error', (error) => {
        console.error('Erreur lors de l\'exécution du script PowerShell:', error);
        reject({ error: error.message, code: error.code, stderr });
      });
    } catch (err) {
      console.error('Erreur lors de l\'exécution du script PowerShell:', err);
      reject({ error: `Erreur lors de l'exécution du script PowerShell: ${err.message}` });
    }
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

// Gestionnaire pour arrêter un processus en cours d'exécution
ipcMain.handle('kill-process', (event, pid) => {
  return new Promise((resolve, reject) => {
    console.log(`Tentative d'arrêt du processus avec PID: ${pid}`);
    
    if (!pid) {
      console.error('Aucun PID fourni pour arrêter le processus');
      reject({ error: 'Aucun PID fourni' });
      return;
    }
    
    try {
      // Utiliser différentes méthodes selon la plateforme
      if (process.platform === 'win32') {
        // Windows
        exec(`taskkill /F /PID ${pid}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erreur lors de l'arrêt du processus ${pid}:`, error);
            reject({ error: error.message });
            return;
          }
          console.log(`Processus ${pid} arrêté avec succès`);
          resolve({ success: true, message: `Processus ${pid} arrêté` });
        });
      } else {
        // Linux/macOS
        exec(`kill -9 ${pid}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erreur lors de l'arrêt du processus ${pid}:`, error);
            reject({ error: error.message });
            return;
          }
          console.log(`Processus ${pid} arrêté avec succès`);
          resolve({ success: true, message: `Processus ${pid} arrêté` });
        });
      }
    } catch (error) {
      console.error(`Exception lors de l'arrêt du processus ${pid}:`, error);
      reject({ error: error.message });
    }
  });
});

// Gestionnaire pour exporter en PDF
ipcMain.handle('export-to-pdf', (event, options) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Exportation en PDF:', options);
      
      if (!options || !options.content) {
        reject({ error: 'Contenu manquant pour l\'exportation PDF' });
        return;
      }
      
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Créer un fichier HTML temporaire
      const tempDir = path.join(os.tmpdir(), 'hakboard-exports');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const htmlPath = path.join(tempDir, `export_${Date.now()}.html`);
      const pdfPath = path.join(tempDir, options.filename || `export_${Date.now()}.pdf`);
      
      // Écrire le contenu HTML dans un fichier temporaire
      fs.writeFileSync(htmlPath, options.content.html);
      
      // Utiliser le module BrowserWindow pour générer le PDF
      const { BrowserWindow } = require('electron');
      const pdfWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      pdfWindow.loadFile(htmlPath).then(() => {
        // Attendre que la page soit chargée
        pdfWindow.webContents.on('did-finish-load', () => {
          // Options d'impression
          const printOptions = {
            marginsType: 0,
            pageSize: 'A4',
            printBackground: true,
            printSelectionOnly: false,
            landscape: false
          };
          
          // Générer le PDF
          pdfWindow.webContents.printToPDF(printOptions).then(data => {
            // Écrire le PDF dans un fichier
            fs.writeFileSync(pdfPath, data);
            
            // Fermer la fenêtre
            pdfWindow.close();
            
            // Nettoyer le fichier HTML temporaire
            fs.unlinkSync(htmlPath);
            
            // Ouvrir le PDF avec l'application par défaut
            const { shell } = require('electron');
            shell.openPath(pdfPath);
            
            resolve({ success: true, path: pdfPath });
          }).catch(error => {
            console.error('Erreur lors de la génération du PDF:', error);
            pdfWindow.close();
            reject({ error: error.message });
          });
        });
      }).catch(error => {
        console.error('Erreur lors du chargement du fichier HTML:', error);
        pdfWindow.close();
        reject({ error: error.message });
      });
    } catch (error) {
      console.error('Erreur lors de l\'exportation en PDF:', error);
      reject({ error: error.message });
    }
  });
});

// Gestionnaire IPC pour afficher une boîte de dialogue de sélection de fichier
ipcMain.handle('show-open-file-dialog', async (event, options) => {
  try {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options.filters || [],
      title: options.title || 'Sélectionner un fichier',
      defaultPath: options.defaultPath || app.getPath('home'),
      buttonLabel: options.buttonLabel || 'Sélectionner'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, filePath: result.filePaths[0] };
    } else {
      return { success: false, reason: 'canceled' };
    }
  } catch (error) {
    console.error('Erreur lors de l\'ouverture de la boîte de dialogue :', error);
    return { success: false, reason: error.message };
  }
});

// Gestionnaire IPC pour lister les tâches planifiées
ipcMain.handle('list-scheduled-tasks', async (event) => {
  try {
    // Déterminer le système d'exploitation
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows - Utiliser schtasks
      return new Promise((resolve, reject) => {
        exec('schtasks /query /fo LIST /v', { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
          if (error) {
            console.error('Erreur lors de la récupération des tâches planifiées Windows:', error);
            reject({ error: error.message });
            return;
          }
          
          // Stocker les tâches de l'application
          const appTasks = [];
          
          // Lire le fichier de configuration s'il existe
          let appTasksConfig = [];
          const configPath = path.join(app.getPath('userData'), 'app-tasks.json');
          
          if (fs.existsSync(configPath)) {
            try {
              const configData = fs.readFileSync(configPath, 'utf8');
              appTasksConfig = JSON.parse(configData);
            } catch (err) {
              console.error('Erreur lors de la lecture du fichier de configuration des tâches:', err);
            }
          }
          
          // Traiter la sortie pour extraire les informations des tâches
          const tasks = [];
          const taskBlocks = stdout.split('\r\n\r\n');
          
          for (const block of taskBlocks) {
            if (!block.trim()) continue;
            
            const taskName = block.match(/TaskName:\s*(.*)/i)?.[ 1 ]?.trim();
            if (!taskName) continue;
            
            // Vérifier si c'est une tâche créée par notre application
            const isAppTask = appTasksConfig.some(task => task.name === taskName);
            
            if (isAppTask) {
              const schedule = block.match(/Schedule:\s*(.*)/i)?.[1]?.trim() || '';
              const status = block.match(/Status:\s*(.*)/i)?.[1]?.trim() || '';
              const command = block.match(/Task To Run:\s*(.*)/i)?.[1]?.trim() || '';
              
              // Trouver les métadonnées dans notre configuration
              const taskConfig = appTasksConfig.find(task => task.name === taskName);
              const description = taskConfig?.description || '';
              
              tasks.push({
                id: taskName,
                name: taskName.replace(/^HakBoard_/, ''),
                schedule,
                command,
                status: status === 'Ready' ? 'active' : 'inactive',
                description,
                platform: 'windows',
                isFromApp: true
              });
            }
          }
          
          resolve(tasks);
        });
      });
    } else {
      // Linux - Lire la crontab
      return new Promise((resolve, reject) => {
        exec('crontab -l', (error, stdout, stderr) => {
          // Ignorer les erreurs "no crontab for user"
          if (error && !stderr.includes('no crontab')) {
            console.error('Erreur lors de la récupération de la crontab:', error);
            reject({ error: error.message });
            return;
          }
          
          // Lire le fichier de configuration s'il existe
          let appTasksConfig = [];
          const configPath = path.join(app.getPath('userData'), 'app-tasks.json');
          
          if (fs.existsSync(configPath)) {
            try {
              const configData = fs.readFileSync(configPath, 'utf8');
              appTasksConfig = JSON.parse(configData);
            } catch (err) {
              console.error('Erreur lors de la lecture du fichier de configuration des tâches:', err);
            }
          }
          
          // Traiter la sortie pour extraire les informations des tâches
          const tasks = [];
          const lines = stdout.split('\n');
          
          for (const line of lines) {
            // Ignorer les lignes vides et les commentaires
            if (!line.trim() || line.trim().startsWith('#')) continue;
            
            // Chercher les tâches marquées avec notre identifiant d'application
            if (line.includes('# HakBoard_')) {
              const parts = line.split('# HakBoard_');
              const idPart = parts[1].trim();
              const id = idPart.split(' ')[0].trim();
              
              // Extraire la planification et la commande
              const cronParts = parts[0].trim().split(' ');
              const schedule = cronParts.slice(0, 5).join(' ');
              const command = cronParts.slice(5).join(' ');
              
              // Trouver les métadonnées dans notre configuration
              const taskConfig = appTasksConfig.find(task => task.id === id);
              const name = taskConfig?.name || id;
              const description = taskConfig?.description || '';
              
              tasks.push({
                id,
                name,
                schedule,
                command,
                status: 'active', // Les tâches cron sont toujours actives
                description,
                platform: 'linux',
                isFromApp: true
              });
            }
          }
          
          resolve(tasks);
        });
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des tâches planifiées:', error);
    throw error;
  }
});

// Gestionnaire IPC pour ajouter une tâche planifiée
ipcMain.handle('add-scheduled-task', async (event, taskData) => {
  try {
    const { name, command, schedule, description } = taskData;
    
    // Générer un ID unique pour la tâche
    const id = `task_${Date.now()}`;
    const taskName = `HakBoard_${name.replace(/\s/g, '_')}`;
    
    // Déterminer le système d'exploitation
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows - Utiliser schtasks
      return new Promise((resolve, reject) => {
        // Construire la commande schtasks
        let schtasksCommand = `schtasks /create /tn "${taskName}" /tr "${command}" `;
        
        // Ajouter la planification en fonction du format
        if (schedule.toUpperCase() === 'HOURLY') {
          schtasksCommand += '/sc HOURLY';
        } else if (schedule.toUpperCase() === 'DAILY') {
          schtasksCommand += '/sc DAILY';
        } else if (schedule.toUpperCase() === 'WEEKLY') {
          schtasksCommand += '/sc WEEKLY';
        } else if (schedule.toUpperCase() === 'MONTHLY') {
          schtasksCommand += '/sc MONTHLY';
        } else if (schedule.toUpperCase() === 'STARTUP') {
          schtasksCommand += '/sc ONSTART';
        } else if (schedule.toUpperCase().startsWith('MINUTE:')) {
          const minutes = schedule.split(':')[1];
          schtasksCommand += `/sc MINUTE /mo ${minutes}`;
        } else {
          // Format personnalisé non pris en charge
          reject({ error: 'Format de planification non pris en charge sous Windows' });
          return;
        }
        
        // Ajouter /f pour forcer la création si la tâche existe déjà
        schtasksCommand += ' /f';
        
        // Exécuter la commande
        exec(schtasksCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('Erreur lors de la création de la tâche planifiée Windows:', error);
            reject({ error: error.message });
            return;
          }
          
          // Enregistrer la tâche dans notre configuration
          const configPath = path.join(app.getPath('userData'), 'app-tasks.json');
          let appTasksConfig = [];
          
          if (fs.existsSync(configPath)) {
            try {
              const configData = fs.readFileSync(configPath, 'utf8');
              appTasksConfig = JSON.parse(configData);
            } catch (err) {
              console.error('Erreur lors de la lecture du fichier de configuration des tâches:', err);
            }
          }
          
          // Ajouter la nouvelle tâche à la configuration
          appTasksConfig.push({
            id,
            name: taskName,
            description,
            platform: 'windows',
            createdAt: new Date().toISOString()
          });
          
          // Enregistrer la configuration mise à jour
          fs.writeFileSync(configPath, JSON.stringify(appTasksConfig, null, 2));
          
          resolve({
            id,
            name,
            schedule,
            command,
            status: 'active',
            description,
            platform: 'windows',
            isFromApp: true
          });
        });
      });
    } else {
      // Linux - Modifier la crontab
      return new Promise((resolve, reject) => {
        // Récupérer la crontab actuelle
        exec('crontab -l', (error, stdout, stderr) => {
          let currentCrontab = '';
          
          // Ignorer les erreurs "no crontab for user"
          if (!error || stderr.includes('no crontab')) {
            currentCrontab = stdout;
          } else {
            console.error('Erreur lors de la récupération de la crontab:', error);
            reject({ error: error.message });
            return;
          }
          
          // Ajouter la nouvelle tâche
          const newTask = `${schedule} ${command} # HakBoard_${id} ${name}`;
          const updatedCrontab = currentCrontab + (currentCrontab.endsWith('\n') ? '' : '\n') + newTask + '\n';
          
          // Écrire la crontab mise à jour dans un fichier temporaire
          const tempFile = path.join(os.tmpdir(), `crontab_${Date.now()}`);
          fs.writeFileSync(tempFile, updatedCrontab);
          
          // Mettre à jour la crontab
          exec(`crontab ${tempFile}`, (error, stdout, stderr) => {
            // Supprimer le fichier temporaire
            try {
              fs.unlinkSync(tempFile);
            } catch (e) {
              console.error('Erreur lors de la suppression du fichier temporaire:', e);
            }
            
            if (error) {
              console.error('Erreur lors de la mise à jour de la crontab:', error);
              reject({ error: error.message });
              return;
            }
            
            // Enregistrer la tâche dans notre configuration
            const configPath = path.join(app.getPath('userData'), 'app-tasks.json');
            let appTasksConfig = [];
            
            if (fs.existsSync(configPath)) {
              try {
                const configData = fs.readFileSync(configPath, 'utf8');
                appTasksConfig = JSON.parse(configData);
              } catch (err) {
                console.error('Erreur lors de la lecture du fichier de configuration des tâches:', err);
              }
            }
            
            // Ajouter la nouvelle tâche à la configuration
            appTasksConfig.push({
              id,
              name,
              description,
              platform: 'linux',
              createdAt: new Date().toISOString()
            });
            
            // Enregistrer la configuration mise à jour
            fs.writeFileSync(configPath, JSON.stringify(appTasksConfig, null, 2));
            
            resolve({
              id,
              name,
              schedule,
              command,
              status: 'active',
              description,
              platform: 'linux',
              isFromApp: true
            });
          });
        });
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la tâche planifiée:', error);
    throw error;
  }
});

// Gestionnaire IPC pour supprimer une tâche planifiée
ipcMain.handle('delete-scheduled-task', async (event, taskData) => {
  try {
    const { id, name, platform } = taskData;
    
    if (platform === 'windows') {
      // Windows - Utiliser schtasks
      return new Promise((resolve, reject) => {
        // Construire la commande schtasks
        const taskName = name.startsWith('HakBoard_') ? name : `HakBoard_${name.replace(/\s/g, '_')}`;
        const schtasksCommand = `schtasks /delete /tn "${taskName}" /f`;
        
        // Exécuter la commande
        exec(schtasksCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('Erreur lors de la suppression de la tâche planifiée Windows:', error);
            reject({ error: error.message });
            return;
          }
          
          // Mettre à jour notre configuration
          const configPath = path.join(app.getPath('userData'), 'app-tasks.json');
          
          if (fs.existsSync(configPath)) {
            try {
              const configData = fs.readFileSync(configPath, 'utf8');
              let appTasksConfig = JSON.parse(configData);
              
              // Filtrer la tâche supprimée
              appTasksConfig = appTasksConfig.filter(task => task.id !== id && task.name !== taskName);
              
              // Enregistrer la configuration mise à jour
              fs.writeFileSync(configPath, JSON.stringify(appTasksConfig, null, 2));
            } catch (err) {
              console.error('Erreur lors de la mise à jour du fichier de configuration des tâches:', err);
            }
          }
          
          resolve({ success: true });
        });
      });
    } else {
      // Linux - Modifier la crontab
      return new Promise((resolve, reject) => {
        // Récupérer la crontab actuelle
        exec('crontab -l', (error, stdout, stderr) => {
          let currentCrontab = '';
          
          // Ignorer les erreurs "no crontab for user"
          if (!error || stderr.includes('no crontab')) {
            currentCrontab = stdout;
          } else {
            console.error('Erreur lors de la récupération de la crontab:', error);
            reject({ error: error.message });
            return;
          }
          
          // Filtrer la tâche à supprimer
          const lines = currentCrontab.split('\n');
          const updatedLines = lines.filter(line => !line.includes(`# HakBoard_${id}`));
          const updatedCrontab = updatedLines.join('\n');
          
          // Écrire la crontab mise à jour dans un fichier temporaire
          const tempFile = path.join(os.tmpdir(), `crontab_${Date.now()}`);
          fs.writeFileSync(tempFile, updatedCrontab);
          
          // Mettre à jour la crontab
          exec(`crontab ${tempFile}`, (error, stdout, stderr) => {
            // Supprimer le fichier temporaire
            try {
              fs.unlinkSync(tempFile);
            } catch (e) {
              console.error('Erreur lors de la suppression du fichier temporaire:', e);
            }
            
            if (error) {
              console.error('Erreur lors de la mise à jour de la crontab:', error);
              reject({ error: error.message });
              return;
            }
            
            // Mettre à jour notre configuration
            const configPath = path.join(app.getPath('userData'), 'app-tasks.json');
            
            if (fs.existsSync(configPath)) {
              try {
                const configData = fs.readFileSync(configPath, 'utf8');
                let appTasksConfig = JSON.parse(configData);
                
                // Filtrer la tâche supprimée
                appTasksConfig = appTasksConfig.filter(task => task.id !== id);
                
                // Enregistrer la configuration mise à jour
                fs.writeFileSync(configPath, JSON.stringify(appTasksConfig, null, 2));
              } catch (err) {
                console.error('Erreur lors de la mise à jour du fichier de configuration des tâches:', err);
              }
            }
            
            resolve({ success: true });
          });
        });
      });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche planifiée:', error);
    throw error;
  }
});

// Gestionnaire pour l'analyse des métadonnées d'image
ipcMain.handle('parse-image-metadata', async (event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    
    return {
      image: {
        width: result.imageSize.width,
        height: result.imageSize.height,
        orientation: result.tags.Orientation || 'Non spécifiée'
      },
      exif: {
        make: result.tags.Make,
        model: result.tags.Model,
        software: result.tags.Software,
        dateTime: result.tags.DateTimeOriginal 
          ? new Date(result.tags.DateTimeOriginal * 1000).toLocaleString()
          : 'Non spécifiée',
        exposureTime: result.tags.ExposureTime,
        fNumber: result.tags.FNumber,
        iso: result.tags.ISO,
        focalLength: result.tags.FocalLength,
        gps: result.tags.GPSLatitude 
          ? {
              latitude: result.tags.GPSLatitude,
              longitude: result.tags.GPSLongitude
            }
          : null
      }
    };
  } catch (error) {
    console.error('Erreur lors de l\'analyse des métadonnées de l\'image:', error);
    throw error;
  }
});

// Gestionnaire pour l'analyse des métadonnées PDF
ipcMain.handle('parse-pdf-metadata', async (event, filePath) => {
  try {
    const pdfBytes = await fs.promises.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    return {
      document: {
        pageCount: pdfDoc.getPageCount(),
        title: pdfDoc.getTitle() || 'Non spécifié',
        author: pdfDoc.getAuthor() || 'Non spécifié',
        subject: pdfDoc.getSubject() || 'Non spécifié',
        keywords: pdfDoc.getKeywords() || 'Non spécifié',
        creator: pdfDoc.getCreator() || 'Non spécifié',
        producer: pdfDoc.getProducer() || 'Non spécifié',
        creationDate: pdfDoc.getCreationDate() 
          ? new Date(pdfDoc.getCreationDate()).toLocaleString() 
          : 'Non spécifiée',
        modificationDate: pdfDoc.getModificationDate()
          ? new Date(pdfDoc.getModificationDate()).toLocaleString()
          : 'Non spécifiée'
      }
    };
  } catch (error) {
    console.error('Erreur lors de l\'analyse des métadonnées du PDF:', error);
    throw error;
  }
});

// Gestionnaire pour l'analyse des métadonnées vidéo
ipcMain.handle('parse-video-metadata', (event, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Erreur lors de l\'analyse des métadonnées de la vidéo:', err);
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      resolve({
        format: {
          filename: metadata.format.filename,
          format: metadata.format.format_name,
          duration: `${Math.floor(metadata.format.duration)} secondes`,
          size: `${Math.round(metadata.format.size / 1024 / 1024 * 100) / 100} Mo`,
          bitrate: `${Math.round(metadata.format.bit_rate / 1000)} kbps`
        },
        video: videoStream ? {
          codec: videoStream.codec_name,
          resolution: `${videoStream.width}x${videoStream.height}`,
          frameRate: `${Math.round(eval(videoStream.r_frame_rate))} fps`,
          bitrate: videoStream.bit_rate 
            ? `${Math.round(videoStream.bit_rate / 1000)} kbps`
            : 'Non spécifié'
        } : null,
        audio: audioStream ? {
          codec: audioStream.codec_name,
          channels: audioStream.channels,
          sampleRate: `${audioStream.sample_rate} Hz`,
          bitrate: audioStream.bit_rate
            ? `${Math.round(audioStream.bit_rate / 1000)} kbps`
            : 'Non spécifié'
        } : null
      });
    });
  });
});

// Ajouter des gestionnaires pour le localStorage
ipcMain.handle('get-local-storage', (event, key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Erreur lors de la lecture du localStorage:', error);
    return null;
  }
});

ipcMain.handle('set-local-storage', (event, { key, value }) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'écriture dans le localStorage:', error);
    return false;
  }
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