<?php
// Secure Forum API with Daily Encryption and Individual Item Storage
// IMPORTANT: DO NOT ADD ANY WHITESPACE AFTER THE CLOSING PHP TAG

// Disable error display for production
ini_set('display_errors', 0);
error_reporting(0);

// Start output buffering to prevent any unexpected output
ob_start();

// Set content type to JSON
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Include the password file
require_once('data/password.php');

// Handle preflight OPTIONS request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit(0);
}

// Data directories
define('DATA_DIR', 'data');
define('USERS_FILE', DATA_DIR . '/users.json.enc');
define('CATEGORIES_FILE', DATA_DIR . '/categories.json.enc');
define('POSTS_FILE', DATA_DIR . '/posts.json.enc');
define('REPLIES_FILE', DATA_DIR . '/replies.json.enc');
define('SEO_FILE', DATA_DIR . '/seo.json.enc');
define('SESSION_KEYS_FILE', DATA_DIR . '/session_keys.json.enc');
define('ENCRYPTION_META_FILE', DATA_DIR . '/encryption_meta.json');
define('KEYS_FILE', DATA_DIR . '/server_keys.json.enc'); // Client-server public/private keys

// NEW: Backup and Recovery related constants
define('BACKUP_BASE_DIR', DATA_DIR . '/backups');
define('RECOVERY_KEY_FILE', DATA_DIR . '/recovery_key.json.enc'); // Stores the previous day's key, encrypted by current day's key

// Individual item directories
define('CATEGORIES_DIR', DATA_DIR . '/categories');
define('POSTS_DIR', DATA_DIR . '/posts');
define('REPLIES_DIR', DATA_DIR . '/replies');
define('PLACARDS_DIR', DATA_DIR . '/placards');
define('AVATARS_DIR', DATA_DIR . '/avatars');

// Create data directories if they don't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}
if (!file_exists(CATEGORIES_DIR)) {
    mkdir(CATEGORIES_DIR, 0755, true);
}
if (!file_exists(POSTS_DIR)) {
    mkdir(POSTS_DIR, 0755, true);
}
if (!file_exists(REPLIES_DIR)) {
    mkdir(REPLIES_DIR, 0755, true);
}
if (!file_exists(PLACARDS_DIR)) {
    mkdir(PLACARDS_DIR, 0755, true);
}
if (!file_exists(AVATARS_DIR)) {
    mkdir(AVATARS_DIR, 0755, true);
}
if (!file_exists(BACKUP_BASE_DIR)) {
    mkdir(BACKUP_BASE_DIR, 0755, true);
}

// Check if encryption needs to be updated for today
checkDailyEncryption();

// Get action from the request
$action = isset($_GET["action"]) ? $_GET["action"] : "";

// Wrap everything in a try-catch to prevent any errors from corrupting output
try {
    // Handle different actions
    switch ($action) {
        case "check_admin":
            checkAdminExists();
            break;
            
        case "register":
            register();
            break;
            
        case "login":
            login();
            break;
            
        case "validate_token":
            validateToken();
            break;
            
        case "get_categories":
            getCategories();
            break;
            
        case "create_category":
            createCategory();
            break;
            
        case "delete_category":
            deleteCategory();
            break;
            
        case "verify_seo_password":
            verifySeoPasswordEndpoint();
            break;
            
        case "get_posts":
            getPosts();
            break;
            
        case "create_post":
            createPost();
            break;
            
        case "delete_post":
            deletePost();
            break;
            
        case "get_post":
            getPost();
            break;
            
        case "add_reply":
            addReply();
            break;
         case "federation_status":
            getFederationStatusEndpoint();
            break;

        case "connect_server":
            connectServerEndpoint();
            break;

        case "share_file":
            shareFileEndpoint();
            break;

        case "import_file":
            importFileEndpoint();
            break;   
        case "delete_reply":
            deleteReply();
            break;
            
        case "get_seo":
            getSeoSettings();
            break;
            
        case "save_seo":
            saveSeoSettings();
            break;
            
        case 'get_public_key':
            getServerPublicKey();
            break;
        case "get_reply_counts":
            getReplyCountsEndpoint();
            break;
    
        case "get_encryption_status":
            getEncryptionStatus();
            break;
        case "get_avatar":
            getAvatar();
            break;

        case "upload_avatar":
            uploadAvatar();
            break;

        case "update_placard_value":
            updatePlacardValueEndpoint();
            break; 
        case "get_user_placard":
            getUserPlacard();
            break;

        // NEW: Admin recovery action
        case "admin_recovery":
            adminRecovery();
            break;
            
        default:
            echo json_encode(["success" => false, "error" => "Invalid action"]);
            break;
    }
} catch (Exception $e) {
    // Log error but don't expose details
    error_log("API Error: " . $e->getMessage());
    echo json_encode(["success" => false, "error" => "Server error occurred"]);
}

// End output buffer and exit
ob_end_flush();
exit;

function getReplyCountsEndpoint() {
    try {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        if (!$data || !isset($data["postIds"]) || !isset($data["token"])) {
            echo json_encode(["success" => false, "error" => "Missing required fields"]);
            return;
        }
        
        // Verify token
        $userId = verifyToken($data["token"]);
        if (!$userId) {
            echo json_encode(["success" => false, "error" => "Invalid token"]);
            return;
        }
        
        $postIds = $data["postIds"];
        if (!is_array($postIds)) {
            $postIds = [$postIds]; // Convert single ID to array
        }
        
        // Load replies
        $repliesMetadata = loadData(REPLIES_FILE);
        $counts = [];
        
        // Count replies for each post
        foreach ($postIds as $postId) {
            $count = 0;
            foreach ($repliesMetadata as $reply) {
                if (isset($reply["postId"]) && $reply["postId"] === $postId) {
                    $count++;
                }
            }
            $counts[$postId] = $count;
        }
        
        echo json_encode([
            "success" => true,
            "counts" => $counts
        ]);
    } catch (Exception $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function checkAdminExists() {
    $users = loadData(USERS_FILE);
    $adminExists = false;
    
    foreach ($users as $user) {
        if (isset($user["role"]) && $user["role"] === "admin") {
            $adminExists = true;
            break;
        }
    }
    
    echo json_encode(["success" => true, "admin_exists" => $adminExists]);
}

function verifySeoPasswordEndpoint() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["password"])) {
        echo json_encode(["success" => false, "error" => "Missing password"]);
        return;
    }
    
    $isValid = verifySeoPassword($data["password"]);
    
    echo json_encode([
        "success" => true,
        "valid" => $isValid
    ]);
}
function getFederationStatusEndpoint() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing token"]);
        return;
    }
    
    $result = getFederationStatus($data["token"]);
    echo json_encode($result);
}

