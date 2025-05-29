/**
 * Article Management JavaScript
 * Handles both admin article management and front page display
 */

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize articles on the front page
    initFrontPageArticles();
    
    // Initialize article management in SEO section
    initArticleManagement();
});

/**
 * Initialize front page articles
 */
function initFrontPageArticles() {
    const articlesContainer = document.getElementById('front-articles');
    if (!articlesContainer) return;
    
    // Fetch front page articles
    fetch('article-api.php?action=get_front_articles')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.articles) {
                displayFrontPageArticles(data.articles);
            } else {
                throw new Error(data.error || 'Failed to load articles');
            }
        })
        .catch(error => {
            console.error('Error loading front page articles:', error);
            articlesContainer.innerHTML = `
                <div class="error-message">
                    <p>No articles available at this time.</p>
                </div>
            `;
        });
}

/**
 * Display articles on the front page
 */
function displayFrontPageArticles(articles) {
    const articlesContainer = document.getElementById('front-articles');
    if (!articlesContainer) return;
    
    // If no articles, show message
    if (articles.length === 0) {
        articlesContainer.innerHTML = `
            <div class="empty-message">
                <p>No articles published yet. Check back soon!</p>
            </div>
        `;
        return;
    }
    
    // Clear container
    articlesContainer.innerHTML = '';
    
    // Add each article
    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        
        // Calculate article icon based on title
        const iconClass = getArticleIcon(article.title);
        
        // Format date
        const formattedDate = formatDate(article.created);
        
        card.innerHTML = `
            <div class="article-card-image">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="article-card-content">
                <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
                <p class="article-card-summary">${escapeHtml(article.summary)}</p>
                <div class="article-card-footer">
                    <span>${formattedDate}</span>
                    <a href="#" class="read-more-btn" data-id="${article.id}">Read More</a>
                </div>
            </div>
        `;
        
        // Add event listener for "Read More" button
        const readMoreBtn = card.querySelector('.read-more-btn');
        readMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            viewArticle(article.id);
        });
        
        articlesContainer.appendChild(card);
    });
}

/**
 * Initialize article management in SEO section
 */
function initArticleManagement() {
    // Get elements
    const articleList = document.getElementById('article-list');
    const newArticleBtn = document.getElementById('new-article-btn');
    const closeEditorBtn = document.getElementById('close-editor-btn');
    const saveArticleBtn = document.getElementById('save-article-btn');
    const deleteArticleBtn = document.getElementById('delete-article-btn');
    const articleEditor = document.getElementById('article-editor');
    
    // Exit if not on SEO page or elements missing
    if (!articleList || !App || !App.isAdmin) return;
    
    // Add SEO tab for articles if it doesn't exist
    createArticlesTab();
    
    // Add event listeners
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => {
            openArticleEditor();
        });
    }
    
    if (closeEditorBtn) {
        closeEditorBtn.addEventListener('click', () => {
            closeArticleEditor();
        });
    }
    
    if (saveArticleBtn) {
        saveArticleBtn.addEventListener('click', () => {
            saveArticle();
        });
    }
    
    if (deleteArticleBtn) {
        deleteArticleBtn.addEventListener('click', () => {
            deleteArticle();
        });
    }
    
    // Load articles when SEO section is shown
    const seoNav = document.getElementById('nav-seo');
    if (seoNav) {
        seoNav.addEventListener('click', () => {
            // Small delay to ensure SEO section is shown
            setTimeout(() => {
                // Make articles tab visible after SEO section is loaded
                document.getElementById('seo-articles-tab').classList.remove('hidden');
            }, 100);
        });
    }
    
    // Load articles when articles tab is clicked
    const articlesTab = document.getElementById('seo-articles-tab');
    if (articlesTab) {
        articlesTab.addEventListener('click', () => {
            loadArticles();
        });
    }
}

/**
 * Create the Articles tab in the SEO section
 */
