const React = require('react');
const { useState, useEffect } = React;
const { motion } = require('framer-motion');
const Sidebar = require('./components/Sidebar').default;
const Dashboard = require('./components/Dashboard').default;
const TodoList = require('./components/TodoList').default;
const Settings = require('./components/Settings').default;
const SimpleVulnerabilityManager = require('./components/vulnerabilities/SimpleVulnerabilityManager').default;
const ExploitDbSearch = require('./components/exploitdb/ExploitDbSearch').default;
const SavedExploits = require('./components/exploitdb/SavedExploits').default;
const Vault = require('./components/vault/Vault').default;
const TargetsList = require('./components/targets/TargetsList').default;
const TestComponent = require('./components/TestComponent').default;
const NetworkScanner = require('./components/scanner/NetworkScanner').default;
require('./styles/App.css');

const App = () => {
  console.log('App - Rendu');
  
  // État pour suivre la vue active
  const [activeView, setActiveView] = useState('dashboard');
  // État pour le thème (clair/sombre)
  const [darkMode, setDarkMode] = useState(false);
  // État pour les menus déroulants
  const [dropdowns, setDropdowns] = useState({
    scanTools: false,
    targets: false
  });
  
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

  // Fonction pour basculer l'état d'un menu déroulant
  const toggleDropdown = (dropdownName) => {
    setDropdowns({
      ...dropdowns,
      [dropdownName]: !dropdowns[dropdownName]
    });
  };

  // Fonction pour rendre la vue active
  const renderActiveView = () => {
    console.log('Rendering active view:', activeView);
    
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
        console.log('Rendering ExploitDbSearch component');
        return React.createElement(ExploitDbSearch);
      case 'savedexploits':
        console.log('App - Rendu du SavedExploits');
        console.log('SavedExploits disponible:', !!SavedExploits);
        return React.createElement(SavedExploits);
      case 'vault':
        console.log('Rendering Vault component');
        return React.createElement(Vault);
      case 'targets':
        console.log('Rendering TargetsList component');
        return React.createElement(TargetsList);
      case 'networkScanner':
        console.log('Rendering NetworkScanner component');
        return React.createElement(NetworkScanner);
      case 'test':
        console.log('App - Rendu du TestComponent');
        return React.createElement(TestComponent);
      default:
        console.log('App - Rendu par défaut (Dashboard)');
        return React.createElement(Dashboard);
    }
  };

  // Fonction pour rendre la barre latérale
  const renderSidebar = () => {
    return React.createElement('div', { className: 'sidebar' },
      React.createElement('div', { className: 'sidebar-header' },
        React.createElement('h2', null, 'DashTo')
      ),
      React.createElement('ul', { className: 'sidebar-menu' },
        React.createElement('li', { 
          className: activeView === 'dashboard' ? 'active' : '',
          onClick: () => setActiveView('dashboard')
        }, 'Dashboard'),
        
        // Menu déroulant pour les outils de scan
        React.createElement('li', { className: 'dropdown' },
          React.createElement('div', { 
            className: 'dropdown-header',
            onClick: () => toggleDropdown('scanTools')
          }, 
            React.createElement('span', null, 'Outils de Scan'),
            React.createElement('i', { className: `fas fa-chevron-${dropdowns.scanTools ? 'up' : 'down'}` })
          ),
          React.createElement('ul', { 
            className: `dropdown-menu ${dropdowns.scanTools ? 'open' : ''}` 
          },
            React.createElement('li', { 
              className: activeView === 'networkScanner' ? 'active' : '',
              onClick: () => setActiveView('networkScanner')
            }, 'Scanner Réseau')
          )
        ),
        
        // Menu déroulant pour les cibles
        React.createElement('li', { className: 'dropdown' },
          React.createElement('div', { 
            className: 'dropdown-header',
            onClick: () => toggleDropdown('targets')
          }, 
            React.createElement('span', null, 'Cibles'),
            React.createElement('i', { className: `fas fa-chevron-${dropdowns.targets ? 'up' : 'down'}` })
          ),
          React.createElement('ul', { 
            className: `dropdown-menu ${dropdowns.targets ? 'open' : ''}` 
          },
            React.createElement('li', { 
              className: activeView === 'targets' ? 'active' : '',
              onClick: () => setActiveView('targets')
            }, 'Liste des Cibles')
          )
        ),
        
        React.createElement('li', { 
          className: activeView === 'exploitdb' ? 'active' : '',
          onClick: () => setActiveView('exploitdb')
        }, 'Exploit-DB'),
        
        React.createElement('li', { 
          className: activeView === 'savedexploits' ? 'active' : '',
          onClick: () => setActiveView('savedexploits')
        }, 'Exploits Sauvegardés'),
        
        React.createElement('li', { 
          className: activeView === 'vault' ? 'active' : '',
          onClick: () => setActiveView('vault')
        }, 'Coffre Fort'),
        
        React.createElement('li', { 
          className: activeView === 'settings' ? 'active' : '',
          onClick: () => setActiveView('settings')
        }, 'Paramètres')
      )
    );
  };

  return React.createElement(
    'div',
    { className: `app ${darkMode ? 'dark-mode' : 'light-mode'}` },
    renderSidebar(),
    React.createElement(
      'div',
      { className: 'main-content' },
      renderActiveView()
    )
  );
};

module.exports = { default: App }; 