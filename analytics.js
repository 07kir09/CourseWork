// Ждём загрузки DOM перед выполнением скрипта
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запускается analytics.js');

    // 1. Обработка кнопки "Вернуться" для возврата на главную страницу
    const goBackButton = document.getElementById('goBackButton');
    if (goBackButton) {
        goBackButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    } else {
        console.error('Элемент goBackButton не найден');
    }

    // 2. Загрузка данных сессий из localStorage
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
        console.error('Ошибка парсинга JSON:', err);
        return;
    }
    // Приводим данные к массиву сессий, даже если загружена одна сессия
    const sessions = Array.isArray(parsed) ? parsed : [parsed];
    if (!sessions.length) {
        alert('Данные пусты!');
        window.location.href = 'index.html';
        return;
    }
    console.log('Загруженные сессии:', sessions);

    // Глобальные переменные для фильтрации и сортировки
    // Фильтры работают по ключам: "Distance (km)", "Duration (min)", "Pace (min/km)", "Heart Rate (bpm)", "Calories", "Elevation (m)"
    let activeFilters = {};
    let selectedPeriodDays = null;

    // Глобальные переменные для хранения диаграмм
    let radarChart, barChart;

    // Функция для определения максимальной даты начала сессии (используется для фильтра по периоду)
    function getMaxSessionDate() {
        return sessions.reduce((acc, session) => {
            const d = new Date(session.start_time);
            return d > acc ? d : acc;
        }, new Date(0));
    }

    // Функция обновления аналитики: перерисовка таблицы сессий и диаграмм
    function updateAnalytics(filteredSessions) {
        console.log('Обновление аналитики для сессий:', filteredSessions);

        // Обновляем таблицу с информацией о сессиях
        const sessionInfoTable = document.getElementById('sessionInfoTable');
        if (!sessionInfoTable) {
            console.error('Элемент sessionInfoTable не найден');
            return;
        }
        let html = `<tr>
                        <th>Session ID</th>
                        <th>User ID</th>
                        <th>Start</th>
                        <th>End</th>
                    </tr>`;
        filteredSessions.forEach(item => {
            html += `<tr>
                        <td>${item.session_id || 'N/A'}</td>
                        <td>${item.user_id || 'N/A'}</td>
                        <td>${item.start_time || 'N/A'}</td>
                        <td>${item.end_time || 'N/A'}</td>
                    </tr>`;
        });
        sessionInfoTable.innerHTML = html;

        // =====================================================
        // Построение радарной диаграммы с масштабированием для корректного отображения
        // =====================================================

        // Определяем ключи метрик для диаграммы (порядок осей)
        const metricKeys = ["distance", "duration", "pace", "heartRate", "calories", "elevation"];
        // Коэффициенты масштабирования для приведения реальных значений к диапазону примерно 0–12
        const scaleFactors = {
            distance: 1,    // Дистанция (км) – без изменения
            duration: 3,    // Длительность (мин) – делим на 3
            pace: 1,        // Темп (мин/км) – без изменения
            heartRate: 20,  // Пульс (bpm) – делим на 20
            calories: 50,   // Калории – делим на 50
            elevation: 10   // Подъём (m) – делим на 10
        };

        // Функция для получения масштабированных значений из объекта summary
        function getScaledValues(summary) {
            const distKm = (summary.total_distance || 0) / 1000;  // перевод м -> км
            const durMin = (summary.duration_seconds || 0) / 60;    // перевод с -> мин
            const pace   = summary.average_pace || 0;
            const hr     = summary.average_heart_rate || 0;
            const cals   = summary.total_calories || 0;
            const elev   = summary.elevation_gain || 0;
            return [
                distKm / scaleFactors.distance,
                durMin / scaleFactors.duration,
                pace   / scaleFactors.pace,
                hr     / scaleFactors.heartRate,
                cals   / scaleFactors.calories,
                elev   / scaleFactors.elevation
            ];
        }

        // Подписи для осей радарной диаграммы
        const labels = [
            'Distance (km)',
            'Duration (min)',
            'Pace (min/km)',
            'Heart Rate (bpm)',
            'Calories',
            'Elevation (m)'
        ];

        // Получаем элемент canvas для радарной диаграммы и его контекст
        const radarCtxElem = document.getElementById('dataChart');
        if (!radarCtxElem) {
            console.error('Элемент dataChart не найден');
            return;
        }
        const radarCtx = radarCtxElem.getContext('2d');
        if (radarChart) radarChart.destroy();

        // Формируем датасеты для радарной диаграммы, используя масштабированные значения
        const allDataSets = filteredSessions.map((item, idx) => {
            const s = item.summary || {};
            return {
                label: item.session_id || `Session ${idx + 1}`,
                data: getScaledValues(s),
                fill: true,
                backgroundColor: `hsla(${idx * 50}, 100%, 40%, 0.2)`,
                borderColor: `hsl(${idx * 50}, 100%, 40%)`,
                borderWidth: 2,
                pointBackgroundColor: `hsl(${idx * 50}, 100%, 40%)`,
                tension: 0.2
            };
        });

        // Настройки для радарной диаграммы: указываем масштаб, шаг делений и стили осей и тултипов
        const radarOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    suggestedMax: 12, // Примерное максимальное значение оси
                    ticks: {
                        stepSize: 2
                    },
                    angleLines: { color: '#ccc' },
                    grid: { color: '#ddd' },
                    pointLabels: {
                        color: '#333',
                        font: { size: 14 }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#333',
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    callbacks: {
                        // Выводим в тултипе реальные значения, умножая масштабированные данные на коэффициенты
                        label: function(context) {
                            const axisIndex = context.dataIndex;
                            const scaledVal = context.parsed.r;
                            const metricName = metricKeys[axisIndex];
                            const realVal = scaledVal * scaleFactors[metricName];
                            let labelStr = '';
                            switch (metricName) {
                                case 'distance':
                                    labelStr = `Distance: ${realVal.toFixed(2)} km`;
                                    break;
                                case 'duration':
                                    labelStr = `Duration: ${realVal.toFixed(1)} min`;
                                    break;
                                case 'pace':
                                    labelStr = `Pace: ${realVal.toFixed(2)} min/km`;
                                    break;
                                case 'heartRate':
                                    labelStr = `Heart Rate: ${realVal.toFixed(0)} bpm`;
                                    break;
                                case 'calories':
                                    labelStr = `Calories: ${realVal.toFixed(0)}`;
                                    break;
                                case 'elevation':
                                    labelStr = `Elevation: ${realVal.toFixed(1)} m`;
                                    break;
                                default:
                                    labelStr = `Value: ${realVal}`;
                            }
                            return labelStr;
                        }
                    }
                }
            }
        };

        // Создаем и отображаем радарную диаграмму
        radarChart = new Chart(radarCtx, {
            type: 'radar',
            data: { labels, datasets: allDataSets },
            options: radarOptions
        });

        // =====================================================
        // Построение столбчатой диаграммы "Distance per day"
        // =====================================================
        const barCtxElem = document.getElementById('distanceChart');
        if (!barCtxElem) {
            console.error('Элемент distanceChart не найден');
            return;
        }
        const barCtx = barCtxElem.getContext('2d');
        if (barChart) barChart.destroy();
        // Группируем данные: суммируем дистанцию (в км) за каждый день
        const distanceData = {};
        filteredSessions.forEach(session => {
            const date = session.start_time.split('T')[0];
            const distance = session.summary?.total_distance || 0;
            distanceData[date] = (distanceData[date] || 0) + distance / 1000;
        });
        const distanceLabels = Object.keys(distanceData).sort();
        const distanceValues = distanceLabels.map(date => distanceData[date]);
        // Создаем столбчатую диаграмму
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

    // Функция фильтрации сессий по активным фильтрам и выбранному периоду
    function getFilteredSessions() {
        let thresholdDate = null;
        if (selectedPeriodDays !== null) {
            const maxDate = getMaxSessionDate();
            thresholdDate = new Date(maxDate.getTime() - selectedPeriodDays * 24 * 60 * 60 * 1000);
        }
        return sessions.filter(session => {
            const summary = session.summary || {};
            // Фильтрация по дате сессии, если задан период
            if (thresholdDate !== null) {
                const sessionDate = new Date(session.start_time);
                if (sessionDate < thresholdDate) return false;
            }
            // Применение активных фильтров для каждой метрики
            for (const key in activeFilters) {
                let value;
                switch (key) {
                    case 'Distance (km)':
                        value = (summary.total_distance || 0) / 1000;
                        break;
                    case 'Duration (min)':
                        value = (summary.duration_seconds || 0) / 60;
                        break;
                    case 'Pace (min/km)':
                        value = summary.average_pace || 0;
                        break;
                    case 'Heart Rate (bpm)':
                        value = summary.average_heart_rate || 0;
                        break;
                    case 'Calories':
                        value = summary.total_calories || 0;
                        break;
                    case 'Elevation (m)':
                        value = summary.elevation_gain || 0;
                        break;
                    default:
                        value = 0;
                }
                const filter = activeFilters[key];
                if (filter.min !== undefined && value < filter.min) return false;
                if (filter.max !== undefined && value > filter.max) return false;
            }
            return true;
        });
    }

    // Первоначальное отображение аналитики для всех сессий
    updateAnalytics(sessions);

    // Обработка панели фильтров: открытие/закрытие панели и оверлея
    const openFilterBtn = document.getElementById('openFilterBtn');
    const closeFilterBtn = document.getElementById('closeFilterBtn');
    const overlay = document.getElementById('overlay');
    const filterDrawer = document.getElementById('filterDrawer');

    if (openFilterBtn && closeFilterBtn && overlay && filterDrawer) {
        openFilterBtn.addEventListener('click', () => {
            filterDrawer.classList.add('active');
            overlay.classList.add('active');
        });
        closeFilterBtn.addEventListener('click', () => {
            filterDrawer.classList.remove('active');
            overlay.classList.remove('active');
        });
        overlay.addEventListener('click', () => {
            filterDrawer.classList.remove('active');
            overlay.classList.remove('active');
        });
    } else {
        console.error('Элементы для боковой панели фильтров не найдены');
    }

    // Обработка аккордеона для фильтров (раскрытие/сокрытие содержимого)
    const accordionToggles = document.querySelectorAll('.accordion-toggle');
    accordionToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = toggle.nextElementSibling;
            if (content) {
                content.classList.toggle('open');
            }
            // Изменение знака на кнопке аккордеона
            if (toggle.textContent.trim().startsWith('+')) {
                toggle.textContent = toggle.textContent.trim().replace('+', '-');
            } else {
                toggle.textContent = toggle.textContent.trim().replace('-', '+');
            }
        });
    });

    // Обработка кнопок "Apply filter" и "Reset filter"
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            activeFilters = {};
            // Считываем фильтры для Distance (km)
            const distanceMinVal = parseFloat(document.getElementById('distanceMin')?.value);
            const distanceMaxVal = parseFloat(document.getElementById('distanceMax')?.value);
            if (!isNaN(distanceMinVal) || !isNaN(distanceMaxVal)) {
                activeFilters['Distance (km)'] = {};
                if (!isNaN(distanceMinVal)) activeFilters['Distance (km)'].min = distanceMinVal;
                if (!isNaN(distanceMaxVal)) activeFilters['Distance (km)'].max = distanceMaxVal;
            }
            // Считываем фильтры для Duration (min)
            const durationMinVal = parseFloat(document.getElementById('durationMin')?.value);
            const durationMaxVal = parseFloat(document.getElementById('durationMax')?.value);
            if (!isNaN(durationMinVal) || !isNaN(durationMaxVal)) {
                activeFilters['Duration (min)'] = {};
                if (!isNaN(durationMinVal)) activeFilters['Duration (min)'].min = durationMinVal;
                if (!isNaN(durationMaxVal)) activeFilters['Duration (min)'].max = durationMaxVal;
            }
            // Фильтры для Pace (min/km)
            const paceMinVal = parseFloat(document.getElementById('paceMin')?.value);
            const paceMaxVal = parseFloat(document.getElementById('paceMax')?.value);
            if (!isNaN(paceMinVal) || !isNaN(paceMaxVal)) {
                activeFilters['Pace (min/km)'] = {};
                if (!isNaN(paceMinVal)) activeFilters['Pace (min/km)'].min = paceMinVal;
                if (!isNaN(paceMaxVal)) activeFilters['Pace (min/km)'].max = paceMaxVal;
            }
            // Фильтры для Heart Rate (bpm)
            const heartRateMinVal = parseFloat(document.getElementById('heartRateMin')?.value);
            const heartRateMaxVal = parseFloat(document.getElementById('heartRateMax')?.value);
            if (!isNaN(heartRateMinVal) || !isNaN(heartRateMaxVal)) {
                activeFilters['Heart Rate (bpm)'] = {};
                if (!isNaN(heartRateMinVal)) activeFilters['Heart Rate (bpm)'].min = heartRateMinVal;
                if (!isNaN(heartRateMaxVal)) activeFilters['Heart Rate (bpm)'].max = heartRateMaxVal;
            }
            // Фильтры для Calories
            const caloriesMinVal = parseFloat(document.getElementById('caloriesMin')?.value);
            const caloriesMaxVal = parseFloat(document.getElementById('caloriesMax')?.value);
            if (!isNaN(caloriesMinVal) || !isNaN(caloriesMaxVal)) {
                activeFilters['Calories'] = {};
                if (!isNaN(caloriesMinVal)) activeFilters['Calories'].min = caloriesMinVal;
                if (!isNaN(caloriesMaxVal)) activeFilters['Calories'].max = caloriesMaxVal;
            }
            // Фильтры для Elevation (m)
            const elevationMinVal = parseFloat(document.getElementById('elevationMin')?.value);
            const elevationMaxVal = parseFloat(document.getElementById('elevationMax')?.value);
            if (!isNaN(elevationMinVal) || !isNaN(elevationMaxVal)) {
                activeFilters['Elevation (m)'] = {};
                if (!isNaN(elevationMinVal)) activeFilters['Elevation (m)'].min = elevationMinVal;
                if (!isNaN(elevationMaxVal)) activeFilters['Elevation (m)'].max = elevationMaxVal;
            }
            // Закрываем панель фильтров после применения
            filterDrawer.classList.remove('active');
            overlay.classList.remove('active');
            const filtered = getFilteredSessions();
            updateAnalytics(filtered);
        });
    } else {
        console.error('Элемент applyFiltersBtn не найден');
    }
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Сброс значений во всех input-полях фильтров
            document.querySelectorAll('#filterDrawer input[type="number"]').forEach(input => {
                input.value = '';
            });
            activeFilters = {};
            const filtered = getFilteredSessions();
            updateAnalytics(filtered);
        });
    } else {
        console.error('Элемент resetFiltersBtn не найден');
    }

    // Обработка выпадающего меню для выбора периода (фильтр по дате)
    const periodButton = document.getElementById('daysButton');
    const periodMenu = document.getElementById('daysMenu');
    if (periodButton && periodMenu) {
        const periodMenuItems = periodMenu.querySelectorAll('li');
        // Карта сопоставления строкового значения с количеством дней
        const periodMap = {
            "5 days": 5,
            "10 days": 10,
            "2 weeks": 14,
            "1 month": 30,
            "All dates": null
        };
        periodButton.addEventListener('click', () => {
            periodMenu.classList.toggle('active');
        });
        periodMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                periodMenuItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                const selectedValue = item.getAttribute('data-value');
                periodButton.querySelector('.days-button-text').textContent = selectedValue;
                periodMenu.classList.remove('active');
                selectedPeriodDays = periodMap[selectedValue] !== undefined ? periodMap[selectedValue] : null;
                const filtered = getFilteredSessions();
                updateAnalytics(filtered);
            });
        });
    } else {
        console.error('Элементы для выбора периода не найдены');
    }

    // Обработка сортировки сессий (если присутствует элемент сортировки)
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const sortType = sortSelect.value;
            let filtered = getFilteredSessions();
            // Функция сортировки сессий по выбранному критерию
            function sortSessions(arr, type) {
                let sorted = [...arr];
                switch (type) {
                    case 'distanceAsc':
                        sorted.sort((a, b) => ((a.summary?.total_distance || 0) - (b.summary?.total_distance || 0)));
                        break;
                    case 'distanceDesc':
                        sorted.sort((a, b) => ((b.summary?.total_distance || 0) - (a.summary?.total_distance || 0)));
                        break;
                    case 'durationAsc':
                        sorted.sort((a, b) => ((a.summary?.duration_seconds || 0) - (b.summary?.duration_seconds || 0)));
                        break;
                    case 'durationDesc':
                        sorted.sort((a, b) => ((b.summary?.duration_seconds || 0) - (a.summary?.duration_seconds || 0)));
                        break;
                    default:
                        break;
                }
                return sorted;
            }
            const sortedSessions = sortSessions(filtered, sortType);
            updateAnalytics(sortedSessions);
        });
    }
});