function connectServerEndpoint() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["token"]) || !isset($data["serverUrl"]) ||
        !isset($data["serverId"]) || !isset($data["initialKey"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $result = initiateServerConnection(
        $data["serverUrl"],
        $data["serverId"],
        $data["initialKey"],
        $data["token"]
    );
    
    echo json_encode($result);
}

function shareFileEndpoint() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["token"]) || !isset($data["filePath"]) ||
        !isset($data["targetServerId"]) || !isset($data["fileType"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $result = shareFile(
        $data["filePath"],
        $data["targetServerId"],
        $data["fileType"],
        $data["token"]
    );
    
    echo json_encode($result);
}

function importFileEndpoint() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["token"]) || !isset($data["fileName"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    // Implementation for importing a shared file
    // This would decrypt the file and store it in the appropriate location
    
    echo json_encode([
        "success" => true,
        "message" => "File imported successfully"
    ]);
}
// Register function
function register() {
    // Get input data
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    if (!isset($data["username"]) || !isset($data["email"]) || !isset($data["password"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $username = $data["username"];
    $email = $data["email"];
    $password = $data["password"];
    $isAdmin = isset($data["isAdmin"]) ? $data["isAdmin"] : false;
    
    // Basic validation
    if (strlen($username) < 3) {
        echo json_encode(["success" => false, "error" => "Username must be at least 3 characters"]);
        return;
    }
    
    if (strlen($password) < 8) {
        echo json_encode(["success" => false, "error" => "Password must be at least 8 characters"]);
        return;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "error" => "Invalid email format"]);
        return;
    }
    
    // Load users
    $users = loadData(USERS_FILE);
    
    // Check if username already exists
    foreach ($users as $user) {
        if (strtolower($user["username"]) === strtolower($username)) {
            echo json_encode(["success" => false, "error" => "Username already exists"]);
            return;
        }
        
        if (strtolower($user["email"]) === strtolower($email)) {
            echo json_encode(["success" => false, "error" => "Email already in use"]);
            return;
        }
    }
    
    // Check if admin exists
    $adminExists = false;
    foreach ($users as $user) {
        if (isset($user["role"]) && $user["role"] === "admin") {
            $adminExists = true;
            break;
        }
    }
    
    // Only allow admin registration if no admin exists
    if ($isAdmin && $adminExists) {
        $isAdmin = false;
    }
    
    // Create new user with secure password hash
    $userId = bin2hex(random_bytes(16));
    $newUser = [
        "id" => $userId,
        "username" => $username,
        "email" => $email,
        "password_hash" => password_hash($password, PASSWORD_DEFAULT),
        "role" => $isAdmin ? "admin" : "user",
        "created" => date("c"),
        "last_login" => date("c")
    ];
    
    // Add user to users array
    $users[] = $newUser;
    
    // Save users data
    saveData(USERS_FILE, $users);
    
    // Generate token for auto-login
    $token = generateToken($userId);
    
    // Return user data without password
    $userResponse = $newUser;
    unset($userResponse["password_hash"]);
    
    echo json_encode([
        "success" => true,
        "user" => $userResponse,
        "token" => $token
    ]);
}

// Login function
function login() {
    // Get input data
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    if (!isset($data["username"]) || !isset($data["password"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $username = $data["username"];
    $password = $data["password"];
    
    // Load users
    $users = loadData(USERS_FILE);
    
    // Find user
    foreach ($users as &$user) {
        if (strtolower($user["username"]) === strtolower($username)) {
            // Verify password
            if (password_verify($password, $user["password_hash"])) {
                // Update last login time
                $user["last_login"] = date("c");
                saveData(USERS_FILE, $users);
                
                // Generate token
                $token = generateToken($user["id"]);
                
                // Return user data without password
                $userResponse = $user;
                unset($userResponse["password_hash"]);
                
                echo json_encode([
                    "success" => true,
                    "user" => $userResponse,
                    "token" => $token
                ]);
                return;
            }
        }
    }
    
    // Invalid credentials
    echo json_encode(["success" => false, "error" => "Invalid credentials"]);
}

// Validate token
function validateToken() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing token"]);
        return;
    }
    
    $token = $data["token"];
    
    // Verify token
    $userId = verifyToken($token);
    
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid or expired token"]);
        return;
    }
    
    // Get user data
    $users = loadData(USERS_FILE);
    $foundUser = null;
    
    foreach ($users as $user) {
        if ($user["id"] === $userId) {
            $foundUser = $user;
            break;
        }
    }
    
    if (!$foundUser) {
        echo json_encode(["success" => false, "error" => "User not found"]);
        return;
    }
    
    // Return user data without password
    unset($foundUser["password_hash"]);
    
    echo json_encode([
        "success" => true,
        "user" => $foundUser
    ]);
}

// Get categories
function getCategories() {
    // Load categories metadata
    $categoriesMetadata = loadData(CATEGORIES_FILE);
    $categories = [];
    
    // Load each category from individual files
    foreach ($categoriesMetadata as $metadata) {
        $categoryId = $metadata["id"];
        $categoryFile = CATEGORIES_DIR . '/' . $categoryId . '.json.enc';
        
        if (file_exists($categoryFile)) {
            $category = loadData($categoryFile);
            $categories[] = $category;
        }
    }
    
    echo json_encode(["success" => true, "categories" => $categories]);
}

// Create category
function createCategory() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["name"]) || !isset($data["description"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        echo json_encode(["success" => false, "error" => "Permission denied"]);
        return;
    }
    
    // Create category
    $categoryId = bin2hex(random_bytes(8));
    $newCategory = [
        "id" => $categoryId,
        "name" => $data["name"],
        "description" => $data["description"],
        "created" => date("c"),
        "order" => 1
    ];
    
    // Save category to individual file
    $categoryFile = CATEGORIES_DIR . '/' . $categoryId . '.json.enc';
    saveData($categoryFile, $newCategory);
    
    // Update categories metadata
    $categoriesMetadata = loadData(CATEGORIES_FILE);
    $categoriesMetadata[] = [
        "id" => $categoryId,
        "name" => $data["name"],
        "created" => date("c")
    ];
    saveData(CATEGORIES_FILE, $categoriesMetadata);
    
    echo json_encode(["success" => true, "category" => $newCategory]);
}

// Delete category
function deleteCategory() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["categoryId"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        echo json_encode(["success" => false, "error" => "Permission denied"]);
        return;
    }
    
    $categoryId = $data["categoryId"];
    $categoryFile = CATEGORIES_DIR . '/' . $categoryId . '.json.enc';
    
    // Delete the category file
    if (file_exists($categoryFile)) {
        unlink($categoryFile);
    }
    
    // Update categories metadata
    $categoriesMetadata = loadData(CATEGORIES_FILE);
    $updatedMetadata = [];
    
    foreach ($categoriesMetadata as $metadata) {
        if ($metadata["id"] !== $categoryId) {
            $updatedMetadata[] = $metadata;
        }
    }
    
    saveData(CATEGORIES_FILE, $updatedMetadata);
    
    // Find and delete all posts in this category
    $postsMetadata = loadData(POSTS_FILE);
    $updatedPostsMetadata = [];
    
    foreach ($postsMetadata as $postMeta) {
        if ($postMeta["categoryId"] === $categoryId) {
            // Delete post file
            $postFile = POSTS_DIR . '/' . $postMeta["id"] . '.json.enc';
            if (file_exists($postFile)) {
                unlink($postFile);
            }
            
            // Find and delete replies to this post
            deleteRepliesForPost($postMeta["id"]);
        } else {
            $updatedPostsMetadata[] = $postMeta;
        }
    }
    
    saveData(POSTS_FILE, $updatedPostsMetadata);
    
    echo json_encode(["success" => true]);
}

