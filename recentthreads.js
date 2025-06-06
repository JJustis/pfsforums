// recentthreads.js - Displays the most active threads in each category
const ActiveThreads = {
    // Initialize
    init() {
        console.log('ActiveThreads initializing');
        
        // Add necessary styles
        this.addStyles();
        
        // Set up MutationObserver to detect when categories are loaded
        this.setupMutationObserver();
        
        // Schedule initial loads
        this.scheduleInitialLoads();
    },
    
    // Setup MutationObserver to detect DOM changes
    setupMutationObserver() {
        // Create a new observer
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Look for category cards being added
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any categories were added
                    const categoryContainer = document.getElementById('categories-container');
                    if (categoryContainer && categoryContainer.querySelectorAll('.category-card').length > 0) {
                        // Categories added, add active threads
                        this.addActiveThreadsToCategories();
                    }
                }
            });
        });
        
        // Start observing the document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
    
    // Schedule initial loading attempts
    scheduleInitialLoads() {
        setTimeout(() => this.addActiveThreadsToCategories(), 1000);
        setTimeout(() => this.addActiveThreadsToCategories(), 3000);
    },
    
    // Add threads to all category cards
    addActiveThreadsToCategories() {
        const categoryCards = document.querySelectorAll('.category-card');
        
        if (categoryCards.length === 0) {
            return;
        }
        
        categoryCards.forEach(card => {
            // Get the category ID
            const viewButton = card.querySelector('.view-category');
            if (!viewButton) return;
            
            const categoryId = viewButton.getAttribute('data-id');
            if (!categoryId) return;
            
            // Check if active threads section already exists
            if (card.querySelector('.active-threads-container')) return;
            
            // Create container for active threads
            const threadsContainer = document.createElement('div');
            threadsContainer.className = 'active-threads-container';
            card.appendChild(threadsContainer);
            
            // Load the active threads
            this.loadActiveThreadsForCategory(categoryId, threadsContainer);
        });
    },
    
    // Load active threads for a specific category
    loadActiveThreadsForCategory(categoryId, container) {
        if (!categoryId || !container) return;
        
        // Show loading state
        container.innerHTML = `
            <div class="threads-loading">
                <i class="fas fa-spinner fa-spin"></i> Loading active threads...
            </div>
        `;
        
        // Get the auth token
        const token = localStorage.getItem('auth_token');
        if (!token) {
            container.innerHTML = `<div class="threads-error">Please login to view active threads</div>`;
            return;
        }
        
        // Fetch posts for this category
        API.getPosts(token, categoryId)
            .then(async response => {
                if (!response.success || !response.posts || response.posts.length === 0) {
                    container.innerHTML = `<div class="no-threads">No threads in this category yet</div>`;
                    return;
                }
                
                // Sort by last activity date (most recent first)
                const sortedPosts = response.posts.sort((a, b) => {
                    const dateA = new Date(a.lastActivity || a.created);
                    const dateB = new Date(b.lastActivity || b.created);
                    return dateB - dateA;
                });
                
                // Take only the top 4 most active
                const topPosts = sortedPosts.slice(0, 4);
                
                // Get all post IDs for reply count query
                const postIds = topPosts.map(post => post.id);
                
                // Get reply counts from server
                let replyCounts = {};
                try {
                    const countsResponse = await API.getReplyCountsForPosts(token, postIds);
                    if (countsResponse.success && countsResponse.counts) {
                        replyCounts = countsResponse.counts;
                    }
                } catch (error) {
                    console.error('Error fetching reply counts:', error);
                }
                
                // Clear container
                container.innerHTML = '';
                
                // Create the heading
                const heading = document.createElement('div');
                heading.className = 'active-threads-heading';
                heading.innerHTML = '<div class="threads-divider"></div><h4>Recent Threads</h4>';
                container.appendChild(heading);
                
                // Create the threads list
                const threadsList = document.createElement('div');
                threadsList.className = 'active-threads-list';
                container.appendChild(threadsList);
                
                // Add threads
                topPosts.forEach(post => {
                    // Create thread item container
                    const threadItem = document.createElement('div');
                    threadItem.className = 'thread-item';
                    
                    // Create thread info container
                    const threadInfo = document.createElement('div');
                    threadInfo.className = 'thread-info';
                    
                    // Create and set thread title
                    const threadTitle = document.createElement('div');
                    threadTitle.className = 'thread-title';
                    threadTitle.textContent = post.title;
                    
                    // Create thread metadata
                    const threadMeta = document.createElement('div');
                    threadMeta.className = 'thread-meta';
                    
                    // Format date and count data
                    const activityDate = new Date(post.lastActivity || post.created);
                    const timeAgo = this.getTimeSinceString(activityDate);
                    const replyCount = replyCounts[post.id] || 0;
                    
                    // Create activity span
                    const activitySpan = document.createElement('span');
                    activitySpan.className = 'thread-activity';
                    activitySpan.innerHTML = `<i class="fas fa-clock"></i> ${timeAgo}`;
                    
                    // Create replies span
                    const repliesSpan = document.createElement('span');
                    repliesSpan.className = 'thread-replies';
                    repliesSpan.innerHTML = `<i class="fas fa-comments"></i> ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
                    
                    // Add metadata to thread meta
                    threadMeta.appendChild(activitySpan);
                    threadMeta.appendChild(repliesSpan);
                    
                    // Assemble thread info
                    threadInfo.appendChild(threadTitle);
                    threadInfo.appendChild(threadMeta);
                    
                    // Create view button - IMPORTANT: Match the exact format of the main app's buttons
                    const viewButton = document.createElement('button');
                    viewButton.className = 'btn btn-primary view-post';
                    viewButton.setAttribute('data-id', post.id); // Set data-id attribute directly
                    viewButton.innerHTML = '<i class="fas fa-eye"></i> View';
                    
                    // Add click event to view button - Using simplified approach
                    viewButton.addEventListener('click', function(event) {
                        event.preventDefault();
                        
                        // Keep track of which post we're trying to view
                        const postId = post.id;
                        const postTitle = post.title;
                        console.log(`Viewing post: ${postTitle} (ID: ${postId})`);
                        
                        // Method 1: Try to find and click a post button in the main UI
                        const mainPostButtons = document.querySelectorAll(`.post-card .view-post[data-id="${postId}"]`);
                        if (mainPostButtons.length > 0) {
                            console.log(`Found existing button for post "${postTitle}", clicking it`);
                            mainPostButtons[0].click();
                            return;
                        }
                        
                        // Method 2: Click view category first, then the post
                        const categoryBtn = container.closest('.category-card').querySelector('.view-category');
                        if (categoryBtn) {
                            console.log(`Navigating to category first, then post "${postTitle}"`);
                            
                            // Save the post ID we want to view
                            window.sessionStorage.setItem('pendingPostView', postId);
                            
                            // Click category button to navigate to category page
                            categoryBtn.click();
                            
                            // Setup a MutationObserver to watch for when post buttons appear
                            const postsObserver = new MutationObserver((mutations, observer) => {
                                // Look for post buttons with our ID
                                const postBtn = document.querySelector(`.view-post[data-id="${postId}"]`);
                                if (postBtn) {
                                    console.log(`Post button for "${postTitle}" appeared, clicking it`);
                                    observer.disconnect(); // Stop watching
                                    postBtn.click(); // Click the button
                                    window.sessionStorage.removeItem('pendingPostView');
                                }
                            });
                            
                            // Start watching for DOM changes
                            postsObserver.observe(document.body, {
                                childList: true,
                                subtree: true
                            });
                            
                            // Safety timeout - stop watching after 3 seconds
                            setTimeout(() => {
                                postsObserver.disconnect();
                                // If we still haven't found the button, try hash navigation
                                if (window.sessionStorage.getItem('pendingPostView') === postId) {
                                    console.log(`Falling back to hash navigation for "${postTitle}"`);
                                    window.location.hash = `post/${postId}`;
                                    window.sessionStorage.removeItem('pendingPostView');
                                }
                            }, 3000);
                            
                            return;
                        }
                        
                        // Method 3: Direct hash navigation
                        console.log(`Using hash navigation for "${postTitle}"`);
                        window.location.hash = `post/${postId}`;
                    });
                    
                    // Assemble thread item
                    threadItem.appendChild(threadInfo);
                    threadItem.appendChild(viewButton);
                    
                    // Add to thread list
                    threadsList.appendChild(threadItem);
                });
            })
            .catch(error => {
                console.error('Error loading active threads:', error);
                container.innerHTML = `<div class="threads-error">Error loading threads</div>`;
            });
    },
    
    // Get a human-readable time since string
    getTimeSinceString(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}m ago`;
        
        const years = Math.floor(months / 12);
        return `${years}y ago`;
    },
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    // Add styles for active threads
    addStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            /* Active Threads Container */
            .active-threads-container {
                margin-top: 15px;
                width: 100%;
            }
            
            .threads-divider {
                height: 1px;
                background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0));
                margin: 10px 0;
            }
            
            .active-threads-heading h4 {
                font-size: 1.1rem;
                margin: 10px 0;
                color: #2980b9;
            }
            
            /* Thread List */
            .active-threads-list {
                padding: 0 10px;
            }
            
            .thread-item {
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background-color: #f9f9f9;
                border-radius: 6px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .thread-info {
                flex: 1;
                min-width: 0;
                padding-right: 10px;
            }
            
            /* Thread Title */
            .thread-title {
                font-weight: 500;
                color: #2980b9;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 4px;
            }
            
            .thread-item .btn {
                padding: 3px 8px;
                font-size: 0.8rem;
            }
            
            /* Thread Metadata */
            .thread-meta {
                display: flex;
                font-size: 0.8em;
                color: #777;
                gap: 10px;
            }
            
            .thread-activity, .thread-replies {
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }
            
            /* Status Messages */
            .no-threads {
                font-style: italic;
                color: #777;
                text-align: center;
                padding: 10px;
            }
            
            .threads-loading, .threads-error {
                text-align: center;
                padding: 10px;
                font-size: 0.9em;
                color: #666;
            }
        `;
        document.head.appendChild(styleEl);
    }
};

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if there's a pending post view from a previous navigation
    const pendingPostId = window.sessionStorage.getItem('pendingPostView');
    if (pendingPostId) {
        console.log(`Found pending post view: ${pendingPostId}`);
        // Look for the post button to click
        setTimeout(() => {
            const postBtn = document.querySelector(`.view-post[data-id="${pendingPostId}"]`);
            if (postBtn) {
                console.log(`Found pending post button, clicking it`);
                postBtn.click();
                window.sessionStorage.removeItem('pendingPostView');
            } else {
                // If button not found, try hash navigation
                console.log(`Pending post button not found, trying hash navigation`);
                window.location.hash = `post/${pendingPostId}`;
                window.sessionStorage.removeItem('pendingPostView');
            }
        }, 500);
    }
    
    // Initialize the ActiveThreads module
    ActiveThreads.init();
});