document.addEventListener('DOMContentLoaded', function() {
    const store = document.getElementById('data-store');
    if (!store) return; // Ne s'exécute pas s'il n'y a pas de résultats

    // Récupération des données via les attributs data
    const initial = parseInt(store.getAttribute('data-initial'));
    const cleaned = parseInt(store.getAttribute('data-cleaned'));

    const ctx = document.getElementById('cleaningChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Avant nettoyage', 'Après nettoyage'],
            datasets: [{
                data: [initial, cleaned],
                backgroundColor: ['#bdc3c7', '#0d6efd'], // Gris et Bleu (Image 13)
                borderRadius: 8,
                barThickness: 70
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { color: '#eee' } },
                x: { grid: { display: false } }
            }
        }
    });
});