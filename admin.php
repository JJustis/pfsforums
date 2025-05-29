<?php
// Admin Article Management System with Magic ID Authentication

// Start session properly
session_start();

// Set content type
header('Content-Type: text/html; charset=UTF-8');

// Define the magic ID (40 characters)
define('MAGIC_ID', '8f7d56a1c940e96b23c59363ef5de2b7ac6014e8'); // You should change this to your own random 40-char string

// Check if user is authenticated with magic ID
$isLoggedIn = false;
$loginError = null;

// Process magic ID login
if (isset($_POST['magic_id'])) {
    $submittedId = trim($_POST['magic_id']);
    
    if ($submittedId === MAGIC_ID) {
        // Store authentication in session
        $_SESSION['magic_admin'] = true;
        $isLoggedIn = true;
    } else {
        $loginError = 'Invalid magic ID. Please try again.';
    }
}

// Allow direct access via URL for initial setup (for testing only - remove in production)
if (isset($_GET['magic_key']) && $_GET['magic_key'] === MAGIC_ID) {
    $_SESSION['magic_admin'] = true;
    $isLoggedIn = true;
}

// Check existing session
if (isset($_SESSION['magic_admin']) && $_SESSION['magic_admin'] === true) {
    $isLoggedIn = true;
}

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    // Clear the entire session
    session_unset();
    session_destroy();
    
    // Redirect to prevent resubmission
    header('Location: admin.php');
    exit;
}

// Create data directory if it doesn't exist
define('DATA_DIR', 'data');
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Define article storage
define('ARTICLES_DIR', DATA_DIR . '/articles');
if (!file_exists(ARTICLES_DIR)) {
    mkdir(ARTICLES_DIR, 0755, true);
}
define('ARTICLES_INDEX_FILE', DATA_DIR . '/articles_index.json');

// Helper function to create URL-friendly slug
function createSlug($text) {
    // Replace non letter or digits by -
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    // Transliterate
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    // Remove unwanted characters
    $text = preg_replace('~[^-\w]+~', '', $text);
    // Trim
    $text = trim($text, '-');
    // Remove duplicate -
    $text = preg_replace('~-+~', '-', $text);
    // Lowercase
    $text = strtolower($text);
    
    return $text;
}

// Function to load unencrypted JSON data
function loadData($file) {
    if (!file_exists($file)) {
        // Create empty file with default structure
        $defaultData = [];
        saveData($file, $defaultData);
        return $defaultData;
    }
    
    // Read file contents
    $jsonData = file_get_contents($file);
    $data = json_decode($jsonData, true);
    
    return $data ?: [];
}

// Function to save unencrypted JSON data
function saveData($file, $data) {
    // Create directory if needed
    $dir = dirname($file);
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // Convert data to JSON with pretty formatting
    $jsonData = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    // Save as plain text JSON
    return file_put_contents($file, $jsonData);
}

// Process article operations
$message = '';
$articleFormData = null;

if ($isLoggedIn) {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'create_article':
            case 'update_article':
                // Validate article data
                if (!isset($_POST['title']) || trim($_POST['title']) === '') {
                    $message = 'Title is required';
                    break;
                }
                
                // Generate timestamp for new articles
                $timestamp = isset($_POST['created']) && $_POST['action'] === 'update_article' 
                    ? strtotime($_POST['created']) 
                    : time();
                
                // Create slug from title
                $titleSlug = createSlug($_POST['title']);
                
                // Prepare article ID - for new articles, use timestamp and slug
                if ($_POST['action'] === 'create_article' || empty($_POST['article_id'])) {
                    $articleId = $timestamp . '_' . $titleSlug;
                } else {
                    $articleId = $_POST['article_id'];
                }
                
                // Prepare article data
                $article = [
                    'id' => $articleId,
                    'title' => $_POST['title'],
                    'slug' => $titleSlug,
                    'content' => isset($_POST['content']) ? $_POST['content'] : '',
                    'category' => isset($_POST['category']) ? $_POST['category'] : 'Technology',
                    'tags' => isset($_POST['tags']) ? explode(',', $_POST['tags']) : [],
                    'effectiveness_score' => isset($_POST['effectiveness_score']) ? intval($_POST['effectiveness_score']) : 50,
                    'featured_image' => isset($_POST['featured_image']) ? $_POST['featured_image'] : '',
                    'author' => isset($_POST['author']) ? $_POST['author'] : 'Admin',
                    'authorId' => 'admin',
                    'timestamp' => $timestamp,
                    'created' => date('c', $timestamp),
                    'updated' => date('c'),
                    'read_time' => isset($_POST['read_time']) ? $_POST['read_time'] : '1min read',
                    'comment_count' => isset($_POST['comment_count']) ? intval($_POST['comment_count']) : 0,
                    'share_count' => isset($_POST['share_count']) ? intval($_POST['share_count']) : 0,
                    'status' => isset($_POST['status']) ? $_POST['status'] : 'published'
                ];
                
                // Save article file (unencrypted)
                $articleFile = ARTICLES_DIR . '/' . $articleId . '.json';
                saveData($articleFile, $article);
                
                // Update articles index
                $articlesIndex = loadData(ARTICLES_INDEX_FILE);
                
                // Check if article already exists in index
                $found = false;
                foreach ($articlesIndex as $key => $indexItem) {
                    if ($indexItem['id'] === $articleId) {
                        $articlesIndex[$key] = [
                            'id' => $articleId,
                            'title' => $article['title'],
                            'slug' => $article['slug'],
                            'category' => $article['category'],
                            'author' => $article['author'],
                            'timestamp' => $article['timestamp'],
                            'created' => $article['created'],
                            'updated' => $article['updated'],
                            'status' => $article['status']
                        ];
                        $found = true;
                        break;
                    }
                }
                
                if (!$found) {
                    $articlesIndex[] = [
                        'id' => $articleId,
                        'title' => $article['title'],
                        'slug' => $article['slug'],
                        'category' => $article['category'],
                        'author' => $article['author'],
                        'timestamp' => $article['timestamp'],
                        'created' => $article['created'],
                        'updated' => $article['updated'],
                        'status' => $article['status']
                    ];
                }
                
                // Sort by timestamp (newest first)
                usort($articlesIndex, function($a, $b) {
                    return $b['timestamp'] - $a['timestamp'];
                });
                
                saveData(ARTICLES_INDEX_FILE, $articlesIndex);
                
                // Redirect to prevent form resubmission
                header('Location: admin.php?message=' . urlencode($_POST['action'] === 'create_article' ? 
                    'Article created successfully' : 'Article updated successfully'));
                exit;
                
            case 'delete_article':
                if (!isset($_POST['article_id']) || empty($_POST['article_id'])) {
                    $message = 'Article ID is required for deletion';
                    break;
                }
                
                $articleId = $_POST['article_id'];
                $articleFile = ARTICLES_DIR . '/' . $articleId . '.json';
                
                // Delete article file
                if (file_exists($articleFile)) {
                    unlink($articleFile);
                }
                
                // Update articles index
                $articlesIndex = loadData(ARTICLES_INDEX_FILE);
                $newIndex = [];
                
                foreach ($articlesIndex as $indexItem) {
                    if ($indexItem['id'] !== $articleId) {
                        $newIndex[] = $indexItem;
                    }
                }
                
                saveData(ARTICLES_INDEX_FILE, $newIndex);
                
                // Redirect to prevent form resubmission
                header('Location: admin.php?message=' . urlencode('Article deleted successfully'));
                exit;
        }
    }
    
    // Check for success message in URL
    if (isset($_GET['message'])) {
        $message = $_GET['message'];
    }
    
    // Load article for editing
    if (isset($_GET['edit']) && !empty($_GET['edit'])) {
        $articleId = $_GET['edit'];
        $articleFile = ARTICLES_DIR . '/' . $articleId . '.json';
        
        if (file_exists($articleFile)) {
            $articleFormData = loadData($articleFile);
        }
    }
}

