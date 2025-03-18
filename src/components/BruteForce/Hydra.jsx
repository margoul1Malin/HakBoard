import React, { useState, useEffect } from 'react';
import { FiPlay, FiX, FiDownload, FiUpload, FiInfo, FiAlertTriangle, FiCheck, FiSettings } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Hydra = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États pour stocker les informations
  const [platform, setPlatform] = useState('');
  const [isHydraInstalled, setIsHydraInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [target, setTarget] = useState('');
  const [port, setPort] = useState('');
  const [service, setService] = useState('http-post-form');
  const [username, setUsername] = useState('');
  const [usernameFile, setUsernameFile] = useState('');
  const [passwordFile, setPasswordFile] = useState('');
  const [customParameters, setCustomParameters] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [threadCount, setThreadCount] = useState('16');
  const [availableServices, setAvailableServices] = useState([]);
  
  // États pour le générateur de mots de passe
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [minLength, setMinLength] = useState('8');
  const [maxLength, setMaxLength] = useState('10');
  const [charset, setCharset] = useState('');
  const [pattern, setPattern] = useState('');
  const [usePattern, setUsePattern] = useState(false);
  const [outputFilename, setOutputFilename] = useState('passwords.txt');
  const [generatorMode, setGeneratorMode] = useState('basic');
  
  // États pour les générateurs
  const [showUsernameGenerator, setShowUsernameGenerator] = useState(false);
  
  // Générateur de mots de passe
  const [minLengthPwd, setMinLengthPwd] = useState('8');
  const [maxLengthPwd, setMaxLengthPwd] = useState('10');
  const [charsetPwd, setCharsetPwd] = useState('');
  const [patternPwd, setPatternPwd] = useState('');
  const [usePatternPwd, setUsePatternPwd] = useState(false);
  const [outputFilenamePwd, setOutputFilenamePwd] = useState('passwords.txt');
  
  // Générateur d'utilisateurs
  const [minLengthUser, setMinLengthUser] = useState('4');
  const [maxLengthUser, setMaxLengthUser] = useState('8');
  const [charsetUser, setCharsetUser] = useState('abcdefghijklmnopqrstuvwxyz');
  const [patternUser, setPatternUser] = useState('');
  const [usePatternUser, setUsePatternUser] = useState(false);
  const [outputFilenameUser, setOutputFilenameUser] = useState('users.txt');
  
  // Fonctions pour gérer la sélection des fichiers
  const handleUsernameFileSelect = async () => {
    try {
      if (window.electronAPI && window.electronAPI.showOpenFileDialog) {
        const result = await window.electronAPI.showOpenFileDialog({
          title: 'Sélectionner un fichier d\'utilisateurs',
          defaultPath: '/home/user/wordlists',
          buttonLabel: 'Sélectionner',
          filters: [
            { name: 'Fichiers texte', extensions: ['txt', 'lst'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
          ]
        });
        
        if (result.success) {
          setUsernameFile(result.filePath);
          showSuccess(`Fichier d'utilisateurs sélectionné: ${result.filePath}`);
        }
      } else {
        // Fallback si l'API n'est pas disponible
        const defaultPath = "/home/user/wordlists/users.txt";
        setUsernameFile(defaultPath);
        showWarning('Sélecteur de fichiers natif non disponible. Chemin par défaut utilisé.');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      showError('Erreur lors de la sélection du fichier');
    }
  };
  
  const handlePasswordFileSelect = async () => {
    try {
      if (window.electronAPI && window.electronAPI.showOpenFileDialog) {
        const result = await window.electronAPI.showOpenFileDialog({
          title: 'Sélectionner un fichier de mots de passe',
          defaultPath: '/home/user/wordlists',
          buttonLabel: 'Sélectionner',
          filters: [
            { name: 'Fichiers texte', extensions: ['txt', 'lst', 'dict'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
          ]
        });
        
        if (result.success) {
          setPasswordFile(result.filePath);
          showSuccess(`Fichier de mots de passe sélectionné: ${result.filePath}`);
        }
      } else {
        // Fallback si l'API n'est pas disponible
        const defaultPath = "/home/user/wordlists/passwords.txt";
        setPasswordFile(defaultPath);
        showWarning('Sélecteur de fichiers natif non disponible. Chemin par défaut utilisé.');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      showError('Erreur lors de la sélection du fichier');
    }
  };
  
  // Vérifier la plateforme et si Hydra est installé
  useEffect(() => {
    const checkPlatformAndHydra = async () => {
      try {
        setIsLoading(true);
        
        // Vérifier la plateforme
        if (window.electronAPI && window.electronAPI.getPlatform) {
          const platformResult = await window.electronAPI.getPlatform();
          setPlatform(platformResult);
          
          // Si c'est Linux, vérifier si Hydra est installé
          if (platformResult === 'linux') {
            try {
              const result = await window.electronAPI.executeCommand('which hydra');
              setIsHydraInstalled(!!result.stdout);
              
              // Si Hydra est installé, récupérer les services disponibles
              if (result.stdout) {
                try {
                  const servicesResult = await window.electronAPI.executeCommand('hydra -h | grep "Supported services" -A 20 | grep -v "Supported services" | tr " " "\\n" | grep -v "^$"');
                  if (servicesResult.stdout) {
                    // Filtrer et traiter la liste des services pour éviter les doublons
                    const standardServices = ['http-post-form', 'http-get-form', 'https-post-form', 'https-get-form', 'ssh', 'ftp', 'mysql', 'smb'];
                    const services = servicesResult.stdout
                      .split('\n')
                      .filter(s => s.trim() !== '' && !standardServices.includes(s.trim()))
                      .sort();
                    setAvailableServices(services);
                  }
                } catch (error) {
                  console.error('Erreur lors de la récupération des services Hydra:', error);
                }
              }
            } catch (error) {
              console.error('Erreur lors de la vérification de l\'installation d\'Hydra:', error);
              setIsHydraInstalled(false);
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la plateforme et de Hydra:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPlatformAndHydra();
  }, []);
  
  // Fonction pour exécuter Hydra
  const runHydra = async () => {
    if (!target || !port || !service) {
      showWarning('Veuillez remplir tous les champs obligatoires (cible, port, service)');
      return;
    }
    
    // Vérifier qu'au moins un utilisateur/fichier et un mot de passe/fichier sont spécifiés
    if ((!username && !usernameFile) || !passwordFile) {
      showWarning('Veuillez spécifier au moins un utilisateur (ou fichier) et un fichier de mots de passe');
      return;
    }
    
    // Vérifier que les paramètres sont corrects pour certains services
    if ((service.includes('http-post-form') || service.includes('http-get-form') || 
         service.includes('https-post-form') || service.includes('https-get-form')) && 
        (!customParameters || !customParameters.includes(':') || !customParameters.includes('/'))) {
      showWarning('Pour les formulaires web, veuillez spécifier les paramètres au format: /page.php:param=^USER^&param2=^PASS^:F=message_erreur');
      return;
    }
    
    try {
      setIsRunning(true);
      setOutput('Démarrage de Hydra...\n');
      
      // Construire la commande Hydra
      let command = `hydra -V`;
      
      // Ajouter le nombre de threads
      if (threadCount && parseInt(threadCount) > 0) {
        command += ` -t ${threadCount}`;
      }
      
      // Ajouter le nom d'utilisateur ou le fichier d'utilisateurs
      if (username) {
        command += ` -l ${username}`;
      } else if (usernameFile) {
        command += ` -L ${usernameFile}`;
      }
      
      // Ajouter le fichier de mots de passe
      if (passwordFile) {
        command += ` -P ${passwordFile}`;
      }
      
      // Ajouter la cible
      command += ` ${target}`;
      
      // Ajouter le port si spécifié
      if (port) {
        command += ` -s ${port}`;
      }
      
      // Ajouter le service
      command += ` ${service}`;
      
      // Ajouter les paramètres personnalisés si nécessaire
      if (service.includes('http-post-form') || service.includes('http-get-form') || 
          service.includes('https-post-form') || service.includes('https-get-form')) {
        if (customParameters) {
          command += ` "${customParameters}"`;
        } else {
          command += ` "/login.php:username=^USER^&password=^PASS^:F=Échec de connexion"`;
        }
      } else if (customParameters) {
        command += ` ${customParameters}`;
      }
      
      // Afficher la commande complète
      setOutput(prev => prev + `Commande exécutée : ${command}\n\n`);
      
      // Exécuter la commande
      try {
        const result = await window.electronAPI.executeCommand(command);
        
        // Afficher le résultat
        setOutput(prev => prev + `\n${result.stdout}\n${result.stderr || ''}`);
        
        if (result.stderr) {
          showWarning('Hydra a terminé avec des avertissements');
        } else {
          showSuccess('Hydra a terminé avec succès');
        }
      } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande Hydra:', error);
        setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue lors de l\'exécution de la commande'}`);
        showError(`Erreur lors de l'exécution de Hydra: ${error.message || 'Une erreur est survenue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de Hydra:', error);
      setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue'}`);
      showError(`Erreur lors de l'exécution de Hydra: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Fonction pour générer une liste de mots de passe avec Crunch
  const generatePasswordList = async () => {
    try {
      setIsRunning(true);
      
      // Validation des champs
      if (!outputFilenamePwd) {
        showWarning('Veuillez spécifier un nom de fichier de sortie');
        setIsRunning(false);
        return;
      }
      
      // Si on utilise un pattern, il doit être spécifié
      if (usePatternPwd && !patternPwd) {
        showWarning('Veuillez spécifier un pattern');
        setIsRunning(false);
        return;
      }
      
      // Si on n'utilise pas de pattern, les longueurs min et max sont obligatoires
      if (!usePatternPwd && (!minLengthPwd || !maxLengthPwd)) {
        showWarning('Veuillez spécifier les longueurs minimale et maximale');
        setIsRunning(false);
        return;
      }
      
      setOutput('Génération de la liste de mots de passe avec Crunch...\n');
      
      // Construire la commande Crunch
      let command = `crunch ${minLengthPwd} ${maxLengthPwd}`;
      
      // Ajouter le charset si spécifié
      if (charsetPwd && charsetPwd.trim() !== '') {
        command += ` "${charsetPwd}"`;
      }
      
      // Ajouter le pattern si l'option est activée
      if (usePatternPwd && patternPwd) {
        command += ` -t "${patternPwd}"`;
      }
      
      // Ajouter le fichier de sortie
      command += ` -o ${outputFilenamePwd}`;
      
      // Afficher la commande
      setOutput(prev => prev + `Commande exécutée : ${command}\n\n`);
      
      // Exécuter la commande
      try {
        const result = await window.electronAPI.executeCommand(command);
        
        // Afficher le résultat
        setOutput(prev => prev + `\n${result.stdout}\n${result.stderr || ''}`);
        setPasswordFile(outputFilenamePwd);
        
        showSuccess(`Liste de mots de passe générée dans ${outputFilenamePwd}`);
        
        // Fermer le formulaire de génération de mot de passe
        setShowPasswordGenerator(false);
      } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande Crunch:', error);
        setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue lors de l\'exécution de la commande'}`);
        showError(`Erreur lors de la génération de la liste de mots de passe: ${error.message || 'Une erreur est survenue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la liste de mots de passe:', error);
      setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue'}`);
      showError(`Erreur lors de la génération de la liste de mots de passe: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Fonction pour générer une liste d'utilisateurs avec Crunch
  const generateUsernameList = async () => {
    try {
      setIsRunning(true);
      
      // Validation des champs
      if (!outputFilenameUser) {
        showWarning('Veuillez spécifier un nom de fichier de sortie');
        setIsRunning(false);
        return;
      }
      
      // Si on utilise un pattern, il doit être spécifié
      if (usePatternUser && !patternUser) {
        showWarning('Veuillez spécifier un pattern');
        setIsRunning(false);
        return;
      }
      
      // Si on n'utilise pas de pattern, les longueurs min et max sont obligatoires
      if (!usePatternUser && (!minLengthUser || !maxLengthUser)) {
        showWarning('Veuillez spécifier les longueurs minimale et maximale');
        setIsRunning(false);
        return;
      }
      
      setOutput('Génération de la liste d\'utilisateurs avec Crunch...\n');
      
      // Construire la commande Crunch
      let command = `crunch ${minLengthUser} ${maxLengthUser}`;
      
      // Ajouter le charset si spécifié
      if (charsetUser && charsetUser.trim() !== '') {
        command += ` "${charsetUser}"`;
      }
      
      // Ajouter le pattern si l'option est activée
      if (usePatternUser && patternUser) {
        command += ` -t "${patternUser}"`;
      }
      
      // Ajouter le fichier de sortie
      command += ` -o ${outputFilenameUser}`;
      
      // Afficher la commande
      setOutput(prev => prev + `Commande exécutée : ${command}\n\n`);
      
      // Exécuter la commande
      try {
        const result = await window.electronAPI.executeCommand(command);
        
        // Afficher le résultat
        setOutput(prev => prev + `\n${result.stdout}\n${result.stderr || ''}`);
        setUsernameFile(outputFilenameUser);
        
        showSuccess(`Liste d'utilisateurs générée dans ${outputFilenameUser}`);
        
        // Fermer le formulaire de génération d'utilisateurs
        setShowUsernameGenerator(false);
      } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande Crunch:', error);
        setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue lors de l\'exécution de la commande'}`);
        showError(`Erreur lors de la génération de la liste d'utilisateurs: ${error.message || 'Une erreur est survenue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la liste d\'utilisateurs:', error);
      setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue'}`);
      showError(`Erreur lors de la génération de la liste d'utilisateurs: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Rendu conditionnel en fonction de la plateforme
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  // Si ce n'est pas Linux, afficher un message d'erreur
  if (platform !== 'linux') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FiAlertTriangle className="mr-2" size={24} />
            <div>
              <p className="font-bold">Incompatible avec Windows</p>
              <p>Hydra n'est pas compatible avec Windows. Veuillez utiliser un système Linux pour accéder à cette fonctionnalité.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Si Hydra n'est pas installé, afficher un message d'installation
  if (!isHydraInstalled) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FiInfo className="mr-2" size={24} />
            <div>
              <p className="font-bold">Hydra n'est pas installé</p>
              <p>Veuillez installer Hydra pour utiliser cette fonctionnalité.</p>
              <p className="mt-2">Vous pouvez l'installer avec la commande suivante :</p>
              <pre className="bg-gray-100 p-2 mt-2 rounded">sudo apt-get install hydra</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Afficher l'interface Hydra
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">Hydra - Outil de Brute Force</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cible (IP/Hostname) *
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
              placeholder="exemple.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Port *
            </label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
              placeholder="80"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service *
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            >
              <option value="http-post-form">HTTP POST Form</option>
              <option value="http-get-form">HTTP GET Form</option>
              <option value="https-post-form">HTTPS POST Form</option>
              <option value="https-get-form">HTTPS GET Form</option>
              <option value="ssh">SSH</option>
              <option value="ftp">FTP</option>
              <option value="mysql">MySQL</option>
              <option value="smb">SMB</option>
              
              {availableServices.map((serviceOption, index) => (
                <option key={`service-${index}-${serviceOption}`} value={serviceOption}>
                  {serviceOption}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
              placeholder="admin"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Laissez vide si vous utilisez un fichier d'utilisateurs
            </p>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fichier d'utilisateurs
          </label>
          <div className="flex">
            <input
              type="text"
              value={usernameFile}
              onChange={(e) => setUsernameFile(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
              placeholder="/chemin/vers/users.txt"
            />
            <button
              onClick={handleUsernameFileSelect}
              disabled={isRunning}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2"
              title="Parcourir"
            >
              <FiUpload />
            </button>
            <button
              onClick={() => {
                setShowUsernameGenerator(true);
                setShowPasswordGenerator(false);
              }}
              disabled={isRunning}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-r-md"
              title="Générer une liste avec Crunch"
            >
              <FiPlay className="mr-1" /> Crunch
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Spécifiez le chemin vers un fichier d'utilisateurs existant ou générez-en un nouveau avec Crunch
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fichier de mots de passe
          </label>
          <div className="flex">
            <input
              type="text"
              value={passwordFile}
              onChange={(e) => setPasswordFile(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
              placeholder="/chemin/vers/passwords.txt"
            />
            <button
              onClick={handlePasswordFileSelect}
              disabled={isRunning}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2"
              title="Parcourir"
            >
              <FiUpload />
            </button>
            <button
              onClick={() => setShowPasswordGenerator(true)}
              disabled={isRunning}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-r-md"
              title="Générer une liste avec Crunch"
            >
              <FiPlay className="mr-1" /> Crunch
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Spécifiez le chemin vers un fichier de mots de passe existant ou générez-en un nouveau avec Crunch
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre de threads (1-16)
          </label>
          <input
            type="number"
            min="1"
            max="16"
            value={threadCount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 16)) {
                setThreadCount(value);
              }
            }}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            placeholder="16"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Nombre de connexions parallèles. Une valeur plus élevée = attaque plus rapide mais risque de surcharge. Maximum recommandé : 16.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Paramètres personnalisés pour les formulaires web
          </label>
          <input
            type="text"
            value={customParameters}
            onChange={(e) => setCustomParameters(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            placeholder="/login.php:username=^USER^&password=^PASS^:F=Échec de connexion"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Format requis pour HTTP/HTTPS POST/GET Form: <span className="font-mono">/page:paramètres:message_erreur</span>
            <br/>
            <span className="font-mono">^USER^</span> et <span className="font-mono">^PASS^</span> seront remplacés par les valeurs testées
            <br/>
            <span className="font-mono">F=message</span> pour définir un message d'erreur, <span className="font-mono">S=message</span> pour un message de succès
          </p>
        </div>
        
        {/* Formulaire pour générer une liste de mots de passe */}
        {showPasswordGenerator && (
          <div className="mt-4 mb-4 p-4 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
              Générer une liste de mots de passe avec Crunch
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Longueur minimale *
                </label>
                <input
                  type="text"
                  value={minLengthPwd}
                  onChange={(e) => setMinLengthPwd(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="8"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Longueur maximale *
                </label>
                <input
                  type="text"
                  value={maxLengthPwd}
                  onChange={(e) => setMaxLengthPwd(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="10"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jeu de caractères
                </label>
                <input
                  type="text"
                  value={charsetPwd}
                  onChange={(e) => setCharsetPwd(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="abcdefghijklmnopqrstuvwxyz0123456789"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Exemples: "abc123!@#" ou "abcdefghijklmnopqrstuvwxyz0123456789"
                </p>
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="use-pattern-pwd"
                    checked={usePatternPwd}
                    onChange={(e) => setUsePatternPwd(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="use-pattern-pwd" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Utiliser un pattern
                  </label>
                </div>
                
                {usePatternPwd && (
                  <>
                    <input
                      type="text"
                      value={patternPwd}
                      onChange={(e) => setPatternPwd(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700 mt-2"
                      placeholder="!Min@@@@@t33"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <p>Utilisez des caractères spéciaux pour définir le format :</p>
                      <ul className="list-disc list-inside mt-1">
                        <li><span className="font-mono">@</span> - Lettres minuscules (a-z)</li>
                        <li><span className="font-mono">,</span> - Lettres majuscules (A-Z)</li>
                        <li><span className="font-mono">%</span> - Chiffres (0-9)</li>
                        <li><span className="font-mono">^</span> - Caractères spéciaux (!@#$)</li>
                      </ul>
                      <p className="mt-1">Exemples de commandes :</p>
                      <ul className="list-disc list-inside mt-1">
                        <li><span className="font-mono">crunch 12 12 -t '!Min@@@@@t33'</span> - Génère des mots comme !Minabcdet33</li>
                        <li><span className="font-mono">crunch 12 12 -t '!Minecr@ft33'</span> - Remplace @ par chaque lettre</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du fichier de sortie *
              </label>
              <input
                type="text"
                value={outputFilenamePwd}
                onChange={(e) => setOutputFilenamePwd(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                placeholder="passwords.txt"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowPasswordGenerator(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={generatePasswordList}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
              >
                <FiPlay className="mr-2" /> Générer
              </button>
            </div>
          </div>
        )}
        
        {/* Formulaire pour générer une liste d'utilisateurs */}
        {showUsernameGenerator && (
          <div className="mt-4 mb-4 p-4 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
              Générer une liste d'utilisateurs avec Crunch
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Longueur minimale *
                </label>
                <input
                  type="text"
                  value={minLengthUser}
                  onChange={(e) => setMinLengthUser(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="4"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Longueur maximale *
                </label>
                <input
                  type="text"
                  value={maxLengthUser}
                  onChange={(e) => setMaxLengthUser(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="8"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jeu de caractères
                </label>
                <input
                  type="text"
                  value={charsetUser}
                  onChange={(e) => setCharsetUser(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="abcdefghijklmnopqrstuvwxyz"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Par défaut: lettres minuscules uniquement (idéal pour les noms d'utilisateurs)
                </p>
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="use-pattern-user"
                    checked={usePatternUser}
                    onChange={(e) => setUsePatternUser(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="use-pattern-user" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Utiliser un pattern
                  </label>
                </div>
                
                {usePatternUser && (
                  <>
                    <input
                      type="text"
                      value={patternUser}
                      onChange={(e) => setPatternUser(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700 mt-2"
                      placeholder="admin@"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <p>Utilisez des caractères spéciaux pour définir le format :</p>
                      <ul className="list-disc list-inside mt-1">
                        <li><span className="font-mono">@</span> - Lettres minuscules (a-z)</li>
                        <li><span className="font-mono">,</span> - Lettres majuscules (A-Z)</li>
                        <li><span className="font-mono">%</span> - Chiffres (0-9)</li>
                      </ul>
                      <p className="mt-1">Exemples :</p>
                      <ul className="list-disc list-inside mt-1">
                        <li><span className="font-mono">admin@</span> - admina, adminb, adminc, ...</li>
                        <li><span className="font-mono">user%%</span> - user00, user01, user02, ...</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du fichier de sortie *
              </label>
              <input
                type="text"
                value={outputFilenameUser}
                onChange={(e) => setOutputFilenameUser(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                placeholder="users.txt"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowUsernameGenerator(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={generateUsernameList}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
              >
                <FiPlay className="mr-2" /> Générer
              </button>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setTarget('');
              setPort('');
              setService('http-post-form');
              setUsername('');
              setPasswordFile('');
              setCustomParameters('');
              setOutput('');
            }}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md flex items-center"
          >
            <FiX className="mr-2" /> Réinitialiser
          </button>
          
          <button
            onClick={runHydra}
            disabled={isRunning}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
          >
            <FiPlay className="mr-2" /> Exécuter Hydra
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Résultats</h2>
        
        {isRunning && (
          <div className="flex items-center mb-4">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Exécution en cours...</span>
          </div>
        )}
        
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm overflow-auto max-h-96 text-gray-800 dark:text-gray-200">
          {output || 'Les résultats s\'afficheront ici...'}
        </pre>
      </div>
      
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md">
        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Conseils d'utilisation</h3>
        <ul className="list-disc list-inside text-blue-600 dark:text-blue-300 space-y-1">
          <li>Pour les formulaires web, utilisez le format <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">"/login.php:username=^USER^&password=^PASS^:F=Échec de connexion"</code></li>
          <li>L'option <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">F=message</code> indique un message d'erreur à rechercher en cas d'échec</li>
          <li>L'option <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">S=message</code> indique un message de succès à rechercher</li>
          <li>Utilisez <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">-t</code> pour définir le nombre de threads parallèles (ex: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">-t 16</code>)</li>
          <li>Utilisez <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">-v</code> pour le mode verbeux</li>
        </ul>

        <div className="mt-4">
          <h4 className="text-md font-semibold text-blue-700 dark:text-blue-400 mb-2">Exemples de commandes</h4>
          
          <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded mb-2">
            <p className="font-bold mb-1">Attaque HTTP formulaire POST</p>
            <pre className="text-sm">hydra -l admin -P wordlist.txt exemple.com http-post-form "/login.php:username=^USER^&password=^PASS^:F=Échec de connexion"</pre>
          </div>
          
          <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded mb-2">
            <p className="font-bold mb-1">Attaque SSH</p>
            <pre className="text-sm">hydra -l utilisateur -P wordlist.txt ssh://192.168.1.1</pre>
          </div>
          
          <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded">
            <p className="font-bold mb-1">Attaque FTP</p>
            <pre className="text-sm">hydra -L users.txt -P passwords.txt ftp://192.168.1.1</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hydra;
