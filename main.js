// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ---
let currentUser = null;
let dbKey = null;
let db = null;

let currentFundIndex = null;
let selectedCategoryIdx = 0; 
let activeInputCurrency = { Balance: 'TG', Expense: 'TG', Wish: 'TG' };
let currency = localStorage.getItem('finaq_currency') || 'TG';
const rates = { 'TG': 1, 'USD': 0.0022, 'EUR': 0.002, 'RUB': 0.2 };
const syms = { 'TG': '₸', 'USD': '$', 'EUR': '€', 'RUB': '₽' };

// --- ЛОГИКА ИНТЕГРАЦИИ ЛЕНДИНГА И КАБИНЕТА ---
function checkAuthGlobal() {
    const rawData = localStorage.getItem('finaq_active_user'); // Единый ключ для системы
    const landingView = document.getElementById('landingView');
    const dashboardView = document.getElementById('dashboardView');
    
    if (rawData) {
        currentUser = JSON.parse(rawData);
        dbKey = `finaq_db_${currentUser.login}_${currentUser.pass}`;
        db = JSON.parse(localStorage.getItem(dbKey)) || { balance: 0, stats: [0, 0, 0, 0], tasks: [], wishlist: [], history: [] };
        if(!db.history) db.history = []; // Миграция
        
        // Переключаем окна (если залогинен, показываем кабинет)
        landingView.style.display = 'none';
        dashboardView.style.display = 'flex';
        document.getElementById('loginOverlay').style.display = 'none'; // Скрываем старое окно логина

        // Инициализация кабинета
        document.getElementById('uName').innerText = currentUser.login;
        document.getElementById('pName').innerText = currentUser.login;
        document.getElementById('uInitial').innerText = currentUser.login[0].toUpperCase();
        document.getElementById('pInitial').innerText = currentUser.login[0].toUpperCase();
        
        loadSettings();
        render();
        
    } else {
        // Если не залогинен, показываем лендинг
        landingView.style.display = 'block';
        dashboardView.style.display = 'none';
    }
}

// Обработка единой формы регистрации на Лендинге
document.getElementById('regForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const l = document.getElementById('regLogin').value.trim();
    const p = document.getElementById('regEmail').value.trim(); // Используем поле Email как пароль для совместимости с БД
    
    const userData = { login: l, pass: p, isAuth: true };
    localStorage.setItem('finaq_active_user', JSON.stringify(userData)); // Сохраняем в кэш
    
    toggleModal(); // Закрываем модалку на лендинге
    checkAuthGlobal(); // Запускаем логику входа
});

function handleMainAction() {
    if (localStorage.getItem('finaq_active_user')) checkAuthGlobal();
    else toggleModal();
}

function logout() { 
    localStorage.removeItem('finaq_active_user'); 
    location.reload(); 
}

function toggleModal() { 
    const m = document.getElementById('authModal'); 
    m.classList.toggle('hidden'); m.classList.toggle('flex'); 
}

function openDev() { document.getElementById('devOverlay').style.display = 'flex'; }
function closeDev() { document.getElementById('devOverlay').style.display = 'none'; }


// --- ФУНКЦИИ ЛИЧНОГО КАБИНЕТА ---
function formatMoney(val) {
    return syms[currency] + (val * rates[currency]).toLocaleString('ru-RU', {minimumFractionDigits: 0, maximumFractionDigits: 2});
}

function setCurrency(curr) {
    currency = curr;
    localStorage.setItem('finaq_currency', curr);
    document.querySelectorAll('.curr-btn').forEach(btn => {
        btn.style.background = '';
        btn.classList.remove('text-white');
        btn.classList.add('bg-white/5');
    });
    let activeBtn = document.getElementById('btn-curr-' + curr);
    if(activeBtn) {
        activeBtn.classList.remove('bg-white/5');
        activeBtn.classList.add('text-white');
        activeBtn.style.background = 'var(--accent)';
    }
    render();
    renderStats();
}

