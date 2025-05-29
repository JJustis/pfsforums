// forum-bot-inline.js - Self-contained version that auto-initializes
(function() {
    // Make ForumBot available globally
    window.ForumBot = {
        // Configuration
        serverConfig: {
            codeBot: {
                url: 'http://jcmc.serveminecraft.net:8044/talk',
                port: 8044, 
                status: 'unknown'
            },
            chatBot: {
                url: 'http://jcmc.serveminecraft.net:8043/talk', 
                port: 8043,
                status: 'unknown'
            },
            timeout: 10000
        },
        
        // Rest of the ForumBot code here...
        
        // Initialize method
        init() {
            console.log('Auto-initializing Forum Bot');
            // Find and initialize all bot containers
            document.querySelectorAll('.forum-bot-container').forEach(container => {
                this.initializeBot(container);
            });
        }
    };
    
    // Auto-initialize after a short delay to ensure DOM is ready
    setTimeout(() => {
        window.ForumBot.init();
    }, 500);
    
    // Also set up a mutation observer to catch dynamically added bots
    const observer = new MutationObserver(mutations => {
        let shouldInit = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('forum-bot-container') || 
                            node.querySelector('.forum-bot-container')) {
                            shouldInit = true;
                        }
                    }
                });
            }
        }
        
        if (shouldInit && window.ForumBot) {
            window.ForumBot.init();
        }
    });
    
    // Start observing the document body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();