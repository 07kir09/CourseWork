document.addEventListener('DOMContentLoaded', () => {
    const goBackButton = document.getElementById('goBackButton');
    goBackButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    const storedData = localStorage.getItem('exSparkData');
    if (!storedData) {
        alert('Нет данных для аналитики. Загрузите данные на главной странице.');
        window.location.href = 'index.html';
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(storedData);
    } catch (err) {
        alert('Ошибка: невозможно прочитать данные!');
        return;
    }

    const sessions = Array.isArray(parsed) ? parsed : [parsed];
    if (!sessions.length) {
        alert('Данные пусты!');
        window.location.href = 'index.html';
        return;
    }

    // Заполняем Session Info
    const sessionInfoTable = document.getElementById('sessionInfoTable');
    let html = `
      <tr>
        <th>Session ID</th>
        <th>User ID</th>
        <th>Start</th>
        <th>End</th>
      </tr>
    `;
    sessions.forEach(item => {
        html += `
          <tr>
            <td>${item.session_id || 'N/A'}</td>
            <td>${item.user_id || 'N/A'}</td>
            <td>${item.start_time || 'N/A'}</td>
            <td>${item.end_time || 'N/A'}</td>
          </tr>
        `;
    });
    sessionInfoTable.innerHTML = html;

    // --- ДАННЫЕ ДЛЯ РАДАРНОЙ ДИАГРАММЫ ---
    const labels = [
        'Distance (m)', 'Duration (s)', 'Pace (min/km)',
        'Heart Rate (bpm)', 'Calories', 'Elevation (m)'
    ];

    const allDataSets = sessions.map((item, idx) => {
        const s = item.summary || {};
        return {
            label: item.session_id || `Session ${idx + 1}`,
            data: [
                s.total_distance || 0, s.duration_seconds || 0,
                s.average_pace || 0, s.average_heart_rate || 0,
                s.total_calories || 0, s.elevation_gain || 0
            ],
            fill: true,
            backgroundColor: `hsla(${idx * 50}, 100%, 40%, 0.4)`,
            borderColor: `hsl(${idx * 50}, 100%, 40%)`,
            borderWidth: 2,
            pointBackgroundColor: `hsl(${idx * 50}, 100%, 40%)`,
            tension: 0.3
        };
    });

    new Chart(document.getElementById('dataChart').getContext('2d'), {
        type: 'radar',
        data: { labels, datasets: allDataSets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { suggestedMin: 0, suggestedMax: 10000 } },
            plugins: { legend: { position: 'right' } }
        }
    });

    // --- ДАННЫЕ ДЛЯ ЛИНЕЙНОГО/СТОЛБЧАТОГО ГРАФИКА ---
    const distanceData = {};
    sessions.forEach(session => {
        const date = session.start_time.split('T')[0]; // Дата сессии
        const distance = session.summary?.total_distance || 0;
        distanceData[date] = (distanceData[date] || 0) + distance / 1000; // Переводим в км
    });

    const distanceLabels = Object.keys(distanceData).sort();
    const distanceValues = distanceLabels.map(date => distanceData[date]);

    new Chart(document.getElementById('distanceChart').getContext('2d'), {
        type: 'bar', // Можно заменить на 'line'
        data: {
            labels: distanceLabels,
            datasets: [{
                label: 'Kilometers per day',
                data: distanceValues,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { position: 'top' } }
        }
    });
});
