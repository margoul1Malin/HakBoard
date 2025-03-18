// Service pour interagir avec Nmap dans un environnement Electron
const { v4: uuidv4 } = require('uuid');

// Clé pour le stockage local
const SCAN_RESULTS_KEY = 'nmap_scan_results';
const SCAN_HISTORY_KEY = 'nmap_scan_history';

// Fonction pour obtenir l'objet electron depuis le contexte de rendu
const getElectronAPI = () => {
  try {
    // Utiliser l'API exposée par preload.js
    if (window.electronAPI) {
      return window.electronAPI;
    } else {
      console.error('electronAPI n\'est pas disponible dans la fenêtre');
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de l\'accès à electronAPI:', error);
    return null;
  }
};

/**
 * Exécute une commande système de manière sécurisée via IPC
 * @param {string} command - Commande à exécuter
 * @returns {Promise<{stdout: string, stderr: string}>} - Résultat de la commande
 */
const executeCommand = async (command) => {
  const electronAPI = getElectronAPI();
  
  if (!electronAPI) {
    throw new Error('electronAPI n\'est pas disponible dans ce contexte');
  }
  
  console.log('Exécution de la commande:', command);
  
  try {
    // Utiliser IPC pour exécuter la commande dans le processus principal
    const result = await electronAPI.executeCommand(command);
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la commande:', error);
    throw error;
  }
};

/**
 * Vérifie et nettoie le localStorage pour éviter les problèmes de quota et de corruption
 */
const checkAndCleanStorage = () => {
  try {
    // Vérifier si les données sont valides
    let scanResults;
    let scanHistory;
    
    try {
      scanResults = JSON.parse(localStorage.getItem(SCAN_RESULTS_KEY) || '{}');
    } catch (error) {
      console.error('Données de résultats corrompues, réinitialisation:', error);
      scanResults = {};
      localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(scanResults));
    }
    
    try {
      scanHistory = JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
    } catch (error) {
      console.error('Données d\'historique corrompues, réinitialisation:', error);
      scanHistory = [];
      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(scanHistory));
    }
    
    // Vérifier la cohérence entre l'historique et les résultats
    const validHistoryEntries = [];
    
    for (const entry of scanHistory) {
      if (entry && entry.id && scanResults[entry.id]) {
        validHistoryEntries.push(entry);
      }
    }
    
    // Si des entrées ont été supprimées, mettre à jour l'historique
    if (validHistoryEntries.length !== scanHistory.length) {
      console.log('Nettoyage de l\'historique des scans:', 
        `${scanHistory.length - validHistoryEntries.length} entrées supprimées`);
      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(validHistoryEntries));
    }
    
    // Vérifier la taille des données stockées
    const storageSize = JSON.stringify(scanResults).length + JSON.stringify(validHistoryEntries).length;
    console.log('Taille des données stockées:', Math.round(storageSize / 1024), 'Ko');
    
    // Si la taille est trop importante, supprimer les scans les plus anciens
    if (storageSize > 4 * 1024 * 1024) { // 4 Mo
      console.warn('Taille de stockage importante, nettoyage des anciens scans');
      
      // Garder seulement les 10 scans les plus récents
      const recentEntries = validHistoryEntries.slice(0, 10);
      const recentIds = recentEntries.map(entry => entry.id);
      
      // Filtrer les résultats
      const filteredResults = {};
      for (const id of recentIds) {
        filteredResults[id] = scanResults[id];
      }
      
      // Sauvegarder les données filtrées
      localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(filteredResults));
      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(recentEntries));
      
      console.log('Nettoyage terminé, nouveaux scans conservés:', recentEntries.length);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification du stockage:', error);
    return false;
  }
};

/**
 * Vérifie si Nmap est installé sur le système
 * @returns {Promise<boolean>} True si Nmap est installé, false sinon
 */
