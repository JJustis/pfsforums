<?php
// Secure Forum API with Daily Encryption, Locking, and Timing Attack Protection
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
define('KEYS_FILE', DATA_DIR . '/server_keys.json.enc');

// Locking and progress files
define('LOCK_FILE', DATA_DIR . '/reencryption.lock');
define('PROGRESS_FILE', DATA_DIR . '/reencryption_progress.json');
define('QUEUE_FILE', DATA_DIR . '/operation_queue.json');

// Individual item directories
define('CATEGORIES_DIR', DATA_DIR . '/categories');
define('POSTS_DIR', DATA_DIR . '/posts');
define('REPLIES_DIR', DATA_DIR . '/replies');
define('PLACARDS_DIR', DATA_DIR . '/placards');
define('AVATARS_DIR', DATA_DIR . '/avatars');

// Create data directories if they don't exist
$directories = [DATA_DIR, CATEGORIES_DIR, POSTS_DIR, REPLIES_DIR, PLACARDS_DIR, AVATARS_DIR];
foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Get action from the request
$action = isset($_GET["action"]) ? $_GET["action"] : "";

// Check if system is locked for re-encryption (except for admin and status checks)
if (isSystemLocked() && !in_array($action, ['get_encryption_status', 'daily_reencrypt', 'admin_status'])) {
    respondWithMaintenanceMode();
    exit;
}

