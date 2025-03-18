import React, { useState, useEffect } from 'react';
//import './NetworkScanner.css';
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

  // Fonction pour télécharger la liste des ports communs
  const downloadPortsList = async () => {
    try {
      // Contenu HTML pour le PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Liste des ports communs et services associés</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #2563eb;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
            }
            h2 {
              color: #1e40af;
              margin-top: 30px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .risk-high {
              color: #dc2626;
            }
            ol, ul {
              padding-left: 20px;
            }
            li {
              margin-bottom: 10px;
            }
            a {
              color: #2563eb;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h1>Liste des ports communs et services associés</h1>
          
          <p>Cette liste de référence contient les ports TCP/UDP les plus couramment utilisés et les services qui leur sont généralement associés. Elle peut être utile lors de l'analyse des résultats de scan réseau.</p>
          
          <h2>Ports TCP courants</h2>
          
          <table>
            <thead>
              <tr>
                <th>Port</th>
                <th>Service</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>20</td><td>FTP-DATA</td><td>Protocole de transfert de fichiers (données)</td></tr>
              <tr><td>21</td><td>FTP</td><td>Protocole de transfert de fichiers (contrôle)</td></tr>
              <tr><td>22</td><td>SSH</td><td>Secure Shell</td></tr>
              <tr><td>23</td><td>TELNET</td><td>Telnet - accès terminal non sécurisé</td></tr>
              <tr><td>25</td><td>SMTP</td><td>Simple Mail Transfer Protocol</td></tr>
              <tr><td>53</td><td>DNS</td><td>Domain Name System</td></tr>
              <tr><td>80</td><td>HTTP</td><td>HyperText Transfer Protocol</td></tr>
              <tr><td>110</td><td>POP3</td><td>Post Office Protocol v3</td></tr>
              <tr><td>111</td><td>RPC</td><td>Remote Procedure Call</td></tr>
              <tr><td>135</td><td>MSRPC</td><td>Microsoft RPC</td></tr>
              <tr><td>139</td><td>NETBIOS-SSN</td><td>NetBIOS Session Service</td></tr>
              <tr><td>143</td><td>IMAP</td><td>Internet Message Access Protocol</td></tr>
              <tr><td>443</td><td>HTTPS</td><td>HTTP Secure (HTTP over TLS/SSL)</td></tr>
              <tr><td>445</td><td>SMB</td><td>Server Message Block (Windows File Sharing)</td></tr>
              <tr><td>993</td><td>IMAPS</td><td>IMAP over TLS/SSL</td></tr>
              <tr><td>995</td><td>POP3S</td><td>POP3 over TLS/SSL</td></tr>
              <tr><td>1433</td><td>MS-SQL</td><td>Microsoft SQL Server</td></tr>
              <tr><td>1521</td><td>ORACLE</td><td>Oracle Database</td></tr>
              <tr><td>3306</td><td>MYSQL</td><td>MySQL Database</td></tr>
              <tr><td>3389</td><td>RDP</td><td>Remote Desktop Protocol</td></tr>
              <tr><td>5432</td><td>POSTGRESQL</td><td>PostgreSQL Database</td></tr>
              <tr><td>5900</td><td>VNC</td><td>Virtual Network Computing</td></tr>
              <tr><td>5985</td><td>WINRM</td><td>Windows Remote Management (HTTP)</td></tr>
              <tr><td>5986</td><td>WINRM</td><td>Windows Remote Management (HTTPS)</td></tr>
              <tr><td>8080</td><td>HTTP-ALT</td><td>HTTP Alternate (souvent utilisé pour les proxies)</td></tr>
              <tr><td>8443</td><td>HTTPS-ALT</td><td>HTTPS Alternate</td></tr>
            </tbody>
          </table>
          
          <h2>Ports UDP courants</h2>
          
          <table>
            <thead>
              <tr>
                <th>Port</th>
                <th>Service</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>53</td><td>DNS</td><td>Domain Name System</td></tr>
              <tr><td>67</td><td>DHCP</td><td>Dynamic Host Configuration Protocol (serveur)</td></tr>
              <tr><td>68</td><td>DHCP</td><td>Dynamic Host Configuration Protocol (client)</td></tr>
              <tr><td>69</td><td>TFTP</td><td>Trivial File Transfer Protocol</td></tr>
              <tr><td>123</td><td>NTP</td><td>Network Time Protocol</td></tr>
              <tr><td>137</td><td>NETBIOS-NS</td><td>NetBIOS Name Service</td></tr>
              <tr><td>138</td><td>NETBIOS-DGM</td><td>NetBIOS Datagram Service</td></tr>
              <tr><td>161</td><td>SNMP</td><td>Simple Network Management Protocol</td></tr>
              <tr><td>162</td><td>SNMPTRAP</td><td>SNMP Traps</td></tr>
              <tr><td>500</td><td>ISAKMP</td><td>Internet Security Association and Key Management Protocol (IPsec)</td></tr>
              <tr><td>514</td><td>SYSLOG</td><td>System Logging Protocol</td></tr>
              <tr><td>520</td><td>RIP</td><td>Routing Information Protocol</td></tr>
              <tr><td>1900</td><td>UPNP</td><td>Universal Plug and Play</td></tr>
            </tbody>
          </table>
          
          <h2>Ports dangereux et vulnérabilités courantes</h2>
          
          <table>
            <thead>
              <tr>
                <th>Port</th>
                <th>Service</th>
                <th>Risque potentiel</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>23</td><td>TELNET</td><td class="risk-high">Transmission en clair des identifiants</td></tr>
              <tr><td>25</td><td>SMTP</td><td class="risk-high">Relais ouvert, spam</td></tr>
              <tr><td>135-139</td><td>MSRPC/NETBIOS</td><td class="risk-high">Nombreuses vulnérabilités Windows historiques</td></tr>
              <tr><td>445</td><td>SMB</td><td class="risk-high">Vulnérabilités comme EternalBlue (WannaCry)</td></tr>
              <tr><td>1433-1434</td><td>MS-SQL</td><td class="risk-high">Attaques par force brute, injection SQL</td></tr>
              <tr><td>3389</td><td>RDP</td><td class="risk-high">BlueKeep et autres vulnérabilités RDP</td></tr>
              <tr><td>5800-5900</td><td>VNC</td><td class="risk-high">Accès non autorisé si mal configuré</td></tr>
            </tbody>
          </table>
          
          <h2>Conseils pour l'analyse de ports</h2>
          
          <ol>
            <li><strong>Ports ouverts inutiles</strong> : Tout port ouvert qui n'est pas nécessaire au fonctionnement du système représente une surface d'attaque potentielle.</li>
            <li><strong>Versions obsolètes</strong> : Vérifiez les versions des services détectés. Les versions obsolètes peuvent contenir des vulnérabilités connues.</li>
            <li><strong>Services sur des ports non standard</strong> : Méfiez-vous des services fonctionnant sur des ports inhabituels, cela peut indiquer une tentative de contournement des pare-feu.</li>
            <li><strong>Empreinte du système d'exploitation</strong> : L'analyse des ports ouverts peut révéler le système d'exploitation utilisé, ce qui peut aider à identifier des vulnérabilités spécifiques.</li>
            <li><strong>Ports éphémères</strong> : Les ports au-dessus de 49152 sont généralement des ports éphémères utilisés temporairement pour les connexions sortantes.</li>
          </ol>
          
          <h2>Ressources supplémentaires</h2>
          
          <ul>
            <li><a href="https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml">Base de données des ports IANA</a></li>
            <li><a href="https://cve.mitre.org/">Common Vulnerabilities and Exposures (CVE)</a></li>
            <li><a href="https://nvd.nist.gov/">NIST National Vulnerability Database</a></li>
          </ul>
        </body>
        </html>
      `;
      
      // Créer un blob HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Créer un iframe invisible pour imprimer en PDF
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        // Déclencher l'impression une fois l'iframe chargé
        setTimeout(() => {
          iframe.contentWindow.print();
          
          // Nettoyer après l'impression
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        }, 500);
      };
      
      // Charger le contenu HTML dans l'iframe
      iframe.src = url;
      
      // Afficher un message de confirmation
      setScanStatus('Liste des ports prête à être imprimée en PDF');
      setTimeout(() => {
        setScanStatus('');
      }, 3000);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      setErrorMessage(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  };

  // Rendu des instructions d'installation de Nmap
  const renderNmapInstallationInstructions = () => {
    return (
      <div className="installation-instructions bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-4">
        <h3 className="font-extrabold text-2xl mb-4 text-blue-600 dark:text-sky-300">Instructions d'installation de Nmap</h3>
        
        <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Windows</h4>
        <ol className="list-decimal pl-5 mb-4 text-gray-700 dark:text-gray-300">
          <li className="mb-1">Téléchargez Nmap depuis le <a href="https://nmap.org/download.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">site officiel</a></li>
          <li className="mb-1">Exécutez l'installateur et suivez les instructions</li>
          <li className="mb-1">Assurez-vous que l'option "Add Nmap to PATH" est cochée pendant l'installation</li>
          <li className="mb-1">Redémarrez votre ordinateur après l'installation</li>
        </ol>
        
        <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Linux</h4>
        <p className="mb-2 text-gray-700 dark:text-gray-300">Utilisez le gestionnaire de paquets de votre distribution:</p>
        <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-gray-800 dark:text-gray-200 mb-4 overflow-x-auto">
          # Ubuntu/Debian
          sudo apt-get update
          sudo apt-get install nmap
          
          # Fedora
          sudo dnf install nmap
          
          # Arch Linux
          sudo pacman -S nmap
        </pre>
        
        <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">macOS</h4>
        <p className="mb-2 text-gray-700 dark:text-gray-300">Utilisez Homebrew:</p>
        <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-gray-800 dark:text-gray-200 mb-4 overflow-x-auto">
          brew install nmap
        </pre>
        
        <button 
          className="retry-button bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors" 
          onClick={retryCheckNmap} 
          disabled={isCheckingNmap}
        >
          {isCheckingNmap ? 'Vérification...' : 'Vérifier à nouveau'}
        </button>
      </div>
    );
  };

  // Rendu du formulaire de scan
  const renderScanForm = () => {
    return (
      <div className="scan-form bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
        <div className="scan-form-header flex justify-between items-center mb-4">
          <h3 className="font-extrabold text-2xl text-blue-600 dark:text-sky-300">Scan</h3>
          <button 
            className="ports-list-button bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-sm transition-colors" 
            onClick={downloadPortsList}
            title="Télécharger la liste des ports communs et services associés"
          >
            Liste des ports
          </button>
        </div>
        
        <div className="form-group mb-4">
          <label htmlFor="scanName" className="block text-gray-700 dark:text-gray-300 mb-1">Nom du scan (optionnel):</label>
          <input
            type="text"
            id="scanName"
            value={scanName}
            onChange={(e) => setScanName(e.target.value)}
            placeholder="Nom descriptif pour ce scan"
            disabled={isScanning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
        </div>
        
        <div className="form-group mb-4">
          <label htmlFor="target" className="block text-gray-700 dark:text-gray-300 mb-1">Cible:</label>
          <input
            type="text"
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="IP, plage d'IP (ex: 192.168.1.1-10) ou nom d'hôte"
            disabled={isScanning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
        </div>
        
        <div className="form-group mb-4">
          <label htmlFor="scanType" className="block text-gray-700 dark:text-gray-300 mb-1">Type de scan:</label>
          <select
            id="scanType"
            value={scanType}
            onChange={(e) => setScanType(e.target.value)}
            disabled={isScanning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
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
          <div className="form-group mb-4">
            <label htmlFor="ports" className="block text-gray-700 dark:text-gray-300 mb-1">Ports:</label>
            <input
              type="text"
              id="ports"
              value={ports}
              onChange={(e) => setPorts(e.target.value)}
              placeholder="ex: 22,80,443 ou 1-1000"
              disabled={isScanning}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>
        )}
        
        {scanType === 'script' && (
          <>
            <div className="form-group mb-4">
              <label htmlFor="enableScripts" className="flex items-center text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  id="enableScripts"
                  checked={enableScripts}
                  onChange={(e) => setEnableScripts(e.target.checked)}
                  disabled={isScanning}
                  className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded"
                />
                Activer les scripts NSE
              </label>
            </div>
            
            {enableScripts && (
              <>
                <div className="form-group mb-4">
                  <label htmlFor="scriptCategories" className="block text-gray-700 dark:text-gray-300 mb-1">Catégories de scripts:</label>
                  <select
                    id="scriptCategories"
                    value={scriptCategories}
                    onChange={(e) => setScriptCategories(e.target.value)}
                    disabled={isScanning}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
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
                
                <div className="form-group mb-4">
                  <label htmlFor="specificScripts" className="block text-gray-700 dark:text-gray-300 mb-1">Scripts spécifiques:</label>
                  <input
                    type="text"
                    id="specificScripts"
                    value={specificScripts}
                    onChange={(e) => setSpecificScripts(e.target.value)}
                    placeholder="ex: http-title,ssh-auth-methods"
                    disabled={isScanning || scriptCategories !== ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>
              </>
            )}
          </>
        )}
        
        <div className="form-group mb-4">
          <label htmlFor="timing" className="block text-gray-700 dark:text-gray-300 mb-1">Timing (vitesse):</label>
          <select
            id="timing"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            disabled={isScanning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            <option value="0">T0 (Paranoïaque)</option>
            <option value="1">T1 (Furtif)</option>
            <option value="2">T2 (Poli)</option>
            <option value="3">T3 (Normal)</option>
            <option value="4">T4 (Agressif)</option>
            <option value="5">T5 (Insensé)</option>
          </select>
        </div>
        
        <div className="form-group mb-4">
          <label htmlFor="additionalOptions" className="block text-gray-700 dark:text-gray-300 mb-1">Options supplémentaires:</label>
          <input
            type="text"
            id="additionalOptions"
            value={additionalOptions}
            onChange={(e) => setAdditionalOptions(e.target.value)}
            placeholder="Options Nmap supplémentaires"
            disabled={isScanning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
        </div>
        
        <button
          className="scan-button w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          onClick={handleScan}
          disabled={isScanning || !target}
        >
          {isScanning ? 'Scan en cours...' : 'Lancer le scan'}
        </button>
        
        {isScanning && <div className="scan-status mt-4 text-blue-600 dark:text-blue-400">{scanStatus}</div>}
        {errorMessage && <div className="error-message mt-4 text-red-600 dark:text-red-400">{errorMessage}</div>}
      </div>
    );
  };

  // Rendu de l'historique des scans
  const renderScanHistory = () => {
    return (
      <div className="scan-history bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-4">
        <div className="scan-history-header flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Historique des scans</h3>
          <button 
            className="clear-data-button bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-3 py-1 rounded text-sm transition-colors" 
            onClick={clearStoredData}
            title="Effacer toutes les données de scan stockées"
          >
            Effacer les données
          </button>
        </div>
        
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
                <option value="xml">XML</option>
                <option value="txt">Texte</option>
              </select>
            </div>
            
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {scanHistory.map((scan) => {
                // Vérifier si le résultat du scan existe encore
                const scanExists = nmapService.getScanResult(scan.id) !== null;
                
                return (
                  <li
                    key={scan.id}
                    className={`py-3 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${selectedScanId === scan.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-400' : ''}`}
                    onClick={() => viewScanResult(scan.id)}
                  >
                    <div className="scan-info flex flex-col">
                      <span className="scan-name font-medium text-gray-800 dark:text-gray-200">{scan.scanName || scan.target}</span>
                      <span className="scan-target text-sm text-gray-600 dark:text-gray-400">{scan.target}</span>
                      <span className="scan-date text-xs text-gray-500 dark:text-gray-500">
                        {new Date(scan.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="scan-actions flex gap-2 mt-2">
                      <button
                        className="export-button bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => exportScanResult(scan.id, e)}
                        title={`Exporter au format ${exportFormat.toUpperCase()}`}
                        disabled={!scanExists}
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
        <div className="scan-results bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-full">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Résultats du scan</h3>
          <div className="error-message p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
            Erreur: Résultats de scan invalides ou incomplets
          </div>
        </div>
      );
    }
    
    // Vérifier que hosts existe, sinon initialiser comme tableau vide
    const hosts = result.hosts || [];

    return (
      <div className="scan-results bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-full overflow-auto">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Résultats du scan</h3>
        <div className="scan-metadata mb-4 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-1">
            <strong className="font-medium">Date:</strong> {new Date(timestamp).toLocaleString()}
          </p>
          <p className="mb-1">
            <strong className="font-medium">Durée:</strong> {duration.toFixed(2)} secondes
          </p>
        </div>

        {hosts.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 italic">Aucun hôte trouvé</p>
        ) : (
          <div className="hosts-list space-y-6">
            {hosts.map((host, index) => (
              <div key={index} className="host-item bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="host-header flex justify-between items-center mb-3">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
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
                    className="add-target-button bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded text-sm transition-colors"
                    onClick={() => addTargetFromScan(host)}
                    title="Ajouter aux cibles"
                  >
                    Ajouter aux cibles
                  </button>
                </div>

                {host.status && (
                  <p className="host-status mb-3 text-gray-700 dark:text-gray-300">
                    <strong className="font-medium">Statut:</strong> {host.status.state} ({host.status.reason || 'raison inconnue'})
                  </p>
                )}

                {/* Vérifier que os existe et est un tableau non vide */}
                {Array.isArray(host.os) && host.os.length > 0 && (
                  <div className="host-os mb-4">
                    <h5 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">Système d'exploitation</h5>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
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
                  <div className="host-ports mb-4">
                    <h5 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">Ports</h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Port</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Protocole</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">État</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                          {host.ports.map((port, portIndex) => (
                            <tr key={portIndex} className={portIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{port.portid || port.port || '?'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{port.protocol || '?'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{port.state || '?'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{(port.service && port.service.name) || '-'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
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
                  </div>
                )}

                {/* Vérifier que scripts existe et est un tableau non vide */}
                {Array.isArray(host.scripts) && host.scripts.length > 0 && (
                  <div className="host-scripts">
                    <h5 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">Résultats des scripts</h5>
                    <ul className="space-y-3">
                      {host.scripts.map((script, scriptIndex) => (
                        <li key={scriptIndex} className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                          <strong className="font-medium text-gray-800 dark:text-gray-200">{script.id || 'Script inconnu'}:</strong>
                          <pre className="mt-2 text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">{script.output || 'Pas de sortie'}</pre>
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
    <div className="network-scanner bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Scanner Réseau</h2>
      
      {isCheckingNmap ? (
        <div className="loading text-center py-4">Vérification de l'installation de Nmap...</div>
      ) : !nmapInstalled ? (
        <div className="nmap-warning bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-2 text-yellow-800 dark:text-yellow-100">Nmap n'est pas installé ou n'est pas détecté</h3>
          <p className="mb-4">Le scanner réseau nécessite Nmap pour fonctionner. Veuillez l'installer et vous assurer qu'il est accessible dans votre PATH.</p>
          {renderNmapInstallationInstructions()}
        </div>
      ) : (
        <div className="scanner-container flex flex-col md:flex-row gap-4">
          <div className="scanner-left-panel w-full md:w-1/2">
            {renderScanForm()}
            {renderScanHistory()}
          </div>
          <div className="scanner-right-panel w-full md:w-1/2">
            {renderScanResults()}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkScanner; 