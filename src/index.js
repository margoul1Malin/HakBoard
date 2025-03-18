// Ajout d'un log pour le débogage
console.log('Application démarrée');

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import NotificationProvider from './context/NotificationContext';

// Créer la racine React
const root = ReactDOM.createRoot(document.getElementById('root'));

// Rendre l'application
root.render(
  <NotificationProvider>
    <App />
  </NotificationProvider>
); 