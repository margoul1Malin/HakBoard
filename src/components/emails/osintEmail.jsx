import React, { useState, useEffect } from 'react';
import { FiSearch, FiMail, FiGlobe, FiAlertTriangle, FiSave, FiTrash2, FiDownload, FiCopy, FiUser } from 'react-icons/fi';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';

const OsintEmail = () => {
  // Contexte de notification
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États pour les paramètres de recherche
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hunterApiKey, setHunterApiKey] = useState('');
  const [leakCheckApiKey, setLeakCheckApiKey] = useState('');
  const [searchType, setSearchType] = useState('domain'); // 'domain', 'email' ou 'finder'
  
  // États pour les résultats
  const [domainResults, setDomainResults] = useState(null);
  const [emailResults, setEmailResults] = useState(null);
  const [finderResults, setFinderResults] = useState(null);
  const [breachResults, setBreachResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // État pour l'historique des recherches
  const [searchHistory, setSearchHistory] = useState([]);
  
  // Fonction pour effectuer des requêtes HTTP via l'API Electron
  const proxyRequest = async (url, headers = {}, method = 'GET', data = null) => {
    if (!window.electronAPI || !window.electronAPI.executeCommand) {
      throw new Error("L'API Electron n'est pas disponible");
    }
    
    // Construire la commande curl
    let curlCommand = `curl -s`;
    
    if (method === 'POST') {
      curlCommand += ` -X POST`;
      
      // Ajouter les données pour POST
      if (data) {
        const dataString = Object.entries(data)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        curlCommand += ` -d "${dataString}"`;
      }
    }
    
    // Ajouter les en-têtes
    Object.entries(headers).forEach(([key, value]) => {
      curlCommand += ` -H "${key}: ${value}"`;
    });
    
    // Ajouter l'URL
    curlCommand += ` "${url}"`;
    
    try {
      const { stdout, stderr } = await window.electronAPI.executeCommand(curlCommand);
      
      if (stderr && stderr.trim() !== '') {
        throw new Error(stderr);
      }
      
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Erreur lors de la requête HTTP:', error);
      throw error;
    }
  };
  
  // Recherche avec LeakCheck via Python
  const searchWithLeakCheck = async (emailToSearch, apiKey) => {
    try {
      // Obtenir la plateforme
      const platform = await window.electronAPI.getPlatform();
      console.log('Plateforme détectée pour LeakCheck:', platform);
      
      // Construire la commande en fonction de la plateforme
      let cmd;
      if (platform === 'win32') {
        // Utiliser PowerShell pour Windows
        cmd = `powershell -Command "& {.\\env\\Scripts\\python .\\src\\scripts\\emails\\win_leakcheck.py '${emailToSearch}' '${apiKey}'}"`;
      } else if (platform === 'darwin') {
        // macOS
        cmd = `./env/bin/python ./src/scripts/emails/mac_leakcheck.py '${emailToSearch}' '${apiKey}'`;
      } else {
        // Linux et autres
        cmd = `./env/bin/python ./src/scripts/emails/linux_leakcheck.py '${emailToSearch}' '${apiKey}'`;
      }
      
      // Masquer la clé API dans les logs
      console.log('Exécution de la commande (sans la clé API):', cmd.replace(apiKey, '***API_KEY***'));
      
      // Exécuter la commande
      const result = await window.electronAPI.executeCommand(cmd);
      
      if (result.stderr && result.stderr.trim() !== '') {
        console.error('Erreur stderr:', result.stderr);
        throw new Error(result.stderr);
      }
      
      // Analyser la sortie JSON
      console.log('Sortie brute:', result.stdout);
      let leakCheckResponse;
      
      try {
        // Analyser chaque ligne de la sortie pour trouver des objets JSON
        const lines = result.stdout.trim().split('\n');
        let infoMessage = null;
        let dataResponse = null;
        
        for (const line of lines) {
          try {
            const parsedLine = JSON.parse(line);
            
            // Si la ligne contient un message d'information
            if (parsedLine.info) {
              infoMessage = parsedLine.info;
              console.log('Message d\'information LeakCheck:', infoMessage);
              // Afficher une notification pour informer l'utilisateur
              if (infoMessage.includes('API publique')) {
                showInfo('Utilisation de l\'API publique LeakCheck (gratuite) car le plan payant est requis pour l\'API privée.');
              }
            } else {
              // Sinon, c'est probablement la réponse principale
              dataResponse = parsedLine;
            }
          } catch (e) {
            console.warn('Ligne non-JSON ignorée:', line);
          }
        }
        
        // Utiliser la réponse de données si disponible
        leakCheckResponse = dataResponse;
      } catch (parseError) {
        console.error('Erreur lors de l\'analyse JSON:', parseError);
        console.error('Contenu brut:', result.stdout);
        throw new Error(`Erreur lors de l'analyse de la réponse: ${parseError.message}`);
      }
      
      if (leakCheckResponse && leakCheckResponse.error) {
        // Vérifier si l'erreur est liée à un plan actif requis
        if (leakCheckResponse.error.includes("Active plan required")) {
          throw new Error("Cette fonctionnalité nécessite un plan payant LeakCheck. Le plan gratuit ne permet pas la recherche par email.");
        }
        throw new Error(leakCheckResponse.error);
      }
      
      return leakCheckResponse;
    } catch (error) {
      console.error('Erreur lors de la recherche avec LeakCheck:', error);
      throw error;
    }
  };
  
  // Charger les clés API et l'historique depuis le localStorage au chargement
  useEffect(() => {
    const savedHunterKey = localStorage.getItem('hunter_api_key');
    const savedLeakCheckKey = localStorage.getItem('leakcheck_api_key');
    const savedHistory = JSON.parse(localStorage.getItem('osint_email_history')) || [];
    
    if (savedHunterKey) setHunterApiKey(savedHunterKey);
    if (savedLeakCheckKey) setLeakCheckApiKey(savedLeakCheckKey);
    setSearchHistory(savedHistory);
    
    // Tester l'API Electron
    testElectronAPI();
  }, []);
  
  // Fonction de test pour l'API Electron
  const testElectronAPI = async () => {
    try {
      console.log('Test de l\'API Electron...');
      
      // Vérifier si l'API Electron est disponible
      if (!window.electronAPI || !window.electronAPI.executeCommand) {
        console.error('L\'API Electron n\'est pas disponible');
        showError('L\'API Electron n\'est pas disponible');
        return;
      }
      
      // Tester une commande simple
      const platform = await window.electronAPI.getPlatform();
      console.log('Plateforme détectée:', platform);
      
      // Commande de test en fonction de la plateforme
      const cmd = platform === 'win32' ? 'echo "Test réussi"' : 'echo "Test réussi"';
      
      console.log('Exécution de la commande de test:', cmd);
      const result = await window.electronAPI.executeCommand(cmd);
      
      console.log('Résultat de la commande de test:', result);
      
      if (result.stderr && result.stderr.trim() !== '') {
        console.error('Erreur lors du test de l\'API Electron:', result.stderr);
        showError('Erreur lors du test de l\'API Electron');
      } else {
        console.log('Test de l\'API Electron réussi:', result.stdout);
        showSuccess('Test de l\'API Electron réussi');
      }
    } catch (error) {
      console.error('Erreur lors du test de l\'API Electron:', error);
      showError(`Erreur lors du test de l\'API Electron: ${error.message}`);
    }
  };
  
  // Sauvegarder les clés API dans le localStorage
  const saveApiKeys = () => {
    localStorage.setItem('hunter_api_key', hunterApiKey);
    localStorage.setItem('leakcheck_api_key', leakCheckApiKey);
    showSuccess('Clés API sauvegardées avec succès!');
  };
  
  // Recherche de domaine avec Hunter.io
  const searchDomain = async () => {
    if (!domain || !hunterApiKey) {
      setError('Veuillez entrer un domaine et une clé API Hunter.io');
      showWarning('Veuillez entrer un domaine et une clé API Hunter.io');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setDomainResults(null);
    
    try {
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterApiKey}`;
      const response = await proxyRequest(url);
      
      if (response.errors) {
        throw new Error(response.errors[0].details || 'Erreur lors de la recherche du domaine');
      }
      
      setDomainResults(response.data);
      
      // Ajouter à l'historique
      const searchItem = {
        id: `domain_${Date.now()}`,
        type: 'domain',
        query: domain,
        timestamp: new Date().toISOString(),
        results: response.data
      };
      
      const updatedHistory = [searchItem, ...searchHistory].slice(0, 20);
      setSearchHistory(updatedHistory);
      localStorage.setItem('osint_email_history', JSON.stringify(updatedHistory));
      
    } catch (error) {
      console.error('Erreur lors de la recherche du domaine:', error);
      setError(`Erreur: ${error.message}`);
      showError(`Erreur lors de la recherche du domaine: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Recherche d'email avec Hunter.io et LeakCheck
  const searchEmail = async () => {
    if (!email) {
      setError('Veuillez entrer un email');
      showWarning('Veuillez entrer un email');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setEmailResults(null);
    setBreachResults(null);
    
    let hunterSuccess = false;
    let leakCheckSuccess = false;
    
    // Recherche avec Hunter.io si une clé API est fournie
    if (hunterApiKey) {
      try {
        showInfo('Vérification de l\'email avec Hunter.io...');
        const hunterUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterApiKey}`;
        const hunterResponse = await proxyRequest(hunterUrl);
        
        if (hunterResponse.errors) {
          throw new Error(hunterResponse.errors[0].details || 'Erreur lors de la vérification de l\'email');
        }
        
        setEmailResults(hunterResponse.data);
        hunterSuccess = true;
        showSuccess('Vérification de l\'email terminée avec succès');
      } catch (hunterError) {
        console.error('Erreur lors de la vérification de l\'email avec Hunter.io:', hunterError);
        setError(`Erreur Hunter.io: ${hunterError.message}`);
        showError(`Erreur lors de la vérification de l'email: ${hunterError.message}`);
      }
    } else {
      showWarning('Aucune clé API Hunter.io fournie. La vérification d\'email ne sera pas effectuée.');
    }
    
    // Recherche avec LeakCheck si une clé API est fournie
    if (leakCheckApiKey) {
      try {
        showInfo('Recherche de fuites de données avec LeakCheck...');
        const leakCheckResponse = await searchWithLeakCheck(email, leakCheckApiKey);
        
        // Formater les résultats pour l'affichage
        const leakCheckResults = Array.isArray(leakCheckResponse) 
          ? leakCheckResponse.map(item => ({
              sources: item.sources || 'Source inconnue',
              line: item.line || 'N/A',
              password: item.password || null,
              is_public_api: item.is_public_api || false,
              ...item
            }))
          : [];
        
        setBreachResults(leakCheckResults);
        leakCheckSuccess = true;
        
        // Vérifier si les résultats proviennent de l'API publique
        const isPublicApi = leakCheckResults.length > 0 && leakCheckResults[0].is_public_api;
        
        if (isPublicApi) {
          showSuccess(`${leakCheckResults.length} fuite(s) de données trouvée(s) via l'API publique LeakCheck`);
        } else {
          showSuccess(`${leakCheckResults.length} fuite(s) de données trouvée(s)`);
        }
        
        // Ajouter à l'historique seulement si LeakCheck a réussi
        if (leakCheckSuccess) {
          const searchItem = {
            id: `leakcheck_${Date.now()}`,
            type: 'email',
            query: email,
            timestamp: new Date().toISOString(),
            results: {
              hunter: emailResults,
              breaches: leakCheckResults
            }
          };
          
          const updatedHistory = [searchItem, ...searchHistory].slice(0, 20);
          setSearchHistory(updatedHistory);
          localStorage.setItem('osint_email_history', JSON.stringify(updatedHistory));
        }
      } catch (leakCheckError) {
        console.error('Erreur lors de la recherche de fuites:', leakCheckError);
        
        // Vérifier si l'erreur est liée à un plan actif requis
        if (leakCheckError.message.includes("plan payant")) {
          setError(`Erreur LeakCheck: ${leakCheckError.message}`);
          showError(`LeakCheck nécessite un plan payant pour cette fonctionnalité. Le plan gratuit ne permet pas la recherche par email.`);
          // Afficher un résultat vide mais avec un message explicatif
          setBreachResults([]);
        } else {
          setError(`Erreur LeakCheck: ${leakCheckError.message}`);
          showError(`Erreur lors de la recherche de fuites: ${leakCheckError.message}`);
          setBreachResults([]);
        }
      }
    } else {
      showWarning('Aucune clé API LeakCheck fournie. La recherche de fuites ne sera pas effectuée.');
    }
    
    // Ajouter à l'historique si Hunter.io a réussi
    if (hunterSuccess) {
      const searchItem = {
        id: `email_${Date.now()}`,
        type: 'email',
        query: email,
        timestamp: new Date().toISOString(),
        results: {
          hunter: emailResults,
          breaches: breachResults || []
        }
      };
      
      const updatedHistory = [searchItem, ...searchHistory].slice(0, 20);
      setSearchHistory(updatedHistory);
      localStorage.setItem('osint_email_history', JSON.stringify(updatedHistory));
    }
    
    // Si aucun service n'a réussi, afficher un message d'erreur
    if (!hunterSuccess && !leakCheckSuccess) {
      setError('Aucune recherche n\'a pu être effectuée. Veuillez vérifier vos clés API et réessayer.');
      showError('Aucune recherche n\'a pu être effectuée. Veuillez vérifier vos clés API et réessayer.');
    }
    
    setIsLoading(false);
  };
  
  // Recherche d'email par nom et domaine avec Hunter.io
  const searchEmailFinder = async () => {
    if (!domain || !firstName || !lastName || !hunterApiKey) {
      setError('Veuillez entrer un domaine, un prénom, un nom et une clé API Hunter.io');
      showWarning('Veuillez entrer un domaine, un prénom, un nom et une clé API Hunter.io');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setFinderResults(null);
    
    try {
      const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${hunterApiKey}`;
      const response = await proxyRequest(url);
      
      if (response.errors) {
        throw new Error(response.errors[0].details || 'Erreur lors de la recherche de l\'email');
      }
      
      setFinderResults(response.data);
      
      // Ajouter à l'historique
      const searchItem = {
        id: `finder_${Date.now()}`,
        type: 'finder',
        query: `${firstName} ${lastName} @ ${domain}`,
        timestamp: new Date().toISOString(),
        results: response.data
      };
      
      const updatedHistory = [searchItem, ...searchHistory].slice(0, 20);
      setSearchHistory(updatedHistory);
      localStorage.setItem('osint_email_history', JSON.stringify(updatedHistory));
      
    } catch (error) {
      console.error('Erreur lors de la recherche de l\'email:', error);
      setError(`Erreur: ${error.message}`);
      showError(`Erreur lors de la recherche de l'email: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Charger une recherche depuis l'historique
  const loadFromHistory = (item) => {
    if (item.type === 'domain') {
      setDomain(item.query);
      setSearchType('domain');
      setDomainResults(item.results);
      setEmailResults(null);
      setFinderResults(null);
      setBreachResults(null);
    } else if (item.type === 'email') {
      setEmail(item.query);
      setSearchType('email');
      setEmailResults(item.results.hunter);
      setBreachResults(item.results.breaches);
      setDomainResults(null);
      setFinderResults(null);
    } else if (item.type === 'finder') {
      // Extraire les informations de la requête (format: "prénom nom @ domaine")
      const parts = item.query.split(' @ ');
      if (parts.length === 2) {
        const nameParts = parts[0].split(' ');
        if (nameParts.length >= 2) {
          setFirstName(nameParts[0]);
          setLastName(nameParts.slice(1).join(' '));
          setDomain(parts[1]);
          setSearchType('finder');
          setFinderResults(item.results);
          setDomainResults(null);
          setEmailResults(null);
          setBreachResults(null);
        }
      }
    }
  };
  
  // Supprimer une recherche de l'historique
  const deleteFromHistory = (id, e) => {
    e.stopPropagation();
    const updatedHistory = searchHistory.filter(item => item.id !== id);
    setSearchHistory(updatedHistory);
    localStorage.setItem('osint_email_history', JSON.stringify(updatedHistory));
    showInfo('Recherche supprimée de l\'historique');
  };
  
  // Effacer tout l'historique
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('osint_email_history');
    showInfo('Historique de recherche effacé');
  };
  
  // Exporter les résultats en JSON
  const exportResults = (data, filename = 'osint_results.json') => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('Résultats exportés avec succès');
  };
  
  // Copier dans le presse-papier
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showSuccess('Copié dans le presse-papier!');
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
      showError('Erreur lors de la copie dans le presse-papier');
    });
  };
  
  // Rendu des résultats de domaine
  const renderDomainResults = () => {
    if (!domainResults) return null;
    
    return (
      <div className="domain-results bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Résultats pour {domainResults.domain}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportResults(domainResults, `domain_${domainResults.domain}.json`)}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
              title="Exporter en JSON"
            >
              <FiDownload size={18} />
            </button>
          </div>
        </div>
        
        <div className="domain-info mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded">
          <p className="mb-2">
            <span className="font-medium">Organisation:</span> {domainResults.organization || 'Non disponible'}
          </p>
          <p className="mb-2">
            <span className="font-medium">Emails trouvés:</span> {domainResults.emails?.length || 0}
          </p>
          {domainResults.pattern && (
            <p className="mb-2">
              <span className="font-medium">Format d'email:</span> {domainResults.pattern}
            </p>
          )}
        </div>
        
        {domainResults.emails && domainResults.emails.length > 0 && (
          <div className="emails-list">
            <h4 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Emails trouvés</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {domainResults.emails.map((emailData, index) => (
                <div key={index} className="email-card bg-gray-50 dark:bg-gray-700 p-3 rounded shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">{emailData.value}</p>
                      {emailData.first_name && emailData.last_name && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {emailData.first_name} {emailData.last_name}
                        </p>
                      )}
                      {emailData.position && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {emailData.position}
                        </p>
                      )}
                      <div className="mt-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          emailData.confidence > 75 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          emailData.confidence > 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          Confiance: {emailData.confidence}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(emailData.value)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Copier l'email"
                    >
                      <FiCopy size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Rendu des résultats d'email
  const renderEmailResults = () => {
    if (!emailResults) return null;
    
    return (
      <div className="email-results bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Vérification de {emailResults.email}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportResults(emailResults, `email_${emailResults.email}.json`)}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
              title="Exporter en JSON"
            >
              <FiDownload size={18} />
            </button>
          </div>
        </div>
        
        <div className="email-info mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2">
                <span className="font-medium">Statut:</span>{' '}
                <span className={`px-2 py-1 rounded-full text-sm ${
                  emailResults.status === 'valid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  emailResults.status === 'invalid' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {emailResults.status === 'valid' ? 'Valide' : 
                   emailResults.status === 'invalid' ? 'Invalide' : 'Incertain'}
                </span>
              </p>
              <p className="mb-2">
                <span className="font-medium">Score:</span> {emailResults.score}
              </p>
              {emailResults.domain && (
                <p className="mb-2">
                  <span className="font-medium">Domaine:</span> {emailResults.domain}
                </p>
              )}
            </div>
            <div>
              {emailResults.sources && emailResults.sources.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Sources trouvées:</p>
                  <ul className="list-disc pl-5 text-sm">
                    {emailResults.sources.map((source, index) => (
                      <li key={index}>
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {source.domain || source.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Rendu des résultats de fuites
  const renderBreachResults = () => {
    if (!breachResults) return null;
    
    // Vérifier si les résultats proviennent de l'API publique
    const isPublicApi = breachResults.length > 0 && breachResults[0].is_public_api;
    
    return (
      <div className="breach-results bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Fuites de données détectées
            {isPublicApi && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                API Publique
              </span>
            )}
          </h3>
          {breachResults.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => exportResults(breachResults, `breaches_${email}.json`)}
                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
                title="Exporter en JSON"
              >
                <FiDownload size={18} />
              </button>
            </div>
          )}
        </div>
        
        {isPublicApi && (
          <div className="public-api-notice bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-3 rounded mb-4">
            <p className="text-sm">
              <strong>Note:</strong> Ces résultats proviennent de l'API publique LeakCheck. Les détails des fuites sont limités par rapport à l'API privée (plan payant).
            </p>
          </div>
        )}
        
        {breachResults.length === 0 ? (
          <div>
            {error && error.includes("plan payant") ? (
              <div className="plan-required bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-3 rounded mb-3">
                <p className="flex items-center">
                  <FiAlertTriangle className="mr-2" /> Le plan gratuit de LeakCheck ne permet pas la recherche par email.
                </p>
                <p className="text-sm mt-2">
                  Pour utiliser cette fonctionnalité, vous devez souscrire à un plan payant sur <a href="https://leakcheck.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">leakcheck.io</a>.
                </p>
              </div>
            ) : (
              <div className="no-breaches bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-3 rounded">
                <p className="flex items-center">
                  <FiMail className="mr-2" /> Aucune fuite de données détectée pour cet email.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="breaches-list">
            <p className="text-red-600 dark:text-red-400 mb-4 flex items-center">
              <FiAlertTriangle className="mr-2" /> 
              Cet email a été trouvé dans {breachResults.length} fuite(s) de données.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breachResults.map((breach, index) => (
                <div key={index} className="breach-card bg-gray-50 dark:bg-gray-700 p-3 rounded shadow-sm">
                  <div className="flex items-start mb-2">
                    <div className="w-full">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                          {breach.sources || 'Source inconnue'}
                        </h4>
                        {breach.last_breach && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                            {new Date(breach.last_breach * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {breach.line && !isPublicApi && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ID: {breach.line}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {breach.password && !isPublicApi && (
                    <div className="password-info mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                        <span className="font-medium mr-2">Mot de passe:</span> 
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{breach.password}</code>
                        <button
                          onClick={() => copyToClipboard(breach.password)}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Copier le mot de passe"
                        >
                          <FiCopy size={14} />
                        </button>
                      </p>
                    </div>
                  )}
                  
                  <div className="breach-data mt-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Données compromises:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(breach).map(([key, value]) => {
                        // Filtrer les champs à ne pas afficher
                        if (
                          key !== 'sources' && 
                          key !== 'line' && 
                          key !== 'password' && 
                          key !== 'last_breach' &&
                          key !== 'error' &&
                          key !== 'is_public_api' &&
                          value && 
                          typeof value !== 'object'
                        ) {
                          return (
                            <span 
                              key={key} 
                              className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-full text-xs"
                            >
                              {key}: {value.toString().substring(0, 20)}{value.toString().length > 20 ? '...' : ''}
                            </span>
                          );
                        }
                        return null;
                      }).filter(Boolean)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Rendu des résultats de recherche d'email par nom et domaine
  const renderFinderResults = () => {
    if (!finderResults) return null;
    
    return (
      <div className="finder-results bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Email trouvé pour {finderResults.first_name} {finderResults.last_name}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportResults(finderResults, `finder_${finderResults.first_name}_${finderResults.last_name}_${finderResults.domain}.json`)}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
              title="Exporter en JSON"
            >
              <FiDownload size={18} />
            </button>
          </div>
        </div>
        
        <div className="finder-info mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 flex items-center">
                <FiMail className="mr-2 text-blue-500" />
                <span className="font-medium">Email:</span>{' '}
                <span className="ml-2 text-blue-600 dark:text-blue-400">{finderResults.email}</span>
                <button
                  onClick={() => copyToClipboard(finderResults.email)}
                  className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Copier l'email"
                >
                  <FiCopy size={16} />
                </button>
              </p>
              <p className="mb-2">
                <span className="font-medium">Score:</span>{' '}
                <span className={`px-2 py-1 rounded-full text-sm ${
                  finderResults.score > 75 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  finderResults.score > 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {finderResults.score}
                </span>
              </p>
              <p className="mb-2">
                <span className="font-medium">Domaine:</span> {finderResults.domain}
              </p>
              {finderResults.position && (
                <p className="mb-2">
                  <span className="font-medium">Poste:</span> {finderResults.position}
                </p>
              )}
              {finderResults.company && (
                <p className="mb-2">
                  <span className="font-medium">Entreprise:</span> {finderResults.company}
                </p>
              )}
            </div>
            <div>
              {finderResults.sources && finderResults.sources.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Sources trouvées:</p>
                  <ul className="list-disc pl-5 text-sm">
                    {finderResults.sources.map((source, index) => (
                      <li key={index}>
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {source.domain || source.uri}
                        </a>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(source.extracted_on).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {finderResults.verification && (
          <div className={`verification-info p-3 rounded ${
            finderResults.verification.status === 'valid' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
            finderResults.verification.status === 'invalid' ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
            'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
          }`}>
            <p className="font-medium">
              Vérification: {
                finderResults.verification.status === 'valid' ? 'Valide' :
                finderResults.verification.status === 'invalid' ? 'Invalide' :
                'Incertain'
              }
            </p>
            <p className="text-sm">
              Dernière vérification: {new Date(finderResults.verification.date).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="osint-email bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">OSINT Email</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          <div className="search-form bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="mb-4">
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setSearchType('domain')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm ${
                    searchType === 'domain'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  Recherche par domaine
                </button>
                <button
                  onClick={() => setSearchType('email')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm ${
                    searchType === 'email'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  Vérification d'email
                </button>
                <button
                  onClick={() => setSearchType('finder')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm ${
                    searchType === 'finder'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  Trouver un email
                </button>
              </div>
              
              {searchType === 'domain' ? (
                <div className="mb-4">
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Domaine <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="exemple.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              ) : searchType === 'email' ? (
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Prénom"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Nom"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="finderDomain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Domaine <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="finderDomain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="exemple.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="api-keys mb-4">
              <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Clés API</h3>
              
              <div className="mb-3">
                <label htmlFor="hunterApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Clé API Hunter.io <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="hunterApiKey"
                  value={hunterApiKey}
                  onChange={(e) => setHunterApiKey(e.target.value)}
                  placeholder="Votre clé API Hunter.io"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between items-center">
                  <label htmlFor="leakCheckApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Clé API LeakCheck (optionnelle)
                  </label>
                </div>
                <input
                  type="password"
                  id="leakCheckApiKey"
                  value={leakCheckApiKey}
                  onChange={(e) => setLeakCheckApiKey(e.target.value)}
                  placeholder="Votre clé API LeakCheck"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  LeakCheck permet de rechercher des fuites de données associées à un email.
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  <strong>Note:</strong> Sans plan payant, l'API publique sera utilisée automatiquement. Elle fournit moins de détails mais permet de détecter les fuites.
                </p>
              </div>
              
              <button
                onClick={saveApiKeys}
                className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm flex items-center"
              >
                <FiSave className="mr-1" /> Sauvegarder les clés
              </button>
            </div>
            
            <div className="search-actions">
              <button
                onClick={
                  searchType === 'domain' ? searchDomain : 
                  searchType === 'email' ? searchEmail : 
                  searchEmailFinder
                }
                disabled={
                  isLoading || 
                  !hunterApiKey || 
                  (searchType === 'domain' && !domain) || 
                  (searchType === 'email' && !email) || 
                  (searchType === 'finder' && (!domain || !firstName || !lastName))
                }
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <FiSearch className="mr-2" />
                {isLoading ? 'Recherche en cours...' : 'Rechercher'}
              </button>
            </div>
            
            {error && (
              <div className="error-message mt-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="search-history bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Historique</h3>
              {searchHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-xs flex items-center"
                >
                  <FiTrash2 className="mr-1" /> Tout effacer
                </button>
              )}
            </div>
            
            {searchHistory.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">Aucune recherche récente</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchHistory.map((item) => (
                  <li 
                    key={item.id} 
                    className="py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                    onClick={() => loadFromHistory(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                          {item.query}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.type === 'domain' ? 'Domaine' : item.type === 'email' ? 'Email' : 'Finder'} • {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteFromHistory(item.id, e)}
                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                        title="Supprimer"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      <div className="results-container">
        {searchType === 'domain' ? (
          renderDomainResults()
        ) : searchType === 'email' ? (
          <>
            {renderEmailResults()}
            {renderBreachResults()}
          </>
        ) : (
          renderFinderResults()
        )}
      </div>
    </div>
  );
};

export default OsintEmail;
