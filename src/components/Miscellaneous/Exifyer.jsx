import React, { useState } from 'react';
import { FiFile, FiInfo, FiUpload, FiDownload, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Exifyer = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États pour gérer le composant
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  
  // Fonction pour gérer la sélection de fichier
  const handleFileSelect = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.showOpenFileDialog) {
        throw new Error('API Electron non disponible');
      }
      
      const result = await window.electronAPI.showOpenFileDialog({
        title: 'Sélectionner un fichier',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'] },
          { name: 'Vidéos', extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv'] },
          { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ]
      });
      
      if (result.success) {
        setSelectedFile(result.filePath);
        setError(null);
        await extractMetadata(result.filePath);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      showError('Erreur lors de la sélection du fichier');
    }
  };
  
  // Fonction pour extraire les métadonnées
  const extractMetadata = async (filePath) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.electronAPI || !window.electronAPI.executeCommand) {
        throw new Error('API Electron non disponible');
      }
      
      // Utiliser exiftool pour tous les types de fichiers
      const result = await window.electronAPI.executeCommand(`exiftool -json "${filePath}"`);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      try {
        // Parser le résultat JSON
        const metadata = JSON.parse(result.stdout);
        // Formater les métadonnées avant de les stocker dans l'état
        const formattedMetadata = formatMetadata(metadata[0]); // exiftool retourne un tableau avec un seul objet
        setMetadata(formattedMetadata);
        showSuccess('Métadonnées extraites avec succès');
      } catch (parseError) {
        // Si le parsing JSON échoue, afficher la sortie brute
        setMetadata(result.stdout);
        showWarning('Les métadonnées ont été extraites mais le formatage JSON a échoué');
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction des métadonnées:', error);
      setError('Erreur lors de l\'extraction des métadonnées');
      showError('Erreur lors de l\'extraction des métadonnées');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour formater les métadonnées
  const formatMetadata = (metadata) => {
    if (!metadata) return '';
    
    // Si les métadonnées sont déjà une chaîne, les retourner telles quelles
    if (typeof metadata === 'string') return metadata;
    
    // Fonction récursive pour formater un objet
    const formatObject = (obj, indent = 0) => {
      const spaces = ' '.repeat(indent);
      let result = '';
      
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;
        
        // Formater la clé
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
        const displayKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Objet imbriqué
          result += `${spaces}${displayKey}:\n${formatObject(value, indent + 2)}`;
        } else if (Array.isArray(value)) {
          // Tableau
          result += `${spaces}${displayKey}:\n`;
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              result += `${spaces}  ${index + 1}.\n${formatObject(item, indent + 4)}`;
            } else {
              result += `${spaces}  ${index + 1}. ${item}\n`;
            }
          });
        } else {
          // Valeur simple
          result += `${spaces}${displayKey}: ${value}\n`;
        }
      }
      
      return result;
    };
    
    return formatObject(metadata);
  };
  
  // Fonction pour exporter les métadonnées
  const exportMetadata = () => {
    if (!metadata) {
      showWarning('Aucune métadonnée à exporter');
      return;
    }
    
    try {
      const blob = new Blob([metadata], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metadata_${selectedFile.split('/').pop()}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Métadonnées exportées avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'exportation:', error);
      showError('Erreur lors de l\'exportation des métadonnées');
    }
  };
  
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">
        Exifyer - Extracteur de Métadonnées
      </h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Sélectionner un fichier
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choisissez un fichier pour extraire ses métadonnées. Formats supportés : images (JPEG, PNG), vidéos (MP4, AVI, MOV), PDF et autres types de fichiers.
          </p>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleFileSelect}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
            >
              <FiUpload className="mr-2" /> Sélectionner un fichier
            </button>
            
            {selectedFile && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Fichier sélectionné : {selectedFile.split('/').pop()}
              </span>
            )}
          </div>
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <div className="flex items-center">
              <FiAlertTriangle className="text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
        
        {metadata && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Métadonnées extraites
              </h3>
              <button
                onClick={exportMetadata}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
              >
                <FiDownload className="mr-2" /> Exporter
              </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {metadata}
              </pre>
            </div>
          </div>
        )}
        
        {!metadata && !isLoading && !error && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FiInfo className="mx-auto mb-2" size={24} />
            <p>Sélectionnez un fichier pour commencer l'extraction des métadonnées</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exifyer; 