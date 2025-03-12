import React, { useState, useEffect } from 'react';
import { FiMoon, FiSun, FiSave } from 'react-icons/fi';

const Settings = ({ darkMode, setDarkMode }) => {
  // État pour les paramètres
  const [settings, setSettings] = useState({
    primaryColor: '#4f46e5', // Couleur indigo par défaut
    showCompletedTasks: true,
    enableNotifications: false,
    autoSave: true,
  });
  // État pour le chargement
  const [loading, setLoading] = useState(true);

  // Charger les paramètres au démarrage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        // Récupérer les paramètres depuis le stockage
        const storedSettings = await window.electronAPI.getSettings();
        if (storedSettings) {
          setSettings(storedSettings);
          // Mettre à jour le mode sombre dans le composant parent
          setDarkMode(storedSettings.darkMode);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [setDarkMode]);

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
      // Sauvegarder les paramètres dans le stockage
      await window.electronAPI.saveSettings(settings);
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      alert('Erreur lors de la sauvegarde des paramètres.');
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
          
          <div className="mb-4">
            <label htmlFor="primaryColor" className="block text-gray-700 dark:text-gray-300 mb-2">
              Couleur principale
            </label>
            <div className="flex items-center">
              <input
                type="color"
                id="primaryColor"
                value={settings.primaryColor}
                onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                className="w-10 h-10 rounded border-0"
              />
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                {settings.primaryColor}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Comportement</h2>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showCompletedTasks}
                onChange={(e) => handleSettingChange('showCompletedTasks', e.target.checked)}
                className="form-checkbox h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                Afficher les tâches terminées
              </span>
            </label>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
                className="form-checkbox h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                Activer les notifications
              </span>
            </label>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                className="form-checkbox h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                Sauvegarde automatique
              </span>
            </label>
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
          DashTo v1.0.0 - Une application de tableau de bord et de gestion de tâches moderne et personnalisable.
        </p>
      </div>
    </div>
  );
};

export default Settings; 