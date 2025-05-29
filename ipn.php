<?php
// ipn.php

// Error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include PayPal configuration
require_once 'gateway-config.php';

// Function to get shop configuration
function getShopConfig() {
    $configFile = 'shop_config.json';
    if (!file_exists($configFile)) {
        die("Shop configuration file not found.");
    }
    $json = file_get_contents($configFile);
    return json_decode($json, true) ?: [];
}
// Function to update forum transaction status
function updateForumTransaction($productId, $transactionId, $status, $payerEmail) {
    $transactionsFile = 'forum_transactions.json';
    $forumPurchasesFile = 'forum_purchases.json';
    
    // Load existing transactions
    $transactions = [];
    if (file_exists($transactionsFile)) {
        $transactions = json_decode(file_get_contents($transactionsFile), true) ?: [];
    }
    
    // Load forum purchases
    $purchases = [];
    if (file_exists($forumPurchasesFile)) {
        $purchases = json_decode(file_get_contents($forumPurchasesFile), true) ?: [];
    }
    
    // Find and update transaction
    $updated = false;
    foreach ($transactions as &$transaction) {
        if ($transaction['product_id'] === $productId && $transaction['transaction_id'] === $transactionId) {
            $transaction['status'] = $status;
            $updated = true;
            break;
        }
    }
    
    // If transaction found and completed, add to purchases
    if ($updated && $status === 'Completed') {
        if (!isset($purchases[$payerEmail])) {
            $purchases[$payerEmail] = [];
        }
        
        // Add to user's purchases if not already exists
        $exists = false;
        foreach ($purchases[$payerEmail] as $purchase) {
            if ($purchase['product_id'] === $productId) {
                $exists = true;
                break;
            }
        }
        
        if (!$exists) {
            $purchases[$payerEmail][] = [
                'product_id' => $productId,
                'transaction_id' => $transactionId,
                'purchase_date' => date('Y-m-d H:i:s'),
                'status' => 'purchased'
            ];
        }
        
        // Save purchases
        file_put_contents($forumPurchasesFile, json_encode($purchases, JSON_PRETTY_PRINT));
    }
    
    // Save transactions
    if ($updated) {
        file_put_contents($transactionsFile, json_encode($transactions, JSON_PRETTY_PRINT));
    }
    
    return $updated;
}
// Function to log IPN messages
function logIpnMessage($message) {
    file_put_contents('ipn_log.txt', date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
}
// Function to verify product ownership
function verifyProductOwnership($productId, $ownerUsername) {
    // Path to products database
    $productsFile = 'products.json';
    
    if (!file_exists($productsFile)) {
        logIpnMessage("Products file not found when verifying ownership");
        return false;
    }
    
    $products = json_decode(file_get_contents($productsFile), true) ?: [];
    
    foreach ($products as $product) {
        if ($product['id'] === $productId) {
            // Check if owner_username matches
            if (isset($product['owner_username']) && $product['owner_username'] === $ownerUsername) {
                logIpnMessage("Ownership verified for product $productId, owner: $ownerUsername");
                return true;
            } else {
                $actualOwner = $product['owner_username'] ?? 'unknown';
                logIpnMessage("Ownership verification failed for product $productId. Expected owner: $ownerUsername, Actual owner: $actualOwner");
                return false;
            }
        }
    }
    
    logIpnMessage("Product not found when verifying ownership: $productId");
    return false;
}

function validateProductOwnership($productId, $sellerEmail) {
    // Load products database
    $productsFile = 'products.json';
    if (!file_exists($productsFile)) {
        return false;
    }
    
    $products = json_decode(file_get_contents($productsFile), true) ?: [];
    
    // Check if product exists and belongs to the seller
    foreach ($products as $product) {
        if ($product['id'] === $productId && $product['seller_email'] === $sellerEmail) {
            return true;
        }
    }
    
    // Product not found or doesn't belong to seller
    return false;
}
// Function to get user purchases
function getUserPurchases($email) {
    $purchasesFile = 'user_purchases.json';
    if (!file_exists($purchasesFile)) {
        file_put_contents($purchasesFile, json_encode([]));
        return [];
    }
    $purchases = json_decode(file_get_contents($purchasesFile), true);
    return $purchases[$email] ?? [];
}

// Function to save user purchases
function saveUserPurchase($email, $productId, $transactionId) {
    $purchasesFile = 'user_purchases.json';
    $purchases = json_decode(file_get_contents($purchasesFile), true) ?: [];
    
    if (!isset($purchases[$email])) {
        $purchases[$email] = [];
    }
    
    $purchases[$email][] = [
        'product_id' => $productId,
        'transaction_id' => $transactionId,
        'purchase_date' => date('Y-m-d H:i:s'),
        'status' => 'purchased'
    ];
    
    file_put_contents($purchasesFile, json_encode($purchases, JSON_PRETTY_PRINT));
}

// Main IPN handling
$raw_post_data = file_get_contents('php://input');
$raw_post_array = explode('&', $raw_post_data);
$myPost = array();
foreach ($raw_post_array as $keyval) {
    $keyval = explode('=', $keyval);
    if (count($keyval) == 2) {
        $myPost[$keyval[0]] = urldecode($keyval[1]);
    }
}

// Read the post from PayPal system and add 'cmd'
$req = 'cmd=_notify-validate';
foreach ($myPost as $key => $value) {
    $value = urlencode($value);
    $req .= "&$key=$value";
}

// Send back to PayPal system to validate
$paypalUrl = PAYPAL_SANDBOX ? "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr" : "https://ipnpb.paypal.com/cgi-bin/webscr";
$ch = curl_init($paypalUrl);
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $req);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_FORBID_REUSE, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Connection: Close'));
$res = curl_exec($ch);

