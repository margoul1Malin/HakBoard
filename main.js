const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const exifParser = require('exif-parser');
const { PDFDocument } = require('pdf-lib');
const ffmpeg = require('fluent-ffmpeg');
const Store = require('electron-store');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { dialog, shell } = require('electron');
const AdmZip = require('adm-zip');

const store = new Store();

let win;

// Variable pour stocker le chemin de Nmap
let nmapPath = null;

// Stockage des sessions de capture actives
const activeCaptureSessions = new Map();

// Fonction utilitaire pour exécuter des scripts Python
function execPython(script) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['-c', script]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`[Python] ${data.toString().trim()}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout, stderr });
      } else {
        console.error(`Échec de l'exécution Python (code ${code}):`, stderr);
        reject(new Error(`Échec de l'exécution Python: ${stderr}`));
      }
    });
  });
}

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

// Gestionnaire IPC pour ouvrir une boîte de dialogue de sélection de fichier
ipcMain.handle('show-open-file-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(options);
    
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

// ======================================================
// Module de capture de paquets réseau (Shark)
// ======================================================

// Fonction pour obtenir les interfaces réseau
ipcMain.handle('getNetworkInterfaces', async () => {
  try {
    console.log('Récupération des interfaces réseau...');
    
    // Méthode 1: Utiliser Node.js pour obtenir les interfaces (information limitée)
    const nodeInterfaces = os.networkInterfaces();
    const basicInterfaces = Object.entries(nodeInterfaces).map(([name, details]) => {
      return {
        name,
        description: details[0]?.address || 'Pas d\'information',
        mac: details[0]?.mac || 'Inconnu'
      };
    });
    
    // Méthode 2: Utiliser Python pour obtenir plus d'informations (si disponible)
    try {
      const pythonScript = `
import json
import psutil
import netifaces

interfaces = []
stats = psutil.net_if_stats()

for iface in netifaces.interfaces():
    if iface in stats and stats[iface].isup:
        try:
            addrs = netifaces.ifaddresses(iface)
            mac = addrs.get(netifaces.AF_LINK, [{'addr': 'Inconnu'}])[0]['addr']
            ip = addrs.get(netifaces.AF_INET, [{'addr': 'Pas d\'adresse IP'}])[0]['addr']
            interfaces.append({
                'name': iface,
                'description': f"{iface} ({ip})",
                'mac': mac,
                'is_up': True
            })
        except:
            interfaces.append({
                'name': iface,
                'description': iface,
                'mac': 'Inconnu',
                'is_up': True
            })

print(json.dumps(interfaces))
      `;
      
      const pythonProcess = spawn('python', ['-c', pythonScript]);
      let pythonOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString();
      });
      
      const pythonInterfaces = await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.warn(`Le processus Python s'est terminé avec le code ${code}`);
            resolve([]);
          } else {
            try {
              const result = JSON.parse(pythonOutput);
              resolve(result);
            } catch (err) {
              console.error('Erreur lors du parsing JSON:', err);
              resolve([]);
            }
          }
        });
        
        pythonProcess.on('error', (err) => {
          console.error('Erreur lors du lancement de Python:', err);
          resolve([]);
        });
      });
      
      if (pythonInterfaces.length > 0) {
        return pythonInterfaces;
      }
    } catch (err) {
      console.warn('Impossible d\'obtenir les interfaces via Python:', err.message);
    }
    
    // Retourner les interfaces de base si la méthode Python échoue
    return basicInterfaces;
  } catch (err) {
    console.error('Erreur lors de la récupération des interfaces réseau:', err);
    throw err;
  }
});

