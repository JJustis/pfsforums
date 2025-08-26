<script type="module">
  import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@3.1.0';

  const classifier = await pipeline('sentiment-analysis');
  const result = await classifier('I love this!');
  console.log(result);
</script>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Forum</title>
	<link rel="stylesheet" href="viewport.css">
    <link rel="stylesheet" href="styles.css">   
	<link rel="stylesheet" href="freechat.css">
	<link rel="stylesheet" href="asmdark.css">  
    <link rel="stylesheet" href="article-styles.css">
	<link rel="stylesheet" href="dark-theme-styles.css">
<script src="js/asm-runner.js"></script>
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
    <!-- CryptoJS for client-side encryption -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <!-- Three.js for 3D background -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
    <!-- 3D Background Canvas -->
    <canvas id="bg-canvas"></canvas>
    
    <!-- Main Content -->
    <div class="main-container">
        <header>
            <div class="logo">
                <i class="fas fa-shield-alt"></i>
                <span>Secure Forum</span>
            </div>
            <nav id="main-nav">
                <a href="#" id="nav-home" class="nav-link active"><i class="fas fa-home"></i> Home</a>
                <a href="#" id="nav-forum" class="nav-link hidden"><i class="fas fa-comments"></i> Forum</a>
                <a href="#" id="nav-profile" class="nav-link hidden"><i class="fas fa-user"></i> Profile</a>
                <a href="#" id="nav-login" class="nav-link"><i class="fas fa-sign-in-alt"></i> Login</a>
                <a href="#" id="nav-register" class="nav-link"><i class="fas fa-user-plus"></i> Register</a>
                <a href="#" id="nav-logout" class="nav-link hidden"><i class="fas fa-sign-out-alt"></i> Logout</a>
                <a href="#" id="nav-seo" class="nav-link admin-only hidden"><i class="fas fa-cog"></i> SEO</a>
            </nav>
            <div class="mobile-menu-toggle">
                <i class="fas fa-bars"></i>
            </div>
        </header>
        
        <div class="content">
            <!-- Encryption Status -->
            <div id="encryption-status" class="encryption-status">
                <i class="fas fa-lock"></i> <span>Initializing secure system...</span>
            </div>
            
            <!-- Pages -->
            <div id="page-home" class="page">
                <div class="hero">
                    <h1>Welcome to Secure Forum</h1>
                    <p>A highly secure forum system with encryption, daily re-encryption, and more security features.</p>
                    <div class="hero-buttons">
                        <button id="home-register" class="btn btn-primary"><i class="fas fa-user-plus"></i> Sign Up</button>
                        <button id="home-login" class="btn btn-secondary"><i class="fas fa-sign-in-alt"></i> Login</button>
                    </div>
                </div>
<?php
// Function to load JSON data
function loadArticles() {
    define('DATA_DIR', 'data');
    define('ARTICLES_DIR', DATA_DIR . '/articles');
    define('ARTICLES_INDEX_FILE', DATA_DIR . '/articles_index.json');
    
    // If index file doesn't exist yet, return empty array
    if (!file_exists(ARTICLES_INDEX_FILE)) {
        return [];
    }
    
    // Read index file
    $jsonData = file_get_contents(ARTICLES_INDEX_FILE);
    $articlesIndex = json_decode($jsonData, true);
    
    if (!$articlesIndex) {
        return [];
    }
    
    // Sort by timestamp (newest first)
    usort($articlesIndex, function($a, $b) {
        return $b['timestamp'] - $a['timestamp'];
    });
    
    // Get only published articles
    $publishedArticles = [];
    foreach ($articlesIndex as $article) {
        if ($article['status'] === 'published') {
            // Load full article data
            $articleFile = ARTICLES_DIR . '/' . $article['id'] . '.json';
            if (file_exists($articleFile)) {
                $fullArticle = json_decode(file_get_contents($articleFile), true);
                if ($fullArticle) {
                    $publishedArticles[] = $fullArticle;
                }
            }
        }
    }
    
    return $publishedArticles;
}

