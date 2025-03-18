import React from 'react';
import { FiTrash2, FiEdit2, FiCheck, FiX } from 'react-icons/fi';

const TodoItem = ({
  todo,
  editingId,
  editText,
  setEditText,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onChangePriority
}) => {
  // Définir les couleurs de priorité
  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  // Définir les libellés de priorité
  const priorityLabels = {
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée'
  };

  return (
    <li className={`border-b border-gray-200 dark:border-gray-700 p-4 flex items-center ${
      todo.completed ? 'bg-gray-50 dark:bg-gray-900' : ''
    }`}>
      {/* Checkbox */}
      <div className="mr-3">
        <button
          onClick={() => onToggle(todo.id)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            todo.completed
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {todo.completed && <FiCheck size={14} />}
        </button>
      </div>

      {/* Contenu du todo */}
      <div className="flex-1">
        {editingId === todo.id ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-1 border-b-2 border-indigo-500 dark:border-indigo-400 bg-transparent outline-none"
            autoFocus
          />
        ) : (
          <div className="flex items-center">
            <span
              className={`${
                todo.completed
                  ? 'line-through text-gray-500 dark:text-gray-400'
                  : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {todo.text}
            </span>
            <span
              className={`ml-3 text-xs px-2 py-1 rounded-full ${priorityColors[todo.priority]}`}
            >
              {priorityLabels[todo.priority]}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center">
        {editingId === todo.id ? (
          <>
            <button
              onClick={onSaveEdit}
              className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
            >
              <FiCheck size={18} />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <FiX size={18} />
            </button>
          </>
        ) : (
          <>
            {/* Menu déroulant de priorité */}
            <select
              value={todo.priority}
              onChange={(e) => onChangePriority(todo.id, e.target.value)}
              className="mr-2 p-1 text-sm rounded border border-gray-300 dark:border-gray-700 bg-transparent"
            >
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Élevée</option>
            </select>
            
            <button
              onClick={() => onStartEdit(todo)}
              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <FiEdit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(todo.id)}
              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <FiTrash2 size={18} />
            </button>
          </>
        )}
      </div>
    </li>
  );
};

export default TodoItem; 