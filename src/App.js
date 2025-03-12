const React = require('react');
const { useState, useEffect } = React;
const { motion } = require('framer-motion');
const Sidebar = require('./components/Sidebar').default;
const Dashboard = require('./components/Dashboard').default;
const TodoList = require('./components/TodoList').default;
const Settings = require('./components/Settings').default;
const SimpleVulnerabilityManager = require('./components/vulnerabilities/SimpleVulnerabilityManager').default;
const ExploitDbSearch = require('./components/exploitdb/ExploitDbSearch').default;
const TestComponent = require('./components/TestComponent').default;
require('./styles/App.css');

const App = () => {
  console.log('App - Rendu');
  
  // État pour suivre la vue active
  const [activeView, setActiveView] = useState('exploitdb');
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
    console.log('App - renderActiveView - Vue active:', activeView);
    
    switch (activeView) {
      case 'dashboard':
        console.log('App - Rendu du Dashboard');
        return React.createElement(Dashboard);
      case 'todo':
        console.log('App - Rendu du TodoList');
        return React.createElement(TodoList);
      case 'settings':
        console.log('App - Rendu des Settings');
        return React.createElement(Settings, { darkMode, setDarkMode });
      case 'vulnerabilities':
        console.log('App - Rendu du SimpleVulnerabilityManager');
        console.log('SimpleVulnerabilityManager disponible:', !!SimpleVulnerabilityManager);
        return React.createElement(SimpleVulnerabilityManager);
      case 'exploitdb':
        console.log('App - Rendu du ExploitDbSearch');
        console.log('ExploitDbSearch disponible:', !!ExploitDbSearch);
        return React.createElement(ExploitDbSearch);
      case 'test':
        console.log('App - Rendu du TestComponent');
        return React.createElement(TestComponent);
      default:
        console.log('App - Rendu par défaut (Dashboard)');
        return React.createElement(Dashboard);
    }
  };

  return React.createElement(
    'div',
    { className: "app-container h-screen flex overflow-hidden" },
    React.createElement(Sidebar, { activeView, setActiveView }),
    React.createElement(
      motion.main,
      {
        className: "flex-1 overflow-y-auto p-6",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3 }
      },
      renderActiveView()
    )
  );
};

module.exports = { default: App }; 