<?php
// Script to inject new SEO functionality into app.js

// Configuration
$appJsPath = 'js/app.js';
$backupPath = 'js/app.js.backup.' . date('Ymd_His');

// Create backup
if (file_exists($appJsPath)) {
    echo "Creating backup at $backupPath...\n";
    if (copy($appJsPath, $backupPath)) {
        echo "Backup created successfully.\n";
    } else {
        echo "Failed to create backup. Aborting.\n";
        exit(1);
    }
} else {
    echo "app.js not found at $appJsPath. Aborting.\n";
    exit(1);
}

// Read the original file
$appJs = file_get_contents($appJsPath);

// Prepare code blocks to inject

// 1. Updated showPage function to handle SEO page tabs
$showPageCode = <<<'EOD'
// Show a specific page
showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show the requested page
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navLink = document.getElementById(`nav-${pageId}`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Special handling for specific pages
    if (pageId === 'profile') {
        this.setupProfilePage();
        this.loadUserAvatar();
    } else if (pageId === 'seo') {
        this.showSeoPage();
    }
},
EOD;

// 2. Functions to handle SEO page with tabs
$seoFunctionsCode = <<<'EOD'
// Show SEO page with tabbed interface
showSeoPage() {
    // Check user and show appropriate SEO content
    if (!this.isAdmin) {
        // Show SEO login for non-admins
        document.getElementById('seo-login').classList.remove('hidden');
        document.getElementById('seo-content').classList.add('hidden');
        document.getElementById('seo-articles').classList.add('hidden');
        document.getElementById('seo-federation').classList.add('hidden');
        return;
    }
    
    // Admin user - show SEO content without requiring password
    document.getElementById('seo-login').classList.add('hidden');
    document.getElementById('seo-content').classList.remove('hidden');
    
    // Initialize tab functionality
    this.initSeoTabFunctionality();
    
    // Load SEO settings
    this.loadSeoSettings();
    
    // Load article list
    const articleList = document.getElementById('article-list');
    if (articleList) {
        this.loadArticleList();
    }
    
    // Load federation status if tab exists
    const federationSection = document.getElementById('seo-federation');
    if (federationSection) {
        this.loadFederationStatus();
    }
},

// Initialize tab functionality for SEO page
initSeoTabFunctionality() {
    const seoTabLinks = document.querySelectorAll('.seo-tab-link');
    
    seoTabLinks.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get target tab
            const targetTabId = tab.getAttribute('data-tab');
            
            // Hide all tab contents
            document.querySelectorAll('.seo-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            // Show target tab content
            document.getElementById(targetTabId).classList.remove('hidden');
            
            // Update active tab
            seoTabLinks.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // If articles tab, load article list
            if (targetTabId === 'seo-articles') {
                this.loadArticleList();
            }
            
            // If federation tab, load federation status
            if (targetTabId === 'seo-federation') {
                this.loadFederationStatus();
            }
        });
    });
},

// Load article list for admin management
async loadArticleList() {
    const articleList = document.getElementById('article-list');
    if (!articleList) return;
    
    // Set loading state
    articleList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading articles...</div>';
    
    // Get user token
    const token = localStorage.getItem('auth_token');
    if (!token) {
        articleList.innerHTML = '<div class="error-message">Authentication required</div>';
        return;
    }
    
    try {
        // Fetch articles
        const response = await API.getArticles(token);
        
        if (response.success && Array.isArray(response.articles)) {
            this.renderArticleList(response.articles, articleList);
        } else {
            articleList.innerHTML = '<div class="error-message">Failed to load articles: ' + (response.error || 'Unknown error') + '</div>';
        }
    } catch (error) {
        console.error('Error loading articles:', error);
        articleList.innerHTML = '<div class="error-message">Failed to load articles. Please try again.</div>';
    }
},