// Load articles for display
$articles = [];
if ($isLoggedIn) {
    // Load articles index
    if (file_exists(ARTICLES_INDEX_FILE)) {
        $articlesIndex = loadData(ARTICLES_INDEX_FILE);
        
        // Sort by timestamp (newest first)
        usort($articlesIndex, function($a, $b) {
            return $b['timestamp'] - $a['timestamp'];
        });
        
        $articles = $articlesIndex;
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Article Admin Panel</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="article-styles.css">
    <link rel="stylesheet" href="dark-theme-styles.css">
    <style>
        /* Admin styles */
        .admin-container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background-color: var(--bg-color, #fff);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
        }
        
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color, #eee);
        }
        
        .admin-title {
            margin: 0;
            font-size: 1.8rem;
            color: var(--text-color, #333);
        }
        
        .admin-actions {
            display: flex;
            gap: 10px;
        }
        
        .login-form {
            max-width: 400px;
            margin: 50px auto;
            padding: 20px;
            background-color: var(--bg-color, #fff);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .message {
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
            text-align: center;
        }
        
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .article-list {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .article-list th,
        .article-list td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid var(--border-color, #eee);
        }
        
        .article-list th {
            background-color: var(--primary-light, #f5f5f5);
            font-weight: 600;
        }
        
        .article-list tr:hover {
            background-color: var(--hover-color, #f9f9f9);
        }
        
        .article-actions {
            display: flex;
            gap: 5px;
        }
        
        .article-form {
            margin-top: 20px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: var(--text-color, #333);
        }
        
        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--border-color, #ddd);
            border-radius: 4px;
            font-size: 1rem;
            background-color: var(--input-bg, #fff);
            color: var(--text-color, #333);
        }
        
        .form-row {
            display: flex;
            gap: 15px;
        }
        
        .form-row .form-group {
            flex: 1;
        }
        
        textarea.form-control {
            min-height: 150px;
            resize: vertical;
        }
        
        .edit-mode-toggle {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding: 10px;
            background-color: var(--info-bg, #e3f2fd);
            border-radius: 4px;
        }
        
        .edit-mode-toggle label {
            margin-left: 10px;
            font-weight: 600;
        }
        
        /* Admin-specific dark theme adjustments */
        [data-theme="dark"] .admin-container {
            background-color: #1a1a2e;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        }
        
        [data-theme="dark"] .article-list th {
            background-color: #16213e;
        }
        
        [data-theme="dark"] .article-list tr:hover {
            background-color: #1f1f3d;
        }
        
        [data-theme="dark"] .login-form {
            background-color: #1a1a2e;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        }
        
        [data-theme="dark"] .form-control {
            background-color: #0f3460;
            border-color: #16213e;
            color: #e7e7e7;
        }
        
        [data-theme="dark"] .success {
            background-color: #054a29;
            color: #a3e635;
            border-color: #065f46;
        }
        
        [data-theme="dark"] .error {
            background-color: #4c0519;
            color: #fda4af;
            border-color: #7f1d1d;
        }
        
        [data-theme="dark"] .edit-mode-toggle {
            background-color: #1e3a8a;
        }
        
        .login-options {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #eee;
        }
        
        .magic-button {
            display: inline-block;
            background: none;
            border: none;
            color: #2196F3;
            text-decoration: underline;
            cursor: pointer;
            padding: 0;
            font-size: 0.9em;
        }
        
        .magic-button:hover {
            color: #0b7dda;
        }
    </style>
</head>
<body>
    <?php if (!$isLoggedIn): ?>
    <!-- Magic ID Login Form -->
    <div class="login-form">
        <div class="login-header">
            <h2><i class="fas fa-lock"></i> Admin Access</h2>
        </div>
        
        <?php if (isset($loginError)): ?>
        <div class="message error">
            <?php echo htmlspecialchars($loginError); ?>
        </div>
        <?php endif; ?>
        
        <form method="post" action="admin.php">
            <div class="form-group">
                <label for="magic_id">Magic ID</label>
                <input type="text" id="magic_id" name="magic_id" class="form-control" placeholder="Enter the 40-character magic ID" required>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-unlock"></i> Access Admin Panel
            </button>
            
            <div class="form-footer" style="margin-top: 15px; text-align: center;">
                <a href="index.php">Back to Home</a>
            </div>
        </form>
    </div>
    <?php else: ?>
    <!-- Admin Dashboard -->
    <div class="admin-container">
        <div class="admin-header">
            <h1 class="admin-title"><i class="fas fa-newspaper"></i> Article Admin</h1>
            <div class="admin-actions">
                <a href="index.php" class="btn btn-secondary">
                    <i class="fas fa-home"></i> Back to Home
                </a>
                <a href="admin.php?action=logout" class="btn btn-danger">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        </div>
        
        <?php if (!empty($message)): ?>
        <div class="message success">
            <?php echo htmlspecialchars($message); ?>
        </div>
        <?php endif; ?>
        
        <!-- Article List -->
        <div class="section">
            <h2><i class="fas fa-list"></i> Article Management</h2>
            
            <div class="actions" style="margin-bottom: 15px;">
                <a href="admin.php" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Create New Article
                </a>
            </div>
            
            <?php if (empty($articles)): ?>
            <p>No articles found. Create your first article!</p>
            <?php else: ?>
            <table class="article-list">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Author</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($articles as $article): ?>
                    <tr>
                        <td>
                            <a href="article.php?id=<?php echo htmlspecialchars($article['id']); ?>" target="_blank">
                                <?php echo htmlspecialchars($article['title']); ?>
                            </a>
                        </td>
                        <td><?php echo htmlspecialchars($article['category']); ?></td>
                        <td><?php echo htmlspecialchars($article['author']); ?></td>
                        <td><?php echo date('M j, Y', strtotime($article['created'])); ?></td>
                        <td><?php echo ucfirst(htmlspecialchars($article['status'])); ?></td>
                        <td class="article-actions">
                            <a href="admin.php?edit=<?php echo htmlspecialchars($article['id']); ?>" class="btn btn-sm btn-primary">
                                <i class="fas fa-edit"></i> Edit
                            </a>
                            
                            <form method="post" action="admin.php" onsubmit="return confirm('Are you sure you want to delete this article?');" style="display: inline;">
                                <input type="hidden" name="action" value="delete_article">
                                <input type="hidden" name="article_id" value="<?php echo htmlspecialchars($article['id']); ?>">
                                <button type="submit" class="btn btn-sm btn-danger">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </form>
                            
                            <a href="article.php?id=<?php echo htmlspecialchars($article['id']); ?>" class="btn btn-sm btn-info" target="_blank">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php endif; ?>
        </div>
        
        <!-- Article Form -->
        <div class="section">
            <h2>
                <?php echo $articleFormData ? '<i class="fas fa-edit"></i> Edit Article' : '<i class="fas fa-plus"></i> Create New Article'; ?>
            </h2>
            
            <div class="edit-mode-toggle">
                <input type="checkbox" id="edit-article-mode" class="toggle-input">
                <label for="edit-article-mode">Enable Visual Editor Mode</label>
                <span style="margin-left: 10px; font-size: 0.85rem; color: var(--text-muted);">
                    (Visual editor will activate after saving)
                </span>
            </div>
            
            <form method="post" action="admin.php" class="article-form">
                <input type="hidden" name="action" value="<?php echo $articleFormData ? 'update_article' : 'create_article'; ?>">
                <?php if ($articleFormData): ?>
                <input type="hidden" name="article_id" value="<?php echo htmlspecialchars($articleFormData['id']); ?>">
                <input type="hidden" name="created" value="<?php echo htmlspecialchars($articleFormData['created']); ?>">
                <?php endif; ?>
                
                <div class="form-group">
                    <label for="title">Title</label>
                    <input type="text" id="title" name="title" class="form-control" value="<?php echo $articleFormData ? htmlspecialchars($articleFormData['title']) : ''; ?>" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="category">Category</label>
                        <select id="category" name="category" class="form-control">
                            <option value="Technology" <?php echo ($articleFormData && $articleFormData['category'] === 'Technology') ? 'selected' : ''; ?>>Technology</option>
                            <option value="Business" <?php echo ($articleFormData && $articleFormData['category'] === 'Business') ? 'selected' : ''; ?>>Business</option>
                            <option value="Science" <?php echo ($articleFormData && $articleFormData['category'] === 'Science') ? 'selected' : ''; ?>>Science</option>
                            <option value="Health" <?php echo ($articleFormData && $articleFormData['category'] === 'Health') ? 'selected' : ''; ?>>Health</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="status">Status</label>
                        <select id="status" name="status" class="form-control">
                            <option value="published" <?php echo ($articleFormData && $articleFormData['status'] === 'published') ? 'selected' : ''; ?>>Published</option>
                            <option value="draft" <?php echo ($articleFormData && $articleFormData['status'] === 'draft') ? 'selected' : ''; ?>>Draft</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="author">Author</label>
                        <input type="text" id="author" name="author" class="form-control" value="<?php echo $articleFormData ? htmlspecialchars($articleFormData['author']) : 'Admin'; ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="read_time">Read Time</label>
                        <input type="text" id="read_time" name="read_time" class="form-control" value="<?php echo $articleFormData ? htmlspecialchars($articleFormData['read_time']) : '1min read'; ?>">
                    </div>
                    
                    <div class="form-group">
                        <label for="comment_count">Comment Count</label>
                        <input type="number" id="comment_count" name="comment_count" class="form-control" min="0" value="<?php echo $articleFormData ? intval($articleFormData['comment_count']) : 0; ?>">
                    </div>
                    
                    <div class="form-group">
                        <label for="share_count">Share Count</label>
                        <input type="number" id="share_count" name="share_count" class="form-control" min="0" value="<?php echo $articleFormData ? intval($articleFormData['share_count']) : 0; ?>">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="featured_image">Featured Image URL</label>
                    <input type="text" id="featured_image" name="featured_image" class="form-control" value="<?php echo $articleFormData ? htmlspecialchars($articleFormData['featured_image']) : ''; ?>" placeholder="https://example.com/image.jpg">
                </div>
                
                <div class="form-group">
                    <label for="content">Content</label>
                    <textarea id="content" name="content" class="form-control" rows="10"><?php echo $articleFormData ? htmlspecialchars($articleFormData['content']) : ''; ?></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="tags">Tags (comma separated)</label>
                        <input type="text" id="tags" name="tags" class="form-control" value="<?php echo $articleFormData ? htmlspecialchars(implode(', ', $articleFormData['tags'])) : ''; ?>" placeholder="tag1, tag2, tag3">
                    </div>
                    
                    <div class="form-group">
                        <label for="effectiveness_score">Effectiveness Score (1-100)</label>
                        <input type="number" id="effectiveness_score" name="effectiveness_score" class="form-control" min="1" max="100" value="<?php echo $articleFormData ? intval($articleFormData['effectiveness_score']) : 50; ?>">
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> <?php echo $articleFormData ? 'Update Article' : 'Create Article'; ?>
                    </button>
                    
                    <?php if ($articleFormData): ?>
                    <a href="admin.php" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </a>
                    <?php endif; ?>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Include Admin Editor JS -->
    <script>
        // Article Admin Editor from paste.txt
        // Initialize article admin editor
        function initArticleEditor() {
            const adminMode = document.getElementById('edit-article-mode');
            const articleContainer = document.querySelector('.article-container');
            
            if (!adminMode || !articleContainer) return;
            
            let currentlyEditing = null;
            let originalContent = {};
            
            // Toggle admin editing mode
            adminMode.addEventListener('change', function() {
                if (this.checked) {
                    articleContainer.classList.add('admin-mode');
                    enableEditableElements();
                } else {
                    articleContainer.classList.remove('admin-mode');
                    disableEditableElements();
                }
            });
            
            // Enable all editable elements
            function enableEditableElements() {
                const editables = document.querySelectorAll('[data-editable]');
                
                editables.forEach(element => {
                    element.addEventListener('click', startEditing);
                });
                
                // Create edit toolbar
                const toolbar = document.createElement('div');
                toolbar.className = 'edit-toolbar hidden';
                toolbar.innerHTML = `
                    <button class="save-btn">Save Changes</button>
                    <button class="cancel-btn">Cancel</button>
                `;
                document.body.appendChild(toolbar);
                
                // Add toolbar button event listeners
                toolbar.querySelector('.save-btn').addEventListener('click', saveChanges);
                toolbar.querySelector('.cancel-btn').addEventListener('click', cancelEditing);
            }
            
            // Disable all editable elements
            function disableEditableElements() {
                const editables = document.querySelectorAll('[data-editable]');
                
                editables.forEach(element => {
                    element.removeEventListener('click', startEditing);
                });
                
                // Remove edit toolbar
                const toolbar = document.querySelector('.edit-toolbar');
                if (toolbar) {
                    document.body.removeChild(toolbar);
                }
            }
            
            // Start editing an element
            function startEditing(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // If already editing, save changes first
                if (currentlyEditing) {
                    saveChanges();
                }
                
                currentlyEditing = this;
                currentlyEditing.classList.add('editing');
                
                // Store original content for cancel operation
                originalContent = {
                    html: currentlyEditing.innerHTML,
                    text: currentlyEditing.textContent.trim()
                };
                
                // Create editor based on data type
                const editType = currentlyEditing.getAttribute('data-editable');
                const fieldName = currentlyEditing.getAttribute('data-field');
                
                switch (editType) {
                    case 'text':
                        createTextEditor(currentlyEditing, originalContent.text);
                        break;
                    case 'richtext':
                        createRichTextEditor(currentlyEditing, originalContent.html);
                        break;
                    case 'image':
                        createImageEditor(currentlyEditing);
                        break;
                    case 'tags':
                        createTagsEditor(currentlyEditing);
                        break;
                    case 'score':
                        createScoreEditor(currentlyEditing, originalContent.text);
                        break;
                    case 'date':
                        createDateEditor(currentlyEditing, originalContent.text);
                        break;
                    case 'category':
                        createCategoryEditor(currentlyEditing, originalContent.text);
                        break;
                    case 'number':
                        createNumberEditor(currentlyEditing, originalContent.text);
                        break;
                    case 'related':
                        createRelatedArticlesEditor(currentlyEditing);
                        break;
                    case 'sponsored':
                        createSponsoredContentEditor(currentlyEditing);
                        break;
                    case 'section':
                        createSectionEditor(currentlyEditing);
                        break;
                }
                
                // Show toolbar
                const toolbar = document.querySelector('.edit-toolbar');
                if (toolbar) {
                    toolbar.classList.remove('hidden');
                }
            }
            
            // Create simple text editor
            function createTextEditor(element, value) {
                element.innerHTML = `<input type="text" class="inline-editor" value="${value}">`;
                const input = element.querySelector('input');
                input.focus();
                
                // Prevent event propagation
                input.addEventListener('click', e => e.stopPropagation());
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        saveChanges();
                    } else if (e.key === 'Escape') {
                        cancelEditing();
                    }
                });
            }
            
            // Create rich text editor
            function createRichTextEditor(element, html) {
                element.innerHTML = `<textarea class="richtext-editor" rows="5">${html}</textarea>`;
                const textarea = element.querySelector('textarea');
                textarea.focus();
                
                // Prevent event propagation
                textarea.addEventListener('click', e => e.stopPropagation());
                textarea.addEventListener('keydown', e => {
                    if (e.key === 'Escape') {
                        cancelEditing();
                    }
                });
            }
            
            // Create image editor
            function createImageEditor(element) {
                const currentImage = element.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
                
                element.innerHTML = `
                    <div class="image-editor">
                        <input type="text" class="image-url" value="${currentImage}" placeholder="Image URL">
                        <div class="upload-controls">
                            <input type="file" class="image-upload" accept="image/*">
                            <button class="upload-btn">Upload New Image</button>
                        </div>
                    </div>
                `;
                
                const urlInput = element.querySelector('.image-url');
                const fileInput = element.querySelector('.image-upload');
                const uploadBtn = element.querySelector('.upload-btn');
                
                // Prevent event propagation
                element.querySelector('.image-editor').addEventListener('click', e => e.stopPropagation());
                
                // Setup upload button
                uploadBtn.addEventListener('click', () => {
                    fileInput.click();
                });
                
                // Handle file upload
                fileInput.addEventListener('change', e => {
                    if (e.target.files && e.target.files[0]) {
                        // This would normally upload to your server, but we'll do a simple preview
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            urlInput.value = event.target.result;
                        };
                        reader.readAsDataURL(e.target.files[0]);
                    }
                });
            }
            
            // Create tags editor
            function createTagsEditor(element) {
                // Get current tags
                const tags = Array.from(element.querySelectorAll('.article-tag'))
                    .map(tag => tag.textContent.trim().replace('#', ''));
                
                element.innerHTML = `
                    <div class="tags-editor">
                        <input type="text" class="tags-input" value="${tags.join(', ')}" placeholder="Enter tags separated by commas">
                        <small>Enter tags separated by commas</small>
                    </div>
                `;
                
                // Prevent event propagation
                element.querySelector('.tags-editor').addEventListener('click', e => e.stopPropagation());
            }
            
            // Create score editor
            function createScoreEditor(element, value) {
                element.innerHTML = `
                    <div class="score-editor">
                        <input type="range" min="1" max="100" value="${value}" class="score-range">
                        <span class="score-value">${value}</span>
                    </div>
                `;
                
                const rangeInput = element.querySelector('.score-range');
                const valueSpan = element.querySelector('.score-value');
                
                // Update value display when slider changes
                rangeInput.addEventListener('input', () => {
                    valueSpan.textContent = rangeInput.value;
                    
                    // Update effectiveness class
                    const score = parseInt(rangeInput.value);
                    element.className = 'score-circle';
                    
                    if (score >= 100) {
                        element.classList.add('high-effectiveness');
                    } else if (score >= 50) {
                        element.classList.add('medium-effectiveness');
                    } else {
                        element.classList.add('low-effectiveness');
                    }
                });
                
                // Prevent event propagation
                element.querySelector('.score-editor').addEventListener('click', e => e.stopPropagation());
            }
            
            // Create date editor
            function createDateEditor(element, value) {
                const dateValue = element.getAttribute('data-time') || '';
                
                element.innerHTML = `
                    <div class="date-editor">
                        <input type="datetime-local" class="date-input" value="${dateValue.replace(/\+.*$/, '')}">
                    </div>
                `;
                
                // Prevent event propagation
                element.querySelector('.date-editor').addEventListener('click', e => e.stopPropagation());
            }
            
            // Create category editor
            function createCategoryEditor(element, value) {
                element.innerHTML = `
                    <div class="category-editor">
                        <select class="category-select">
                            <option value="technology" ${value.trim() === 'Technology' ? 'selected' : ''}>Technology</option>
                            <option value="business" ${value.trim() === 'Business' ? 'selected' : ''}>Business</option>
                            <option value="science" ${value.trim() === 'Science' ? 'selected' : ''}>Science</option>
                            <option value="health" ${value.trim() === 'Health' ? 'selected' : ''}>Health</option>
                        </select>
                    </div>
                `;
                
                // Prevent event propagation
                element.querySelector('.category-editor').addEventListener('click', e => e.stopPropagation());
            }
            
            // Create number editor
            function createNumberEditor(element, value) {
                element.innerHTML = `<input type="number" min="0" class="number-editor" value="${value}">`;
                const input = element.querySelector('input');
                input.focus();
                
                // Prevent event propagation
                input.addEventListener('click', e => e.stopPropagation());
            }
            
            // Create related articles editor
            function createRelatedArticlesEditor(element) {
                // This would normally fetch articles from your API
                // For now, we'll just create a simple editor for the existing ones
                
                const articles = Array.from(element.querySelectorAll('.related-article')).map(article => {
                    const title = article.querySelector('h4').textContent;
                    const imageUrl = article.querySelector('.related-image').style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
                    const category = article.querySelector('.related-category').textContent.trim();
                    const score = article.querySelector('.related-effectiveness').textContent.trim();
                    
                    return { title, imageUrl, category, score };
                });
                
                let articlesHtml = '';
                
                articles.forEach((article, index) => {
                    articlesHtml += `
                        <div class="related-article-edit">
                            <div class="form-group">
                                <label>Title</label>
                                <input type="text" class="related-title" value="${article.title}">
                            </div>
                            <div class="form-group">
                                <label>Image URL</label>
                                <input type="text" class="related-image-url" value="${article.imageUrl}">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Category</label>
                                    <select class="related-category">
                                        <option value="technology" ${article.category === 'Technology' ? 'selected' : ''}>Technology</option>
                                        <option value="business" ${article.category === 'Business' ? 'selected' : ''}>Business</option>
                                        <option value="science" ${article.category === 'Science' ? 'selected' : ''}>Science</option>
                                        <option value="health" ${article.category === 'Health' ? 'selected' : ''}>Health</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Score</label>
                                    <input type="number" class="related-score" min="1" max="100" value="${article.score}">
                                </div>
                            </div>
                            <button class="remove-related-btn">Remove</button>
                        </div>
                    `;
                });
                
                element.innerHTML = `
                    <div class="related-articles-editor">
                        <div class="related-articles-list">
                            ${articlesHtml}
                        </div>
                        <button class="add-related-btn">Add Related Article</button>
                    </div>
                `;
                
                // Prevent event propagation
                element.querySelector('.related-articles-editor').addEventListener('click', e => e.stopPropagation());
                
                // Add article button
                element.querySelector('.add-related-btn').addEventListener('click', e => {
                    e.preventDefault();
                    
                    const newArticle = document.createElement('div');
                    newArticle.className = 'related-article-edit';
                    newArticle.innerHTML = `
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" class="related-title" placeholder="Article Title">
                        </div>
                        <div class="form-group">
                            <label>Image URL</label>
                            <input type="text" class="related-image-url" placeholder="Image URL">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Category</label>
                                <select class="related-category">
                                    <option value="technology">Technology</option>
                                    <option value="business">Business</option>
                                    <option value="science">Science</option>
                                    <option value="health">Health</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Score</label>
                                <input type="number" class="related-score" min="1" max="100" value="50">
                            </div>
                        </div>
                        <button class="remove-related-btn">Remove</button>
                    `;
                    
                    element.querySelector('.related-articles-list').appendChild(newArticle);
                    
                    // Add remove button listener
                    newArticle.querySelector('.remove-related-btn').addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.parentElement.remove();
                    });
                });
                
                // Remove buttons
                element.querySelectorAll('.remove-related-btn').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.parentElement.remove();
                    });
                });
            }
            
            // Create sponsored content editor
            function createSponsoredContentEditor(element) {
                const title = element.querySelector('h4').textContent;
                const description = element.querySelector('p').textContent;
                const linkText = element.querySelector('a').textContent;
                const linkUrl = element.querySelector('a').getAttribute('href');
                const imageUrl = element.querySelector('.sponsored-image').style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
                
                element.innerHTML = `
                    <div class="sponsored-editor">
                        <div class="form-group">
                            <label>Image URL</label>
                            <input type="text" class="sponsored-image-url" value="${imageUrl}">
                        </div>
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" class="sponsored-title" value="${title}">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea class="sponsored-description">${description}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Button Text</label>
                                <input type="text" class="sponsored-btn-text" value="${linkText}">
                            </div>
                            <div class="form-group">
                                <label>Button URL</label>
                                <input type="text" class="sponsored-btn-url" value="${linkUrl}">
                            </div>
                        </div>
                    </div>
                `;
                
                // Prevent event propagation
                element.querySelector('.sponsored-editor').addEventListener('click', e => e.stopPropagation());
            }
            
            // Create section editor
            function createSectionEditor(element) {
                const title = element.querySelector('h3').textContent;
                const sectionType = element.getAttribute('data-section');
                
                element.innerHTML = `
                    <div class="section-editor">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Section Title</label>
                                <input type="text" class="section-title" value="${title}">
                            </div>
                            <div class="form-group">
                                <label>Visibility</label>
                                <select class="section-visibility">
                                    <option value="visible" selected>Visible</option>
                                    <option value="hidden">Hidden</option>
                                </select>
                            </div>
                        </div>
                    </div>
                `;
                
                // Restore original content after the section editor
                const originalChildren = document.createElement('div');
                originalChildren.innerHTML = originalContent.html;
                
                // Remove the h3 from the content
                const h3 = originalChildren.querySelector('h3');
                if (h3) {
                    h3.remove();
                }
                
                // Add remaining content back
                element.querySelector('.section-editor').appendChild(originalChildren);
                
                // Prevent event propagation
                element.querySelector('.section-editor').addEventListener('click', e => e.stopPropagation());
            }
            
            // Save changes
            function saveChanges() {
                if (!currentlyEditing) return;
                
                // Get the edit type and update accordingly
                const editType = currentlyEditing.getAttribute('data-editable');
                const fieldName = currentlyEditing.getAttribute('data-field');
                
                let newContent = '';
                
                switch (editType) {
                    case 'text':
                        const textInput = currentlyEditing.querySelector('input');
                        newContent = textInput.value;
                        currentlyEditing.innerHTML = newContent;
                        break;
                        
                    case 'richtext':
                        const textarea = currentlyEditing.querySelector('textarea');
                        newContent = textarea.value;
                        currentlyEditing.innerHTML = newContent;
                        break;
                        
                    case 'image':
                        const imageUrl = currentlyEditing.querySelector('.image-url').value;
                        currentlyEditing.style.backgroundImage = `url(${imageUrl})`;
                        currentlyEditing.innerHTML = '';
                        break;
                        
                    case 'tags':
                        const tagsInput = currentlyEditing.querySelector('.tags-input');
                        const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                        
                        newContent = tags.map(tag => {
                            return `<a href="?category=All Categories&amp;tags=${encodeURIComponent(tag)}" class="article-tag">#${tag}</a>`;
                        }).join('\n');
                        
                        currentlyEditing.innerHTML = newContent;
                        break;
                        
                    case 'score':
                        const scoreValue = currentlyEditing.querySelector('.score-range').value;
                        const scoreClass = parseInt(scoreValue) >= 100 ? 'high-effectiveness' : 
                                        parseInt(scoreValue) >= 50 ? 'medium-effectiveness' : 
                                        'low-effectiveness';
                        
                        currentlyEditing.className = `score-circle ${scoreClass}`;
                        currentlyEditing.innerHTML = scoreValue;
                        
                        // Update other score references
                        document.querySelectorAll('.score-value').forEach(el => {
                            el.textContent = scoreValue;
                        });
                        break;
                        
                    case 'date':
                        const dateInput = currentlyEditing.querySelector('.date-input');
                        const dateValue = dateInput.value;
                        
                        // For display purposes, show relative time
                        const date = new Date(dateValue);
                        const now = new Date();
                        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
                        
                        let displayDate = '';
                        if (diffDays === 0) {
                            displayDate = 'Today';
                        } else if (diffDays === 1) {
                            displayDate = 'Yesterday';
                        } else {
                            displayDate = `${diffDays} days ago`;
                        }
                        
                        currentlyEditing.textContent = displayDate;
                        currentlyEditing.setAttribute('data-time', dateValue);
                        break;
                        
                    case 'category':
                        const categorySelect = currentlyEditing.querySelector('.category-select');
                        const categoryValue = categorySelect.value;
                        const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
                        
                        currentlyEditing.className = `article-category ${categoryValue}`;
                        currentlyEditing.textContent = categoryText;
                        break;
                        
                    case 'number':
                        const numberInput = currentlyEditing.querySelector('.number-editor');
                        newContent = numberInput.value;
                        currentlyEditing.innerHTML = newContent;
                        break;
                        
                    case 'related':
                        // Rebuild related articles from editor
                        const relatedArticles = Array.from(currentlyEditing.querySelectorAll('.related-article-edit')).map(article => {
                            const title = article.querySelector('.related-title').value;
                            const imageUrl = article.querySelector('.related-image-url').value;
                            const category = article.querySelector('.related-category').value;
                            const categoryText = article.querySelector('.related-category').options[article.querySelector('.related-category').selectedIndex].text;
                            const score = article.querySelector('.related-score').value;
                            
                            // Determine effectiveness class
                            const effectivenessClass = parseInt(score) >= 100 ? 'high-effectiveness' : 
                                                    parseInt(score) >= 50 ? 'medium-effectiveness' : 
                                                    'low-effectiveness';
                            
                            return `
                                <div class="related-article">
                                    <a href="?article=${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}">
                                        <div class="related-image gradient-overlay" style="background-image: url('${imageUrl}')"></div>
                                        <div class="related-info">
                                            <h4>${title}</h4>
                                            <div class="related-meta">
                                                <span class="related-category ${category}">${categoryText}</span>
                                                <span class="related-effectiveness ${effectivenessClass}">${score}</span>
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            `;
                        }).join('');
                        
                        currentlyEditing.innerHTML = relatedArticles;
                        break;
                        
                    case 'sponsored':
                        const sponsoredTitle = currentlyEditing.querySelector('.sponsored-title').value;
                        const sponsoredDescription = currentlyEditing.querySelector('.sponsored-description').value;
                        const sponsoredBtnText = currentlyEditing.querySelector('.sponsored-btn-text').value;
                        const sponsoredBtnUrl = currentlyEditing.querySelector('.sponsored-btn-url').value;
                        const sponsoredImageUrl = currentlyEditing.querySelector('.sponsored-image-url').value;
                        
                        currentlyEditing.innerHTML = `
                            <div class="sponsored-image gradient-overlay" style="background-image: url('${sponsoredImageUrl}')"></div>
                            <h4>${sponsoredTitle}</h4>
                            <p>${sponsoredDescription}</p>
                            <a href="${sponsoredBtnUrl}" class="sponsored-link">${sponsoredBtnText}</a>
                        `;
                        break;
                        
                    case 'section':
                        const sectionTitle = currentlyEditing.querySelector('.section-title').value;
                        const sectionVisibility = currentlyEditing.querySelector('.section-visibility').value;
                        
                        if (sectionVisibility === 'hidden') {
                            currentlyEditing.style.display = 'none';
                        } else {
                            currentlyEditing.style.display = '';
                        }
                        
                        // Keep original content but update the title
                        const sectionContent = currentlyEditing.innerHTML;
                        currentlyEditing.innerHTML = originalContent.html;
                        currentlyEditing.querySelector('h3').textContent = sectionTitle;
                        break;
                }
                
                // Get the field name and value to send to the server
                // In a real implementation, you'd save this to your database
                console.log('Saved:', fieldName, newContent);
                
                // Reset editing state
                currentlyEditing.classList.remove('editing');
                currentlyEditing = null;
                
                // Hide toolbar
                const toolbar = document.querySelector('.edit-toolbar');
                if (toolbar) {
                    toolbar.classList.add('hidden');
                }
                
                // Show save notification
                showNotification('Changes saved successfully!');
            }
            
            // Cancel editing
            function cancelEditing() {
                if (!currentlyEditing) return;
                
                // Restore original content
                currentlyEditing.innerHTML = originalContent.html;
                
                // Reset editing state
                currentlyEditing.classList.remove('editing');
                currentlyEditing = null;
                
                // Hide toolbar
                const toolbar = document.querySelector('.edit-toolbar');
                if (toolbar) {
                    toolbar.classList.add('hidden');
                }
            }
            
            // Show notification
            function showNotification(message, type = 'success') {
                const notification = document.createElement('div');
                notification.className = `edit-notification ${type}`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                // Auto-remove after 3 seconds
                setTimeout(() => {
                    notification.classList.add('fade-out');
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 300);
                }, 3000);
            }
        }

        // Initialize the article editor when the DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            initArticleEditor();
        });
    </script>
    <?php endif; ?>
</body>
</html>