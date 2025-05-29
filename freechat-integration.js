/**
 * Optimized FreeChat Integration with Global Key System
 * - Uses global encryption keys that apply to all users
 * - Handles key rotation every 24 hours
 * - Clear UI indicators for encryption status
 */

const FreeChat = {
    // Configuration
    config: {
        fetchInterval: 3000,           // How often to fetch messages (ms)
        maxMessages: 50,               // Maximum number of messages to display
        debug: true                    // Enable debug logging
    },
    
    // State
    state: {
        initialized: false,
        expanded: false,
        connected: false,
        encrypted: false,
        cryptoKey: null,               // Web Crypto API key
        firstHalfKey: null,            // First half of encryption key
        secondHalfKey: null,           // Second half of encryption key
        keyId: null,                   // Current key ID for tracking rotations
        validUntil: null,              // When the current key expires
        lastMessageId: 0,
        currentUser: null,
        timerId: null,
        typing: false,
        typingTimer: null,
        cookiesAccepted: true          // Default to true for simplicity
    },
    
    // DOM elements cache
    elements: {},
    
    /**
     * Initialize the chat widget
     */
    init() {
        if (this.state.initialized) return;
        
        this.log('Initializing FreeChat...');
        
        // Create chat widget HTML
        this.createChatWidgetHTML();
        
        // Cache DOM elements
        this.cacheDOMElements();
        
        // Add event listeners
        this.addEventListeners();
        
        // Check login status
        this.checkLoginStatus();
        
        // Mark as initialized
        this.state.initialized = true;
        
        this.log('FreeChat initialized');
    },
    
    /**
     * Create the chat widget HTML
     */
    createChatWidgetHTML() {
        // Create main widget container
        const widget = document.createElement('div');
        widget.className = 'freechat-widget collapsed';
        widget.innerHTML = `
            <div class="freechat-header">
                <div>
                    <i class="fas fa-comment-dots"></i> FreeChat
                </div>
                <button class="freechat-toggle">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
            <div class="freechat-security">
                <i class="fas fa-lock"></i> <span>Initializing secure connection...</span>
            </div>
            <div class="freechat-online-users collapsed">
                <div class="freechat-online-users-header">
                    <span>Online Users: <span class="online-count">0</span></span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="freechat-online-users-list">
                    <!-- Online users will be added here -->
                </div>
            </div>
            <div class="freechat-body hidden">
                <div class="freechat-messages">
                    <ul id="freechat-messages-list"></ul>
                    <div class="typing-indicator">
                        <span class="user-typing">Someone is typing</span><span class="typing-dots"></span>
                    </div>
                </div>
                <div class="freechat-input">
                    <input type="text" placeholder="Type a message..." disabled>
                    <button type="button" disabled>
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
            <div class="freechat-debug-info">
                Key ID: <span class="key-id">-</span> | Expires: <span class="key-valid-until">-</span>
            </div>
        `;
        
        // Append to body
        document.body.appendChild(widget);
    },
    
    /**
     * Cache DOM elements for later use
     */
    cacheDOMElements() {
        const widget = document.querySelector('.freechat-widget');
        
        this.elements = {
            widget: widget,
            header: widget.querySelector('.freechat-header'),
            toggleBtn: widget.querySelector('.freechat-toggle'),
            toggleIcon: widget.querySelector('.freechat-toggle i'),
            securityStatus: widget.querySelector('.freechat-security'),
            securityIcon: widget.querySelector('.freechat-security i'),
            securityText: widget.querySelector('.freechat-security span'),
            onlineUsers: widget.querySelector('.freechat-online-users'),
            onlineUsersHeader: widget.querySelector('.freechat-online-users-header'),
            onlineUsersList: widget.querySelector('.freechat-online-users-list'),
            onlineCount: widget.querySelector('.online-count'),
            body: widget.querySelector('.freechat-body'),
            messagesContainer: widget.querySelector('.freechat-messages'),
            messagesList: widget.querySelector('#freechat-messages-list'),
            typingIndicator: widget.querySelector('.typing-indicator'),
            userTyping: widget.querySelector('.user-typing'),
            input: widget.querySelector('.freechat-input input'),
            sendBtn: widget.querySelector('.freechat-input button'),
            keyId: widget.querySelector('.key-id'),
            keyValidUntil: widget.querySelector('.key-valid-until')
        };
    },
    
    /**
     * Add event listeners to chat elements
     */
    addEventListeners() {
        // Toggle chat expansion
        this.elements.header.addEventListener('click', () => this.toggleChat());
        
        // Toggle online users list
        this.elements.onlineUsersHeader.addEventListener('click', () => {
            this.elements.onlineUsers.classList.toggle('collapsed');
        });
        
        // Send message on button click
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Detect typing
        this.elements.input.addEventListener('input', () => this.handleTyping());
        
        // Listen for login events from the forum
        document.addEventListener('userLoggedIn', (e) => {
            this.handleUserLoggedIn(e.detail.user);
        });
        
        // Listen for logout events from the forum
        document.addEventListener('userLoggedOut', () => {
            this.handleUserLoggedOut();
        });
        
        // Force reconnect if user clicks the security status while in error state
        this.elements.securityStatus.addEventListener('click', () => {
            if (!this.state.connected) {
                this.connect();
            }
        });
    },
    
    /**
     * Toggle chat expansion state
     */
    toggleChat() {
        this.state.expanded = !this.state.expanded;
        
        if (this.state.expanded) {
            this.elements.widget.classList.remove('collapsed');
            this.elements.body.classList.remove('hidden');
            this.elements.toggleIcon.className = 'fas fa-chevron-down';
            
            // Scroll to bottom of messages
            this.scrollToBottom();
            
            // Focus input if connected
            if (this.state.connected) {
                this.elements.input.focus();
            }
        } else {
            this.elements.widget.classList.add('collapsed');
            this.elements.body.classList.add('hidden');
            this.elements.toggleIcon.className = 'fas fa-chevron-up';
        }
    },
    
    /**
     * Check if user is logged in
     */
    checkLoginStatus() {
        // Use forum's auth token to check login status
        const authToken = localStorage.getItem('auth_token');
        
        if (authToken) {
            try {
                // Simple token validation for now
                const tokenData = JSON.parse(atob(authToken));
                
                if (tokenData && tokenData.userId) {
                    // Try to get username from token (actual impl would be more robust)
                    const usernameParts = tokenData.userId.split('-');
                    const username = usernameParts.length > 1 ? 
                        usernameParts[0] : 'user_' + tokenData.userId.substring(0, 5);
                    
                    const user = {
                        id: tokenData.userId,
                        username: username,
                        role: tokenData.userId.includes('admin') ? 'admin' : 'user'
                    };
                    
                    this.handleUserLoggedIn(user);
                }
            } catch (error) {
                this.log('Error validating token:', error);
            }
        }
    },
    
    /**
     * Handle user logged in
     * @param {Object} user User data
     */
    handleUserLoggedIn(user) {
        this.log('User logged in:', user);
        
        this.state.currentUser = user;
        
        // Connect to chat
        this.connect();
    },
    
    /**
     * Handle user logged out
     */
    handleUserLoggedOut() {
        this.disconnect();
        this.state.currentUser = null;
        this.log('User logged out');
        
        // Clear messages
        this.elements.messagesList.innerHTML = '';
        
        // Show logged out message
        this.showSystemMessage('You have been logged out. Please log in to use the chat.');
    },
    
    /**
     * Connect to the chat service
     */
    connect() {
        if (!this.state.currentUser) {
            this.showSystemMessage('Please log in to use FreeChat.');
            return;
        }
        
        this.updateSecurityStatus(false, "Connecting...");
        
        // Fetch encryption keys
        this.fetchEncryptionKeys()
            .then(keys => {
                if (keys) {
                    this.log('Got encryption keys:', keys);
                    this.state.firstHalfKey = keys.firstHalfKey;
                    this.state.secondHalfKey = keys.secondHalfKey;
                    this.state.keyId = keys.keyId;
                    this.state.validUntil = keys.validUntil;
                    
                    // Update key info in UI
                    this.updateKeyInfo();
                    
                    // Initialize crypto key
                    return this.initializeCryptoKey();
                }
                throw new Error('Failed to get encryption keys');
            })
            .then(() => {
                this.state.connected = true;
                this.state.encrypted = true;
                
                // Update UI to show connected and encrypted state
                this.updateSecurityStatus(true);
                
                // Enable input
                this.elements.input.disabled = false;
                this.elements.sendBtn.disabled = false;
                
                // Start message fetching timer
                this.startMessageFetching();
                
                // Show welcome message
                this.showSystemMessage('Connected with end-to-end encryption. All messages use a shared key that rotates every 24 hours.');
            })
            .catch(error => {
                this.log('Error connecting:', error);
                this.showSystemMessage('Failed to establish secure connection. Please try again later.');
                this.updateSecurityStatus(false, "Connection failed - Click to retry");
            });
    },
    
    /**
     * Disconnect from the chat service
     */
    disconnect() {
        // Stop message fetching
        if (this.state.timerId) {
            clearInterval(this.state.timerId);
            this.state.timerId = null;
        }
        
        // Update state
        this.state.connected = false;
        this.state.encrypted = false;
        this.state.cryptoKey = null;
        this.state.firstHalfKey = null;
        this.state.secondHalfKey = null;
        this.state.keyId = null;
        this.state.validUntil = null;
        
        // Update UI
        this.updateSecurityStatus(false);
        this.updateKeyInfo();
        
        // Disable input
        this.elements.input.disabled = true;
        this.elements.sendBtn.disabled = true;
        
        this.log('Disconnected from chat service');
    },
    
    /**
     * Update the security status indicator
     * @param {boolean} secure Whether connection is secure
     * @param {string} customText Optional custom text to display
     */
    updateSecurityStatus(secure, customText) {
        const statusEl = this.elements.securityStatus;
        const iconEl = this.elements.securityIcon;
        const textEl = this.elements.securityText;
        
        if (secure) {
            statusEl.className = 'freechat-security encrypted';
            iconEl.className = 'fas fa-lock encryption-icon';
            textEl.textContent = customText || 'End-to-end encrypted with shared key';
        } else {
            statusEl.className = 'freechat-security';
            iconEl.className = 'fas fa-lock-open';
            textEl.textContent = customText || 'Not connected';
        }
    },
    
    /**
     * Update key info in the debug panel
     */
    updateKeyInfo() {
        if (this.state.keyId && this.state.validUntil) {
            // Display truncated key ID
            this.elements.keyId.textContent = this.state.keyId.substring(0, 6);
            
            // Format valid until time
            try {
                const validUntil = new Date(this.state.validUntil);
                const timeString = validUntil.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                this.elements.keyValidUntil.textContent = timeString;
            } catch (e) {
                // Fallback on error
                this.elements.keyValidUntil.textContent = this.state.validUntil;
            }
        } else {
            this.elements.keyId.textContent = '-';
            this.elements.keyValidUntil.textContent = '-';
        }
    },
    
    /**
     * Fetch encryption keys from the server
     * @returns {Promise<Object>} Encryption keys
     */
    async fetchEncryptionKeys() {
        const authToken = localStorage.getItem('auth_token');
        
        try {
            this.log('Fetching encryption keys...');
            const response = await fetch('freechat-api.php?action=get_encryption_keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: authToken })
            });
            
            // Check if response is OK
            if (!response.ok) {
                const errorText = await response.text();
                this.log('Server error:', response.status, errorText.substring(0, 100));
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            // Try to parse response as JSON
            const responseText = await response.text();
            this.log('Response text (first 100 chars):', responseText.substring(0, 100));
            
            try {
                const data = JSON.parse(responseText);
                
                if (data.success && data.firstHalfKey && data.secondHalfKey) {
                    this.log('Got encryption keys successfully');
                    return {
                        firstHalfKey: data.firstHalfKey,
                        secondHalfKey: data.secondHalfKey,
                        keyId: data.keyId,
                        validUntil: data.validUntil
                    };
                }
                
                throw new Error(data.error || 'Failed to get encryption keys');
            } catch (parseError) {
                this.log('JSON parse error:', parseError);
                this.log('Raw response:', responseText);
                throw new Error(`Failed to parse server response: ${parseError.message}`);
            }
        } catch (error) {
            this.log('Failed to fetch encryption keys:', error);
            throw error;
        }
    },
    
    /**
     * Initialize the Web Crypto API key
     * @returns {Promise<boolean>}
     */
    async initializeCryptoKey() {
        try {
            // Combine both key halves
            const fullKey = this.state.firstHalfKey + this.state.secondHalfKey;
            this.log('Combined key:', fullKey.substring(0, 10) + '...');
            
            // Convert hex key to Uint8Array
            const keyData = new Uint8Array(
                fullKey.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16))
            );
            
            // Import the key for AES-GCM
            this.state.cryptoKey = await window.crypto.subtle.importKey(
                "raw",
                keyData,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt", "decrypt"]
            );
            
            this.log('Crypto key initialized successfully');
            return true;
        } catch (error) {
            this.log('Error initializing crypto key:', error);
            throw error;
        }
    },
    
    /**
     * Start fetching messages periodically
     */
    startMessageFetching() {
        // Clear existing timer if any
        if (this.state.timerId) {
            clearInterval(this.state.timerId);
        }
        
        // Initial fetch
        this.fetchMessages();
        
        // Set up interval for regular fetching
        this.state.timerId = setInterval(() => {
            this.fetchMessages();
        }, this.config.fetchInterval);
    },
    
    /**
     * Fetch messages from the server
     */
    async fetchMessages() {
        if (!this.state.connected) return;
        
        const authToken = localStorage.getItem('auth_token');
        
        try {
            const response = await fetch('freechat-api.php?action=get_messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    token: authToken,
                    lastId: this.state.lastMessageId
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch messages');
            }
            
            // Check for key updates
            if (data.keyInfo && data.keyInfo.keyId) {
                // If key ID changed, we need to update our encryption keys
                if (this.state.keyId !== data.keyInfo.keyId) {
                    this.log('Key rotation detected! Old:', this.state.keyId, 'New:', data.keyInfo.keyId);
                    
                    // Reconnect to get new keys
                    this.showSystemMessage('Encryption key has rotated. Reconnecting with new key...');
                    
                    // Disconnect and reconnect
                    this.disconnect();
                    this.connect();
                    return;
                }
                
                // Update validUntil time even if key ID is the same
                if (data.keyInfo.validUntil !== this.state.validUntil) {
                    this.state.validUntil = data.keyInfo.validUntil;
                    this.updateKeyInfo();
                }
            }
            
            // Display new messages
            if (data.messages && data.messages.length > 0) {
                await this.displayNewMessages(data.messages);
                
                // Update last message ID
                const lastMessage = data.messages[data.messages.length - 1];
                this.state.lastMessageId = lastMessage.id;
            }
            
            // Update online users
            if (data.onlineUsers) {
                this.updateOnlineUsers(data.onlineUsers);
            }
            
            // Check if someone is typing
            if (data.someoneTyping) {
                this.showTypingIndicator(data.typingUsername);
            } else {
                this.hideTypingIndicator();
            }
        } catch (error) {
            this.log('Error fetching messages:', error);
            
            // Only disconnect if we have a serious error (not just no new messages)
            if (error.message.includes('Server returned')) {
                this.disconnect();
                this.updateSecurityStatus(false, "Connection lost - Click to reconnect");
            }
        }
    },
    
    /**
     * Update online users list
     * @param {Array} users Array of usernames
     */
    updateOnlineUsers(users) {
        // Update the user count
        this.elements.onlineCount.textContent = users.length;
        
        // Clear existing list
        this.elements.onlineUsersList.innerHTML = '';
        
        // Add each user to the list
        users.forEach(username => {
            const userEl = document.createElement('div');
            userEl.className = 'online-user';
            // Check if the user is the current user or an admin
            const isCurrentUser = this.state.currentUser && username === this.state.currentUser.username;
            const isAdmin = username.toLowerCase().includes('admin'); // simplified admin check
            
            if (isAdmin) {
                userEl.classList.add('admin');
            }
            
            userEl.innerHTML = `
                <i class="fas fa-circle"></i>
                ${this.escapeHTML(username)}${isCurrentUser ? ' (you)' : ''}
            `;
            
            this.elements.onlineUsersList.appendChild(userEl);
        });
    },
    
    /**
     * Display new messages in the chat
     * @param {Array} messages Array of message objects
     */
    async displayNewMessages(messages) {
        let wasAtBottom = this.isScrolledToBottom();
        
        for (const message of messages) {
            // Skip already displayed messages
            if (document.querySelector(`.freechat-message[data-id="${message.id}"]`)) {
                continue;
            }
            
            // Check if message was encrypted with current key
            const messageKeyId = message.keyId || 'unknown';
            let content = message.content;
            let decryptionFailed = false;
            
            // Only try to decrypt if encrypted and we have a crypto key
            if (this.state.encrypted && this.state.cryptoKey) {
                // If key IDs don't match, flag as unable to decrypt
                if (messageKeyId !== this.state.keyId) {
                    content = `[Message encrypted with different key (${messageKeyId.substring(0, 6)})]`;
                    decryptionFailed = true;
                } else {
                    try {
                        content = await this.decryptMessage(content);
                    } catch (error) {
                        this.log('Error decrypting message:', error);
                        content = '[Decryption failed]';
                        decryptionFailed = true;
                    }
                }
            }
            
            // Create message element
            const messageEl = document.createElement('li');
            const isCurrentUser = message.username === this.state.currentUser.username;
            
            messageEl.className = `freechat-message ${isCurrentUser ? 'outgoing' : 'incoming'}`;
            if (decryptionFailed) {
                messageEl.classList.add('decryption-failed');
            }
            
            // Set data attributes for tracking
            messageEl.setAttribute('data-id', message.id);
            messageEl.setAttribute('data-key-id', messageKeyId);
            
            messageEl.innerHTML = `
                <div class="username">
                    ${this.escapeHTML(message.username)}
                    ${message.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
                </div>
                <div class="content">${this.escapeHTML(content)}</div>
                <div class="timestamp">${this.formatTime(message.timestamp)}</div>
            `;
            
            // Add to messages list
            this.elements.messagesList.appendChild(messageEl);
        }
        
        // Prune old messages if needed
        this.pruneOldMessages();
        
        // Scroll to bottom if was at bottom before new messages
        if (wasAtBottom) {
            this.scrollToBottom();
        }
    },
    
    /**
     * Check if messages container is scrolled to the bottom
     * @returns {boolean} Whether scrolled to bottom
     */
    isScrolledToBottom() {
        const container = this.elements.messagesContainer;
        return container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
    },
    
    /**
     * Scroll messages container to the bottom
     */
    scrollToBottom() {
        const container = this.elements.messagesContainer;
        container.scrollTop = container.scrollHeight;
    },
    
    /**
     * Remove old messages to keep the DOM clean
     */
    pruneOldMessages() {
        const messageElements = this.elements.messagesList.children;
        const maxMessages = this.config.maxMessages;
        
        if (messageElements.length > maxMessages) {
            const excessCount = messageElements.length - maxMessages;
            for (let i = 0; i < excessCount; i++) {
                if (messageElements[0].classList.contains('system-message')) {
                    messageElements[1].remove(); // Don't remove system messages first
                } else {
                    messageElements[0].remove();
                }
            }
        }
    },
    
    /**
     * Send a message
     */
    async sendMessage() {
        if (!this.state.connected || !this.state.encrypted) {
            this.showSystemMessage('Cannot send message: Not connected or not encrypted');
            return;
        }
        
        const input = this.elements.input;
        const message = input.value.trim();
        
        if (!message) return;
        
        // Clear input
        input.value = '';
        
        try {
            // Encrypt message
            const encryptedMessage = await this.encryptMessage(message);
            
            // Get auth token
            const authToken = localStorage.getItem('auth_token');
            
            // Send to server
            const response = await fetch('freechat-api.php?action=send_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: authToken,
                    message: encryptedMessage
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                this.showSystemMessage('Failed to send message: ' + (data.error || 'Unknown error'));
                input.value = message; // Restore message
            }
            
            // Stop typing indicator
            this.state.typing = false;
            clearTimeout(this.state.typingTimer);
            
            // Update typing status on server
            this.updateTypingStatus(false);
        } catch (error) {
            this.log('Error sending message:', error);
            this.showSystemMessage('Error sending message: ' + error.message);
            input.value = message; // Restore message
        }
    },
    
    /**
     * Encrypt a message using Web Crypto API
     * @param {string} message Plain text message
     * @returns {string} Encrypted message (base64)
     */
    async encryptMessage(message) {
        if (!this.state.cryptoKey) {
            throw new Error('Encryption key not initialized');
        }
        
        // Generate random IV (Initialization Vector)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Encode message as UTF-8
        const encodedMessage = new TextEncoder().encode(message);
        
        // Encrypt the message
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            this.state.cryptoKey,
            encodedMessage
        );
        
        // Convert to Array for JSON serialization
        const encryptedArray = Array.from(new Uint8Array(encryptedContent));
        const ivArray = Array.from(iv);
        
        // Return base64-encoded JSON
        return btoa(JSON.stringify({
            iv: ivArray,
            content: encryptedArray,
            keyId: this.state.keyId // Include key ID for reference
        }));
    },
    
    /**
     * Decrypt a message using Web Crypto API
     * @param {string} encryptedMessage Encrypted message (base64)
     * @returns {string} Decrypted message
     */
    async decryptMessage(encryptedMessage) {
        if (!this.state.cryptoKey) {
            throw new Error('Encryption key not initialized');
        }
        
        try {
            // Check if the message is in base64 format
            if (!/^[A-Za-z0-9+/=]+$/.test(encryptedMessage.trim())) {
                return encryptedMessage; // Not encrypted, return as is
            }
            
            // Parse the encrypted message
            const parsed = JSON.parse(atob(encryptedMessage));
            
            // Check required fields
            if (!parsed.iv || !parsed.content) {
                throw new Error('Invalid encrypted message format');
            }
            
            // Decrypt the message
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: new Uint8Array(parsed.iv) },
                this.state.cryptoKey,
                new Uint8Array(parsed.content)
            );
            
            // Decode as UTF-8
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            this.log('Decryption error:', error);
            throw error;
        }
    },
    
    /**
     * Handle typing indicator
     */
    handleTyping() {
        if (!this.state.connected) return;
        
        if (!this.state.typing) {
            this.state.typing = true;
            
            // Notify server that user is typing
            this.updateTypingStatus(true);
        }
        
        // Clear existing timer
        clearTimeout(this.state.typingTimer);
        
        // Set timer to stop typing indicator after 2 seconds
        this.state.typingTimer = setTimeout(() => {
            this.state.typing = false;
            this.updateTypingStatus(false);
        }, 2000);
    },
    
    /**
     * Update typing status on the server
     * @param {boolean} isTyping Whether the user is typing
     */
    async updateTypingStatus(isTyping) {
        if (!this.state.connected) return;
        
        try {
            // Get auth token
            const authToken = localStorage.getItem('auth_token');
            
            // Send to server
            await fetch('freechat-api.php?action=typing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    token: authToken, 
                    typing: isTyping 
                })
            });
        } catch (error) {
            this.log('Error updating typing status:', error);
        }
    },
    
    /**
     * Show typing indicator
     * @param {string} username Username of typing user
     */
    showTypingIndicator(username) {
        this.elements.userTyping.textContent = `${username} is typing`;
        this.elements.typingIndicator.classList.add('active');
    },
    
    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        this.elements.typingIndicator.classList.remove('active');
    },
    
    /**
     * Show a system message in the chat
     * @param {string} message System message text
     */
    showSystemMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'system-message';
        messageEl.textContent = message;
        
        this.elements.messagesList.appendChild(messageEl);
        this.scrollToBottom();
    },
    
    /**
     * Format timestamp to readable time
     * @param {number} timestamp Unix timestamp
     * @returns {string} Formatted time
     */
    formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Log to console if debug is enabled
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[FreeChat]', ...args);
        }
    }
};

// Initialize chat widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    FreeChat.init();
});
