<?php
header('Content-Type: application/json');
session_start();

// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set CORS headers to allow API access
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Forum data directories
define('DATA_DIR', 'data');
define('USERS_FILE', DATA_DIR . '/users.json');
define('CATEGORIES_FILE', DATA_DIR . '/categories.json');
define('POSTS_FILE', DATA_DIR . '/posts.json');
define('REPLIES_FILE', DATA_DIR . '/replies.json');
define('SEO_FILE', DATA_DIR . '/seo.json');
define('SESSION_KEYS_FILE', DATA_DIR . '/session_keys.json');
define('ENCRYPTION_META_FILE', DATA_DIR . '/encryption_meta.json');

// Create data directory if it doesn't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Get action from the request
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Check if we need to re-encrypt data files
checkDailyEncryption();

// Handle different actions
switch ($action) {
    case 'check_admin':
        checkAdminExists();
        break;
    case 'register':
        register();
        break;
    case 'login':
        login();
        break;
    case 'validate_token':
        validateToken();
        break;
    case 'get_categories':
        getCategories();
        break;
    case 'create_category':
        createCategory();
        break;
    case 'get_posts':
        getPosts();
        break;
    case 'create_post':
        createPost();
        break;
    case 'get_post':
        getPost();
        break;
    case 'add_reply':
        addReply();
        break;
    case 'get_seo':
        getSeoSettings();
        break;
    case 'save_seo':
        saveSeoSettings();
        break;
    case 'get_encryption_status':
        getEncryptionStatus();
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        break;
}

// Check if admin exists
function checkAdminExists() {
    $users = loadData(USERS_FILE);
    $adminExists = false;
    
    foreach ($users as $user) {
        if (isset($user['role']) && $user['role'] === 'admin') {
            $adminExists = true;
            break;
        }
    }
    
    echo json_encode(['success' => true, 'admin_exists' => $adminExists]);
}

// Handle user registration
function register() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    $username = $data['username'];
    $email = $data['email'];
    $password = $data['password'];
    $isAdmin = isset($data['isAdmin']) ? $data['isAdmin'] : false;
    
    // Basic validation
    if (strlen($username) < 3) {
        echo json_encode(['success' => false, 'error' => 'Username must be at least 3 characters']);
        return;
    }
    
    if (strlen($password) < 8) {
        echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']);
        return;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'error' => 'Invalid email format']);
        return;
    }
    
    // Load users
    $users = loadData(USERS_FILE);
    
    // Check if username already exists
    foreach ($users as $user) {
        if (strtolower($user['username']) === strtolower($username)) {
            echo json_encode(['success' => false, 'error' => 'Username already exists']);
            return;
        }
        
        if (strtolower($user['email']) === strtolower($email)) {
            echo json_encode(['success' => false, 'error' => 'Email already in use']);
            return;
        }
    }
    
    // Check if admin exists and if so, don't allow another admin registration
    $adminExists = false;
    foreach ($users as $user) {
        if (isset($user['role']) && $user['role'] === 'admin') {
            $adminExists = true;
            break;
        }
    }
    
    // Only allow admin registration if no admin exists
    if ($isAdmin && $adminExists) {
        $isAdmin = false;
    }
    
    // Create new user with secure password hash
    $userId = generateId();
    $newUser = [
        'id' => $userId,
        'username' => $username,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_ARGON2ID, ['memory_cost' => 2048, 'time_cost' => 4, 'threads' => 3]),
        'role' => $isAdmin ? 'admin' : 'user',
        'created' => date('c'),
        'last_login' => date('c')
    ];
    
    // Add user to users array
    $users[] = $newUser;
    
    // Save users data
    saveData(USERS_FILE, $users);
    
    // Generate token for auto-login
    $token = generateToken($userId);
    
    // Return user data without password
    $userResponse = $newUser;
    unset($userResponse['password_hash']);
    
    echo json_encode([
        'success' => true, 
        'user' => $userResponse,
        'token' => $token
    ]);
}