// Fonction pour démarrer la capture de paquets
ipcMain.handle('startPacketCapture', async (event, options) => {
  try {
    console.log('Démarrage de la capture de paquets avec les options:', options);
    const captureId = uuidv4();
    
    // Vérifier si les options sont valides
    if (!options.interface) {
      throw new Error("Interface réseau non spécifiée");
    }
    
    // Script Python pour la capture de paquets
    const pythonScript = `
import sys
import json
import time
import uuid
import traceback

# Fonction pour envoyer un message de log
def log(message, type="info"):
    print(f"{type.upper()}: {message}", file=sys.stderr)

# Définir la variable à la portée globale
USE_PYSHARK = False

try:
    # Essayer d'importer pyshark, sinon utiliser scapy directement
    try:
        import pyshark
        USE_PYSHARK = True
        log("Utilisation de PyShark pour la capture")
    except ImportError:
        log("PyShark non disponible, utilisation de Scapy directement", "warning")
        USE_PYSHARK = False

    # Importer scapy (obligatoire)
    try:
        from scapy.all import *
        # Importations spécifiques pour différentes couches
        from scapy.layers.inet import IP, TCP, UDP, ICMP
        from scapy.layers.inet6 import IPv6
        # ICMPv6 n'est pas disponible directement, utiliser les classes spécifiques
        from scapy.layers.inet6 import ICMPv6EchoRequest, ICMPv6EchoReply, ICMPv6ND_NS, ICMPv6ND_NA
        from scapy.layers.l2 import Ether, ARP
        try:
            from scapy.layers.tls.all import TLS
        except ImportError:
            log("Module TLS non disponible", "warning")
        from scapy.layers.dns import DNS
        try:
            from scapy.layers.netbios import NBNSQueryRequest, NBNSQueryResponse
        except ImportError:
            log("Module NetBIOS non disponible", "warning")
        log("Scapy importé avec succès avec les couches disponibles")
    except ImportError as e:
        log(f"Erreur d'importation Scapy: {str(e)}", "error")
        log("Certaines fonctionnalités de capture peuvent être limitées", "warning")
        sys.exit(1)

    # Configuration de la capture
    interface = "${options.interface}"
    bpf_filter = "${options.filter || ''}"
    capture_id = "${captureId}"

    # Dictionnaire de protocoles pour mapper les numéros de protocole IP aux noms
    IP_PROTOCOLS = {
        0: "HOPOPT",
        1: "ICMP",
        2: "IGMP",
        6: "TCP",
        17: "UDP",
        41: "IPv6",
        50: "ESP",
        51: "AH",
        58: "ICMPv6",
        89: "OSPF",
        132: "SCTP",
    }

    # Dictionnaire pour les ports UDP spécifiques
    UDP_PORTS = {
        137: "NBNS",
        138: "NetBIOS Datagram Service",
        139: "NetBIOS Session Service",
        5355: "LLMNR",
        1900: "SSDP",
        5353: "mDNS",
        67: "DHCP Server",
        68: "DHCP Client",
        53: "DNS",
        123: "NTP",
    }
    
    # Dictionnaire pour les ports TCP spécifiques
    TCP_PORTS = {
        80: "HTTP",
        443: "HTTPS/TLS",
        22: "SSH",
        21: "FTP",
        25: "SMTP",
        110: "POP3",
        143: "IMAP",
        3389: "RDP",
        23: "Telnet",
        20: "FTP Data",
        53: "DNS",
        389: "LDAP",
        636: "LDAPS",
        88: "Kerberos",
        464: "Kerberos Change/Set Password",
        135: "EPMAP/RPC",
        445: "SMB/CIFS",
        3268: "LDAP GC",
        3269: "LDAPS GC",
        139: "NetBIOS Session",
        1433: "MS SQL",
        1434: "MS SQL Browser",
        5985: "WinRM HTTP",
        5986: "WinRM HTTPS"
    }
    
    # EtherTypes pour identifier les protocoles de couche 2
    ETHER_TYPES = {
        "0x0800": "IPv4",
        "0x0806": "ARP",
        "0x86dd": "IPv6",
        "0x8100": "VLAN",
        "0x88e1": "HomePlug",
        "0x893a": "IEEE1905"
    }

    # Fonction pour convertir les données binaires en représentation hexadécimale formatée
    def format_hex_dump(data, bytes_per_line=16):
        if not data:
            return "Pas de données disponibles"
        
        # S'assurer que data est en bytes
        if not isinstance(data, bytes):
            try:
                if isinstance(data, str):
                    # Vérifier si c'est une chaîne hexadécimale
                    if all(c in '0123456789abcdefABCDEF ' for c in data.replace('\\n', '').replace(':', '')):
                        # Nettoyer la chaîne
                        clean_hex = data.replace(' ', '').replace('\\n', '').replace(':', '')
                        # Assurer une longueur paire
                        if len(clean_hex) % 2 != 0:
                            clean_hex = clean_hex[:-1]
                        # Convertir en bytes
                        if clean_hex:
                            data = bytes.fromhex(clean_hex)
                    else:
                        # Considérer comme une chaîne ASCII
                        data = data.encode('utf-8', errors='replace')
                else:
                    # Autres types
                    data = bytes(data)
            except Exception as e:
                log(f"Erreur lors de la conversion des données pour le format hex: {str(e)}", "error")
                return "Erreur de formatage hex"
        
        # Format compatible avec Wireshark
        result = []
        for i in range(0, len(data), bytes_per_line):
            chunk = data[i:i+bytes_per_line]
            hex_part = ' '.join([f'{b:02x}' for b in chunk])
            ascii_part = ''.join([chr(b) if 32 <= b <= 126 else '.' for b in chunk])
            result.append(f'{i:04x}: {hex_part.ljust(bytes_per_line*3-1)}  {ascii_part}')
        
        return '\\n'.join(result)

    # Fonction commune pour formater un paquet
    def format_basic_packet(packet, packet_bytes=None):
        try:
            packet_dict = {
                "id": str(uuid.uuid4()),
                "timestamp": time.strftime("%H:%M:%S", time.localtime()),
                "interface": interface,
                "length": len(packet_bytes) if packet_bytes is not None else 0,
                "source": "Inconnu",
                "destination": "Inconnu",
                "protocol": "Inconnu",
                "info": "Paquet inconnu",
                "hex": ""
            }
            
            # Formater les données hex
            if packet_bytes:
                # Utiliser le format_hex_dump au lieu de simplement packet_bytes.hex()
                packet_dict["hex"] = format_hex_dump(packet_bytes)
            
            return packet_dict
        except Exception as e:
            log(f"Erreur lors du formatage basique du paquet: {str(e)}", "error")
            return {
                "id": str(uuid.uuid4()),
                "timestamp": time.strftime("%H:%M:%S", time.localtime()),
                "interface": interface,
                "protocol": "ERREUR",
                "source": "Erreur",
                "destination": "Erreur",
                "length": 0,
                "info": f"Erreur de traitement: {str(e)}"
            }

    # Fonction pour formater les paquets PyShark
    def format_pyshark_packet(packet):
        try:
            packet_dict = format_basic_packet(packet)
            
            # Traitement des différentes couches
            try:
                # Extraire les données brutes si disponibles
                raw_packet_data = None
                
                # Méthode 1: Accéder directement aux données brutes
                if hasattr(packet, 'raw_packet'):
                    if hasattr(packet.raw_packet, 'data'):
                        raw_packet_data = packet.raw_packet.data
                
                # Méthode 2: Essayer d'accéder au buffer binaire
                if not raw_packet_data and hasattr(packet, 'binary_data'):
                    raw_packet_data = packet.binary_data
                
                # Méthode 3: Parcourir les champs du paquet pour trouver les données brutes
                if not raw_packet_data:
                    for layer in packet.layers:
                        if hasattr(layer, '_raw_packet'):
                            raw_packet_data = layer._raw_packet
                            break
                        
                        # Chercher des attributs qui pourraient contenir des données brutes
                        if hasattr(layer, 'data') and layer.data:
                            try:
                                # Vérifier si c'est une donnée binaire ou hexadécimale
                                data = layer.data
                                if isinstance(data, bytes):
                                    raw_packet_data = data
                                    break
                                elif isinstance(data, str) and all(c in '0123456789ABCDEFabcdef:' for c in data.replace(' ', '')):
                                    # Convertir la chaîne hex en bytes
                                    clean_hex = data.replace(' ', '').replace(':', '')
                                    if len(clean_hex) % 2 == 0:
                                        raw_packet_data = bytes.fromhex(clean_hex)
                                        break
                            except:
                                pass
                            
                # Si on a toujours pas les données brutes, essayer d'autres méthodes
                if not raw_packet_data and hasattr(packet, 'get_raw_packet'):
                    try:
                        raw_packet_data = packet.get_raw_packet()
                    except:
                        pass
                
                # Enregistrer les informations de débogage
                if raw_packet_data:
                    log(f"Données brutes obtenues, taille: {len(raw_packet_data)}", "debug")
                else:
                    log("Impossible d'obtenir les données brutes du paquet PyShark", "warning")
                
                # Le reste du traitement des couches reste le même...
                
                # Ajouter les données brutes hexadécimales
                if raw_packet_data:
                    try:
                        # Formater en représentation hexadécimale propre
                        packet_dict["hex"] = format_hex_dump(raw_packet_data)
                    except Exception as e:
                        log(f"Erreur lors du formatage des données hex: {str(e)}", "error")
                
                # Si on n'a pas pu obtenir les données brutes, ajouter une indication
                if not packet_dict.get("hex") and hasattr(packet, 'frame_info'):
                    try:
                        if hasattr(packet.frame_info, 'len'):
                            frame_len = int(packet.frame_info.len)
                            packet_dict["hex"] = f"[{frame_len} octets de données inaccessibles via PyShark]"
                    except Exception as e:
                        log(f"Erreur lors de l'accès aux informations de frame: {str(e)}", "error")
                
                # ... le reste du code reste inchangé ...
                
                # Ethernet
                if hasattr(packet, 'eth'):
                    packet_dict["source"] = packet.eth.src
                    packet_dict["destination"] = packet.eth.dst
                    packet_dict["ethernet"] = {
                        "src": packet.eth.src,
                        "dst": packet.eth.dst,
                        "type": packet.eth.type
                    }
                    
                    # Vérifier si c'est un protocole spécial basé sur EtherType
                    eth_type = "0x" + packet.eth.type.lower()
                    if eth_type in ETHER_TYPES:
                        packet_dict["protocol"] = ETHER_TYPES[eth_type]
                        packet_dict["info"] = f"{ETHER_TYPES[eth_type]} Packet"
                
                # HomePlug / IEEE1905
                if hasattr(packet, 'homeplug'):
                    packet_dict["protocol"] = "HomePlug"
                    packet_dict["info"] = "HomePlug AV Protocol"
                elif hasattr(packet, 'ieee1905'):
                    packet_dict["protocol"] = "IEEE1905"
                    packet_dict["info"] = "IEEE1905 Convergent Digital Home Network"
                
                # ARP
                if hasattr(packet, 'arp'):
                    packet_dict["protocol"] = "ARP"
                    packet_dict["source"] = packet.arp.src_proto_ipv4
                    packet_dict["destination"] = packet.arp.dst_proto_ipv4
                    operation = "Request" if packet.arp.opcode == "1" else "Reply"
                    packet_dict["info"] = f"ARP {operation} {packet.arp.src_hw_mac} → {packet.arp.dst_hw_mac}"
                    packet_dict["arp"] = {
                        "opcode": packet.arp.opcode,
                        "hwsrc": packet.arp.src_hw_mac,
                        "psrc": packet.arp.src_proto_ipv4,
                        "hwdst": packet.arp.dst_hw_mac,
                        "pdst": packet.arp.dst_proto_ipv4
                    }
                
                # IPv4
                if hasattr(packet, 'ip'):
                    packet_dict["source"] = packet.ip.src
                    packet_dict["destination"] = packet.ip.dst
                    proto_num = int(packet.ip.proto) if hasattr(packet.ip, 'proto') else 0
                    proto_name = IP_PROTOCOLS.get(proto_num, f"IPv4 Protocol {proto_num}")
                    packet_dict["protocol"] = proto_name
                    packet_dict["ip"] = {
                        "version": packet.ip.version,
                        "src": packet.ip.src,
                        "dst": packet.ip.dst,
                        "ttl": packet.ip.ttl,
                        "proto": packet.ip.proto
                    }
                
                # IPv6
                if hasattr(packet, 'ipv6'):
                    packet_dict["source"] = packet.ipv6.src
                    packet_dict["destination"] = packet.ipv6.dst
                    packet_dict["protocol"] = "IPv6"
                    packet_dict["ipv6"] = {
                        "src": packet.ipv6.src,
                        "dst": packet.ipv6.dst,
                        "hlim": packet.ipv6.hlim if hasattr(packet.ipv6, 'hlim') else "N/A",
                        "nxt": packet.ipv6.nxt if hasattr(packet.ipv6, 'nxt') else "N/A"
                    }
                
                # LDAP et protocoles Active Directory
                if hasattr(packet, 'ldap'):
                    packet_dict["protocol"] = "LDAP"
                    if hasattr(packet.ldap, 'messageid'):
                        message_id = packet.ldap.messageid
                        if hasattr(packet.ldap, 'protocolop'):
                            op = packet.ldap.protocolop
                            packet_dict["info"] = f"LDAP {op} (ID: {message_id})"
                        else:
                            packet_dict["info"] = f"LDAP Message (ID: {message_id})"
                
                if hasattr(packet, 'kerberos'):
                    packet_dict["protocol"] = "Kerberos"
                    if hasattr(packet.kerberos, 'msg_type'):
                        msg_type = packet.kerberos.msg_type
                        packet_dict["info"] = f"Kerberos {msg_type}"
                    else:
                        packet_dict["info"] = "Kerberos Message"
                
                # NetBIOS / NBNS / BROWSER
                if hasattr(packet, 'nbns'):
                    packet_dict["protocol"] = "NBNS"
                    if hasattr(packet.nbns, 'name'):
                        packet_dict["info"] = f"NBNS Name: {packet.nbns.name}"
                    else:
                        packet_dict["info"] = "NetBIOS Name Service"
                elif hasattr(packet, 'browser'):
                    packet_dict["protocol"] = "BROWSER"
                    packet_dict["info"] = "Microsoft BROWSER Protocol"
                elif hasattr(packet, 'nbdgm'):
                    packet_dict["protocol"] = "NetBIOS Datagram"
                    packet_dict["info"] = "NetBIOS Datagram Service"
                elif hasattr(packet, 'nbss'):
                    packet_dict["protocol"] = "NetBIOS Session"
                    packet_dict["info"] = "NetBIOS Session Service"
                
                # TCP
                if hasattr(packet, 'tcp'):
                    src_port = int(packet.tcp.srcport)
                    dst_port = int(packet.tcp.dstport)
                    
                    # Identifier le protocole par le port
                    if src_port in TCP_PORTS:
                        packet_dict["protocol"] = TCP_PORTS[src_port]
                    elif dst_port in TCP_PORTS:
                        packet_dict["protocol"] = TCP_PORTS[dst_port]
                    else:
                        packet_dict["protocol"] = "TCP"
                    
                    packet_dict["info"] = f"TCP {packet.tcp.srcport} → {packet.tcp.dstport}"
                    packet_dict["tcp"] = {
                        "srcport": packet.tcp.srcport,
                        "dstport": packet.tcp.dstport,
                        "seq": packet.tcp.seq,
                        "ack": packet.tcp.ack,
                        "flags": packet.tcp.flags
                    }
                
                # UDP
                if hasattr(packet, 'udp'):
                    src_port = int(packet.udp.srcport)
                    dst_port = int(packet.udp.dstport)
                    
                    # Identifier le protocole par le port
                    if src_port in UDP_PORTS:
                        packet_dict["protocol"] = UDP_PORTS[src_port]
                    elif dst_port in UDP_PORTS:
                        packet_dict["protocol"] = UDP_PORTS[dst_port]
                    else:
                        packet_dict["protocol"] = "UDP"
                    
                    packet_dict["info"] = f"UDP {packet.udp.srcport} → {packet.udp.dstport}"
                    packet_dict["udp"] = {
                        "srcport": packet.udp.srcport,
                        "dstport": packet.udp.dstport,
                        "length": packet.udp.length
                    }
                
                # ICMP
                if hasattr(packet, 'icmp'):
                    packet_dict["protocol"] = "ICMP"
                    packet_dict["info"] = f"ICMP Type {packet.icmp.type} Code {packet.icmp.code}"
                    packet_dict["icmp"] = {
                        "type": packet.icmp.type,
                        "code": packet.icmp.code
                    }
                
                # ICMPv6
                if hasattr(packet, 'icmpv6'):
                    packet_dict["protocol"] = "ICMPv6"
                    packet_dict["info"] = f"ICMPv6 Type {packet.icmpv6.type} Code {packet.icmpv6.code}"
                    packet_dict["icmpv6"] = {
                        "type": packet.icmpv6.type,
                        "code": packet.icmpv6.code
                    }
                
                # DNS
                if hasattr(packet, 'dns'):
                    packet_dict["protocol"] = "DNS"
                    if hasattr(packet.dns, 'qry_name'):
                        packet_dict["info"] = f"DNS Query: {packet.dns.qry_name}"
                    elif hasattr(packet.dns, 'resp_name'):
                        packet_dict["info"] = f"DNS Response: {packet.dns.resp_name}"
                    else:
                        packet_dict["info"] = f"DNS Message"
                
                # LLMNR (Link-Local Multicast Name Resolution)
                if hasattr(packet, 'llmnr'):
                    packet_dict["protocol"] = "LLMNR"
                    if hasattr(packet.llmnr, 'qry_name'):
                        packet_dict["info"] = f"LLMNR Query: {packet.llmnr.qry_name}"
                    else:
                        packet_dict["info"] = "LLMNR Message"
                
                # DHCP/DHCPv6
                if hasattr(packet, 'dhcp'):
                    packet_dict["protocol"] = "DHCP"
                    packet_dict["info"] = f"DHCP {packet.dhcp.type}"
                elif hasattr(packet, 'dhcpv6'):
                    packet_dict["protocol"] = "DHCPv6"
                    packet_dict["info"] = f"DHCPv6 Message"
                
                # TLS/SSL
                if hasattr(packet, 'tls'):
                    packet_dict["protocol"] = "TLS"
                    if hasattr(packet.tls, 'handshake'):
                        if hasattr(packet.tls.handshake, 'version'):
                            tls_version = packet.tls.handshake.version
                            # Convertir la version en format lisible
                            if tls_version == "0x0303":
                                tls_version_str = "TLS 1.2"
                            elif tls_version == "0x0304":
                                tls_version_str = "TLS 1.3"
                            else:
                                tls_version_str = f"TLS (0x{tls_version[2:]})"
                            
                            packet_dict["protocol"] = tls_version_str
                            packet_dict["info"] = f"{tls_version_str} Handshake"
                        else:
                            packet_dict["info"] = "TLS Handshake"
                    else:
                        packet_dict["info"] = "TLS Protocol"
                
                # HTTP
                if hasattr(packet, 'http'):
                    packet_dict["protocol"] = "HTTP"
                    if hasattr(packet.http, 'request'):
                        method = getattr(packet.http.request, 'method', "")
                        uri = getattr(packet.http.request, 'uri', "")
                        packet_dict["info"] = f"HTTP {method} {uri}"
                    elif hasattr(packet.http, 'response'):
                        code = getattr(packet.http.response, 'code', "")
                        packet_dict["info"] = f"HTTP Response: {code}"
                    else:
                        packet_dict["info"] = "HTTP Transaction"
                
                # SMB/CIFS
                if hasattr(packet, 'smb'):
                    packet_dict["protocol"] = "SMB"
                    packet_dict["info"] = "Server Message Block"
                elif hasattr(packet, 'smb2'):
                    packet_dict["protocol"] = "SMB2"
                    packet_dict["info"] = "Server Message Block v2"
                
                # Déterminer la longueur du paquet
                try:
                    packet_dict["length"] = len(packet)
                except:
                    pass  # Déjà défini dans format_basic_packet
                    
                # Ajouter les données brutes hexadécimales
                if raw_packet_data:
                    try:
                        # Convertir les données en bytes
                        if isinstance(raw_packet_data, bytes):
                            data_bytes = raw_packet_data
                        else:
                            # Si c'est un autre type de données, essayer de le convertir en bytes
                            data_bytes = bytes(raw_packet_data)
                        
                        # Formatter les données en hexadécimal avec formatage propre
                        packet_dict["hex"] = format_hex_dump(data_bytes)
                    except Exception as e:
                        log(f"Erreur lors du formatage des données hexadécimales: {str(e)}", "error")
                
                # Tentative alternative d'obtention des données hexadécimales
                if not packet_dict["hex"] and hasattr(packet, 'frame_info'):
                    try:
                        if hasattr(packet.frame_info, 'frame_len'):
                            frame_len = int(packet.frame_info.frame_len)
                            # Si nous avons la longueur du paquet mais pas les données, créer des données factices
                            # pour indiquer qu'il y a des données mais qu'elles ne sont pas disponibles
                            if frame_len > 0:
                                placeholder = f"[{frame_len} octets de données non accessibles via PyShark]"
                                packet_dict["hex"] = placeholder
                    except Exception as e:
                        log(f"Erreur lors de l'accès aux informations de trame: {str(e)}", "error")
                    
            except Exception as e:
                log(f"Erreur lors du traitement des couches PyShark: {str(e)}", "error")
                log(traceback.format_exc(), "error")
            
            # Si aucune info spécifique n'a été ajoutée
            if packet_dict["info"] == "Paquet inconnu":
                packet_dict["info"] = f"Paquet {packet_dict.get('protocol', 'Inconnu')}"
            
            return packet_dict
        except Exception as e:
            log(f"Erreur lors du formatage du paquet PyShark: {str(e)}", "error")
            log(traceback.format_exc(), "error")
            return format_basic_packet(packet)

    # Fonction pour formater les paquets Scapy
    def format_scapy_packet(packet):
        try:
            # Obtenir les données brutes du paquet complet
            packet_bytes = bytes(packet)
            packet_dict = format_basic_packet(packet, packet_bytes)
            
            # S'assurer que nous avons les données hexadécimales complètes du paquet
            packet_dict["hex"] = format_hex_dump(packet_bytes)
            
            # Extraire explicitement les données brutes (payload) si présentes
            if Raw in packet:
                payload = bytes(packet[Raw])
                packet_dict["payload"] = payload.hex()
                log(f"Paquet avec payload brut de {len(payload)} octets", "debug")
            
            # Traiter Ethernet
            if Ether in packet:
                packet_dict["ethernet"] = {
                    "src": packet[Ether].src,
                    "dst": packet[Ether].dst,
                    "type": hex(packet[Ether].type)
                }
                packet_dict["source"] = packet[Ether].src
                packet_dict["destination"] = packet[Ether].dst
                
                # Vérifier l'EtherType pour identifier les protocoles spéciaux
                eth_type = hex(packet[Ether].type).lower()
                if eth_type in ETHER_TYPES:
                    packet_dict["protocol"] = ETHER_TYPES[eth_type]
                    packet_dict["info"] = f"{ETHER_TYPES[eth_type]} Packet"
            
            # Traiter HomePlug et IEEE1905 (en fonction de l'EtherType)
            if Ether in packet:
                if packet[Ether].type == 0x88e1:  # HomePlug AV MME
                    packet_dict["protocol"] = "HomePlug"
                    packet_dict["info"] = "HomePlug AV Protocol"
                elif packet[Ether].type == 0x893a:  # IEEE 1905.1
                    packet_dict["protocol"] = "IEEE1905"
                    packet_dict["info"] = "IEEE1905 Convergent Digital Home Network"
            
            # Traiter ARP
            if ARP in packet:
                packet_dict["protocol"] = "ARP"
                packet_dict["source"] = packet[ARP].psrc
                packet_dict["destination"] = packet[ARP].pdst
                operation = "Request" if packet[ARP].op == 1 else "Reply"
                packet_dict["info"] = f"ARP {operation} {packet[ARP].hwsrc} → {packet[ARP].hwdst}"
                packet_dict["arp"] = {
                    "op": packet[ARP].op,
                    "hwsrc": packet[ARP].hwsrc,
                    "psrc": packet[ARP].psrc,
                    "hwdst": packet[ARP].hwdst,
                    "pdst": packet[ARP].pdst
                }
            
            # Traiter IPv4
            if IP in packet:
                packet_dict["ip"] = {
                    "version": packet[IP].version,
                    "src": packet[IP].src,
                    "dst": packet[IP].dst,
                    "ttl": packet[IP].ttl,
                    "proto": packet[IP].proto
                }
                packet_dict["protocol"] = IP_PROTOCOLS.get(packet[IP].proto, f"IPv4 Proto {packet[IP].proto}")
                packet_dict["source"] = packet[IP].src
                packet_dict["destination"] = packet[IP].dst
            
            # Traiter IPv6
            if IPv6 in packet:
                packet_dict["protocol"] = "IPv6"
                packet_dict["source"] = packet[IPv6].src
                packet_dict["destination"] = packet[IPv6].dst
                packet_dict["ipv6"] = {
                    "src": packet[IPv6].src,
                    "dst": packet[IPv6].dst,
                    "hlim": packet[IPv6].hlim,
                    "nh": packet[IPv6].nh
                }
                
                # Vérifier si c'est un paquet ICMPv6 (next header = 58)
                if packet[IPv6].nh == 58:
                    packet_dict["protocol"] = "ICMPv6"
                    packet_dict["info"] = "ICMPv6 Message"
                    
                    # Essayer de récupérer plus d'informations sur le type ICMPv6
                    try:
                        if packet.haslayer(ICMPv6EchoRequest):
                            packet_dict["info"] = "ICMPv6 Echo Request"
                            packet_dict["icmpv6"] = {"type": 128, "code": 0}
                        elif packet.haslayer(ICMPv6EchoReply):
                            packet_dict["info"] = "ICMPv6 Echo Reply"
                            packet_dict["icmpv6"] = {"type": 129, "code": 0}
                        elif packet.haslayer(ICMPv6ND_NS):
                            packet_dict["info"] = "ICMPv6 Neighbor Solicitation"
                            packet_dict["icmpv6"] = {"type": 135, "code": 0}
                        elif packet.haslayer(ICMPv6ND_NA):
                            packet_dict["info"] = "ICMPv6 Neighbor Advertisement"
                            packet_dict["icmpv6"] = {"type": 136, "code": 0}
                    except:
                        # En cas d'erreur, garder l'info générique
                        pass
            
            # Traiter LDAP et protocoles Active Directory
            if packet.haslayer(TCP):
                # LDAP (port 389)
                if packet[TCP].sport == 389 or packet[TCP].dport == 389:
                    packet_dict["protocol"] = "LDAP"
                    packet_dict["info"] = "LDAP Message"
                
                # LDAPS (port 636)
                elif packet[TCP].sport == 636 or packet[TCP].dport == 636:
                    packet_dict["protocol"] = "LDAPS"
                    packet_dict["info"] = "LDAP over SSL"
                
                # Kerberos (port 88)
                elif packet[TCP].sport == 88 or packet[TCP].dport == 88:
                    packet_dict["protocol"] = "Kerberos"
                    packet_dict["info"] = "Kerberos Authentication"
                
                # SMB (port 445)
                elif packet[TCP].sport == 445 or packet[TCP].dport == 445:
                    packet_dict["protocol"] = "SMB"
                    packet_dict["info"] = "Server Message Block"
            
            # NetBIOS / NBNS / BROWSER
            try:
                if packet.haslayer(NBNSQueryRequest) or packet.haslayer(NBNSQueryResponse):
                    packet_dict["protocol"] = "NBNS"
                    if packet.haslayer(NBNSQueryRequest):
                        packet_dict["info"] = f"NBNS Query"
                    else:
                        packet_dict["info"] = f"NBNS Response"
            except:
                pass  # Si le module NBNS n'est pas disponible
            
            # Traiter TCP
            if TCP in packet:
                src_port = packet[TCP].sport
                dst_port = packet[TCP].dport
                
                packet_dict["tcp"] = {
                    "srcport": src_port,
                    "dstport": dst_port,
                    "seq": packet[TCP].seq,
                    "ack": packet[TCP].ack,
                    "flags": str(packet[TCP].flags)
                }
                
                # Identifier les protocoles basés sur les ports TCP
                if src_port in TCP_PORTS:
                    packet_dict["protocol"] = TCP_PORTS[src_port]
                elif dst_port in TCP_PORTS:
                    packet_dict["protocol"] = TCP_PORTS[dst_port]
                else:
                    packet_dict["protocol"] = "TCP"
                
                # Détecter TLS par port et contenu
                if src_port == 443 or dst_port == 443:
                    # Vérifier si c'est un paquet TLS
                    try:
                        if packet.haslayer(TLS):
                            packet_dict["protocol"] = "TLS"
                            packet_dict["info"] = "TLS Protocol"
                    except:
                        # Si le module TLS n'est pas disponible
                        if src_port == 443 or dst_port == 443:
                            packet_dict["protocol"] = "HTTPS/TLS"
                            packet_dict["info"] = "HTTPS Traffic"
                    
                    # Essayer de détecter la version TLS
                    if Raw in packet:
                        raw_data = bytes(packet[Raw])
                        if len(raw_data) > 5 and raw_data[0] == 0x16:  # Handshake
                            if raw_data[1] == 0x03 and raw_data[2] == 0x03:
                                packet_dict["protocol"] = "TLS 1.2"
                                packet_dict["info"] = "TLS 1.2 Handshake"
                            elif raw_data[1] == 0x03 and raw_data[2] == 0x04:
                                packet_dict["protocol"] = "TLS 1.3"
                                packet_dict["info"] = "TLS 1.3 Handshake"
                
                packet_dict["info"] = f"TCP {src_port} → {dst_port}"
            
            # Traiter UDP
            if UDP in packet:
                src_port = packet[UDP].sport
                dst_port = packet[UDP].dport
                
                packet_dict["udp"] = {
                    "srcport": src_port,
                    "dstport": dst_port,
                    "length": len(packet[UDP])
                }
                
                # Identifier les protocoles basés sur les ports UDP
                if src_port in UDP_PORTS:
                    packet_dict["protocol"] = UDP_PORTS[src_port]
                elif dst_port in UDP_PORTS:
                    packet_dict["protocol"] = UDP_PORTS[dst_port]
                else:
                    packet_dict["protocol"] = "UDP"
                
                # Vérifier les protocoles spéciaux basés sur les ports UDP
                if src_port == 137 or dst_port == 137:
                    packet_dict["protocol"] = "NBNS"
                    packet_dict["info"] = "NetBIOS Name Service"
                elif src_port == 138 or dst_port == 138:
                    packet_dict["protocol"] = "NetBIOS"
                    packet_dict["info"] = "NetBIOS Datagram Service"
                
                packet_dict["info"] = f"UDP {src_port} → {dst_port}"
            
            # Traiter ICMP
            if ICMP in packet:
                packet_dict["protocol"] = "ICMP"
                packet_dict["info"] = f"ICMP Type {packet[ICMP].type} Code {packet[ICMP].code}"
                packet_dict["icmp"] = {
                    "type": packet[ICMP].type,
                    "code": packet[ICMP].code
                }
            
            # Traiter DNS
            try:
                if packet.haslayer(DNS):
                    packet_dict["protocol"] = "DNS"
                    if packet[DNS].qr == 0:
                        # Query
                        if packet[DNS].qd and packet[DNS].qd.qname:
                            qname = packet[DNS].qd.qname.decode() if isinstance(packet[DNS].qd.qname, bytes) else str(packet[DNS].qd.qname)
                            packet_dict["info"] = f"DNS Query: {qname}"
                        else:
                            packet_dict["info"] = f"DNS Message"
                    else:
                        # Response
                        packet_dict["info"] = f"DNS Response"
            except:
                pass  # Si le DNS n'est pas disponible ou cause des erreurs
            
            # Mettre à jour la longueur si elle n'est pas déjà définie
            if packet_dict["length"] == 0:
                packet_dict["length"] = len(bytes(packet))
                
            return packet_dict
        except Exception as e:
            log(f"Erreur lors du formatage du paquet Scapy: {str(e)}", "error")
            log(traceback.format_exc(), "error")
            return format_basic_packet(packet, bytes(packet) if packet else None)

    # Fonction principale de capture
    def start_capture():
        # Accéder à la variable globale
        global USE_PYSHARK
        
        log(f"Démarrage de la capture sur l'interface {interface}")
        
        if bpf_filter:
            log(f"Filtre appliqué: {bpf_filter}")
        
        packet_count = 0
        pyshark_raw_data_failure_count = 0
        
        try:
            if USE_PYSHARK:
                # Utiliser PyShark
                try:
                    if bpf_filter:
                        capture = pyshark.LiveCapture(interface=interface, bpf_filter=bpf_filter)
                    else:
                        capture = pyshark.LiveCapture(interface=interface)
                    
                    log("Capture PyShark démarrée. En attente de paquets...")
                    
                    for packet in capture.sniff_continuously():
                        try:
                            formatted_packet = format_pyshark_packet(packet)
                            
                            # Vérifier si les données brutes ont été obtenues
                            if not formatted_packet.get("hex") or formatted_packet["hex"].startswith("["):
                                pyshark_raw_data_failure_count += 1
                                
                                # Si 5 paquets consécutifs n'ont pas de données brutes, basculer vers Scapy
                                if pyshark_raw_data_failure_count >= 5:
                                    log("Plusieurs échecs d'obtention des données brutes avec PyShark, basculement vers Scapy", "warning")
                                    USE_PYSHARK = False
                                    break
                            else:
                                # Réinitialiser le compteur si un paquet a des données brutes
                                pyshark_raw_data_failure_count = 0
                            
                            print(json.dumps(formatted_packet))
                            sys.stdout.flush()
                            
                            packet_count += 1
                            if packet_count % 10 == 0:
                                log(f"{packet_count} paquets capturés")
                        except Exception as e:
                            log(f"Erreur lors du traitement d'un paquet PyShark: {str(e)}", "error")
                            log(traceback.format_exc(), "error")
                except Exception as e:
                    log(f"Erreur lors de l'initialisation de PyShark: {str(e)}", "error")
                    log("Utilisation de Scapy comme solution de secours", "warning")
                    USE_PYSHARK = False
            
            # Utiliser Scapy comme solution principale ou de secours
            if not USE_PYSHARK:
                log("Capture Scapy démarrée. En attente de paquets...")
                packet_count = 0  # Réinitialiser le compteur
                
                def packet_callback(packet):
                    nonlocal packet_count
                    try:
                        formatted_packet = format_scapy_packet(packet)
                        print(json.dumps(formatted_packet))
                        sys.stdout.flush()
                        
                        packet_count += 1
                        if packet_count % 10 == 0:
                            log(f"{packet_count} paquets capturés")
                    except Exception as e:
                        log(f"Erreur lors du traitement d'un paquet Scapy: {str(e)}", "error")
                        log(traceback.format_exc(), "error")
                
                # Démarrer la capture avec Scapy
                if bpf_filter:
                    sniff(iface=interface, filter=bpf_filter, prn=packet_callback, store=0)
                else:
                    sniff(iface=interface, prn=packet_callback, store=0)
        
        except KeyboardInterrupt:
            log("Capture interrompue par l'utilisateur")
        except Exception as e:
            log(f"Erreur fatale lors de la capture: {str(e)}", "error")
            log(traceback.format_exc(), "error")
    
    # Lancer la capture
    start_capture()
except Exception as e:
    log(f"Erreur critique du programme: {str(e)}", "error")
    log(traceback.format_exc(), "error")
    sys.exit(1)
`;
    
    // Créer un processus Python pour la capture
    const pythonProcess = spawn('python', ['-c', pythonScript]);
    
    // Gestionnaire pour les paquets capturés
    pythonProcess.stdout.on('data', (data) => {
      try {
        // Traiter chaque ligne comme un paquet JSON
        const lines = data.toString().trim().split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const packet = JSON.parse(line);
              console.log(`Paquet reçu: ${packet.protocol} de ${packet.source} vers ${packet.destination}`);
              
              // Envoyer le paquet au renderer via l'événement
              event.sender.send('packet-captured', packet);
            } catch (jsonErr) {
              console.warn('Erreur de parsing JSON:', jsonErr, 'Ligne:', line);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors du traitement des données de sortie:', err);
      }
    });
    
    // Gestionnaire pour les messages d'erreur et les logs
    pythonProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`[Python Shark] ${message}`);
      
      // Envoyer les logs au renderer
      event.sender.send('shark-log', {
        timestamp: new Date().toISOString(),
        message: message,
        type: message.includes('ERREUR') ? 'error' : 'info'
      });
    });
    
    // Gérer la terminaison du processus
    pythonProcess.on('close', (code) => {
      console.log(`Le processus de capture s'est terminé avec le code ${code}`);
      activeCaptureSessions.delete(captureId);
      event.sender.send('capture-stopped', { captureId, code });
    });
    
    // Stocker le processus de capture
    activeCaptureSessions.set(captureId, {
      process: pythonProcess,
      options,
      windowId: event.sender.id
    });
    
    return captureId;
  } catch (err) {
    console.error('Erreur lors du démarrage de la capture:', err);
    throw err;
  }
});

