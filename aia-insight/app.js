function toggleInsight(header) {
    const row = header.closest('.insight-row');
    const detail = row.querySelector('.insight-detail');
    const isExpanded = row.classList.contains('expanded');

    document.querySelectorAll('.insight-row.expanded').forEach(expandedRow => {
        if (expandedRow !== row) {
            expandedRow.classList.remove('expanded');
            expandedRow.querySelector('.insight-detail').style.display = 'none';
        }
    });

    if (isExpanded) {
        row.classList.remove('expanded');
        detail.style.display = 'none';
    } else {
        row.classList.add('expanded');
        detail.style.display = 'block';
    }
}

function showMoreInsights() {
    const btn = document.getElementById('showMoreBtn');
    btn.textContent = 'All insights visible';
    btn.classList.add('hidden');
    document.querySelectorAll('.insight-row').forEach(row => {
        row.style.display = 'block';
    });
}

function submitFeedback(btn, isHelpful) {
    const row = btn.closest('.insight-row');
    const feedbackControls = row.querySelector('.feedback-controls');
    const reasonSelect = feedbackControls.querySelector('.reason-select');

    row.querySelectorAll('.feedback-btn').forEach(b => {
        b.classList.remove('active', 'helpful', 'not-helpful');
    });

    btn.classList.add('active');
    btn.classList.add(isHelpful ? 'helpful' : 'not-helpful');

    if (!isHelpful) {
        reasonSelect.style.display = 'flex';
        reasonSelect.style.alignItems = 'center';
        reasonSelect.style.gap = '10px';
    }

    row.querySelectorAll('.feedback-btn').forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.6';
    });
}

function submitReason(select) {
    const row = select.closest('.insight-row');
    const reason = select.value;
    console.log('Feedback reason:', reason);
    select.disabled = true;
    select.style.opacity = '0.6';
}