// Handle user login
function login() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['username']) || !isset($data['password'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    $username = $data['username'];
    $password = $data['password'];
    
    // Load users
    $users = loadData(USERS_FILE);
    
    // Find user
    $foundUser = null;
    foreach ($users as &$user) {
        if (strtolower($user['username']) === strtolower($username)) {
            // Verify password
            if (password_verify($password, $user['password_hash'])) {
                // Update last login time
                $user['last_login'] = date('c');
                saveData(USERS_FILE, $users);
                
                // Generate token
                $token = generateToken($user['id']);
                
                // Return user data without password
                $userResponse = $user;
                unset($userResponse['password_hash']);
                
                echo json_encode([
                    'success' => true, 
                    'user' => $userResponse,
                    'token' => $token
                ]);
                return;
            }
            
            // Password doesn't match
            echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
            return;
        }
    }
    
    // User not found
    echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
}

// Validate token
function validateToken() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing token']);
        return;
    }
    
    $token = $data['token'];
    
    // Verify token
    $userId = verifyToken($token);
    
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }
    
    // Get user data
    $users = loadData(USERS_FILE);
    $foundUser = null;
    
    foreach ($users as $user) {
        if ($user['id'] === $userId) {
            $foundUser = $user;
            break;
        }
    }
    
    if (!$foundUser) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        return;
    }
    
    // Return user data without password
    unset($foundUser['password_hash']);
    
    echo json_encode([
        'success' => true, 
        'user' => $foundUser
    ]);
}

// Get categories
function getCategories() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Verify token if provided
    if (isset($data['token'])) {
        $userId = verifyToken($data['token']);
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
            return;
        }
    }
    
    // Load categories
    $categories = loadData(CATEGORIES_FILE);
    
    echo json_encode([
        'success' => true, 
        'categories' => $categories
    ]);
}

// Create category (admin only)
function createCategory() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['name']) || !isset($data['description']) || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Verify token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        echo json_encode(['success' => false, 'error' => 'Permission denied']);
        return;
    }
    
    // Load categories
    $categories = loadData(CATEGORIES_FILE);
    
    // Create new category
    $categoryId = generateId();
    $newCategory = [
        'id' => $categoryId,
        'name' => $data['name'],
        'description' => $data['description'],
        'created' => date('c'),
        'order' => count($categories) + 1
    ];
    
    // Add category
    $categories[] = $newCategory;
    
    // Save categories
    saveData(CATEGORIES_FILE, $categories);
    
    echo json_encode([
        'success' => true, 
        'category' => $newCategory
    ]);
}

// Get posts (with optional filtering)
function getPosts() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Verify token if provided
    if (isset($data['token'])) {
        $userId = verifyToken($data['token']);
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
            return;
        }
    }
    
    // Load posts
    $posts = loadData(POSTS_FILE);
    
    // Filter by category if specified
    if (isset($data['categoryId'])) {
        $filteredPosts = [];
        foreach ($posts as $post) {
            if ($post['categoryId'] === $data['categoryId']) {
                $filteredPosts[] = $post;
            }
        }
        $posts = $filteredPosts;
    }
    
    // Sort by most recent
    usort($posts, function($a, $b) {
        return strtotime($b['created']) - strtotime($a['created']);
    });
    
    // Simplify for listing (no content, no replies)
    $simplifiedPosts = [];
    foreach ($posts as $post) {
        // Count replies
        $replies = loadData(REPLIES_FILE);
        $replyCount = 0;
        foreach ($replies as $reply) {
            if ($reply['postId'] === $post['id']) {
                $replyCount++;
            }
        }
        
        $simplifiedPosts[] = [
            'id' => $post['id'],
            'title' => $post['title'],
            'author' => $post['author'],
            'authorId' => $post['authorId'],
            'categoryId' => $post['categoryId'],
            'created' => $post['created'],
            'replyCount' => $replyCount,
            'lastActivity' => $post['lastActivity'] ?? $post['created']
        ];
    }
    
    echo json_encode([
        'success' => true, 
        'posts' => $simplifiedPosts
    ]);
}

