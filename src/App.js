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
import './styles/App.css';

const App = () => {
  console.log('App - Rendu');
  
  // État pour suivre la vue active
  const [activeView, setActiveView] = useState('dashboard');
  // État pour le thème (clair/sombre)
  const [darkMode, setDarkMode] = useState(false);
  
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