# Extension Trimble File Explorer

Cette extension permet d'explorer les fichiers des projets Trimble Connect.

## Problème de CORS avec GitHub Pages

GitHub Pages ne prend pas en charge nativement les en-têtes CORS nécessaires pour que Trimble Connect puisse accéder au fichier manifest.json. Nous avons créé deux approches alternatives :

### Option 1 : Utiliser le fichier manifest-proxy.html

1. Accédez à la page manifest-proxy.html sur votre site GitHub Pages
2. Téléchargez le fichier manifest.json généré
3. Hébergez ce fichier sur un serveur qui prend en charge les en-têtes CORS (Netlify, Azure, etc.)
4. Utilisez cette URL pour ajouter l'extension à Trimble Connect

### Option 2 : Utiliser un autre service d'hébergement

Nous recommandons de déployer l'extension sur l'un des services suivants qui prennent en charge les en-têtes CORS :

- **Netlify** (Gratuit) : Le fichier netlify.toml est déjà configuré pour les en-têtes CORS
- **Azure Static Web Apps** (Niveau gratuit disponible) : Le fichier web.config est fourni
- **Serveur Web personnel** (Apache/Nginx) : Consultez les instructions dans le fichier GUIDE-HEBERGEMENT.md

## URL du manifeste

Une fois correctement hébergée, l'URL du manifeste sera :
https://votre-domaine.com/manifest.json
