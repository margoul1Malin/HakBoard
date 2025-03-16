import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiSettings, FiInfo, FiAlertCircle, FiCheck, FiTrash2, FiUpload, FiRefreshCw, FiMail, FiUser, FiUsers, FiCopy, FiSave, FiList, FiFileText } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Sender = () => {
  const { showSuccess, showError, showInfo, showWarning, showConfirm } = useNotification();
  
  // États pour les paramètres SendGrid
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  
  // États pour les destinataires
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState('');
  
  // États pour le contenu de l'email
  const [subject, setSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // États pour le suivi
  const [loading, setLoading] = useState(false);
  const [sendHistory, setSendHistory] = useState([]);
  
  // Références
  const fileInputRef = useRef(null);
  
  // Charger les données sauvegardées au démarrage
  useEffect(() => {
    loadSavedData();
    loadTemplatesFromPhisher();
    checkSelectedTemplate();
  }, []);
  
  // Charger les données sauvegardées
  const loadSavedData = () => {
    try {
      const savedApiKey = localStorage.getItem('sendgrid_api_key') || '';
      const savedSenderEmail = localStorage.getItem('sender_email') || '';
      const savedSenderName = localStorage.getItem('sender_name') || '';
      const savedSendHistory = JSON.parse(localStorage.getItem('email_send_history')) || [];
      
      setSendgridApiKey(savedApiKey);
      setSenderEmail(savedSenderEmail);
      setSenderName(savedSenderName);
      setSendHistory(savedSendHistory);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      showError('Erreur lors du chargement des données');
    }
  };
  
  // Charger les templates depuis Phisher
  const loadTemplatesFromPhisher = () => {
    try {
      const phisherTemplates = JSON.parse(localStorage.getItem('email_templates')) || [];
      setTemplates(phisherTemplates);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      showError('Erreur lors du chargement des templates');
    }
  };
  
  // Vérifier si un template a été sélectionné depuis Phisher
  const checkSelectedTemplate = () => {
    try {
      const selectedTemplateData = localStorage.getItem('selected_template_for_sender');
      
      if (selectedTemplateData) {
        const template = JSON.parse(selectedTemplateData);
        
        // Charger le template
        setSelectedTemplate(template);
        setSubject(template.subject || '');
        setEmailContent(template.content || '');
        
        // Effacer la sélection pour éviter de recharger le même template à chaque fois
        localStorage.removeItem('selected_template_for_sender');
        
        showInfo(`Template "${template.name}" chargé depuis Phisher`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du template sélectionné:', error);
    }
  };
  
  // Sauvegarder les paramètres SendGrid
  const saveApiSettings = () => {
    try {
      localStorage.setItem('sendgrid_api_key', sendgridApiKey);
      localStorage.setItem('sender_email', senderEmail);
      localStorage.setItem('sender_name', senderName);
      
      showSuccess('Paramètres SendGrid sauvegardés avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      showError('Erreur lors de la sauvegarde des paramètres');
    }
  };
  
  // Ajouter un destinataire
  const addRecipient = () => {
    if (!newRecipient) {
      showError('Veuillez entrer une adresse email');
      return;
    }
    
    if (!isValidEmail(newRecipient)) {
      showError('Format d\'email invalide');
      return;
    }
    
    if (recipients.includes(newRecipient)) {
      showError('Ce destinataire est déjà dans la liste');
      return;
    }
    
    setRecipients([...recipients, newRecipient]);
    setNewRecipient('');
  };
  
  // Supprimer un destinataire
  const removeRecipient = (index) => {
    const updatedRecipients = [...recipients];
    updatedRecipients.splice(index, 1);
    setRecipients(updatedRecipients);
  };
  
  // Supprimer tous les destinataires
  const removeAllRecipients = () => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer tous les destinataires ?',
      () => {
        setRecipients([]);
        showSuccess('Tous les destinataires ont été supprimés');
      }
    );
  };
  
  // Importer des destinataires depuis un fichier
  const importRecipients = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      let emails = [];
      
      // Détecter le format du fichier (CSV, TXT, LST)
      if (file.name.endsWith('.csv')) {
        // Traiter comme CSV
        const lines = content.split('\n');
        lines.forEach(line => {
          const values = line.split(',');
          values.forEach(value => {
            const trimmedValue = value.trim();
            if (trimmedValue && isValidEmail(trimmedValue)) {
              emails.push(trimmedValue);
            }
          });
        });
      } else {
        // Traiter comme TXT ou LST (un email par ligne)
        const lines = content.split('\n');
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && isValidEmail(trimmedLine)) {
            emails.push(trimmedLine);
          }
        });
      }
      
      // Filtrer les doublons et les emails déjà présents
      const uniqueEmails = [...new Set(emails)];
      const newEmails = uniqueEmails.filter(email => !recipients.includes(email));
      
      if (newEmails.length === 0) {
        showWarning('Aucun nouvel email valide trouvé dans le fichier');
        return;
      }
      
      // Ajouter les nouveaux emails
      setRecipients([...recipients, ...newEmails]);
      showSuccess(`${newEmails.length} destinataires importés avec succès`);
    };
    
    reader.readAsText(file);
    // Réinitialiser l'input file pour permettre de sélectionner le même fichier à nouveau
    event.target.value = '';
  };
  
  // Sélectionner un template
  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setSubject(template.subject || '');
    setEmailContent(template.content || '');
  };
  
  // Vérifier si un email est valide
  const isValidEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };
  
  // Envoyer un email de test
  const sendTestEmail = async () => {
    if (!sendgridApiKey) {
      showError('Veuillez configurer votre clé API SendGrid');
      return;
    }
    
    if (!senderEmail || !senderName) {
      showError('Veuillez configurer l\'expéditeur');
      return;
    }
    
    if (!newRecipient) {
      showError('Veuillez entrer une adresse email de test');
      return;
    }
    
    if (!isValidEmail(newRecipient)) {
      showError('Format d\'email de test invalide');
      return;
    }
    
    if (!subject || !emailContent) {
      showError('Veuillez entrer un sujet et un contenu pour l\'email');
      return;
    }
    
    setLoading(true);
    
    try {
      // Préparer les données pour l'envoi
      const emailData = {
        to: newRecipient,
        from: {
          email: senderEmail,
          name: senderName
        },
        subject: subject,
        html: emailContent
      };
      
      // Appel à l'API SendGrid (à implémenter)
      const result = await sendEmailWithSendGrid(emailData);
      
      if (result.success) {
        showSuccess('Email de test envoyé avec succès');
        
        // Ajouter à l'historique
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          to: [newRecipient],
          subject: subject,
          success: true
        };
        
        const updatedHistory = [historyEntry, ...sendHistory];
        setSendHistory(updatedHistory);
        localStorage.setItem('email_send_history', JSON.stringify(updatedHistory));
      } else {
        showError(`Échec de l'envoi: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de test:', error);
      showError(`Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Envoyer des emails à tous les destinataires
  const sendEmails = async () => {
    if (!sendgridApiKey) {
      showError('Veuillez configurer votre clé API SendGrid');
      return;
    }
    
    if (!senderEmail || !senderName) {
      showError('Veuillez configurer l\'expéditeur');
      return;
    }
    
    if (recipients.length === 0) {
      showError('Veuillez ajouter au moins un destinataire');
      return;
    }
    
    if (!subject || !emailContent) {
      showError('Veuillez entrer un sujet et un contenu pour l\'email');
      return;
    }
    
    setLoading(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Envoyer à chaque destinataire
      for (const recipient of recipients) {
        try {
          // Préparer les données pour l'envoi
          const emailData = {
            to: recipient,
            from: {
              email: senderEmail,
              name: senderName
            },
            subject: subject,
            html: emailContent
          };
          
          // Appel à l'API SendGrid (à implémenter)
          const result = await sendEmailWithSendGrid(emailData);
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push({ recipient, error: result.error });
          }
        } catch (error) {
          errorCount++;
          errors.push({ recipient, error: error.message || 'Erreur inconnue' });
        }
      }
      
      // Ajouter à l'historique
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        to: recipients,
        subject: subject,
        success: successCount > 0,
        successCount,
        errorCount,
        errors
      };
      
      const updatedHistory = [historyEntry, ...sendHistory];
      setSendHistory(updatedHistory);
      localStorage.setItem('email_send_history', JSON.stringify(updatedHistory));
      
      if (successCount > 0) {
        showSuccess(`${successCount} email(s) envoyé(s) avec succès, ${errorCount} échec(s)`);
      } else {
        showError('Échec de l\'envoi de tous les emails');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des emails:', error);
      showError(`Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour envoyer un email avec SendGrid
  const sendEmailWithSendGrid = async (emailData) => {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: emailData.to }]
            }
          ],
          from: {
            email: emailData.from.email,
            name: emailData.from.name
          },
          subject: emailData.subject,
          content: [
            {
              type: 'text/html',
              value: emailData.html
            }
          ]
        })
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.errors ? errorData.errors[0].message : 'Erreur lors de l\'envoi de l\'email' 
        };
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur inconnue' 
      };
    }
  };
  
  // Effacer l'historique d'envoi
  const clearSendHistory = () => {
    showConfirm(
      'Êtes-vous sûr de vouloir effacer tout l\'historique d\'envoi ?',
      () => {
        setSendHistory([]);
        localStorage.setItem('email_send_history', JSON.stringify([]));
        showSuccess('Historique d\'envoi effacé avec succès');
      }
    );
  };
  
  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="sender">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Email Sender</h1>
      
      {/* Bouton pour revenir à Phisher */}
      <div className="mb-4">
        <button
          onClick={() => {
            if (window.setActiveView) {
              window.setActiveView('phisher');
            }
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FiFileText className="mr-2" />
          Retour à Phisher
        </button>
      </div>
      
      {/* Section de configuration SendGrid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Configuration SendGrid</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Clé API SendGrid
            </label>
            <input
              type="password"
              value={sendgridApiKey}
              onChange={(e) => setSendgridApiKey(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Email de l'expéditeur
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="votre@email.com"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Nom de l'expéditeur
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Votre Nom"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveApiSettings}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={loading}
          >
            <FiSettings className="mr-2" />
            Sauvegarder les paramètres
          </button>
          
          <button
            onClick={sendTestEmail}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={loading || !sendgridApiKey || !senderEmail || !senderName || !subject || !emailContent}
          >
            <FiSend className="mr-2" />
            Envoyer un email de test
          </button>
        </div>
      </div>
      
      {/* Section des destinataires */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Destinataires</h2>
        
        <div className="mb-4">
          <div className="flex">
            <input
              type="email"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              className="flex-1 p-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="destinataire@email.com"
            />
            <button
              onClick={addRecipient}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-md"
              disabled={loading}
            >
              Ajouter
            </button>
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={importRecipients}
            accept=".csv,.txt,.lst"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={loading}
          >
            <FiUpload className="mr-2" />
            Importer des destinataires
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            Formats acceptés: CSV, TXT, LST
          </span>
          
          {recipients.length > 0 && (
            <button
              onClick={removeAllRecipients}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
              disabled={loading}
            >
              <FiTrash2 className="mr-2" />
              Effacer tout
            </button>
          )}
        </div>
        
        {recipients.length > 0 ? (
          <div className="border dark:border-gray-600 rounded-md p-2 max-h-[200px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium dark:text-white">Liste des destinataires</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{recipients.length} destinataire(s)</span>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {recipients.map((email, index) => (
                <li key={index} className="py-2 flex justify-between items-center">
                  <span className="dark:text-white">{email}</span>
                  <button
                    onClick={() => removeRecipient(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    disabled={loading}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border dark:border-gray-600 rounded-md p-4 text-center text-gray-500 dark:text-gray-400">
            Aucun destinataire ajouté
          </div>
        )}
      </div>
      
      {/* Section du contenu de l'email */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Contenu de l'email</h2>
        
        {templates.length > 0 && (
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Templates disponibles
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className={`border p-3 rounded-md cursor-pointer hover:border-indigo-500 ${
                    selectedTemplate && selectedTemplate.id === template.id 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => selectTemplate(template)}
                >
                  <h3 className="font-medium dark:text-white">{template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{template.subject}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Sujet
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Sujet de l'email"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Contenu (HTML)
          </label>
          <textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
            placeholder="<p>Contenu de l'email en HTML</p>"
            rows={10}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={sendEmails}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={loading || !sendgridApiKey || !senderEmail || !senderName || recipients.length === 0 || !subject || !emailContent}
          >
            <FiSend className="mr-2" />
            Envoyer à tous les destinataires
          </button>
        </div>
      </div>
      
      {/* Section de l'historique d'envoi */}
      {sendHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Historique d'envoi</h2>
            
            <button
              onClick={clearSendHistory}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center text-sm"
              disabled={loading}
            >
              <FiTrash2 className="mr-1" />
              Effacer l'historique
            </button>
          </div>
          
          <div className="border dark:border-gray-600 rounded-md p-2 max-h-[300px] overflow-y-auto">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {sendHistory.map((entry) => (
                <li key={entry.id} className="py-3">
                  <div className="flex items-start">
                    {entry.success ? (
                      <FiCheck className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                    ) : (
                      <FiAlertCircle className="text-red-500 dark:text-red-400 mr-2 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium dark:text-white">
                        {entry.subject}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Envoyé à {entry.to.length} destinataire(s) le {formatDate(entry.timestamp)}
                      </p>
                      {entry.successCount !== undefined && (
                        <p className="text-sm">
                          <span className="text-green-500 dark:text-green-400">{entry.successCount} réussi(s)</span>
                          {' - '}
                          <span className="text-red-500 dark:text-red-400">{entry.errorCount} échec(s)</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Avertissement */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <FiAlertCircle className="text-yellow-500 dark:text-yellow-400 mr-2 flex-shrink-0" size={24} />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Attention</p>
            <p className="text-yellow-700 dark:text-yellow-300">
              Assurez-vous d'avoir l'autorisation d'envoyer des emails aux destinataires.
              L'envoi d'emails non sollicités peut être illégal dans certains pays.
              Utilisez cet outil de manière responsable et éthique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sender;
