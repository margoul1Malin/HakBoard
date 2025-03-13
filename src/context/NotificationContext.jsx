import React, { createContext, useState, useContext } from 'react';
import Notification from '../components/common/Notification';

// Création du contexte
const NotificationContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useNotification = () => useContext(NotificationContext);

// Fonction pour générer un ID unique
const generateUniqueId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Fournisseur du contexte
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Ajouter une notification
  const addNotification = (message, type = 'success', duration = 3000) => {
    const id = generateUniqueId();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    return id;
  };

  // Supprimer une notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Fonctions d'aide pour différents types de notifications
  const showSuccess = (message, duration) => addNotification(message, 'success', duration);
  const showError = (message, duration) => addNotification(message, 'error', duration);
  const showWarning = (message, duration) => addNotification(message, 'warning', duration);
  const showInfo = (message, duration) => addNotification(message, 'info', duration);

  return (
    <NotificationContext.Provider 
      value={{ 
        addNotification, 
        removeNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo
      }}
    >
      {children}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            message={notification.message}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 