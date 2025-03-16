import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiGlobe, FiServer, FiInfo, FiAlertTriangle, FiDownload, FiSave, FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const ZoomEye = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showApiKey, setShowApiKey] = useState(false);
  const [searchType, setSearchType] = useState('host'); // 'host' ou 'web'
  const [debugInfo, setDebugInfo] = useState(''); // Informations de débogage
  const [filters, setFilters] = useState({
    app: '',
    device: '',
    service: '',
    os: '',
    country: '',
    port: '',
  });
  
  // Référence pour le conteneur de résultats
  const resultsRef = useRef(null);
  
  // Charger la clé API sauvegardée au démarrage
  useEffect(() => {
    const loadSavedApiKey = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getSettings) {
          const settings = await window.electronAPI.getSettings();
          if (settings && settings.zoomeyeApiKey) {
            setSavedApiKey(settings.zoomeyeApiKey);
            setApiKey(settings.zoomeyeApiKey);
            showInfo('Clé API ZoomEye chargée');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la clé API ZoomEye:', error);
      }
    };
    
    loadSavedApiKey();
  }, []);
  
  // Sauvegarder la clé API
  const saveApiKey = async () => {
    if (!apiKey) {
      showWarning('Veuillez entrer une clé API valide');
      return;
    }
    
    try {
      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings({ zoomeyeApiKey: apiKey });
        setSavedApiKey(apiKey);
        showSuccess('Clé API ZoomEye sauvegardée avec succès');
      } else {
        // Fallback: sauvegarder dans le localStorage
        localStorage.setItem('zoomeyeApiKey', apiKey);
        setSavedApiKey(apiKey);
        showSuccess('Clé API ZoomEye sauvegardée localement');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la clé API ZoomEye:', error);
      showError(`Erreur lors de la sauvegarde: ${error.message}`);
    }
  };
  
  // Effectuer une recherche ZoomEye
  const searchZoomEye = async () => {
    if (!savedApiKey) {
      showWarning('Veuillez d\'abord sauvegarder une clé API ZoomEye');
      return;
    }
    
    if (!query) {
      showWarning('Veuillez entrer une requête de recherche');
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    setDebugInfo(''); // Réinitialiser les infos de débogage
    
    try {
      // Construire la requête avec les filtres
      let fullQuery = query;
      
      if (filters.app) {
        fullQuery += ` app:"${filters.app}"`;
      }
      
      if (filters.device) {
        fullQuery += ` device:"${filters.device}"`;
      }
      
      if (filters.service) {
        fullQuery += ` service:"${filters.service}"`;
      }
      
      if (filters.os) {
        fullQuery += ` os:"${filters.os}"`;
      }
      
      if (filters.country) {
        fullQuery += ` country:"${filters.country}"`;
      }
      
      if (filters.port) {
        fullQuery += ` port:${filters.port}`;
      }
      
      // Utiliser l'API REST de ZoomEye directement via une requête HTTP
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const endpoint = searchType === 'host' ? 'host/search' : 'web/search';
        const command = `curl -s -H "API-KEY: ${savedApiKey}" "https://api.zoomeye.ai/${endpoint}?query=${encodeURIComponent(fullQuery)}&page=${currentPage}"`;
        
        const debugCommand = command.replace(savedApiKey, '***API-KEY***');
        console.log('Exécution de la commande ZoomEye:', debugCommand);
        setDebugInfo(prev => prev + `Commande: ${debugCommand}\n\n`);
        
        const result = await window.electronAPI.executeCommand(command);
        
        if (result.stderr) {
          console.error('Erreur stderr de curl:', result.stderr);
          setDebugInfo(prev => prev + `Erreur curl: ${result.stderr}\n\n`);
          throw new Error(result.stderr);
        }
        
        console.log('Réponse brute de ZoomEye:', result.stdout);
        setDebugInfo(prev => prev + `Réponse brute: ${result.stdout}\n\n`);
        
        let data;
        try {
          data = JSON.parse(result.stdout);
          console.log('Données parsées de ZoomEye:', data);
        } catch (parseError) {
          console.error('Erreur lors du parsing JSON:', parseError);
          console.log('Contenu non-JSON reçu:', result.stdout);
          setDebugInfo(prev => prev + `Erreur de parsing JSON: ${parseError.message}\nContenu reçu: ${result.stdout}\n\n`);
          showError(`Erreur lors du parsing de la réponse: ${parseError.message}`);
          setIsSearching(false);
          return;
        }
        
        if (data.error) {
          console.error('Erreur retournée par ZoomEye:', data.error);
          setDebugInfo(prev => prev + `Erreur API: ${data.error}\n\n`);
          throw new Error(data.error);
        }
        
        if (!data.matches) {
          console.warn('Aucun tableau "matches" dans la réponse:', data);
          setDebugInfo(prev => prev + `Format inattendu: Pas de tableau "matches" dans la réponse\nDonnées reçues: ${JSON.stringify(data, null, 2)}\n\n`);
          showWarning('Format de réponse inattendu de ZoomEye. Vérifiez les détails de débogage ci-dessous.');
        }
        
        setSearchResults(data.matches || []);
        setTotalResults(data.total || 0);
        
        if (data.matches && data.matches.length > 0) {
          showSuccess(`${data.matches.length} résultats trouvés sur un total de ${data.total}`);
          setDebugInfo(prev => prev + `Succès: ${data.matches.length} résultats trouvés sur un total de ${data.total}\n\n`);
        } else {
          console.log('Aucun résultat trouvé pour la requête:', fullQuery);
          setDebugInfo(prev => prev + `Aucun résultat trouvé pour la requête: ${fullQuery}\n\n`);
          showInfo('Aucun résultat trouvé pour cette requête');
        }
      } else {
        showError('API Electron non disponible pour exécuter la recherche');
      }
    } catch (error) {
      console.error('Erreur lors de la recherche ZoomEye:', error);
      setDebugInfo(prev => prev + `Erreur: ${error.message}\n\n`);
      showError(`Erreur lors de la recherche: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Changer de page
  const changePage = (newPage) => {
    if (newPage < 1) return;
    
    const maxPage = Math.ceil(totalResults / 20);
    if (newPage > maxPage) return;
    
    setCurrentPage(newPage);
    searchZoomEye();
  };
  
  // Exporter les résultats en JSON
  const exportResults = () => {
    if (!searchResults || searchResults.length === 0) {
      showWarning('Aucun résultat à exporter');
      return;
    }
    
    try {
      const dataStr = JSON.stringify(searchResults, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `zoomeye_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showSuccess('Résultats exportés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'exportation des résultats:', error);
      showError(`Erreur lors de l'exportation: ${error.message}`);
    }
  };
  
  // Formater l'adresse IP et le port (pour les résultats de type host)
  const formatIpPort = (result) => {
    if (searchType === 'host') {
      return `${result.ip}:${result.portinfo?.port || 'N/A'}`;
    } else {
      return result.ip || result.site || 'N/A';
    }
  };
  
  // Formater la date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp * 1000); // ZoomEye utilise des timestamps Unix
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Tronquer le texte
  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
  };
  
  return (
    <div className="zoomeye-container bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
        <FiGlobe className="mr-2" /> ZoomEye - Recherche IoT
      </h1>
      
      <div className="mb-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Recherchez des appareils IoT, serveurs et autres systèmes connectés à Internet en utilisant ZoomEye.
        </p>
        
        {/* Section de la clé API */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center">
            <FiKey className="mr-2" /> Configuration de la clé API
          </h2>
          
          <div className="flex items-center mb-4">
            <div className="flex-1 mr-4 relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Entrez votre clé API ZoomEye"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 pr-10"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                title={showApiKey ? "Masquer la clé" : "Afficher la clé"}
              >
                {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            
            <button
              onClick={saveApiKey}
              disabled={!apiKey}
              className={`px-4 py-3 rounded-md flex items-center ${
                !apiKey
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <FiSave className="mr-2" />
              Sauvegarder
            </button>
          </div>
          
          {savedApiKey && (
            <div className="text-sm text-green-600 dark:text-green-400">
              <FiInfo className="inline mr-1" /> Clé API configurée et prête à être utilisée
            </div>
          )}
          
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <FiInfo className="inline mr-1" /> Vous pouvez obtenir une clé API sur <a href="https://www.zoomeye.org/profile" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">zoomeye.org/profile</a>
          </div>
        </div>
        
        {/* Section de recherche */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Entrez votre requête ZoomEye (ex: apache country:FR)"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <button
              onClick={searchZoomEye}
              disabled={isSearching || !savedApiKey || !query}
              className={`px-4 py-3 rounded-md flex items-center ${
                isSearching || !savedApiKey || !query
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              <FiSearch className="mr-2" />
              {isSearching ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>
          
          {/* Type de recherche */}
          <div className="flex items-center mb-4">
            <span className="mr-4 text-gray-700 dark:text-gray-300">Type de recherche:</span>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-blue-600"
                  checked={searchType === 'host'}
                  onChange={() => setSearchType('host')}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Hôtes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-blue-600"
                  checked={searchType === 'web'}
                  onChange={() => setSearchType('web')}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Sites Web</span>
              </label>
            </div>
          </div>
          
          {/* Filtres avancés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Application
              </label>
              <input
                type="text"
                value={filters.app}
                onChange={(e) => setFilters({...filters, app: e.target.value})}
                placeholder="ex: Apache, Nginx"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Appareil
              </label>
              <input
                type="text"
                value={filters.device}
                onChange={(e) => setFilters({...filters, device: e.target.value})}
                placeholder="ex: router, camera"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <input
                type="text"
                value={filters.service}
                onChange={(e) => setFilters({...filters, service: e.target.value})}
                placeholder="ex: http, ftp, ssh"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Système d'exploitation
              </label>
              <input
                type="text"
                value={filters.os}
                onChange={(e) => setFilters({...filters, os: e.target.value})}
                placeholder="ex: Windows, Linux"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pays (code ISO)
              </label>
              <input
                type="text"
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value})}
                placeholder="ex: FR, US, DE"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="text"
                value={filters.port}
                onChange={(e) => setFilters({...filters, port: e.target.value})}
                placeholder="ex: 80, 443, 22"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <FiInfo className="inline mr-1" /> Exemples de requêtes: <code>app:"Apache" country:"FR"</code>, <code>port:80</code>, <code>service:"ftp"</code>
          </div>
        </div>
        
        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="results-container" ref={resultsRef}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Résultats ({searchResults.length} sur {totalResults})
              </h2>
              
              <button
                onClick={exportResults}
                className="px-3 py-2 rounded-md flex items-center bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FiDownload className="mr-2" />
                Exporter
              </button>
            </div>
            
            {/* Liste des résultats */}
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                      <FiServer className="mr-2" />
                      {formatIpPort(result)}
                    </h3>
                    <span className="text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                      {result.geoinfo?.country || 'Pays inconnu'}
                    </span>
                  </div>
                  
                  {searchType === 'host' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Service:</strong> {result.portinfo?.service || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>OS:</strong> {result.portinfo?.os || 'Non détecté'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Appareil:</strong> {result.portinfo?.device || 'Non détecté'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Dernière mise à jour:</strong> {formatDate(result.timestamp)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Ville:</strong> {result.geoinfo?.city || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>ASN:</strong> {result.geoinfo?.asn || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Site:</strong> {result.site || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Titre:</strong> {result.title || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Serveur:</strong> {result.server || 'Non détecté'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Dernière mise à jour:</strong> {formatDate(result.timestamp)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Ville:</strong> {result.geoinfo?.city || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>ASN:</strong> {result.geoinfo?.asn || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {searchType === 'host' && result.portinfo?.banner && (
                    <div className="mt-2">
                      <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-1">Bannière</h4>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
                        {truncateText(result.portinfo.banner)}
                      </pre>
                    </div>
                  )}
                  
                  {searchType === 'web' && result.raw_data && (
                    <div className="mt-2">
                      <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-1">Données brutes</h4>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
                        {truncateText(JSON.stringify(result.raw_data, null, 2))}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalResults > 0 && (
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Précédent
                </button>
                
                <span className="text-gray-700 dark:text-gray-300">
                  Page {currentPage} sur {Math.ceil(totalResults / 20)}
                </span>
                
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalResults / 20)}
                  className={`px-3 py-2 rounded-md ${
                    currentPage >= Math.ceil(totalResults / 20)
                      ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Message si aucun résultat */}
        {!isSearching && query && searchResults.length === 0 && (
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <FiInfo size={40} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              Aucun résultat trouvé pour cette requête. Essayez de modifier vos critères de recherche.
            </p>
          </div>
        )}
        
        {/* Section de débogage */}
        {debugInfo && (
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200 flex items-center">
              <FiInfo className="mr-2" /> Informations de débogage
            </h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto" style={{ maxHeight: '300px' }}>
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoomEye; 