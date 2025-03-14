import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiSave, FiTrash2, FiCopy, FiInfo, FiUpload, FiFile, FiToggleLeft, FiToggleRight, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';
import { sendSms as twilioSendSms, checkMessageStatus, testTwilioConnection } from '../../services/twilioService';

const Smishing = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
  const [twilioMessagingServiceSid, setTwilioMessagingServiceSid] = useState('');
  const [useMessagingService, setUseMessagingService] = useState(false);
  const [templates, setTemplates] = useState([]);
=======
import React, { useState, useEffect } from 'react';
import { FiSend, FiSave, FiTrash2, FiCopy, FiInfo } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Smishing = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [loading, setLoading] = useState(false);
  const [twilioApiKey, setTwilioApiKey] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState({
    id: null,
    name: '',
    content: '',
  });
  const [recipient, setRecipient] = useState('');
  const [recipients, setRecipients] = useState([]);
<<<<<<< HEAD
  const fileInputRef = useRef(null);
  const [sendHistory, setSendHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const [isTrialAccount, setIsTrialAccount] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  // Charger les clés API, les templates et l'historique au démarrage
=======

  // Charger les clés API et les templates au démarrage
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Charger les clés API depuis le stockage local
<<<<<<< HEAD
        const twilioToken = localStorage.getItem('twilio_auth_token') || '';
        const twilioSid = localStorage.getItem('twilio_account_sid') || '';
        const twilioPhone = localStorage.getItem('twilio_phone_number') || '';
        const twilioMsgSid = localStorage.getItem('twilio_messaging_service_sid') || '';
        const useMsg = localStorage.getItem('use_messaging_service') === 'true';
        
        setTwilioAuthToken(twilioToken);
        setTwilioAccountSid(twilioSid);
        setTwilioPhoneNumber(twilioPhone);
        setTwilioMessagingServiceSid(twilioMsgSid);
        setUseMessagingService(useMsg);
=======
        const twilioKey = localStorage.getItem('twilio_api_key') || '';
        const twilioSid = localStorage.getItem('twilio_account_sid') || '';
        const twilioPhone = localStorage.getItem('twilio_phone_number') || '';
        
        setTwilioApiKey(twilioKey);
        setTwilioAccountSid(twilioSid);
        setTwilioPhoneNumber(twilioPhone);
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
        
        // Charger les templates
        const savedTemplates = JSON.parse(localStorage.getItem('sms_templates')) || [];
        setTemplates(savedTemplates);
<<<<<<< HEAD
        
        // Charger l'historique des envois
        const history = JSON.parse(localStorage.getItem('sms_send_history')) || [];
        setSendHistory(history);
        
        // Vérifier si le compte est un compte d'essai
        if (twilioSid && twilioToken) {
          checkAccountStatus(twilioSid, twilioToken);
        }
=======
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };
    
    loadSavedData();
  }, []);