function switchTab(tabId) {
    document.getElementById('tabOverview').style.display = tabId === 'overview' ? 'grid' : 'none';
    document.getElementById('tabStats').style.display = tabId === 'stats' ? 'flex' : 'none';
    
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    let activeLink = document.getElementById('nav-' + tabId);
    if(activeLink) activeLink.classList.add('active');
    
    if(tabId === 'stats') renderStats();
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('finaq_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

function setAccentColor(hex) {
    document.documentElement.style.setProperty('--accent', hex);
    localStorage.setItem('finaq_accent', hex);
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    let colorDot = document.getElementById('color-' + hex);
    if(colorDot) colorDot.classList.add('active');
    renderStats(); 
    // Обновляем кнопку текущей валюты в профиле
    let currBtn = document.querySelector('.curr-btn.text-white');
    if(currBtn) currBtn.style.background = hex;
}

function loadSettings() {
    if(localStorage.getItem('finaq_theme') === 'light') document.body.classList.add('light-theme');
    let savedAccent = localStorage.getItem('finaq_accent');
    if(savedAccent) setAccentColor(savedAccent);
    setCurrency(currency);
}

function save() { localStorage.setItem(dbKey, JSON.stringify(db)); render(); renderStats(); }

// --- ЛОГИКА КАСТОМНЫХ СЕЛЕКТОВ ---
function toggleCustomSelect(e) {
    e.stopPropagation();
    const list = document.getElementById('customOptionsList');
    const arrow = document.getElementById('selectArrow');
    list.classList.toggle('open');
    if(arrow) arrow.style.transform = list.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
    document.querySelectorAll('[id^="currOptions"]').forEach(el => el.classList.remove('open'));
}

function selectCustomOption(idx, label) {
    selectedCategoryIdx = idx;
    document.getElementById('selectedOptionLabel').innerText = label;
    document.getElementById('customOptionsList').classList.remove('open');
    let arrow = document.getElementById('selectArrow');
    if(arrow) arrow.style.transform = 'rotate(0deg)';
}

function toggleCurrencySelect(type, e) {
    e.stopPropagation();
    const list = document.getElementById('currOptions' + type);
    document.querySelectorAll('.custom-options').forEach(el => {
        if(el !== list) el.classList.remove('open');
    });
    list.classList.toggle('open');
}

function selectCurrencyOption(type, code, label) {
    activeInputCurrency[type] = code;
    document.getElementById('selectedCurr' + type).innerText = label;
    document.getElementById('currOptions' + type).classList.remove('open');
}

// --- РЕНДЕР ИНТЕРФЕЙСА ---
function render() {
    document.getElementById('displayBalance').innerText = formatMoney(db.balance);
    const maxVal = Math.max(...db.stats, 100);
    
    // Обновляем шкалы в Обзоре
    const bars = document.querySelectorAll('.stat-bar');
    db.stats.forEach((v, i) => {
        if(bars[i]) {
            const h = (v / maxVal) * 100;
            bars[i].style.height = `${Math.max(h, 5)}%`;
            bars[i].style.background = v > 0 ? 'var(--accent)' : 'rgba(128,128,128,0.2)';
        }
    });

    // Обновляем шкалы в Статистике (Дубликат)
    const dupBars = document.querySelectorAll('.stat-bar-dup');
    db.stats.forEach((v, i) => {
        if(dupBars[i]) {
            const h = (v / maxVal) * 100;
            dupBars[i].style.height = `${Math.max(h, 5)}%`;
            dupBars[i].style.background = v > 0 ? 'var(--accent)' : 'rgba(128,128,128,0.2)';
        }
    });

    const taskCont = document.getElementById('taskContainer');
    taskCont.innerHTML = db.tasks.map((t, i) => `
        <div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition group hover:border-[var(--accent)]">
            <div onclick="toggleTask(${i})" class="w-5 h-5 sm:w-6 sm:h-6 border-2 ${t.done ? 'bg-[var(--accent)]' : 'border-white/20'} rounded-lg flex items-center justify-center cursor-pointer shrink-0" style="${t.done ? 'border-color: var(--accent);' : ''}">
                ${t.done ? '<svg class="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
            </div>
            <span class="text-xs sm:text-sm font-medium flex-grow ${t.done ? 'opacity-40 line-through' : ''} break-words">${t.text}</span>
            <button onclick="deleteTask(${i})" class="delete-btn-anim p-1 shrink-0">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"></path></svg>
            </button>
        </div>
    `).join('');

    const wishCont = document.getElementById('wishContainer');
    wishCont.innerHTML = db.wishlist.map((w, i) => {
        const proc = Math.min(Math.round((w.cur / w.total) * 100), 100);
        const isFull = proc >= 100;
        const remaining = (w.total - w.cur);
        return `
            <div class="wish-item relative p-4 sm:p-6 rounded-[25px] sm:rounded-[35px] transition group border border-white/5 bg-white/[0.02] ${isFull ? 'border-green-500/20' : ''}">
                <div class="flex justify-between items-center mb-3 sm:mb-4">
                    <div class="flex items-center gap-2 sm:gap-3">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs sm:text-base" style="${isFull ? 'background: rgba(16, 185, 129, 0.1); color: #10b981;' : 'background: rgba(88, 130, 219, 0.1); color: var(--accent);'}">
                            ${isFull ? '✓' : i+1}
                        </div>
                        <div>
                            <h4 class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isFull ? 'text-green-500' : ''}">${w.name}</h4>
                            <p class="text-[8px] sm:text-[9px] opacity-40 font-bold mt-1 uppercase">ОСТАЛОСЬ: ${remaining > 0 ? formatMoney(remaining) : formatMoney(0)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 sm:gap-4">
                        <div class="text-right hidden sm:block">
                            <span class="block text-xs font-black ${isFull ? 'text-green-500' : ''}" style="${!isFull ? 'color: var(--accent)' : ''}">${proc}%</span>
                            <span class="block text-[8px] opacity-30 font-bold uppercase">${formatMoney(w.cur)} / ${formatMoney(w.total)}</span>
                        </div>
                        ${!isFull ? `<button onclick="openFundModal(${i})" class="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition" style="background: var(--accent);">+</button>` : ''}
                        <button onclick="deleteWish(${i})" class="delete-btn-anim">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="3"></path></svg>
                        </button>
                    </div>
                </div>
                <!-- Мобильный прогресс текст -->
                <div class="sm:hidden flex justify-between text-[8px] font-bold opacity-60 uppercase mb-1">
                    <span>${proc}%</span>
                    <span>${formatMoney(w.cur)} / ${formatMoney(w.total)}</span>
                </div>
                <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700" style="width: ${proc}%; background: ${isFull ? '#10b981' : 'var(--accent)'}"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStats() {
    const histCont = document.getElementById('historyContainer');
    const chartCont = document.getElementById('chartContainer');
    
    if(!db.history || db.history.length === 0) {
        histCont.innerHTML = '<div class="text-[10px] sm:text-xs opacity-40 text-center mt-6 sm:mt-10 uppercase tracking-widest">Нет данных для анализа</div>';
        chartCont.innerHTML = '';
        return;
    }

    histCont.innerHTML = [...db.history].reverse().map(h => {
        const isInc = h.type === 'in';
        const cats = ['🍎 Еда и продукты', '🚗 Транспорт и такси', '🎬 Развлечения', '🛍️ Магазины и шоппинг', '🎯 Перевод на цель'];
        const catName = h.cat !== undefined ? cats[h.cat] : 'Пополнение баланса';
        const dateStr = new Date(h.date).toLocaleDateString('ru-RU', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'});
        
        return `
            <div class="flex justify-between items-center p-4 sm:p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-[var(--accent)] transition">
                <div>
                    <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wide">${catName}</div>
                    <div class="text-[8px] sm:text-[9px] opacity-40 font-bold mt-1 uppercase tracking-widest">${dateStr}</div>
                </div>
                <div class="font-black text-xs sm:text-sm tracking-tighter" style="color: ${isInc ? '#10b981' : '#ef4444'};">
                    ${isInc ? '+' : '-'}${formatMoney(h.val)}
                </div>
            </div>
        `;
    }).join('');

    const maxVal = Math.max(...db.history.map(h => h.val), 10);
    const chartData = db.history.slice(-30); 
    
    chartCont.innerHTML = chartData.map(h => {
        const isInc = h.type === 'in';
        const height = Math.max((h.val / maxVal) * 100, 2); 
        return `
            <div class="flex-grow relative group h-full flex items-end justify-center min-w-[10px]">
                <div class="w-full rounded-t-sm transition-all duration-500 hover:opacity-80 cursor-pointer shadow-lg" 
                     style="height: ${height}%; width: 100%; max-width: 60px; background: ${isInc ? '#10b981' : '#ef4444'}; box-shadow: 0 0 15px ${isInc ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}">
                </div>
                <div class="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition glass text-[8px] sm:text-[10px] py-1 sm:py-2 px-2 sm:px-3 rounded-xl pointer-events-none whitespace-nowrap z-10 font-bold tracking-widest uppercase hidden sm:block">
                    ${isInc ? '+' : '-'}${formatMoney(h.val)}
                </div>
            </div>
        `;
    }).join('');
}

// --- ЛОГИКА ЦЕЛЕЙ И БАЗЫ ЦЕН ---
const priceDatabase = { "iphone": 450000, "tesla": 20000000, "ps5": 250000, "macbook": 600000, "airpods": 90000 };
function searchPriceHint(val) {
    const query = val.toLowerCase().trim();
    const hintDiv = document.getElementById('priceHint');
    const hintVal = document.getElementById('hintVal');
    if(priceDatabase[query]) { 
        hintDiv.classList.remove('hidden'); 
        hintDiv.classList.add('flex');
        hintVal.innerText = formatMoney(priceDatabase[query]); 
        hintVal.dataset.raw = priceDatabase[query];
    } 
    else { 
        hintDiv.classList.add('hidden'); 
        hintDiv.classList.remove('flex');
    }
}

function useHint() {
    const rawVal = document.getElementById('hintVal').dataset.raw;
    document.getElementById('wTotal').value = rawVal; 
    document.getElementById('wTotal').dataset.fromHint = "true";
    selectCurrencyOption('Wish', 'TG', '₸ KZT');
    document.getElementById('priceHint').classList.add('hidden');
}

// --- ЛОГИКА ПОПОЛНЕНИЯ И ОПЕРАЦИЙ ---
function openFundModal(idx) {
    currentFundIndex = idx;
    const wish = db.wishlist[idx];
    const remaining = (wish.total - wish.cur);
    const maxToFund = Math.min(db.balance, remaining);

    const slider = document.getElementById('fundSlider');
    slider.max = maxToFund;
    slider.value = 0;
    
    document.getElementById('fundTargetName').innerText = `Цель: ${wish.name}`;
    document.getElementById('sliderMinLabel').innerText = formatMoney(0);
    document.getElementById('sliderMaxLabel').innerText = `Max: ${formatMoney(maxToFund)}`;
    updateSliderVal(0);

    const btnBox = document.getElementById('quickPercentButtons');
    const pcts = [25, 50, 75, 100];
    btnBox.innerHTML = pcts.map(p => {
        let sum = (remaining * (p / 100)); 
        const finalSum = Math.min(sum, db.balance); 
        return `
            <button onclick="setQuickSum(${finalSum})" class="pct-btn p-2 sm:p-3 rounded-2xl flex flex-col items-center">
                <span class="text-[9px] sm:text-[10px] font-black">${p}%</span>
                <span class="text-[7px] sm:text-[8px] opacity-40 font-bold">${formatMoney(finalSum)}</span>
            </button>
        `;
    }).join('');

    openModal('modalFund');
}

function setQuickSum(val) { document.getElementById('fundSlider').value = val; updateSliderVal(val); }
function updateSliderVal(v) { document.getElementById('sliderVal').innerText = formatMoney(v); }

function applyFund() {
    const amount = parseFloat(document.getElementById('fundSlider').value);
    if(amount > 0) {
        db.balance = (db.balance - amount);
        db.wishlist[currentFundIndex].cur = (db.wishlist[currentFundIndex].cur + amount);
        db.history.push({ type: 'out', val: amount, cat: 4, date: Date.now() }); 
        closeModal('modalFund');
        save();
    }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function openDevDashboard() { openModal('modalDevDashboard'); }

function applyBalance() {
    let val = parseFloat(document.getElementById('inBalance').value) || 0;
    let inputCode = activeInputCurrency['Balance'];
    let valInBase = val / rates[inputCode]; 
    
    if(valInBase > 0) {
        db.balance = (db.balance + valInBase);
        db.history.push({ type: 'in', val: valInBase, date: Date.now() });
    }
    document.getElementById('inBalance').value = '';
    closeModal('modalBalance');
    save();
}

function applyExpense() {
    let val = parseFloat(document.getElementById('exVal').value) || 0;
    let inputCode = activeInputCurrency['Expense'];
    let valInBase = val / rates[inputCode]; 
    
    if(valInBase > 0 && db.balance >= valInBase) {
        db.balance = (db.balance - valInBase);
        db.stats[selectedCategoryIdx] = (db.stats[selectedCategoryIdx] + valInBase);
        db.history.push({ type: 'out', val: valInBase, cat: selectedCategoryIdx, date: Date.now() });
        
        closeModal('modalExpense');
        save();
    } else if(db.balance < valInBase) {
        alert("Недостаточно средств!");
    }
    document.getElementById('exVal').value = '';
}

function applyWish() {
    const n = document.getElementById('wName').value;
    let t = parseFloat(document.getElementById('wTotal').value) || 0;
    let inputCode = activeInputCurrency['Wish'];
    
    if(document.getElementById('wTotal').dataset.fromHint !== "true") {
        t = t / rates[inputCode]; 
    }
    
    if(n && t > 0) {
        db.wishlist.push({ name: n, total: t, cur: 0 });
        document.getElementById('wName').value = '';
        document.getElementById('wTotal').value = '';
        document.getElementById('wTotal').dataset.fromHint = "false";
        closeModal('modalWish');
        save();
    }
}

function applyTask() {
    const t = document.getElementById('tText').value;
    if(t) { db.tasks.push({ text: t, done: false }); document.getElementById('tText').value=''; closeModal('modalTask'); save(); }
}

function toggleTask(i) { db.tasks[i].done = !db.tasks[i].done; save(); }
function deleteTask(i) { db.tasks.splice(i, 1); save(); }
function deleteWish(i) { db.wishlist.splice(i, 1); save(); }

function toggleProfile() { document.getElementById('profilePanel').classList.toggle('open'); }
function toggleAI() { document.getElementById('aiPanel').classList.toggle('open'); }

// --- СИСТЕМА ИИ ---
const aiReplies = [
    "Рекомендую откладывать 10% от любого дохода на подушку безопасности.",
    "Следи за расходами на еду, часто именно там скрываются лишние траты.",
    "Отличный день для того, чтобы закинуть немного денег в копилку!",
    "Эмоциональные покупки лучше откладывать на 24 часа. Если завтра тоже захочешь — бери.",
    "Твоя статистика выглядит неплохо, но всегда есть куда расти!",
    "Инвестиции — это марафон, а не спринт. Главное регулярность."
];

function sendMessage() {
    const input = document.getElementById('aiInput');
    const text = input.value.trim();
    if(!text) return;
    
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML += `<div class="text-right mb-2"><span class="text-white px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tr-sm inline-block text-xs sm:text-sm" style="background: var(--accent);">${text}</span></div>`;
    input.value = '';
    
    const typingId = 'typing_' + Date.now();
    chatBox.innerHTML += `<div id="${typingId}" class="text-left mb-2 fade-in"><span class="bg-white/5 border border-white/10 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tl-sm inline-block text-xs sm:text-sm italic opacity-50">Печатаю...</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    
    setTimeout(() => {
        const typingEl = document.getElementById(typingId);
        if(typingEl) typingEl.remove();
        
        const reply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
        chatBox.innerHTML += `<div class="text-left mb-2 fade-in"><span class="bg-white/5 border border-white/10 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tl-sm inline-block text-xs sm:text-sm">${reply}</span></div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1500);
}

window.onclick = function(e) {
    if (!e.target.closest('#categorySelect')) {
        let list = document.getElementById('customOptionsList');
        if(list) list.classList.remove('open');
        const arrow = document.getElementById('selectArrow');
        if(arrow) arrow.style.transform = 'rotate(0deg)';
    }
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-options').forEach(el => el.classList.remove('open'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthGlobal(); // Инициализация на основе локального кэша
});