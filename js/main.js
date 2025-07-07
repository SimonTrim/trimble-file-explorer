/**
 * Extension d'explorateur de fichiers Trimble Connect
 * 
 * Cette extension permet de naviguer dans les fichiers d'un projet Trimble Connect
 * et s'intègre directement dans l'interface de Trimble Connect en tant qu'extension.
 * 
 * @version 1.0.0
 */

// Variables globales
let trimbleAPI = null;
let currentProject = null;
let currentFolderId = null;
let filesData = [];
let breadcrumbPath = [];
let currentPage = 1;
let itemsPerPage = 20;
let totalPages = 1;
let darkMode = localStorage.getItem('trimbleExplorerDarkMode') === 'true';

// Sélecteurs DOM
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const filesContainer = document.getElementById('files-container');
const emptyState = document.getElementById('empty-state');
const footer = document.getElementById('footer');
const filesCount = document.getElementById('files-count');
const paginationInfo = document.getElementById('pagination-info');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const filterSelect = document.getElementById('filter-select');
const refreshButton = document.getElementById('refresh-button');
const retryButton = document.getElementById('retry-button');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const breadcrumbElement = document.getElementById('breadcrumb');
const fileDetailsModal = document.getElementById('file-details-modal');
const closeModalBtn = document.getElementById('close-modal');
const downloadFileBtn = document.getElementById('download-file');

// Types de fichiers et leurs icônes
const fileTypes = {
    folder: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>',
        class: 'folder'
    },
    model: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4l2 2h4a2 2 0 012 2v5a2 2 0 01-2 2H9a2 2 0 00-2 2v5z" /></svg>',
        class: 'model'
    },
    document: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
        class: 'document'
    },
    image: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
        class: 'image'
    },
    default: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
        class: 'default'
    }
};

// Extensions de fichiers et leurs types
const fileExtensionMap = {
    // Modèles 3D
    'ifc': 'model',
    'rvt': 'model',
    'rfa': 'model',
    'nwc': 'model',
    'nwd': 'model',
    'dwg': 'model',
    'dxf': 'model',
    'skp': 'model',
    // Documents
    'pdf': 'document',
    'doc': 'document',
    'docx': 'document',
    'xls': 'document',
    'xlsx': 'document',
    'ppt': 'document',
    'pptx': 'document',
    'txt': 'document',
    // Images
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'bmp': 'image',
    'tif': 'image',
    'tiff': 'image'
};

/**
 * Initialise l'application au chargement
 */
document.addEventListener('DOMContentLoaded', () => {
    // Appliquer le mode sombre si activé
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }

    // Initialiser l'API Trimble Connect
    initializeTrimbleAPI();
    
    // Gestionnaires d'événements
    setupEventListeners();
});

/**
 * Initialise l'API Trimble Connect Workspace
 */
async function initializeTrimbleAPI() {
    showLoadingState();
    
    try {
        console.log('Initialisation de l\'API Trimble Connect Workspace...');
        
        // Vérifier que l'API est bien chargée
        if (!window.TrimbleConnectWorkspace) {
            throw new Error('API Trimble Connect Workspace non disponible');
        }
        
        // Initialisation de l'API en mode extension intégrée
        // Notez l'utilisation de window.parent comme cible, ce qui est crucial pour les extensions
        trimbleAPI = await window.TrimbleConnectWorkspace.connect(
            window.parent,
            handleTrimbleEvents,
            30000 // Timeout en millisecondes
        );
        
        console.log('API Trimble Connect initialisée:', trimbleAPI);
        
        // Récupérer le projet courant
        await getCurrentProject();
        
        // Définir les menus de l'extension
        await setupExtensionMenu();
        
        // Charger les fichiers à la racine du projet
        await loadFiles();
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'API:', error);
        showErrorState(error.message || 'Erreur de connexion à Trimble Connect');
    }
}

/**
 * Gère les événements envoyés par Trimble Connect
 */
