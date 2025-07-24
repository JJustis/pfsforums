/**
 * Direct SEO Article Integration
 * This simplified version skips the tab system and adds the articles directly to the SEO page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Wait for the page to be fully loaded
    window.addEventListener('load', function() {
        initDirectArticleIntegration();
    });
});

/**
 * Initialize direct article integration with SEO page
 */
function initDirectArticleIntegration() {
    // Try to access the SEO section
    const seoContent = document.getElementById('seo-content');
    const seoPage = document.getElementById('page-seo');
    
    if (!seoPage) {
        console.error('SEO page not found');
        return;
    }
    
    // Find or create the seo-articles section
    let articlesSection = document.getElementById('seo-articles');
    
    // If articles section doesn't exist, create it
    if (!articlesSection) {
        articlesSection = document.createElement('div');
        articlesSection.id = 'seo-articles';
        articlesSection.className = 'seo-section hidden';
        articlesSection.innerHTML = `
            <h3><i class="fas fa-newspaper"></i> Front Page Articles</h3>
            <p>Articles will appear on the front page between the hero and features sections.</p>
            
            <div class="article-list-container">
                <div class="article-list-header">
                    <h4>Published Articles</h4>
                    <button id="new-article-btn" class="btn btn-primary btn-sm">
                        <i class="fas fa-plus"></i> New Article
                    </button>
                </div>
                <div id="article-list" class="article-list">
                    <!-- Articles will be loaded here -->
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> Loading articles...
                    </div>
                </div>
            </div>
            
            <div id="article-editor" class="article-editor hidden">
                <div class="editor-header">
                    <h4 id="editor-title">Create New Article</h4>
                    <button id="close-editor-btn" class="btn btn-secondary btn-sm">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                
                <div class="form-group">
                    <label for="article-title">Title</label>
                    <input type="text" id="article-title" class="form-control" placeholder="Article Title">
                </div>
                
                <div class="form-group">
                    <label for="article-summary">Summary</label>
                    <input type="text" id="article-summary" class="form-control" placeholder="Brief summary (shown on front page)">
                </div>
                
                <div class="form-group">
                    <label for="article-content">Content</label>
                    <textarea id="article-content" class="form-control" rows="10" placeholder="Article content (supports basic HTML)"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="article-status">Status</label>
                    <select id="article-status" class="form-control">
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>
                
                <input type="hidden" id="article-id" value="">
                
                <div class="form-actions">
                    <button id="save-article-btn" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Article
                    </button>
                    <button id="delete-article-btn" class="btn btn-danger hidden">
                        <i class="fas fa-trash"></i> Delete Article
                    </button>
                </div>
            </div>
        `;
        
        // Append the article section to the SEO page
        const container = seoPage.querySelector('.seo-container');
        if (container) {
            container.appendChild(articlesSection);
        } else {
            seoPage.appendChild(articlesSection);
        }
    }
    
    // Create the article management button
    const seoLogin = document.getElementById('seo-login');
    const seoArticlesButton = document.createElement('button');
    seoArticlesButton.id = 'seo-articles-button';
    seoArticlesButton.className = 'btn btn-primary';
    seoArticlesButton.innerHTML = '<i class="fas fa-newspaper"></i> Manage Articles';
    seoArticlesButton.style.marginTop = '15px';
    
    // Add the button after SEO password or directly in the content
    if (seoLogin) {
        // Place button after login section
        seoLogin.appendChild(seoArticlesButton);
    } else if (seoContent) {
        // Place button after SEO content
        seoContent.parentNode.insertBefore(seoArticlesButton, seoContent.nextSibling);
    }
    
    // Handle article button click
    seoArticlesButton.addEventListener('click', function() {
        // First check login status
        if (window.App && window.App.isAdmin) {
            // Show articles section
            if (seoContent) seoContent.classList.add('hidden');
            articlesSection.classList.remove('hidden');
            
            // Load articles
            loadArticles();
        } else {
            // Show login message
            alert('You must be logged in as an administrator to manage articles.');
        }
    });
    
    // Add event listeners for article management
    setupArticleManagementListeners();
}

/**
 * Set up article management event listeners
 */
function setupArticleManagementListeners() {
    // Get elements
    const newArticleBtn = document.getElementById('new-article-btn');
    const closeEditorBtn = document.getElementById('close-editor-btn');
    const saveArticleBtn = document.getElementById('save-article-btn');
    const deleteArticleBtn = document.getElementById('delete-article-btn');
    
    // Add event listeners
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', function() {
            openArticleEditor();
        });
    }
    
    if (closeEditorBtn) {
        closeEditorBtn.addEventListener('click', function() {
            document.getElementById('article-editor').classList.add('hidden');
        });
    }
    
    if (saveArticleBtn) {
        saveArticleBtn.addEventListener('click', function() {
            saveArticle();
        });
    }
    
    if (deleteArticleBtn) {
        deleteArticleBtn.addEventListener('click', function() {
            deleteArticle();
        });
    }
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
    
    // Set editor title
    editorTitle.textContent = article ? 'Edit Article' : 'Create New Article';
    
    // Populate fields if editing existing article
    if (article) {
        articleTitle.value = article.title || '';
        articleSummary.value = article.summary || '';
        articleContent.value = article.content || '';
        articleStatus.value = article.status || 'published';
        articleId.value = article.id || '';
        
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
    if (!articles || articles.length === 0) {
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
        editBtn.addEventListener('click', function() {
            editArticle(article.id);
        });
        
        articleList.appendChild(item);
    });
}

/**
 * Edit an existing article
 */
function editArticle(articleId) {
    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
        alert('Authentication required');
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
        alert(`Error loading article: ${error.message}`);
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
        alert('Please fill in all required fields');
        return;
    }
    
    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
        alert('Authentication required');
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
            alert(`Article ${articleId ? 'updated' : 'created'} successfully`);
            
            // Close editor
            document.getElementById('article-editor').classList.add('hidden');
            
            // Reload article list
            loadArticles();
            
            // Reload front page articles if published
            if (articleStatus === 'published' && typeof initFrontPageArticles === 'function') {
                initFrontPageArticles();
            }
        } else {
            throw new Error(data.error || 'Failed to save article');
        }
    })
    .catch(error => {
        console.error('Error saving article:', error);
        alert(`Error saving article: ${error.message}`);
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
        alert('Authentication required');
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
            alert('Article deleted successfully');
            
            // Close editor
            document.getElementById('article-editor').classList.add('hidden');
            
            // Reload article list
            loadArticles();
            
            // Reload front page articles
            if (typeof initFrontPageArticles === 'function') {
                initFrontPageArticles();
            }
        } else {
            throw new Error(data.error || 'Failed to delete article');
        }
    })
    .catch(error => {
        console.error('Error deleting article:', error);
        alert(`Error deleting article: ${error.message}`);
    })
    .finally(() => {
        // Restore button state
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    });
}

/**
 * Format date to readable format
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
