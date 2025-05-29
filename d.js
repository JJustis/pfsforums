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
                    const threadItem = document.createElement('div');
                    threadItem.className = 'thread-item';
                    
                    const activityDate = new Date(post.lastActivity || post.created);
                    const timeAgo = this.getTimeSinceString(activityDate);
                    const replyCount = replyCounts[post.id] || 0;
                    
                    threadItem.innerHTML = `
                        <div class="thread-info">
                            <div class="thread-title">${this.escapeHtml(post.title)}</div>
                            <div class="thread-meta">
                                <span class="thread-activity"><i class="fas fa-clock"></i> ${timeAgo}</span>
                                <span class="thread-replies"><i class="fas fa-comments"></i> ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</span>
                            </div>
                        </div>
                        <button class="btn btn-primary view-post" data-id="${post.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    `;
                    
                    // Add event listener to view button using a direct navigation approach
                    const viewButton = threadItem.querySelector('.view-post');
                    viewButton.addEventListener('click', (event) => {
                        event.preventDefault();
                        const postId = viewButton.getAttribute('data-id');
                        this.navigateToPost(postId);
                    });
                    
                    threadsList.appendChild(threadItem);
                });
            })
            .catch(error => {
                console.error('Error loading active threads:', error);
                container.innerHTML = `<div class="threads-error">Error loading threads</div>`;
            });
    },
    
    // Navigate to a post using a custom event or direct method call
    navigateToPost(postId) {
        if (!postId) return;
        
        console.log('Navigating to post:', postId);
        
        // Try multiple approaches to ensure compatibility
        
        // Approach 1: Use custom event (doesn't require direct App object reference)
        const viewPostEvent = new CustomEvent('viewPost', {
            detail: { postId: postId },
            bubbles: true
        });
        document.dispatchEvent(viewPostEvent);
        
        // Approach 2: Try to call viewPost method on App if it exists
        if (typeof window.App !== 'undefined' && typeof window.App.viewPost === 'function') {
            try {
                window.App.viewPost(postId);
            } catch (error) {
                console.error('Error calling App.viewPost:', error);
            }
        }
        
        // Approach 3: Directly change page and trigger post loading (fallback)
        try {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.add('hidden');
            });
            
            // Show the post page
            const postPage = document.getElementById('page-post');
            if (postPage) {
                postPage.classList.remove('hidden');
                
                // Handle loading post data
                // This mimics what would likely happen in App.viewPost
                if (typeof API !== 'undefined' && typeof API.getPost === 'function') {
                    const token = localStorage.getItem('auth_token');
                    if (token) {
                        API.getPost(token, postId)
                            .then(response => {
                                if (response.success && response.post) {
                                    // Update post display elements
                                    const titleDisplay = document.getElementById('post-title-display');
                                    if (titleDisplay) titleDisplay.textContent = response.post.title;
                                    
                                    const contentDisplay = document.getElementById('post-content-display');
                                    if (contentDisplay) contentDisplay.innerHTML = response.post.content;
                                }
                            })
                            .catch(error => console.error('Error loading post:', error));
                    }
                }
            }
        } catch (error) {
            console.error('Error with direct navigation approach:', error);
        }
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
    // Register the custom event listener for viewPost
    document.addEventListener('viewPost', (event) => {
        console.log('viewPost event triggered with postId:', event.detail.postId);
        
        // Check if App object exists and has viewPost method
        if (typeof window.App !== 'undefined' && typeof window.App.viewPost === 'function') {
            window.App.viewPost(event.detail.postId);
        }
    });
    
    // Initialize the ActiveThreads module
    ActiveThreads.init();
});