// --- GESTION DE L'INTERFACE D'UPLOAD ---
const uploadIcon = document.getElementById('uploadIconClick');
const fileInput = document.getElementById('dataFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');

if (uploadIcon) {
    uploadIcon.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.innerText = e.target.files[0].name;
            fileNameDisplay.classList.add('text-primary', 'fw-bold');
        }
    });
}

// --- TRAITEMENT DU FORMULAIRE ---
const processForm = document.getElementById('processForm');
let statsChart = null;
let detailsChart = null;

if (processForm) {
    processForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const btnSubmit = document.getElementById('btnSubmit');
        const file = fileInput.files[0];
        
        if (!file) {
            alert("Veuillez sélectionner un fichier avant de continuer.");
            return;
        }

        // Préparation des données à envoyer
        const formData = new FormData();
        formData.append('file', file);
        formData.append('missing', document.getElementById('missing').checked);
        formData.append('outliers', document.getElementById('outliers').checked);
        formData.append('duplicates', document.getElementById('duplicates').checked);
        formData.append('normalize', document.getElementById('normalize').checked);

        // Animation du bouton
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Traitement en cours...';

        fetch('/process', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-gear-wide-connected me-2"></i>Analyser & Nettoyer';

            if (data.error) {
                alert("Erreur : " + data.error);
                return;
            }

            // 1. Affichage du message de succès et lien de téléchargement
            document.getElementById('welcomeMessage').classList.add('d-none');
            const statsDiv = document.getElementById('stats');
            statsDiv.innerHTML = `
                <div class="alert alert-success d-flex justify-content-between align-items-center animate__animated animate__fadeIn shadow-sm">
                    <span><i class="bi bi-check-circle-fill me-2"></i><strong>${data.rows_after}</strong> lignes conservées sur ${data.rows_before}.</span>
                    <a href="${data.download_url}" class="btn btn-success btn-sm px-3 rounded-pill">
                        <i class="bi bi-download me-1"></i>Télécharger le CSV
                    </a>
                </div>
            `;

            // 2. Remplissage du tableau de visualisation
            updatePreviewTable(data);

            // 3. Mise à jour des graphiques
            updateCharts(data);
        })
        .catch(error => {
            console.error('Erreur:', error);
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Réessayer';
        });
    });
}

// --- FONCTION DE MISE À JOUR DU TABLEAU ---
function updatePreviewTable(data) {
    const previewBox = document.getElementById('previewBox');
    const thead = document.getElementById('previewThead');
    const tbody = document.getElementById('previewTbody');

    if (previewBox && data.preview.length > 0) {
        previewBox.classList.remove('d-none'); // On affiche la section
        
        // Construction des en-têtes
        thead.innerHTML = '<tr>' + data.columns.map(col => `<th>${col}</th>`).join('') + '</tr>';
        
        // Construction des lignes
        tbody.innerHTML = data.preview.map(row => {
            return '<tr>' + data.columns.map(col => {
                const val = row[col];
                return `<td>${val !== null ? val : '<span class="text-muted small">null</span>'}</td>`;
            }).join('') + '</tr>';
        }).join('');
    }
}

// --- FONCTION DES GRAPHIQUES (CHART.JS) ---
function updateCharts(data) {
    // Détruire les anciens graphiques s'ils existent pour éviter les superpositions
    if (statsChart) statsChart.destroy();
    if (detailsChart) detailsChart.destroy();

    // Graphique Evolution (Barres)
    const ctxStats = document.getElementById('statsChart').getContext('2d');
    statsChart = new Chart(ctxStats, {
        type: 'bar',
        data: {
            labels: ['Données Brutes', 'Données Nettoyées'],
            datasets: [{
                label: 'Nombre de lignes',
                data: [data.rows_before, data.rows_after],
                backgroundColor: ['#6c757d', '#0d6efd'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // Graphique Détails (Doughnut)
    const ctxDetails = document.getElementById('detailsChart').getContext('2d');
    detailsChart = new Chart(ctxDetails, {
        type: 'doughnut',
        data: {
            labels: ['Doublons', 'Manquants', 'Outliers'],
            datasets: [{
                data: [data.details.doublons, data.details.manquants, data.details.aberrantes],
                backgroundColor: ['#ffc107', '#dc3545', '#17a2b8'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
            }
        }
    });
}

// --- GESTION DE L'HISTORIQUE (Suppression) ---
function deleteEntry(id) {
    if (confirm("Voulez-vous vraiment supprimer cet enregistrement ?")) {
        fetch(`/delete/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                location.reload();
            }
        });
    }
}