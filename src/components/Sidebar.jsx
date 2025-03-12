import React, { useState } from 'react';
import { FiHome, FiCheckSquare, FiSettings, FiMenu, FiShield, FiSearch, FiBookmark } from 'react-icons/fi';

const Sidebar = ({ activeView, setActiveView }) => {
  console.log('Sidebar - Rendu, vue active:', activeView);
  
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <FiHome size={20} /> },
    { id: 'todo', label: 'Tâches', icon: <FiCheckSquare size={20} /> },
    { id: 'vulnerabilities', label: 'Vulnérabilités', icon: <FiShield size={20} /> },
    { id: 'exploitdb', label: 'Recherche Exploits', icon: <FiSearch size={20} /> },
    { id: 'savedexploits', label: 'Exploits Sauvegardés', icon: <FiBookmark size={20} /> },
    { id: 'settings', label: 'Paramètres', icon: <FiSettings size={20} /> },
  ];

  const handleViewChange = (viewId) => {
    console.log('Sidebar - Changement de vue:', viewId);
    setActiveView(viewId);
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
          {menuItems.map((item) => (
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
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar; 