function createArticlesTab() {
    // Check if tab already exists
    if (document.getElementById('seo-articles-tab')) return;
    
    // Check if SEO content exists
    const seoContent = document.getElementById('seo-content');
    if (!seoContent) return;
    
    // Create tabs container if it doesn't exist
    let tabsContainer = document.querySelector('.seo-tabs');
    
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'seo-tabs';
        seoContent.parentNode.insertBefore(tabsContainer, seoContent);
    }
    
    // Create basic SEO tab if it doesn't exist
    if (!document.getElementById('seo-basic-tab')) {
        const basicTab = document.createElement('button');
        basicTab.id = 'seo-basic-tab';
        basicTab.className = 'seo-tab active';
        basicTab.textContent = 'Basic SEO';
        tabsContainer.appendChild(basicTab);
        
        // Event listener for basic tab
        basicTab.addEventListener('click', () => {
            document.querySelectorAll('.seo-tab').forEach(tab => tab.classList.remove('active'));
            basicTab.classList.add('active');
            
            document.getElementById('seo-content').classList.remove('hidden');
            document.getElementById('seo-articles').classList.add('hidden');
        });
    }
    
    // Create articles tab
    const articlesTab = document.createElement('button');
    articlesTab.id = 'seo-articles-tab';
    articlesTab.className = 'seo-tab hidden';
    articlesTab.textContent = 'Articles';
    tabsContainer.appendChild(articlesTab);
    
    // Event listener for articles tab
    articlesTab.addEventListener('click', () => {
        document.querySelectorAll('.seo-tab').forEach(tab => tab.classList.remove('active'));
        articlesTab.classList.add('active');
        
        document.getElementById('seo-content').classList.add('hidden');
        document.getElementById('seo-articles').classList.remove('hidden');
    });
    
    // Add styles for tabs
    const style = document.createElement('style');
    style.textContent = `
        .seo-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .seo-tab {
            background-color: var(--card-secondary-bg, #f9f9f9);
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .seo-tab:hover {
            background-color: var(--border-color, #e0e0e0);
        }
        
        .seo-tab.active {
            background-color: var(--primary-color, #2196F3);
            color: white;
        }
        
        [data-theme="dark"] .seo-tab {
            background-color: var(--card-secondary-bg, #282C3E);
        }
        
        [data-theme="dark"] .seo-tab:hover {
            background-color: var(--border-color, #363A4F);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Load all articles for admin management
 */
function loadArticles() {
    const articleList = document.getElementById('article-list');
    if (!articleList) return;
    
    // Show loading spinner
    articleList.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i> Loading articles...
        </div>
    `;
    
    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
        articleList.innerHTML = `
            <div class="error-message">
                <p>Authentication required</p>
            </div>
        `;
        return;
    }
    
    // Fetch articles
    fetch('article-api.php?action=get_articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayArticleList(data.articles);
        } else {
            throw new Error(data.error || 'Failed to load articles');
        }
    })
    .catch(error => {
        console.error('Error loading articles:', error);
        articleList.innerHTML = `
            <div class="error-message">
                <p>Error loading articles: ${error.message}</p>
                <button class="btn btn-primary" id="retry-articles">Retry</button>
            </div>
        `;
        
        // Add retry button listener
        const retryBtn = document.getElementById('retry-articles');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                loadArticles();
            });
        }
    });
}

/**
 * Display the list of articles for management
 */