const checkNmapInstallation = async () => {
  try {
    // Vérifier et nettoyer le stockage au démarrage
    checkAndCleanStorage();
    
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      console.error('electronAPI n\'est pas disponible dans ce contexte');
      return false;
    }
    
    // Obtenir la plateforme depuis le processus principal
    const platform = await electronAPI.getPlatform();
    
    // Commandes spécifiques à la plateforme pour vérifier Nmap
    if (platform === 'win32') {
      // Sur Windows, essayer plusieurs méthodes pour trouver nmap
      try {
        // D'abord essayer avec where (équivalent Windows de which)
        const whereResult = await executeCommand('where nmap');
        if (whereResult.stdout.trim()) {
          console.log('Nmap trouvé avec where:', whereResult.stdout.trim());
          return true;
        }
      } catch (error) {
        console.log('Nmap non trouvé avec where, essayant d\'autres méthodes...');
      }
      
      try {
        // Essayer avec which (peut être disponible si Git Bash ou autre shell est installé)
        const whichResult = await executeCommand('which nmap');
        if (whichResult.stdout.trim()) {
          console.log('Nmap trouvé avec which:', whichResult.stdout.trim());
          // Stocker le chemin pour une utilisation ultérieure
          await electronAPI.setNmapPath(whichResult.stdout.trim());
          return true;
        }
      } catch (error) {
        console.log('Nmap non trouvé avec which, essayant d\'autres méthodes...');
      }
      
      try {
        // Essayer d'exécuter nmap directement avec --version
        const versionResult = await executeCommand('nmap --version');
        if (versionResult.stdout.includes('Nmap version')) {
          console.log('Nmap trouvé avec --version');
          return true;
        }
      } catch (error) {
        console.log('Nmap non trouvé avec --version, essayant d\'autres méthodes...');
      }
      
      // Vérifier les emplacements d'installation courants de Nmap sur Windows
      const commonPaths = [
        'C:\\Program Files (x86)\\Nmap\\nmap.exe',
        'C:\\Program Files\\Nmap\\nmap.exe'
      ];
      
      for (const nmapPath of commonPaths) {
        try {
          // Vérifier si le fichier existe
          const checkResult = await executeCommand(`if exist "${nmapPath}" echo FOUND`);
          if (checkResult.stdout.includes('FOUND')) {
            console.log('Nmap trouvé à:', nmapPath);
            // Stocker le chemin pour une utilisation ultérieure
            await electronAPI.setNmapPath(nmapPath);
            return true;
          }
        } catch (error) {
          console.log(`Nmap non trouvé à ${nmapPath}`);
        }
      }
      
      return false;
    } else {
      // Sur Linux/macOS, utiliser which
      try {
        const whichResult = await executeCommand('which nmap');
        if (whichResult.stdout.trim()) {
          console.log('Nmap trouvé avec which:', whichResult.stdout.trim());
          // Stocker le chemin pour une utilisation ultérieure
          await electronAPI.setNmapPath(whichResult.stdout.trim());
          return true;
        }
      } catch (error) {
        console.log('Nmap non trouvé avec which, essayant d\'autres méthodes...');
      }
      
      try {
        // Essayer d'exécuter nmap directement avec --version
        const versionResult = await executeCommand('nmap --version');
        if (versionResult.stdout.includes('Nmap version')) {
          console.log('Nmap trouvé avec --version');
          return true;
        }
      } catch (error) {
        console.log('Nmap non trouvé avec --version');
      }
      
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de Nmap:', error.message);
    return false;
  }
};

/**
 * Exécute un scan Nmap avec les options spécifiées
 * @param {Object} options - Options de scan
 * @param {string} options.target - Cible du scan (IP, plage d'IP, nom d'hôte)
 * @param {string} options.scanName - Nom du scan (optionnel)
 * @param {string} options.scanType - Type de scan (e.g., 'basic', 'port', 'service', 'os', 'script')
 * @param {string} options.ports - Ports à scanner (e.g., '22,80,443' ou '1-1000')
 * @param {boolean} options.enableScripts - Activer les scripts NSE
 * @param {string} options.scriptCategories - Catégories de scripts (e.g., 'default', 'discovery', 'vuln')
 * @param {string} options.specificScripts - Scripts spécifiques à exécuter
 * @param {string} options.timing - Timing template (0-5)
 * @param {string} options.additionalOptions - Options supplémentaires
 * @param {Function} options.onProgress - Callback pour les mises à jour de progression
 * @returns {Promise<Object>} Résultat du scan
 */
