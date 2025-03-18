import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

const Dashboard = () => {
  // Données pour les statistiques
  const [stats, setStats] = useState({
    completed: 0,
    inProgress: 0,
    pending: 0,
    total: 0
  });
  // État pour le chargement
  const [loading, setLoading] = useState(true);

  // Charger les données au démarrage
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        // Récupérer les todos depuis le stockage
        const todos = await window.electronAPI.getTodos();
        
        if (todos && todos.length > 0) {
          // Calculer les statistiques
          const completed = todos.filter(todo => todo.completed).length;
          const inProgress = todos.filter(todo => !todo.completed && todo.priority === 'medium').length;
          const pending = todos.filter(todo => !todo.completed && todo.priority !== 'medium').length;
          const total = todos.length;
          
          setStats({
            completed,
            inProgress,
            pending,
            total
          });
        } else {
          // Valeurs par défaut si aucun todo n'est trouvé
          setStats({
            completed: 0,
            inProgress: 0,
            pending: 0,
            total: 0
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-3 mr-4">
            <FiCheckCircle className="text-green-500 dark:text-green-300" size={24} />
          </div>
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Tâches terminées</h3>
            <p className="text-2xl font-semibold">{stats.completed}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3 mr-4">
            <FiClock className="text-blue-500 dark:text-blue-300" size={24} />
          </div>
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Tâches en cours</h3>
            <p className="text-2xl font-semibold">{stats.inProgress}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-3 mr-4">
            <FiAlertCircle className="text-orange-500 dark:text-orange-300" size={24} />
          </div>
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Tâches en attente</h3>
            <p className="text-2xl font-semibold">{stats.pending}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Progression</h2>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
          <div 
            className="bg-indigo-600 h-4 rounded-full" 
            style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
          ></div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {stats.completed} sur {stats.total} tâches terminées ({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
        </p>
      </div>
    </div>
  );
};

export default Dashboard; 