function createInsightHTML(insight, index) {
    const isHidden = index >= 3 ? 'style="display: none;"' : '';
    const severityCapitalized = insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1);
    return `
        <div class="insight-row" data-severity="${insight.severity}" ${isHidden}>
            <div class="insight-header" onclick="toggleInsight(this)">
                <span class="source-badge">${insight.source}</span>
                <div class="insight-content">
                    <h3 class="insight-title">${insight.title}</h3>
                    <p class="insight-summary">${insight.summary}</p>
                </div>
                <div class="insight-right">
                    <span class="expand-icon">+</span>
                </div>
            </div>
            <div class="insight-detail" style="display: none;">
                <div class="detail-section">
                    <h4>What we found</h4>
                    <p>${insight.whatWeFound}</p>
                </div>
                <div class="detail-section">
                    <h4>Why it matters</h4>
                    <p>${insight.whyItMatters}</p>
                </div>
                <div class="detail-section">
                    <h4>Suggested review</h4>
                    <p>${insight.suggestedReview}</p>
                </div>
                <div class="detail-section based-on">
                    <h4>Based on</h4>
                    <p>${insight.basedOn}</p>
                </div>
                <div class="feedback-controls">
                    <button class="feedback-btn helpful" onclick="submitFeedback(this, true)">👍 Helpful</button>
                    <button class="feedback-btn" onclick="submitFeedback(this, false)">👎 Not helpful</button>
                    <select class="reason-select" style="display: none;" onchange="submitReason(this)">
                        <option value="">Select a reason...</option>
                        <option value="too_generic">Too generic</option>
                        <option value="not_accurate">Not accurate</option>
                        <option value="already_knew">Already knew this</option>
                        <option value="hard_to_understand">Hard to understand</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

async function loadInsights() {
    try {
        console.log('Starting to load insights...');
        const basePath = getBasePath();
        const fetchUrl = basePath + 'api/insights?t=' + new Date().getTime();
        console.log('Fetching from:', fetchUrl);

        const response = await fetch(fetchUrl);
        console.log('Response status:', response.status);

        const data = await response.json();
        const insights = data.insights || [];
        const feedState = data.state || 'ready';
        const stateMessage = data.stateMessage || '';
        console.log('Feed state:', feedState);
        console.log('Received insights:', insights.length);

        const feedContainer = document.getElementById('insightsFeed');
        const showMoreContainer = document.getElementById('showMoreWrap');
        const btn = document.getElementById('showMoreBtn');

        // Handle feed states
        if (feedState === 'stale') {
            feedContainer.innerHTML = '<div class="feed-state stale-state"><div class="state-icon">⏸</div><div class="state-title">Insights Paused</div><div class="state-message">' + (stateMessage || 'Dashboard data is not fully up to date yet. Please upload fresh data.') + '</div></div>';
            showMoreContainer.style.display = 'none';
            return;
        }

        if (feedState === 'insufficient_history') {
            feedContainer.innerHTML = '<div class="feed-state history-state"><div class="state-icon">📊</div><div class="state-title">Not Enough Data Yet</div><div class="state-message">' + (stateMessage || 'Insights will appear once enough historical data is available for comparison.') + '</div></div>';
            showMoreContainer.style.display = 'none';
            return;
        }

        if (!insights || insights.length === 0) {
            feedContainer.innerHTML = '<div class="feed-state empty-state"><div class="state-icon">✓</div><div class="state-title">All Clear</div><div class="state-message">' + (stateMessage || 'No major financial changes detected from current dashboard data.') + '</div></div>';
            showMoreContainer.style.display = 'none';
            return;
        }

        // Apply partial period label if applicable
        if (feedState === 'partial_period' && stateMessage) {
            const partialBadge = document.createElement('div');
            partialBadge.className = 'partial-badge';
            partialBadge.textContent = stateMessage;
            feedContainer.parentNode.insertBefore(partialBadge, feedContainer);
        }

        // Generate HTML for all insights
        const html = insights.map((insight, index) => createInsightHTML(insight, index)).join('');
        feedContainer.innerHTML = html;

        // Handle show more button
        if (insights.length > 3) {
            showMoreContainer.style.display = 'flex';
            btn.textContent = 'Show ' + (insights.length - 3) + ' more insights';
            btn.classList.remove('hidden');
        } else {
            showMoreContainer.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading insights:', error);
        console.error('Error message:', error.message);
        document.getElementById('insightsFeed').innerHTML = '<div class="feed-state error-state"><div class="state-icon">!</div><div class="state-title">Unable to Load Insights</div><div class="state-message">' + error.message + '</div><button onclick="loadInsights()" class="retry-btn">Try Again</button></div>';
    }
}

// API endpoint for generating insights via Gemini
const INSIGHTS_API_URL = 'api/generate-insights';

// Helper function to get base path
function getBasePath() {
    return window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
}

// File Upload Handling
function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadDropzone = document.getElementById('uploadDropzone');
    const uploadStatus = document.getElementById('uploadStatus');
    const progressFill = document.getElementById('progressFill');
    
    if (!fileInput || !uploadDropzone) return;
    
    // Handle file selection from input
    fileInput.addEventListener('change', handleFileSelect);
    
    // Handle drag and drop on dropzone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadDropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    uploadDropzone.addEventListener('dragenter', () => {
        uploadDropzone.classList.add('dragover');
    });
    
    uploadDropzone.addEventListener('dragover', () => {
        uploadDropzone.classList.add('dragover');
    });
    
    uploadDropzone.addEventListener('dragleave', () => {
        uploadDropzone.classList.remove('dragover');
    });
    
    uploadDropzone.addEventListener('drop', (e) => {
        uploadDropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    });
    
    // Allow clicking on dropzone to open file picker
    uploadDropzone.addEventListener('click', () => {
        fileInput.click();
    });
    
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    }
    
    function processFile(file) {
        // Validate file type
        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
            showStatus('Error: Please upload a JSON file', 'error');
            return;
        }
        
        showStatus('Reading file...', 'loading');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                showStatus('Generating insights with Gemini AI...', 'loading');
                sendToGemini(jsonData);
            } catch (error) {
                showStatus('Error: Invalid JSON file', 'error');
                console.error('JSON parse error:', error);
            }
        };
        
        reader.onerror = function() {
            showStatus('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    }
    
    async function sendToGemini(data) {
        try {
            updateProgress(20);
            showStatus('Sending data to Gemini AI...', 'loading');

            // Send to our Gemini endpoint
            const response = await fetch(getBasePath() + INSIGHTS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            updateProgress(60);
            showStatus('AI is analyzing your financial data...', 'loading');

            if (response.ok) {
                const result = await response.json();
                updateProgress(90);

                if (result.success) {
                    showStatus('Insights ready!', 'success');
                    updateProgress(100);

                    // Reload the insights display
                    await loadInsights();

                    // Update timestamp
                    document.getElementById('lastUpdated').textContent = 'Updated just now';

                    // Hide status after 3 seconds
                    setTimeout(() => {
                        hideStatus();
                    }, 3000);
                } else {
                    showStatus('AI error: ' + (result.error || 'Unknown error'), 'error');
                }
            } else {
                showStatus('Server error: ' + response.status, 'error');
            }
        } catch (error) {
            console.error('Error generating insights:', error);
            showStatus('Error: ' + error.message, 'error');
        }
    }
    
    function showStatus(message, type) {
        uploadStatus.style.display = 'block';
        uploadStatus.style.opacity = '1';
        const statusMessage = uploadStatus.querySelector('.status-message');
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
        
        if (type === 'error') {
            progressFill.style.width = '0%';
        }
    }
    
    function updateProgress(percent) {
        progressFill.style.width = percent + '%';
    }
    
    function hideStatus() {
        uploadStatus.style.opacity = '0';
        uploadStatus.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            uploadStatus.style.display = 'none';
            progressFill.style.width = '0%';
        }, 500);
        fileInput.value = ''; // Reset file input
    }
}

// Load insights on page load
document.addEventListener('DOMContentLoaded', () => {
    loadInsights();
    initFileUpload();
});
