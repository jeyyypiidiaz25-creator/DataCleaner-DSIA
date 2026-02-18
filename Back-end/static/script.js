/**
 * 1. INITIALISATION DES ÉLÉMENTS
 */
const fileInput = document.getElementById('dataFile');
const iconClick = document.getElementById('uploadIconClick');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const processForm = document.getElementById('processForm');

const resultBox = document.getElementById('resultBox');
const welcomeMessage = document.getElementById('welcomeMessage');
const statsDiv = document.getElementById('stats');
const downloadBtn = document.getElementById('downloadBtn');
const btnSubmit = document.getElementById('btnSubmit');

/**
 * 2. GESTION DE L'IMPORTATION
 */
if (iconClick && fileInput) {
    iconClick.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            fileNameDisplay.innerText = this.files[0].name;
            fileNameDisplay.classList.add('text-primary');
        }
    });
}

/**
 * 3. ENVOI ET TRAITEMENT DES DONNÉES
 */
if (processForm) {
    processForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!fileInput.files[0]) {
            alert("Veuillez sélectionner un fichier.");
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('duplicates', document.getElementById('duplicates').checked);
        formData.append('missing', document.getElementById('missing').checked);
        formData.append('outliers', document.getElementById('outliers').checked);
        formData.append('normalize', document.getElementById('normalize').checked);

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Traitement...';

        try {
            const response = await fetch('/process', { method: 'POST', body: formData });
            const result = await response.json();

            if (response.ok) {
                welcomeMessage.classList.add('d-none');
                resultBox.classList.remove('d-none');

                // Affichage des chiffres clés
                statsDiv.innerHTML = `
                    <div class="row text-center mb-3">
                        <div class="col-6">
                            <div class="p-3 border rounded bg-light">
                                <h6 class="text-muted small text-uppercase">Initial</h6>
                                <p class="h4 fw-bold mb-0">${result.rows_before}</p>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="p-3 border rounded bg-light">
                                <h6 class="text-muted small text-uppercase">Nettoyé</h6>
                                <p class="h4 fw-bold mb-0 text-success">${result.rows_after}</p>
                            </div>
                        </div>
                    </div>
                `;

                downloadBtn.href = result.download_url;

                // APPEL DES GRAPHIQUES AVEC LES DÉTAILS
                updateCharts(result.rows_before, result.rows_after, result.details);

            } else {
                alert("Erreur : " + result.error);
            }
        } catch (err) {
            alert("Erreur de connexion.");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-play-fill"></i> Lancer le traitement';
        }
    });
}

/**
 * 4. GESTION DES GRAPHIQUES (Comparaison + Détails)
 */
let summaryChart = null;
let detailsChart = null;

function updateCharts(before, after, details) {
    const ctxSummary = document.getElementById('statsChart');
    const ctxDetails = document.getElementById('detailsChart');

    if (summaryChart) summaryChart.destroy();
    if (detailsChart) detailsChart.destroy();

    // Graphique 1 : Comparaison de volume (Barres)
    summaryChart = new Chart(ctxSummary.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Avant', 'Après'],
            datasets: [{
                label: 'Lignes',
                data: [before, after],
                backgroundColor: ['#adb5bd', '#0d6efd'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // Graphique 2 : Répartition des actions (Donut)
    // On n'affiche que les actions qui ont eu un impact (> 0)
    detailsChart = new Chart(ctxDetails.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Doublons', 'Manquants', 'Outliers'],
            datasets: [{
                data: [details.doublons, details.manquants, details.aberrantes],
                backgroundColor: ['#dc3545', '#ffc107', '#fd7e14'],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Impact du nettoyage', font: { size: 14 } }
            },
            cutout: '60%' // Crée l'effet "Donut"
        }
    });
}

/**
 * 5. SUPPRESSION DANS L'HISTORIQUE
 */
window.deleteEntry = async function(id) {
    if (!confirm("Supprimer cet historique ?")) return;
    try {
        const response = await fetch(`/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
            const row = document.getElementById(`row-${id}`);
            if (row) {
                row.style.opacity = "0";
                setTimeout(() => row.remove(), 400);
            }
        }
    } catch (err) {
        console.error("Erreur suppression:", err);
    }
};