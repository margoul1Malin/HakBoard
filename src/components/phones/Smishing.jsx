import React, { useState, useEffect } from 'react';
import { FiSend, FiSave, FiTrash2, FiCopy, FiInfo } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Smishing = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [loading, setLoading] = useState(false);
  const [twilioApiKey, setTwilioApiKey] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState({
    id: null,
    name: '',
    content: '',
  });
  const [recipient, setRecipient] = useState('');
  const [recipients, setRecipients] = useState([]);

  // Charger les clés API et les templates au démarrage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Charger les clés API depuis le stockage local
        const twilioKey = localStorage.getItem('twilio_api_key') || '';
        const twilioSid = localStorage.getItem('twilio_account_sid') || '';
        const twilioPhone = localStorage.getItem('twilio_phone_number') || '';
        
        setTwilioApiKey(twilioKey);
        setTwilioAccountSid(twilioSid);
        setTwilioPhoneNumber(twilioPhone);
        
        // Charger les templates
        const savedTemplates = JSON.parse(localStorage.getItem('sms_templates')) || [];
        setTemplates(savedTemplates);
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
      localStorage.setItem('twilio_phone_number', twilioPhoneNumber);
      showSuccess('Paramètres Twilio sauvegardés avec succès');
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

  // Envoyer un SMS
  const sendSms = async (toSingle = false) => {
    if (!twilioApiKey || !twilioAccountSid || !twilioPhoneNumber) {
      showError('Veuillez configurer vos paramètres Twilio');
      return;
    }

    if (!currentTemplate.content) {
      showError('Le contenu du SMS ne peut pas être vide');
      return;
    }

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
      showInfo('Fonctionnalité d\'envoi de SMS en cours de développement');
      // Cette fonction sera implémentée plus tard
      
      // Simuler un délai pour l'envoi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess(`SMS envoyé avec succès à ${phoneNumbers.length} destinataire(s)`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS:', error);
      showError(`Erreur lors de l'envoi du SMS: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

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
    </div>
  );
};

export default Smishing;
