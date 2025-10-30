// API Configuration
// Loaded from config.js (generated during CDK deployment)
let API_URL = 'YOUR_API_URL_HERE';

// Load config if available
if (typeof window.CONFIG !== 'undefined') {
    API_URL = window.CONFIG.API_ENDPOINT;
}

// State
let phrases = [];
let counter = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Setup event listeners
    setupEventListeners();

    // Load initial data
    await loadCounter();
    await loadPhrases();
});

function setupEventListeners() {
    const form = document.getElementById('addPhraseForm');
    const input = document.getElementById('phraseInput');
    const charCount = document.getElementById('charCount');

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addPhrase();
    });

    // Character counter
    input.addEventListener('input', () => {
        charCount.textContent = input.value.length;
    });
}

// API Functions
async function loadCounter() {
    try {
        const response = await fetch(`${API_URL}/counter`);
        const data = await response.json();

        if (data.success) {
            counter = data.data.counter;
            document.getElementById('counter').textContent = counter;
        }
    } catch (error) {
        console.error('Failed to load counter:', error);
    }
}

async function loadPhrases() {
    const phrasesListEl = document.getElementById('phrasesList');

    try {
        const response = await fetch(`${API_URL}/phrases`);
        const data = await response.json();

        if (data.success && data.data.phrases.length > 0) {
            phrases = data.data.phrases;
            renderPhrases();
        } else {
            phrasesListEl.innerHTML = `
				<div class="empty-state">
					<div class="empty-state-icon">📭</div>
					<p>No phrases yet. Add your first phrase above!</p>
				</div>
			`;
        }
    } catch (error) {
        console.error('Failed to load phrases:', error);
        phrasesListEl.innerHTML = `
			<div class="message error show">
				Failed to load phrases. Please check your API URL in app.js
			</div>
		`;
    }
}

async function addPhrase() {
    const input = document.getElementById('phraseInput');
    const phrase = input.value.trim();
    const messageEl = document.getElementById('message');
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!phrase) {
        showMessage('Please enter a phrase', 'error');
        return;
    }

    if (phrase.length > 100) {
        showMessage('Phrase is too long. Maximum 100 characters.', 'error');
        return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
        const response = await fetch(`${API_URL}/phrases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phrase }),
        });

        const data = await response.json();

        if (data.success) {
            showMessage(`✅ Phrase added with ID: ${data.data.id}`, 'success');
            input.value = '';
            document.getElementById('charCount').textContent = '0';

            // Reload data
            await loadCounter();
            await loadPhrases();
        } else {
            showMessage(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Failed to add phrase:', error);
        showMessage('❌ Failed to add phrase. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Phrase';
    }
}

function renderPhrases() {
    const phrasesListEl = document.getElementById('phrasesList');

    // Sort by ID descending (newest first)
    const sortedPhrases = [...phrases].sort((a, b) => b.id - a.id);

    phrasesListEl.innerHTML = sortedPhrases
        .map(
            (phrase) => `
		<div class="phrase-card">
			<div class="phrase-header">
				<span class="phrase-id">#${phrase.id}</span>
				<span class="phrase-date">${formatDate(phrase.createdAt)}</span>
			</div>
			<div class="phrase-text">${escapeHtml(phrase.phrase)}</div>
		</div>
	`,
        )
        .join('');
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type} show`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.className = 'message';
    }, 5000);
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-refresh every 30 seconds
setInterval(async () => {
    await loadCounter();
    await loadPhrases();
}, 30000);

