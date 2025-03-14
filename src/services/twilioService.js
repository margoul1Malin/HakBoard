/**
 * Service pour gérer les appels à l'API Twilio
 */

/**
 * Vérifie si un compte Twilio est un compte d'essai (trial)
 * @param {Object} accountInfo - Informations du compte Twilio
 * @returns {boolean} - True si c'est un compte d'essai, false sinon
 */
const isTrialAccount = (accountInfo) => {
  return accountInfo && (
    accountInfo.type === 'Trial' || 
    accountInfo.status === 'trial' || 
    accountInfo.subresource_uris?.balance?.includes('Trial')
  );
};

/**
 * Envoie un SMS via l'API Twilio
 * @param {Object} params - Paramètres pour l'envoi du SMS
 * @param {string} params.accountSid - SID du compte Twilio
 * @param {string} params.authToken - Token d'authentification Twilio
 * @param {string} params.to - Numéro de téléphone du destinataire
 * @param {string} params.body - Contenu du message
 * @param {string} [params.messagingServiceSid] - SID du service de messagerie (optionnel)
 * @param {string} [params.from] - Numéro de téléphone de l'expéditeur (optionnel)
 * @returns {Promise<Object>} - Réponse de l'API Twilio
 */
export const sendSms = async (params) => {
  const { accountSid, authToken, to, body, messagingServiceSid, from } = params;

  if (!accountSid || !authToken) {
    throw new Error('Les identifiants Twilio (SID et Auth Token) sont requis');
  }

  if (!to) {
    throw new Error('Le numéro de téléphone du destinataire est requis');
  }

  if (!body) {
    throw new Error('Le contenu du message est requis');
  }

  if (!messagingServiceSid && !from) {
    throw new Error('Vous devez spécifier soit un Messaging Service SID, soit un numéro d\'expéditeur');
  }

  // Vérifier la longueur du message
  if (body.length > 160) {
    console.warn(`Le message contient ${body.length} caractères. Les comptes d'essai Twilio peuvent avoir des limitations de longueur.`);
  }

  try {
    // Créer les en-têtes d'authentification pour Twilio
    const auth = btoa(`${accountSid}:${authToken}`);
    
    // Construire l'URL de l'API Twilio pour envoyer un SMS
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Préparer les données du formulaire
    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('Body', body);
    
    // Utiliser soit le Messaging Service SID, soit le numéro de téléphone
    if (messagingServiceSid) {
      formData.append('MessagingServiceSid', messagingServiceSid);
    } else if (from) {
      formData.append('From', from);
    }
    
    // Afficher les données envoyées pour le débogage
    console.log('Données envoyées à Twilio:', Object.fromEntries(formData));
    
    // Faire la requête à l'API Twilio
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    
    const data = await response.json();
    
    // Vérifier si la requête a réussi
    if (!response.ok) {
      console.error('Erreur Twilio détaillée:', data);
      
      // Gérer les erreurs spécifiques
      if (data.code === 30044) {
        throw new Error('Erreur Twilio: La longueur du message dépasse la limite autorisée pour les comptes d\'essai. Veuillez raccourcir votre message ou mettre à niveau votre compte Twilio.');
      } else if (data.code === 21211) {
        throw new Error('Erreur Twilio: Le numéro de téléphone du destinataire est invalide. Avec un compte d\'essai, vous devez vérifier les numéros de téléphone avant de pouvoir leur envoyer des messages.');
      } else {
        throw new Error(data.message || `Erreur Twilio (code ${data.code || 'inconnu'}): ${data.more_info || 'Aucune information supplémentaire'}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    throw error;
  }
};

/**
 * Vérifie l'état d'un message SMS envoyé via Twilio
 * @param {Object} params - Paramètres pour la vérification
 * @param {string} params.accountSid - SID du compte Twilio
 * @param {string} params.authToken - Token d'authentification Twilio
 * @param {string} params.messageSid - SID du message à vérifier
 * @returns {Promise<Object>} - Réponse de l'API Twilio avec l'état du message
 */
export const checkMessageStatus = async (params) => {
  const { accountSid, authToken, messageSid } = params;

  if (!accountSid || !authToken) {
    throw new Error('Les identifiants Twilio (SID et Auth Token) sont requis');
  }

  if (!messageSid) {
    throw new Error('Le SID du message est requis');
  }

  try {
    // Créer les en-têtes d'authentification pour Twilio
    const auth = btoa(`${accountSid}:${authToken}`);
    
    // Construire l'URL de l'API Twilio pour vérifier l'état du message
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`;
    
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
      console.error('Erreur Twilio:', data);
      throw new Error(data.message || 'Erreur lors de la vérification de l\'état du message');
    }
    
    return data;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'état du message:', error);
    throw error;
  }
};

/**
 * Teste la connexion à l'API Twilio
 * @param {Object} params - Paramètres pour le test
 * @param {string} params.accountSid - SID du compte Twilio
 * @param {string} params.authToken - Token d'authentification Twilio
 * @returns {Promise<Object>} - Résultat du test de connexion
 */
export const testTwilioConnection = async (params) => {
  const { accountSid, authToken } = params;

  if (!accountSid || !authToken) {
    throw new Error('Les identifiants Twilio (SID et Auth Token) sont requis');
  }

  try {
    // Créer les en-têtes d'authentification pour Twilio
    const auth = btoa(`${accountSid}:${authToken}`);
    
    // Construire l'URL de l'API Twilio pour récupérer les informations du compte
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    
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
      console.error('Erreur Twilio:', data);
      throw new Error(data.message || 'Erreur lors de la connexion à Twilio');
    }
    
    return {
      success: true,
      accountInfo: data
    };
  } catch (error) {
    console.error('Erreur lors du test de connexion Twilio:', error);
    throw error;
  }
}; 