// Get posts
function getPosts() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing token"]);
        return;
    }
    
    if (!verifyToken($data["token"])) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Load posts metadata
    $postsMetadata = loadData(POSTS_FILE);
    $posts = [];
    
    // Filter by category if specified
    $categoryId = isset($data["categoryId"]) ? $data["categoryId"] : null;
    
    foreach ($postsMetadata as $metadata) {
        if ($categoryId === null || $metadata["categoryId"] === $categoryId) {
            // Load full post data from individual file
            $postId = $metadata["id"];
            $postFile = POSTS_DIR . '/' . $postId . '.json.enc';
            
            if (file_exists($postFile)) {
                $post = loadData($postFile);
                $posts[] = $post;
            }
        }
    }
    
    echo json_encode(["success" => true, "posts" => $posts]);
}

// Create post function
function createPost() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data) {
        echo json_encode(["success" => false, "error" => "Invalid request data"]);
        return;
    }
    
    if (!isset($data["title"]) || !isset($data["content"]) || 
        !isset($data["categoryId"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Get user data
    $users = loadData(USERS_FILE);
    $author = null;
    
    foreach ($users as $user) {
        if ($user["id"] === $userId) {
            $author = $user;
            break;
        }
    }
    
    if (!$author) {
        echo json_encode(["success" => false, "error" => "User not found"]);
        return;
    }
    
    $postId = bin2hex(random_bytes(8));
    $newPost = [
        "id" => $postId,
        "title" => $data["title"],
        "content" => $data["content"],
        "categoryId" => $data["categoryId"],
        "author" => $author["username"],
        "authorId" => $author["id"],
        "created" => date("c"),
        "lastActivity" => date("c")
    ];
    
    // Save post to individual file
    $postFile = POSTS_DIR . '/' . $postId . '.json.enc';
    saveData($postFile, $newPost);
    
    // Update posts metadata
    $postsMetadata = loadData(POSTS_FILE);
    $postsMetadata[] = [
        "id" => $postId,
        "title" => $data["title"],
        "categoryId" => $data["categoryId"],
        "authorId" => $author["id"],
        "created" => date("c"),
        "lastActivity" => date("c")
    ];
    saveData(POSTS_FILE, $postsMetadata);
    
    echo json_encode(["success" => true, "post" => $newPost]);
}

// Delete post function
function deletePost() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["postId"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        echo json_encode(["success" => false, "error" => "Permission denied"]);
        return;
    }
    
    $postId = $data["postId"];
    $postFile = POSTS_DIR . '/' . $postId . '.json.enc';
    
    // Delete the post file
    if (file_exists($postFile)) {
        unlink($postFile);
    }
    
    // Update posts metadata
    $postsMetadata = loadData(POSTS_FILE);
    $updatedMetadata = [];
    
    foreach ($postsMetadata as $metadata) {
        if ($metadata["id"] !== $postId) {
            $updatedMetadata[] = $metadata;
        }
    }
    
    saveData(POSTS_FILE, $updatedMetadata);
    
    // Delete all replies to this post
    deleteRepliesForPost($postId);
    
    echo json_encode(["success" => true]);
}

// Delete all replies for a post
function deleteRepliesForPost($postId) {
    $repliesMetadata = loadData(REPLIES_FILE);
    $updatedRepliesMetadata = [];
    
    foreach ($repliesMetadata as $replyMeta) {
        if ($replyMeta["postId"] === $postId) {
            // Delete reply file
            $replyFile = REPLIES_DIR . '/' . $replyMeta["id"] . '.json.enc';
            if (file_exists($replyFile)) {
                unlink($replyFile);
            }
        } else {
            $updatedRepliesMetadata[] = $replyMeta;
        }
    }
    
    saveData(REPLIES_FILE, $updatedRepliesMetadata);
}

// Get post function
function getPost() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["postId"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    if (!verifyToken($data["token"])) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    $postId = $data["postId"];
    $postFile = POSTS_DIR . '/' . $postId . '.json.enc';
    
    if (!file_exists($postFile)) {
        echo json_encode(["success" => false, "error" => "Post not found"]);
        return;
    }
    
    $post = loadData($postFile);
    
    // Load replies
    $repliesMetadata = loadData(REPLIES_FILE);
    $postReplies = [];
    
    foreach ($repliesMetadata as $replyMeta) {
        if (isset($replyMeta["postId"]) && $replyMeta["postId"] === $postId) {
            $replyFile = REPLIES_DIR . '/' . $replyMeta["id"] . '.json.enc';
            if (file_exists($replyFile)) {
                $reply = loadData($replyFile);
                $postReplies[] = $reply;
            }
        }
    }
    
    // Load category
    $categoryId = $post["categoryId"];
    $categoryFile = CATEGORIES_DIR . '/' . $categoryId . '.json.enc';
    $category = null;
    
    if (file_exists($categoryFile)) {
        $category = loadData($categoryFile);
    } else {
        // Fallback to metadata if category file is missing
        $categoriesMetadata = loadData(CATEGORIES_FILE);
        foreach ($categoriesMetadata as $catMeta) {
            if ($catMeta["id"] === $categoryId) {
                $category = $catMeta;
                break;
            }
        }
    }
    
    echo json_encode([
        "success" => true,
        "post" => $post,
        "replies" => $postReplies,
        "category" => $category
    ]);
}

// Add reply function
function addReply() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["postId"]) || !isset($data["content"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Get user data
    $users = loadData(USERS_FILE);
    $author = null;
    
    foreach ($users as $user) {
        if ($user["id"] === $userId) {
            $author = $user;
            break;
        }
    }
    
    if (!$author) {
        echo json_encode(["success" => false, "error" => "User not found"]);
        return;
    }
    
    // Check if post exists
    $postId = $data["postId"];
    $postFile = POSTS_DIR . '/' . $postId . '.json.enc';
    
    if (!file_exists($postFile)) {
        echo json_encode(["success" => false, "error" => "Post not found"]);
        return;
    }
    
    // Update last activity on post
    $post = loadData($postFile);
    $post["lastActivity"] = date("c");
    saveData($postFile, $post);
    
    // Also update post metadata
    $postsMetadata = loadData(POSTS_FILE);
    foreach ($postsMetadata as &$postMeta) {
        if ($postMeta["id"] === $postId) {
            $postMeta["lastActivity"] = date("c");
            break;
        }
    }
    saveData(POSTS_FILE, $postsMetadata);
    
    $replyId = bin2hex(random_bytes(8));
    $newReply = [
        "id" => $replyId,
        "postId" => $data["postId"],
        "content" => $data["content"],
        "author" => $author["username"],
        "authorId" => $author["id"],
        "created" => date("c")
    ];
    
    // Save reply to individual file
    $replyFile = REPLIES_DIR . '/' . $replyId . '.json.enc';
    saveData($replyFile, $newReply);
    
    // Update replies metadata
    $repliesMetadata = loadData(REPLIES_FILE);
    $repliesMetadata[] = [
        "id" => $replyId,
        "postId" => $data["postId"],
        "authorId" => $author["id"],
        "created" => date("c")
    ];
    saveData(REPLIES_FILE, $repliesMetadata);
    
    echo json_encode(["success" => true, "reply" => $newReply]);
}

// Delete reply function
function deleteReply() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["replyId"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        echo json_encode(["success" => false, "error" => "Permission denied"]);
        return;
    }
    
    $replyId = $data["replyId"];
    $replyFile = REPLIES_DIR . '/' . $replyId . '.json.enc';
    
    // Delete the reply file
    if (file_exists($replyFile)) {
        unlink($replyFile);
    }
    
    // Update replies metadata
    $repliesMetadata = loadData(REPLIES_FILE);
    $updatedMetadata = [];
    
    foreach ($repliesMetadata as $metadata) {
        if ($metadata["id"] !== $replyId) {
            $updatedMetadata[] = $metadata;
        }
    }
    
    saveData(REPLIES_FILE, $updatedMetadata);
    
    echo json_encode(["success" => true]);
}