function displayArticleList(articles) {
    const articleList = document.getElementById('article-list');
    if (!articleList) return;
    
    // If no articles, show message
    if (articles.length === 0) {
        articleList.innerHTML = `
            <div class="empty-message">
                <p>No articles yet. Click "New Article" to create one.</p>
            </div>
        `;
        return;
    }
    
    // Clear and populate the list
    articleList.innerHTML = '';
    
    articles.forEach(article => {
        const item = document.createElement('div');
        item.className = `article-item ${article.status === 'draft' ? 'draft' : ''}`;
        
        // Format date
        const formattedDate = formatDate(article.created);
        
        item.innerHTML = `
            <div class="article-info">
                <div class="article-title">${escapeHtml(article.title)}</div>
                <div class="article-date">
                    ${formattedDate} · ${article.status === 'published' ? 'Published' : 'Draft'}
                </div>
            </div>
            <div class="article-actions">
                <button class="btn btn-secondary btn-sm edit-article" data-id="${article.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;
        
        // Add event listener for edit button
        const editBtn = item.querySelector('.edit-article');
        editBtn.addEventListener('click', () => {
            editArticle(article.id);
        });
        
        articleList.appendChild(item);
    });
}

/**
 * Open article editor for a new article
 */
function openArticleEditor(article = null) {
    const articleEditor = document.getElementById('article-editor');
    const editorTitle = document.getElementById('editor-title');
    const articleTitle = document.getElementById('article-title');
    const articleSummary = document.getElementById('article-summary');
    const articleContent = document.getElementById('article-content');
    const articleStatus = document.getElementById('article-status');
    const articleId = document.getElementById('article-id');
    const deleteArticleBtn = document.getElementById('delete-article-btn');
    
    if (!articleEditor) return;
    
    // Set editor title
    editorTitle.textContent = article ? 'Edit Article' : 'Create New Article';
    
    // Populate fields if editing existing article
    if (article) {
        articleTitle.value = article.title;
        articleSummary.value = article.summary;
        articleContent.value = article.content;
        articleStatus.value = article.status;
        articleId.value = article.id;
        
        // Show delete button
        deleteArticleBtn.classList.remove('hidden');
    } else {
        // Clear fields for new article
        articleTitle.value = '';
        articleSummary.value = '';
        articleContent.value = '';
        articleStatus.value = 'published';
        articleId.value = '';
        
        // Hide delete button
        deleteArticleBtn.classList.add('hidden');
    }
    
    // Show editor
    articleEditor.classList.remove('hidden');
    
    // Focus title field
    articleTitle.focus();
}

/**
 * Close article editor
 */
function closeArticleEditor() {
    const articleEditor = document.getElementById('article-editor');
    if (articleEditor) {
        articleEditor.classList.add('hidden');
    }
}

/**
 * Edit an existing article
 */
function editArticle(articleId) {
    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
        App.showToast('error', 'Authentication required');
        return;
    }
    
    // Fetch article details
    fetch('article-api.php?action=get_article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            id: articleId,
            token: token
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            openArticleEditor(data.article);
        } else {
            throw new Error(data.error || 'Failed to load article');
        }
    })
    .catch(error => {
        console.error('Error loading article for editing:', error);
        App.showToast('error', `Error loading article: ${error.message}`);
    });
}

/**
 * Save an article (create or update)
 */
function saveArticle() {
    // Get form values
    const articleTitle = document.getElementById('article-title').value.trim();
    const articleSummary = document.getElementById('article-summary').value.trim();
    const articleContent = document.getElementById('article-content').value.trim();
    const articleStatus = document.getElementById('article-status').value;
    const articleId = document.getElementById('article-id').value;
    
    // Validate form
    if (!articleTitle || !articleSummary || !articleContent) {
        App.showToast('error', 'Please fill in all required fields');
        return;
    }
    
    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
        App.showToast('error', 'Authentication required');
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('save-article-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    // Prepare article data
    const articleData = {
        id: articleId,
        title: articleTitle,
        summary: articleSummary,
        content: articleContent,
        status: articleStatus,
        token: token
    };
    
    // Save article
    fetch('article-api.php?action=save_article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            App.showToast('success', `Article ${data.isNew ? 'created' : 'updated'} successfully`);
            
            // Close editor
            closeArticleEditor();
            
            // Reload article list
            loadArticles();
            
            // Reload front page articles if this was published
            if (articleStatus === 'published') {
                initFrontPageArticles();
            }
        } else {
            throw new Error(data.error || 'Failed to save article');
        }
    })
    .catch(error => {
        console.error('Error saving article:', error);
        App.showToast('error', `Error saving article: ${error.message}`);
    })
    .finally(() => {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    });
}

/**
 * Delete an article
 */
function deleteArticle() {
    const articleId = document.getElementById('article-id').value;
    if (!articleId) return;
    
    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
        App.showToast('error', 'Authentication required');
        return;
    }
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this article? This cannot be undone.')) {
        return;
    }
    
    // Show loading state
    const deleteBtn = document.getElementById('delete-article-btn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;
    
    // Delete article
    fetch('article-api.php?action=delete_article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: articleId,
            token: token
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            App.showToast('success', 'Article deleted successfully');
            
            // Close editor
            closeArticleEditor();
            
            // Reload article list
            loadArticles();
            
            // Reload front page articles
            initFrontPageArticles();
        } else {
            throw new Error(data.error || 'Failed to delete article');
        }
    })
    .catch(error => {
        console.error('Error deleting article:', error);
        App.showToast('error', `Error deleting article: ${error.message}`);
    })
    .finally(() => {
        // Restore button state
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    });
}

/**
 * View a single article
 */
function viewArticle(articleId) {
    // Create a modal to display the article
    const modalId = 'article-modal';
    let modal = document.getElementById(modalId);
    
    // Create modal if it doesn't exist
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container article-modal-container">
                <div class="modal-header">
                    <h3 id="article-modal-title">Article</h3>
                    <button id="article-modal-close" class="modal-close">&times;</button>
                </div>
                <div id="article-modal-content" class="modal-content article-detail-content">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> Loading article...
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add close button event listener
        document.getElementById('article-modal-close').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Load article content
    fetch('article-api.php?action=get_article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: articleId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayArticleContent(data.article);
        } else {
            throw new Error(data.error || 'Failed to load article');
        }
    })
    .catch(error => {
        console.error('Error loading article:', error);
        document.getElementById('article-modal-content').innerHTML = `
            <div class="error-message">
                <p>Error loading article: ${error.message}</p>
            </div>
        `;
    });
}

/**
 * Display article content in modal
 */
function displayArticleContent(article) {
    const modalTitle = document.getElementById('article-modal-title');
    const modalContent = document.getElementById('article-modal-content');
    
    // Update modal title
    modalTitle.textContent = article.title;
    
    // Format date
    const formattedDate = formatDate(article.created);
    
    // Create article detail HTML
    const articleHtml = `
        <div class="article-detail">
            <div class="article-detail-header">
                <h1 class="article-detail-title">${escapeHtml(article.title)}</h1>
                <div class="article-detail-meta">
                    Published on ${formattedDate}
                </div>
            </div>
            <div class="article-detail-content">
                ${article.content}
            </div>
        </div>
    `;
    
    // Update modal content
    modalContent.innerHTML = articleHtml;
}

/**
 * Get an icon class based on article title
 */
function getArticleIcon(title) {
    // Map of keywords to icons
    const iconMap = {
        'security': 'fa-shield-alt',
        'secure': 'fa-lock',
        'privacy': 'fa-user-shield',
        'update': 'fa-sync',
        'news': 'fa-newspaper',
        'feature': 'fa-star',
        'release': 'fa-rocket',
        'guide': 'fa-book',
        'tutorial': 'fa-graduation-cap',
        'how': 'fa-question-circle',
        'tip': 'fa-lightbulb',
        'announcement': 'fa-bullhorn'
    };
    
    // Check title for keywords
    const titleLower = title.toLowerCase();
    for (const [keyword, icon] of Object.entries(iconMap)) {
        if (titleLower.includes(keyword)) {
            return icon;
        }
    }
    
    // Default icon
    return 'fa-newspaper';
}

/**
 * Format date to readable format
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
