import React, { useState, useEffect } from 'react';

const WebAlyzer = () => {
  // États pour les paramètres de scan
  const [targetUrl, setTargetUrl] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [randomUserAgent, setRandomUserAgent] = useState(false);
  
  // États pour le statut et les résultats
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [webtechInstalled, setWebtechInstalled] = useState(false);
  const [isCheckingWebtech, setIsCheckingWebtech] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [outputLog, setOutputLog] = useState([]);
  const [pythonInstalled, setPythonInstalled] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');

  // Vérifier si webtech est installé au chargement du composant
  useEffect(() => {
    const checkWebtech = async () => {
      try {
        setIsCheckingWebtech(true);
        setErrorMessage('');
        
        // Obtenir la plateforme
        const platform = await window.electronAPI.getPlatform();
        console.log('Plateforme détectée:', platform);
        
        // Commande pour vérifier l'existence de webtech
        let webtechCheckCmd = '';
        
        if (platform === 'win32') {
          // Windows
          webtechCheckCmd = '.\\env\\Scripts\\webtech --help';
        } else {
          // Linux/Mac
          webtechCheckCmd = './env/bin/webtech --help';
        }
        
        try {
          // Vérifier si webtech est disponible
          const webtechResult = await window.electronAPI.executeCommand(webtechCheckCmd);
          console.log('Résultat vérification webtech:', webtechResult);
          
          const isInstalled = webtechResult.stdout.includes('webtech') || webtechResult.stderr.includes('webtech');
          setWebtechInstalled(isInstalled);
          setPythonInstalled(true); // Si webtech est installé, Python l'est aussi
          
          if (!isInstalled) {
            setErrorMessage('webtech n\'est pas installé dans l\'environnement virtuel. Veuillez l\'installer avec "pip install webtech"');
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de webtech:', error);
          setPythonInstalled(false);
          setWebtechInstalled(false);
          setErrorMessage(`Environnement virtuel non trouvé. Veuillez créer un environnement virtuel à la racine du projet avec "python -m venv env" et installer webtech avec "pip install webtech"`);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        setErrorMessage(`Erreur lors de la vérification: ${error.message}`);
        setWebtechInstalled(false);
      } finally {
        setIsCheckingWebtech(false);
      }
    };

    checkWebtech();
    loadScanHistory();
  }, []);

  // Charger l'historique des scans
  const loadScanHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('webtech_scan_history')) || [];
      setScanHistory(history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des scans:', error);
      setScanHistory([]);
    }
  };

  // Réessayer la vérification de webtech
  const retryCheckWebtech = async () => {
    try {
      setIsCheckingWebtech(true);
      setErrorMessage('');
      
      // Obtenir la plateforme
      const platform = await window.electronAPI.getPlatform();
      
      // Commande pour vérifier l'existence de webtech
      let webtechCheckCmd = '';
      
      if (platform === 'win32') {
        // Windows
        webtechCheckCmd = '.\\env\\Scripts\\webtech --help';
      } else {
        // Linux/Mac
        webtechCheckCmd = './env/bin/webtech --help';
      }
      
      try {
        // Vérifier si webtech est disponible
        const webtechResult = await window.electronAPI.executeCommand(webtechCheckCmd);
        console.log('Résultat vérification webtech:', webtechResult);
        
        const isInstalled = webtechResult.stdout.includes('webtech') || webtechResult.stderr.includes('webtech');
        setWebtechInstalled(isInstalled);
        setPythonInstalled(true); // Si webtech est installé, Python l'est aussi
        
        if (!isInstalled) {
          setErrorMessage('webtech n\'est pas installé dans l\'environnement virtuel. Veuillez l\'installer avec "pip install webtech"');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de webtech:', error);
        setPythonInstalled(false);
        setWebtechInstalled(false);
        setErrorMessage(`Environnement virtuel non trouvé. Veuillez créer un environnement virtuel à la racine du projet avec "python -m venv env" et installer webtech avec "pip install webtech"`);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setErrorMessage(`Erreur lors de la vérification: ${error.message}`);
      setWebtechInstalled(false);
    } finally {
      setIsCheckingWebtech(false);
    }
  };

  // Rendu des instructions d'installation de webtech
  const renderWebtechInstructions = () => {
    return (
      <div className="webtech-instructions bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-yellow-800 dark:text-yellow-100">Installation de webtech requise</h3>
        
        {!pythonInstalled && (
          <div className="installation-step mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">1. Installer Python</h4>
            <p className="mb-2 text-gray-700 dark:text-gray-300">webtech nécessite Python pour fonctionner. Téléchargez et installez Python depuis <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">python.org</a>.</p>
          </div>
        )}
        
        <div className="installation-step mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">{pythonInstalled ? '1' : '2'}. Créer un environnement virtuel</h4>
          <p className="mb-2 text-gray-700 dark:text-gray-300">Créez un environnement virtuel à la racine du projet :</p>
          
          <div className="installation-option mb-3">
            <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Windows</h5>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 overflow-x-auto">python -m venv env</pre>
          </div>
          
          <div className="installation-option mb-3">
            <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Linux/Mac</h5>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 overflow-x-auto">python3 -m venv env</pre>
          </div>
        </div>
        
        <div className="installation-step mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">{pythonInstalled ? '2' : '3'}. Installer webtech dans l'environnement virtuel</h4>
          
          <div className="installation-option mb-3">
            <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Windows</h5>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 overflow-x-auto">.\\env\\Scripts\\pip install webtech</pre>
          </div>
          
          <div className="installation-option mb-3">
            <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Linux/Mac</h5>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 overflow-x-auto">./env/bin/pip install webtech</pre>
          </div>
        </div>
        
        <button 
          className="retry-button bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          onClick={retryCheckWebtech}
          disabled={isCheckingWebtech}
        >
          {isCheckingWebtech ? 'Vérification...' : 'Vérifier à nouveau'}
        </button>
      </div>
    );
  };

  return (
    <div className="webalyzer bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg shadow-md">
      <h1 className="page-title text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">WebAlyzer - Analyseur de Technologies Web</h1>
      
      {isCheckingWebtech ? (
        <div className="loading text-center py-4">Vérification de l'installation de webtech...</div>
      ) : !webtechInstalled ? (
        renderWebtechInstructions()
      ) : (
        <div className="webalyzer-content flex flex-col md:flex-row gap-4">
          <div className="webalyzer-main w-full md:w-2/3">
            {/* Formulaire de scan */}
            <div className="scan-form bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Paramètres de scan</h2>
              
              <div className="form-group mb-4">
                <label htmlFor="targetUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL cible <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="targetUrl"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://exemple.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  L'URL complète du site à analyser
                </p>
              </div>
              
              <div className="form-group mb-4">
                <label htmlFor="userAgent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Agent utilisateur
                </label>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="randomUserAgent"
                    checked={randomUserAgent}
                    onChange={(e) => {
                      setRandomUserAgent(e.target.checked);
                      if (e.target.checked) {
                        setUserAgent('');
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="randomUserAgent" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Utiliser un agent utilisateur aléatoire
                  </label>
                </div>
                <input
                  type="text"
                  id="userAgent"
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={randomUserAgent}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Agent utilisateur personnalisé pour les requêtes
                </p>
              </div>
              
              <div className="form-group mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Format d'exportation
                </label>
                <div className="flex flex-wrap gap-3">
                  {['json', 'xml', 'html'].map((format) => (
                    <div key={format} className="flex items-center">
                      <input
                        type="radio"
                        id={`format-${format}`}
                        name="exportFormat"
                        value={format}
                        checked={exportFormat === format}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor={`format-${format}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        {format.toUpperCase()}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Format pour l'exportation des résultats
                </p>
              </div>
              
              <div className="form-actions mt-6">
                <button
                  onClick={() => {/* Fonction de scan à implémenter */}}
                  disabled={!targetUrl || isScanning}
                  className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed mr-3"
                >
                  {isScanning ? 'Scan en cours...' : 'Lancer le scan'}
                </button>
                
                <button
                  onClick={() => {
                    setTargetUrl('');
                    setUserAgent('');
                    setRandomUserAgent(false);
                    setExportFormat('json');
                  }}
                  disabled={isScanning}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
            
            {/* Résultats du scan */}
            <div className="scan-results bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Résultats du scan</h2>
              
              {scanStatus && (
                <div className={`scan-status mb-4 p-3 rounded ${
                  scanStatus === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                    : scanStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                }`}>
                  {scanStatus === 'success' 
                    ? 'Scan terminé avec succès!' 
                    : scanStatus === 'error'
                    ? 'Erreur lors du scan. Veuillez vérifier les paramètres et réessayer.'
                    : 'Scan en cours...'}
                </div>
              )}
              
              {/* Logs de sortie */}
              {outputLog.length > 0 && (
                <div className="output-log mb-4">
                  <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Logs</h3>
                  <div className="log-container bg-gray-100 dark:bg-gray-700 p-3 rounded-md max-h-60 overflow-y-auto font-mono text-sm">
                    {outputLog.map((log, index) => (
                      <div key={index} className="log-line">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Résultats formatés */}
              {scanResults && (
                <div className="formatted-results">
                  <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Technologies détectées</h3>
                  <div className="results-container">
                    {/* Contenu des résultats à implémenter */}
                    <p className="text-gray-500 dark:text-gray-400 italic">Les résultats seront affichés ici après le scan.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="webalyzer-sidebar w-full md:w-1/3">
            {/* Historique des scans */}
            <div className="scan-history bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Historique des scans</h2>
              
              {scanHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">Aucun scan effectué.</p>
              ) : (
                <ul className="history-list divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Liste des scans à implémenter */}
                  <li className="py-3 flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400 italic">Historique à implémenter</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebAlyzer;
