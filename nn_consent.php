<?php
// nn_consent.php - Neural Network consent management

define('CONSENT_FILE', DATA_DIR . '/nn_consent.json.enc');
define('NN_TRAINING_DIR', DATA_DIR . '/nn_training');
define('NN_MODELS_DIR', NN_TRAINING_DIR . '/models');

// Create directories
if (!file_exists(NN_TRAINING_DIR)) {
    mkdir(NN_TRAINING_DIR, 0755, true);
}
if (!file_exists(NN_MODELS_DIR)) {
    mkdir(NN_MODELS_DIR, 0755, true);
}

/**
 * Record user consent for NN features
 */
function recordConsent($userId, $consentType, $status, $token) {
    // Verify token
    if (!verifyToken($token)) {
        return ['success' => false, 'error' => 'Invalid token'];
    }
    
    $consents = loadData(CONSENT_FILE);
    
    if (!isset($consents[$userId])) {
        $consents[$userId] = [
            'data_collection' => false,
            'ai_replies' => false,
            'last_updated' => time()
        ];
    }
    
    // Update specific consent type
    if ($consentType === 'data_collection' || $consentType === 'ai_replies') {
        $consents[$userId][$consentType] = (bool)$status;
        $consents[$userId]['last_updated'] = time();
    }
    
    saveData(CONSENT_FILE, $consents);
    
    return [
        'success' => true,
        'consent' => $consents[$userId]
    ];
}

/**
 * Check if user has given specific consent
 */
function hasConsent($userId, $consentType) {
    if (!$userId) return false;
    
    $consents = loadData(CONSENT_FILE);
    
    if (!isset($consents[$userId]) || !isset($consents[$userId][$consentType])) {
        return false;
    }
    
    return $consents[$userId][$consentType];
}

/**
 * Store user content for NN training
 */
function storeContentForTraining($userId, $content, $contentType = 'post') {
    // Check consent first
    if (!hasConsent($userId, 'data_collection')) {
        return;
    }
    
    // Save content to training directory
    $timestamp = time();
    $filename = NN_TRAINING_DIR . "/user_{$userId}_{$contentType}_{$timestamp}.txt";
    
    file_put_contents($filename, $content);
    
    // Index content for training batch
    $trainingIndex = loadData(NN_TRAINING_DIR . '/training_index.json.enc');
    $trainingIndex[] = [
        'file' => basename($filename),
        'user_id' => $userId,
        'type' => $contentType,
        'time' => $timestamp,
        'processed' => false
    ];
    
    saveData(NN_TRAINING_DIR . '/training_index.json.enc', $trainingIndex);
}

/**
 * Generate AI reply for a post
 */
function generateAIReply($postId, $token) {
    // Verify token
    $userId = verifyToken($token);
    if (!$userId) {
        return ['success' => false, 'error' => 'Invalid token'];
    }
    
    // Get post
    $postFile = POSTS_DIR . '/' . $postId . '.json.enc';
    if (!file_exists($postFile)) {
        return ['success' => false, 'error' => 'Post not found'];
    }
    
    $post = loadData($postFile);
    
    // Check if sender has AI reply consent
    if (!hasConsent($post['authorId'], 'ai_replies')) {
        return ['success' => false, 'error' => 'Post author has not enabled AI replies'];
    }
    
    // Use the slimmer version of cleverbot2 for reply generation
    // This is a placeholder for the actual AI implementation
    // In production, you would interact with the JS-based AI engine
    
    // Simple placeholder content
    $aiResponse = "This is an AI-generated response based on the post content: \"" . substr($post['title'], 0, 50) . "...\"";
    
    // Create an AI reply
    $replyId = bin2hex(random_bytes(8));
    $newReply = [
        "id" => $replyId,
        "postId" => $postId,
        "content" => $aiResponse,
        "author" => "AI Assistant",
        "authorId" => "system_ai",
        "created" => date("c"),
        "ai_generated" => true
    ];
    
    // Save reply to individual file
    $replyFile = REPLIES_DIR . '/' . $replyId . '.json.enc';
    saveData($replyFile, $newReply);
    
    // Update replies metadata
    $repliesMetadata = loadData(REPLIES_FILE);
    $repliesMetadata[] = [
        "id" => $replyId,
        "postId" => $postId,
        "authorId" => "system_ai",
        "created" => date("c"),
        "ai_generated" => true
    ];
    saveData(REPLIES_FILE, $repliesMetadata);
    
    return [
        'success' => true,
        'reply' => $newReply
    ];
}
?>