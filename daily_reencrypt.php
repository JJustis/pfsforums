<?php
// Daily Re-encryption Cron Job Script
// Run this script daily via cron job or Windows Task Scheduler

// Check if running from command line
$isCommandLine = php_sapi_name() === 'cli';

if (!$isCommandLine) {
    // If accessed via web, require admin authentication
    session_start();
    define('MAGIC_ID', '8f7d56a1c940e96b23c59363ef5de2b7ac6014e8');
    
    $isAuthorized = false;
    
    // Check session
    if (isset($_SESSION['magic_admin']) && $_SESSION['magic_admin'] === true) {
        $isAuthorized = true;
    }
    
    // Check magic key in URL
    if (isset($_GET['magic_key']) && $_GET['magic_key'] === MAGIC_ID) {
        $isAuthorized = true;
    }
    
    if (!$isAuthorized) {
        http_response_code(403);
        die('Unauthorized access');
    }
}

// Include the API functions
require_once('api.php');

// Set content type for web access
if (!$isCommandLine) {
    header('Content-Type: application/json');
}

// Perform daily re-encryption
try {
    $result = performDailyReencryption();
    
    if ($isCommandLine) {
        // Command line output
        if ($result['success']) {
            echo "Daily re-encryption completed successfully.\n";
            echo "Processed: " . ($result['processed'] ?? 0) . " files\n";
            echo "Failed: " . ($result['failed'] ?? 0) . " files\n";
        } else {
            echo "Daily re-encryption failed: " . ($result['error'] ?? 'Unknown error') . "\n";
            exit(1);
        }
    } else {
        // Web JSON response
        echo json_encode($result);
    }
    
} catch (Exception $e) {
    $error = "Daily re-encryption failed: " . $e->getMessage();
    
    if ($isCommandLine) {
        echo $error . "\n";
        exit(1);
    } else {
        echo json_encode(['success' => false, 'error' => $error]);
    }
}
?>