if (!$res) {
    $errno = curl_errno($ch);
    $errstr = curl_error($ch);
    curl_close($ch);
    logIpnMessage("cURL error: [$errno] $errstr");
    die();
}

curl_close($ch);

// Inspect IPN validation result and act accordingly
if (strcmp($res, "VERIFIED") == 0) {
    // The IPN is verified, process it
    $item_name = $_POST['item_name'];
    $item_number = $_POST['item_number'];
    $payment_status = $_POST['payment_status'];
    $payment_amount = $_POST['mc_gross'];
    $payment_currency = $_POST['mc_currency'];
    $txn_id = $_POST['txn_id'];
    $receiver_email = $_POST['receiver_email'];
    $payer_email = $_POST['payer_email'];
    
    // Check that the payment status is Completed
    if ($payment_status == 'Completed') {
		// Add this to your existing IPN handler where payments are processed
if ($payment_status == 'Completed') {
    // Extract custom data from PayPal
    $custom = json_decode($_POST['custom'], true);
    
    if ($custom && isset($custom['product_id'])) {
        $productId = $custom['product_id'];
        $ownerUsername = isset($custom['owner_username']) ? $custom['owner_username'] : '';
        $sellerEmail = $_POST['receiver_email'];
        
        // Verify product ownership before processing payment
        if (!empty($ownerUsername)) {
            $isOwner = verifyProductOwnership($productId, $ownerUsername);
            
            if (!$isOwner) {
                logIpnMessage("Payment rejected: Ownership verification failed for product $productId");
                exit; // Stop processing this payment
            }
        }
        
        // Continue with normal payment processing
        updateForumTransaction($productId, $txn_id, $payment_status, $payer_email);
        saveUserPurchase($payer_email, $productId, $txn_id);
        logIpnMessage("Payment completed: $item_name purchased by $payer_email");
    }
}
        // Check that txn_id has not been previously processed
        // Check that receiver_email is your Primary PayPal email
        // Check that payment_amount/payment_currency are correct
        // Process payment
        // Check that the payment status is Completed
      // Check that the payment status is Completed
if ($payment_status == 'Completed') {
    // Extract product ID and seller email from custom field
    $custom = json_decode($_POST['custom'], true);
    if ($custom && isset($custom['product_id'])) {
        $productId = $custom['product_id'];
        $receiverEmail = $_POST['receiver_email'];
        
        // Validate that this product belongs to the receiver
        if (validateProductOwnership($productId, $receiverEmail)) {
            // Process the payment as normal
            updateForumTransaction($productId, $txn_id, $payment_status, $payer_email);
            saveUserPurchase($payer_email, $productId, $txn_id);
            logIpnMessage("Payment completed: $item_name purchased by $payer_email");
        } else {
            // Log ownership validation failure
            logIpnMessage("Product ownership validation failed: Product $productId does not belong to $receiverEmail");
        }
    } else {
        logIpnMessage("Missing product_id in custom field");
    }
} else {
    logIpnMessage("Payment status not completed: $payment_status");
}
} else if (strcmp($res, "INVALID") == 0) {
    // IPN invalid, log for manual investigation
    logIpnMessage("Invalid IPN: $req");
}
?>