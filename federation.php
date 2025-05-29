<?php
// federation.php - Core federation functionality

define('FEDERATION_DIR', DATA_DIR . '/federation');
define('SHARED_FILES_DIR', FEDERATION_DIR . '/shared');
define('SERVER_KEYS_FILE', FEDERATION_DIR . '/server_keys.json.enc');
define('FEDERATION_CONFIG_FILE', FEDERATION_DIR . '/federation_config.json.enc');

// Create federation directories if they don't exist
if (!file_exists(FEDERATION_DIR)) {
    mkdir(FEDERATION_DIR, 0755, true);
}
if (!file_exists(SHARED_FILES_DIR)) {
    mkdir(SHARED_FILES_DIR, 0755, true);
}

/**
 * Initialize a connection with another server
 * This only needs to happen once to establish the initial shared key
 */
function initiateServerConnection($remoteServerUrl, $remoteServerId, $initialKey, $token) {
    // Verify admin permissions
    $userId = verifyToken($token);
    if (!$userId || !isUserAdmin($userId)) {
        return ['success' => false, 'error' => 'Permission denied'];
    }
    
    // Generate a unique identifier for this server
    $localServerId = getLocalServerId();
    
    // Load existing server keys
    $serverKeys = loadData(SERVER_KEYS_FILE);
    
    // Check if connection already exists
    foreach ($serverKeys as $server) {
        if ($server['id'] === $remoteServerId) {
            return ['success' => false, 'error' => 'Server connection already exists'];
        }
    }
    
    // Create mutation keys based on the initial shared key
    $mutationSeed = hash('sha256', $initialKey . $localServerId . $remoteServerId);
    $nextKey = generateNextKey($mutationSeed, 0); // Start key position
    
    // Store the connection details
    $serverConnection = [
        'id' => $remoteServerId,
        'url' => $remoteServerUrl,
        'mutation_seed' => $mutationSeed,
        'key_position' => 0,
        'last_sync' => time(),
        'status' => 'active'
    ];
    
    $serverKeys[] = $serverConnection;
    saveData(SERVER_KEYS_FILE, $serverKeys);
    
    return [
        'success' => true, 
        'server' => [
            'id' => $remoteServerId,
            'url' => $remoteServerUrl
        ]
    ];
}

/**
 * Generate the next key in the mutation sequence
 */
function generateNextKey($seed, $position) {
    // Algorithm to generate the next key based on the seed and position
    // This creates deterministic but secure keys that both servers can calculate
    return hash('sha256', $seed . $position . "Federation-Key-Mutation-v1");
}

/**
 * Get local server identifier
 */
function getLocalServerId() {
    $config = loadData(FEDERATION_CONFIG_FILE);
    
    if (!isset($config['server_id'])) {
        // Generate a new server ID if not exists
        $config['server_id'] = bin2hex(random_bytes(8));
        saveData(FEDERATION_CONFIG_FILE, $config);
    }
    
    return $config['server_id'];
}

/**
 * Share a file with federated servers
 */
function shareFile($filePath, $targetServerId, $fileType, $token) {
    // Verify permissions
    $userId = verifyToken($token);
    if (!$userId) {
        return ['success' => false, 'error' => 'Invalid token'];
    }
    
    // Check if file exists
    if (!file_exists($filePath)) {
        return ['success' => false, 'error' => 'File not found'];
    }
    
    // Generate file hash (snowflake ID)
    $fileHash = hash_file('sha256', $filePath);
    $snowflakeId = generateSnowflakeId($fileHash);
    
    // Get server info
    $localServerId = getLocalServerId();
    $serverKeys = loadData(SERVER_KEYS_FILE);
    $targetServer = null;
    
    foreach ($serverKeys as $server) {
        if ($server['id'] === $targetServerId) {
            $targetServer = $server;
            break;
        }
    }
    
    if (!$targetServer) {
        return ['success' => false, 'error' => 'Target server not found in federation'];
    }
    
    // Create shared file name
    $fileExtension = pathinfo($filePath, PATHINFO_EXTENSION);
    $sharedFileName = "{$snowflakeId}_{$localServerId}_{$targetServerId}.{$fileExtension}";
    $sharedFilePath = SHARED_FILES_DIR . '/' . $sharedFileName;
    
    // Encrypt file for transit
    $fileContent = file_get_contents($filePath);
    $currentKey = generateNextKey($targetServer['mutation_seed'], $targetServer['key_position']);
    $encryptedContent = encryptForTransit($fileContent, $currentKey);
    
    // Save encrypted file
    file_put_contents($sharedFilePath, $encryptedContent);
    
    // Update file metadata
    $sharedFiles = loadData(FEDERATION_DIR . '/shared_files.json.enc');
    $sharedFiles[] = [
        'filename' => $sharedFileName,
        'original_name' => basename($filePath),
        'type' => $fileType,
        'snowflake_id' => $snowflakeId,
        'source_server' => $localServerId,
        'target_server' => $targetServerId,
        'shared_time' => time(),
        'status' => 'pending',
        'shared_by' => $userId
    ];
    
    saveData(FEDERATION_DIR . '/shared_files.json.enc', $sharedFiles);
    
    return [
        'success' => true,
        'file' => [
            'snowflake_id' => $snowflakeId,
            'shared_name' => $sharedFileName
        ]
    ];
}

/**
 * Encrypt file for transit to another server
 */
function encryptForTransit($data, $key) {
    // Create encryption key from the mutation key
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
 * Decrypt file received from another server
 */
function decryptFromTransit($encryptedData, $key) {
    // Create decryption key
    $decKey = substr(hash('sha256', $key, true), 0, 32);
    
    // Decode from base64
    $data = base64_decode($encryptedData);
    
    // Extract IV (first 16 bytes)
    $iv = substr($data, 0, 16);
    
    // Extract the encrypted data
    $encrypted = substr($data, 16);
    
    // Decrypt
    $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $decKey, 0, $iv);
    
    return $decrypted;
}

/**
 * Generate a snowflake ID from a hash
 */
function generateSnowflakeId($hash) {
    $timestamp = time();
    $machineId = crc32(getLocalServerId()) % 1024; // 10 bits
    $sequence = mt_rand(0, 4095); // 12 bits
    
    // 41 bits for timestamp, 10 bits for machine ID, 12 bits for sequence
    $snowflake = (($timestamp & 0x1FFFFFFFFFF) << 22) | (($machineId & 0x3FF) << 12) | ($sequence & 0xFFF);
    
    return dechex($snowflake);
}

/**
 * Get federation status for admin panel
 */
function getFederationStatus($token) {
    // Verify admin permissions
    $userId = verifyToken($token);
    if (!$userId || !isUserAdmin($userId)) {
        return ['success' => false, 'error' => 'Permission denied'];
    }
    
    $config = loadData(FEDERATION_CONFIG_FILE);
    $serverKeys = loadData(SERVER_KEYS_FILE);
    $sharedFiles = loadData(FEDERATION_DIR . '/shared_files.json.enc');
    
    // Count files by status
    $fileStats = [
        'pending' => 0,
        'shared' => 0,
        'imported' => 0
    ];
    
    foreach ($sharedFiles as $file) {
        if (isset($file['status'])) {
            $fileStats[$file['status']]++;
        }
    }
    
    return [
        'success' => true,
        'federation' => [
            'server_id' => $config['server_id'] ?? 'Not configured',
            'connections' => count($serverKeys),
            'file_stats' => $fileStats,
            'servers' => $serverKeys
        ]
    ];
}
?>