import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FiSave, FiDownload, FiCopy, FiSend, FiEye, FiEyeOff, FiTrash2, FiFileText, FiMail, FiPlus, FiList, FiCode, FiShield, FiUsers, FiUpload, FiHelpCircle } from 'react-icons/fi';
import { useNotification } from '../../context/NotificationContext';

const Phisher = () => {
  // Contexte de notification
  const { showSuccess, showError, showInfo, showWarning } = useNotification();
  
  // États pour l'éditeur d'e-mail
  const [subject, setSubject] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  
  // États pour les variables dynamiques
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [variables, setVariables] = useState([
    { id: 'firstname', name: 'Prénom', value: 'Jean' },
    { id: 'lastname', name: 'Nom', value: 'Dupont' },
    { id: 'company', name: 'Entreprise', value: 'Acme Inc.' },
    { id: 'position', name: 'Poste', value: 'Directeur' }
  ]);
  const [newVariable, setNewVariable] = useState({ id: '', name: '', value: '' });
  
  // États pour l'obfuscation
  const [showObfuscationPanel, setShowObfuscationPanel] = useState(false);
  const [obfuscationSettings, setObfuscationSettings] = useState({
    obfuscateLinks: false,
    obfuscateKeywords: false,
    trackingPixel: false,
    clickTracking: false
  });
  const [keywordsToObfuscate, setKeywordsToObfuscate] = useState(['password', 'login', 'security', 'account', 'bank', 'credit']);
  const [newKeyword, setNewKeyword] = useState('');
  
  // États pour la liste des destinataires
  const [showRecipientsPanel, setShowRecipientsPanel] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [csvContent, setCsvContent] = useState('');
  const fileInputRef = useRef(null);
  
  // Référence pour l'éditeur Quill
  const quillRef = useRef(null);
  
  // Modules et formats pour l'éditeur Quill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };
  
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];
  
  // Charger les templates sauvegardés au démarrage
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const savedTemplates = JSON.parse(localStorage.getItem('phishing_templates')) || [];
        setTemplates(savedTemplates);
      } catch (error) {
        console.error('Erreur lors du chargement des templates:', error);
        showError('Erreur lors du chargement des templates');
      }
    };
    
    loadTemplates();
  }, [showError]);
  
  // Charger JSZip au démarrage
  useEffect(() => {
    const loadJSZip = async () => {
      try {
        if (typeof window.JSZip === 'undefined') {
          // Maintenant que la CSP autorise cdnjs.cloudflare.com, on peut charger JSZip depuis le CDN
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          script.async = true;
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = () => {
              console.log('JSZip chargé avec succès');
              resolve();
            };
            script.onerror = () => {
              console.error('Erreur lors du chargement de JSZip');
              reject(new Error('Impossible de charger JSZip'));
            };
            
            // Ajouter un timeout pour éviter d'attendre indéfiniment
            setTimeout(() => {
              if (typeof window.JSZip === 'undefined') {
                console.warn('Timeout lors du chargement de JSZip');
                showWarning('JSZip n\'a pas pu être chargé. L\'export de plusieurs emails pourrait ne pas fonctionner correctement.');
                reject(new Error('Timeout lors du chargement de JSZip'));
              }
            }, 5000);
          });
        } else {
          console.log('JSZip est déjà disponible');
        }
      } catch (error) {
        console.error('Erreur lors du chargement de JSZip:', error);
        showWarning('JSZip n\'a pas pu être chargé. L\'export de plusieurs emails pourrait ne pas fonctionner correctement.');
      }
    };
    
    loadJSZip();
  }, [showWarning]);
  
  // Fonction pour sauvegarder un template
  const saveTemplate = () => {
    if (!subject.trim()) {
      showWarning('Veuillez entrer un sujet pour le template');
      return;
    }
    
    const newTemplate = {
      id: Date.now().toString(),
      name: subject,
      subject,
      from,
      content,
      createdAt: new Date().toISOString()
    };
    
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    
    try {
      localStorage.setItem('phishing_templates', JSON.stringify(updatedTemplates));
      showSuccess('Template sauvegardé avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
      showError('Erreur lors de la sauvegarde du template');
    }
  };
  
  // Fonction pour charger un template
  const loadTemplate = (template) => {
    setSubject(template.subject || '');
    setFrom(template.from || '');
    setContent(template.content || '');
    setSelectedTemplate(template.id);
    showInfo(`Template "${template.name}" chargé`);
  };
  
  // Fonction pour supprimer un template
  const deleteTemplate = (id, e) => {
    e.stopPropagation();
    
    const updatedTemplates = templates.filter(template => template.id !== id);
    setTemplates(updatedTemplates);
    
    try {
      localStorage.setItem('phishing_templates', JSON.stringify(updatedTemplates));
      showSuccess('Template supprimé avec succès');
      
      if (selectedTemplate === id) {
        setSelectedTemplate(null);
      }
      
      if (previewTemplate && previewTemplate.id === id) {
        setPreviewTemplate(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du template:', error);
      showError('Erreur lors de la suppression du template');
    }
  };
  
  // Fonction pour prévisualiser un template
  const previewTemplateContent = (template, e) => {
    e.stopPropagation();
    setPreviewTemplate(template);
    showInfo(`Prévisualisation du template "${template.name}"`);
  };
  
  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setSubject('');
    setFrom('');
    setTo('');
    setCc('');
    setBcc('');
    setContent('');
    setSelectedTemplate(null);
    showInfo('Formulaire réinitialisé');
  };
  
  // Fonction pour copier le HTML dans le presse-papier
  const copyHtml = () => {
    navigator.clipboard.writeText(content)
      .then(() => {
        showSuccess('HTML copié dans le presse-papier');
      })
      .catch(err => {
        console.error('Erreur lors de la copie du HTML:', err);
        showError('Erreur lors de la copie du HTML');
      });
  };
  
  // Fonction pour insérer une variable dans l'éditeur
  const insertVariable = (variableId) => {
    if (!quillRef.current) return;
    
    const editor = quillRef.current.getEditor();
    const cursorPosition = editor.getSelection()?.index || 0;
    
    // Insérer la variable avec la syntaxe {{variable}}
    editor.insertText(cursorPosition, `{{${variableId}}}`);
    editor.setSelection(cursorPosition + variableId.length + 4);
    
    showInfo(`Variable {{${variableId}}} insérée`);
  };
  
  // Fonction pour ajouter une nouvelle variable
  const addNewVariable = () => {
    if (!newVariable.id.trim() || !newVariable.name.trim()) {
      showWarning('L\'identifiant et le nom de la variable sont requis');
      return;
    }
    
    // Vérifier si l'ID existe déjà
    if (variables.some(v => v.id === newVariable.id)) {
      showWarning(`Une variable avec l'identifiant "${newVariable.id}" existe déjà`);
      return;
    }
    
    const updatedVariables = [...variables, { ...newVariable }];
    setVariables(updatedVariables);
    setNewVariable({ id: '', name: '', value: '' });
    showSuccess('Variable ajoutée avec succès');
  };
  
  // Fonction pour supprimer une variable
  const deleteVariable = (variableId) => {
    const updatedVariables = variables.filter(v => v.id !== variableId);
    setVariables(updatedVariables);
    showInfo('Variable supprimée');
  };
  
  // Fonction pour mettre à jour une variable existante
  const updateVariableValue = (id, value) => {
    const updatedVariables = variables.map(v => 
      v.id === id ? { ...v, value } : v
    );
    setVariables(updatedVariables);
  };
  
  // Fonction pour remplacer les variables dans le contenu
  const replaceVariables = (text) => {
    let result = text;
    
    variables.forEach(variable => {
      const regex = new RegExp(`{{${variable.id}}}`, 'g');
      result = result.replace(regex, variable.value || '');
    });
    
    return result;
  };
  
  // Fonction pour obfusquer les liens
  const obfuscateLinks = (html) => {
    if (!obfuscationSettings.obfuscateLinks) return html;
    
    // Rechercher tous les liens dans le HTML
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
    
    return html.replace(linkRegex, (match, quote, url, text) => {
      // Vérifier si l'URL est valide
      if (!url || url === '#' || url.startsWith('javascript:')) {
        return match; // Ne pas modifier les liens vides ou JavaScript
      }
      
      // Diviser l'URL en parties significatives pour une meilleure obfuscation
      let urlParts = [];
      
      // Extraire le protocole (http:// ou https://)
      const protocolMatch = url.match(/^(https?:\/\/)/i);
      const protocol = protocolMatch ? protocolMatch[1] : '';
      let remaining = url.replace(/^(https?:\/\/)/i, '');
      
      // Si nous avons un protocole, l'ajouter séparément
      if (protocol) {
        urlParts.push(`'${protocol}'`);
      }
      
      // Diviser le reste de l'URL en parties de 3-5 caractères
      const chunks = [];
      let currentChunk = '';
      
      for (let i = 0; i < remaining.length; i++) {
        currentChunk += remaining[i];
        // Diviser après 3-5 caractères ou aux points naturels de séparation (/, ?, &, =, #)
        if (currentChunk.length >= 3 && 
            (currentChunk.length >= 5 || 
             remaining[i] === '/' || 
             remaining[i] === '?' || 
             remaining[i] === '&' || 
             remaining[i] === '=' || 
             remaining[i] === '#' ||
             i === remaining.length - 1)) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
      }
      
      // Ajouter le dernier morceau s'il reste quelque chose
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // Ajouter chaque morceau comme une chaîne séparée dans le tableau
      chunks.forEach(chunk => {
        urlParts.push(`'${chunk}'`);
      });
      
      // Créer le lien obfusqué avec JavaScript qui utilise l'URL divisée en parties
      return `<a href="javascript:void(0)" onclick="window.location=${protocol ? '' : '\'http://\'+'}[${urlParts.join(',')}].join('');">${text}</a>`;
    });
  };
  
  // Fonction pour obfusquer les mots-clés sensibles
  const obfuscateKeywords = (html) => {
    if (!obfuscationSettings.obfuscateKeywords || keywordsToObfuscate.length === 0) return html;
    
    let result = html;
    
    // Caractères invisibles ou similaires pour l'obfuscation
    const cyrillicO = 'о'; // Cyrillique 'о' ressemble à Latin 'o'
    const zeroWidthSpace = '&#8203;'; // Espace de largeur nulle
    
    keywordsToObfuscate.forEach(keyword => {
      // Créer une regex qui correspond au mot-clé (insensible à la casse)
      const regex = new RegExp(keyword, 'gi');
      
      // Remplacer chaque occurrence par une version obfusquée
      result = result.replace(regex, (match) => {
        let obfuscated = '';
        for (let i = 0; i < match.length; i++) {
          // Insérer un espace de largeur nulle entre chaque caractère
          const char = match[i];
          
          // Remplacer certains caractères par leurs équivalents visuels
          if (char.toLowerCase() === 'o') {
            obfuscated += cyrillicO;
          } else {
            obfuscated += char;
          }
          
          // Ajouter un espace de largeur nulle après chaque caractère (sauf le dernier)
          if (i < match.length - 1) {
            obfuscated += zeroWidthSpace;
          }
        }
        return obfuscated;
      });
    });
    
    return result;
  };
  
  // Fonction pour ajouter un pixel de suivi
  const addTrackingPixel = (html) => {
    if (!obfuscationSettings.trackingPixel) return html;
    
    // Générer un ID unique pour le suivi
    const trackingId = `track_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    // Créer un pixel de suivi transparent en base64
    // Cela évite d'avoir à héberger une image sur un serveur externe
    const transparentPixelBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    
    // Créer le pixel de suivi avec un ID unique pour pouvoir l'identifier
    const trackingPixel = `<img src="${transparentPixelBase64}" alt="" width="1" height="1" style="display:none;" id="${trackingId}" />`;
    
    // Ajouter le pixel à la fin du corps de l'e-mail
    return html + trackingPixel;
  };
  
  // Fonction pour ajouter le suivi des clics
  const addClickTracking = (html) => {
    if (!obfuscationSettings.clickTracking) return html;
    
    // Rechercher tous les liens dans le HTML
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
    
    return html.replace(linkRegex, (match, quote, url, text) => {
      // Ne pas modifier les liens JavaScript (déjà obfusqués) ou vides
      if (!url || url === '#' || url.startsWith('javascript:')) {
        return match;
      }
      
      // Générer un ID unique pour le suivi
      const trackingId = `click_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      
      // Dans un environnement réel, vous utiliseriez votre propre serveur de tracking
      // Pour cet exemple, nous allons simplement ajouter un paramètre à l'URL originale
      const separator = url.includes('?') ? '&' : '?';
      const trackingUrl = `${url}${separator}tracking_id=${trackingId}`;
      
      // Remplacer l'URL d'origine par l'URL de suivi
      return match.replace(url, trackingUrl);
    });
  };
  
  // Fonction pour ajouter un nouveau mot-clé à obfusquer
  const addKeywordToObfuscate = () => {
    if (!newKeyword.trim()) return;
    
    if (keywordsToObfuscate.includes(newKeyword.trim().toLowerCase())) {
      showWarning('Ce mot-clé est déjà dans la liste');
      return;
    }
    
    setKeywordsToObfuscate([...keywordsToObfuscate, newKeyword.trim().toLowerCase()]);
    setNewKeyword('');
    showInfo(`Mot-clé "${newKeyword}" ajouté à la liste d'obfuscation`);
  };
  
  // Fonction pour supprimer un mot-clé de la liste
  const removeKeyword = (keyword) => {
    setKeywordsToObfuscate(keywordsToObfuscate.filter(k => k !== keyword));
    showInfo(`Mot-clé "${keyword}" retiré de la liste d'obfuscation`);
  };
  
  // Fonction pour appliquer toutes les transformations au contenu
  const processContent = (rawContent) => {
    let processedContent = replaceVariables(rawContent);
    
    // Appliquer les obfuscations dans l'ordre optimal:
    // 1. D'abord obfusquer les mots-clés sensibles
    processedContent = obfuscateKeywords(processedContent);
    
    // 2. Ensuite ajouter le suivi des clics (avant l'obfuscation des liens)
    // Cela permet de suivre les clics même si les liens sont ensuite obfusqués
    if (obfuscationSettings.clickTracking && !obfuscationSettings.obfuscateLinks) {
      processedContent = addClickTracking(processedContent);
    }
    
    // 3. Puis obfusquer les liens
    // Note: Si le suivi des clics et l'obfuscation des liens sont tous deux activés,
    // l'obfuscation des liens prendra priorité car elle modifie complètement la structure du lien
    processedContent = obfuscateLinks(processedContent);
    
    // 4. Enfin, ajouter le pixel de suivi (toujours en dernier)
    processedContent = addTrackingPixel(processedContent);
    
    return processedContent;
  };
  
  // Fonction pour prévisualiser avec toutes les transformations
  const getPreviewContent = () => {
    return processContent(content);
  };
  
  // Fonction pour prévisualiser un template avec toutes les transformations
  const getTemplatePreviewContent = (templateContent) => {
    return processContent(templateContent);
  };
  
  // Fonction pour exporter l'e-mail au format HTML
  const exportHtml = () => {
    const processedContent = processContent(content);
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body>
  ${processedContent}
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('E-mail exporté au format HTML');
  };
  
  // Fonction pour exporter l'e-mail au format EML (compatible avec la plupart des clients de messagerie)
  const exportEml = () => {
    const processedContent = processContent(content);
    
    const emlContent = `From: ${from}
To: ${to}
${cc ? `Cc: ${cc}\n` : ''}${bcc ? `Bcc: ${bcc}\n` : ''}Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

${processedContent}
    `;
    
    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('E-mail exporté au format EML');
  };
  
  // Fonction pour exporter l'e-mail au format MSG (pour Outlook)
  const exportMsg = () => {
    // Note: La conversion en MSG nécessite généralement une bibliothèque côté serveur
    // Ici, nous allons simplement informer l'utilisateur de cette limitation
    showWarning('L\'export au format MSG nécessite un serveur. Utilisez le format EML pour la compatibilité avec Outlook.');
  };
  
  // Fonction pour charger un fichier CSV de destinataires
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCsvContent(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };
  
  // Fonction pour analyser le contenu CSV
  const parseCSV = (content) => {
    try {
      // Diviser le contenu en lignes
      const lines = content.split(/\r\n|\n/);
      
      // La première ligne contient les en-têtes
      const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
      
      // Vérifier si les en-têtes contiennent au moins un champ email
      if (!headers.includes('email')) {
        showError('Le fichier CSV doit contenir une colonne "email"');
        return;
      }
      
      // Créer un tableau d'objets pour chaque destinataire
      const parsedRecipients = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(value => value.trim());
        const recipient = {};
        
        headers.forEach((header, index) => {
          recipient[header] = values[index] || '';
        });
        
        // Vérifier que l'email est présent
        if (recipient.email) {
          parsedRecipients.push(recipient);
        }
      }
      
      setRecipients(parsedRecipients);
      showSuccess(`${parsedRecipients.length} destinataires chargés avec succès`);
      
      // Ajouter automatiquement les variables du CSV en évitant les doublons
      const existingVarIds = new Set(variables.map(v => v.id.toLowerCase()));
      const csvVariables = [];
      
      headers.forEach(header => {
        if (header !== 'email' && !existingVarIds.has(header)) {
          existingVarIds.add(header);
          csvVariables.push({
            id: header,
            name: header.charAt(0).toUpperCase() + header.slice(1),
            value: parsedRecipients[0]?.[header] || ''
          });
        }
      });
      
      if (csvVariables.length > 0) {
        setVariables([...variables, ...csvVariables]);
        showInfo(`${csvVariables.length} nouvelles variables ajoutées depuis le CSV`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse du CSV:', error);
      showError('Erreur lors de l\'analyse du fichier CSV');
    }
  };
  
  // Fonction pour ajouter manuellement un destinataire
  const addRecipient = () => {
    const newRecipient = { email: '' };
    variables.forEach(variable => {
      newRecipient[variable.id] = '';
    });
    
    setRecipients([...recipients, newRecipient]);
  };
  
  // Fonction pour supprimer un destinataire
  const removeRecipient = (index) => {
    const updatedRecipients = [...recipients];
    updatedRecipients.splice(index, 1);
    setRecipients(updatedRecipients);
  };
  
  // Fonction pour mettre à jour les données d'un destinataire
  const updateRecipient = (index, field, value) => {
    const updatedRecipients = [...recipients];
    updatedRecipients[index][field] = value;
    setRecipients(updatedRecipients);
  };
  
  // Fonction pour générer un exemple de CSV
  const generateSampleCSV = () => {
    // Utiliser uniquement les variables sans doublons
    const variableIds = [];
    const usedNames = new Set();
    
    // Filtrer pour éviter les doublons (prenom/firstname, nom/lastname, etc.)
    variables.forEach(v => {
      const lowerName = v.id.toLowerCase();
      if (!usedNames.has(lowerName)) {
        usedNames.add(lowerName);
        variableIds.push(v.id);
      }
    });
    
    const headers = ['email', ...variableIds].join(',');
    const sampleRow = [`exemple@domaine.com`, ...variableIds.map(id => `valeur_${id}`)].join(',');
    
    return `${headers}\n${sampleRow}`;
  };
  
  // Fonction pour télécharger un exemple de CSV
  const downloadSampleCSV = () => {
    const sampleCSV = generateSampleCSV();
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exemple_destinataires.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Fonction pour remplacer les variables dans le contenu pour un destinataire spécifique
  const replaceVariablesForRecipient = (text, recipient) => {
    let result = text;
    
    // Remplacer les variables par les valeurs du destinataire
    variables.forEach(variable => {
      const regex = new RegExp(`{{${variable.id}}}`, 'g');
      const value = recipient[variable.id] || variable.value || '';
      result = result.replace(regex, value);
    });
    
    return result;
  };
  
  // Fonction pour exporter des emails personnalisés pour tous les destinataires
  const exportPersonalizedEmails = async () => {
    if (recipients.length === 0) {
      showWarning('Aucun destinataire n\'a été ajouté');
      return;
    }
    
    try {
      // Vérifier si JSZip est disponible
      if (typeof window.JSZip === 'undefined') {
        showError('La bibliothèque JSZip n\'est pas disponible. L\'export multiple n\'est pas possible.');
        showInfo('Vous pouvez toujours exporter les emails un par un en format HTML ou EML.');
        return;
      }
      
      // Créer un nouveau ZIP
      const zip = new window.JSZip();
      
      // Compter les emails générés avec succès
      let successCount = 0;
      
      // Pour chaque destinataire, générer un email personnalisé
      recipients.forEach((recipient, index) => {
        if (!recipient.email) {
          showWarning(`Le destinataire #${index + 1} n'a pas d'adresse email valide et sera ignoré`);
          return;
        }
        
        try {
          // Remplacer les variables dans le contenu
          const personalizedContent = replaceVariablesForRecipient(content, recipient);
          
          // Appliquer les obfuscations
          const processedContent = processContent(personalizedContent);
          
          // Créer le contenu HTML
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body>
  ${processedContent}
</body>
</html>
          `;
          
          // Créer le contenu EML
          const emlContent = `From: ${from}
To: ${recipient.email}
${cc ? `Cc: ${cc}\n` : ''}${bcc ? `Bcc: ${bcc}\n` : ''}Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

${processedContent}
          `;
          
          // Ajouter les fichiers au ZIP
          const safeName = recipient.email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          zip.file(`${safeName}_${index + 1}.html`, htmlContent);
          zip.file(`${safeName}_${index + 1}.eml`, emlContent);
          
          successCount++;
        } catch (err) {
          console.error(`Erreur lors de la génération de l'email pour ${recipient.email}:`, err);
          showWarning(`Erreur lors de la génération de l'email pour ${recipient.email}`);
        }
      });
      
      if (successCount === 0) {
        showError('Aucun email n\'a pu être généré. Vérifiez les données des destinataires.');
        return;
      }
      
      // Générer le ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Télécharger le ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emails_personnalises_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccess(`${successCount} emails personnalisés exportés avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'export des emails personnalisés:', error);
      showError(`Erreur lors de l'export des emails personnalisés: ${error.message}`);
    }
  };
  
  // Fonction pour télécharger la notice d'utilisation en PDF
  const downloadUserGuide = () => {
    // En pratique, vous pourriez générer un PDF dynamiquement ou précharger un PDF statique
    // Pour cet exemple, nous allons simuler le téléchargement d'un PDF
    showInfo('Téléchargement de la notice d\'utilisation...');
    
    // Créer un élément blob avec le contenu du PDF (ici, un texte simple pour simuler)
    const pdfContent = `
Notice d'utilisation de l'outil Phisher

1. Introduction
   L'outil Phisher est conçu pour les équipes de red teaming afin de créer des emails de phishing personnalisés
   dans le cadre de tests de sécurité légitimes et d'exercices de sensibilisation.

2. Création et gestion des variables dynamiques
   - Les variables permettent de personnaliser les emails pour chaque destinataire
   - Format: {{nom_variable}} dans le contenu de l'email
   - Variables prédéfinies: prénom, nom, entreprise, poste
   - Vous pouvez ajouter vos propres variables avec un ID unique

3. Importation de destinataires via CSV
   - Format requis: première ligne = en-têtes (email obligatoire)
   - Exemple: email,firstname,lastname,company
   - Chaque colonne du CSV devient une variable disponible
   - Les variables du CSV sont automatiquement ajoutées à la liste des variables

4. Formats d'exportation
   - HTML: pour l'intégration dans des sites web ou des tests locaux
   - EML: format standard compatible avec la plupart des clients de messagerie
   - ZIP: pour exporter des emails personnalisés pour plusieurs destinataires

5. Techniques d'obfuscation
   - Obfuscation des liens: les liens sont divisés et reconstruits via JavaScript pour éviter la détection
   - Obfuscation des mots-clés: les caractères sont remplacés par des équivalents visuels (ex: 'o' cyrillique)
     et des espaces de largeur nulle sont insérés entre les caractères
   - Pixel de suivi: permet de savoir si l'email a été ouvert
   - Suivi des clics: permet de savoir si les liens ont été cliqués

6. Conseils d'utilisation
   - Testez vos emails sur différents clients de messagerie avant de les envoyer
   - Utilisez des templates pour gagner du temps
   - Personnalisez au maximum vos emails pour augmenter leur crédibilité
   - Respectez l'éthique et la légalité dans vos tests de phishing

7. Bonnes pratiques
   - Obtenez toujours l'autorisation avant de mener des tests de phishing
   - Informez et formez les utilisateurs après les tests
   - Documentez vos résultats pour améliorer la sécurité
   - N'utilisez jamais cet outil à des fins malveillantes

Pour plus d'informations, contactez votre équipe de sécurité.
    `;
    
    // Créer un blob pour le téléchargement
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notice_utilisation_phisher.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Notice d\'utilisation téléchargée');
  };
  
  return (
    <div className="phisher bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Phisher - Créateur d'E-mails</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="mb-4">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sujet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Sujet de l'e-mail"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                De (From)
              </label>
              <input
                type="email"
                id="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="expediteur@exemple.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                À (To)
              </label>
              <input
                type="email"
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="destinataire@exemple.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="cc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cc
                </label>
                <input
                  type="email"
                  id="cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@exemple.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="bcc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bcc
                </label>
                <input
                  type="email"
                  id="bcc"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@exemple.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contenu de l'e-mail <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                    className="text-sm flex items-center text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <FiCode className="mr-1" /> Variables
                  </button>
                  <button
                    onClick={() => setShowObfuscationPanel(!showObfuscationPanel)}
                    className="text-sm flex items-center text-green-600 dark:text-green-400 hover:underline"
                  >
                    <FiShield className="mr-1" /> Obfuscation
                  </button>
                  <button
                    onClick={() => setShowRecipientsPanel(!showRecipientsPanel)}
                    className="text-sm flex items-center text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <FiUsers className="mr-1" /> Destinataires
                  </button>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showPreview ? (
                      <>
                        <FiEyeOff className="mr-1" /> Masquer la prévisualisation
                      </>
                    ) : (
                      <>
                        <FiEye className="mr-1" /> Afficher la prévisualisation
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {showVariablesPanel && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Variables dynamiques</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {variables.map((variable) => (
                      <div key={variable.id} className="flex items-center space-x-2">
                        <button
                          onClick={() => insertVariable(variable.id)}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs"
                        >
                          {variable.name} ({"{{" + variable.id + "}}"})
                        </button>
                        <input
                          type="text"
                          value={variable.value}
                          onChange={(e) => updateVariableValue(variable.id, e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md"
                          placeholder="Valeur"
                        />
                        <button
                          onClick={() => deleteVariable(variable.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="text"
                      value={newVariable.id}
                      onChange={(e) => setNewVariable({...newVariable, id: e.target.value.replace(/\s+/g, '_').toLowerCase()})}
                      className="w-1/4 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md"
                      placeholder="ID (sans espaces)"
                    />
                    <input
                      type="text"
                      value={newVariable.name}
                      onChange={(e) => setNewVariable({...newVariable, name: e.target.value})}
                      className="w-1/4 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md"
                      placeholder="Nom affiché"
                    />
                    <input
                      type="text"
                      value={newVariable.value}
                      onChange={(e) => setNewVariable({...newVariable, value: e.target.value})}
                      className="w-1/3 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md"
                      placeholder="Valeur par défaut"
                    />
                    <button
                      onClick={addNewVariable}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs flex items-center"
                    >
                      <FiPlus size={12} className="mr-1" /> Ajouter
                    </button>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Utilisez les variables en cliquant sur les boutons ou en tapant {"{{nom_variable}}"} dans le contenu.
                  </div>
                </div>
              )}
              
              {showObfuscationPanel && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Techniques d'obfuscation et de suivi</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="obfuscateLinks"
                        checked={obfuscationSettings.obfuscateLinks}
                        onChange={(e) => setObfuscationSettings({...obfuscationSettings, obfuscateLinks: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="obfuscateLinks" className="text-xs">
                        Obfusquer les liens (JavaScript)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="obfuscateKeywords"
                        checked={obfuscationSettings.obfuscateKeywords}
                        onChange={(e) => setObfuscationSettings({...obfuscationSettings, obfuscateKeywords: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="obfuscateKeywords" className="text-xs">
                        Obfusquer les mots-clés sensibles
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="trackingPixel"
                        checked={obfuscationSettings.trackingPixel}
                        onChange={(e) => setObfuscationSettings({...obfuscationSettings, trackingPixel: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="trackingPixel" className="text-xs">
                        Ajouter un pixel de suivi
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="clickTracking"
                        checked={obfuscationSettings.clickTracking}
                        onChange={(e) => setObfuscationSettings({...obfuscationSettings, clickTracking: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="clickTracking" className="text-xs">
                        Suivre les clics sur les liens
                      </label>
                    </div>
                  </div>
                  
                  {obfuscationSettings.obfuscateKeywords && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium mb-1">Mots-clés à obfusquer</h5>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {keywordsToObfuscate.map((keyword) => (
                          <div key={keyword} className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs flex items-center">
                            {keyword}
                            <button
                              onClick={() => removeKeyword(keyword)}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md"
                          placeholder="Nouveau mot-clé à obfusquer"
                        />
                        <button
                          onClick={addKeywordToObfuscate}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs flex items-center"
                        >
                          <FiPlus size={12} className="mr-1" /> Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Ces techniques aident à contourner les filtres anti-phishing et à suivre l'efficacité de vos campagnes.
                  </div>
                </div>
              )}
              
              {showRecipientsPanel && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Liste des destinataires</h4>
                  
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs flex items-center"
                      >
                        <FiUpload size={12} className="mr-1" /> Importer CSV
                      </button>
                      <button
                        onClick={downloadSampleCSV}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-xs flex items-center"
                      >
                        <FiDownload size={12} className="mr-1" /> Exemple CSV
                      </button>
                      <button
                        onClick={addRecipient}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs flex items-center"
                      >
                        <FiPlus size={12} className="mr-1" /> Ajouter manuellement
                      </button>
                      {recipients.length > 0 && (
                        <button
                          onClick={exportPersonalizedEmails}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-xs flex items-center ml-auto"
                        >
                          <FiMail size={12} className="mr-1" /> Exporter tous ({recipients.length})
                        </button>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv"
                      className="hidden"
                    />
                  </div>
                  
                  {recipients.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-gray-200 dark:bg-gray-600">
                            <th className="px-2 py-1 text-left">Email</th>
                            {variables.map(variable => (
                              <th key={variable.id} className="px-2 py-1 text-left">{variable.name}</th>
                            ))}
                            <th className="px-2 py-1 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipients.map((recipient, index) => (
                            <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                              <td className="px-2 py-1">
                                <input
                                  type="email"
                                  value={recipient.email}
                                  onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded"
                                />
                              </td>
                              {variables.map(variable => (
                                <td key={variable.id} className="px-2 py-1">
                                  <input
                                    type="text"
                                    value={recipient[variable.id] || ''}
                                    onChange={(e) => updateRecipient(index, variable.id, e.target.value)}
                                    className="w-full px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1 text-right">
                                <button
                                  onClick={() => removeRecipient(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Aucun destinataire. Importez un fichier CSV ou ajoutez des destinataires manuellement.
                    </p>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Créez des emails personnalisés pour plusieurs destinataires en utilisant les variables.
                  </div>
                </div>
              )}
              
              <div className={`editor-container ${showPreview ? 'hidden' : 'block'}`}>
                <ReactQuill
                  ref={quillRef}
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  placeholder="Composez votre e-mail ici..."
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                  theme="snow"
                />
              </div>
              
              {showPreview && (
                <div className="preview-container bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-4 mt-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Prévisualisation (avec variables remplacées et obfuscation) :</div>
                  <div 
                    className="email-preview"
                    dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                  />
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 mt-6">
              <button
                onClick={saveTemplate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                disabled={!subject.trim() || !content.trim()}
              >
                <FiSave className="mr-2" />
                Sauvegarder comme template
              </button>
              
              <button
                onClick={copyHtml}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center"
                disabled={!content.trim()}
              >
                <FiCopy className="mr-2" />
                Copier HTML
              </button>
              
              <button
                onClick={exportHtml}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                disabled={!subject.trim() || !content.trim()}
              >
                <FiFileText className="mr-2" />
                Exporter HTML
              </button>
              
              <button
                onClick={exportEml}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
                disabled={!subject.trim() || !content.trim()}
              >
                <FiMail className="mr-2" />
                Exporter EML
              </button>
              
              <button
                onClick={downloadUserGuide}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <FiHelpCircle className="mr-2" />
                Notice
              </button>
              
              {recipients.length > 0 && (
                <button
                  onClick={exportPersonalizedEmails}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md flex items-center"
                  disabled={!subject.trim() || !content.trim()}
                >
                  <FiUsers className="mr-2" />
                  Exporter pour {recipients.length} destinataires
                </button>
              )}
              
              <button
                onClick={resetForm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <FiTrash2 className="mr-2" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Templates</h2>
            
            {templates.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                Aucun template sauvegardé. Créez un e-mail et sauvegardez-le comme template.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {templates.map((template) => (
                  <li 
                    key={template.id} 
                    className={`py-3 px-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded ${
                      selectedTemplate === template.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400' : ''
                    }`}
                    onClick={() => loadTemplate(template)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-full">
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {template.name}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                            {new Date(template.createdAt).toLocaleDateString()}
                          </span>
                          {template.from && (
                            <span className="text-xs ml-2 text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                              {template.from}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {template.content.replace(/<[^>]*>/g, ' ').substring(0, 60)}...
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 ml-2">
                        <button
                          onClick={(e) => previewTemplateContent(template, e)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                          title="Prévisualiser"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={(e) => deleteTemplate(template.id, e)}
                          className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                          title="Supprimer"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-2">Conseils pour le phishing</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>Utilisez des sujets qui créent un sentiment d'urgence</li>
                <li>Personnalisez l'e-mail avec des informations sur la cible</li>
                <li>Imitez le style et le format des e-mails légitimes</li>
                <li>Vérifiez les fautes d'orthographe et de grammaire</li>
                <li>Testez l'e-mail sur différents clients de messagerie</li>
                <li>Utilisez des domaines similaires aux domaines légitimes</li>
              </ul>
              <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                <strong>Note:</strong> Cet outil est destiné uniquement aux tests de sécurité légitimes et aux exercices de sensibilisation. Utilisez-le de manière éthique et responsable.
              </div>
            </div>
            
            {previewTemplate && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-semibold">Prévisualisation du template</h3>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                    title="Fermer la prévisualisation"
                  >
                    <FiEyeOff size={16} />
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded shadow-sm">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">{previewTemplate.name}</h4>
                  {previewTemplate.from && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      De: {previewTemplate.from}
                    </p>
                  )}
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                    <div 
                      className="email-preview text-sm"
                      dangerouslySetInnerHTML={{ __html: getTemplatePreviewContent(previewTemplate.content) }}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => loadTemplate(previewTemplate)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm rounded-md flex items-center"
                    >
                      <FiFileText className="mr-1" size={14} />
                      Charger ce template
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Modèles d'e-mails courants pour le phishing</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded shadow-sm">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Réinitialisation de mot de passe</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              E-mail demandant à l'utilisateur de réinitialiser son mot de passe en raison d'une activité suspecte.
            </p>
            <button
              onClick={() => {
                setSubject('Action requise : Réinitialisation de votre mot de passe');
                setContent(`
                  <p>Cher utilisateur,</p>
                  <p>Nous avons détecté une activité inhabituelle sur votre compte. Par mesure de sécurité, veuillez réinitialiser votre mot de passe en cliquant sur le lien ci-dessous :</p>
                  <p><a href="#" style="color: #0066cc;">Réinitialiser mon mot de passe</a></p>
                  <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
                  <p>Cordialement,<br>L'équipe de sécurité</p>
                `);
              }}
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Utiliser ce modèle
            </button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded shadow-sm">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Facture en attente</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              E-mail informant l'utilisateur d'une facture en attente de paiement.
            </p>
            <button
              onClick={() => {
                setSubject('Votre facture #INV-2023-1234 est en attente de paiement');
                setContent(`
                  <p>Bonjour,</p>
                  <p>Nous vous informons que votre facture #INV-2023-1234 d'un montant de 299,99€ est en attente de paiement.</p>
                  <p>Veuillez consulter les détails et procéder au paiement en cliquant sur le lien suivant :</p>
                  <p><a href="#" style="color: #0066cc;">Voir et payer ma facture</a></p>
                  <p>Date d'échéance : <strong>${new Date().toLocaleDateString()}</strong></p>
                  <p>Cordialement,<br>Service de facturation</p>
                `);
              }}
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Utiliser ce modèle
            </button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded shadow-sm">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Mise à jour de sécurité</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              E-mail demandant à l'utilisateur de mettre à jour ses informations de sécurité.
            </p>
            <button
              onClick={() => {
                setSubject('Important : Mise à jour de sécurité requise');
                setContent(`
                  <p>Cher client,</p>
                  <p>Dans le cadre de notre engagement à protéger vos informations, nous avons mis à jour nos protocoles de sécurité.</p>
                  <p>Veuillez vérifier et mettre à jour vos informations de sécurité en cliquant sur le lien ci-dessous :</p>
                  <p><a href="#" style="color: #0066cc;">Mettre à jour mes informations de sécurité</a></p>
                  <p>Cette mise à jour est obligatoire et doit être effectuée avant le <strong>${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>.</p>
                  <p>Cordialement,<br>L'équipe de sécurité</p>
                `);
              }}
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Utiliser ce modèle
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        .ql-editor {
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .email-preview {
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          color: #1a202c;
          font-family: Arial, sans-serif;
          line-height: 1.5;
        }
        
        /* Styles pour la prévisualisation */
        .email-preview h1 {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 0.5em;
          margin-top: 0.5em;
        }
        
        .email-preview h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 0.5em;
          margin-top: 0.5em;
        }
        
        .email-preview h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin-bottom: 0.5em;
          margin-top: 0.5em;
        }
        
        .email-preview h4 {
          font-size: 1em;
          font-weight: bold;
          margin-bottom: 0.5em;
          margin-top: 0.5em;
        }
        
        .email-preview h5 {
          font-size: 0.83em;
          font-weight: bold;
          margin-bottom: 0.5em;
          margin-top: 0.5em;
        }
        
        .email-preview h6 {
          font-size: 0.67em;
          font-weight: bold;
          margin-bottom: 0.5em;
          margin-top: 0.5em;
        }
        
        .email-preview ul {
          list-style-type: disc;
          margin-left: 1.5em;
          margin-bottom: 1em;
          padding-left: 1em;
        }
        
        .email-preview ol {
          list-style-type: decimal;
          margin-left: 1.5em;
          margin-bottom: 1em;
          padding-left: 1em;
        }
        
        .email-preview li {
          margin-bottom: 0.5em;
          display: list-item;
        }
        
        .email-preview p {
          margin-bottom: 1em;
        }
        
        .email-preview a {
          color: #3182ce;
          text-decoration: underline;
        }
        
        .email-preview blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
        }
        
        /* Styles spécifiques pour les alignements Quill */
        .email-preview [class*="ql-align-"] {
          display: block;
          width: 100%;
        }
        
        .email-preview .ql-align-center {
          text-align: center !important;
        }
        
        .email-preview .ql-align-right {
          text-align: right !important;
        }
        
        .email-preview .ql-align-justify {
          text-align: justify !important;
        }
        
        /* Styles pour les listes Quill */
        .email-preview .ql-indent-1 {
          padding-left: 3em !important;
        }
        
        .email-preview .ql-indent-2 {
          padding-left: 6em !important;
        }
        
        .email-preview .ql-indent-3 {
          padding-left: 9em !important;
        }
        
        /* Styles pour les couleurs de texte et d'arrière-plan */
        .email-preview .ql-color-red {
          color: #e53e3e !important;
        }
        
        .email-preview .ql-color-blue {
          color: #3182ce !important;
        }
        
        .email-preview .ql-color-green {
          color: #38a169 !important;
        }
        
        .email-preview .ql-bg-red {
          background-color: #fed7d7 !important;
        }
        
        .email-preview .ql-bg-blue {
          background-color: #bee3f8 !important;
        }
        
        .email-preview .ql-bg-green {
          background-color: #c6f6d5 !important;
        }
        
        /* Styles pour le mode sombre */
        .dark .email-preview {
          color: #e2e8f0;
        }
        
        .dark .email-preview a {
          color: #63b3ed;
        }
        
        .dark .email-preview blockquote {
          border-left-color: #4a5568;
        }
        
        .dark .ql-snow .ql-stroke {
          stroke: #e2e8f0;
        }
        
        .dark .ql-snow .ql-fill {
          fill: #e2e8f0;
        }
        
        .dark .ql-toolbar.ql-snow {
          border-color: #4b5563;
          background-color: #374151;
        }
        
        .dark .ql-container.ql-snow {
          border-color: #4b5563;
        }
        
        .dark .ql-editor {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default Phisher; 