import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FiSave, FiDownload, FiCopy, FiSend, FiEye, FiEyeOff, FiTrash2, FiFileText, FiMail } from 'react-icons/fi';
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
  
  // Fonction pour exporter l'e-mail au format HTML
  const exportHtml = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body>
  ${content}
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
    const emlContent = `From: ${from}
To: ${to}
${cc ? `Cc: ${cc}\n` : ''}${bcc ? `Bcc: ${bcc}\n` : ''}Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

${content}
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
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Prévisualisation :</div>
                  <div 
                    className="email-preview"
                    dangerouslySetInnerHTML={{ __html: content }}
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
                      dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
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
      
      <style jsx>{`
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