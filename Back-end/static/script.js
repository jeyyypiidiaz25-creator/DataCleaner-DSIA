/**
 * DataCleaner API - Logique Client
 */

// 1. GESTION DE L'INTERFACE D'UPLOAD
const uploadArea = document.getElementById('uploadIconClick');
const fileInput = document.getElementById('dataFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');

// Déclenche le sélecteur de fichier au clic sur l'icône
if (uploadArea) {
    uploadArea.addEventListener('click', () => fileInput.click());
}

// Affiche le nom du fichier sélectionné
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.innerText = e.target.files[0].name;
            fileNameDisplay.classList.add('text-primary', 'fw-bold');
        }
    });
}

// 2. TRAITEMENT DU FORMULAIRE (ENVOI À FLASK)
const processForm = document.getElementById('processForm');
let statsChart = null;
let detailsChart = null;

if (processForm) {
    processForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const btnSubmit = document.getElementById('btnSubmit');
        const file = fileInput.files[0];
        
        if (!file) {
            alert("Erreur : Veuillez d'abord sélectionner un fichier.");
            return;
        }

        // Création du FormData pour envoyer le fichier et les options
        const formData = new FormData();
        formData.append('file', file);
        formData.append('missing', document.getElementById('missing').checked);
        formData.append('outliers', document.getElementById('outliers').checked);
        formData.append('duplicates', document.getElementById('duplicates').checked);
        formData.append('normalize', document.getElementById('normalize').checked);

        // UI : Désactiver le bouton et montrer le chargement
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Traitement...';

        fetch('/process', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-gear-wide-connected me-2"></i>Lancer le nettoyage';

            if (data.error) {
                alert("Erreur serveur : " + data.error);
                return;
            }

            // A. Masquer le message de bienvenue et afficher les résultats
            document.getElementById('welcomeMessage').classList.add('d-none');
            document.getElementById('resultBox').classList.remove('d-none');

            // B. Afficher l'alerte de succès et le lien de téléchargement
            const statsDiv = document.getElementById('stats');
            statsDiv.innerHTML = `
                <div class="alert alert-success d-flex justify-content-between align-items-center shadow-sm animate__animated animate__fadeIn">
                    <span>
                        <i class="bi bi-check-circle-fill me-2"></i>
                        Nettoyage terminé : <strong>${data.rows_after}</strong> lignes conservées (initialement ${data.rows_before}).
                    </span>
                    <a href="${data.download_url}" class="btn btn-success btn-sm px-3 rounded-pill shadow-sm">
                        <i class="bi bi-download me-1"></i>Télécharger CSV
                    </a>
                </div>
            `;

            // C. Remplir le tableau de visualisation (Aperçu)
            const thead = document.getElementById('previewThead');
            const tbody = document.getElementById('previewTbody');

            // En-têtes (Colonnes)
            thead.innerHTML = '<tr>' + data.columns.map(col => `<th>${col}</th>`).join('') + '</tr>';
            
            // Lignes (Données)
            tbody.innerHTML = data.preview.map(row => {
                return '<tr>' + data.columns.map(col => {
                    const cellValue = row[col];
                    return `<td>${cellValue !== null ? cellValue : '<span class="text-danger">null</span>'}</td>`;
                }).join('') + '</tr>';
            }).join('');

            // D. Générer les graphiques
            updateCharts(data);
        })
        .catch(error => {
            console.error('Erreur Fetch:', error);
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Réessayer';
            alert("Une erreur est survenue lors de la communication avec l'API.");
        });
    });
}

// 3. FONCTION DES GRAPHIQUES (CHART.JS)
function updateCharts(data) {
    // Supprimer les anciens graphiques pour éviter les bugs au survol (hover)
    if (statsChart) statsChart.destroy();
    if (detailsChart) detailsChart.destroy();

    // Graphique : Avant vs Après (Barres)
    const ctxBar = document.getElementById('statsChart').getContext('2d');
    statsChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Original', 'Nettoyé'],
            datasets: [{
                label: 'Nombre de lignes',
                data: [data.rows_before, data.rows_after],
                backgroundColor: ['#e9ecef', '#0d6efd'],
                borderColor: ['#ced4da', '#0a58ca'],
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // Graphique : Répartition des corrections (Doughnut)
    const ctxDoughnut = document.getElementById('detailsChart').getContext('2d');
    detailsChart = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Doublons', 'V. Manquantes', 'Outliers'],
            datasets: [{
                data: [data.details.doublons, data.details.manquants, data.details.aberrantes],
                backgroundColor: ['#ffc107', '#dc3545', '#17a2b8'],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 15, padding: 20 } }
            }
        }
    });
}

// 4. SUPPRESSION DEPUIS L'HISTORIQUE
function deleteEntry(id) {
    if (confirm("Supprimer définitivement ce traitement de l'historique ?")) {
        fetch(`/delete/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Recharge la page historique pour mettre à jour la liste
                location.reload();
            } else {
                alert("Erreur lors de la suppression.");
            }
        })
        .catch(err => console.error(err));
    }
}