// Fonction pour arrêter la capture de paquets
ipcMain.handle('stopPacketCapture', async (event, captureId) => {
  try {
    console.log('Arrêt de la capture de paquets:', captureId);
    
    const captureSession = activeCaptureSessions.get(captureId);
    if (!captureSession) {
      throw new Error("Session de capture non trouvée");
    }
    
    // Terminer le processus Python
    captureSession.process.kill();
    
    // Attendre la terminaison du processus
    await new Promise((resolve) => {
      captureSession.process.on('exit', () => {
        resolve();
      });
      
      // Timeout au cas où le processus ne se termine pas
      setTimeout(() => {
        if (!captureSession.process.killed) {
          captureSession.process.kill('SIGKILL');
        }
        resolve();
      }, 2000);
    });
    
    // Supprimer la session de la map
    activeCaptureSessions.delete(captureId);
    
    return { success: true };
  } catch (err) {
    console.error('Erreur lors de l\'arrêt de la capture:', err);
    throw err;
  }
});

// Fonction pour exporter les paquets au format PCAP
ipcMain.handle('exportToPcap', async (event, packets) => {
  try {
    console.log(`Exportation de ${packets.length} paquets au format PCAP`);
    
    // Créer un nom de fichier temporaire
    const tmpDir = os.tmpdir();
    const dateString = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    const fileName = `shark_capture_${dateString}.pcap`;
    const filePath = path.join(tmpDir, fileName);
    
    // Pour éviter l'erreur E2BIG, on va écrire les paquets dans un fichier temporaire
    // plutôt que de passer tout le JSON directement au script Python
    const packetsTmpFile = path.join(tmpDir, `packets_${dateString}.json`);
    await fs.promises.writeFile(packetsTmpFile, JSON.stringify(packets));
    
    // Script Python pour créer le fichier PCAP
    const pythonScript = `
import json
import sys
import os
from scapy.all import *
# Importations spécifiques pour différentes couches
from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6
# ICMPv6 n'est pas disponible directement
try:
    from scapy.layers.inet6 import ICMPv6EchoRequest, ICMPv6EchoReply, ICMPv6ND_NS, ICMPv6ND_NA
except ImportError:
    print("Module ICMPv6 non disponible", file=sys.stderr)
from scapy.layers.l2 import Ether, ARP
try:
    from scapy.layers.tls.all import TLS
except ImportError:
    print("Module TLS non disponible", file=sys.stderr)
from scapy.layers.dns import DNS
try:
    from scapy.layers.netbios import NBNSQueryRequest, NBNSQueryResponse
except ImportError:
    print("Module NetBIOS non disponible", file=sys.stderr)

def hex_to_raw(hex_string):
    """Convertit une chaîne hexadécimale en données brutes binaires."""
    if not hex_string:
        return b''
        
    try:
        # Si le format est déjà celui de format_hex_dump avec des sauts de ligne et des offsets
        if "\\n" in hex_string or "\\n" in hex_string:
            # Extraire uniquement les parties hexadécimales (ignorer les offsets et les parties ASCII)
            clean_hex = ""
            lines = hex_string.replace("\\n", "\\n").split("\\n")
            for line in lines:
                # Ignorer les lignes vides
                if not line.strip():
                    continue
                    
                # Trouver la partie hexadécimale (entre l'offset et la partie ASCII)
                parts = line.split(":")
                if len(parts) >= 2:
                    # Partie après le premier ":" et avant le double espace qui sépare de l'ASCII
                    hex_part = parts[1].split("  ")[0].strip()
                    # Ajouter à notre chaîne hex propre
                    clean_hex += hex_part.replace(" ", "")
        else:
            # Nettoyer la chaîne (supprimer espaces, etc.)
            clean_hex = hex_string.replace(" ", "").replace(":", "")
        
        # Supprimer tout caractère non hexadécimal
        clean_hex = ''.join(c for c in clean_hex if c in '0123456789abcdefABCDEF')
        
        # S'assurer que la longueur est paire
        if len(clean_hex) % 2 != 0:
            clean_hex = clean_hex[:-1]
            
        # Convertir en bytes
        if clean_hex:
            return bytes.fromhex(clean_hex)
    except Exception as e:
        print(f"Erreur lors de la conversion des données hex: {str(e)}", file=sys.stderr)
    
    return b''

try:
    # Charger les paquets depuis le fichier temporaire
    with open("${packetsTmpFile}", 'r') as f:
        packets_data = json.load(f)

    print(f"Chargement de {len(packets_data)} paquets depuis le fichier JSON", file=sys.stderr)
    pcap_packets = []
    
    # Convertir les paquets JSON en paquets Scapy
    for idx, packet_data in enumerate(packets_data):
        try:
            # Créer une base de paquet Ethernet
            if "ethernet" in packet_data:
                ether = Ether(
                    src=packet_data.get("ethernet", {}).get("src", "00:00:00:00:00:00"),
                    dst=packet_data.get("ethernet", {}).get("dst", "00:00:00:00:00:00")
                )
            else:
                ether = Ether()
            
            packet = ether
            
            # Ajouter couche ARP si présente
            if "arp" in packet_data:
                arp_data = packet_data["arp"]
                packet = packet / ARP(
                    hwsrc=arp_data.get("hwsrc", "00:00:00:00:00:00"),
                    hwdst=arp_data.get("hwdst", "00:00:00:00:00:00"),
                    psrc=arp_data.get("psrc", "0.0.0.0"),
                    pdst=arp_data.get("pdst", "0.0.0.0"),
                    op=int(arp_data.get("op", 1))
                )
            # Ajouter couche IP si présente
            elif "ip" in packet_data:
                ip_data = packet_data["ip"]
                packet = packet / IP(
                    src=ip_data.get("src", "0.0.0.0"),
                    dst=ip_data.get("dst", "0.0.0.0"),
                    ttl=int(ip_data.get("ttl", 64))
                )
                
                # Ajouter couche TCP si présente
                if "tcp" in packet_data:
                    tcp_data = packet_data["tcp"]
                    packet = packet / TCP(
                        sport=int(tcp_data.get("srcport", 0)),
                        dport=int(tcp_data.get("dstport", 0)),
                        seq=int(tcp_data.get("seq", 0)),
                        ack=int(tcp_data.get("ack", 0)),
                        flags=tcp_data.get("flags", "")
                    )
                # Ajouter couche UDP si présente
                elif "udp" in packet_data:
                    udp_data = packet_data["udp"]
                    packet = packet / UDP(
                        sport=int(udp_data.get("srcport", 0)),
                        dport=int(udp_data.get("dstport", 0))
                    )
                # Ajouter couche ICMP si présente
                elif "icmp" in packet_data:
                    icmp_data = packet_data["icmp"]
                    packet = packet / ICMP(
                        type=int(icmp_data.get("type", 0)),
                        code=int(icmp_data.get("code", 0))
                    )
            # Ajouter couche IPv6 si présente
            elif "ipv6" in packet_data:
                ipv6_data = packet_data["ipv6"]
                packet = packet / IPv6(
                    src=ipv6_data.get("src", "::"),
                    dst=ipv6_data.get("dst", "::")
                )
                
                # Couches de transport pour IPv6
                if "tcp" in packet_data:
                    tcp_data = packet_data["tcp"]
                    packet = packet / TCP(
                        sport=int(tcp_data.get("srcport", 0)),
                        dport=int(tcp_data.get("dstport", 0))
                    )
                elif "udp" in packet_data:
                    udp_data = packet_data["udp"]
                    packet = packet / UDP(
                        sport=int(udp_data.get("srcport", 0)),
                        dport=int(udp_data.get("dstport", 0))
                    )
                elif "icmpv6" in packet_data:
                    icmpv6_data = packet_data["icmpv6"]
                    # Utiliser une classe générique pour ICMPv6 pour éviter des erreurs
                    try:
                        from scapy.layers.inet6 import ICMPv6Unknown
                        packet = packet / ICMPv6Unknown(
                            type=int(icmpv6_data.get("type", 0)),
                            code=int(icmpv6_data.get("code", 0))
                        )
                    except ImportError:
                        # Fallback, utiliser ICMP standard avec type/code modifiés
                        packet = packet / ICMP(
                            type=int(icmpv6_data.get("type", 0)),
                            code=int(icmpv6_data.get("code", 0))
                        )
            
            # Ajouter les données brutes (payload) si présentes
            if "hex" in packet_data and packet_data["hex"]:
                try:
                    # Convertir la représentation hex en bytes
                    raw_data = hex_to_raw(packet_data["hex"])
                    
                    # Ajouter les données directement au paquet actuel
                    if raw_data:
                        packet = packet / Raw(load=raw_data)
                        print(f"Paquet {idx+1}: Ajout de {len(raw_data)} octets de données brutes", file=sys.stderr)
                except Exception as e:
                    print(f"Erreur lors du traitement des données hex du paquet {idx+1}: {str(e)}", file=sys.stderr)
            
            pcap_packets.append(packet)
            
        except Exception as e:
            print(f"Erreur lors de la conversion du paquet {idx+1}: {str(e)}", file=sys.stderr)
            continue

    # Écrire les paquets dans un fichier PCAP
    if pcap_packets:
        wrpcap("${filePath}", pcap_packets)
        print(f"Fichier PCAP créé avec succès: {os.path.abspath('${filePath}')}", file=sys.stderr)
        print(f"{len(pcap_packets)} paquets écrits dans le fichier PCAP", file=sys.stderr)
    else:
        print("Aucun paquet n'a pu être converti.", file=sys.stderr)
    
    # Supprimer le fichier temporaire
    try:
        os.remove("${packetsTmpFile}")
        print(f"Fichier temporaire supprimé: {os.path.abspath('${packetsTmpFile}')}", file=sys.stderr)
    except Exception as e:
        print(f"Erreur lors de la suppression du fichier temporaire: {str(e)}", file=sys.stderr)
        
    # Sortie réussie avec le chemin du fichier
    print(os.path.abspath("${filePath}"))
    sys.exit(0)
except Exception as e:
    print(f"Erreur lors de l'exportation PCAP: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
    
    // Exécuter le script Python
    const pythonProcess = spawn('python', ['-c', pythonScript]);
    
    let pythonOutput = '';
    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });
    
    let pythonError = '';
    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
      console.log(`[Python PCAP Export] ${data.toString().trim()}`);
    });
    
    // Attendre la fin du processus
    return new Promise((resolve, reject) => {
      pythonProcess.on('close', async (code) => {
        if (code === 0) {
          console.log('Exportation PCAP réussie:', pythonOutput.trim());
          
          try {
            // Vérifier si le fichier existe
            const pcapExists = await fs.promises.access(filePath)
              .then(() => true)
              .catch(() => false);
              
            if (pcapExists) {
              const responseResult = await dialog.showMessageBox({
                type: 'info',
                title: 'Exportation réussie',
                message: `${packets.length} paquets ont été exportés avec succès.`,
                detail: `Le fichier PCAP a été enregistré à l'emplacement suivant:\n${filePath}`,
                buttons: ['Ouvrir le dossier', 'OK'],
                cancelId: 1
              });
              
              if (responseResult.response === 0) {
                // Ouvrir le dossier contenant le fichier
                shell.showItemInFolder(filePath);
              }
            }
            
            resolve(filePath);
          } catch (err) {
            console.error('Erreur lors de la vérification du fichier PCAP:', err);
            reject(new Error(`Erreur lors de la vérification du fichier PCAP: ${err.message}`));
          }
        } else {
          console.error(`Échec de l'exportation PCAP (code ${code}):`, pythonError);
          reject(new Error(`Échec de l'exportation PCAP: ${pythonError}`));
        }
      });
    });
  } catch (err) {
    console.error('Erreur lors de l\'exportation PCAP:', err);
    throw err;
  }
});