const runNmapScan = (options) => {
  return new Promise(async (resolve, reject) => {
    const {
      target,
      scanName = '',
      scanType = 'basic',
      ports = '',
      enableScripts = false,
      scriptCategories = '',
      specificScripts = '',
      timing = '4',
      additionalOptions = '',
      onProgress = () => {}
    } = options;

    if (!target) {
      reject(new Error('Cible non spécifiée'));
      return;
    }

    // Vérifier si Nmap est installé
    const isNmapInstalled = await checkNmapInstallation();
    if (!isNmapInstalled) {
      reject(new Error('Nmap n\'est pas installé ou n\'est pas dans le PATH'));
      return;
    }

    const electronAPI = getElectronAPI();
    
    // Obtenir le chemin de Nmap (s'il a été trouvé et stocké)
    let nmapCommand = 'nmap';
    try {
      const nmapPath = await electronAPI.getNmapPath();
      if (nmapPath) {
        nmapCommand = `"${nmapPath}"`;
        console.log('Utilisation du chemin Nmap spécifique:', nmapCommand);
      }
    } catch (error) {
      console.log('Utilisation de la commande Nmap par défaut');
    }

    // Construire la commande Nmap
    let command = nmapCommand;

    // Ajouter les options en fonction du type de scan
    switch (scanType) {
      case 'basic':
        command += ' -sS'; // SYN scan
        break;
      case 'port':
        command += ' -sS -p ' + (ports || '1-1000');
        break;
      case 'service':
        command += ' -sS -sV -p ' + (ports || '1-1000');
        break;
      case 'os':
        command += ' -sS -O';
        if (ports) command += ' -p ' + ports;
        break;
      case 'script':
        command += ' -sS -sV';
        if (ports) command += ' -p ' + ports;
        if (enableScripts) {
          if (scriptCategories) {
            command += ' --script=' + scriptCategories;
          } else if (specificScripts) {
            command += ' --script=' + specificScripts;
          } else {
            command += ' --script=default';
          }
        }
        break;
      case 'ping':
        command += ' -sn'; // Ping scan (no port scan)
        break;
      case 'tcp':
        command += ' -sT'; // TCP Connect scan
        if (ports) command += ' -p ' + ports;
        break;
      case 'udp':
        command += ' -sU'; // UDP scan
        if (ports) command += ' -p ' + ports;
        break;
      case 'xmas':
        command += ' -sX'; // Xmas scan
        if (ports) command += ' -p ' + ports;
        break;
      case 'fin':
        command += ' -sF'; // FIN scan
        if (ports) command += ' -p ' + ports;
        break;
      case 'null':
        command += ' -sN'; // NULL scan
        if (ports) command += ' -p ' + ports;
        break;
      case 'maimon':
        command += ' -sM'; // Maimon scan
        if (ports) command += ' -p ' + ports;
        break;
      case 'window':
        command += ' -sW'; // Window scan
        if (ports) command += ' -p ' + ports;
        break;
      case 'ack':
        command += ' -sA'; // ACK scan
        if (ports) command += ' -p ' + ports;
        break;
      default:
        command += ' -sS'; // SYN scan par défaut
    }

    // Ajouter le timing template
    command += ' -T' + timing;

    // Ajouter les options supplémentaires
    if (additionalOptions) {
      command += ' ' + additionalOptions;
    }

    // Ajouter la sortie XML pour le parsing
    command += ' -oX -';

    // Ajouter la cible
    command += ' ' + target;

    // Vérifier si nous sommes sur Windows
    if (electronAPI) {
      const platform = await electronAPI.getPlatform();
      if (platform === 'win32') {
        // Sur Windows, nous devons nous assurer que l'utilisateur exécute en tant qu'administrateur
        onProgress({ 
          status: 'warning', 
          message: 'Sur Windows, Nmap nécessite des privilèges administrateur pour certains types de scans. Assurez-vous d\'exécuter l\'application en tant qu\'administrateur.' 
        });
      }
    }

    console.log('Exécution de la commande Nmap:', command);
    onProgress({ status: 'starting', message: 'Démarrage du scan...' });

    const scanStartTime = new Date();

    try {
      // Exécuter la commande Nmap
      const { stdout: xmlOutput, stderr: errorOutput } = await executeCommand(command);
      
      const scanEndTime = new Date();
      const scanDuration = (scanEndTime - scanStartTime) / 1000; // en secondes

      if (errorOutput && errorOutput.includes('RTTVAR')) {
        // Certaines erreurs de Nmap sont normales et peuvent être ignorées
        console.warn('Avertissements Nmap (ignorés):', errorOutput);
      } else if (errorOutput) {
        console.error('Erreur lors de l\'exécution de Nmap:', errorOutput);
        onProgress({ 
          status: 'error', 
          message: 'Erreur pendant le scan', 
          error: errorOutput 
        });
      }

      try {
        // Parser le résultat XML
        const result = parseNmapXML(xmlOutput);
        
        // Ajouter des métadonnées
        const scanResult = {
          id: uuidv4(),
          timestamp: scanStartTime.toISOString(),
          duration: scanDuration,
          command: command,
          target: target,
          scanName: scanName,
          scanType: scanType,
          result: result,
          rawXml: xmlOutput // Stocker le XML brut pour l'export
        };

        // Sauvegarder le résultat
        saveScanResult(scanResult);
        
        onProgress({ 
          status: 'completed', 
          message: 'Scan terminé avec succès', 
          result: scanResult 
        });
        
        resolve(scanResult);
      } catch (error) {
        console.error('Erreur lors du parsing des résultats Nmap:', error);
        reject(new Error(`Erreur lors du parsing des résultats: ${error.message}`));
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de Nmap:', error);
      onProgress({ 
        status: 'error', 
        message: 'Erreur lors de l\'exécution de Nmap', 
        error: error.message 
      });
      reject(error);
    }
  });
};

/**
 * Parse le XML de sortie de Nmap en objet JavaScript
 * @param {string} xmlOutput - Sortie XML de Nmap
 * @returns {Object} Résultat du scan parsé
 */
const parseNmapXML = (xmlOutput) => {
  try {
    console.log('Parsing du XML Nmap...');
    
    // Vérifier si le XML est vide ou invalide
    if (!xmlOutput || xmlOutput.trim() === '') {
      console.error('XML Nmap vide ou invalide');
      return { hosts: [] };
    }
    
    // Créer un objet pour stocker les résultats
    const result = {
      hosts: []
    };
    
    // Extraire les informations sur les hôtes
    const hostMatches = xmlOutput.match(/<host[^>]*>[\s\S]*?<\/host>/g);
    
    if (!hostMatches || hostMatches.length === 0) {
      console.log('Aucun hôte trouvé dans le XML');
      return result;
    }
    
    // Traiter chaque hôte
    hostMatches.forEach(hostXml => {
      const host = {
        addresses: [],
        hostnames: [],
        ports: [],
        os: [],
        scripts: []
      };
      
      // Extraire les adresses
      const addressMatches = hostXml.match(/<address addr="([^"]*)" addrtype="([^"]*)"[^>]*\/>/g);
      if (addressMatches) {
        addressMatches.forEach(addrMatch => {
          const addr = addrMatch.match(/addr="([^"]*)"/)[1];
          const addrtype = addrMatch.match(/addrtype="([^"]*)"/)[1];
          host.addresses.push({ addr, addrtype });
        });
      }
      
      // Extraire les noms d'hôte
      const hostnameMatches = hostXml.match(/<hostname name="([^"]*)"[^>]*\/>/g);
      if (hostnameMatches) {
        hostnameMatches.forEach(hostnameMatch => {
          const hostname = hostnameMatch.match(/name="([^"]*)"/)[1];
          host.hostnames.push(hostname);
        });
      }
      
      // Extraire le statut
      const statusMatch = hostXml.match(/<status state="([^"]*)" reason="([^"]*)"[^>]*\/>/);
      if (statusMatch) {
        host.status = {
          state: statusMatch[1],
          reason: statusMatch[2]
        };
      }
      
      // Extraire les informations sur les ports
      const portMatches = hostXml.match(/<port protocol="[^"]*" portid="[^"]*">[\s\S]*?<\/port>/g);
      if (portMatches) {
        portMatches.forEach(portXml => {
          const portidMatch = portXml.match(/portid="([^"]*)"/);
          const protocolMatch = portXml.match(/protocol="([^"]*)"/);
          const stateMatch = portXml.match(/<state state="([^"]*)"/);
          
          if (portidMatch && protocolMatch && stateMatch) {
            const port = {
              portid: portidMatch[1],
              protocol: protocolMatch[1],
              state: stateMatch[1]
            };
            
            // Extraire les informations sur le service
            const serviceMatch = portXml.match(/<service name="([^"]*)"(?: product="([^"]*)")?(?: version="([^"]*)")?/);
            if (serviceMatch) {
              port.service = {
                name: serviceMatch[1]
              };
              
              if (serviceMatch[2]) {
                port.service.product = serviceMatch[2];
              }
              
              if (serviceMatch[3]) {
                port.service.version = serviceMatch[3];
              }
            }
            
            // Extraire les résultats des scripts pour ce port
            const scriptMatches = portXml.match(/<script id="([^"]*)" output="([^"]*)"/g);
            if (scriptMatches) {
              port.scripts = scriptMatches.map(scriptMatch => {
                const idMatch = scriptMatch.match(/id="([^"]*)"/);
                const outputMatch = scriptMatch.match(/output="([^"]*)"/);
                return {
                  id: idMatch ? idMatch[1] : '',
                  output: outputMatch ? outputMatch[1] : ''
                };
              });
            }
            
            host.ports.push(port);
          }
        });
      }
      
      // Extraire les informations sur le système d'exploitation
      const osMatches = hostXml.match(/<osmatch name="([^"]*)" accuracy="([^"]*)"[^>]*>/g);
      if (osMatches) {
        osMatches.forEach(osMatch => {
          const nameMatch = osMatch.match(/name="([^"]*)"/);
          const accuracyMatch = osMatch.match(/accuracy="([^"]*)"/);
          
          if (nameMatch && accuracyMatch) {
            host.os.push({
              name: nameMatch[1],
              accuracy: accuracyMatch[1]
            });
          }
        });
      }
      
      // Extraire les résultats des scripts au niveau de l'hôte
      const hostScriptMatches = hostXml.match(/<hostscript>[\s\S]*?<\/hostscript>/);
      if (hostScriptMatches) {
        const scriptMatches = hostScriptMatches[0].match(/<script id="([^"]*)" output="([^"]*)"/g);
        if (scriptMatches) {
          scriptMatches.forEach(scriptMatch => {
            const idMatch = scriptMatch.match(/id="([^"]*)"/);
            const outputMatch = scriptMatch.match(/output="([^"]*)"/);
            
            if (idMatch && outputMatch) {
              host.scripts.push({
                id: idMatch[1],
                output: outputMatch[1]
              });
            }
          });
        }
      }
      
      result.hosts.push(host);
    });
    
    return result;
  } catch (error) {
    console.error('Erreur lors du parsing du XML Nmap:', error);
    // Retourner un résultat vide mais valide en cas d'erreur
    return { hosts: [] };
  }
};

