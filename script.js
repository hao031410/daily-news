// Daily News Site Logic
const API_BASE = 'https://60s.viki.moe/v2';
const DATA_PATH = './data/';

// Calendar state
let currentCalendarDate = new Date();
let archiveData = { dates: [] };

// Cache for missing local files to avoid repeated 404 requests
const missingFilesCache = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    initSegmentedControl();
    initFilterChips();
    initCalendar();
    loadCurrentPage();
});

// Update current date display
function updateCurrentDate() {
    const dateEl = document.getElementById('current-date');
    const statusEl = document.getElementById('update-status');
    if (dateEl) {
        const today = new Date();
        const formatted = today.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        dateEl.textContent = formatted;
    }
    if (statusEl) {
        statusEl.textContent = '已更新';
    }
}

// Segmented control
function initSegmentedControl() {
    const segmentBtns = document.querySelectorAll('.segment-btn');
    segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchSegment(tab);
        });
    });
}

function switchSegment(tabName) {
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// Filter chips for history page
function initFilterChips() {
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter;
            filterArchiveList(filter);
        });
    });
}

function filterArchiveList(type) {
    const archiveList = document.getElementById('archive-list');
    if (!archiveList) return;

    const dates = generateDateList(30);
    const filtered = dates.map(date => {
        const isArchived = archiveData.dates?.includes(date);
        return { date, isArchived };
    }).filter(item => {
        if (type === 'all') return true;
        // For news/ai filter, show all dates but style differently
        return true;
    });

    renderArchiveListWithFilter(filtered, type);
}

// Calendar initialization
function initCalendar() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
    }
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    const monthLabelEl = document.getElementById('calendar-month');

    if (!calendarEl) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update month label
    if (monthLabelEl) {
        monthLabelEl.textContent = currentCalendarDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long'
        });
    }

    // Get first day and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Today's date for highlighting
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Weekday headers
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    let html = '<div class="calendar-grid">';

    // Weekday headers
    weekdays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });

    // Previous month's remaining days
    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day empty">${daysInPrevMonth - i}</div>`;
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasData = archiveData.dates?.includes(dateStr);
        const isToday = isCurrentMonth && day === today.getDate();

        let classes = 'calendar-day';
        if (hasData) classes += ' has-data';
        if (isToday) classes += ' today';

        html += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
    }

    // Next month's remaining days to fill grid
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day empty">${i}</div>`;
    }

    html += '</div>';
    calendarEl.innerHTML = html;

    // Add click handlers to calendar days
    calendarEl.querySelectorAll('.calendar-day.has-data').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const date = dayEl.dataset.date;
            viewDate(date);
        });
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

    let newsData = null;
    let aiData = null;
    let newsError = null;
    let aiError = null;

    try {
        newsData = await fetchLocalOrRemote('60s', today);
        renderNewsList('news-list', newsData, 'news');
        document.getElementById('news-loading').style.display = 'none';
    } catch (e) {
        newsError = e.message || 'unknown';
        const el = document.getElementById('news-loading');
        if (el) {
            el.style.display = 'block';
            el.textContent = '暂无今日 60s 数据';
            el.classList.add('empty-state');
        }
    }

    try {
        aiData = await fetchLocalOrRemote('ai-news', today);
        renderNewsList('ai-list', aiData, 'ai');
        document.getElementById('ai-loading').style.display = 'none';
    } catch (e) {
        aiError = e.message || 'unknown';
        const el = document.getElementById('ai-loading');
        if (el) {
            el.style.display = 'block';
            el.textContent = '暂无今日 AI 数据';
            el.classList.add('empty-state');
        }
    }

    renderAllView(newsData, aiData);
    document.getElementById('all-loading').style.display = 'none';

    // Update content summary
    updateContentSummary(newsData, aiData);
}

// Update content summary in hero
function updateContentSummary(newsData, aiData) {
    const summaryEl = document.getElementById('content-summary');
    if (!summaryEl) return;

    const newsCount = newsData?.news?.length || 0;
    const aiCount = aiData?.news?.length || 0;

    if (newsCount === 0 && aiCount === 0) {
        summaryEl.textContent = '暂无内容';
        return;
    }

    const parts = [];
    if (newsCount > 0) parts.push(`${newsCount}条 60s`);
    if (aiCount > 0) parts.push(`${aiCount}条 AI`);
    summaryEl.textContent = parts.join(' · ');
}

