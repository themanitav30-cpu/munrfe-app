// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Открываем на весь экран

// URL вашего развернутого Google Apps Script
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyKVIhBHsqNrsWjt8HmqVqDTwuEeFrzPYZF_OE7sceRtIHwKdZJ9yP5FNon7OIqq3Nf/exec';

// Состояние приложения
let currentAdminToken = null;
let allEvents = [];
let allMembers = [];
let timerInterval;
let timerSeconds = 0;

// Навигация
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

// Инициализация данных при загрузке
document.addEventListener('DOMContentLoaded', () => {
    fetchNews();
    fetchEvents();
    fetchMembers();
    initCalendar();
});

// --- FETCH ИНТЕРФЕЙСЫ ---
async function fetchNews() {
    try {
        const response = await fetch(`${GAS_URL}?sheet=News`);
        const data = await response.json();
        renderNews(data);
    } catch (e) {
        document.getElementById('news-feed').innerHTML = '<div class="loader">Ошибка загрузки новостей</div>';
    }
}

async function fetchEvents() {
    try {
        const response = await fetch(`${GAS_URL}?sheet=Events`);
        allEvents = await response.json();
        renderCalendar(currentDate);
    } catch (e) {
        console.error("Ошибка загрузки событий:", e);
    }
}

async function fetchMembers() {
    // Временные дефолтные данные для демонстрации
    allMembers = [
        { FullName: "Artur Vafin", Role: "Coordinator", TelegramUsername: "username1" },
        { FullName: "Irina Savilova", Role: "Vice-Coordinator", TelegramUsername: "username2" }
    ];
    renderMembers(allMembers);
    
    try {
        const response = await fetch(`${GAS_URL}?sheet=Members`);
        const data = await response.json();
        if(data && data.length > 0) {
            allMembers = data;
            renderMembers(allMembers);
        }
    } catch (e) {
        console.error("Используются локальные данные участников");
    }
}

// --- РЕНДЕРИНГ ---
function renderNews(newsArray) {
    const container = document.getElementById('news-feed');
    container.innerHTML = '';
    
    if (!newsArray || newsArray.length === 0) {
        container.innerHTML = '<div class="loader">Новостей пока нет.</div>';
        return;
    }

    // Реверс для показа свежих сверху
    newsArray.reverse().forEach(news => {
        const imgHtml = news.ImageURL ? `<img src="${news.ImageURL}" class="news-image" alt="Cover">` : '';
        const card = `
            <div class="news-card">
                <span class="news-date">${news.Date}</span>
                <h3 class="news-title">${news.Title}</h3>
                ${imgHtml}
                <p class="news-content">${news.Content.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

function renderMembers(members) {
    const container = document.getElementById('members-list');
    container.innerHTML = '';
    
    members.forEach(m => {
        const link = m.TelegramUsername.replace('@', '');
        const card = `
            <div class="member-card">
                <div class="member-info">
                    <h4>${m.FullName}</h4>
                    <span class="member-role">${m.Role}</span>
                </div>
                <a href="https://t.me/${link}" class="member-tg" target="_blank">
                    <i class="fa-brands fa-telegram"></i>
                </a>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

// Поиск участников
document.getElementById('member-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allMembers.filter(m => m.FullName.toLowerCase().includes(query) || m.Role.toLowerCase().includes(query));
    renderMembers(filtered);
});

// --- КАЛЕНДАРЬ ---
let currentDate = new Date();

function initCalendar() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });
    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });
}

function renderCalendar(date) {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    const monthYear = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    document.getElementById('month-year').textContent = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Смещение для начала недели с Понедельника
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    for (let i = 0; i < startOffset; i++) {
        grid.insertAdjacentHTML('beforeend', '<div class="calendar-day empty"></div>');
    }
    
    const today = new Date();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const dateString = dayDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        let classes = 'calendar-day';
        if (dayDate.toDateString() === today.toDateString()) classes += ' today';
        
        const dayEvents = allEvents.filter(e => e.Date && e.Date.startsWith(dateString));
        if (dayEvents.length > 0) classes += ' has-event';
        
        const dayEl = document.createElement('div');
        dayEl.className = classes;
        dayEl.textContent = i;
        if (dayEvents.length > 0) {
            dayEl.insertAdjacentHTML('beforeend', '<div class="event-dot"></div>');
            dayEl.addEventListener('click', () => showBottomSheet(dayEvents[0]));
        } else {
            dayEl.addEventListener('click', () => {
                tg.showPopup({ title: 'Календарь', message: 'На этот день событий не запланировано.' });
            });
        }
        
        grid.appendChild(dayEl);
    }
}

