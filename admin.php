<?php
// Admin Article Management System with Magic ID Authentication and Re-encryption Controls

// Start session properly
session_start();

// Set content type
header('Content-Type: text/html; charset=UTF-8');

// Define the magic ID (40 characters)
define('MAGIC_ID', '8f7d56a1c940e96b23c59363ef5de2b7ac6014e8');

// Data directories
define('DATA_DIR', 'data');
define('LOCK_FILE', DATA_DIR . '/reencryption.lock');
define('PROGRESS_FILE', DATA_DIR . '/reencryption_progress.json');
define('ENCRYPTION_META_FILE', DATA_DIR . '/encryption_meta.json');

// Check if user is authenticated with magic ID
$isLoggedIn = false;
$loginError = null;

// Process magic ID login
if (isset($_POST['magic_id'])) {
    $submittedId = trim($_POST['magic_id']);
    
    if ($submittedId === MAGIC_ID) {
        $_SESSION['magic_admin'] = true;
        $isLoggedIn = true;
    } else {
        $loginError = 'Invalid magic ID. Please try again.';
    }
}

// Allow direct access via URL for initial setup
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
    session_unset();
    session_destroy();
    header('Location: admin.php');
    exit;
}

// Handle AJAX requests for re-encryption
if (isset($_POST['ajax_action']) && $isLoggedIn) {
    header('Content-Type: application/json');
    
    switch ($_POST['ajax_action']) {
        case 'start_reencryption':
            echo json_encode(startDailyReencryption());
            exit;
            
        case 'get_reencryption_status':
            echo json_encode(getReencryptionStatus());
            exit;
            
        case 'get_encryption_info':
            echo json_encode(getEncryptionInfo());
            exit;
    }
}

// Create data directory if it doesn't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Define article storage
define('ARTICLES_DIR', DATA_DIR . '/articles');
if (!file_exists(ARTICLES_DIR)) {
    mkdir(ARTICLES_DIR, 0755, true);
}
define('ARTICLES_INDEX_FILE', DATA_DIR . '/articles_index.json');

// Re-encryption functions
function generateDailyKey($dateString) {
    $baseSecret = "S3cure#F0rum#System#2025";
    $combinedString = $baseSecret . $dateString;
    return hash('sha256', $combinedString);
}

function generateNewMasterKey() {
    // Generate a secure random key for master encryption
    return bin2hex(random_bytes(32)); // 64-character hex string (256-bit key)
}

function isSystemLocked() {
    return file_exists(LOCK_FILE);
}

function createSystemLock() {
    $lockData = [
        'started' => time(),
        'pid' => getmypid(),
        'admin_triggered' => true,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
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
        'percentage' => $total > 0 ? ($current / $total) * 100 : 0,
        'message' => $message,
        'timestamp' => time()
    ];
    
    file_put_contents(PROGRESS_FILE, json_encode($progress));
    return $progress;
}

function loadEncryptionMeta() {
    if (file_exists(ENCRYPTION_META_FILE)) {
        $data = file_get_contents(ENCRYPTION_META_FILE);
        $meta = json_decode($data, true);
        
        if (is_array($meta)) {
            return array_merge([
                'lastEncryptionDate' => '',
                'isEncrypted' => false,
                'lastReEncryption' => '',
                'filesProcessed' => 0,
                'filesFailed' => 0
            ], $meta);
        }
    }
    
    return [
        'lastEncryptionDate' => '',
        'isEncrypted' => false,
        'lastReEncryption' => '',
        'filesProcessed' => 0,
        'filesFailed' => 0
    ];
}

function saveEncryptionMeta($metadata) {
    $metadata['lastUpdate'] = date('c');
    return file_put_contents(ENCRYPTION_META_FILE, json_encode($metadata, JSON_PRETTY_PRINT));
}

function startDailyReencryption() {
    // Call the API endpoint for daily re-encryption
    $apiUrl = 'api.php?action=daily_reencrypt';
    
    // Use cURL to call the API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 300); // 5 minutes timeout
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($response === false || $httpCode !== 200) {
        return ['success' => false, 'error' => 'Failed to start daily re-encryption'];
    }
    
    $result = json_decode($response, true);
    return $result ?: ['success' => false, 'error' => 'Invalid response from API'];
}

