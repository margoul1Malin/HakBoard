/**
 * Service de gestion des clés API
 * Ce service centralise la sauvegarde et le chargement des clés API
 */
class ApiKeysService {
  constructor() {
    this.keys = {};
    console.log('[ApiKeysService] Initialisation du service');
    this.loadAllKeys();
  }

  async loadAllKeys() {
    try {
      console.log('[ApiKeysService] Chargement de toutes les clés API');
      
      // Charger toutes les clés API depuis electron-store
      if (window.electronAPI && window.electronAPI.getStoreValue) {
        console.log('[ApiKeysService] Tentative de chargement depuis electron-store');
        const allApiKeys = await window.electronAPI.getStoreValue('api_keys') || {};
        console.log('[ApiKeysService] Clés trouvées dans electron-store:', Object.keys(allApiKeys));
        
        this.keys = allApiKeys;
        
        // Pour la compatibilité, vérifier également les paramètres
        if (Object.keys(this.keys).length === 0 && window.electronAPI.getSettings) {
          console.log('[ApiKeysService] Aucune clé trouvée dans electron-store, fallback sur settings');
          
          const settings = await window.electronAPI.getSettings();
          if (settings) {
            console.log('[ApiKeysService] Paramètres trouvés:', 
              Object.keys(settings).filter(key => key.includes('ApiKey')));
            
            // Charger les clés connues depuis les anciens paramètres
            if (settings.shodanApiKey) {
              this.keys.shodan = settings.shodanApiKey;
              console.log('[ApiKeysService] Clé Shodan chargée depuis settings');
            }
            if (settings.zoomeyeApiKey) {
              this.keys.zoomeye = settings.zoomeyeApiKey;
              console.log('[ApiKeysService] Clé ZoomEye chargée depuis settings');
            }
            if (settings.virustotalApiKey) {
              this.keys.virustotal = settings.virustotalApiKey;
              console.log('[ApiKeysService] Clé VirusTotal chargée depuis settings');
            }
            if (settings.hunterApiKey) {
              this.keys.hunter = settings.hunterApiKey;
              console.log('[ApiKeysService] Clé Hunter chargée depuis settings');
            }
            if (settings.leakcheckApiKey) {
              this.keys.leakcheck = settings.leakcheckApiKey;
              console.log('[ApiKeysService] Clé LeakCheck chargée depuis settings');
            }
            
            // Sauvegarder ces clés dans electron-store pour l'avenir
            if (Object.keys(this.keys).length > 0) {
              console.log('[ApiKeysService] Migration des clés vers electron-store:', Object.keys(this.keys));
              await window.electronAPI.setStoreValue('api_keys', this.keys);
            }
          }
        }
      } else if (window.electronAPI && window.electronAPI.getSettings) {
        console.log('[ApiKeysService] electron-store non disponible, utilisation de getSettings');
        
        // Fallback sur l'ancien système de paramètres
        const settings = await window.electronAPI.getSettings();
        if (settings) {
          console.log('[ApiKeysService] Paramètres trouvés:', 
            Object.keys(settings).filter(key => key.includes('ApiKey')));
          
          // Charger les clés connues
          if (settings.shodanApiKey) this.keys.shodan = settings.shodanApiKey;
          if (settings.zoomeyeApiKey) this.keys.zoomeye = settings.zoomeyeApiKey;
          if (settings.virustotalApiKey) this.keys.virustotal = settings.virustotalApiKey;
          if (settings.hunterApiKey) this.keys.hunter = settings.hunterApiKey;
          if (settings.leakcheckApiKey) this.keys.leakcheck = settings.leakcheckApiKey;
        }
      } else {
        console.log('[ApiKeysService] APIs non disponibles, fallback sur localStorage');
        
        // Fallback ultime sur localStorage
        const keys = localStorage.getItem('api_keys');
        if (keys) {
          this.keys = JSON.parse(keys);
          console.log('[ApiKeysService] Clés trouvées dans localStorage:', Object.keys(this.keys));
        }
      }
      console.log('[ApiKeysService] Clés API chargées:', Object.keys(this.keys));
    } catch (error) {
      console.error('[ApiKeysService] Erreur lors du chargement des clés API:', error);
    }
  }

  async saveKey(service, key) {
    try {
      console.log(`[ApiKeysService] Sauvegarde de la clé ${service}`);
      
      this.keys[service] = key;
      
      // Sauvegarder dans electron-store (méthode principale)
      if (window.electronAPI && window.electronAPI.setStoreValue) {
        console.log(`[ApiKeysService] Sauvegarde dans electron-store pour ${service}`);
        await window.electronAPI.setStoreValue('api_keys', this.keys);
        
        // Vérifier que la sauvegarde a fonctionné
        const verification = await window.electronAPI.getStoreValue('api_keys');
        console.log(`[ApiKeysService] Vérification après sauvegarde:`, 
          verification && verification[service] ? 'OK' : 'ÉCHEC');
      }
      
      // Pour la compatibilité, sauvegarder également dans les paramètres
      if (window.electronAPI && window.electronAPI.saveSettings) {
        console.log(`[ApiKeysService] Sauvegarde dans settings pour ${service}`);
        const settingKey = `${service}ApiKey`;
        const settingObj = { [settingKey]: key };
        await window.electronAPI.saveSettings(settingObj);
      }
      
      // Fallback sur localStorage
      console.log(`[ApiKeysService] Sauvegarde dans localStorage pour ${service}`);
      localStorage.setItem('api_keys', JSON.stringify(this.keys));
      
      return true;
    } catch (error) {
      console.error(`[ApiKeysService] Erreur lors de la sauvegarde de la clé API ${service}:`, error);
      return false;
    }
  }

  async getKey(service) {
    // Recharger les clés pour s'assurer qu'elles sont à jour
    await this.loadAllKeys();
    console.log(`[ApiKeysService] Récupération de la clé ${service}:`, this.keys[service] ? 'Existe' : 'N\'existe pas');
    return this.keys[service] || '';
  }
}

export const apiKeysService = new ApiKeysService(); 