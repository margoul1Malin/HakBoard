import React, { useState, useEffect } from 'react';
import { FiGithub, FiFolder, FiCode, FiDownload, FiRefreshCw, FiAlertTriangle, FiInfo, FiSearch, FiX, FiCheck } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const ScriptGarbage = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États pour stocker les données
  const [isLoading, setIsLoading] = useState(true);
  const [scripts, setScripts] = useState({});
  const [error, setError] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installPath, setInstallPath] = useState('');
  const [selectedScript, setSelectedScript] = useState(null);
  
  // Charger les scripts au démarrage
  useEffect(() => {
    fetchScripts();
  }, []);
  
  // Fonction pour récupérer les scripts depuis GitHub
  const fetchScripts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Définir l'URL de l'API GitHub pour le contenu du dépôt
      const baseUrl = 'https://api.github.com/repos/margoul1Malin/ScriptGarbage/contents';
      
      // Récupérer la liste des dossiers
      const response = await fetch(baseUrl);
      if (!response.ok) {
        throw new Error(`Erreur HTTP : ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filtrer pour ne garder que les dossiers de scripts
      const scriptFolders = data.filter(item => 
        item.type === 'dir' && item.name.includes('_scripts')
      );
      
      // Récupérer le contenu de chaque dossier
      const scriptsData = {};
      
      for (const folder of scriptFolders) {
        const folderResponse = await fetch(folder.url);
        if (!folderResponse.ok) {
          console.error(`Erreur lors de la récupération du dossier ${folder.name}:`, folderResponse.status);
          continue;
        }
        
        const folderContent = await folderResponse.json();
        
        // Filtrer les fichiers de script
        const scripts = folderContent.filter(item => item.type === 'file');
        
        // Ajouter au résultat
        scriptsData[folder.name] = scripts.map(script => ({
          name: script.name,
          path: script.path,
          url: script.html_url,
          download_url: script.download_url,
          type: folder.name.split('_')[0] // Récupérer le type (ps1, bash, python, etc.)
        }));
      }
      
      console.log('Scripts récupérés:', scriptsData);
      setScripts(scriptsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des scripts:', error);
      setError('Impossible de récupérer les scripts depuis GitHub. Veuillez réessayer plus tard.');
      setIsLoading(false);
    }
  };
  
  // Fonction pour installer un script
  const handleInstallScript = (script) => {
    setSelectedScript(script);
    setIsInstalling(true);
  };
  
  // Fonction pour confirmer l'installation
  const confirmInstallation = async () => {
    if (!installPath.trim() || !selectedScript) {
      showWarning('Veuillez spécifier un chemin d\'installation valide.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // On vérifie que l'API Electron est disponible
      if (!window.electronAPI || !window.electronAPI.downloadGithubScript) {
        throw new Error('API Electron non disponible pour l\'installation de scripts.');
      }
      
      // Configuration pour le téléchargement et l'installation du script
      const options = {
        url: selectedScript.download_url,
        destination: `${installPath}/${selectedScript.name}`
      };
      
      // Appel à l'API Electron pour télécharger le script
      const result = await window.electronAPI.downloadGithubScript(options);
      
      if (result.success) {
        showSuccess(`Le script ${selectedScript.name} a été installé avec succès à l'emplacement ${options.destination}`);
        
        // Fermer la modale
        setIsInstalling(false);
        setSelectedScript(null);
        setInstallPath('');
      } else {
        throw new Error(result.error || 'Erreur inconnue lors de l\'installation.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'installation du script:', error);
      showError(`Erreur lors de l'installation: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour filtrer les scripts par dossier et terme de recherche
  const getFilteredScripts = () => {
    if (!scripts || Object.keys(scripts).length === 0) return {};
    
    const result = {};
    
    // Si aucun dossier spécifique n'est sélectionné, retourner tous les scripts
    if (selectedFolder === 'all') {
      // Filtrer par terme de recherche si nécessaire
      if (!searchTerm) {
        return scripts;
      }
      
      // Filtrer par terme de recherche
      Object.keys(scripts).forEach(folder => {
        const filteredScripts = scripts[folder].filter(script => 
          script.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filteredScripts.length > 0) {
          result[folder] = filteredScripts;
        }
      });
      
      return result;
    }
    
    // Si un dossier spécifique est sélectionné
    if (scripts[selectedFolder]) {
      if (!searchTerm) {
        result[selectedFolder] = scripts[selectedFolder];
        return result;
      }
      
      // Filtrer par terme de recherche dans le dossier sélectionné
      const filteredScripts = scripts[selectedFolder].filter(script => 
        script.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (filteredScripts.length > 0) {
        result[selectedFolder] = filteredScripts;
      }
    }
    
    return result;
  };
  
  // Afficher l'indicateur de chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center">
            <FiAlertTriangle className="mr-2" /> Erreur
          </h3>
          <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
          <button 
            onClick={fetchScripts}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center"
          >
            <FiRefreshCw className="mr-2" /> Réessayer
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">
        Script Garbage - Gestionnaire de Scripts
      </h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              Scripts disponibles
            </h2>
            <button
              onClick={fetchScripts}
              className="ml-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="Rafraîchir"
            >
              <FiRefreshCw size={18} />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="p-2 pl-8 pr-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
              />
              <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
            
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            >
              <option value="all">Tous les dossiers</option>
              {Object.keys(scripts).map(folder => (
                <option key={folder} value={folder}>
                  {folder.replace('_scripts', '').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {Object.keys(getFilteredScripts()).length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md text-center text-gray-600 dark:text-gray-300">
            <FiInfo className="mx-auto mb-2" size={24} />
            <p>Aucun script trouvé. Veuillez vérifier vos critères de recherche ou le dossier sélectionné.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(getFilteredScripts()).map(([folder, folderScripts]) => (
              <div key={folder} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  <FiFolder className="mr-2 text-indigo-500" size={20} />
                  {folder.replace('_scripts', '').toUpperCase()}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {folderScripts.map(script => (
                    <div 
                      key={script.path} 
                      className="flex items-start justify-between bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center">
                          <FiCode className="mr-2 text-blue-500" size={16} />
                          {script.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <a 
                            href={script.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Voir sur GitHub
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInstallScript(script)}
                        className="ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center text-sm"
                      >
                        <FiDownload className="mr-1" size={14} /> Installer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal d'installation */}
      {isInstalling && selectedScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Installer {selectedScript.name}
              </h3>
              <button
                onClick={() => {
                  setIsInstalling(false);
                  setSelectedScript(null);
                  setInstallPath('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chemin d'installation
                </label>
                <input
                  type="text"
                  value={installPath}
                  onChange={(e) => setInstallPath(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="/chemin/vers/dossier/destination"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Spécifiez le chemin complet où le script sera installé.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setIsInstalling(false);
                  setSelectedScript(null);
                  setInstallPath('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={confirmInstallation}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                disabled={!installPath.trim()}
              >
                Installer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptGarbage;
