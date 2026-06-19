// Global state
let releaseNotes = [];
let currentFilter = 'all';
let currentSearch = '';
let selectedItem = null;

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const searchInput = document.getElementById('search-input');
const filterTags = document.querySelectorAll('.filter-tag');
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const btnSpinner = document.getElementById('btn-spinner');
const btnIcon = document.getElementById('btn-icon');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeCheckbox = document.getElementById('theme-checkbox');

// Composer DOM Elements
const composerCard = document.getElementById('composer-card');
const composerStatus = document.getElementById('composer-status');
const composerHint = document.getElementById('composer-hint');
const composerWorkspace = document.getElementById('composer-workspace');
const selectedNotePreview = document.getElementById('selected-note-preview');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const charLimitSpan = document.getElementById('char-limit');
const charCounter = document.getElementById('char-counter');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const tweetBtn = document.getElementById('tweet-btn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme Switch from LocalStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        themeCheckbox.checked = true;
        document.body.classList.add('light-theme');
    } else {
        themeCheckbox.checked = false;
        document.body.classList.remove('light-theme');
    }

    fetchReleaseNotes();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Refresh feed
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().strip();
        renderFeed();
    });
    
    // Helper to strip whitespace
    String.prototype.strip = function() {
        return this.replace(/^\s+|\s+$/g, '');
    };
    
    // Category filters
    filterTags.forEach(tag => {
        tag.addEventListener('click', (e) => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilter = tag.dataset.type;
            renderFeed();
        });
    });
    
    // Tweet textarea live counter
    tweetTextarea.addEventListener('input', () => {
        updateCharCounter();
    });
    
    // Copy Tweet
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    
    // Share on Twitter
    tweetBtn.addEventListener('click', shareOnTwitter);

    // Export to CSV
    exportCsvBtn.addEventListener('click', exportToCSV);

    // Theme Switch Change Listener
    themeCheckbox.addEventListener('change', () => {
        if (themeCheckbox.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            showToast('Swapped to Light Theme');
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            showToast('Swapped to Dark Theme');
        }
    });
}

// Fetch data from Flask API
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading(true);
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API response was not ok');
        
        const result = await response.json();
        
        if (result.status === 'success') {
            releaseNotes = result.data;
            renderFeed();
            showToast(forceRefresh ? 'Feed refreshed successfully!' : 'Release notes loaded.');
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Show/hide states
function showLoading(isLoading) {
    if (isLoading) {
        loadingState.classList.remove('hidden');
        feedContainer.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        
        // Spin header button
        btnSpinner.classList.remove('hidden');
        btnIcon.classList.add('hidden');
        refreshBtn.disabled = true;
    } else {
        loadingState.classList.add('hidden');
        // If there's an error, feedContainer stays hidden
        if (errorState.classList.contains('hidden')) {
            feedContainer.classList.remove('hidden');
        }
        
        // Restore header button
        btnSpinner.classList.add('hidden');
        btnIcon.classList.remove('hidden');
        refreshBtn.disabled = false;
    }
}

function showError(message) {
    errorState.classList.remove('hidden');
    feedContainer.classList.add('hidden');
    document.getElementById('error-message').textContent = `Error: ${message}`;
}

// Helper to calculate X/Twitter character count correctly (any URL counts as exactly 23 characters)
function getTwitterCharCount(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    let length = text.length;
    const matches = text.match(urlRegex);
    if (matches) {
        matches.forEach(url => {
            length = length - url.length + 23;
        });
    }
    return length;
}

// Render feed list
function renderFeed() {
    feedContainer.innerHTML = '';
    let hasItems = false;
    
    releaseNotes.forEach(group => {
        // Filter items in the group
        const filteredItems = group.items.filter(item => {
            const matchesFilter = currentFilter === 'all' || item.type === currentFilter;
            const matchesSearch = currentSearch === '' || 
                                  item.text.toLowerCase().includes(currentSearch) ||
                                  item.type.toLowerCase().includes(currentSearch) ||
                                  group.date.toLowerCase().includes(currentSearch);
            return matchesFilter && matchesSearch;
        });
        
        if (filteredItems.length > 0) {
            hasItems = true;
            
            // Create group container
            const groupDiv = document.createElement('div');
            groupDiv.className = 'release-group';
            
            // Header for date
            const dateHeader = document.createElement('div');
            dateHeader.className = 'release-date-header';
            dateHeader.innerHTML = `
                <h2>${group.date}</h2>
                <div class="release-date-line"></div>
            `;
            groupDiv.appendChild(dateHeader);
            
            // Add items
            filteredItems.forEach(item => {
                const itemCard = document.createElement('div');
                itemCard.className = `release-item ${selectedItem && selectedItem.id === item.id ? 'selected' : ''}`;
                itemCard.dataset.id = item.id;
                itemCard.dataset.type = item.type;
                
                itemCard.innerHTML = `
                    <div class="release-item-header">
                        <span class="type-badge">${item.type}</span>
                        <div class="item-header-actions">
                            <button class="copy-note-btn" title="Copy raw text of this update">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </button>
                            <button class="select-note-btn">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span>${selectedItem && selectedItem.id === item.id ? 'Selected' : 'Select'}</span>
                            </button>
                        </div>
                    </div>
                    <div class="release-item-body">
                        ${item.html}
                    </div>
                `;
                
                // Copy note raw text handler
                const copyBtn = itemCard.querySelector('.copy-note-btn');
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(item.text).then(() => {
                        showToast('Copied raw note to clipboard!');
                    }).catch(err => {
                        console.error('Copy failed: ', err);
                        showToast('Copy failed!', 'error');
                    });
                });
                
                // Add click handler
                itemCard.addEventListener('click', (e) => {
                    // Prevent select action if clicking links inside the body
                    if (e.target.tagName === 'A' || e.target.closest('a')) {
                        return;
                    }
                    selectReleaseItem(item, group.date, group.link);
                });
                
                groupDiv.appendChild(itemCard);
            });
            
            feedContainer.appendChild(groupDiv);
        }
    });
    
    // Toggle empty state
    if (hasItems) {
        emptyState.classList.add('hidden');
    } else {
        emptyState.classList.remove('hidden');
    }
}

