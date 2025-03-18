import { apiKeysService } from './apiKeysService';

const API_BASE_URL = 'https://www.virustotal.com/vtapi/v2';

class VirusTotalService {
  constructor() {
    console.log('[VirusTotalService] Initialisation du service');
    this.apiKey = '';
    this.loadApiKey();
  }

  async loadApiKey() {
    console.log('[VirusTotalService] Chargement de la clé API');
    try {
      this.apiKey = await apiKeysService.getKey('virustotal');
      console.log('[VirusTotalService] Clé API chargée:', this.apiKey ? 'Oui' : 'Non');
    } catch (error) {
      console.error('[VirusTotalService] Erreur lors du chargement de la clé API:', error);
    }
  }

  async getApiKey() {
    // Recharger la clé à chaque demande pour s'assurer qu'elle est à jour
    await this.loadApiKey();
    return this.apiKey;
  }

  async setApiKey(key) {
    console.log('[VirusTotalService] Sauvegarde de la clé API');
    this.apiKey = key;
    const success = await apiKeysService.saveKey('virustotal', key);
    console.log('[VirusTotalService] Clé API sauvegardée:', success ? 'Oui' : 'Non');
    return success;
  }

  // Analyser un fichier
  async scanFile(filePath) {
    try {
      // Calculer d'abord le hash du fichier
      const fileHash = await this.calculateFileHash(filePath);
      
      // Vérifier si le fichier a déjà été analysé
      const existingReport = await this.getFileReport(fileHash);
      if (existingReport && existingReport.response_code === 1) {
        return existingReport;
      }

      // Si le fichier n'a pas été analysé, on utilise l'API de scan
      const params = new URLSearchParams({
        apikey: this.apiKey
      });

      // Créer un FormData avec le fichier
      const formData = new FormData();
      formData.append('apikey', this.apiKey);
      
      // Utiliser l'API Electron pour lire le fichier
      const fileBuffer = await window.electronAPI.executeCommand(`cat "${filePath}"`);
      const fileName = filePath.split('/').pop();
      formData.append('file', new Blob([fileBuffer.stdout]), fileName);

      const response = await fetch(`${API_BASE_URL}/file/scan`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Attendre et récupérer les résultats
      return await this.pollResults(data.scan_id);
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse du fichier: ${error.message}`);
    }
  }

  // Analyser une URL
  async scanUrl(url) {
    try {
      // D'abord, vérifier si l'URL a déjà été analysée
      try {
        const existingReport = await this.getUrlReport(url);
        if (existingReport && existingReport.response_code === 1) {
          return existingReport;
        }
      } catch (e) {
        // Ignorer cette erreur et continuer avec l'analyse
        console.log("L'URL n'a pas été analysée précédemment, continuons...");
      }

      const formData = new URLSearchParams();
      formData.append('apikey', this.apiKey);
      formData.append('url', url);

      const response = await fetch(`${API_BASE_URL}/url/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Maintenant attendre quelques secondes pour que l'analyse se termine
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Puis récupérer les résultats avec l'URL comme ressource
      return await this.getUrlReport(url);
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse de l'URL: ${error.message}`);
    }
  }

  // Obtenir le rapport d'une URL
  async getUrlReport(urlOrId) {
    try {
      const formData = new URLSearchParams();
      formData.append('apikey', this.apiKey);
      formData.append('resource', urlOrId);

      const response = await fetch(`${API_BASE_URL}/url/report?${formData.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Vérifier si les données sont valides
      if (!data || data.response_code === 0) {
        throw new Error('URL non trouvée ou pas encore analysée');
      }
      
      return data;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du rapport URL: ${error.message}`);
    }
  }

  // Obtenir le rapport d'un fichier via son hash
  async getFileReport(hash) {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        resource: hash
      });

      const response = await fetch(`${API_BASE_URL}/file/report?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du rapport: ${error.message}`);
    }
  }

  // Fonction utilitaire pour calculer le hash d'un fichier
  async calculateFileHash(filePath) {
    try {
      const result = await window.electronAPI.executeCommand(`sha256sum "${filePath}"`);
      return result.stdout.split(' ')[0];
    } catch (error) {
      throw new Error('Erreur lors du calcul du hash du fichier');
    }
  }

  // Fonction pour attendre les résultats d'analyse
  async pollResults(scanId, maxAttempts = 10) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const params = new URLSearchParams({
          apikey: this.apiKey,
          resource: scanId
        });

        const response = await fetch(`${API_BASE_URL}/file/report?${params}`);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.response_code === 1) {
          return data;
        }

        // Attendre 15 secondes entre chaque tentative
        await new Promise(resolve => setTimeout(resolve, 15000));
        attempts++;
      } catch (error) {
        console.error('Erreur lors de la récupération des résultats:', error);
        throw error;
      }
    }

    throw new Error('Délai d\'attente dépassé pour les résultats');
  }
}

export const virusTotalService = new VirusTotalService(); 