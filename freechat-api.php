<?php
/**
 * FreeChat API with Global Key Rotation and Encrypted Files
 * Uses the same encryption systems as the main forum
 */

// Set content type to JSON
header('Content-Type: application/json');

// Disable error display for production
ini_set('display_errors', 0);
error_reporting(0);

// Start output buffering to prevent any unexpected output
ob_start();

// Create data directories if they don't exist
define('DATA_DIR', 'data');
define('FREECHAT_DIR', DATA_DIR . '/freechat');
define('GLOBAL_KEYS_FILE', FREECHAT_DIR . '/global_keys.json.enc');
define('GLOBAL_CHAT_FILE', FREECHAT_DIR . '/global_chat.json.enc');
define('TYPING_STATUS_FILE', FREECHAT_DIR . '/typing_status.json.enc');
define('ONLINE_STATUS_FILE', FREECHAT_DIR . '/online_status.json.enc');

if (!file_exists(FREECHAT_DIR)) {
    mkdir(FREECHAT_DIR, 0755, true);
}

// Get action from the request
$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    // Check for key rotation before handling any action
    checkAndRotateKey();
    
    // Handle different actions
    switch ($action) {
        case 'get_encryption_keys':
            getGlobalEncryptionKeys();
            break;
            
        case 'get_messages':
            getMessages();
            break;
            
        case 'send_message':
            sendMessage();
            break;
            
        case 'typing':
            updateTypingStatus();
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    // Log error but don't expose details
    error_log("FreeChat API Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error occurred: ' . $e->getMessage()]);
}

// End buffer and exit
ob_end_flush();
exit;

/**
 * Check if key needs rotation and perform rotation if needed
 */
function checkAndRotateKey() {
    // Check if global keys file exists
    if (!file_exists(GLOBAL_KEYS_FILE)) {
        // Create initial keys
        generateGlobalKeys();
        return;
    }
    
    // Load existing keys
    $keys = loadData(GLOBAL_KEYS_FILE);
    
    // Check if keys are valid
    if (!isset($keys['firstHalfKey']) || !isset($keys['secondHalfKey']) || 
        !isset($keys['created']) || !isset($keys['validUntil'])) {
        // Invalid keys, regenerate
        generateGlobalKeys();
        return;
    }
    
    // Check if keys have expired
    $validUntil = strtotime($keys['validUntil']);
    if (time() > $validUntil) {
        // Keys have expired, rotate them
        rotateGlobalKeys();
    }
}

/**
 * Generate new global encryption keys
 */
function generateGlobalKeys() {
    $keys = [
        'firstHalfKey' => bin2hex(random_bytes(16)),
        'secondHalfKey' => bin2hex(random_bytes(16)),
        'created' => date('c'),
        'validUntil' => date('c', strtotime('+24 hours')),
        'keyId' => uniqid()
    ];
    
    // Save the keys
    saveData(GLOBAL_KEYS_FILE, $keys);
    
    // Return the keys for convenience
    return $keys;
}

/**
 * Rotate global encryption keys and clear old messages
 */
function rotateGlobalKeys() {
    // Generate new keys
    $keys = generateGlobalKeys();
    
    // Clear old chat messages
    if (file_exists(GLOBAL_CHAT_FILE)) {
        saveData(GLOBAL_CHAT_FILE, []);
    }
    
    // Log key rotation
    error_log("FreeChat: Rotated encryption keys. New key ID: " . $keys['keyId']);
    
    return $keys;
}

/**
 * Get global encryption keys for secure messaging
 */
function getGlobalEncryptionKeys() {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing token']);
        return;
    }
    
    // Validate token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        return;
    }
    
    // Get username from token
    $username = getUsernameFromId($userId);
    
    // Update online status
    updateOnlineStatus($username);
    
    // Load global keys
    $keys = loadData(GLOBAL_KEYS_FILE);
    
    // Return the keys
    echo json_encode([
        'success' => true,
        'firstHalfKey' => $keys['firstHalfKey'],
        'secondHalfKey' => $keys['secondHalfKey'],
        'keyId' => $keys['keyId'],
        'validUntil' => $keys['validUntil']
    ]);
}

