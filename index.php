
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Forum</title>
    <link rel="stylesheet" href="styles.css">
	<link rel="stylesheet" href="dark-theme-styles.css">
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
    <!-- CryptoJS for client-side encryption -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <!-- Three.js for 3D background -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
    <!-- 3D Background Canvas -->
    <canvas id="bg-canvas"></canvas>
    
    <!-- Main Content -->
    <div class="main-container">
        <header>
            <div class="logo">
                <i class="fas fa-shield-alt"></i>
                <span>Secure Forum</span>
            </div>
            <nav id="main-nav">
                <a href="#" id="nav-home" class="nav-link active"><i class="fas fa-home"></i> Home</a>
                <a href="#" id="nav-forum" class="nav-link hidden"><i class="fas fa-comments"></i> Forum</a>
                <a href="#" id="nav-profile" class="nav-link hidden"><i class="fas fa-user"></i> Profile</a>
                <a href="#" id="nav-login" class="nav-link"><i class="fas fa-sign-in-alt"></i> Login</a>
                <a href="#" id="nav-register" class="nav-link"><i class="fas fa-user-plus"></i> Register</a>
                <a href="#" id="nav-logout" class="nav-link hidden"><i class="fas fa-sign-out-alt"></i> Logout</a>
                <a href="#" id="nav-seo" class="nav-link admin-only hidden"><i class="fas fa-cog"></i> SEO</a>
            </nav>
            <div class="mobile-menu-toggle">
                <i class="fas fa-bars"></i>
            </div>
        </header>
        
        <div class="content">
            <!-- Encryption Status -->
            <div id="encryption-status" class="encryption-status">
                <i class="fas fa-lock"></i> <span>Initializing secure system...</span>
            </div>
            
            <!-- Pages -->
            <div id="page-home" class="page">
                <div class="hero">
                    <h1>Welcome to Secure Forum</h1>
                    <p>A highly secure forum system with encryption, daily re-encryption, and more security features.</p>
                    <div class="hero-buttons">
                        <button id="home-register" class="btn btn-primary"><i class="fas fa-user-plus"></i> Sign Up</button>
                        <button id="home-login" class="btn btn-secondary"><i class="fas fa-sign-in-alt"></i> Login</button>
                    </div>
                </div>
                
                <div class="features">
                    <h2>Key Features</h2>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon"><i class="fas fa-lock"></i></div>
                            <h3>Daily Encryption</h3>
                            <p>All forum data is encrypted and re-encrypted every 24 hours with a new key.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon"><i class="fas fa-shield-alt"></i></div>
                            <h3>Secure Login</h3>
                            <p>Advanced encryption protects your credentials and personal information.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon"><i class="fas fa-users"></i></div>
                            <h3>Community</h3>
                            <p>Join discussions with like-minded individuals in a secure environment.</p>
                        </div>

                    </div>
                </div>
            </div>
            
            <div id="page-login" class="page hidden">
                <div class="auth-container">
                    <div class="auth-box">
                        <h2><i class="fas fa-sign-in-alt"></i> Login</h2>
                        <div id="login-error" class="error-message hidden"></div>
                        <div class="form-group">
                            <label for="login-username">Username</label>
                            <input type="text" id="login-username" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" class="form-control">
                        </div>
                        <button id="login-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </button>
                        <div class="auth-footer">
                            <p>Don't have an account? <a href="#" id="login-to-register">Register</a></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-register" class="page hidden">
                <div class="auth-container">
                    <div class="auth-box">
                        <h2><i class="fas fa-user-plus"></i> Register</h2>
                        <div id="register-error" class="error-message hidden"></div>
                        <div class="form-group">
                            <label for="register-username">Username</label>
                            <input type="text" id="register-username" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="register-email">Email</label>
                            <input type="email" id="register-email" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="register-password">Password</label>
                            <input type="password" id="register-password" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="register-confirm">Confirm Password</label>
                            <input type="password" id="register-confirm" class="form-control">
                        </div>
                        <div class="form-group" id="admin-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="register-admin"> Register as admin
                            </label>
                        </div>
                        <button id="register-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-user-plus"></i> Register
                        </button>
                        <div class="auth-footer">
                            <p>Already have an account? <a href="#" id="register-to-login">Login</a></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-forum" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2><i class="fas fa-comments"></i> Forum Categories</h2>
                        <div class="forum-actions admin-only hidden">
                            <button id="new-category-btn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> New Category
                            </button>
                        </div>
                    </div>
                    
                    <div id="categories-container" class="categories-container">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> Loading categories...
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-category" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2 id="category-title">Category</h2>
                        <p id="category-description" class="category-description"></p>
                        <div class="forum-actions">
                            <button id="back-to-forum-btn" class="btn btn-secondary">
                                <i class="fas fa-arrow-left"></i> Back to Categories
                            </button>
                            <button id="new-post-btn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> New Post
                            </button>
                        </div>
                    </div>
                    
                    <div id="posts-container" class="posts-container">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> Loading posts...
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="page-new-post" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2><i class="fas fa-plus"></i> Create New Post</h2>
                        <div class="forum-actions">
                            <button id="post-cancel" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-container">
                        <div class="form-group">
                            <label for="post-title">Title</label>
                            <input type="text" id="post-title" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="post-content">Content</label>
                            <textarea id="post-content" class="form-control" rows="8"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="post-category">Category</label>
                            <select id="post-category" class="form-control">
                                <!-- Categories loaded dynamically -->
                            </select>
                        </div>
                        <button id="post-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-paper-plane"></i> Create Post
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="page-new-category" class="page hidden">
                <div class="forum-container">
                    <div class="forum-header">
                        <h2><i class="fas fa-plus"></i> Create New Category</h2>
                        <div class="forum-actions">
                            <button id="category-cancel" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-container">
                        <div class="form-group">
                            <label for="category-name">Name</label>
                            <input type="text" id="category-name" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="category-description">Description</label>
                            <textarea id="category-description-input" class="form-control" rows="4"></textarea>
                        </div>
                        <button id="category-submit" class="btn btn-primary btn-block">
                            <i class="fas fa-save"></i> Create Category
                        </button>
                    </div>
                </div>
            </div>
            
