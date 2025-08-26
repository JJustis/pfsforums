<?php
// Test Maintenance Mode
// This script creates a temporary lock file to test maintenance mode

define('DATA_DIR', 'data');
define('LOCK_FILE', DATA_DIR . '/reencryption.lock');

// Create data directory if needed
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'enable':
        // Create lock file
        $lockData = [
            'started' => time(),
            'test' => true,
            'message' => 'Testing maintenance mode'
        ];
        file_put_contents(LOCK_FILE, json_encode($lockData));
        echo "Maintenance mode ENABLED. Visit the forum to see the maintenance screen.";
        break;
        
    case 'disable':
        // Remove lock file
        if (file_exists(LOCK_FILE)) {
            unlink(LOCK_FILE);
            echo "Maintenance mode DISABLED. Forum is now accessible.";
        } else {
            echo "Maintenance mode was not enabled.";
        }
        break;
        
    case 'status':
        if (file_exists(LOCK_FILE)) {
            echo "Maintenance mode is ENABLED";
        } else {
            echo "Maintenance mode is DISABLED";
        }
        break;
        
    default:
        echo "<h2>Maintenance Mode Test</h2>";
        echo "<p><a href='?action=enable'>Enable Maintenance Mode</a></p>";
        echo "<p><a href='?action=disable'>Disable Maintenance Mode</a></p>";
        echo "<p><a href='?action=status'>Check Status</a></p>";
        echo "<hr>";
        echo "<p>Current status: ";
        if (file_exists(LOCK_FILE)) {
            echo "<strong style='color: red;'>ENABLED</strong>";
        } else {
            echo "<strong style='color: green;'>DISABLED</strong>";
        }
        echo "</p>";
        break;
}
?>