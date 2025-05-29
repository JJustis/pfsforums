<?php
// download_product.php - Secure file download handler

// Error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Function to validate token and get user
function validateToken($token) {
    // Load users file
    $usersFile = 'users.json';
    if (!file_exists($usersFile)) {
        return false;
    }
    
    $users = json_decode(file_get_contents($usersFile), true) ?: [];
    
    foreach ($users as $user) {
        if (isset($user['token']) && $user['token'] === $token) {
            return $user;
        }
    }
    
    return false;
}

// Function to check if user has purchased a product
function hasUserPurchasedProduct($email, $productId) {
    $purchasesFile = 'forum_purchases.json';
    if (!file_exists($purchasesFile)) {
        return false;
    }
    
    $purchases = json_decode(file_get_contents($purchasesFile), true) ?: [];
    
    // Check if user has made any purchases
    if (!isset($purchases[$email])) {
        return false;
    }
    
    // Check if user has purchased this product
    foreach ($purchases[$email] as $purchase) {
        if ($purchase['product_id'] === $productId && $purchase['status'] === 'purchased') {
            return true;
        }
    }
    
    return false;
}

// Function to check if user owns a product
function isProductOwner($userId, $productId) {
    $productsFile = 'products.json';
    if (!file_exists($productsFile)) {
        return false;
    }
    
    $products = json_decode(file_get_contents($productsFile), true) ?: [];
    
    foreach ($products as $product) {
        if ($product['id'] === $productId && $product['seller_id'] === $userId) {
            return true;
        }
    }
    
    return false;
}

// Function to get product details
function getProduct($productId) {
    $productsFile = 'products.json';
    if (!file_exists($productsFile)) {
        return null;
    }
    
    $products = json_decode(file_get_contents($productsFile), true) ?: [];
    
    foreach ($products as $product) {
        if ($product['id'] === $productId) {
            return $product;
        }
    }
    
    return null;
}

// Set initial content type to JSON for error responses
header('Content-Type: application/json');

// Check if required parameters are provided
if (!isset($_GET['product_id']) || !isset($_GET['token'])) {
    echo json_encode([
        'success' => false,
        'error' => 'Missing required parameters'
    ]);
    exit;
}

$productId = $_GET['product_id'];
$token = $_GET['token'];

// Validate token and get user
$user = validateToken($token);
if (!$user) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid authentication token'
    ]);
    exit;
}

// Get product
$product = getProduct($productId);
if (!$product) {
    echo json_encode([
        'success' => false,
        'error' => 'Product not found'
    ]);
    exit;
}

// Check access rights (user owns product or has purchased it)
$isOwner = isProductOwner($user['id'], $productId);
$hasPurchased = hasUserPurchasedProduct($user['email'], $productId);

if (!$isOwner && !$hasPurchased) {
    echo json_encode([
        'success' => false,
        'error' => 'Access denied. You must purchase this product to download it.'
    ]);
    exit;
}

// Check if file exists
$filePath = $product['file_path'];
if (!file_exists($filePath)) {
    echo json_encode([
        'success' => false,
        'error' => 'Product file not found on server'
    ]);
    exit;
}

// Log download
$logFile = 'download_log.txt';
$logEntry = date('[Y-m-d H:i:s]') . ' User: ' . $user['username'] . ' (' . $user['email'] . ') downloaded product: ' . $product['name'] . ' (ID: ' . $product['id'] . ")\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

// Set headers for file download
header('Content-Type: application/json'); // Reset content type
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . basename($product['file_name']) . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Output file content
readfile($filePath);
exit;
?>