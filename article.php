<?php
// Article display page

// Set content type
header('Content-Type: text/html; charset=UTF-8');

// Define article storage
define('DATA_DIR', 'data');
define('ARTICLES_DIR', DATA_DIR . '/articles');
define('ARTICLES_INDEX_FILE', DATA_DIR . '/articles_index.json');

// Function to load JSON data
function loadData($file) {
    if (!file_exists($file)) {
        return null;
    }
    
    // Read file contents
    $jsonData = file_get_contents($file);
    $data = json_decode($jsonData, true);
    
    return $data;
}

// Function to get time ago string
function getTimeAgo($timestamp) {
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

// Get article ID from the URL
$articleId = isset($_GET['id']) ? $_GET['id'] : null;
$article = null;
$relatedArticles = [];

if ($articleId) {
    // Load article from file
    $articleFile = ARTICLES_DIR . '/' . $articleId . '.json';
    $article = loadData($articleFile);
    
    // If article is not found or is a draft, show 404
    if (!$article || $article['status'] === 'draft') {
        header('HTTP/1.0 404 Not Found');
        echo '<h1>Article not found</h1>';
        echo '<p>The article you are looking for does not exist or is not published yet.</p>';
        echo '<p><a href="index.php">Return to Home</a></p>';
        exit;
    }
    
    // Load related articles (get the 3 most recent ones excluding current)
    if (file_exists(ARTICLES_INDEX_FILE)) {
        $articlesIndex = loadData(ARTICLES_INDEX_FILE);
        
        // Sort by timestamp (newest first)
        usort($articlesIndex, function($a, $b) {
            return $b['timestamp'] - $a['timestamp'];
        });
        
        // Get up to 3 related articles
        $count = 0;
        foreach ($articlesIndex as $indexItem) {
            if ($indexItem['id'] !== $articleId && $indexItem['status'] === 'published') {
                $relatedFile = ARTICLES_DIR . '/' . $indexItem['id'] . '.json';
                $relatedArticle = loadData($relatedFile);
                if ($relatedArticle) {
                    $relatedArticles[] = $relatedArticle;
                    $count++;
                    if ($count >= 3) break;
                }
            }
        }
    }
} else {
    // No article ID provided, show latest article instead
    if (file_exists(ARTICLES_INDEX_FILE)) {
        $articlesIndex = loadData(ARTICLES_INDEX_FILE);
        
        // Sort by timestamp (newest first)
        usort($articlesIndex, function($a, $b) {
            return $b['timestamp'] - $a['timestamp'];
        });
        
        // Get the first published article
        foreach ($articlesIndex as $indexItem) {
            if ($indexItem['status'] === 'published') {
                $latestArticleFile = ARTICLES_DIR . '/' . $indexItem['id'] . '.json';
                $article = loadData($latestArticleFile);
                
                if ($article) {
                    $articleId = $indexItem['id'];
                    
                    // Get up to 3 related articles
                    $count = 0;
                    foreach ($articlesIndex as $relatedItem) {
                        if ($relatedItem['id'] !== $articleId && $relatedItem['status'] === 'published') {
                            $relatedFile = ARTICLES_DIR . '/' . $relatedItem['id'] . '.json';
                            $relatedArticle = loadData($relatedFile);
                            if ($relatedArticle) {
                                $relatedArticles[] = $relatedArticle;
                                $count++;
                                if ($count >= 3) break;
                            }
                        }
                    }
                    
                    break;
                }
            }
        }
    }
    
    // If no articles found
    if (!$article) {
        header('HTTP/1.0 404 Not Found');
        echo '<h1>No articles found</h1>';
        echo '<p>There are no published articles available.</p>';
        echo '<p><a href="index.php">Return to Home</a></p>';
        exit;
    }
}

// Function to display related articles
function displayRelatedArticles($articles) {
    $html = '';
    
    foreach ($articles as $relatedArticle) {
        $effectivenessClass = '';
        $score = intval($relatedArticle['effectiveness_score']);
        
        if ($score >= 100) {
            $effectivenessClass = 'high-effectiveness';
        } elseif ($score >= 50) {
            $effectivenessClass = 'medium-effectiveness';
        } else {
            $effectivenessClass = 'low-effectiveness';
        }
        
        $imagePath = !empty($relatedArticle['featured_image']) ? $relatedArticle['featured_image'] : 'https://picsum.photos/seed/' . $relatedArticle['id'] . '/400/300';
        
        $html .= '
        <div class="related-article">
            <a href="article.php?id=' . htmlspecialchars($relatedArticle['id']) . '">
                <div class="related-image gradient-overlay" style="background-image: url(\'' . htmlspecialchars($imagePath) . '\')"></div>
                <div class="related-info">
                    <h4>' . htmlspecialchars($relatedArticle['title']) . '</h4>
                    <div class="related-meta">
                        <span class="related-category ' . strtolower($relatedArticle['category']) . '">' . htmlspecialchars($relatedArticle['category']) . '</span>
                        <span class="related-effectiveness ' . $effectivenessClass . '">' . $score . '</span>
                    </div>
                </div>
            </a>
        </div>';
    }
    
    return $html;
}

// Function to display tags
function displayTags($tags) {
    $html = '';
    
    foreach ($tags as $tag) {
        $html .= '<a href="?category=All Categories&amp;tags=' . urlencode($tag) . '" class="article-tag">#' . htmlspecialchars($tag) . '</a>';
    }
    
    return $html;
}

// Get time ago text
$timeAgo = getTimeAgo($article['timestamp']);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($article['title']); ?></title>
    <link rel="stylesheet" href="viewport.css">
    <link rel="stylesheet" href="styles.css">   
    <link rel="stylesheet" href="freechat.css">
    <link rel="stylesheet" href="article-styles.css">
    <link rel="stylesheet" href="dark-theme-styles.css">
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
</head>
<body>
    <div class="main-container">
        <header>
            <div class="logo">
                <i class="fas fa-shield-alt"></i>
                <span>Secure Forum</span>
            </div>
            <nav id="main-nav">
                <a href="index.php" id="nav-home" class="nav-link"><i class="fas fa-home"></i> Home</a>
                <a href="#" id="nav-forum" class="nav-link"><i class="fas fa-comments"></i> Forum</a>
                <a href="#" id="nav-profile" class="nav-link"><i class="fas fa-user"></i> Profile</a>
                <a href="#" id="nav-login" class="nav-link"><i class="fas fa-sign-in-alt"></i> Login</a>
                <a href="#" id="nav-register" class="nav-link"><i class="fas fa-user-plus"></i> Register</a>
            </nav>
            <div class="mobile-menu-toggle">
                <i class="fas fa-bars"></i>
            </div>
        </header>
        
        <div class="content">
            <div class="article-container dark-theme pin-stripe-bg">
                <article class="article-single">
                    <div class="article-header gradient-header">
                        <div class="article-category <?php echo strtolower($article['category']); ?>" data-editable="category" data-field="category">
                            <?php echo htmlspecialchars($article['category']); ?>
                        </div>
                        
                        <h1 class="article-title" data-editable="text" data-field="title"><?php echo htmlspecialchars($article['title']); ?></h1>
                        
                        <div class="article-meta">
                            <div class="article-author">
                                <i class="fas fa-user"></i> <span data-editable="text" data-field="author"><?php echo htmlspecialchars($article['author']); ?></span>
                            </div>
                            <div class="article-date">
                                <i class="fas fa-calendar"></i> 
                                <span class="timestamp" data-time="<?php echo htmlspecialchars($article['created']); ?>" data-editable="date" data-field="publish_date"><?php echo $timeAgo; ?></span>
                            </div>
                            <div class="article-stats">
                                <span class="article-readtime">
                                    <i class="fas fa-clock"></i> <span data-editable="text" data-field="read_time"><?php echo htmlspecialchars($article['read_time']); ?></span>
                                </span>
                                <span class="article-engagement">
                                    <i class="fas fa-comment"></i> <span data-editable="number" data-field="comment_count"><?php echo intval($article['comment_count']); ?></span> comments
                                </span>
                                <span class="article-sharing">
                                    <i class="fas fa-share-alt"></i> <span data-editable="number" data-field="share_count"><?php echo intval($article['share_count']); ?></span> shares
                                </span>
                            </div>
                        </div>
                        
                        <div class="article-tags" data-editable="tags" data-field="tags">
                            <?php echo displayTags($article['tags']); ?>
                        </div>
                    </div>
                    
                    <div class="article-featured-image gradient-overlay" data-editable="image" data-field="featured_image" style="background-image: url('<?php echo htmlspecialchars($article['featured_image']); ?>')"></div>
                    
                    <div class="article-content" data-editable="richtext" data-field="content">
                        <?php echo $article['content']; ?>
                    </div>
                    
                    <div class="article-effectiveness">
                        <div class="effectiveness-summary">
                            <h3>Article Effectiveness Score</h3>
                            <div class="effectiveness-display">
                                <?php
                                $effectivenessClass = 'low-effectiveness';
                                $score = intval($article['effectiveness_score']);
                                
                                if ($score >= 100) {
                                    $effectivenessClass = 'high-effectiveness';
                                } elseif ($score >= 50) {
                                    $effectivenessClass = 'medium-effectiveness';
                                }
                                ?>
                                <div class="score-circle <?php echo $effectivenessClass; ?>" data-editable="score" data-field="effectiveness_score">
                                    <?php echo $score; ?>
                                </div>
                                <div class="score-description">
                                    <p>This article scores <span class="score-value"><?php echo $score; ?></span> out of 100 on our effectiveness scale.</p>
                                    <p>Effectiveness is calculated based on engagement metrics, persistence value, novelty, and network effects.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="article-actions">
                        <div class="share-buttons">
                            <h4>Share this article</h4>
                            <div class="share-buttons-container">
                                <button class="share-btn facebook">
                                    <i class="fab fa-facebook-f"></i> Facebook
                                </button>
                                <button class="share-btn twitter">
                                    <i class="fab fa-twitter"></i> Twitter
                                </button>
                                <button class="share-btn linkedin">
                                    <i class="fab fa-linkedin-in"></i> LinkedIn
                                </button>
                                <button class="share-btn email">
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
                            <?php echo displayRelatedArticles($relatedArticles); ?>
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
                            <div class="sponsored-image gradient-overlay" style="background-image: url('https://picsum.photos/seed/sponsor/400/300')"></div>
                            <h4>Discover New Perspectives</h4>
                            <p>Explore our premium content collection for deeper insights on topics that matter to you.</p>
                            <a href="#" class="sponsored-link">Learn More</a>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
        
        <footer>
            <div class="footer-content">
                <p>&copy; 2025 Secure Forum. All rights reserved.</p>
            </div>
        </footer>
    </div><link rel="stylesheet" href="article-styles.css">
        <script src="js/three-background.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // Share buttons functionality
        document.addEventListener('DOMContentLoaded', function() {
            const shareButtons = document.querySelectorAll('.share-btn');
            
            shareButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const articleUrl = encodeURIComponent(window.location.href);
                    const articleTitle = encodeURIComponent(document.title);
                    let shareUrl = '';
                    
                    if (this.classList.contains('facebook')) {
                        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${articleUrl}`;
                    } else if (this.classList.contains('twitter')) {
                        shareUrl = `https://twitter.com/intent/tweet?url=${articleUrl}&text=${articleTitle}`;
                    } else if (this.classList.contains('linkedin')) {
                        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${articleUrl}`;
                    } else if (this.classList.contains('email')) {
                        shareUrl = `mailto:?subject=${articleTitle}&body=Check out this article: ${articleUrl}`;
                    }
                    
                    // Update share count (would be an AJAX call to the server in a real app)
                    const shareCount = document.querySelector('.article-sharing span[data-editable="number"]');
                    shareCount.textContent = parseInt(shareCount.textContent) + 1;
                    
                    if (shareUrl) {
                        window.open(shareUrl, '_blank');
                    }
                });
            });
        });
    </script>
</body>
</html>