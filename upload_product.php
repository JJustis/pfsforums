<?php
// upload_product.php - With ownership tracking

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Helper function to log debug info
function logDebug($message) {
    file_put_contents('upload_debug.log', date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
}

// Log all request information
logDebug("Request received: " . json_encode($_POST));
logDebug("Files: " . json_encode($_FILES));

// Function to generate a unique ID
function generateUniqueId() {
    return 'prod_' . bin2hex(random_bytes(8));
}

// Function to save product information
function saveProductInfo($product) {
    $productsFile = 'products.json';
    
    // Load existing products
    $products = [];
    if (file_exists($productsFile)) {
        $products = json_decode(file_get_contents($productsFile), true) ?: [];
    }
    
    // Add new product
    $products[] = $product;
    
    // Save products
    file_put_contents($productsFile, json_encode($products, JSON_PRETTY_PRINT));
}

// Set content type to JSON
header('Content-Type: application/json');

// Check if this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logDebug("Error: Not a POST request");
    echo json_encode([
        'success' => false,
        'error' => 'Invalid request method'
    ]);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['productFile']) || $_FILES['productFile']['error'] !== UPLOAD_ERR_OK) {
    $errorCode = isset($_FILES['productFile']) ? $_FILES['productFile']['error'] : 'No file uploaded';
    logDebug("File upload error: $errorCode");
    
    echo json_encode([
        'success' => false,
        'error' => 'File upload error: ' . $errorCode
    ]);
    exit;
}

// Check required fields
if (!isset($_POST['productName']) || !isset($_POST['productDescription']) || !isset($_POST['productPrice'])) {
    logDebug("Error: Missing required fields");
    echo json_encode([
        'success' => false,
        'error' => 'Missing required product information'
    ]);
    exit;
}

// Get user information - use provided values or defaults
$user = [
    'id' => isset($_POST['user_id']) ? $_POST['user_id'] : '1',
    'username' => isset($_POST['username']) ? $_POST['username'] : 'default_user',
    'email' => isset($_POST['email']) ? $_POST['email'] : 'user@example.com'
];

logDebug("Using user: " . json_encode($user));

// Create uploads directory if it doesn't exist
$uploadsDir = 'uploads/products';
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
    logDebug("Created directory: $uploadsDir");
}

// Generate product ID
$productId = generateUniqueId();
logDebug("Generated product ID: $productId");

// Prepare secure filename
$file = $_FILES['productFile'];
$fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
$secureFilename = $productId . '.' . $fileExtension;
$uploadPath = $uploadsDir . '/' . $secureFilename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
    logDebug("Error: Failed to move uploaded file to $uploadPath");
    
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save uploaded file'
    ]);
    exit;
}

logDebug("File moved to: $uploadPath");

// Create product entry with EXPLICIT OWNERSHIP
$product = [
    'id' => $productId,
    'name' => $_POST['productName'],
    'description' => $_POST['productDescription'],
    'price' => floatval($_POST['productPrice']),
    'file_name' => $file['name'],
    'file_path' => $uploadPath,
    'file_size' => $file['size'],
    'seller_id' => $user['id'],
    'seller_email' => $user['email'],
    'seller_username' => $user['username'],
    'created_at' => date('Y-m-d H:i:s'),
    
    // Add explicit ownership flags
    'owner_username' => $user['username'],
    'owner_id' => $user['id'],
    'owner_email' => $user['email']
];

// Save product
saveProductInfo($product);
logDebug("Product saved with owner: " . $user['username']);

// Return success response
echo json_encode([
    'success' => true,
    'message' => 'Product uploaded successfully',
    'product' => [
        'id' => $productId,
        'name' => $_POST['productName'],
        'price' => floatval($_POST['productPrice']),
        'file_name' => $file['name'],
        'owner' => $user['username']
    ]
]);

logDebug("Upload completed successfully");
exit;
?>