// Fonction pour exporter les paquets au format PCAP et les regrouper dans un ZIP
ipcMain.handle('exportToPcapZip', async (event, packets) => {
  try {
    console.log(`Exportation de ${packets.length} paquets au format PCAP dans un fichier ZIP`);
    
    // Créer un dossier temporaire pour stocker les fichiers PCAP
    const tmpDir = os.tmpdir();
    const dateString = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    const zipFolderName = `shark_capture_${dateString}`;
    const zipFolderPath = path.join(tmpDir, zipFolderName);
    const zipFilePath = path.join(app.getPath('downloads'), `${zipFolderName}.zip`);
    
    try {
      // Créer le dossier temporaire s'il n'existe pas
      await fs.promises.mkdir(zipFolderPath, { recursive: true });
    } catch (err) {
      console.error('Erreur lors de la création du dossier temporaire:', err);
      throw new Error(`Erreur lors de la création du dossier temporaire: ${err.message}`);
    }
    
    // Si plus de 200 paquets, traiter par lots
    const batchSize = 200;
    const numBatches = Math.ceil(packets.length / batchSize);
    const pcapFiles = [];
    
    for (let i = 0; i < numBatches; i++) {
      const startIdx = i * batchSize;
      const endIdx = Math.min((i + 1) * batchSize, packets.length);
      const batch = packets.slice(startIdx, endIdx);
      
      console.log(`Traitement du lot ${i+1}/${numBatches} (${startIdx+1}-${endIdx})`);
      
      // Créer un nom de fichier pour ce lot
      const batchFileName = `capture_batch_${i+1}_${startIdx+1}-${endIdx}.pcap`;
      const batchFilePath = path.join(zipFolderPath, batchFileName);
      
      // Pour éviter l'erreur E2BIG, on va écrire les paquets dans un fichier temporaire
      const packetsTmpFile = path.join(tmpDir, `packets_batch_${i+1}_${dateString}.json`);
      await fs.promises.writeFile(packetsTmpFile, JSON.stringify(batch));
      
      // Script Python pour créer le fichier PCAP (même script que dans exportToPcap)
      // mais avec un chemin de sortie différent
      const pythonScript = `
import json
import sys
import os
from scapy.all import *
# Importations spécifiques pour différentes couches
from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6
# ICMPv6 n'est pas disponible directement
try:
    from scapy.layers.inet6 import ICMPv6EchoRequest, ICMPv6EchoReply, ICMPv6ND_NS, ICMPv6ND_NA
except ImportError:
    print("Module ICMPv6 non disponible", file=sys.stderr)
from scapy.layers.l2 import Ether, ARP
try:
    from scapy.layers.tls.all import TLS
except ImportError:
    print("Module TLS non disponible", file=sys.stderr)
from scapy.layers.dns import DNS
try:
    from scapy.layers.netbios import NBNSQueryRequest, NBNSQueryResponse
except ImportError:
    print("Module NetBIOS non disponible", file=sys.stderr)

def hex_to_raw(hex_string):
    """Convertit une chaîne hexadécimale en données brutes binaires."""
    if not hex_string:
        return b''
        
    try:
        # Si le format est déjà celui de format_hex_dump avec des sauts de ligne et des offsets
        if "\\n" in hex_string or "\\n" in hex_string:
            # Extraire uniquement les parties hexadécimales (ignorer les offsets et les parties ASCII)
            clean_hex = ""
            lines = hex_string.replace("\\n", "\\n").split("\\n")
            for line in lines:
                # Ignorer les lignes vides
                if not line.strip():
                    continue
                    
                # Trouver la partie hexadécimale (entre l'offset et la partie ASCII)
                parts = line.split(":")
                if len(parts) >= 2:
                    # Partie après le premier ":" et avant le double espace qui sépare de l'ASCII
                    hex_part = parts[1].split("  ")[0].strip()
                    # Ajouter à notre chaîne hex propre
                    clean_hex += hex_part.replace(" ", "")
        else:
            # Nettoyer la chaîne (supprimer espaces, etc.)
            clean_hex = hex_string.replace(" ", "").replace(":", "")
        
        # Supprimer tout caractère non hexadécimal
        clean_hex = ''.join(c for c in clean_hex if c in '0123456789abcdefABCDEF')
        
        # S'assurer que la longueur est paire
        if len(clean_hex) % 2 != 0:
            clean_hex = clean_hex[:-1]
            
        # Convertir en bytes
        if clean_hex:
            return bytes.fromhex(clean_hex)
    except Exception as e:
        print(f"Erreur lors de la conversion des données hex: {str(e)}", file=sys.stderr)
    
    return b''

try:
    # Charger les paquets depuis le fichier temporaire
    with open("${packetsTmpFile}", 'r') as f:
        packets_data = json.load(f)

    print(f"Chargement de {len(packets_data)} paquets depuis le fichier JSON", file=sys.stderr)
    pcap_packets = []
    
    # Convertir les paquets JSON en paquets Scapy
    for idx, packet_data in enumerate(packets_data):
        try:
            # Créer une base de paquet Ethernet
            if "ethernet" in packet_data:
                ether = Ether(
                    src=packet_data.get("ethernet", {}).get("src", "00:00:00:00:00:00"),
                    dst=packet_data.get("ethernet", {}).get("dst", "00:00:00:00:00:00")
                )
            else:
                ether = Ether()
            
            packet = ether
            
            # Ajouter couche ARP si présente
            if "arp" in packet_data:
                arp_data = packet_data["arp"]
                packet = packet / ARP(
                    hwsrc=arp_data.get("hwsrc", "00:00:00:00:00:00"),
                    hwdst=arp_data.get("hwdst", "00:00:00:00:00:00"),
                    psrc=arp_data.get("psrc", "0.0.0.0"),
                    pdst=arp_data.get("pdst", "0.0.0.0"),
                    op=int(arp_data.get("op", 1))
                )
            # Ajouter couche IP si présente
            elif "ip" in packet_data:
                ip_data = packet_data["ip"]
                packet = packet / IP(
                    src=ip_data.get("src", "0.0.0.0"),
                    dst=ip_data.get("dst", "0.0.0.0"),
                    ttl=int(ip_data.get("ttl", 64))
                )
                
                # Ajouter couche TCP si présente
                if "tcp" in packet_data:
                    tcp_data = packet_data["tcp"]
                    packet = packet / TCP(
                        sport=int(tcp_data.get("srcport", 0)),
                        dport=int(tcp_data.get("dstport", 0)),
                        seq=int(tcp_data.get("seq", 0)),
                        ack=int(tcp_data.get("ack", 0)),
                        flags=tcp_data.get("flags", "")
                    )
                # Ajouter couche UDP si présente
                elif "udp" in packet_data:
                    udp_data = packet_data["udp"]
                    packet = packet / UDP(
                        sport=int(udp_data.get("srcport", 0)),
                        dport=int(udp_data.get("dstport", 0))
                    )
                # Ajouter couche ICMP si présente
                elif "icmp" in packet_data:
                    icmp_data = packet_data["icmp"]
                    packet = packet / ICMP(
                        type=int(icmp_data.get("type", 0)),
                        code=int(icmp_data.get("code", 0))
                    )
            # Ajouter couche IPv6 si présente
            elif "ipv6" in packet_data:
                ipv6_data = packet_data["ipv6"]
                packet = packet / IPv6(
                    src=ipv6_data.get("src", "::"),
                    dst=ipv6_data.get("dst", "::")
                )
                
                # Couches de transport pour IPv6
                if "tcp" in packet_data:
                    tcp_data = packet_data["tcp"]
                    packet = packet / TCP(
                        sport=int(tcp_data.get("srcport", 0)),
                        dport=int(tcp_data.get("dstport", 0))
                    )
                elif "udp" in packet_data:
                    udp_data = packet_data["udp"]
                    packet = packet / UDP(
                        sport=int(udp_data.get("srcport", 0)),
                        dport=int(udp_data.get("dstport", 0))
                    )
                elif "icmpv6" in packet_data:
                    icmpv6_data = packet_data["icmpv6"]
                    # Utiliser une classe générique pour ICMPv6 pour éviter des erreurs
                    try:
                        from scapy.layers.inet6 import ICMPv6Unknown
                        packet = packet / ICMPv6Unknown(
                            type=int(icmpv6_data.get("type", 0)),
                            code=int(icmpv6_data.get("code", 0))
                        )
                    except ImportError:
                        # Fallback, utiliser ICMP standard avec type/code modifiés
                        packet = packet / ICMP(
                            type=int(icmpv6_data.get("type", 0)),
                            code=int(icmpv6_data.get("code", 0))
                        )
            
            # Ajouter les données brutes (payload) si présentes
            if "hex" in packet_data and packet_data["hex"]:
                try:
                    # Convertir la représentation hex en bytes
                    raw_data = hex_to_raw(packet_data["hex"])
                    
                    # Ajouter les données directement au paquet actuel
                    if raw_data:
                        packet = packet / Raw(load=raw_data)
                        print(f"Paquet {idx+1}: Ajout de {len(raw_data)} octets de données brutes", file=sys.stderr)
                except Exception as e:
                    print(f"Erreur lors du traitement des données hex du paquet {idx+1}: {str(e)}", file=sys.stderr)
            
            pcap_packets.append(packet)
            
        except Exception as e:
            print(f"Erreur lors de la conversion du paquet {idx+1}: {str(e)}", file=sys.stderr)
            continue

    # Écrire les paquets dans un fichier PCAP
    if pcap_packets:
        wrpcap("${batchFilePath}", pcap_packets)
        print(f"Fichier PCAP créé avec succès: {os.path.abspath('${batchFilePath}')}", file=sys.stderr)
        print(f"{len(pcap_packets)} paquets écrits dans le fichier PCAP", file=sys.stderr)
    else:
        print("Aucun paquet n'a pu être converti.", file=sys.stderr)
    
    # Supprimer le fichier temporaire
    try:
        os.remove("${packetsTmpFile}")
        print(f"Fichier temporaire supprimé: {os.path.abspath('${packetsTmpFile}')}", file=sys.stderr)
    except Exception as e:
        print(f"Erreur lors de la suppression du fichier temporaire: {str(e)}", file=sys.stderr)
        
    # Sortie réussie avec le chemin du fichier
    print(os.path.abspath("${batchFilePath}"))
    sys.exit(0)
except Exception as e:
    print(f"Erreur lors de l'exportation PCAP: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
      
      // Exécuter le script Python
      const pythonProcess = spawn('python', ['-c', pythonScript]);
      
      let pythonOutput = '';
      pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString();
      });
      
      let pythonError = '';
      pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
        console.log(`[Python PCAP Batch Export] ${data.toString().trim()}`);
      });
      
      // Attendre la fin du processus pour ce lot
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`Lot ${i+1} exporté avec succès vers ${batchFilePath}`);
            pcapFiles.push(batchFilePath);
            resolve(batchFilePath);
          } else {
            console.error(`Échec de l'exportation du lot ${i+1} (code ${code}):`, pythonError);
            reject(new Error(`Échec de l'exportation du lot ${i+1}: ${pythonError}`));
          }
        });
      });
      
      // Supprimer le fichier JSON temporaire après traitement
      try {
        await fs.promises.unlink(packetsTmpFile);
      } catch (err) {
        console.error(`Erreur lors de la suppression du fichier JSON temporaire ${packetsTmpFile}:`, err);
      }
    }
    
    // Créer un fichier ZIP avec tous les fichiers PCAP
    console.log(`Création du fichier ZIP avec ${pcapFiles.length} fichiers PCAP...`);
    const zip = new AdmZip();
    
    // Ajouter chaque fichier PCAP au ZIP
    for (const pcapFile of pcapFiles) {
      try {
        const fileName = path.basename(pcapFile);
        zip.addLocalFile(pcapFile, "", fileName);
      } catch (err) {
        console.error(`Erreur lors de l'ajout du fichier ${pcapFile} au ZIP:`, err);
      }
    }
    
    // Ajouter un fichier README
    const readmeContent = `Capture réseau HakBoard\n` + 
                        `Date: ${new Date().toLocaleString()}\n` +
                        `Nombre de paquets: ${packets.length}\n` +
                        `Nombre de fichiers: ${pcapFiles.length}\n\n` +
                        `Ce dossier ZIP contient les paquets réseau capturés par HakBoard.\n` +
                        `Vous pouvez ouvrir les fichiers .pcap avec Wireshark ou tout autre analyseur de protocole réseau.`;
    
    zip.addFile("README.txt", Buffer.from(readmeContent, "utf8"));
    
    // Enregistrer le fichier ZIP
    zip.writeZip(zipFilePath);
    console.log(`Fichier ZIP créé avec succès: ${zipFilePath}`);
    
    // Nettoyer les fichiers PCAP temporaires
    for (const pcapFile of pcapFiles) {
      try {
        await fs.promises.unlink(pcapFile);
        console.log(`Fichier temporaire supprimé: ${pcapFile}`);
      } catch (err) {
        console.error(`Erreur lors de la suppression du fichier temporaire ${pcapFile}:`, err);
      }
    }
    
    // Supprimer le dossier temporaire
    try {
      await fs.promises.rmdir(zipFolderPath);
      console.log(`Dossier temporaire supprimé: ${zipFolderPath}`);
    } catch (err) {
      console.error(`Erreur lors de la suppression du dossier temporaire ${zipFolderPath}:`, err);
    }
    
    // Afficher une boîte de dialogue
    const dialogResponse = await dialog.showMessageBox({
      type: 'info',
      title: 'Exportation ZIP réussie',
      message: `${packets.length} paquets ont été exportés avec succès.`,
      detail: `Le fichier ZIP a été enregistré à l'emplacement suivant:\n${zipFilePath}`,
      buttons: ['Ouvrir le dossier', 'OK'],
      cancelId: 1
    });
    
    if (dialogResponse.response === 0) {
      // Ouvrir le dossier contenant le fichier
      shell.showItemInFolder(zipFilePath);
    }
    
    return zipFilePath;
  } catch (err) {
    console.error('Erreur lors de l\'exportation ZIP:', err);
    throw err;
  }
});

// Nettoyer les processus de capture lors de la fermeture de l'application
app.on('before-quit', () => {
  console.log('Nettoyage des sessions de capture actives...');
  for (const [captureId, session] of activeCaptureSessions.entries()) {
    try {
      console.log(`Arrêt de la session de capture ${captureId}`);
      session.process.kill();
    } catch (err) {
      console.error(`Erreur lors de l'arrêt de la session ${captureId}:`, err);
    }
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