/**
 * Get new messages
 */
function getMessages() {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['token'])) {
        echo json_encode(['success' => false, 'error' => 'Missing token']);
        return;
    }
    
    // Validate token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        return;
    }
    
    // Get username from ID
    $username = getUsernameFromId($userId);
    
    // Update online status
    updateOnlineStatus($username);
    
    // Get last message ID if provided
    $lastId = isset($data['lastId']) ? intval($data['lastId']) : 0;
    
    // Load messages
    $messages = [];
    if (file_exists(GLOBAL_CHAT_FILE)) {
        $messages = loadData(GLOBAL_CHAT_FILE);
    }
    
    // Filter messages newer than lastId
    $newMessages = array_filter($messages, function($msg) use ($lastId) {
        return $msg['id'] > $lastId;
    });
    
    // Check typing status
    $someoneTyping = false;
    $typingUsername = '';
    
    if (file_exists(TYPING_STATUS_FILE)) {
        $typingData = loadData(TYPING_STATUS_FILE);
        
        foreach ($typingData as $user => $status) {
            if ($user !== $username && isset($status['typing']) && $status['typing'] && 
                isset($status['timestamp']) && (time() - $status['timestamp'] < 5)) {
                $someoneTyping = true;
                $typingUsername = $user;
                break;
            }
        }
    }
    
    // Get online users
    $onlineUsers = getOnlineUsers();
    
    // Load key info
    $keys = loadData(GLOBAL_KEYS_FILE);
    
    echo json_encode([
        'success' => true,
        'messages' => array_values($newMessages),
        'someoneTyping' => $someoneTyping,
        'typingUsername' => $typingUsername,
        'onlineUsers' => $onlineUsers,
        'keyInfo' => [
            'keyId' => $keys['keyId'],
            'validUntil' => $keys['validUntil']
        ]
    ]);
}

/**
 * Send a new message
 */
function sendMessage() {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['token']) || !isset($data['message'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Validate token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        return;
    }
    
    // Get username
    $username = getUsernameFromId($userId);
    
    // Update online status
    updateOnlineStatus($username);
    
    // Load messages
    $messages = [];
    if (file_exists(GLOBAL_CHAT_FILE)) {
        $messages = loadData(GLOBAL_CHAT_FILE);
    }
    
    // Create new message ID
    $newId = 1;
    if (!empty($messages)) {
        $newId = max(array_column($messages, 'id')) + 1;
    }
    
    // Get current key ID
    $keyInfo = loadData(GLOBAL_KEYS_FILE);
    $keyId = isset($keyInfo['keyId']) ? $keyInfo['keyId'] : 'unknown';
    
    // Create message
    $message = [
        'id' => $newId,
        'username' => $username,
        'content' => $data['message'],
        'timestamp' => time(),
        'isAdmin' => isUserAdmin($userId),
        'keyId' => $keyId // Include current key ID for reference
    ];
    
    // Add message
    $messages[] = $message;
    
    // Save messages
    saveData(GLOBAL_CHAT_FILE, $messages);
    
    echo json_encode(['success' => true, 'messageId' => $newId]);
}

/**
 * Update typing status
 */
function updateTypingStatus() {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['token']) || !isset($data['typing'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }
    
    // Validate token
    $userId = verifyToken($data['token']);
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        return;
    }
    
    // Get username
    $username = getUsernameFromId($userId);
    
    // Update online status
    updateOnlineStatus($username);
    
    // Load typing data
    $typingData = [];
    if (file_exists(TYPING_STATUS_FILE)) {
        $typingData = loadData(TYPING_STATUS_FILE);
    }
    
    // Update typing status
    $typingData[$username] = [
        'typing' => $data['typing'],
        'timestamp' => time()
    ];
    
    // Save typing data
    saveData(TYPING_STATUS_FILE, $typingData);
    
    echo json_encode(['success' => true]);
}

/**
 * Update user's online status
 */
