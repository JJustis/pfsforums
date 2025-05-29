<?php
// forum_return.php - Handles successful PayPal transactions

session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include required files
require_once 'gateway-config.php';

// Get transaction data
$productId = $_GET['product'] ?? '';
$timestamp = $_GET['timestamp'] ?? '';
$transactionId = $_GET['tx'] ?? '';
$status = $_GET['st'] ?? '';

// Validate input
if (empty($productId) || empty($timestamp)) {
    header('Location: index.php');
    exit;
}

// Record the successful transaction for the forum user
function recordForumTransaction($productId, $transactionId, $status) {
    $transactionsFile = 'forum_transactions.json';
    
    // Load existing transactions
    $transactions = [];
    if (file_exists($transactionsFile)) {
        $transactions = json_decode(file_get_contents($transactionsFile), true) ?: [];
    }
    
    // Add new transaction
    $transactions[] = [
        'product_id' => $productId,
        'transaction_id' => $transactionId,
        'status' => $status,
        'timestamp' => date('Y-m-d H:i:s'),
        'user_id' => $_SESSION['user_id'] ?? 'guest'
    ];
    
    // Save transactions
    file_put_contents($transactionsFile, json_encode($transactions, JSON_PRETTY_PRINT));
    
    return true;
}

// Process and record the transaction
if (!empty($transactionId) && $status === 'Completed') {
    recordForumTransaction($productId, $transactionId, $status);
}

// Redirect to the download page if the transaction is complete
if ($status === 'Completed') {
    header("Location: download.php?id=$productId&transaction_id=$transactionId");
    exit;
}

// Otherwise, redirect to the forum with success message
$_SESSION['payment_message'] = "Payment successful! You will receive access to your purchase soon.";
header('Location: index.php');
exit;