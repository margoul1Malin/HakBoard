import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';

const Notification = ({ type = 'success', message, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose();
      }, 300); // Délai pour l'animation de sortie
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900 border-green-500';
      case 'error':
        return 'bg-red-100 dark:bg-red-900 border-red-500';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900 border-blue-500';
      default:
        return 'bg-gray-100 dark:bg-gray-900 border-gray-500';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className={`${getTextColor()} mr-3`} size={20} />;
      case 'error':
      case 'warning':
        return <FiAlertCircle className={`${getTextColor()} mr-3`} size={20} />;
      default:
        return <FiCheckCircle className={`${getTextColor()} mr-3`} size={20} />;
    }
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg border-l-4 ${getBackgroundColor()} transition-all duration-300 ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
      }`}
      style={{ maxWidth: '400px' }}
    >
      {getIcon()}
      <div className={`flex-1 ${getTextColor()}`}>
        {message}
      </div>
      <button 
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(), 300);
        }}
        className={`ml-3 p-1 rounded-full hover:bg-white hover:bg-opacity-20 ${getTextColor()}`}
      >
        <FiX size={16} />
      </button>
    </div>
  );
};

export default Notification; 