import React, { useState, useEffect, useRef } from 'react';
import { FiPlay, FiDownload, FiCpu, FiServer, FiAlertTriangle, FiCheckCircle, FiInfo, FiFilter, FiCode } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

// Fonction utilitaire pour joindre des chemins (remplacement de path.join)
const joinPaths = (...parts) => {
  return parts.map((part, i) => {
    if (i === 0) {
      // Supprimer les barres obliques de fin pour le premier élément
      return part.replace(/\/$/, '');
    } else {
      // Supprimer les barres obliques de début et de fin pour les autres éléments
      return part.replace(/(^\/|\/$)/g, '');
    }
  }).join('/');
};

const PrivEsc = () => {
  console.log('PrivEsc - Rendu');
  
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [filteredOutput, setFilteredOutput] = useState('');
  const [osType, setOsType] = useState('');
  const [filterLevel, setFilterLevel] = useState('all'); // 'all', 'critical', 'warning', 'info'
  const [activeFilter, setActiveFilter] = useState('all');
  const [parsedResults, setParsedResults] = useState({
    critical: [],
    warning: [],
    info: []
  });
  const [currentProcess, setCurrentProcess] = useState(null);
  
  // Référence pour le conteneur de sortie
  const outputRef = useRef(null);
  
  // Détecter le système d'exploitation au chargement
  useEffect(() => {
    detectOS();
    checkElectronAPI();
  }, []);
  
  // Fonction pour détecter le système d'exploitation
  const detectOS = async () => {
    console.log('Détection du système d\'exploitation...');
    
    try {
      // Vérifier si l'API Electron est disponible
      if (!window.electronAPI) {
        console.error('API Electron non disponible pour détecter le système d\'exploitation');
        return 'unknown';
      }
      
      // Vérifier si la méthode getPlatform est disponible
      if (!window.electronAPI.getPlatform) {
        console.error('Méthode getPlatform non disponible dans l\'API Electron');
        
        // Utiliser navigator.platform comme fallback
        const platform = navigator.platform.toLowerCase();
        console.log('Utilisation de navigator.platform comme fallback:', platform);
        
        if (platform.includes('win')) {
          return 'windows';
        } else if (platform.includes('linux')) {
          return 'linux';
        } else if (platform.includes('mac')) {
          return 'mac';
        } else {
          return 'unknown';
        }
      }
      
      // Utiliser l'API Electron pour obtenir la plateforme
      const platform = await window.electronAPI.getPlatform();
      console.log('Plateforme détectée via Electron API:', platform);
      
      if (platform === 'win32') {
        return 'windows';
      } else if (platform === 'linux') {
        return 'linux';
      } else if (platform === 'darwin') {
        return 'mac';
      } else {
        return 'unknown';
      }
    } catch (error) {
      console.error('Erreur lors de la détection du système d\'exploitation:', error);
      
      // Utiliser navigator.platform comme fallback en cas d'erreur
      const platform = navigator.platform.toLowerCase();
      console.log('Utilisation de navigator.platform comme fallback après erreur:', platform);
      
      if (platform.includes('win')) {
        return 'windows';
      } else if (platform.includes('linux')) {
        return 'linux';
      } else if (platform.includes('mac')) {
        return 'mac';
      } else {
        return 'unknown';
      }
    }
  };
  
  // Fonction pour vérifier la disponibilité de l'API Electron
  const checkElectronAPI = () => {
    console.log('Vérification de l\'API Electron...');
    
    if (window.electronAPI) {
      console.log('API Electron détectée:', window.electronAPI);
      
      // Vérifier les méthodes disponibles
      const methods = [];
      for (const key in window.electronAPI) {
        methods.push(key);
      }
      
      console.log('Méthodes disponibles:', methods);
      showInfo(`API Electron disponible avec ${methods.length} méthodes`);
    } else {
      console.error('API Electron non disponible');
      showWarning('API Electron non disponible. Certaines fonctionnalités seront limitées.');
    }
  };
  
  // Fonction pour vérifier et définir les permissions des scripts
  const ensureScriptPermissions = async (scriptPath) => {
    try {
      // Vérifier si l'API Electron est disponible
      if (window.electronAPI && window.electronAPI.checkFilePermissions) {
        const isExecutable = await window.electronAPI.checkFilePermissions(scriptPath);
        
        if (!isExecutable && window.electronAPI.setFilePermissions) {
          await window.electronAPI.setFilePermissions(scriptPath, '755');
          console.log(`Permissions définies pour ${scriptPath}`);
          return true;
        }
        
        return isExecutable;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  };
  
  // Fonction pour vérifier si les scripts PEAS sont présents
  const checkPEASScripts = async () => {
    try {
      if (!window.electronAPI) {
        console.error('API Electron non disponible pour vérifier les scripts PEAS');
        return false;
      }
      
      // Vérifier si la méthode checkFileExists est disponible
      if (!window.electronAPI.checkFileExists) {
        console.error('Méthode checkFileExists non disponible dans l\'API Electron');
        
        // Si la méthode n'est pas disponible, supposer que les scripts sont présents
        showWarning('Impossible de vérifier les scripts PEAS. Tentative d\'exécution directe...');
        return true;
      }
      
      const winPEASPath = './src/programs/PEASS-ng/winPEAS/winPEASps1/winPEAS.ps1';
      const linPEASPath = './src/programs/PEASS-ng/linPEAS/linpeas.sh';
      
      console.log('Vérification des scripts PEAS:', { winPEASPath, linPEASPath });
      
      let winPEASExists = false;
      let linPEASExists = false;
      
      try {
        winPEASExists = await window.electronAPI.checkFileExists(winPEASPath);
      } catch (error) {
        console.error('Erreur lors de la vérification de WinPEAS:', error);
      }
      
      try {
        linPEASExists = await window.electronAPI.checkFileExists(linPEASPath);
      } catch (error) {
        console.error('Erreur lors de la vérification de LinPEAS:', error);
      }
      
      console.log('Scripts PEAS présents:', { winPEASExists, linPEASExists });
      
      // Si les scripts n'existent pas et que la méthode writeFile est disponible, les télécharger
      if ((!winPEASExists || !linPEASExists) && window.electronAPI.writeFile) {
        showWarning('Certains scripts PEAS sont manquants. Téléchargement en cours...');
        
        if (!winPEASExists) {
          try {
            console.log('Téléchargement du script WinPEAS...');
            const winPEASContent = await fetchWinPEASScript();
            
            if (winPEASContent) {
              await window.electronAPI.writeFile(winPEASPath, winPEASContent);
              
              if (window.electronAPI.setFilePermissions) {
                await window.electronAPI.setFilePermissions(winPEASPath, '755');
              }
              
              showInfo('Script WinPEAS téléchargé avec succès');
            } else {
              showError('Impossible de télécharger le script WinPEAS');
            }
          } catch (error) {
            console.error('Erreur lors du téléchargement de WinPEAS:', error);
            showError(`Erreur lors du téléchargement de WinPEAS: ${error.message}`);
          }
        }
        
        if (!linPEASExists) {
          try {
            console.log('Téléchargement du script LinPEAS...');
            const linPEASContent = await fetchLinPEASScript();
            
            if (linPEASContent) {
              await window.electronAPI.writeFile(linPEASPath, linPEASContent);
              
              if (window.electronAPI.setFilePermissions) {
                await window.electronAPI.setFilePermissions(linPEASPath, '755');
              }
              
              showInfo('Script LinPEAS téléchargé avec succès');
            } else {
              showError('Impossible de télécharger le script LinPEAS');
            }
          } catch (error) {
            console.error('Erreur lors du téléchargement de LinPEAS:', error);
            showError(`Erreur lors du téléchargement de LinPEAS: ${error.message}`);
          }
        }
        
        // Vérifier à nouveau si les scripts sont présents après le téléchargement
        try {
          winPEASExists = await window.electronAPI.checkFileExists(winPEASPath);
          linPEASExists = await window.electronAPI.checkFileExists(linPEASPath);
          
          console.log('Scripts PEAS après téléchargement:', { winPEASExists, linPEASExists });
        } catch (error) {
          console.error('Erreur lors de la vérification des scripts après téléchargement:', error);
        }
      }
      
      // Si nous sommes sur Windows, seul WinPEAS est nécessaire
      if (osType === 'windows' && winPEASExists) {
        return true;
      }
      
      // Si nous sommes sur Linux/Mac, seul LinPEAS est nécessaire
      if ((osType === 'linux' || osType === 'mac') && linPEASExists) {
        return true;
      }
      
      // Si nous ne pouvons pas vérifier les scripts, supposer qu'ils sont présents
      if (!window.electronAPI.checkFileExists) {
        return true;
      }
      
      // Si les scripts nécessaires ne sont pas présents, retourner false
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification des scripts PEAS:', error);
      showError(`Erreur lors de la vérification des scripts PEAS: ${error.message}`);
      return false;
    }
  };
  
  // Fonction pour télécharger le script WinPEAS
  const fetchWinPEASScript = async () => {
    try {
      const response = await fetch('https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/winPEAS/winPEASbat/winPEAS.bat');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Erreur lors du téléchargement du script WinPEAS:', error);
      throw error;
    }
  };
  
  // Fonction pour télécharger le script LinPEAS
  const fetchLinPEASScript = async () => {
    try {
      const response = await fetch('https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/linPEAS/linpeas.sh');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Erreur lors du téléchargement du script LinPEAS:', error);
      throw error;
    }
  };
  
  // Fonction pour arrêter l'analyse en cours
  const stopAnalysis = async () => {
    console.log('Arrêt de l\'analyse en cours...');
    
    try {
      // Supprimer les écouteurs d'événements
      if (window.electronAPI && window.electronAPI.removeListener) {
        window.electronAPI.removeListener('sh-output', () => {});
        window.electronAPI.removeListener('ps1-output', () => {});
        window.electronAPI.removeListener('script-download-complete', () => {});
      }
      
      // Arrêter le processus en cours si possible
      if (currentProcess && window.electronAPI && window.electronAPI.killProcess) {
        await window.electronAPI.killProcess(currentProcess);
      }
      
      // Ajouter un message indiquant que l'analyse a été arrêtée
      const stopMessage = '\n\n[!] Analyse arrêtée par l\'utilisateur';
      setOutput(prevOutput => prevOutput + stopMessage);
      setFilteredOutput(prevOutput => prevOutput + stopMessage);
      
      // Mettre à jour l'état
      setIsRunning(false);
      setCurrentProcess(null);
      
      showWarning('Analyse arrêtée par l\'utilisateur');
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'analyse:', error);
      showError(`Erreur lors de l'arrêt de l'analyse: ${error.message}`);
    }
  };
  
  // Fonction pour exécuter l'analyse de privilege escalation
  const runPrivEscCheck = async () => {
    console.log('Exécution de l\'analyse de privilege escalation');
    
    try {
      // Réinitialiser les états
      setIsRunning(true);
      setOutput('');
      setFilteredOutput('');
      setParsedResults({
        critical: [],
        warning: [],
        info: []
      });
      setCurrentProcess(null);
      
      // Afficher un message de progression
      setOutput('Analyse en cours...\n');
      setFilteredOutput('Analyse en cours...\n');
      
      // Démarrer l'animation de progression
      startProgressAnimation();
      
      // Vérifier si l'API Electron est disponible
      if (!window.electronAPI) {
        console.error('API Electron non disponible pour exécuter l\'analyse');
        showError('API Electron non disponible pour exécuter l\'analyse');
        
        // Afficher des informations de débogage
        const debugInfo = `
[DEBUG] Informations de débogage:
- window.electronAPI: ${window.electronAPI ? 'Disponible' : 'Non disponible'}
- Navigateur: ${navigator.userAgent}
- Plateforme: ${navigator.platform}

Pour que l'analyse fonctionne correctement, l'application doit être exécutée dans Electron avec les API natives activées.
`;
        
        setOutput(debugInfo);
        setFilteredOutput(debugInfo);
        setIsRunning(false);
        return;
      }
      
      // Détecter le système d'exploitation
      const detectedOS = await detectOS();
      console.log('Système d\'exploitation détecté:', detectedOS);
      
      // Mettre à jour l'état osType
      setOsType(detectedOS);
      
      // Afficher un message en fonction du système d'exploitation détecté
      if (detectedOS === 'windows') {
        showInfo('Système Windows détecté');
      } else if (detectedOS === 'linux') {
        showInfo('Système Linux détecté');
      } else if (detectedOS === 'mac') {
        showInfo('Système macOS détecté (traité comme Linux)');
      } else {
        showWarning('Système d\'exploitation non reconnu');
      }
      
      // Exécuter l'analyse en fonction du système d'exploitation
      if (detectedOS === 'windows') {
        console.log('Exécution de WinPEAS...');
        await runWinPEAS();
      } else if (detectedOS === 'linux' || detectedOS === 'mac') {
        console.log('Exécution de LinPEAS...');
        await runLinPEAS();
      } else {
        const errorMsg = `Système d'exploitation non pris en charge: ${detectedOS}`;
        console.error(errorMsg);
        showError(errorMsg);
        setOutput(errorMsg);
        setFilteredOutput(errorMsg);
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'analyse:', error);
      
      // Afficher des informations détaillées sur l'erreur
      const errorInfo = `
[ERREUR] Erreur lors de l'exécution de l'analyse:
- Message: ${error.message}
- Stack: ${error.stack}
`;
      
      showError(`Erreur lors de l'exécution de l'analyse: ${error.message}`);
      setOutput(errorInfo);
      setFilteredOutput(errorInfo);
      setIsRunning(false);
    }
  };
  
  // Fonction pour démarrer l'animation de progression
  const startProgressAnimation = () => {
    let dots = 0;
    const maxDots = 3;
    
    // Créer un intervalle pour mettre à jour les points de progression
    const progressInterval = setInterval(() => {
      if (!isRunning) {
        clearInterval(progressInterval);
        return;
      }
      
      dots = (dots + 1) % (maxDots + 1);
      const progressText = 'Analyse en cours' + '.'.repeat(dots) + ' '.repeat(maxDots - dots);
      
      // Mettre à jour uniquement la ligne de progression sans affecter le reste de la sortie
      const currentOutput = output.split('\n');
      if (currentOutput[0].startsWith('Analyse en cours')) {
        currentOutput[0] = progressText;
        setOutput(currentOutput.join('\n'));
      }
      
      const currentFilteredOutput = filteredOutput.split('\n');
      if (currentFilteredOutput[0].startsWith('Analyse en cours')) {
        currentFilteredOutput[0] = progressText;
        setFilteredOutput(currentFilteredOutput.join('\n'));
      }
    }, 500);
    
    // Retourner l'ID de l'intervalle pour pouvoir l'arrêter plus tard
    return progressInterval;
  };
  
  // Fonction pour exécuter WinPEAS
  const runWinPEAS = async () => {
    showInfo('Exécution de WinPEAS...');
    
    try {
      // Vérifier si l'API Electron est disponible
      if (!window.electronAPI) {
        console.error('API Electron non disponible pour exécuter WinPEAS');
        showError('API Electron non disponible pour exécuter WinPEAS');
        
        // Afficher des informations de débogage
        const debugInfo = `
[DEBUG] Informations de débogage:
- window.electronAPI: ${window.electronAPI ? 'Disponible' : 'Non disponible'}
- Navigateur: ${navigator.userAgent}
- Plateforme: ${navigator.platform}

Pour que WinPEAS fonctionne correctement, l'application doit être exécutée dans Electron avec les API natives activées.
`;
        
        setOutput(debugInfo);
        setFilteredOutput(debugInfo);
        setIsRunning(false);
        return;
      }
      
      // Afficher un message d'attente
      setOutput('Exécution de WinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      setFilteredOutput('Exécution de WinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      
      // Configurer l'écouteur pour les données en temps réel
      const setupOutputListeners = () => {
        // Supprimer tout écouteur existant pour éviter les doublons
        if (window.electronAPI.removeListener) {
          window.electronAPI.removeListener('ps1-output', () => {});
        }
        
        // Ajouter un nouvel écouteur pour les sorties PowerShell
        if (window.electronAPI.on) {
          window.electronAPI.on('ps1-output', (event, data) => {
            console.log('Données reçues du script PowerShell:', data.type);
            
            if (data.type === 'stdout') {
              // Convertir les codes ANSI en HTML
              const htmlOutput = processAnsiOutput(data.data);
              
              // Ajouter les nouvelles données à la sortie existante
              setOutput(prevOutput => {
                // Créer un conteneur temporaire pour analyser le HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = prevOutput;
                
                // Ajouter le nouveau HTML
                tempDiv.innerHTML += htmlOutput;
                
                return tempDiv.innerHTML;
              });
              
              // Pour la sortie filtrée, utiliser également le HTML converti
              setFilteredOutput(prevOutput => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = prevOutput;
                tempDiv.innerHTML += htmlOutput;
                return tempDiv.innerHTML;
              });
              
              // Faire défiler automatiquement vers le bas
              if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }
            } else if (data.type === 'stderr') {
              // Ajouter les erreurs à la sortie existante avec une couleur rouge
              const errorHtml = `<div style="color: red;">[ERREUR] ${data.data}</div>`;
              
              setOutput(prevOutput => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = prevOutput;
                tempDiv.innerHTML += errorHtml;
                return tempDiv.innerHTML;
              });
              
              setFilteredOutput(prevOutput => prevOutput + `\n[ERREUR] ${data.data}`);
              
              // Faire défiler automatiquement vers le bas
              if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }
            }
          });
        }
      };
      
      // Configurer les écouteurs de sortie
      setupOutputListeners();
      
      // Vérifier si la nouvelle méthode download-and-execute-script est disponible
      if (window.electronAPI.downloadAndExecuteScript) {
        try {
          console.log('Utilisation de la méthode downloadAndExecuteScript');
          
          // URL du script WinPEAS
          const winpeasUrl = 'https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/winPEAS/winPEASps1/winPEAS.ps1';
          
          // Écouter l'événement de téléchargement terminé
          const scriptDownloadHandler = async (event, data) => {
            console.log('Script téléchargé:', data);
            
            // Supprimer l'écouteur d'événement après utilisation
            window.electronAPI.removeListener('script-download-complete', scriptDownloadHandler);
            
            // Exécuter le script téléchargé
            if (data.platform === 'windows') {
              try {
                const result = await window.electronAPI.executePS1(data.path);
                
                // Stocker l'identifiant du processus si disponible
                if (result && result.pid) {
                  setCurrentProcess(result.pid);
                }
                
                console.log('Exécution de WinPEAS terminée');
                // Ne pas appeler processOutput ici car les données sont déjà traitées par l'écouteur
                showSuccess('Analyse WinPEAS terminée');
                setIsRunning(false);
                setCurrentProcess(null);
                
                // Supprimer l'écouteur une fois terminé
                if (window.electronAPI.removeListener) {
                  window.electronAPI.removeListener('ps1-output', () => {});
                }
              } catch (error) {
                console.error('Erreur lors de l\'exécution du script WinPEAS:', error);
                showError(`Erreur lors de l'exécution de WinPEAS: ${error.message || 'Erreur inconnue'}`);
                setIsRunning(false);
                setCurrentProcess(null);
                
                // Supprimer l'écouteur en cas d'erreur
                if (window.electronAPI.removeListener) {
                  window.electronAPI.removeListener('ps1-output', () => {});
                }
              }
            }
          };
          
          // Ajouter l'écouteur d'événement
          window.electronAPI.on('script-download-complete', scriptDownloadHandler);
          
          // Télécharger le script
          await window.electronAPI.downloadAndExecuteScript({
            url: winpeasUrl,
            isWindows: true
          });
          
          return; // Sortir de la fonction car le traitement se fera dans l'écouteur d'événement
        } catch (error) {
          console.error('Erreur avec downloadAndExecuteScript:', error);
          // Continuer avec les autres méthodes
        }
      }
      
      // Vérifier si la méthode executePS1 est disponible
      if (window.electronAPI.executePS1) {
        try {
          console.log('Utilisation de la méthode executePS1');
          
          // Créer un script PowerShell temporaire pour télécharger et exécuter WinPEAS
          const tempScript = `
# Script pour télécharger et exécuter WinPEAS
Write-Host "[*] Téléchargement de WinPEAS..."
$tempDir = [System.IO.Path]::GetTempPath()
$tempFile = Join-Path $tempDir "winpeas_$(Get-Random).ps1"

try {
    # Télécharger WinPEAS
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/winPEAS/winPEASps1/winPEAS.ps1" -OutFile $tempFile
    
    Write-Host "[+] WinPEAS téléchargé avec succès"
    Write-Host "[*] Exécution de WinPEAS..."
    Write-Host "==========================================="
    
    # Exécuter WinPEAS
    & $tempFile
    
    # Nettoyer
    Remove-Item $tempFile -Force
    
    Write-Host "==========================================="
    Write-Host "[+] Analyse WinPEAS terminée"
} catch {
    Write-Host "[!] Erreur: $_"
    exit 1
}
`;
          
          // Créer un fichier temporaire pour le script
          const tempDir = await window.electronAPI.executeCommand('echo %TEMP%');
          const tempDirPath = tempDir.stdout.trim();
          const tempScriptPath = `${tempDirPath}\\hakboard_winpeas_runner.ps1`;
          
          // Écrire le script dans un fichier temporaire
          await window.electronAPI.executeCommand(`powershell -Command "Set-Content -Path '${tempScriptPath}' -Value @'
${tempScript}
'@"`);
          
          // Exécuter le script PowerShell
          const result = await window.electronAPI.executePS1(tempScriptPath);
          
          // Stocker l'identifiant du processus si disponible
          if (result && result.pid) {
            setCurrentProcess(result.pid);
          }
          
          // Ne pas appeler processOutput ici car les données sont déjà traitées par l'écouteur
          console.log('Exécution de WinPEAS terminée');
          showSuccess('Analyse WinPEAS terminée');
          
          // Supprimer le script temporaire
          await window.electronAPI.executeCommand(`del "${tempScriptPath}"`);
          
          // Supprimer l'écouteur une fois terminé
          if (window.electronAPI.removeListener) {
            window.electronAPI.removeListener('ps1-output', () => {});
          }
          
          return;
        } catch (error) {
          console.error('Erreur avec executePS1:', error);
          // Continuer avec les autres méthodes
          
          // Supprimer l'écouteur en cas d'erreur
          if (window.electronAPI.removeListener) {
            window.electronAPI.removeListener('ps1-output', () => {});
          }
        }
      }
      
      // Si toutes les méthodes ont échoué
      const errorMsg = `
Toutes les méthodes d'exécution de WinPEAS ont échoué.

Pour exécuter WinPEAS manuellement:
1. Ouvrez PowerShell en tant qu'administrateur
2. Exécutez la commande suivante:
   IEX(New-Object Net.WebClient).DownloadString('https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/winPEAS/winPEASps1/winPEAS.ps1')
`;
      console.error(errorMsg);
      showError('Toutes les méthodes d\'exécution de WinPEAS ont échoué');
      setOutput(errorMsg);
      setFilteredOutput(errorMsg);
    } catch (error) {
      console.error('Erreur lors de l\'exécution de WinPEAS:', error);
      
      // Afficher des informations détaillées sur l'erreur
      const errorInfo = `
[ERREUR] Erreur lors de l'exécution de WinPEAS:
- Message: ${error.message}
- Stack: ${error.stack}
`;
      
      showError(`Erreur lors de l'exécution de WinPEAS: ${error.message}`);
      setOutput(errorInfo);
      setFilteredOutput(errorInfo);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Fonction pour exécuter LinPEAS
  const runLinPEAS = async () => {
    showInfo('Exécution de LinPEAS...');
    
    try {
      // Vérifier si l'API Electron est disponible
      if (!window.electronAPI) {
        console.error('API Electron non disponible pour exécuter LinPEAS');
        showError('API Electron non disponible pour exécuter LinPEAS');
        
        // Afficher des informations de débogage
        const debugInfo = `
[DEBUG] Informations de débogage:
- window.electronAPI: ${window.electronAPI ? 'Disponible' : 'Non disponible'}
- Navigateur: ${navigator.userAgent}
- Plateforme: ${navigator.platform}

Pour que LinPEAS fonctionne correctement, l'application doit être exécutée dans Electron avec les API natives activées.
`;
        
        setOutput(debugInfo);
        setFilteredOutput(debugInfo);
        setIsRunning(false);
        return;
      }
      
      // Afficher un message d'attente
      setOutput('Exécution de LinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      setFilteredOutput('Exécution de LinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      
      // Configurer l'écouteur pour les données en temps réel
      const setupOutputListeners = () => {
        // Supprimer tout écouteur existant pour éviter les doublons
        if (window.electronAPI.removeListener) {
          window.electronAPI.removeListener('sh-output', () => {});
        }
        
        // Ajouter un nouvel écouteur pour les sorties shell
        if (window.electronAPI.on) {
          window.electronAPI.on('sh-output', (event, data) => {
            console.log('Données reçues du script shell:', data.type);
            
            if (data.type === 'stdout') {
              // Convertir les codes ANSI en HTML
              const htmlOutput = processAnsiOutput(data.data);
              
              // Ajouter les nouvelles données à la sortie existante
              setOutput(prevOutput => {
                // Créer un conteneur temporaire pour analyser le HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = prevOutput;
                
                // Ajouter le nouveau HTML
                tempDiv.innerHTML += htmlOutput;
                
                return tempDiv.innerHTML;
              });
              
              // Pour la sortie filtrée, utiliser également le HTML converti
              setFilteredOutput(prevOutput => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = prevOutput;
                tempDiv.innerHTML += htmlOutput;
                return tempDiv.innerHTML;
              });
              
              // Faire défiler automatiquement vers le bas
              if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }
            } else if (data.type === 'stderr') {
              // Ajouter les erreurs à la sortie existante avec une couleur rouge
              const errorHtml = `<div style="color: red;">[ERREUR] ${data.data}</div>`;
              
              setOutput(prevOutput => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = prevOutput;
                tempDiv.innerHTML += errorHtml;
                return tempDiv.innerHTML;
              });
              
              setFilteredOutput(prevOutput => prevOutput + `\n[ERREUR] ${data.data}`);
              
              // Faire défiler automatiquement vers le bas
              if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }
            }
          });
        }
      };
      
      // Configurer les écouteurs de sortie
      setupOutputListeners();
      
      // Vérifier si la nouvelle méthode download-and-execute-script est disponible
      if (window.electronAPI.downloadAndExecuteScript) {
        try {
          console.log('Utilisation de la méthode downloadAndExecuteScript');
          
          // Télécharger et préparer le script LinPEAS
          const linpeasUrl = 'https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh';
          
          // Écouter l'événement de téléchargement terminé
          const scriptDownloadHandler = async (event, data) => {
            console.log('Script téléchargé:', data);
            
            // Supprimer l'écouteur d'événement après utilisation
            window.electronAPI.removeListener('script-download-complete', scriptDownloadHandler);
            
            // Exécuter le script téléchargé
            if (data.platform === 'linux') {
              try {
                const result = await window.electronAPI.executeSh(data.path);
                
                // Stocker l'identifiant du processus si disponible
                if (result && result.pid) {
                  setCurrentProcess(result.pid);
                }
                
                console.log('Exécution de LinPEAS terminée');
                // Ne pas appeler processOutput ici car les données sont déjà traitées par l'écouteur
                showSuccess('Analyse LinPEAS terminée');
                setIsRunning(false);
                setCurrentProcess(null);
                
                // Supprimer l'écouteur une fois terminé
                if (window.electronAPI.removeListener) {
                  window.electronAPI.removeListener('sh-output', () => {});
                }
              } catch (error) {
                console.error('Erreur lors de l\'exécution du script LinPEAS:', error);
                showError(`Erreur lors de l'exécution de LinPEAS: ${error.message || 'Erreur inconnue'}`);
                setIsRunning(false);
                setCurrentProcess(null);
                
                // Supprimer l'écouteur en cas d'erreur
                if (window.electronAPI.removeListener) {
                  window.electronAPI.removeListener('sh-output', () => {});
                }
              }
            }
          };
          
          // Ajouter l'écouteur d'événement
          window.electronAPI.on('script-download-complete', scriptDownloadHandler);
          
          // Télécharger le script
          await window.electronAPI.downloadAndExecuteScript({
            url: linpeasUrl,
            isWindows: false
          });
          
          return; // Sortir de la fonction car le traitement se fera dans l'écouteur d'événement
        } catch (error) {
          console.error('Erreur avec downloadAndExecuteScript:', error);
          // Continuer avec les autres méthodes
        }
      }
      
      // Vérifier si la nouvelle méthode execute-sh est disponible
      if (window.electronAPI.executeSh) {
        try {
          console.log('Utilisation de la méthode executeSh');
          
          // Vérifier si le script execLinpeas.sh existe
          const appPath = await window.electronAPI.getAppPath();
          const scriptPath = joinPaths(appPath, 'src', 'components', 'security', 'execLinpeas.sh');
          
          console.log('Chemin du script LinPEAS:', scriptPath);
          
          // Exécuter le script shell
          const result = await window.electronAPI.executeSh(scriptPath);
          
          // Stocker l'identifiant du processus si disponible
          if (result && result.pid) {
            setCurrentProcess(result.pid);
          }
          
          // Ne pas appeler processOutput ici car les données sont déjà traitées par l'écouteur
          console.log('Exécution de LinPEAS terminée');
          showSuccess('Analyse LinPEAS terminée');
          
          // Supprimer l'écouteur une fois terminé
          if (window.electronAPI.removeListener) {
            window.electronAPI.removeListener('sh-output', () => {});
          }
          
          return;
        } catch (error) {
          console.error('Erreur avec executeSh:', error);
          // Continuer avec les autres méthodes
          
          // Supprimer l'écouteur en cas d'erreur
          if (window.electronAPI.removeListener) {
            window.electronAPI.removeListener('sh-output', () => {});
          }
        }
      }
      
      // Méthode de secours: Utiliser executeCommand
      if (window.electronAPI.executeCommand) {
        try {
          console.log('Utilisation de la méthode executeCommand');
          
          // Méthode 1: Exécuter une commande bash simple pour tester
          console.log('Méthode 1: Exécution d\'une commande bash simple pour tester');
          
          // Commande bash simple pour tester
          const command = `bash -c "echo 'Test de Bash'; uname -a; lsb_release -a 2>/dev/null || cat /etc/*release 2>/dev/null || cat /etc/issue 2>/dev/null"`;
          
          console.log('Exécution de la commande de test:', command);
          const result = await window.electronAPI.executeCommand(command);
          
          // Extraire la sortie de la commande
          if (result && typeof result === 'object' && result.stdout) {
            const output = result.stdout;
            console.log('Méthode 1 réussie');
            
            // Afficher un message indiquant que le test a réussi mais que nous allons maintenant exécuter LinPEAS
            setOutput('Test Bash réussi. Téléchargement et exécution de LinPEAS en cours...\n');
            setFilteredOutput('Test Bash réussi. Téléchargement et exécution de LinPEAS en cours...\n');
            
            // Créer un script temporaire pour télécharger et exécuter LinPEAS
            const tempScript = `
#!/bin/bash
echo "[*] Téléchargement de LinPEAS..."
TEMP_DIR=$(mktemp -d)
TEMP_FILE="$TEMP_DIR/linpeas.sh"

if command -v curl > /dev/null 2>&1; then
    curl -L -s -o "$TEMP_FILE" "https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh"
    DOWNLOAD_STATUS=$?
elif command -v wget > /dev/null 2>&1; then
    wget -q -O "$TEMP_FILE" "https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh"
    DOWNLOAD_STATUS=$?
else
    echo "[!] Erreur: curl ou wget est requis pour télécharger LinPEAS"
    exit 1
fi

if [ $DOWNLOAD_STATUS -ne 0 ]; then
    echo "[!] Erreur lors du téléchargement de LinPEAS"
    exit 1
fi

echo "[+] LinPEAS téléchargé avec succès"
chmod +x "$TEMP_FILE"
echo "[*] Exécution de LinPEAS..."
echo "==========================================="
bash "$TEMP_FILE" -a 2>&1
rm -rf "$TEMP_DIR"
echo "==========================================="
echo "[+] Analyse LinPEAS terminée"
`;
            
            // Créer un fichier temporaire pour le script
            const tempScriptPath = '/tmp/hakboard_linpeas_runner.sh';
            const writeCommand = `bash -c "cat > ${tempScriptPath} << 'EOL'
${tempScript}
EOL
chmod +x ${tempScriptPath}"`;
            
            await window.electronAPI.executeCommand(writeCommand);
            
            // Exécuter le script temporaire
            // Utiliser une approche différente pour capturer la sortie en temps réel
            const execCommand = `bash -c "bash ${tempScriptPath} 2>&1 | tee /tmp/linpeas_output.log"`;
            
            // Démarrer un intervalle pour lire le fichier de log en temps réel
            let lastSize = 0;
            const logInterval = setInterval(async () => {
              try {
                const checkSizeCmd = `bash -c "if [ -f /tmp/linpeas_output.log ]; then wc -c < /tmp/linpeas_output.log; else echo 0; fi"`;
                const sizeResult = await window.electronAPI.executeCommand(checkSizeCmd);
                const currentSize = parseInt(sizeResult.stdout.trim(), 10);
                
                if (currentSize > lastSize) {
                  const readCmd = `bash -c "if [ -f /tmp/linpeas_output.log ]; then tail -c +${lastSize + 1} /tmp/linpeas_output.log; fi"`;
                  const readResult = await window.electronAPI.executeCommand(readCmd);
                  
                  if (readResult.stdout) {
                    setOutput(prevOutput => prevOutput + readResult.stdout);
                    setFilteredOutput(prevOutput => prevOutput + readResult.stdout);
                    
                    // Faire défiler automatiquement vers le bas
                    if (outputRef.current) {
                      outputRef.current.scrollTop = outputRef.current.scrollHeight;
                    }
                  }
                  
                  lastSize = currentSize;
                }
              } catch (error) {
                console.error('Erreur lors de la lecture du fichier de log:', error);
              }
            }, 500);
            
            // Exécuter la commande et attendre qu'elle se termine
            const linpeasResult = await window.electronAPI.executeCommand(execCommand);
            
            // Stocker l'identifiant du processus si disponible
            if (linpeasResult && linpeasResult.pid) {
              setCurrentProcess(linpeasResult.pid);
            }
            
            // Arrêter l'intervalle une fois la commande terminée
            clearInterval(logInterval);
            
            if (linpeasResult && typeof linpeasResult === 'object') {
              console.log('Exécution de LinPEAS terminée');
              
              // Lire le fichier de log complet
              const readFullLogCmd = `bash -c "if [ -f /tmp/linpeas_output.log ]; then cat /tmp/linpeas_output.log; fi"`;
              const fullLogResult = await window.electronAPI.executeCommand(readFullLogCmd);
              
              if (fullLogResult.stdout) {
                processOutput(fullLogResult.stdout);
              }
              
              showSuccess('Analyse LinPEAS terminée');
              
              // Supprimer les fichiers temporaires
              await window.electronAPI.executeCommand(`rm -f ${tempScriptPath} /tmp/linpeas_output.log`);
              return;
            }
          }
        } catch (error) {
          console.error('Erreur avec executeCommand:', error);
        }
      }
      
      // Si toutes les méthodes ont échoué
      const errorMsg = `
Toutes les méthodes d'exécution de LinPEAS ont échoué.

Pour exécuter LinPEAS manuellement:
1. Ouvrez un terminal
2. Exécutez la commande suivante:
   curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh | sh
`;
      console.error(errorMsg);
      showError('Toutes les méthodes d\'exécution de LinPEAS ont échoué');
      setOutput(errorMsg);
      setFilteredOutput(errorMsg);
    } catch (error) {
      console.error('Erreur lors de l\'exécution de LinPEAS:', error);
      
      // Afficher des informations détaillées sur l'erreur
      const errorInfo = `
[ERREUR] Erreur lors de l'exécution de LinPEAS:
- Message: ${error.message}
- Stack: ${error.stack}
`;
      
      showError(`Erreur lors de l'exécution de LinPEAS: ${error.message}`);
      setOutput(errorInfo);
      setFilteredOutput(errorInfo);
    }
    
    setIsRunning(false);
  };
  
  // Fonction pour traiter la sortie de l'analyse
  const processOutput = (rawOutput) => {
    console.log('Traitement de la sortie...');
    
    if (!rawOutput) {
      console.log('Aucune sortie à traiter');
      return;
    }
    
    // Stocker la sortie brute
    setOutput(rawOutput);
    
    // Convertir les codes ANSI en HTML
    const htmlOutput = ansiToHtml(rawOutput);
    
    // Mettre à jour la sortie filtrée avec le HTML
    setFilteredOutput(htmlOutput);
    
    // Extraire les informations importantes
    const criticalInfo = extractCriticalInfo(rawOutput);
    const warningInfo = extractWarningInfo(rawOutput);
    const infoInfo = extractInfoInfo(rawOutput);
    
    // Mettre à jour les résultats analysés
    setParsedResults({
      critical: criticalInfo,
      warning: warningInfo,
      info: infoInfo
    });
    
    console.log('Traitement terminé');
  };
  
  // Fonction pour extraire les informations critiques
  const extractCriticalInfo = (output) => {
    if (!output) return [];
    
    // Rechercher les lignes contenant des informations critiques
    // Ces lignes sont généralement en rouge dans LinPEAS
    const criticalPatterns = [
      /\[31m|\[91m/,  // Codes ANSI pour le rouge
      /\bvulnerabilit(y|ies)\b/i,
      /\bcritical\b/i,
      /\bhigh\b/i,
      /\brisk\b/i,
      /\bexploit\b/i,
      /\broot\b/i,
      /\bprivilege\b/i,
      /\bpermission\b/i,
      /\bsuid\b/i,
      /\bcapabilit(y|ies)\b/i
    ];
    
    return extractMatchingLines(output, criticalPatterns);
  };
  
  // Fonction pour extraire les avertissements
  const extractWarningInfo = (output) => {
    if (!output) return [];
    
    // Rechercher les lignes contenant des avertissements
    // Ces lignes sont généralement en jaune dans LinPEAS
    const warningPatterns = [
      /\[33m|\[93m/,  // Codes ANSI pour le jaune
      /\bwarning\b/i,
      /\bmedium\b/i,
      /\bsuspicious\b/i,
      /\binteresting\b/i,
      /\bcheck\b/i,
      /\bpotential\b/i
    ];
    
    return extractMatchingLines(output, warningPatterns);
  };
  
  // Fonction pour extraire les informations générales
  const extractInfoInfo = (output) => {
    if (!output) return [];
    
    // Rechercher les lignes contenant des informations générales
    // Ces lignes sont généralement en bleu ou vert dans LinPEAS
    const infoPatterns = [
      /\[32m|\[92m|\[34m|\[94m|\[36m|\[96m/,  // Codes ANSI pour le vert, bleu et cyan
      /\binfo\b/i,
      /\blow\b/i,
      /\bsystem\b/i,
      /\bversion\b/i,
      /\bkernel\b/i,
      /\buser\b/i,
      /\bgroup\b/i,
      /\bnetwork\b/i,
      /\bservice\b/i,
      /\bprocess\b/i
    ];
    
    return extractMatchingLines(output, infoPatterns);
  };
  
  // Fonction pour extraire les lignes correspondant à des motifs
  const extractMatchingLines = (output, patterns) => {
    if (!output) return [];
    
    // Diviser la sortie en lignes
    const lines = output.split('\n');
    
    // Filtrer les lignes qui correspondent à au moins un des motifs
    return lines.filter(line => {
      // Vérifier si la ligne correspond à au moins un des motifs
      return patterns.some(pattern => pattern.test(line));
    });
  };
  
  // Fonction pour appliquer un filtre à la sortie
  const applyFilter = (level) => {
    setActiveFilter(level);
    
    if (level === 'all') {
      // Convertir tout le texte brut en HTML avec les couleurs ANSI
      const htmlOutput = ansiToHtml(output);
      setFilteredOutput(htmlOutput);
      return;
    }
    
    // Filtrer les résultats en fonction du niveau
    let filteredResults = [];
    
    if (level === 'critical') {
      filteredResults = extractCriticalInfo(output);
    } else if (level === 'warning') {
      filteredResults = extractWarningInfo(output);
    } else if (level === 'info') {
      filteredResults = extractInfoInfo(output);
    }
    
    // Convertir les résultats filtrés en HTML avec les couleurs ANSI
    const htmlResults = filteredResults.map(line => ansiToHtml(line)).join('\n');
    setFilteredOutput(htmlResults);
  };
  
  // Fonction pour exporter les résultats en PDF
  const exportToPDF = () => {
    try {
      // Vérifier si l'API Electron est disponible
      if (window.electronAPI && window.electronAPI.exportToPDF) {
        // Préparer le contenu pour l'export PDF
        const content = prepareExportContent();
        
        console.log('Exportation en PDF via API Electron...');
        
        // Exporter en PDF
        window.electronAPI.exportToPDF({
          content,
          filename: `PrivEsc_Report_${new Date().toISOString().slice(0, 10)}.pdf`
        })
        .then((result) => {
          console.log('Résultat de l\'exportation PDF:', result);
          showSuccess('Rapport exporté en PDF avec succès');
        })
        .catch((error) => {
          console.error('Erreur lors de l\'export en PDF:', error);
          showError(`Erreur lors de l'export en PDF: ${error.message}`);
          
          // En cas d'erreur avec l'API Electron, utiliser le fallback
          fallbackExport();
        });
      } else {
        console.warn('API Electron exportToPDF non disponible, utilisation du fallback');
        fallbackExport();
      }
    } catch (error) {
      console.error('Erreur lors de l\'export en PDF:', error);
      showError(`Erreur: ${error.message}`);
      fallbackExport();
    }
  };
  
  // Fonction de secours pour l'exportation
  const fallbackExport = () => {
    showWarning('Export PDF non disponible: utilisation de l\'export texte');
    
    // Créer un élément temporaire pour le téléchargement
    const element = document.createElement('a');
    const file = new Blob([prepareExportContent().text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `PrivEsc_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Fonction pour exporter les résultats en HTML
  const exportToHTML = () => {
    try {
      // Préparer le contenu HTML
      const content = prepareExportContent();
      
      // Créer un blob avec le contenu HTML
      const blob = new Blob([content.html], { type: 'text/html' });
      
      // Créer une URL pour le blob
      const url = URL.createObjectURL(blob);
      
      // Créer un lien pour télécharger le fichier
      const a = document.createElement('a');
      a.href = url;
      a.download = `privesc_results_${new Date().toISOString().replace(/:/g, '-')}.html`;
      
      // Cliquer sur le lien pour télécharger le fichier
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccess('Résultats exportés en HTML avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'exportation en HTML:', error);
      showError(`Erreur lors de l'exportation en HTML: ${error.message}`);
    }
  };
  
  // Fonction pour préparer le contenu à exporter
  const prepareExportContent = () => {
    // Préparer le contenu HTML
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Résultats de l'analyse PrivEsc</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .section {
      margin-bottom: 30px;
      padding: 15px;
      border-radius: 5px;
    }
    .critical {
      background-color: #ffebee;
      border-left: 5px solid #f44336;
    }
    .warning {
      background-color: #fff8e1;
      border-left: 5px solid #ffc107;
    }
    .info {
      background-color: #e3f2fd;
      border-left: 5px solid #2196f3;
    }
    .output {
      background-color: #263238;
      color: #eeffff;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-family: monospace;
      white-space: pre-wrap;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 5px;
    }
    .timestamp {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-bottom: 20px;
    }
    .color-red { color: red; }
    .color-green { color: green; }
    .color-yellow { color: #ffc107; }
    .color-blue { color: blue; }
    .color-magenta { color: magenta; }
    .color-cyan { color: cyan; }
    .color-white { color: white; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Résultats de l'analyse PrivEsc</h1>
    <div class="timestamp">Généré le ${new Date().toLocaleString()}</div>
    
    <div class="section critical">
      <h2>Vulnérabilités critiques</h2>
      <ul>
        ${parsedResults.critical.map(item => `<li>${ansiToHtml(item)}</li>`).join('\n        ')}
      </ul>
    </div>
    
    <div class="section warning">
      <h2>Avertissements</h2>
      <ul>
        ${parsedResults.warning.map(item => `<li>${ansiToHtml(item)}</li>`).join('\n        ')}
      </ul>
    </div>
    
    <div class="section info">
      <h2>Informations</h2>
      <ul>
        ${parsedResults.info.map(item => `<li>${ansiToHtml(item)}</li>`).join('\n        ')}
      </ul>
    </div>
    
    <h2>Sortie complète</h2>
    <div class="output">
      ${ansiToHtml(output)}
    </div>
  </div>
</body>
</html>
`;
    
    // Préparer le contenu texte pour le PDF
    const textContent = `
Résultats de l'analyse PrivEsc
Généré le ${new Date().toLocaleString()}

=== VULNÉRABILITÉS CRITIQUES ===
${parsedResults.critical.join('\n')}

=== AVERTISSEMENTS ===
${parsedResults.warning.join('\n')}

=== INFORMATIONS ===
${parsedResults.info.join('\n')}

=== SORTIE COMPLÈTE ===
${output}`;
    
    return {
      html: htmlContent,
      text: textContent
    };
  };
  
  // Fonction pour convertir les codes ANSI en HTML avec les couleurs correspondantes
  const ansiToHtml = (text) => {
    if (!text) return '';
    
    // Créer une carte de couleurs ANSI vers CSS
    const colorMap = {
      '30': 'black',
      '31': 'red',
      '32': 'green',
      '33': 'yellow',
      '34': 'blue',
      '35': 'magenta',
      '36': 'cyan',
      '37': 'white',
      '90': 'gray',
      '91': 'crimson',
      '92': 'limegreen',
      '93': 'gold',
      '94': 'dodgerblue',
      '95': 'violet',
      '96': 'aqua',
      '97': 'white'
    };
    
    const bgColorMap = {
      '40': 'black',
      '41': 'red',
      '42': 'green',
      '43': 'yellow',
      '44': 'blue',
      '45': 'magenta',
      '46': 'cyan',
      '47': 'white',
      '100': 'gray',
      '101': 'crimson',
      '102': 'limegreen',
      '103': 'gold',
      '104': 'dodgerblue',
      '105': 'violet',
      '106': 'aqua',
      '107': 'white'
    };
    
    // Préserver les sauts de ligne avant de traiter les codes ANSI
    // Remplacer les retours à la ligne par des balises <br>
    let html = text.replace(/\r\n|\n|\r/g, '<br>');
    
    // Nettoyer les caractères de contrôle non traités
    html = html.replace(/\x1B\[K/g, '');
    
    // Remplacer les séquences d'échappement ANSI par des balises HTML
    html = html.replace(/\x1B\[([0-9;]*)m/g, (match, params) => {
      // Si c'est un reset (0 ou rien)
      if (params === '0' || params === '') {
        return '</span>';
      }
      
      // Diviser les paramètres s'il y en a plusieurs
      const paramList = params.split(';');
      let styles = [];
      
      for (const param of paramList) {
        // Gestion des styles de texte
        if (param === '1') {
          styles.push('font-weight: bold');
        } else if (param === '4') {
          styles.push('text-decoration: underline');
        } else if (colorMap[param]) {
          styles.push(`color: ${colorMap[param]}`);
        } else if (bgColorMap[param]) {
          styles.push(`background-color: ${bgColorMap[param]}`);
        }
      }
      
      if (styles.length === 0) {
        return '';
      }
      
      return `</span><span style="${styles.join('; ')}">`;
    });
    
    // S'assurer que tous les spans sont fermés
    html = html.replace(/(<span[^>]*>)(?![\s\S]*?<\/span>)/g, '$1</span>');
    
    // Envelopper dans un span pour s'assurer que le premier style est appliqué
    html = `<span>${html}</span>`;
    
    // Nettoyer les spans vides
    html = html.replace(/<span style=""><\/span>/g, '');
    html = html.replace(/<span><\/span>/g, '');
    
    // Nettoyer les caractères de contrôle restants
    html = html.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
    
    // Préserver les espaces multiples
    html = html.replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length));
    
    return html;
  };
  
  // Fonction pour appliquer la conversion ANSI vers HTML à la sortie
  const processAnsiOutput = (data) => {
    return ansiToHtml(data);
  };
  
  return (
    <div className="privesc-container bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Vérification des Privilèges d'Escalation</h1>
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className="mr-4">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Système détecté:</span>
            <span className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center">
              {osType === 'windows' && <><FiServer className="mr-1" /> Windows</>}
              {osType === 'linux' && <><FiCpu className="mr-1" /> Linux</>}
              {osType === 'unknown' && <><FiAlertTriangle className="mr-1" /> Inconnu</>}
            </span>
          </div>
          
          <button
            onClick={runPrivEscCheck}
            disabled={isRunning || osType === 'unknown'}
            className={`px-4 py-2 rounded-md flex items-center ${
              isRunning || osType === 'unknown'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            <FiPlay className="mr-2" />
            {isRunning ? 'Analyse en cours...' : 'Lancer l\'analyse'}
          </button>
          
          {isRunning && (
            <button
              onClick={stopAnalysis}
              className="px-4 py-2 ml-2 rounded-md flex items-center bg-red-600 hover:bg-red-700 text-white"
            >
              <FiAlertTriangle className="mr-2" />
              Arrêter l'analyse
            </button>
          )}
          
          {output && (
            <div className="ml-4">
              <button
                onClick={exportToPDF}
                disabled={isRunning}
                className={`px-4 py-2 rounded-md flex items-center ${
                  isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } text-white mr-2`}
              >
                <FiDownload className="mr-2" />
                Exporter en PDF
              </button>
            </div>
          )}
          
          {output && (
            <div className="ml-2">
              <button
                onClick={exportToHTML}
                disabled={isRunning}
                className={`px-4 py-2 rounded-md flex items-center ${
                  isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                } text-white`}
              >
                <FiCode className="mr-2" />
                Exporter en HTML
              </button>
            </div>
          )}
        </div>
        
        {output && (
          <div className="mb-4">
            <div className="flex mb-2">
              <button
                onClick={() => applyFilter('all')}
                className={`px-3 py-1 rounded-md mr-2 ${
                  activeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => applyFilter('critical')}
                className={`px-3 py-1 rounded-md mr-2 ${
                  activeFilter === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Critiques
              </button>
              <button
                onClick={() => applyFilter('warning')}
                className={`px-3 py-1 rounded-md mr-2 ${
                  activeFilter === 'warning'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Avertissements
              </button>
              <button
                onClick={() => applyFilter('info')}
                className={`px-3 py-1 rounded-md mr-2 ${
                  activeFilter === 'info'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Informations
              </button>
            </div>
            
            <div 
              className="output bg-black text-white p-4 rounded-md font-mono text-sm overflow-auto h-96"
              ref={outputRef}
              dangerouslySetInnerHTML={{ __html: filteredOutput }}
              style={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivEsc;