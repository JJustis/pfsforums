<?php
// article-template.php - Include this file when displaying an article

function renderArticle($article, $relatedArticles = []) {
    // Calculate effectiveness class based on score
    $effectivenessClass = 'low-effectiveness';
    $effectivenessScore = isset($article['effectiveness_score']) ? intval($article['effectiveness_score']) : 27;
    
    if ($effectivenessScore >= 100) {
        $effectivenessClass = 'high-effectiveness';
    } else if ($effectivenessScore >= 50) {
        $effectivenessClass = 'medium-effectiveness';
    }
    
    // Calculate read time based on content length
    $wordCount = str_word_count(strip_tags($article['content']));
    $readTimeMinutes = max(1, ceil($wordCount / 200)); // Assume average reading speed of 200 words per minute
    
    // Format date for human-readable display
    $articleDate = new DateTime($article['created']);
    $now = new DateTime();
    $interval = $now->diff($articleDate);
    
    if ($interval->days > 30) {
        $dateDisplay = $articleDate->format('M j, Y');
    } else if ($interval->days > 0) {
        $dateDisplay = $interval->days . ' days ago';
    } else if ($interval->h > 0) {
        $dateDisplay = $interval->h . ' hours ago';
    } else {
        $dateDisplay = $interval->i . ' minutes ago';
    }
    
    // Get category (default to Technology if not specified)
    $category = isset($article['category']) ? $article['category'] : 'Technology';
    
    // Extract tags from article if available
    $tags = isset($article['tags']) ? $article['tags'] : [];
    if (empty($tags) && isset($article['keywords'])) {
        $tags = explode(',', $article['keywords']);
    }
    
    // Build featured image URL
    $featuredImage = isset($article['featured_image']) ? $article['featured_image'] : 'https://picsum.photos/seed/' . $article['id'] . '/800/400';
    
    // Start output buffering to capture the HTML
    ob_start();
?>
<div class="article-container">
    <article class="article-single">
        <div class="article-header">
            <div class="article-category <?= strtolower($category) ?>">
                <?= htmlspecialchars($category) ?>
            </div>
            
            <h1 class="article-title"><?= htmlspecialchars($article['title']) ?></h1>
            
            <div class="article-meta">
                <div class="article-author">
                    <i class="fas fa-user"></i> <?= isset($article['author']) ? htmlspecialchars($article['author']) : 'Anonymous User' ?>
                </div>
                <div class="article-date">
                    <i class="fas fa-calendar"></i> 
                    <span class="timestamp" data-time="<?= $article['created'] ?>"><?= $dateDisplay ?></span>
                </div>
                <div class="article-stats">
                    <span class="article-readtime">
                        <i class="fas fa-clock"></i> <?= $readTimeMinutes ?>min read
                    </span>
                    <span class="article-engagement">
                        <i class="fas fa-comment"></i> <?= isset($article['comment_count']) ? $article['comment_count'] : 0 ?> comments
                    </span>
                    <span class="article-sharing">
                        <i class="fas fa-share-alt"></i> <?= isset($article['share_count']) ? $article['share_count'] : 0 ?> shares
                    </span>
                </div>
            </div>
            
            <?php if (!empty($tags)): ?>
            <div class="article-tags">
                <?php foreach ($tags as $tag): ?>
                <a href="?category=All Categories&amp;tags=<?= urlencode(trim($tag)) ?>" class="article-tag">
                    #<?= htmlspecialchars(trim($tag)) ?>
                </a>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        
        <div class="article-featured-image" style="background-image: url('<?= htmlspecialchars($featuredImage) ?>')"></div>
        
        <div class="article-content">
            <?= $article['content'] ?>
        </div>
        
        <div class="article-effectiveness">
            <div class="effectiveness-summary">
                <h3>Article Effectiveness Score</h3>
                <div class="effectiveness-display">
                    <div class="score-circle <?= $effectivenessClass ?>">
                        <?= $effectivenessScore ?>
                    </div>
                    <div class="score-description">
                        <p>This article scores <?= $effectivenessScore ?> out of 100 on our effectiveness scale.</p>
                        <p>Effectiveness is calculated based on engagement metrics, persistence value, novelty, and network effects.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="article-actions">
            <div class="share-buttons">
                <h4>Share this article</h4>
                <div class="share-buttons-container">
                    <button onclick="shareArticle('facebook', window.location.href, '<?= addslashes($article['title']) ?>')" class="share-btn facebook">
                        <i class="fab fa-facebook-f"></i> Facebook
                    </button>
                    <button onclick="shareArticle('twitter', window.location.href, '<?= addslashes($article['title']) ?>')" class="share-btn twitter">
                        <i class="fab fa-twitter"></i> Twitter
                    </button>
                    <button onclick="shareArticle('linkedin', window.location.href, '<?= addslashes($article['title']) ?>')" class="share-btn linkedin">
                        <i class="fab fa-linkedin-in"></i> LinkedIn
                    </button>
                    <button onclick="shareArticle('email', window.location.href, '<?= addslashes($article['title']) ?>')" class="share-btn email">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                </div>
            </div>
        </div>
    </article>
    
    <aside class="article-sidebar">
        <?php if (!empty($relatedArticles)): ?>
        <div class="sidebar-section">
            <h3>Related Articles</h3>
            
            <?php foreach ($relatedArticles as $related): 
                $relatedEffectivenessClass = 'low-effectiveness';
                $relatedScore = isset($related['effectiveness_score']) ? intval($related['effectiveness_score']) : 27;
                
                if ($relatedScore >= 100) {
                    $relatedEffectivenessClass = 'high-effectiveness';
                } else if ($relatedScore >= 50) {
                    $relatedEffectivenessClass = 'medium-effectiveness';
                }
                
                $relatedImage = isset($related['featured_image']) ? $related['featured_image'] : 'https://picsum.photos/seed/' . $related['id'] . '/400/300';
                $relatedCategory = isset($related['category']) ? $related['category'] : 'Technology';
            ?>
            <div class="related-article">
                <a href="?article=<?= urlencode($related['id']) ?>">
                    <div class="related-image" style="background-image: url('<?= htmlspecialchars($relatedImage) ?>')"></div>
                    <div class="related-info">
                        <h4><?= htmlspecialchars($related['title']) ?></h4>
                        <div class="related-meta">
                            <span class="related-category <?= strtolower($relatedCategory) ?>">
                                <?= htmlspecialchars($relatedCategory) ?>
                            </span>
                     
                        </div>
                    </div>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
        
        <div class="sidebar-section">
            <h3>Subscribe for Updates</h3>
            <form class="subscribe-form">
                <input type="email" placeholder="Your email address" required>
                <button type="submit">Subscribe</button>
            </form>
        </div>
        
        <!-- Monetization area - Featured content or ads -->
        <div class="sidebar-section monetization">
            <h3>Featured Content</h3>
            <div class="sponsored-content">
                <div class="sponsored-image" style="background-image: url('https://picsum.photos/seed/sponsor/400/300')"></div>
                <h4>Discover New Perspectives</h4>
                <p>Explore our premium content collection for deeper insights on topics that matter to you.</p>
                <a href="#" class="sponsored-link">Learn More</a>
            </div>
        </div>
    </aside>
</div>
<?php
    // Return the captured HTML
    return ob_get_clean();
}
?>