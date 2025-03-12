import React, { useState, useEffect } from 'react';
import './NetworkScanner.css';
import nmapService from '../../services/nmapService';

// Importer les constantes de stockage
const SCAN_RESULTS_KEY = 'nmap_scan_results';
const SCAN_HISTORY_KEY = 'nmap_scan_history';

const NetworkScanner = () => {
  // États pour les paramètres de scan
  const [target, setTarget] = useState('');
  const [scanType, setScanType] = useState('basic');
  const [scanName, setScanName] = useState('');
  const [ports, setPorts] = useState('');
  const [enableScripts, setEnableScripts] = useState(false);
  const [scriptCategories, setScriptCategories] = useState('');
  const [specificScripts, setSpecificScripts] = useState('');
  const [timing, setTiming] = useState('4');
  const [additionalOptions, setAdditionalOptions] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  
  // États pour le statut et les résultats
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [nmapInstalled, setNmapInstalled] = useState(false);
  const [isCheckingNmap, setIsCheckingNmap] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Vérifier si Nmap est installé au chargement du composant
  useEffect(() => {
    const checkNmap = async () => {
      try {
        setIsCheckingNmap(true);
        const isInstalled = await nmapService.checkNmapInstallation();
        setNmapInstalled(isInstalled);
        if (!isInstalled) {
          setErrorMessage('Nmap n\'est pas installé ou n\'est pas dans le PATH');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de Nmap:', error);
        setErrorMessage(`Erreur lors de la vérification de Nmap: ${error.message}`);
        setNmapInstalled(false);
      } finally {
        setIsCheckingNmap(false);
      }
    };

    // Charger l'historique des scans
    const loadScanHistory = () => {
      try {
        const history = nmapService.getScanHistory();
        setScanHistory(history);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des scans:', error);
      }
    };

    checkNmap();
    loadScanHistory();
  }, []);

  // Fonction pour rafraîchir l'historique des scans et les résultats
  const refreshScanData = () => {
    try {
      console.log('Rafraîchissement des données de scan');
      const history = nmapService.getScanHistory();
      setScanHistory(history);
      
      // Si un scan est sélectionné, rafraîchir ses résultats
      if (selectedScanId) {
        const result = nmapService.getScanResult(selectedScanId);
        if (result) {
          setScanResults(result);
        } else {
          // Si le résultat n'existe plus, désélectionner le scan
          setSelectedScanId(null);
          setScanResults(null);
          setErrorMessage('Le résultat du scan sélectionné n\'est plus disponible');
        }
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données:', error);
    }
  };

  // Ajouter un useEffect pour rafraîchir périodiquement les données
  useEffect(() => {
    // Rafraîchir les données toutes les 30 secondes
    const refreshInterval = setInterval(refreshScanData, 30000);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(refreshInterval);
  }, [selectedScanId]); // Dépendance à selectedScanId pour recréer l'intervalle si le scan sélectionné change

  // Fonction pour lancer un scan
  const handleScan = async () => {
    if (!target) {
      setErrorMessage('Veuillez spécifier une cible');
      return;
    }

    setIsScanning(true);
    setScanStatus('Démarrage du scan...');
    setScanResults(null);
    setErrorMessage('');

    // Générer un nom par défaut si aucun nom n'est fourni
    const effectiveScanName = scanName.trim() || `Scan ${scanType} - ${target} - ${new Date().toLocaleString()}`;

    try {
      const result = await nmapService.runNmapScan({
        target,
        scanName: effectiveScanName,
        scanType,
        ports,
        enableScripts,
        scriptCategories,
        specificScripts,
        timing,
        additionalOptions,
        onProgress: (progress) => {
          setScanStatus(progress.message);
          if (progress.status === 'error') {
            setErrorMessage(progress.error || 'Erreur pendant le scan');
          }
        }
      });

      setScanResults(result);
      // Rafraîchir l'historique des scans et les résultats
      refreshScanData();
      // Réinitialiser le nom du scan pour le prochain scan
      setScanName('');
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      setErrorMessage(`Erreur lors du scan: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Fonction pour afficher les résultats d'un scan précédent
  const viewScanResult = (scanId) => {
    try {
      console.log('Récupération du scan:', scanId);
      const result = nmapService.getScanResult(scanId);
      if (result) {
        console.log('Scan trouvé:', result.id);
        setScanResults(result);
        setSelectedScanId(scanId);
      } else {
        console.error('Scan non trouvé:', scanId);
        setErrorMessage('Impossible de trouver les résultats du scan');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats du scan:', error);
      setErrorMessage(`Erreur lors de la récupération des résultats: ${error.message}`);
    }
  };

  // Fonction pour supprimer un scan
  const deleteScan = (scanId, event) => {
    event.stopPropagation();
    
    try {
      console.log('Suppression du scan:', scanId);
      
      // Supprimer le scan
      const success = nmapService.deleteScanResult(scanId);
      
      if (success) {
        // Rafraîchir les données
        refreshScanData();
        
        // Si le scan supprimé était sélectionné, effacer les résultats
        if (selectedScanId === scanId) {
          setScanResults(null);
          setSelectedScanId(null);
        }
        
        // Afficher un message de confirmation
        setErrorMessage('');
        setScanStatus('Scan supprimé avec succès');
        
        // Effacer le message après 3 secondes
        setTimeout(() => {
          setScanStatus('');
        }, 3000);
      } else {
        setErrorMessage('Erreur lors de la suppression du scan');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du scan:', error);
      setErrorMessage(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  // Fonction pour exporter les résultats d'un scan
  const exportScanResult = (scanId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      console.log('Exportation du scan:', scanId);
      const result = nmapService.getScanResult(scanId);
      
      if (!result) {
        console.error('Résultat de scan non trouvé pour ID:', scanId);
        setErrorMessage('Résultat de scan non trouvé');
        return;
      }
      
      let dataStr;
      let filename;
      
      switch (exportFormat) {
        case 'xml':
          // Exporter au format XML (si disponible dans le résultat)
          if (result.rawXml) {
            dataStr = "data:text/xml;charset=utf-8," + encodeURIComponent(result.rawXml);
            filename = `nmap_scan_${result.target}_${new Date(result.timestamp).toISOString().slice(0,10)}.xml`;
          } else {
            // Si les données XML ne sont pas disponibles (récupérées depuis localStorage)
            setErrorMessage('Données XML brutes non disponibles pour ce scan. Veuillez utiliser un autre format d\'export ou refaire le scan.');
            return;
          }
          break;
          
        case 'txt':
          // Générer un rapport texte à partir des résultats
          const txtContent = generateTextReport(result);
          dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(txtContent);
          filename = `nmap_scan_${result.target}_${new Date(result.timestamp).toISOString().slice(0,10)}.txt`;
          break;
          
        case 'json':
        default:
          // Exporter au format JSON (par défaut)
          dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
          filename = `nmap_scan_${result.target}_${new Date(result.timestamp).toISOString().slice(0,10)}.json`;
          break;
      }
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", filename);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      console.log('Export réussi:', filename);
      
      // Afficher un message de confirmation
      setErrorMessage('');
      setScanStatus(`Export réussi: ${filename}`);
      
      // Effacer le message après 3 secondes
      setTimeout(() => {
        setScanStatus('');
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de l\'exportation des résultats:', error);
      setErrorMessage(`Erreur lors de l\'exportation: ${error.message}`);
    }
  };

  // Fonction pour générer un rapport texte à partir des résultats du scan
  const generateTextReport = (scanResult) => {
    const { result, duration, timestamp, target, scanName, scanType, command } = scanResult;
    const { hosts = [] } = result;
    
    let report = `# Rapport de scan Nmap\n\n`;
    report += `Nom: ${scanName || 'Sans nom'}\n`;
    report += `Date: ${new Date(timestamp).toLocaleString()}\n`;
    report += `Cible: ${target}\n`;
    report += `Type de scan: ${scanType}\n`;
    report += `Durée: ${duration.toFixed(2)} secondes\n`;
    report += `Commande: ${command}\n\n`;
    
    if (hosts.length === 0) {
      report += `Aucun hôte trouvé.\n`;
    } else {
      report += `## Hôtes découverts (${hosts.length})\n\n`;
      
      hosts.forEach((host, index) => {
        const address = Array.isArray(host.addresses) && host.addresses.length > 0
          ? host.addresses.map(addr => `${addr.addr} (${addr.addrtype})`).join(', ')
          : 'Adresse inconnue';
          
        const hostname = Array.isArray(host.hostnames) && host.hostnames.length > 0
          ? host.hostnames.join(', ')
          : 'Aucun nom d\'hôte';
          
        report += `### Hôte ${index + 1}: ${address}\n`;
        report += `Nom d'hôte: ${hostname}\n`;
        
        if (host.status) {
          report += `Statut: ${host.status.state} (${host.status.reason || 'raison inconnue'})\n`;
        }
        
        if (Array.isArray(host.os) && host.os.length > 0) {
          report += `\n#### Système d'exploitation\n`;
          host.os.forEach(os => {
            report += `- ${os.name || 'Inconnu'} (${os.accuracy || '?'}% de certitude)\n`;
          });
        }
        
        if (Array.isArray(host.ports) && host.ports.length > 0) {
          report += `\n#### Ports\n`;
          report += `| Port | Protocole | État | Service | Version |\n`;
          report += `|------|-----------|------|---------|--------|\n`;
          
          host.ports.forEach(port => {
            const service = port.service ? port.service.name : '-';
            const version = port.service && port.service.product
              ? `${port.service.product}${port.service.version ? ` ${port.service.version}` : ''}`
              : '-';
              
            report += `| ${port.portid || port.port || '?'} | ${port.protocol || '?'} | ${port.state || '?'} | ${service} | ${version} |\n`;
          });
        }
        
        if (Array.isArray(host.scripts) && host.scripts.length > 0) {
          report += `\n#### Scripts\n`;
          host.scripts.forEach(script => {
            report += `##### ${script.id || 'Script inconnu'}\n`;
            report += `\`\`\`\n${script.output || 'Pas de sortie'}\n\`\`\`\n\n`;
          });
        }
        
        report += `\n`;
      });
    }
    
    return report;
  };

  // Fonction pour ajouter une cible à partir des résultats du scan
  const addTargetFromScan = (host) => {
    // Implémenter la logique pour ajouter une cible au service de cibles
    console.log('Ajout de la cible:', host);
    // TODO: Intégrer avec le service de cibles
  };

  // Fonction pour réessayer la vérification de Nmap
  const retryCheckNmap = () => {
    setIsCheckingNmap(true);
    setErrorMessage('');
    nmapService.checkNmapInstallation()
      .then(isInstalled => {
        setNmapInstalled(isInstalled);
        if (!isInstalled) {
          setErrorMessage('Nmap n\'est pas installé ou n\'est pas dans le PATH');
        }
      })
      .catch(error => {
        console.error('Erreur lors de la vérification de Nmap:', error);
        setErrorMessage(`Erreur lors de la vérification de Nmap: ${error.message}`);
        setNmapInstalled(false);
      })
      .finally(() => {
        setIsCheckingNmap(false);
      });
  };

  // Fonction pour effacer le cache et les données stockées
  const clearStoredData = () => {
    try {
      // Effacer les données de sessionStorage
      sessionStorage.removeItem(SCAN_RESULTS_KEY);
      
      // Effacer les données de localStorage
      localStorage.removeItem(SCAN_RESULTS_KEY);
      localStorage.removeItem(SCAN_HISTORY_KEY);
      
      // Réinitialiser les états
      setScanResults(null);
      setSelectedScanId(null);
      setScanHistory([]);
      
      // Afficher un message de confirmation
      setErrorMessage('');
      setScanStatus('Toutes les données de scan ont été effacées');
      
      // Effacer le message après 3 secondes
      setTimeout(() => {
        setScanStatus('');
      }, 3000);
      
      console.log('Données de scan effacées avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'effacement des données:', error);
      setErrorMessage(`Erreur lors de l\'effacement des données: ${error.message}`);
    }
  };

  // Rendu des instructions d'installation de Nmap
  const renderNmapInstallationInstructions = () => {
    return (
      <div className="installation-instructions">
        <h3>Instructions d'installation de Nmap</h3>
        
        <h4>Windows</h4>
        <ol>
          <li>Téléchargez Nmap depuis le <a href="https://nmap.org/download.html" target="_blank" rel="noopener noreferrer">site officiel</a></li>
          <li>Exécutez l'installateur et suivez les instructions</li>
          <li>Assurez-vous que l'option "Add Nmap to PATH" est cochée pendant l'installation</li>
          <li>Redémarrez votre ordinateur après l'installation</li>
        </ol>
        
        <h4>Linux</h4>
        <p>Utilisez le gestionnaire de paquets de votre distribution:</p>
        <pre>
          # Ubuntu/Debian
          sudo apt-get update
          sudo apt-get install nmap
          
          # Fedora
          sudo dnf install nmap
          
          # Arch Linux
          sudo pacman -S nmap
        </pre>
        
        <h4>macOS</h4>
        <p>Utilisez Homebrew:</p>
        <pre>
          brew install nmap
        </pre>
        
        <button className="retry-button" onClick={retryCheckNmap} disabled={isCheckingNmap}>
          {isCheckingNmap ? 'Vérification...' : 'Vérifier à nouveau'}
        </button>
      </div>
    );
  };

  // Rendu du formulaire de scan
  const renderScanForm = () => {
    return (
      <div className="scan-form">
        <h3>Nouveau Scan</h3>
        
        <div className="form-group">
          <label htmlFor="scanName">Nom du scan (optionnel):</label>
          <input
            type="text"
            id="scanName"
            value={scanName}
            onChange={(e) => setScanName(e.target.value)}
            placeholder="Nom descriptif pour ce scan"
            disabled={isScanning}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="target">Cible:</label>
          <input
            type="text"
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="IP, plage d'IP (ex: 192.168.1.1-10) ou nom d'hôte"
            disabled={isScanning}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="scanType">Type de scan:</label>
          <select
            id="scanType"
            value={scanType}
            onChange={(e) => setScanType(e.target.value)}
            disabled={isScanning}
          >
            <option value="basic">Scan basique (SYN)</option>
            <option value="port">Scan de ports</option>
            <option value="service">Détection de services</option>
            <option value="os">Détection de système d'exploitation</option>
            <option value="script">Scan avec scripts</option>
            <option value="ping">Ping scan (-sn)</option>
            <option value="tcp">TCP Connect scan (-sT)</option>
            <option value="udp">UDP scan (-sU)</option>
            <option value="xmas">Xmas scan (-sX)</option>
            <option value="fin">FIN scan (-sF)</option>
            <option value="null">NULL scan (-sN)</option>
            <option value="maimon">Maimon scan (-sM)</option>
            <option value="window">Window scan (-sW)</option>
            <option value="ack">ACK scan (-sA)</option>
          </select>
        </div>
        
        {(scanType !== 'ping' && (scanType === 'port' || scanType === 'service' || scanType === 'script' || scanType === 'tcp' || scanType === 'udp' || scanType === 'xmas' || scanType === 'fin' || scanType === 'null' || scanType === 'maimon' || scanType === 'window' || scanType === 'ack')) && (
          <div className="form-group">
            <label htmlFor="ports">Ports:</label>
            <input
              type="text"
              id="ports"
              value={ports}
              onChange={(e) => setPorts(e.target.value)}
              placeholder="ex: 22,80,443 ou 1-1000"
              disabled={isScanning}
            />
          </div>
        )}
        
        {scanType === 'script' && (
          <>
            <div className="form-group">
              <label htmlFor="enableScripts">
                <input
                  type="checkbox"
                  id="enableScripts"
                  checked={enableScripts}
                  onChange={(e) => setEnableScripts(e.target.checked)}
                  disabled={isScanning}
                />
                Activer les scripts NSE
              </label>
            </div>
            
            {enableScripts && (
              <>
                <div className="form-group">
                  <label htmlFor="scriptCategories">Catégories de scripts:</label>
                  <select
                    id="scriptCategories"
                    value={scriptCategories}
                    onChange={(e) => setScriptCategories(e.target.value)}
                    disabled={isScanning}
                  >
                    <option value="">Sélectionner une catégorie</option>
                    <option value="default">default</option>
                    <option value="discovery">discovery</option>
                    <option value="safe">safe</option>
                    <option value="vuln">vuln</option>
                    <option value="auth">auth</option>
                    <option value="brute">brute</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="specificScripts">Scripts spécifiques:</label>
                  <input
                    type="text"
                    id="specificScripts"
                    value={specificScripts}
                    onChange={(e) => setSpecificScripts(e.target.value)}
                    placeholder="ex: http-title,ssh-auth-methods"
                    disabled={isScanning || scriptCategories !== ''}
                  />
                </div>
              </>
            )}
          </>
        )}
        
        <div className="form-group">
          <label htmlFor="timing">Timing (vitesse):</label>
          <select
            id="timing"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            disabled={isScanning}
          >
            <option value="0">T0 (Paranoïaque)</option>
            <option value="1">T1 (Furtif)</option>
            <option value="2">T2 (Poli)</option>
            <option value="3">T3 (Normal)</option>
            <option value="4">T4 (Agressif)</option>
            <option value="5">T5 (Insensé)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="additionalOptions">Options supplémentaires:</label>
          <input
            type="text"
            id="additionalOptions"
            value={additionalOptions}
            onChange={(e) => setAdditionalOptions(e.target.value)}
            placeholder="Options Nmap supplémentaires"
            disabled={isScanning}
          />
        </div>
        
        <button
          className="scan-button"
          onClick={handleScan}
          disabled={isScanning || !target}
        >
          {isScanning ? 'Scan en cours...' : 'Lancer le scan'}
        </button>
        
        {isScanning && <div className="scan-status">{scanStatus}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}
      </div>
    );
  };

  // Rendu de l'historique des scans
  const renderScanHistory = () => {
    return (
      <div className="scan-history">
        <div className="scan-history-header">
          <h3>Historique des scans</h3>
          <button 
            className="clear-data-button" 
            onClick={clearStoredData}
            title="Effacer toutes les données de scan stockées"
          >
            Effacer les données
          </button>
        </div>
        
        {scanHistory.length === 0 ? (
          <p>Aucun scan effectué</p>
        ) : (
          <>
            <div className="export-format-selector">
              <label htmlFor="exportFormat">Format d'export:</label>
              <select
                id="exportFormat"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
                <option value="txt">Texte</option>
              </select>
            </div>
            
            <ul>
              {scanHistory.map((scan) => {
                // Vérifier si le résultat du scan existe encore
                const scanExists = nmapService.getScanResult(scan.id) !== null;
                
                return (
                  <li
                    key={scan.id}
                    className={selectedScanId === scan.id ? 'selected' : ''}
                    onClick={() => viewScanResult(scan.id)}
                  >
                    <div className="scan-info">
                      <span className="scan-name">{scan.scanName || scan.target}</span>
                      <span className="scan-target">{scan.target}</span>
                      <span className="scan-date">
                        {new Date(scan.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="scan-actions">
                      <button
                        className="export-button"
                        onClick={(e) => exportScanResult(scan.id, e)}
                        title={`Exporter au format ${exportFormat.toUpperCase()}`}
                        disabled={!scanExists}
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
                );
              })}
            </ul>
          </>
        )}
      </div>
    );
  };

  // Rendu des résultats du scan
  const renderScanResults = () => {
    if (!scanResults) return null;

    const { result, duration, timestamp } = scanResults;
    
    // Vérifier que result existe
    if (!result) {
      return (
        <div className="scan-results">
          <h3>Résultats du scan</h3>
          <div className="error-message">
            Erreur: Résultats de scan invalides ou incomplets
          </div>
        </div>
      );
    }
    
    // Vérifier que hosts existe, sinon initialiser comme tableau vide
    const hosts = result.hosts || [];

    return (
      <div className="scan-results">
        <h3>Résultats du scan</h3>
        <div className="scan-metadata">
          <p>
            <strong>Date:</strong> {new Date(timestamp).toLocaleString()}
          </p>
          <p>
            <strong>Durée:</strong> {duration.toFixed(2)} secondes
          </p>
        </div>

        {hosts.length === 0 ? (
          <p>Aucun hôte trouvé</p>
        ) : (
          <div className="hosts-list">
            {hosts.map((host, index) => (
              <div key={index} className="host-item">
                <div className="host-header">
                  <h4>
                    {/* Vérifier que addresses existe et est un tableau */}
                    {Array.isArray(host.addresses) 
                      ? host.addresses.map(addr => addr.addr).join(', ')
                      : (host.address || 'Adresse inconnue')}
                    {/* Vérifier que hostnames existe et est un tableau non vide */}
                    {Array.isArray(host.hostnames) && host.hostnames.length > 0 
                      ? ` (${host.hostnames.join(', ')})` 
                      : ''}
                  </h4>
                  <button
                    className="add-target-button"
                    onClick={() => addTargetFromScan(host)}
                    title="Ajouter aux cibles"
                  >
                    Ajouter aux cibles
                  </button>
                </div>

                {host.status && (
                  <p className="host-status">
                    <strong>Statut:</strong> {host.status.state} ({host.status.reason || 'raison inconnue'})
                  </p>
                )}

                {/* Vérifier que os existe et est un tableau non vide */}
                {Array.isArray(host.os) && host.os.length > 0 && (
                  <div className="host-os">
                    <h5>Système d'exploitation</h5>
                    <ul>
                      {host.os.map((os, osIndex) => (
                        <li key={osIndex}>
                          {os.name || 'Inconnu'} ({os.accuracy || '?'}% de certitude)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Vérifier que ports existe et est un tableau non vide */}
                {Array.isArray(host.ports) && host.ports.length > 0 && (
                  <div className="host-ports">
                    <h5>Ports</h5>
                    <table>
                      <thead>
                        <tr>
                          <th>Port</th>
                          <th>Protocole</th>
                          <th>État</th>
                          <th>Service</th>
                          <th>Version</th>
                        </tr>
                      </thead>
                      <tbody>
                        {host.ports.map((port, portIndex) => (
                          <tr key={portIndex}>
                            <td>{port.portid || port.port || '?'}</td>
                            <td>{port.protocol || '?'}</td>
                            <td>{port.state || '?'}</td>
                            <td>{(port.service && port.service.name) || '-'}</td>
                            <td>
                              {port.service && port.service.product
                                ? `${port.service.product}${
                                    port.service.version ? ` ${port.service.version}` : ''
                                  }`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Vérifier que scripts existe et est un tableau non vide */}
                {Array.isArray(host.scripts) && host.scripts.length > 0 && (
                  <div className="host-scripts">
                    <h5>Résultats des scripts</h5>
                    <ul>
                      {host.scripts.map((script, scriptIndex) => (
                        <li key={scriptIndex}>
                          <strong>{script.id || 'Script inconnu'}:</strong>
                          <pre>{script.output || 'Pas de sortie'}</pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="network-scanner">
      <h2>Scanner Réseau</h2>
      
      {isCheckingNmap ? (
        <div className="loading">Vérification de l'installation de Nmap...</div>
      ) : !nmapInstalled ? (
        <div className="nmap-warning">
          <h3>Nmap n'est pas installé ou n'est pas détecté</h3>
          <p>Le scanner réseau nécessite Nmap pour fonctionner. Veuillez l'installer et vous assurer qu'il est accessible dans votre PATH.</p>
          {renderNmapInstallationInstructions()}
        </div>
      ) : (
        <div className="scanner-container">
          <div className="scanner-left-panel">
            {renderScanForm()}
            {renderScanHistory()}
          </div>
          <div className="scanner-right-panel">
            {renderScanResults()}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkScanner; 