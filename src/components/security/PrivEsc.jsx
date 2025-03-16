import React, { useState, useEffect, useRef } from 'react';
import { FiPlay, FiDownload, FiCpu, FiServer, FiAlertTriangle, FiCheckCircle, FiInfo, FiFilter } from 'react-icons/fi';
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
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [filteredOutput, setFilteredOutput] = useState('');
  const [osType, setOsType] = useState('');
  const [filterLevel, setFilterLevel] = useState('all'); // 'all', 'critical', 'warning', 'info'
  const [parsedResults, setParsedResults] = useState({
    critical: [],
    warning: [],
    info: []
  });
  
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
      
      if (!window.electronAPI.executePS1) {
        console.error('Méthode executePS1 non disponible dans l\'API Electron');
        showError('Méthode executePS1 non disponible dans l\'API Electron');
        
        // Afficher les méthodes disponibles
        const methods = [];
        for (const key in window.electronAPI) {
          methods.push(key);
        }
        
        const debugInfo = `
[DEBUG] Méthodes disponibles dans l'API Electron:
${methods.join(', ')}

La méthode 'executePS1' est requise pour exécuter WinPEAS.
`;
        
        setOutput(debugInfo);
        setFilteredOutput(debugInfo);
        setIsRunning(false);
        return;
      }
      
      // Afficher un message d'attente
      setOutput('Exécution de WinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      setFilteredOutput('Exécution de WinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      
      // Obtenir le chemin de l'application
      const appPath = await window.electronAPI.getAppPath();
      console.log('Chemin de l\'application:', appPath);
      
      // Chemin vers le script WinPEAS
      const winPEASPath = joinPaths(appPath, 'src', 'programs', 'PEASS-ng', 'winPEAS', 'winPEASps1', 'winPEAS.ps1');
      console.log('Chemin vers WinPEAS:', winPEASPath);
      
      // Configurer l'écouteur pour les données en temps réel
      if (window.electronAPI.onPS1Output) {
        // Supprimer tout écouteur existant pour éviter les doublons
        window.electronAPI.removePS1OutputListener();
        
        // Ajouter un nouvel écouteur
        window.electronAPI.onPS1Output((event, data) => {
          if (data.type === 'stdout') {
            // Ajouter les nouvelles données à la sortie existante
            setOutput(prevOutput => prevOutput + data.data);
            setFilteredOutput(prevOutput => prevOutput + data.data);
            
            // Faire défiler automatiquement vers le bas
            if (outputRef.current) {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
          } else if (data.type === 'stderr') {
            // Ajouter les erreurs à la sortie existante
            setOutput(prevOutput => prevOutput + `\n[ERREUR] ${data.data}`);
            setFilteredOutput(prevOutput => prevOutput + `\n[ERREUR] ${data.data}`);
            
            // Faire défiler automatiquement vers le bas
            if (outputRef.current) {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
          }
        });
      }
      
      // Exécuter la commande
      try {
        console.log('Exécution de WinPEAS via executePS1');
        const result = await window.electronAPI.executePS1(winPEASPath);
        
        // Si nous arrivons ici, le script s'est terminé avec succès
        console.log('WinPEAS exécuté avec succès');
        showSuccess('WinPEAS exécuté avec succès');
        
        // Traiter la sortie pour extraire les informations importantes
        processOutput(result.stdout);
        
        // Supprimer l'écouteur une fois terminé
        if (window.electronAPI.removePS1OutputListener) {
          window.electronAPI.removePS1OutputListener();
        }
      } catch (error) {
        console.error('Erreur lors de l\'exécution de WinPEAS:', error);
        
        // Supprimer l'écouteur en cas d'erreur
        if (window.electronAPI.removePS1OutputListener) {
          window.electronAPI.removePS1OutputListener();
        }
        
        // Afficher des informations détaillées sur l'erreur
        const errorDetails = `
[ERREUR] Erreur lors de l'exécution de WinPEAS:
- Message: ${error.message || 'Aucun message d\'erreur'}
- Stack: ${error.stack || 'Aucune stack trace'}
- Objet d'erreur complet: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2) || 'Impossible de sérialiser l\'erreur'}

Pour exécuter WinPEAS manuellement:
1. Ouvrez PowerShell en tant qu'administrateur
2. Exécutez le script WinPEAS avec la commande:
   powershell -ExecutionPolicy Bypass -NoProfile -File "${winPEASPath}"
`;
        
        showError('Erreur lors de l\'exécution de WinPEAS');
        setOutput(prevOutput => prevOutput + errorDetails);
        setFilteredOutput(prevOutput => prevOutput + errorDetails);
      }
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
      setIsRunning(false);
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
      
      if (!window.electronAPI.executePS1) {
        console.error('Méthode executePS1 non disponible dans l\'API Electron');
        showError('Méthode executePS1 non disponible dans l\'API Electron');
        
        // Afficher les méthodes disponibles
        const methods = [];
        for (const key in window.electronAPI) {
          methods.push(key);
        }
        
        const debugInfo = `
[DEBUG] Méthodes disponibles dans l'API Electron:
${methods.join(', ')}

La méthode 'executePS1' est requise pour exécuter LinPEAS.
`;
        
        setOutput(debugInfo);
        setFilteredOutput(debugInfo);
        setIsRunning(false);
        return;
      }
      
      // Afficher un message d'attente
      setOutput('Exécution de LinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      setFilteredOutput('Exécution de LinPEAS en cours... Cela peut prendre plusieurs minutes...\n');
      
      // Essayer d'exécuter LinPEAS avec différentes méthodes
      let output = '';
      let success = false;
      
      // Méthode 1: Exécuter une commande bash simple pour tester
      try {
        console.log('Méthode 1: Exécution d\'une commande bash simple pour tester');
        
        // Commande bash simple pour tester
        const command = `bash -c "echo 'Test de Bash'; uname -a; lsb_release -a 2>/dev/null || cat /etc/*release 2>/dev/null || cat /etc/issue 2>/dev/null"`;
        
        console.log('Exécution de la commande de test:', command);
        const result = await window.electronAPI.executePS1(command);
        
        // Extraire la sortie de la commande
        if (result && typeof result === 'object') {
          console.log('Résultat de la commande:', result);
          
          // Vérifier si stdout existe
          if (result.stdout) {
            output = result.stdout;
            success = true;
            console.log('Méthode 1 réussie');
            
            // Afficher un message indiquant que le test a réussi mais que nous allons maintenant exécuter LinPEAS
            setOutput('Test Bash réussi. Exécution de LinPEAS en cours...\n');
            setFilteredOutput('Test Bash réussi. Exécution de LinPEAS en cours...\n');
            
            // Maintenant, exécuter LinPEAS
            try {
              const linpeasCommand = `bash -c "curl -s https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/linPEAS/linpeas.sh | bash"`;
              
              console.log('Exécution de LinPEAS:', linpeasCommand);
              const linpeasResult = await window.electronAPI.executePS1(linpeasCommand);
              
              if (linpeasResult && typeof linpeasResult === 'object' && linpeasResult.stdout) {
                output = linpeasResult.stdout;
                success = true;
                console.log('Exécution de LinPEAS réussie');
              } else {
                console.log('Exécution de LinPEAS a échoué, utilisation de la sortie du test Bash');
                output = `
[!] LinPEAS n'a pas pu être exécuté, mais Bash fonctionne.
[!] Sortie du test Bash:
${output}

[!] Veuillez exécuter LinPEAS manuellement en utilisant Bash:
1. Ouvrez un terminal
2. Exécutez la commande suivante:
   curl -s https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/linPEAS/linpeas.sh | bash
`;
              }
            } catch (linpeasError) {
              console.error('Erreur lors de l\'exécution de LinPEAS:', linpeasError);
              output = `
[!] Erreur lors de l'exécution de LinPEAS:
${linpeasError.message}

[!] Sortie du test Bash:
${output}

[!] Veuillez exécuter LinPEAS manuellement en utilisant Bash:
1. Ouvrez un terminal
2. Exécutez la commande suivante:
   curl -s https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/linPEAS/linpeas.sh | bash
`;
            }
          } else if (result.error) {
            console.error('Erreur dans la sortie de la commande:', result.error);
          }
        } else {
          console.log('Résultat de la commande non valide:', result);
        }
      } catch (error) {
        console.error('Méthode 1 a échoué:', error);
      }
      
      // Méthode 2: Utiliser wget si la méthode 1 a échoué
      if (!success) {
        try {
          console.log('Méthode 2: Utilisation de wget pour télécharger et exécuter LinPEAS');
          
          // Commande pour télécharger et exécuter LinPEAS
          const command = `bash -c "wget -q -O /tmp/linpeas.sh https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/linPEAS/linpeas.sh && chmod +x /tmp/linpeas.sh && /tmp/linpeas.sh && rm /tmp/linpeas.sh"`;
          
          console.log('Exécution de la commande:', command);
          const result = await window.electronAPI.executePS1(command);
          
          // Extraire la sortie de la commande
          if (result && typeof result === 'object' && result.stdout) {
            output = result.stdout;
            success = true;
            console.log('Méthode 2 réussie');
          } else if (result && typeof result === 'object' && result.error) {
            console.error('Erreur dans la sortie de la commande:', result.error);
          } else {
            console.log('Résultat de la commande non valide:', result);
          }
        } catch (error) {
          console.error('Méthode 2 a échoué:', error);
        }
      }
      
      if (success) {
        console.log('Exécution de LinPEAS terminée, traitement de la sortie...');
        processOutput(output);
        showSuccess('Analyse LinPEAS terminée');
      } else {
        const errorMsg = `
Toutes les méthodes d'exécution de LinPEAS ont échoué.

Pour exécuter LinPEAS manuellement:
1. Ouvrez un terminal
2. Exécutez la commande suivante:
   curl -s https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/linPEAS/linpeas.sh | bash
`;
        console.error(errorMsg);
        showError('Toutes les méthodes d\'exécution de LinPEAS ont échoué');
        setOutput(errorMsg);
        setFilteredOutput(errorMsg);
      }
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
    console.log('Traitement de la sortie de l\'analyse...');
    
    // Vérifier si la sortie est valide
    if (!rawOutput || typeof rawOutput !== 'string') {
      console.error('Sortie invalide:', rawOutput);
      setOutput('Erreur: Sortie invalide');
      setFilteredOutput('Erreur: Sortie invalide');
      return;
    }
    
    // Définir la sortie brute
    setOutput(rawOutput);
    
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
    
    // Appliquer le filtre actuel
    applyFilter(filterLevel, { critical: criticalInfo, warning: warningInfo, info: infoInfo }, rawOutput);
    
    console.log('Traitement terminé');
  };
  
  // Fonction pour extraire les informations critiques
  const extractCriticalInfo = (output) => {
    const criticalPatterns = [
      /\[31m|\[00;31m|\[1;31m/g,                                // Codes couleur rouge
      /\[CRITICAL\]|\[HIGH\]|\[VULNERABILITY\]/i,                // Mots-clés de criticité
      /CVE-\d+-\d+/g,                                           // Références CVE
      /EXPLOITABLE|HIGH RISK|VULNERABLE|PRIVILEGE ESCALATION/i,  // Termes liés aux vulnérabilités
      /CREDENTIALS FOUND|PASSWORD FOUND|CLEARTEXT PASSWORD/i     // Informations sensibles
    ];
    
    return extractMatchingLines(output, criticalPatterns);
  };
  
  // Fonction pour extraire les avertissements
  const extractWarningInfo = (output) => {
    const warningPatterns = [
      /\[33m|\[00;33m|\[1;33m/g,                                // Codes couleur jaune
      /\[WARNING\]|\[MEDIUM\]/i,                                 // Mots-clés d'avertissement
      /POTENTIAL|MEDIUM RISK|MISCONFIGURATION/i,                 // Termes liés aux risques moyens
      /WEAK PERMISSIONS|OUTDATED VERSION/i                       // Problèmes de configuration
    ];
    
    return extractMatchingLines(output, warningPatterns);
  };
  
  // Fonction pour extraire les informations
  const extractInfoInfo = (output) => {
    const infoPatterns = [
      /\[32m|\[00;32m|\[1;32m/g,                                // Codes couleur vert
      /\[INFO\]|\[LOW\]|\[SUGGESTION\]/i,                        // Mots-clés d'information
      /LOW RISK|INFORMATION|SUGGESTION/i,                        // Termes liés aux informations
      /SYSTEM INFO|VERSION|CONFIGURATION/i                       // Informations système
    ];
    
    return extractMatchingLines(output, infoPatterns);
  };
  
  // Fonction pour extraire les lignes correspondant aux motifs
  const extractMatchingLines = (output, patterns) => {
    const lines = output.split('\n');
    const matchingLines = [];
    const processedLines = new Set(); // Pour éviter les doublons
    
    for (const line of lines) {
      const cleanLine = line.replace(/\x1B\[[0-9;]*[mGK]/g, '').trim();
      
      if (cleanLine === '' || processedLines.has(cleanLine)) {
        continue;
      }
      
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          if (cleanLine !== '') {
            matchingLines.push(cleanLine);
            processedLines.add(cleanLine);
          }
          break;
        }
      }
    }
    
    return matchingLines;
  };
  
  // Fonction pour appliquer un filtre
  const applyFilter = (level, results = parsedResults, fullOutput = output) => {
    setFilterLevel(level);
    
    if (level === 'all') {
      setFilteredOutput(fullOutput);
      return;
    }
    
    let filtered = [];
    
    if (level === 'critical' || level === 'warning' || level === 'info') {
      filtered = results[level];
    }
    
    setFilteredOutput(filtered.join('\n'));
  };
  
  // Fonction pour exporter les résultats en PDF
  const exportToPDF = () => {
    try {
      // Vérifier si l'API Electron est disponible
      if (window.electronAPI && window.electronAPI.exportToPDF) {
        // Préparer le contenu pour l'export PDF
        const content = prepareExportContent();
        
        // Exporter en PDF
        window.electronAPI.exportToPDF({
          content,
          filename: `PrivEsc_Report_${new Date().toISOString().slice(0, 10)}.pdf`
        })
        .then(() => {
          showSuccess('Rapport exporté en PDF avec succès');
        })
        .catch((error) => {
          console.error('Erreur lors de l\'export en PDF:', error);
          showError(`Erreur lors de l'export en PDF: ${error.message}`);
        });
      } else {
        // Fallback si l'API Electron n'est pas disponible
        showWarning('Export PDF non disponible: API Electron non disponible');
        
        // Créer un élément temporaire pour le téléchargement
        const element = document.createElement('a');
        const file = new Blob([prepareExportContent()], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `PrivEsc_Report_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export en PDF:', error);
      showError(`Erreur: ${error.message}`);
    }
  };
  
  // Fonction pour exporter les résultats en HTML
  const exportToHTML = () => {
    try {
      // Préparer le contenu HTML
      const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport PrivEsc - ${new Date().toLocaleDateString()}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #2c5282;
      border-bottom: 2px solid #2c5282;
      padding-bottom: 10px;
    }
    h2 {
      color: #2d3748;
      margin-top: 20px;
    }
    h3 {
      margin-top: 15px;
    }
    .critical {
      background-color: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 10px;
      margin-bottom: 15px;
    }
    .critical h3 {
      color: #c53030;
    }
    .warning {
      background-color: #fffaf0;
      border-left: 4px solid #ed8936;
      padding: 10px;
      margin-bottom: 15px;
    }
    .warning h3 {
      color: #c05621;
    }
    .info {
      background-color: #ebf8ff;
      border-left: 4px solid #4299e1;
      padding: 10px;
      margin-bottom: 15px;
    }
    .info h3 {
      color: #2b6cb0;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 5px;
    }
    .output {
      background-color: #2d3748;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-family: monospace;
      white-space: pre-wrap;
    }
    .system-info {
      background-color: #f7fafc;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>Rapport d'Analyse de Privilèges d'Escalation</h1>
  
  <div class="system-info">
    <p><strong>Système détecté:</strong> ${osType.toUpperCase()}</p>
    <p><strong>Date d'analyse:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  ${parsedResults.critical.length > 0 ? `
  <div class="critical">
    <h3>⚠️ Vulnérabilités critiques (${parsedResults.critical.length})</h3>
    <ul>
      ${parsedResults.critical.map(item => `<li>${item}</li>`).join('\n      ')}
    </ul>
  </div>
  ` : ''}
  
  ${parsedResults.warning.length > 0 ? `
  <div class="warning">
    <h3>⚠️ Avertissements (${parsedResults.warning.length})</h3>
    <ul>
      ${parsedResults.warning.map(item => `<li>${item}</li>`).join('\n      ')}
    </ul>
  </div>
  ` : ''}
  
  ${parsedResults.info.length > 0 ? `
  <div class="info">
    <h3>ℹ️ Informations (${parsedResults.info.length})</h3>
    <ul>
      ${parsedResults.info.map(item => `<li>${item}</li>`).join('\n      ')}
    </ul>
  </div>
  ` : ''}
  
  <h2>Sortie complète</h2>
  <div class="output">${output.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  
  <footer>
    <p>Rapport généré le ${new Date().toLocaleString()}</p>
  </footer>
</body>
</html>
      `;
      
      // Créer un élément temporaire pour le téléchargement
      const element = document.createElement('a');
      const file = new Blob([htmlContent], {type: 'text/html'});
      element.href = URL.createObjectURL(file);
      element.download = `PrivEsc_Report_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      showSuccess('Rapport exporté en HTML avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export en HTML:', error);
      showError(`Erreur: ${error.message}`);
    }
  };
  
  // Fonction pour préparer le contenu pour l'export
  const prepareExportContent = () => {
    const criticalSection = parsedResults.critical.length > 0 
      ? `\n\n=== VULNÉRABILITÉS CRITIQUES (${parsedResults.critical.length}) ===\n${parsedResults.critical.join('\n')}`
      : '';
      
    const warningSection = parsedResults.warning.length > 0 
      ? `\n\n=== AVERTISSEMENTS (${parsedResults.warning.length}) ===\n${parsedResults.warning.join('\n')}`
      : '';
      
    const infoSection = parsedResults.info.length > 0 
      ? `\n\n=== INFORMATIONS (${parsedResults.info.length}) ===\n${parsedResults.info.join('\n')}`
      : '';
      
    return `RAPPORT D'ANALYSE DE PRIVILÈGES D'ESCALATION
Date: ${new Date().toLocaleString()}
Système: ${osType.toUpperCase()}
${criticalSection}${warningSection}${infoSection}

=== SORTIE COMPLÈTE ===
${output}`;
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
          
          <div className="ml-auto flex space-x-2">
            <button
              onClick={exportToPDF}
              disabled={!output || isRunning}
              className={`px-4 py-2 rounded-md flex items-center ${
                !output || isRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <FiDownload className="mr-2" />
              Exporter en PDF
            </button>
            
            <button
              onClick={exportToHTML}
              disabled={!output || isRunning}
              className={`px-4 py-2 rounded-md flex items-center ${
                !output || isRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white`}
            >
              <FiDownload className="mr-2" />
              Exporter en HTML
            </button>
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <span className="text-gray-700 dark:text-gray-300 font-medium mr-4">Filtrer par:</span>
          
          <div className="flex space-x-2">
            <button
              onClick={() => applyFilter('all')}
              className={`px-3 py-1 rounded-md flex items-center ${
                filterLevel === 'all'
                  ? 'bg-gray-200 dark:bg-gray-700'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              } text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600`}
            >
              <FiFilter className="mr-1" />
              Tout
            </button>
            
            <button
              onClick={() => applyFilter('critical')}
              className={`px-3 py-1 rounded-md flex items-center ${
                filterLevel === 'critical'
                  ? 'bg-red-200 dark:bg-red-900'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              } text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600`}
            >
              <FiAlertTriangle className="mr-1 text-red-600 dark:text-red-400" />
              Critique ({parsedResults.critical.length})
            </button>
            
            <button
              onClick={() => applyFilter('warning')}
              className={`px-3 py-1 rounded-md flex items-center ${
                filterLevel === 'warning'
                  ? 'bg-yellow-200 dark:bg-yellow-900'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              } text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600`}
            >
              <FiAlertTriangle className="mr-1 text-yellow-600 dark:text-yellow-400" />
              Avertissement ({parsedResults.warning.length})
            </button>
            
            <button
              onClick={() => applyFilter('info')}
              className={`px-3 py-1 rounded-md flex items-center ${
                filterLevel === 'info'
                  ? 'bg-blue-200 dark:bg-blue-900'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              } text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600`}
            >
              <FiInfo className="mr-1 text-blue-600 dark:text-blue-400" />
              Info ({parsedResults.info.length})
            </button>
          </div>
        </div>
        
        <div className="output-container">
          <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Résultats de l'analyse
          </h2>
          
          {parsedResults.critical.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
              <h3 className="text-md font-semibold mb-2 text-red-800 dark:text-red-300 flex items-center">
                <FiAlertTriangle className="mr-2" /> Vulnérabilités critiques
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                {parsedResults.critical.map((item, index) => (
                  <li key={index} className="text-red-700 dark:text-red-400">{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {parsedResults.warning.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
              <h3 className="text-md font-semibold mb-2 text-yellow-800 dark:text-yellow-300 flex items-center">
                <FiAlertTriangle className="mr-2" /> Avertissements
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                {parsedResults.warning.map((item, index) => (
                  <li key={index} className="text-yellow-700 dark:text-yellow-400">{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {parsedResults.info.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
              <h3 className="text-md font-semibold mb-2 text-blue-800 dark:text-blue-300 flex items-center">
                <FiInfo className="mr-2" /> Informations
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                {parsedResults.info.map((item, index) => (
                  <li key={index} className="text-blue-700 dark:text-blue-400">{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Sortie complète
            </h3>
            <div 
              ref={outputRef}
              className="bg-gray-900 text-gray-200 p-4 rounded-md font-mono text-sm overflow-auto max-h-[500px] whitespace-pre-wrap"
            >
              {filteredOutput || (
                <span className="text-gray-500">
                  {isRunning 
                    ? 'Analyse en cours...' 
                    : 'Lancez l\'analyse pour voir les résultats'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivEsc;