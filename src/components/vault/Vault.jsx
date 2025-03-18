import React, { useState, useEffect } from 'react';
import { 
  isVaultInitialized, 
  initializeVault, 
  verifyMasterPassword, 
  getVaultItems, 
  addVaultItem, 
  updateVaultItem, 
  deleteVaultItem 
} from '../../services/vaultService';
import './Vault.css';

const Vault = () => {
  const [initialized, setInitialized] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [vaultItems, setVaultItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    type: 'password' // password, api_key, etc.
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState({});

  // Vérifier si le coffre-fort est initialisé
  useEffect(() => {
    const checkVaultInitialized = () => {
      const initialized = isVaultInitialized();
      setInitialized(initialized);
    };

    checkVaultInitialized();
  }, []);

  // Initialiser le coffre-fort
  const handleInitializeVault = (e) => {
    e.preventDefault();
    
    if (newMasterPassword !== confirmMasterPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const result = initializeVault(newMasterPassword);
    
    if (result.success) {
      setInitialized(true);
      setSuccess('Coffre-fort initialisé avec succès.');
      setError('');
      setNewMasterPassword('');
      setConfirmMasterPassword('');
    } else {
      setError(result.message);
    }
  };

  // Déverrouiller le coffre-fort
  const handleUnlockVault = (e) => {
    e.preventDefault();
    
    if (verifyMasterPassword(masterPassword)) {
      const result = getVaultItems(masterPassword);
      
      if (result.success) {
        setVaultItems(result.data);
        setUnlocked(true);
        setError('');
      } else {
        setError(result.message);
      }
    } else {
      setError('Mot de passe incorrect.');
    }
  };

  // Verrouiller le coffre-fort
  const handleLockVault = () => {
    setUnlocked(false);
    setMasterPassword('');
    setVaultItems([]);
    setSelectedItem(null);
    setShowAddForm(false);
    setShowPasswordForm(false);
  };

  // Ajouter un nouvel élément
  const handleAddItem = (e) => {
    e.preventDefault();
    
    if (!newItem.title) {
      setError('Le titre est requis.');
      return;
    }

    const result = addVaultItem(masterPassword, newItem);
    
    if (result.success) {
      setVaultItems([...vaultItems, result.data]);
      setNewItem({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        type: 'password'
      });
      setShowAddForm(false);
      setSuccess('Élément ajouté avec succès.');
      setError('');
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } else {
      setError(result.message);
    }
  };

  // Mettre à jour un élément
  const handleUpdateItem = (e) => {
    e.preventDefault();
    
    if (!selectedItem || !selectedItem.id) {
      setError('Aucun élément sélectionné.');
      return;
    }

    const result = updateVaultItem(masterPassword, selectedItem.id, selectedItem);
    
    if (result.success) {
      setVaultItems(vaultItems.map(item => 
        item.id === selectedItem.id ? result.data : item
      ));
      setSelectedItem(null);
      setSuccess('Élément mis à jour avec succès.');
      setError('');
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } else {
      setError(result.message);
    }
  };

  // Supprimer un élément
  const handleDeleteItem = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      const result = deleteVaultItem(masterPassword, id);
      
      if (result.success) {
        setVaultItems(vaultItems.filter(item => item.id !== id));
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem(null);
        }
        setSuccess('Élément supprimé avec succès.');
        setError('');
        
        // Effacer le message de succès après 3 secondes
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError(result.message);
      }
    }
  };

  // Filtrer les éléments en fonction du terme de recherche
  const filteredItems = vaultItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.username && item.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.url && item.url.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Basculer l'affichage du mot de passe
  const togglePasswordVisibility = (id) => {
    setShowPassword({
      ...showPassword,
      [id]: !showPassword[id]
    });
  };

  // Copier dans le presse-papiers
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess(`${type} copié dans le presse-papiers.`);
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    }).catch(err => {
      setError('Impossible de copier dans le presse-papiers.');
    });
  };

  // Afficher le formulaire d'initialisation
  if (!initialized) {
    return (
      <div className="vault-container">
        <h1>Initialiser le Coffre-fort</h1>
        <p>Créez un mot de passe maître pour sécuriser votre coffre-fort.</p>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleInitializeVault} className="vault-form">
          <div className="form-group">
            <label htmlFor="newMasterPassword">Nouveau mot de passe maître</label>
            <input
              type="password"
              id="newMasterPassword"
              value={newMasterPassword}
              onChange={(e) => setNewMasterPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmMasterPassword">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirmMasterPassword"
              value={confirmMasterPassword}
              onChange={(e) => setConfirmMasterPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="primary-button">Initialiser le Coffre-fort</button>
        </form>
      </div>
    );
  }

  // Afficher le formulaire de déverrouillage
  if (!unlocked) {
    return (
      <div className="vault-container">
        <h1>Déverrouiller le Coffre-fort</h1>
        <p>Entrez votre mot de passe maître pour accéder à vos données sécurisées.</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleUnlockVault} className="vault-form">
          <div className="form-group">
            <label htmlFor="masterPassword">Mot de passe maître</label>
            <input
              type="password"
              id="masterPassword"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="primary-button">Déverrouiller</button>
        </form>
      </div>
    );
  }

  // Afficher le contenu du coffre-fort
  return (
    <div className="vault-container">
      <div className="vault-header">
        <h1>Coffre-fort Numérique</h1>
        <div className="vault-actions">
          <button onClick={() => setShowAddForm(true)} className="action-button">
            Ajouter un élément
          </button>
          <button onClick={handleLockVault} className="action-button lock-button">
            Verrouiller
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="vault-content">
        <div className="vault-items-list">
          {filteredItems.length === 0 ? (
            <p className="empty-state">Aucun élément trouvé. Ajoutez votre premier élément en cliquant sur "Ajouter un élément".</p>
          ) : (
            <ul>
              {filteredItems.map(item => (
                <li 
                  key={item.id} 
                  className={selectedItem && selectedItem.id === item.id ? 'selected' : ''}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="item-title">{item.title}</div>
                  <div className="item-type">{item.type === 'password' ? 'Mot de passe' : 'Clé API'}</div>
                  <div className="item-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="delete-button"
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="vault-item-details">
          {selectedItem ? (
            <div className="item-details">
              <h2>{selectedItem.title}</h2>
              
              {selectedItem.username && (
                <div className="detail-row">
                  <span className="detail-label">Nom d'utilisateur:</span>
                  <span className="detail-value">{selectedItem.username}</span>
                  <button 
                    onClick={() => copyToClipboard(selectedItem.username, "Nom d'utilisateur")}
                    className="copy-button"
                  >
                    Copier
                  </button>
                </div>
              )}
              
              {selectedItem.password && (
                <div className="detail-row">
                  <span className="detail-label">Mot de passe:</span>
                  <span className="detail-value">
                    {showPassword[selectedItem.id] ? selectedItem.password : '••••••••'}
                  </span>
                  <button 
                    onClick={() => togglePasswordVisibility(selectedItem.id)}
                    className="toggle-button"
                  >
                    {showPassword[selectedItem.id] ? 'Masquer' : 'Afficher'}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(selectedItem.password, "Mot de passe")}
                    className="copy-button"
                  >
                    Copier
                  </button>
                </div>
              )}
              
              {selectedItem.url && (
                <div className="detail-row">
                  <span className="detail-label">URL:</span>
                  <span className="detail-value">
                    <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">
                      {selectedItem.url}
                    </a>
                  </span>
                </div>
              )}
              
              {selectedItem.notes && (
                <div className="detail-row">
                  <span className="detail-label">Notes:</span>
                  <span className="detail-value notes">{selectedItem.notes}</span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">
                  {selectedItem.type === 'password' ? 'Mot de passe' : 'Clé API'}
                </span>
              </div>
              
              <div className="detail-actions">
                <button 
                  onClick={() => {
                    setSelectedItem({
                      ...selectedItem,
                      editing: true
                    });
                  }}
                  className="edit-button"
                >
                  Modifier
                </button>
              </div>
              
              {selectedItem.editing && (
                <form onSubmit={handleUpdateItem} className="edit-form">
                  <div className="form-group">
                    <label htmlFor="edit-title">Titre</label>
                    <input
                      type="text"
                      id="edit-title"
                      value={selectedItem.title}
                      onChange={(e) => setSelectedItem({...selectedItem, title: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-username">Nom d'utilisateur</label>
                    <input
                      type="text"
                      id="edit-username"
                      value={selectedItem.username || ''}
                      onChange={(e) => setSelectedItem({...selectedItem, username: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-password">Mot de passe / Clé</label>
                    <input
                      type="text"
                      id="edit-password"
                      value={selectedItem.password || ''}
                      onChange={(e) => setSelectedItem({...selectedItem, password: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-url">URL</label>
                    <input
                      type="text"
                      id="edit-url"
                      value={selectedItem.url || ''}
                      onChange={(e) => setSelectedItem({...selectedItem, url: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-notes">Notes</label>
                    <textarea
                      id="edit-notes"
                      value={selectedItem.notes || ''}
                      onChange={(e) => setSelectedItem({...selectedItem, notes: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-type">Type</label>
                    <select
                      id="edit-type"
                      value={selectedItem.type}
                      onChange={(e) => setSelectedItem({...selectedItem, type: e.target.value})}
                    >
                      <option value="password">Mot de passe</option>
                      <option value="api_key">Clé API</option>
                    </select>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="save-button">Enregistrer</button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedItem({...selectedItem, editing: false})}
                      className="cancel-button"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="no-selection">
              <p>Sélectionnez un élément pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Formulaire d'ajout d'un nouvel élément */}
      {showAddForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Ajouter un nouvel élément</h2>
            
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label htmlFor="title">Titre</label>
                <input
                  type="text"
                  id="title"
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="username">Nom d'utilisateur</label>
                <input
                  type="text"
                  id="username"
                  value={newItem.username}
                  onChange={(e) => setNewItem({...newItem, username: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Mot de passe / Clé</label>
                <input
                  type="text"
                  id="password"
                  value={newItem.password}
                  onChange={(e) => setNewItem({...newItem, password: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="url">URL</label>
                <input
                  type="text"
                  id="url"
                  value={newItem.url}
                  onChange={(e) => setNewItem({...newItem, url: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  value={newItem.type}
                  onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                >
                  <option value="password">Mot de passe</option>
                  <option value="api_key">Clé API</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="save-button">Ajouter</button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="cancel-button"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vault; 