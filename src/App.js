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
import Sender from './components/emails/Sender';
import PhoneOsint from './components/phones/phoneOsint';
import Smooding from './components/phones/Smooding';
import Smishing from './components/phones/Smishing';
import PrivEsc from './components/security/PrivEsc';
import Scan_SSL_TLS from './components/scanner/Scan_SSL_TLS';
import Shodan from './components/iot/Shodan';
import ZoomEye from './components/iot/ZoomEye';
import ZAPScanner from './components/scanner/ZAPScanner';
import Hydra from './components/BruteForce/Hydra';
import JohnTheRipper from './components/BruteForce/JohnTheRipper';
import Plannifyer from './components/SystemPlanning/Plannifyer';
import ScriptGarbage from './components/SystemPlanning/ScriptGarbage';
import Exifyer from './components/Miscellaneous/Exifyer';
import VirusTotal from './components/Miscellaneous/VirusTotal';
import Shark from './components/Sniffing/Shark';
import './styles/App.css';

const App = () => {
  console.log('App - Rendu');
  
  // État pour suivre la vue active
  const [activeView, setActiveView] = useState('dashboard');
  // État pour le thème (clair/sombre)
  const [darkMode, setDarkMode] = useState(false);
  
  // Rendre la fonction setActiveView disponible globalement
  useEffect(() => {
    window.setActiveView = setActiveView;
    
    // Nettoyer lors du démontage du composant
    return () => {
      delete window.setActiveView;
    };
  }, []);
  
  // Effet pour charger le thème sauvegardé au démarrage
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        console.log('App - Chargement du thème sauvegardé');
        
        // Essayer d'abord electron-store (méthode principale)
        if (window.electronAPI && window.electronAPI.getStoreValue) {
          console.log('App - Tentative de chargement du thème depuis electron-store');
          const settings = await window.electronAPI.getStoreValue('app_settings');
          if (settings && settings.darkMode !== undefined) {
            console.log('App - Thème chargé depuis electron-store:', settings.darkMode ? 'sombre' : 'clair');
            setDarkMode(settings.darkMode);
            return; // Si on a trouvé le thème, on arrête ici
          } else {
            console.log('App - Aucun thème trouvé dans electron-store');
          }
        }
        
        // Fallback sur le localStorage via getSettings
        if (window.electronAPI && window.electronAPI.getSettings) {
          console.log('App - Tentative de chargement du thème depuis localStorage');
          const settings = await window.electronAPI.getSettings();
          if (settings && settings.darkMode !== undefined) {
            console.log('App - Thème chargé depuis localStorage:', settings.darkMode ? 'sombre' : 'clair');
            setDarkMode(settings.darkMode);
            
            // Migrer le paramètre vers electron-store
            if (window.electronAPI.setStoreValue) {
              console.log('App - Migration du thème vers electron-store');
              await window.electronAPI.setStoreValue('app_settings', settings);
            }
          } else {
            console.log('App - Aucun thème trouvé dans localStorage');
          }
        } else {
          console.warn('App - API Electron non disponible pour charger les paramètres');
        }
      } catch (error) {
        console.error('App - Erreur lors du chargement du thème:', error);
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
      case 'sender':
        console.log('Rendering Sender component');
        return <Sender />;
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
      case 'privesc':
        console.log('Rendering PrivEsc component');
        return <PrivEsc />;
      case 'ssl_tls':
        console.log('Rendering SSL/TLS scanner component');
        return <Scan_SSL_TLS />;
      case 'zapscanner':
        console.log('Rendering OWASP ZAP scanner component');
        return <ZAPScanner />;
      case 'shodan':
        console.log('Rendering Shodan component');
        return <Shodan />;
      case 'zoomeye':
        console.log('Rendering ZoomEye component');
        return <ZoomEye />;
      case 'hydra':
        console.log('Rendering Hydra component');
        return <Hydra />;
      case 'john':
        console.log('Rendering John The Ripper component');
        return <JohnTheRipper />;
      case 'plannifyer':
        console.log('Rendering Plannifyer component');
        return <Plannifyer />;
      case 'scriptgarbage':
        console.log('Rendering Script Garbage component');
        return <ScriptGarbage />;
      case 'exifyer':
        return <Exifyer />;
      case 'virustotal':
        return <VirusTotal />;
      case 'shark':
        console.log('App - Rendu de Shark');
        return <Shark />;
      default:
        console.log('App - Vue non reconnue, affichage du Dashboard');
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