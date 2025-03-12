import React, { useState, useEffect } from 'react';
import { FiPlus, FiFilter } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import TodoItem from './TodoItem.jsx';

const TodoList = () => {
  // État pour les todos
  const [todos, setTodos] = useState([]);
  // État pour le nouveau todo
  const [newTodo, setNewTodo] = useState('');
  // État pour le filtre
  const [filter, setFilter] = useState('all');
  // État pour le mode édition
  const [editingId, setEditingId] = useState(null);
  // État pour le texte d'édition
  const [editText, setEditText] = useState('');
  // État pour le chargement
  const [loading, setLoading] = useState(true);

  // Charger les todos au démarrage
  useEffect(() => {
    const loadTodos = async () => {
      try {
        setLoading(true);
        // Récupérer les todos depuis le stockage
        const storedTodos = await window.electronAPI.getTodos();
        
        if (storedTodos && storedTodos.length > 0) {
          setTodos(storedTodos);
        } else {
          // Données de démonstration si aucun todo n'est trouvé
          const demoTodos = [
            { id: uuidv4(), text: 'Créer un design moderne', completed: true, priority: 'high' },
            { id: uuidv4(), text: 'Implémenter la fonctionnalité de drag and drop', completed: false, priority: 'medium' },
            { id: uuidv4(), text: 'Ajouter le mode sombre', completed: false, priority: 'low' },
            { id: uuidv4(), text: 'Optimiser les performances', completed: false, priority: 'high' },
          ];
          setTodos(demoTodos);
          
          // Sauvegarder les todos de démonstration
          for (const todo of demoTodos) {
            await window.electronAPI.addTodo(todo);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des todos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, []);

  // Filtrer les todos
  const filteredTodos = todos.filter(todo => {
    if (filter === 'all') return true;
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  // Ajouter un nouveau todo
  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (newTodo.trim() === '') return;

    const todo = {
      id: uuidv4(),
      text: newTodo,
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString()
    };

    try {
      await window.electronAPI.addTodo(todo);
      setTodos([...todos, todo]);
      setNewTodo('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du todo:', error);
    }
  };

  // Supprimer un todo
  const handleDeleteTodo = async (id) => {
    try {
      await window.electronAPI.deleteTodo(id);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression du todo:', error);
    }
  };

  // Basculer l'état d'un todo
  const handleToggleTodo = async (id) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;

      const updatedTodo = { ...todoToUpdate, completed: !todoToUpdate.completed };
      await window.electronAPI.updateTodo(updatedTodo);
      
      setTodos(
        todos.map(todo =>
          todo.id === id ? updatedTodo : todo
        )
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour du todo:', error);
    }
  };

  // Commencer l'édition d'un todo
  const handleStartEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  // Sauvegarder l'édition d'un todo
  const handleSaveEdit = async () => {
    if (editText.trim() === '') return;

    try {
      const todoToUpdate = todos.find(todo => todo.id === editingId);
      if (!todoToUpdate) return;

      const updatedTodo = { ...todoToUpdate, text: editText };
      await window.electronAPI.updateTodo(updatedTodo);
      
      setTodos(
        todos.map(todo =>
          todo.id === editingId ? updatedTodo : todo
        )
      );
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'édition:', error);
    }
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Changer la priorité d'un todo
  const handleChangePriority = async (id, priority) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;

      const updatedTodo = { ...todoToUpdate, priority };
      await window.electronAPI.updateTodo(updatedTodo);
      
      setTodos(
        todos.map(todo =>
          todo.id === id ? updatedTodo : todo
        )
      );
    } catch (error) {
      console.error('Erreur lors du changement de priorité:', error);
    }
  };

  if (loading) {
    return (
      <div className="todo-list">
        <h1 className="text-2xl font-bold mb-6">Gestion des tâches</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">Chargement des tâches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="todo-list">
      <h1 className="text-2xl font-bold mb-6">Gestion des tâches</h1>
      
      {/* Formulaire d'ajout */}
      <form 
        onSubmit={handleAddTodo}
        className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex"
      >
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Ajouter une nouvelle tâche..."
          className="flex-1 p-2 border-b-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none"
        />
        <button
          type="submit"
          className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-md flex items-center"
        >
          <FiPlus size={20} />
          <span className="ml-1">Ajouter</span>
        </button>
      </form>
      
      {/* Filtres */}
      <div className="flex items-center mb-4">
        <FiFilter className="mr-2 text-gray-500" />
        <span className="mr-2 text-gray-600 dark:text-gray-400">Filtrer:</span>
        <button
          onClick={() => setFilter('all')}
          className={`mr-2 px-3 py-1 rounded-md ${
            filter === 'all'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`mr-2 px-3 py-1 rounded-md ${
            filter === 'active'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Actives
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1 rounded-md ${
            filter === 'completed'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Terminées
        </button>
      </div>
      
      {/* Liste des todos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredTodos.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Aucune tâche à afficher
          </div>
        ) : (
          <ul>
            {filteredTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                editingId={editingId}
                editText={editText}
                setEditText={setEditText}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onChangePriority={handleChangePriority}
              />
            ))}
          </ul>
        )}
      </div>
      
      {/* Statistiques */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>
          {todos.filter(todo => !todo.completed).length} tâches restantes sur {todos.length} au total
        </p>
      </div>
    </div>
  );
};

export default TodoList; 