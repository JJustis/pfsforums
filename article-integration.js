// article-integration.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize article timestamps
    updateArticleTimestamps();
    
    // Initialize share buttons
    initShareButtons();
    
    // Initialize subscribe form
    initSubscribeForm();
    
    // Load front page articles if on home page
    if (document.getElementById('front-articles')) {
        loadFrontPageArticles();
    }
});

// Update relative timestamps in articles
function updateArticleTimestamps() {
    const timestampElements = document.querySelectorAll('.timestamp');
    
    timestampElements.forEach(element => {
        const timestamp = element.getAttribute('data-time');
        if (timestamp) {
            element.textContent = getRelativeTimeString(new Date(timestamp));
        }
    });
}

// Get a relative time string (e.g., "5 days ago")
function getRelativeTimeString(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 30) {
        return date.toLocaleDateString();
    } else if (diffDay > 0) {
        return diffDay + (diffDay === 1 ? ' day ago' : ' days ago');
    } else if (diffHour > 0) {
        return diffHour + (diffHour === 1 ? ' hour ago' : ' hours ago');
    } else if (diffMin > 0) {
        return diffMin + (diffMin === 1 ? ' minute ago' : ' minutes ago');
    } else {
        return 'just now';
    }
}

// Initialize share buttons
function initShareButtons() {
    // No initialization needed, sharing is done via onclick handlers
}

// Handle article sharing
function shareArticle(platform, url, title) {
    let shareUrl = '';
    
    switch (platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
            break;
        case 'email':
            shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('I thought you might be interested in this article: ' + url)}`;
            break;
    }
    
    // Track share
    trackArticleShare(platform, url);
    
    // Open share dialog
    if (shareUrl) {
        if (platform === 'email') {
            window.location.href = shareUrl;
        } else {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }
}

// Track article shares
function trackArticleShare(platform, url) {
    // Extract the article ID from the URL
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const articleId = urlParams.get('article');
    
    if (!articleId) return;
    
    // Get the user token
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Send share data to server
    fetch('article-api.php?action=track_share', {
        method: 'POST',
        body: JSON.stringify({
            articleId: articleId,
            platform: platform,
            token: token
        })
    })
    .then(response => response.json())
    .catch(error => console.error('Error tracking share:', error));
}

// Initialize subscribe form
function initSubscribeForm() {
    const subscribeForms = document.querySelectorAll('.subscribe-form');
    
    subscribeForms.forEach(form => {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            
            if (email) {
                subscribeUser(email, form);
            }
        });
    });
}

// Handle user subscription
function subscribeUser(email, form) {
    fetch('api.php?action=subscribe', {
        method: 'POST',
        body: JSON.stringify({
            email: email
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            form.innerHTML = '<div class="success-message">Thanks for subscribing!</div>';
        } else {
            // Show error message
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = data.error || 'Subscription failed. Please try again.';
            
            // Add error to form
            form.appendChild(errorElement);
            
            // Remove error after 3 seconds
            setTimeout(() => {
                form.removeChild(errorElement);
            }, 3000);
        }
    })
    .catch(error => {
        console.error('Subscription error:', error);
    });
}

// Load front page articles
function loadFrontPageArticles() {
    const articlesContainer = document.getElementById('front-articles');
    
    if (!articlesContainer) return;
    
    // Show loading spinner
    articlesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading articles...</div>';
    
    // Fetch articles
    fetch('article-api.php?action=get_front_articles')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.articles && data.articles.length > 0) {
                renderFrontPageArticles(data.articles, articlesContainer);
            } else {
                articlesContainer.innerHTML = '<div class="no-articles">No articles found.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading articles:', error);
            articlesContainer.innerHTML = '<div class="error-message">Failed to load articles. Please try again later.</div>';
        });
}

// Render front page articles
function renderFrontPageArticles(articles, container) {
    container.innerHTML = '';
    
    const articlesGrid = document.createElement('div');
    articlesGrid.className = 'articles-grid';
    
    articles.forEach(article => {
        // Calculate effectiveness class
        let effectivenessClass = 'low-effectiveness';
        const score = article.effectiveness_score || 27;
        
        if (score >= 100) {
            effectivenessClass = 'high-effectiveness';
        } else if (score >= 50) {
            effectivenessClass = 'medium-effectiveness';
        }
        
        // Create article card
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card';
        
        // Format date
        const date = new Date(article.created);
        const dateString = getRelativeTimeString(date);
        
        // Build image URL
        const imageUrl = article.featured_image || `http://jcmc.serveminecraft.net/dashboard/uploads/6702e8756b202.jpeg`;
        
        // Generate HTML for the article card
        articleCard.innerHTML = `
            <a href="?article=${article.id}" class="article-card-link">
                <div class="article-card-image" style="background-image: url('${imageUrl}')"></div>
                <div class="article-card-content">
                    <div class="article-card-category ${article.category ? article.category.toLowerCase() : 'technology'}">
                        ${article.category || 'Technology'}
                    </div>
                    <h3 class="article-card-title">${article.title}</h3>
                    <div class="article-card-meta">
                        <span class="article-card-date">
                            <i class="fas fa-calendar"></i> ${dateString}
                        </span>
                        <span class="article-card-effectiveness ${effectivenessClass}">
                            ${score}
                        </span>
                    </div>
                    <p class="article-card-summary">${article.summary || ''}</p>
                </div>
            </a>
        `;
        
        articlesGrid.appendChild(articleCard);
    });
    
    container.appendChild(articlesGrid);
}