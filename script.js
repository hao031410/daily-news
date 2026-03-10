// Daily News Site Logic
const API_BASE = 'https://60s.viki.moe/v2';
const DATA_PATH = './data/';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadCurrentPage();
});

// Tab switching
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// Load page content
function loadCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('history')) {
        loadHistory();
    } else {
        loadToday();
    }
}

// Load today's news
async function loadToday() {
    const today = new Date().toISOString().split('T')[0];
    
    // Load 60s news
    try {
        const newsData = await fetchLocalOrRemote('60s', today);
        renderNewsList('news-list', newsData, 'news');
        document.getElementById('news-loading').style.display = 'none';
        document.getElementById('news-date').textContent = `更新于 ${today}`;
    } catch (e) {
        document.getElementById('news-loading').textContent = '加载失败，请稍后重试';
    }
    
    // Load AI news
    try {
        const aiData = await fetchLocalOrRemote('ai-news', today);
        renderNewsList('ai-list', aiData, 'ai');
        document.getElementById('ai-loading').style.display = 'none';
        document.getElementById('ai-date').textContent = `更新于 ${today}`;
    } catch (e) {
        document.getElementById('ai-loading').textContent = '加载失败，请稍后重试';
    }
}

// Try local first, fallback to API
async function fetchLocalOrRemote(type, date) {
    // Try local data first
    try {
        const localRes = await fetch(`${DATA_PATH}${date}.json`);
        if (localRes.ok) {
            const data = await localRes.json();
            if (data[type]) return data[type];
        }
    } catch (e) {}
    
    // Fallback to API
    const response = await fetch(`${API_BASE}/${type}`);
    const result = await response.json();
    return result.data || result;
}

// Render news list
function renderNewsList(containerId, data, type) {
    const container = document.getElementById(containerId);
    if (!container || !data) return;
    
    let items = [];
    if (type === 'news' && data.news) {
        items = data.news.map(n => ({
            title: n,
            detail: '',
            link: '',
            source: '60s'
        }));
    } else if (type === 'ai' && data.news) {
        items = data.news;
    }
    
    container.innerHTML = items.map(item => `
        <div class="news-item">
            <h3>${escapeHtml(item.title)}</h3>
            ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            <div class="news-meta">
                <span>${item.source || '未知来源'}</span>
                ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank">查看原文 →</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Load history page
async function loadHistory() {
    const calendar = document.getElementById('calendar');
    const archiveList = document.getElementById('archive-list');
    
    try {
        const archiveRes = await fetch(`${DATA_PATH}archive.json`);
        const archive = archiveRes.ok ? await archiveRes.json() : { dates: [] };
        
        // Generate archive list (last 30 days)
        const dates = generateDateList(30);
        const archiveHTML = dates.map(date => {
            const hasNews = archive.dates?.includes(date);
            return `
                <div class="archive-item" onclick="viewDate('${date}')">
                    <span class="archive-date">${date}</span>
                    <div class="archive-types">
                        ${hasNews ? '<span class="type-badge news">60s</span><span class="type-badge ai">AI</span>' : '<span style="color:#999">未归档</span>'}
                    </div>
                </div>
            `;
        }).join('');
        
        archiveList.innerHTML = archiveHTML;
        calendar.innerHTML = `<p>共 ${archive.dates?.length || 0} 天已归档</p>`;
        
        // Filter handler
        document.getElementById('type-filter').addEventListener('change', (e) => {
            filterHistory(e.target.value, dates, archive.dates || []);
        });
        
    } catch (e) {
        calendar.innerHTML = '<p>暂无历史数据</p>';
    }
}

function generateDateList(days) {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

function filterHistory(type, allDates, archivedDates) {
    const archiveList = document.getElementById('archive-list');
    const filtered = allDates.filter(date => {
        const isArchived = archivedDates.includes(date);
        if (type === 'all') return true;
        if (type === 'news' || type === 'ai') return isArchived;
        return true;
    });
    
    archiveList.innerHTML = filtered.map(date => {
        const hasNews = archivedDates.includes(date);
        return `
            <div class="archive-item" onclick="viewDate('${date}')">
                <span class="archive-date">${date}</span>
                <div class="archive-types">
                    ${hasNews ? '<span class="type-badge news">60s</span><span class="type-badge ai">AI</span>' : '<span style="color:#999">未归档</span>'}
                </div>
            </div>
        `;
    }).join('');
}

function viewDate(date) {
    window.location.href = `index.html?date=${date}`;
}

// Utility
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle date param on index
const urlParams = new URLSearchParams(window.location.search);
const dateParam = urlParams.get('date');
if (dateParam && !window.location.pathname.includes('history')) {
    document.addEventListener('DOMContentLoaded', async () => {
        document.getElementById('news-date').textContent = `查看日期: ${dateParam}`;
        document.getElementById('ai-date').textContent = `查看日期: ${dateParam}`;
        
        try {
            const data = await fetch(`${DATA_PATH}${dateParam}.json`).then(r => r.json());
            if (data['60s']) renderNewsList('news-list', data['60s'], 'news');
            if (data['ai-news']) renderNewsList('ai-list', data['ai-news'], 'ai');
            document.getElementById('news-loading').style.display = 'none';
            document.getElementById('ai-loading').style.display = 'none';
        } catch (e) {
            document.getElementById('news-loading').textContent = '该日期暂无数据';
            document.getElementById('ai-loading').textContent = '该日期暂无数据';
        }
    });
}