// Function to get time ago string
function getArticleTimeAgo($timestamp) {
    $now = time();
    $diff = $now - $timestamp;
    
    if ($diff < 60) {
        return 'Just now';
    } elseif ($diff < 3600) {
        $minutes = floor($diff / 60);
        return $minutes . ' minute' . ($minutes > 1 ? 's' : '') . ' ago';
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
    } elseif ($diff < 2592000) {
        $days = floor($diff / 86400);
        return $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
    } elseif ($diff < 31536000) {
        $months = floor($diff / 2592000);
        return $months . ' month' . ($months > 1 ? 's' : '') . ' ago';
    } else {
        $years = floor($diff / 31536000);
        return $years . ' year' . ($years > 1 ? 's' : '') . ' ago';
    }
}

// Function to display article tags
function displayArticleTags($tags) {
    $html = '';
    foreach ($tags as $tag) {
        $html .= '<a href="?category=All Categories&amp;tags=' . urlencode($tag) . '" class="article-tag">#' . htmlspecialchars($tag) . '</a>' . "\n";
    }
    return $html;
}

// Load articles
$articles = loadArticles();

// Display articles using the exact structure from the sample
if (!empty($articles)) {
    // Main article (most recent)
    $mainArticle = $articles[0];
    
    // Determine effectiveness class
    $effectivenessClass = 'low-effectiveness';
    $score = intval($mainArticle['effectiveness_score']);
    if ($score >= 100) {
        $effectivenessClass = 'high-effectiveness';
    } elseif ($score >= 50) {
        $effectivenessClass = 'medium-effectiveness';
    }
    
    // Get related articles (up to 3 more)
    $relatedArticles = array_slice($articles, 1, 3);
    
    // Build related articles HTML
    $relatedArticlesHtml = '';
    foreach ($relatedArticles as $relatedArticle) {
        $relatedEffectivenessClass = 'low-effectiveness';
        $relatedScore = intval($relatedArticle['effectiveness_score']);
        
        if ($relatedScore >= 100) {
            $relatedEffectivenessClass = 'high-effectiveness';
        } elseif ($relatedScore >= 50) {
            $relatedEffectivenessClass = 'medium-effectiveness';
        }
        
        $relatedImageUrl = !empty($relatedArticle['featured_image']) ? 
            $relatedArticle['featured_image'] : 
            'https://picsum.photos/seed/' . md5($relatedArticle['id']) . '/400/300';
            
        $relatedArticlesHtml .= '
                <div class="related-article">
                    <a href="article.php?id=' . htmlspecialchars($relatedArticle['id']) . '">
                        <div class="related-image gradient-overlay" style="background-image: url(\'' . htmlspecialchars($relatedImageUrl) . '\')"></div>
                        <div class="related-info">
                            <h4>' . htmlspecialchars($relatedArticle['title']) . '</h4>
                            <div class="related-meta">
                                <span class="related-category ' . strtolower($relatedArticle['category']) . '">' . htmlspecialchars($relatedArticle['category']) . '</span>
                                <span class="related-effectiveness ' . $relatedEffectivenessClass . '">' . $relatedScore . '</span>
                            </div>
                        </div>
                    </a>
                </div>';
    }
    
    // Main content with exact classes from the sample
    echo '
    <div class="article-container dark-theme pin-stripe-bg">
        <article class="article-single">
            <div class="article-header gradient-header">
                <div class="article-category ' . strtolower($mainArticle['category']) . '" data-editable="category" data-field="category">
                    ' . htmlspecialchars($mainArticle['category']) . '
                </div>
                
                <h1 class="article-title" data-editable="text" data-field="title">
                    <a href="article.php?id=' . htmlspecialchars($mainArticle['id']) . '">' . htmlspecialchars($mainArticle['title']) . '</a>
                </h1>
                
                <div class="article-meta">
                    <div class="article-author">
                        <i class="fas fa-user"></i> <span data-editable="text" data-field="author">' . htmlspecialchars($mainArticle['author']) . '</span>
                    </div>
                    <div class="article-date">
                        <i class="fas fa-calendar"></i> 
                        <span class="timestamp" data-time="' . htmlspecialchars($mainArticle['created']) . '" data-editable="date" data-field="publish_date">' . getArticleTimeAgo($mainArticle['timestamp']) . '</span>
                    </div>
                    <div class="article-stats">
                        <span class="article-readtime">
                            <i class="fas fa-clock"></i> <span data-editable="text" data-field="read_time">' . htmlspecialchars($mainArticle['read_time']) . '</span>
                        </span>
                        <span class="article-engagement">
                            <i class="fas fa-comment"></i> <span data-editable="number" data-field="comment_count">' . intval($mainArticle['comment_count']) . '</span> comments
                        </span>
                        <span class="article-sharing">
                            <i class="fas fa-share-alt"></i> <span data-editable="number" data-field="share_count">' . intval($mainArticle['share_count']) . '</span> shares
                        </span>
                    </div>
                </div>
                
                <div class="article-tags" data-editable="tags" data-field="tags">
                    ' . displayArticleTags($mainArticle['tags']) . '
                </div>
            </div>
            
            <div class="article-featured-image gradient-overlay" data-editable="image" data-field="featured_image" style="background-image: url(\'' . htmlspecialchars($mainArticle['featured_image']) . '\')"></div>
            
            <div class="article-content" data-editable="richtext" data-field="content">
                ' . substr($mainArticle['content'], 0, 300) . '... <a href="article.php?id=' . htmlspecialchars($mainArticle['id']) . '" class="read-more">Read More</a>
            </div>
            
            <div class="article-effectiveness">
                <div class="effectiveness-summary">
                    <h3>Article Effectiveness Score</h3>
                    <div class="effectiveness-display">
                        <div class="score-circle ' . $effectivenessClass . '" data-editable="score" data-field="effectiveness_score">
                            ' . $score . '
                        </div>
                        <div class="score-description">
                            <p>This article scores <span class="score-value">' . $score . '</span> out of 100 on our effectiveness scale.</p>
                            <p>Effectiveness is calculated based on engagement metrics, persistence value, novelty, and network effects.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="article-actions">
                <div class="share-buttons">
                    <h4>Share this article</h4>
                    <div class="share-buttons-container">
                        <button class="share-btn facebook" data-url="article.php?id=' . htmlspecialchars($mainArticle['id']) . '">
                            <i class="fab fa-facebook-f"></i> Facebook
                        </button>
                        <button class="share-btn twitter" data-url="article.php?id=' . htmlspecialchars($mainArticle['id']) . '">
                            <i class="fab fa-twitter"></i> Twitter
                        </button>
                        <button class="share-btn linkedin" data-url="article.php?id=' . htmlspecialchars($mainArticle['id']) . '">
                            <i class="fab fa-linkedin-in"></i> LinkedIn
                        </button>
                        <button class="share-btn email" data-url="article.php?id=' . htmlspecialchars($mainArticle['id']) . '">
                            <i class="fas fa-envelope"></i> Email
                        </button>
                    </div>
                </div>
            </div>
        </article>
        
        <aside class="article-sidebar">
            <div class="sidebar-section" data-editable="section" data-section="related_articles">
                <h3>Related Articles</h3>
                
                <div class="related-articles-container" data-editable="related" data-field="related_articles">
                    ' . $relatedArticlesHtml . '
                </div>
            </div>
            
            <div class="sidebar-section" data-editable="section" data-section="subscribe">
                <h3>Subscribe for Updates</h3>
                <form class="subscribe-form">
                    <input type="email" placeholder="Your email address" required>
                    <button type="submit">Subscribe</button>
                </form>
            </div>
            
            <div class="sidebar-section monetization" data-editable="section" data-section="featured_content">
                <h3>Featured Content</h3>
                <div class="sponsored-content" data-editable="sponsored" data-field="featured_content">
                    <div class="sponsored-image gradient-overlay" style="background-image: url(\'https://picsum.photos/seed/sponsor/400/300\')"></div>
                    <h4>Discover New Perspectives</h4>
                    <p>Explore our premium content collection for deeper insights on topics that matter to you.</p>
                    <a href="#" class="sponsored-link">Learn More</a>
                </div>
            </div>
        </aside>
    </div>
    
    <script>
        // Share buttons functionality
        document.addEventListener("DOMContentLoaded", function() {
            const shareButtons = document.querySelectorAll(".share-btn");
            
            shareButtons.forEach(button => {
                button.addEventListener("click", function() {
                    const articleUrl = encodeURIComponent(window.location.origin + "/" + this.getAttribute("data-url"));
                    const articleTitle = encodeURIComponent(document.querySelector(".article-title").textContent.trim());
                    let shareUrl = "";
                    
                    if (this.classList.contains("facebook")) {
                        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${articleUrl}`;
                    } else if (this.classList.contains("twitter")) {
                        shareUrl = `https://twitter.com/intent/tweet?url=${articleUrl}&text=${articleTitle}`;
                    } else if (this.classList.contains("linkedin")) {
                        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${articleUrl}`;
                    } else if (this.classList.contains("email")) {
                        shareUrl = `mailto:?subject=${articleTitle}&body=Check out this article: ${articleUrl}`;
                    }
                    
                    // Update share count (would be an AJAX call to the server in a real app)
                    const shareCount = document.querySelector(".article-sharing span[data-editable=\'number\']");
                    shareCount.textContent = parseInt(shareCount.textContent) + 1;
                    
                    if (shareUrl) {
                        window.open(shareUrl, "_blank");
                    }
                });
            });
        });
    </script>';
} else {
    echo '<div class="no-articles">
        <h2>No articles found</h2>
        <p>There are no published articles available yet. Check back soon!</p>
    </div>';
}
?>
                <div class="features">
                    <h2>Key Features</h2>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon"><i class="fas fa-lock"></i></div>
                            <h3>Daily Encryption</h3>
                            <p>All forum data is encrypted and re-encrypted every 24 hours with a new key.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon"><i class="fas fa-shield-alt"></i></div>
                            <h3>Secure Login</h3>
                            <p>Advanced encryption protects your credentials and personal information.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon"><i class="fas fa-users"></i></div>
                            <h3>Community</h3>
                            <p>Join discussions with like-minded individuals in a secure environment.</p>
                        </div>

                    </div>
                </div>
            </div>
            
            <div id="page-login" class="page hidden">
                <div class="auth-container">
                    <div class="auth-box">
                        <h2><i class="fas fa-sign-in-alt"></i> Login</h2>
                        <div id="login-error" class="error-message hidden"></div>
                        <div class="form-group">
                            <label for="login-username">Username</label>
                            <input type="text" id="login-username" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" class="form-control">
                        </div>
                        <button id="login-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </button>
                        <div class="auth-footer">
                            <p>Don't have an account? <a href="#" id="login-to-register">Register</a></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-register" class="page hidden">
                <div class="auth-container">
                    <div class="auth-box">
                        <h2><i class="fas fa-user-plus"></i> Register</h2>
                        <div id="register-error" class="error-message hidden"></div>
                        <div class="form-group">
                            <label for="register-username">Username</label>
                            <input type="text" id="register-username" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="register-email">Email</label>
                            <input type="email" id="register-email" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="register-password">Password</label>
                            <input type="password" id="register-password" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="register-confirm">Confirm Password</label>
                            <input type="password" id="register-confirm" class="form-control">
                        </div>
                        <div class="form-group" id="admin-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="register-admin"> Register as admin
                            </label>
                        </div>
                        <button id="register-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-user-plus"></i> Register
                        </button>
                        <div class="auth-footer">
                            <p>Already have an account? <a href="#" id="register-to-login">Login</a></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-forum" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2><i class="fas fa-comments"></i> Forum Categories</h2>
                        <div class="forum-actions admin-only hidden">
                            <button id="new-category-btn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> New Category
                            </button>
                        </div>
                    </div>
                    
                    <div id="categories-container" class="categories-container">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> Loading categories...
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-category" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2 id="category-title">Category</h2>
                        <p id="category-description" class="category-description"></p>
                        <div class="forum-actions">
                            <button id="back-to-forum-btn" class="btn btn-secondary">
                                <i class="fas fa-arrow-left"></i> Back to Categories
                            </button>
                            <button id="new-post-btn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> New Post
                            </button>
                        </div>
                    </div>
                    
                    <div id="posts-container" class="posts-container">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> Loading posts...
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-new-post" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2><i class="fas fa-plus"></i> Create New Post</h2>
                        <div class="forum-actions">
                            <button id="post-cancel" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-container">
                        <div class="form-group">
                            <label for="post-title">Title</label>
                            <input type="text" id="post-title" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="post-content">Content</label>
                            <textarea id="post-content" class="form-control" rows="8"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="post-category">Category</label>
                            <select id="post-category" class="form-control">
                                <!-- Categories loaded dynamically -->
                            </select>
                        </div>
                        <button id="post-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-paper-plane"></i> Create Post
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="page-new-category" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2><i class="fas fa-plus"></i> Create New Category</h2>
                        <div class="forum-actions">
                            <button id="category-cancel" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-container">
                        <div class="form-group">
                            <label for="category-name">Name</label>
                            <input type="text" id="category-name" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="category-description">Description</label>
                            <textarea id="category-description-input" class="form-control" rows="4"></textarea>
                        </div>
                        <button id="category-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-save"></i> Create Category
                        </button>
                    </div>
                </div>
            </div>
            
<!-- Update the post page structure in index.php -->

<div id="page-post" class="page hidden">
    <div class="forum-container">
        <div class="forum-header">
            <h2 id="post-title-display">Post Title</h2>
            <div id="post-meta-container">
                <!-- Post meta and user profile card will be inserted here -->
            </div>
            <div class="forum-actions">
                <button id="back-to-category-btn" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Back to Category
                </button>
                <!-- Delete button will be inserted here if admin -->
            </div>
        </div>
        
        <div id="post-content-display" class="post-content-display">
            <!-- Post content displayed here -->
        </div>
        
        <div class="replies-section">
            <h3><i class="fas fa-reply"></i> Replies</h3>
            <div id="replies-container">
                <!-- Replies loaded dynamically -->
            </div>
        </div>
        
        <div class="reply-form">
            <h3><i class="fas fa-comment"></i> Post a Reply</h3>
            <div class="form-group">
                <textarea id="reply-content" class="form-control" rows="4" placeholder="Write your reply here..."></textarea>
            </div>
            <button id="reply-submit" class="btn btn-primary">
                <i class="fas fa-paper-plane"></i> Post Reply
            </button>
        </div>
    </div>
</div>
            
   <div id="page-profile" class="page hidden">
    <div class="profile-container">
        <div class="profile-header">
            <div class="profile-avatar-container">
                <div id="profile-avatar" class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <button id="change-avatar-btn" class="btn btn-secondary btn-sm">
                    <i class="fas fa-camera"></i> Change Avatar
                </button>
                <input type="file" id="avatar-upload" accept="image/*" class="hidden">
            </div>
            <div class="profile-info">
                <h2 id="profile-username">Username</h2>
                <p id="profile-role">Role</p>
            </div>
        </div>
        <div class="profile-section">
		
                
    <h3><i class="fas fa-file-upload"></i> Digital Products</h3>
    <div class="digital-products-container">
        <div class="product-list" id="user-products-list">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i> Loading your products...
            </div>
        </div>
        
        <div class="upload-product-form">
            <h4>Upload New Product</h4>
            <div class="form-group">
                <label for="product-name">Product Name</label>
                <input type="text" id="product-name" class="form-control" placeholder="Enter product name">
            </div>
            <div class="form-group">
                <label for="product-description">Description</label>
                <textarea id="product-description" class="form-control" rows="3" placeholder="Describe your product"></textarea>
            </div>
            <div class="form-group">
                <label for="product-price">Price (USD)</label>
                <input type="number" id="product-price" class="form-control" min="0.99" step="0.01" value="9.99">
            </div>
            <div class="form-group">
                <label for="product-file">Product File</label>
                <input type="file" id="product-file" class="form-control-file">
                <div class="file-upload-progress hidden">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            <button id="upload-product-btn" class="btn btn-primary">
                <i class="fas fa-cloud-upload-alt"></i> Upload Product
            </button>
        </div>
    </div>
</div>
        <div class="profile-content">
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Account Information</h3>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span class="detail-label">Email:</span>
                        <span id="profile-email" class="detail-value">email@example.com</span>
                    </div>
                    <div class="profile-detail">
                        <span class="detail-label">Member Since:</span>
                        <span id="profile-created" class="detail-value">Date</span>
                    </div>
                    <div class="profile-detail">
                        <span class="detail-label">Last Login:</span>
                        <span id="profile-last-login" class="detail-value">Date</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-section">
                <h3><i class="fas fa-chart-bar"></i> Activity</h3>
                <div id="profile-activity" class="profile-activity">
                    <!-- Activity stats loaded dynamically -->
                </div>
            </div>
            
            <div class="profile-section">
                <h3><i class="fas fa-signature"></i> Signature</h3>
                <div class="form-group">
                    <textarea id="profile-signature" class="form-control" rows="3" placeholder="Add a signature that will appear on your posts..."></textarea>
                </div>
                <button id="save-signature-btn" class="btn btn-primary">
                    <i class="fas fa-save"></i> Save Signature
                </button>
				

            </div> 
        </div><div class="profile-section"><iframe height="1000px" width="100%" src="https://jcmc.serveminecraft.net/cybercoin/"></iframe></div>
    </div>
</div>
            
            <div id="page-seo" class="page hidden">
                <div class="seo-container">
                    <div class="seo-header">
                        <h2><i class="fas fa-cog"></i> SEO Settings</h2>
                    </div>
                    
                    <div id="seo-login" class="seo-login">
                        <p>Please enter the admin password to access SEO settings:</p>
                        <div class="form-group">
                            <input type="password" id="seo-password" class="form-control" placeholder="Admin Password">
                        </div>
                        <button id="seo-submit" class="btn btn-primary">
                            <i class="fas fa-unlock"></i> Access SEO Settings
                        </button>
                    </div>
                    
                    <div id="seo-content" class="seo-content hidden">
                        <div class="form-group">
                            <label for="seo-title">Page Title</label>
                            <input type="text" id="seo-title" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="seo-description">Meta Description</label>
                            <textarea id="seo-description" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="seo-keywords">Keywords (comma separated)</label>
                            <input type="text" id="seo-keywords" class="form-control">
                        </div>
                        <button id="seo-save" class="btn btn-primary btn-block">
                            <i class="fas fa-save"></i> Save SEO Settings
                        </button>
						
                    </div>
					<!-- Add this content to the SEO page in index.php -->
<!-- Place it after the existing SEO content div but before the closing </div> of seo-container -->

<div id="seo-articles" class="seo-content hidden">
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
</div>










                </div>
            </div>
        </div>
        <div id="cookie-consent" class="cookie-consent">
    <div class="cookie-content">
        <h3><i class="fas fa-cookie-bite"></i> Cookie Notice</h3>
        <p>This site uses cookies for authentication and to enable secure chat functionality. By continuing to use this site, you consent to our use of cookies.</p>
        <div class="cookie-buttons">
            <button id="accept-cookies" class="btn btn-primary">Accept Cookies</button>
            <button id="decline-cookies" class="btn btn-secondary">Decline</button>
        </div>
    </div>
</div>

<!-- Add this to your CSS -->
<style>
.cookie-consent {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    z-index: 10000;
    transform: translateY(100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

.cookie-consent.show {
    transform: translateY(0);
}

.cookie-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.cookie-content h3 {
    margin-top: 0;
    color: var(--primary-color, #2196F3);
}

.cookie-buttons {
    margin-top: 15px;
    display: flex;
    gap: 10px;
}

[data-theme="dark"] .cookie-consent {
    background-color: rgba(20, 25, 40, 0.95);
}
/* Debug info panel showing key details */
.freechat-debug-info {
    position: absolute;
    top: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.7);
    color: #2ecc71;
    padding: 2px 5px;
    font-size: 0.7em;
    border-radius: 0 0 0 3px;
    display: none;
    z-index: 10;
}

.freechat-widget:hover .freechat-debug-info {
    display: block;
}

/* Security status indicator */
.freechat-security {
    cursor: pointer;
    transition: background-color 0.3s;
}

.freechat-security:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

/* Encryption icon animation */
.encryption-icon {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
}

/* Message with decryption error */
.freechat-message.decryption-failed .content {
    color: #e74c3c;
    font-style: italic;
    background-color: rgba(231, 76, 60, 0.1);
    padding: 2px 5px;
    border-radius: 3px;
}

/* System message styling */
.system-message {
    text-align: center;
    margin: 10px 0;
    padding: 5px;
    font-size: 0.85em;
    color: #7f8c8d;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
}

/* Dark theme support */
[data-theme="dark"] .freechat-security:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .freechat-message.decryption-failed .content {
    background-color: rgba(231, 76, 60, 0.15);
}

[data-theme="dark"] .system-message {
    color: #95a5a6;
    background-color: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .freechat-debug-info {
    background-color: rgba(0, 0, 0, 0.8);
}
// Add CSS for the bot integration
const botStyles = document.createElement('style');
botStyles.textContent = `
  /* Bot Suggestion */
  .bot-suggestion {
    margin-top: 10px;
    margin-bottom: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  
  .suggestion-header {
    background: #f5f5f5;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .suggestion-header i {
    color: #2196F3;
    margin-right: 8px;
  }
  
  .suggestion-header span {
    flex-grow: 1;
    font-weight: 500;
    font-size: 14px;
  }
  
  .suggestion-header button {
    margin-left: 8px;
    padding: 3px 10px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 12px;
  }
  
  .use-suggestion {
    background: #2196F3;
    color: white;
  }
  
  .dismiss-suggestion {
    background: #e0e0e0;
    color: #333;
  }
  
  .suggestion-content {
    padding: 12px;
    background: white;
    font-size: 14px;
    line-height: 1.5;
  }
  
  /* Bot Toggle */
  .bot-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
  }
  
  .bot-toggle button {
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  }
  
  .bot-toggle button i {
    font-size: 24px;
  }
  
  /* Bot Modal */
  .bot-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .bot-modal-container {
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    background: white;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .bot-modal-header {
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .bot-modal-header h3 {
    margin: 0;
    font-size: 18px;
    display: flex;
    align-items: center;
  }
  
  .bot-modal-header h3 i {
    margin-right: 10px;
    color: #2196F3;
  }
  
  .bot-modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #777;
  }
  
  .bot-modal-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .bot-chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .bot-messages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .bot-message {
    display: flex;
    max-width: 80%;
  }
  
  .user-message {
    margin-left: auto;
  }
  
  .bot-avatar {
    width: 36px;
    height: 36px;
    background: #2196F3;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    margin-right: 10px;
  }
  
  .message-content {
    background: #f5f5f5;
    padding: 10px 15px;
    border-radius: 18px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    line-height: 1.5;
  }
  
  .user-message .message-content {
    background: #e3f2fd;
  }
  
  .bot-input {
    display: flex;
    padding: 15px;
    border-top: 1px solid #e0e0e0;
  }
  
  .bot-input textarea {
    flex-grow: 1;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 10px;
    margin-right: 10px;
    resize: none;
    height: 40px;
    max-height: 120px;
  }
  
  .bot-input button {
    height: 40px;
  }
  
  /* Dark Theme Support */
  [data-theme="dark"] .bot-suggestion {
    border-color: #444;
  }
  
  [data-theme="dark"] .suggestion-header {
    background: #333;
    border-color: #444;
    color: #eee;
  }
  
  [data-theme="dark"] .dismiss-suggestion {
    background: #555;
    color: #eee;
  }
  
  [data-theme="dark"] .suggestion-content {
    background: #222;
    color: #eee;
  }
  
  [data-theme="dark"] .bot-modal-container {
    background: #222;
  }
  
  [data-theme="dark"] .bot-modal-header {
    border-color: #444;
    color: #eee;
  }
  
  [data-theme="dark"] .bot-input {
    border-color: #444;
  }
  
  [data-theme="dark"] .bot-input textarea {
    background: #333;
    border-color: #444;
    color: #eee;
  }
  
  [data-theme="dark"] .message-content {
    background: #333;
    color: #eee;
  }
  
  [data-theme="dark"] .user-message .message-content {
    background: #1e3a5f;
  }
`;

document.head.appendChild(botStyles);
</style>
        <footer>
            <div class="footer-content">
                <p>&copy; 2025 Secure Forum. All rights reserved.</p>
              
            </div>
        </footer>
    </div>
    
    <!-- Modal Component -->
    <div id="modal" class="modal hidden">
        <div class="modal-overlay"></div>
        <div class="modal-container">
            <div class="modal-header">
                <h3 id="modal-title">Modal Title</h3>
                <button id="modal-close" class="modal-close">&times;</button>
            </div>
            <div id="modal-content" class="modal-content">
                <!-- Modal content goes here -->
            </div>
            <div class="modal-footer">
                <button id="modal-cancel" class="btn btn-secondary">Cancel</button>
                <button id="modal-confirm" class="btn btn-primary">Confirm</button>
            </div>
        </div>
    </div>
        <script src="js/cookie-consent.js"></script>

<!-- Updated FreeChat Integration -->
<link rel="stylesheet" href="forum-bot.css">

<script src="js/freechat-integration.js"></script>
<script src="js/article-integration.js"></script>
    <!-- Toast Notifications -->
    <div id="toast-container" class="toast-container"></div>
    <script src="js/viewport.js"></script>
    <!-- JavaScript Files -->
    <script src="js/honeycomb.js"></script>
    <script src="js/api.js"></script>
	 <script src="js/markup.js"></script>
	<script src="forum-bot.js"></script>
	<script src="mat.js"></script>

    <script src="js/app.js"></script> <script src="js/recentthreads.js"></script><script src="js/theme-toggle.js"></script>
	 
	<script src="gsap.min.js"></script>
</body>
</html>
