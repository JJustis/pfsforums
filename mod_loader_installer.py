#!/usr/bin/env python3
"""
Complete Mod Loader Installation Script
Integrates the full mod system into your forum with hooks and example mods
"""

import os
import re
import shutil
import json
from pathlib import Path
import datetime

class ModLoaderInstaller:
    def __init__(self, forum_dir="."):
        self.forum_dir = Path(forum_dir)
        self.api_file = self.forum_dir / "api.php"
        self.backup_dir = self.forum_dir / "backups"
        self.changes_made = []
        
    def install_complete_system(self):
        """Install the complete mod system"""
        print("🚀 Installing Complete Mod Loader System")
        print("=" * 50)
        
        # Verify prerequisites
        if not self.verify_prerequisites():
            return False
            
        try:
            # Step 1: Create backups
            self.create_backups()
            
            # Step 2: Create mod system core
            self.create_mod_system_core()
            
            # Step 3: Integrate into api.php
            self.integrate_api_php()
            
            # Step 4: Create example mods
            self.create_example_mods()
            
            # Step 5: Add frontend components
            self.add_frontend_components()
            
            # Step 6: Create documentation
            self.create_documentation()
            
            # Step 7: Test installation
            self.test_installation()
            
            self.print_completion_message()
            return True
            
        except Exception as e:
            print(f"❌ Installation failed: {e}")
            print("💡 Restore from backup if needed")
            return False
    
    def verify_prerequisites(self):
        """Check if all prerequisites are met"""
        print("🔍 Verifying prerequisites...")
        
        if not self.api_file.exists():
            print(f"❌ api.php not found at {self.api_file}")
            return False
            
        # Check if PHP is available
        try:
            import subprocess
            result = subprocess.run(['php', '--version'], capture_output=True)
            if result.returncode != 0:
                print("⚠️  PHP not found in PATH (optional for testing)")
        except:
            print("⚠️  Could not check PHP version")
            
        print("✅ Prerequisites verified")
        return True
    
    def create_backups(self):
        """Create timestamped backups"""
        print("💾 Creating backups...")
        
        self.backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Backup api.php
        if self.api_file.exists():
            backup_path = self.backup_dir / f"api_backup_{timestamp}.php"
            shutil.copy2(self.api_file, backup_path)
            print(f"   ✅ api.php → {backup_path}")
        
        self.changes_made.append(f"Created backup at {timestamp}")
    
    def create_mod_system_core(self):
        """Create the core mod system files"""
        print("🏗️  Creating mod system core...")
        
        # Create mod_system.php
        mod_system_content = '''<?php
/**
 * Forum Mod Loader System
 * Provides a hook-based system for easy feature integration
 */

// ===== HOOK SYSTEM =====

class Hooks {
    private static $hooks = [];
    private static $debugMode = false;
    
    /**
     * Register a hook callback
     */
    public static function register($hookName, $callback, $priority = 10, $modName = 'unknown') {
        if (!isset(self::$hooks[$hookName])) {
            self::$hooks[$hookName] = [];
        }
        
        self::$hooks[$hookName][] = [
            'callback' => $callback,
            'priority' => $priority,
            'mod' => $modName,
            'id' => uniqid()
        ];
        
        // Sort by priority (lower numbers = higher priority)
        usort(self::$hooks[$hookName], function($a, $b) {
            return $a['priority'] - $b['priority'];
        });
        
        if (self::$debugMode) {
            error_log("Hook registered: {$hookName} by {$modName} (priority: {$priority})");
        }
    }
    
    /**
     * Fire a hook and call all registered callbacks
     */
    public static function fire($hookName, $data = null, $context = []) {
        if (!isset(self::$hooks[$hookName])) {
            return $data;
        }
        
        if (self::$debugMode) {
            error_log("Firing hook: {$hookName} with " . count(self::$hooks[$hookName]) . " callbacks");
        }
        
        $result = $data;
        
        foreach (self::$hooks[$hookName] as $hook) {
            try {
                $hookResult = call_user_func($hook['callback'], $result, $context, $hookName);
                
                if ($hookResult !== null) {
                    $result = $hookResult;
                }
                
            } catch (Exception $e) {
                error_log("Hook error in {$hook['mod']}: " . $e->getMessage());
            }
        }
        
        return $result;
    }
    
    /**
     * Fire an action hook (doesn't return data)
     */
    public static function action($hookName, $context = []) {
        self::fire($hookName, null, $context);
    }
    
    public static function getRegisteredHooks() {
        return self::$hooks;
    }
    
    public static function removeModHooks($modName) {
        foreach (self::$hooks as $hookName => &$hooks) {
            $hooks = array_filter($hooks, function($hook) use ($modName) {
                return $hook['mod'] !== $modName;
            });
        }
    }
    
    public static function setDebugMode($enabled) {
        self::$debugMode = $enabled;
    }
}

// ===== MOD BASE CLASS =====

abstract class ForumMod {
    protected $name;
    protected $version;
    protected $description;
    protected $author;
    protected $dependencies = [];
    protected $enabled = true;
    
    public function __construct() {
        $this->init();
    }
    
    abstract protected function init();
    abstract public function registerHooks();
    
    public function onEnable() {}
    public function onDisable() {}
    
    protected function hook($hookName, $callback, $priority = 10) {
        if (is_string($callback) && method_exists($this, $callback)) {
            $callback = [$this, $callback];
        }
        
        Hooks::register($hookName, $callback, $priority, $this->getName());
    }
    
    protected function action($hookName, $callback, $priority = 10) {
        $this->hook($hookName, $callback, $priority);
    }
    
    protected function fire($hookName, $data = null, $context = []) {
        return Hooks::fire($hookName, $data, $context);
    }
    
    // Getters
    public function getName() { return $this->name; }
    public function getVersion() { return $this->version; }
    public function getDescription() { return $this->description; }
    public function getAuthor() { return $this->author; }
    public function getDependencies() { return $this->dependencies; }
    public function isEnabled() { return $this->enabled; }
    
    public function setEnabled($enabled) { 
        $this->enabled = $enabled;
        if ($enabled) {
            $this->onEnable();
        } else {
            $this->onDisable();
        }
    }
}

// ===== MOD LOADER =====

class ModLoader {
    private static $instance = null;
    private $loadedMods = [];
    private $modDirectory = 'mods';
    private $configFile = 'data/mod_config.json';
    private $config = [];
    
    private function __construct() {
        $this->loadConfig();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function loadMods() {
        if (!is_dir($this->modDirectory)) {
            mkdir($this->modDirectory, 0755, true);
        }
        
        $modDirs = glob($this->modDirectory . '/*', GLOB_ONLYDIR);
        
        foreach ($modDirs as $modDir) {
            $this->loadMod($modDir);
        }
        
        foreach ($this->loadedMods as $mod) {
            if ($mod->isEnabled()) {
                $mod->registerHooks();
            }
        }
        
        error_log("ModLoader: Loaded " . count($this->loadedMods) . " mods");
    }
    
    private function loadMod($modDir) {
        $modName = basename($modDir);
        $modFile = $modDir . '/' . $modName . '.php';
        $configFile = $modDir . '/mod.json';
        
        if (!file_exists($modFile)) {
            return false;
        }
        
        try {
            $modConfig = [];
            if (file_exists($configFile)) {
                $modConfig = json_decode(file_get_contents($configFile), true);
            }
            
            require_once $modFile;
            
            $className = $modConfig['class'] ?? ucfirst($modName) . 'Mod';
            
            if (!class_exists($className)) {
                return false;
            }
            
            $mod = new $className();
            
            $enabled = $this->config['mods'][$modName]['enabled'] ?? true;
            $mod->setEnabled($enabled);
            
            $this->loadedMods[$modName] = $mod;
            
            return true;
            
        } catch (Exception $e) {
            error_log("ModLoader: Error loading mod {$modName}: " . $e->getMessage());
            return false;
        }
    }
    
    public function getMods() {
        return $this->loadedMods;
    }
    
    public function getMod($name) {
        return $this->loadedMods[$name] ?? null;
    }
    
    public function toggleMod($name, $enabled) {
        if (isset($this->loadedMods[$name])) {
            $this->loadedMods[$name]->setEnabled($enabled);
            $this->config['mods'][$name]['enabled'] = $enabled;
            $this->saveConfig();
            
            if (!$enabled) {
                Hooks::removeModHooks($name);
            }
            
            return true;
        }
        return false;
    }
    
    private function loadConfig() {
        if (file_exists($this->configFile)) {
            $this->config = json_decode(file_get_contents($this->configFile), true) ?? [];
        } else {
            $this->config = ['mods' => []];
        }
    }
    
    private function saveConfig() {
        $dir = dirname($this->configFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        file_put_contents($this->configFile, json_encode($this->config, JSON_PRETTY_PRINT));
    }
    
    public function getStats() {
        $enabled = 0;
        $disabled = 0;
        
        foreach ($this->loadedMods as $mod) {
            if ($mod->isEnabled()) {
                $enabled++;
            } else {
                $disabled++;
            }
        }
        
        return [
            'total' => count($this->loadedMods),
            'enabled' => $enabled,
            'disabled' => $disabled,
            'hooks' => count(Hooks::getRegisteredHooks())
        ];
    }
}

// ===== HELPER FUNCTIONS =====

function forum_hook($hookName, $data = null, $context = []) {
    return Hooks::fire($hookName, $data, $context);
}

function forum_action($hookName, $context = []) {
    Hooks::action($hookName, $context);
}

function is_mod_loaded($modName) {
    return ModLoader::getInstance()->getMod($modName) !== null;
}

?> '''
        
        mod_system_file = self.forum_dir / "mod_system.php"
        mod_system_file.write_text(mod_system_content)
        self.changes_made.append("Created mod_system.php")
        print("   ✅ mod_system.php created")
    
    def integrate_api_php(self):
        """Integrate mod system into api.php"""
        print("🔧 Integrating with api.php...")
        
        content = self.api_file.read_text(encoding='utf-8')
        
        # 1. Add mod system include
        if "require_once 'mod_system.php';" not in content:
            php_pattern = r'(<\?php\s*\n)'
            replacement = r'\1\n// Include mod system\nrequire_once \'mod_system.php\';\n'
            content = re.sub(php_pattern, replacement, content)
            self.changes_made.append("Added mod system include")
            print("   ✅ Added mod system include")
        
        # 2. Add mod loader initialization
        if "ModLoader::getInstance()->loadMods();" not in content:
            # Find after the data directory creation
            init_pattern = r'(if \(!file_exists\(DATA_DIR\)\) \{\s*mkdir\(DATA_DIR[^}]+\}\s*)'
            init_code = r'''\1
// Initialize mod system
try {
    ModLoader::getInstance()->loadMods();
    error_log("Mod system initialized successfully");
} catch (Exception $e) {
    error_log("Mod system initialization error: " . $e->getMessage());
}

'''
            content = re.sub(init_pattern, init_code, content)
            self.changes_made.append("Added mod loader initialization")
            print("   ✅ Added mod loader initialization")
        
        # 3. Add mod management API cases
        if "case 'get_mods':" not in content:
            # Find the switch statement
            switch_pattern = r'(switch\s*\(\$action\)\s*\{[^}]*)(default:)'
            mod_cases = r'''\1    case 'get_mods':
        echo json_encode(getModsList());
        break;
        
    case 'toggle_mod':
        echo json_encode(toggleMod());
        break;
        
    case 'get_mod_stats':
        echo json_encode(getModStats());
        break;
        
    case 'get_hooks':
        echo json_encode(getHooksInfo());
        break;
        
    \2'''
            content = re.sub(switch_pattern, mod_cases, content, flags=re.DOTALL)
            self.changes_made.append("Added mod management API cases")
            print("   ✅ Added mod management API cases")
        
        # 4. Add mod management functions
        if "function getModsList()" not in content:
            mod_functions = '''

// ===== MOD MANAGEMENT API FUNCTIONS =====

function getModsList() {
    $modLoader = ModLoader::getInstance();
    $mods = [];
    
    foreach ($modLoader->getMods() as $name => $mod) {
        $mods[] = [
            'name' => $name,
            'display_name' => $mod->getName(),
            'version' => $mod->getVersion(),
            'description' => $mod->getDescription(),
            'author' => $mod->getAuthor(),
            'enabled' => $mod->isEnabled(),
            'dependencies' => $mod->getDependencies()
        ];
    }
    
    return [
        'success' => true,
        'mods' => $mods,
        'stats' => $modLoader->getStats()
    ];
}

function toggleMod() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['token']) || !isset($input['modName']) || !isset($input['enabled'])) {
        return ['success' => false, 'error' => 'Missing required fields'];
    }
    
    $userId = verifyToken($input['token']);
    if (!$userId || !isUserAdmin($userId)) {
        return ['success' => false, 'error' => 'Admin access required'];
    }
    
    $modLoader = ModLoader::getInstance();
    $success = $modLoader->toggleMod($input['modName'], $input['enabled']);
    
    if ($success) {
        return [
            'success' => true,
            'message' => 'Mod ' . ($input['enabled'] ? 'enabled' : 'disabled') . ' successfully'
        ];
    } else {
        return ['success' => false, 'error' => 'Mod not found'];
    }
}

function getModStats() {
    return [
        'success' => true,
        'stats' => ModLoader::getInstance()->getStats()
    ];
}

function getHooksInfo() {
    $hooks = Hooks::getRegisteredHooks();
    $hookInfo = [];
    
    foreach ($hooks as $hookName => $callbacks) {
        $hookInfo[$hookName] = [
            'name' => $hookName,
            'callback_count' => count($callbacks),
            'mods' => array_column($callbacks, 'mod')
        ];
    }
    
    return [
        'success' => true,
        'hooks' => $hookInfo
    ];
}
'''
            
            # Add before closing PHP tag
            closing_pattern = r'(\?\>\s*$)'
            content = re.sub(closing_pattern, mod_functions + r'\n\1', content)
            self.changes_made.append("Added mod management functions")
            print("   ✅ Added mod management functions")
        
        # 5. Add basic hooks to existing functions
        self.add_basic_hooks(content)
        
        # Write back to file
        self.api_file.write_text(content, encoding='utf-8')
        print("   ✅ api.php integration completed")
    
    def add_basic_hooks(self, content):
        """Add basic hook calls to existing functions"""
        print("   🔗 Adding basic hooks...")
        
        # Add hook to register function
        if "forum_hook('user_registered'" not in content:
            register_pattern = r'(\$users\[\] = \$newUser;)'
            register_replacement = r'$newUser = forum_hook("user_registered", $newUser, ["action" => "register"]);\n        \1'
            content = re.sub(register_pattern, register_replacement, content)
            print("     ✅ Added user_registered hook")
        
        # Add hook to login function
        if "forum_action('user_logged_in'" not in content:
            login_pattern = r'(echo json_encode\(\[\s*"success" => true,\s*"user" => \$userResponse,\s*"token" => \$token\s*\]\);)'
            login_replacement = r'forum_action("user_logged_in", ["user" => $userResponse, "token" => $token]);\n                \1'
            content = re.sub(login_pattern, login_replacement, content)
            print("     ✅ Added user_logged_in hook")
        
        # Add hook to post creation
        if "forum_hook('post_created'" not in content:
            post_pattern = r'(\$posts\[\] = \$newPost;)'
            post_replacement = r'\1\n        forum_action("post_created", ["post" => $newPost, "userId" => $userId]);'
            content = re.sub(post_pattern, post_replacement, content)
            print("     ✅ Added post_created hook")
        
        return content
    
    def create_example_mods(self):
        """Create example mods"""
        print("📦 Creating example mods...")
        
        mods_dir = self.forum_dir / "mods"
        mods_dir.mkdir(exist_ok=True)
        
        # Create welcome message mod
        self.create_welcome_mod(mods_dir)
        
        # Create security logger mod
        self.create_security_mod(mods_dir)
        
        # Create statistics mod
        self.create_stats_mod(mods_dir)
        
        print("   ✅ Example mods created")
    
    def create_welcome_mod(self, mods_dir):
        """Create welcome message mod"""
        welcome_dir = mods_dir / "welcome_message"
        welcome_dir.mkdir(exist_ok=True)
        
        # mod.json
        mod_config = {
            "name": "Welcome Message",
            "version": "1.0.0",
            "description": "Adds welcome messages for new users",
            "author": "Forum System",
            "class": "WelcomeMessageMod"
        }
        
        (welcome_dir / "mod.json").write_text(json.dumps(mod_config, indent=2))
        
        # PHP file
        mod_code = '''<?php
class WelcomeMessageMod extends ForumMod {
    protected function init() {
        $this->name = "Welcome Message";
        $this->version = "1.0.0";
        $this->description = "Adds welcome messages for new users";
        $this->author = "Forum System";
    }
    
    public function registerHooks() {
        $this->hook("user_registered", "onUserRegistered", 10);
        $this->hook("api_response", "addWelcomeMessage", 5);
    }
    
    public function onUserRegistered($userData, $context) {
        error_log("Welcome: New user {$userData['username']} registered!");
        
        // Add welcome badge or flag
        $userData['welcome_sent'] = true;
        
        return $userData;
    }
    
    public function addWelcomeMessage($response, $context) {
        if ($context["action"] === "register" && $response["success"]) {
            $response["welcome_message"] = "🎉 Welcome to our secure forum! Please read the community guidelines and enjoy your stay.";
            $response["quick_tips"] = [
                "Complete your profile for a better experience",
                "Join discussions in categories you're interested in",
                "Use the search function to find existing topics"
            ];
        }
        return $response;
    }
}
'''
        
        (welcome_dir / "welcome_message.php").write_text(mod_code)
        print("     ✅ Welcome Message mod")
    
    def create_security_mod(self, mods_dir):
        """Create security logger mod"""
        security_dir = mods_dir / "security_logger"
        security_dir.mkdir(exist_ok=True)
        
        mod_config = {
            "name": "Security Logger",
            "version": "1.0.0",
            "description": "Logs security events and suspicious activities",
            "author": "Forum System",
            "class": "SecurityLoggerMod"
        }
        
        (security_dir / "mod.json").write_text(json.dumps(mod_config, indent=2))
        
        mod_code = '''<?php
class SecurityLoggerMod extends ForumMod {
    private $logFile = 'data/security.log';
    
    protected function init() {
        $this->name = "Security Logger";
        $this->version = "1.0.0";
        $this->description = "Logs security events and suspicious activities";
        $this->author = "Forum System";
    }
    
    public function registerHooks() {
        $this->action("user_logged_in", "logLogin", 5);
        $this->action("user_registered", "logRegistration", 5);
        $this->action("post_created", "logPostCreation", 10);
    }
    
    public function logLogin($data, $context) {
        $this->log("LOGIN_SUCCESS", "User {$data['user']['username']} logged in", [
            'user_id' => $data['user']['id'],
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
    }
    
    public function logRegistration($userData, $context) {
        $this->log("USER_REGISTERED", "New user registered: {$userData['username']}", [
            'user_id' => $userData['id'],
            'email' => $userData['email'],
            'role' => $userData['role']
        ]);
    }
    
    public function logPostCreation($data, $context) {
        $this->log("POST_CREATED", "New post created", [
            'post_id' => $data['post']['id'],
            'user_id' => $data['post']['authorId'],
            'category_id' => $data['post']['categoryId']
        ]);
    }
    
    private function log($type, $message, $data = []) {
        $logEntry = [
            'timestamp' => date('c'),
            'type' => $type,
            'message' => $message,
            'data' => $data,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        $logLine = json_encode($logEntry) . "\\n";
        file_put_contents($this->logFile, $logLine, FILE_APPEND | LOCK_EX);
    }
}
'''
        
        (security_dir / "security_logger.php").write_text(mod_code)
        print("     ✅ Security Logger mod")
    
    def create_stats_mod(self, mods_dir):
        """Create statistics mod"""
        stats_dir = mods_dir / "post_stats"
        stats_dir.mkdir(exist_ok=True)
        
        mod_config = {
            "name": "Post Statistics",
            "version": "1.0.0",
            "description": "Tracks post and reply statistics",
            "author": "Forum System",
            "class": "PostStatsMod"
        }
        
        (stats_dir / "mod.json").write_text(json.dumps(mod_config, indent=2))
        
        mod_code = '''<?php
class PostStatsMod extends ForumMod {
    private $statsFile = 'data/post_stats.json';
    
    protected function init() {
        $this->name = "Post Statistics";
        $this->version = "1.0.0";
        $this->description = "Tracks post and reply statistics";
        $this->author = "Forum System";
    }
    
    public function registerHooks() {
        $this->action("post_created", "trackPost", 5);
        $this->action("reply_created", "trackReply", 5);
        $this->hook("api_response", "addStatsToResponse", 20);
    }
    
    public function trackPost($data, $context) {
        $this->updateStats('posts', 1);
        $this->updateUserStats($data['post']['authorId'], 'posts', 1);
    }
    
    public function trackReply($data, $context) {
        $this->updateStats('replies', 1);
        $this->updateUserStats($data['reply']['authorId'], 'replies', 1);
    }
    
    public function addStatsToResponse($response, $context) {
        if ($context['action'] === 'get_categories') {
            $stats = $this->getStats();
            $response['forum_stats'] = [
                'total_posts' => $stats['posts'] ?? 0,
                'total_replies' => $stats['replies'] ?? 0,
                'total_interactions' => ($stats['posts'] ?? 0) + ($stats['replies'] ?? 0)
            ];
        }
        return $response;
    }
    
    private function updateStats($type, $increment) {
        $stats = $this->getStats();
        $stats[$type] = ($stats[$type] ?? 0) + $increment;
        $stats['last_updated'] = time();
        
        file_put_contents($this->statsFile, json_encode($stats, JSON_PRETTY_PRINT));
    }
    
    private function updateUserStats($userId, $type, $increment) {
        $stats = $this->getStats();
        $userKey = "user_{$userId}";
        
        if (!isset($stats['users'][$userKey])) {
            $stats['users'][$userKey] = ['posts' => 0, 'replies' => 0];
        }
        
        $stats['users'][$userKey][$type] += $increment;
        file_put_contents($this->statsFile, json_encode($stats, JSON_PRETTY_PRINT));
    }
    
    private function getStats() {
        if (file_exists($this->statsFile)) {
            return json_decode(file_get_contents($this->statsFile), true) ?? [];
        }
        return [];
    }
}
'''
        
        (stats_dir / "post_stats.php").write_text(mod_code)
        print("     ✅ Post Statistics mod")
    
    def add_frontend_components(self):
        """Add frontend components for mod management"""
        print("🖥️  Adding frontend components...")
        
        # Create mod management JavaScript
        mod_js = '''// Mod Management JavaScript
// Add this to your app.js or include separately

// Add to your App object methods:

// Load and display mods (add to App object)
async loadMods() {
    if (!this.isAdmin) {
        this.showToast('error', 'Admin access required');
        return;
    }
    
    try {
        const response = await API.getMods();
        this.displayMods(response.mods, response.stats);
    } catch (error) {
        console.error('Error loading mods:', error);
        this.showToast('error', 'Failed to load mods: ' + error.message);
    }
},

displayMods(mods, stats) {
    const container = document.getElementById('mods-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mods-header">
            <h2><i class="fas fa-puzzle-piece"></i> Mod Management</h2>
            <div class="mods-stats">
                <div class="stat-card">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total Mods</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.enabled}</div>
                    <div class="stat-label">Enabled</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.hooks}</div>
                    <div class="stat-label">Active Hooks</div>
                </div>
            </div>
        </div>
        <div class="mods-list">
            ${mods.map(mod => `
                <div class="mod-card ${mod.enabled ? 'enabled' : 'disabled'}">
                    <div class="mod-header">
                        <div class="mod-info">
                            <h3>${this.escapeHtml(mod.display_name)}</h3>
                            <p class="mod-description">${this.escapeHtml(mod.description)}</p>
                            <div class="mod-meta">
                                <span class="mod-version">v${mod.version}</span>
                                <span class="mod-author">by ${this.escapeHtml(mod.author)}</span>
                            </div>
                        </div>
                        <div class="mod-controls">
                            <label class="mod-toggle">
                                <input type="checkbox" ${mod.enabled ? 'checked' : ''} 
                                    onchange="App.toggleMod('${mod.name}', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
},

async toggleMod(modName, enabled) {
    try {
        const token = localStorage.getItem('auth_token');
        const response = await API.toggleMod(token, modName, enabled);
        
        if (response.success) {
            this.showToast('success', response.message);
            this.loadMods(); // Reload the list
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Error toggling mod:', error);
        this.showToast('error', 'Failed to toggle mod: ' + error.message);
        // Revert the toggle
        this.loadMods();
    }
}

// Add these API methods to your API object:
// In api.js, add these methods:

async getMods() {
    return await this.request('get_mods');
},

async toggleMod(token, modName, enabled) {
    return await this.request('toggle_mod', { token, modName, enabled });
},

async getModStats() {
    return await this.request('get_mod_stats');
},

async getHooksInfo() {
    return await this.request('get_hooks');
}
'''
        
        mod_js_file = self.forum_dir / "mod_management.js"
        mod_js_file.write_text(mod_js)
        self.changes_made.append("Created mod management JavaScript")
        
        # Create mod management CSS
        mod_css = '''/* Mod Management Styles */
.mods-header {
    margin-bottom: 2rem;
}

.mods-stats {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.stat-card {
    background: var(--card-background, #fff);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
    min-width: 100px;
}

.stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color, #2196F3);
}

.stat-label {
    font-size: 0.9rem;
    color: var(--text-secondary, #666);
    margin-top: 0.5rem;
}

.mods-list {
    display: grid;
    gap: 1rem;
}

.mod-card {
    background: var(--card-background, #fff);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.3s ease;
}

.mod-card.enabled {
    border-left: 4px solid var(--success-color, #4CAF50);
}

.mod-card.disabled {
    border-left: 4px solid var(--error-color, #f44336);
    opacity: 0.7;
}

.mod-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.mod-info h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #333);
}

.mod-description {
    color: var(--text-secondary, #666);
    margin: 0 0 1rem 0;
    line-height: 1.4;
}

.mod-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
}

.mod-version {
    background: var(--primary-color, #2196F3);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
}

.mod-author {
    color: var(--text-secondary, #666);
}

.mod-toggle {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
}

.mod-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
}

.mod-toggle input:checked + .toggle-slider {
    background-color: var(--success-color, #4CAF50);
}

.mod-toggle input:checked + .toggle-slider:before {
    transform: translateX(26px);
}

/* Dark theme support */
[data-theme="dark"] .mod-card {
    background: var(--dark-card-background, #2a2a2a);
    border-color: var(--dark-border-color, #444);
}

[data-theme="dark"] .mod-info h3 {
    color: var(--dark-text-primary, #fff);
}

[data-theme="dark"] .mod-description,
[data-theme="dark"] .mod-author {
    color: var(--dark-text-secondary, #ccc);
}
'''
        
        mod_css_file = self.forum_dir / "mod_management.css"
        mod_css_file.write_text(mod_css)
        self.changes_made.append("Created mod management CSS")
        
        print("   ✅ Frontend components created")
    
    def create_documentation(self):
        """Create comprehensive documentation"""
        print("📚 Creating documentation...")
        
        docs = '''# Forum Mod System Documentation

## Quick Start

The Forum Mod System allows you to extend your forum with custom features using a hook-based architecture.

### Your First Mod

1. Create a directory in `mods/` with your mod name
2. Create `mod.json` with mod information
3. Create `{mod_name}.php` with your mod class

Example structure:
```
mods/
└── my_first_mod/
    ├── mod.json
    └── my_first_mod.php
```

### mod.json
```json
{
    "name": "My First Mod",
    "version": "1.0.0",
    "description": "My awesome first mod",
    "author": "Your Name",
    "class": "MyFirstMod"
}
```

### my_first_mod.php
```php
<?php
class MyFirstMod extends ForumMod {
    protected function init() {
        $this->name = "My First Mod";
        $this->version = "1.0.0";
        $this->description = "My awesome first mod";
        $this->author = "Your Name";
    }
    
    public function registerHooks() {
        $this->hook("user_registered", "onUserRegistered", 10);
        $this->action("user_logged_in", "onUserLogin", 10);
    }
    
    public function onUserRegistered($userData, $context) {
        // Modify user data
        $userData['custom_field'] = 'Welcome!';
        return $userData;
    }
    
    public function onUserLogin($data, $context) {
        // Perform action (no return needed)
        error_log("User {$data['user']['username']} logged in!");
    }
}
```

## Available Hooks

### User Events
- `user_registered` - When user registers (filter)
- `user_logged_in` - When user logs in (action)
- `user_logged_out` - When user logs out (action)

### Content Events
- `post_created` - When post is created (action)
- `reply_created` - When reply is created (action)
- `api_response` - Modify API responses (filter)

### System Events
- `encryption_started` - When encryption begins (action)
- `encryption_completed` - When encryption completes (action)

## Hook Types

### Filter Hooks (return modified data)
```php
$this->hook("user_registered", "modifyUser", 10);

public function modifyUser($userData, $context) {
    $userData['welcome_bonus'] = 100;
    return $userData; // Must return data
}
```

### Action Hooks (perform actions)
```php
$this->action("user_logged_in", "logLogin", 10);

public function logLogin($data, $context) {
    error_log("User login: " . $data['user']['username']);
    // No return needed
}
```

## Priority System

Lower numbers = higher priority:
- 1-5: Critical hooks
- 5-10: Important hooks  
- 10-15: Normal hooks
- 15-20: Low priority hooks

## Context Data

Hooks receive context about when they're called:
```php
public function myHook($data, $context) {
    $action = $context['action']; // Current API action
    $userId = $context['userId']; // Current user ID
    // Use context to make decisions
}
```

## Best Practices

1. **Always handle errors gracefully**
```php
public function myHook($data, $context) {
    try {
        // Your code here
        return $data;
    } catch (Exception $e) {
        error_log("Mod error: " . $e->getMessage());
        return $data; // Return original data
    }
}
```

2. **Check dependencies**
```php
public function registerHooks() {
    if (!is_mod_loaded('required_mod')) {
        error_log("Required mod not loaded");
        return;
    }
    
    $this->hook("some_hook", "myCallback");
}
```

3. **Use meaningful hook priorities**
```php
// Security checks should run first
$this->hook("user_registered", "securityCheck", 5);

// Welcome messages can run later
$this->hook("user_registered", "sendWelcome", 15);
```

## Management

### Admin Panel
Access mod management through the admin panel:
1. Login as admin
2. Navigate to Mods section
3. Enable/disable mods with toggle switches

### API Endpoints
- `GET /api.php?action=get_mods` - List all mods
- `POST /api.php?action=toggle_mod` - Enable/disable mod
- `GET /api.php?action=get_mod_stats` - Get statistics
- `GET /api.php?action=get_hooks` - List active hooks

### File Configuration
Edit `data/mod_config.json` to manually enable/disable mods:
```json
{
    "mods": {
        "welcome_message": {
            "enabled": true
        },
        "security_logger": {
            "enabled": false
        }
    }
}
```

## Advanced Features

### Custom API Endpoints
```php
public function registerHooks() {
    $this->hook("api_request", "handleCustomAPI", 5);
}

public function handleCustomAPI($data, $context) {
    if ($context['action'] === 'my_custom_action') {
        return $this->handleMyAction($data, $context);
    }
    return $data;
}
```

### Database Integration
```php
public function trackUserActivity($userData, $context) {
    // Use existing forum data functions
    $users = loadData(USERS_FILE);
    
    // Modify and save
    saveData(USERS_FILE, $users);
    
    return $userData;
}
```

### Configuration Files
```php
class MyMod extends ForumMod {
    private $config;
    
    protected function init() {
        $this->loadConfig();
    }
    
    private function loadConfig() {
        $configFile = 'data/my_mod_config.json';
        if (file_exists($configFile)) {
            $this->config = json_decode(file_get_contents($configFile), true);
        }
    }
}
```

## Troubleshooting

### Mod Not Loading
1. Check mod.json syntax
2. Verify class name matches
3. Check PHP syntax errors
4. Review error logs

### Hooks Not Firing
1. Verify hook name spelling
2. Check if mod is enabled
3. Confirm hook registration
4. Enable debug mode: `Hooks::setDebugMode(true);`

### Performance Issues
1. Optimize hook callbacks
2. Avoid heavy operations in high-frequency hooks
3. Use appropriate hook priorities
4. Consider caching for expensive operations

## Example Mods

The system includes these example mods:

1. **Welcome Message** - Adds welcome messages for new users
2. **Security Logger** - Logs security events and activities  
3. **Post Statistics** - Tracks forum usage statistics

Study these examples to learn mod development patterns.

## Support

- Check error logs: `tail -f error.log`
- Enable debug mode for detailed logging
- Test with minimal mods for isolation
- Verify file permissions are correct

Happy modding! 🚀
'''
        
        docs_file = self.forum_dir / "MOD_SYSTEM_DOCS.md"
        docs_file.write_text(docs)
        self.changes_made.append("Created documentation")
        print("   ✅ Documentation created")
    
    def test_installation(self):
        """Test the installation"""
        print("🧪 Testing installation...")
        
        # Check if files were created
        required_files = [
            "mod_system.php",
            "mods/welcome_message/welcome_message.php",
            "mods/security_logger/security_logger.php",
            "mods/post_stats/post_stats.php"
        ]
        
        for file_path in required_files:
            if (self.forum_dir / file_path).exists():
                print(f"   ✅ {file_path}")
            else:
                print(f"   ❌ {file_path} missing")
        
        # Check api.php integration
        api_content = self.api_file.read_text()
        checks = [
            ("Mod system include", "require_once 'mod_system.php'"),
            ("Mod loader init", "ModLoader::getInstance()->loadMods()"),
            ("API cases", "case 'get_mods':"),
            ("API functions", "function getModsList()")
        ]
        
        for name, pattern in checks:
            if pattern in api_content:
                print(f"   ✅ {name}")
            else:
                print(f"   ❌ {name} missing")
    
    def print_completion_message(self):
        """Print completion message with instructions"""
        print("\n" + "=" * 50)
        print("🎉 MOD SYSTEM INSTALLATION COMPLETED!")
        print("=" * 50)
        
        print("\n📋 Changes Made:")
        for change in self.changes_made:
            print(f"   • {change}")
        
        print("\n📂 Files Created:")
        print("   • mod_system.php - Core mod system")
        print("   • mods/ - Mod directory with examples")
        print("   • mod_management.js - Frontend code")
        print("   • mod_management.css - Styling")
        print("   • MOD_SYSTEM_DOCS.md - Documentation")
        
        print("\n🔧 Next Steps:")
        print("   1. Test your forum to ensure it works")
        print("   2. Check browser console for any errors")
        print("   3. Log in as admin to access mod management")
        print("   4. View example mods in the mods/ directory")
        print("   5. Read MOD_SYSTEM_DOCS.md for development guide")
        
        print("\n🚀 Creating Your First Mod:")
        print("   1. Create mods/my_mod/ directory")
        print("   2. Add mod.json and my_mod.php files")
        print("   3. Extend ForumMod class and register hooks")
        print("   4. Refresh forum to load new mod")
        
        print("\n📊 Admin Panel:")
        print("   • Navigate to admin section when logged in")
        print("   • Look for Mods management")
        print("   • Toggle mods on/off with switches")
        
        print("\n🛠️ Troubleshooting:")
        print("   • Check PHP error logs")
        print("   • Verify file permissions")
        print("   • Enable debug mode: Hooks::setDebugMode(true)")
        
        print("\n💡 Example Mods Included:")
        print("   • Welcome Message - Greets new users")
        print("   • Security Logger - Logs security events")
        print("   • Post Statistics - Tracks forum activity")
        
        if self.backup_dir.exists():
            backup_files = list(self.backup_dir.glob("*backup*"))
            if backup_files:
                latest_backup = max(backup_files, key=lambda x: x.stat().st_mtime)
                print(f"\n💾 Backup Available: {latest_backup}")
                print("   Use this to restore if needed")

def main():
    """Main installation function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Install Forum Mod Loader System")
    parser.add_argument("--forum-dir", default=".", help="Forum directory path")
    parser.add_argument("--force", action="store_true", help="Force installation even if files exist")
    
    args = parser.parse_args()
    
    # Check if api.php exists
    api_file = Path(args.forum_dir) / "api.php"
    if not api_file.exists():
        print("❌ Error: api.php not found")
        print(f"   Make sure you're in the forum directory or specify --forum-dir")
        print(f"   Looking for: {api_file.absolute()}")
        return False
    
    # Check if mod system already exists
    mod_system_file = Path(args.forum_dir) / "mod_system.php"
    if mod_system_file.exists() and not args.force:
        print("⚠️  Mod system already exists")
        response = input("Reinstall anyway? (y/N): ")
        if response.lower() != 'y':
            print("Installation cancelled")
            return False
    
    # Confirm installation
    print(f"🎯 Installing mod system in: {Path(args.forum_dir).absolute()}")
    if not args.force:
        response = input("Continue? (y/N): ")
        if response.lower() != 'y':
            print("Installation cancelled")
            return False
    
    # Run installation
    installer = ModLoaderInstaller(args.forum_dir)
    success = installer.install_complete_system()
    
    return success

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
