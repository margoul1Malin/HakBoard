import React, { useState, useEffect } from 'react';
import './SQLyzer.css';

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
      
      // Créer un fichier JSON
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `sqlmap_scan_${result.targetUrl.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(result.timestamp).toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      setScanStatus('Export réussi');
    } catch (error) {
      console.error('Erreur lors de l\'exportation des résultats:', error);
      setErrorMessage(`Erreur lors de l'exportation: ${error.message}`);
    }
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

  // Rendu des instructions d'installation de sqlmap
  const renderSqlmapInstructions = () => {
    return (
      <div className="sqlmap-instructions">
        <h3>Installation de sqlmap requise</h3>
        
        {!pythonInstalled && (
          <div className="installation-step">
            <h4>1. Installer Python</h4>
            <p>sqlmap nécessite Python pour fonctionner. Téléchargez et installez Python depuis <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer">python.org</a>.</p>
          </div>
        )}
        
        <div className="installation-step">
          <h4>{pythonInstalled ? '1' : '2'}. Créer un environnement virtuel</h4>
          <p>Créez un environnement virtuel à la racine du projet :</p>
          
          <div className="installation-option">
            <h5>Windows</h5>
            <pre>python -m venv env</pre>
          </div>
          
          <div className="installation-option">
            <h5>Linux/Mac</h5>
            <pre>python3 -m venv env</pre>
          </div>
        </div>
        
        <div className="installation-step">
          <h4>{pythonInstalled ? '2' : '3'}. Installer sqlmap dans l'environnement virtuel</h4>
          
          <div className="installation-option">
            <h5>Windows</h5>
            <pre>.\\env\\Scripts\\pip install sqlmap</pre>
          </div>
          
          <div className="installation-option">
            <h5>Linux/Mac</h5>
            <pre>./env/bin/pip install sqlmap</pre>
          </div>
        </div>
        
        <button 
          className="retry-button"
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
      <div className="scan-form">
        <h3>Nouveau Scan SQLyzer</h3>
        
        <form onSubmit={handleScan}>
          <div className="form-group">
            <label htmlFor="targetUrl">URL Cible:</label>
            <input
              type="text"
              id="targetUrl"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/page.php?id=1"
              disabled={isScanning}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="level">Niveau de test:</label>
              <select
                id="level"
                value={scanOptions.level}
                onChange={(e) => handleOptionChange('level', parseInt(e.target.value))}
                disabled={isScanning}
              >
                <option value="1">1 (Rapide)</option>
                <option value="2">2</option>
                <option value="3">3 (Défaut)</option>
                <option value="4">4</option>
                <option value="5">5 (Approfondi)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="risk">Niveau de risque:</label>
              <select
                id="risk"
                value={scanOptions.risk}
                onChange={(e) => handleOptionChange('risk', parseInt(e.target.value))}
                disabled={isScanning}
              >
                <option value="1">1 (Sûr)</option>
                <option value="2">2</option>
                <option value="3">3 (Défaut)</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dbms">SGBD cible (optionnel):</label>
              <select
                id="dbms"
                value={scanOptions.dbms}
                onChange={(e) => handleOptionChange('dbms', e.target.value)}
                disabled={isScanning}
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
              <label htmlFor="threads">Threads:</label>
              <select
                id="threads"
                value={scanOptions.threads}
                onChange={(e) => handleOptionChange('threads', parseInt(e.target.value))}
                disabled={isScanning}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={scanOptions.forms}
                  onChange={(e) => handleOptionChange('forms', e.target.checked)}
                  disabled={isScanning}
                />
                Tester les formulaires
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={scanOptions.schema}
                  onChange={(e) => handleOptionChange('schema', e.target.checked)}
                  disabled={isScanning}
                />
                Récupérer le schéma
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={scanOptions.randomAgent}
                  onChange={(e) => handleOptionChange('randomAgent', e.target.checked)}
                  disabled={isScanning}
                />
                User-Agent aléatoire
              </label>
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              className="scan-button"
              disabled={isScanning || !targetUrl}
            >
              {isScanning ? 'Scan en cours...' : 'Lancer le scan'}
            </button>
          </div>
        </form>
        
        {scanStatus && <div className="scan-status">{scanStatus}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}
      </div>
    );
  };

  // Rendu des résultats du scan
  const renderScanResults = () => {
    if (!scanResults) return null;
    
    return (
      <div className="scan-results">
        <h3>Résultats du scan</h3>
        
        <div className="result-header">
          <div className="result-target">
            <strong>URL cible:</strong> {scanResults.targetUrl}
          </div>
          <div className="result-timestamp">
            <strong>Date:</strong> {new Date(scanResults.timestamp).toLocaleString()}
          </div>
        </div>
        
        {scanResults.vulnerabilities && scanResults.vulnerabilities.length > 0 && (
          <div className="result-section vulnerabilities">
            <h4>Vulnérabilités détectées</h4>
            <ul>
              {scanResults.vulnerabilities.map((vuln, index) => (
                <li key={index} className="vulnerability-item">
                  <div><strong>Paramètre:</strong> {vuln.parameter}</div>
                  <div><strong>Emplacement:</strong> {vuln.location}</div>
                  <div><strong>Type:</strong> {vuln.type}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {scanResults.databases && scanResults.databases.length > 0 && (
          <div className="result-section databases">
            <h4>Bases de données</h4>
            <ul>
              {scanResults.databases.map((db, index) => (
                <li key={index}>{db}</li>
              ))}
            </ul>
          </div>
        )}
        
        {scanResults.tables && scanResults.tables.length > 0 && (
          <div className="result-section tables">
            <h4>Tables</h4>
            {scanResults.tables.map((dbTables, index) => (
              <div key={index} className="database-tables">
                <h5>{dbTables.database}</h5>
                <ul>
                  {dbTables.tables.map((table, tableIndex) => (
                    <li key={tableIndex}>{table}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        <div className="result-section output-log">
          <h4>Journal de sortie</h4>
          <pre className="output-log-content">
            {outputLog.join('\n')}
          </pre>
        </div>
      </div>
    );
  };

  // Rendu de l'historique des scans
  const renderScanHistory = () => {
    return (
      <div className="scan-history">
        <h3>Historique des scans</h3>
        
        {scanHistory.length === 0 ? (
          <p>Aucun scan effectué</p>
        ) : (
          <ul>
            {scanHistory.map((scan) => (
              <li
                key={scan.id}
                className={selectedScanId === scan.id ? 'selected' : ''}
                onClick={() => viewScanResult(scan.id)}
              >
                <div className="scan-info">
                  <span className="scan-target">{scan.targetUrl}</span>
                  <span className="scan-date">
                    {new Date(scan.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="scan-actions">
                  <button
                    className="export-button"
                    onClick={(e) => exportScanResult(scan.id, e)}
                    title="Exporter les résultats"
                  >
                    Exporter
                  </button>
                  <button
                    className="delete-button"
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
    );
  };

  return (
    <div className="sqlyzer">
      <h1 className="page-title">SQLyzer - Analyseur SQL Injection</h1>
      
      {isCheckingSqlmap ? (
        <div className="loading">Vérification de l'installation de sqlmap...</div>
      ) : !sqlmapInstalled ? (
        renderSqlmapInstructions()
      ) : (
        <div className="sqlyzer-content">
          <div className="sqlyzer-main">
            {renderScanForm()}
            {renderScanResults()}
          </div>
          <div className="sqlyzer-sidebar">
            {renderScanHistory()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SQLyzer; 