/**
 * Sauvegarde le résultat d'un scan
 * @param {Object} scanResult - Résultat du scan à sauvegarder
 */
const saveScanResult = (scanResult) => {
  try {
    console.log('Sauvegarde du résultat du scan:', scanResult.id);
    
    // Récupérer les résultats existants
    let results;
    try {
      results = JSON.parse(sessionStorage.getItem(SCAN_RESULTS_KEY) || '{}');
    } catch (error) {
      console.error('Erreur lors de la lecture des résultats existants:', error);
      results = {};
    }
    
    // Ajouter le nouveau résultat
    results[scanResult.id] = scanResult;
    
    // Sauvegarder les résultats dans sessionStorage
    try {
      sessionStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(results));
      console.log('Résultat du scan sauvegardé avec succès dans sessionStorage');
      
      // Sauvegarder également dans localStorage pour persistance à long terme
      // mais sans les données XML brutes qui peuvent être volumineuses
      const resultsForLocalStorage = { ...results };
      for (const id in resultsForLocalStorage) {
        if (resultsForLocalStorage[id].rawXml) {
          // Supprimer les données XML brutes pour économiser de l'espace
          delete resultsForLocalStorage[id].rawXml;
        }
      }
      
      localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(resultsForLocalStorage));
      console.log('Version allégée des résultats sauvegardée dans localStorage');
    } catch (storageError) {
      console.error('Erreur lors de la sauvegarde dans le stockage:', storageError);
      
      // En cas d'erreur, essayer de libérer de l'espace
      try {
        // Garder seulement les 5 derniers scans
        const history = JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
        const recentScans = history.slice(0, 5);
        const recentScanIds = recentScans.map(scan => scan.id);
        
        // Filtrer les résultats
        const filteredResults = {};
        for (const id of recentScanIds) {
          if (results[id]) {
            // Supprimer les données XML brutes
            const result = { ...results[id] };
            delete result.rawXml;
            filteredResults[id] = result;
          }
        }
        
        // Ajouter le nouveau scan sans les données XML brutes
        const newScanWithoutXml = { ...scanResult };
        delete newScanWithoutXml.rawXml;
        filteredResults[scanResult.id] = newScanWithoutXml;
        
        // Sauvegarder les résultats filtrés
        localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(filteredResults));
        localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(recentScans));
        
        console.log('Espace libéré en supprimant les anciens scans et les données XML');
      } catch (cleanupError) {
        console.error('Erreur lors du nettoyage du stockage:', cleanupError);
      }
    }
    
    // Mettre à jour l'historique des scans
    updateScanHistory(scanResult);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du résultat du scan:', error);
    return false;
  }
};

