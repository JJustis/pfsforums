<?php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include required files
require_once 'gateway-config.php';

// Define constants
define('PRODUCTS_FILE', 'user_products.json');
define('FORUM_PURCHASES_FILE', 'forum_purchases.json');

// Function to get product details
function getProductDetails($productId) {
    if (!file_exists(PRODUCTS_FILE)) {
        return null;
    }
    
    $products = json_decode(file_get_contents(PRODUCTS_FILE), true) ?: [];
    
    foreach ($products as $product) {
        if ($product['id'] === $productId) {
            return $product;
        }
    }
    
    return null;
}

// Function to verify purchase
function verifyPurchase($email, $productId, $transactionId) {
    if (!file_exists(FORUM_PURCHASES_FILE)) {
        return false;
    }
    
    $purchases = json_decode(file_get_contents(FORUM_PURCHASES_FILE), true) ?: [];
    
    if (!isset($purchases[$email])) {
        return false;
    }
    
    foreach ($purchases[$email] as $purchase) {
        if ($purchase['product_id'] === $productId && 
            $purchase['transaction_id'] === $transactionId && 
            $purchase['status'] === 'purchased') {
            return true;
        }
    }
    
    return false;
}

// Main download handler
$productId = $_GET['id'] ?? '';
$transactionId = $_GET['transaction_id'] ?? '';
$email = $_SESSION['email'] ?? null;

// Basic validation
if (empty($productId) || empty($transactionId) || !$email) {
    http_response_code(400);
    die("Error: Invalid request parameters or user not logged in.");
}

// Security check for input parameters
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $productId) || !preg_match('/^[a-zA-Z0-9_-]+$/', $transactionId)) {
    http_response_code(400);
    die("Error: Invalid product ID or transaction ID format.");
}

// Verify the purchase
if (!verifyPurchase($email, $productId, $transactionId)) {
    http_response_code(403);
    die("Error: You do not have permission to download this file. Purchase not verified.");
}

// Get product details
$product = getProductDetails($productId);

if (!$product || empty($product['file_path'])) {
    http_response_code(404);
    die("Error: Product not found or file is missing.");
}

$filePath = $product['file_path'];

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    die("Error: The file could not be found. Please contact support.");
}

// Get file info
$fileName = basename($product['file_name']);
$fileSize = filesize($filePath);

// Log the download
error_log("File downloaded: {$fileName} by {$email} (Transaction: {$transactionId})");

// Serve the file
header("Content-Type: application/octet-stream");
header("Content-Transfer-Encoding: Binary");
header("Content-Length: " . $fileSize);
header("Content-Disposition: attachment; filename=\"" . $fileName . "\"");
readfile($filePath);
exit;
?>