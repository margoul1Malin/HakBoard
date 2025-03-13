import React, { useState, useEffect } from 'react';
import { FiSend, FiSettings, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Smooding = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [loading, setLoading] = useState(false);
  const [twilioApiKey, setTwilioApiKey] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioPhoneNumbers, setTwilioPhoneNumbers] = useState([]);
  const [newTwilioNumber, setNewTwilioNumber] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [message, setMessage] = useState('');
  const [frequency, setFrequency] = useState(1);
  const [totalMessages, setTotalMessages] = useState(10);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  // Charger les clés API et les numéros au démarrage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Charger les clés API depuis le stockage local
        const twilioKey = localStorage.getItem('twilio_api_key') || '';
        const twilioSid = localStorage.getItem('twilio_account_sid') || '';
        const twilioNumbers = JSON.parse(localStorage.getItem('twilio_phone_numbers')) || [];
        
        setTwilioApiKey(twilioKey);
        setTwilioAccountSid(twilioSid);
        setTwilioPhoneNumbers(twilioNumbers);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };
    
    loadSavedData();
  }, []);

  // Sauvegarder les clés API
  const saveApiKeys = () => {
    try {
      localStorage.setItem('twilio_api_key', twilioApiKey);
      localStorage.setItem('twilio_account_sid', twilioAccountSid);
      showSuccess('Paramètres Twilio sauvegardés avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres Twilio:', error);
      showError('Erreur lors de la sauvegarde des paramètres Twilio');
    }
  };

  // Ajouter un numéro Twilio
  const addTwilioNumber = () => {
    if (!newTwilioNumber) {
      showError('Veuillez entrer un numéro de téléphone');
      return;
    }
    
    // Vérifier si le numéro est déjà dans la liste
    if (twilioPhoneNumbers.includes(newTwilioNumber)) {
      showError('Ce numéro est déjà dans la liste');
      return;
    }
    
    const updatedNumbers = [...twilioPhoneNumbers, newTwilioNumber];
    setTwilioPhoneNumbers(updatedNumbers);
    localStorage.setItem('twilio_phone_numbers', JSON.stringify(updatedNumbers));
    setNewTwilioNumber('');
    showSuccess('Numéro ajouté avec succès');
  };

  // Supprimer un numéro Twilio
  const removeTwilioNumber = (index) => {
    const updatedNumbers = [...twilioPhoneNumbers];
    updatedNumbers.splice(index, 1);
    setTwilioPhoneNumbers(updatedNumbers);
    localStorage.setItem('twilio_phone_numbers', JSON.stringify(updatedNumbers));
    showSuccess('Numéro supprimé avec succès');
  };

  // Ajouter un log
  const addLog = (message, type = 'info') => {
    const newLog = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString(),
    };
    setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100)); // Limiter à 100 logs
  };

  // Démarrer le flooding
  const startFlooding = async () => {
    // Vérifier les paramètres
    if (!twilioApiKey || !twilioAccountSid) {
      showError('Veuillez configurer vos paramètres Twilio');
      return;
    }

    if (twilioPhoneNumbers.length === 0) {
      showError('Veuillez ajouter au moins un numéro de téléphone Twilio');
      return;
    }

    if (!targetPhone) {
      showError('Veuillez entrer un numéro de téléphone cible');
      return;
    }

    if (!message) {
      showError('Veuillez entrer un message');
      return;
    }

    if (frequency <= 0) {
      showError('La fréquence doit être supérieure à 0');
      return;
    }

    if (totalMessages <= 0) {
      showError('Le nombre total de messages doit être supérieur à 0');
      return;
    }

    setIsRunning(true);
    setLoading(true);
    setProgress(0);
    
    addLog(`Démarrage du flooding vers ${targetPhone}`, 'info');
    showInfo(`Démarrage du flooding: ${totalMessages} messages à envoyer`);

    try {
      // Simuler l'envoi de messages
      for (let i = 0; i < totalMessages; i++) {
        if (!isRunning) {
          addLog('Flooding interrompu par l\'utilisateur', 'warning');
          break;
        }

        // Sélectionner un numéro Twilio aléatoire
        const randomIndex = Math.floor(Math.random() * twilioPhoneNumbers.length);
        const fromNumber = twilioPhoneNumbers[randomIndex];
        
        // Simuler l'envoi d'un message
        await new Promise(resolve => setTimeout(resolve, 1000 / frequency));
        
        // Mettre à jour la progression
        const newProgress = Math.round(((i + 1) / totalMessages) * 100);
        setProgress(newProgress);
        
        addLog(`Message ${i + 1}/${totalMessages} envoyé depuis ${fromNumber}`, 'success');
      }
      
      if (isRunning) {
        addLog('Flooding terminé avec succès', 'success');
        showSuccess('Flooding terminé avec succès');
      }
    } catch (error) {
      console.error('Erreur lors du flooding:', error);
      addLog(`Erreur: ${error.message || 'Erreur inconnue'}`, 'error');
      showError(`Erreur lors du flooding: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsRunning(false);
      setLoading(false);
    }
  };

  // Arrêter le flooding
  const stopFlooding = () => {
    setIsRunning(false);
    showInfo('Arrêt du flooding en cours...');
  };

  return (
    <div className="smooding">
      <h1 className="text-2xl font-bold mb-6">SMS Flooding (Smooding)</h1>
      
      {/* Section de configuration Twilio */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuration Twilio</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Clé API Twilio
            </label>
            <input
              type="password"
              value={twilioApiKey}
              onChange={(e) => setTwilioApiKey(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Entrez votre SID de compte Twilio"
            />
          </div>
        </div>
        
        <button
          onClick={saveApiKeys}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FiSettings className="mr-2" />
          Sauvegarder les paramètres
        </button>
      </div>
      
      {/* Section des numéros Twilio */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Numéros de téléphone Twilio</h2>
        
        <div className="mb-4">
          <div className="flex">
            <input
              type="text"
              value={newTwilioNumber}
              onChange={(e) => setNewTwilioNumber(e.target.value)}
              className="flex-1 p-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ex: +33612345678"
            />
            <button
              onClick={addTwilioNumber}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-md"
            >
              Ajouter
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Format: +33612345678 (avec l'indicatif du pays)
          </p>
        </div>
        
        {twilioPhoneNumbers.length > 0 ? (
          <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {twilioPhoneNumbers.map((phone, index) => (
                <li key={index} className="py-2 flex justify-between items-center">
                  <span>{phone}</span>
                  <button
                    onClick={() => removeTwilioNumber(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border rounded-md p-4 text-center text-gray-500">
            Aucun numéro Twilio ajouté
          </div>
        )}
      </div>
      
      {/* Section de configuration du flooding */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuration du flooding</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Numéro de téléphone cible
            </label>
            <input
              type="text"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ex: +33612345678"
              disabled={isRunning}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Message à envoyer
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Entrez le message à envoyer"
              disabled={isRunning}
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Fréquence (messages par seconde)
            </label>
            <input
              type="number"
              value={frequency}
              onChange={(e) => setFrequency(Math.max(0.1, parseFloat(e.target.value)))}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              min="0.1"
              step="0.1"
              disabled={isRunning}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Nombre total de messages
            </label>
            <input
              type="number"
              value={totalMessages}
              onChange={(e) => setTotalMessages(Math.max(1, parseInt(e.target.value)))}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiSend className="mr-2" />
              Démarrer le flooding
            </button>
          ) : (
            <button
              onClick={stopFlooding}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Arrêter le flooding
            </button>
          )}
        </div>
        
        {isRunning && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1 text-center">
              Progression: {progress}% ({Math.round((progress / 100) * totalMessages)}/{totalMessages} messages)
            </p>
          </div>
        )}
      </div>
      
      {/* Section des logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Logs</h2>
        
        {logs.length > 0 ? (
          <div className="border rounded-md p-2 max-h-[300px] overflow-y-auto">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <li key={log.id} className="py-2">
                  <div className="flex items-start">
                    {log.type === 'error' && <FiAlertCircle className="text-red-500 mr-2 mt-1" />}
                    {log.type === 'warning' && <FiInfo className="text-yellow-500 mr-2 mt-1" />}
                    {log.type === 'success' && <FiInfo className="text-green-500 mr-2 mt-1" />}
                    {log.type === 'info' && <FiInfo className="text-blue-500 mr-2 mt-1" />}
                    <div>
                      <p className={`
                        ${log.type === 'error' ? 'text-red-500' : ''}
                        ${log.type === 'warning' ? 'text-yellow-500' : ''}
                        ${log.type === 'success' ? 'text-green-500' : ''}
                        ${log.type === 'info' ? 'text-blue-500' : ''}
                      `}>
                        {log.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border rounded-md p-4 text-center text-gray-500">
            Aucun log disponible
          </div>
        )}
      </div>
      
      {/* Avertissement */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <FiAlertCircle className="text-yellow-500 mr-2" size={24} />
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