function handleTrimbleEvents(event, args) {
    console.log('Événement Trimble reçu:', event, args);
    
    switch (event) {
        case 'extension.command':
            // Commande exécutée par l'utilisateur
            handleCommand(args.data);
            break;
            
        case 'extension.accessToken':
            // Token d'accès reçu
            console.log('Token reçu ou mise à jour');
            break;
            
        case 'extension.userSettingsChanged':
            // Paramètres utilisateur modifiés
            console.log('Paramètres utilisateur modifiés');
            break;
            
        default:
            console.log('Événement non géré:', event);
    }
}

/**
 * Gère les commandes reçues par l'extension
 */
function handleCommand(command) {
    console.log('Commande reçue:', command);
    
    switch (command) {
        case 'open_settings':
            // Afficher les paramètres
            alert('Paramètres de l\'extension (à implémenter)');
            break;
            
        case 'show_root_folder':
            // Afficher le dossier racine
            navigateToFolder(null);
            break;
            
        case 'refresh_files':
            // Actualiser les fichiers
            loadFiles();
            break;
            
        default:
            console.log('Commande inconnue:', command);
    }
}

/**
 * Configure le menu de l'extension dans Trimble Connect
 */
async function setupExtensionMenu() {
    try {
        // Définir le menu principal et les sous-menus
        const menuObject = {
            title: "Explorateur de fichiers",
            icon: "assets/icon.svg",
            command: "show_root_folder",
            subMenus: [
                {
                    title: "Dossier racine",
                    icon: "assets/folder.svg",
                    command: "show_root_folder",
                },
                {
                    title: "Actualiser",
                    icon: "assets/refresh.svg",
                    command: "refresh_files",
                },
                {
                    title: "Paramètres",
                    icon: "assets/settings.svg",
                    command: "open_settings",
                }
            ]
        };
        
        // Définir le menu dans Trimble Connect
        await trimbleAPI.ui.setMenu(menuObject);
        
        // Définir le menu actif
        await trimbleAPI.ui.setActiveMenuItem("show_root_folder");
        
        console.log('Menu de l\'extension configuré');
    } catch (error) {
        console.error('Erreur lors de la configuration du menu:', error);
    }
}

/**
 * Récupère les informations du projet courant
 */
async function getCurrentProject() {
    try {
        currentProject = await trimbleAPI.project.getCurrentProject();
        console.log('Projet courant:', currentProject);
        
        // Afficher un message d'état avec le nom du projet
        trimbleAPI.extension.setStatusMessage(`Projet: ${currentProject.name}`);
        
        return currentProject;
    } catch (error) {
        console.error('Erreur lors de la récupération du projet courant:', error);
        showErrorState('Impossible de récupérer les informations du projet');
        throw error;
    }
}

/**
 * Charge les fichiers du dossier courant
 */
async function loadFiles() {
    showLoadingState();
    
    try {
        if (!currentProject) {
            await getCurrentProject();
        }
        
        // Récupérer les fichiers du dossier courant
        const files = await trimbleAPI.files.getFolder(
            currentProject.id, 
            currentFolderId
        );
        
        console.log('Fichiers récupérés:', files);
        filesData = files || [];
        
        // Mettre à jour le fil d'Ariane
        updateBreadcrumb();
        
        // Appliquer les filtres et le tri
        filterAndSortFiles();
        
        // Afficher les fichiers
        renderFiles();
    } catch (error) {
        console.error('Erreur lors du chargement des fichiers:', error);
        showErrorState('Impossible de charger les fichiers');
    }
}

/**
 * Filtre et trie les fichiers selon les critères sélectionnés
 */