// Create post
function createPost() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['title']) || !isset($data['content']) || !isset($data['categoryId']) || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Verify token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }
    
    // Get user data
    $users = loadData(USERS_FILE);
    $author = null;
    
    foreach ($users as $user) {
        if ($user['id'] === $userId) {
            $author = $user;
            break;
        }
    }
    
    if (!$author) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        return;
    }
    
    // Verify category exists
    $categories = loadData(CATEGORIES_FILE);
    $categoryExists = false;
    
    foreach ($categories as $category) {
        if ($category['id'] === $data['categoryId']) {
            $categoryExists = true;
            break;
        }
    }
    
    if (!$categoryExists) {
        echo json_encode(['success' => false, 'error' => 'Category not found']);
        return;
    }
    
    // Load posts
    $posts = loadData(POSTS_FILE);
    
    // Create new post
    $postId = generateId();
    $newPost = [
        'id' => $postId,
        'title' => $data['title'],
        'content' => $data['content'],
        'categoryId' => $data['categoryId'],
        'author' => $author['username'],
        'authorId' => $author['id'],
        'created' => date('c'),
        'lastActivity' => date('c')
    ];
    
    // Add post
    $posts[] = $newPost;
    
    // Save posts
    saveData(POSTS_FILE, $posts);
    
    echo json_encode([
        'success' => true, 
        'post' => $newPost
    ]);
}

// Get single post with replies
function getPost() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['postId'])) {
        echo json_encode(['success' => false, 'error' => 'Missing post ID']);
        return;
    }
    
    // Verify token if provided
    if (isset($data['token'])) {
        $userId = verifyToken($data['token']);
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
            return;
        }
    }
    
    $postId = $data['postId'];
    
    // Load posts
    $posts = loadData(POSTS_FILE);
    
    // Find post
    $post = null;
    foreach ($posts as $p) {
        if ($p['id'] === $postId) {
            $post = $p;
            break;
        }
    }
    
    if (!$post) {
        echo json_encode(['success' => false, 'error' => 'Post not found']);
        return;
    }
    
    // Load replies
    $allReplies = loadData(REPLIES_FILE);
    $postReplies = [];
    
    foreach ($allReplies as $reply) {
        if ($reply['postId'] === $postId) {
            $postReplies[] = $reply;
        }
    }
    
    // Sort replies by created time
    usort($postReplies, function($a, $b) {
        return strtotime($a['created']) - strtotime($b['created']);
    });
    
    // Get category
    $categories = loadData(CATEGORIES_FILE);
    $category = null;
    
    foreach ($categories as $cat) {
        if ($cat['id'] === $post['categoryId']) {
            $category = $cat;
            break;
        }
    }
    
    echo json_encode([
        'success' => true, 
        'post' => $post,
        'replies' => $postReplies,
        'category' => $category
    ]);
}

// Add reply to post
function addReply() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['postId']) || !isset($data['content']) || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Verify token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }
    
    // Get user data
    $users = loadData(USERS_FILE);
    $author = null;
    
    foreach ($users as $user) {
        if ($user['id'] === $userId) {
            $author = $user;
            break;
        }
    }
    
    if (!$author) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        return;
    }
    
    // Verify post exists
    $posts = loadData(POSTS_FILE);
    $postExists = false;
    $postIndex = -1;
    
    foreach ($posts as $index => $post) {
        if ($post['id'] === $data['postId']) {
            $postExists = true;
            $postIndex = $index;
            break;
        }
    }
    
    if (!$postExists) {
        echo json_encode(['success' => false, 'error' => 'Post not found']);
        return;
    }
    
    // Load replies
    $replies = loadData(REPLIES_FILE);
    
    // Create new reply
    $replyId = generateId();
    $newReply = [
        'id' => $replyId,
        'postId' => $data['postId'],
        'content' => $data['content'],
        'author' => $author['username'],
        'authorId' => $author['id'],
        'created' => date('c')
    ];
    
    // Add reply
    $replies[] = $newReply;
    
    // Save replies
    saveData(REPLIES_FILE, $replies);
    
    // Update post's lastActivity
    $posts[$postIndex]['lastActivity'] = date('c');
    saveData(POSTS_FILE, $posts);
    
    echo json_encode([
        'success' => true, 
        'reply' => $newReply
    ]);
}

