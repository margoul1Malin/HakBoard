import React, { useState, useEffect } from 'react';
import { FiPlay, FiX, FiUpload, FiInfo, FiAlertTriangle, FiCheck, FiSettings, FiList, FiEye, FiRefreshCw } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const JohnTheRipper = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États pour stocker les informations
  const [platform, setPlatform] = useState('');
  const [isJohnInstalled, setIsJohnInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hashFile, setHashFile] = useState('');
  const [wordlistFile, setWordlistFile] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('wordlist'); // wordlist, incremental, single, rules
  const [format, setFormat] = useState(''); // format du hash (MD5, SHA1, etc.)
  const [availableFormats, setAvailableFormats] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  // Vérifier la plateforme et si John est installé
  useEffect(() => {
    const checkPlatformAndJohn = async () => {
      try {
        setIsLoading(true);
        
        // Vérifier la plateforme
        if (window.electronAPI && window.electronAPI.getPlatform) {
          const platformResult = await window.electronAPI.getPlatform();
          setPlatform(platformResult);
          
          // Si c'est Linux, vérifier si John est installé
          if (platformResult === 'linux') {
            try {
              const result = await window.electronAPI.executeCommand('which john');
              setIsJohnInstalled(!!result.stdout);
              
              // Si John est installé, récupérer les formats disponibles
              if (result.stdout) {
                try {
                  const formatsResult = await window.electronAPI.executeCommand('john --list=formats');
                  if (formatsResult.stdout) {
                    // Traiter la sortie pour extraire les formats
                    const formatsOutput = formatsResult.stdout;
                    const formats = formatsOutput
                      .split('\n')
                      .filter(line => line.trim() !== '')
                      .flatMap(line => {
                        // Les formats sont listés après "The following hash"
                        if (line.includes('The following hash')) return [];
                        return line.trim().split(/\s+/);
                      })
                      .filter(format => format && format.length > 1 && !format.includes('--'));
                    
                    setAvailableFormats(formats);
                  }
                } catch (error) {
                  console.error('Erreur lors de la récupération des formats de John:', error);
                }
              }
            } catch (error) {
              console.error('Erreur lors de la vérification de l\'installation de John:', error);
              setIsJohnInstalled(false);
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la plateforme et de John:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPlatformAndJohn();
  }, []);
  
  // Fonctions pour gérer la sélection des fichiers
  const handleHashFileSelect = async () => {
    try {
      if (window.electronAPI && window.electronAPI.showOpenFileDialog) {
        const result = await window.electronAPI.showOpenFileDialog({
          title: 'Sélectionner un fichier de hash',
          defaultPath: '/home/user',
          buttonLabel: 'Sélectionner',
          filters: [
            { name: 'Fichiers texte', extensions: ['txt', 'hash', 'pwd'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
          ]
        });
        
        if (result.success) {
          setHashFile(result.filePath);
          showSuccess(`Fichier de hash sélectionné: ${result.filePath}`);
          
          // Tenter de détecter le format automatiquement
          try {
            const detectResult = await window.electronAPI.executeCommand(`john --show --format=raw-md5 "${result.filePath}" 2>&1`);
            if (!detectResult.stderr.includes('No such file')) {
              setOutput(prev => prev + `Format détecté: ${detectResult.stdout}\n`);
            }
          } catch (error) {
            // Ignorer les erreurs de détection de format
          }
        }
      } else {
        // Fallback si l'API n'est pas disponible
        const defaultPath = "/home/user/hashfile.txt";
        setHashFile(defaultPath);
        showWarning('Sélecteur de fichiers natif non disponible. Chemin par défaut utilisé.');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      showError('Erreur lors de la sélection du fichier');
    }
  };
  
  const handleWordlistFileSelect = async () => {
    try {
      if (window.electronAPI && window.electronAPI.showOpenFileDialog) {
        const result = await window.electronAPI.showOpenFileDialog({
          title: 'Sélectionner une wordlist',
          defaultPath: '/usr/share/wordlists',
          buttonLabel: 'Sélectionner',
          filters: [
            { name: 'Fichiers texte', extensions: ['txt', 'lst', 'dict'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
          ]
        });
        
        if (result.success) {
          setWordlistFile(result.filePath);
          showSuccess(`Wordlist sélectionnée: ${result.filePath}`);
        }
      } else {
        // Fallback si l'API n'est pas disponible
        const defaultPath = "/usr/share/wordlists/rockyou.txt";
        setWordlistFile(defaultPath);
        showWarning('Sélecteur de fichiers natif non disponible. Chemin par défaut utilisé.');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      showError('Erreur lors de la sélection du fichier');
    }
  };
  
  // Fonction pour exécuter John The Ripper
  const runJohn = async () => {
    if (!hashFile) {
      showWarning('Veuillez spécifier un fichier de hash');
      return;
    }
    
    try {
      setIsRunning(true);
      setOutput('Démarrage de John The Ripper...\n');
      
      // Construire la commande de base
      let command = 'john';
      
      // Ajouter le mode et ses options spécifiques
      switch (mode) {
        case 'wordlist':
          if (!wordlistFile) {
            showWarning('Veuillez spécifier une wordlist pour le mode wordlist');
            setIsRunning(false);
            return;
          }
          command += ` --wordlist="${wordlistFile}"`;
          break;
        case 'incremental':
          command += ' --incremental';
          break;
        case 'single':
          command += ' --single';
          break;
        case 'rules':
          if (!wordlistFile) {
            showWarning('Veuillez spécifier une wordlist pour le mode rules');
            setIsRunning(false);
            return;
          }
          command += ` --wordlist="${wordlistFile}" --rules`;
          break;
        default:
          break;
      }
      
      // Ajouter le format si spécifié
      if (format) {
        command += ` --format=${format}`;
      }
      
      // Ajouter la session si spécifiée
      if (sessionName) {
        command += ` --session=${sessionName}`;
      }
      
      // Ajouter le fichier de hash
      command += ` "${hashFile}"`;
      
      // Afficher la commande complète
      setOutput(prev => prev + `Commande exécutée : ${command}\n\n`);
      
      // Exécuter la commande
      try {
        const result = await window.electronAPI.executeCommand(command);
        
        // Afficher le résultat
        setOutput(prev => prev + `\n${result.stdout}\n${result.stderr || ''}`);
        
        if (result.stderr) {
          showWarning('John a terminé avec des avertissements');
        } else {
          showSuccess('John a terminé avec succès');
        }
      } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande John:', error);
        setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue lors de l\'exécution de la commande'}`);
        showError(`Erreur lors de l'exécution de John: ${error.message || 'Une erreur est survenue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de John:', error);
      setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue'}`);
      showError(`Erreur lors de l'exécution de John: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Fonction pour afficher les résultats (mots de passe trouvés)
  const showFoundPasswords = async () => {
    if (!hashFile) {
      showWarning('Veuillez spécifier un fichier de hash');
      return;
    }
    
    try {
      setIsRunning(true);
      setOutput('Récupération des mots de passe trouvés...\n');
      
      // Construire la commande pour afficher les mots de passe trouvés
      const command = `john --show "${hashFile}"`;
      
      // Afficher la commande
      setOutput(prev => prev + `Commande exécutée : ${command}\n\n`);
      
      // Exécuter la commande
      try {
        const result = await window.electronAPI.executeCommand(command);
        
        // Afficher le résultat
        setOutput(prev => prev + `\n${result.stdout}\n${result.stderr || ''}`);
        
        if (result.stderr) {
          showWarning('John a terminé avec des avertissements');
        } else {
          if (result.stdout.includes('0 password hashes cracked')) {
            showInfo('Aucun mot de passe trouvé pour le moment');
          } else {
            showSuccess('Mots de passe récupérés avec succès');
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande John (--show):', error);
        setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue lors de l\'exécution de la commande'}`);
        showError(`Erreur lors de l'affichage des mots de passe: ${error.message || 'Une erreur est survenue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'affichage des mots de passe:', error);
      setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue'}`);
      showError(`Erreur lors de l'affichage des mots de passe: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Fonction pour restaurer une session
  const restoreSession = async () => {
    if (!sessionName) {
      showWarning('Veuillez spécifier un nom de session à restaurer');
      return;
    }
    
    try {
      setIsRunning(true);
      setOutput(`Restauration de la session "${sessionName}"...\n`);
      
      // Construire la commande pour restaurer la session
      const command = `john --restore=${sessionName}`;
      
      // Afficher la commande
      setOutput(prev => prev + `Commande exécutée : ${command}\n\n`);
      
      // Exécuter la commande
      try {
        const result = await window.electronAPI.executeCommand(command);
        
        // Afficher le résultat
        setOutput(prev => prev + `\n${result.stdout}\n${result.stderr || ''}`);
        
        if (result.stderr) {
          showWarning('John a terminé avec des avertissements');
        } else {
          showSuccess('Session restaurée avec succès');
        }
      } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande John (--restore):', error);
        setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue lors de l\'exécution de la commande'}`);
        showError(`Erreur lors de la restauration de la session: ${error.message || 'Une erreur est survenue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de la session:', error);
      setOutput(prev => prev + `\nErreur: ${error.message || 'Une erreur est survenue'}`);
      showError(`Erreur lors de la restauration de la session: ${error.message || 'Une erreur est survenue'}`);
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
              <p>John The Ripper n'est pas compatible avec Windows dans cette application. Veuillez utiliser un système Linux pour accéder à cette fonctionnalité.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Si John n'est pas installé, afficher un message d'installation
  if (!isJohnInstalled) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FiInfo className="mr-2" size={24} />
            <div>
              <p className="font-bold">John The Ripper n'est pas installé</p>
              <p>Veuillez installer John The Ripper pour utiliser cette fonctionnalité.</p>
              <p className="mt-2">Vous pouvez l'installer avec la commande suivante :</p>
              <pre className="bg-gray-100 p-2 mt-2 rounded">sudo apt-get install john</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Afficher l'interface John
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">John The Ripper - Outil de Cracking de Mots de Passe</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Configuration</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fichier de hash *
          </label>
          <div className="flex">
            <input
              type="text"
              value={hashFile}
              onChange={(e) => setHashFile(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
              placeholder="/chemin/vers/hashfile.txt"
            />
            <button
              onClick={handleHashFileSelect}
              disabled={isRunning}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-r-md"
              title="Parcourir"
            >
              <FiUpload />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Fichier contenant les hash à cracker (ex: /etc/shadow)
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mode *
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            >
              <option value="wordlist">Wordlist</option>
              <option value="incremental">Incremental (Brute Force)</option>
              <option value="single">Single</option>
              <option value="rules">Rules</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            >
              <option value="">Auto-détection</option>
              <option value="raw-md5">MD5</option>
              <option value="raw-sha1">SHA1</option>
              <option value="raw-sha256">SHA256</option>
              <option value="raw-sha512">SHA512</option>
              <option value="descrypt">DES Crypt</option>
              <option value="bsdicrypt">BSDI Crypt</option>
              <option value="md5crypt">MD5 Crypt</option>
              <option value="sha256crypt">SHA256 Crypt</option>
              <option value="sha512crypt">SHA512 Crypt</option>
              <option value="NT">NTLM</option>
              <option value="LM">LM</option>
              
              {availableFormats.map((formatOption, index) => (
                <option key={`format-${index}-${formatOption}`} value={formatOption}>
                  {formatOption}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {(mode === 'wordlist' || mode === 'rules') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wordlist *
            </label>
            <div className="flex">
              <input
                type="text"
                value={wordlistFile}
                onChange={(e) => setWordlistFile(e.target.value)}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                placeholder="/usr/share/wordlists/rockyou.txt"
              />
              <button
                onClick={handleWordlistFileSelect}
                disabled={isRunning}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-r-md"
                title="Parcourir"
              >
                <FiUpload />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Liste de mots à utiliser pour le cracking
            </p>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nom de session
          </label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            placeholder="ma_session"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Permet de sauvegarder le progrès et de restaurer la session plus tard
          </p>
        </div>
        
        <div className="flex flex-wrap justify-end space-x-2 space-y-2 sm:space-y-0">
          <button
            onClick={() => {
              setHashFile('');
              setWordlistFile('');
              setFormat('');
              setMode('wordlist');
              setSessionName('');
              setOutput('');
            }}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md flex items-center"
          >
            <FiX className="mr-2" /> Réinitialiser
          </button>
          
          <button
            onClick={showFoundPasswords}
            disabled={isRunning || !hashFile}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
          >
            <FiEye className="mr-2" /> Voir résultats
          </button>
          
          <button
            onClick={restoreSession}
            disabled={isRunning || !sessionName}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md flex items-center"
          >
            <FiRefreshCw className="mr-2" /> Restaurer session
          </button>
          
          <button
            onClick={runJohn}
            disabled={isRunning}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
          >
            <FiPlay className="mr-2" /> Exécuter John
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
          <li>Le mode <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Wordlist</code> teste les mots d'une liste prédéfinie</li>
          <li>Le mode <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Incremental</code> teste toutes les combinaisons possibles</li>
          <li>Le mode <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Single</code> utilise des informations connues sur l'utilisateur</li>
          <li>Le mode <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Rules</code> applique des règles de transformation aux mots d'une liste</li>
          <li>Utilisez <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">--session</code> pour pouvoir reprendre un cracking interrompu</li>
        </ul>

        <div className="mt-4">
          <h4 className="text-md font-semibold text-blue-700 dark:text-blue-400 mb-2">Exemples de formats de hash</h4>
          
          <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded mb-2">
            <p className="font-bold mb-1">Fichier /etc/shadow</p>
            <pre className="text-sm">user:$6$salt$hash:18640:0:99999:7:::</pre>
          </div>
          
          <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded mb-2">
            <p className="font-bold mb-1">Hash MD5</p>
            <pre className="text-sm">5f4dcc3b5aa765d61d8327deb882cf99</pre>
          </div>
          
          <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded">
            <p className="font-bold mb-1">Hash SHA1</p>
            <pre className="text-sm">5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JohnTheRipper; 