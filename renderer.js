// Initialisation du localStorage
console.log('Initialisation du renderer');

// Fonction pour vérifier si le localStorage est disponible
function isLocalStorageAvailable() {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// Vérifier si le localStorage est disponible
if (isLocalStorageAvailable()) {
  console.log('localStorage est disponible');
  
  // Initialiser les todos s'ils n'existent pas
  if (!localStorage.getItem('todos')) {
    localStorage.setItem('todos', JSON.stringify([]));
  }
  
  // Initialiser les paramètres s'ils n'existent pas
  if (!localStorage.getItem('settings')) {
    const defaultSettings = {
      darkMode: false,
      primaryColor: '#4f46e5',
      showCompletedTasks: true,
      enableNotifications: false,
      autoSave: true
    };
    localStorage.setItem('settings', JSON.stringify(defaultSettings));
  }
  
  // Initialiser les vulnérabilités s'ils n'existent pas
  if (!localStorage.getItem('dashto_vulnerabilities')) {
    // Importer les données de démonstration depuis demoData.js
    const demoVulnerabilities = [
      {
        id: 'vuln-001',
        name: 'Injection SQL dans le formulaire de connexion',
        description: 'Une vulnérabilité d\'injection SQL a été découverte dans le formulaire de connexion.',
        type: 'web',
        severity: 'critical',
        status: 'open',
        cveId: 'CVE-2023-1234',
        discoveredAt: new Date('2023-10-15').toISOString(),
        resolvedAt: null,
        targetId: 'target-001',
        solution: 'Utiliser des requêtes préparées ou des procédures stockées.',
        exploitAvailable: true,
        references: 'https://owasp.org/www-community/attacks/SQL_Injection',
        notes: 'L\'injection a été confirmée en utilisant l\'outil SQLmap.',
        assignedTo: 'Alice Martin',
        tags: ['sql', 'injection', 'authentification', 'critique']
      },
      {
        id: 'vuln-002',
        name: 'Cross-Site Scripting (XSS) dans la page de profil',
        description: 'Une vulnérabilité XSS persistante a été identifiée dans la page de profil utilisateur.',
        type: 'web',
        severity: 'high',
        status: 'in_progress',
        cveId: '',
        discoveredAt: new Date('2023-10-20').toISOString(),
        resolvedAt: null,
        targetId: 'target-001',
        solution: 'Implémenter un encodage HTML approprié pour toutes les données affichées.',
        exploitAvailable: true,
        references: 'https://owasp.org/www-community/attacks/xss/',
        notes: 'Le champ "bio" du profil est particulièrement vulnérable.',
        assignedTo: 'Thomas Dubois',
        tags: ['xss', 'javascript', 'client-side']
      },
      {
        id: 'vuln-003',
        name: 'Exposition d\'informations sensibles dans les en-têtes HTTP',
        description: 'Les en-têtes HTTP de l\'application révèlent des informations sensibles.',
        type: 'web',
        severity: 'medium',
        status: 'resolved',
        cveId: '',
        discoveredAt: new Date('2023-09-05').toISOString(),
        resolvedAt: new Date('2023-10-10').toISOString(),
        targetId: 'target-001',
        solution: 'Configurer le serveur pour supprimer ou modifier les en-têtes révélant des informations sensibles.',
        exploitAvailable: false,
        references: 'https://owasp.org/www-project-secure-headers/',
        notes: 'Les en-têtes Server, X-Powered-By et X-AspNet-Version ont été identifiés comme problématiques.',
        assignedTo: 'Sophie Bernard',
        tags: ['headers', 'information-disclosure', 'configuration']
      }
    ];
    localStorage.setItem('dashto_vulnerabilities', JSON.stringify(demoVulnerabilities));
    console.log('Données de vulnérabilités initialisées');
  }
  
  // Initialiser les cibles s'ils n'existent pas
  if (!localStorage.getItem('dashto_targets')) {
    const demoTargets = [
      {
        id: 'target-001',
        name: 'Application Web Principale',
        type: 'web',
        address: 'https://app.example.com',
        os: 'Linux',
        services: ['HTTP', 'HTTPS', 'MySQL'],
        ports: [80, 443, 3306],
        status: 'active',
        lastScan: new Date('2023-10-25').toISOString(),
        vulnerabilities: ['vuln-001', 'vuln-002', 'vuln-003'],
        notes: 'Serveur de production principal hébergeant l\'application web client.',
        tags: ['production', 'client', 'web']
      },
      {
        id: 'target-002',
        name: 'Serveur de Base de Données',
        type: 'server',
        address: '192.168.1.10',
        os: 'Ubuntu 20.04 LTS',
        services: ['MySQL', 'SSH'],
        ports: [3306, 22],
        status: 'active',
        lastScan: new Date('2023-10-24').toISOString(),
        vulnerabilities: [],
        notes: 'Serveur de base de données principal contenant les données clients et les transactions.',
        tags: ['production', 'database', 'internal']
      }
    ];
    localStorage.setItem('dashto_targets', JSON.stringify(demoTargets));
    console.log('Données de cibles initialisées');
  }
} else {
  console.error('localStorage n\'est pas disponible');
} 