import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiDownload, FiCode, FiAlertTriangle, FiCheckCircle, FiInfo, FiLock, FiShield, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Scan_SSL_TLS = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [rawOutput, setRawOutput] = useState('');
  const [filteredOutput, setFilteredOutput] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [parsedResults, setParsedResults] = useState({
    critical: [],
    warning: [],
    info: [],
    success: []
  });
  const [currentProcess, setCurrentProcess] = useState(null);
  
  // États pour les options de scan
  const [scanOptions, setScanOptions] = useState({
    certinfo: true,
    compression: true,
    early_data: true,
    fallback: true,
    heartbleed: true,
    http_headers: true,
    openssl_ccs: true,
    robot: true,
    reneg: true,
    resum: true,
    sslv3: false,
    tlsv1: false,
    tlsv1_1: false,
    tlsv1_2: false,
    tlsv1_3: false,
    elliptic_curves: false,
    ems: false  // Ajout de l'option EMS (Extended Master Secret)
  });
  
  // État pour afficher/masquer les options avancées
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Référence pour le conteneur de sortie
  const outputRef = useRef(null);
  
  // Fonction pour préparer le contenu pour l'exportation
  const prepareExportContent = () => {
    console.log('Préparation du contenu pour l\'exportation...');
    
    // Préparer le contenu HTML
    const timestamp = new Date().toLocaleString();
    const targetUrl = url.replace(/^https?:\/\//, '');
    
    // Vérifier si des résultats analysés sont disponibles
    const hasResults = parsedResults && (
      parsedResults.critical.length > 0 ||
      parsedResults.warning.length > 0 ||
      parsedResults.info.length > 0 ||
      parsedResults.success.length > 0
    );
    
    // Si aucun résultat n'est disponible mais que nous avons une sortie brute
    const rawContent = !hasResults && rawOutput;
    
    // Styles CSS pour le rapport HTML
    const styles = `
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 {
        color: #2c5282;
        border-bottom: 2px solid #2c5282;
        padding-bottom: 10px;
      }
      h2 {
        color: #2d3748;
        margin-top: 20px;
      }
      h3 {
        margin-top: 15px;
        margin-bottom: 10px;
      }
      .header {
        margin-bottom: 30px;
      }
      .timestamp {
        color: #718096;
        font-style: italic;
      }
      .critical h3, .critical-title {
        color: #e53e3e;
      }
      .warning h3, .warning-title {
        color: #dd6b20;
      }
      .success h3, .success-title {
        color: #38a169;
      }
      .info h3, .info-title {
        color: #3182ce;
      }
      ul {
        margin-left: 20px;
      }
      li {
        margin-bottom: 5px;
      }
      .critical li {
        color: #e53e3e;
      }
      .warning li {
        color: #dd6b20;
      }
      .success li {
        color: #38a169;
      }
      .info li {
        color: #3182ce;
      }
      .summary {
        background-color: #f7fafc;
        border: 1px solid #e2e8f0;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 20px;
      }
      .footer {
        margin-top: 30px;
        border-top: 1px solid #e2e8f0;
        padding-top: 10px;
        font-size: 0.9em;
        color: #718096;
      }
      pre {
        white-space: pre-wrap;
        background-color: #f8f9fa;
        border: 1px solid #e2e8f0;
        padding: 10px;
        border-radius: 5px;
        overflow-x: auto;
        font-family: monospace;
        font-size: 14px;
      }
      .critical-section {
        background-color: #FEF2F2;
        border: 1px solid #FECACA;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      .warning-section {
        background-color: #FFF7ED;
        border: 1px solid #FFEDD5;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      .success-section {
        background-color: #F0FDF4;
        border: 1px solid #DCFCE7;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      .info-section {
        background-color: #EFF6FF;
        border: 1px solid #DBEAFE;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
    `;
    
    // Construire le contenu HTML
    let htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'analyse SSL/TLS - ${targetUrl}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="header">
    <h1>Rapport d'analyse SSL/TLS</h1>
    <p><strong>Cible:</strong> ${targetUrl}</p>
    <p class="timestamp"><strong>Date:</strong> ${timestamp}</p>
  </div>
  `;
  
  if (hasResults) {
    // Ajouter le résumé et les résultats détaillés
    htmlContent += `
  <div class="summary">
    <h2>Résumé</h2>
    <p><strong>Problèmes critiques:</strong> ${parsedResults.critical.length}</p>
    <p><strong>Avertissements:</strong> ${parsedResults.warning.length}</p>
    <p><strong>Configurations correctes:</strong> ${parsedResults.success.length}</p>
    <p><strong>Informations:</strong> ${parsedResults.info.length}</p>
  </div>
  
  ${parsedResults.critical.length > 0 ? `
  <div class="critical-section">
    <h2 class="critical-title">Problèmes critiques (${parsedResults.critical.length})</h2>
    <ul class="critical">
      ${parsedResults.critical.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${parsedResults.warning.length > 0 ? `
  <div class="warning-section">
    <h2 class="warning-title">Avertissements (${parsedResults.warning.length})</h2>
    <ul class="warning">
      ${parsedResults.warning.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${parsedResults.success.length > 0 ? `
  <div class="success-section">
    <h2 class="success-title">Configurations correctes (${parsedResults.success.length})</h2>
    <ul class="success">
      ${parsedResults.success.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${parsedResults.info.length > 0 ? `
  <div class="info-section">
    <h2 class="info-title">Informations (${parsedResults.info.length})</h2>
    <ul class="info">
      ${parsedResults.info.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  `;
  } else if (rawContent) {
    // Ajouter la sortie brute si aucun résultat analysé n'est disponible
    htmlContent += `
  <div class="summary">
    <h2>Résultats bruts</h2>
    <p>Voici la sortie brute du scan :</p>
  </div>
  
  <pre>${rawOutput.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  `;
  } else {
    // Aucun résultat disponible
    htmlContent += `
  <div class="summary">
    <h2>Aucun résultat</h2>
    <p>Aucun résultat n'est disponible pour cette analyse.</p>
  </div>
  `;
  }
  
  // Ajouter le pied de page
  htmlContent += `
  <div class="footer">
    <p>Rapport généré par HakBoard - Scanner SSL/TLS</p>
  </div>
</body>
</html>
    `;
    
    // Préparer le contenu texte pour l'exportation de secours
    let textContent = `
RAPPORT D'ANALYSE SSL/TLS
=========================

Cible: ${targetUrl}
Date: ${timestamp}

`;

    if (hasResults) {
      // Ajouter le résumé et les résultats détaillés
      textContent += `
RÉSUMÉ
------
Problèmes critiques: ${parsedResults.critical.length}
Avertissements: ${parsedResults.warning.length}
Configurations correctes: ${parsedResults.success.length}
Informations: ${parsedResults.info.length}

${parsedResults.critical.length > 0 ? `
PROBLÈMES CRITIQUES (${parsedResults.critical.length})
-------------------
${parsedResults.critical.map(item => `* ${item}`).join('\n')}
` : ''}

${parsedResults.warning.length > 0 ? `
AVERTISSEMENTS (${parsedResults.warning.length})
-------------
${parsedResults.warning.map(item => `* ${item}`).join('\n')}
` : ''}

${parsedResults.success.length > 0 ? `
CONFIGURATIONS CORRECTES (${parsedResults.success.length})
-----------------------
${parsedResults.success.map(item => `* ${item}`).join('\n')}
` : ''}

${parsedResults.info.length > 0 ? `
INFORMATIONS (${parsedResults.info.length})
------------
${parsedResults.info.map(item => `* ${item}`).join('\n')}
` : ''}
`;
    } else if (rawContent) {
      // Ajouter la sortie brute si aucun résultat analysé n'est disponible
      textContent += `
RÉSULTATS BRUTS
--------------
Voici la sortie brute du scan :

${rawOutput}
`;
    } else {
      // Aucun résultat disponible
      textContent += `
AUCUN RÉSULTAT
-------------
Aucun résultat n'est disponible pour cette analyse.
`;
    }
    
    // Ajouter le pied de page
    textContent += `
Rapport généré par HakBoard - Scanner SSL/TLS
    `;
    
    return { htmlContent, textContent };
  };
  
  // Fonction pour exporter les résultats en HTML
  const exportToHTML = () => {
    console.log('Exportation en HTML...');
    
    try {
      // Vérifier si des résultats sont disponibles
      if (!scanResults && !filteredOutput && !rawOutput) {
        showWarning('Aucun résultat à exporter');
        return;
      }
      
      // Préparer le contenu HTML
      const { htmlContent } = prepareExportContent();
      
      // Méthode alternative d'exportation: ouvrir dans un nouvel onglet
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        showWarning('Le navigateur a bloqué l\'ouverture d\'une nouvelle fenêtre. Veuillez autoriser les popups pour ce site.');
        return;
      }
      
      // Créer le contenu HTML avec le script de téléchargement intégré
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const htmlWithDownloadButton = `
<!DOCTYPE html>
<html>
<head>
  <title>Rapport SSL/TLS - ${url.replace(/^https?:\/\//, '')}</title>
  <script>
    function downloadHTML() {
      const htmlContent = document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ssl_tls_scan_${timestamp}.html';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
  <style>
    .download-button {
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px;
      background-color: #4299e1;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <button onclick="downloadHTML()" class="download-button">Télécharger ce rapport</button>
  ${htmlContent}
</body>
</html>
      `;
      
      newWindow.document.write(htmlWithDownloadButton);
      newWindow.document.close();
      
      showSuccess('Rapport HTML généré avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'exportation en HTML:', error);
      showError(`Erreur lors de l'exportation en HTML: ${error.message}`);
      
      // Méthode de secours
      fallbackExport();
    }
  };
  
  // Fonction pour exporter les résultats en PDF
  const exportToPDF = () => {
    console.log('Exportation en PDF...');
    
    try {
      // Vérifier si des résultats sont disponibles
      if (!scanResults && !filteredOutput && !rawOutput) {
        showWarning('Aucun résultat à exporter');
        return;
      }
      
      // Méthode alternative: utiliser window.print()
      const { htmlContent } = prepareExportContent();
      
      // Créer une iframe cachée pour l'impression
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      
      document.body.appendChild(printFrame);
      
      printFrame.contentDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rapport SSL/TLS - ${url.replace(/^https?:\/\//, '')}</title>
          <style>
            @media print {
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 20px;
              }
              
              @page {
                size: A4;
                margin: 2cm;
              }
              
              h1, h2, h3 {
                page-break-after: avoid;
              }
              
              ul, img {
                page-break-inside: avoid;
              }
              
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);
      
      printFrame.contentDocument.close();
      
      // Attendre que le contenu soit chargé
      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        
        // Supprimer l'iframe après l'impression
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
        
        showSuccess('Impression du rapport PDF initiée');
      }, 500);
    } catch (error) {
      console.error('Erreur lors de l\'exportation en PDF:', error);
      showError(`Erreur lors de l'exportation en PDF: ${error.message}`);
      
      // Essayer la méthode Electron si disponible
      if (window.electronAPI && window.electronAPI.exportToPDF) {
        try {
          const { htmlContent } = prepareExportContent();
          
          window.electronAPI.exportToPDF({
            content: {
              html: htmlContent
            },
            filename: `ssl_tls_scan_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`,
            title: 'Rapport d\'analyse SSL/TLS'
          })
            .then(() => {
              showSuccess('Rapport PDF exporté avec succès');
            })
            .catch((electronError) => {
              console.error('Erreur lors de l\'exportation en PDF via Electron:', electronError);
              fallbackExport();
            });
        } catch (electronError) {
          console.error('Erreur lors de l\'appel à l\'API Electron:', electronError);
          fallbackExport();
        }
      } else {
        fallbackExport();
      }
    }
  };
  
  // Fonction de secours pour l'exportation
  const fallbackExport = () => {
    console.log('Utilisation de la méthode de secours pour l\'exportation...');
    
    try {
      // Préparer le contenu pour l'exportation
      const { textContent } = prepareExportContent();
      
      // Créer un blob avec le contenu texte
      const blob = new Blob([textContent], { type: 'text/plain' });
      
      // Créer une URL pour le blob
      const url = URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssl_tls_scan_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      
      // Ajouter le lien au document et cliquer dessus
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      showInfo('Rapport texte exporté avec succès (méthode de secours)');
    } catch (error) {
      console.error('Erreur lors de l\'exportation de secours:', error);
      showError(`Erreur lors de l'exportation: ${error.message}`);
    }
  };
  
  // Vérifier la disponibilité de l'API Electron au chargement
  useEffect(() => {
    checkElectronAPI();
  }, []);
  
  // Fonction pour vérifier la disponibilité de l'API Electron
  const checkElectronAPI = () => {
    console.log('Vérification de l\'API Electron...');
    
    if (window.electronAPI) {
      console.log('API Electron détectée:', window.electronAPI);
      
      // Vérifier les méthodes disponibles
      const methods = [];
      for (const key in window.electronAPI) {
        methods.push(key);
      }
      
      console.log('Méthodes disponibles:', methods);
      showInfo(`API Electron disponible avec ${methods.length} méthodes`);
    } else {
      console.error('API Electron non disponible');
      showWarning('API Electron non disponible. Certaines fonctionnalités seront limitées.');
    }
  };
  
  // Fonction pour basculer une option de scan
  const toggleScanOption = (option) => {
    setScanOptions(prevOptions => ({
      ...prevOptions,
      [option]: !prevOptions[option]
    }));
  };
  
  // Fonction pour générer la commande avec les options sélectionnées
  const buildScanCommand = (targetUrl) => {
    // Commande de base sans l'option --json_out
    let command = `env/bin/sslyze ${targetUrl}`;
    
    // Ajouter les options sélectionnées
    Object.entries(scanOptions).forEach(([option, enabled]) => {
      if (enabled) {
        command += ` --${option}`;
      }
    });
    
    return command;
  };
  
  // Fonction pour exécuter le scan SSL/TLS
  const runScan = async () => {
    if (!url) {
      showError('Veuillez entrer une URL valide');
      return;
    }
    
    try {
      // Réinitialiser les états
      setIsScanning(true);
      setRawOutput('');
      setFilteredOutput('');
      setScanResults(null);
      setParsedResults({
        critical: [],
        warning: [],
        info: [],
        success: []
      });
      
      // Afficher un message de progression
      const initialMessage = `Analyse SSL/TLS en cours pour ${url}...\n`;
      setRawOutput(initialMessage);
      setFilteredOutput(initialMessage);
      
      // Vérifier si l'API Electron est disponible
      if (!window.electronAPI) {
        throw new Error('API Electron non disponible pour exécuter le scan');
      }
      
      // Nettoyer l'URL (supprimer http:// ou https:// si présent)
      const cleanUrl = url.replace(/^https?:\/\//, '');
      
      // Construire la commande avec les options sélectionnées
      const command = buildScanCommand(cleanUrl);
      
      console.log('Exécution de la commande:', command);
      showInfo(`Analyse de ${cleanUrl} en cours...`);
      
      // Exécuter la commande
      let result;
      try {
        result = await window.electronAPI.executeCommand(command);
        console.log('Résultat de la commande:', result);
        
        // Vérifier si la commande a généré une erreur
        if (result.stderr && result.stderr.trim() !== '') {
          console.warn('La commande a généré une erreur:', result.stderr);
          
          // Vérifier si l'erreur est liée à des arguments non reconnus
          if (result.stderr.includes('unrecognized arguments') || result.stderr.includes('usage:')) {
            console.warn('Erreur d\'arguments dans la commande, essai avec moins d\'options');
            
            // Essayer avec une commande simplifiée (moins d'options)
            const simpleCommand = `env/bin/sslyze ${cleanUrl} --json_out -`;
            console.log('Essai avec une commande simplifiée:', simpleCommand);
            
            try {
              result = await window.electronAPI.executeCommand(simpleCommand);
            } catch (simpleExecError) {
              // Essayer avec juste la commande de base sans options
              try {
                const basicCommand = `env/bin/sslyze ${cleanUrl}`;
                console.log('Essai avec une commande basique:', basicCommand);
                result = await window.electronAPI.executeCommand(basicCommand);
              } catch (basicExecError) {
                console.error('Erreur lors de l\'exécution de la commande basique:', basicExecError);
                throw new Error(`Erreur lors de l'exécution de la commande: ${basicExecError.message}`);
              }
            }
          }
        }
      } catch (execError) {
        console.error('Erreur lors de l\'exécution de la commande:', execError);
        
        // Vérifier si l'erreur est due à un fichier non trouvé
        if (execError.message && (execError.message.includes('No such file or directory') || 
            execError.message.includes('not found') || 
            execError.message.includes('cannot find'))) {
          
          console.warn('Chemin sslyze non trouvé, essai avec des chemins alternatifs');
          
          // Essayer avec des chemins alternatifs
          const alternativePaths = [
            'sslyze', // Commande directe si installée globalement
            './env/bin/sslyze', // Chemin relatif avec ./
            `${process.cwd()}/env/bin/sslyze`, // Chemin absolu
            'python -m sslyze', // Via module Python
            'python3 -m sslyze' // Via module Python avec Python3
          ];
          
          let alternativeResult = null;
          
          for (const altPath of alternativePaths) {
            try {
              console.log(`Essai avec le chemin alternatif: ${altPath}`);
              const altCommand = `${altPath} ${cleanUrl} --json_out -`;
              alternativeResult = await window.electronAPI.executeCommand(altCommand);
              
              if (alternativeResult && alternativeResult.stdout) {
                console.log(`Succès avec le chemin alternatif: ${altPath}`);
                result = alternativeResult;
                break;
              }
            } catch (altError) {
              console.warn(`Échec avec le chemin alternatif ${altPath}:`, altError.message);
            }
          }
          
          if (!alternativeResult || !alternativeResult.stdout) {
            throw new Error(`Impossible de trouver sslyze. Veuillez vérifier que sslyze est installé correctement.`);
          }
        } else {
          throw new Error(`Erreur lors de l'exécution de la commande: ${execError.message}`);
        }
      }
      
      // Traiter les résultats
      if (result && result.stdout) {
        console.log('Scan terminé avec succès');
        processOutput(result.stdout);
        showSuccess(`Analyse de ${cleanUrl} terminée avec succès`);
      } else if (result && result.stderr) {
        // Vérifier si l'erreur est liée à des arguments non reconnus
        if (result.stderr.includes('unrecognized arguments') || result.stderr.includes('usage:')) {
          console.error('Erreur d\'arguments dans la commande sslyze:', result.stderr);
          const errorMessage = 'Erreur dans les arguments de la commande sslyze. Veuillez vérifier la version de sslyze installée.';
          
          // Afficher un message d'erreur formaté
          const errorOutput = `
<div class="scan-results">
  <div class="result-section critical">
    <h3 style="color: #e53e3e; margin-bottom: 10px;">Erreur de configuration</h3>
    <p style="margin-bottom: 10px;">Les arguments fournis à sslyze ne sont pas compatibles avec la version installée.</p>
    <pre style="white-space: pre-wrap; font-family: monospace; margin-left: 20px; color: #e53e3e;">${result.stderr.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    <div style="margin-top: 15px; padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
      <h4 style="color: #721c24; margin-bottom: 10px;">Suggestions de dépannage :</h4>
      <ul style="margin-left: 20px; color: #721c24;">
        <li>Essayez de désactiver certaines options de scan</li>
        <li>Vérifiez que vous utilisez une version compatible de sslyze</li>
        <li>Essayez d'exécuter sslyze directement dans le terminal pour voir les options disponibles</li>
      </ul>
    </div>
  </div>
</div>`;
          
          setFilteredOutput(errorOutput);
          showError(errorMessage);
          throw new Error(errorMessage);
        } else {
          throw new Error(`Erreur lors de l'analyse: ${result.stderr}`);
        }
      } else {
        throw new Error('Aucun résultat retourné par le scan');
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution du scan SSL/TLS:', error);
      
      // Afficher des informations détaillées sur l'erreur
      const errorInfo = `
[ERREUR] Erreur lors de l'analyse SSL/TLS:
- Message: ${error.message}
- Stack: ${error.stack || 'Non disponible'}
`;
      
      showError(`Erreur lors de l'analyse: ${error.message}`);
      setRawOutput(prevOutput => prevOutput + errorInfo);
      setFilteredOutput(prevOutput => prevOutput + errorInfo);
    } finally {
      setIsScanning(false);
      setCurrentProcess(null);
    }
  };
  
  // Fonction pour arrêter le scan en cours
  const stopScan = async () => {
    console.log('Arrêt du scan en cours...');
    
    try {
      // Arrêter le processus en cours si possible
      if (currentProcess && window.electronAPI && window.electronAPI.killProcess) {
        await window.electronAPI.killProcess(currentProcess);
      }
      
      // Ajouter un message indiquant que le scan a été arrêté
      const stopMessage = '\n\n[!] Scan arrêté par l\'utilisateur';
      setRawOutput(prevOutput => prevOutput + stopMessage);
      setFilteredOutput(prevOutput => prevOutput + stopMessage);
      
      // Mettre à jour l'état
      setIsScanning(false);
      setCurrentProcess(null);
      
      showWarning('Scan arrêté par l\'utilisateur');
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du scan:', error);
      showError(`Erreur lors de l'arrêt du scan: ${error.message}`);
    }
  };
  
  // Fonction pour traiter la sortie du scan
  const processOutput = (output) => {
    console.log('Traitement des résultats du scan...');
    
    try {
      // Stocker la sortie brute
      setRawOutput(prevOutput => prevOutput + output);
      
      // Vérifier si la sortie est vide ou non valide
      if (!output || output.trim() === '') {
        const errorMessage = 'La sortie du scan est vide. Veuillez vérifier que sslyze est correctement installé.';
        
        // Créer un format HTML pour l'affichage de l'erreur
        const htmlOutput = `
<div class="scan-results">
  <div class="result-section critical">
    <h3 style="color: #e53e3e; margin-bottom: 10px;">Erreur lors de l'analyse</h3>
    <p style="margin-bottom: 10px;">${errorMessage}</p>
    <div style="margin-top: 15px; padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
      <h4 style="color: #721c24; margin-bottom: 10px;">Suggestions de dépannage :</h4>
      <ul style="margin-left: 20px; color: #721c24;">
        <li>Vérifiez que sslyze est correctement installé dans votre environnement virtuel</li>
        <li>Essayez d'installer sslyze avec la commande : <code>pip install sslyze</code></li>
        <li>Vérifiez que le chemin vers sslyze est correct (actuellement : env/bin/sslyze)</li>
        <li>Essayez d'exécuter sslyze directement dans le terminal pour vérifier qu'il fonctionne</li>
      </ul>
    </div>
  </div>
</div>`;
        
        setFilteredOutput(htmlOutput);
        throw new Error(errorMessage);
      }
      
      // Stocker les résultats du scan pour les exports
      setScanResults({ textOutput: output });
      
      // Extraire et catégoriser les résultats
      const critical = [];
      const warning = [];
      const info = [];
      const success = [];
      
      // Traiter la sortie texte de sslyze
      const lines = output.split('\n');
      let currentSection = '';
      let serverInfo = '';
      
      // Extraire la durée du scan
      const durationMatch = output.match(/SCANS COMPLETED IN ([\d.]+) S/);
      if (durationMatch && durationMatch[1]) {
        info.push(`Durée du scan: ${durationMatch[1]} secondes`);
      }
      
      // Extraire les informations du serveur
      const serverMatch = output.match(/SCAN RESULTS FOR ([^:]+):(\d+) - ([^\n]+)/);
      if (serverMatch) {
        serverInfo = `Serveur: ${serverMatch[1]}:${serverMatch[2]} (${serverMatch[3].trim()})`;
        info.push(serverInfo);
      } else if (output.includes('CHECKING CONNECTIVITY TO SERVER')) {
        // Essayer d'extraire l'information du serveur d'une autre manière
        const connectivityMatch = output.match(/([^\s]+)\s+=>\s+([^\s]+)/);
        if (connectivityMatch) {
          serverInfo = `Serveur: ${connectivityMatch[1]} (${connectivityMatch[2].trim()})`;
          info.push(serverInfo);
        }
      }
      
      // Parcourir chaque ligne pour extraire les informations pertinentes
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Ignorer les lignes vides
        if (!line) continue;
        
        // Détecter les sections
        if (line.startsWith('* ')) {
          currentSection = line.substring(2).trim();
          continue;
        }
        
        // Traiter les informations en fonction de la section
        switch (currentSection) {
          case 'Certificates Information:':
            processCertificateInfo(line, lines, i, serverInfo, critical, warning, info, success);
            break;
          case 'SSL 3.0 Cipher Suites:':
          case 'TLS 1.0 Cipher Suites:':
          case 'TLS 1.1 Cipher Suites:':
          case 'TLS 1.2 Cipher Suites:':
          case 'TLS 1.3 Cipher Suites:':
            processCipherSuites(line, currentSection, serverInfo, critical, warning, info, success);
            break;
          case 'Deflate Compression:':
            if (line.includes('OK - Compression disabled')) {
              success.push(`${serverInfo} - Compression TLS désactivée`);
            } else if (line.includes('VULNERABLE')) {
              warning.push(`${serverInfo} - Compression TLS activée (potentiellement vulnérable à CRIME)`);
            }
            break;
          case 'TLS 1.3 Early Data:':
            if (line.includes('Not Supported')) {
              info.push(`${serverInfo} - Ne supporte pas TLS 1.3 Early Data`);
            } else if (line.includes('Supported')) {
              warning.push(`${serverInfo} - TLS 1.3 Early Data activé (potentiellement vulnérable à la rejouabilité)`);
            }
            break;
          case 'OpenSSL CCS Injection:':
            if (line.includes('OK - Not vulnerable')) {
              success.push(`${serverInfo} - Non vulnérable à l'injection OpenSSL CCS`);
            } else if (line.includes('VULNERABLE')) {
              critical.push(`${serverInfo} - Vulnérable à l'injection OpenSSL CCS (CVE-2014-0224)`);
            }
            break;
          case 'Downgrade Attacks:':
            if (line.includes('TLS_FALLBACK_SCSV') && line.includes('OK - Supported')) {
              success.push(`${serverInfo} - Supporte TLS Fallback SCSV (protection contre les attaques de rétrogradation)`);
            } else if (line.includes('TLS_FALLBACK_SCSV') && line.includes('VULNERABLE')) {
              warning.push(`${serverInfo} - Ne supporte pas TLS Fallback SCSV (vulnérable aux attaques de rétrogradation)`);
            }
            break;
          case 'OpenSSL Heartbleed:':
            if (line.includes('OK - Not vulnerable')) {
              success.push(`${serverInfo} - Non vulnérable à Heartbleed`);
            } else if (line.includes('VULNERABLE')) {
              critical.push(`${serverInfo} - Vulnérable à Heartbleed`);
            }
            break;
          case 'ROBOT Attack:':
            if (line.includes('OK - Not vulnerable')) {
              success.push(`${serverInfo} - Non vulnérable à ROBOT`);
            } else if (line.includes('VULNERABLE')) {
              critical.push(`${serverInfo} - Vulnérable à ROBOT`);
            }
            break;
          case 'Session Renegotiation:':
            if (line.includes('Client Renegotiation DoS Attack') && line.includes('OK - Not vulnerable')) {
              success.push(`${serverInfo} - Non vulnérable aux attaques DoS par renégociation client`);
            } else if (line.includes('Client Renegotiation DoS Attack') && line.includes('VULNERABLE')) {
              warning.push(`${serverInfo} - Vulnérable aux attaques DoS par renégociation client`);
            }
            
            if (line.includes('Secure Renegotiation') && line.includes('OK - Supported')) {
              success.push(`${serverInfo} - Supporte la renégociation sécurisée`);
            } else if (line.includes('Secure Renegotiation') && line.includes('VULNERABLE')) {
              critical.push(`${serverInfo} - Ne supporte pas la renégociation sécurisée`);
            }
            break;
          case 'TLS 1.2 Session Resumption Support:':
            if (line.includes('With Session IDs') && line.includes('SUPPORTED')) {
              success.push(`${serverInfo} - Reprise de session par ID supportée`);
            } else if (line.includes('With Session IDs') && line.includes('NOT SUPPORTED')) {
              info.push(`${serverInfo} - Reprise de session par ID non supportée`);
            }
            
            if (line.includes('With TLS Tickets') && line.includes('SUPPORTED')) {
              success.push(`${serverInfo} - Reprise de session par ticket TLS supportée`);
            } else if (line.includes('With TLS Tickets') && line.includes('NOT SUPPORTED')) {
              info.push(`${serverInfo} - Reprise de session par ticket TLS non supportée`);
            }
            break;
          case 'Elliptic Curve Key Exchange:':
            if (line.includes('Supported curves:')) {
              const curves = line.split(':')[1].trim();
              info.push(`${serverInfo} - Courbes elliptiques supportées: ${curves}`);
              
              // Vérifier si des courbes sécurisées sont supportées
              const secureECDHCurves = ['X25519', 'prime256v1', 'secp384r1', 'secp521r1'];
              const supportedCurves = curves.split(', ');
              const supportedSecureCurves = supportedCurves.filter(curve => secureECDHCurves.includes(curve));
              
              if (supportedSecureCurves.length > 0) {
                success.push(`${serverInfo} - Supporte des courbes ECDH sécurisées: ${supportedSecureCurves.join(', ')}`);
              } else {
                warning.push(`${serverInfo} - Ne supporte pas de courbes ECDH sécurisées`);
              }
            }
            break;
          case 'HTTP Security Headers:':
            if (line.includes('Strict-Transport-Security Header')) {
              success.push(`${serverInfo} - En-tête HSTS présent`);
            } else if (line.includes('Max Age:')) {
              const maxAgeMatch = line.match(/Max Age:\s+(\d+)/);
              if (maxAgeMatch) {
                const maxAge = parseInt(maxAgeMatch[1]);
                if (maxAge < 10886400) { // 126 jours
                  warning.push(`${serverInfo} - Durée HSTS trop courte: ${maxAge} secondes (recommandé: au moins 10886400)`);
                } else {
                  info.push(`${serverInfo} - Durée HSTS: ${maxAge} secondes`);
                }
              }
            } else if (line.includes('Include Subdomains:')) {
              if (line.includes('True')) {
                success.push(`${serverInfo} - HSTS inclut les sous-domaines`);
              } else {
                info.push(`${serverInfo} - HSTS n'inclut pas les sous-domaines`);
              }
            } else if (line.includes('Preload:')) {
              if (line.includes('True')) {
                success.push(`${serverInfo} - HSTS avec préchargement activé`);
              }
            }
            break;
          case 'TLS Extended Master Secret Extension:':
            if (line.includes('OK - Supported')) {
              success.push(`${serverInfo} - Supporte l'extension Extended Master Secret`);
            } else if (line.includes('NOT SUPPORTED')) {
              warning.push(`${serverInfo} - Ne supporte pas l'extension Extended Master Secret`);
            }
            break;
        }
      }
      
      console.log('Résultats analysés:', {
        critical: critical.length,
        warning: warning.length,
        info: info.length,
        success: success.length
      });
      
      // Mettre à jour les résultats analysés
      setParsedResults({
        critical,
        warning,
        info,
        success
      });
      
      // Générer une sortie HTML formatée
      const htmlOutput = generateHtmlOutput(critical, warning, info, success);
      setFilteredOutput(htmlOutput);
      
      console.log('Traitement terminé');
    } catch (error) {
      console.error('Erreur lors du traitement des résultats:', error);
      showError(`Erreur lors du traitement des résultats: ${error.message}`);
      
      // En cas d'erreur de parsing, afficher la sortie brute
      setFilteredOutput(`<pre>${output}</pre>`);
    }
  };
  
  // Fonction pour traiter les informations de certificat
  const processCertificateInfo = (line, lines, index, serverInfo, critical, warning, info, success) => {
    // Extraire les informations du certificat
    if (line.includes('Not Before:')) {
      const notBeforeMatch = line.match(/Not Before:\s+(\d{4}-\d{2}-\d{2})/);
      if (notBeforeMatch) {
        const notBefore = new Date(notBeforeMatch[1]);
        const now = new Date();
        
        // Vérifier si le certificat est déjà valide
        if (notBefore > now) {
          warning.push(`${serverInfo} - Certificat pas encore valide (valide à partir du ${notBeforeMatch[1]})`);
        }
      }
    } else if (line.includes('Not After:')) {
      const notAfterMatch = line.match(/Not After:\s+(\d{4}-\d{2}-\d{2})/);
      if (notAfterMatch) {
        const notAfter = new Date(notAfterMatch[1]);
        const now = new Date();
        const daysRemaining = Math.floor((notAfter - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining < 0) {
          critical.push(`${serverInfo} - Certificat expiré depuis ${Math.abs(daysRemaining)} jours`);
        } else if (daysRemaining < 30) {
          warning.push(`${serverInfo} - Certificat expire dans ${daysRemaining} jours`);
        } else {
          success.push(`${serverInfo} - Certificat valide jusqu'au ${notAfterMatch[1]}`);
        }
      }
    } else if (line.includes('Signature Algorithm:')) {
      const sigAlgoMatch = line.match(/Signature Algorithm:\s+(\w+)/);
      if (sigAlgoMatch) {
        const sigAlgo = sigAlgoMatch[1];
        if (sigAlgo.includes('sha1') || sigAlgo.includes('md5')) {
          critical.push(`${serverInfo} - Algorithme de signature faible: ${sigAlgo}`);
        } else if (sigAlgo.includes('sha256') || sigAlgo.includes('sha384') || sigAlgo.includes('sha512')) {
          success.push(`${serverInfo} - Algorithme de signature fort: ${sigAlgo}`);
        }
      }
    } else if (line.includes('Common Name:')) {
      const cnMatch = line.match(/Common Name:\s+(.+)/);
      if (cnMatch) {
        info.push(`${serverInfo} - Nom commun du certificat: ${cnMatch[1]}`);
      }
    } else if (line.includes('Issuer:')) {
      const issuerMatch = line.match(/Issuer:\s+(.+)/);
      if (issuerMatch) {
        info.push(`${serverInfo} - Émetteur du certificat: ${issuerMatch[1]}`);
      }
    } else if (line.includes('Certificate Transparency:') && line.includes('WARNING')) {
      warning.push(`${serverInfo} - ${line.trim()}`);
    } else if (line.includes('OK - Certificate is trusted')) {
      const storeMatch = line.match(/([^:]+):\s+OK - Certificate is trusted/);
      if (storeMatch) {
        success.push(`${serverInfo} - Certificat de confiance pour ${storeMatch[1]}`);
      }
    } else if (line.includes('FAILED')) {
      const storeMatch = line.match(/([^:]+):\s+FAILED/);
      if (storeMatch) {
        critical.push(`${serverInfo} - Certificat non fiable pour ${storeMatch[1]}`);
      }
    }
  };
  
  // Fonction pour traiter les suites de chiffrement
  const processCipherSuites = (line, section, serverInfo, critical, warning, info, success) => {
    const protocol = section.replace(' Cipher Suites:', '');
    
    if (line.includes('Attempted to connect using') && line.includes('the server rejected all cipher suites')) {
      info.push(`${serverInfo} - ${protocol} non supporté`);
      
      // Vérifier si c'est une bonne chose (pour les protocoles obsolètes)
      if (protocol === 'SSL 3.0' || protocol === 'TLS 1.0' || protocol === 'TLS 1.1') {
        success.push(`${serverInfo} - Bonne pratique: ${protocol} désactivé`);
      } else if (protocol === 'TLS 1.2' || protocol === 'TLS 1.3') {
        warning.push(`${serverInfo} - ${protocol} devrait être activé pour la compatibilité`);
      }
    } else if (line.includes('The server accepted the following')) {
      const countMatch = line.match(/following (\d+) cipher/);
      if (countMatch) {
        const count = parseInt(countMatch[1]);
        info.push(`${serverInfo} - ${protocol} supporté avec ${count} suites de chiffrement`);
        
        // Vérifier si c'est une bonne chose (pour les protocoles modernes)
        if (protocol === 'TLS 1.2' || protocol === 'TLS 1.3') {
          success.push(`${serverInfo} - ${protocol} activé (recommandé)`);
        } else if (protocol === 'SSL 3.0' || protocol === 'TLS 1.0' || protocol === 'TLS 1.1') {
          warning.push(`${serverInfo} - Protocole obsolète ${protocol} activé (non recommandé)`);
        }
      }
    } else if (line.includes('Forward Secrecy') && line.includes('OK - Supported')) {
      success.push(`${serverInfo} - Forward Secrecy supporté`);
    } else if (line.includes('Legacy RC4 Algorithm') && line.includes('OK - Not Supported')) {
      success.push(`${serverInfo} - Algorithme RC4 obsolète non supporté`);
    } else if (line.includes('Legacy RC4 Algorithm') && line.includes('VULNERABLE')) {
      warning.push(`${serverInfo} - Algorithme RC4 obsolète supporté (non recommandé)`);
    }
  };
  
  // Fonction pour générer une sortie HTML formatée
  const generateHtmlOutput = (critical, warning, info, success) => {
    return `
<div class="scan-results">
  ${critical.length > 0 ? `
  <div class="result-section critical">
    <h3 style="color: #e53e3e; margin-bottom: 10px;">Problèmes critiques (${critical.length})</h3>
    <ul style="margin-left: 20px;">
      ${critical.map(item => `<li style="color: #e53e3e; margin-bottom: 5px;">${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${warning.length > 0 ? `
  <div class="result-section warning">
    <h3 style="color: #dd6b20; margin-bottom: 10px;">Avertissements (${warning.length})</h3>
    <ul style="margin-left: 20px;">
      ${warning.map(item => `<li style="color: #dd6b20; margin-bottom: 5px;">${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${success.length > 0 ? `
  <div class="result-section success">
    <h3 style="color: #38a169; margin-bottom: 10px;">Configurations correctes (${success.length})</h3>
    <ul style="margin-left: 20px;">
      ${success.map(item => `<li style="color: #38a169; margin-bottom: 5px;">${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  ${info.length > 0 ? `
  <div class="result-section info">
    <h3 style="color: #3182ce; margin-bottom: 10px;">Informations (${info.length})</h3>
    <ul style="margin-left: 20px;">
      ${info.map(item => `<li style="color: #3182ce; margin-bottom: 5px;">${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
</div>
`;
  };
  
  // Fonction pour appliquer un filtre à la sortie
  const applyFilter = (level) => {
    console.log('Application du filtre:', level);
    setActiveFilter(level);
    
    // Si aucun résultat n'est disponible, ne rien faire
    if (!scanResults) {
      console.warn('Aucun résultat à filtrer');
      return;
    }
    
    if (level === 'all') {
      // Générer une sortie HTML avec tous les résultats
      const htmlOutput = generateHtmlOutput(
        parsedResults.critical,
        parsedResults.warning,
        parsedResults.info,
        parsedResults.success
      );
      setFilteredOutput(htmlOutput);
      return;
    }
    
    if (level === 'raw') {
      showRawOutput();
      return;
    }
    
    // Filtrer les résultats en fonction du niveau
    let filteredResults = {
      critical: level === 'critical' ? parsedResults.critical : [],
      warning: level === 'warning' ? parsedResults.warning : [],
      info: level === 'info' ? parsedResults.info : [],
      success: level === 'success' ? parsedResults.success : []
    };
    
    // Générer une sortie HTML avec les résultats filtrés
    const htmlOutput = generateHtmlOutput(
      filteredResults.critical,
      filteredResults.warning,
      filteredResults.info,
      filteredResults.success
    );
    setFilteredOutput(htmlOutput);
  };
  
  // Fonction pour réinitialiser l'affichage et montrer les résultats bruts
  const showRawOutput = () => {
    console.log('Affichage des résultats bruts');
    setActiveFilter('raw');
    setFilteredOutput(`<pre style="white-space: pre-wrap; font-family: monospace;">${rawOutput.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
  };

  return (
    <div className="ssl-tls-scanner-container bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
        <FiShield className="mr-2" /> Scanner SSL/TLS
      </h1>
      
      <div className="mb-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Analysez la configuration SSL/TLS d'un site web pour détecter les vulnérabilités et les mauvaises configurations.
        </p>
        
        <div className="flex items-center mb-6">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Entrez l'URL du site à analyser (ex: example.com)"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />
          </div>
          
          <button
            onClick={runScan}
            disabled={isScanning || !url}
            className={`px-4 py-3 rounded-md flex items-center ${
              isScanning || !url
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            <FiSearch className="mr-2" />
            {isScanning ? 'Analyse en cours...' : 'Analyser'}
          </button>
          
          {isScanning && (
            <button
              onClick={stopScan}
              className="px-4 py-3 ml-2 rounded-md flex items-center bg-red-600 hover:bg-red-700 text-white"
            >
              <FiAlertTriangle className="mr-2" />
              Arrêter
            </button>
          )}
        </div>
        
        {/* Options de scan */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-2"
          >
            {showAdvancedOptions ? (
              <FiChevronDown className="mr-1" />
            ) : (
              <FiChevronRight className="mr-1" />
            )}
            Options avancées
          </button>
          
          {showAdvancedOptions && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Options de scan</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Options de base */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-certinfo"
                    checked={scanOptions.certinfo}
                    onChange={() => toggleScanOption('certinfo')}
                    className="mr-2"
                  />
                  <label htmlFor="option-certinfo" className="text-gray-700 dark:text-gray-300">
                    Certificat (--certinfo)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-heartbleed"
                    checked={scanOptions.heartbleed}
                    onChange={() => toggleScanOption('heartbleed')}
                    className="mr-2"
                  />
                  <label htmlFor="option-heartbleed" className="text-gray-700 dark:text-gray-300">
                    Heartbleed (--heartbleed)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-robot"
                    checked={scanOptions.robot}
                    onChange={() => toggleScanOption('robot')}
                    className="mr-2"
                  />
                  <label htmlFor="option-robot" className="text-gray-700 dark:text-gray-300">
                    ROBOT (--robot)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-compression"
                    checked={scanOptions.compression}
                    onChange={() => toggleScanOption('compression')}
                    className="mr-2"
                  />
                  <label htmlFor="option-compression" className="text-gray-700 dark:text-gray-300">
                    Compression (--compression)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-http_headers"
                    checked={scanOptions.http_headers}
                    onChange={() => toggleScanOption('http_headers')}
                    className="mr-2"
                  />
                  <label htmlFor="option-http_headers" className="text-gray-700 dark:text-gray-300">
                    En-têtes HTTP (--http_headers)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-openssl_ccs"
                    checked={scanOptions.openssl_ccs}
                    onChange={() => toggleScanOption('openssl_ccs')}
                    className="mr-2"
                  />
                  <label htmlFor="option-openssl_ccs" className="text-gray-700 dark:text-gray-300">
                    OpenSSL CCS (--openssl_ccs)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-reneg"
                    checked={scanOptions.reneg}
                    onChange={() => toggleScanOption('reneg')}
                    className="mr-2"
                  />
                  <label htmlFor="option-reneg" className="text-gray-700 dark:text-gray-300">
                    Renégociation (--reneg)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-resum"
                    checked={scanOptions.resum}
                    onChange={() => toggleScanOption('resum')}
                    className="mr-2"
                  />
                  <label htmlFor="option-resum" className="text-gray-700 dark:text-gray-300">
                    Reprise de session (--resum)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-early_data"
                    checked={scanOptions.early_data}
                    onChange={() => toggleScanOption('early_data')}
                    className="mr-2"
                  />
                  <label htmlFor="option-early_data" className="text-gray-700 dark:text-gray-300">
                    Early Data (--early_data)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-fallback"
                    checked={scanOptions.fallback}
                    onChange={() => toggleScanOption('fallback')}
                    className="mr-2"
                  />
                  <label htmlFor="option-fallback" className="text-gray-700 dark:text-gray-300">
                    Fallback (--fallback)
                  </label>
                </div>
                
                {/* Options de protocole */}
                <div className="col-span-2 md:col-span-3 mt-3 mb-2">
                  <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">Protocoles à tester</h4>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-sslv3"
                    checked={scanOptions.sslv3}
                    onChange={() => toggleScanOption('sslv3')}
                    className="mr-2"
                  />
                  <label htmlFor="option-sslv3" className="text-gray-700 dark:text-gray-300">
                    SSL 3.0 (--sslv3)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-tlsv1"
                    checked={scanOptions.tlsv1}
                    onChange={() => toggleScanOption('tlsv1')}
                    className="mr-2"
                  />
                  <label htmlFor="option-tlsv1" className="text-gray-700 dark:text-gray-300">
                    TLS 1.0 (--tlsv1)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-tlsv1_1"
                    checked={scanOptions.tlsv1_1}
                    onChange={() => toggleScanOption('tlsv1_1')}
                    className="mr-2"
                  />
                  <label htmlFor="option-tlsv1_1" className="text-gray-700 dark:text-gray-300">
                    TLS 1.1 (--tlsv1_1)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-tlsv1_2"
                    checked={scanOptions.tlsv1_2}
                    onChange={() => toggleScanOption('tlsv1_2')}
                    className="mr-2"
                  />
                  <label htmlFor="option-tlsv1_2" className="text-gray-700 dark:text-gray-300">
                    TLS 1.2 (--tlsv1_2)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-tlsv1_3"
                    checked={scanOptions.tlsv1_3}
                    onChange={() => toggleScanOption('tlsv1_3')}
                    className="mr-2"
                  />
                  <label htmlFor="option-tlsv1_3" className="text-gray-700 dark:text-gray-300">
                    TLS 1.3 (--tlsv1_3)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-elliptic_curves"
                    checked={scanOptions.elliptic_curves}
                    onChange={() => toggleScanOption('elliptic_curves')}
                    className="mr-2"
                  />
                  <label htmlFor="option-elliptic_curves" className="text-gray-700 dark:text-gray-300">
                    Courbes elliptiques (--elliptic_curves)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="option-ems"
                    checked={scanOptions.ems}
                    onChange={() => toggleScanOption('ems')}
                    className="mr-2"
                  />
                  <label htmlFor="option-ems" className="text-gray-700 dark:text-gray-300">
                    Extended Master Secret (--ems)
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Affichage des résultats */}
      {(rawOutput || filteredOutput) && (
        <div className="results-container mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              <FiLock className="mr-2" /> Résultats de l'analyse
            </h2>
            
            <div className="flex">
              <button
                onClick={exportToHTML}
                className="px-3 py-2 mr-2 rounded-md flex items-center bg-blue-600 hover:bg-blue-700 text-white"
                title="Exporter en HTML"
              >
                <FiCode className="mr-2" />
                HTML
              </button>
              
              <button
                onClick={exportToPDF}
                className="px-3 py-2 rounded-md flex items-center bg-purple-600 hover:bg-purple-700 text-white"
                title="Exporter en PDF"
              >
                <FiDownload className="mr-2" />
                PDF
              </button>
            </div>
          </div>
          
          {/* Filtres */}
          {scanResults && (
            <div className="mb-6">
              <div className="filters-container mb-4 flex flex-wrap">
                <button
                  onClick={() => applyFilter('critical')}
                  className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${
                    activeFilter === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  <FiAlertTriangle className="mr-1" />
                  Critiques ({parsedResults.critical.length})
                </button>
                
                <button
                  onClick={() => applyFilter('warning')}
                  className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${
                    activeFilter === 'warning'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                  }`}
                >
                  <FiAlertTriangle className="mr-1" />
                  Avertissements ({parsedResults.warning.length})
                </button>
                
                <button
                  onClick={() => applyFilter('success')}
                  className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${
                    activeFilter === 'success'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  <FiCheckCircle className="mr-1" />
                  Succès ({parsedResults.success.length})
                </button>
                
                <button
                  onClick={() => applyFilter('info')}
                  className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${
                    activeFilter === 'info'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  <FiInfo className="mr-1" />
                  Informations ({parsedResults.info.length})
                </button>
                
                <button
                  onClick={() => applyFilter('raw')}
                  className={`px-3 py-1 mr-2 mb-2 rounded-md flex items-center ${
                    activeFilter === 'raw'
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  <FiCode className="mr-1" />
                  Sortie brute
                </button>
              </div>
              
              {/* Affichage des résultats filtrés par catégorie */}
              {activeFilter === 'critical' && parsedResults.critical.length > 0 && (
                <div className="result-category mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <h3 className="text-lg font-semibold text-red-700 mb-2">Problèmes critiques ({parsedResults.critical.length})</h3>
                  <ul className="list-disc pl-5">
                    {parsedResults.critical.map((item, index) => (
                      <li key={`critical-${index}`} className="text-red-700 mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {activeFilter === 'warning' && parsedResults.warning.length > 0 && (
                <div className="result-category mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                  <h3 className="text-lg font-semibold text-orange-700 mb-2">Avertissements ({parsedResults.warning.length})</h3>
                  <ul className="list-disc pl-5">
                    {parsedResults.warning.map((item, index) => (
                      <li key={`warning-${index}`} className="text-orange-700 mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {activeFilter === 'success' && parsedResults.success.length > 0 && (
                <div className="result-category mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Configurations correctes ({parsedResults.success.length})</h3>
                  <ul className="list-disc pl-5">
                    {parsedResults.success.map((item, index) => (
                      <li key={`success-${index}`} className="text-green-700 mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {activeFilter === 'info' && parsedResults.info.length > 0 && (
                <div className="result-category mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="text-lg font-semibold text-blue-700 mb-2">Informations ({parsedResults.info.length})</h3>
                  <ul className="list-disc pl-5">
                    {parsedResults.info.map((item, index) => (
                      <li key={`info-${index}`} className="text-blue-700 mb-1">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Affichage des résultats bruts */}
          {activeFilter === 'raw' && (
            <div 
              ref={outputRef}
              className="output-container p-4 bg-gray-100 dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-700 overflow-auto"
              style={{ maxHeight: '500px', minHeight: '200px', whiteSpace: 'pre-wrap', lineHeight: '1.5', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: filteredOutput }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Scan_SSL_TLS;

