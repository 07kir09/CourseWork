/************************************
 * ИМИТАЦИЯ ЗАГРУЗКИ
 * Скрываем экран загрузки через 1 секунду после загрузки страницы.
 ************************************/
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.display = 'none'; // Скрываем загрузочный экран
    }, 1000);
});

/************************************
 * META MASK (если нужно)
 * Обеспечиваем подключение MetaMask: при клике отправляем запрос на получение аккаунтов.
 ************************************/
const connectButton = document.getElementById('connectButton');
const connectText = document.getElementById('connectText');

if (connectButton) {
    connectButton.addEventListener('click', async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Запрос аккаунтов через MetaMask
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length > 0) {
                    const account = accounts[0];
                    // Отображаем укороченный адрес кошелька
                    connectText.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
                }
            } catch (error) {
                console.error('Ошибка подключения кошелька:', error);
                alert('Ошибка при подключении MetaMask.');
            }
        } else {
            alert('MetaMask не обнаружена. Установите расширение MetaMask.');
        }
    });
}

/************************************
 * ЭЛЕМЕНТЫ UI
 * Получаем основные элементы страницы: поля для ввода, таблицу, область дропа, кнопки боковой панели.
 ************************************/
const dataInput = document.getElementById('dataInput'); // Текстовое поле для JSON
const dataTable = document.getElementById('dataTable'); // Таблица для отображения данных
const dropzone = document.getElementById('dropzone');   // Область для перетаскивания файла

// Кнопки боковой панели
const btnBrowse = document.getElementById('btnBrowse');
const btnUseDefault = document.getElementById('btnUseDefault');
const btnShowData = document.getElementById('btnShowData');
const btnClearData = document.getElementById('btnClearData');
const btnAnalytics = document.getElementById('btnAnalytics');

// Создаем скрытый input для загрузки файла (появляется при клике на "Загрузить из файла")
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

// Кнопка для экспорта данных
const exportButton = document.getElementById('exportButton');

// Пример тестовых данных
const defaultData = {
    "session_id": "RUN_20240101_001",
    "user_id": "USER_001",
    "start_time": "2024-01-01T18:00:00Z",
    "end_time": "2024-01-01T18:45:00Z",
    "summary": {
        "total_distance": 5920,
        "duration_seconds": 2700,
        "average_pace": 7.36,
        "average_heart_rate": 142,
        "total_calories": 385,
        "elevation_gain": 64
    }
};

// Глобальная переменная для хранения загруженных данных
let loadedData = null;

/************************************
 * DRAG & DROP
 * Обрабатываем события перетаскивания файла в область dropzone.
 ************************************/
dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = '#4dabf7'; // Изменяем цвет рамки при наведении файла
    dropzone.textContent = 'Release the file...'; // Подсказка для пользователя
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = '#ccc'; // Возвращаем исходный цвет рамки
    dropzone.textContent = 'Drag and drop the data file (JSON) here'; // Восстанавливаем текст
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = '#ccc';

    const files = e.dataTransfer.files;
    if (!files.length) {
        alert('Файл не найден!');
        dropzone.textContent = 'Drag and drop the data file (JSON) here';
        return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            // Парсим содержимое файла как JSON и форматируем его для отображения
            const jsonData = JSON.parse(ev.target.result);
            dataInput.value = JSON.stringify(jsonData, null, 2);
            dropzone.textContent = 'The file is uploaded!';
        } catch (error) {
            alert('Error when parsing JSON!');
            dropzone.textContent = 'Drag and drop the data file (JSON) here';
        }
    };
    reader.readAsText(file);
});

/************************************
 * ОБРАБОТЧИКИ КНОПОК (SIDEBAR)
 * Определяем действия при нажатии на кнопки боковой панели.
 ************************************/
// (1) Загрузить данные из файла через диалог выбора
btnBrowse.addEventListener('click', () => {
    fileInput.click(); // Инициируем выбор файла
});
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            // Обработка и вывод JSON из выбранного файла
            const jsonData = JSON.parse(ev.target.result);
            dataInput.value = JSON.stringify(jsonData, null, 2);
            dropzone.textContent = 'Файл загружен!';
        } catch (error) {
            alert('Error when parsing JSON!');
            dropzone.textContent = 'Drag and drop the data file (JSON) here';
        }
    };
    reader.readAsText(file);
});

// (2) Использовать тестовые данные для заполнения текстового поля
btnUseDefault.addEventListener('click', () => {
    dataInput.value = JSON.stringify(defaultData, null, 2);
    dropzone.textContent = 'Файл загружен!';
});

// (3) Показать данные: парсим JSON из текстового поля и отрисовываем таблицу
btnShowData.addEventListener('click', () => {
    try {
        loadedData = JSON.parse(dataInput.value);
        renderDataTable(loadedData);
    } catch (err) {
        alert('Невалидный JSON!');
    }
});

// (4) Очистить данные: очищаем текстовое поле, таблицу и сбрасываем переменную с данными
btnClearData.addEventListener('click', () => {
    dataInput.value = '';
    dataTable.innerHTML = '';
    loadedData = null;
    dropzone.textContent = 'Перетащите сюда файл с данными (JSON)';
});

// (5) Перейти к аналитике: если данные загружены, сохраняем их в localStorage и переходим на другую страницу
btnAnalytics.addEventListener('click', () => {
    if (!loadedData) {
        alert('Нет данных. Сначала загрузите или вставьте JSON.');
        return;
    }
    localStorage.setItem('exSparkData', JSON.stringify(loadedData));
    window.location.href = 'analytics.html';
});