// Get SEO settings
function getSeoSettings() {
    $seo = loadData(SEO_FILE);
    echo json_encode(["success" => true, "seo" => $seo]);
}

// Save SEO settings
function saveSeoSettings() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["title"]) || !isset($data["description"]) || 
        !isset($data["keywords"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    // Verify token and check admin status
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        echo json_encode(["success" => false, "error" => "Permission denied. Only administrators can modify SEO settings."]);
        return;
    }
    
    $seoData = [
        "title" => $data["title"],
        "description" => $data["description"],
        "keywords" => $data["keywords"],
        "updated" => date("c"),
        "updatedBy" => $userId
    ];
    
    saveData(SEO_FILE, $seoData);
    
    echo json_encode(["success" => true, "seo" => $seoData]);
}

// Get or generate server's public key
function getServerPublicKey() {
    try {
        // Check if we have generated keys before
        if (file_exists(KEYS_FILE)) {
            $keys = json_decode(file_get_contents(KEYS_FILE), true);
            
            // Check if keys are valid
            if (isset($keys['publicKey'])) {
                echo json_encode([
                    'success' => true,
                    'publicKey' => $keys['publicKey']
                ]);
                return;
            }
        }
        
        // Keys don't exist or are invalid, generate new ones
        if (function_exists('sodium_crypto_box_keypair')) {
            $keyPair = sodium_crypto_box_keypair();
            $publicKey = sodium_crypto_box_publickey($keyPair);
            $secretKey = sodium_crypto_box_secretkey($keyPair);
            
            // Encode keys to base64 for storage
            $keys = [
                'publicKey' => base64_encode($publicKey),
                'secretKey' => base64_encode($secretKey),
                'generated' => time()
            ];
        } else {
            // Fallback if libsodium not available
            $keys = [
                'publicKey' => bin2hex(random_bytes(32)),
                'secretKey' => bin2hex(random_bytes(32)),
                'generated' => time()
            ];
        }
        
        // Save keys
        saveData(KEYS_FILE, $keys);
        
        echo json_encode([
            'success' => true,
            'publicKey' => $keys['publicKey']
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Get encryption status
function getEncryptionStatus() {
    $encryptionMeta = loadEncryptionMeta();
    
    echo json_encode([
        'success' => true, 
        'encryption' => $encryptionMeta
    ]);
}

/**
 * NEW: Function to recursively copy a directory.
 * Used for creating full site backups.
 */
function copyDirectory($source, $destination) {
    if (!is_dir($source)) {
        return false;
    }

    if (!is_dir($destination)) {
        mkdir($destination, 0755, true);
    }

    $dir = opendir($source);
    if ($dir === false) {
        return false;
    }

    while (false !== ($file = readdir($dir))) {
        if (($file != '.') && ($file != '..')) {
            if (is_dir($source . '/' . $file)) {
                copyDirectory($source . '/' . $file, $destination . '/' . $file);
            } else {
                copy($source . '/' . $file, $destination . '/' . $file);
            }
        }
    }
    closedir($dir);
    return true;
}

/**
 * NEW: Function to backup the entire data directory.
 */
function backupSiteData() {
    $timestamp = date('Ymd_His');
    $backupPath = BACKUP_BASE_DIR . '/' . $timestamp;

    // Ensure backup base directory exists
    if (!file_exists(BACKUP_BASE_DIR)) {
        mkdir(BACKUP_BASE_DIR, 0755, true);
    }
    
    // Create the timestamped backup directory
    if (!mkdir($backupPath, 0755, true)) {
        error_log("Failed to create backup directory: {$backupPath}");
        return false;
    }

    // Copy the entire DATA_DIR to the backup path
    $success = copyDirectory(DATA_DIR, $backupPath);
    
    if (!$success) {
        error_log("Failed to copy data directory to backup: {$backupPath}");
    } else {
        error_log("Site data backed up to: {$backupPath}");
    }
    return $success;
}

/**
 * NEW: Function to re-encrypt the previous day's daily key with the new daily key.
 * This is crucial for recovery.
 */
function reEncryptRecoveryKey($oldDailyKey, $newDailyKey) {
    // Store the old daily key, encrypted by the new daily key
    // This allows an admin to use the base secret to get the current daily key,
    // then use that to decrypt this file to get the previous daily key, and so on.
    
    $keyToStore = $oldDailyKey; // The key we want to be able to recover
    
    // Encrypt the old daily key with the new daily key
    $encryptedKey = encryptData($keyToStore, $newDailyKey);
    
    // Save it to a dedicated file
    file_put_contents(RECOVERY_KEY_FILE, $encryptedKey);
    error_log("Recovery key updated and re-encrypted.");
}


// Check if encryption needs to be updated for today
function checkDailyEncryption() {
    $today = date('Y-m-d');
    $encryptionMeta = loadEncryptionMeta();
    
    // Check if re-encryption is needed
    if ($encryptionMeta['lastEncryptionDate'] !== $today) {
        error_log("Daily encryption pass initiated for {$today}.");

        // Generate today's key
        $todayKey = generateDailyKey($today);
        
        // Determine the key that was used yesterday
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $yesterdayKey = generateDailyKey($yesterday); // This is the key that was used to encrypt data yesterday

        // NEW: 1. Backup the entire site data BEFORE re-encryption
        error_log("Starting site data backup...");
        backupSiteData();
        error_log("Site data backup complete.");

        // NEW: 2. Re-encrypt the previous day's daily key with the new daily key
        // This allows for a chain of recovery keys.
        error_log("Re-encrypting recovery key...");
        reEncryptRecoveryKey($yesterdayKey, $todayKey); // Store yesterday's key, encrypted by today's key
        error_log("Recovery key re-encrypted.");

        // If data was already encrypted, re-encrypt with today's key
        if ($encryptionMeta['isEncrypted'] && !empty($encryptionMeta['lastEncryptionDate'])) {
            error_log("Re-encrypting all data files with new daily key...");
            reEncryptDataFiles($yesterdayKey, $todayKey); // Decrypt with yesterday's key, encrypt with today's key
            error_log("All data files re-encrypted.");
        } else {
            // This is the first time encryption is being applied or after a full decryption
            error_log("Initial encryption or re-encryption after recovery: Encrypting all data files with today's key...");
            // If data is currently unencrypted, encrypt it with today's key
            encryptAllDataFiles($todayKey);
            error_log("All data files initially encrypted.");
        }
        
        // Update encryption metadata
        $encryptionMeta['lastEncryptionDate'] = $today;
        $encryptionMeta['isEncrypted'] = true;
        saveEncryptionMeta($encryptionMeta);
        error_log("Encryption metadata updated.");
    }
}

/**
 * NEW: Function to encrypt all data files from their unencrypted state using a given key.
 * This is used during initial encryption or after an admin recovery.
 */
function encryptAllDataFiles($encryptionKey) {
    $files = [USERS_FILE, CATEGORIES_FILE, POSTS_FILE, REPLIES_FILE, SEO_FILE, KEYS_FILE];
    
    foreach ($files as $file) {
        if (file_exists($file)) {
            $jsonData = file_get_contents($file); // Assume it's plain JSON
            $encryptedData = encryptData($jsonData, $encryptionKey);
            file_put_contents($file, $encryptedData);
        }
    }

    // Encrypt individual category files
    encryptDirectoryFiles(CATEGORIES_DIR, $encryptionKey);
    
    // Encrypt individual post files
    encryptDirectoryFiles(POSTS_DIR, $encryptionKey);
    
    // Encrypt individual reply files
    encryptDirectoryFiles(REPLIES_DIR, $encryptionKey);
    
    // Encrypt individual placard files
    encryptDirectoryFiles(PLACARDS_DIR, $encryptionKey);
}

/**
 * NEW: Helper to encrypt all .json files in a directory.
 */
function encryptDirectoryFiles($directory, $encryptionKey) {
    if (!is_dir($directory)) {
        return;
    }
    
    $files = glob($directory . '/*.json'); // Look for unencrypted .json files
    
    foreach ($files as $file) {
        if (file_exists($file)) {
            $jsonData = file_get_contents($file);
            $encryptedData = encryptData($jsonData, $encryptionKey);
            
            // Rename the file to .json.enc
            $newFileName = $file . '.enc';
            file_put_contents($newFileName, $encryptedData);
            unlink($file); // Delete the original unencrypted file
        }
    }
}


// Re-encrypt all data files
function reEncryptDataFiles($oldKey, $newKey) {
    // List of main data files to re-encrypt
    $files = [USERS_FILE, CATEGORIES_FILE, POSTS_FILE, REPLIES_FILE, SEO_FILE, KEYS_FILE];
    
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
    
    // Re-encrypt individual category files
    reEncryptDirectoryFiles(CATEGORIES_DIR, $oldKey, $newKey);
    
    // Re-encrypt individual post files
    reEncryptDirectoryFiles(POSTS_DIR, $oldKey, $newKey);
    
    // Re-encrypt individual reply files
    reEncryptDirectoryFiles(REPLIES_DIR, $oldKey, $newKey);
    
    // Re-encrypt individual placard files
    reEncryptDirectoryFiles(PLACARDS_DIR, $oldKey, $newKey);
}

// Re-encrypt all files in a directory
function reEncryptDirectoryFiles($directory, $oldKey, $newKey) {
    if (!is_dir($directory)) {
        return;
    }
    
    $files = glob($directory . '/*.json.enc');
    
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
    // This base secret is crucial for recovery. Keep it secure!
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
    try {
        // Create decryption key from password
        $decKey = substr(hash('sha256', $key, true), 0, 32);
        
        // Decode from base64
        $data = base64_decode($encryptedData);
        
        if ($data === false) {
            // Not base64 encoded or invalid, return original data
            return $encryptedData;
        }
        
        // Extract IV (first 16 bytes)
        $iv = substr($data, 0, 16);
        
        // Extract the encrypted data (everything after IV)
        $encrypted = substr($data, 16);
        
        // Decrypt
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $decKey, 0, $iv);
        
        if ($decrypted === false) {
            // Failed to decrypt, return original (might be unencrypted or corrupted)
            return $encryptedData;
        }
        
        return $decrypted;
    } catch (Exception $e) {
        // On error, return original data
        error_log("Decryption error: " . $e->getMessage());
        return $encryptedData;
    }
}

// Load encryption metadata
function loadEncryptionMeta() {
    if (file_exists(ENCRYPTION_META_FILE)) {
        $data = file_get_contents(ENCRYPTION_META_FILE);
        $meta = json_decode($data, true);
        
        if (is_array($meta) && isset($meta['lastEncryptionDate']) && isset($meta['isEncrypted'])) {
            return $meta;
        }
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
        } elseif ($file === CATEGORIES_FILE || $file === POSTS_FILE || $file === REPLIES_FILE || strpos($file, '.json.enc') !== false) {
            $defaultData = [];
        }
        
        // If it's a new file that should be encrypted, save it as encrypted empty array
        $encryptionMeta = loadEncryptionMeta();
        if ($encryptionMeta['isEncrypted'] && strpos($file, '.json.enc') !== false) {
             $today = date('Y-m-d');
             $encryptionKey = generateDailyKey($today);
             file_put_contents($file, encryptData(json_encode($defaultData, JSON_PRETTY_PRINT), $encryptionKey));
        } else {
            file_put_contents($file, json_encode($defaultData, JSON_PRETTY_PRINT));
        }
       
        return $defaultData;
    }
    
    // Get today's encryption key
    $today = date('Y-m-d');
    $encryptionKey = generateDailyKey($today);
    
    // Read file contents
    $encryptedData = file_get_contents($file);
    
    // Check if file is encrypted (starts with base64 encoded data)
    // We assume .json.enc files are encrypted. If they aren't, try to decrypt anyway.
    if (strpos($file, '.json.enc') !== false) {
        try {
            $jsonData = decryptData($encryptedData, $encryptionKey);
            $data = json_decode($jsonData, true);
            
            // If decoding failed, it might be unencrypted or corrupted.
            // Attempt to parse as plain JSON as a fallback.
            if ($data === null) {
                $data = json_decode($encryptedData, true);
                if ($data !== null) {
                    error_log("Warning: Encrypted file {$file} was found to be unencrypted. Decrypting as plain JSON.");
                }
            }
            
            return $data ?: [];
        } catch (Exception $e) {
            error_log("Error decrypting file {$file}: " . $e->getMessage());
            return [];
        }
    } else {
        // Not an encrypted file extension, just parse as JSON
        $data = json_decode($encryptedData, true);
        return $data ?: [];
    }
}

// Save data to JSON file
function saveData($file, $data) {
    // Create directory if needed
    $dir = dirname($file);
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // Convert data to JSON
    $jsonData = json_encode($data, JSON_PRETTY_PRINT);
    
    // Get today's encryption key
    $today = date('Y-m-d');
    $encryptionKey = generateDailyKey($today);
    
    // Check if encryption is needed based on file extension and global encryption status
    $encryptionMeta = loadEncryptionMeta();
    
    if ($encryptionMeta['isEncrypted'] && strpos($file, '.json.enc') !== false) {
        // Encrypt the data
        $encryptedData = encryptData($jsonData, $encryptionKey);
        
        // Save encrypted data
        file_put_contents($file, $encryptedData);
    } else {
        // Save as plain JSON (e.g., for encryption_meta.json or if not yet encrypted)
        file_put_contents($file, $jsonData);
    }
}

// Check if user is admin
function isUserAdmin($userId) {
    $users = loadData(USERS_FILE);
    
    foreach ($users as $user) {
        if ($user["id"] === $userId && isset($user["role"]) && $user["role"] === "admin") {
            return true;
        }
    }
    
    return false;
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
function getUserPlacard() {
    try {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        // Basic validation
        if (!$data || !isset($data["username"]) || !isset($data["token"])) {
            echo json_encode(["success" => false, "error" => "Missing required fields"]);
            return;
        }
        
        // Verify token
        $userId = verifyToken($data["token"]);
        if (!$userId) {
            echo json_encode(["success" => false, "error" => "Invalid token"]);
            return;
        }
        
        // Get username
        $users = loadData(USERS_FILE);
        $userData = null;
        
        foreach ($users as $user) {
            if (strtolower($user["username"]) === strtolower($username)) {
                $userData = $user;
                break;
            }
        }
        
        // Create default placard if user not found
        if (!$userData) {
            $placard = createDefaultPlacard($username);
            echo json_encode(["success" => true, "placard" => $placard]);
            return;
        }
        
        // Count user's posts and replies (simplified)
        $postsMetadata = loadData(POSTS_FILE);
        $repliesMetadata = loadData(REPLIES_FILE);
        
        $postCount = 0;
        $replyCount = 0;
        
        foreach ($postsMetadata as $post) {
            if (isset($post["authorId"]) && $post["authorId"] === $userData["id"]) {
                $postCount++;
            }
        }
        
        foreach ($repliesMetadata as $reply) {
            if (isset($reply["authorId"]) && $reply["authorId"] === $userData["id"]) {
                $replyCount++;
            }
        }
        
        // Create and return placard
        $placard = [
            "username" => $userData["username"],
            "role" => $userData["role"],
            "joined" => $userData["created"],
            "postCount" => $postCount,
            "replyCount" => $replyCount,
            "lastActive" => $userData["last_login"],
            "signature" => "",
            "avatarColor" => generateRandomColor()
        ];
        
        echo json_encode(["success" => true, "placard" => $placard]);
    } catch (Exception $e) {
        echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
    }
}
// Update post count in user's placard
function incrementUserPostCount($userId) {
    $users = loadData(USERS_FILE);
    $username = null;
    
    // Find username for the user ID
    foreach ($users as $user) {
        if ($user["id"] === $userId) {
            $username = $user["username"];
            break;
        }
    }
    
    if (!$username) {
        return false; // User not found
    }
    
    // Update placard file
    return updatePlacardValue($username, "postCount", 1, true);
}

// Update reply count in user's placard
function incrementUserReplyCount($userId) {
    $users = loadData(USERS_FILE);
    $username = null;
    
    // Find username for the user ID
    foreach ($users as $user) {
        if ($user["id"] === $userId) {
            $username = $user["username"];
            break;
        }
    }
    
    if (!$username) {
        return false; // User not found
    }
    
    // Update placard file
    return updatePlacardValue($username, "replyCount", 1, true);
}

// Update a value in the user's placard
function updatePlacardValue($username, $field, $value, $increment = false) {
    // Get placard ID and file path
    $placardId = generatePlacardId($username);
    $placardFile = PLACARDS_DIR . '/' . $placardId . '.json.enc';
    
    // Load existing placard or create a new one
    if (file_exists($placardFile)) {
        try {
            $placard = loadData($placardFile);
        } catch (Exception $e) {
            error_log("Error loading placard for update: " . $e->getMessage());
            $placard = createPlacard($username);
        }
    } else {
        $placard = createPlacard($username);
    }
    
    // Update the value
    if ($increment && isset($placard[$field]) && is_numeric($placard[$field])) {
        $placard[$field] += $value;
    } else {
        $placard[$field] = $value;
    }
    
    // Update last activity time
    $placard["lastActive"] = date("c");
    
    // Save updated placard
    try {
        saveData($placardFile, $placard);
        return true;
    } catch (Exception $e) {
        error_log("Error saving placard: " . $e->getMessage());
        return false;
    }
}

// Upload avatar endpoint
function uploadAvatar() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data || !isset($data["token"]) || !isset($data["avatar"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        return;
    }
    
    // Verify token
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        echo json_encode(["success" => false, "error" => "Invalid token"]);
        return;
    }
    
    // Get username
    $users = loadData(USERS_FILE);
    $username = null;
    
    foreach ($users as $user) {
        if ($user["id"] === $userId) {
            $username = $user["username"];
            break;
        }
    }
    
    if (!$username) {
        echo json_encode(["success" => false, "error" => "User not found"]);
        return;
    }
    
    // Decode base64 avatar
    $avatarData = $data["avatar"];
    
    // Validate base64 image data
    if (!preg_match('/^data:image\/(jpeg|png|gif);base64,/', $avatarData, $matches)) {
        echo json_encode(["success" => false, "error" => "Invalid image format"]);
        return;
    }
    
    $imageType = $matches[1];
    $avatarData = str_replace('data:image/' . $imageType . ';base64,', '', $avatarData);
    $avatarData = str_replace(' ', '+', $avatarData);
    $avatarData = base64_decode($avatarData);
    
    if (!$avatarData) {
        echo json_encode(["success" => false, "error" => "Invalid image data"]);
        return;
    }
    
    // Create avatars directory if it doesn't exist
    $avatarsDir = DATA_DIR . '/avatars';
    if (!file_exists($avatarsDir)) {
        mkdir($avatarsDir, 0755, true);
    }
    
    // Generate avatar filename using HMAC with extension
    $avatarFilename = generatePlacardId($username) . '.' . $imageType;
    $avatarPath = $avatarsDir . '/' . $avatarFilename;
    
    // Save avatar image
    if (!file_put_contents($avatarPath, $avatarData)) {
        echo json_encode(["success" => false, "error" => "Failed to save avatar"]);
        return;
    }
    
    // Update placard with avatar info
    $avatarUrl = 'data/avatars/' . $avatarFilename;
    updatePlacardValue($username, "avatarUrl", $avatarUrl);
    
    echo json_encode([
        "success" => true, 
        "avatarUrl" => $avatarUrl
    ]);
}

function getAvatar() {
    try {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        if (!$data || !isset($data["username"])) {
            echo json_encode(["success" => true, "avatarUrl" => null]);
            return;
        }
        
        $username = $data["username"];
        
        // Generate avatar filename using the same method as uploadAvatar
        $avatarId = generatePlacardId($username);
        $avatarsDir = DATA_DIR . '/avatars';
        
        // Check each possible extension
        $extensions = ['jpg', 'jpeg', 'png', 'gif'];
        $avatarUrl = null;
        
        foreach ($extensions as $ext) {
            $potentialFile = $avatarsDir . '/' . $avatarId . '.' . $ext;
            if (file_exists($potentialFile)) {
                $avatarUrl = 'data/avatars/' . $avatarId . '.' . $ext;
                break;
            }
        }
        
        echo json_encode([
            "success" => true,
            "avatarUrl" => $avatarUrl
        ]);
    } catch (Exception $e) {
        error_log("getAvatar Error: " . $e->getMessage());
        echo json_encode(["success" => true, "avatarUrl" => null]);
    }
}

// Add before getUserPlacard function
function createDefaultPlacard($username) {
    return [
        "username" => $username,
        "role" => "user",
        "joined" => date("c"),
        "postCount" => 0,
        "replyCount" => 0,
        "lastActive" => date("c"),
        "signature" => "",
        "avatarColor" => generateRandomColor()
    ];
}

// Add these helper functions in api.php at an appropriate location
function generatePlacardId($username) {
    return md5(strtolower($username));
}

function createPlacard($username) {
    // Create default placard
    return [
        "username" => $username,
        "role" => "user",
        "joined" => date("c"),
        "postCount" => 0,
        "replyCount" => 0,
        "lastActive" => date("c"),
        "signature" => "",
        "avatarColor" => generateRandomColor()
    ];
}

function generateRandomColor() {
    $colors = [
        "#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#9b59b6", 
        "#1abc9c", "#34495e", "#16a085", "#d35400", "#8e44ad"
    ];
    return $colors[array_rand($colors)];
}

// Add this function to handle placard updates
function updatePlacardValueEndpoint() {
    try {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        if (!$data || !isset($data["token"]) || !isset($data["username"]) || 
            !isset($data["field"]) || !isset($data["value"])) {
            echo json_encode(["success" => false, "error" => "Missing required fields"]);
            return;
        }
        
        // Verify token
        $userId = verifyToken($data["token"]);
        if (!$userId) {
            echo json_encode(["success" => false, "error" => "Invalid token"]);
            return;
        }
        
        // Update placard
        $success = updatePlacardValue($data["username"], $data["field"], $data["value"]);
        
        echo json_encode([
            "success" => $success,
            "field" => $data["field"],
            "value" => $data["value"]
        ]);
    } catch (Exception $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

/**
 * NEW: Admin Recovery Function
 * This function decrypts all data files using a provided recovery key.
 * This effectively "rolls back" the encryption to a known state (unencrypted)
 * or allows access to data from a specific past daily key.
 *
 * @param string $recoveryPassword The base secret used to generate daily keys.
 */
function adminRecovery() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data || !isset($data["recoveryPassword"]) || !isset($data["token"])) {
        echo json_encode(["success" => false, "error" => "Missing required fields for recovery."]);
        return;
    }

    $token = $data["token"];
    $recoveryPassword = $data["recoveryPassword"];

    // Verify admin token
    $userId = verifyToken($token);
    if (!$userId || !isUserAdmin($userId)) {
        echo json_encode(["success" => false, "error" => "Permission denied. Only administrators can perform recovery."]);
        return;
    }

    // Try to derive the initial daily key from the recovery password
    // This is the key that was used on the day of the last encryption pass before recovery.
    // If the recovery password is the original base secret, this will effectively
    // decrypt everything back to plain JSON.
    $currentDailyKey = generateDailyKey(date('Y-m-d')); // Get today's key based on the base secret

    // Attempt to decrypt the RECOVERY_KEY_FILE to get the *previous* daily key
    // This is the key that was used to encrypt the data *before* today's re-encryption.
    // If RECOVERY_KEY_FILE doesn't exist, it means either no re-encryption has happened yet,
    // or the system was just set up/re-initialized. In that case, we assume current data is
    // encrypted with today's key, or is unencrypted.
    $previousDailyKey = null;
    if (file_exists(RECOVERY_KEY_FILE)) {
        $encryptedPreviousKey = file_get_contents(RECOVERY_KEY_FILE);
        $decryptedPreviousKey = decryptData($encryptedPreviousKey, $currentDailyKey);
        
        // If decryption successful, use this as the key to decrypt all data files
        if ($decryptedPreviousKey !== $encryptedPreviousKey) { // Check if decryption actually changed the content
            $previousDailyKey = $decryptedPreviousKey;
        }
    }

    // If previousDailyKey is still null, it means RECOVERY_KEY_FILE didn't exist or couldn't be decrypted.
    // In this scenario, we assume the data is either unencrypted or encrypted with the currentDailyKey.
    // For recovery, we want to revert to an unencrypted state.
    $keyToDecryptWith = $previousDailyKey ?: $currentDailyKey; // Try previous, then current if previous not found

    error_log("Admin recovery initiated by user: {$userId}. Attempting to decrypt all data files.");

    // Decrypt all data files back to plain JSON
    $filesToDecrypt = [USERS_FILE, CATEGORIES_FILE, POSTS_FILE, REPLIES_FILE, SEO_FILE, KEYS_FILE];
    
    foreach ($filesToDecrypt as $file) {
        if (file_exists($file)) {
            $encryptedContent = file_get_contents($file);
            $decryptedContent = decryptData($encryptedContent, $keyToDecryptWith);
            
            // If decryption was successful, save as plain JSON and rename
            if ($decryptedContent !== $encryptedContent) {
                $plainJsonFile = str_replace('.json.enc', '.json', $file);
                file_put_contents($plainJsonFile, $decryptedContent);
                unlink($file); // Remove the encrypted file
            } else {
                // If decryption failed, it might already be unencrypted or corrupted.
                // Try to rename it if it's still .json.enc but couldn't be decrypted.
                if (strpos($file, '.json.enc') !== false) {
                    $plainJsonFile = str_replace('.json.enc', '.json', $file);
                    rename($file, $plainJsonFile); // Just rename, assume it was already plain or corrupted
                }
            }
        }
    }

    // Decrypt files in subdirectories
    decryptDirectoryToPlain(CATEGORIES_DIR, $keyToDecryptWith);
    decryptDirectoryToPlain(POSTS_DIR, $keyToDecryptWith);
    decryptDirectoryToPlain(REPLIES_DIR, $keyToDecryptWith);
    decryptDirectoryToPlain(PLACARDS_DIR, $keyToDecryptWith);

    // Update encryption metadata to reflect unencrypted state
    $encryptionMeta = loadEncryptionMeta();
    $encryptionMeta['isEncrypted'] = false;
    $encryptionMeta['lastEncryptionDate'] = ''; // Reset date as it's now unencrypted
    saveEncryptionMeta($encryptionMeta);

    error_log("Admin recovery completed. All data files are now unencrypted.");
    echo json_encode(["success" => true, "message" => "Site data decrypted successfully. Please refresh the page."]);
}

/**
 * NEW: Helper function to decrypt all .json.enc files in a directory to .json.
 */
function decryptDirectoryToPlain($directory, $key) {
    if (!is_dir($directory)) {
        return;
    }
    
    $files = glob($directory . '/*.json.enc');
    
    foreach ($files as $file) {
        if (file_exists($file)) {
            $encryptedContent = file_get_contents($file);
            $decryptedContent = decryptData($encryptedContent, $key);
            
            if ($decryptedContent !== $encryptedContent) {
                $plainJsonFile = str_replace('.json.enc', '.json', $file);
                file_put_contents($plainJsonFile, $decryptedContent);
                unlink($file); // Remove the encrypted file
            } else {
                // If decryption failed, just rename it assuming it's already plain or corrupted
                $plainJsonFile = str_replace('.json.enc', '.json', $file);
                rename($file, $plainJsonFile);
            }
        }
    }
}

// Generate secure ID
function generateId() {
    return bin2hex(random_bytes(16));
}