function updateOnlineStatus($username) {
    // Load online status data
    $onlineData = [];
    if (file_exists(ONLINE_STATUS_FILE)) {
        $onlineData = loadData(ONLINE_STATUS_FILE);
    }
    
    // Update status
    $onlineData[$username] = [
        'online' => true,
        'timestamp' => time()
    ];
    
    // Remove old entries (offline for more than 5 minutes)
    foreach ($onlineData as $user => $status) {
        if (time() - $status['timestamp'] > 300) {
            unset($onlineData[$user]);
        }
    }
    
    // Save online status
    saveData(ONLINE_STATUS_FILE, $onlineData);
}

/**
 * Get list of online users
 * @return array List of usernames
 */
function getOnlineUsers() {
    $users = [];
    
    if (file_exists(ONLINE_STATUS_FILE)) {
        $onlineData = loadData(ONLINE_STATUS_FILE);
        
        foreach ($onlineData as $user => $status) {
            if (isset($status['online']) && $status['online'] && 
                isset($status['timestamp']) && time() - $status['timestamp'] < 300) {
                $users[] = $user;
            }
        }
    }
    
    return $users;
}

/**
 * Verify token and get user ID
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
 * Get username from user ID
 * @param string $userId User ID
 * @return string Username
 */
function getUsernameFromId($userId) {
    // Look in users.json.enc if it exists
    $usersFile = DATA_DIR . '/users.json.enc';
    if (file_exists($usersFile)) {
        $users = loadData($usersFile);
        
        foreach ($users as $user) {
            if ($user['id'] === $userId) {
                return $user['username'];
            }
        }
    }
    
    // Fallback to a generated username
    return 'user_' . substr($userId, 0, 5);
}

/**
 * Check if user is admin
 * @param string $userId User ID
 * @return bool Is admin
 */
function isUserAdmin($userId) {
    // Look in users.json.enc if it exists
    $usersFile = DATA_DIR . '/users.json.enc';
    if (file_exists($usersFile)) {
        $users = loadData($usersFile);
        
        foreach ($users as $user) {
            if ($user['id'] === $userId && isset($user['role']) && $user['role'] === 'admin') {
                return true;
            }
        }
    }
    
    // Fallback
    return false;
}

/**
 * Load data from JSON file (with encryption support)
 * @param string $file File path
 * @return array Decoded data
 */
function loadData($file) {
    if (!file_exists($file)) {
        return [];
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

/**
 * Save data to JSON file (with encryption support)
 * @param string $file File path
 * @param array $data Data to save
 */
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
    
    // Check if encryption is needed
    $encryptionMetaFile = DATA_DIR . '/encryption_meta.json';
    $encryptionEnabled = false;
    
    if (file_exists($encryptionMetaFile)) {
        $meta = json_decode(file_get_contents($encryptionMetaFile), true);
        $encryptionEnabled = isset($meta['isEncrypted']) && $meta['isEncrypted'];
    } else {
        // If the meta file doesn't exist, create it and enable encryption
        $meta = [
            'isEncrypted' => true,
            'lastEncryptionDate' => $today
        ];
        file_put_contents($encryptionMetaFile, json_encode($meta, JSON_PRETTY_PRINT));
        $encryptionEnabled = true;
    }
    
    if ($encryptionEnabled) {
        // Encrypt the data
        $encryptedData = encryptData($jsonData, $encryptionKey);
        
        // Save encrypted data
        file_put_contents($file, $encryptedData);
    } else {
        // Save as plain JSON for now (this shouldn't happen as we force encryption)
        file_put_contents($file, $jsonData);
    }
}

/**
 * Generate daily encryption key
 * @param string $dateString Date string (Y-m-d)
 * @return string Encryption key
 */
function generateDailyKey($dateString) {
    $baseSecret = "S3cure#F0rum#System#2025";
    $combinedString = $baseSecret . $dateString;
    return hash('sha256', $combinedString);
}

/**
 * Encrypt data
 * @param string $data Data to encrypt
 * @param string $key Encryption key
 * @return string Encrypted data
 */
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

/**
 * Decrypt data
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
