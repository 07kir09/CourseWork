/************************************
 * ИМИТАЦИЯ ЗАГРУЗКИ
 ************************************/
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.display = 'none';
    }, 1000);
});

/************************************
 * META MASK (если нужно)
 ************************************/
const connectButton = document.getElementById('connectButton');
const connectText = document.getElementById('connectText');

if (connectButton) {
    connectButton.addEventListener('click', async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length > 0) {
                    const account = accounts[0];
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
 ************************************/
const dataInput = document.getElementById('dataInput');
const dataTable = document.getElementById('dataTable');
const dropzone = document.getElementById('dropzone');

// Кнопки на sidebar
const btnBrowse = document.getElementById('btnBrowse');
const btnUseDefault = document.getElementById('btnUseDefault');
const btnShowData = document.getElementById('btnShowData');
const btnClearData = document.getElementById('btnClearData');
const btnAnalytics = document.getElementById('btnAnalytics');

// Скрытый input для загрузки файла
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

// Кнопка export
const exportButton = document.getElementById('exportButton');

// Тестовые данные
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
 ************************************/
dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = '#4dabf7';
    dropzone.textContent = 'Release the file...';
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = '#ccc';
    dropzone.textContent = 'Drag and drop the data file (JSON) here';
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
 ************************************/
// (1) Загрузить из файла
btnBrowse.addEventListener('click', () => {
    fileInput.click();
});
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
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

// (2) Тестовые данные
btnUseDefault.addEventListener('click', () => {
    dataInput.value = JSON.stringify(defaultData, null, 2);
    dropzone.textContent = 'Файл загружен!';
});

// (3) Показать данные
btnShowData.addEventListener('click', () => {
    try {
        loadedData = JSON.parse(dataInput.value);
        renderDataTable(loadedData);
    } catch (err) {
        alert('Невалидный JSON!');
    }
});

// (4) Очистить данные
btnClearData.addEventListener('click', () => {
    dataInput.value = '';
    dataTable.innerHTML = '';
    loadedData = null;
    dropzone.textContent = 'Перетащите сюда файл с данными (JSON)';
});

// (5) Перейти к аналитике
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
 ************************************/
exportButton.addEventListener('click', () => {
    if (!loadedData) {
        alert('Нет данных для экспорта!');
        return;
    }

    const blob = new Blob([JSON.stringify(loadedData, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

/************************************
 * РЕНДЕР ТАБЛИЦЫ
 ************************************/
// Функция для рендеринга одного поля (включая вложенные объекты)
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

// Функция для рендеринга одной сессии
function renderSession(session) {
    const tr = document.createElement('tr');
    const tdSessionId = document.createElement('td');
    tdSessionId.textContent = session.session_id;

    const tdDetails = document.createElement('td');
    const button = document.createElement('button');
    button.textContent = '+';
    button.className = 'expand-button';

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

    tdDetails.appendChild(button);
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

/************************************
 * РЕНДЕР ТАБЛИЦЫ
 ************************************/
// Функция для рендеринга одного поля (включая вложенные объекты)
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

// Функция для рендеринга одной сессии
function renderSession(session) {
    const tr = document.createElement('tr');
    const tdSessionId = document.createElement('td');
    const button = document.createElement('button');
    button.textContent = '+';
    button.className = 'expand-button';

    // Обертка для выравнивания кнопки и текста
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

// Основная функция рендеринга таблицы
function renderDataTable(data) {
    dataTable.innerHTML = '';

    if (Array.isArray(data)) {
        data.forEach(session => {
            renderSession(session);
        });
    } else if (typeof data === 'object' && data !== null) {
        renderSession(data);
    } else {
        alert('Невалидные данные!');
    }
}