// Render combined view for "All" tab
function renderAllView(newsData, aiData) {
    const container = document.getElementById('all-list');
    if (!container) return;

    const allItems = [];

    if (newsData && newsData.news) {
        newsData.news.forEach((title, index) => {
            allItems.push({
                title,
                detail: '',
                link: '',
                source: '60s 看世界',
                category: 'news',
                index: index + 1
            });
        });
    }

    if (aiData && aiData.news) {
        aiData.news.forEach((item, index) => {
            allItems.push({
                title: item.title || '',
                detail: item.detail || '',
                link: item.link || '',
                source: 'AI 资讯',
                category: 'ai',
                index: index + 1
            });
        });
    }

    if (allItems.length === 0) {
        container.innerHTML = '<p class="loading">暂无内容</p>';
        return;
    }

    container.innerHTML = allItems.map(item => `
        <div class="news-item">
            <span class="news-category ${item.category}">${item.category === 'news' ? '60s' : 'AI'}</span>
            <span class="news-index">${item.index}</span>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            <div class="news-meta">
                <span class="news-source">${item.source}</span>
                ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" class="news-link">查看原文 →</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Try local first, fallback to API
async function fetchLocalOrRemote(type, date) {
    const cacheKey = `${date}-${type}`;

    // Skip local fetch if we already know this file is missing
    if (!missingFilesCache.has(cacheKey)) {
        try {
            const localRes = await fetch(`${DATA_PATH}${date}.json`);
            if (localRes.ok) {
                const data = await localRes.json();
                if (data[type]) {
                    return data[type];
                }
            } else {
                // Mark this file as missing to avoid repeated 404s
                missingFilesCache.add(cacheKey);
            }
        } catch (e) {
            // Local fetch failed, mark as missing and continue to remote
            missingFilesCache.add(cacheKey);
        }
    }

    // Fallback to remote API
    try {
        const response = await fetch(`${API_BASE}/${type}`);
        if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
        }
        const result = await response.json();
        return result.data || result;
    } catch (e) {
        throw new Error(`Remote fetch failed: ${e.message}`);
    }
}

// Render news list
function renderNewsList(containerId, data, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || !data.news || data.news.length === 0) {
        container.innerHTML = '<p class="empty-state">暂无内容</p>';
        return;
    }

    let items = [];
    if (type === 'news' && data.news) {
        items = data.news.map((n, i) => ({
            title: n,
            detail: '',
            link: '',
            source: '60s 看世界',
            category: 'news',
            index: i + 1
        }));
    } else if (type === 'ai' && data.news) {
        items = data.news.map((item, i) => ({
            ...item,
            source: item.source || 'AI 资讯',
            category: 'ai',
            index: i + 1
        }));
    }

    container.innerHTML = items.map(item => `
        <div class="news-item">
            <span class="news-category ${item.category}">${item.category === 'news' ? '60s' : 'AI'}</span>
            <span class="news-index">${item.index}</span>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
            <div class="news-meta">
                <span class="news-source">${item.source}</span>
                ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" class="news-link">查看原文 →</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Load history page
async function loadHistory() {
    try {
        const archiveRes = await fetch(`${DATA_PATH}archive.json`);
        archiveData = archiveRes.ok ? await archiveRes.json() : { dates: [] };

        // Update summary stats
        updateHistorySummary(archiveData);

        // Render calendar
        renderCalendar();

        // Render archive list
        const dates = generateDateList(30);
        renderArchiveList(dates);

    } catch (e) {
        const calendarEl = document.getElementById('calendar');
        const archiveListEl = document.getElementById('archive-list');

        if (calendarEl) {
            calendarEl.innerHTML = '<p class="empty-state">暂无历史数据，日历将在有归档后显示</p>';
        }
        if (archiveListEl) {
            archiveListEl.innerHTML = '<p class="empty-state">暂无归档记录</p>';
        }
    }
}

// Update history summary stats
function updateHistorySummary(archiveData) {
    const totalDaysEl = document.getElementById('total-days');
    const totalNewsEl = document.getElementById('total-news');
    const totalAiEl = document.getElementById('total-ai');
    const latestDateEl = document.getElementById('latest-date');

    const totalDays = archiveData.dates?.length || 0;

    if (totalDaysEl) totalDaysEl.textContent = totalDays;

    // Use actual counts from archive data if available, otherwise estimate
    const estimatedNewsPerDay = 15;
    const estimatedAiPerDay = 8;

    if (totalNewsEl) {
        if (archiveData.totalNews !== undefined) {
            totalNewsEl.textContent = archiveData.totalNews.toLocaleString();
        } else {
            totalNewsEl.textContent = (totalDays * estimatedNewsPerDay).toLocaleString();
        }
    }

    if (totalAiEl) {
        if (archiveData.totalAi !== undefined) {
            totalAiEl.textContent = archiveData.totalAi.toLocaleString();
        } else {
            totalAiEl.textContent = (totalDays * estimatedAiPerDay).toLocaleString();
        }
    }

    if (latestDateEl) {
        if (totalDays > 0 && archiveData.dates) {
            const latest = archiveData.dates[0];
            latestDateEl.textContent = latest.replace(/-/g, '.');
        } else {
            latestDateEl.textContent = '-';
        }
    }
}

// Render archive list
function renderArchiveList(dates) {
    renderArchiveListWithFilter(
        dates.map(date => ({
            date,
            isArchived: archiveData.dates?.includes(date)
        })),
        'all'
    );
}

function renderArchiveListWithFilter(items, filterType) {
    const archiveList = document.getElementById('archive-list');
    if (!archiveList) return;

    if (items.length === 0) {
        archiveList.innerHTML = '<p class="empty-state">暂无符合条件的归档数据</p>';
        return;
    }

    const html = items.map(({ date, isArchived }) => {
        const dateObj = new Date(date);
        const weekday = dateObj.toLocaleDateString('zh-CN', { weekday: 'long' });

        return `
            <div class="archive-item ${!isArchived ? 'no-data' : ''}" onclick="viewDate('${date}')">
                <div class="archive-date">
                    <span class="archive-date-primary">${date}</span>
                    <span class="archive-date-secondary">${weekday}</span>
                </div>
                <div class="archive-types">
                    ${isArchived
                        ? '<span class="type-badge news">60s</span><span class="type-badge ai">AI</span>'
                        : '<span class="type-badge empty">未归档</span>'}
                </div>
            </div>
        `;
    }).join('');

    archiveList.innerHTML = html;
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
        const dateEl = document.getElementById('current-date');
        const statusEl = document.getElementById('update-status');
        const backBtn = document.getElementById('back-to-today');

        if (dateEl) {
            dateEl.textContent = `查看日期：${dateParam}`;
        }
        if (statusEl) {
            statusEl.textContent = '历史归档';
        }
        // Show back to today button
        if (backBtn) {
            backBtn.style.display = 'inline-flex';
        }

        let newsData = null;
        let aiData = null;

        try {
            // Try local first, but check cache to avoid repeated 404s
            let localData = null;
            const newsCacheKey = `${dateParam}-60s`;
            const aiCacheKey = `${dateParam}-ai-news`;
            const hasMissingNews = missingFilesCache.has(newsCacheKey);
            const hasMissingAi = missingFilesCache.has(aiCacheKey);

            // Only try local fetch if not already known to be missing
            if (!hasMissingNews || !hasMissingAi) {
                try {
                    const localRes = await fetch(`${DATA_PATH}${dateParam}.json`);
                    if (localRes.ok) {
                        localData = await localRes.json();
                    } else {
                        // Mark both as missing since the file doesn't exist
                        missingFilesCache.add(newsCacheKey);
                        missingFilesCache.add(aiCacheKey);
                    }
                } catch (e) {
                    missingFilesCache.add(newsCacheKey);
                    missingFilesCache.add(aiCacheKey);
                }
            }

            if (localData && localData['60s']) {
                newsData = localData['60s'];
                renderNewsList('news-list', newsData, 'news');
            } else {
                document.getElementById('news-loading').textContent = '该日期暂无 60s 数据';
                document.getElementById('news-loading').classList.add('empty-state');
            }

            if (localData && localData['ai-news']) {
                aiData = localData['ai-news'];
                renderNewsList('ai-list', aiData, 'ai');
            } else {
                document.getElementById('ai-loading').textContent = '该日期暂无 AI 数据';
                document.getElementById('ai-loading').classList.add('empty-state');
            }

            renderAllView(newsData, aiData);

            document.getElementById('news-loading').style.display = 'none';
            document.getElementById('ai-loading').style.display = 'none';
            document.getElementById('all-loading').style.display = 'none';

            updateContentSummary(newsData, aiData);

        } catch (e) {
            const msg = '该日期暂无归档数据';
            const newsEl = document.getElementById('news-loading');
            const aiEl = document.getElementById('ai-loading');
            const allEl = document.getElementById('all-loading');

            if (newsEl) {
                newsEl.textContent = msg;
                newsEl.classList.add('empty-state');
            }
            if (aiEl) {
                aiEl.textContent = msg;
                aiEl.classList.add('empty-state');
            }
            if (allEl) {
                allEl.textContent = msg;
                allEl.classList.add('empty-state');
            }
        }
    });
}
