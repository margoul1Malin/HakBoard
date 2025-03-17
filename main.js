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
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:8080 https://gitlab.com https://www.shodan.io/ https://www.exploit-db.com https://cve.mitre.org https://nvd.nist.gov https://api.hunter.io https://haveibeenpwned.com https://leakcheck.io https://api.twilio.com https://lookups.twilio.com https://apilayer.net https://api.sendgrid.com; img-src 'self' data: blob:; frame-src 'self' blob:;"
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

// Gestionnaire IPC pour exécuter spécifiquement des scripts shell sous Linux
ipcMain.handle('execute-sh', (event, scriptPath) => {
  return new Promise((resolve, reject) => {
    console.log('Exécution du script shell:', scriptPath);
    
    try {
      // Vérifier si le fichier existe
      const fs = require('fs');
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
    const fs = require('fs');
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

// Gestionnaire IPC pour exécuter spécifiquement des scripts PowerShell
ipcMain.handle('execute-ps1', (event, scriptPath) => {
  return new Promise((resolve, reject) => {
    console.log('Exécution du script PowerShell:', scriptPath);
    
    try {
      // Vérifier si le fichier existe
      const fs = require('fs');
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