<!-- Update the post page structure in index.php -->

<div id="page-post" class="page hidden">
    <div class="forum-container">
        <div class="forum-header">
            <h2 id="post-title-display">Post Title</h2>
            <div id="post-meta-container">
                <!-- Post meta and user profile card will be inserted here -->
            </div>
            <div class="forum-actions">
                <button id="back-to-category-btn" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Back to Category
                </button>
                <!-- Delete button will be inserted here if admin -->
            </div>
        </div>
        
        <div id="post-content-display" class="post-content-display">
            <!-- Post content displayed here -->
        </div>
        
        <div class="replies-section">
            <h3><i class="fas fa-reply"></i> Replies</h3>
            <div id="replies-container">
                <!-- Replies loaded dynamically -->
            </div>
        </div>
        
        <div class="reply-form">
            <h3><i class="fas fa-comment"></i> Post a Reply</h3>
            <div class="form-group">
                <textarea id="reply-content" class="form-control" rows="4" placeholder="Write your reply here..."></textarea>
            </div>
            <button id="reply-submit" class="btn btn-primary">
                <i class="fas fa-paper-plane"></i> Post Reply
            </button>
        </div>
    </div>
</div>
            
   <div id="page-profile" class="page hidden">
    <div class="profile-container">
        <div class="profile-header">
            <div class="profile-avatar-container">
                <div id="profile-avatar" class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <button id="change-avatar-btn" class="btn btn-secondary btn-sm">
                    <i class="fas fa-camera"></i> Change Avatar
                </button>
                <input type="file" id="avatar-upload" accept="image/*" class="hidden">
            </div>
            <div class="profile-info">
                <h2 id="profile-username">Username</h2>
                <p id="profile-role">Role</p>
            </div>
        </div>
        
        <div class="profile-content">
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Account Information</h3>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span class="detail-label">Email:</span>
                        <span id="profile-email" class="detail-value">email@example.com</span>
                    </div>
                    <div class="profile-detail">
                        <span class="detail-label">Member Since:</span>
                        <span id="profile-created" class="detail-value">Date</span>
                    </div>
                    <div class="profile-detail">
                        <span class="detail-label">Last Login:</span>
                        <span id="profile-last-login" class="detail-value">Date</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-section">
                <h3><i class="fas fa-chart-bar"></i> Activity</h3>
                <div id="profile-activity" class="profile-activity">
                    <!-- Activity stats loaded dynamically -->
                </div>
            </div>
            
            <div class="profile-section">
                <h3><i class="fas fa-signature"></i> Signature</h3>
                <div class="form-group">
                    <textarea id="profile-signature" class="form-control" rows="3" placeholder="Add a signature that will appear on your posts..."></textarea>
                </div>
                <button id="save-signature-btn" class="btn btn-primary">
                    <i class="fas fa-save"></i> Save Signature
                </button>
            </div>
        </div>
    </div>
</div>
            
            <div id="page-seo" class="page hidden">
                <div class="seo-container">
                    <div class="seo-header">
                        <h2><i class="fas fa-cog"></i> SEO Settings</h2>
                    </div>
                    
                    <div id="seo-login" class="seo-login">
                        <p>Please enter the admin password to access SEO settings:</p>
                        <div class="form-group">
                            <input type="password" id="seo-password" class="form-control" placeholder="Admin Password">
                        </div>
                        <button id="seo-submit" class="btn btn-primary">
                            <i class="fas fa-unlock"></i> Access SEO Settings
                        </button>
                    </div>
                    
                    <div id="seo-content" class="seo-content hidden">
                        <div class="form-group">
                            <label for="seo-title">Page Title</label>
                            <input type="text" id="seo-title" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="seo-description">Meta Description</label>
                            <textarea id="seo-description" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="seo-keywords">Keywords (comma separated)</label>
                            <input type="text" id="seo-keywords" class="form-control">
                        </div>
                        <button id="seo-save" class="btn btn-primary btn-block">
                            <i class="fas fa-save"></i> Save SEO Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <footer>
            <div class="footer-content">
                <p>&copy; 2025 Secure Forum. All rights reserved.</p>
              
            </div>
        </footer>
    </div>
    
    <!-- Modal Component -->
    <div id="modal" class="modal hidden">
        <div class="modal-overlay"></div>
        <div class="modal-container">
            <div class="modal-header">
                <h3 id="modal-title">Modal Title</h3>
                <button id="modal-close" class="modal-close">&times;</button>
            </div>
            <div id="modal-content" class="modal-content">
                <!-- Modal content goes here -->
            </div>
            <div class="modal-footer">
                <button id="modal-cancel" class="btn btn-secondary">Cancel</button>
                <button id="modal-confirm" class="btn btn-primary">Confirm</button>
            </div>
        </div>
    </div>
    
    <!-- Toast Notifications -->
    <div id="toast-container" class="toast-container"></div>
    
    <!-- JavaScript Files -->
    <script src="js/three-background.js"></script>
    <script src="js/api.js"></script>
	 <script src="js/markup.js"></script>
	
    <script src="js/app.js"></script> <script src="js/recentthreads.js"></script><script src="js/theme-toggle.js"></script>
</body>
</html>
