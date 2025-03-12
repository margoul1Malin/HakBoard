import React from 'react';

const TestComponent = () => {
  console.log('TestComponent - Rendu');
  
  return React.createElement(
    'div',
    { className: "test-component" },
    React.createElement(
      'h1',
      { className: "text-3xl font-bold mb-6" },
      "Composant de Test"
    ),
    React.createElement(
      'div',
      { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6" },
      React.createElement(
        'p',
        { className: "text-gray-600 dark:text-gray-400 mb-4" },
        "Ce composant est un test simple sans dépendances."
      ),
      React.createElement(
        'div',
        { className: "border-t border-gray-200 dark:border-gray-700 pt-4 mt-4" },
        React.createElement(
          'h2',
          { className: "text-xl font-bold mb-4" },
          "Test de rendu"
        ),
        React.createElement(
          'button',
          { 
            className: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md",
            onClick: () => console.log('Bouton cliqué')
          },
          "Cliquez-moi"
        )
      )
    )
  );
};

export default TestComponent; 