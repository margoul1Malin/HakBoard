import React, { useState, useEffect } from 'react';
import { FiUpload, FiSearch, FiLink, FiHash, FiAlertTriangle, FiCheckCircle, FiInfo, FiSave } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';
import { virusTotalService } from '../../services/virusTotalService';

const VirusTotal = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  
  // États
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchType, setSearchType] = useState('file'); // 'file', 'url', 'hash'
  const [searchValue, setSearchValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Effet pour charger la clé API sauvegardée
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        console.log('[VirusTotal] Chargement de la clé API');
        const savedApiKey = await virusTotalService.getApiKey();
        console.log('[VirusTotal] Clé API récupérée:', savedApiKey ? 'Oui' : 'Non');
        
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
      } catch (error) {
        console.error('[VirusTotal] Erreur lors du chargement de la clé API:', error);
      }
    };
    
    loadApiKey();
  }, []);

  // Fonction pour gérer la sélection de fichier
  const handleFileSelect = async () => {
    try {
      const result = await window.electronAPI.showOpenFileDialog({
        title: 'Sélectionner un fichier à analyser',
        filters: [{ name: 'Tous les fichiers', extensions: ['*'] }]
      });
      
      if (result.success) {
        setSelectedFile(result.filePath);
        setSearchValue(result.filePath);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      showError('Erreur lors de la sélection du fichier');
    }
  };
  
  // Fonction pour calculer le hash d'un fichier
  const calculateFileHash = async (filePath) => {
    try {
      const result = await window.electronAPI.executeCommand(`sha256sum "${filePath}"`);
      return result.stdout.split(' ')[0];
    } catch (error) {
      throw new Error('Erreur lors du calcul du hash du fichier');
    }
  };
  
  // Mettre à jour la clé API
  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
  };
  
  // Sauvegarder la clé API
  const saveApiKey = async () => {
    try {
      console.log('[VirusTotal] Sauvegarde de la clé API');
      const success = await virusTotalService.setApiKey(apiKey);
      
      if (success) {
        console.log('[VirusTotal] Clé API sauvegardée avec succès');
        showSuccess('Clé API sauvegardée avec succès!');
      } else {
        console.log('[VirusTotal] Échec de la sauvegarde de la clé API');
        showError('Échec de la sauvegarde de la clé API');
      }
    } catch (error) {
      console.error('[VirusTotal] Erreur lors de la sauvegarde de la clé API:', error);
      showError('Erreur lors de la sauvegarde de la clé API');
    }
  };
  
  // Fonction pour analyser avec VirusTotal
  const analyze = async () => {
    if (!apiKey) {
      showError('Veuillez entrer votre clé API VirusTotal');
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      let analysisResults;

      switch (searchType) {
        case 'file':
          if (!selectedFile) {
            throw new Error('Veuillez sélectionner un fichier');
          }
          analysisResults = await virusTotalService.scanFile(selectedFile);
          break;

        case 'url':
          if (!searchValue) {
            throw new Error('Veuillez entrer une URL');
          }
          analysisResults = await virusTotalService.scanUrl(searchValue);
          break;

        case 'hash':
          if (!searchValue) {
            throw new Error('Veuillez entrer un hash');
          }
          analysisResults = await virusTotalService.getFileReport(searchValue);
          break;
      }

      setResults(formatResults(analysisResults));
      showSuccess('Analyse terminée');

    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour formater les résultats
  const formatResults = (data) => {
    if (!data) return null;
    
    // Valeurs par défaut pour éviter les erreurs
    const scans = data.scans ? Object.entries(data.scans).map(([name, result]) => ({
      name,
      detected: result.detected || false,
      version: result.version || 'N/A',
      result: result.result || 'N/A',
      update: result.update || 'N/A'
    })) : [];
    
    return {
      scanId: data.scan_id || 'N/A',
      resource: data.resource || 'N/A',
      url: data.url || 'N/A',
      positives: data.positives || 0,
      total: data.total || 0,
      scanDate: data.scan_date || new Date().toISOString(),
      permalink: data.permalink || '#',
      scans: scans
    };
  };

  // Mise à jour du rendu des résultats
  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Résultats de l'analyse
        </h3>

        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-medium">
                Détections: {results.positives}/{results.total}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(results.scanDate).toLocaleString()}
              </span>
            </div>
            <a
              href={results.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Voir le rapport complet
            </a>
          </div>

          <div className="space-y-2">
            {results.scans.map((scan) => (
              <div
                key={scan.name}
                className={`p-2 rounded-md ${
                  scan.detected
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : 'bg-green-100 dark:bg-green-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{scan.name}</span>
                  <span className={scan.detected ? 'text-red-600' : 'text-green-600'}>
                    {scan.detected ? 'Détecté' : 'Clean'}
                  </span>
                </div>
                {scan.detected && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {scan.result}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Version: {scan.version} (Mise à jour: {scan.update})
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">
        VirusTotal - Analyse de Sécurité
      </h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        {/* Configuration API */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Configuration API
          </h2>
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-4">
              <input
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Clé API VirusTotal"
                className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                onClick={saveApiKey}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center"
              >
                <FiSave className="mr-2" /> Sauvegarder
              </button>
            </div>
            <div className="flex justify-between">
              <a
                href="https://www.virustotal.com/gui/join-us"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-sm"
              >
                Obtenir une clé API
              </a>
            </div>
          </div>
        </div>
        
        {/* Type d'analyse */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Type d'analyse
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setSearchType('file')}
              className={`px-4 py-2 rounded-md flex items-center ${
                searchType === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <FiUpload className="mr-2" /> Fichier
            </button>
            <button
              onClick={() => setSearchType('url')}
              className={`px-4 py-2 rounded-md flex items-center ${
                searchType === 'url'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <FiLink className="mr-2" /> URL
            </button>
            <button
              onClick={() => setSearchType('hash')}
              className={`px-4 py-2 rounded-md flex items-center ${
                searchType === 'hash'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <FiHash className="mr-2" /> Hash
            </button>
          </div>
        </div>
        
        {/* Zone de recherche */}
        <div className="mb-6">
          {searchType === 'file' ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleFileSelect}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
              >
                <FiUpload className="mr-2" /> Sélectionner un fichier
              </button>
              {selectedFile && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFile.split('/').pop()}
                </span>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={
                searchType === 'url'
                  ? 'Entrez une URL à analyser'
                  : 'Entrez un hash SHA-256, SHA-1 ou MD5'
              }
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          )}
        </div>
        
        {/* Bouton d'analyse */}
        <button
          onClick={analyze}
          disabled={isLoading || !apiKey}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center disabled:opacity-50"
        >
          <FiSearch className="mr-2" />
          {isLoading ? 'Analyse en cours...' : 'Analyser'}
        </button>
        
        {renderResults()}
      </div>
    </div>
  );
};

export default VirusTotal; 