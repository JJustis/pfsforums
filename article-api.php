<?php
/**
 * Article Management API
 * Articles are stored unencrypted for public access
 */

// Set content type to JSON for API responses
header('Content-Type: application/json');

// Define article storage path
define('DATA_DIR', 'data');
define('ARTICLES_DIR', DATA_DIR . '/articles');
define('ARTICLES_FILE', DATA_DIR . '/articles.json');

// Create directories if they don't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

if (!file_exists(ARTICLES_DIR)) {
    mkdir(ARTICLES_DIR, 0755, true);
}

// Get action from the request
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle different actions
try {
    switch ($action) {
        case 'get_articles':
            getArticles();
            break;
            
        case 'get_article':
            getArticle();
            break;
            
        case 'save_article':
            saveArticle();
            break;
            
        case 'delete_article':
            deleteArticle();
            break;
        case 'get_related':
    getRelatedArticles();
    break;

case 'track_view':
    trackArticleView();
    break;

case 'track_share':
    trackArticleShare();
    break;    
        case 'get_front_articles':
            getFrontPageArticles();
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    // Log error but don't expose details
    error_log("Article API Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error occurred']);
}
/**
 * Get related articles
 */
function getRelatedArticles() {
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Check for article ID
    if (!isset($data['articleId'])) {
        echo json_encode(['success' => false, 'error' => 'Missing article ID']);
        return;
    }
    
    $articleId = $data['articleId'];
    $limit = isset($data['limit']) ? intval($data['limit']) : 3;
    
    // Load all articles
    $articles = loadArticles();
    
    // Find the main article to get its tags/category
    $mainArticle = null;
    foreach ($articles as $article) {
        if ($article['id'] === $articleId) {
            $mainArticle = $article;
            break;
        }
    }
    
    if (!$mainArticle) {
        echo json_encode(['success' => false, 'error' => 'Article not found']);
        return;
    }
    
    // Extract tags and category from main article
    $mainTags = [];
    if (isset($mainArticle['tags'])) {
        $mainTags = $mainArticle['tags'];
    } elseif (isset($mainArticle['keywords'])) {
        $mainTags = explode(',', $mainArticle['keywords']);
    }
    
    $mainCategory = isset($mainArticle['category']) ? $mainArticle['category'] : '';
    
    // Score other articles based on similarity
    $scored = [];
    foreach ($articles as $article) {
        // Skip the current article
        if ($article['id'] === $articleId) {
            continue;
        }
        
        // Skip draft articles
        if (isset($article['status']) && $article['status'] !== 'published') {
            continue;
        }
        
        // Calculate similarity score
        $score = 0;
        
        // Add score for same category
        if ($mainCategory && isset($article['category']) && $article['category'] === $mainCategory) {
            $score += 5;
        }
        
        // Add score for matching tags
        $articleTags = [];
        if (isset($article['tags'])) {
            $articleTags = $article['tags'];
        } elseif (isset($article['keywords'])) {
            $articleTags = explode(',', $article['keywords']);
        }
        
        foreach ($mainTags as $tag) {
            $tag = trim($tag);
            if (!empty($tag) && in_array($tag, $articleTags)) {
                $score += 2;
            }
        }
        
        // Add score for recency
        $mainDate = strtotime($mainArticle['created']);
        $articleDate = strtotime($article['created']);
        $daysDiff = abs(($mainDate - $articleDate) / (60 * 60 * 24));
        
        if ($daysDiff < 7) {
            $score += 3;
        } elseif ($daysDiff < 30) {
            $score += 1;
        }
        
        // Only include articles with some relevance
        if ($score > 0) {
            $scored[] = [
                'article' => $article,
                'score' => $score
            ];
        }
    }
    
    // Sort by score (highest first)
    usort($scored, function($a, $b) {
        return $b['score'] - $a['score'];
    });
    
    // Limit results
    $related = [];
    $count = 0;
    foreach ($scored as $item) {
        if ($count >= $limit) {
            break;
        }
        
        $related[] = $item['article'];
        $count++;
    }
    
    // If we don't have enough related articles, add recent ones
    if (count($related) < $limit) {
        // Sort all articles by date (newest first)
        usort($articles, function($a, $b) {
            return strtotime($b['created']) - strtotime($a['created']);
        });
        
        foreach ($articles as $article) {
            // Skip the current article and already included ones
            if ($article['id'] === $articleId) {
                continue;
            }
            
            // Skip draft articles
            if (isset($article['status']) && $article['status'] !== 'published') {
                continue;
            }
            
            // Check if already included
            $found = false;
            foreach ($related as $rel) {
                if ($rel['id'] === $article['id']) {
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                $related[] = $article;
                $count++;
                
                if ($count >= $limit) {
                    break;
                }
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'related' => $related
    ]);
}
/**
 * Get all articles (admin)
 */
 
 
 /**
 * Track article view
 */
function trackArticleView() {
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Check for required fields
    if (!isset($data['articleId'])) {
        echo json_encode(['success' => false, 'error' => 'Missing article ID']);
        return;
    }
    
    $articleId = $data['articleId'];
    $userId = null;
    
    // Get user ID from token if provided
    if (isset($data['token'])) {
        $userId = verifyToken($data['token']);
    }
    
    // Load analytics data
    $analyticsFile = DATA_DIR . '/article_analytics.json';
    $analytics = [];
    
    if (file_exists($analyticsFile)) {
        $analyticsJson = file_get_contents($analyticsFile);
        $analytics = json_decode($analyticsJson, true) ?: [];
    }
    
    // Initialize article analytics if not exists
    if (!isset($analytics[$articleId])) {
        $analytics[$articleId] = [
            'views' => 0,
            'shares' => 0,
            'unique_views' => []
        ];
    }
    
    // Increment view count
    $analytics[$articleId]['views']++;
    
    // Track unique user view
    if ($userId && !in_array($userId, $analytics[$articleId]['unique_views'])) {
        $analytics[$articleId]['unique_views'][] = $userId;
    }
    
    // Save analytics
    file_put_contents($analyticsFile, json_encode($analytics, JSON_PRETTY_PRINT));
    
    // Calculate effectiveness score and update article
    updateArticleEffectiveness($articleId, $analytics[$articleId]);
    
    echo json_encode(['success' => true]);
}

/**
 * Track article share
 */
function trackArticleShare() {
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Check for required fields
    if (!isset($data['articleId']) || !isset($data['platform'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    $articleId = $data['articleId'];
    $platform = $data['platform'];
    $userId = null;
    
    // Get user ID from token if provided
    if (isset($data['token'])) {
        $userId = verifyToken($data['token']);
    }
    
    // Load analytics data
    $analyticsFile = DATA_DIR . '/article_analytics.json';
    $analytics = [];
    
    if (file_exists($analyticsFile)) {
        $analyticsJson = file_get_contents($analyticsFile);
        $analytics = json_decode($analyticsJson, true) ?: [];
    }
    
    // Initialize article analytics if not exists
    if (!isset($analytics[$articleId])) {
        $analytics[$articleId] = [
            'views' => 0,
            'shares' => 0,
            'shares_by_platform' => [],
            'unique_views' => []
        ];
    }
    
    // Initialize shares by platform if not exists
    if (!isset($analytics[$articleId]['shares_by_platform'])) {
        $analytics[$articleId]['shares_by_platform'] = [];
    }
    
    // Initialize platform count if not exists
    if (!isset($analytics[$articleId]['shares_by_platform'][$platform])) {
        $analytics[$articleId]['shares_by_platform'][$platform] = 0;
    }
    
    // Increment share count
    $analytics[$articleId]['shares']++;
    $analytics[$articleId]['shares_by_platform'][$platform]++;
    
    // Save analytics
    file_put_contents($analyticsFile, json_encode($analytics, JSON_PRETTY_PRINT));
    
    // Calculate effectiveness score and update article
    updateArticleEffectiveness($articleId, $analytics[$articleId]);
    
    echo json_encode(['success' => true]);
}

/**
 * Update article effectiveness score
 */
function updateArticleEffectiveness($articleId, $metrics) {
    // Load the article
    $articles = loadArticles();
    $updated = false;
    
    foreach ($articles as &$article) {
        if ($article['id'] === $articleId) {
            // Calculate effectiveness score
            $viewScore = min(50, $metrics['views'] / 2);
            $uniqueViewerScore = min(20, count($metrics['unique_views']) * 2);
            $shareScore = min(30, $metrics['shares'] * 5);
            
            // Calculate total score
            $effectivenessScore = round($viewScore + $uniqueViewerScore + $shareScore);
            
            // Update article
            $article['effectiveness_score'] = $effectivenessScore;
            $updated = true;
            break;
        }
    }
    
    // Save articles if updated
    if ($updated) {
        saveArticles($articles);
    }
}
function getArticles() {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validate token (admin only)
    if (!$data || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing token']);
        return;
    }
    
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        return;
    }
    
    // Check if user is admin
    if (!isUserAdmin($userId)) {
        echo json_encode(['success' => false, 'error' => 'Permission denied']);
        return;
    }
    
    // Load articles
    $articles = loadArticles();
    
    // Sort by created date (newest first)
    usort($articles, function($a, $b) {
        return strtotime($b['created']) - strtotime($a['created']);
    });
    
    echo json_encode([
        'success' => true,
        'articles' => $articles
    ]);
}

/**
 * Get a single article (public or admin)
 */
function getArticle() {
    // Get article ID from request
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['id'])) {
        echo json_encode(['success' => false, 'error' => 'Missing article ID']);
        return;
    }
    
    $articleId = $data['id'];
    
    // Check if admin token is provided (for draft articles)
    $isAdmin = false;
    if (isset($data['token'])) {
        $userId = verifyToken($data['token']);
        if ($userId) {
            $isAdmin = isUserAdmin($userId);
        }
    }
    
    // Load the article
    $article = getArticleById($articleId);
    
    if (!$article) {
        echo json_encode(['success' => false, 'error' => 'Article not found']);
        return;
    }
    
    // If article is draft and user is not admin, deny access
    if ($article['status'] === 'draft' && !$isAdmin) {
        echo json_encode(['success' => false, 'error' => 'Article not found']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'article' => $article
    ]);
}

/**
 * Save an article (create or update)
 */
function saveArticle() {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validate token (admin only)
    if (!$data || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing token']);
        return;
    }
    
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        return;
    }
    
    // Check if user is admin
    if (!isUserAdmin($userId)) {
        echo json_encode(['success' => false, 'error' => 'Permission denied']);
        return;
    }
    
    // Validate required fields
    if (!isset($data['title']) || !isset($data['content']) || !isset($data['summary']) || !isset($data['status'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Load all articles
    $articles = loadArticles();
    
    // Check if this is an update or new article
    $isNew = empty($data['id']);
    $articleId = $isNew ? generateId() : $data['id'];
    
    // Find article index if it's an update
    $articleIndex = -1;
    if (!$isNew) {
        foreach ($articles as $index => $article) {
            if ($article['id'] === $articleId) {
                $articleIndex = $index;
                break;
            }
        }
        
        if ($articleIndex === -1) {
            echo json_encode(['success' => false, 'error' => 'Article not found']);
            return;
        }
    }
    
    // Create article object
    $article = [
        'id' => $articleId,
        'title' => $data['title'],
        'summary' => $data['summary'],
        'content' => $data['content'],
        'status' => $data['status'],
        'authorId' => $userId,
        'created' => $isNew ? date('c') : $articles[$articleIndex]['created'],
        'updated' => date('c')
    ];
    
    // Save the article
    if ($isNew) {
        $articles[] = $article;
    } else {
        $articles[$articleIndex] = $article;
    }
    
    // Save all articles to file
    saveArticles($articles);
    
    echo json_encode([
        'success' => true,
        'article' => $article,
        'isNew' => $isNew
    ]);
}

/**
 * Delete an article
 */
function deleteArticle() {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validate token (admin only)
    if (!$data || !isset($data['token']) || !isset($data['id'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        return;
    }
    
    // Check if user is admin
    if (!isUserAdmin($userId)) {
        echo json_encode(['success' => false, 'error' => 'Permission denied']);
        return;
    }
    
    $articleId = $data['id'];
    
    // Load all articles
    $articles = loadArticles();
    
    // Find the article
    $found = false;
    foreach ($articles as $index => $article) {
        if ($article['id'] === $articleId) {
            // Remove the article
            array_splice($articles, $index, 1);
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        echo json_encode(['success' => false, 'error' => 'Article not found']);
        return;
    }
    
    // Save updated articles list
    saveArticles($articles);
    
    echo json_encode([
        'success' => true
    ]);
}

/**
 * Get published articles for front page (public)
 */
function getFrontPageArticles() {
    // Load all articles
    $articles = loadArticles();
    
    // Filter to only published articles
    $published = array_filter($articles, function($article) {
        return $article['status'] === 'published';
    });
    
    // Sort by created date (newest first)
    usort($published, function($a, $b) {
        return strtotime($b['created']) - strtotime($a['created']);
    });
    
    // Limit to recent articles (e.g., 6 most recent)
    $limit = 6;
    $published = array_slice($published, 0, $limit);
    
    echo json_encode([
        'success' => true,
        'articles' => $published
    ]);
}

/**
 * Load all articles from storage
 */
function loadArticles() {
    if (!file_exists(ARTICLES_FILE)) {
        return [];
    }
    
    $articlesData = file_get_contents(ARTICLES_FILE);
    $articles = json_decode($articlesData, true);
    
    return is_array($articles) ? $articles : [];
}

/**
 * Save all articles to storage
 */
function saveArticles($articles) {
    $articlesData = json_encode($articles, JSON_PRETTY_PRINT);
    file_put_contents(ARTICLES_FILE, $articlesData);
}

/**
 * Get article by ID
 */
function getArticleById($id) {
    $articles = loadArticles();
    
    foreach ($articles as $article) {
        if ($article['id'] === $id) {
            return $article;
        }
    }
    
    return null;
}

/**
 * Generate a unique ID
 */
function generateId() {
    return bin2hex(random_bytes(8));
}

/**
 * Verify token and get user ID (from forum system)
 * @param string $token JWT token
 * @return string|false User ID or false if invalid
 */
function verifyToken($token) {
    try {
        $tokenData = json_decode(base64_decode($token), true);
        
        if (!$tokenData || !isset($tokenData["userId"]) || !isset($tokenData["exp"])) {
            return false;
        }
        
        // Check expiration
        if ($tokenData["exp"] < time()) {
            return false;
        }
        
        return $tokenData["userId"];
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Check if user is admin
 * @param string $userId User ID
 * @return bool Is admin
 */
function isUserAdmin($userId) {
    // Load users file
    $usersFile = DATA_DIR . '/users.json.enc';
    if (!file_exists($usersFile)) {
        return false;
    }
    
    // Get today's encryption key
    $today = date('Y-m-d');
    $baseSecret = "S3cure#F0rum#System#2025";
    $encryptionKey = hash('sha256', $baseSecret . $today);
    
    // Read encrypted data
    $encryptedData = file_get_contents($usersFile);
    
    // Try to decrypt data
    $decryptedData = decryptData($encryptedData, $encryptionKey);
    $users = json_decode($decryptedData, true);
    
    if (!is_array($users)) {
        return false;
    }
    
    // Check if user is admin
    foreach ($users as $user) {
        if ($user['id'] === $userId && isset($user['role']) && $user['role'] === 'admin') {
            return true;
        }
    }
    
    return false;
}

/**
 * Decrypt data (from forum system)
 * @param string $encryptedData Encrypted data
 * @param string $key Encryption key
 * @return string Decrypted data
 */
function decryptData($encryptedData, $key) {
    try {
        // Create decryption key from password
        $decKey = substr(hash('sha256', $key, true), 0, 32);
        
        // Decode from base64
        $data = base64_decode($encryptedData);
        
        if ($data === false) {
            // Not encrypted, return as is
            return $encryptedData;
        }
        
        // Extract IV (first 16 bytes)
        $iv = substr($data, 0, 16);
        
        // Extract the encrypted data (everything after IV)
        $encrypted = substr($data, 16);
        
        // Decrypt
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $decKey, 0, $iv);
        
        if ($decrypted === false) {
            // Failed to decrypt, return original
            return $encryptedData;
        }
        
        return $decrypted;
    } catch (Exception $e) {
        // On error, return original data
        return $encryptedData;
    }
}