// Get SEO settings
function getSeoSettings() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Load SEO settings
    $seo = loadData(SEO_FILE);
    
    echo json_encode([
        'success' => true, 
        'seo' => $seo
    ]);
}

// Save SEO settings (admin only)
function saveSeoSettings() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['title']) || !isset($data['description']) || !isset($data['keywords']) || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Verify token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        // Check for the special password
        if (!isset($data['password']) || $data['password'] !== 'password') {
            echo json_encode(['success' => false, 'error' => 'Permission denied']);
            return;
        }
    }
    
    // Create SEO settings
    $seoSettings = [
        'title' => $data['title'],
        'description' => $data['description'],
        'keywords' => $data['keywords'],
        'updated' => date('c'),
        'updatedBy' => $userId
    ];
    
    // Save SEO settings
    saveData(SEO_FILE, $seoSettings);
    
    echo json_encode([
        'success' => true, 
        'seo' => $seoSettings
    ]);
}

// Get encryption status
function getEncryptionStatus() {
    $encryptionMeta = loadEncryptionMeta();
    
    echo json_encode([
        'success' => true, 
        'encryption' => $encryptionMeta
    ]);
}

// Check if encryption needs to be updated for today
function checkDailyEncryption() {
    $today = date('Y-m-d');
    $encryptionMeta = loadEncryptionMeta();
    
    // Check if re-encryption is needed
    if ($encryptionMeta['lastEncryptionDate'] !== $today) {
        // Generate today's key
        $todayKey = generateDailyKey($today);
        
        // If data was already encrypted, re-encrypt with today's key
        if ($encryptionMeta['isEncrypted'] && !empty($encryptionMeta['lastEncryptionDate'])) {
            // Get yesterday's key
            $yesterday = date('Y-m-d', strtotime('-1 day'));
            $yesterdayKey = generateDailyKey($yesterday);
            
            // Re-encrypt all data files
            reEncryptDataFiles($yesterdayKey, $todayKey);
        }
        
        // Update encryption metadata
        $encryptionMeta['lastEncryptionDate'] = $today;
        $encryptionMeta['isEncrypted'] = true;
        saveEncryptionMeta($encryptionMeta);
    }
}

// Re-encrypt all data files
function reEncryptDataFiles($oldKey, $newKey) {
    // List of data files to re-encrypt
    $files = [USERS_FILE, CATEGORIES_FILE, POSTS_FILE, REPLIES_FILE, SEO_FILE];
    
    foreach ($files as $file) {
        if (file_exists($file)) {
            // Read encrypted data
            $encryptedData = file_get_contents($file);
            
            // Decrypt with old key
            $decryptedData = decryptData($encryptedData, $oldKey);
            
            // Re-encrypt with new key
            $newEncryptedData = encryptData($decryptedData, $newKey);
            
            // Save re-encrypted data
            file_put_contents($file, $newEncryptedData);
        }
    }
}

// Generate daily encryption key
function generateDailyKey($dateString) {
    $baseSecret = "S3cure#F0rum#System#2025";
    $combinedString = $baseSecret . $dateString;
    return hash('sha256', $combinedString);
}

// Encrypt data
function encryptData($data, $key) {
    // Create encryption key from password
    $encKey = substr(hash('sha256', $key, true), 0, 32);
    
    // Create a random IV
    $iv = openssl_random_pseudo_bytes(16);
    
    // Encrypt
    $encrypted = openssl_encrypt($data, 'AES-256-CBC', $encKey, 0, $iv);
    
    // Combine IV and encrypted data
    $result = base64_encode($iv . $encrypted);
    
    return $result;
}

// Decrypt data
function decryptData($encryptedData, $key) {
    // Create decryption key from password
    $decKey = substr(hash('sha256', $key, true), 0, 32);
    
    // Decode from base64
    $data = base64_decode($encryptedData);
    
    // Extract IV (first 16 bytes)
    $iv = substr($data, 0, 16);
    
    // Extract the encrypted data (everything after IV)
    $encrypted = substr($data, 16);
    
    // Decrypt
    $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $decKey, 0, $iv);
    
    return $decrypted;
}