/**
 * Met à jour l'historique des scans
 * @param {Object} scanResult - Résultat du scan à ajouter à l'historique
 */
const updateScanHistory = (scanResult) => {
  try {
    // Récupérer l'historique existant
    const history = JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
    
    // Créer une entrée d'historique
    const historyEntry = {
      id: scanResult.id,
      timestamp: scanResult.timestamp,
      target: scanResult.target,
      scanName: scanResult.scanName,
      scanType: scanResult.scanType,
      hostCount: scanResult.result.hosts ? scanResult.result.hosts.length : 0
    };
    
    // Ajouter l'entrée à l'historique
    history.unshift(historyEntry); // Ajouter au début pour avoir les plus récents en premier
    
    // Limiter l'historique à 50 entrées
    if (history.length > 50) {
      history.length = 50;
    }
    
    // Sauvegarder l'historique
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'historique des scans:', error);
    return false;
  }
};

/**
 * Récupère l'historique des scans
 * @returns {Array} Historique des scans
 */
const getScanHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des scans:', error);
    return [];
  }
};

/**
 * Récupère le résultat d'un scan par son ID
 * @param {string} scanId - ID du scan à récupérer
 * @returns {Object|null} Résultat du scan ou null si non trouvé
 */
const getScanResult = (scanId) => {
  try {
    console.log('Récupération du résultat du scan:', scanId);
    
    // Essayer d'abord de récupérer depuis sessionStorage (avec XML)
    let results;
    try {
      results = JSON.parse(sessionStorage.getItem(SCAN_RESULTS_KEY) || '{}');
      if (results[scanId]) {
        console.log('Résultat trouvé dans sessionStorage');
        return results[scanId];
      }
    } catch (error) {
      console.error('Erreur lors de la lecture de sessionStorage:', error);
    }
    
    // Si non trouvé, essayer depuis localStorage (sans XML)
    try {
      results = JSON.parse(localStorage.getItem(SCAN_RESULTS_KEY) || '{}');
      if (results[scanId]) {
        console.log('Résultat trouvé dans localStorage (sans XML)');
        return results[scanId];
      }
    } catch (error) {
      console.error('Erreur lors de la lecture de localStorage:', error);
    }
    
    console.error('Résultat non trouvé pour l\'ID:', scanId);
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération du résultat du scan:', error);
    return null;
  }
};

