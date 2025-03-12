import React, { useState } from 'react';
import { FiHome, FiCheckSquare, FiSettings, FiMenu, FiShield, FiSearch, FiBookmark, FiChevronDown, FiChevronRight, FiDatabase } from 'react-icons/fi';

const Sidebar = ({ activeView, setActiveView }) => {
  console.log('Sidebar - Rendu, vue active:', activeView);
  
  const [collapsed, setCollapsed] = useState(false);
  const [exploitsMenuOpen, setExploitsMenuOpen] = useState(true);

  // Vérifier si une vue d'exploits est active
  const isExploitViewActive = activeView === 'exploitdb' || activeView === 'savedexploits';

  // Définir les éléments du menu principal
  const mainMenuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <FiHome size={20} /> },
    { id: 'todo', label: 'Tâches', icon: <FiCheckSquare size={20} /> },
    { id: 'vulnerabilities', label: 'Vulnérabilités', icon: <FiShield size={20} /> },
    { id: 'settings', label: 'Paramètres', icon: <FiSettings size={20} /> },
  ];

  // Définir les éléments du sous-menu Exploits
  const exploitsSubMenuItems = [
    { id: 'exploitdb', label: 'Recherche d\'Exploits', icon: <FiSearch size={18} /> },
    { id: 'savedexploits', label: 'Exploits Sauvegardés', icon: <FiBookmark size={18} /> },
  ];

  // Gérer le changement de vue
  const handleViewChange = (viewId) => {
    console.log('Sidebar - Changement de vue:', viewId);
    setActiveView(viewId);
  };

  // Basculer l'état du menu Exploits
  const toggleExploitsMenu = () => {
    if (collapsed) {
      // Si la sidebar est réduite, ouvrir directement la vue exploitdb
      handleViewChange('exploitdb');
    } else {
      setExploitsMenuOpen(!exploitsMenuOpen);
    }
  };

  return (
    <div 
      className={`sidebar bg-white dark:bg-gray-800 shadow-lg h-screen transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            DashTo
          </h1>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FiMenu size={20} />
        </button>
      </div>

      <nav className="mt-6">
        <ul>
          {/* Menu principal */}
          {mainMenuItems.map((item) => (
            <li key={item.id} className="mb-2">
              <button
                onClick={() => handleViewChange(item.id)}
                className={`flex items-center w-full p-3 ${
                  activeView === item.id
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                } transition-colors duration-200`}
              >
                <span className="mr-4">{item.icon}</span>
                {!collapsed && (
                  <span>{item.label}</span>
                )}
              </button>
            </li>
          ))}

          {/* Menu Exploits avec sous-menu */}
          <li className="mb-2">
            <button
              onClick={toggleExploitsMenu}
              className={`flex items-center w-full p-3 ${
                isExploitViewActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              } transition-colors duration-200`}
            >
              <span className="mr-4"><FiDatabase size={20} /></span>
              {!collapsed && (
                <>
                  <span className="flex-1">Exploits</span>
                  {exploitsMenuOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </>
              )}
            </button>

            {/* Sous-menu Exploits */}
            {(exploitsMenuOpen || collapsed) && (
              <ul className={`${collapsed ? 'pl-0' : 'pl-6'} mt-1`}>
                {exploitsSubMenuItems.map((item) => (
                  <li key={item.id} className="mb-1">
                    <button
                      onClick={() => handleViewChange(item.id)}
                      className={`flex items-center w-full p-2 rounded-md ${
                        activeView === item.id
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      } transition-colors duration-200`}
                    >
                      <span className={`${collapsed ? 'mx-auto' : 'mr-3'}`}>{item.icon}</span>
                      {!collapsed && (
                        <span className="text-sm">{item.label}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar; 