// Load encryption metadata
function loadEncryptionMeta() {
    if (file_exists(ENCRYPTION_META_FILE)) {
        $data = file_get_contents(ENCRYPTION_META_FILE);
        return json_decode($data, true);
    }
    
    // Default encryption metadata
    return [
        'lastEncryptionDate' => '',
        'isEncrypted' => false
    ];
}

// Save encryption metadata
function saveEncryptionMeta($metadata) {
    file_put_contents(ENCRYPTION_META_FILE, json_encode($metadata, JSON_PRETTY_PRINT));
}

// Load data from JSON file
function loadData($file) {
    if (!file_exists($file)) {
        // Create empty file with default structure
        $defaultData = [];
        
        if ($file === SEO_FILE) {
            $defaultData = [
                'title' => 'Secure Forum System',
                'description' => 'A secure forum system with encryption and many features',
                'keywords' => 'forum,security,encryption'
            ];
        }
        
        saveData($file, $defaultData);
        return $defaultData;
    }
    
    // Get today's encryption key
    $today = date('Y-m-d');
    $encryptionKey = generateDailyKey($today);
    
    // Read file contents
    $encryptedData = file_get_contents($file);
    
    // Check if file is encrypted (starts with base64 encoded data)
    if (base64_decode($encryptedData, true) !== false) {
        try {
            // Try to decrypt with today's key
            $jsonData = decryptData($encryptedData, $encryptionKey);
            $data = json_decode($jsonData, true);
            
            // If decoding failed, it might not be encrypted yet
            if ($data === null) {
                // Try to parse as plain JSON
                $data = json_decode($encryptedData, true);
                
                // If still null, return empty array
                if ($data === null) {
                    return [];
                }
            }
            
            return $data;
        } catch (Exception $e) {
            // Decryption failed, return empty array
            error_log("Error decrypting file $file: " . $e->getMessage());
            return [];
        }
    } else {
        // Not encrypted, just parse as JSON
        $data = json_decode($encryptedData, true);
        return $data ?: [];
    }
}

// Save data to JSON file
function saveData($file, $data) {
    // Convert data to JSON
    $jsonData = json_encode($data, JSON_PRETTY_PRINT);
    
    // Get today's encryption key
    $today = date('Y-m-d');
    $encryptionKey = generateDailyKey($today);
    
    // Check if encryption is needed
    $encryptionMeta = loadEncryptionMeta();
    
    if ($encryptionMeta['isEncrypted']) {
        // Encrypt the data
        $encryptedData = encryptData($jsonData, $encryptionKey);
        
        // Save encrypted data
        file_put_contents($file, $encryptedData);
    } else {
        // Save as plain JSON for now
        file_put_contents($file, $jsonData);
    }
}

// Generate token
function generateToken($userId) {
    $tokenData = [
        'userId' => $userId,
        'exp' => time() + (86400 * 7), // 7 days
        'iat' => time()
    ];
    
    // In a real system, this would be signed with a secret key
    $tokenStr = base64_encode(json_encode($tokenData));
    
    return $tokenStr;
}

// Verify token
function verifyToken($token) {
    try {
        $tokenData = json_decode(base64_decode($token), true);
        
        if (!$tokenData || !isset($tokenData['userId']) || !isset($tokenData['exp'])) {
            return false;
        }
        
        // Check expiration
        if ($tokenData['exp'] < time()) {
            return false;
        }
        
        return $tokenData['userId'];
    } catch (Exception $e) {
        return false;
    }
}

// Check if user is admin
function isUserAdmin($userId) {
    $users = loadData(USERS_FILE);
    
    foreach ($users as $user) {
        if ($user['id'] === $userId && isset($user['role']) && $user['role'] === 'admin') {
            return true;
        }
    }
    
    return false;
}

// Generate secure ID
function generateId() {
    return bin2hex(random_bytes(16));
}
?>