/**
 * Supprime le résultat d'un scan
 * @param {string} scanId - ID du scan à supprimer
 * @returns {boolean} True si la suppression a réussi, false sinon
 */
const deleteScanResult = (scanId) => {
  try {
    console.log('Suppression du scan:', scanId);
    
    // Supprimer de sessionStorage
    let sessionResults;
    try {
      sessionResults = JSON.parse(sessionStorage.getItem(SCAN_RESULTS_KEY) || '{}');
      if (sessionResults[scanId]) {
        delete sessionResults[scanId];
        sessionStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(sessionResults));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de sessionStorage:', error);
    }
    
    // Supprimer de localStorage
    let localResults;
    try {
      localResults = JSON.parse(localStorage.getItem(SCAN_RESULTS_KEY) || '{}');
      if (localResults[scanId]) {
        delete localResults[scanId];
        localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(localResults));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de localStorage:', error);
    }
    
    // Supprimer de l'historique
    let history;
    try {
      history = JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
      const newHistory = history.filter(entry => entry.id !== scanId);
      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'historique:', error);
      return false;
    }
    
    console.log('Scan supprimé avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression du résultat du scan:', error);
    return false;
  }
};

/**
 * Exporte les résultats d'un scan au format JSON
 * @param {string} scanId - ID du scan
 * @returns {string|null} Chaîne JSON ou null en cas d'erreur
 */
