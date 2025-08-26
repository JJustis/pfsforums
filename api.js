// API client for secure forum
const API = {
    // Base API URL
    baseUrl: 'api.php',
    
    // Check if admin exists
    async checkAdmin() {
        try {
            const response = await this.request('check_admin');
            return response;
        } catch (error) {
            console.error('API Error (checkAdmin):', error);
            throw error;
        }
    },
    
    // Register user
    async register(userData) {
        try {
            const response = await this.request('register', userData);
            return response;
        } catch (error) {
            console.error('API Error (register):', error);
            throw error;
        }
    },
    // Add this to the API object in api.js
// Get reply counts for posts
async getReplyCountsForPosts(token, postIds) {
    try {
        const response = await this.request('get_reply_counts', {
            token: token,
            postIds: postIds
        });
        return response;
    } catch (error) {
        console.error('API Error (getReplyCountsForPosts):', error);
        throw error;
    }
},
    // Login user
    async login(credentials) {
        try {
            const response = await this.request('login', credentials);
            return response;
        } catch (error) {
            console.error('API Error (login):', error);
            throw error;
        }
    },
    
    // Validate token
    async validateToken(token) {
        try {
            const response = await this.request('validate_token', { token });
            return response;
        } catch (error) {
            console.error('API Error (validateToken):', error);
            throw error;
        }
    },
    
    // Get categories
    async getCategories(token) {
        try {
            const response = await this.request('get_categories', { token });
            return response;
        } catch (error) {
            console.error('API Error (getCategories):', error);
            throw error;
        }
    },
    
    // Create category (admin only)
    async createCategory(categoryData) {
        try {
            const response = await this.request('create_category', categoryData);
            return response;
        } catch (error) {
            console.error('API Error (createCategory):', error);
            throw error;
        }
    },
    
    // Delete category (admin only)
    async deleteCategory(token, categoryId) {
        try {
            const response = await this.request('delete_category', { token, categoryId });
            return response;
        } catch (error) {
            console.error('API Error (deleteCategory):', error);
            throw error;
        }
    },
    
    // Get posts
    async getPosts(token, categoryId = null) {
        try {
            const data = { token };
            if (categoryId) {
                data.categoryId = categoryId;
            }
            
            const response = await this.request('get_posts', data);
            return response;
        } catch (error) {
            console.error('API Error (getPosts):', error);
            throw error;
        }
    },
    
    // Create post
    async createPost(postData) {
        try {
            const response = await this.request('create_post', postData);
            return response;
        } catch (error) {
            console.error('API Error (createPost):', error);
            throw error;
        }
    },
    
    // Delete post (admin only)
    async deletePost(token, postId) {
        try {
            const response = await this.request('delete_post', { token, postId });
            return response;
        } catch (error) {
            console.error('API Error (deletePost):', error);
            throw error;
        }
    },
    
    // Get single post with replies
    async getPost(postId, token) {
        try {
            const response = await this.request('get_post', { postId, token });
            return response;
        } catch (error) {
            console.error('API Error (getPost):', error);
            throw error;
        }
    },
    
    // Add reply to post
    async addReply(replyData) {
        try {
            const response = await this.request('add_reply', replyData);
            return response;
        } catch (error) {
            console.error('API Error (addReply):', error);
            throw error;
        }
    },
    
    // Delete reply (admin only)
    async deleteReply(token, replyId) {
        try {
            const response = await this.request('delete_reply', { token, replyId });
            return response;
        } catch (error) {
            console.error('API Error (deleteReply):', error);
            throw error;
        }
    },
    
    // Get SEO settings
    async getSeoSettings() {
        try {
            const response = await this.request('get_seo');
            return response;
        } catch (error) {
            console.error('API Error (getSeoSettings):', error);
            throw error;
        }
    },
    
    // Save SEO settings
    async saveSeoSettings(seoData) {
        try {
            const response = await this.request('save_seo', seoData);
            return response;
        } catch (error) {
            console.error('API Error (saveSeoSettings):', error);
            throw error;
        }
    },
    
    // Get encryption status
    async getEncryptionStatus() {
        try {
            const response = await this.request('get_encryption_status');
            return response;
        } catch (error) {
            console.error('API Error (getEncryptionStatus):', error);
            throw error;
        }
    },
    
    // Get user placard
    async getUserPlacard(username, token) {
        try {
            const response = await this.request('get_user_placard', { username, token });
            return response;
        } catch (error) {
            console.error('API Error (getUserPlacard):', error);
            throw error;
        }
    },
    
    // Update placard value
    async updatePlacardValue(token, username, field, value) {
        try {
            const response = await this.request('update_placard_value', { 
                token, 
                username, 
                field, 
                value 
            });
            return response;
        } catch (error) {
            console.error('API Error (updatePlacardValue):', error);
            throw error;
        }
    },
    
    // Get user avatar URL
    async getAvatar(username) {
        try {
            const response = await this.request('get_avatar', { username });
            return response;
        } catch (error) {
            console.error('API Error (getAvatar):', error);
            throw error;
        }
    },
 // Completely new loadUserPlacard function with no API call
// Upload avatar
async uploadAvatar(token, avatarData) {
    try {
        const response = await this.request('upload_avatar', {
            token: token,
            avatar: avatarData
        });
        return response;
    } catch (error) {
        console.error('API Error (uploadAvatar):', error);
        throw error;
    }
},
// Load and display user placard (client-side only implementation)
async loadUserPlacard(username, placardElementId) {
    try {
        // Get placard element
        const placardElement = document.getElementById(placardElementId);
        if (!placardElement) return;
        
        // Create placard data locally (no API call)
        const placard = {
            username: username,
            role: username.toLowerCase() === 'admin' ? 'admin' : 'user',
            joined: new Date().toISOString(),
            postCount: Math.floor(Math.random() * 50),
            replyCount: Math.floor(Math.random() * 100),
            lastActive: new Date().toISOString(),
            signature: '',
            avatarColor: this.getRandomColor()
        };
        
        // Create avatar with user's first letter and background color
        const firstLetter = placard.username.charAt(0).toUpperCase();
        
        // Calculate time since last activity for a user-friendly display
        const lastActiveTime = this.getTimeSince(placard.lastActive);
        
        // Generate badges based on user's activity
        const badges = this.generateUserBadges(placard);
        
        placardElement.innerHTML = `
            <div class="twitter-card-avatar" style="background-color: ${placard.avatarColor}">
                ${firstLetter}
            </div>
            <div class="twitter-card-content">
                <div class="twitter-card-name">
                    <span class="username">${this.escapeHtml(placard.username)}</span>
                    <span class="role-badge">${this.escapeHtml(placard.role)}</span>
                </div>
                <div class="twitter-card-stats">
                    <span class="stat"><strong>${placard.postCount}</strong> Posts</span>
                    <span class="stat"><strong>${placard.replyCount}</strong> Replies</span>
                </div>
                <div class="twitter-card-badges">
                    ${badges}
                </div>
                <div class="twitter-card-activity">
                    <i class="fas fa-clock"></i> Active ${lastActiveTime}
                </div>
                ${placard.signature ? `<div class="twitter-card-signature">${this.escapeHtml(placard.signature)}</div>` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error creating placard:', error);
        
        // Show fallback on error
        const placardElement = document.getElementById(placardElementId);
        if (placardElement) {
            const firstLetter = username.charAt(0).toUpperCase();
            const randomColor = this.getRandomColor();
            
            placardElement.innerHTML = `
                <div class="twitter-card-avatar" style="background-color: ${randomColor}">
                    ${firstLetter}
                </div>
                <div class="twitter-card-content">
                    <div class="twitter-card-name">
                        <span class="username">${this.escapeHtml(username)}</span>
                    </div>
                </div>
            `;
        }
    }
},   
    // Helper function for API requests
   async request(action, data = null) {
        try {
            const url = `${this.baseUrl}?action=${action}`;
            
            const options = {
                method: data ? 'POST' : 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            
            const json = await response.json();
            
            // Check for maintenance mode
            if (json.maintenanceMode || response.status === 503) {
                this.handleMaintenanceMode(json);
                throw new Error(json.message || 'System is in maintenance mode');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            if (!json.success) {
                throw new Error(json.error || 'Unknown API error');
            }
            
            return json;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    },
    
    // Handle maintenance mode
    handleMaintenanceMode(response) {
        console.log('System is in maintenance mode:', response);
        
        // Show maintenance modal
        this.showMaintenanceModal(response);
        
        // Clear user session data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Disable all form submissions and navigation
        this.disableUserInteractions();
    },
    
    // Show maintenance mode modal
    showMaintenanceModal(response) {
        // Remove any existing maintenance modal
        const existingModal = document.getElementById('maintenance-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create maintenance modal
        const modal = document.createElement('div');
        modal.id = 'maintenance-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        
        modalContent.innerHTML = `
            <i class="fas fa-tools" style="font-size: 3rem; color: #ffd700; margin-bottom: 20px;"></i>
            <h2 style="margin: 0 0 15px 0;">System Maintenance</h2>
            <p style="margin: 0 0 20px 0; line-height: 1.6;">${response.message || 'The forum is currently undergoing maintenance. Please try again in a few minutes.'}</p>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <i class="fas fa-sync-alt fa-spin" style="margin-right: 10px;"></i>
                Daily security re-encryption in progress...
            </div>
            <button id="maintenance-refresh" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.3);
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1rem;
            ">
                <i class="fas fa-refresh"></i> Refresh Page
            </button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add refresh button functionality
        document.getElementById('maintenance-refresh').onclick = () => {
            window.location.reload();
        };
    },
    
    // Disable user interactions during maintenance
    disableUserInteractions() {
        // Disable all forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.style.pointerEvents = 'none';
            form.style.opacity = '0.5';
        });
        
        // Disable navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.style.pointerEvents = 'none';
            link.style.opacity = '0.5';
        });
    }
};