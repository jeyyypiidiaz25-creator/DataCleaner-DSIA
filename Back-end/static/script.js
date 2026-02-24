/**
 * DataCleaner API - Logique de traitement et visualisation
 * Projet DSIA 2026
 */

// --- ÉLÉMENTS DE L'INTERFACE ---
const formatSelector = document.getElementById('formatSelector');
const fileInput = document.getElementById('dataFile');
const mainFileNameDisplay = document.getElementById('mainFileNameDisplay');
const processForm = document.getElementById('processForm');
const btnSubmit = document.getElementById('btnSubmit');

let statsChart = null;
let detailsChart = null;

// 1. GESTION DYNAMIQUE DU FORMAT ET DU FICHIER
if (formatSelector) {
    formatSelector.addEventListener('change', (e) => {
        // Met à jour les extensions acceptées dans l'explorateur de fichiers
        fileInput.accept = e.target.value;
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            // Mise à jour de l'affichage central
            if (mainFileNameDisplay) {
                mainFileNameDisplay.innerHTML = `<i class="bi bi-file-check-fill me-2"></i>Fichier chargé : ${fileName}`;
                mainFileNameDisplay.classList.add('animate__animated', 'animate__bounceIn');
            }
        }
    });
}

// 2. ENVOI DES DONNÉES (AJAX / FETCH)
if (processForm) {
    processForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) {
            alert("Erreur : Aucun fichier détecté. Veuillez d'abord choisir un fichier.");
            return;
        }

        // Préparation du paquet de données
        const formData = new FormData();
        formData.append('file', file);
        formData.append('missing', document.getElementById('missing').checked);
        formData.append('outliers', document.getElementById('outliers').checked);
        formData.append('duplicates', document.getElementById('duplicates').checked);
        formData.append('normalize', document.getElementById('normalize').checked);

        // État de chargement du bouton
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Nettoyage en cours...';

        fetch('/process', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-lightning-charge-fill me-2"></i>Lancer le nettoyage';

            if (data.error) {
                alert("Erreur de traitement : " + data.error);
                return;
            }

            // A. BASCULEMENT DE L'INTERFACE
            document.getElementById('importZone').classList.add('d-none');
            const resultBox = document.getElementById('resultBox');
            resultBox.classList.remove('d-none');
            resultBox.classList.add('animate__animated', 'animate__fadeInUp');

            // B. AFFICHAGE DES STATISTIQUES ET TÉLÉCHARGEMENT
            const statsDiv = document.getElementById('stats');
            statsDiv.innerHTML = `
                <div class="alert alert-success d-flex justify-content-between align-items-center shadow-sm">
                    <div>
                        <i class="bi bi-check-circle-fill me-2"></i>
                        Succès : <strong>${data.rows_after}</strong> lignes conservées sur <strong>${data.rows_before}</strong>.
                    </div>
                    <a href="${data.download_url}" class="btn btn-success btn-sm px-4 rounded-pill shadow-sm fw-bold">
                        <i class="bi bi-download me-1"></i>Télécharger le CSV
                    </a>
                </div>
            `;

            // C. REMPLISSAGE DU TABLEAU D'APERÇU
            renderPreviewTable(data);

            // D. GÉNÉRATION DES GRAPHIQUES
            renderCharts(data);
        })
        .catch(error => {
            console.error('Erreur Fetch:', error);
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Réessayer';
            alert("Une erreur est survenue lors de la connexion au serveur.");
        });
    });
}

// 3. FONCTION : RENDU DU TABLEAU D'APERÇU
function renderPreviewTable(data) {
    const thead = document.getElementById('previewThead');
    const tbody = document.getElementById('previewTbody');

    // En-têtes
    thead.innerHTML = '<tr>' + data.columns.map(c => `<th class="small text-muted text-uppercase">${c}</th>`).join('') + '</tr>';
    
    // Contenu (10 premières lignes transmises par Flask)
    tbody.innerHTML = data.preview.map(row => {
        return '<tr>' + data.columns.map(c => {
            const val = row[c];
            return `<td>${val !== null ? val : '<em class="text-danger small">null</em>'}</td>`;
        }).join('') + '</tr>';
    }).join('');
}

// 4. FONCTION : RENDU DES GRAPHIQUES (CHART.JS)
function renderCharts(data) {
    // Destruction des instances précédentes pour éviter les bugs de superposition
    if (statsChart) statsChart.destroy();
    if (detailsChart) detailsChart.destroy();

    // Graphique : Volume des données
    const ctxBar = document.getElementById('statsChart').getContext('2d');
    statsChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Brutes', 'Nettoyées'],
            datasets: [{
                label: 'Lignes',
                data: [data.rows_before, data.rows_after],
                backgroundColor: ['#e9ecef', '#0d6efd'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // Graphique : Nature des corrections
    const ctxPie = document.getElementById('detailsChart').getContext('2d');
    detailsChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Doublons', 'V. Manquantes', 'Outliers'],
            datasets: [{
                data: [data.details.doublons, data.details.manquants, data.details.aberrantes],
                backgroundColor: ['#ffc107', '#dc3545', '#17a2b8'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// 5. FONCTION : SUPPRESSION HISTORIQUE
function deleteEntry(id) {
    if (confirm("Confirmer la suppression de cet historique ?")) {
        fetch(`/delete/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.success) location.reload();
        });
    }
}