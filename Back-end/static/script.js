/**
 * DataCleaner API - Logique JavaScript Finale
 */

// --- ELEMENTS UI ---
const formatSelector = document.getElementById('formatSelector');
const fileInput = document.getElementById('dataFile');
const mainFileNameDisplay = document.getElementById('mainFileNameDisplay');
const sidebarFileNameDisplay = document.getElementById('fileNameDisplay');
const processForm = document.getElementById('processForm');
const btnSubmit = document.getElementById('btnSubmit');

let statsChart = null;
let detailsChart = null;

// 1. GESTION DU FORMAT ET DE LA SÉLECTION DE FICHIER
if (formatSelector) {
    formatSelector.addEventListener('change', (e) => {
        // Met à jour l'attribut 'accept' pour filtrer dans l'explorateur de fichiers
        fileInput.accept = e.target.value;
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            // Affiche le nom du fichier dans la zone centrale et la sidebar
            if (mainFileNameDisplay) mainFileNameDisplay.innerText = "Fichier prêt : " + fileName;
            if (sidebarFileNameDisplay) sidebarFileNameDisplay.innerText = fileName;
        }
    });
}

// 2. ENVOI ET TRAITEMENT (AJAX)
if (processForm) {
    processForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) {
            alert("Veuillez d'abord importer un fichier dans la zone centrale.");
            return;
        }

        // Préparation des données
        const formData = new FormData();
        formData.append('file', file);
        formData.append('missing', document.getElementById('missing').checked);
        formData.append('outliers', document.getElementById('outliers').checked);
        formData.append('duplicates', document.getElementById('duplicates').checked);
        formData.append('normalize', document.getElementById('normalize').checked);

        // UI : État de chargement
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Nettoyage en cours...';

        fetch('/process', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-lightning-charge-fill me-2"></i>Lancer le traitement';

            if (data.error) {
                alert("Erreur : " + data.error);
                return;
            }

            // Basculer l'affichage (Masquer import, montrer résultats)
            document.getElementById('importZone').classList.add('d-none');
            document.getElementById('resultBox').classList.remove('d-none');

            // Mise à jour de l'alerte de statistiques
            const statsDiv = document.getElementById('stats');
            statsDiv.innerHTML = `
                <div class="alert alert-success d-flex justify-content-between align-items-center shadow-sm animate__animated animate__fadeIn">
                    <span>
                        <i class="bi bi-check-circle-fill me-2"></i>
                        <strong>${data.rows_after}</strong> lignes traitées avec succès.
                    </span>
                    <a href="${data.download_url}" class="btn btn-success btn-sm px-4 rounded-pill">
                        <i class="bi bi-download me-1"></i>Télécharger CSV
                    </a>
                </div>
            `;

            // Remplissage du tableau d'aperçu
            updatePreviewTable(data);

            // Mise à jour des graphiques
            updateCharts(data);
        })
        .catch(error => {
            console.error('Erreur:', error);
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Réessayer';
        });
    });
}

// 3. FONCTION DE REMPLISSAGE DU TABLEAU
function updatePreviewTable(data) {
    const thead = document.getElementById('previewThead');
    const tbody = document.getElementById('previewTbody');

    // Génération des en-têtes
    thead.innerHTML = '<tr>' + data.columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
    
    // Génération des lignes (limité aux 10 premières transmises par le serveur)
    tbody.innerHTML = data.preview.map(row => {
        return '<tr>' + data.columns.map(c => {
            const val = row[c];
            return `<td>${val !== null ? val : '<span class="text-muted small">null</span>'}</td>`;
        }).join('') + '</tr>';
    }).join('');
}

// 4. FONCTION DES GRAPHIQUES (CHART.JS)
function updateCharts(data) {
    if (statsChart) statsChart.destroy();
    if (detailsChart) detailsChart.destroy();

    // Graphique Barres (Volume)
    const ctxBar = document.getElementById('statsChart').getContext('2d');
    statsChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Original', 'Nettoyé'],
            datasets: [{
                label: 'Nombre de lignes',
                data: [data.rows_before, data.rows_after],
                backgroundColor: ['#6c757d', '#0d6efd'],
                borderRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Graphique Doughnut (Détails)
    const ctxDoughnut = document.getElementById('detailsChart').getContext('2d');
    detailsChart = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Doublons', 'V. Manquantes', 'Outliers'],
            datasets: [{
                data: [data.details.doublons, data.details.manquants, data.details.aberrantes],
                backgroundColor: ['#ffc107', '#dc3545', '#17a2b8']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 5. GESTION DE LA SUPPRESSION DANS L'HISTORIQUE
function deleteEntry(id) {
    if (confirm("Supprimer cette analyse de l'historique ?")) {
        fetch(`/delete/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.success) location.reload();
        });
    }
}