function filterAndSortFiles() {
    const searchTerm = searchInput.value.toLowerCase();
    const sortBy = sortSelect.value;
    const filterType = filterSelect.value;
    
    // Filtrer les fichiers
    let filteredFiles = [...filesData];
    
    // Filtrer par type
    if (filterType !== 'all') {
        if (filterType === 'folders') {
            filteredFiles = filteredFiles.filter(file => file.type === 'folder');
        } else if (filterType === 'files') {
            filteredFiles = filteredFiles.filter(file => file.type !== 'folder');
        } else {
            const fileTypeMappings = {
                'models': ['ifc', 'rvt', 'rfa', 'nwc', 'nwd', 'dwg', 'dxf', 'skp'],
                'documents': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
            };
            
            const extensions = fileTypeMappings[filterType] || [];
            filteredFiles = filteredFiles.filter(file => {
                if (file.type === 'folder') return false;
                const extension = file.name.split('.').pop().toLowerCase();
                return extensions.includes(extension);
            });
        }
    }
    
    // Filtrer par terme de recherche
    if (searchTerm) {
        filteredFiles = filteredFiles.filter(file => 
            file.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Trier les fichiers
    filteredFiles.sort((a, b) => {
        // Toujours mettre les dossiers en premier
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        
        // Ensuite trier selon le critère sélectionné
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'date':
                return new Date(b.dateModified || b.created) - new Date(a.dateModified || a.created);
            case 'size':
                return (b.size || 0) - (a.size || 0);
            case 'type':
                const extA = a.name.split('.').pop().toLowerCase();
                const extB = b.name.split('.').pop().toLowerCase();
                return extA.localeCompare(extB);
            default:
                return 0;
        }
    });
    
    // Mettre à jour les données
    filesData = filteredFiles;
    
    // Calculer la pagination
    totalPages = Math.max(1, Math.ceil(filesData.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
}

/**
 * Affiche les fichiers dans l'interface
 */
function renderFiles() {
    // Si aucun fichier
    if (filesData.length === 0) {
        showEmptyState();
        return;
    }
    
    // Calculer les indices de début et fin pour la pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filesData.length);
    const filesToShow = filesData.slice(startIndex, endIndex);
    
    // Vider le conteneur
    filesContainer.innerHTML = '';
    
    // Créer les cartes de fichiers
    filesToShow.forEach(file => {
        const card = createFileCard(file);
        filesContainer.appendChild(card);
    });
    
    // Mettre à jour la pagination
    updatePagination();
    
    // Afficher le conteneur de fichiers
    showFilesState();
}

/**
 * Crée une carte pour représenter un fichier ou dossier
 */
function createFileCard(file) {
    const isFolder = file.type === 'folder';
    const extension = !isFolder ? file.name.split('.').pop().toLowerCase() : '';
    
    // Déterminer le type de fichier pour l'icône
    let fileType = 'default';
    if (isFolder) {
        fileType = 'folder';
    } else if (fileExtensionMap[extension]) {
        fileType = fileExtensionMap[extension];
    }
    
    // Créer la carte
    const card = document.createElement('div');
    card.className = 'file-card bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center cursor-pointer';
    card.dataset.id = file.id;
    card.dataset.type = file.type;
    card.dataset.name = file.name;
    
    // Icône
    const fileIconType = fileTypes[fileType] || fileTypes.default;
    
    // Construire le HTML de la carte
    card.innerHTML = `
        <div class="file-icon ${fileIconType.class}">
            ${fileIconType.icon}
        </div>
        <div class="flex-grow">
            <div class="font-medium truncate" title="${file.name}">${file.name}</div>
            <div class="text-xs text-gray-600 flex justify-between mt-1">
                <span>${isFolder ? 'Dossier' : formatFileSize(file.size || 0)}</span>
                <span>${formatDate(file.dateModified || file.created)}</span>
            </div>
        </div>
    `;
    
    // Ajouter les événements
    card.addEventListener('click', () => {
        if (isFolder) {
            navigateToFolder(file.id);
        } else {
            showFileDetails(file);
        }
    });
    
    return card;
}

/**
 * Met à jour le fil d'Ariane
 */
function updateBreadcrumb() {
    // Vider le fil d'Ariane
    breadcrumbElement.innerHTML = '<span class="cursor-pointer hover:underline" data-path="root">Racine</span>';
    
    // Ajouter les éléments du chemin
    if (breadcrumbPath.length > 0) {
        breadcrumbPath.forEach((item, index) => {
            breadcrumbElement.innerHTML += ' > ';
            breadcrumbElement.innerHTML += `<span class="cursor-pointer hover:underline" data-path="${item.id}">${item.name}</span>`;
        });
    }
    
    // Ajouter les événements
    const pathItems = breadcrumbElement.querySelectorAll('[data-path]');
    pathItems.forEach(item => {
        item.addEventListener('click', () => {
            const pathId = item.dataset.path;
            if (pathId === 'root') {
                // Revenir à la racine
                navigateToFolder(null);
            } else {
                // Naviguer jusqu'à ce niveau
                const index = breadcrumbPath.findIndex(p => p.id === pathId);
                if (index >= 0) {
                    breadcrumbPath = breadcrumbPath.slice(0, index + 1);
                    currentFolderId = pathId;
                    loadFiles();
                }
            }
        });
    });
}

/**
 * Navigue vers un dossier spécifique
 */
function navigateToFolder(folderId) {
    if (!folderId) {
        // Revenir à la racine
        currentFolderId = null;
        breadcrumbPath = [];
    } else {
        // Naviguer vers le dossier sélectionné
        const folder = filesData.find(f => f.id === folderId);
        if (folder) {
            currentFolderId = folderId;
            breadcrumbPath.push({
                id: folder.id,
                name: folder.name
            });
        }
    }
    
    // Réinitialiser la pagination
    currentPage = 1;
    
    // Charger les fichiers du nouveau dossier
    loadFiles();
}

/**
 * Affiche les détails d'un fichier
 */
async function showFileDetails(file) {
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    
    // Définir le titre
    modalTitle.textContent = file.name;
    
    // Afficher les détails du fichier
    const extension = file.name.split('.').pop().toLowerCase();
    const fileType = fileExtensionMap[extension] || 'default';
    const iconType = fileTypes[fileType] || fileTypes.default;
    
    // Formater les détails
    const created = formatDate(file.created, true);
    const modified = formatDate(file.dateModified, true);
    const size = formatFileSize(file.size || 0);
    
    // Construire le contenu du modal
    modalContent.innerHTML = `
        <div class="flex items-center mb-4">
            <div class="file-icon ${iconType.class} mr-4">
                ${iconType.icon}
            </div>
            <div>
                <div class="text-lg font-semibold">${file.name}</div>
                <div class="text-sm text-gray-600">${extension.toUpperCase()} - ${size}</div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <h3 class="font-medium mb-2">Informations</h3>
                <div class="text-sm">
                    <p><strong>ID:</strong> ${file.id}</p>
                    <p><strong>Créé le:</strong> ${created}</p>
                    <p><strong>Modifié le:</strong> ${modified}</p>
                </div>
            </div>
            <div>
                <h3 class="font-medium mb-2">Propriétés</h3>
                <div class="text-sm">
                    <p><strong>Version:</strong> ${file.version || 'N/A'}</p>
                    <p><strong>Propriétaire:</strong> ${file.creator?.email || 'N/A'}</p>
                </div>
            </div>
        </div>
    `;
    
    // Configurer le bouton de téléchargement
    downloadFileBtn.onclick = () => downloadFile(file);
    
    // Afficher le modal
    fileDetailsModal.classList.remove('hidden');
}

/**
 * Télécharge un fichier
 */
async function downloadFile(file) {
    try {
        // Afficher un message de chargement
        downloadFileBtn.textContent = 'Téléchargement...';
        downloadFileBtn.disabled = true;
        
        // Récupérer l'URL de téléchargement
        const downloadUrl = await trimbleAPI.files.getDownloadUrl(
            currentProject.id,
            file.id
        );
        
        // Créer un lien de téléchargement et cliquer dessus
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Réinitialiser le bouton
        setTimeout(() => {
            downloadFileBtn.textContent = 'Télécharger';
            downloadFileBtn.disabled = false;
        }, 1000);
        
    } catch (error) {
        console.error('Erreur lors du téléchargement du fichier:', error);
        alert('Erreur lors du téléchargement du fichier');
        downloadFileBtn.textContent = 'Télécharger';
        downloadFileBtn.disabled = false;
    }
}

/**
 * Met à jour les informations de pagination
 */
function updatePagination() {
    // Mettre à jour le compteur
    filesCount.textContent = filesData.length;
    
    // Mettre à jour la pagination
    paginationInfo.textContent = `Page ${currentPage} sur ${totalPages}`;
    
    // Activer/désactiver les boutons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    
    // Afficher le pied de page
    footer.classList.remove('hidden');
}

/**
 * Configure tous les gestionnaires d'événements
 */
function setupEventListeners() {
    // Gestionnaire pour le bouton de pagination précédent
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderFiles();
        }
    });
    
    // Gestionnaire pour le bouton de pagination suivant
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderFiles();
        }
    });
    
    // Gestionnaire pour le champ de recherche
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        filterAndSortFiles();
        renderFiles();
    });
    
    // Gestionnaires pour le tri et le filtrage
    sortSelect.addEventListener('change', () => {
        filterAndSortFiles();
        renderFiles();
    });
    
    filterSelect.addEventListener('change', () => {
        currentPage = 1;
        filterAndSortFiles();
        renderFiles();
    });
    
    // Gestionnaire pour le bouton d'actualisation
    refreshButton.addEventListener('click', loadFiles);
    
    // Gestionnaire pour le bouton de nouvelle tentative
    retryButton.addEventListener('click', initializeTrimbleAPI);
    
    // Gestionnaire pour le basculement du mode sombre
    darkModeToggle.addEventListener('click', () => {
        darkMode = !darkMode;
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('trimbleExplorerDarkMode', darkMode);
    });
    
    // Gestionnaires pour les modals
    closeModalBtn.addEventListener('click', () => {
        fileDetailsModal.classList.add('hidden');
    });
    
    // Fermer le modal en cliquant à l'extérieur
    fileDetailsModal.addEventListener('click', (e) => {
        if (e.target === fileDetailsModal) {
            fileDetailsModal.classList.add('hidden');
        }
    });
    
    // Fermer le modal avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !fileDetailsModal.classList.contains('hidden')) {
            fileDetailsModal.classList.add('hidden');
        }
    });
}

/**
 * Affiche l'état de chargement
 */
function showLoadingState() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    filesContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    footer.classList.add('hidden');
}

/**
 * Affiche l'état d'erreur
 */
function showErrorState(message) {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    filesContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    footer.classList.add('hidden');
    
    errorMessage.textContent = message || 'Une erreur s\'est produite';
}

/**
 * Affiche l'état vide (aucun fichier)
 */
function showEmptyState() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    filesContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    footer.classList.add('hidden');
}

/**
 * Affiche l'état des fichiers
 */
function showFilesState() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    filesContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
    footer.classList.remove('hidden');
}

/**
 * Formate la taille d'un fichier
 */
function formatFileSize(sizeInBytes) {
    if (sizeInBytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const base = 1024;
    const unitIndex = Math.floor(Math.log(sizeInBytes) / Math.log(base));
    const size = parseFloat((sizeInBytes / Math.pow(base, unitIndex)).toFixed(2));
    
    return `${size} ${units[unitIndex]}`;
}

/**
 * Formate une date
 */
function formatDate(dateString, withTime = false) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    if (withTime) {
        return date.toLocaleString();
    } else {
        return date.toLocaleDateString();
    }
}