// Wrap everything in a try-catch to prevent any errors from corrupting output
try {
    // Handle different actions
    switch ($action) {
        case "check_admin":
            checkAdminExists();
            break;
            
        case "register":
            handleWithLocking('register');
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
            handleWithLocking('create_category');
            break;
            
        case "delete_category":
            handleWithLocking('delete_category');
            break;
            
        case "verify_seo_password":
            verifySeoPasswordEndpoint();
            break;
            
        case "get_posts":
            getPosts();
            break;
            
        case "create_post":
            handleWithLocking('create_post');
            break;
            
        case "delete_post":
            handleWithLocking('delete_post');
            break;
            
        case "get_post":
            getPost();
            break;
            
        case "add_reply":
            handleWithLocking('add_reply');
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
            handleWithLocking('delete_reply');
            break;
            
        case "get_seo":
            getSeoSettings();
            break;
            
        case "save_seo":
            handleWithLocking('save_seo');
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
            
        case "daily_reencrypt":
            $result = performDailyReencryption();
            echo json_encode($result);
            break;
            
        case "get_avatar":
            getAvatar();
            break;

        case "upload_avatar":
            handleWithLocking('upload_avatar');
            break;

        case "update_placard_value":
            handleWithLocking('update_placard_value');
            break; 
            
        case "get_user_placard":
            getUserPlacard();
            break;
            
        case "get_system_status":
            getSystemStatus();
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

// ==================== LOCKING AND SECURITY FUNCTIONS ====================

function isSystemLocked() {
    return file_exists(LOCK_FILE);
}

function respondWithMaintenanceMode() {
    $maintenanceResponse = [
        'success' => false,
        'error' => 'System Maintenance',
        'message' => 'The forum is currently undergoing daily re-encryption for security. Please try again in a few minutes.',
        'maintenanceMode' => true,
        'retryAfter' => 300 // 5 minutes
    ];
    
    http_response_code(503); // Service Unavailable
    header('Retry-After: 300');
    echo json_encode($maintenanceResponse);
}

function createSystemLock() {
    $lockData = [
        'started' => time(),
        'pid' => getmypid(),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ];
    
    return file_put_contents(LOCK_FILE, json_encode($lockData)) !== false;
}

function removeSystemLock() {
    if (file_exists(LOCK_FILE)) {
        unlink(LOCK_FILE);
    }
    if (file_exists(PROGRESS_FILE)) {
        unlink(PROGRESS_FILE);
    }
}

function updateProgress($step, $current, $total, $message = '') {
    $progress = [
        'step' => $step,
        'current' => $current,
        'total' => $total,
        'message' => $message,
        'timestamp' => time(),
        'percentage' => $total > 0 ? round(($current / $total) * 100, 1) : 0
    ];
    
    file_put_contents(PROGRESS_FILE, json_encode($progress, JSON_PRETTY_PRINT));
}

function getFilesToReencrypt() {
    $files = [];
    
    // Main forum files
    $mainFiles = [
        USERS_FILE,
        CATEGORIES_FILE, 
        POSTS_FILE,
        REPLIES_FILE,
        SEO_FILE,
        SESSION_KEYS_FILE,
        KEYS_FILE
    ];
    
    foreach ($mainFiles as $file) {
        if (file_exists($file)) {
            $files[] = ['path' => $file, 'type' => 'file'];
        }
    }
    
    // Individual item directories
    $directories = [CATEGORIES_DIR, POSTS_DIR, REPLIES_DIR, PLACARDS_DIR];
    
    foreach ($directories as $dir) {
        if (is_dir($dir)) {
            $dirFiles = glob($dir . '/*.json*');
            foreach ($dirFiles as $file) {
                $files[] = ['path' => $file, 'type' => 'file'];
            }
        }
    }
    
    return $files;
}

// Clear all user sessions during re-encryption
function clearAllUserSessions() {
    try {
        // Clear session keys file - this will invalidate all active sessions
        if (file_exists(SESSION_KEYS_FILE)) {
            // Backup the session keys file
            $backupFile = SESSION_KEYS_FILE . '.backup.' . date('Y-m-d-H-i-s');
            copy(SESSION_KEYS_FILE, $backupFile);
            
            // Clear the session keys (invalidates all sessions)
            saveData(SESSION_KEYS_FILE, []);
            
            // Log the session clearing
            error_log("Cleared all user sessions during re-encryption");
        }
        
        // If using file-based sessions, clear the session directory
        $sessionPath = session_save_path();
        if ($sessionPath && is_dir($sessionPath)) {
            $sessionFiles = glob($sessionPath . '/sess_*');
            foreach ($sessionFiles as $sessionFile) {
                @unlink($sessionFile);
            }
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error clearing user sessions: " . $e->getMessage());
        return false;
    }
}

function queueOperation($operation, $data) {
    $queue = [];
    if (file_exists(QUEUE_FILE)) {
        $queue = json_decode(file_get_contents(QUEUE_FILE), true) ?: [];
    }
    
    $queue[] = [
        'operation' => $operation,
        'data' => $data,
        'timestamp' => time(),
        'user_id' => $data['userId'] ?? null
    ];
    
    file_put_contents(QUEUE_FILE, json_encode($queue));
}

function processQueuedOperations() {
    if (!file_exists(QUEUE_FILE)) {
        return;
    }
    
    $queue = json_decode(file_get_contents(QUEUE_FILE), true) ?: [];
    $processed = 0;
    $failed = 0;
    
    foreach ($queue as $item) {
        try {
            switch ($item['operation']) {
                case 'create_post':
                    $result = executeCreatePost($item['data']);
                    if ($result) $processed++; else $failed++;
                    break;
                    
                case 'add_reply':
                    $result = executeAddReply($item['data']);
                    if ($result) $processed++; else $failed++;
                    break;
                    
                case 'create_category':
                    $result = executeCreateCategory($item['data']);
                    if ($result) $processed++; else $failed++;
                    break;
                    
                default:
                    $failed++;
            }
        } catch (Exception $e) {
            error_log("Failed to process queued operation: " . $e->getMessage());
            $failed++;
        }
    }
    
    // Clear the queue
    unlink(QUEUE_FILE);
    
    error_log("Processed queued operations: $processed successful, $failed failed");
}

function handleWithLocking($operation) {
    if (isSystemLocked()) {
        // Get input data for queuing
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        // Add user ID if token exists
        if (isset($data['token'])) {
            $data['userId'] = verifyToken($data['token']);
        }
        
        queueOperation($operation, $data);
        
        echo json_encode([
            "success" => false, 
            "error" => "System is currently performing maintenance. Your operation has been queued and will be processed shortly.",
            "queued" => true,
            "maintenance" => true
        ]);
        return;
    }
    
    // Execute the operation
    switch ($operation) {
        case 'register':
            register();
            break;
        case 'create_category':
            createCategory();
            break;
        case 'delete_category':
            deleteCategory();
            break;
        case 'create_post':
            createPost();
            break;
        case 'delete_post':
            deletePost();
            break;
        case 'add_reply':
            addReply();
            break;
        case 'delete_reply':
            deleteReply();
            break;
        case 'save_seo':
            saveSeoSettings();
            break;
        case 'upload_avatar':
            uploadAvatar();
            break;
        case 'update_placard_value':
            updatePlacardValueEndpoint();
            break;
    }
}

function getSystemStatus() {
    $status = [
        'locked' => isSystemLocked(),
        'progress' => getReencryptionProgress(),
        'encryption_meta' => loadEncryptionMeta()
    ];
    
    echo json_encode(['success' => true, 'status' => $status]);
}

function getReencryptionProgress() {
    if (!file_exists(PROGRESS_FILE)) {
        return null;
    }
    
    $progress = json_decode(file_get_contents(PROGRESS_FILE), true);
    return $progress;
}

// Daily re-encryption function (can be called via admin or cron)
function performDailyReencryption() {
    if (isSystemLocked()) {
        return ['success' => false, 'error' => 'Re-encryption already in progress'];
    }
    
    if (!createSystemLock()) {
        return ['success' => false, 'error' => 'Failed to create system lock'];
    }
    
    try {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        $oldKey = generateDailyKey($yesterday);
        $newKey = generateDailyKey($today);
        
        // If keys are the same, no need to re-encrypt
        if ($oldKey === $newKey) {
            removeSystemLock();
            return ['success' => true, 'message' => 'No re-encryption needed, keys unchanged'];
        }
        
        updateProgress('starting', 0, 100, 'Starting daily re-encryption...');
        
        // Clear all user sessions before starting re-encryption
        clearAllUserSessions();
        
        updateProgress('starting', 10, 100, 'Cleared all user sessions...');
        
        // Get files to process
        $filesToProcess = getFilesToReencrypt();
        $totalFiles = count($filesToProcess);
        
        $processed = 0;
        $failed = 0;
        
        foreach ($filesToProcess as $file) {
            $processed++;
            
            updateProgress('processing', $processed, $totalFiles, 
                "Re-encrypting: " . basename($file['path']));
            
            if (dailyReencryptSingleFile($file['path'], $oldKey, $newKey)) {
                // Success
            } else {
                $failed++;
                error_log("Failed to re-encrypt: " . $file['path']);
            }
            
            usleep(5000); // 5ms delay
        }
        
        // Update metadata
        $encryptionMeta = loadEncryptionMeta();
        $encryptionMeta['lastEncryptionDate'] = $today;
        $encryptionMeta['isEncrypted'] = true;
        $encryptionMeta['lastReEncryption'] = date('c');
        $encryptionMeta['filesProcessed'] = $processed;
        $encryptionMeta['filesFailed'] = $failed;
        $encryptionMeta['dailyReencryption'] = true;
        
        // Remove masterKey if it exists (we use daily keys now)
        if (isset($encryptionMeta['masterKey'])) {
            unset($encryptionMeta['masterKey']);
        }
        
        saveEncryptionMeta($encryptionMeta);
        
        updateProgress('complete', $totalFiles, $totalFiles, 'Daily re-encryption completed!');
        
        sleep(1);
        removeSystemLock();
        
        return ['success' => true, 'processed' => $processed, 'failed' => $failed];
        
    } catch (Exception $e) {
        error_log("Daily re-encryption failed: " . $e->getMessage());
        updateProgress('error', 0, 100, 'Daily re-encryption failed: ' . $e->getMessage());
        removeSystemLock();
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Re-encrypt a single file with daily keys
function dailyReencryptSingleFile($file, $oldKey, $newKey) {
    try {
        if (!file_exists($file)) {
            return true; // File doesn't exist, consider it successful
        }
        
        $rawData = file_get_contents($file);
        if ($rawData === false) {
            return false;
        }
        
        // Try to decrypt with the old key
        $decryptedData = safeDecryptData($rawData, $oldKey);
        
        // If decryption failed, try with new key (might already be encrypted with today's key)
        if (json_decode($decryptedData, true) === null && $decryptedData !== 'null') {
            $decryptedData = safeDecryptData($rawData, $newKey);
            
            // If still failed, it might be plain JSON
            if (json_decode($decryptedData, true) === null && $decryptedData !== 'null') {
                // Check if raw data is valid JSON (unencrypted)
                if (json_decode($rawData, true) !== null || $rawData === 'null') {
                    $decryptedData = $rawData;
                } else {
                    return false; // Cannot decrypt or parse
                }
            }
        }
        
        // Re-encrypt with new key
        $encryptedData = encryptData($decryptedData, $newKey);
        
        // Create backup
        $backupFile = $file . '.backup.' . date('Y-m-d-H-i-s');
        copy($file, $backupFile);
        
        // Save re-encrypted data
        $result = file_put_contents($file, $encryptedData);
        
        if ($result !== false) {
            // Remove backup on success
            unlink($backupFile);
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error re-encrypting file $file: " . $e->getMessage());
        return false;
    }
}

// ==================== ENCRYPTION FUNCTIONS ====================

function generateDailyKey($dateString) {
    $baseSecret = "S3cure#F0rum#System#2025";
    $combinedString = $baseSecret . $dateString;
    return hash('sha256', $combinedString);
}

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

function safeDecryptData($encryptedData, $key) {
    try {
        // Create decryption key from password
        $decKey = substr(hash('sha256', $key, true), 0, 32);
        
        // Check if data looks encrypted
        if (!isEncryptedData($encryptedData)) {
            return $encryptedData;
        }
        
        // Decode from base64
        $data = base64_decode($encryptedData);
        
        if ($data === false || strlen($data) < 16) {
            return $encryptedData;
        }
        
        // Extract IV (first 16 bytes)
        $iv = substr($data, 0, 16);
        
        // Extract the encrypted data (everything after IV)
        $encrypted = substr($data, 16);
        
        // Decrypt
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $decKey, 0, $iv);
        
        if ($decrypted === false) {
            return $encryptedData;
        }
        
        return $decrypted;
        
    } catch (Exception $e) {
        error_log("Decryption error: " . $e->getMessage());
        return $encryptedData;
    }
}

function isEncryptedData($data) {
    // Check if it's valid base64
    if (base64_decode($data, true) === false) {
        return false;
    }
    
    // Check if it looks like JSON (encrypted data shouldn't look like JSON)
    $trimmed = trim($data);
    if (($trimmed[0] === '{' && substr($trimmed, -1) === '}') || 
        ($trimmed[0] === '[' && substr($trimmed, -1) === ']')) {
        return false;
    }
    
    // Check length - encrypted data with IV should be longer
    $decoded = base64_decode($data);
    if (strlen($decoded) < 32) { // IV (16) + some encrypted content
        return false;
    }
    
    return true;
}

function loadEncryptionMeta() {
    if (file_exists(ENCRYPTION_META_FILE)) {
        $data = file_get_contents(ENCRYPTION_META_FILE);
        $meta = json_decode($data, true);
        
        if (is_array($meta)) {
            // Ensure all required fields exist
            $defaults = [
                'lastEncryptionDate' => '',
                'isEncrypted' => false,
                'initialized' => '',
                'lastReEncryption' => '',
                'version' => '1.0'
            ];
            
            return array_merge($defaults, $meta);
        }
    }
    
    // Default encryption metadata
    return [
        'lastEncryptionDate' => '',
        'isEncrypted' => false,
        'initialized' => '',
        'lastReEncryption' => '',
        'version' => '1.0'
    ];
}

function saveEncryptionMeta($metadata) {
    try {
        $metadata['lastUpdate'] = date('c');
        $result = file_put_contents(ENCRYPTION_META_FILE, json_encode($metadata, JSON_PRETTY_PRINT));
        return $result !== false;
    } catch (Exception $e) {
        error_log("Error saving encryption metadata: " . $e->getMessage());
        return false;
    }
}

// Try to decrypt data with daily keys (today, yesterday, and day before)
function tryDecryptWithDailyKeys($rawData) {
    $today = date('Y-m-d');
    
    // Try today's key first
    $todayKey = generateDailyKey($today);
    $jsonData = safeDecryptData($rawData, $todayKey);
    
    // Check if decryption worked
    if (json_decode($jsonData, true) !== null || $jsonData === 'null') {
        return $jsonData;
    }
    
    // Try yesterday's key
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $yesterdayKey = generateDailyKey($yesterday);
    $jsonData = safeDecryptData($rawData, $yesterdayKey);
    
    if (json_decode($jsonData, true) !== null || $jsonData === 'null') {
        return $jsonData;
    }
    
    // Try day before yesterday's key
    $dayBefore = date('Y-m-d', strtotime('-2 days'));
    $dayBeforeKey = generateDailyKey($dayBefore);
    $jsonData = safeDecryptData($rawData, $dayBeforeKey);
    
    if (json_decode($jsonData, true) !== null || $jsonData === 'null') {
        return $jsonData;
    }
    
    // If none worked, return original data (might be plain JSON)
    return $rawData;
}

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
    
    try {
        // Read file contents
        $rawData = file_get_contents($file);
        if ($rawData === false) {
            error_log("Failed to read file: $file");
            return [];
        }
        
        // Try multiple keys for decryption (daily keys with fallback)
        $jsonData = tryDecryptWithDailyKeys($rawData);
        
        // Parse JSON
        $data = json_decode($jsonData, true);
        
        if ($data === null && $jsonData !== 'null') {
            error_log("Failed to parse JSON from file: $file");
            return [];
        }
        
        return $data ?: [];
        
    } catch (Exception $e) {
        error_log("Error loading data from $file: " . $e->getMessage());
        return [];
    }
}

function saveData($file, $data) {
    try {
        // Create directory if needed
        $dir = dirname($file);
        if (!file_exists($dir)) {
            if (!mkdir($dir, 0755, true)) {
                throw new Exception("Failed to create directory: $dir");
            }
        }
        
        // Convert data to JSON
        $jsonData = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($jsonData === false) {
            throw new Exception("Failed to encode data to JSON");
        }
        
        // Get today's encryption key
        $today = date('Y-m-d');
        $encryptionKey = generateDailyKey($today);
        
        // Check if encryption is enabled
        $encryptionMeta = loadEncryptionMeta();
        
        if ($encryptionMeta['isEncrypted']) {
            // Encrypt the data
            $encryptedData = encryptData($jsonData, $encryptionKey);
            $result = file_put_contents($file, $encryptedData);
        } else {
            // Save as plain JSON
            $result = file_put_contents($file, $jsonData);
        }
        
        if ($result === false) {
            throw new Exception("Failed to write to file: $file");
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error saving data to $file: " . $e->getMessage());
        return false;
    }
}

// ==================== API ENDPOINT FUNCTIONS ====================

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

function executeCreatePost($data = null) {
    if ($data === null) {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
    }
    
    if (!$data) {
        return false;
    }
    
    if (!isset($data["title"]) || !isset($data["content"]) || 
        !isset($data["categoryId"]) || !isset($data["token"])) {
        return false;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        return false;
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
        return false;
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
    
    return true;
}

function createPost() {
    $result = executeCreatePost();
    
    if ($result) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "error" => "Failed to create post"]);
    }
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
function executeCreateCategory($data = null) {
    if ($data === null) {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
    }
    
    if (!$data || !isset($data["name"]) || !isset($data["description"]) || !isset($data["token"])) {
        return false;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        return false;
    }
    
    // Check if user is admin
    $isAdmin = isUserAdmin($userId);
    if (!$isAdmin) {
        return false;
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
    
    return true;
}

function createCategory() {
    $result = executeCreateCategory();
    
    if ($result) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "error" => "Failed to create category"]);
    }
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
function executeAddReply($data = null) {
    if ($data === null) {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
    }
    
    if (!$data || !isset($data["postId"]) || !isset($data["content"]) || !isset($data["token"])) {
        return false;
    }
    
    $userId = verifyToken($data["token"]);
    if (!$userId) {
        return false;
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
        return false;
    }
    
    // Check if post exists
    $postId = $data["postId"];
    $postFile = POSTS_DIR . '/' . $postId . '.json.enc';
    
    if (!file_exists($postFile)) {
        return false;
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
    
    return true;
}

function addReply() {
    $result = executeAddReply();
    
    if ($result) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "error" => "Failed to add reply"]);
    }
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

// Federation and file sharing functions (stubs for now)
function getFederationStatusEndpoint() {
    echo json_encode(["success" => true, "status" => "Not implemented"]);
}

function connectServerEndpoint() {
    echo json_encode(["success" => false, "error" => "Not implemented"]);
}

function shareFileEndpoint() {
    echo json_encode(["success" => false, "error" => "Not implemented"]);
}

function importFileEndpoint() {
    echo json_encode(["success" => false, "error" => "Not implemented"]);
}

// Avatar and placard functions
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
        $username = $data["username"];
        
        // Get user data
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

// Helper functions
function generatePlacardId($username) {
    return md5(strtolower($username));
}

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

?>