const exportScanResult = (scanId) => {
  try {
    const scanResult = getScanResult(scanId);
    if (!scanResult) {
      return null;
    }
    return JSON.stringify(scanResult, null, 2);
  } catch (error) {
    console.error('Erreur lors de l\'exportation du résultat du scan:', error);
    return null;
  }
};

/**
 * Ajoute une cible à partir d'un résultat de scan
 * @param {string} scanId - ID du scan
 * @param {string} hostAddress - Adresse de l'hôte
 * @param {Function} addTargetFn - Fonction pour ajouter une cible
 * @returns {Object} Résultat de l'opération
 */
const addTargetFromScan = (scanId, hostAddress, addTargetFn) => {
  try {
    const scanResult = getScanResult(scanId);
    if (!scanResult) {
      return { success: false, message: 'Résultat de scan non trouvé.' };
    }
    
    const host = scanResult.result.hosts.find(h => h.addresses.some(a => a.addr === hostAddress));
    if (!host) {
      return { success: false, message: 'Hôte non trouvé dans le résultat du scan.' };
    }
    
    // Créer une nouvelle cible
    const openPorts = host.ports
      .filter(p => p.state === 'open')
      .map(p => `${p.portid}/${p.protocol} (${p.service.name}${p.service.product ? ' - ' + p.service.product : ''}${p.service.version ? ' ' + p.service.version : ''})`)
      .join(', ');
    
    const osInfo = host.os.length > 0 
      ? host.os.map(o => `${o.name} (${o.accuracy}%)`).join(', ')
      : 'Non détecté';
    
    const target = {
      name: host.hostnames.length > 0 ? host.hostnames[0] : host.addresses[0].addr,
      ipAddress: host.addresses[0].addr,
      hostname: host.hostnames.length > 0 ? host.hostnames[0] : '',
      description: `Scan Nmap du ${new Date(scanResult.timestamp).toLocaleString()}`,
      status: host.status.state === 'up' ? 'active' : 'inactive',
      tags: ['nmap', 'scan'],
      notes: `Ports ouverts: ${openPorts || 'Aucun'}\nOS: ${osInfo}\n\nScan effectué le ${new Date(scanResult.timestamp).toLocaleString()}`
    };
    
    // Ajouter la cible en utilisant la fonction fournie
    return addTargetFn(target);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la cible à partir du scan:', error);
    return { success: false, message: 'Erreur lors de l\'ajout de la cible.' };
  }
};

// Exporter les fonctions du service
module.exports = {
  checkNmapInstallation,
  runNmapScan,
  getScanHistory,
  getScanResult,
  deleteScanResult,
  exportScanResult,
  addTargetFromScan
}; 