<<<<<<< HEAD
  
  // Vérifier le statut du compte Twilio
  const checkAccountStatus = async (accountSid, authToken) => {
    try {
      const result = await testTwilioConnection({
        accountSid: accountSid,
        authToken: authToken
      });
      
      if (result.success) {
        const accountInfo = result.accountInfo;
        
        // Vérifier si c'est un compte d'essai
        const isTrial = accountInfo.type === 'Trial' || 
                        accountInfo.status === 'trial' || 
                        (accountInfo.subresource_uris && accountInfo.subresource_uris.balance && 
                         accountInfo.subresource_uris.balance.includes('Trial'));
        
        setIsTrialAccount(isTrial);
        console.log('Statut du compte Twilio:', isTrial ? 'Compte d\'essai' : 'Compte complet');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du compte:', error);
    }
  };
=======
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef

  // Sauvegarder les clés API
  const saveApiKeys = () => {
    try {
<<<<<<< HEAD
      localStorage.setItem('twilio_auth_token', twilioAuthToken);
      localStorage.setItem('twilio_account_sid', twilioAccountSid);
      localStorage.setItem('twilio_phone_number', twilioPhoneNumber);
      localStorage.setItem('twilio_messaging_service_sid', twilioMessagingServiceSid);
      localStorage.setItem('use_messaging_service', useMessagingService.toString());
      showSuccess('Paramètres Twilio sauvegardés avec succès');
      
      // Vérifier le statut du compte après la sauvegarde
      if (twilioAccountSid && twilioAuthToken) {
        checkAccountStatus(twilioAccountSid, twilioAuthToken);
      }
=======
      localStorage.setItem('twilio_api_key', twilioApiKey);
      localStorage.setItem('twilio_account_sid', twilioAccountSid);
      localStorage.setItem('twilio_phone_number', twilioPhoneNumber);
      showSuccess('Paramètres Twilio sauvegardés avec succès');
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres Twilio:', error);
      showError('Erreur lors de la sauvegarde des paramètres Twilio');
    }
  };

  // Sauvegarder un template
  const saveTemplate = () => {
    try {
      if (!currentTemplate.name) {
        showError('Veuillez donner un nom au template');
        return;
      }

      if (!currentTemplate.content) {
        showError('Le contenu du template ne peut pas être vide');
        return;
      }

      const newTemplates = [...templates];
      
      if (currentTemplate.id) {
        // Mise à jour d'un template existant
        const index = newTemplates.findIndex(t => t.id === currentTemplate.id);
        if (index !== -1) {
          newTemplates[index] = { ...currentTemplate };
        }
      } else {
        // Création d'un nouveau template
        const newTemplate = {
          ...currentTemplate,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        newTemplates.push(newTemplate);
      }
      
      setTemplates(newTemplates);
      localStorage.setItem('sms_templates', JSON.stringify(newTemplates));
      
      showSuccess('Template sauvegardé avec succès');
      
      // Réinitialiser le formulaire si c'était un nouveau template
      if (!currentTemplate.id) {
        resetForm();
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
      showError('Erreur lors de la sauvegarde du template');
    }
  };

  // Charger un template
  const loadTemplate = (template) => {
    setCurrentTemplate({ ...template });
  };

  // Supprimer un template
  const deleteTemplate = (id, e) => {
    e.stopPropagation();
    
    try {
      const newTemplates = templates.filter(t => t.id !== id);
      setTemplates(newTemplates);
      localStorage.setItem('sms_templates', JSON.stringify(newTemplates));
      
      // Si le template supprimé est celui en cours d'édition, réinitialiser le formulaire
      if (currentTemplate.id === id) {
        resetForm();
      }
      
      showSuccess('Template supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du template:', error);
      showError('Erreur lors de la suppression du template');
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setCurrentTemplate({
      id: null,
      name: '',
      content: '',
    });
  };

  // Copier le contenu du SMS
  const copySms = () => {
    try {
      navigator.clipboard.writeText(currentTemplate.content);
      showSuccess('Contenu du SMS copié dans le presse-papiers');
    } catch (error) {
      console.error('Erreur lors de la copie du contenu:', error);
      showError('Erreur lors de la copie du contenu');
    }
  };

  // Ajouter un destinataire
  const addRecipient = () => {
    if (!recipient) {
      showError('Veuillez entrer un numéro de téléphone');
      return;
    }
    
    // Vérifier si le numéro est déjà dans la liste
    if (recipients.includes(recipient)) {
      showError('Ce numéro est déjà dans la liste des destinataires');
      return;
    }
    
    setRecipients([...recipients, recipient]);
    setRecipient('');
  };

  // Supprimer un destinataire
  const removeRecipient = (index) => {
    const newRecipients = [...recipients];
    newRecipients.splice(index, 1);
    setRecipients(newRecipients);
  };

<<<<<<< HEAD
  // Vérifier si un numéro est vérifié dans Twilio
  const checkPhoneVerification = async (phoneNumber) => {
    if (!twilioAccountSid || !twilioAuthToken) {
      showError('Veuillez configurer vos identifiants Twilio');
      return false;
    }

    try {
      // Créer les en-têtes d'authentification pour Twilio
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      
      // Construire l'URL de l'API Twilio pour récupérer les numéros vérifiés
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/OutgoingCallerIds.json`;
      
      // Faire la requête à l'API Twilio
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = await response.json();
      
      // Vérifier si la requête a réussi
      if (!response.ok) {
        console.error('Erreur Twilio lors de la vérification des numéros:', data);
        return false;
      }
      
      // Vérifier si le numéro est dans la liste des numéros vérifiés
      const verifiedNumbers = data.caller_ids || [];
      const isVerified = verifiedNumbers.some(item => 
        item.phone_number === phoneNumber || 
        item.phone_number.replace(/\+/g, '') === phoneNumber.replace(/\+/g, '')
      );
      
      return isVerified;
    } catch (error) {
      console.error('Erreur lors de la vérification du numéro:', error);
      return false;
    }
  };

  // Vérifier les numéros avant l'envoi
  const verifyPhoneNumbers = async (phoneNumbers) => {
    if (!twilioAccountSid || !twilioAuthToken) {
      showError('Veuillez configurer vos identifiants Twilio');
      return { verified: [], unverified: phoneNumbers };
    }

    try {
      // Créer les en-têtes d'authentification pour Twilio
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      
      // Construire l'URL de l'API Twilio pour récupérer les numéros vérifiés
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/OutgoingCallerIds.json`;
      
      // Faire la requête à l'API Twilio
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const data = await response.json();
      
      // Vérifier si la requête a réussi
      if (!response.ok) {
        console.error('Erreur Twilio lors de la vérification des numéros:', data);
        return { verified: [], unverified: phoneNumbers };
      }
      
      // Récupérer la liste des numéros vérifiés
      const verifiedNumbers = data.caller_ids || [];
      const verifiedPhoneList = verifiedNumbers.map(item => item.phone_number);
      
      console.log('Numéros vérifiés dans le compte Twilio:', verifiedPhoneList);
      
      // Séparer les numéros vérifiés et non vérifiés
      const verified = [];
      const unverified = [];
      
      for (const phone of phoneNumbers) {
        const isVerified = verifiedPhoneList.some(verifiedPhone => 
          verifiedPhone === phone || 
          verifiedPhone.replace(/\+/g, '') === phone.replace(/\+/g, '')
        );
        
        if (isVerified) {
          verified.push(phone);
        } else {
          unverified.push(phone);
        }
      }
      
      return { verified, unverified };
    } catch (error) {
      console.error('Erreur lors de la vérification des numéros:', error);
      return { verified: [], unverified: phoneNumbers };
    }
  };

  // Envoyer un SMS
  const sendSms = async (toSingle = false) => {
    if (!twilioAuthToken || !twilioAccountSid) {
      showError('Veuillez configurer vos paramètres Twilio (SID et Auth Token)');
      return;
    }

    if (useMessagingService && !twilioMessagingServiceSid) {
      showError('Veuillez configurer votre Messaging Service SID Twilio');
      return;
    }

    if (!useMessagingService && !twilioPhoneNumber) {
      showError('Veuillez configurer votre numéro de téléphone Twilio');
=======
  // Envoyer un SMS
  const sendSms = async (toSingle = false) => {
    if (!twilioApiKey || !twilioAccountSid || !twilioPhoneNumber) {
      showError('Veuillez configurer vos paramètres Twilio');
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
      return;
    }

    if (!currentTemplate.content) {
      showError('Le contenu du SMS ne peut pas être vide');
      return;
    }

<<<<<<< HEAD
    // Vérifier la longueur du message seulement pour les comptes d'essai
    if (isTrialAccount && currentTemplate.content.length > 160) {
      showWarning(
        <div>
          <p>Attention: Votre message contient {currentTemplate.content.length} caractères.</p>
          <p className="mt-2 text-sm">Les comptes d'essai Twilio sont limités à 160 caractères par message.</p>
          <p className="text-sm">Si vous utilisez un compte d'essai, votre message pourrait être rejeté.</p>
        </div>
      );
    }

=======
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
    let phoneNumbers = [];
    
    if (toSingle) {
      if (!recipient) {
        showError('Veuillez entrer un numéro de téléphone');
        return;
      }
      phoneNumbers = [recipient];
    } else {
      if (recipients.length === 0) {
        showError('Veuillez ajouter au moins un destinataire');
        return;
      }
      phoneNumbers = [...recipients];
    }

    setLoading(true);
    
    try {
<<<<<<< HEAD
      // Vérifier si les numéros sont vérifiés (seulement pour les comptes d'essai)
      let verified = [];
      let unverified = [];
      
      if (isTrialAccount) {
        const result = await verifyPhoneNumbers(phoneNumbers);
        verified = result.verified;
        unverified = result.unverified;
        
        if (unverified.length > 0) {
          showWarning(
            <div>
              <p>Attention: {unverified.length} numéro(s) ne sont pas vérifiés dans votre compte Twilio:</p>
              <ul className="list-disc pl-5 mt-1 text-sm">
                {unverified.map((phone, index) => (
                  <li key={index}>{phone}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm">
                Avec un compte d'essai Twilio, vous ne pouvez envoyer des SMS qu'aux numéros vérifiés.
                <a href="https://www.twilio.com/console/phone-numbers/verified" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-blue-500 underline ml-1">
                  Vérifier des numéros
                </a>
              </p>
            </div>
          );
        }
      }
      
      // Continuer avec l'envoi des SMS
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const phoneNumber of phoneNumbers) {
        try {
          console.log(`Tentative d'envoi de SMS à ${phoneNumber}...`);
          
          // Préparer les paramètres pour le service Twilio
          const smsParams = {
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            to: phoneNumber,
            body: currentTemplate.content
          };
          
          // Ajouter soit le Messaging Service SID, soit le numéro d'expéditeur
          if (useMessagingService) {
            smsParams.messagingServiceSid = twilioMessagingServiceSid;
            console.log(`Utilisation du Messaging Service: ${twilioMessagingServiceSid}`);
          } else {
            smsParams.from = twilioPhoneNumber;
            console.log(`Utilisation du numéro d'expéditeur: ${twilioPhoneNumber}`);
          }
          
          // Afficher les paramètres complets pour le débogage
          console.log('Paramètres d\'envoi:', JSON.stringify(smsParams, null, 2));
          
          // Envoyer le SMS via le service Twilio
          const data = await twilioSendSms(smsParams);
          
          console.log('Réponse Twilio complète:', JSON.stringify(data, null, 2));
          
          // Vérifier l'état du message après un court délai
          if (data && data.sid) {
            setTimeout(async () => {
              try {
                const statusData = await checkMessageStatus({
                  accountSid: twilioAccountSid,
                  authToken: twilioAuthToken,
                  messageSid: data.sid
                });
                console.log(`État du message ${data.sid}:`, statusData.status);
                console.log('Détails complets du statut:', JSON.stringify(statusData, null, 2));
              } catch (statusError) {
                console.error('Erreur lors de la vérification du statut:', statusError);
              }
            }, 2000); // Vérifier après 2 secondes
          }
          
          successCount++;
          results.push({ phoneNumber, success: true, data });
          
        } catch (error) {
          console.error(`Erreur détaillée lors de l'envoi du SMS à ${phoneNumber}:`, error);
          errorCount++;
          results.push({ 
            phoneNumber, 
            success: false, 
            error: error.message || 'Erreur inconnue',
            details: error.toString()
          });
        }
        
        // Ajouter un petit délai entre chaque envoi pour éviter de surcharger l'API
        if (phoneNumbers.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Afficher un message de succès ou d'erreur
      if (successCount > 0 && errorCount === 0) {
        showSuccess(`SMS envoyé avec succès à ${successCount} destinataire(s)`);
      } else if (successCount > 0 && errorCount > 0) {
        showWarning(`SMS envoyé à ${successCount} destinataire(s), mais ${errorCount} envoi(s) ont échoué`);
      } else {
        showError(`Échec de l'envoi des SMS. Veuillez vérifier vos paramètres et réessayer.`);
      }
      
      // Enregistrer les résultats dans l'historique
      const historyEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        template: currentTemplate.name,
        content: currentTemplate.content,
        recipients: phoneNumbers,
        results: results,
        successCount,
        errorCount
      };
      
      const updatedHistory = [historyEntry, ...sendHistory].slice(0, 50); // Limiter à 50 entrées
      setSendHistory(updatedHistory);
      localStorage.setItem('sms_send_history', JSON.stringify(updatedHistory));
      
    } catch (error) {
      console.error('Erreur générale lors de l\'envoi des SMS:', error);
=======
      showInfo('Fonctionnalité d\'envoi de SMS en cours de développement');
      // Cette fonction sera implémentée plus tard
      
      // Simuler un délai pour l'envoi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess(`SMS envoyé avec succès à ${phoneNumbers.length} destinataire(s)`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS:', error);
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
      showError(`Erreur lors de l'envoi du SMS: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  // Effacer l'historique des envois
  const clearSendHistory = () => {
    // Fonction pour confirmer la suppression
    const confirmClear = () => {
      setSendHistory([]);
      localStorage.removeItem('sms_send_history');
      showInfo('Historique des envois effacé');
    };
    
    // Afficher un message de confirmation avec des boutons personnalisés
    const message = 'Êtes-vous sûr de vouloir effacer tout l\'historique des envois ?';
    const confirmButton = <button onClick={confirmClear} className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Effacer</button>;
    const cancelButton = <button className="ml-2 px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Annuler</button>;
    
    showWarning(
      <div>
        <p>{message}</p>
        <div className="flex justify-end mt-2">
          {cancelButton}
          {confirmButton}
        </div>
      </div>,
      5000
    );
  };

  // Formater la date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  // Importer des numéros depuis un fichier
  const importPhoneNumbers = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        let phoneNumbers = [];
        
        if (fileExtension === 'csv') {
          // Traiter le fichier CSV
          const lines = content.split('\n');
          
          // Essayer de détecter le séparateur (virgule ou point-virgule)
          const firstLine = lines[0];
          const separator = firstLine.includes(';') ? ';' : ',';
          
          for (const line of lines) {
            if (line.trim()) {
              // Si la ligne contient le séparateur, essayer de trouver le numéro de téléphone
              if (line.includes(separator)) {
                const columns = line.split(separator);
                // Chercher une colonne qui ressemble à un numéro de téléphone
                for (const column of columns) {
                  const trimmed = column.trim().replace(/["']/g, '');
                  if (isValidPhoneNumber(trimmed)) {
                    phoneNumbers.push(trimmed);
                    break; // Prendre le premier numéro valide de la ligne
                  }
                }
              } else {
                // Si pas de séparateur, considérer la ligne entière comme un numéro
                const trimmed = line.trim().replace(/["']/g, '');
                if (isValidPhoneNumber(trimmed)) {
                  phoneNumbers.push(trimmed);
                }
              }
            }
          }
        } else if (fileExtension === 'txt') {
          // Traiter le fichier TXT (un numéro par ligne)
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim().replace(/["']/g, '');
            if (trimmed && isValidPhoneNumber(trimmed)) {
              phoneNumbers.push(trimmed);
            }
          }
        } else {
          showError('Format de fichier non pris en charge. Utilisez CSV ou TXT.');
          return;
        }
        
        // Filtrer les doublons et les numéros déjà dans la liste
        const uniqueNumbers = [...new Set(phoneNumbers)];
        const newNumbers = uniqueNumbers.filter(num => !recipients.includes(num));
        
        if (newNumbers.length === 0) {
          showInfo('Aucun nouveau numéro de téléphone valide trouvé dans le fichier.');
          return;
        }
        
        // Ajouter les nouveaux numéros à la liste des destinataires
        setRecipients([...recipients, ...newNumbers]);
        showSuccess(`${newNumbers.length} numéro(s) de téléphone importé(s) avec succès.`);
        
      } catch (error) {
        console.error('Erreur lors de l\'importation des numéros:', error);
        showError(`Erreur lors de l'importation: ${error.message || 'Erreur inconnue'}`);
      }
      
      // Réinitialiser l'input file pour permettre de sélectionner le même fichier à nouveau
      event.target.value = '';
    };
    
    reader.onerror = () => {
      showError('Erreur lors de la lecture du fichier.');
      // Réinitialiser l'input file
      event.target.value = '';
    };
    
    reader.readAsText(file);
  };
  
  // Vérifier si une chaîne est un numéro de téléphone valide
  const isValidPhoneNumber = (str) => {
    // Format international: +33612345678 ou 33612345678
    const phoneRegex = /^(\+)?[0-9]{10,15}$/;
    return phoneRegex.test(str);
  };

  // Voir les détails d'un envoi
  const viewSendDetails = (entry) => {
    setSelectedHistoryEntry(entry);
  };
  
  // Fermer les détails d'un envoi
  const closeDetails = () => {
    setSelectedHistoryEntry(null);
  };

  // Ajouter une information de débogage
  const addDebugInfo = (info) => {
    const timestamp = new Date().toLocaleTimeString();
    const newInfo = {
      id: Date.now(),
      timestamp,
      info: typeof info === 'object' ? JSON.stringify(info, null, 2) : info
    };
    
    setDebugInfo(prevInfo => [newInfo, ...prevInfo].slice(0, 20)); // Garder les 20 dernières entrées
  };
  
  // Effacer les informations de débogage
  const clearDebugInfo = () => {
    setDebugInfo([]);
  };
  
  // Surcharger console.log pour capturer les logs
  useEffect(() => {
    if (showDebug) {
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        addDebugInfo(args.length === 1 ? args[0] : args);
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        addDebugInfo({ type: 'error', content: args.length === 1 ? args[0] : args });
      };
      
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      };
    }
  }, [showDebug]);

  // Tester la connexion Twilio
  const handleTestConnection = async () => {
    if (!twilioAccountSid || !twilioAuthToken) {
      showError('Veuillez configurer vos identifiants Twilio');
      return;
    }

    setTestingConnection(true);
    setDebugInfo([]);

    try {
      const result = await testTwilioConnection({
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken
      });

      if (result.success) {
        const accountInfo = result.accountInfo;
        
        // Vérifier si c'est un compte d'essai
        const isTrial = accountInfo.type === 'Trial' || 
                        accountInfo.status === 'trial' || 
                        (accountInfo.subresource_uris && accountInfo.subresource_uris.balance && 
                         accountInfo.subresource_uris.balance.includes('Trial'));
        
        if (isTrial) {
          showWarning(
            <div>
              <p>Connexion réussie, mais vous utilisez un compte d'essai Twilio.</p>
              <p className="mt-2 text-sm">Limitations des comptes d'essai:</p>
              <ul className="list-disc pl-5 mt-1 text-sm">
                <li>Vous ne pouvez envoyer des SMS qu'aux numéros vérifiés</li>
                <li>La longueur des messages est limitée (max 160 caractères)</li>
                <li>Le nombre de messages est limité</li>
              </ul>
              <p className="mt-2 text-sm">
                <a href="https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-blue-500 underline">
                  En savoir plus sur les comptes d'essai Twilio
                </a>
              </p>
            </div>
          );
        } else {
          showSuccess('Connexion à Twilio réussie!');
        }
        
        // Ajouter les informations du compte pour le débogage
        setDebugInfo(prev => [...prev, {
          type: 'success',
          title: 'Informations du compte',
          data: accountInfo
        }]);
      }
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      showError(`Erreur de connexion: ${error.message}`);
      
      // Ajouter l'erreur pour le débogage
      setDebugInfo(prev => [...prev, {
        type: 'error',
        title: 'Erreur de connexion',
        data: error.toString()
      }]);
    } finally {
      setTestingConnection(false);
    }
  };

  // Envoyer un SMS de test
  const sendTestSms = async () => {
    if (!twilioAccountSid || !twilioAuthToken) {
      showError('Veuillez configurer vos identifiants Twilio');
      return;
    }

    if (useMessagingService && !twilioMessagingServiceSid) {
      showError('Veuillez configurer votre Messaging Service SID Twilio');
      return;
    }

    if (!useMessagingService && !twilioPhoneNumber) {
      showError('Veuillez configurer votre numéro de téléphone Twilio');
      return;
    }

    if (!recipient) {
      showError('Veuillez entrer un numéro de téléphone pour le test');
      return;
    }

    setLoading(true);
    setDebugInfo([]);

    try {
      // Message de test court pour éviter les problèmes de longueur avec les comptes d'essai
      const testMessage = "Ceci est un message de test depuis HakBoard.";
      
      // Préparer les paramètres pour le service Twilio
      const smsParams = {
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        to: recipient,
        body: testMessage
      };
      
      // Ajouter soit le Messaging Service SID, soit le numéro d'expéditeur
      if (useMessagingService) {
        smsParams.messagingServiceSid = twilioMessagingServiceSid;
      } else {
        smsParams.from = twilioPhoneNumber;
      }
      
      // Ajouter les paramètres pour le débogage
      setDebugInfo(prev => [...prev, {
        type: 'info',
        title: 'Paramètres d\'envoi',
        data: {...smsParams, authToken: '***********'}
      }]);
      
      // Envoyer le SMS via le service Twilio
      const data = await twilioSendSms(smsParams);
      
      showSuccess('SMS de test envoyé avec succès!');
      
      // Ajouter la réponse pour le débogage
      setDebugInfo(prev => [...prev, {
        type: 'success',
        title: 'Réponse Twilio',
        data: data
      }]);
      
      // Vérifier l'état du message après un court délai
      if (data && data.sid) {
        setTimeout(async () => {
          try {
            const statusData = await checkMessageStatus({
              accountSid: twilioAccountSid,
              authToken: twilioAuthToken,
              messageSid: data.sid
            });
            
            // Ajouter le statut pour le débogage
            setDebugInfo(prev => [...prev, {
              type: statusData.status === 'delivered' ? 'success' : 'warning',
              title: `État du message: ${statusData.status}`,
              data: statusData
            }]);
            
            // Si le message a échoué, afficher un avertissement
            if (statusData.status === 'failed') {
              showWarning(
                <div>
                  <p>Le message a été envoyé mais a échoué avec le code d'erreur: {statusData.error_code}</p>
                  {statusData.error_code === '30044' && (
                    <p className="mt-2 text-sm">
                      Erreur 30044: La longueur du message dépasse la limite autorisée pour les comptes d'essai.
                    </p>
                  )}
                  {statusData.error_code === '21211' && (
                    <p className="mt-2 text-sm">
                      Erreur 21211: Le numéro de téléphone du destinataire est invalide ou non vérifié.
                      Avec un compte d'essai, vous devez vérifier les numéros avant de pouvoir leur envoyer des messages.
                    </p>
                  )}
                </div>
              );
            }
          } catch (statusError) {
            console.error('Erreur lors de la vérification du statut:', statusError);
            
            // Ajouter l'erreur pour le débogage
            setDebugInfo(prev => [...prev, {
              type: 'error',
              title: 'Erreur de vérification du statut',
              data: statusError.toString()
            }]);
          }
        }, 2000); // Vérifier après 2 secondes
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS de test:', error);
      showError(`Erreur: ${error.message}`);
      
      // Ajouter l'erreur pour le débogage
      setDebugInfo(prev => [...prev, {
        type: 'error',
        title: 'Erreur d\'envoi',
        data: error.toString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMessagingService = () => {
    setUseMessagingService(!useMessagingService);
  };

  const isAccountConfigured = twilioAccountSid && twilioAuthToken;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Smishing</h1>
      
      {/* Onglets */}
      <div className="flex mb-6 border-b">
        <button 
          className={`px-4 py-2 ${!showHistory ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setShowHistory(false)}
        >
          Envoi de SMS
        </button>
        <button 
          className={`px-4 py-2 ${showHistory ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setShowHistory(true)}
        >
          Historique des envois
        </button>
      </div>
      
      {!showHistory ? (
        <div>
          {/* Configuration Twilio */}
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setActiveTab('config')}
                className={`px-4 py-2 rounded-t-lg ${
                  activeTab === 'config' 
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`px-4 py-2 rounded-t-lg ${
                  activeTab === 'send' 
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Envoi de SMS
              </button>
            </div>
          </div>
          
          {activeTab === 'config' ? (
            <div>
              {/* Configuration Twilio */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Configuration Twilio</h2>
                
                {isAccountConfigured && (
                  <div className={`mb-4 p-3 rounded ${isTrialAccount ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' : 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>
                    <div className="flex items-center">
                      {isTrialAccount ? (
                        <>
                          <FiAlertCircle className="mr-2" />
                          <span>Compte Twilio d'essai détecté</span>
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
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account SID
                  </label>
                  <input
                    type="text"
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auth Token
                  </label>
                  <input
                    type="password"
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <button
                      onClick={toggleMessagingService}
                      className="text-indigo-600 dark:text-indigo-400 flex items-center"
                      aria-label={useMessagingService ? "Utiliser un numéro de téléphone" : "Utiliser un service de messagerie"}
                    >
                      {useMessagingService ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {useMessagingService ? "Utiliser un service de messagerie" : "Utiliser un numéro de téléphone"}
                      </span>
                    </button>
                    <button 
                      className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => showInfo(
                        useMessagingService 
                          ? "Un service de messagerie Twilio vous permet d'envoyer des messages sans spécifier un numéro de téléphone spécifique. Twilio choisira le meilleur numéro à utiliser." 
                          : "Vous devez spécifier un numéro de téléphone Twilio à partir duquel les messages seront envoyés."
                      )}
                    >
                      <FiInfo size={16} />
                    </button>
                  </div>
                  
                  {useMessagingService ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Messaging Service SID
                      </label>
                      <input
                        type="text"
                        value={twilioMessagingServiceSid}
                        onChange={(e) => setTwilioMessagingServiceSid(e.target.value)}
                        placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Numéro de téléphone Twilio
                      </label>
                      <input
                        type="text"
                        value={twilioPhoneNumber}
                        onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={saveApiKeys}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                    disabled={loading}
                  >
                    <FiSave className="mr-2" />
                    Sauvegarder
                  </button>
                  <button
                    onClick={handleTestConnection}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                    disabled={loading || !isAccountConfigured}
                  >
                    <FiCheck className="mr-2" />
                    Tester la connexion
                  </button>
                  <button
                    onClick={sendTestSms}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    disabled={loading || !isAccountConfigured}
                  >
                    <FiSend className="mr-2" />
                    Envoyer un SMS test
                  </button>
                </div>
              </div>
              
              {/* Contenu du SMS */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Contenu du SMS</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom du template
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                    placeholder="Nom du template"
                    className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contenu du SMS
                  </label>
                  <textarea
                    value={currentTemplate.content}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                    placeholder="Entrez le contenu de votre SMS ici..."
                    rows={5}
                    className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {currentTemplate.content.length} caractères
                      {isTrialAccount && currentTemplate.content.length > 160 && (
                        <span className="text-red-500 dark:text-red-400"> (limite dépassée pour compte d'essai)</span>
                      )}
                    </span>
                    <button
                      onClick={copySms}
                      className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                    >
                      <FiCopy className="mr-1" size={14} />
                      Copier
                    </button>
                  </div>
                </div>
                
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Configuration Twilio</h2>
            
            {/* Alerte pour les comptes d'essai - affichée uniquement si c'est un compte d'essai */}
            {isTrialAccount && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Limitations des comptes d'essai Twilio:</strong>
                    </p>
                    <ul className="list-disc pl-5 mt-1 text-sm text-yellow-700">
                      <li>Vous ne pouvez envoyer des SMS qu'aux numéros vérifiés dans votre compte</li>
                      <li>La longueur des messages est limitée (max 160 caractères)</li>
                      <li>Le nombre de messages est limité</li>
                    </ul>
                    <p className="text-sm text-yellow-700 mt-2">
                      <a href="https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-blue-500 underline">
                        En savoir plus sur les comptes d'essai Twilio
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Message pour les comptes complets */}
            {!isTrialAccount && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiCheck className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      <strong>Compte Twilio complet activé</strong>
                    </p>
                    <p className="text-sm text-green-700">
                      Vous pouvez envoyer des SMS à n'importe quel numéro de téléphone sans restrictions de longueur.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Formulaire de configuration Twilio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account SID
                </label>
                <input
                  type="text"
                  value={twilioAccountSid}
                  onChange={(e) => setTwilioAccountSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full p-2 border rounded focus:ring focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auth Token
                </label>
                <input
                  type="password"
                  value={twilioAuthToken}
                  onChange={(e) => setTwilioAuthToken(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full p-2 border rounded focus:ring focus:ring-indigo-200"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2 mt-2">
                <div className="flex items-center mb-2">
                  <button
                    type="button"
                    onClick={() => setUseMessagingService(!useMessagingService)}
                    className="mr-2 text-indigo-600 focus:outline-none"
                  >
                    {useMessagingService ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {useMessagingService ? "Utiliser un Messaging Service" : "Utiliser un numéro de téléphone"}
                  </span>
                  <button
                    type="button"
                    onClick={() => showInfo(
                      <div>
                        <p><strong>Deux options pour envoyer des SMS avec Twilio:</strong></p>
                        <ul className="list-disc pl-5 mt-1">
                          <li><strong>Numéro de téléphone:</strong> Utilisez un numéro spécifique pour envoyer vos SMS.</li>
                          <li><strong>Messaging Service:</strong> Utilisez un service qui peut regrouper plusieurs numéros et optimiser la livraison.</li>
                        </ul>
                        <p className="mt-2">
                          <a href="https://www.twilio.com/docs/messaging/services" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-blue-500 underline">
                            En savoir plus sur les Messaging Services
                          </a>
                        </p>
                      </div>
                    )}
                    className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <FiInfo size={16} />
                  </button>
                </div>
              </div>
              
              {useMessagingService ? (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Messaging Service SID
                  </label>
                  <input
                    type="text"
                    value={twilioMessagingServiceSid}
                    onChange={(e) => setTwilioMessagingServiceSid(e.target.value)}
                    placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2 border rounded focus:ring focus:ring-indigo-200"
                  />
                </div>
              ) : (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de téléphone Twilio
                  </label>
                  <input
                    type="text"
                    value={twilioPhoneNumber}
                    onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full p-2 border rounded focus:ring focus:ring-indigo-200"
                  />
                </div>
              )}
              
              <div className="col-span-1 md:col-span-2 flex space-x-2 mt-2">
                <button
                  onClick={saveApiKeys}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                  disabled={loading}
                >
                  <FiSave className="mr-2" />
                  Sauvegarder
                </button>
                <button
                  onClick={handleTestConnection}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                  disabled={loading || testingConnection}
                >
                  <FiCheck className="mr-2" />
                  {testingConnection ? 'Test en cours...' : 'Tester la connexion'}
                </button>
                <button
                  onClick={sendTestSms}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  disabled={loading}
                >
                  <FiSend className="mr-2" />
                  Envoyer SMS de test
                </button>
              </div>
            </div>
          </div>
          
          {/* Contenu du SMS */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Contenu du SMS</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du template
              </label>
              <input
                type="text"
                value={currentTemplate.name}
                onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                placeholder="Nom du template"
                className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contenu du SMS
              </label>
              <textarea
                value={currentTemplate.content}
                onChange={(e) => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                placeholder="Entrez le contenu de votre SMS ici..."
                rows={5}
                className="w-full p-2 border dark:border-gray-600 rounded focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
              />
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {currentTemplate.content.length} caractères
                  {isTrialAccount && currentTemplate.content.length > 160 && (
                    <span className="text-red-500 dark:text-red-400"> (limite dépassée pour compte d'essai)</span>
                  )}
                </span>
                <button
                  onClick={copySms}
                  className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                >
                  <FiCopy className="mr-1" size={14} />
                  Copier
                </button>
              </div>
            </div>
            
            <div className="flex space-x-2 mb-4">
              <button
                onClick={saveTemplate}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                disabled={!currentTemplate.name || !currentTemplate.content}
              >
                <FiSave className="mr-2" />
                Sauvegarder le template
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
              >
                <FiRefreshCw className="mr-2" />
                Réinitialiser
              </button>
            </div>
            
            {templates.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2 dark:text-white">Templates sauvegardés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className={`p-2 border dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        currentTemplate.id === template.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium dark:text-white">{template.name}</span>
                        <button
                          onClick={(e) => deleteTemplate(template.id, e)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{template.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Destinataires */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold dark:text-white mb-4">Destinataires</h2>
            
            <div className="flex mb-4">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Numéro de téléphone (ex: +33612345678)"
                className="flex-1 p-2 border dark:border-gray-600 rounded-l focus:ring focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={addRecipient}
                className="px-4 py-2 bg-indigo-600 text-white rounded-r hover:bg-indigo-700"
                disabled={loading}
              >
                Ajouter
              </button>
            </div>
            
            <div className="flex items-center mb-4">
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={importPhoneNumbers}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
                  disabled={loading}
                >
                  <FiUpload className="mr-2" />
                  Importer des numéros
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  Formats acceptés: CSV, TXT
                </span>
              </div>
              
              {recipients.length > 0 && (
                <button
                  onClick={() => setRecipients([])}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                  disabled={loading}
                >
                  <FiTrash2 className="mr-2" />
                  Effacer tout
                </button>
              )}
            </div>
            
            {/* Liste des destinataires */}
            {recipients.length > 0 ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium dark:text-white">Liste des destinataires</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{recipients.length} numéro(s)</span>
                </div>
                <div className="max-h-40 overflow-y-auto border dark:border-gray-600 rounded p-2 dark:bg-gray-700">
                  {recipients.map((phone, index) => (
                    <div key={index} className="flex justify-between items-center py-1 border-b dark:border-gray-600 last:border-b-0">
                      <span className="dark:text-white">{phone}</span>
                      <button
                        onClick={() => removeRecipient(index)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Aucun destinataire ajouté</p>
            )}
            
            {/* Boutons d'envoi */}
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => sendSms(false)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                disabled={loading || recipients.length === 0 || !currentTemplate.content}
              >
                <FiSend className="mr-2" />
                {loading ? 'Envoi en cours...' : 'Envoyer à tous'}
              </button>
              <button
                onClick={() => sendSms(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                disabled={loading || !recipient || !currentTemplate.content}
              >
                <FiSend className="mr-2" />
                Envoyer au numéro saisi
              </button>
            </div>
          </div>
          
          {/* Débogage */}
          <div className="mb-6">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
            >
              {showDebug ? 'Masquer' : 'Afficher'} les informations de débogage
            </button>
            
            {showDebug && (
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium dark:text-white">Informations de débogage</h3>
                  <button
                    onClick={clearDebugInfo}
                    className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Effacer
                  </button>
                </div>
                
                <div className="max-h-60 overflow-y-auto">
                  {debugInfo.length > 0 ? (
                    debugInfo.map(item => (
                      <div key={item.id} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</div>
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap dark:text-white">
                          {item.info}
                        </pre>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">Aucune information de débogage</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Historique des envois */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold dark:text-white">Historique des envois</h2>
              
              {sendHistory.length > 0 && (
                <button
                  onClick={clearSendHistory}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center text-sm"
                >
                  <FiTrash2 className="mr-1" />
                  Effacer l'historique
                </button>
              )}
            </div>
            
            {sendHistory.length > 0 ? (
              <div>
                {selectedHistoryEntry ? (
                  <div>
                    <button
                      onClick={closeDetails}
                      className="mb-4 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                    >
                      ← Retour à la liste
                    </button>
                    
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2 dark:text-white">Détails de l'envoi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                          <p className="dark:text-white">{formatDate(selectedHistoryEntry.date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Template</p>
                          <p className="dark:text-white">{selectedHistoryEntry.template || 'Sans nom'}</p>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Contenu</p>
                          <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded dark:text-white">{selectedHistoryEntry.content}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Résultats</p>
                          <div className="flex space-x-4">
                            <div className="flex items-center">
                              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                              <span className="dark:text-white">{selectedHistoryEntry.successCount} réussi(s)</span>
                            </div>
                            <div className="flex items-center">
                              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                              <span className="dark:text-white">{selectedHistoryEntry.errorCount} échoué(s)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <h4 className="font-medium mb-2 dark:text-white">Détails par destinataire</h4>
                      <div className="border dark:border-gray-600 rounded overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Numéro
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Statut
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Détails
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {selectedHistoryEntry.results.map((result, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap dark:text-white">
                                  {result.phoneNumber}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {result.success ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                      Réussi
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                      Échoué
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {result.success ? (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      SID: {result.data?.sid || 'N/A'}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-red-500 dark:text-red-400">
                                      {result.error || 'Erreur inconnue'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border dark:border-gray-600 rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Template
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Destinataires
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Résultats
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sendHistory.map(entry => (
                          <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-2 whitespace-nowrap dark:text-white">
                              {formatDate(entry.date)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap dark:text-white">
                              {entry.template || 'Sans nom'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap dark:text-white">
                              {entry.recipients.length} numéro(s)
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex space-x-2">
                                <div className="flex items-center">
                                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                                  <span className="text-xs dark:text-white">{entry.successCount}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                                  <span className="text-xs dark:text-white">{entry.errorCount}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <button
                                onClick={() => viewSendDetails(entry)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                Voir détails
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Aucun historique d'envoi</p>
            )}
          </div>
        </div>
      )}
=======
  return (
    <div className="smishing">
      <h1 className="text-2xl font-bold mb-6">SMS Phishing (Smishing)</h1>
      
      {/* Section de configuration Twilio */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuration Twilio</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Numéro de téléphone Twilio
            </label>
            <input
              type="text"
              value={twilioPhoneNumber}
              onChange={(e) => setTwilioPhoneNumber(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ex: +33612345678"
            />
          </div>
        </div>
        
        <button
          onClick={saveApiKeys}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
        >
          Sauvegarder les paramètres
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section d'édition de SMS */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Édition de SMS</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Nom du template
            </label>
            <input
              type="text"
              value={currentTemplate.name}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Nom du template"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Contenu du SMS
            </label>
            <textarea
              value={currentTemplate.content}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 min-h-[200px]"
              placeholder="Entrez le contenu du SMS ici..."
            />
            <p className="text-sm text-gray-500 mt-1">
              {currentTemplate.content.length} caractères / 160 par SMS
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={saveTemplate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiSave className="mr-2" />
              Sauvegarder
            </button>
            
            <button
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Nouveau
            </button>
            
            <button
              onClick={copySms}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiCopy className="mr-2" />
              Copier
            </button>
          </div>
        </div>
        
        {/* Section des templates */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Templates sauvegardés</h2>
          
          {templates.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => loadTemplate(template)}
                  className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center ${
                    currentTemplate.id === template.id ? 'bg-indigo-50 dark:bg-gray-700 border-indigo-300 dark:border-indigo-500' : ''
                  }`}
                >
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {template.content.substring(0, 50)}
                      {template.content.length > 50 ? '...' : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteTemplate(template.id, e)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FiInfo size={48} className="mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Aucun template sauvegardé. Créez votre premier template !
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Section d'envoi de SMS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Envoi de SMS</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Numéro de téléphone
          </label>
          <div className="flex">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="flex-1 p-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ex: +33612345678"
            />
            <button
              onClick={() => sendSms(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-r-md flex items-center"
            >
              {loading ? (
                <span>Envoi...</span>
              ) : (
                <>
                  <FiSend className="mr-2" />
                  Envoyer
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Format: +33612345678 (avec l'indicatif du pays)
          </p>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-700 dark:text-gray-300">
              Liste des destinataires
            </label>
            <button
              onClick={addRecipient}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-md"
            >
              Ajouter
            </button>
          </div>
          
          {recipients.length > 0 ? (
            <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {recipients.map((phone, index) => (
                  <li key={index} className="py-2 flex justify-between items-center">
                    <span>{phone}</span>
                    <button
                      onClick={() => removeRecipient(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="border rounded-md p-4 text-center text-gray-500">
              Aucun destinataire ajouté
            </div>
          )}
        </div>
        
        <button
          onClick={() => sendSms(false)}
          disabled={loading || recipients.length === 0}
          className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center ${
            recipients.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <span>Envoi en cours...</span>
          ) : (
            <>
              <FiSend className="mr-2" />
              Envoyer à tous les destinataires ({recipients.length})
            </>
          )}
        </button>
      </div>
>>>>>>> 7ed00f3867592eda21f62c4375dcbaf0d75953ef
    </div>
  );
};

export default Smishing;