// Render the article list in the admin panel
renderArticleList(articles, container) {
    if (articles.length === 0) {
        container.innerHTML = '<div class="empty-message">No articles found. Create your first article!</div>';
        return;
    }
    
    // Create article list
    const articleTable = document.createElement('table');
    articleTable.className = 'articles-table';
    
    // Create table header
    const tableHead = document.createElement('thead');
    tableHead.innerHTML = `
        <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
        </tr>
    `;
    articleTable.appendChild(tableHead);
    
    // Create table body
    const tableBody = document.createElement('tbody');
    
    // Add articles to table
    articles.forEach(article => {
        const row = document.createElement('tr');
        
        // Format date
        const created = new Date(article.created);
        const formattedDate = this.formatDate(article.created);
        
        // Set row class based on status
        if (article.status === 'draft') {
            row.classList.add('article-draft');
        }
        
        row.innerHTML = `
            <td class="article-title-cell">${this.escapeHtml(article.title)}</td>
            <td class="article-status-cell">
                <span class="status-badge status-${article.status || 'published'}">${article.status || 'published'}</span>
            </td>
            <td class="article-date-cell">${formattedDate}</td>
            <td class="article-actions-cell">
                <button class="btn btn-sm btn-secondary edit-article-btn" data-id="${article.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-primary view-article-btn" data-id="${article.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    articleTable.appendChild(tableBody);
    container.innerHTML = '';
    container.appendChild(articleTable);
    
    // Add event listeners to buttons
    container.querySelectorAll('.edit-article-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const articleId = btn.getAttribute('data-id');
            this.editArticle(articleId);
        });
    });
    
    container.querySelectorAll('.view-article-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const articleId = btn.getAttribute('data-id');
            window.open(`?article=${articleId}`, '_blank');
        });
    });
    
    // Add event listener to new article button
    const newArticleBtn = document.getElementById('new-article-btn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => {
            this.showArticleEditor();
        });
    }
},

// Show article editor (new or edit)
async showArticleEditor(articleId = null) {
    const editorContainer = document.getElementById('article-editor');
    const editorTitle = document.getElementById('editor-title');
    const saveBtn = document.getElementById('save-article-btn');
    const deleteBtn = document.getElementById('delete-article-btn');
    
    if (!editorContainer) return;
    
    // Clear form
    document.getElementById('article-title').value = '';
    document.getElementById('article-summary').value = '';
    document.getElementById('article-content').value = '';
    document.getElementById('article-status').value = 'published';
    document.getElementById('article-id').value = '';
    
    // Update header and buttons
    if (articleId) {
        editorTitle.textContent = 'Edit Article';
        deleteBtn.classList.remove('hidden');
    } else {
        editorTitle.textContent = 'Create New Article';
        deleteBtn.classList.add('hidden');
    }
    
    // Show editor
    editorContainer.classList.remove('hidden');
    
    // If editing, load article data
    if (articleId) {
        try {
            const token = localStorage.getItem('auth_token');
            
            // Show loading state
            document.getElementById('article-content').value = 'Loading article content...';
            
            const response = await API.getArticle(articleId, token);
            
            if (response.success && response.article) {
                const article = response.article;
                
                // Populate form
                document.getElementById('article-title').value = article.title || '';
                document.getElementById('article-summary').value = article.summary || '';
                document.getElementById('article-content').value = article.content || '';
                document.getElementById('article-status').value = article.status || 'published';
                document.getElementById('article-id').value = articleId;
            } else {
                this.showToast('error', 'Failed to load article: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading article:', error);
            this.showToast('error', 'Error loading article: ' + error.message);
        }
    }
    
    // Set up event listeners for buttons
    const closeBtn = document.getElementById('close-editor-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            editorContainer.classList.add('hidden');
        };
    }
    
    if (saveBtn) {
        saveBtn.onclick = () => {
            this.saveArticle();
        };
    }
    
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            this.deleteArticle(articleId);
        };
    }
},

// Save article (create or update)
async saveArticle() {
    const title = document.getElementById('article-title').value;
    const summary = document.getElementById('article-summary').value;
    const content = document.getElementById('article-content').value;
    const status = document.getElementById('article-status').value;
    const articleId = document.getElementById('article-id').value;
    
    // Validate required fields
    if (!title || !summary || !content) {
        this.showToast('error', 'Please fill in all required fields');
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('save-article-btn');
    const originalSaveBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const token = localStorage.getItem('auth_token');
        
        const articleData = {
            title,
            summary,
            content,
            status,
            token
        };
        
        // Add article ID if editing
        if (articleId) {
            articleData.id = articleId;
        }
        
        // Save article
        const response = await API.saveArticle(articleData);
        
        if (response.success) {
            // Hide editor and reload article list
            document.getElementById('article-editor').classList.add('hidden');
            this.loadArticleList();
            
            this.showToast('success', articleId ? 'Article updated successfully' : 'Article created successfully');
        } else {
            this.showToast('error', 'Failed to save article: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving article:', error);
        this.showToast('error', 'Error saving article: ' + error.message);
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalSaveBtnText;
        saveBtn.disabled = false;
    }
},

// Delete article
async deleteArticle(articleId) {
    if (!articleId) {
        articleId = document.getElementById('article-id').value;
    }
    
    if (!articleId) {
        this.showToast('error', 'No article ID provided for deletion');
        return;
    }
    
    // Show confirmation modal
    this.showModal(
        'Delete Article',
        'Are you sure you want to delete this article? This action cannot be undone.',
        'Delete',
        'Cancel',
        async () => {
            try {
                const token = localStorage.getItem('auth_token');
                
                // Delete article
                const response = await API.deleteArticle(articleId, token);
                
                if (response.success) {
                    // Hide editor and reload article list
                    document.getElementById('article-editor').classList.add('hidden');
                    this.loadArticleList();
                    
                    this.showToast('success', 'Article deleted successfully');
                } else {
                    this.showToast('error', 'Failed to delete article: ' + (response.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error deleting article:', error);
                this.showToast('error', 'Error deleting article: ' + error.message);
            }
        }
    );
},

// Edit existing article
editArticle(articleId) {
    if (!articleId) {
        this.showToast('error', 'No article ID provided');
        return;
    }
    
    this.showArticleEditor(articleId);
},

// Load federation status
async loadFederationStatus() {
    const serverIdDisplay = document.getElementById('federation-server-id');
    const connectedServersCount = document.getElementById('connected-servers');
    const sharedFilesCount = document.getElementById('shared-files');
    const pendingFilesCount = document.getElementById('pending-files');
    
    if (!serverIdDisplay || !connectedServersCount || !sharedFilesCount || !pendingFilesCount) return;
    
    // Get user token
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    
    try {
        // Fetch federation status
        const response = await API.getFederationStatus(token);
        
        if (response.success && response.federation) {
            const federation = response.federation;
            
            // Update display
            serverIdDisplay.textContent = federation.server_id || 'Not configured';
            connectedServersCount.textContent = federation.connections || 0;
            
            // Update file counts if available
            if (federation.file_stats) {
                sharedFilesCount.textContent = federation.file_stats.shared || 0;
                pendingFilesCount.textContent = federation.file_stats.pending || 0;
            }
            
            // Load servers list
            if (typeof this.loadServersList === 'function' && Array.isArray(federation.servers)) {
                this.loadServersList(federation.servers);
            }
            
            // Load files lists
            if (typeof this.loadFilesList === 'function') {
                this.loadFilesList('outgoing');
                this.loadFilesList('incoming');
                this.loadFilesList('imported');
            }
        }
    } catch (error) {
        console.error('Error loading federation status:', error);
        this.showToast('error', 'Failed to load federation status');
    }
    
    // Add copy button functionality
    const copyButton = document.getElementById('copy-server-id');
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            const serverId = serverIdDisplay.textContent;
            navigator.clipboard.writeText(serverId)
                .then(() => this.showToast('success', 'Server ID copied to clipboard!'))
                .catch(err => this.showToast('error', 'Failed to copy server ID'));
        });
    }
},
EOD;

// 3. Add API methods to the API object
$apiFunctionsCode = <<<'EOD'
// Add these API methods to app.js or include in api.js

// Get articles list
async getArticles(token) {
    return await this.callApi('article-api.php', 'get_articles', { token });
},

// Get single article
async getArticle(id, token) {
    return await this.callApi('article-api.php', 'get_article', { id, token });
},

// Save article
async saveArticle(data) {
    return await this.callApi('article-api.php', 'save_article', data);
},

// Delete article
async deleteArticle(id, token) {
    return await this.callApi('article-api.php', 'delete_article', { id, token });
},

// Get federation status
async getFederationStatus(token) {
    return await this.callApi('api.php', 'federation_status', { token });
},
EOD;

// Find appropriate insertion points

// 1. Replace showPage function
$pattern = '/showPage\s*\(\s*pageId\s*\)\s*\{.*?(?=\},\s*\/\/\s*View)/s';
if (preg_match($pattern, $appJs)) {
    $appJs = preg_replace($pattern, $showPageCode, $appJs);
    echo "Replaced showPage function.\n";
} else {
    echo "Warning: Couldn't find showPage function. Skipping this replacement.\n";
}

// 2. Add SEO functions before saveSeoSettings
$pattern = '/async\s+saveSeoSettings\(\)\s*\{/';
if (preg_match($pattern, $appJs, $matches, PREG_OFFSET_CAPTURE)) {
    $position = $matches[0][1];
    $appJs = substr_replace($appJs, $seoFunctionsCode . "\n", $position, 0);
    echo "Added SEO functions before saveSeoSettings.\n";
} else {
    echo "Warning: Couldn't find saveSeoSettings function. Adding SEO functions at the end of App object.\n";
    $pattern = '/escapeHtml\(unsafe\)\s*\{\s*.*?\s*\}\s*\};/s';
    if (preg_match($pattern, $appJs, $matches, PREG_OFFSET_CAPTURE)) {
        $position = $matches[0][1] + strlen($matches[0][0]);
        $appJs = substr_replace($appJs, "\n" . $seoFunctionsCode, $position - 2, 0);
    } else {
        echo "Error: Couldn't find end of App object. Skipping SEO functions.\n";
    }
}

// 3. Add API functions for articles and federation
$pattern = '/const\s+API\s*=\s*\{/';
if (preg_match($pattern, $appJs, $matches, PREG_OFFSET_CAPTURE)) {
    $position = $matches[0][1] + strlen($matches[0][0]);
    $appJs = substr_replace($appJs, "\n" . $apiFunctionsCode, $position, 0);
    echo "Added API functions for articles and federation.\n";
} else {
    echo "Warning: Couldn't find API object. Skipping API functions.\n";
    // Create a separate file for API functions
    file_put_contents('js/api-extensions.js', "// API Extensions\n" . $apiFunctionsCode);
    echo "Created separate file 'js/api-extensions.js' with API functions.\n";
}

// Write the modified file
if (file_put_contents($appJsPath, $appJs)) {
    echo "Successfully updated app.js with new features.\n";
    echo "If you encounter any issues, you can restore from the backup at $backupPath\n";
} else {
    echo "Error: Failed to write modified app.js file.\n";
}

echo "Complete! Please check app.js to make sure the changes are correct.\n";
?>