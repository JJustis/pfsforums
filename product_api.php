<?php
// product_api.php - With ownership filtering

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Helper function to log debug info
function logDebug($message) {
    file_put_contents('product_debug.log', date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
}

// Log request info
logDebug("Request received: " . json_encode($_GET));

// Function to load or create products file
function getProductsData() {
    $productsFile = 'products.json';
    
    if (!file_exists($productsFile)) {
        // Create sample data with ownership
        $sampleData = [
            [
                "id" => "prod_sample1",
                "name" => "Sample Product 1",
                "description" => "This is a sample product for testing",
                "price" => 9.99,
                "file_name" => "sample.pdf",
                "file_path" => "uploads/products/sample.pdf",
                "file_size" => 1024,
                "seller_id" => "1",
                "seller_email" => "admin@example.com",
                "seller_username" => "admin",
                "created_at" => date('Y-m-d H:i:s'),
                "owner_username" => "admin",
                "owner_id" => "1",
                "owner_email" => "admin@example.com"
            ],
            [
                "id" => "prod_sample2",
                "name" => "Sample Product 2",
                "description" => "Another sample product for testing",
                "price" => 19.99,
                "file_name" => "sample2.zip",
                "file_path" => "uploads/products/sample2.zip",
                "file_size" => 2048,
                "seller_id" => "1",
                "seller_email" => "admin@example.com",
                "seller_username" => "admin",
                "created_at" => date('Y-m-d H:i:s'),
                "owner_username" => "admin",
                "owner_id" => "1",
                "owner_email" => "admin@example.com"
            ]
        ];
        
        file_put_contents($productsFile, json_encode($sampleData, JSON_PRETTY_PRINT));
        return $sampleData;
    }
    
    return json_decode(file_get_contents($productsFile), true) ?: [];
}

// Set content type to JSON
header('Content-Type: application/json');

// Get action (defaults to 'list' if not specified)
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

// Get username from request, if available
$username = isset($_GET['username']) ? $_GET['username'] : 
           (isset($_POST['username']) ? $_POST['username'] : null);

// Process action
switch ($action) {
    case 'list':
        // Get all products
        $allProducts = getProductsData();
        
        // Filter by owner if username is provided
        $filteredProducts = [];
        if ($username) {
            logDebug("Filtering products for owner: " . $username);
            
            foreach ($allProducts as $product) {
                // Check if this product belongs to the user
                if (isset($product['owner_username']) && $product['owner_username'] === $username) {
                    $filteredProducts[] = $product;
                }
            }
            
            logDebug("Found " . count($filteredProducts) . " products for " . $username);
            
            echo json_encode([
                'success' => true,
                'products' => $filteredProducts,
                'filtered_by' => 'owner_username',
                'owner' => $username
            ]);
        } else {
            // No username provided, return all products with a note
            logDebug("No username provided, returning all products");
            
            echo json_encode([
                'success' => true,
                'products' => $allProducts,
                'note' => 'No owner filtering applied. To see only your products, provide a username parameter.'
            ]);
        }
        break;
        
    case 'verify_ownership':
        // Check product ownership (for PayPal integration)
        if (!isset($_GET['product_id']) || !isset($_GET['username'])) {
            echo json_encode([
                'success' => false,
                'error' => 'Missing product_id or username parameter'
            ]);
            break;
        }
        
        $productId = $_GET['product_id'];
        $username = $_GET['username'];
        
        logDebug("Verifying ownership of product $productId for user $username");
        
        // Get products
        $products = getProductsData();
        
        // Find product and check ownership
        $isOwner = false;
        $productFound = false;
        
        foreach ($products as $product) {
            if ($product['id'] === $productId) {
                $productFound = true;
                if (isset($product['owner_username']) && $product['owner_username'] === $username) {
                    $isOwner = true;
                }
                break;
            }
        }
        
        echo json_encode([
            'success' => true,
            'product_id' => $productId,
            'username' => $username,
            'product_found' => $productFound,
            'is_owner' => $isOwner
        ]);
        break;
        
    case 'delete':
        // Just return success without actually deleting anything
        logDebug("Delete operation requested (mock response)");
        
        echo json_encode([
            'success' => true,
            'message' => 'Product deleted successfully (test mode)',
            'debug_info' => [
                'timestamp' => time()
            ]
        ]);
        break;
        
    default:
        logDebug("Invalid action requested: " . $action);
        
        echo json_encode([
            'success' => false,
            'error' => 'Invalid action',
            'debug_info' => [
                'requested_action' => $action,
                'valid_actions' => ['list', 'verify_ownership', 'delete']
            ]
        ]);
        break;
}
exit;
?>