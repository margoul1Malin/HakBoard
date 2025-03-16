/**
 * Service pour gérer les fonctionnalités de SMS Flooding (Smooding) via l'API Twilio
 */

/**
 * Envoie un SMS via l'API Twilio
 * @param {Object} params - Paramètres pour l'envoi du SMS
 * @returns {Promise<Object>} - Résultat de l'opération
 */
const sendSingleSms = async (params) => {
  try {
    const { accountSid, authToken, from, to, body } = params;
    
    // Vérifier les paramètres requis
    if (!accountSid || !authToken || !from || !to || !body) {
      return { 
        success: false, 
        error: 'Paramètres manquants pour l\'envoi du SMS' 
      };
    }
    
    // Construire l'URL de l'API Twilio
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Préparer les données du formulaire
    const formData = new URLSearchParams();
    formData.append('From', from);
    formData.append('To', to);
    formData.append('Body', body);
    
    // Encoder les identifiants en base64 pour l'authentification
    const auth = btoa(`${accountSid}:${authToken}`);
    
    // Envoyer la requête à l'API Twilio
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: formData
    });
    
    // Analyser la réponse
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erreur Twilio:', data);
      return { 
        success: false, 
        error: data.message || `Erreur Twilio (code ${data.code || 'inconnu'})` 
      };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Teste la connexion à l'API Twilio
 * @param {Object} params - Paramètres pour le test
 * @returns {Promise<Object>} - Résultat du test de connexion
 */
