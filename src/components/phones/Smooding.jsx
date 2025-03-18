import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiSettings, FiInfo, FiAlertCircle, FiCheck, FiTrash2, FiUpload, FiRefreshCw } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';
import * as twilioSmoodingService from '../../services/twilioSmoodingService';
import { apiKeysService } from '../../services/apiKeysService';

const Smooding = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioNumbers, setTwilioNumbers] = useState([]);
  const [newTwilioNumber, setNewTwilioNumber] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [message, setMessage] = useState('');
  const [frequency, setFrequency] = useState(1);
  const [totalMessages, setTotalMessages] = useState(10);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isTrialAccount, setIsTrialAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [floodingResults, setFloodingResults] = useState(null);
  const fileInputRef = useRef(null);
  const [sentCount, setSentCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [elapsedTimeInterval, setElapsedTimeInterval] = useState(null);
  const [floodingInterval, setFloodingInterval] = useState(null);

  // Charger les clés API et les numéros au démarrage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        console.log('[Smooding] Chargement des données sauvegardées');
        
        // Charger les clés API via apiKeysService
        const twilioToken = await apiKeysService.getKey('twilioAuthToken') || '';
        const twilioSid = await apiKeysService.getKey('twilioSid') || '';
        
        console.log('[Smooding] Clés API chargées:', 
          `Token: ${twilioToken ? 'Oui' : 'Non'}, ` +
          `SID: ${twilioSid ? 'Oui' : 'Non'}`);
        
        setTwilioAuthToken(twilioToken);
        setTwilioAccountSid(twilioSid);
        
        // Charger les numéros Twilio depuis electron-store ou localStorage
        let numbers = [];
        
        if (window.electronAPI && window.electronAPI.getStoreValue) {
          numbers = await window.electronAPI.getStoreValue('twilio_phone_numbers') || [];
        } else {
          numbers = JSON.parse(localStorage.getItem('twilio_phone_numbers')) || [];
        }
        
        setTwilioNumbers(numbers);
        console.log('[Smooding] Numéros chargés:', numbers.length);
        
        // Vérifier le statut du compte si les identifiants sont disponibles
        if (twilioSid && twilioToken) {
          checkAccountStatus(twilioSid, twilioToken);
        }
      } catch (error) {
        console.error('[Smooding] Erreur lors du chargement des données:', error);
        addLog(`Erreur lors du chargement des données: ${error.message}`, 'error');
      }
    };
    
    loadSavedData();
  }, []);

  // Sauvegarder les clés API
  const saveApiKeys = async () => {
    try {
      console.log('[Smooding] Sauvegarde des clés API');
      
      // Utiliser apiKeysService pour sauvegarder les clés
      const tokenSaved = await apiKeysService.saveKey('twilioAuthToken', twilioAuthToken);
      const sidSaved = await apiKeysService.saveKey('twilioSid', twilioAccountSid);
      
      console.log('[Smooding] Clés API sauvegardées:', 
        `Token: ${tokenSaved ? 'OK' : 'Échec'}, ` +
        `SID: ${sidSaved ? 'OK' : 'Échec'}`);
      
      // Sauvegarder la liste des numéros dans electron-store si disponible
      if (window.electronAPI && window.electronAPI.setStoreValue) {
        await window.electronAPI.setStoreValue('twilio_phone_numbers', twilioNumbers);
      }
      
      // Pour la compatibilité, sauvegarder aussi dans localStorage
      localStorage.setItem('twilio_auth_token', twilioAuthToken);
      localStorage.setItem('twilio_account_sid', twilioAccountSid);
      localStorage.setItem('twilio_phone_numbers', JSON.stringify(twilioNumbers));
      
      if (tokenSaved && sidSaved) {
        showSuccess('Paramètres Twilio sauvegardés avec succès');
      } else {
        showWarning('Certains paramètres Twilio n\'ont pas pu être sauvegardés');
      }
      
      // Vérifier le statut du compte après la sauvegarde
      if (twilioAccountSid && twilioAuthToken) {
        checkAccountStatus(twilioAccountSid, twilioAuthToken);
      }
    } catch (error) {
      console.error('[Smooding] Erreur lors de la sauvegarde des paramètres Twilio:', error);
      showError('Erreur lors de la sauvegarde des paramètres Twilio');
    }
  };

  // Mettre à jour la liste des numéros Twilio
  const updateTwilioNumbers = async (numbers) => {
    try {
      setTwilioNumbers(numbers);
      
      // Sauvegarder dans electron-store si disponible
      if (window.electronAPI && window.electronAPI.setStoreValue) {
        await window.electronAPI.setStoreValue('twilio_phone_numbers', numbers);
      }
      
      // Pour la compatibilité, sauvegarder aussi dans localStorage
      localStorage.setItem('twilio_phone_numbers', JSON.stringify(numbers));
    } catch (error) {
      console.error('[Smooding] Erreur lors de la mise à jour des numéros:', error);
      addLog(`Erreur lors de la mise à jour des numéros: ${error.message}`, 'error');
    }
  };

  // Ajouter un numéro Twilio
  const addTwilioNumber = () => {
    if (!newTwilioNumber) {
      showError('Veuillez entrer un numéro de téléphone');
      return;
    }
    
    // Vérifier le format du numéro
    if (!isValidPhoneNumber(newTwilioNumber)) {
      showError('Format de numéro invalide. Utilisez le format international (ex: +33612345678)');
      return;
    }
    
    // Vérifier si le numéro est déjà dans la liste
    if (twilioNumbers.includes(newTwilioNumber)) {
      showError('Ce numéro est déjà dans la liste');
      return;
    }
    
    // Mettre à jour la liste des numéros
    const updatedNumbers = [...twilioNumbers, { phone: newTwilioNumber, used: 0 }];
    updateTwilioNumbers(updatedNumbers);
    
    setNewTwilioNumber('');
    addLog(`Numéro ajouté: ${newTwilioNumber}`, 'success');
    showSuccess('Numéro ajouté avec succès');
  };

  // Supprimer un numéro Twilio
  const removeTwilioNumber = (index) => {
    const updatedNumbers = [...twilioNumbers];
    updatedNumbers.splice(index, 1);
    updateTwilioNumbers(updatedNumbers);
  };

  // Fonction pour afficher une confirmation
  const showConfirm = (message, onConfirm) => {
    if (window.confirm(message)) {
      onConfirm();
    }
  };

  // Supprimer tous les numéros Twilio
  const removeAllTwilioNumbers = () => {
    updateTwilioNumbers([]);
    addLog({
      type: 'info',
      message: 'Tous les numéros Twilio ont été supprimés'
    });
    showSuccess('Tous les numéros ont été supprimés');
  };

  // Importer des numéros Twilio depuis un fichier
  const importTwilioNumbers = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      let numbers = [];
      
      // Détecter le format du fichier (CSV ou TXT)
      if (file.name.endsWith('.csv')) {
        // Traiter comme CSV
        const lines = content.split('\n');
        lines.forEach(line => {
          const values = line.split(',');
          values.forEach(value => {
            const trimmedValue = value.trim();
            if (trimmedValue && /^\+?[1-9]\d{1,14}$/.test(trimmedValue)) {
              numbers.push(trimmedValue);
            }
          });
        });
      } else {
        // Traiter comme TXT (un numéro par ligne)
        const lines = content.split('\n');
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && /^\+?[1-9]\d{1,14}$/.test(trimmedLine)) {
            numbers.push(trimmedLine);
          }
        });
      }
      
      // Filtrer les doublons et les numéros déjà présents
      const uniqueNumbers = [...new Set(numbers)];
      const newNumbers = uniqueNumbers.filter(num => !twilioNumbers.includes(num));
      
      if (newNumbers.length === 0) {
        showWarning('Aucun nouveau numéro valide trouvé dans le fichier');
        return;
      }
      
      // Ajouter les nouveaux numéros
      const updatedNumbers = [...twilioNumbers, ...newNumbers];
      updateTwilioNumbers(updatedNumbers);
      
      addLog({
        type: 'success',
        message: `${newNumbers.length} numéros Twilio importés avec succès`
      });
      showSuccess(`${newNumbers.length} numéros Twilio importés avec succès`);
    };
    
    reader.readAsText(file);
    // Réinitialiser l'input file pour permettre de sélectionner le même fichier à nouveau
    event.target.value = '';
  };

  // Vérifier si un numéro de téléphone est valide
  const isValidPhoneNumber = (phone) => {
    // Format international: +[code pays][numéro]
    return /^\+[1-9]\d{1,14}$/.test(phone);
  };

  // Ajouter un log
  const addLog = (logData, type = 'info') => {
    let message = '';
    let logType = type;
    
    // Gérer les différents formats de log
    if (typeof logData === 'string') {
      message = logData;
    } else if (typeof logData === 'object') {
      if (logData.message) {
        message = logData.message;
      } else {
        message = JSON.stringify(logData);
      }
      
      if (logData.type) {
        logType = logData.type;
      }
    } else {
      message = String(logData);
    }
    
    const newLog = {
      id: Date.now(),
      message,
      type: logType,
      timestamp: new Date().toISOString(),
    };
    
    setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100)); // Limiter à 100 logs
  };

  // Démarrer le flooding
  const startFlooding = () => {
    if (!targetPhone || !message) {
      showError('Veuillez entrer un numéro de téléphone cible et un message');
      return;
    }

    // Vérifier que les valeurs sont des nombres valides
    const parsedFrequency = parseFloat(frequency) || 1;
    const parsedTotalMessages = parseInt(totalMessages) || 10;
    
    // Mettre à jour les états avec des valeurs valides
    setFrequency(parsedFrequency);
    setTotalMessages(parsedTotalMessages);

    if (twilioNumbers.length === 0) {
      showError('Veuillez ajouter au moins un numéro Twilio');
      return;
    }

    setIsRunning(true);
    setLoading(true);
    setSentCount(0);
    setSuccessCount(0);
    setStartTime(Date.now());
    
    // Initialiser le compteur d'élapsed time
    if (elapsedTimeInterval) clearInterval(elapsedTimeInterval);
    setElapsedTime(0);
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    setElapsedTimeInterval(interval);

    addLog({
      type: 'info',
      message: `Démarrage du flooding vers ${targetPhone} avec ${parsedTotalMessages} messages à une fréquence de ${parsedFrequency} secondes`
    });

    let sent = 0;
    let success = 0;
    const intervalId = setInterval(() => {
      if (sent >= parsedTotalMessages) {
        clearInterval(intervalId);
        clearInterval(elapsedTimeInterval);
        setIsRunning(false);
        setLoading(false);
        addLog({
          type: 'success',
          message: `Flooding terminé. ${success} messages envoyés avec succès sur ${parsedTotalMessages}`
        });
        return;
      }

      const randomTwilioNumber = twilioNumbers[Math.floor(Math.random() * twilioNumbers.length)];
      
      sendSingleSms(randomTwilioNumber, targetPhone, message)
        .then(result => {
          sent++;
          setSentCount(sent);
          
          if (result.success) {
            success++;
            setSuccessCount(success);
            addLog({
              type: 'success',
              message: `Message #${sent} envoyé avec succès depuis ${randomTwilioNumber} vers ${targetPhone}`
            });
          } else {
            addLog({
              type: 'error',
              message: `Échec de l'envoi du message #${sent}: ${result.error}`
            });
          }
        })
        .catch(error => {
          sent++;
          setSentCount(sent);
          addLog({
            type: 'error',
            message: `Erreur lors de l'envoi du message #${sent}: ${error.message}`
          });
        });
    }, parsedFrequency * 1000);

    setFloodingInterval(intervalId);
  };

  // Arrêter le flooding
  const stopFlooding = () => {
    if (floodingInterval) {
      clearInterval(floodingInterval);
      setFloodingInterval(null);
    }
    
    if (elapsedTimeInterval) {
      clearInterval(elapsedTimeInterval);
      setElapsedTimeInterval(null);
    }
    
    setIsRunning(false);
    addLog({
      type: 'warning',
      message: `Flooding arrêté manuellement après ${sentCount} messages envoyés`
    });
    showWarning('Flooding arrêté manuellement');
  };

  // Vérifier le statut du compte Twilio
  const checkAccountStatus = async (accountSid, authToken) => {
    try {
      setTestingConnection(true);
      addLog('Vérification du statut du compte Twilio...', 'info');
      
      const result = await twilioSmoodingService.testConnection({
        accountSid,
        authToken
      });
      
      if (result.success) {
        setAccountStatus(result.accountInfo);
        setIsTrialAccount(result.isTrial);
        
        const accountType = result.isTrial ? 'compte d\'essai' : 'compte complet';
        addLog(`Connexion réussie. Type de compte: ${accountType}`, 'success');
        
        if (result.isTrial) {
          showInfo('Compte Twilio d\'essai détecté. Des limitations s\'appliquent.');
        } else {
          showSuccess('Compte Twilio complet détecté.');
        }
      } else {
        addLog(`Erreur lors de la vérification du compte: ${result.error}`, 'error');
        showError(`Erreur de connexion: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du compte:', error);
      addLog(`Erreur: ${error.message}`, 'error');
      showError(`Erreur: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };
  
  // Tester la connexion à Twilio
  const handleTestConnection = async () => {
    if (!twilioAccountSid || !twilioAuthToken) {
      showError('Veuillez entrer votre Account SID et Auth Token Twilio');
      return;
    }
    
    await checkAccountStatus(twilioAccountSid, twilioAuthToken);
  };
  
  // Envoyer un SMS de test
  const sendTestSms = async () => {
    if (!targetPhone || !message) {
      showError('Veuillez entrer un numéro de téléphone cible et un message');
      return;
    }

    if (twilioNumbers.length === 0) {
      showError('Veuillez ajouter au moins un numéro Twilio');
      return;
    }

    setLoading(true);
    addLog({
      type: 'info',
      message: `Envoi d'un SMS de test vers ${targetPhone}`
    });

    try {
      // Sélectionner un numéro Twilio aléatoire
      const randomTwilioNumber = twilioNumbers[Math.floor(Math.random() * twilioNumbers.length)];
      
      const result = await sendSingleSms(randomTwilioNumber, targetPhone, message);
      
      if (result.success) {
        addLog({
          type: 'success',
          message: `SMS de test envoyé avec succès depuis ${randomTwilioNumber} vers ${targetPhone}`
        });
        showSuccess('SMS de test envoyé avec succès');
      } else {
        addLog({
          type: 'error',
          message: `Échec de l'envoi du SMS de test: ${result.error}`
        });
        showError(`Échec de l'envoi du SMS de test: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS de test:', error);
      addLog({
        type: 'error',
        message: `Erreur lors de l'envoi du SMS de test: ${error.message || 'Erreur inconnue'}`
      });
      showError(`Erreur lors de l'envoi du SMS de test: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Envoyer un seul SMS
  const sendSingleSms = async (from, to, body) => {
    try {
      if (!twilioAccountSid || !twilioAuthToken) {
        return { success: false, error: 'Clés API Twilio non configurées' };
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      
      const formData = new URLSearchParams();
      formData.append('From', from);
      formData.append('To', to);
      formData.append('Body', body);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { 
          success: true, 
          sid: data.sid,
          status: data.status
        };
      } else {
        return { 
          success: false, 
          error: data.message || 'Erreur lors de l\'envoi du SMS' 
        };
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur inconnue' 
      };
    }
  };

  return (
    <div className="smooding">
      <h1 className="text-2xl font-bold mb-6">SMS Flooding (Smooding)</h1>
      
      {/* Section de configuration Twilio */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Configuration Twilio</h2>
        
        {/* Afficher le statut du compte */}
        {accountStatus && (
          <div className={`mb-4 p-3 rounded ${isTrialAccount ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' : 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>
            <div className="flex items-center">
              {isTrialAccount ? (
                <>
                  <FiAlertCircle className="mr-2" />
                  <span>Compte Twilio d'essai détecté - Des limitations s'appliquent</span>
                </>
              ) : (
                <>
                  <FiCheck className="mr-2" />
                  <span>Compte Twilio complet activé</span>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Account SID Twilio
            </label>
            <input
              type="text"
              value={twilioAccountSid}
              onChange={(e) => setTwilioAccountSid(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Auth Token Twilio
            </label>
            <input
              type="password"
              value={twilioAuthToken}
              onChange={(e) => setTwilioAuthToken(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveApiKeys}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={loading || testingConnection}
          >
            <FiSettings className="mr-2" />
            Sauvegarder les paramètres
          </button>
          
          <button
            onClick={handleTestConnection}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={loading || testingConnection || !twilioAccountSid || !twilioAuthToken}
          >
            <FiCheck className="mr-2" />
            {testingConnection ? 'Test en cours...' : 'Tester la connexion'}
          </button>
        </div>
        
        {isTrialAccount && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <FiAlertCircle className="text-yellow-500 mr-2 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Limitations des comptes d'essai Twilio</p>
                <ul className="list-disc pl-5 mt-1 text-yellow-700 dark:text-yellow-300">
                  <li>Vous ne pouvez envoyer des SMS qu'aux numéros vérifiés dans votre compte</li>
                  <li>La longueur des messages est limitée (max 160 caractères)</li>
                  <li>Le nombre de messages est limité</li>
                </ul>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  <a 
                    href="https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-blue-400 underline"
                  >
                    En savoir plus sur les comptes d'essai Twilio
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Section des numéros Twilio */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Numéros de téléphone Twilio</h2>
        
        <div className="mb-4">
          <div className="flex">
            <input
              type="text"
              value={newTwilioNumber}
              onChange={(e) => setNewTwilioNumber(e.target.value)}
              className="flex-1 p-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Ex: +33612345678"
            />
            <button
              onClick={addTwilioNumber}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-md"
              disabled={loading || isRunning}
            >
              Ajouter
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Format: +33612345678 (avec l'indicatif du pays)
          </p>
        </div>
        
        <div className="flex items-center mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={importTwilioNumbers}
            accept=".csv,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={loading || isRunning}
          >
            <FiUpload className="mr-2" />
            Importer des numéros
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            Formats acceptés: CSV, TXT
          </span>
          
          {twilioNumbers.length > 0 && (
            <button
              onClick={() => {
                showConfirm(
                  'Êtes-vous sûr de vouloir supprimer tous les numéros ?',
                  () => {
                    removeAllTwilioNumbers();
                  }
                );
              }}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
              disabled={loading || isRunning}
            >
              <FiTrash2 className="mr-2" />
              Effacer tout
            </button>
          )}
        </div>
        
        {twilioNumbers.length > 0 ? (
          <div className="border dark:border-gray-600 rounded-md p-2 max-h-[200px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium dark:text-white">Liste des numéros</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{twilioNumbers.length} numéro(s)</span>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {twilioNumbers.map((phone, index) => (
                <li key={index} className="py-2 flex justify-between items-center">
                  <span className="dark:text-white">{phone}</span>
                  <button
                    onClick={() => removeTwilioNumber(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    disabled={loading || isRunning}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border dark:border-gray-600 rounded-md p-4 text-center text-gray-500 dark:text-gray-400">
            Aucun numéro Twilio ajouté
          </div>
        )}
      </div>
      
      {/* Section de configuration du flooding */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Configuration du flooding</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Numéro de téléphone cible
            </label>
            <input
              type="text"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Ex: +33612345678"
              disabled={isRunning}
            />
            {isTrialAccount && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                Avec un compte d'essai, vous ne pouvez envoyer des SMS qu'à des numéros vérifiés.
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Message à envoyer
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Entrez le message à envoyer"
              disabled={isRunning}
              rows={3}
            />
            <div className="flex justify-between mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {message.length} caractères
                {isTrialAccount && message.length > 160 && (
                  <span className="text-red-500 dark:text-red-400"> (limite dépassée pour compte d'essai)</span>
                )}
              </span>
              <button
                onClick={() => setMessage('')}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                disabled={isRunning || !message}
              >
                <FiRefreshCw className="inline mr-1" size={14} />
                Effacer
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Fréquence (messages par seconde)
            </label>
            <input
              type="number"
              value={frequency || 1}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setFrequency(isNaN(value) ? 1 : Math.max(0.1, value));
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              min="0.1"
              step="0.1"
              disabled={isRunning}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Délai entre les messages: {((1000 / (parseFloat(frequency) || 1)).toFixed(0))} ms
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Nombre total de messages
            </label>
            <input
              type="number"
              value={totalMessages || 10}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setTotalMessages(isNaN(value) ? 10 : Math.max(1, value));
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              min="1"
              step="1"
              disabled={isRunning}
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          {!isRunning ? (
            <button
              onClick={startFlooding}
              disabled={loading || !twilioAccountSid || !twilioAuthToken || twilioNumbers.length === 0 || !targetPhone || !message}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiSend className="mr-2" />
              Démarrer le flooding
            </button>
          ) : (
            <button
              onClick={stopFlooding}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiAlertCircle className="mr-2" />
              Arrêter le flooding
            </button>
          )}
          
          <button
            onClick={sendTestSms}
            disabled={loading || isRunning || !twilioAccountSid || !twilioAuthToken || twilioNumbers.length === 0 || !targetPhone}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FiSend className="mr-2" />
            Envoyer un SMS de test
          </button>
        </div>
        
        {isRunning && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{ width: `${progress || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
              Progression: {progress || 0}% ({Math.round(((progress || 0) / 100) * (totalMessages || 10))}/{totalMessages || 10} messages)
            </p>
          </div>
        )}
        
        {floodingResults && !isRunning && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-md font-medium mb-2 dark:text-white">Résultats du flooding</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                <span className="dark:text-white">{floodingResults.summary.successCount} message(s) réussi(s)</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                <span className="dark:text-white">{floodingResults.summary.errorCount} message(s) échoué(s)</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Section des statistiques */}
      {isRunning && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Statistiques</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Messages envoyés</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{sentCount}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full" 
                  style={{ width: `${totalMessages > 0 ? (sentCount / totalMessages) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {totalMessages > 0 ? Math.round((sentCount / totalMessages) * 100) : 0}% terminé
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Temps écoulé</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Démarré à {startTime ? new Date(startTime).toLocaleTimeString() : '--:--:--'}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Taux de réussite</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {sentCount > 0 ? Math.round((successCount / sentCount) * 100) : 0}%
              </p>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Réussis</p>
                  <p className="text-sm font-medium text-green-500 dark:text-green-400">{successCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Échoués</p>
                  <p className="text-sm font-medium text-red-500 dark:text-red-400">{sentCount - successCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Restants</p>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{totalMessages - sentCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section des logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold dark:text-white">Logs</h2>
          
          {logs.length > 0 && (
            <button
              onClick={() => {
                showConfirm(
                  'Êtes-vous sûr de vouloir effacer tous les logs ?',
                  () => {
                    setLogs([]);
                    showSuccess('Logs effacés avec succès');
                  }
                );
              }}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center text-sm"
              disabled={loading || isRunning}
            >
              <FiTrash2 className="mr-1" />
              Effacer les logs
            </button>
          )}
        </div>
        
        {logs.length > 0 ? (
          <div className="border dark:border-gray-600 rounded-md p-2 max-h-[300px] overflow-y-auto">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <li key={log.id} className="py-2">
                  <div className="flex items-start">
                    {log.type === 'error' && <FiAlertCircle className="text-red-500 dark:text-red-400 mr-2 mt-1 flex-shrink-0" />}
                    {log.type === 'warning' && <FiInfo className="text-yellow-500 dark:text-yellow-400 mr-2 mt-1 flex-shrink-0" />}
                    {log.type === 'success' && <FiCheck className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />}
                    {log.type === 'info' && <FiInfo className="text-blue-500 dark:text-blue-400 mr-2 mt-1 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className={`
                        ${log.type === 'error' ? 'text-red-500 dark:text-red-400' : ''}
                        ${log.type === 'warning' ? 'text-yellow-500 dark:text-yellow-400' : ''}
                        ${log.type === 'success' ? 'text-green-500 dark:text-green-400' : ''}
                        ${log.type === 'info' ? 'text-blue-500 dark:text-blue-400' : ''}
                        dark:text-white
                      `}>
                        {log.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border dark:border-gray-600 rounded-md p-4 text-center text-gray-500 dark:text-gray-400">
            Aucun log disponible
          </div>
        )}
      </div>
      
      {/* Avertissement */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <FiAlertCircle className="text-yellow-500 dark:text-yellow-400 mr-2 flex-shrink-0" size={24} />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Attention</p>
            <p className="text-yellow-700 dark:text-yellow-300">
              L'utilisation abusive de cette fonctionnalité peut être illégale dans certains pays.
              Utilisez cet outil uniquement à des fins éducatives et de test, et uniquement sur des numéros
              pour lesquels vous avez obtenu l'autorisation explicite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Smooding;
