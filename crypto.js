// === SERVER SIDE (crypto.php) ===
<?php
// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set content type to JSON
header('Content-Type: application/json');

// Data directories
define('DATA_DIR', 'data');
define('KEYS_FILE', DATA_DIR . '/server_keys.json');

// Create data directory if it doesn't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Get action from the request
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle different actions
switch ($action) {
    case 'get_public_key':
        getServerPublicKey();
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        break;
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
        $keyPair = sodium_crypto_box_keypair();
        $publicKey = sodium_crypto_box_publickey($keyPair);
        $secretKey = sodium_crypto_box_secretkey($keyPair);
        
        // Encode keys to base64 for storage
        $keys = [
            'publicKey' => base64_encode($publicKey),
            'secretKey' => base64_encode($secretKey),
            'generated' => time()
        ];
        
        // Save keys
        file_put_contents(KEYS_FILE, json_encode($keys, JSON_PRETTY_PRINT));
        
        echo json_encode([
            'success' => true,
            'publicKey' => $keys['publicKey']
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>