function startReencryption() {
    if (isSystemLocked()) {
        return ['success' => false, 'error' => 'Re-encryption already in progress'];
    }
    
    if (!createSystemLock()) {
        return ['success' => false, 'error' => 'Failed to create system lock'];
    }
    
    // Start re-encryption in background
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }
    
    try {
        performReencryption();
        return ['success' => true, 'message' => 'Re-encryption started'];
    } catch (Exception $e) {
        removeSystemLock();
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function performReencryption() {
    try {
        $today = date('Y-m-d');
        $encryptionMeta = loadEncryptionMeta();
        
        // Determine keys
        $oldKey = isset($encryptionMeta['masterKey']) ? $encryptionMeta['masterKey'] : null;
        $newKey = generateNewMasterKey(); // Generate a fresh random master key
        
        updateProgress('starting', 0, 100, 'Initializing re-encryption process...');
        
        // Get files to process
        $filesToProcess = getFilesToReencrypt();
        $totalFiles = count($filesToProcess);
        
        updateProgress('processing', 0, $totalFiles, 'Beginning file re-encryption...');
        
        $processed = 0;
        $failed = 0;
        
        foreach ($filesToProcess as $file) {
            $processed++;
            
            updateProgress('processing', $processed, $totalFiles, 
                "Processing: " . basename($file['path']));
            
            if ($file['type'] === 'file') {
                $result = reencryptSingleFile($file['path'], $oldKey, $newKey);
            } else {
                $result = reencryptDirectoryFiles($file['path'], $oldKey, $newKey);
            }
            
            if (!$result) {
                $failed++;
                error_log("Failed to re-encrypt: " . $file['path']);
            }
            
            usleep(10000); // 10ms delay
        }
        
        updateProgress('finalizing', $totalFiles, $totalFiles, 'Updating metadata...');
        
        // Update metadata
        $encryptionMeta['lastEncryptionDate'] = $today;
        $encryptionMeta['isEncrypted'] = true;
        $encryptionMeta['lastReEncryption'] = date('c');
        $encryptionMeta['filesProcessed'] = $processed;
        $encryptionMeta['filesFailed'] = $failed;
        $encryptionMeta['adminTriggered'] = true;
        $encryptionMeta['masterKey'] = $newKey; // Store the new master key
        saveEncryptionMeta($encryptionMeta);
        
        updateProgress('complete', $totalFiles, $totalFiles, 'Re-encryption completed!');
        
        sleep(2);
        removeSystemLock();
        
        return true;
        
    } catch (Exception $e) {
        error_log("Re-encryption failed: " . $e->getMessage());
        updateProgress('error', 0, 100, 'Re-encryption failed: ' . $e->getMessage());
        removeSystemLock();
        return false;
    }
}

function getFilesToReencrypt() {
    $files = [];
    
    // Main forum files
    $mainFiles = [
        DATA_DIR . '/users.json.enc',
        DATA_DIR . '/categories.json.enc', 
        DATA_DIR . '/posts.json.enc',
        DATA_DIR . '/replies.json.enc',
        DATA_DIR . '/seo.json.enc',
        DATA_DIR . '/server_keys.json.enc'
    ];
    
    foreach ($mainFiles as $file) {
        if (file_exists($file)) {
            $files[] = ['path' => $file, 'type' => 'file'];
        }
    }
    
    // Article files
    if (file_exists(ARTICLES_INDEX_FILE)) {
        $files[] = ['path' => ARTICLES_INDEX_FILE, 'type' => 'file'];
    }
    
    if (is_dir(ARTICLES_DIR)) {
        $articleFiles = glob(ARTICLES_DIR . '/*.json');
        foreach ($articleFiles as $file) {
            $files[] = ['path' => $file, 'type' => 'file'];
        }
    }
    
    // Forum directories
    $directories = [
        DATA_DIR . '/categories',
        DATA_DIR . '/posts', 
        DATA_DIR . '/replies',
        DATA_DIR . '/placards'
    ];
    
    foreach ($directories as $dir) {
        if (is_dir($dir)) {
            $files[] = ['path' => $dir, 'type' => 'directory'];
        }
    }
    
    return $files;
}

function reencryptSingleFile($file, $oldKey, $newKey) {
    $tempFile = $file . '.tmp.' . time();
    $backupFile = $file . '.backup.' . time();
    
    try {
        if (!copy($file, $backupFile)) {
            throw new Exception("Failed to create backup for $file");
        }
        
        $rawData = file_get_contents($file);
        if ($rawData === false) {
            throw new Exception("Failed to read $file");
        }
        
        // Decrypt data - handle multiple possible formats
        $decryptedData = null;
        
        if ($oldKey === null) {
            // No old key, assume it's plain JSON
            if (isLikelyJson($rawData)) {
                $decryptedData = $rawData;
            } else {
                throw new Exception("Cannot determine data format for $file and no old key provided");
            }
        } else {
            // Try to decrypt with old key first
            $decryptedData = safeDecryptData($rawData, $oldKey);
            
            // If decryption didn't work, maybe it's plain JSON or needs different key
            if (json_decode($decryptedData, true) === null && $decryptedData !== 'null') {
                // Try treating as plain JSON
                if (isLikelyJson($rawData)) {
                    $decryptedData = $rawData;
                } else {
                    // Try with today's daily key as fallback (for old daily-encrypted files)
                    $today = date('Y-m-d');
                    $dailyKey = generateDailyKey($today);
                    $decryptedData = safeDecryptData($rawData, $dailyKey);
                    
                    if (json_decode($decryptedData, true) === null && $decryptedData !== 'null') {
                        // Try yesterday's daily key
                        $yesterday = date('Y-m-d', strtotime('-1 day'));
                        $yesterdayKey = generateDailyKey($yesterday);
                        $decryptedData = safeDecryptData($rawData, $yesterdayKey);
                        
                        if (json_decode($decryptedData, true) === null && $decryptedData !== 'null') {
                            throw new Exception("Cannot decrypt or parse data for $file with any available key");
                        }
                    }
                }
            }
        }
        
        // Re-encrypt with new key
        $newEncryptedData = encryptData($decryptedData, $newKey);
        
        if (file_put_contents($tempFile, $newEncryptedData) === false) {
            throw new Exception("Failed to write temporary file for $file");
        }
        
        if (!rename($tempFile, $file)) {
            throw new Exception("Failed to move temporary file for $file");
        }
        
        return true;
        
    } catch (Exception $e) {
        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
        
        if (file_exists($backupFile)) {
            copy($backupFile, $file);
            unlink($backupFile);
        }
        
        error_log("File re-encryption failed for $file: " . $e->getMessage());
        return false;
    }
}

function reencryptDirectoryFiles($directory, $oldKey, $newKey) {
    if (!is_dir($directory)) {
        return true;
    }
    
    $files = glob($directory . '/*.json.enc');
    $success = true;
    
    foreach ($files as $file) {
        if (!reencryptSingleFile($file, $oldKey, $newKey)) {
            $success = false;
        }
    }
    
    return $success;
}

function encryptData($data, $key) {
    $encKey = substr(hash('sha256', $key, true), 0, 32);
    $iv = openssl_random_pseudo_bytes(16);
    $encrypted = openssl_encrypt($data, 'AES-256-CBC', $encKey, 0, $iv);
    return base64_encode($iv . $encrypted);
}

function safeDecryptData($encryptedData, $key) {
    try {
        $decKey = substr(hash('sha256', $key, true), 0, 32);
        
        if (!isEncryptedData($encryptedData)) {
            return $encryptedData;
        }
        
        $data = base64_decode($encryptedData);
        
        if ($data === false || strlen($data) < 16) {
            return $encryptedData;
        }
        
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $decKey, 0, $iv);
        
        if ($decrypted === false) {
            return $encryptedData;
        }
        
        return $decrypted;
        
    } catch (Exception $e) {
        return $encryptedData;
    }
}

