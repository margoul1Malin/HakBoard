import React, { useState, useEffect } from 'react';
import { FiMoon, FiSun, FiSave } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';

const Settings = ({ darkMode, setDarkMode }) => {
  // Contexte de notification
  const { showSuccess, showError } = useNotification();
  
  // État pour les paramètres
  const [settings, setSettings] = useState({
    darkMode: false
  });
  // État pour le chargement
  const [loading, setLoading] = useState(true);

  // Charger les paramètres au démarrage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Récupérer les paramètres depuis electron-store (méthode privilégiée)
        if (window.electronAPI && window.electronAPI.getStoreValue) {
          const storedSettings = await window.electronAPI.getStoreValue('app_settings');
          if (storedSettings) {
            console.log('Paramètres chargés depuis electron-store:', storedSettings);
            setSettings(storedSettings);
            // Mettre à jour le mode sombre dans le composant parent
            setDarkMode(storedSettings.darkMode);
            return;
          }
        }
        
        // Fallback sur la méthode getSettings (utilisant localStorage)
        if (window.electronAPI && window.electronAPI.getSettings) {
          const storedSettings = await window.electronAPI.getSettings();
          if (storedSettings) {
            console.log('Paramètres chargés depuis localStorage:', storedSettings);
            setSettings(storedSettings);
            // Mettre à jour le mode sombre dans le composant parent
            setDarkMode(storedSettings.darkMode);
            
            // Migrer vers electron-store pour les prochaines utilisations
            if (window.electronAPI.setStoreValue) {
              await window.electronAPI.setStoreValue('app_settings', storedSettings);
              console.log('Paramètres migrés vers electron-store');
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        showError('Erreur lors du chargement des paramètres');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [setDarkMode, showError]);

  // Fonction pour gérer les changements de paramètres
  const handleSettingChange = (key, value) => {
    const updatedSettings = {
      ...settings,
      [key]: value,
    };
    setSettings(updatedSettings);
    
    // Si le mode sombre est modifié, mettre à jour l'état dans le composant parent
    if (key === 'darkMode') {
      setDarkMode(value);
    }
  };

  // Fonction pour sauvegarder les paramètres
  const saveSettings = async () => {
    try {
      // Sauvegarder dans electron-store (méthode principale)
      if (window.electronAPI && window.electronAPI.setStoreValue) {
        await window.electronAPI.setStoreValue('app_settings', settings);
        console.log('Paramètres sauvegardés dans electron-store');
      }
      
      // Pour compatibilité, sauvegarder également avec l'ancienne méthode
      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings(settings);
        console.log('Paramètres sauvegardés dans localStorage');
      }
      
      showSuccess('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      showError('Erreur lors de la sauvegarde des paramètres');
    }
  };

  if (loading) {
    return (
      <div className="settings">
        <h1 className="text-2xl font-bold mb-6">Paramètres</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings">
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Apparence</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Thème</label>
            <div className="flex items-center">
              <button
                onClick={() => handleSettingChange('darkMode', false)}
                className={`flex items-center justify-center p-3 rounded-l-md ${
                  !darkMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <FiSun className="mr-2" />
                Clair
              </button>
              <button
                onClick={() => handleSettingChange('darkMode', true)}
                className={`flex items-center justify-center p-3 rounded-r-md ${
                  darkMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <FiMoon className="mr-2" />
                Sombre
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={saveSettings}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FiSave className="mr-2" />
            Sauvegarder les paramètres
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">À propos</h2>
        <p className="text-gray-600 dark:text-gray-400">
          HakBoard v1.0.0 - Une application de tableau de bord pour les outils de sécurité et d'OSINT.
        </p>
      </div>
    </div>
  );
};

export default Settings; 