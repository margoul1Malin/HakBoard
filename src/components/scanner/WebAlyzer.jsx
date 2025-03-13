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

  // Vérifier si webtech est installé au chargement du composant
  useEffect(() => {
    // Vérifier d'abord si l'API Electron est disponible
    if (!window.electronAPI) {
      console.error('L\'API Electron n\'est pas disponible');
      setErrorMessage('L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron pour exécuter des commandes système.');
      setIsCheckingWebtech(false);
      return;
    }
    
    // Vérifier si les méthodes nécessaires sont disponibles
    if (!window.electronAPI.executeCommand || !window.electronAPI.getPlatform) {
      console.error('Les méthodes requises de l\'API Electron ne sont pas disponibles');
      setErrorMessage('Les méthodes requises de l\'API Electron ne sont pas disponibles. Veuillez vérifier la configuration d\'Electron.');
      setIsCheckingWebtech(false);
      return;
    }
    
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
          webtechCheckCmd = '.\\env\\Scripts\\webtech -h';
        } else {
          // Linux/Mac
          webtechCheckCmd = './env/bin/webtech -h';
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

  // Fonction pour démarrer un scan
  const startScan = async () => {
    if (!targetUrl) return;
    
    try {
      // Réinitialiser les états
      setIsScanning(true);
      setScanStatus('scanning');
      setOutputLog([]);
      setScanResults(null);
      setErrorMessage('');
      
      // Ajouter l'URL au log
      setOutputLog(prev => [...prev, `Analyse de l'URL: ${targetUrl}`]);
      
      try {
        // Obtenir la plateforme
        const platform = await window.electronAPI.getPlatform();
        setOutputLog(prev => [...prev, `Plateforme détectée: ${platform}`]);
        
        // Construire la commande webtech de base
        let webtechPath = '';
        if (platform === 'win32') {
          // Windows
          webtechPath = '.\\env\\Scripts\\webtech';
        } else {
          // Linux/Mac
          webtechPath = './env/bin/webtech';
        }
        
        // Construire la commande avec seulement les options essentielles
        // Éviter les options qui pourraient causer des problèmes
        let webtechCmd = `${webtechPath} -u "${targetUrl}"`;
        
        // Toujours utiliser JSON pour faciliter le parsing
        webtechCmd += ' --oj';
        
        // Ajouter l'agent utilisateur uniquement si nécessaire
        if (randomUserAgent) {
          webtechCmd += ' --rua';
        } else if (userAgent) {
          webtechCmd += ` --ua "${userAgent}"`;
        }
        
        setOutputLog(prev => [...prev, `Exécution de la commande: ${webtechCmd}`]);
        
        try {
          const result = await window.electronAPI.executeCommand(webtechCmd);
          
          // Traiter la sortie
          if (result.stderr && !result.stderr.includes('Scan completed')) {
            setOutputLog(prev => [...prev, `Erreur: ${result.stderr}`]);
            setScanStatus('error');
          } else {
            // Ajouter la sortie au log
            const outputLines = result.stdout.split('\n').filter(line => line.trim());
            setOutputLog(prev => [...prev, ...outputLines]);
            
            // Essayer de parser les résultats
            try {
              // Pour JSON, essayer de trouver et parser le JSON dans la sortie
              if (result.stdout.includes('{')) {
                // Trouver le début et la fin du JSON dans la sortie
                const jsonStart = result.stdout.indexOf('{');
                const jsonEnd = result.stdout.lastIndexOf('}') + 1;
                
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                  const jsonStr = result.stdout.substring(jsonStart, jsonEnd);
                  try {
                    const parsedResults = JSON.parse(jsonStr);
                    setScanResults(parsedResults);
                    setOutputLog(prev => [...prev, 'Résultats JSON parsés avec succès']);
                  } catch (jsonError) {
                    setOutputLog(prev => [...prev, `Erreur lors du parsing JSON: ${jsonError.message}`]);
                    setScanResults({ rawOutput: result.stdout });
                  }
                } else {
                  setOutputLog(prev => [...prev, 'Aucun JSON valide trouvé dans la sortie']);
                  setScanResults({ rawOutput: result.stdout });
                }
              } else {
                // Pour les autres formats, stocker la sortie brute
                setScanResults({ 
                  rawOutput: result.stdout
                });
              }
              
              // Créer un objet de scan pour l'historique
              const scanId = `scan_${Date.now()}`;
              const timestamp = new Date().toISOString();
              
              const newScan = {
                id: scanId,
                url: targetUrl,
                timestamp,
                results: scanResults || { rawOutput: result.stdout }
              };
              
              // Mettre à jour l'historique
              const updatedHistory = [newScan, ...scanHistory].slice(0, 20);
              setScanHistory(updatedHistory);
              
              try {
                localStorage.setItem('webtech_scan_history', JSON.stringify(updatedHistory));
              } catch (storageError) {
                console.error('Erreur lors de l\'enregistrement de l\'historique:', storageError);
              }
              
              setScanStatus('success');
              setOutputLog(prev => [...prev, 'Scan terminé avec succès']);
            } catch (parseError) {
              console.error('Erreur lors du traitement des résultats:', parseError);
              setOutputLog(prev => [...prev, `Erreur lors du traitement des résultats: ${parseError.message}`]);
              setScanStatus('error');
            }
          }
        } catch (execError) {
          console.error('Erreur lors de l\'exécution de la commande:', execError);
          
          // Afficher plus de détails sur l'erreur
          if (typeof execError === 'object') {
            setOutputLog(prev => [...prev, `Erreur détaillée: ${JSON.stringify(execError)}`]);
          } else {
            setOutputLog(prev => [...prev, `Erreur: ${execError}`]);
          }
          
          setScanStatus('error');
          
          // Essayer une commande alternative plus simple
          setOutputLog(prev => [...prev, 'Tentative avec une commande alternative...']);
          try {
            const simpleCmd = `${webtechPath} -h`;
            const helpResult = await window.electronAPI.executeCommand(simpleCmd);
            setOutputLog(prev => [...prev, `Résultat de la commande d'aide: ${helpResult.stdout}`]);
          } catch (helpError) {
            setOutputLog(prev => [...prev, `Échec de la commande d'aide: ${helpError.message}`]);
          }
        }
      } catch (platformError) {
        console.error('Erreur lors de la détection de la plateforme:', platformError);
        setOutputLog(prev => [...prev, `Erreur lors de la détection de la plateforme: ${platformError.message}`]);
        setScanStatus('error');
      }
    } catch (error) {
      console.error('Erreur générale lors du scan:', error);
      setOutputLog(prev => [...prev, `Erreur générale lors du scan: ${error.message}`]);
      setScanStatus('error');
    } finally {
      setIsScanning(false);
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
        webtechCheckCmd = '.\\env\\Scripts\\webtech -h';
      } else {
        // Linux/Mac
        webtechCheckCmd = './env/bin/webtech -h';
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

  // Fonction pour tester webtech avec une commande simple
  const testWebtech = async () => {
    try {
      setIsScanning(true);
      setOutputLog([]);
      setScanStatus('scanning');
      setOutputLog(prev => [...prev, 'Test de webtech en cours...']);
      
      const platform = await window.electronAPI.getPlatform();
      setOutputLog(prev => [...prev, `Plateforme détectée: ${platform}`]);
      
      // Commande simple pour tester webtech
      let testCmd = '';
      if (platform === 'win32') {
        testCmd = '.\\env\\Scripts\\webtech -h';
      } else {
        testCmd = './env/bin/webtech -h';
      }
      
      setOutputLog(prev => [...prev, `Exécution de la commande de test: ${testCmd}`]);
      
      try {
        const result = await window.electronAPI.executeCommand(testCmd);
        setOutputLog(prev => [...prev, 'Résultat du test:']);
        
        if (result.stdout) {
          setOutputLog(prev => [...prev, `Sortie standard: ${result.stdout}`]);
        }
        
        if (result.stderr) {
          setOutputLog(prev => [...prev, `Erreur standard: ${result.stderr}`]);
        }
        
        setScanStatus('success');
        setOutputLog(prev => [...prev, 'Test terminé avec succès']);
      } catch (error) {
        console.error('Erreur lors du test de webtech:', error);
        setOutputLog(prev => [...prev, `Erreur lors du test: ${JSON.stringify(error)}`]);
        setScanStatus('error');
      }
    } catch (error) {
      console.error('Erreur générale lors du test:', error);
      setOutputLog(prev => [...prev, `Erreur générale: ${error.message}`]);
      setScanStatus('error');
    } finally {
      setIsScanning(false);
    }
  };

  // Rendu des résultats formatés
  const renderResults = () => {
    if (!scanResults) return null;
    
    // Si nous avons du contenu brut (XML ou HTML)
    if (scanResults.rawContent && scanResults.format !== 'json') {
      return (
        <div className="raw-content">
          <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md max-h-96 overflow-y-auto text-sm">
            {scanResults.rawContent}
          </pre>
          <div className="mt-4">
            <button
              onClick={() => {
                // Fonction pour télécharger le contenu
                const element = document.createElement('a');
                const file = new Blob([scanResults.rawContent], {type: 'text/plain'});
                element.href = URL.createObjectURL(file);
                element.download = `webtech_export.${scanResults.format}`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm"
            >
              Télécharger {scanResults.format.toUpperCase()}
            </button>
          </div>
        </div>
      );
    }
    
    // Pour les résultats JSON
    if (scanResults.technologies && Array.isArray(scanResults.technologies)) {
      return (
        <div className="technologies-list">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scanResults.technologies.map((tech, index) => (
              <div key={index} className="tech-card bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">{tech.name}</h4>
                {tech.version && (
                  <div className="version mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Version: </span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{tech.version}</span>
                  </div>
                )}
                {tech.categories && tech.categories.length > 0 && (
                  <div className="categories mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Catégories: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tech.categories.map((category, catIndex) => (
                        <span 
                          key={catIndex} 
                          className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tech.cpe && (
                  <div className="cpe mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">CPE: </span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-mono">{tech.cpe}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                // Fonction pour télécharger le contenu JSON
                const element = document.createElement('a');
                const file = new Blob([JSON.stringify(scanResults, null, 2)], {type: 'application/json'});
                element.href = URL.createObjectURL(file);
                element.download = 'webtech_export.json';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm"
            >
              Télécharger JSON
            </button>
          </div>
        </div>
      );
    }
    
    // Fallback pour d'autres formats de résultats
    return (
      <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md max-h-96 overflow-y-auto text-sm">
        {JSON.stringify(scanResults, null, 2)}
      </pre>
    );
  };

  // Charger un scan depuis l'historique
  const loadScanFromHistory = (scanId) => {
    const scan = scanHistory.find(s => s.id === scanId);
    if (scan) {
      setSelectedScanId(scanId);
      setScanResults(scan.results);
      setTargetUrl(scan.url);
    }
  };

  // Supprimer un scan de l'historique
  const deleteScan = (scanId, e) => {
    if (e) {
      e.stopPropagation(); // Empêcher le déclenchement du onClick du parent
    }
    
    const updatedHistory = scanHistory.filter(scan => scan.id !== scanId);
    setScanHistory(updatedHistory);
    localStorage.setItem('webtech_scan_history', JSON.stringify(updatedHistory));
    
    // Si le scan supprimé était sélectionné, réinitialiser la sélection
    if (selectedScanId === scanId) {
      setSelectedScanId(null);
      setScanResults(null);
    }
  };

  // Supprimer tout l'historique des scans
  const clearScanHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('webtech_scan_history');
    setSelectedScanId(null);
    setScanResults(null);
  };

  // Exporter un scan dans le format spécifié
  const exportScan = (scanId, format, e) => {
    if (e) {
      e.stopPropagation(); // Empêcher le déclenchement du onClick du parent
    }
    
    const scan = scanHistory.find(s => s.id === scanId);
    if (!scan) return;
    
    let content = '';
    let filename = `webtech_scan_${scanId}`;
    let mimeType = 'text/plain';
    
    // Fonction utilitaire pour échapper les caractères spéciaux en XML
    const escapeXml = (unsafe) => {
      if (typeof unsafe !== 'string') return unsafe;
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    // Fonction utilitaire pour échapper les caractères spéciaux en HTML
    const escapeHtml = (unsafe) => {
      if (typeof unsafe !== 'string') return unsafe;
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
    // Fonction pour extraire les données réelles du scan
    const extractScanData = (scanResults) => {
      // Si les résultats sont déjà dans le bon format
      if (scanResults[scan.url]) {
        return scanResults;
      }
      
      // Si les résultats sont dans rawOutput (format JSON stringifié)
      if (scanResults.rawOutput) {
        try {
          // Essayer de parser le JSON dans rawOutput
          const parsedOutput = JSON.parse(scanResults.rawOutput);
          return parsedOutput;
        } catch (error) {
          console.error('Erreur lors du parsing de rawOutput:', error);
          return scanResults;
        }
      }
      
      return scanResults;
    };
    
    // Extraire les données réelles
    const scanData = extractScanData(scan.results);
    
    if (format === 'json') {
      // Pour JSON, on exporte directement les résultats
      content = JSON.stringify(scanData, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else if (format === 'xml') {
      // Pour XML, on convertit les données en format XML
      content = `<?xml version="1.0" encoding="UTF-8"?>\n<scan>\n  <url>${scan.url}</url>\n  <timestamp>${scan.timestamp}</timestamp>\n  <results>\n`;
      
      // Traiter les données selon leur format
      if (scanData[scan.url]) {
        // Technologies
        if (scanData[scan.url].tech && scanData[scan.url].tech.length > 0) {
          content += `    <technologies>\n`;
          scanData[scan.url].tech.forEach(tech => {
            content += `      <technology>\n`;
            content += `        <name>${escapeXml(tech.name)}</name>\n`;
            if (tech.version) {
              content += `        <version>${escapeXml(tech.version)}</version>\n`;
            }
            content += `      </technology>\n`;
          });
          content += `    </technologies>\n`;
        }
        
        // En-têtes
        if (scanData[scan.url].headers && scanData[scan.url].headers.length > 0) {
          content += `    <headers>\n`;
          scanData[scan.url].headers.forEach(header => {
            content += `      <header>\n`;
            content += `        <name>${escapeXml(header.name)}</name>\n`;
            content += `        <value>${escapeXml(header.value)}</value>\n`;
            content += `      </header>\n`;
          });
          content += `    </headers>\n`;
        }
      } else if (scanData.technologies && scanData.technologies.length > 0) {
        // Format standard avec technologies directement dans l'objet
        content += `    <technologies>\n`;
        scanData.technologies.forEach(tech => {
          content += `      <technology>\n`;
          content += `        <name>${escapeXml(tech.name)}</name>\n`;
          if (tech.version) {
            content += `        <version>${escapeXml(tech.version)}</version>\n`;
          }
          if (tech.cpe) {
            content += `        <cpe>${escapeXml(tech.cpe)}</cpe>\n`;
          }
          if (tech.categories && tech.categories.length > 0) {
            content += `        <categories>\n`;
            tech.categories.forEach(cat => {
              content += `          <category>${escapeXml(cat)}</category>\n`;
            });
            content += `        </categories>\n`;
          }
          content += `      </technology>\n`;
        });
        content += `    </technologies>\n`;
      } else {
        // Si aucun format reconnu, inclure la sortie brute
        content += `    <raw_data><![CDATA[${JSON.stringify(scanData)}]]></raw_data>\n`;
      }
      
      content += `  </results>\n</scan>`;
      filename += '.xml';
      mimeType = 'application/xml';
    } else if (format === 'html') {
      // Pour HTML, on crée une page formatée avec un style amélioré
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebAlyzer Scan - ${scan.url}</title>
  <style>
    :root {
      --primary-color: #3b82f6;
      --primary-dark: #2563eb;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --danger-color: #ef4444;
      --text-color: #333;
      --text-light: #6b7280;
      --bg-color: #fff;
      --bg-secondary: #f9fafb;
      --border-color: #e5e7eb;
    }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      margin: 0;
      padding: 0;
      color: var(--text-color);
      background-color: var(--bg-color);
      line-height: 1.6;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    
    h1, h2, h3 { 
      color: var(--text-color);
      margin-top: 0;
    }
    
    h1 {
      font-size: 2rem;
      color: var(--primary-color);
    }
    
    h2 {
      font-size: 1.5rem;
      margin-top: 2rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    
    .meta-info {
      background-color: var(--bg-secondary);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 2rem;
    }
    
    .meta-info p {
      margin: 0.5rem 0;
    }
    
    .tech-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .tech { 
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .tech:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .tech h3 { 
      margin-top: 0;
      color: var(--primary-color);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
    }
    
    .category { 
      display: inline-block; 
      background: var(--primary-color);
      color: white;
      padding: 0.2rem 0.6rem;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
      border-radius: 1rem;
      font-size: 0.8rem;
    }
    
    .headers { 
      margin-top: 2rem;
    }
    
    .headers-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1rem;
    }
    
    .header { 
      background-color: var(--bg-secondary);
      padding: 0.8rem;
      margin-bottom: 0.5rem;
      border-left: 3px solid var(--primary-color);
      border-radius: 0.25rem;
    }
    
    .header p {
      margin: 0;
    }
    
    .header strong {
      color: var(--primary-dark);
    }
    
    pre { 
      background: var(--bg-secondary);
      padding: 1rem;
      overflow-x: auto;
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
    }
    
    footer {
      margin-top: 3rem;
      text-align: center;
      color: var(--text-light);
      font-size: 0.9rem;
      padding: 1rem;
      border-top: 1px solid var(--border-color);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>WebAlyzer Scan Results</h1>
    </header>
    
    <div class="meta-info">
      <p><strong>URL:</strong> ${scan.url}</p>
      <p><strong>Date:</strong> ${new Date(scan.timestamp).toLocaleString()}</p>
    </div>`;

      // Traiter les données selon leur format
      if (scanData[scan.url]) {
        // Technologies
        if (scanData[scan.url].tech && scanData[scan.url].tech.length > 0) {
          content += `
    <section>
      <h2>Technologies Détectées</h2>
      <div class="tech-container">`;
          scanData[scan.url].tech.forEach(tech => {
            content += `
        <div class="tech">
          <h3>${escapeHtml(tech.name)}</h3>`;
            if (tech.version) {
              content += `
          <p><strong>Version:</strong> ${escapeHtml(tech.version)}</p>`;
            }
            content += `
        </div>`;
          });
          content += `
      </div>
    </section>`;
        }
        
        // En-têtes
        if (scanData[scan.url].headers && scanData[scan.url].headers.length > 0) {
          content += `
    <section class="headers">
      <h2>En-têtes HTTP</h2>
      <div class="headers-container">`;
          scanData[scan.url].headers.forEach(header => {
            content += `
        <div class="header">
          <p><strong>${escapeHtml(header.name)}:</strong> ${escapeHtml(header.value)}</p>
        </div>`;
          });
          content += `
      </div>
    </section>`;
        }
      } else if (scanData.technologies && scanData.technologies.length > 0) {
        // Format standard avec technologies directement dans l'objet
        content += `
    <section>
      <h2>Technologies Détectées</h2>
      <div class="tech-container">`;
        scanData.technologies.forEach(tech => {
          content += `
        <div class="tech">
          <h3>${escapeHtml(tech.name)}</h3>`;
          if (tech.version) {
            content += `
          <p><strong>Version:</strong> ${escapeHtml(tech.version)}</p>`;
          }
          if (tech.cpe) {
            content += `
          <p><strong>CPE:</strong> ${escapeHtml(tech.cpe)}</p>`;
          }
          if (tech.categories && tech.categories.length > 0) {
            content += `
          <p><strong>Catégories:</strong></p>
          <div>`;
            tech.categories.forEach(cat => {
              content += `
            <span class="category">${escapeHtml(cat)}</span>`;
            });
            content += `
          </div>`;
          }
          content += `
        </div>`;
        });
        content += `
      </div>
    </section>`;
      } else {
        // Si aucun format reconnu, inclure la sortie brute
        content += `
    <section>
      <h2>Données brutes</h2>
      <pre>${JSON.stringify(scanData, null, 2)}</pre>
    </section>`;
      }
      
      content += `
    <footer>
      <p>Généré par WebAlyzer le ${new Date().toLocaleString()}</p>
    </footer>
  </div>
</body>
</html>`;
      filename += '.html';
      mimeType = 'text/html';
    }
    
    // Créer et télécharger le fichier
    const blob = new Blob([content], { type: mimeType });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
              
              <div className="form-actions mt-6">
                <button
                  onClick={startScan}
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
                    {renderResults()}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="webalyzer-sidebar w-full md:w-1/3">
            {/* Historique des scans */}
            <div className="scan-history bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Historique des scans</h2>
                {scanHistory.length > 0 && (
                  <button
                    onClick={clearScanHistory}
                    className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium py-1 px-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
              
              {scanHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">Aucun scan effectué.</p>
              ) : (
                <ul className="history-list divide-y divide-gray-200 dark:divide-gray-700">
                  {scanHistory.map((scan) => (
                    <li 
                      key={scan.id} 
                      className={`py-3 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
                        selectedScanId === scan.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-400' : ''
                      }`}
                      onClick={() => loadScanFromHistory(scan.id)}
                    >
                      <div className="scan-info flex flex-col">
                        <span className="scan-target font-medium text-gray-800 dark:text-gray-200 truncate max-w-[220px]">
                          {scan.url}
                        </span>
                        <span className="scan-date text-xs text-gray-500 dark:text-gray-500">
                          {new Date(scan.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="scan-actions flex gap-2 mt-2">
                        <div className="export-options flex gap-1">
                          <button
                            className="export-button bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs transition-colors"
                            onClick={(e) => exportScan(scan.id, 'json', e)}
                            title="Exporter en JSON"
                          >
                            JSON
                          </button>
                          <button
                            className="export-button bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs transition-colors"
                            onClick={(e) => exportScan(scan.id, 'xml', e)}
                            title="Exporter en XML"
                          >
                            XML
                          </button>
                          <button
                            className="export-button bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs transition-colors"
                            onClick={(e) => exportScan(scan.id, 'html', e)}
                            title="Exporter en HTML"
                          >
                            HTML
                          </button>
                        </div>
                        <button
                          className="delete-button bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs transition-colors"
                          onClick={(e) => deleteScan(scan.id, e)}
                          title="Supprimer ce scan"
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
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
