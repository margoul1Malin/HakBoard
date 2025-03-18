import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiPlay, FiPause, FiTrash, FiPlus, FiInfo, FiAlertTriangle, FiList, FiX, FiCheck, FiTag } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Plannifyer = () => {
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États pour stocker les informations
  const [platform, setPlatform] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [taskList, setTaskList] = useState([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // Formulaire pour la nouvelle tâche
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCommand, setNewTaskCommand] = useState('');
  const [newTaskSchedule, setNewTaskSchedule] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  
  // Vérifier la plateforme au chargement du composant
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        setIsLoading(true);
        
        if (window.electronAPI && window.electronAPI.getPlatform) {
          const platformResult = await window.electronAPI.getPlatform();
          setPlatform(platformResult);
          
          // Charger les tâches planifiées
          loadTasks();
        } else {
          console.error('API Electron non disponible');
          showError('API Electron non disponible');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la plateforme:', error);
        showError(`Erreur: ${error.message || 'Une erreur est survenue'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPlatform();
  }, []);
  
  // Fonction pour charger les tâches planifiées
  const loadTasks = async () => {
    try {
      if (window.electronAPI && window.electronAPI.listScheduledTasks) {
        // Afficher un indicateur de chargement
        setIsLoading(true);
        
        // Récupérer les tâches planifiées
        const tasks = await window.electronAPI.listScheduledTasks();
        console.log('Tâches planifiées chargées:', tasks);
        
        // Mettre à jour l'état
        setTaskList(tasks || []);
      } else {
        console.error('API listScheduledTasks non disponible');
        showError('API listScheduledTasks non disponible');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tâches planifiées:', error);
      showError(`Erreur lors du chargement des tâches: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour ajouter une tâche planifiée
  const handleAddTask = async () => {
    try {
      // Vérifier si les champs obligatoires sont remplis
      if (!newTaskName) {
        showWarning('Veuillez spécifier un nom pour la tâche');
        return;
      }
      if (!newTaskCommand) {
        showWarning('Veuillez spécifier une commande à exécuter');
        return;
      }
      if (!newTaskSchedule) {
        showWarning('Veuillez spécifier une planification');
        return;
      }
      
      // Construire les données de la tâche
      const taskData = {
        name: newTaskName,
        command: newTaskCommand,
        schedule: newTaskSchedule,
        description: newTaskDescription || ''
      };
      
      if (window.electronAPI && window.electronAPI.addScheduledTask) {
        // Afficher un indicateur de chargement
        setIsLoading(true);
        
        // Ajouter la tâche planifiée
        const result = await window.electronAPI.addScheduledTask(taskData);
        console.log('Tâche planifiée ajoutée:', result);
        
        // Réinitialiser le formulaire
        setNewTaskName('');
        setNewTaskCommand('');
        setNewTaskSchedule('');
        setNewTaskDescription('');
        setIsCreatingTask(false);
        
        // Recharger les tâches
        await loadTasks();
        
        // Afficher un message de succès
        showSuccess('Tâche planifiée ajoutée avec succès');
      } else {
        console.error('API addScheduledTask non disponible');
        showError('API addScheduledTask non disponible');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la tâche planifiée:', error);
      showError(`Erreur lors de l'ajout de la tâche: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour supprimer une tâche planifiée
  const handleDeleteTask = async (task) => {
    try {
      // Demander confirmation avant de supprimer
      const confirmation = window.confirm(`Êtes-vous sûr de vouloir supprimer la tâche "${task.name}" ?`);
      if (!confirmation) {
        return;
      }
      
      if (window.electronAPI && window.electronAPI.deleteScheduledTask) {
        // Afficher un indicateur de chargement
        setIsLoading(true);
        
        // Supprimer la tâche planifiée
        const result = await window.electronAPI.deleteScheduledTask(task);
        console.log('Tâche planifiée supprimée:', result);
        
        // Recharger les tâches
        await loadTasks();
        
        // Afficher un message de succès
        showSuccess('Tâche planifiée supprimée avec succès');
      } else {
        console.error('API deleteScheduledTask non disponible');
        showError('API deleteScheduledTask non disponible');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche planifiée:', error);
      showError(`Erreur lors de la suppression de la tâche: ${error.message || 'Une erreur est survenue'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Rendu conditionnel en fonction du chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">
        Plannifyer - Gestionnaire de Tâches Planifiées
      </h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 sm:mb-0">Tâches Planifiées</h2>
          <div className="flex space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm">
              Plateforme: {platform === 'win32' ? 'Windows' : 'Linux'}
            </span>
            <button
              onClick={() => setIsCreatingTask(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
            >
              <FiPlus className="mr-2" /> Nouvelle Tâche
            </button>
          </div>
        </div>
        
        {taskList.length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md text-center text-gray-600 dark:text-gray-300">
            <FiInfo className="mx-auto mb-2" size={24} />
            <p>Aucune tâche planifiée trouvée. Cliquez sur "Nouvelle Tâche" pour en créer une.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nom/Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Planification
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Commande
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {taskList.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-850">
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          {task.name}
                          {task.isFromApp && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full">
                              App
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                          {task.description || 'Aucune description'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-mono break-words">
                        {task.schedule}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-mono break-all max-w-[300px]">
                        {task.command}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleDeleteTask(task)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                        title="Supprimer"
                      >
                        <FiTrash size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Section d'aide améliorée */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md">
        <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-3">Guide de planification des tâches</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-600 dark:text-blue-300 mb-2">Format Linux (cron)</h4>
            <pre className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded text-sm overflow-x-auto whitespace-pre">
{`* * * * *
│ │ │ │ │
│ │ │ │ └─ Jour de la semaine (0-7, 0 et 7 = dimanche)
│ │ │ └─── Mois (1-12)
│ │ └───── Jour du mois (1-31)
│ └─────── Heure (0-23)
└───────── Minute (0-59)`}
            </pre>
            <div className="text-sm text-blue-600 dark:text-blue-300 mt-2 space-y-1">
              <p className="font-semibold">Exemples courants:</p>
              <div className="grid grid-cols-2 gap-2">
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">0 * * * *</code>
                <span>Toutes les heures (à 0 minute)</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">0 0 * * *</code>
                <span>Tous les jours à minuit</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">*/5 * * * *</code>
                <span>Toutes les 5 minutes</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">0 9 * * 1-5</code>
                <span>En semaine à 9h00</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">0 0 1 * *</code>
                <span>Le 1er de chaque mois</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-blue-600 dark:text-blue-300 mb-2">Format Windows</h4>
            <div className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
              <p className="font-semibold mb-2">Formats simplifiés pour Windows:</p>
              <div className="grid grid-cols-2 gap-2">
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">MINUTE:15</code>
                <span>Toutes les 15 minutes</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">HOURLY</code>
                <span>Toutes les heures</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">DAILY</code>
                <span>Tous les jours (à minuit)</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">WEEKLY</code>
                <span>Toutes les semaines (dimanche)</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">MONTHLY</code>
                <span>Tous les mois (1er jour)</span>
                
                <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">STARTUP</code>
                <span>Au démarrage du système</span>
              </div>
              
              <p className="font-semibold mt-4 mb-2">Format avancé:</p>
              <p className="mb-1">Pour des planifications plus précises, utilisez:</p>
              <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded block mb-1">
                /sc DAILY /st 14:00
              </code>
              <span>Signifie: tous les jours à 14h00</span>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 p-3 rounded">
          <p className="flex items-center"><FiInfo className="mr-2" /> <strong>Conseil:</strong> Pour les tâches sensibles, utilisez des chemins absolus pour les commandes et vérifiez les permissions.</p>
        </div>
      </div>
      
      {/* Modal pour ajouter une tâche */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Nouvelle Tâche Planifiée
              </h3>
              <button
                onClick={() => setIsCreatingTask(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="Nom de la tâche"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Commande *
                </label>
                <input
                  type="text"
                  value={newTaskCommand}
                  onChange={(e) => setNewTaskCommand(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="Commande à exécuter"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Utilisez un chemin absolu pour plus de fiabilité (ex: /usr/bin/script.sh ou C:\scripts\backup.bat)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planification *
                </label>
                <input
                  type="text"
                  value={newTaskSchedule}
                  onChange={(e) => setNewTaskSchedule(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder={platform === 'win32' ? "HOURLY, DAILY, etc." : "* * * * *"}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {platform === 'win32' ? 
                    "Formats: HOURLY, DAILY, WEEKLY, MONTHLY, STARTUP, MINUTE:30, etc." : 
                    "Format cron: * * * * * (minute heure jour mois jour_semaine)"}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows="3"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 dark:bg-gray-700"
                  placeholder="Description de la tâche (optionnel)"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsCreatingTask(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plannifyer; 