function isEncryptedData($data) {
    if (base64_decode($data, true) === false) {
        return false;
    }
    
    $trimmed = trim($data);
    if (($trimmed[0] === '{' && substr($trimmed, -1) === '}') || 
        ($trimmed[0] === '[' && substr($trimmed, -1) === ']')) {
        return false;
    }
    
    $decoded = base64_decode($data);
    if (strlen($decoded) < 32) {
        return false;
    }
    
    return true;
}

function isLikelyJson($data) {
    $trimmed = trim($data);
    return (($trimmed[0] === '{' && substr($trimmed, -1) === '}') || 
            ($trimmed[0] === '[' && substr($trimmed, -1) === ']')) &&
           json_decode($data, true) !== null;
}

function getReencryptionStatus() {
    if (!file_exists(PROGRESS_FILE)) {
        return ['success' => true, 'progress' => null, 'locked' => isSystemLocked()];
    }
    
    $progress = json_decode(file_get_contents(PROGRESS_FILE), true);
    return ['success' => true, 'progress' => $progress, 'locked' => isSystemLocked()];
}

function getEncryptionInfo() {
    $meta = loadEncryptionMeta();
    $status = [
        'isEncrypted' => $meta['isEncrypted'],
        'lastEncryptionDate' => $meta['lastEncryptionDate'],
        'lastReEncryption' => $meta['lastReEncryption'],
        'filesProcessed' => $meta['filesProcessed'],
        'filesFailed' => $meta['filesFailed'],
        'locked' => isSystemLocked()
    ];
    
    return ['success' => true, 'status' => $status];
}

