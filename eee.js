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
                    // IMPORTANT: Create buttons programmatically instead of using innerHTML
                    // This ensures proper binding of post IDs to event handlers
                    
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
                    
                    // Create view button
                    const viewButton = document.createElement('button');
                    viewButton.className = 'btn btn-primary view-post';
                    viewButton.dataset.id = post.id; // Set data-id attribute directly
                    viewButton.innerHTML = '<i class="fas fa-eye"></i> View';
                    
                    // CRITICAL: Store the post ID in a closure to ensure it's correctly captured
                    const currentPostId = post.id;
                    
                    // Add click event to view button - INLINE THE ACTION INSTEAD OF CALLING ANOTHER FUNCTION
                    viewButton.addEventListener('click', function(event) {
                        event.preventDefault();
                        console.log('Viewing post with ID:', currentPostId);
                        
                        // APPROACH 1: Find the post in the actual post list if it exists and click its view button
                        const postsList = document.querySelector('.posts-container');
                        if (postsList) {
                            // Look for existing posts that match our ID
                            const existingPosts = postsList.querySelectorAll(`.post-card[data-id="${currentPostId}"]`);
                            if (existingPosts.length > 0) {
                                console.log('Found existing post card, clicking it');
                                const postViewButton = existingPosts[0].querySelector('.view-post');
                                if (postViewButton) {
                                    postViewButton.click();
                                    return;
                                }
                            }
                        }
                        
                        // APPROACH 2: Try to trigger the App's post viewing mechanism
                        if (window.App && typeof window.App.viewPost === 'function') {
                            try {
                                window.App.viewPost(currentPostId);
                                return;
                            } catch (error) {
                                console.error('Error calling App.viewPost:', error);
                                // Continue to other approaches
                            }
                        }
                        
                        // APPROACH 3: Navigate using hash URL pattern that the app might be watching
                        try {
                            window.location.hash = `post/${currentPostId}`;
                            // Wait a moment to see if the app responds to the hash change
                            setTimeout(() => {
                                // If we're still on the same page after hash change, try manual navigation
                                if (!document.getElementById('page-post') || document.getElementById('page-post').classList.contains('hidden')) {
                                    manualPostNavigation();
                                }
                            }, 100);
                            return;
                        } catch (error) {
                            console.error('Error with hash navigation:', error);
                            manualPostNavigation();
                        }
                        
                        // APPROACH 4: Last resort - manually show the post page and try to load the post
                        function manualPostNavigation() {
                            console.log('Attempting manual post navigation');
                            // Hide all pages
                            document.querySelectorAll('.page').forEach(page => {
                                page.classList.add('hidden');
                            });
                            
                            // Show the post page
                            const postPage = document.getElementById('page-post');
                            if (postPage) {
                                postPage.classList.remove('hidden');
                                
                                // Try to set the back button to return to this category
                                const backButton = document.getElementById('back-to-category-btn');
                                if (backButton) {
                                    const categoryId = container.closest('.category-card')?.querySelector('.view-category')?.dataset.id;
                                    if (categoryId) {
                                        backButton.dataset.id = categoryId;
                                    }
                                }
                                
                                // Look for the post in our response data
                                const matchingPost = topPosts.find(p => p.id === currentPostId);
                                if (matchingPost) {
                                    // Update basic post display with what we know
                                    const titleDisplay = document.getElementById('post-title-display');
                                    if (titleDisplay) titleDisplay.textContent = matchingPost.title;
                                    
                                    // Try to trigger the post-specific page loading code in the main app
                                    // by dispatching a custom event
                                    try {
                                        const loadPostEvent = new CustomEvent('loadPost', {
                                            detail: { postId: currentPostId },
                                            bubbles: true
                                        });
                                        document.dispatchEvent(loadPostEvent);
                                    } catch (e) {
                                        console.error('Error dispatching loadPost event', e);
                                    }
                                }
                            }
                        }
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
    // Initialize the ActiveThreads module
    ActiveThreads.init();
});