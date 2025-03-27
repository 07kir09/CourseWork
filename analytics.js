document.addEventListener('DOMContentLoaded', () => {
    // Кнопка «Вернуться»
    const goBackButton = document.getElementById('goBackButton');
    goBackButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Загружаем данные сессий из localStorage
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

    // ---------------------------
    // Активные фильтры
    // ---------------------------
    // Ключ — тип фильтра, значение — массив числовых условий
    let activeFilters = {};

    // Применяем все активные фильтры к данным
    function getFilteredSessions() {
        return sessions.filter(session => {
            const summary = session.summary || {};
            // Проверяем все типы фильтров
            for (const key in activeFilters) {
                const criteriaArr = activeFilters[key];
                // Для каждого условия проверяем выполнение
                for (const criteria of criteriaArr) {
                    switch (key) {
                        case 'Duration (s)':
                            if (!(summary.duration_seconds >= criteria)) return false;
                            break;
                        case 'Distance (km)':
                            if (!((summary.total_distance / 1000) >= criteria)) return false;
                            break;
                        case 'Pace (min/km)':
                            if (!(summary.average_pace <= criteria)) return false;
                            break;
                        case 'Heart Rate (bpm)':
                            if (!(summary.average_heart_rate >= criteria)) return false;
                            break;
                        case 'Calories':
                            if (!(summary.total_calories >= criteria)) return false;
                            break;
                        case 'Elevation (m)':
                            if (!(summary.elevation_gain >= criteria)) return false;
                            break;
                        default:
                            break;
                    }
                }
            }
            return true;
        });
    }

    // Отображение текущих фильтров в шапке (activeFiltersDisplay)
    function updateActiveFiltersDisplay() {
        const displayContainer = document.getElementById('activeFiltersDisplay');
        if (Object.keys(activeFilters).length === 0) {
            displayContainer.style.display = 'none';
            displayContainer.innerHTML = '';
            return;
        }
        displayContainer.style.display = 'block';

        let html = '<ul>';
        for (const key in activeFilters) {
            html += `<li>${key}: ${activeFilters[key].join(', ')}</li>`;
        }
        html += '</ul>';
        html += `<button id="resetFilters">Reset Filters</button>`;
        displayContainer.innerHTML = html;

        // Сброс всех фильтров
        document.getElementById('resetFilters').addEventListener('click', () => {
            activeFilters = {};
            updateActiveFiltersDisplay();
            updateAnalytics(sessions);
        });
    }

    // ---------------------------
    // Обновление диаграмм и таблицы
    // ---------------------------
    let radarChart, barChart;

    function updateAnalytics(filteredSessions) {
        // 1) Таблица Session Info
        const sessionInfoTable = document.getElementById('sessionInfoTable');
        let html = `
      <tr>
        <th>Session ID</th>
        <th>User ID</th>
        <th>Start</th>
        <th>End</th>
      </tr>
    `;
        filteredSessions.forEach(item => {
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

        // 2) Радарная диаграмма
        const labels = [
            'Distance (m)', 'Duration (s)', 'Pace (min/km)',
            'Heart Rate (bpm)', 'Calories', 'Elevation (m)'
        ];
        if (radarChart) {
            radarChart.destroy();
        }
        const allDataSets = filteredSessions.map((item, idx) => {
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
        const radarCtx = document.getElementById('dataChart').getContext('2d');
        radarChart = new Chart(radarCtx, {
            type: 'radar',
            data: { labels, datasets: allDataSets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { suggestedMin: 0, suggestedMax: 10000 } },
                plugins: { legend: { position: 'right' } }
            }
        });

        // 3) Столбчатый график Distance per day
        if (barChart) {
            barChart.destroy();
        }
        const distanceData = {};
        filteredSessions.forEach(session => {
            const date = session.start_time.split('T')[0];
            const distance = session.summary?.total_distance || 0;
            distanceData[date] = (distanceData[date] || 0) + distance / 1000;
        });
        const distanceLabels = Object.keys(distanceData).sort();
        const distanceValues = distanceLabels.map(date => distanceData[date]);

        const barCtx = document.getElementById('distanceChart').getContext('2d');
        barChart = new Chart(barCtx, {
            type: 'bar',
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
    }

    // Синхронизация ползунка для Distance (km)
    const distanceRange = document.getElementById('distanceRange');
    const distanceRangeValue = document.getElementById('distanceRangeValue');
    const distanceMinInput = document.getElementById('distanceMin');

    if (distanceRange) {
        distanceRange.addEventListener('input', () => {
            distanceRangeValue.textContent = distanceRange.value;
            distanceMinInput.value = distanceRange.value;
        });
    }

    // Изначально отображаем все данные
    updateAnalytics(sessions);

    // ==== Боковая панель фильтров ====
    const openFilterBtn = document.getElementById('openFilterBtn');
    const closeFilterBtn = document.getElementById('closeFilterBtn');
    const overlay = document.getElementById('overlay');
    const filterDrawer = document.getElementById('filterDrawer');
    const applyBtn = document.querySelector('.apply-btn');

    // Открытие панели
    openFilterBtn.addEventListener('click', () => {
        filterDrawer.classList.add('active');
        overlay.classList.add('active');
    });

    // Закрытие панели по кнопке "×"
    closeFilterBtn.addEventListener('click', () => {
        filterDrawer.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Закрытие панели при клике на оверлей
    overlay.addEventListener('click', () => {
        filterDrawer.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Нажатие на кнопку "Показать X товаров"
    applyBtn.addEventListener('click', () => {
        // Здесь можно вызвать вашу логику фильтров (например, updateAnalytics(getFilteredSessions()))
        // или просто закрыть панель:
        filterDrawer.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Аккордеон
    const accordionToggles = document.querySelectorAll('.accordion-toggle');
    accordionToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = toggle.nextElementSibling;
            content.classList.toggle('open');
            // Меняем + на - в самом тексте кнопки (или используем ::before)
            if (toggle.textContent.trim().startsWith('+')) {
                toggle.textContent = toggle.textContent.trim().replace('+', '-');
            } else {
                toggle.textContent = toggle.textContent.trim().replace('-', '+');
            }
        });
    });

    // ---------------------------
    // Логика выпадающего меню "5 days"
    // ---------------------------
    const daysButton = document.getElementById('daysButton');
    const daysMenu = document.getElementById('daysMenu');

    daysButton.addEventListener('click', () => {
        daysMenu.classList.toggle('active');
    });

    const daysMenuItems = daysMenu.querySelectorAll('li');
    daysMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            daysMenuItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            const selectedValue = item.getAttribute('data-value');
            document.querySelector('.days-button .days-button-text').textContent = selectedValue;
            daysMenu.classList.remove('active');
        });
    });
});
