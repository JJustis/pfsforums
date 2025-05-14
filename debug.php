

<?php
// Enable error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Forum data directories
define('DATA_DIR', 'data');
define('USERS_FILE', DATA_DIR . '/users.json');
define('CATEGORIES_FILE', DATA_DIR . '/categories.json');
define('POSTS_FILE', DATA_DIR . '/posts.json');
define('REPLIES_FILE', DATA_DIR . '/replies.json');
define('SEO_FILE', DATA_DIR . '/seo.json');
define('ENCRYPTION_META_FILE', DATA_DIR . '/encryption_meta.json');

// Create data directory if it doesn't exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Check for actions
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Process actions
if ($action === 'reset') {
    // Remove all data files
    foreach ([USERS_FILE, CATEGORIES_FILE, POSTS_FILE, REPLIES_FILE, SEO_FILE, ENCRYPTION_META_FILE] as $file) {
        if (file_exists($file)) {
            unlink($file);
        }
    }
    
    echo "All data files reset successfully.";
    exit;
}

// Display debug information
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forum Debug</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        .card { border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; }
        .card-header { background: #f5f5f5; padding: 10px; border-bottom: 1px solid #ddd; }
        .card-body { padding: 15px; }
        .btn { display: inline-block; padding: 8px 16px; margin: 8px 0; background: #f44336; color: white; text-decoration: none; border-radius: 4px; }
        .code { font-family: monospace; background: #f8f8f8; padding: 10px; border-radius: 4px; overflow: auto; max-height: 300px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="card-header">Forum Debug Panel</div>
            <div class="card-body">
                <h3>Data Files</h3>
                <p>The following data files are currently in the system:</p>
                <ul>
                    <?php
                    foreach ([USERS_FILE, CATEGORIES_FILE, POSTS_FILE, REPLIES_FILE, SEO_FILE, ENCRYPTION_META_FILE] as $file) {
                        if (file_exists($file)) {
                            $size = filesize($file);
                            $sizeStr = $size < 1024 ? "$size bytes" : round($size / 1024, 2) . " KB";
                            echo "<li>" . basename($file) . " ($sizeStr)</li>";
                        } else {
                            echo "<li>" . basename($file) . " (not created yet)</li>";
                        }
                    }
                    ?>
                </ul>
                
                <h3>Encryption Status</h3>
                <?php
                if (file_exists(ENCRYPTION_META_FILE)) {
                    $encryptionMeta = json_decode(file_get_contents(ENCRYPTION_META_FILE), true);
                    echo "<p>Last encryption date: " . ($encryptionMeta['lastEncryptionDate'] ?? 'None') . "</p>";
                    echo "<p>Is encrypted: " . (($encryptionMeta['isEncrypted'] ?? false) ? 'Yes' : 'No') . "</p>";
                    
                    // Today's key info
                    $today = date('Y-m-d');
                    $todayKey = generateDailyKey($today);
                    echo "<p>Today's date: $today</p>";
                    echo "<p>Today's key hash: " . substr(hash('sha256', $todayKey), 0, 16) . "...</p>";
                } else {
                    echo "<p>No encryption metadata file yet.</p>";
                }
                ?>
                
                <h3>Actions</h3>
                <a href="?action=reset" class="btn" onclick="return confirm('Are you sure you want to reset all data?')">Reset All Data</a>
                
                <?php
                // Function to generate daily key
                function generateDailyKey($dateString) {
                    $baseSecret = "S3cure#F0rum#System#2025";
                    $combinedString = $baseSecret . $dateString;
                    return hash('sha256', $combinedString);
                }
                ?>
            </div>
        </div>
    </div>
</body>
</html>




