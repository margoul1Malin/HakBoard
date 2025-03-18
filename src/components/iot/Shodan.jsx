import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiGlobe, FiServer, FiInfo, FiAlertTriangle, FiDownload, FiSave, FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';
import { apiKeysService } from '../../services/apiKeysService';

const Shodan = () => {
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
  const [filters, setFilters] = useState({
    country: '',
    port: '',
    os: '',
    hostname: '',
  });
  
  // Référence pour le conteneur de résultats
  const resultsRef = useRef(null);
  
  // Charger la clé API sauvegardée au démarrage
  useEffect(() => {
    const loadSavedApiKey = async () => {
      try {
        console.log('[Shodan] Tentative de chargement de la clé API Shodan');
        
        // Utiliser la méthode asynchrone
        const savedKey = await apiKeysService.getKey('shodan');
        console.log('[Shodan] Clé Shodan récupérée:', savedKey ? 'Oui' : 'Non');
        
        if (savedKey) {
          setSavedApiKey(savedKey);
          setApiKey(savedKey);
          showInfo('Clé API Shodan chargée');
        } else {
          console.log('[Shodan] Aucune clé API Shodan trouvée');
        }
      } catch (error) {
        console.error('[Shodan] Erreur lors du chargement de la clé API Shodan:', error);
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
      console.log('[Shodan] Tentative de sauvegarde de la clé API Shodan');
      const success = await apiKeysService.saveKey('shodan', apiKey);
      
      if (success) {
        console.log('[Shodan] Clé API Shodan sauvegardée avec succès');
        setSavedApiKey(apiKey);
        showSuccess('Clé API Shodan sauvegardée avec succès');
        
        // Vérifier que la clé a bien été sauvegardée
        const verification = await apiKeysService.getKey('shodan');
        console.log('[Shodan] Vérification après sauvegarde:', verification === apiKey ? 'OK' : 'ÉCHEC');
      } else {
        throw new Error('Échec de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la clé API Shodan:', error);
      showError(`Erreur lors de la sauvegarde: ${error.message}`);
    }
  };
  
  // Effectuer une recherche Shodan
  const searchShodan = async () => {
    if (!savedApiKey) {
      showWarning('Veuillez d\'abord sauvegarder une clé API Shodan');
      return;
    }
    
    if (!query) {
      showWarning('Veuillez entrer une requête de recherche');
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Construire la requête avec les filtres
      let fullQuery = query;
      
      if (filters.country) {
        fullQuery += ` country:"${filters.country}"`;
      }
      
      if (filters.port) {
        fullQuery += ` port:${filters.port}`;
      }
      
      if (filters.os) {
        fullQuery += ` os:"${filters.os}"`;
      }
      
      if (filters.hostname) {
        fullQuery += ` hostname:"${filters.hostname}"`;
      }
      
      // Utiliser le module shodan-client via Electron
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const command = `node -e "
          const shodan = require('shodan-client');
          
          async function search() {
            try {
              const searchOptions = {
                query: '${fullQuery.replace(/"/g, '\\"')}',
                page: ${currentPage},
                minify: false
              };
              
              const result = await shodan.search('${savedApiKey}', searchOptions);
              console.log(JSON.stringify(result));
            } catch (error) {
              console.error(JSON.stringify({ error: error.message }));
              process.exit(1);
            }
          }
          
          search();
        "`;
        
        const result = await window.electronAPI.executeCommand(command);
        
        if (result.stderr && result.stderr.includes('error')) {
          throw new Error(result.stderr);
        }
        
        const data = JSON.parse(result.stdout);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setSearchResults(data.matches || []);
        setTotalResults(data.total || 0);
        
        if (data.matches && data.matches.length > 0) {
          showSuccess(`${data.matches.length} résultats trouvés sur un total de ${data.total}`);
        } else {
          showInfo('Aucun résultat trouvé pour cette requête');
        }
      } else {
        showError('API Electron non disponible pour exécuter la recherche');
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Shodan:', error);
      showError(`Erreur lors de la recherche: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Changer de page
  const changePage = (newPage) => {
    if (newPage < 1) return;
    
    const maxPage = Math.ceil(totalResults / 10);
    if (newPage > maxPage) return;
    
    setCurrentPage(newPage);
    searchShodan();
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
      
      const exportFileDefaultName = `shodan_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      
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
  
  // Formater l'adresse IP et le port
  const formatIpPort = (result) => {
    return `${result.ip_str}:${result.port}`;
  };
  
  // Formater la date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Tronquer le texte
  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
  };
  
  return (
    <div className="shodan-container bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
        <FiGlobe className="mr-2" /> Shodan - Recherche IoT
      </h1>
      
      <div className="mb-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Recherchez des appareils IoT, serveurs et autres systèmes connectés à Internet en utilisant Shodan.
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
                placeholder="Entrez votre clé API Shodan"
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
            <FiInfo className="inline mr-1" /> Vous pouvez obtenir une clé API gratuite sur <a href="https://account.shodan.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">account.shodan.io</a>
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
                placeholder="Entrez votre requête Shodan (ex: apache country:fr)"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <button
              onClick={searchShodan}
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
          
          {/* Filtres avancés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                Nom d'hôte
              </label>
              <input
                type="text"
                value={filters.hostname}
                onChange={(e) => setFilters({...filters, hostname: e.target.value})}
                placeholder="ex: example.com"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <FiInfo className="inline mr-1" /> Exemples de requêtes: <code>apache country:fr</code>, <code>webcam</code>, <code>port:22 country:de</code>
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
                      {result.location?.country_name || 'Pays inconnu'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Hôte:</strong> {result.hostnames?.join(', ') || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Organisation:</strong> {result.org || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>OS:</strong> {result.os || 'Non détecté'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Dernière mise à jour:</strong> {formatDate(result.timestamp)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>ASN:</strong> {result.asn || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Produit:</strong> {result.product || 'Non détecté'}
                      </p>
                    </div>
                  </div>
                  
                  {result.data && (
                    <div className="mt-2">
                      <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-1">Données</h4>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
                        {truncateText(result.data)}
                      </pre>
                    </div>
                  )}
                  
                  {result.vulns && Object.keys(result.vulns).length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-md font-medium text-red-600 dark:text-red-400 flex items-center mb-1">
                        <FiAlertTriangle className="mr-1" /> Vulnérabilités
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(result.vulns).map((vuln, i) => (
                          <span key={i} className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs px-2 py-1 rounded">
                            {vuln}
                          </span>
                        ))}
                      </div>
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
                  Page {currentPage} sur {Math.ceil(totalResults / 10)}
                </span>
                
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalResults / 10)}
                  className={`px-3 py-2 rounded-md ${
                    currentPage >= Math.ceil(totalResults / 10)
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
      </div>
    </div>
  );
};

export default Shodan; 