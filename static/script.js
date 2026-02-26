/**
 * DataCleaner API - Gestion du Graphique Statistique
 * Projet DSIA 2026
 */

document.addEventListener('DOMContentLoaded', function() {
    // 1. Récupération de la passerelle de données (le div invisible dans le HTML)
    const dataStore = document.getElementById('data-store');
    
    // Si l'élément n'existe pas, c'est qu'on est sur l'écran "Prêt pour l'analyse" (Image 12)
    // On arrête le script ici pour ne pas générer d'erreur.
    if (!dataStore) {
        console.log("Mode attente : aucun fichier analysé pour le moment.");
        return;
    }

    // 2. Extraction et conversion des données envoyées par Flask
    const initialRows = parseInt(dataStore.getAttribute('data-initial')) || 0;
    const cleanedRows = parseInt(dataStore.getAttribute('data-cleaned')) || 0;

    // 3. Initialisation du graphique Chart.js
    const ctx = document.getElementById('cleaningChart');
    
    if (ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Données Initiales', 'Données Nettoyées'],
                datasets: [{
                    label: 'Nombre de lignes',
                    data: [initialRows, cleanedRows],
                    backgroundColor: [
                        '#bdc3c7', // Gris pour l'état initial (Image 13)
                        '#0d6efd'  // Bleu pour l'état nettoyé (Image 13)
                    ],
                    borderColor: [
                        '#95a5a6',
                        '#0b5ed7'
                    ],
                    borderWidth: 1,
                    borderRadius: 8, // Coins arrondis pour un look moderne
                    barThickness: 80
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // On cache la légende car les axes sont clairs
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f0f0f0'
                        },
                        title: {
                            display: true,
                            text: 'Nombre de lignes'
                        }
                    },
                    x: {
                        grid: {
                            display: false // On cache la grille verticale pour épurer le design
                        }
                    }
                }
            }
        });
    }
});