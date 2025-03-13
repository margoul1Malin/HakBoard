import React, { useState, useEffect } from 'react';
import { FiSearch, FiAlertCircle, FiInfo, FiDownload, FiFileText, FiFile } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const PhoneOsint = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [twilioApiKey, setTwilioApiKey] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [numverifyApiKey, setNumverifyApiKey] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [results, setResults] = useState(null);
  const [searchType, setSearchType] = useState('leakcheck'); // 'leakcheck', 'twilio' ou 'numverify'
  const [exportLoading, setExportLoading] = useState(false);

  // Charger les clés API et l'historique au démarrage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Charger les clés API depuis le stockage local
        const leakCheckKey = localStorage.getItem('leakcheck_api_key') || '';
        const twilioKey = localStorage.getItem('twilio_api_key') || '';
        const twilioSid = localStorage.getItem('twilio_account_sid') || '';
        const numverifyKey = localStorage.getItem('numverify_api_key') || '';
        
        setApiKey(leakCheckKey);
        setTwilioApiKey(twilioKey);
        setTwilioAccountSid(twilioSid);
        setNumverifyApiKey(numverifyKey);
        
        // Charger l'historique de recherche
        const history = JSON.parse(localStorage.getItem('phoneSearchHistory')) || [];
        setSearchHistory(history);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };
    
    loadSavedData();
  }, []);

  // Sauvegarder les clés API
  const saveApiKeys = () => {
    try {
      localStorage.setItem('leakcheck_api_key', apiKey);
      localStorage.setItem('twilio_api_key', twilioApiKey);
      localStorage.setItem('twilio_account_sid', twilioAccountSid);
      localStorage.setItem('numverify_api_key', numverifyApiKey);
      showSuccess('Clés API sauvegardées avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des clés API:', error);
      showError('Erreur lors de la sauvegarde des clés API');
    }
  };

  // Rechercher un numéro de téléphone
  const searchPhone = async () => {
    if (!phone) {
      showError('Veuillez entrer un numéro de téléphone');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      if (searchType === 'leakcheck') {
        // Vérifier si la clé API LeakCheck est définie
        if (!apiKey) {
          showError('Veuillez configurer votre clé API LeakCheck');
          setLoading(false);
          return;
        }

        // Recherche avec LeakCheck
        await searchWithLeakCheck();
      } else if (searchType === 'twilio') {
        // Vérifier si les clés API Twilio sont définies
        if (!twilioApiKey || !twilioAccountSid) {
          showError('Veuillez configurer vos clés API Twilio');
          setLoading(false);
          return;
        }

        // Recherche avec Twilio
        await searchWithTwilio();
      } else if (searchType === 'numverify') {
        // Vérifier si la clé API NumVerify est définie
        if (!numverifyApiKey) {
          showError('Veuillez configurer votre clé API NumVerify');
          setLoading(false);
          return;
        }

        // Recherche avec NumVerify
        await searchWithNumVerify();
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      showError(`Erreur lors de la recherche: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Recherche avec LeakCheck
  const searchWithLeakCheck = async () => {
    try {
      // Déterminer la plateforme pour choisir le bon script
      const platform = await window.electronAPI.getPlatform();
      console.log('Plateforme détectée pour LeakCheck:', platform);
      
      // Construire la commande en fonction de la plateforme
      let cmd;
      if (platform === 'win32') {
        // Utiliser PowerShell pour Windows
        cmd = `powershell -Command "& {python .\\src\\scripts\\phones\\win_phone_leakcheck.py '${phone}' '${apiKey}'}"`;
      } else if (platform === 'darwin') {
        // macOS
        cmd = `python ./src/scripts/phones/mac_phone_leakcheck.py '${phone}' '${apiKey}'`;
      } else {
        // Linux et autres
        cmd = `python ./src/scripts/phones/linux_phone_leakcheck.py '${phone}' '${apiKey}'`;
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
          throw new Error("Cette fonctionnalité nécessite un plan payant LeakCheck. Le plan gratuit ne permet pas la recherche par numéro de téléphone.");
        }
        throw new Error(leakCheckResponse.error);
      }
      
      // Vérifier si c'est un tableau (résultats) ou un objet avec une propriété error
      if (Array.isArray(leakCheckResponse)) {
        // C'est un tableau de résultats
        const resultData = {
          type: 'leakcheck',
          data: leakCheckResponse,
          phone: phone,
          timestamp: new Date().toISOString(),
          is_public_api: leakCheckResponse.length > 0 && leakCheckResponse[0].is_public_api === true
        };
        
        setResults(resultData);
        
        // Ajouter à l'historique
        const updatedHistory = [resultData, ...searchHistory].slice(0, 20); // Limiter à 20 entrées
        setSearchHistory(updatedHistory);
        localStorage.setItem('phoneSearchHistory', JSON.stringify(updatedHistory));
        
        // Afficher un message de succès
        if (leakCheckResponse.length > 0 && leakCheckResponse[0].is_public_api) {
          showSuccess(`Recherche effectuée avec succès (API publique) - ${leakCheckResponse.length} résultats trouvés`);
        } else if (leakCheckResponse.length > 0) {
          showSuccess(`Recherche effectuée avec succès - ${leakCheckResponse.length} résultats trouvés`);
        } else {
          showInfo('Aucune fuite de données trouvée pour ce numéro de téléphone');
        }
      } else if (leakCheckResponse && leakCheckResponse.error) {
        // C'est une erreur
        throw new Error(leakCheckResponse.error);
      } else {
        // Format inconnu
        console.error('Format de réponse inconnu:', leakCheckResponse);
        showError('Format de réponse inconnu');
      }
    } catch (error) {
      console.error('Erreur lors de la recherche avec LeakCheck:', error);
      showError(`Erreur lors de la recherche avec LeakCheck: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Recherche avec Twilio
  const searchWithTwilio = async () => {
    try {
      // Vérifier que le numéro est au format international
      if (!phone.startsWith('+')) {
        showError('Le numéro de téléphone doit être au format international (commençant par +)');
        return;
      }
      
      // Encoder le numéro de téléphone pour l'URL
      const encodedPhone = encodeURIComponent(phone);
      
      // Construire l'URL de l'API Twilio Lookup
      const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodedPhone}?Fields=line_type_intelligence,caller_name`;
      
      // Créer les en-têtes d'authentification
      const auth = btoa(`${twilioAccountSid}:${twilioApiKey}`);
      
      // Faire la requête à l'API Twilio
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Vérifier si la requête a réussi
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API Twilio (${response.status}): ${errorText}`);
      }
      
      // Récupérer les données
      const data = await response.json();
      
      // Créer l'objet de résultats
      const resultData = {
        type: 'twilio',
        data: data,
        phone: phone,
        timestamp: new Date().toISOString()
      };
      
      // Mettre à jour les résultats
      setResults(resultData);
      
      // Ajouter à l'historique
      const updatedHistory = [resultData, ...searchHistory].slice(0, 20); // Limiter à 20 entrées
      setSearchHistory(updatedHistory);
      localStorage.setItem('phoneSearchHistory', JSON.stringify(updatedHistory));
      
      // Afficher un message de succès
      showSuccess(`Recherche Twilio effectuée avec succès pour ${phone}`);
      
      // Afficher des informations supplémentaires
      if (data.valid) {
        showInfo(`Le numéro ${phone} est valide (${data.line_type_intelligence?.type || 'type inconnu'})`);
      } else {
        showInfo(`Le numéro ${phone} n'est pas valide`);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche avec Twilio:', error);
      showError(`Erreur lors de la recherche avec Twilio: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Recherche avec NumVerify
  const searchWithNumVerify = async () => {
    try {
      // Vérifier que le numéro est au format international
      if (!phone.startsWith('+')) {
        showError('Le numéro de téléphone doit être au format international (commençant par +)');
        return;
      }
      
      // Enlever le + pour NumVerify
      const cleanPhone = phone.substring(1);
      
      // Construire l'URL de l'API NumVerify
      const url = `https://apilayer.net/api/validate?access_key=${numverifyApiKey}&number=${cleanPhone}`;
      
      // Faire la requête à l'API NumVerify
      const response = await fetch(url);
      
      // Vérifier si la requête a réussi
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API NumVerify (${response.status}): ${errorText}`);
      }
      
      // Récupérer les données
      const data = await response.json();
      
      // Vérifier si l'API a renvoyé une erreur
      if (!data.success && data.error) {
        throw new Error(`Erreur API NumVerify: ${data.error.info || JSON.stringify(data.error)}`);
      }
      
      // Créer l'objet de résultats
      const resultData = {
        type: 'numverify',
        data: data,
        phone: phone,
        timestamp: new Date().toISOString()
      };
      
      // Mettre à jour les résultats
      setResults(resultData);
      
      // Ajouter à l'historique
      const updatedHistory = [resultData, ...searchHistory].slice(0, 20); // Limiter à 20 entrées
      setSearchHistory(updatedHistory);
      localStorage.setItem('phoneSearchHistory', JSON.stringify(updatedHistory));
      
      // Afficher un message de succès
      showSuccess(`Recherche NumVerify effectuée avec succès pour ${phone}`);
      
      // Afficher des informations supplémentaires
      if (data.valid) {
        showInfo(`Le numéro ${phone} est valide (${data.carrier || 'opérateur inconnu'}, ${data.location || 'localisation inconnue'})`);
      } else {
        showInfo(`Le numéro ${phone} n'est pas valide`);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche avec NumVerify:', error);
      showError(`Erreur lors de la recherche avec NumVerify: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Fonction pour formater la date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Exporter les résultats en HTML
  const exportToHtml = () => {
    if (!results) {
      showError('Aucun résultat à exporter');
      return;
    }

    setExportLoading(true);

    try {
      let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Résultats OSINT pour ${phone}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #4f46e5; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Résultats OSINT pour ${phone}</h1>
          <p>Date de recherche: ${new Date().toLocaleString()}</p>
          <p>Type de recherche: ${results.type === 'leakcheck' ? 'LeakCheck' : results.type === 'twilio' ? 'Twilio Lookup' : 'NumVerify'}</p>
      `;

      if (results.type === 'leakcheck') {
        // Format pour LeakCheck
        htmlContent += `
          <h2>Résultats LeakCheck ${results.is_public_api ? '(API Publique)' : ''}</h2>
          <p>Nombre de fuites trouvées: ${results.data.length}</p>
          
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Date de la fuite</th>
                ${!results.is_public_api ? '<th>Mot de passe</th>' : ''}
                ${!results.is_public_api ? '<th>Ligne</th>' : ''}
              </tr>
            </thead>
            <tbody>
        `;

        results.data.forEach(breach => {
          htmlContent += `
            <tr>
              <td>${breach.sources || 'N/A'}</td>
              <td>${formatDate(breach.last_breach)}</td>
              ${!results.is_public_api ? `<td>${breach.password || 'N/A'}</td>` : ''}
              ${!results.is_public_api ? `<td>${breach.line || 'N/A'}</td>` : ''}
            </tr>
          `;
        });

        htmlContent += `
            </tbody>
          </table>
        `;
      } else if (results.type === 'twilio') {
        // Format pour Twilio
        const data = results.data;
        
        htmlContent += `
          <h2>Résultats Twilio Lookup</h2>
          
          <h3>Informations générales</h3>
          <table>
            <tr><th>Numéro</th><td>${data.phone_number || 'N/A'}</td></tr>
            <tr><th>Format national</th><td>${data.national_format || 'N/A'}</td></tr>
            <tr><th>Pays</th><td>${data.country_code || 'N/A'}</td></tr>
            <tr><th>Valide</th><td>${data.valid ? 'Oui' : 'Non'}</td></tr>
          </table>
        `;
        
        if (data.line_type_intelligence) {
          htmlContent += `
            <h3>Type de ligne</h3>
            <table>
              <tr><th>Type</th><td>${data.line_type_intelligence.type || 'N/A'}</td></tr>
              <tr><th>Opérateur</th><td>${data.line_type_intelligence.carrier_name || 'N/A'}</td></tr>
              <tr><th>Code pays mobile</th><td>${data.line_type_intelligence.mobile_country_code || 'N/A'}</td></tr>
              <tr><th>Code réseau mobile</th><td>${data.line_type_intelligence.mobile_network_code || 'N/A'}</td></tr>
            </table>
          `;
        }
        
        if (data.caller_name) {
          htmlContent += `
            <h3>Informations sur l'appelant</h3>
            <table>
              <tr><th>Nom</th><td>${data.caller_name.caller_name || 'N/A'}</td></tr>
              <tr><th>Type</th><td>${data.caller_name.caller_type || 'N/A'}</td></tr>
            </table>
          `;
        }
      } else if (results.type === 'numverify') {
        // Format pour NumVerify
        const data = results.data;
        
        htmlContent += `
          <h2>Résultats NumVerify</h2>
          
          <h3>Informations générales</h3>
          <table>
            <tr><th>Numéro</th><td>${data.number || 'N/A'}</td></tr>
            <tr><th>Valide</th><td>${data.valid ? 'Oui' : 'Non'}</td></tr>
          </table>
        `;
        
        if (data.carrier) {
          htmlContent += `
            <h3>Informations sur le numéro</h3>
            <table>
              <tr><th>Opérateur</th><td>${data.carrier || 'Inconnu'}</td></tr>
              <tr><th>Localisation</th><td>${data.location || 'Inconnue'}</td></tr>
            </table>
          `;
        }
      }

      htmlContent += `
          <div class="footer">
            <p>Généré par HakBoard - ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Créer un blob et télécharger
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osint_phone_${phone}_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess('Export HTML réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export HTML:', error);
      showError(`Erreur lors de l'export HTML: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Exporter les résultats en TXT
  const exportToTxt = () => {
    if (!results) {
      showError('Aucun résultat à exporter');
      return;
    }

    setExportLoading(true);

    try {
      let txtContent = `RÉSULTATS OSINT POUR ${phone}\n`;
      txtContent += `Date de recherche: ${new Date().toLocaleString()}\n`;
      txtContent += `Type de recherche: ${results.type === 'leakcheck' ? 'LeakCheck' : results.type === 'twilio' ? 'Twilio Lookup' : 'NumVerify'}\n\n`;

      if (results.type === 'leakcheck') {
        // Format pour LeakCheck
        txtContent += `RÉSULTATS LEAKCHECK ${results.is_public_api ? '(API PUBLIQUE)' : ''}\n`;
        txtContent += `Nombre de fuites trouvées: ${results.data.length}\n\n`;

        results.data.forEach((breach, index) => {
          txtContent += `[Fuite ${index + 1}]\n`;
          txtContent += `Source: ${breach.sources || 'N/A'}\n`;
          txtContent += `Date de la fuite: ${formatDate(breach.last_breach)}\n`;
          
          if (!results.is_public_api) {
            txtContent += `Mot de passe: ${breach.password || 'N/A'}\n`;
            txtContent += `Ligne: ${breach.line || 'N/A'}\n`;
          }
          
          txtContent += '\n';
        });
      } else if (results.type === 'twilio') {
        // Format pour Twilio
        const data = results.data;
        
        txtContent += 'RÉSULTATS TWILIO LOOKUP\n\n';
        
        txtContent += 'INFORMATIONS GÉNÉRALES\n';
        txtContent += `Numéro: ${data.phone_number || 'N/A'}\n`;
        txtContent += `Format national: ${data.national_format || 'N/A'}\n`;
        txtContent += `Pays: ${data.country_code || 'N/A'}\n`;
        txtContent += `Valide: ${data.valid ? 'Oui' : 'Non'}\n\n`;
        
        if (data.line_type_intelligence) {
          txtContent += 'TYPE DE LIGNE\n';
          txtContent += `Type: ${data.line_type_intelligence.type || 'N/A'}\n`;
          txtContent += `Opérateur: ${data.line_type_intelligence.carrier_name || 'N/A'}\n`;
          txtContent += `Code pays mobile: ${data.line_type_intelligence.mobile_country_code || 'N/A'}\n`;
          txtContent += `Code réseau mobile: ${data.line_type_intelligence.mobile_network_code || 'N/A'}\n\n`;
        }
        
        if (data.caller_name) {
          txtContent += 'INFORMATIONS SUR L\'APPELANT\n';
          txtContent += `Nom: ${data.caller_name.caller_name || 'N/A'}\n`;
          txtContent += `Type: ${data.caller_name.caller_type || 'N/A'}\n\n`;
        }
      } else if (results.type === 'numverify') {
        // Format pour NumVerify
        const data = results.data;
        
        txtContent += 'RÉSULTATS NUMVERIFY\n\n';
        
        txtContent += 'INFORMATIONS GÉNÉRALES\n';
        txtContent += `Numéro: ${data.number || 'N/A'}\n`;
        txtContent += `Valide: ${data.valid ? 'Oui' : 'Non'}\n\n`;
        
        if (data.carrier) {
          txtContent += 'INFORMATIONS SUR LE NUMÉRO\n';
          txtContent += `Opérateur: ${data.carrier || 'Inconnu'}\n`;
          txtContent += `Localisation: ${data.location || 'Inconnue'}\n\n`;
        }
      }

      txtContent += `Généré par HakBoard - ${new Date().toLocaleString()}`;

      // Créer un blob et télécharger
      const blob = new Blob([txtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osint_phone_${phone}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess('Export TXT réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export TXT:', error);
      showError(`Erreur lors de l'export TXT: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Exporter les résultats en PDF
  const exportToPdf = async () => {
    if (!results) {
      showError('Aucun résultat à exporter');
      return;
    }

    setExportLoading(true);

    try {
      // Vérifier si jsPDF est déjà chargé
      if (typeof window.jspdf === 'undefined') {
        // Charger jsPDF dynamiquement
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        // Charger jspdf-autotable
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      // Créer un nouveau document PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Ajouter le titre
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 153);
      doc.text(`Résultats OSINT pour ${phone}`, 14, 20);
      
      // Ajouter les informations générales
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Date de recherche: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Type de recherche: ${results.type === 'leakcheck' ? 'LeakCheck' : results.type === 'twilio' ? 'Twilio Lookup' : 'NumVerify'}`, 14, 37);
      
      if (results.type === 'leakcheck') {
        // Format pour LeakCheck
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text(`Résultats LeakCheck ${results.is_public_api ? '(API Publique)' : ''}`, 14, 47);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Nombre de fuites trouvées: ${results.data.length}`, 14, 55);
        
        if (results.data.length > 0) {
          // Créer un tableau pour les données
          const tableColumn = results.is_public_api 
            ? ['Source', 'Date de la fuite'] 
            : ['Source', 'Date de la fuite', 'Mot de passe', 'Ligne'];
          
          const tableRows = results.data.map(breach => {
            return results.is_public_api
              ? [breach.sources || 'N/A', formatDate(breach.last_breach)]
              : [
                  breach.sources || 'N/A', 
                  formatDate(breach.last_breach), 
                  breach.password || 'N/A', 
                  breach.line || 'N/A'
                ];
          });
          
          // Générer le tableau
          doc.autoTable({
            startY: 65,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }
          });
        }
      } else if (results.type === 'twilio') {
        // Format pour Twilio
        const data = results.data;
        
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text('Résultats Twilio Lookup', 14, 47);
        
        // Informations générales
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Informations générales', 14, 55);
        
        const generalInfo = [
          ['Numéro', data.phone_number || 'N/A'],
          ['Format national', data.national_format || 'N/A'],
          ['Pays', data.country_code || 'N/A'],
          ['Valide', data.valid ? 'Oui' : 'Non']
        ];
        
        doc.autoTable({
          startY: 60,
          body: generalInfo,
          theme: 'plain',
          styles: { cellPadding: 1 }
        });
        
        let yPos = doc.lastAutoTable.finalY + 10;
        
        // Type de ligne
        if (data.line_type_intelligence) {
          doc.setFontSize(12);
          doc.text('Type de ligne', 14, yPos);
          
          const lineTypeInfo = [
            ['Type', data.line_type_intelligence.type || 'N/A'],
            ['Opérateur', data.line_type_intelligence.carrier_name || 'N/A'],
            ['Code pays mobile', data.line_type_intelligence.mobile_country_code || 'N/A'],
            ['Code réseau mobile', data.line_type_intelligence.mobile_network_code || 'N/A']
          ];
          
          doc.autoTable({
            startY: yPos + 5,
            body: lineTypeInfo,
            theme: 'plain',
            styles: { cellPadding: 1 }
          });
          
          yPos = doc.lastAutoTable.finalY + 10;
        }
        
        // Informations sur l'appelant
        if (data.caller_name) {
          doc.setFontSize(12);
          doc.text('Informations sur l\'appelant', 14, yPos);
          
          const callerInfo = [
            ['Nom', data.caller_name.caller_name || 'N/A'],
            ['Type', data.caller_name.caller_type || 'N/A']
          ];
          
          doc.autoTable({
            startY: yPos + 5,
            body: callerInfo,
            theme: 'plain',
            styles: { cellPadding: 1 }
          });
        }
      } else if (results.type === 'numverify') {
        // Format pour NumVerify
        const data = results.data;
        
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text('Résultats NumVerify', 14, 47);
        
        // Informations générales
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Informations générales', 14, 55);
        
        const generalInfo = [
          ['Numéro', data.number || 'N/A'],
          ['Valide', data.valid ? 'Oui' : 'Non']
        ];
        
        doc.autoTable({
          startY: 60,
          body: generalInfo,
          theme: 'plain',
          styles: { cellPadding: 1 }
        });
        
        let yPos = doc.lastAutoTable.finalY + 10;
        
        // Informations supplémentaires
        if (data.carrier) {
          doc.setFontSize(12);
          doc.text('Informations supplémentaires', 14, yPos);
          
          const additionalInfo = [
            ['Opérateur', data.carrier || 'Inconnu'],
            ['Localisation', data.location || 'Inconnue']
          ];
          
          doc.autoTable({
            startY: yPos + 5,
            body: additionalInfo,
            theme: 'plain',
            styles: { cellPadding: 1 }
          });
        }
      }
      
      // Ajouter un pied de page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Généré par HakBoard - ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
        doc.text(`Page ${i} sur ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      }
      
      // Télécharger le PDF
      doc.save(`osint_phone_${phone}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      showSuccess('Export PDF réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      showError(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">OSINT Téléphone</h2>
      
      {/* Section de recherche */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Numéro de téléphone (format international: +33612345678)"
            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          
          <div className="flex gap-2">
            <select 
              value={searchType} 
              onChange={(e) => setSearchType(e.target.value)}
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="leakcheck">LeakCheck</option>
              <option value="twilio">Twilio Lookup</option>
              <option value="numverify">NumVerify</option>
            </select>
            
            <button
              onClick={searchPhone}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center dark:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              {loading ? (
                <span className="animate-spin mr-2">⟳</span>
              ) : (
                <FiSearch className="mr-2" />
              )}
              Rechercher
            </button>
          </div>
        </div>
        
        {/* Informations sur les types de recherche */}
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-start">
          <FiInfo className="mr-1 mt-0.5 flex-shrink-0" />
          <span>
            <strong>LeakCheck:</strong> Recherche le numéro dans les bases de données de fuites.
            <br />
            <strong>Twilio Lookup:</strong> Obtient des informations détaillées sur le numéro (opérateur, type de ligne, etc.).
            <br />
            <strong>NumVerify:</strong> Vérifie la validité du numéro et obtient des informations supplémentaires.
          </span>
        </div>
      </div>
      
      {/* Section des résultats */}
      {results && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Résultats pour {phone}
            </h3>
            
            {/* Boutons d'exportation */}
            <div className="flex gap-2">
              <button
                onClick={exportToHtml}
                disabled={exportLoading}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center text-sm dark:bg-blue-700 dark:hover:bg-blue-800"
                title="Exporter en HTML"
              >
                <FiFileText className="mr-1" />
                HTML
              </button>
              <button
                onClick={exportToTxt}
                disabled={exportLoading}
                className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 flex items-center text-sm dark:bg-gray-700 dark:hover:bg-gray-800"
                title="Exporter en TXT"
              >
                <FiFile className="mr-1" />
                TXT
              </button>
              <button
                onClick={exportToPdf}
                disabled={exportLoading}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center text-sm dark:bg-red-700 dark:hover:bg-red-800"
                title="Exporter en PDF"
              >
                <FiDownload className="mr-1" />
                PDF
              </button>
            </div>
          </div>
          
          {/* Contenu des résultats */}
          {results.type === 'leakcheck' && (
            <div>
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Résultats LeakCheck {results.is_public_api && '(API Publique)'}</h4>
                {results.data.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">Aucune fuite trouvée pour ce numéro.</p>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">Nombre de fuites trouvées: {results.data.length}</p>
                )}
              </div>
              
              {results.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white dark:bg-gray-700 border dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Source</th>
                        <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Date de la fuite</th>
                        {!results.is_public_api && <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Mot de passe</th>}
                        {!results.is_public_api && <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Ligne</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {results.data.map((breach, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-600' : 'dark:bg-gray-700'}>
                          <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">{breach.sources || 'N/A'}</td>
                          <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">{formatDate(breach.last_breach)}</td>
                          {!results.is_public_api && <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">{breach.password || 'N/A'}</td>}
                          {!results.is_public_api && <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">{breach.line || 'N/A'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {results.type === 'twilio' && (
            <div>
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Résultats Twilio Lookup</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Informations générales */}
                <div className="border dark:border-gray-600 rounded p-4">
                  <h5 className="font-semibold mb-2 text-gray-900 dark:text-white">Informations générales</h5>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1 font-medium text-gray-900 dark:text-white">Numéro:</td>
                        <td className="text-gray-900 dark:text-white">{results.data.phone_number || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-gray-900 dark:text-white">Format national:</td>
                        <td className="text-gray-900 dark:text-white">{results.data.national_format || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-gray-900 dark:text-white">Pays:</td>
                        <td className="text-gray-900 dark:text-white">{results.data.country_code || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-gray-900 dark:text-white">Valide:</td>
                        <td className="text-gray-900 dark:text-white">{results.data.valid ? 'Oui' : 'Non'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Type de ligne */}
                {results.data.line_type_intelligence && (
                  <div className="border dark:border-gray-600 rounded p-4">
                    <h5 className="font-semibold mb-2 text-gray-900 dark:text-white">Type de ligne</h5>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Type:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.line_type_intelligence.type || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Opérateur:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.line_type_intelligence.carrier_name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Code pays mobile:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.line_type_intelligence.mobile_country_code || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Code réseau mobile:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.line_type_intelligence.mobile_network_code || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Informations sur l'appelant */}
                {results.data.caller_name && (
                  <div className="border dark:border-gray-600 rounded p-4">
                    <h5 className="font-semibold mb-2 text-gray-900 dark:text-white">Informations sur l'appelant</h5>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Nom:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.caller_name.caller_name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Type:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.caller_name.caller_type || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {results.type === 'numverify' && (
            <div>
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Résultats NumVerify</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Informations générales */}
                <div className="border dark:border-gray-600 rounded p-4">
                  <h5 className="font-semibold mb-2 text-gray-900 dark:text-white">Informations générales</h5>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1 font-medium text-gray-900 dark:text-white">Numéro:</td>
                        <td className="text-gray-900 dark:text-white">{results.data.number || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-gray-900 dark:text-white">Valide:</td>
                        <td className="text-gray-900 dark:text-white">{results.data.valid ? 'Oui' : 'Non'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Informations supplémentaires */}
                {results.data.carrier && (
                  <div className="border dark:border-gray-600 rounded p-4">
                    <h5 className="font-semibold mb-2 text-gray-900 dark:text-white">Informations supplémentaires</h5>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Opérateur:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.carrier || 'Inconnu'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium text-gray-900 dark:text-white">Localisation:</td>
                          <td className="text-gray-900 dark:text-white">{results.data.location || 'Inconnue'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Section de configuration API */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Configuration des API</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Clé API LeakCheck
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="Entrez votre clé API LeakCheck"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Clé API Twilio
            </label>
            <input
              type="password"
              value={twilioApiKey}
              onChange={(e) => setTwilioApiKey(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="Entrez votre clé API Twilio"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              SID du compte Twilio
            </label>
            <input
              type="password"
              value={twilioAccountSid}
              onChange={(e) => setTwilioAccountSid(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="Entrez votre SID de compte Twilio"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Clé API NumVerify
            </label>
            <input
              type="password"
              value={numverifyApiKey}
              onChange={(e) => setNumverifyApiKey(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="Entrez votre clé API NumVerify"
            />
          </div>
        </div>
        
        <button
          onClick={saveApiKeys}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md dark:bg-indigo-700 dark:hover:bg-indigo-800"
        >
          Sauvegarder les clés API
        </button>
      </div>
      
      {/* Historique des recherches */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Historique des recherches</h3>
        
        {searchHistory.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <FiInfo className="mx-auto mb-2" size={24} />
            <p>Aucune recherche dans l'historique</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-700 border dark:border-gray-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Numéro</th>
                  <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Type</th>
                  <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Date</th>
                  <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Résultats</th>
                  <th className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {searchHistory.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-600' : 'dark:bg-gray-700'}>
                    <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">{item.phone}</td>
                    <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">
                      {item.type === 'leakcheck' ? 'LeakCheck' : item.type === 'twilio' ? 'Twilio Lookup' : 'NumVerify'}
                    </td>
                    <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 border dark:border-gray-600 text-gray-900 dark:text-white">
                      {item.type === 'leakcheck' 
                        ? `${item.data.length} fuite(s)` 
                        : item.type === 'twilio' 
                          ? (item.data.valid ? 'Valide' : 'Invalide')
                          : (item.data.valid ? 'Valide' : 'Invalide')}
                    </td>
                    <td className="py-2 px-4 border dark:border-gray-600">
                      <button
                        onClick={() => {
                          setPhone(item.phone);
                          setSearchType(item.type);
                          setResults(item);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Afficher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {searchHistory.length > 0 && (
          <div className="mt-4 text-right">
            <button
              onClick={() => {
                if (window.confirm('Êtes-vous sûr de vouloir effacer tout l\'historique de recherche ?')) {
                  setSearchHistory([]);
                  localStorage.removeItem('phoneSearchHistory');
                  showInfo('Historique de recherche effacé');
                }
              }}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              Effacer l'historique
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneOsint;
