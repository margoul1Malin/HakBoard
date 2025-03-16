import React, { useState, useEffect } from 'react';
import { FiHome, FiCheckSquare, FiSettings, FiMenu, FiSearch, FiBookmark, FiChevronDown, FiChevronRight, FiDatabase, FiLock, FiTarget, FiServer, FiWifi, FiMail, FiSend, FiPhone, FiEye, FiMessageSquare, FiShield, FiGlobe } from 'react-icons/fi';

const Sidebar = ({ activeView, setActiveView }) => {
  console.log('Sidebar - Rendu, vue active:', activeView);
  
  const [collapsed, setCollapsed] = useState(false);
  const [exploitsMenuOpen, setExploitsMenuOpen] = useState(false);
  const [targetsMenuOpen, setTargetsMenuOpen] = useState(false);
  const [scannerMenuOpen, setScannerMenuOpen] = useState(false);
  const [emailsMenuOpen, setEmailsMenuOpen] = useState(false);
  const [phonesMenuOpen, setPhonesMenuOpen] = useState(false);
  const [securityMenuOpen, setSecurityMenuOpen] = useState(false);
  const [iotSearchMenuOpen, setIotSearchMenuOpen] = useState(false);

  // Vérifier si une vue d'exploits est active
  const isExploitViewActive = activeView === 'exploitdb' || activeView === 'savedexploits';
  
  // Vérifier si une vue de cibles est active
  const isTargetViewActive = activeView === 'targets';
  
  // Vérifier si une vue de scanner est active
  const isScannerViewActive = activeView === 'networkScanner' || 
                             activeView === 'sqlyzer' || 
                             activeView === 'webalyzer' ||
                             activeView === 'ssl_tls';
  
  // Vérifier si une vue d'emails est active
  const isEmailViewActive = activeView === 'osintEmail' || activeView === 'phisher';
  
  // Vérifier si une vue de téléphones est active
  const isPhoneViewActive = activeView === 'phoneOsint' || activeView === 'smooding' || activeView === 'smishing';
  
  // Vérifier si une vue de sécurité est active
  const isSecurityViewActive = activeView === 'privesc';
  
  // Vérifier si une vue de recherche IoT est active
  const isIotSearchViewActive = activeView === 'shodan';

  // Ouvrir automatiquement le menu correspondant à la vue active
  useEffect(() => {
    if (isExploitViewActive) setExploitsMenuOpen(true);
    if (isTargetViewActive) setTargetsMenuOpen(true);
    if (isScannerViewActive) setScannerMenuOpen(true);
    if (isEmailViewActive) setEmailsMenuOpen(true);
    if (isPhoneViewActive) setPhonesMenuOpen(true);
    if (isSecurityViewActive) setSecurityMenuOpen(true);
    if (isIotSearchViewActive) setIotSearchMenuOpen(true);
  }, [activeView]);

  // Définir les éléments du menu principal
  const mainMenuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <FiHome size={20} /> },
    { id: 'todo', label: 'Tâches', icon: <FiCheckSquare size={20} /> },
    { id: 'vault', label: 'Coffre-fort', icon: <FiLock size={20} /> },
    { id: 'settings', label: 'Paramètres', icon: <FiSettings size={20} /> },
  ];

  // Définir les éléments du sous-menu Exploits
  const exploitsSubMenuItems = [
    { id: 'exploitdb', label: 'Recherche d\'Exploits', icon: <FiSearch size={18} /> },
    { id: 'savedexploits', label: 'Exploits Sauvegardés', icon: <FiBookmark size={18} /> },
  ];
  
  // Définir les éléments du sous-menu Cibles
  const targetsSubMenuItems = [
    { id: 'targets', label: 'Liste des Cibles', icon: <FiServer size={18} /> },
  ];
  
  // Définir les éléments du sous-menu Scanner
  const scannerSubMenuItems = [
    { id: 'networkScanner', label: 'Scanner Réseau', icon: <FiWifi size={18} /> },
    { id: 'sqlyzer', label: 'SQLyzer', icon: <FiDatabase size={18} /> },
    { id: 'webalyzer', label: 'WebAlyzer', icon: <FiSearch size={18} /> },
    { id: 'ssl_tls', label: 'SSL/TLS', icon: <FiLock size={18} /> },
  ];
  
  // Définir les éléments du sous-menu E-Mails
  const emailsSubMenuItems = [
    { id: 'osintEmail', label: 'OSINT', icon: <FiSearch size={18} /> },
    { id: 'phisher', label: 'Phisher', icon: <FiSend size={18} /> },
    { id: 'sender', label: 'Sender', icon: <FiMail size={18} /> },
  ];
  
  // Définir les éléments du sous-menu Téléphones
  const phonesSubMenuItems = [
    { id: 'phoneOsint', label: 'OSINT', icon: <FiSearch size={18} /> },
    { id: 'smooding', label: 'Smooding', icon: <FiMessageSquare size={18} /> },
    { id: 'smishing', label: 'Smishing', icon: <FiSend size={18} /> },
  ];
  
  // Définir les éléments du sous-menu Security
  const securitySubMenuItems = [
    { id: 'privesc', label: 'PrivEsc Check', icon: <FiShield size={18} /> },
  ];
  
  // Définir les éléments du sous-menu IoT Search
  const iotSearchSubMenuItems = [
    { id: 'shodan', label: 'Shodan', icon: <FiGlobe size={18} /> },
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
  
  // Basculer l'état du menu Cibles
  const toggleTargetsMenu = () => {
    if (collapsed) {
      // Si la sidebar est réduite, ouvrir directement la vue targets
      handleViewChange('targets');
    } else {
      setTargetsMenuOpen(!targetsMenuOpen);
    }
  };
  
  // Basculer l'état du menu Scanner
  const toggleScannerMenu = () => {
    if (collapsed) {
      // Si la sidebar est réduite, ouvrir directement la vue networkScanner
      handleViewChange('networkScanner');
    } else {
      setScannerMenuOpen(!scannerMenuOpen);
    }
  };
  
  // Basculer l'état du menu E-Mails
  const toggleEmailsMenu = () => {
    if (collapsed) {
      // Si la sidebar est réduite, ouvrir directement la vue osintEmail
      handleViewChange('osintEmail');
    } else {
      setEmailsMenuOpen(!emailsMenuOpen);
    }
  };
  
  // Basculer l'état du menu Téléphones
  const togglePhonesMenu = () => {
    if (collapsed) {
      // Si la sidebar est réduite, ouvrir directement la vue phoneOsint
      handleViewChange('phoneOsint');
    } else {
      setPhonesMenuOpen(!phonesMenuOpen);
    }
  };
  
  // Basculer l'état du menu Security
  const toggleSecurityMenu = () => {
    if (collapsed) {
      // Si la sidebar est réduite, ouvrir directement la vue privesc
      handleViewChange('privesc');
    } else {
      setSecurityMenuOpen(!securityMenuOpen);
    }
  };
  
  // Basculer l'état du menu IoT Search
  const toggleIotSearchMenu = () => {
    if (collapsed) {
      // Si la sidebar est réduite, ouvrir directement la vue shodan
      handleViewChange('shodan');
    } else {
      setIotSearchMenuOpen(!iotSearchMenuOpen);
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
            HakBoard
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
          
          {/* Menu Cibles avec sous-menu */}
          <li className="mb-2">
            <button
              onClick={toggleTargetsMenu}
              className={`flex items-center w-full p-3 ${
                isTargetViewActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              } transition-colors duration-200`}
            >
              <span className="mr-4"><FiTarget size={20} /></span>
              {!collapsed && (
                <>
                  <span className="flex-1">Cibles</span>
                  {targetsMenuOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </>
              )}
            </button>

            {/* Sous-menu Cibles */}
            {(targetsMenuOpen || collapsed) && (
              <ul className={`${collapsed ? 'pl-0' : 'pl-6'} mt-1`}>
                {targetsSubMenuItems.map((item) => (
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
          
          {/* Menu Scanner avec sous-menu */}
          <li className="mb-2">
            <button
              onClick={toggleScannerMenu}
              className={`flex items-center w-full p-3 ${
                isScannerViewActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              } transition-colors duration-200`}
            >
              <span className="mr-4"><FiEye size={20} /></span>
              {!collapsed && (
                <>
                  <span className="flex-1">Scanner</span>
                  {scannerMenuOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </>
              )}
            </button>

            {/* Sous-menu Scanner */}
            {(scannerMenuOpen || collapsed) && (
              <ul className={`${collapsed ? 'pl-0' : 'pl-6'} mt-1`}>
                {scannerSubMenuItems.map((item) => (
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
          
          {/* Menu E-Mails avec sous-menu */}
          <li className="mb-2">
            <button
              onClick={toggleEmailsMenu}
              className={`flex items-center w-full p-3 ${
                isEmailViewActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              } transition-colors duration-200`}
            >
              <span className="mr-4"><FiMail size={20} /></span>
              {!collapsed && (
                <>
                  <span className="flex-1">E-Mails</span>
                  {emailsMenuOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </>
              )}
            </button>

            {/* Sous-menu E-Mails */}
            {(emailsMenuOpen || collapsed) && (
              <ul className={`${collapsed ? 'pl-0' : 'pl-6'} mt-1`}>
                {emailsSubMenuItems.map((item) => (
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
          
          {/* Menu Téléphones avec sous-menu */}
          <li className="mb-2">
            <button
              onClick={togglePhonesMenu}
              className={`flex items-center w-full p-3 ${
                isPhoneViewActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              } transition-colors duration-200`}
            >
              <span className="mr-4"><FiPhone size={20} /></span>
              {!collapsed && (
                <>
                  <span className="flex-1">Téléphones</span>
                  {phonesMenuOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </>
              )}
            </button>

            {/* Sous-menu Téléphones */}
            {(phonesMenuOpen || collapsed) && (
              <ul className={`${collapsed ? 'pl-0' : 'pl-6'} mt-1`}>
                {phonesSubMenuItems.map((item) => (
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
          
          {/* Menu Security avec sous-menu */}
          <li className="mb-2">
            <button
              onClick={toggleSecurityMenu}
              className={`flex items-center w-full p-3 ${
                isSecurityViewActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              } transition-colors duration-200`}
            >
              <span className="mr-4"><FiShield size={20} /></span>
              {!collapsed && (
                <>
                  <span className="flex-1">Security</span>
                  {securityMenuOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </>
              )}
            </button>

            {/* Sous-menu Security */}
            {(securityMenuOpen || collapsed) && (
              <ul className={`${collapsed ? 'pl-0' : 'pl-6'} mt-1`}>
                {securitySubMenuItems.map((item) => (
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
          
          {/* Menu IoT Search avec sous-menu */}
          <li className="mb-2">
            <button
              onClick={toggleIotSearchMenu}
              className={`flex items-center justify-between w-full p-3 ${
                isIotSearchViewActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              } transition-colors duration-200`}
            >
              <div className="flex items-center">
                <span className="mr-4"><FiGlobe size={20} /></span>
                {!collapsed && (
                  <span>IoT Search</span>
                )}
              </div>
              {!collapsed && (
                <span>
                  {iotSearchMenuOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </span>
              )}
            </button>
            
            {/* Sous-menu IoT Search */}
            {iotSearchMenuOpen && !collapsed && (
              <ul className="ml-6 mt-2 space-y-2">
                {iotSearchSubMenuItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleViewChange(item.id)}
                      className={`flex items-center w-full p-2 ${
                        activeView === item.id
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-400'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      } transition-colors duration-200 rounded-md`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.label}</span>
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