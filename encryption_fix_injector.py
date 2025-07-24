#!/usr/bin/env python3
"""
PHP Encryption Fix Injector
Safely injects the improved encryption system into api.php
"""

import os
import re
import shutil
import datetime
import sys
from pathlib import Path

class EncryptionFixInjector:
    def __init__(self, api_file_path="api.php"):
        self.api_file_path = Path(api_file_path)
        self.backup_dir = Path("backups")
        self.changes_made = []
        
    def create_backup(self):
        """Create a timestamped backup of the original file"""
        if not self.api_file_path.exists():
            raise FileNotFoundError(f"API file not found: {self.api_file_path}")
        
        # Create backup directory
        self.backup_dir.mkdir(exist_ok=True)
        
        # Create timestamped backup
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"api_backup_{timestamp}.php"
        
        shutil.copy2(self.api_file_path, backup_path)
        print(f"✅ Backup created: {backup_path}")
        return backup_path
    
    def read_file(self):
        """Read the current API file content"""
        with open(self.api_file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def write_file(self, content):
        """Write content back to the API file"""
        with open(self.api_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def find_function_bounds(self, content, function_name):
        """Find the start and end positions of a PHP function"""
        # Pattern to match function definition
        pattern = rf'function\s+{re.escape(function_name)}\s*\([^)]*\)\s*\{{'
        match = re.search(pattern, content, re.IGNORECASE)
        
        if not match:
            return None, None
        
        start_pos = match.start()
        
        # Find the matching closing brace
        brace_count = 0
        pos = match.end() - 1  # Start from the opening brace
        
        while pos < len(content):
            if content[pos] == '{':
                brace_count += 1
            elif content[pos] == '}':
                brace_count -= 1
                if brace_count == 0:
                    return start_pos, pos + 1
            pos += 1
        
        return start_pos, None  # Function not properly closed
    
    def add_constants_and_directories(self, content):
        """Add new constants and directory creation if not present"""
        new_constants = """
// Enhanced encryption system constants
define('BACKUP_DIR', DATA_DIR . '/backups');
define('LOCK_DIR', DATA_DIR . '/locks');

// Create backup and lock directories
if (!file_exists(BACKUP_DIR)) {
    mkdir(BACKUP_DIR, 0755, true);
}
if (!file_exists(LOCK_DIR)) {
    mkdir(LOCK_DIR, 0755, true);
}
"""
        
        # Check if BACKUP_DIR is already defined
        if "define('BACKUP_DIR'" not in content:
            # Find a good place to insert (after other defines)
            data_dir_pattern = r"define\('DATA_DIR'[^;]+;\)"
            match = re.search(data_dir_pattern, content)
            
            if match:
                insert_pos = match.end()
                content = content[:insert_pos] + new_constants + content[insert_pos:]
                self.changes_made.append("Added BACKUP_DIR and LOCK_DIR constants")
        
        return content
    
    def get_improved_functions(self):
        """Return the improved function implementations"""
        return {
            'checkDailyEncryption': '''function checkDailyEncryption() {
    $today = date('Y-m-d');
    $encryptionMeta = loadEncryptionMeta();
    
    // Only re-encrypt if it's been at least 24 hours
    if ($encryptionMeta['lastEncryptionDate'] === $today) {
        return; // Already encrypted today
    }
    
    // Create a lock file to prevent multiple simultaneous re-encryptions
    $lockFile = LOCK_DIR . '/reencryption.lock';
    
    // Check if re-encryption is already in progress
    if (file_exists($lockFile)) {
        $lockAge = time() - filemtime($lockFile);
        // If lock is older than 10 minutes, consider it stale and remove it
        if ($lockAge > 600) {
            unlink($lockFile);
        } else {
            // Re-encryption in progress, skip
            return;
        }
    }
    
    // Create lock file
    file_put_contents($lockFile, time());
    
    try {
        // Generate today's key
        $todayKey = generateDailyKey($today);
        
        // If data was already encrypted, re-encrypt with today's key
        if ($encryptionMeta['isEncrypted'] && !empty($encryptionMeta['lastEncryptionDate'])) {
            // Get previous day's key
            $previousDate = $encryptionMeta['lastEncryptionDate'];
            $previousKey = generateDailyKey($previousDate);
            
            // Create backup before re-encryption
            $backupDir = createBackupDirectory($previousDate);
            
            if ($backupDir) {
                // Re-encrypt all data files with proper error handling
                $success = reEncryptAllDataFiles($previousKey, $todayKey, $backupDir);
                
                if ($success) {
                    // Update encryption metadata only if successful
                    $encryptionMeta['lastEncryptionDate'] = $today;
                    $encryptionMeta['isEncrypted'] = true;
                    $encryptionMeta['lastBackupDate'] = $previousDate;
                    saveEncryptionMeta($encryptionMeta);
                    
                    error_log("Daily re-encryption completed successfully for date: $today");
                } else {
                    error_log("Daily re-encryption failed for date: $today - backup preserved at: $backupDir");
                }
            } else {
                error_log("Failed to create backup directory for re-encryption");
            }
        } else {
            // First time encryption
            $encryptionMeta['lastEncryptionDate'] = $today;
            $encryptionMeta['isEncrypted'] = true;
            saveEncryptionMeta($encryptionMeta);
        }
    } catch (Exception $e) {
        error_log("Error during daily encryption check: " . $e->getMessage());
    } finally {
        // Always remove the lock file
        if (file_exists($lockFile)) {
            unlink($lockFile);
        }
    }
}''',

            'loadData': '''function loadData($file) {
    if (!file_exists($file)) {
        // Create empty file with default structure only for new files
        $defaultData = getDefaultDataForFile($file);
        saveData($file, $defaultData);
        return $defaultData;
    }
    
    // Get today's encryption key
    $today = date('Y-m-d');
    $encryptionKey = generateDailyKey($today);
    
    try {
        // Read file contents
        $fileContents = file_get_contents($file);
        if ($fileContents === false) {
            throw new Exception("Could not read file: $file");
        }
        
        // Try to decrypt with today's key first
        $decryptedData = decryptDataSafely($fileContents, $encryptionKey);
        
        // If today's key doesn't work, try yesterday's key
        if ($decryptedData === false) {
            $yesterday = date('Y-m-d', strtotime('-1 day'));
            $yesterdayKey = generateDailyKey($yesterday);
            $decryptedData = decryptDataSafely($fileContents, $yesterdayKey);
        }
        
        // If neither key works, try as plain JSON
        if ($decryptedData === false) {
            $decryptedData = $fileContents;
        }
        
        // Parse JSON
        $data = json_decode($decryptedData, true);
        
        // If JSON parsing fails, do NOT return empty array - preserve original file
        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode failed for file $file. Preserving original file. JSON Error: " . json_last_error_msg());
            
            // Return default data but don't overwrite the file
            return getDefaultDataForFile($file);
        }
        
        return $data ?: [];
        
    } catch (Exception $e) {
        error_log("Error loading file $file: " . $e->getMessage());
        
        // Return default data but preserve the original file
        return getDefaultDataForFile($file);
    }
}''',

            'saveData': '''function saveData($file, $data) {
    try {
        // Create directory if needed
        $dir = dirname($file);
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }
        
        // Convert data to JSON
        $jsonData = json_encode($data, JSON_PRETTY_PRINT);
        if ($jsonData === false) {
            throw new Exception("JSON encoding failed for file: $file");
        }
        
        // Get today's encryption key
        $today = date('Y-m-d');
        $encryptionKey = generateDailyKey($today);
        
        // Check if encryption is needed
        $encryptionMeta = loadEncryptionMeta();
        
        $finalData = $jsonData;
        if ($encryptionMeta['isEncrypted']) {
            // Encrypt the data
            $finalData = encryptData($jsonData, $encryptionKey);
        }
        
        // Write to temporary file first (atomic operation)
        $tempFile = $file . '.tmp';
        if (file_put_contents($tempFile, $finalData, LOCK_EX) === false) {
            throw new Exception("Could not write temporary file: $tempFile");
        }
        
        // Atomic rename
        if (!rename($tempFile, $file)) {
            unlink($tempFile); // Clean up
            throw new Exception("Could not rename temporary file for: $file");
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error saving file $file: " . $e->getMessage());
        
        // Clean up temp file if it exists
        $tempFile = $file . '.tmp';
        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
        
        throw $e; // Re-throw to let caller handle
    }
}''',

            'decryptData': '''function decryptData($encryptedData, $key) {
    try {
        // Create decryption key from password
        $decKey = substr(hash('sha256', $key, true), 0, 32);
        
        // Decode from base64
        $data = base64_decode($encryptedData, true);
        
        if ($data === false) {
            // Not valid base64, assume it's plain text
            return $encryptedData;
        }
        
        // Check minimum length for IV + encrypted data
        if (strlen($data) < 16) {
            return $encryptedData; // Too short to be encrypted
        }
        
        // Extract IV (first 16 bytes)
        $iv = substr($data, 0, 16);
        
        // Extract the encrypted data (everything after IV)
        $encrypted = substr($data, 16);
        
        // Decrypt
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $decKey, 0, $iv);
        
        if ($decrypted === false) {
            // Decryption failed, return original data
            return $encryptedData;
        }
        
        return $decrypted;
        
    } catch (Exception $e) {
        error_log("Decryption error: " . $e->getMessage());
        // On error, return original data
        return $encryptedData;
    }
}'''
        }
    
    def get_new_functions(self):
        """Return new functions that need to be added"""
        return {
            'createBackupDirectory': '''function createBackupDirectory($date) {
    $timestamp = date('Y-m-d_H-i-s');
    $backupPath = BACKUP_DIR . '/backup_' . $date . '_' . $timestamp;
    
    if (mkdir($backupPath, 0755, true)) {
        return $backupPath;
    }
    
    return false;
}''',

            'backupFile': '''function backupFile($sourceFile, $backupDir) {
    if (!file_exists($sourceFile)) {
        return true; // Nothing to backup
    }
    
    $fileName = basename($sourceFile);
    $backupPath = $backupDir . '/' . $fileName;
    
    return copy($sourceFile, $backupPath);
}''',

            'reEncryptAllDataFiles': '''function reEncryptAllDataFiles($oldKey, $newKey, $backupDir) {
    // List of main data files to re-encrypt
    $mainFiles = [USERS_FILE, CATEGORIES_FILE, POSTS_FILE, REPLIES_FILE, SEO_FILE, KEYS_FILE];
    $allSuccess = true;
    $processedFiles = [];
    
    try {
        // Step 1: Backup all main files first
        foreach ($mainFiles as $file) {
            if (file_exists($file)) {
                if (!backupFile($file, $backupDir)) {
                    throw new Exception("Failed to backup file: $file");
                }
            }
        }
        
        // Step 2: Re-encrypt main files
        foreach ($mainFiles as $file) {
            if (file_exists($file)) {
                if (reEncryptSingleFile($file, $oldKey, $newKey)) {
                    $processedFiles[] = $file;
                } else {
                    throw new Exception("Failed to re-encrypt file: $file");
                }
            }
        }
        
        // Step 3: Re-encrypt directory files
        $directories = [CATEGORIES_DIR, POSTS_DIR, REPLIES_DIR, PLACARDS_DIR];
        
        foreach ($directories as $directory) {
            if (!reEncryptDirectoryFiles($directory, $oldKey, $newKey, $backupDir)) {
                throw new Exception("Failed to re-encrypt directory: $directory");
            }
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Re-encryption failed: " . $e->getMessage());
        
        // Rollback: Restore files from backup
        foreach ($processedFiles as $file) {
            $backupPath = $backupDir . '/' . basename($file);
            if (file_exists($backupPath)) {
                copy($backupPath, $file);
                error_log("Rolled back file: $file");
            }
        }
        
        return false;
    }
}''',

            'reEncryptSingleFile': '''function reEncryptSingleFile($file, $oldKey, $newKey) {
    try {
        // Read the encrypted file
        $encryptedData = file_get_contents($file);
        if ($encryptedData === false) {
            throw new Exception("Could not read file: $file");
        }
        
        // Decrypt with old key
        $decryptedData = decryptData($encryptedData, $oldKey);
        
        // Validate that decryption worked (check if it's valid JSON)
        $testJson = json_decode($decryptedData, true);
        if ($testJson === null && json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Decryption validation failed for file: $file");
        }
        
        // Re-encrypt with new key
        $newEncryptedData = encryptData($decryptedData, $newKey);
        
        // Write to temporary file first (atomic operation)
        $tempFile = $file . '.tmp';
        if (file_put_contents($tempFile, $newEncryptedData) === false) {
            throw new Exception("Could not write temporary file: $tempFile");
        }
        
        // Atomic rename
        if (!rename($tempFile, $file)) {
            unlink($tempFile); // Clean up temp file
            throw new Exception("Could not rename temporary file: $tempFile");
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error re-encrypting file $file: " . $e->getMessage());
        
        // Clean up temp file if it exists
        $tempFile = $file . '.tmp';
        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
        
        return false;
    }
}''',

            'decryptDataSafely': '''function decryptDataSafely($encryptedData, $key) {
    try {
        // Check if data looks like base64 encoded encrypted data
        if (!preg_match('/^[A-Za-z0-9+\/]+=*$/', $encryptedData)) {
            return false; // Not encrypted
        }
        
        $decrypted = decryptData($encryptedData, $key);
        
        // Test if the decrypted data is valid JSON
        $testJson = json_decode($decrypted, true);
        if ($testJson === null && json_last_error() !== JSON_ERROR_NONE) {
            return false; // Decryption failed
        }
        
        return $decrypted;
        
    } catch (Exception $e) {
        return false;
    }
}''',

            'getDefaultDataForFile': '''function getDefaultDataForFile($file) {
    if ($file === SEO_FILE) {
        return [
            'title' => 'Secure Forum System',
            'description' => 'A secure forum system with encryption and many features',
            'keywords' => 'forum,security,encryption'
        ];
    }
    
    // For all other files, return empty array
    return [];
}''',

            'cleanupOldBackups': '''function cleanupOldBackups($daysToKeep = 7) {
    if (!is_dir(BACKUP_DIR)) {
        return;
    }
    
    $cutoffTime = time() - ($daysToKeep * 24 * 60 * 60);
    $backupDirs = glob(BACKUP_DIR . '/backup_*');
    
    foreach ($backupDirs as $backupDir) {
        if (is_dir($backupDir) && filemtime($backupDir) < $cutoffTime) {
            // Remove old backup directory
            removeDirectory($backupDir);
            error_log("Cleaned up old backup: $backupDir");
        }
    }
}''',

            'removeDirectory': '''function removeDirectory($dir) {
    if (!is_dir($dir)) {
        return;
    }
    
    $files = array_diff(scandir($dir), ['.', '..']);
    
    foreach ($files as $file) {
        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            removeDirectory($path);
        } else {
            unlink($path);
        }
    }
    
    rmdir($dir);
}'''
        }
    
    def replace_function(self, content, function_name, new_implementation):
        """Replace a function in the content"""
        start_pos, end_pos = self.find_function_bounds(content, function_name)
        
        if start_pos is not None and end_pos is not None:
            # Replace the function
            content = content[:start_pos] + new_implementation + content[end_pos:]
            self.changes_made.append(f"Replaced function: {function_name}")
            return content
        else:
            print(f"⚠️  Function {function_name} not found or incomplete")
            return content
    
    def add_new_functions(self, content):
        """Add new functions at the end of the file"""
        new_functions = self.get_new_functions()
        
        # Find a good place to add functions (before the closing PHP tag)
        closing_tag_pattern = r'\?\>\s*$'
        closing_match = re.search(closing_tag_pattern, content)
        
        if closing_match:
            insert_pos = closing_match.start()
        else:
            insert_pos = len(content)
        
        # Add all new functions
        new_code = "\n\n// NEW ENCRYPTION SYSTEM FUNCTIONS\n"
        for func_name, func_code in new_functions.items():
            # Check if function already exists
            if f"function {func_name}" not in content:
                new_code += f"\n// {func_name}\n{func_code}\n"
                self.changes_made.append(f"Added new function: {func_name}")
        
        # Add cleanup call
        new_code += '''
// Call cleanup function occasionally (you might want to run this via cron instead)
if (rand(1, 100) === 1) { // 1% chance on each request
    cleanupOldBackups(7); // Keep backups for 7 days
}
'''
        
        content = content[:insert_pos] + new_code + content[insert_pos:]
        return content
    
    def update_old_function_calls(self, content):
        """Update calls to old function names"""
        # Replace reEncryptDataFiles with reEncryptAllDataFiles
        if 'reEncryptDataFiles(' in content:
            content = content.replace('reEncryptDataFiles(', 'reEncryptAllDataFiles(')
            self.changes_made.append("Updated function call: reEncryptDataFiles -> reEncryptAllDataFiles")
        
        return content
    
    def inject_fix(self):
        """Main method to inject the encryption fix"""
        print("🔧 Starting Encryption Fix Injection...")
        
        try:
            # Step 1: Create backup
            backup_path = self.create_backup()
            
            # Step 2: Read current content
            print("📖 Reading current API file...")
            content = self.read_file()
            
            # Step 3: Add constants and directories
            print("🏗️  Adding new constants and directories...")
            content = self.add_constants_and_directories(content)
            
            # Step 4: Replace existing functions
            print("🔄 Replacing existing functions...")
            improved_functions = self.get_improved_functions()
            
            for func_name, func_code in improved_functions.items():
                content = self.replace_function(content, func_name, func_code)
            
            # Step 5: Add new functions
            print("➕ Adding new functions...")
            content = self.add_new_functions(content)
            
            # Step 6: Update function calls
            print("🔗 Updating function calls...")
            content = self.update_old_function_calls(content)
            
            # Step 7: Write the updated file
            print("💾 Writing updated file...")
            self.write_file(content)
            
            # Step 8: Report results
            print("\n✅ Encryption fix injection completed successfully!")
            print(f"📁 Backup saved to: {backup_path}")
            print("\n📋 Changes made:")
            for change in self.changes_made:
                print(f"   • {change}")
            
            print("\n🛠️  Next steps:")
            print("   1. Test your forum to ensure it works correctly")
            print("   2. Monitor the data/backups/ directory for backup creation")
            print("   3. Check error logs for any encryption issues")
            print("   4. The old backup system will automatically clean up after 7 days")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during injection: {e}")
            return False
    
    def test_injection(self):
        """Test that the injection was successful"""
        print("\n🧪 Testing injection...")
        
        content = self.read_file()
        
        # Check for key markers
        tests = [
            ("BACKUP_DIR constant", "define('BACKUP_DIR'"),
            ("checkDailyEncryption improvement", "file_put_contents($lockFile, time())"),
            ("loadData improvement", "decryptDataSafely"),
            ("createBackupDirectory function", "function createBackupDirectory"),
            ("reEncryptAllDataFiles function", "function reEncryptAllDataFiles"),
        ]
        
        all_passed = True
        for test_name, marker in tests:
            if marker in content:
                print(f"   ✅ {test_name}")
            else:
                print(f"   ❌ {test_name}")
                all_passed = False
        
        return all_passed


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Inject encryption fix into api.php")
    parser.add_argument("--file", default="api.php", help="Path to api.php file")
    parser.add_argument("--test", action="store_true", help="Test the injection after applying")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be changed without making changes")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.file):
        print(f"❌ Error: File {args.file} not found")
        print("Make sure you're running this script from the directory containing api.php")
        sys.exit(1)
    
    if args.dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        # Here you could add logic to show what would be changed
        print("This would inject the improved encryption system into your api.php file")
        return
    
    # Confirm before proceeding
    print(f"🚨 This will modify {args.file} and create a backup.")
    response = input("Do you want to proceed? (y/N): ")
    
    if response.lower() != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    # Create injector and run
    injector = EncryptionFixInjector(args.file)
    success = injector.inject_fix()
    
    if success and args.test:
        test_passed = injector.test_injection()
        if test_passed:
            print("\n🎉 All tests passed! The encryption fix has been successfully injected.")
        else:
            print("\n⚠️  Some tests failed. Please check the file manually.")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
