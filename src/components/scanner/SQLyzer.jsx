import React, { useState, useEffect } from 'react';
//import './SQLyzer.css';

const SQLyzer = () => {
  // États pour les paramètres de scan
  const [targetUrl, setTargetUrl] = useState('');
  const [scanOptions, setScanOptions] = useState({
    level: 1,
    risk: 1,
    dbms: '',
    technique: 'BEUSTQ', // Toutes les techniques par défaut
    threads: 1,
    forms: true,
    dumpAll: false,
    schema: true,
    getTables: true,
    getColumns: true,
    getDbs: true,
    batchMode: false,
    randomAgent: true,
    timeout: 30
  });
  
  // États pour le statut et les résultats
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [sqlmapInstalled, setSqlmapInstalled] = useState(false);
  const [isCheckingSqlmap, setIsCheckingSqlmap] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [outputLog, setOutputLog] = useState([]);
  const [pythonInstalled, setPythonInstalled] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');

  // Vérifier si sqlmap est installé au chargement du composant
  useEffect(() => {
    const checkSqlmap = async () => {
      try {
        setIsCheckingSqlmap(true);
        setErrorMessage('');
        
        // Obtenir la plateforme
        const platform = await window.electronAPI.getPlatform();
        console.log('Plateforme détectée:', platform);
        
        // Commande pour vérifier l'existence de sqlmap
        let sqlmapCheckCmd = '';
        
        if (platform === 'win32') {
          // Windows
          sqlmapCheckCmd = 'if exist .\\env\\Scripts\\sqlmap.exe echo "Installed"';
        } else {
          // Linux/Mac
          sqlmapCheckCmd = 'test -f ./env/bin/sqlmap && echo "Installed"';
        }
        
        try {
          // Vérifier si sqlmap est disponible
          const sqlmapResult = await window.electronAPI.executeCommand(sqlmapCheckCmd);
          console.log('Résultat vérification sqlmap:', sqlmapResult);
          
          const isInstalled = sqlmapResult.stdout.includes('Installed');
          setSqlmapInstalled(isInstalled);
          setPythonInstalled(true); // Si sqlmap est installé, Python l'est aussi
          
          if (!isInstalled) {
            setErrorMessage('sqlmap n\'est pas installé dans l\'environnement virtuel. Veuillez l\'installer avec "pip install sqlmap"');
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de sqlmap:', error);
          setPythonInstalled(false);
          setSqlmapInstalled(false);
          setErrorMessage(`Environnement virtuel non trouvé. Veuillez créer un environnement virtuel à la racine du projet avec "python -m venv env" et installer sqlmap avec "pip install sqlmap"`);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        setErrorMessage(`Erreur lors de la vérification: ${error.message}`);
        setSqlmapInstalled(false);
      } finally {
        setIsCheckingSqlmap(false);
      }
    };

    checkSqlmap();
    loadScanHistory();
  }, []);

  // Charger l'historique des scans
  const loadScanHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('sqlmap_scan_history')) || [];
      setScanHistory(history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des scans:', error);
      setScanHistory([]);
    }
  };

  // Gérer le changement d'options de scan
  const handleOptionChange = (option, value) => {
    setScanOptions({
      ...scanOptions,
      [option]: value
    });
  };

  // Lancer un scan sqlmap
  const handleScan = async (e) => {
    e.preventDefault();
    
    if (!targetUrl) {
      setErrorMessage('Veuillez entrer une URL cible');
      return;
    }
    
    try {
      setIsScanning(true);
      setScanStatus('Initialisation du scan...');
      setOutputLog([]);
      setErrorMessage('');
      
      // Générer un ID unique pour ce scan
      const scanId = Date.now().toString();
      
      // Obtenir la plateforme
      const platform = await window.electronAPI.getPlatform();
      
      // Construire la commande sqlmap
      let sqlmapCmd = '';
      
      if (platform === 'win32') {
        // Windows - utiliser directement l'exécutable sqlmap
        sqlmapCmd = `.\\env\\Scripts\\sqlmap.exe -u "${targetUrl}" --batch`;
      } else {
        // Linux/Mac
        sqlmapCmd = `./env/bin/sqlmap -u "${targetUrl}" --batch`;
      }
      
      // Créer un répertoire de sortie spécifique pour ce scan
      const outputDir = `sqlmap_output_${scanId}`;
      
      // Ajouter les options en fonction des paramètres
      if (scanOptions.level) sqlmapCmd += ` --level=${scanOptions.level}`;
      if (scanOptions.risk) sqlmapCmd += ` --risk=${scanOptions.risk}`;
      if (scanOptions.dbms) sqlmapCmd += ` --dbms=${scanOptions.dbms}`;
      if (scanOptions.technique) sqlmapCmd += ` --technique=${scanOptions.technique}`;
      if (scanOptions.threads > 1) sqlmapCmd += ` --threads=${scanOptions.threads}`;
      if (scanOptions.forms) sqlmapCmd += ` --forms`;
      if (scanOptions.dumpAll) sqlmapCmd += ` --dump-all`;
      if (scanOptions.schema) sqlmapCmd += ` --schema`;
      if (scanOptions.getTables) sqlmapCmd += ` --tables`;
      if (scanOptions.getColumns) sqlmapCmd += ` --columns`;
      if (scanOptions.getDbs) sqlmapCmd += ` --dbs`;
      if (scanOptions.randomAgent) sqlmapCmd += ` --random-agent`;
      sqlmapCmd += ` --output-dir="${outputDir}"`;
      
      setScanStatus('Exécution de sqlmap...');
      console.log('Commande sqlmap:', sqlmapCmd);
      
      // Exécuter la commande sqlmap
      const result = await window.electronAPI.executeCommand(sqlmapCmd);
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      
      // Traiter la sortie
      const outputLines = stdout.split('\n');
      setOutputLog(outputLines);
      
      // Analyser les résultats
      const scanResult = {
        id: scanId,
        targetUrl,
        timestamp: Date.now(),
        options: scanOptions,
        output: stdout,
        databases: [],
        tables: [],
        columns: [],
        vulnerabilities: []
      };
      
      // Extraire les informations des bases de données
      const dbsMatch = stdout.match(/available databases \[(.*?)\]/);
      if (dbsMatch && dbsMatch[1]) {
        scanResult.databases = dbsMatch[1].split(', ').map(db => db.trim());
      }
      
      // Extraire les informations des tables
      const tablesRegex = /Database: (.*?)\s+\[(\d+) tables\]/g;
      let tablesMatch;
      while ((tablesMatch = tablesRegex.exec(stdout)) !== null) {
        const dbName = tablesMatch[1];
        const tableCount = parseInt(tablesMatch[2]);
        
        // Chercher les tables pour cette base de données
        const tableListRegex = new RegExp(`Database: ${dbName}[\\s\\S]*?Tables:([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
        const tableListMatch = stdout.match(tableListRegex);
        
        if (tableListMatch && tableListMatch[1]) {
          const tables = tableListMatch[1].trim().split('\n').map(t => t.trim());
          scanResult.tables.push({
            database: dbName,
            tables
          });
        }
      }
      
      // Extraire les vulnérabilités détectées
      if (stdout.includes('sqlmap identified the following injection point')) {
        const vulnRegex = /Parameter: (.*?) \((.*?)\)\s+Type: (.*?)(?:\s+Title:|$)/g;
        let vulnMatch;
        while ((vulnMatch = vulnRegex.exec(stdout)) !== null) {
          scanResult.vulnerabilities.push({
            parameter: vulnMatch[1],
            location: vulnMatch[2],
            type: vulnMatch[3]
          });
        }
      }
      
      // Sauvegarder le résultat
      setScanResults(scanResult);
      
      // Mettre à jour l'historique des scans
      const updatedHistory = [
        {
          id: scanId,
          targetUrl,
          timestamp: Date.now(),
          options: scanOptions
        },
        ...scanHistory
      ].slice(0, 20); // Limiter à 20 entrées
      
      setScanHistory(updatedHistory);
      localStorage.setItem('sqlmap_scan_history', JSON.stringify(updatedHistory));
      
      // Sauvegarder le résultat complet
      localStorage.setItem(`sqlmap_result_${scanId}`, JSON.stringify(scanResult));
      
      setScanStatus('Scan terminé');
    } catch (error) {
      console.error('Erreur lors du scan sqlmap:', error);
      setErrorMessage(`Erreur lors du scan: ${error.message || JSON.stringify(error)}`);
      setOutputLog(prev => [...prev, `Erreur: ${error.message || JSON.stringify(error)}`]);
    } finally {
      setIsScanning(false);
    }
  };

  // Afficher les résultats d'un scan précédent
  const viewScanResult = (scanId) => {
    try {
      const result = JSON.parse(localStorage.getItem(`sqlmap_result_${scanId}`));
      if (result) {
        setScanResults(result);
        setSelectedScanId(scanId);
        setOutputLog(result.output.split('\n'));
      } else {
        setErrorMessage(`Résultat de scan non trouvé pour l'ID: ${scanId}`);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat:', error);
      setErrorMessage(`Erreur lors de la récupération du résultat: ${error.message}`);
    }
  };

  // Supprimer un scan de l'historique
  const deleteScan = (scanId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      // Supprimer le résultat
      localStorage.removeItem(`sqlmap_result_${scanId}`);
      
      // Mettre à jour l'historique
      const updatedHistory = scanHistory.filter(scan => scan.id !== scanId);
      setScanHistory(updatedHistory);
      localStorage.setItem('sqlmap_scan_history', JSON.stringify(updatedHistory));
      
      // Réinitialiser la sélection si nécessaire
      if (selectedScanId === scanId) {
        setSelectedScanId(null);
        setScanResults(null);
      }
      
      setScanStatus('Scan supprimé');
    } catch (error) {
      console.error('Erreur lors de la suppression du scan:', error);
      setErrorMessage(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  // Exporter les résultats d'un scan
  const exportScanResult = (scanId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      const result = JSON.parse(localStorage.getItem(`sqlmap_result_${scanId}`));
      
      if (!result) {
        setErrorMessage('Résultat de scan non trouvé');
        return;
      }
      
      if (exportFormat === 'json') {
        // Exporter en JSON
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `sqlmap_scan_${result.targetUrl.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(result.timestamp).toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      } else if (exportFormat === 'html') {
        // Exporter en HTML
        const htmlContent = generateHtmlReport(result);
        const dataStr = "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `sqlmap_scan_${result.targetUrl.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(result.timestamp).toISOString().slice(0,10)}.html`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }
      
      setScanStatus('Export réussi');
    } catch (error) {
      console.error('Erreur lors de l\'exportation des résultats:', error);
      setErrorMessage(`Erreur lors de l'exportation: ${error.message}`);
    }
  };

  // Générer un rapport HTML
  const generateHtmlReport = (result) => {
    const vulnerabilitiesHtml = result.vulnerabilities && result.vulnerabilities.length > 0
      ? `
        <div class="result-section vulnerabilities">
          <h3>Vulnérabilités détectées</h3>
          <ul>
            ${result.vulnerabilities.map(vuln => `
              <li class="vulnerability-item">
                <div><strong>Paramètre:</strong> ${vuln.parameter}</div>
                <div><strong>Emplacement:</strong> ${vuln.location}</div>
                <div><strong>Type:</strong> ${vuln.type}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      `
      : '';
    
    const databasesHtml = result.databases && result.databases.length > 0
      ? `
        <div class="result-section databases">
          <h3>Bases de données</h3>
          <ul>
            ${result.databases.map(db => `<li>${db}</li>`).join('')}
          </ul>
        </div>
      `
      : '';
    
    const tablesHtml = result.tables && result.tables.length > 0
      ? `
        <div class="result-section tables">
          <h3>Tables</h3>
          ${result.tables.map(dbTables => `
            <div class="database-tables">
              <h4>${dbTables.database}</h4>
              <ul>
                ${dbTables.tables.map(table => `<li>${table}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      `
      : '';
    
    // Formater le log de sortie avec coloration
    const formattedOutput = result.output
      .replace(/\[(\*|\+|\-|\!)\]/g, match => {
        if (match === '[+]') return '<span class="success">[+]</span>';
        if (match === '[*]') return '<span class="info">[*]</span>';
        if (match === '[-]') return '<span class="warning">[-]</span>';
        if (match === '[!]') return '<span class="error">[!]</span>';
        return match;
      })
      .replace(/(available databases \[.*?\])/g, '<span class="success">$1</span>')
      .replace(/(Type: .*?)(?=\s|$)/g, '<span class="warning">$1</span>')
      .replace(/(Parameter: .*?)(?=\s|$)/g, '<span class="info">$1</span>')
      .replace(/(the back-end DBMS is .*?)(?=\s|$)/g, '<span class="success">$1</span>');
    
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rapport SQLyzer - ${result.targetUrl}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          h1, h2, h3, h4 {
            color: #4f46e5;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
          }
          .result-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f3f4f6;
            border-radius: 8px;
          }
          .result-section {
            margin-bottom: 30px;
            padding: 20px;
            border-radius: 8px;
          }
          .vulnerabilities {
            background-color: #fff1f2;
            border-left: 4px solid #e11d48;
          }
          .vulnerability-item {
            background-color: rgba(255, 255, 255, 0.5);
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 3px solid #e11d48;
          }
          .databases {
            background-color: #ecfdf5;
            border-left: 4px solid #10b981;
          }
          .databases ul li {
            background-color: rgba(255, 255, 255, 0.5);
            padding: 8px 15px;
            margin-bottom: 5px;
            border-radius: 4px;
            border-left: 3px solid #10b981;
            list-style-type: none;
          }
          .tables {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
          }
          .database-tables {
            margin-bottom: 20px;
          }
          .database-tables h4 {
            color: #1d4ed8;
            margin-bottom: 10px;
          }
          .database-tables ul {
            padding-left: 20px;
          }
          .database-tables ul li {
            background-color: rgba(255, 255, 255, 0.5);
            padding: 8px 15px;
            margin-bottom: 5px;
            border-radius: 4px;
            border-left: 3px solid #3b82f6;
            list-style-type: none;
          }
          .output-log {
            background-color: #f3f4f6;
            border-left: 4px solid #6b7280;
            padding: 20px;
            border-radius: 8px;
          }
          .output-log h3 {
            color: #4b5563;
          }
          .output-log-content {
            background-color: #1f2937;
            color: #e5e7eb;
            padding: 20px;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
          }
          .success { color: #34d399; font-weight: bold; }
          .warning { color: #fbbf24; font-weight: bold; }
          .error { color: #f87171; font-weight: bold; }
          .info { color: #60a5fa; }
          ul {
            padding-left: 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport de scan SQLyzer</h1>
          <p>Généré le ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="result-header">
          <div>
            <strong>URL cible:</strong> ${result.targetUrl}
          </div>
          <div>
            <strong>Date du scan:</strong> ${new Date(result.timestamp).toLocaleString()}
          </div>
        </div>
        
        ${vulnerabilitiesHtml}
        ${databasesHtml}
        ${tablesHtml}
        
        <div class="output-log">
          <h3>Journal de sortie</h3>
          <div class="output-log-content">${formattedOutput}</div>
        </div>
        
        <div class="footer">
          <p>SQLyzer - Analyseur d'injections SQL</p>
        </div>
      </body>
      </html>
    `;
  };

  // Réessayer la vérification de sqlmap
  const retryCheckSqlmap = async () => {
    try {
      setIsCheckingSqlmap(true);
      setErrorMessage('');
      
      // Obtenir la plateforme
      const platform = await window.electronAPI.getPlatform();
      
      // Commande pour vérifier l'existence de sqlmap
      let sqlmapCheckCmd = '';
      
      if (platform === 'win32') {
        // Windows
        sqlmapCheckCmd = 'if exist .\\env\\Scripts\\sqlmap.exe echo "Installed"';
      } else {
        // Linux/Mac
        sqlmapCheckCmd = 'test -f ./env/bin/sqlmap && echo "Installed"';
      }
      
      try {
        // Vérifier si sqlmap est disponible
        const sqlmapResult = await window.electronAPI.executeCommand(sqlmapCheckCmd);
        console.log('Résultat vérification sqlmap:', sqlmapResult);
        
        const isInstalled = sqlmapResult.stdout.includes('Installed');
        setSqlmapInstalled(isInstalled);
        setPythonInstalled(true); // Si sqlmap est installé, Python l'est aussi
        
        if (!isInstalled) {
          setErrorMessage('sqlmap n\'est pas installé dans l\'environnement virtuel. Veuillez l\'installer avec "pip install sqlmap"');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de sqlmap:', error);
        setPythonInstalled(false);
        setSqlmapInstalled(false);
        setErrorMessage(`Environnement virtuel non trouvé. Veuillez créer un environnement virtuel à la racine du projet avec "python -m venv env" et installer sqlmap avec "pip install sqlmap"`);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setErrorMessage(`Erreur lors de la vérification: ${error.message}`);
      setSqlmapInstalled(false);
    } finally {
      setIsCheckingSqlmap(false);
    }
  };

  // Formater les lignes de log avec coloration
  const formatLogLine = (line) => {
    if (line.startsWith('[+]')) {
      return <span className="text-green-600 dark:text-green-400 font-medium">{line}</span>;
    } else if (line.startsWith('[*]')) {
      return <span className="text-blue-600 dark:text-blue-400 font-medium">{line}</span>;
    } else if (line.startsWith('[-]')) {
      return <span className="text-yellow-600 dark:text-yellow-400 font-medium">{line}</span>;
    } else if (line.startsWith('[!]')) {
      return <span className="text-red-600 dark:text-red-400 font-medium">{line}</span>;
    } else if (line.includes('available databases')) {
      return <span className="text-green-600 dark:text-green-400 font-medium">{line}</span>;
    } else if (line.includes('the back-end DBMS is')) {
      return <span className="text-green-600 dark:text-green-400 font-medium">{line}</span>;
    } else if (line.includes('Type:')) {
      return <span className="text-yellow-600 dark:text-yellow-400 font-medium">{line}</span>;
    } else if (line.includes('Parameter:')) {
      return <span className="text-blue-600 dark:text-blue-400 font-medium">{line}</span>;
    }
    return <span className="text-gray-700 dark:text-gray-300">{line}</span>;
  };

  // Rendu des instructions d'installation de sqlmap
  const renderSqlmapInstructions = () => {
    return (
      <div className="sqlmap-instructions bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-yellow-800 dark:text-yellow-100">Installation de sqlmap requise</h3>
        
        {!pythonInstalled && (
          <div className="installation-step mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">1. Installer Python</h4>
            <p className="mb-2 text-gray-700 dark:text-gray-300">sqlmap nécessite Python pour fonctionner. Téléchargez et installez Python depuis <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">python.org</a>.</p>
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
          <h4 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">{pythonInstalled ? '2' : '3'}. Installer sqlmap dans l'environnement virtuel</h4>
          
          <div className="installation-option mb-3">
            <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Windows</h5>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 overflow-x-auto">.\\env\\Scripts\\pip install sqlmap</pre>
          </div>
          
          <div className="installation-option mb-3">
            <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Linux/Mac</h5>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 overflow-x-auto">./env/bin/pip install sqlmap</pre>
          </div>
        </div>
        
        <button 
          className="retry-button bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          onClick={retryCheckSqlmap}
          disabled={isCheckingSqlmap}
        >
          {isCheckingSqlmap ? 'Vérification...' : 'Vérifier à nouveau'}
        </button>
      </div>
    );
  };

  // Rendu du formulaire de scan
  const renderScanForm = () => {
    return (
      <div className="scan-form bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
        <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-sky-300">Nouveau Scan SQLyzer</h3>
        
        <form onSubmit={handleScan}>
          <div className="form-group mb-4">
            <label htmlFor="targetUrl" className="block text-gray-700 dark:text-gray-300 mb-1">URL Cible:</label>
            <input
              type="text"
              id="targetUrl"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/page.php?id=1"
              disabled={isScanning}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>
          
          <div className="form-row grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label htmlFor="level" className="block text-gray-700 dark:text-gray-300 mb-1">Niveau de test:</label>
              <select
                id="level"
                value={scanOptions.level}
                onChange={(e) => handleOptionChange('level', parseInt(e.target.value))}
                disabled={isScanning}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="1">1 (Rapide)</option>
                <option value="2">2</option>
                <option value="3">3 (Défaut)</option>
                <option value="4">4</option>
                <option value="5">5 (Approfondi)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="risk" className="block text-gray-700 dark:text-gray-300 mb-1">Niveau de risque:</label>
              <select
                id="risk"
                value={scanOptions.risk}
                onChange={(e) => handleOptionChange('risk', parseInt(e.target.value))}
                disabled={isScanning}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="1">1 (Sûr)</option>
                <option value="2">2</option>
                <option value="3">3 (Défaut)</option>
              </select>
            </div>
          </div>
          
          <div className="form-row grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label htmlFor="dbms" className="block text-gray-700 dark:text-gray-300 mb-1">SGBD cible (optionnel):</label>
              <select
                id="dbms"
                value={scanOptions.dbms}
                onChange={(e) => handleOptionChange('dbms', e.target.value)}
                disabled={isScanning}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="">Auto-détection</option>
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="mssql">Microsoft SQL Server</option>
                <option value="oracle">Oracle</option>
                <option value="sqlite">SQLite</option>
                <option value="access">Microsoft Access</option>
                <option value="firebird">Firebird</option>
                <option value="maxdb">SAP MaxDB</option>
                <option value="sybase">Sybase</option>
                <option value="db2">IBM DB2</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="threads" className="block text-gray-700 dark:text-gray-300 mb-1">Threads:</label>
              <select
                id="threads"
                value={scanOptions.threads}
                onChange={(e) => handleOptionChange('threads', parseInt(e.target.value))}
                disabled={isScanning}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>
          
          <div className="form-row grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="form-group checkbox-group">
              <label className="flex items-center text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={scanOptions.forms}
                  onChange={(e) => handleOptionChange('forms', e.target.checked)}
                  disabled={isScanning}
                  className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded"
                />
                Tester les formulaires
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="flex items-center text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={scanOptions.schema}
                  onChange={(e) => handleOptionChange('schema', e.target.checked)}
                  disabled={isScanning}
                  className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded"
                />
                Récupérer le schéma
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="flex items-center text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={scanOptions.randomAgent}
                  onChange={(e) => handleOptionChange('randomAgent', e.target.checked)}
                  disabled={isScanning}
                  className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded"
                />
                User-Agent aléatoire
              </label>
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              className="scan-button w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={isScanning || !targetUrl}
            >
              {isScanning ? 'Scan en cours...' : 'Lancer le scan'}
            </button>
          </div>
        </form>
        
        {scanStatus && <div className="scan-status mt-4 text-blue-600 dark:text-blue-400">{scanStatus}</div>}
        {errorMessage && <div className="error-message mt-4 text-red-600 dark:text-red-400">{errorMessage}</div>}
      </div>
    );
  };

  // Rendu des résultats du scan
  const renderScanResults = () => {
    if (!scanResults) return null;
    
    return (
      <div className="scan-results bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-4 h-full overflow-auto">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Résultats du scan</h3>
        
        <div className="result-header flex flex-col md:flex-row justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="result-target mb-2 md:mb-0">
            <strong className="font-medium text-gray-700 dark:text-gray-300">URL cible:</strong> <span className="text-gray-800 dark:text-gray-200">{scanResults.targetUrl}</span>
          </div>
          <div className="result-timestamp">
            <strong className="font-medium text-gray-700 dark:text-gray-300">Date:</strong> <span className="text-gray-800 dark:text-gray-200">{new Date(scanResults.timestamp).toLocaleString()}</span>
          </div>
        </div>
        
        {scanResults.vulnerabilities && scanResults.vulnerabilities.length > 0 && (
          <div className="result-section vulnerabilities mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 rounded-lg">
            <h4 className="text-lg font-medium mb-3 text-red-700 dark:text-red-400">Vulnérabilités détectées</h4>
            <ul className="space-y-3">
              {scanResults.vulnerabilities.map((vuln, index) => (
                <li key={index} className="vulnerability-item p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                  <div className="mb-1 text-gray-800 dark:text-gray-200"><strong className="font-medium">Paramètre:</strong> {vuln.parameter}</div>
                  <div className="mb-1 text-gray-800 dark:text-gray-200"><strong className="font-medium">Emplacement:</strong> {vuln.location}</div>
                  <div className="text-gray-800 dark:text-gray-200"><strong className="font-medium">Type:</strong> {vuln.type}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {scanResults.databases && scanResults.databases.length > 0 && (
          <div className="result-section databases mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-700 rounded-lg">
            <h4 className="text-lg font-medium mb-3 text-green-700 dark:text-green-400">Bases de données</h4>
            <ul className="space-y-1">
              {scanResults.databases.map((db, index) => (
                <li key={index} className="p-2 bg-white dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">{db}</li>
              ))}
            </ul>
          </div>
        )}
        
        {scanResults.tables && scanResults.tables.length > 0 && (
          <div className="result-section tables mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-700 rounded-lg">
            <h4 className="text-lg font-medium mb-3 text-blue-700 dark:text-blue-400">Tables</h4>
            {scanResults.tables.map((dbTables, index) => (
              <div key={index} className="database-tables mb-4">
                <h5 className="font-medium mb-2 text-gray-800 dark:text-gray-200">{dbTables.database}</h5>
                <ul className="space-y-1 pl-4">
                  {dbTables.tables.map((table, tableIndex) => (
                    <li key={tableIndex} className="p-2 bg-white dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">{table}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        <div className="result-section output-log mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Journal de sortie</h4>
          <pre className="output-log-content p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto max-h-96">
            {outputLog.map((line, index) => (
              <div key={index} className="mb-1">{formatLogLine(line)}</div>
            ))}
          </pre>
        </div>
      </div>
    );
  };

  // Rendu de l'historique des scans
  const renderScanHistory = () => {
    return (
      <div className="scan-history bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Historique des scans</h3>
        
        {scanHistory.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 italic">Aucun scan effectué</p>
        ) : (
          <>
            <div className="export-format-selector mb-4">
              <label htmlFor="exportFormat" className="block text-gray-700 dark:text-gray-300 mb-1">Format d'export:</label>
              <select 
                id="exportFormat" 
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="json">JSON</option>
                <option value="html">HTML</option>
              </select>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {scanHistory.map((scan) => (
                <li
                  key={scan.id}
                  className={`py-3 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${selectedScanId === scan.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-400' : ''}`}
                  onClick={() => viewScanResult(scan.id)}
                >
                  <div className="scan-info flex flex-col">
                    <span className="scan-target font-medium text-gray-800 dark:text-gray-200">{scan.targetUrl}</span>
                    <span className="scan-date text-xs text-gray-500 dark:text-gray-500">
                      {new Date(scan.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="scan-actions flex gap-2 mt-2">
                    <button
                      className="export-button bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs transition-colors"
                      onClick={(e) => exportScanResult(scan.id, e)}
                      title={`Exporter en ${exportFormat.toUpperCase()}`}
                    >
                      Exporter
                    </button>
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
          </>
        )}
      </div>
    );
  };

  return (
    <div className="sqlyzer bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg shadow-md">
      <h1 className="page-title text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">SQLyzer - Analyseur SQL Injection</h1>
      
      {isCheckingSqlmap ? (
        <div className="loading text-center py-4">Vérification de l'installation de sqlmap...</div>
      ) : !sqlmapInstalled ? (
        renderSqlmapInstructions()
      ) : (
        <div className="sqlyzer-content flex flex-col md:flex-row gap-4">
          <div className="sqlyzer-main w-full md:w-2/3">
            {renderScanForm()}
            {renderScanResults()}
          </div>
          <div className="sqlyzer-sidebar w-full md:w-1/3">
            {renderScanHistory()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SQLyzer; 
