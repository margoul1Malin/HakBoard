import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TodoList from './components/TodoList';
import Settings from './components/Settings';
import ExploitDbSearch from './components/exploitdb/ExploitDbSearch';
import SavedExploits from './components/exploitdb/SavedExploits';
import Vault from './components/vault/Vault';
import TargetsList from './components/targets/TargetsList';
import TestComponent from './components/TestComponent';
import NetworkScanner from './components/scanner/NetworkScanner';
import SQLyzer from './components/scanner/SQLyzer';
import WebAlyzer from './components/scanner/WebAlyzer';
import OsintEmail from './components/emails/osintEmail';
import Phisher from './components/emails/Phisher';
import PhoneOsint from './components/phones/phoneOsint';
import Smooding from './components/phones/Smooding';
import Smishing from './components/phones/Smishing';
import './styles/App.css';

const App = () => {
  console.log('App - Rendu');
  
  // État pour suivre la vue active
  const [activeView, setActiveView] = useState('dashboard');
  // État pour le thème (clair/sombre)
  const [darkMode, setDarkMode] = useState(false);
  
  // Effet pour charger le thème sauvegardé au démarrage
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        // Vérifier si l'API Electron est disponible
        if (window.electronAPI && window.electronAPI.getSettings) {
          const settings = await window.electronAPI.getSettings();
          if (settings && settings.darkMode !== undefined) {
            console.log('Thème chargé depuis les paramètres:', settings.darkMode ? 'sombre' : 'clair');
            setDarkMode(settings.darkMode);
          }
        } else {
          console.warn('API Electron non disponible pour charger les paramètres');
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      }
    };
    
    loadSavedTheme();
  }, []);
  
  // Effet pour appliquer le thème
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Effet pour logger le changement de vue
  useEffect(() => {
    console.log('App - Vue active changée:', activeView);
  }, [activeView]);

  // Fonction pour rendre la vue active
  const renderActiveView = () => {
    console.log('Rendering active view:', activeView);
    
    switch (activeView) {
      case 'dashboard':
        console.log('App - Rendu du Dashboard');
        return <Dashboard />;
      case 'todo':
        console.log('App - Rendu du TodoList');
        return <TodoList />;
      case 'settings':
        console.log('App - Rendu des Settings');
        return <Settings darkMode={darkMode} setDarkMode={setDarkMode} />;
      case 'exploitdb':
        console.log('Rendering ExploitDbSearch component');
        return <ExploitDbSearch />;
      case 'savedexploits':
        console.log('App - Rendu du SavedExploits');
        console.log('SavedExploits disponible:', !!SavedExploits);
        return <SavedExploits />;
      case 'vault':
        console.log('Rendering Vault component');
        return <Vault />;
      case 'targets':
        console.log('Rendering TargetsList component');
        return <TargetsList />;
      case 'networkScanner':
        console.log('Rendering NetworkScanner component');
        return <NetworkScanner />;
      case 'sqlyzer':
        console.log('Rendering SQLyzer component');
        return <SQLyzer />;
      case 'webalyzer':
        console.log('Rendering WebAlyzer component');
        return <WebAlyzer />;
      case 'osintEmail':
        console.log('Rendering OsintEmail component');
        return <OsintEmail />;
      case 'phisher':
        console.log('Rendering Phisher component');
        return <Phisher />;
      case 'phoneOsint':
        console.log('Rendering PhoneOsint component');
        return <PhoneOsint />;
      case 'smooding':
        console.log('Rendering Smooding component');
        return <Smooding />;
      case 'smishing':
        console.log('Rendering Smishing component');
        return <Smishing />;
      case 'test':
        console.log('App - Rendu du TestComponent');
        return <TestComponent />;
      default:
        console.log('App - Rendu par défaut (Dashboard)');
        return <Dashboard />;
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 p-6 overflow-auto">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default App; 