// Select a release note and load it into composer
function selectReleaseItem(item, dateStr, officialLink) {
    selectedItem = item;
    
    // Highlight in the UI
    document.querySelectorAll('.release-item').forEach(card => {
        if (card.dataset.id === item.id) {
            card.classList.add('selected');
            card.querySelector('.select-note-btn span').textContent = 'Selected';
        } else {
            card.classList.remove('selected');
            const selectBtn = card.querySelector('.select-note-btn span');
            if (selectBtn) selectBtn.textContent = 'Select';
        }
    });
    
    // Open workspace
    composerHint.classList.add('hidden');
    composerWorkspace.classList.remove('hidden');
    composerStatus.classList.add('active');
    composerStatus.textContent = 'Drafting';
    
    // Preview selected
    selectedNotePreview.textContent = `[${item.type}] ${item.text}`;
    
    // Auto-generate draft
    const prefix = `📢 BigQuery ${item.type} (${dateStr}):\n\n`;
    const suffix = `\n\nDetails: ${officialLink}`;
    
    // Twitter handles links dynamically, counting them as 23 characters.
    // Calculate space for preview text:
    const availableLength = 280 - prefix.length - 23 - suffix.substring(suffix.indexOf('\n\nDetails:') + 10).length;
    let snippet = item.text;
    
    if (snippet.length > availableLength) {
        snippet = snippet.substring(0, availableLength - 3).strip() + '...';
    }
    
    tweetTextarea.value = `${prefix}${snippet}${suffix}`;
    tweetTextarea.focus();
    
    // Adjust height
    tweetTextarea.style.height = 'auto';
    tweetTextarea.style.height = tweetTextarea.scrollHeight + 'px';
    
    updateCharCounter();
}

// Update live character count and warnings
function updateCharCounter() {
    const text = tweetTextarea.value;
    const count = getTwitterCharCount(text);
    
    charCountSpan.textContent = count;
    
    // Formatting/coloring warnings
    charCounter.className = 'char-counter';
    if (count > 280) {
        charCounter.classList.add('danger');
        tweetBtn.disabled = true;
    } else if (count > 250) {
        charCounter.classList.add('warning');
        tweetBtn.disabled = false;
    } else {
        tweetBtn.disabled = false;
    }
}

// Copy drafted tweet to clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied draft to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Fallback
        tweetTextarea.select();
        document.execCommand('copy');
        showToast('Copied draft to clipboard!');
    }
}

// Open X/Twitter intent to post
function shareOnTwitter() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    const count = getTwitterCharCount(text);
    if (count > 280) {
        showToast('Draft exceeds X/Twitter character limit!', 'error');
        return;
    }
    
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

// Show toast notifications
let toastTimeout;
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toast.style.borderColor = 'var(--color-deprecated)';
        toast.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.35)';
    } else {
        toast.style.borderColor = 'var(--color-primary)';
        toast.style.boxShadow = 'var(--shadow-lg), var(--shadow-glow)';
    }
    
    toast.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export currently filtered/searched release notes to CSV
function exportToCSV() {
    const csvRows = [];
    // CSV headers
    csvRows.push(['Date', 'Type', 'Content Text']);

    let hasData = false;
    releaseNotes.forEach(group => {
        const filteredItems = group.items.filter(item => {
            const matchesFilter = currentFilter === 'all' || item.type === currentFilter;
            const matchesSearch = currentSearch === '' || 
                                  item.text.toLowerCase().includes(currentSearch) ||
                                  item.type.toLowerCase().includes(currentSearch) ||
                                  group.date.toLowerCase().includes(currentSearch);
            return matchesFilter && matchesSearch;
        });

        filteredItems.forEach(item => {
            hasData = true;
            // Escape double quotes by doubling them
            const escapedText = item.text.replace(/"/g, '""');
            csvRows.push([`"${group.date}"`, `"${item.type}"`, `"${escapedText}"`]);
        });
    });

    if (!hasData) {
        showToast('No data to export!', 'error');
        return;
    }

    // Join rows with newlines
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${currentFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exported CSV successfully!');
}
