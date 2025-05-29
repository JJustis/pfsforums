<?php
/**
 * Simplified Article API
 * Basic version to ensure proper functionality
 */

// Set content type to JSON
header('Content-Type: application/json');

// Define data paths
define('DATA_DIR', 'data');
define('ARTICLES_FILE', DATA_DIR . '/articles.json');

// Create data directory if it doesn't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Get the requested action
$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    // Handle different actions
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
            
        case 'get_front_articles':
            getFrontPageArticles();
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    // Handle exceptions
    error_log('Article API Error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

/**
 * Get all articles
 */
function getArticles() {
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Check for token (simplified validation)
    if (!isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Authentication required']);
        return;
    }
    
    // In a real implementation, verify the token here
    // For now, we'll assume the token is valid
    
    // Load articles
    $articles = loadArticles();
    
    // Sort by date, newest first
    usort($articles, function($a, $b) {
        return strtotime($b['created']) - strtotime($a['created']);
    });
    
    echo json_encode([
        'success' => true,
        'articles' => $articles
    ]);
}

/**
 * Get a single article
 */
function getArticle() {
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Check for article ID
    if (!isset($data['id'])) {
        echo json_encode(['success' => false, 'error' => 'Article ID required']);
        return;
    }
    
    $articleId = $data['id'];
    
    // Load articles
    $articles = loadArticles();
    
    // Find the requested article
    $article = null;
    foreach ($articles as $a) {
        if ($a['id'] === $articleId) {
            $article = $a;
            break;
        }
    }
    
    if (!$article) {
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
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Basic validation
    if (!isset($data['token']) || !isset($data['title']) || !isset($data['content']) || !isset($data['summary'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Load articles
    $articles = loadArticles();
    
    // Check if creating new or updating existing
    $isNew = empty($data['id']);
    $articleId = $isNew ? generateId() : $data['id'];
    
    // Build article data
    $articleData = [
        'id' => $articleId,
        'title' => $data['title'],
        'summary' => $data['summary'],
        'content' => $data['content'],
        'status' => isset($data['status']) ? $data['status'] : 'published',
        'created' => $isNew ? date('c') : '',
        'updated' => date('c')
    ];
    
    // If updating, keep original created date
    if (!$isNew) {
        foreach ($articles as $article) {
            if ($article['id'] === $articleId) {
                $articleData['created'] = $article['created'];
                break;
            }
        }
    }
    
    // Add or update article in the array
    $updated = false;
    foreach ($articles as $key => $article) {
        if ($article['id'] === $articleId) {
            $articles[$key] = $articleData;
            $updated = true;
            break;
        }
    }
    
    if (!$updated) {
        $articles[] = $articleData;
    }
    
    // Save articles
    saveArticles($articles);
    
    echo json_encode([
        'success' => true,
        'article' => $articleData,
        'isNew' => $isNew
    ]);
}

/**
 * Delete an article
 */
function deleteArticle() {
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Basic validation
    if (!isset($data['token']) || !isset($data['id'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    $articleId = $data['id'];
    
    // Load articles
    $articles = loadArticles();
    
    // Remove the specified article
    $updated = false;
    foreach ($articles as $key => $article) {
        if ($article['id'] === $articleId) {
            unset($articles[$key]);
            $updated = true;
            break;
        }
    }
    
    // Reindex array
    $articles = array_values($articles);
    
    // Save articles
    saveArticles($articles);
    
    echo json_encode([
        'success' => true,
        'deleted' => $updated
    ]);
}

/**
 * Get published articles for the front page
 */
function getFrontPageArticles() {
    // Load articles
    $articles = loadArticles();
    
    // Filter to only published articles
    $published = [];
    foreach ($articles as $article) {
        if (isset($article['status']) && $article['status'] === 'published') {
            $published[] = $article;
        }
    }
    
    // Sort by date, newest first
    usort($published, function($a, $b) {
        return strtotime($b['created']) - strtotime($a['created']);
    });
    
    // Limit to most recent 6
    $published = array_slice($published, 0, 6);
    
    echo json_encode([
        'success' => true,
        'articles' => $published
    ]);
}

/**
 * Load articles from file
 */
function loadArticles() {
    if (!file_exists(ARTICLES_FILE)) {
        return [];
    }
    
    $json = file_get_contents(ARTICLES_FILE);
    $data = json_decode($json, true);
    
    return is_array($data) ? $data : [];
}

/**
 * Save articles to file
 */
function saveArticles($articles) {
    $json = json_encode($articles, JSON_PRETTY_PRINT);
    file_put_contents(ARTICLES_FILE, $json);
}

/**
 * Generate a unique ID
 */
function generateId() {
    return uniqid();
}