export const testConnection = async (params) => {
  try {
    const { accountSid, authToken } = params;
    
    // Vérifier les paramètres requis
    if (!accountSid || !authToken) {
      return { 
        success: false, 
        error: 'Les identifiants Twilio (SID et Auth Token) sont requis' 
      };
    }
    
    // Construire l'URL de l'API Twilio
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    
    // Encoder les identifiants en base64 pour l'authentification
    const auth = btoa(`${accountSid}:${authToken}`);
    
    // Envoyer la requête à l'API Twilio
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    // Analyser la réponse
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erreur Twilio:', data);
      return { 
        success: false, 
        error: data.message || 'Erreur lors du test de connexion' 
      };
    }
    
    // Vérifier si c'est un compte d'essai
    const isTrial = data.type === 'Trial' || 
                    data.status === 'trial' || 
                    (data.subresource_uris && data.subresource_uris.balance && 
                     data.subresource_uris.balance.includes('Trial'));
    
    return {
      success: true,
      accountInfo: data,
      isTrial
    };
  } catch (error) {
    console.error('Erreur lors du test de connexion:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Vérifie si un numéro de téléphone est vérifié dans Twilio
 * @param {Object} params - Paramètres pour la vérification
 * @returns {Promise<Object>} - Résultat de la vérification
 */
export const checkPhoneVerification = async (params) => {
  try {
    const { accountSid, authToken, phoneNumber } = params;
    
    // Vérifier les paramètres requis
    if (!accountSid || !authToken || !phoneNumber) {
      return { 
        success: false, 
        error: 'Paramètres manquants pour vérifier le numéro de téléphone' 
      };
    }
    
    // Construire l'URL de l'API Twilio pour les numéros vérifiés
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/OutgoingCallerIds.json`;
    
    // Encoder les identifiants en base64 pour l'authentification
    const auth = btoa(`${accountSid}:${authToken}`);
    
    // Envoyer la requête à l'API Twilio
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    // Analyser la réponse
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erreur Twilio:', data);
      return { 
        success: false, 
        error: data.message || 'Erreur lors de la vérification du numéro' 
      };
    }
    
    // Vérifier si le numéro est dans la liste des numéros vérifiés
    const isVerified = data.caller_ids && data.caller_ids.some(
      caller => caller.phone_number === phoneNumber || caller.phone_number.replace(/\s+/g, '') === phoneNumber.replace(/\s+/g, '')
    );
    
    return { success: true, isVerified };
  } catch (error) {
    console.error('Erreur lors de la vérification du numéro:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoie des SMS en masse (flooding)
 * @param {Object} params - Paramètres pour le flooding
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const sendSmsFlooding = async (params) => {
  try {
    const { 
      accountSid, 
      authToken, 
      fromNumbers, 
      to, 
      body, 
      totalMessages, 
      delayBetweenMessages = 1000,
      onProgress
    } = params;
    
    // Vérifier les paramètres requis
    if (!accountSid || !authToken || !body || !fromNumbers || fromNumbers.length === 0 || !to || !totalMessages) {
      return { 
        success: false, 
        error: 'Paramètres manquants pour le flooding SMS' 
      };
    }
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Vérifier si le compte est un compte d'essai
    const connectionTest = await testConnection({ accountSid, authToken });
    const isTrial = connectionTest.success && connectionTest.isTrial;
    
    // Si c'est un compte d'essai, vérifier si le numéro de destination est vérifié
    if (isTrial) {
      const verificationCheck = await checkPhoneVerification({ 
        accountSid, 
        authToken, 
        phoneNumber: to 
      });
      
      if (!verificationCheck.success || !verificationCheck.isVerified) {
        return {
          success: false,
          error: 'Avec un compte d\'essai Twilio, vous ne pouvez envoyer des SMS qu\'à des numéros vérifiés.'
        };
      }
    }
    
    // Envoyer les messages en séquence
    for (let i = 0; i < totalMessages; i++) {
      // Sélectionner un numéro d'expéditeur aléatoire
      const randomIndex = Math.floor(Math.random() * fromNumbers.length);
      const from = fromNumbers[randomIndex];
      
      // Envoyer le SMS
      const result = await sendSingleSms({
        accountSid,
        authToken,
        from,
        to,
        body
      });
      
      // Enregistrer le résultat
      const messageResult = {
        index: i + 1,
        from,
        to,
        success: result.success,
        timestamp: new Date().toISOString()
      };
      
      if (result.success) {
        messageResult.data = result.data;
        successCount++;
      } else {
        messageResult.error = result.error;
        errorCount++;
      }
      
      results.push(messageResult);
      
      // Mettre à jour la progression
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalMessages) * 100);
        onProgress(progress, messageResult);
      }
      
      // Attendre avant d'envoyer le prochain message
      if (i < totalMessages - 1 && delayBetweenMessages > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
      }
    }
    
    return {
      success: true,
      results,
      summary: {
        totalMessages,
        successCount,
        errorCount
      }
    };
  } catch (error) {
    console.error('Erreur lors du flooding SMS:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoie un SMS de test
 * @param {Object} params - Paramètres pour le SMS de test
 * @returns {Promise<Object>} - Résultat de l'opération
 */
export const sendTestSms = async (params) => {
  try {
    const { accountSid, authToken, from, to } = params;
    
    // Vérifier les paramètres requis
    if (!accountSid || !authToken || !from || !to) {
      return { 
        success: false, 
        error: 'Paramètres manquants pour l\'envoi du SMS de test' 
      };
    }
    
    // Vérifier si le compte est un compte d'essai
    const connectionTest = await testConnection({ accountSid, authToken });
    const isTrial = connectionTest.success && connectionTest.isTrial;
    
    // Si c'est un compte d'essai, vérifier si le numéro de destination est vérifié
    if (isTrial) {
      const verificationCheck = await checkPhoneVerification({ 
        accountSid, 
        authToken, 
        phoneNumber: to 
      });
      
      if (!verificationCheck.success || !verificationCheck.isVerified) {
        return {
          success: false,
          error: 'Avec un compte d\'essai Twilio, vous ne pouvez envoyer des SMS qu\'à des numéros vérifiés.'
        };
      }
    }
    
    // Créer un message de test
    const body = `Ceci est un SMS de test envoyé depuis l'application Smooding. [${new Date().toLocaleTimeString()}]`;
    
    // Envoyer le SMS
    const result = await sendSingleSms({
      accountSid,
      authToken,
      from,
      to,
      body
    });
    
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS de test:', error);
    return { success: false, error: error.message };
  }
}; 