// Helper function to create URL-friendly slug
function createSlug($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    
    return $text;
}

// Function to load unencrypted JSON data
function loadData($file) {
    if (!file_exists($file)) {
        $defaultData = [];
        saveData($file, $defaultData);
        return $defaultData;
    }
    
    $jsonData = file_get_contents($file);
    $data = json_decode($jsonData, true);
    
    return $data ?: [];
}

// Function to save unencrypted JSON data
function saveData($file, $data) {
    $dir = dirname($file);
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $jsonData = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
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
                if (!isset($_POST['title']) || trim($_POST['title']) === '') {
                    $message = 'Title is required';
                    break;
                }
                
                $timestamp = isset($_POST['created']) && $_POST['action'] === 'update_article' 
                    ? strtotime($_POST['created']) 
                    : time();
                
                $titleSlug = createSlug($_POST['title']);
                
                if ($_POST['action'] === 'create_article' || empty($_POST['article_id'])) {
                    $articleId = $timestamp . '_' . $titleSlug;
                } else {
                    $articleId = $_POST['article_id'];
                }
                
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
                
                $articleFile = ARTICLES_DIR . '/' . $articleId . '.json';
                saveData($articleFile, $article);
                
                $articlesIndex = loadData(ARTICLES_INDEX_FILE);
                
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
                
                usort($articlesIndex, function($a, $b) {
                    return $b['timestamp'] - $a['timestamp'];
                });
                
                saveData(ARTICLES_INDEX_FILE, $articlesIndex);
                
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
                
                if (file_exists($articleFile)) {
                    unlink($articleFile);
                }
                
                $articlesIndex = loadData(ARTICLES_INDEX_FILE);
                $newIndex = [];
                
                foreach ($articlesIndex as $indexItem) {
                    if ($indexItem['id'] !== $articleId) {
                        $newIndex[] = $indexItem;
                    }
                }
                
                saveData(ARTICLES_INDEX_FILE, $newIndex);
                
                header('Location: admin.php?message=' . urlencode('Article deleted successfully'));
                exit;
        }
    }
    
    if (isset($_GET['message'])) {
        $message = $_GET['message'];
    }
    
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
    if (file_exists(ARTICLES_INDEX_FILE)) {
        $articlesIndex = loadData(ARTICLES_INDEX_FILE);
        
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
    <title>Admin Panel - Secure Forum</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="article-styles.css">
    <link rel="stylesheet" href="dark-theme-styles.css">
    <style>
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
        
        .security-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .security-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .security-title {
            font-size: 1.5rem;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .encryption-status {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4CAF50;
            box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
        }
        
        .status-indicator.inactive {
            background: #f44336;
            box-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
        }
        
        .encryption-details {
            flex: 1;
        }
        
        .encryption-details h4 {
            margin: 0 0 5px 0;
            font-size: 1.1rem;
        }
        
        .encryption-details p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .reencrypt-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .reencrypt-btn:hover {
            background: rgba(255,255,255,0.3);
            border-color: rgba(255,255,255,0.5);
        }
        
        .reencrypt-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .progress-container {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            display: none;
        }
        
        .progress-bar {
            background: rgba(255,255,255,0.2);
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #4CAF50, #45a049);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        
        .progress-text {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
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
        
        /* Dark theme adjustments */
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
            <h1 class="admin-title"><i class="fas fa-shield-alt"></i> Admin Control Panel</h1>
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
        
        <!-- Security & Encryption Section -->
        <div class="security-section">
            <div class="security-header">
                <h2 class="security-title">
                    <i class="fas fa-lock"></i>
                    Security & Encryption
                </h2>
            </div>
            
            <div class="encryption-status" id="encryption-status">
                <div class="status-indicator" id="status-indicator"></div>
                <div class="encryption-details">
                    <h4 id="status-title">Loading encryption status...</h4>
                    <p id="status-description">Please wait while we check the system status.</p>
                </div>
                <button class="reencrypt-btn" id="reencrypt-btn" disabled>
                    <i class="fas fa-calendar-day"></i> Daily Re-encryption
                </button>
            </div>
            
            <div class="progress-container" id="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div class="progress-text">
                    <span id="progress-percentage">0%</span>
                    <span id="progress-message">Initializing...</span>
                </div>
            </div>
        </div>
        
        <!-- Article Management Section -->
        <div class="section">
            <h2><i class="fas fa-newspaper"></i> Article Management</h2>
            
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
    
    <script>
        // Encryption management system
        class EncryptionManager {
            constructor() {
                this.statusCheckInterval = null;
                this.init();
            }
            
            init() {
                this.loadEncryptionStatus();
                this.setupEventListeners();
                this.startStatusMonitoring();
            }
            
            setupEventListeners() {
                const reencryptBtn = document.getElementById('reencrypt-btn');
                if (reencryptBtn) {
                    reencryptBtn.addEventListener('click', () => this.startReencryption());
                }
            }
            
            async loadEncryptionStatus() {
                try {
                    const response = await fetch('admin.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'ajax_action=get_encryption_info'
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.updateStatusDisplay(result.status);
                    }
                } catch (error) {
                    console.error('Failed to load encryption status:', error);
                }
            }
            
            updateStatusDisplay(status) {
                const indicator = document.getElementById('status-indicator');
                const title = document.getElementById('status-title');
                const description = document.getElementById('status-description');
                const btn = document.getElementById('reencrypt-btn');
                
                if (status.locked) {
                    indicator.className = 'status-indicator';
                    title.textContent = 'Daily Re-encryption in Progress';
                    description.textContent = 'System is currently performing daily re-encryption. Please wait...';
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                } else if (status.isEncrypted) {
                    indicator.className = 'status-indicator';
                    title.textContent = 'Encryption Active';
                    
                    if (status.lastEncryptionDate) {
                        const lastDate = new Date(status.lastEncryptionDate).toLocaleDateString();
                        description.textContent = `Last daily re-encryption: ${lastDate}. Files processed: ${status.filesProcessed || 0}`;
                    } else {
                        description.textContent = 'Daily encryption is active and protecting your data.';
                    }
                    
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-calendar-day"></i> Daily Re-encryption';
                } else {
                    indicator.className = 'status-indicator inactive';
                    title.textContent = 'Encryption Inactive';
                    description.textContent = 'Data encryption is not currently active.';
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-calendar-day"></i> Daily Re-encryption Disabled';
                }
            }
            
            async startReencryption() {
                if (!confirm('Are you sure you want to start re-encryption? This will temporarily lock the system.')) {
                    return;
                }
                
                try {
                    const response = await fetch('admin.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'ajax_action=start_reencryption'
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showProgressContainer();
                        this.startProgressMonitoring();
                    } else {
                        alert('Failed to start re-encryption: ' + result.error);
                    }
                } catch (error) {
                    console.error('Failed to start re-encryption:', error);
                    alert('Failed to start re-encryption. Please check the console for details.');
                }
            }
            
            showProgressContainer() {
                const container = document.getElementById('progress-container');
                if (container) {
                    container.style.display = 'block';
                }
            }
            
            hideProgressContainer() {
                const container = document.getElementById('progress-container');
                if (container) {
                    container.style.display = 'none';
                }
            }
            
            startStatusMonitoring() {
                this.statusCheckInterval = setInterval(() => {
                    this.checkReencryptionStatus();
                }, 2000);
            }
            
            startProgressMonitoring() {
                if (this.progressInterval) {
                    clearInterval(this.progressInterval);
                }
                
                this.progressInterval = setInterval(() => {
                    this.checkReencryptionStatus();
                }, 1000);
            }
            
            async checkReencryptionStatus() {
                try {
                    const response = await fetch('admin.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'ajax_action=get_reencryption_status'
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        if (result.progress) {
                            this.updateProgress(result.progress);
                        }
                        
                        if (!result.locked && this.progressInterval) {
                            // Re-encryption completed
                            clearInterval(this.progressInterval);
                            this.progressInterval = null;
                            
                            setTimeout(() => {
                                this.hideProgressContainer();
                                this.loadEncryptionStatus();
                            }, 3000);
                        }
                    }
                } catch (error) {
                    console.error('Failed to check status:', error);
                }
            }
            
            updateProgress(progress) {
                const fill = document.getElementById('progress-fill');
                const percentage = document.getElementById('progress-percentage');
                const message = document.getElementById('progress-message');
                
                if (fill) {
                    fill.style.width = Math.min(100, Math.max(0, progress.percentage || 0)) + '%';
                }
                
                if (percentage) {
                    percentage.textContent = Math.round(progress.percentage || 0) + '%';
                }
                
                if (message) {
                    message.textContent = progress.message || 'Processing...';
                }
            }
        }
        
        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            new EncryptionManager();
        });
    </script>
    <?php endif; ?>
</body>
</html>