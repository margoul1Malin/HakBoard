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
  const [confirmDialogs, setConfirmDialogs] = useState([]);

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
  
  // Fonction pour afficher une boîte de dialogue de confirmation
  const showConfirm = (message, onConfirm, onCancel) => {
    const id = generateUniqueId();
    setConfirmDialogs(prev => [...prev, { id, message, onConfirm, onCancel }]);
    return id;
  };
  
  // Fonction pour fermer une boîte de dialogue de confirmation
  const closeConfirmDialog = (id, confirmed) => {
    const dialog = confirmDialogs.find(d => d.id === id);
    if (dialog) {
      if (confirmed && dialog.onConfirm) {
        dialog.onConfirm();
      } else if (!confirmed && dialog.onCancel) {
        dialog.onCancel();
      }
    }
    setConfirmDialogs(prev => prev.filter(d => d.id !== id));
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        addNotification, 
        removeNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm
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
      
      {/* Boîtes de dialogue de confirmation */}
      {confirmDialogs.map(dialog => (
        <div key={dialog.id} className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <p className="text-gray-800 dark:text-gray-200 mb-6">{dialog.message}</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => closeConfirmDialog(dialog.id, false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={() => closeConfirmDialog(dialog.id, true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      ))}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 