<?php
header('Content-Type: application/json');

// Disable error display for production
ini_set('display_errors', 0);
error_reporting(0);

// Start output buffering to prevent any unexpected output
ob_start();

// Set CORS headers if needed
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit(0);
}

// Define paths
define('DATA_DIR', 'data');
define('BOT_DATA_DIR', DATA_DIR . '/bot_data');
define('BOT_INTERACTIONS_FILE', BOT_DATA_DIR . '/interactions.json');
define('BOT_METADATA_FILE', BOT_DATA_DIR . '/metadata.json');

// Create directories if they don't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

if (!file_exists(BOT_DATA_DIR)) {
    mkdir(BOT_DATA_DIR, 0755, true);
}

// Get action from query string
$action = isset($_GET['action']) ? $_GET['action'] : 'save_interaction';

// Handle different actions
switch ($action) {
    case 'save_interaction':
        saveInteraction();
        break;
        
    case 'get_interactions':
        getInteractions();
        break;
        
    case 'save_metadata':
        saveMetadata();
        break;
        
    case 'get_metadata':
        getMetadata();
        break;
        
    case 'reset_bot':
        resetBot();
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'error' => 'Invalid action'
        ]);
        break;
}

// End output buffer and exit
ob_end_flush();
exit;

// Save interaction
function saveInteraction() {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode([
            'success' => false,
            'error' => 'Only POST requests are allowed'
        ]);
        return;
    }
    
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validate required fields
    if (!$data || !isset($data['botId']) || !isset($data['userMessage'])) {
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields'
        ]);
        return;
    }
    
    // Sanitize data
    $botId = preg_replace('/[^a-zA-Z0-9\-\_]/', '', $data['botId']);
    $userMessage = trim($data['userMessage']);
    $botResponse = isset($data['botResponse']) ? trim($data['botResponse']) : '';
    $timestamp = isset($data['timestamp']) ? intval($data['timestamp']) : time() * 1000;
    
    // Create interaction data
    $interaction = [
        'id' => uniqid(),
        'botId' => $botId,
        'userMessage' => $userMessage,
        'botResponse' => $botResponse,
        'timestamp' => $timestamp,
        'ip' => hash('sha256', $_SERVER['REMOTE_ADDR']), // Store hashed IP for analytics
        'created' => date('c')
    ];
    
    // Load existing interactions
    $interactions = [];
    if (file_exists(BOT_INTERACTIONS_FILE)) {
        $fileContent = file_get_contents(BOT_INTERACTIONS_FILE);
        $interactions = json_decode($fileContent, true) ?: [];
    }
    
    // Add new interaction
    $interactions[] = $interaction;
    
    // Save interactions (limit to last 10,000 to prevent file size issues)
    if (count($interactions) > 10000) {
        $interactions = array_slice($interactions, -10000);
    }
    
    // Write to file
    if (file_put_contents(BOT_INTERACTIONS_FILE, json_encode($interactions, JSON_PRETTY_PRINT))) {
        echo json_encode([
            'success' => true,
            'message' => 'Interaction saved successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to save interaction'
        ]);
    }
}

// Get interactions for training
function getInteractions() {
    // Load interactions
    $interactions = [];
    if (file_exists(BOT_INTERACTIONS_FILE)) {
        $fileContent = file_get_contents(BOT_INTERACTIONS_FILE);
        $interactions = json_decode($fileContent, true) ?: [];
    }
    
    // Filter interactions (only include ones with both user message and bot response)
    $validInteractions = array_filter($interactions, function($interaction) {
        return !empty($interaction['userMessage']) && !empty($interaction['botResponse']);
    });
    
    // Limit number of interactions to return (to prevent memory issues)
    $limitedInteractions = array_slice(array_values($validInteractions), -1000);
    
    // Return interactions
    echo json_encode([
        'success' => true,
        'interactions' => $limitedInteractions // Re-index array
    ]);
}

// Save model metadata
function saveMetadata() {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode([
            'success' => false,
            'error' => 'Only POST requests are allowed'
        ]);
        return;
    }
    
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validate required fields
    if (!$data) {
        echo json_encode([
            'success' => false,
            'error' => 'Missing metadata'
        ]);
        return;
    }
    
    // Add timestamp
    $data['lastUpdate'] = date('c');
    
    // Write to file
    if (file_put_contents(BOT_METADATA_FILE, json_encode($data, JSON_PRETTY_PRINT))) {
        echo json_encode([
            'success' => true,
            'message' => 'Metadata saved successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to save metadata'
        ]);
    }
}

// Get model metadata
function getMetadata() {
    // Load metadata
    $metadata = [];
    if (file_exists(BOT_METADATA_FILE)) {
        $fileContent = file_get_contents(BOT_METADATA_FILE);
        $metadata = json_decode($fileContent, true) ?: [];
    }
    
    // Return metadata
    echo json_encode([
        'success' => true,
        'wordIndex' => isset($metadata['wordIndex']) ? $metadata['wordIndex'] : [],
        'responseClasses' => isset($metadata['responseClasses']) ? $metadata['responseClasses'] : [],
        'maxSeqLength' => isset($metadata['maxSeqLength']) ? $metadata['maxSeqLength'] : 10,
        'lastUpdate' => isset($metadata['lastUpdate']) ? $metadata['lastUpdate'] : null
    ]);
}

// Reset bot (clear training data and metadata)
function resetBot() {
    // Only allow POST requests with admin authentication
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode([
            'success' => false,
            'error' => 'Only POST requests are allowed'
        ]);
        return;
    }
    
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validate admin password (use a more secure method in production)
    if (!$data || !isset($data['password']) || $data['password'] !== 'admin_password') {
        echo json_encode([
            'success' => false,
            'error' => 'Authentication failed'
        ]);
        return;
    }
    
    // Delete interaction file
    if (file_exists(BOT_INTERACTIONS_FILE)) {
        unlink(BOT_INTERACTIONS_FILE);
    }
    
    // Delete or reset metadata file
    if (file_exists(BOT_METADATA_FILE)) {
        // Option 1: Delete metadata entirely
        // unlink(BOT_METADATA_FILE);
        
        // Option 2: Reset to defaults but keep file
        $defaultMetadata = [
            'wordIndex' => [],
            'responseClasses' => [
                "I'm still learning how to respond properly.",
                "That's interesting! Tell me more.",
                "I'm not sure I understand. Could you explain differently?",
                "I'm processing what you said.",
                "Thanks for your message!",
                "I'm designed to learn from our conversations.",
                "That's a good point.",
                "I'd like to hear more about that.",
                "Let me think about that for a moment.",
                "That's valuable input for my learning."
            ],
            'maxSeqLength' => 10,
            'lastUpdate' => date('c'),
            'resetDate' => date('c')
        ];
        
        file_put_contents(BOT_METADATA_FILE, json_encode($defaultMetadata, JSON_PRETTY_PRINT));
    }
    
    // Return success
    echo json_encode([
        'success' => true,
        'message' => 'Bot reset successfully'
    ]);
}