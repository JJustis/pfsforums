// forum-bot.js - Self-contained version with Ollama Integration
(function() {
    // Make ForumBot available globally
    window.ForumBot = {
        // Configuration for Ollama
        OLLAMA_BASE_URL: 'http://localhost:11434', // Your Ollama server URL
        OLLAMA_MODEL: 'phi3:3.8b', // The specific Ollama model to use

        instances: {}, // Stores state for each bot instance {id: {chatHistory: [], elementRefs: {}}}

        // Initialize all bot instances on the page
        init: function() {
            console.log('Initializing Forum Bot for Ollama');

            // Initialize Marked.js for Markdown rendering in bot responses
            if (typeof marked === 'undefined') {
                console.error("Marked.js is not loaded. Please ensure <script src='https://cdn.jsdelivr.net/npm/marked/marked.min.js'></script> is included.");
                return;
            }
            marked.setOptions({
                gfm: true,
                breaks: true,
                highlight: function(code, lang) {
                    // Basic highlighting, can be extended with a syntax highlighter
                    return code;
                }
            });

            document.querySelectorAll('.forum-bot-container').forEach(container => {
                const instanceId = container.dataset.id;
                
                // Skip if already initialized
                if (container.dataset.initialized === 'true') {
                    return;
                }

                this.instances[instanceId] = {
                    chatHistory: [
                        // System message to guide the AI's behavior
                        { role: 'system', content: 'You are a helpful, friendly, and concise AI assistant named phi3-mini. Provide direct and relevant answers to user questions, and engage in natural conversation. Avoid overly technical jargon unless specifically asked.' },
                        { role: 'assistant', content: container.querySelector('.message-content').textContent.trim() }
                    ],
                    elementRefs: {
                        container: container,
                        messagesDiv: container.querySelector('.forum-bot-messages'),
                        input: container.querySelector('textarea'),
                        sendBtn: container.querySelector('.bot-send-btn'),
                        connectionStatusSpan: container.querySelector(`#${instanceId}-connection`)
                    }
                };

                container.dataset.initialized = 'true'; // Mark as initialized

                // Event Listeners
                this.instances[instanceId].elementRefs.sendBtn.addEventListener('click', () => {
                    this.sendMessage(instanceId);
                });

                this.instances[instanceId].elementRefs.input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage(instanceId);
                    }
                });

                // Initial connection test
                this.testOllamaConnection(instanceId);
            });
        },

        // Test connection to Ollama and check for model availability
        testOllamaConnection: async function(instanceId) {
            const instance = this.instances[instanceId];
            if (!instance) return;

            const connectionStatusSpan = instance.elementRefs.connectionStatusSpan;
            connectionStatusSpan.textContent = 'Connecting...';
            connectionStatusSpan.style.color = '#ffa500'; // Orange for connecting

            try {
                // First, check if Ollama server is reachable
                const tagsResponse = await fetch(this.OLLAMA_BASE_URL + '/api/tags');
                if (!tagsResponse.ok) {
                    throw new Error(`Ollama server not responding (${tagsResponse.status}). Is Ollama running?`);
                }
                const tagsData = await tagsResponse.json();

                // Then, check if the specific model exists
                const modelExists = tagsData.models.some(model =>
                    model.name.includes(this.OLLAMA_MODEL) || model.name.includes(this.OLLAMA_MODEL.split(':')[0])
                );

                if (!modelExists) {
                    connectionStatusSpan.textContent = 'Model Missing';
                    connectionStatusSpan.style.color = '#ef4444'; // Red for missing model
                    this.addMessage(instanceId, `System: Model "${this.OLLAMA_MODEL}" not found on Ollama. Please pull it using 'ollama pull ${this.OLLAMA_MODEL}'.`, 'system');
                    return false;
                }

                connectionStatusSpan.textContent = 'Connected';
                connectionStatusSpan.style.color = '#22c55e'; // Green for connected
                this.addMessage(instanceId, `System: Connected to Ollama with model ${this.OLLAMA_MODEL}.`, 'system');
                return true;

            } catch (error) {
                connectionStatusSpan.textContent = 'Disconnected';
                connectionStatusSpan.style.color = '#ef4444'; // Red for disconnected
                let errorMessage = `System: Connection to Ollama failed: ${error.message}.`;
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    errorMessage += " Please ensure Ollama is running and accessible from your browser (check browser console for CORS errors).";
                } else if (error.message.includes('403')) {
                     errorMessage += " This might be a CORS issue. Try setting 'export OLLAMA_ORIGINS=\"*\"' and restarting Ollama.";
                }
                this.addMessage(instanceId, errorMessage, 'system error');
                return false;
            }
        },

        // Send a message to the Ollama bot
        sendMessage: async function(instanceId) {
            const instance = this.instances[instanceId];
            if (!instance) return;

            const userInput = instance.elementRefs.input;
            const userMessage = userInput.value.trim();
            if (!userMessage) return;

            this.addMessage(instanceId, userMessage, 'user');
            userInput.value = '';
            this.showStatus(instanceId, 'Bot is typing...', 'loading');

            // Add user message to chat history for context
            instance.chatHistory.push({ role: 'user', content: userMessage });

            const endpoint = '/v1/chat/completions'; // Ollama's OpenAI compatible endpoint
            const fullUrl = this.OLLAMA_BASE_URL + endpoint;

            try {
                const payload = {
                    model: this.OLLAMA_MODEL,
                    messages: instance.chatHistory,
                    stream: false // We are not using streaming for simplicity
                };

                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    let errorDetails = `HTTP error! status: ${response.status}`;
                    try {
                        const errorJson = await response.json();
                        if (errorJson && errorJson.error) {
                            errorDetails += `: ${errorJson.error}`;
                        }
                    } catch (e) { /* ignore if not JSON */ }
                    throw new Error(errorDetails);
                }

                const data = await response.json();
                let botResponseContent = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";

                // Add bot response to chat history
                instance.chatHistory.push({ role: 'assistant', content: botResponseContent });
                this.addMessage(instanceId, botResponseContent, 'bot');
                this.showStatus(instanceId, 'Ready');

            } catch (error) {
                console.error(`Error fetching bot response for ${instanceId}:`, error);
                this.addMessage(instanceId, `Oops! Something went wrong: ${error.message}`, 'system error');
                this.showStatus(instanceId, 'Error', 'error');
            }
        },

        // Add a message to the chat display
        addMessage: function(instanceId, text, senderType) {
            const instance = this.instances[instanceId];
            if (!instance) return;

            const messagesDiv = instance.elementRefs.messagesDiv;
            const messageWrapper = document.createElement('div');
            messageWrapper.classList.add('bot-message');

            const avatar = document.createElement('div');
            avatar.classList.add('bot-avatar');
            avatar.innerHTML = '<i class="fas fa-robot"></i>';

            const messageContentDiv = document.createElement('div');
            messageContentDiv.classList.add('message-content');

            if (senderType === 'user') {
                messageWrapper.classList.add('user-message');
                messageContentDiv.textContent = text; // User input is plain text
            } else if (senderType === 'system') {
                messageContentDiv.innerHTML = `<span style="color: #ffa500; font-weight: bold;">System:</span> ${this.escapeHtml(text)}`;
                messageContentDiv.style.backgroundColor = '#40444b'; // Darker background for system messages
            } else if (senderType === 'system error') {
                messageContentDiv.innerHTML = `<span style="color: #ef4444; font-weight: bold;">Error:</span> ${this.escapeHtml(text)}`;
                messageContentDiv.style.backgroundColor = '#40444b'; // Darker background for system messages
            } else {
                // Process Markdown for bot messages
                messageContentDiv.innerHTML = marked.parse(text);
            }

            if (senderType === 'user') {
                messageWrapper.appendChild(messageContentDiv);
            } else {
                messageWrapper.appendChild(avatar);
                messageWrapper.appendChild(messageContentDiv);
            }

            messagesDiv.appendChild(messageWrapper);
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
        },

        // Show status message (e.g., "Bot is typing...", "Ready", "Error")
        showStatus: function(instanceId, message, type = 'info') {
            const instance = this.instances[instanceId];
            if (!instance) return;

            const connectionStatusSpan = instance.elementRefs.connectionStatusSpan;
            connectionStatusSpan.innerHTML = ''; // Clear previous content

            const statusText = document.createElement('span');
            statusText.textContent = message;

            if (type === 'loading') {
                const loadingDots = document.createElement('div');
                loadingDots.classList.add('dot-flashing');
                connectionStatusSpan.appendChild(loadingDots);
                connectionStatusSpan.appendChild(statusText);
            } else if (type === 'error') {
                statusText.style.color = '#ef4444'; // Red
                connectionStatusSpan.appendChild(statusText);
            } else if (type === 'success') {
                statusText.style.color = '#22c55e'; // Green
                connectionStatusSpan.appendChild(statusText);
            } else { // info or default
                statusText.style.color = '#60a5fa'; // Blue
                connectionStatusSpan.appendChild(statusText);
            }
        },

        // Escape HTML to prevent XSS
        escapeHtml: function(text) {
            try {
                if (typeof text !== 'string') {
                    return '';
                }
                return text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            } catch (error) {
                console.error('Error escaping HTML:', error);
                return '';
            }
        }
    };

    // Add CSS for the bot if not already present
    function addBotStyles() {
        if (document.getElementById('forum-bot-styles')) {
            return;
        }

        const styleEl = document.createElement('style');
        styleEl.id = 'forum-bot-styles';
        styleEl.textContent = `
            /* Forum Bot Styles */
            .forum-bot-container {
                background-color: #36393f;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                margin: 15px 0;
                overflow: hidden;
                font-family: 'Inter', sans-serif;
                color: #e2e8f0;
            }

            .forum-bot-header {
                background-color: #2f3136;
                padding: 10px 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: bold;
                font-size: 1.1em;
                border-bottom: 1px solid #23272a;
            }

            .forum-bot-header i {
                color: #7289da;
                margin-right: 8px;
            }

            /* Hidden elements for simplified UI */
            .bot-type-toggle {
                display: none;
            }

            .forum-bot-messages {
                height: 250px; /* Fixed height for chat area */
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column-reverse; /* New messages at bottom */
                gap: 10px;
                background-color: #36393f;
            }

            .forum-bot-messages::-webkit-scrollbar {
                width: 8px;
            }

            .forum-bot-messages::-webkit-scrollbar-track {
                background: #23272A;
                border-radius: 10px;
            }

            .forum-bot-messages::-webkit-scrollbar-thumb {
                background: #50555c;
                border-radius: 10px;
            }

            .forum-bot-messages::-webkit-scrollbar-thumb:hover {
                background: #6a707a;
            }

            .bot-message {
                display: flex;
                align-items: flex-start;
                max-width: 85%;
                animation: fadeIn 0.3s ease-out;
            }

            .user-message {
                margin-left: auto;
                flex-direction: row-reverse; /* User message on right */
            }

            .bot-avatar {
                width: 30px;
                height: 30px;
                min-width: 30px; /* Prevent shrinking */
                min-height: 30px; /* Prevent shrinking */
                background: #5865f2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.8em;
                margin-right: 8px;
            }

            .user-message .bot-avatar {
                background: #7289da;
                margin-left: 8px;
                margin-right: 0;
            }

            .message-content {
                background-color: #40444b;
                padding: 8px 12px;
                border-radius: 12px;
                line-height: 1.4;
                word-wrap: break-word;
                overflow-wrap: break-word;
                font-size: 0.9em;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .user-message .message-content {
                background-color: #7289da;
            }

            .forum-bot-input {
                display: flex;
                padding: 10px 15px;
                border-top: 1px solid #23272a;
                background-color: #2f3136;
                align-items: center;
            }

            .forum-bot-input textarea {
                flex-grow: 1;
                border: 1px solid #40444b;
                border-radius: 5px;
                padding: 8px 10px;
                margin-right: 10px;
                resize: none;
                height: 38px; /* Fixed height for single line */
                min-height: 38px;
                max-height: 100px; /* Max height for multi-line */
                background-color: #40444b;
                color: #e2e8f0;
                font-size: 0.9em;
                overflow-y: auto;
            }

            .forum-bot-input textarea:focus {
                outline: none;
                border-color: #7289da;
                box-shadow: 0 0 0 2px rgba(114, 137, 218, 0.5);
            }

            .bot-send-btn {
                background-color: #7289da;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 15px;
                cursor: pointer;
                font-size: 0.9em;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s ease;
                height: 38px;
            }

            .bot-send-btn:hover {
                background-color: #677bc4;
            }

            .bot-send-btn i {
                margin-right: 5px;
            }

            .forum-bot-footer {
                background-color: #2f3136;
                padding: 5px 15px;
                font-size: 0.75em;
                color: #a0aec0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #23272a;
            }

            .bot-status {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 0.8em;
            }

            .dot-flashing {
                position: relative;
                width: 6px;
                height: 6px;
                border-radius: 3px;
                background-color: #7289da;
                color: #7289da;
                animation: dotFlashing 1s infinite linear alternate;
                animation-delay: .5s;
            }

            .dot-flashing::before, .dot-flashing::after {
                content: '';
                display: inline-block;
                position: absolute;
                top: 0;
            }

            .dot-flashing::before {
                left: -9px;
                width: 6px;
                height: 6px;
                border-radius: 3px;
                background-color: #7289da;
                color: #7289da;
                animation: dotFlashing 1s infinite linear alternate;
                animation-delay: 0s;
            }

            .dot-flashing::after {
                left: 9px;
                width: 6px;
                height: 6px;
                border-radius: 3px;
                background-color: #7289da;
                color: #7289da;
                animation: dotFlashing 1s infinite linear alternate;
                animation-delay: 1s;
            }

            @keyframes dotFlashing {
                0% { background-color: #7289da; }
                50%, 100% { background-color: #4b5262; }
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(styleEl);
    }

    // Add styles on load
    addBotStyles();

    // Auto-initialize after a short delay to ensure DOM is ready
    setTimeout(() => {
        window.ForumBot.init();
    }, 500);

    // Also set up a mutation observer to catch dynamically added bots
    const observer = new MutationObserver((mutations) => {
        let shouldInit = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if ((node.classList && node.classList.contains('forum-bot-container')) ||
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
