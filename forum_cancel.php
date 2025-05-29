<?php
// forum_cancel.php - Handles canceled PayPal transactions

session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get product ID
$productId = $_GET['product'] ?? '';

// Set cancellation message
$_SESSION['payment_message'] = "Your payment was canceled. No charges were made.";

// Redirect back to the forum
header('Location: index.php');
exit;