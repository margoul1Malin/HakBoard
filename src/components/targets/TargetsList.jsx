import React, { useState, useEffect } from 'react';
import { 
  getAllTargets, 
  addTarget, 
  updateTarget, 
  deleteTarget,
  searchTargets,
  filterTargetsByTag,
  filterTargetsByStatus
} from '../../services/targetsService';
import './TargetsList.css';

const TargetsList = () => {
  const [targets, setTargets] = useState([]);
  const [filteredTargets, setFilteredTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newTarget, setNewTarget] = useState({
    name: '',
    ipAddress: '',
    hostname: '',
    description: '',
    status: 'unknown',
    tags: [],
    notes: ''
  });
  const [tagInput, setTagInput] = useState('');

  // Statuts possibles pour une cible
  const statusOptions = [
    { value: 'unknown', label: 'Inconnu' },
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'vulnerable', label: 'Vulnérable' },
    { value: 'secure', label: 'Sécurisé' }
  ];

  // Charger les cibles au chargement du composant
  useEffect(() => {
    loadTargets();
  }, []);

  // Filtrer les cibles lorsque les critères de filtrage changent
  useEffect(() => {
    filterTargets();
  }, [targets, searchTerm, filterTag, filterStatus]);

  // Charger toutes les cibles
  const loadTargets = () => {
    const allTargets = getAllTargets();
    setTargets(allTargets);
    setFilteredTargets(allTargets);
  };

  // Filtrer les cibles en fonction des critères
  const filterTargets = () => {
    let result = targets;
    
    // Appliquer la recherche
    if (searchTerm) {
      result = searchTargets(searchTerm);
    }
    
    // Appliquer le filtre par tag
    if (filterTag) {
      result = filterTargetsByTag(filterTag);
    }
    
    // Appliquer le filtre par statut
    if (filterStatus) {
      result = filterTargetsByStatus(filterStatus);
    }
    
    setFilteredTargets(result);
  };

  // Ajouter une nouvelle cible
  const handleAddTarget = (e) => {
    e.preventDefault();
    
    if (!newTarget.name) {
      setError('Le nom de la cible est requis.');
      return;
    }
    
    if (!newTarget.ipAddress && !newTarget.hostname) {
      setError('Une adresse IP ou un nom d\'hôte est requis.');
      return;
    }
    
    const result = addTarget(newTarget);
    
    if (result.success) {
      loadTargets();
      setNewTarget({
        name: '',
        ipAddress: '',
        hostname: '',
        description: '',
        status: 'unknown',
        tags: [],
        notes: ''
      });
      setShowAddForm(false);
      setSuccess('Cible ajoutée avec succès.');
      setError('');
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } else {
      setError(result.message);
    }
  };

  // Mettre à jour une cible
  const handleUpdateTarget = (e) => {
    e.preventDefault();
    
    if (!selectedTarget || !selectedTarget.id) {
      setError('Aucune cible sélectionnée.');
      return;
    }
    
    if (!selectedTarget.name) {
      setError('Le nom de la cible est requis.');
      return;
    }
    
    if (!selectedTarget.ipAddress && !selectedTarget.hostname) {
      setError('Une adresse IP ou un nom d\'hôte est requis.');
      return;
    }
    
    const result = updateTarget(selectedTarget.id, selectedTarget);
    
    if (result.success) {
      loadTargets();
      setSelectedTarget({...result.data, editing: false});
      setSuccess('Cible mise à jour avec succès.');
      setError('');
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } else {
      setError(result.message);
    }
  };

  // Supprimer une cible
  const handleDeleteTarget = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette cible ?')) {
      const result = deleteTarget(id);
      
      if (result.success) {
        loadTargets();
        if (selectedTarget && selectedTarget.id === id) {
          setSelectedTarget(null);
        }
        setSuccess('Cible supprimée avec succès.');
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

  // Ajouter un tag à la nouvelle cible
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    if (showAddForm) {
      // Ajouter le tag à la nouvelle cible
      if (!newTarget.tags.includes(tagInput.trim())) {
        setNewTarget({
          ...newTarget,
          tags: [...newTarget.tags, tagInput.trim()]
        });
      }
    } else if (selectedTarget && selectedTarget.editing) {
      // Ajouter le tag à la cible sélectionnée
      if (!selectedTarget.tags.includes(tagInput.trim())) {
        setSelectedTarget({
          ...selectedTarget,
          tags: [...selectedTarget.tags, tagInput.trim()]
        });
      }
    }
    
    setTagInput('');
  };

  // Supprimer un tag de la nouvelle cible
  const handleRemoveTag = (tag) => {
    if (showAddForm) {
      // Supprimer le tag de la nouvelle cible
      setNewTarget({
        ...newTarget,
        tags: newTarget.tags.filter(t => t !== tag)
      });
    } else if (selectedTarget && selectedTarget.editing) {
      // Supprimer le tag de la cible sélectionnée
      setSelectedTarget({
        ...selectedTarget,
        tags: selectedTarget.tags.filter(t => t !== tag)
      });
    }
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#2ecc71';
      case 'inactive':
        return '#95a5a6';
      case 'vulnerable':
        return '#e74c3c';
      case 'secure':
        return '#3498db';
      default:
        return '#f39c12';
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : 'Inconnu';
  };

  return (
    <div className="targets-container">
      <div className="targets-header">
        <h1>Gestion des Cibles</h1>
        <div className="targets-actions">
          <button onClick={() => setShowAddForm(true)} className="action-button">
            Ajouter une cible
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="filters-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les statuts</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Filtrer par tag..."
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="filter-input"
          />
          
          <button 
            onClick={() => {
              setFilterTag('');
              setFilterStatus('');
              setSearchTerm('');
            }}
            className="clear-filters-button"
          >
            Effacer les filtres
          </button>
        </div>
      </div>
      
      <div className="targets-content">
        <div className="targets-list">
          {filteredTargets.length === 0 ? (
            <p className="empty-state">Aucune cible trouvée. Ajoutez votre première cible en cliquant sur "Ajouter une cible".</p>
          ) : (
            <ul>
              {filteredTargets.map(target => (
                <li 
                  key={target.id} 
                  className={selectedTarget && selectedTarget.id === target.id ? 'selected' : ''}
                  onClick={() => setSelectedTarget(target)}
                >
                  <div className="target-info">
                    <div className="target-name">{target.name}</div>
                    <div className="target-address">
                      {target.ipAddress && <span>{target.ipAddress}</span>}
                      {target.ipAddress && target.hostname && <span> | </span>}
                      {target.hostname && <span>{target.hostname}</span>}
                    </div>
                  </div>
                  <div 
                    className="target-status" 
                    style={{ backgroundColor: getStatusColor(target.status) }}
                  >
                    {getStatusLabel(target.status)}
                  </div>
                  <div className="target-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTarget(target.id);
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
        
        <div className="target-details">
          {selectedTarget ? (
            <div className="details">
              <h2>{selectedTarget.name}</h2>
              
              <div className="detail-row">
                <span className="detail-label">Adresse IP:</span>
                <span className="detail-value">{selectedTarget.ipAddress || 'Non spécifiée'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Nom d'hôte:</span>
                <span className="detail-value">{selectedTarget.hostname || 'Non spécifié'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Statut:</span>
                <span 
                  className="detail-value status-badge"
                  style={{ backgroundColor: getStatusColor(selectedTarget.status) }}
                >
                  {getStatusLabel(selectedTarget.status)}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{selectedTarget.description || 'Aucune description'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Tags:</span>
                <div className="detail-value tags-container">
                  {selectedTarget.tags && selectedTarget.tags.length > 0 ? (
                    selectedTarget.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))
                  ) : (
                    <span className="no-tags">Aucun tag</span>
                  )}
                </div>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Notes:</span>
                <span className="detail-value notes">{selectedTarget.notes || 'Aucune note'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Créé le:</span>
                <span className="detail-value">
                  {new Date(selectedTarget.createdAt).toLocaleString()}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Mis à jour le:</span>
                <span className="detail-value">
                  {new Date(selectedTarget.updatedAt).toLocaleString()}
                </span>
              </div>
              
              <div className="detail-actions">
                <button 
                  onClick={() => {
                    setSelectedTarget({
                      ...selectedTarget,
                      editing: true
                    });
                  }}
                  className="edit-button"
                >
                  Modifier
                </button>
              </div>
              
              {selectedTarget.editing && (
                <form onSubmit={handleUpdateTarget} className="edit-form">
                  <div className="form-group">
                    <label htmlFor="edit-name">Nom</label>
                    <input
                      type="text"
                      id="edit-name"
                      value={selectedTarget.name}
                      onChange={(e) => setSelectedTarget({...selectedTarget, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-ip">Adresse IP</label>
                    <input
                      type="text"
                      id="edit-ip"
                      value={selectedTarget.ipAddress || ''}
                      onChange={(e) => setSelectedTarget({...selectedTarget, ipAddress: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-hostname">Nom d'hôte</label>
                    <input
                      type="text"
                      id="edit-hostname"
                      value={selectedTarget.hostname || ''}
                      onChange={(e) => setSelectedTarget({...selectedTarget, hostname: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-status">Statut</label>
                    <select
                      id="edit-status"
                      value={selectedTarget.status}
                      onChange={(e) => setSelectedTarget({...selectedTarget, status: e.target.value})}
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-description">Description</label>
                    <textarea
                      id="edit-description"
                      value={selectedTarget.description || ''}
                      onChange={(e) => setSelectedTarget({...selectedTarget, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Tags</label>
                    <div className="tags-input-container">
                      <div className="tags-list">
                        {selectedTarget.tags && selectedTarget.tags.map(tag => (
                          <div key={tag} className="tag-item">
                            <span>{tag}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveTag(tag)}
                              className="remove-tag"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="tag-input-wrapper">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Ajouter un tag..."
                          className="tag-input"
                        />
                        <button 
                          type="button" 
                          onClick={handleAddTag}
                          className="add-tag-button"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-notes">Notes</label>
                    <textarea
                      id="edit-notes"
                      value={selectedTarget.notes || ''}
                      onChange={(e) => setSelectedTarget({...selectedTarget, notes: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="save-button">Enregistrer</button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedTarget({...selectedTarget, editing: false})}
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
              <p>Sélectionnez une cible pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Formulaire d'ajout d'une nouvelle cible */}
      {showAddForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Ajouter une nouvelle cible</h2>
            
            <form onSubmit={handleAddTarget}>
              <div className="form-group">
                <label htmlFor="name">Nom</label>
                <input
                  type="text"
                  id="name"
                  value={newTarget.name}
                  onChange={(e) => setNewTarget({...newTarget, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="ipAddress">Adresse IP</label>
                <input
                  type="text"
                  id="ipAddress"
                  value={newTarget.ipAddress}
                  onChange={(e) => setNewTarget({...newTarget, ipAddress: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="hostname">Nom d'hôte</label>
                <input
                  type="text"
                  id="hostname"
                  value={newTarget.hostname}
                  onChange={(e) => setNewTarget({...newTarget, hostname: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select
                  id="status"
                  value={newTarget.status}
                  onChange={(e) => setNewTarget({...newTarget, status: e.target.value})}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={newTarget.description}
                  onChange={(e) => setNewTarget({...newTarget, description: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Tags</label>
                <div className="tags-input-container">
                  <div className="tags-list">
                    {newTarget.tags.map(tag => (
                      <div key={tag} className="tag-item">
                        <span>{tag}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTag(tag)}
                          className="remove-tag"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="tag-input-wrapper">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Ajouter un tag..."
                      className="tag-input"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddTag}
                      className="add-tag-button"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={newTarget.notes}
                  onChange={(e) => setNewTarget({...newTarget, notes: e.target.value})}
                />
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

export default TargetsList; 