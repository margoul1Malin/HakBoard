import React, { useState, useEffect, useRef } from 'react';
import { FiPlay, FiSquare, FiDownload, FiFilter, FiList, FiInfo, FiClock, FiAlertCircle, FiCheckCircle, FiTrash2, FiHelpCircle, FiChevronDown, FiChevronUp, FiPlus, FiMinus, FiX } from 'react-icons/fi';

const Shark = () => {
  // États pour gérer l'interface et les données
  const [isSniffing, setIsSniffing] = useState(false);
  const [interfaces, setInterfaces] = useState([]);
  const [selectedInterface, setSelectedInterface] = useState('');
  const [capturedPackets, setCapturedPackets] = useState([]);
  const [packetDetails, setPacketDetails] = useState(null);
  const [filter, setFilter] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' ou 'logs'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // États pour les filtres avancés
  const [filters, setFilters] = useState([
    { id: 1, type: 'protocol', value: '', enabled: false },
    { id: 2, type: 'port', value: '', enabled: false },
    { id: 3, type: 'ip', value: '', enabled: false },
    { id: 4, type: 'mac', value: '', enabled: false }
  ]);
  
  // Référence pour garder une trace de l'opération de capture
  const snifferRef = useRef(null);
  
  // Fonction pour charger les interfaces réseau disponibles
  useEffect(() => {
    const loadInterfaces = async () => {
      try {
        addLog('Chargement des interfaces réseau...');
        
        // Appel à l'API Electron (à implémenter côté main process)
        if (window.electronAPI && window.electronAPI.getNetworkInterfaces) {
          const networkInterfaces = await window.electronAPI.getNetworkInterfaces();
          setInterfaces(networkInterfaces);
          addLog(`${networkInterfaces.length} interfaces réseau trouvées`);
          
          // Sélectionner automatiquement la première interface
          if (networkInterfaces.length > 0) {
            setSelectedInterface(networkInterfaces[0].name);
          }
        } else {
          setError("L'API pour récupérer les interfaces réseau n'est pas disponible");
          addLog("ERREUR: API pour interfaces réseau non disponible", "error");
        }
      } catch (err) {
        setError(`Erreur lors du chargement des interfaces: ${err.message}`);
        addLog(`ERREUR: ${err.message}`, "error");
      }
    };
    
    loadInterfaces();
    
    // Fonction de nettoyage pour arrêter la capture si le composant est démonté
    return () => {
      if (isSniffing && window.electronAPI && window.electronAPI.stopPacketCapture && snifferRef.current) {
        window.electronAPI.stopPacketCapture(snifferRef.current)
          .then(() => console.log('Capture arrêtée lors du démontage du composant'))
          .catch(err => console.error('Erreur lors de l\'arrêt de la capture:', err));
      }
    };
  }, []);
  
  // Configurer les écouteurs d'événements pour les paquets capturés
  useEffect(() => {
    // Fonction pour gérer les paquets capturés
    const handlePacketCaptured = (packet) => {
      console.log("Paquet reçu:", packet);
      setCapturedPackets(prev => {
        const newPackets = [...prev, packet];
        if (newPackets.length > 1000) {
          return newPackets.slice(-1000);
        }
        return newPackets;
      });
    };
    
    // Fonction pour gérer les logs
    const handleSharkLog = (logEntry) => {
      console.log("Log reçu:", logEntry);
      addLog(logEntry.message, logEntry.type);
    };
    
    // Fonction pour gérer l'arrêt de la capture
    const handleCaptureStop = () => {
      console.log("Capture arrêtée");
      setIsSniffing(false);
      snifferRef.current = null;
      addLog("Capture arrêtée", "info");
    };
    
    // Enregistrer les gestionnaires d'événements
    if (window.electronAPI) {
      if (window.electronAPI.onPacketCaptured) {
        window.electronAPI.onPacketCaptured(handlePacketCaptured);
      }
      
      if (window.electronAPI.onSharkLog) {
        window.electronAPI.onSharkLog(handleSharkLog);
      }
      
      if (window.electronAPI.onCaptureStop) {
        window.electronAPI.onCaptureStop(handleCaptureStop);
      }
    }
    
    // Fonction de nettoyage pour supprimer les écouteurs d'événements
    return () => {
      if (window.electronAPI) {
        if (window.electronAPI.removeListener) {
          window.electronAPI.removeListener('packet-captured');
          window.electronAPI.removeListener('shark-log');
          window.electronAPI.removeListener('capture-stopped');
        }
      }
    };
  }, []);  // Le tableau de dépendances vide assure que cet effet ne s'exécute qu'une seule fois
  
  // Fonction pour ajouter des entrées au journal
  const addLog = (message, type = "info") => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100)); // Limiter à 100 entrées
  };
  
  // Fonction pour construire le filtre BPF à partir des filtres avancés
  const buildBPFFilter = () => {
    // Si un filtre personnalisé est défini, l'utiliser
    if (filter) return filter;
    
    // Sinon, construire un filtre à partir des options avancées
    const enabledFilters = filters.filter(f => f.enabled && f.value);
    if (enabledFilters.length === 0) return '';
    
    const filterParts = enabledFilters.map(f => {
      switch(f.type) {
        case 'protocol':
          return f.value.toLowerCase();
        case 'port':
          return `port ${f.value}`;
        case 'ip':
          return `host ${f.value}`;
        case 'mac':
          return `ether host ${f.value}`;
        default:
          return '';
      }
    }).filter(Boolean);
    
    return filterParts.join(' and ');
  };
  
  // Mise à jour d'un filtre
  const updateFilter = (id, field, value) => {
    setFilters(prevFilters => 
      prevFilters.map(f => 
        f.id === id ? { ...f, [field]: value } : f
      )
    );
  };
  
  // Ajouter un nouveau filtre
  const addFilter = () => {
    const newId = Math.max(...filters.map(f => f.id)) + 1;
    setFilters([...filters, { id: newId, type: 'protocol', value: '', enabled: false }]);
  };
  
  // Supprimer un filtre
  const removeFilter = (id) => {
    setFilters(prevFilters => prevFilters.filter(f => f.id !== id));
  };
  
  // Fonction pour démarrer la capture de paquets
  const startSniffing = async () => {
    if (!selectedInterface) {
      setError("Veuillez sélectionner une interface réseau");
      return;
    }
    
    try {
      setIsSniffing(true);
      setCapturedPackets([]);
      addLog(`Démarrage de la capture sur l'interface ${selectedInterface}...`);
      
      const finalFilter = buildBPFFilter();
      if (finalFilter) {
        addLog(`Filtre appliqué: ${finalFilter}`, "info");
      }
      
      if (window.electronAPI && window.electronAPI.startPacketCapture) {
        // Démarrer la capture via l'API Electron
        snifferRef.current = await window.electronAPI.startPacketCapture({
          interface: selectedInterface,
          filter: finalFilter || undefined
          // Ne pas envoyer de callback pour éviter l'erreur "An object could not be cloned"
        });
        
        addLog("Capture en cours...");
      } else {
        throw new Error("L'API de capture de paquets n'est pas disponible");
      }
    } catch (err) {
      setIsSniffing(false);
      setError(`Erreur lors du démarrage de la capture: ${err.message}`);
      addLog(`ERREUR: ${err.message}`, "error");
    }
  };
  
  // Fonction pour arrêter la capture de paquets
  const stopSniffing = async () => {
    try {
      if (window.electronAPI && window.electronAPI.stopPacketCapture && snifferRef.current) {
        await window.electronAPI.stopPacketCapture(snifferRef.current);
        addLog("Arrêt de la capture en cours...");
      }
    } catch (err) {
      setError(`Erreur lors de l'arrêt de la capture: ${err.message}`);
      addLog(`ERREUR: ${err.message}`, "error");
    }
  };
  
  // Fonction pour exporter les paquets capturés au format PCAP
  const exportToPcap = async () => {
    if (capturedPackets.length === 0) {
      setError("Aucun paquet à exporter");
      return;
    }
    
    try {
      addLog("Exportation des paquets au format PCAP...");
      
      if (window.electronAPI && window.electronAPI.exportToPcap) {
        // Si plus de 500 paquets, exporter par lots
        if (capturedPackets.length > 500) {
          addLog(`${capturedPackets.length} paquets détectés, l'exportation se fera par lots`, "warning");
          
          const batchSize = 500;
          const numBatches = Math.ceil(capturedPackets.length / batchSize);
          
          for (let i = 0; i < numBatches; i++) {
            const startIdx = i * batchSize;
            const endIdx = Math.min((i + 1) * batchSize, capturedPackets.length);
            const batch = capturedPackets.slice(startIdx, endIdx);
            
            addLog(`Exportation du lot ${i+1}/${numBatches} (${startIdx+1}-${endIdx} sur ${capturedPackets.length} paquets)...`);
            
            const filePath = await window.electronAPI.exportToPcap(batch);
            addLog(`Lot ${i+1} exporté avec succès vers ${filePath}`, "success");
          }
        } else {
          // Export normal si moins de 500 paquets
          const filePath = await window.electronAPI.exportToPcap(capturedPackets);
          addLog(`Paquets exportés avec succès vers ${filePath}`, "success");
        }
      } else {
        throw new Error("L'API d'exportation PCAP n'est pas disponible");
      }
    } catch (err) {
      setError(`Erreur lors de l'exportation: ${err.message}`);
      addLog(`ERREUR: ${err.message}`, "error");
    }
  };
  
  // Fonction pour afficher les détails d'un paquet
  const showPacketDetails = (packet) => {
    setPacketDetails(packet);
    setActiveTab('details');
  };
  
  // Fonction pour effacer les journaux
  const clearLogs = () => {
    setLogs([]);
    addLog("Journal effacé");
  };
  
  // Rendu du composant d'icône en fonction du type de log
  const renderLogIcon = (type) => {
    switch (type) {
      case 'error':
        return <FiAlertCircle className="text-red-500" />;
      case 'warning':
        return <FiHelpCircle className="text-yellow-500" />;
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      default:
        return <FiClock className="text-blue-500" />;
    }
  };

  // Fonction pour formater les données hexadécimales
  const formatHexDump = (hexString) => {
    if (!hexString) return '';
    
    try {
      // Si c'est une chaîne formatée avec des sauts de ligne, on la renvoie telle quelle
      if (hexString.includes('\n')) return hexString;
      
      // Convertir la chaîne hex en tableau d'octets
      const bytes = [];
      for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
      }
      
      // Formater le dump hexadécimal
      const bytesPerLine = 16;
      const lines = [];
      
      for (let i = 0; i < bytes.length; i += bytesPerLine) {
        const chunk = bytes.slice(i, i + bytesPerLine);
        
        // Partie hexadécimale
        const hexPart = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ');
        
        // Partie ASCII
        const asciiPart = chunk.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
        
        // Ligne complète
        lines.push(`${i.toString(16).padStart(4, '0')}: ${hexPart.padEnd(bytesPerLine * 3 - 1, ' ')}  ${asciiPart}`);
      }
      
      return lines.join('\n');
    } catch (e) {
      console.error('Erreur lors du formatage hexadécimal:', e);
      return hexString; // Renvoyer la chaîne d'origine en cas d'erreur
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">
        Shark - Analyseur de Paquets Réseau
      </h1>
      
      {/* Section de contrôle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Sélecteur d'interface */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Interface Réseau
            </label>
            <select
              value={selectedInterface}
              onChange={(e) => setSelectedInterface(e.target.value)}
              disabled={isSniffing}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Sélectionnez une interface</option>
              {interfaces.map((iface) => (
                <option key={iface.name} value={iface.name}>
                  {iface.name} ({iface.description || 'Pas de description'})
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtre BPF personnalisé */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filtre Personnalisé (BPF)
            </label>
            <div className="flex">
              <input
                type="text"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  // Désactiver les filtres avancés si un filtre personnalisé est défini
                  if (e.target.value) {
                    setFilters(prev => prev.map(f => ({ ...f, enabled: false })));
                  }
                }}
                disabled={isSniffing}
                placeholder="Ex: tcp port 80"
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button 
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 rounded-r-md flex items-center"
                title={showAdvancedFilters ? "Masquer les filtres avancés" : "Afficher les filtres avancés"}
                disabled={isSniffing}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Section de filtres avancés */}
        {showAdvancedFilters && (
          <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FiFilter /> Filtres Avancés
              </h3>
              <button
                onClick={addFilter}
                disabled={isSniffing || filter !== ''}
                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={14} /> Ajouter un filtre
              </button>
            </div>
            
            {filters.map(f => (
              <div key={f.id} className="flex flex-wrap items-center gap-2 mb-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={(e) => updateFilter(f.id, 'enabled', e.target.checked)}
                    disabled={isSniffing || filter !== ''}
                    className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400 rounded"
                  />
                </div>
                
                <select
                  value={f.type}
                  onChange={(e) => updateFilter(f.id, 'type', e.target.value)}
                  disabled={isSniffing || !f.enabled || filter !== ''}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="protocol">Protocole</option>
                  <option value="port">Port</option>
                  <option value="ip">Adresse IP</option>
                  <option value="mac">Adresse MAC</option>
                </select>
                
                {f.type === 'protocol' ? (
                  <select
                    value={f.value}
                    onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                    disabled={isSniffing || !f.enabled || filter !== ''}
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm flex-1"
                  >
                    <option value="">Sélectionner un protocole</option>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="icmp">ICMP</option>
                    <option value="arp">ARP</option>
                    <option value="http">HTTP</option>
                    <option value="dns">DNS</option>
                    <option value="ssh">SSH</option>
                    <option value="tls">TLS/SSL</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                    disabled={isSniffing || !f.enabled || filter !== ''}
                    placeholder={
                      f.type === 'port' ? "Ex: 80" : 
                      f.type === 'ip' ? "Ex: 192.168.1.1" : 
                      f.type === 'mac' ? "Ex: aa:bb:cc:dd:ee:ff" : ""
                    }
                    className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm flex-1"
                  />
                )}
                
                <button
                  onClick={() => removeFilter(f.id)}
                  disabled={isSniffing}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-md"
                  title="Supprimer ce filtre"
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
            
            {filter ? (
              <p className="text-amber-500 dark:text-amber-400 text-xs italic mt-2">
                Les filtres avancés sont désactivés lorsqu'un filtre personnalisé est défini
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                Filtre BPF final: <span className="font-mono">{buildBPFFilter() || '(aucun filtre)'}</span>
              </p>
            )}
          </div>
        )}
        
        {/* Boutons de contrôle */}
        <div className="flex gap-2">
          {!isSniffing ? (
            <button
              onClick={startSniffing}
              disabled={!selectedInterface}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlay /> Démarrer
            </button>
          ) : (
            <button
              onClick={stopSniffing}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md flex items-center gap-2"
            >
              <FiSquare /> Arrêter
            </button>
          )}
          
          <button
            onClick={exportToPcap}
            disabled={capturedPackets.length === 0}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload /> Exporter (PCAP)
          </button>
        </div>
      </div>
      
      {/* Affichage des erreurs */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p className="font-bold">Erreur</p>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="text-sm underline"
          >
            Fermer
          </button>
        </div>
      )}
      
      {/* Affichage principal - disposition en grille */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tableau des paquets - occupe 2 colonnes sur les grands écrans */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiList /> Paquets Capturés 
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full ml-2">
              {capturedPackets.length}
            </span>
          </h2>
          
          <div className="overflow-x-auto">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temps</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Protocole</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Longueur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Info</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {capturedPackets.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {isSniffing ? 'Capture en cours...' : 'Aucun paquet capturé'}
                      </td>
                    </tr>
                  ) : (
                    capturedPackets.map((packet, index) => (
                      <tr 
                        key={packet.id || index}
                        onClick={() => showPacketDetails(packet)}
                        className={`hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                          packetDetails === packet ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{packet.timestamp || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{packet.source || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{packet.destination || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{packet.protocol || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{packet.length || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{packet.info || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Détails du paquet et journaux */}
        <div className="space-y-6">
          {/* Tabs pour détails/journal */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`flex-1 py-3 px-4 text-center ${
                  activeTab === 'details'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-b-2 border-indigo-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('details')}
              >
                <div className="flex items-center justify-center gap-2">
                  <FiInfo /> Détails
                </div>
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center ${
                  activeTab === 'logs'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-b-2 border-indigo-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveTab('logs')}
              >
                <div className="flex items-center justify-center gap-2">
                  <FiClock /> Journal
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {logs.length}
                  </span>
                </div>
              </button>
            </div>
            
            {/* Contenu des tabs */}
            <div className="p-4">
              {activeTab === 'details' ? (
                // Détails du paquet
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiInfo /> Détails du Paquet
                  </h2>
                  
                  {packetDetails ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Informations Générales</h3>
                        <table className="min-w-full text-sm">
                          <tbody>
                            <tr>
                              <td className="py-1 pr-4 font-medium">Timestamp:</td>
                              <td>{packetDetails.timestamp || '-'}</td>
                            </tr>
                            <tr>
                              <td className="py-1 pr-4 font-medium">Longueur:</td>
                              <td>{packetDetails.length || '-'} octets</td>
                            </tr>
                            <tr>
                              <td className="py-1 pr-4 font-medium">Interface:</td>
                              <td>{packetDetails.interface || '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Couche 2 - Liaison */}
                      {packetDetails.ethernet && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Ethernet</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">MAC Source:</td>
                                <td>{packetDetails.ethernet.src || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">MAC Destination:</td>
                                <td>{packetDetails.ethernet.dst || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Type:</td>
                                <td>{packetDetails.ethernet.type || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Couche ARP */}
                      {packetDetails.arp && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">ARP</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Opération:</td>
                                <td>{packetDetails.arp.op === "1" ? "Request (1)" : "Reply (2)"}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">MAC Source:</td>
                                <td>{packetDetails.arp.hwsrc || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">IP Source:</td>
                                <td>{packetDetails.arp.psrc || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">MAC Destination:</td>
                                <td>{packetDetails.arp.hwdst || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">IP Destination:</td>
                                <td>{packetDetails.arp.pdst || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Couche 3 - Réseau (IPv4) */}
                      {packetDetails.ip && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">IP</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Version:</td>
                                <td>{packetDetails.ip.version || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">IP Source:</td>
                                <td>{packetDetails.ip.src || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">IP Destination:</td>
                                <td>{packetDetails.ip.dst || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">TTL:</td>
                                <td>{packetDetails.ip.ttl || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Protocol:</td>
                                <td>{packetDetails.ip.proto || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Couche 3 - Réseau (IPv6) */}
                      {packetDetails.ipv6 && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">IPv6</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">IPv6 Source:</td>
                                <td>{packetDetails.ipv6.src || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">IPv6 Destination:</td>
                                <td>{packetDetails.ipv6.dst || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Hop Limit:</td>
                                <td>{packetDetails.ipv6.hlim || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Next Header:</td>
                                <td>{packetDetails.ipv6.nxt || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Couche 4 - Transport (TCP) */}
                      {packetDetails.tcp && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">TCP</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Port Source:</td>
                                <td>{packetDetails.tcp.srcport || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Port Destination:</td>
                                <td>{packetDetails.tcp.dstport || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Seq:</td>
                                <td>{packetDetails.tcp.seq || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Ack:</td>
                                <td>{packetDetails.tcp.ack || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Flags:</td>
                                <td>{packetDetails.tcp.flags || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Couche 4 - Transport (UDP) */}
                      {packetDetails.udp && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">UDP</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Port Source:</td>
                                <td>{packetDetails.udp.srcport || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Port Destination:</td>
                                <td>{packetDetails.udp.dstport || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Longueur:</td>
                                <td>{packetDetails.udp.length || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* ICMP */}
                      {packetDetails.icmp && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">ICMP</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Type:</td>
                                <td>{packetDetails.icmp.type || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Code:</td>
                                <td>{packetDetails.icmp.code || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* ICMPv6 */}
                      {packetDetails.icmpv6 && (
                        <div>
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">ICMPv6</h3>
                          <table className="min-w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Type:</td>
                                <td>{packetDetails.icmpv6.type || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-1 pr-4 font-medium">Code:</td>
                                <td>{packetDetails.icmpv6.code || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Données brutes */}
                      <div>
                        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Données Brutes (Hex)</h3>
                        <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre">
                          {packetDetails.hex ? (
                            typeof packetDetails.hex === 'string' && packetDetails.hex.includes('\n') ? (
                              // Si le format est déjà formaté avec des sauts de ligne
                              packetDetails.hex
                            ) : (
                              // Sinon, on le formate nous-mêmes
                              formatHexDump(packetDetails.hex)
                            )
                          ) : (
                            'Pas de données brutes disponibles'
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      Sélectionnez un paquet pour voir ses détails
                    </p>
                  )}
                </>
              ) : (
                // Journal d'activités
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FiClock /> Journal d'Activités
                    </h2>
                    <button
                      onClick={clearLogs}
                      className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1"
                      title="Effacer le journal"
                    >
                      <FiTrash2 size={16} /> Effacer
                    </button>
                  </div>
                  
                  <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {logs.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 italic text-center py-4">
                        Aucune activité enregistrée
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-2 rounded border-l-4 ${
                              log.type === 'error'
                                ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500'
                                : log.type === 'warning'
                                ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-500'
                                : log.type === 'success'
                                ? 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500'
                                : 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="pt-0.5">
                                {renderLogIcon(log.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {log.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Section d'informations */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-2">À propos de Shark</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Shark est un outil avancé de capture et d'analyse de paquets réseau. Il combine les fonctionnalités de PyShark et Scapy pour fournir une interface complète pour l'analyse du trafic réseau.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-medium">Fonctionnalités principales:</span> Capture en temps réel, filtrage BPF, export PCAP, analyse détaillée des protocoles, journalisation des activités.
        </p>
      </div>
    </div>
  );
};

export default Shark;