/************************************
 * EXPORT
 * Экспортируем загруженные данные в JSON файл.
 ************************************/
exportButton.addEventListener('click', () => {
    if (!loadedData) {
        alert('Нет данных для экспорта!');
        return;
    }

    // Создаем Blob с данными и генерируем ссылку для скачивания файла
    const blob = new Blob([JSON.stringify(loadedData, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported-data.json';
    document.body.appendChild(a);
    a.click(); // Инициируем скачивание
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Очищаем выделенный URL
});

/************************************
 * РЕНДЕР ТАБЛИЦЫ (БЛОК 1)
 * Функции для отображения данных в виде таблицы с возможностью раскрытия вложенных полей.
 ************************************/
// Функция для отрисовки одного поля данных с поддержкой вложенных объектов
function renderField(key, value) {
    const tr = document.createElement('tr');
    const tdKey = document.createElement('td');
    tdKey.textContent = key;
    const tdValue = document.createElement('td');

    if (typeof value === 'object' && value !== null) {
        // Если значение является объектом, создаем вложенную таблицу для его полей
        const nestedTable = document.createElement('table');
        for (const nestedKey in value) {
            nestedTable.appendChild(renderField(nestedKey, value[nestedKey]));
        }
        tdValue.appendChild(nestedTable);
    } else {
        tdValue.textContent = value;
    }

    tr.appendChild(tdKey);
    tr.appendChild(tdValue);
    return tr;
}

// Функция для отрисовки сессии с возможностью раскрытия деталей
function renderSession(session) {
    const tr = document.createElement('tr');
    const tdSessionId = document.createElement('td');
    tdSessionId.textContent = session.session_id;

    const tdDetails = document.createElement('td');
    const button = document.createElement('button');
    button.textContent = '+'; // Кнопка для раскрытия деталей
    button.className = 'expand-button';

    // Контейнер для скрытых деталей сессии
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'details';
    detailsDiv.style.display = 'none';

    // Вложенная таблица для отображения остальных полей сессии
    const detailsTable = document.createElement('table');
    for (const key in session) {
        if (key !== 'session_id') {
            detailsTable.appendChild(renderField(key, session[key]));
        }
    }
    detailsDiv.appendChild(detailsTable);

    tdDetails.appendChild(button);
    tdDetails.appendChild(detailsDiv);

    tr.appendChild(tdSessionId);
    tr.appendChild(tdDetails);

    // Переключение состояния отображения деталей сессии по клику на кнопку
    button.addEventListener('click', () => {
        if (detailsDiv.style.display === 'none') {
            detailsDiv.style.display = 'block';
            button.textContent = '-';
        } else {
            detailsDiv.style.display = 'none';
            button.textContent = '+';
        }
    });

    dataTable.appendChild(tr);
}

/************************************
 * РЕНДЕР ТАБЛИЦЫ (БЛОК 2)
 * Альтернативная версия функций рендера с измененным оформлением.
 ************************************/
// Функция для отрисовки одного поля данных (аналогичная предыдущей)
function renderField(key, value) {
    const tr = document.createElement('tr');
    const tdKey = document.createElement('td');
    tdKey.textContent = key;
    const tdValue = document.createElement('td');

    if (typeof value === 'object' && value !== null) {
        const nestedTable = document.createElement('table');
        for (const nestedKey in value) {
            nestedTable.appendChild(renderField(nestedKey, value[nestedKey]));
        }
        tdValue.appendChild(nestedTable);
    } else {
        tdValue.textContent = value;
    }

    tr.appendChild(tdKey);
    tr.appendChild(tdValue);
    return tr;
}

// Функция для отрисовки сессии с более гибким оформлением и кнопкой-раскрытием
function renderSession(session) {
    const tr = document.createElement('tr');
    const tdSessionId = document.createElement('td');
    const button = document.createElement('button');
    button.textContent = '+';
    button.className = 'expand-button';

    // Контейнер для кнопки и идентификатора сессии, для выравнивания элементов
    const sessionContainer = document.createElement('div');
    sessionContainer.style.display = 'flex';
    sessionContainer.style.alignItems = 'center';
    sessionContainer.style.gap = '10px';
    sessionContainer.appendChild(button);
    sessionContainer.appendChild(document.createTextNode(session.session_id));
    tdSessionId.appendChild(sessionContainer);

    const tdDetails = document.createElement('td');
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'details';
    detailsDiv.style.display = 'none';

    const detailsTable = document.createElement('table');
    for (const key in session) {
        if (key !== 'session_id') {
            detailsTable.appendChild(renderField(key, session[key]));
        }
    }
    detailsDiv.appendChild(detailsTable);

    tdDetails.appendChild(detailsDiv);

    tr.appendChild(tdSessionId);
    tr.appendChild(tdDetails);

    button.addEventListener('click', () => {
        if (detailsDiv.style.display === 'none') {
            detailsDiv.style.display = 'block';
            button.textContent = '-';
        } else {
            detailsDiv.style.display = 'none';
            button.textContent = '+';
        }
    });

    dataTable.appendChild(tr);
}

// Основная функция для рендера таблицы на основе загруженных данных
function renderDataTable(data) {
    dataTable.innerHTML = ''; // Очищаем таблицу перед загрузкой новых данных

    if (Array.isArray(data)) {
        // Если данных несколько (массив сессий), обрабатываем каждую сессию
        data.forEach(session => {
            renderSession(session);
        });
    } else if (typeof data === 'object' && data !== null) {
        // Если данные представляют собой одну сессию
        renderSession(data);
    } else {
        alert('Невалидные данные!');
    }
}
