import React, { useState, useEffect, useRef } from 'react';
import { FiPlay, FiSettings, FiShield, FiAlertTriangle, FiInfo, FiCheckCircle, FiDownload, FiX } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const ZAPScanner = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États
  const [targetUrl, setTargetUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [zapStatus, setZapStatus] = useState('stopped'); // 'stopped', 'starting', 'running'
  const [apiKey, setApiKey] = useState('');
  const [zapPort, setZapPort] = useState(8080);
  const [scanType, setScanType] = useState('spider'); // 'spider', 'active', 'passive'
  const [scanProgress, setScanProgress] = useState(0);
  const [scanId, setScanId] = useState(null);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan', 'results', 'settings', 'plugins'
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'high', 'medium', 'low', 'info'
  const [scanOptions, setScanOptions] = useState({
    spiderMaxDepth: 5,
    spiderMaxChildren: 10,
    activeScanPolicy: 'Default Policy',
    activeScanRecurse: true,
    activeScanInScopeOnly: false
  });
  const [installedPlugins, setInstalledPlugins] = useState([]);
  const [marketplacePlugins, setMarketplacePlugins] = useState([]);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
  const [pluginSearchQuery, setPluginSearchQuery] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [isInstallingPlugin, setIsInstallingPlugin] = useState(false);
  
  // Référence pour le conteneur de résultats
  const resultsRef = useRef(null);
  
  // Vérifier si ZAP est en cours d'exécution
  const checkZapStatus = async () => {
    try {
      if (window.electronAPI && window.electronAPI.executeCommand) {
        // Utiliser une commande plus simple pour vérifier si le port est ouvert
        const command = `curl -s -m 2 http://localhost:${zapPort}/`;
        const result = await window.electronAPI.executeCommand(command);
        
        if (result.stdout && result.stdout.includes('ZAP')) {
          setZapStatus('running');
          showSuccess('OWASP ZAP est en cours d\'exécution');
          return true;
        } else {
          setZapStatus('stopped');
          return false;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut ZAP:', error);
      setZapStatus('stopped');
      return false;
    }
  };
  
  // Vérifier le statut de ZAP au chargement du composant
  useEffect(() => {
    checkZapStatus();
  }, []);
  
  // Démarrer ZAP
  const startZap = async () => {
    try {
      setZapStatus('starting');
      showInfo('Démarrage d\'OWASP ZAP...');
      
      // Générer une clé API aléatoire si elle n'existe pas
      const randomApiKey = apiKey || Math.random().toString(36).substring(2, 15);
      setApiKey(randomApiKey);
      
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const command = `cd /home/margoul1/HakBoard/src/programs/ZAP_2.16.0 && ./zap.sh -daemon -config api.key=${randomApiKey} -port ${zapPort} &`;
        
        await window.electronAPI.executeCommand(command);
        
        // Attendre que ZAP démarre
        let attempts = 0;
        const maxAttempts = 10; // Réduire le nombre de tentatives
        const checkInterval = setInterval(async () => {
          attempts++;
          const isRunning = await checkZapStatus();
          
          if (isRunning) {
            clearInterval(checkInterval);
            showSuccess('OWASP ZAP a démarré avec succès');
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            // Ne pas changer le statut à 'stopped' si ZAP est peut-être en cours de démarrage
            showInfo('ZAP peut être en cours de démarrage. Utilisez le bouton "Vérifier statut" pour confirmer.');
          }
        }, 3000); // Augmenter l'intervalle entre les vérifications
      } else {
        showError('API Electron non disponible pour exécuter la commande');
        setZapStatus('stopped');
      }
    } catch (error) {
      console.error('Erreur lors du démarrage de ZAP:', error);
      showError(`Erreur lors du démarrage de ZAP: ${error.message}`);
      setZapStatus('stopped');
    }
  };
  
  // Arrêter ZAP
  const stopZap = async () => {
    try {
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const command = `curl -s "http://localhost:${zapPort}/JSON/core/action/shutdown/?apikey=${apiKey}"`;
        
        await window.electronAPI.executeCommand(command);
        setZapStatus('stopped');
        showInfo('OWASP ZAP a été arrêté');
      } else {
        showError('API Electron non disponible pour exécuter la commande');
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de ZAP:', error);
      showError(`Erreur lors de l'arrêt de ZAP: ${error.message}`);
    }
  };
  
  // Lancer un scan Spider
  const startSpiderScan = async () => {
    if (!targetUrl) {
      showWarning('Veuillez entrer une URL cible');
      return;
    }
    
    try {
      setIsScanning(true);
      setScanProgress(0);
      setScanType('spider');
      showInfo(`Démarrage du scan Spider sur ${targetUrl}`);
      
      // Lancer le scan Spider avec les paramètres configurés
      const command = `curl -s "http://localhost:${zapPort}/JSON/spider/action/scan/?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}&maxChildren=${scanOptions.spiderMaxChildren}&recurse=true&contextName=&subtreeOnly=&maxDepth=${scanOptions.spiderMaxDepth}"`;
      
      const result = await window.electronAPI.executeCommand(command);
      const response = JSON.parse(result.stdout);
      
      if (response && response.scan) {
        setScanId(response.scan);
        showSuccess('Scan Spider démarré avec succès');
        
        // Suivre la progression du scan
        trackSpiderProgress(response.scan);
      } else {
        showError('Erreur lors du démarrage du scan Spider');
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Erreur lors du démarrage du scan Spider:', error);
      showError(`Erreur lors du démarrage du scan Spider: ${error.message}`);
      setIsScanning(false);
    }
  };
  
  // Lancer un scan actif
  const startActiveScan = async () => {
    if (!targetUrl) {
      showWarning('Veuillez entrer une URL cible');
      return;
    }
    
    try {
      setIsScanning(true);
      setScanProgress(0);
      setScanType('active');
      showInfo(`Démarrage du scan actif sur ${targetUrl}`);
      
      // Lancer le scan actif avec les paramètres configurés
      const command = `curl -s "http://localhost:${zapPort}/JSON/ascan/action/scan/?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}&recurse=${scanOptions.activeScanRecurse}&inScopeOnly=${scanOptions.activeScanInScopeOnly}&scanPolicyName=${encodeURIComponent(scanOptions.activeScanPolicy)}&method=&postData="`;
      
      const result = await window.electronAPI.executeCommand(command);
      const response = JSON.parse(result.stdout);
      
      if (response && response.scan) {
        setScanId(response.scan);
        showSuccess('Scan actif démarré avec succès');
        
        // Suivre la progression du scan
        trackActiveScanProgress(response.scan);
      } else {
        showError('Erreur lors du démarrage du scan actif');
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Erreur lors du démarrage du scan actif:', error);
      showError(`Erreur lors du démarrage du scan actif: ${error.message}`);
      setIsScanning(false);
    }
  };
  
  // Suivre la progression du scan Spider
  const trackSpiderProgress = async (scanId) => {
    const progressInterval = setInterval(async () => {
      try {
        const command = `curl -s "http://localhost:${zapPort}/JSON/spider/view/status/?apikey=${apiKey}&scanId=${scanId}"`;
        const result = await window.electronAPI.executeCommand(command);
        const response = JSON.parse(result.stdout);
        
        if (response && response.status !== undefined) {
          const progress = parseInt(response.status);
          setScanProgress(progress);
          
          if (progress >= 100) {
            clearInterval(progressInterval);
            setIsScanning(false);
            showSuccess('Scan Spider terminé');
            
            // Récupérer les résultats
            getSpiderResults();
          }
        }
      } catch (error) {
        console.error('Erreur lors du suivi de la progression du scan Spider:', error);
        clearInterval(progressInterval);
        setIsScanning(false);
      }
    }, 2000);
  };
  
  // Suivre la progression du scan actif
  const trackActiveScanProgress = async (scanId) => {
    const progressInterval = setInterval(async () => {
      try {
        const command = `curl -s "http://localhost:${zapPort}/JSON/ascan/view/status/?apikey=${apiKey}&scanId=${scanId}"`;
        const result = await window.electronAPI.executeCommand(command);
        const response = JSON.parse(result.stdout);
        
        if (response && response.status !== undefined) {
          const progress = parseInt(response.status);
          setScanProgress(progress);
          
          if (progress >= 100) {
            clearInterval(progressInterval);
            setIsScanning(false);
            showSuccess('Scan actif terminé');
            
            // Récupérer les résultats
            getActiveScanResults();
          }
        }
      } catch (error) {
        console.error('Erreur lors du suivi de la progression du scan actif:', error);
        clearInterval(progressInterval);
        setIsScanning(false);
      }
    }, 2000);
  };
  
  // Récupérer les résultats du scan Spider
  const getSpiderResults = async () => {
    try {
      const command = `curl -s "http://localhost:${zapPort}/JSON/spider/view/results/?apikey=${apiKey}&scanId=${scanId}"`;
      const result = await window.electronAPI.executeCommand(command);
      const response = JSON.parse(result.stdout);
      
      if (response && response.results) {
        setScanResults({
          type: 'spider',
          data: response.results
        });
        
        // Passer à l'onglet des résultats
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats du scan Spider:', error);
      showError(`Erreur lors de la récupération des résultats: ${error.message}`);
    }
  };
  
  // Récupérer les résultats du scan actif
  const getActiveScanResults = async () => {
    try {
      const command = `curl -s "http://localhost:${zapPort}/JSON/ascan/view/scanProgress/?apikey=${apiKey}&scanId=${scanId}"`;
      const result = await window.electronAPI.executeCommand(command);
      const scanProgressData = JSON.parse(result.stdout);
      
      // Récupérer les alertes
      const alertsCommand = `curl -s "http://localhost:${zapPort}/JSON/core/view/alerts/?apikey=${apiKey}&baseurl=${encodeURIComponent(targetUrl)}&start=0&count=100"`;
      const alertsResult = await window.electronAPI.executeCommand(alertsCommand);
      const alertsData = JSON.parse(alertsResult.stdout);
      
      setScanResults({
        type: 'active',
        progress: scanProgressData,
        alerts: alertsData.alerts || []
      });
      
      // Passer à l'onglet des résultats
      setActiveTab('results');
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats du scan actif:', error);
      showError(`Erreur lors de la récupération des résultats: ${error.message}`);
    }
  };
  
  // Lancer un scan passif
  const startPassiveScan = async () => {
    if (!targetUrl) {
      showWarning('Veuillez entrer une URL cible');
      return;
    }
    
    try {
      setIsScanning(true);
      setScanProgress(0);
      setScanType('passive');
      showInfo(`Démarrage du scan passif sur ${targetUrl}`);
      
      // Envoyer une requête à l'URL via ZAP pour déclencher l'analyse passive
      const command = `curl -s "http://localhost:${zapPort}/JSON/core/action/accessUrl/?apikey=${apiKey}&url=${encodeURIComponent(targetUrl)}"`;
      
      await window.electronAPI.executeCommand(command);
      showSuccess('URL envoyée à ZAP pour analyse passive');
      
      // Attendre un peu pour que ZAP traite la requête
      setTimeout(() => {
        // Récupérer les résultats passifs
        getPassiveScanResults();
      }, 5000);
    } catch (error) {
      console.error('Erreur lors du démarrage du scan passif:', error);
      showError(`Erreur lors du démarrage du scan passif: ${error.message}`);
      setIsScanning(false);
    }
  };
  
  // Récupérer les résultats du scan passif
  const getPassiveScanResults = async () => {
    try {
      // Récupérer les alertes passives
      const alertsCommand = `curl -s "http://localhost:${zapPort}/JSON/core/view/alerts/?apikey=${apiKey}&baseurl=${encodeURIComponent(targetUrl)}&start=0&count=100"`;
      const alertsResult = await window.electronAPI.executeCommand(alertsCommand);
      const alertsData = JSON.parse(alertsResult.stdout);
      
      setScanResults({
        type: 'passive',
        alerts: alertsData.alerts || []
      });
      
      setIsScanning(false);
      showSuccess('Scan passif terminé');
      
      // Passer à l'onglet des résultats
      setActiveTab('results');
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats du scan passif:', error);
      showError(`Erreur lors de la récupération des résultats: ${error.message}`);
      setIsScanning(false);
    }
  };
  
  // Arrêter le scan en cours
  const stopScan = async () => {
    if (!isScanning || !scanId) return;
    
    try {
      let command = '';
      
      if (scanType === 'spider') {
        command = `curl -s "http://localhost:${zapPort}/JSON/spider/action/stop/?apikey=${apiKey}&scanId=${scanId}"`;
      } else if (scanType === 'active') {
        command = `curl -s "http://localhost:${zapPort}/JSON/ascan/action/stop/?apikey=${apiKey}&scanId=${scanId}"`;
      } else if (scanType === 'passive') {
        command = `curl -s "http://localhost:${zapPort}/JSON/core/action/shutdown/?apikey=${apiKey}"`;
      }
      
      await window.electronAPI.executeCommand(command);
      setIsScanning(false);
      showInfo('Scan arrêté');
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du scan:', error);
      showError(`Erreur lors de l'arrêt du scan: ${error.message}`);
    }
  };
  
  // Exporter les résultats en HTML
  const exportToHTML = () => {
    if (!scanResults) return;
    
    try {
      // Créer le contenu HTML
      let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rapport de scan ZAP - ${targetUrl}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            h1, h2, h3 { margin-top: 0; }
            .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .alert { margin-bottom: 15px; padding: 10px; border-radius: 5px; border-left: 4px solid #ccc; }
            .high { background-color: #ffebee; border-left-color: #f44336; }
            .medium { background-color: #fff8e1; border-left-color: #ff9800; }
            .low { background-color: #f1f8e9; border-left-color: #8bc34a; }
            .info { background-color: #e3f2fd; border-left-color: #2196f3; }
            .details { margin-top: 10px; font-size: 0.9em; }
            .url-list { max-height: 300px; overflow-y: auto; }
            .footer { margin-top: 30px; font-size: 0.8em; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Rapport de scan OWASP ZAP</h1>
          
          <div class="header">
            <p><strong>URL cible:</strong> ${targetUrl}</p>
            <p><strong>Type de scan:</strong> ${scanResults.type === 'spider' ? 'Spider' : scanResults.type === 'active' ? 'Scan actif' : 'Scan passif'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
      `;
      
      // Ajouter les résultats spécifiques selon le type de scan
      if (scanResults.type === 'spider') {
        htmlContent += `
          <h2>URLs découvertes</h2>
          <div class="url-list">
            <ul>
              ${scanResults.data && scanResults.data.map(url => `<li>${url}</li>`).join('')}
            </ul>
          </div>
        `;
      } else if (scanResults.type === 'active' || scanResults.type === 'passive') {
        htmlContent += `
          <h2>Alertes de sécurité</h2>
          <p><strong>Nombre total d'alertes:</strong> ${scanResults.alerts ? scanResults.alerts.length : 0}</p>
          
          <h3>Alertes à risque élevé</h3>
          ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'High'), 'high')}
          
          <h3>Alertes à risque moyen</h3>
          ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'Medium'), 'medium')}
          
          <h3>Alertes à risque faible</h3>
          ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'Low'), 'low')}
          
          <h3>Alertes informatives</h3>
          ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'Informational'), 'info')}
        `;
      }
      
      // Ajouter le pied de page
      htmlContent += `
          <div class="footer">
            <p>Rapport généré par HakBoard - OWASP ZAP Scanner</p>
          </div>
        </body>
        </html>
      `;
      
      // Ouvrir une nouvelle fenêtre et y écrire le contenu HTML
      const reportWindow = window.open('', '_blank');
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();
      
      showSuccess('Rapport HTML généré avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'exportation en HTML:', error);
      showError(`Erreur lors de l'exportation en HTML: ${error.message}`);
    }
  };
  
  // Fonction utilitaire pour générer le HTML des alertes
  const generateAlertsHTML = (alerts, riskClass) => {
    if (!alerts || alerts.length === 0) {
      return '<p>Aucune alerte détectée dans cette catégorie.</p>';
    }
    
    return `
      <div>
        ${alerts.map(alert => `
          <div class="alert ${riskClass}">
            <h4>${alert.name}</h4>
            <p><strong>Risque:</strong> ${alert.risk} | <strong>Confiance:</strong> ${alert.confidence}</p>
            <p><strong>URL:</strong> ${alert.url}</p>
            <div class="details">
              <p><strong>Description:</strong> ${alert.description}</p>
              ${alert.solution ? `<p><strong>Solution:</strong> ${alert.solution}</p>` : ''}
              ${alert.reference ? `<p><strong>Référence:</strong> ${alert.reference}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };
  
  // Exporter les résultats en PDF
  const exportToPDF = async () => {
    if (!scanResults) return;
    
    try {
      // Créer le contenu HTML pour le PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Rapport de scan ZAP - ${targetUrl}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            h1, h2, h3 { margin-top: 0; }
            .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .alert { margin-bottom: 15px; padding: 10px; border-radius: 5px; border-left: 4px solid #ccc; }
            .high { background-color: #ffebee; border-left-color: #f44336; }
            .medium { background-color: #fff8e1; border-left-color: #ff9800; }
            .low { background-color: #f1f8e9; border-left-color: #8bc34a; }
            .info { background-color: #e3f2fd; border-left-color: #2196f3; }
            .details { margin-top: 10px; font-size: 0.9em; }
            .footer { margin-top: 30px; font-size: 0.8em; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Rapport de scan OWASP ZAP</h1>
          
          <div class="header">
            <p><strong>URL cible:</strong> ${targetUrl}</p>
            <p><strong>Type de scan:</strong> ${scanResults.type === 'spider' ? 'Spider' : scanResults.type === 'active' ? 'Scan actif' : 'Scan passif'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${scanResults.type === 'spider' ? `
            <h2>URLs découvertes</h2>
            <div>
              <ul>
                ${scanResults.data && scanResults.data.map(url => `<li>${url}</li>`).join('')}
              </ul>
            </div>
          ` : `
            <h2>Alertes de sécurité</h2>
            <p><strong>Nombre total d'alertes:</strong> ${scanResults.alerts ? scanResults.alerts.length : 0}</p>
            
            <h3>Alertes à risque élevé</h3>
            ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'High'), 'high')}
            
            <h3>Alertes à risque moyen</h3>
            ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'Medium'), 'medium')}
            
            <h3>Alertes à risque faible</h3>
            ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'Low'), 'low')}
            
            <h3>Alertes informatives</h3>
            ${generateAlertsHTML(scanResults.alerts.filter(alert => alert.risk === 'Informational'), 'info')}
          `}
          
          <div class="footer">
            <p>Rapport généré par HakBoard - OWASP ZAP Scanner</p>
          </div>
        </body>
        </html>
      `;
      
      // Utiliser l'API Electron pour exporter en PDF
      if (window.electronAPI && window.electronAPI.exportToPDF) {
        const options = {
          content: {
            html: htmlContent
          },
          filename: `ZAP_Scan_${new Date().toISOString().slice(0, 10)}.pdf`
        };
        
        await window.electronAPI.exportToPDF(options);
        showSuccess('Rapport PDF généré avec succès');
      } else {
        // Fallback si l'API Electron n'est pas disponible
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(htmlContent);
        reportWindow.document.close();
        reportWindow.print();
        showInfo('Utilisez la fonction d\'impression du navigateur pour enregistrer en PDF');
      }
    } catch (error) {
      console.error('Erreur lors de l\'exportation en PDF:', error);
      showError(`Erreur lors de l'exportation en PDF: ${error.message}`);
    }
  };
  
  // Filtrer les alertes par niveau de risque
  const filterAlertsByRisk = (risk) => {
    if (!scanResults || !scanResults.alerts) return;
    
    setRiskFilter(risk);
    
    if (risk === 'all') {
      setFilteredAlerts(scanResults.alerts);
    } else {
      const riskMap = {
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
        'info': 'Informational'
      };
      
      setFilteredAlerts(scanResults.alerts.filter(alert => alert.risk === riskMap[risk]));
    }
  };
  
  // Récupérer la liste des plugins installés
  const getInstalledPlugins = async () => {
    if (zapStatus !== 'running') {
      showWarning('ZAP doit être en cours d\'exécution pour gérer les plugins');
      return;
    }
    
    try {
      setIsLoadingPlugins(true);
      const command = `curl -s "http://localhost:${zapPort}/JSON/core/view/plugins/?apikey=${apiKey}"`;
      const result = await window.electronAPI.executeCommand(command);
      const response = JSON.parse(result.stdout);
      
      if (response && response.plugins) {
        // Formater les données des plugins
        const plugins = response.plugins.map(plugin => ({
          id: plugin.id,
          name: plugin.name,
          status: plugin.status,
          description: plugin.description || 'Aucune description disponible',
          version: plugin.version || 'N/A',
          author: plugin.author || 'N/A',
          url: plugin.url || '#',
          isEnabled: plugin.status === 'enabled'
        }));
        
        setInstalledPlugins(plugins);
        showSuccess(`${plugins.length} plugins trouvés`);
      } else {
        setInstalledPlugins([]);
        showInfo('Aucun plugin trouvé');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des plugins:', error);
      showError(`Erreur lors de la récupération des plugins: ${error.message}`);
    } finally {
      setIsLoadingPlugins(false);
    }
  };
  
  // Récupérer la liste des plugins disponibles sur le marketplace
  const getMarketplacePlugins = async () => {
    if (zapStatus !== 'running') {
      showWarning('ZAP doit être en cours d\'exécution pour accéder au marketplace');
      return;
    }
    
    try {
      setIsLoadingPlugins(true);
      const command = `curl -s "http://localhost:${zapPort}/JSON/autoupdate/view/marketplaceAddons/?apikey=${apiKey}"`;
      const result = await window.electronAPI.executeCommand(command);
      const response = JSON.parse(result.stdout);
      
      if (response && response.marketplaceAddons) {
        // Formater les données des plugins du marketplace
        const plugins = response.marketplaceAddons.map(plugin => ({
          id: plugin.id,
          name: plugin.name,
          description: plugin.description || 'Aucune description disponible',
          version: plugin.version || 'N/A',
          status: 'marketplace',
          author: plugin.author || 'N/A',
          url: plugin.url || '#',
          downloadUrl: plugin.downloadUrl || '',
          size: plugin.size || 'N/A',
          date: plugin.date || 'N/A'
        }));
        
        setMarketplacePlugins(plugins);
        showSuccess(`${plugins.length} plugins trouvés sur le marketplace`);
      } else {
        setMarketplacePlugins([]);
        showInfo('Aucun plugin trouvé sur le marketplace');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des plugins du marketplace:', error);
      showError(`Erreur lors de la récupération des plugins du marketplace: ${error.message}`);
    } finally {
      setIsLoadingPlugins(false);
    }
  };
  
  // Installer un plugin depuis le marketplace
  const installPluginFromMarketplace = async (pluginId) => {
    if (zapStatus !== 'running') {
      showWarning('ZAP doit être en cours d\'exécution pour installer des plugins');
      return;
    }
    
    try {
      setIsInstallingPlugin(true);
      showInfo(`Installation du plugin ${pluginId} en cours...`);
      
      const command = `curl -s "http://localhost:${zapPort}/JSON/autoupdate/action/installAddon/?apikey=${apiKey}&id=${pluginId}"`;
      await window.electronAPI.executeCommand(command);
      
      showSuccess(`Plugin ${pluginId} installé avec succès`);
      
      // Rafraîchir la liste des plugins installés
      await getInstalledPlugins();
    } catch (error) {
      console.error(`Erreur lors de l'installation du plugin ${pluginId}:`, error);
      showError(`Erreur lors de l'installation du plugin: ${error.message}`);
    } finally {
      setIsInstallingPlugin(false);
    }
  };
  
  // Désinstaller un plugin
  const uninstallPlugin = async (pluginId) => {
    if (zapStatus !== 'running') {
      showWarning('ZAP doit être en cours d\'exécution pour désinstaller des plugins');
      return;
    }
    
    try {
      setIsInstallingPlugin(true);
      showInfo(`Désinstallation du plugin ${pluginId} en cours...`);
      
      const command = `curl -s "http://localhost:${zapPort}/JSON/autoupdate/action/uninstallAddon/?apikey=${apiKey}&id=${pluginId}"`;
      await window.electronAPI.executeCommand(command);
      
      showSuccess(`Plugin ${pluginId} désinstallé avec succès`);
      
      // Rafraîchir la liste des plugins installés
      await getInstalledPlugins();
    } catch (error) {
      console.error(`Erreur lors de la désinstallation du plugin ${pluginId}:`, error);
      showError(`Erreur lors de la désinstallation du plugin: ${error.message}`);
    } finally {
      setIsInstallingPlugin(false);
    }
  };
  
  // Activer ou désactiver un plugin
  const togglePluginStatus = async (pluginId, enable) => {
    if (zapStatus !== 'running') {
      showWarning('ZAP doit être en cours d\'exécution pour gérer les plugins');
      return;
    }
    
    try {
      const action = enable ? 'enable' : 'disable';
      showInfo(`${enable ? 'Activation' : 'Désactivation'} du plugin ${pluginId} en cours...`);
      
      const command = `curl -s "http://localhost:${zapPort}/JSON/core/action/${action}Plugins/?apikey=${apiKey}&pluginId=${pluginId}"`;
      await window.electronAPI.executeCommand(command);
      
      showSuccess(`Plugin ${pluginId} ${enable ? 'activé' : 'désactivé'} avec succès`);
      
      // Rafraîchir la liste des plugins installés
      await getInstalledPlugins();
    } catch (error) {
      console.error(`Erreur lors de la ${enable ? 'l\'activation' : 'la désactivation'} du plugin ${pluginId}:`, error);
      showError(`Erreur lors de la ${enable ? 'l\'activation' : 'la désactivation'} du plugin: ${error.message}`);
    }
  };
  
  return (
    <div className="zap-scanner-container bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
        <FiShield className="mr-2" /> OWASP ZAP Scanner
      </h1>
      
      <div className="mb-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Analysez les vulnérabilités des applications web à l'aide d'OWASP ZAP (Zed Attack Proxy).
        </p>
        
        {/* Contrôles ZAP */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center">
            <FiSettings className="mr-2" /> Contrôle ZAP
          </h2>
          
          <div className="flex items-center mb-4">
            <div className="mr-4">
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                zapStatus === 'running' ? 'bg-green-500' : 
                zapStatus === 'starting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></span>
              <span className="text-gray-700 dark:text-gray-300">
                {zapStatus === 'running' ? 'En cours d\'exécution' : 
                 zapStatus === 'starting' ? 'Démarrage...' : 'Arrêté'}
              </span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={startZap}
                disabled={zapStatus !== 'stopped'}
                className={`px-4 py-2 rounded-md flex items-center ${
                  zapStatus !== 'stopped'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                <FiPlay className="mr-2" />
                Démarrer ZAP
              </button>
              
              <button
                onClick={stopZap}
                disabled={zapStatus !== 'running'}
                className={`px-4 py-2 rounded-md flex items-center ${
                  zapStatus !== 'running'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
              >
                <FiX className="mr-2" />
                Arrêter ZAP
              </button>
              
              <button
                onClick={checkZapStatus}
                className="px-4 py-2 rounded-md flex items-center bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FiInfo className="mr-2" />
                Vérifier statut
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port ZAP
              </label>
              <input
                type="number"
                value={zapPort}
                onChange={(e) => setZapPort(parseInt(e.target.value))}
                placeholder="8080"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Clé API (générée automatiquement)
              </label>
              <input
                type="text"
                value={apiKey}
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
        </div>
        
        {/* Onglets */}
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('scan')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'scan'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Scanner
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('results')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'results'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Résultats
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('settings')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'settings'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Paramètres
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('plugins')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'plugins'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Plugins
              </button>
            </li>
          </ul>
        </div>
        
        {/* Contenu des onglets */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          {/* Onglet Scanner */}
          {activeTab === 'scan' && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Scanner une cible
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL cible
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  disabled={zapStatus !== 'running' || isScanning}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type de scan
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setScanType('spider')}
                    className={`px-4 py-2 rounded-md ${
                      scanType === 'spider'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                    }`}
                    disabled={zapStatus !== 'running' || isScanning}
                  >
                    Spider
                  </button>
                  <button
                    onClick={() => setScanType('active')}
                    className={`px-4 py-2 rounded-md ${
                      scanType === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                    }`}
                    disabled={zapStatus !== 'running' || isScanning}
                  >
                    Scan actif
                  </button>
                  <button
                    onClick={() => setScanType('passive')}
                    className={`px-4 py-2 rounded-md ${
                      scanType === 'passive'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                    }`}
                    disabled={zapStatus !== 'running' || isScanning}
                  >
                    Scan passif
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={startSpiderScan}
                  disabled={zapStatus !== 'running' || isScanning || !targetUrl}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    zapStatus !== 'running' || isScanning || !targetUrl
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  <FiPlay className="mr-2" />
                  Lancer le scan
                </button>
                
                <button
                  onClick={startActiveScan}
                  disabled={zapStatus !== 'running' || isScanning || !targetUrl}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    zapStatus !== 'running' || isScanning || !targetUrl
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  <FiPlay className="mr-2" />
                  Lancer le scan actif
                </button>
                
                <button
                  onClick={startPassiveScan}
                  disabled={zapStatus !== 'running' || isScanning || !targetUrl}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    zapStatus !== 'running' || isScanning || !targetUrl
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  <FiPlay className="mr-2" />
                  Lancer le scan passif
                </button>
                
                <button
                  onClick={stopScan}
                  disabled={!isScanning}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    !isScanning
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  <FiX className="mr-2" />
                  Arrêter le scan
                </button>
              </div>
              
              {isScanning && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Progression du scan
                  </label>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {scanProgress}% terminé
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Onglet Résultats - Sera implémenté dans la prochaine étape */}
          {activeTab === 'results' && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Résultats du scan
              </h2>
              
              {!scanResults ? (
                <div className="text-center p-6">
                  <FiInfo size={40} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Aucun résultat disponible. Lancez un scan pour voir les résultats.
                  </p>
                </div>
              ) : (
                <div>
                  {/* En-tête des résultats */}
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-200">
                      <strong>Type de scan:</strong> {scanResults.type === 'spider' ? 'Spider' : scanResults.type === 'active' ? 'Scan actif' : 'Scan passif'}
                    </p>
                    <p className="text-blue-800 dark:text-blue-200">
                      <strong>URL cible:</strong> {targetUrl}
                    </p>
                  </div>
                  
                  {/* Résultats du Spider */}
                  {scanResults.type === 'spider' && (
                    <div>
                      <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">
                        URLs découvertes
                      </h3>
                      
                      {scanResults.data && scanResults.data.length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 max-h-96 overflow-y-auto">
                          <ul className="list-disc pl-5">
                            {scanResults.data.map((url, index) => (
                              <li key={index} className="text-gray-700 dark:text-gray-300 mb-1">
                                {url}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400">
                          Aucune URL découverte.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Résultats du scan actif ou passif */}
                  {(scanResults.type === 'active' || scanResults.type === 'passive') && (
                    <div>
                      <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">
                        Alertes de sécurité
                      </h3>
                      
                      {/* Filtres de risque */}
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => filterAlertsByRisk('high')}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          Élevé ({scanResults.alerts.filter(alert => alert.risk === 'High').length})
                        </button>
                        <button
                          onClick={() => filterAlertsByRisk('medium')}
                          className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                        >
                          Moyen ({scanResults.alerts.filter(alert => alert.risk === 'Medium').length})
                        </button>
                        <button
                          onClick={() => filterAlertsByRisk('low')}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                        >
                          Faible ({scanResults.alerts.filter(alert => alert.risk === 'Low').length})
                        </button>
                        <button
                          onClick={() => filterAlertsByRisk('info')}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          Info ({scanResults.alerts.filter(alert => alert.risk === 'Informational').length})
                        </button>
                      </div>
                      
                      {/* Liste des alertes */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 max-h-96 overflow-y-auto">
                        {filteredAlerts.map((alert, index) => (
                          <div 
                            key={index} 
                            className={`mb-3 p-3 rounded-lg ${
                              alert.risk === 'High' ? 'bg-red-50 dark:bg-red-900 border-l-4 border-red-500' :
                              alert.risk === 'Medium' ? 'bg-orange-50 dark:bg-orange-900 border-l-4 border-orange-500' :
                              alert.risk === 'Low' ? 'bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500' :
                              'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500'
                            }`}
                          >
                            <h4 className={`font-semibold ${
                              alert.risk === 'High' ? 'text-red-800 dark:text-red-200' :
                              alert.risk === 'Medium' ? 'text-orange-800 dark:text-orange-200' :
                              alert.risk === 'Low' ? 'text-yellow-800 dark:text-yellow-200' :
                              'text-blue-800 dark:text-blue-200'
                            }`}>
                              {alert.name}
                            </h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                              <strong>Risque:</strong> {alert.risk} | <strong>Confiance:</strong> {alert.confidence}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                              <strong>URL:</strong> {alert.url}
                            </p>
                            <div className="mt-2">
                              <details>
                                <summary className="cursor-pointer text-gray-800 dark:text-gray-200 font-medium">
                                  Détails
                                </summary>
                                <div className="mt-2 pl-3 text-sm">
                                  <p className="text-gray-700 dark:text-gray-300 mb-1">
                                    <strong>Description:</strong> {alert.description}
                                  </p>
                                  {alert.solution && (
                                    <p className="text-gray-700 dark:text-gray-300 mb-1">
                                      <strong>Solution:</strong> {alert.solution}
                                    </p>
                                  )}
                                  {alert.reference && (
                                    <p className="text-gray-700 dark:text-gray-300 mb-1">
                                      <strong>Référence:</strong> {alert.reference}
                                    </p>
                                  )}
                                </div>
                              </details>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Boutons d'export */}
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={exportToHTML}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
                    >
                      <FiDownload className="mr-2" />
                      Exporter en HTML
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
                    >
                      <FiDownload className="mr-2" />
                      Exporter en PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Onglet Paramètres - Sera implémenté dans la prochaine étape */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Paramètres avancés
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paramètres Spider */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Paramètres Spider
                  </h3>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Profondeur maximale
                    </label>
                    <input
                      type="number"
                      value={scanOptions.spiderMaxDepth}
                      onChange={(e) => setScanOptions({...scanOptions, spiderMaxDepth: parseInt(e.target.value)})}
                      min="1"
                      max="10"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Définit la profondeur maximale du crawl (1-10)
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre maximum d'enfants
                    </label>
                    <input
                      type="number"
                      value={scanOptions.spiderMaxChildren}
                      onChange={(e) => setScanOptions({...scanOptions, spiderMaxChildren: parseInt(e.target.value)})}
                      min="0"
                      max="1000"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Limite le nombre d'enfants à explorer (0 = illimité)
                    </p>
                  </div>
                </div>
                
                {/* Paramètres Scan Actif */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Paramètres Scan Actif
                  </h3>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Politique de scan
                    </label>
                    <select
                      value={scanOptions.activeScanPolicy}
                      onChange={(e) => setScanOptions({...scanOptions, activeScanPolicy: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <option value="Default Policy">Politique par défaut</option>
                      <option value="API-Minimal">API Minimal</option>
                      <option value="API-Complete">API Complète</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Sélectionnez la politique de scan à utiliser
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={scanOptions.activeScanRecurse}
                        onChange={(e) => setScanOptions({...scanOptions, activeScanRecurse: e.target.checked})}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Scan récursif
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                      Scanner récursivement tous les chemins trouvés
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={scanOptions.activeScanInScopeOnly}
                        onChange={(e) => setScanOptions({...scanOptions, activeScanInScopeOnly: e.target.checked})}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Uniquement dans le périmètre
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                      Scanner uniquement les URLs dans le périmètre défini
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Paramètres ZAP */}
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  Paramètres ZAP
                </h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chemin de l'installation ZAP
                  </label>
                  <input
                    type="text"
                    value="/home/margoul1/HakBoard"
                    readOnly
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Version de ZAP
                  </label>
                  <input
                    type="text"
                    value="2.16.0"
                    readOnly
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                  />
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={() => {
                      // Réinitialiser les paramètres par défaut
                      setScanOptions({
                        spiderMaxDepth: 5,
                        spiderMaxChildren: 10,
                        activeScanPolicy: 'Default Policy',
                        activeScanRecurse: true,
                        activeScanInScopeOnly: false
                      });
                      showInfo('Paramètres réinitialisés aux valeurs par défaut');
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                  >
                    Réinitialiser les paramètres
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Onglet Plugins */}
          {activeTab === 'plugins' && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Gestion des plugins
              </h2>
              
              {zapStatus !== 'running' ? (
                <div className="text-center p-6 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                  <FiAlertTriangle size={40} className="mx-auto mb-4 text-yellow-500" />
                  <p className="text-yellow-700 dark:text-yellow-300">
                    ZAP doit être en cours d'exécution pour gérer les plugins.
                    Veuillez démarrer ZAP avant d'accéder à cette fonctionnalité.
                  </p>
                  <button
                    onClick={startZap}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                  >
                    Démarrer ZAP
                  </button>
                </div>
              ) : (
                <>
                  {/* Onglets pour les plugins */}
                  <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                    <ul className="flex flex-wrap -mb-px">
                      <li className="mr-2">
                        <button
                          onClick={() => {
                            getInstalledPlugins();
                            setSelectedPlugin(null);
                          }}
                          className="inline-block p-2 rounded-t-lg border-b-2 border-blue-600 text-blue-600 dark:text-blue-500 dark:border-blue-500"
                        >
                          Plugins installés
                        </button>
                      </li>
                      <li className="mr-2">
                        <button
                          onClick={() => {
                            getMarketplacePlugins();
                            setSelectedPlugin(null);
                          }}
                          className="inline-block p-2 rounded-t-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          Marketplace
                        </button>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Recherche de plugins */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rechercher un plugin
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={pluginSearchQuery}
                        onChange={(e) => setPluginSearchQuery(e.target.value)}
                        placeholder="Nom du plugin"
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      />
                      <button
                        onClick={() => {
                          // Réinitialiser la recherche
                          setPluginSearchQuery('');
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-r-md"
                      >
                        Effacer
                      </button>
                    </div>
                  </div>
                  
                  {/* Liste des plugins installés */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                        {installedPlugins.length > 0 ? `Plugins installés (${installedPlugins.length})` : 'Plugins installés'}
                      </h3>
                      <button
                        onClick={getInstalledPlugins}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center"
                        disabled={isLoadingPlugins}
                      >
                        {isLoadingPlugins ? 'Chargement...' : 'Rafraîchir'}
                      </button>
                    </div>
                    
                    {isLoadingPlugins ? (
                      <div className="text-center p-4">
                        <p className="text-gray-600 dark:text-gray-400">Chargement des plugins...</p>
                      </div>
                    ) : installedPlugins.length === 0 ? (
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400">
                          Aucun plugin installé ou cliquez sur "Rafraîchir" pour charger la liste.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Nom
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Statut
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Version
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {installedPlugins
                              .filter(plugin => plugin.name.toLowerCase().includes(pluginSearchQuery.toLowerCase()))
                              .map((plugin, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {plugin.name}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      plugin.isEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                      {plugin.isEnabled ? 'Activé' : 'Désactivé'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {plugin.version}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => setSelectedPlugin(plugin)}
                                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                                    >
                                      Détails
                                    </button>
                                    <button
                                      onClick={() => togglePluginStatus(plugin.id, !plugin.isEnabled)}
                                      className={`${
                                        plugin.isEnabled ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                      } mr-3`}
                                    >
                                      {plugin.isEnabled ? 'Désactiver' : 'Activer'}
                                    </button>
                                    <button
                                      onClick={() => uninstallPlugin(plugin.id)}
                                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      Désinstaller
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {/* Liste des plugins du marketplace */}
                  {marketplacePlugins.length > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                          Plugins disponibles sur le marketplace ({marketplacePlugins.length})
                        </h3>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Nom
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Version
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Taille
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {marketplacePlugins
                              .filter(plugin => plugin.name.toLowerCase().includes(pluginSearchQuery.toLowerCase()))
                              .map((plugin, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {plugin.name}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {plugin.version}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {plugin.size}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => setSelectedPlugin(plugin)}
                                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                                    >
                                      Détails
                                    </button>
                                    <button
                                      onClick={() => installPluginFromMarketplace(plugin.id)}
                                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                      disabled={isInstallingPlugin}
                                    >
                                      {isInstallingPlugin && selectedPlugin?.id === plugin.id ? 'Installation...' : 'Installer'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Détails du plugin sélectionné */}
                  {selectedPlugin && (
                    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                        Détails du plugin
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">
                            <strong>Nom:</strong> {selectedPlugin.name}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">
                            <strong>ID:</strong> {selectedPlugin.id}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">
                            <strong>Version:</strong> {selectedPlugin.version}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">
                            <strong>Auteur:</strong> {selectedPlugin.author}
                          </p>
                          {selectedPlugin.status && (
                            <p className="text-gray-700 dark:text-gray-300 mb-2">
                              <strong>Statut:</strong> {selectedPlugin.status}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">
                            <strong>Description:</strong>
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 mb-4">
                            {selectedPlugin.description}
                          </p>
                          
                          {selectedPlugin.url && selectedPlugin.url !== '#' && (
                            <p className="text-gray-700 dark:text-gray-300 mb-2">
                              <strong>URL:</strong>{' '}
                              <a
                                href={selectedPlugin.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {selectedPlugin.url}
                              </a>
                            </p>
                          )}
                          
                          {selectedPlugin.status === 'marketplace' ? (
                            <button
                              onClick={() => installPluginFromMarketplace(selectedPlugin.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                              disabled={isInstallingPlugin}
                            >
                              {isInstallingPlugin ? 'Installation en cours...' : 'Installer le plugin'}
                            </button>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => togglePluginStatus(selectedPlugin.id, !selectedPlugin.isEnabled)}
                                className={`px-4 py-2 ${
                                  selectedPlugin.isEnabled
                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                } text-white rounded-md`}
                              >
                                {selectedPlugin.isEnabled ? 'Désactiver' : 'Activer'}
                              </button>
                              <button
                                onClick={() => uninstallPlugin(selectedPlugin.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                              >
                                Désinstaller
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZAPScanner; 