// --- BOTTOM SHEET ---
const bottomSheet = document.getElementById('event-bottom-sheet');
const overlay = document.getElementById('sheet-overlay');

function showBottomSheet(event) {
    document.getElementById('sheet-title').textContent = event.Title;
    document.getElementById('sheet-datetime').innerHTML = `<i class="fa-regular fa-clock"></i> ${event.Time}`;
    document.getElementById('sheet-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${event.Location}`;
    document.getElementById('sheet-desc').textContent = event.Description;
    
    bottomSheet.classList.add('active');
    overlay.classList.add('active');
}

function closeSheet() {
    bottomSheet.classList.remove('active');
    overlay.classList.remove('active');
}
document.getElementById('close-sheet').addEventListener('click', closeSheet);
overlay.addEventListener('click', closeSheet);


// --- ТАЙМЕР ДЕБАТОВ ---
const timeDisplay = document.getElementById('timer-display');

function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    timeDisplay.textContent = `${m}:${s}`;
}

document.getElementById('timer-start').addEventListener('click', () => {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
    }
});

document.getElementById('timer-pause').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
});

document.getElementById('timer-reset').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 0;
    updateTimerDisplay();
});


// --- АДМИН ПАНЕЛЬ ---
document.getElementById('admin-login-btn').addEventListener('click', () => {
    if (currentAdminToken) {
        openAdminTab();
        return;
    }
    
    tg.showPopup({
        title: 'Доступ ограничен',
        message: 'Введите пароль администратора Секретариата:',
        buttons: [{id: 'login', type: 'default', text: 'Ввести пароль'}, {type: 'cancel'}]
    }, (buttonId) => {
        if (buttonId === 'login') {
            const password = prompt("Введите пароль:");
            if (password) {
                currentAdminToken = password;
                openAdminTab();
            }
        }
    });
});

function openAdminTab() {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tab-admin').classList.add('active');
}

async function sendAdminRequest(payload) {
    payload.token = currentAdminToken;
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
                'X-Admin-Token': currentAdminToken
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (response.status === 403) {
            tg.showAlert("Ошибка: Неверный пароль.");
            currentAdminToken = null;
        } else if (result.success) {
            tg.showAlert("Успешно выполнено!");
            // Очищаем поля формы после успешной отправки
            document.getElementById('news-title').value = '';
            document.getElementById('news-content').value = '';
            document.getElementById('news-image').value = '';
            document.getElementById('event-title').value = '';
            document.getElementById('event-desc').value = '';
            document.getElementById('event-location').value = '';
            document.getElementById('broadcast-text').value = '';
            
            // Перезагружаем списки
            fetchNews();
            fetchEvents();
        } else {
            tg.showAlert("Ошибка: " + (result.error || "Неизвестная ошибка"));
        }
    } catch (e) {
        tg.showAlert("Сетевая ошибка при отправке запроса.");
    }
}

document.getElementById('submit-news').addEventListener('click', () => {
    const title = document.getElementById('news-title').value;
    const content = document.getElementById('news-content').value;
    const image = document.getElementById('news-image').value;
    if(!title || !content) return tg.showAlert("Заполните заголовок и текст");
    
    sendAdminRequest({ action: 'addNews', title, content, imageUrl: image });
});

document.getElementById('submit-event').addEventListener('click', () => {
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const title = document.getElementById('event-title').value;
    const desc = document.getElementById('event-desc').value;
    const location = document.getElementById('event-location').value;
    if(!date || !title) return tg.showAlert("Заполните дату и название");
    
    sendAdminRequest({ action: 'addEvent', date, time, title, description: desc, location });
});

document.getElementById('submit-broadcast').addEventListener('click', () => {
    const text = document.getElementById('broadcast-text').value;
    if(!text) return tg.showAlert("Введите текст для рассылки");
    
    sendAdminRequest({ action: 'sendBroadcast', message: text });
});