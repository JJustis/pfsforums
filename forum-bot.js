// Enhanced forum-bot.js with Pretrained NLP Model Integration
(function() {
    // Make ForumBot available globally
    window.ForumBot = {
        // Configuration
        serverConfig: {
            codeBot: {
                url: 'https://jcmc.serveminecraft.net:8044/talk',
                port: 8044, 
                status: 'unknown',
                forceHttp: false
            },
            chatBot: {
                url: 'https://jcmc.serveminecraft.net:8043/talk',
                port: 8043,
                status: 'unknown',
                forceHttp: false
            },
            // Enhanced NLP with downloadable model
            nlpEngine: {
                status: 'unknown',
                enabled: true,
                initialized: false,
                model: null,
                tokenizer: null,
                modelConfig: {
                    // Default model configuration
                    modelUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/distilgpt2/',
                    vocabUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/distilgpt2/vocab.json',
                    mergesUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/distilgpt2/merges.txt',
                    configUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/distilgpt2/config.json',
                    // Alternative models can be specified here
                    alternateModels: [
                        {
                            name: 'gpt2-small',
                            modelUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/gpt2/',
                            vocabUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/gpt2/vocab.json',
                            mergesUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/gpt2/merges.txt',
                            configUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/models/gpt2/config.json'
                        },
                        {
                            name: 'dialogpt-small',
                            modelUrl: 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/pytorch_model.bin',
                            vocabUrl: 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/vocab.json',
                            mergesUrl: 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/merges.txt',
                            configUrl: 'https://huggingface.co/microsoft/DialoGPT-small/resolve/main/config.json'
                        }
                    ]
                },
                contextSystem: null,
                responseGenerator: null
            },
            timeout: 100000,
            // Fallback mode when servers are offline
            fallbackMode: {
                enabled: true,
                responses: {
                    code: [
                        "I'm sorry, the code assistant server is currently offline. Please try again later.",
                        "It looks like I can't connect to the code server right now. You can still use basic forum features.",
                        "Code assistant is unavailable. Please check back soon when the service is restored."
                    ],
                    chat: [
                        "I'm currently in offline mode and can't process your message. The chat server appears to be down.",
                        "Sorry, I'm unable to connect to the chat server at the moment. Please try again later.",
                        "Chat service is currently unavailable. The server may be undergoing maintenance."
                    ],
                    auto: [
                        "I apologize, but both the chat and code servers are currently offline. Please try again later.",
                        "Unable to connect to the backend servers. The forum bot is currently in offline mode.",
                        "Service temporarily unavailable. Please try again later when the servers are back online."
                    ]
                }
            }
        },
        
        // Initialize all bot instances on the page
        init: function() {
            console.log('Auto-initializing Forum Bot');
            
            // Find all bot containers
            const botContainers = document.querySelectorAll('.forum-bot-container');
            console.log('Found', botContainers.length, 'bot containers');
            
            // Initialize NLP engine with pretrained model
            this.initializeNLPEngine()
                .then(() => {
                    console.log('NLP engine initialized successfully');
                    this.serverConfig.nlpEngine.status = 'online';
                    this.serverConfig.nlpEngine.initialized = true;
                })
                .catch(error => {
                    console.error('Error initializing NLP engine:', error);
                    this.serverConfig.nlpEngine.status = 'offline';
                })
                .finally(() => {
                    // Check server status
                    this.checkServerStatus()
                        .then(() => {
                            // Initialize each bot after checking server status
                            botContainers.forEach((container) => {
                                this.initializeBot(container);
                            });
                            
                            console.log('All bots initialized after server status check');
                        })
                        .catch((error) => {
                            console.warn('Server status check failed:', error);
                            console.log('Initializing bots in offline mode');
                            
                            // Initialize bots anyway, status will show as offline
                            botContainers.forEach((container) => {
                                this.initializeBot(container);
                            });
                        });
                });
            
            console.log('Forum Bot initialization complete');
            
            // Set up periodic server status checks
            setInterval(() => this.checkServerStatus(), 60000); // Check every minute
        },
        
        // Initialize NLP Engine with pretrained model
        initializeNLPEngine: function() {
            return new Promise((resolve, reject) => {
                // Check if we already have the minimal TensorFlow.js needed
                if (window.tf) {
                    console.log('TensorFlow.js already loaded');
                    // Don't check for transformers here, setupNLPEngine will handle it
                    this.setupNLPEngine()
                        .then(resolve)
                        .catch(error => {
                            console.warn('Failed to setup NLP engine with transformers, using fallback:', error);
                            this.setupFallbackNLPEngine()
                                .then(resolve)
                                .catch(reject);
                        });
                    return;
                }
                
                console.log('Loading NLP dependencies...');
                
                // Try to load TensorFlow.js first (more critical)
                const tfScript = document.createElement('script');
                tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js';
                tfScript.async = true;
                
                tfScript.onload = () => {
                    console.log('TensorFlow.js loaded successfully');
                    
                    // Now try to load transformers.js
                    const transformersScript = document.createElement('script');
                    transformersScript.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js';
                    transformersScript.async = true;
                    
                    transformersScript.onload = () => {
                        console.log('Transformers.js loaded successfully');
                        // Slightly longer delay to ensure library is fully initialized
                        setTimeout(() => {
                            this.setupNLPEngine()
                                .then(resolve)
                                .catch(error => {
                                    console.warn('Failed to setup NLP engine with transformers, using fallback:', error);
                                    this.setupFallbackNLPEngine()
                                        .then(resolve)
                                        .catch(reject);
                                });
                        }, 1000);
                    };
                    
                    transformersScript.onerror = () => {
                        console.error('Failed to load Transformers.js');
                        // If transformers fails to load, use fallback
                        this.setupFallbackNLPEngine()
                            .then(resolve)
                            .catch(reject);
                    };
                    
                    document.head.appendChild(transformersScript);
                };
                
                tfScript.onerror = () => {
                    console.error('Failed to load TensorFlow.js');
                    // If even TensorFlow fails, use the most basic fallback
                    this.setupFallbackNLPEngine()
                        .then(resolve)
                        .catch(reject);
                };
                
                document.head.appendChild(tfScript);
            });
        },
        
        // Setup the NLP engine with a pretrained model
        setupNLPEngine: async function() {
            try {
                console.log('Setting up NLP engine with pretrained model...');
                
                // Check for pipeline in the proper namespace - Xenova/transformers uses different global naming
                const pipelineExists = typeof window.pipeline === 'function' || 
                                      (window.transformers && typeof window.transformers.pipeline === 'function') ||
                                      (window.Xenova && window.Xenova.transformers && 
                                       typeof window.Xenova.transformers.pipeline === 'function');
                
                if (!pipelineExists) {
                    console.warn('Transformers.js pipeline not found in expected global objects');
                    console.log('Checking available globals that might contain transformers:', 
                               Object.keys(window).filter(key => 
                                   typeof window[key] === 'object' && window[key] !== null
                               ));
                    throw new Error('Transformers.js library not properly initialized');
                }
                
                // Create context management system
                const contextSystem = {
                    conversationHistory: [],
                    maxHistoryLength: 10,
                    
                    // Add message to conversation history
                    addMessage: function(role, content) {
                        this.conversationHistory.push({
                            role: role, // 'user' or 'assistant'
                            content: content,
                            timestamp: Date.now()
                        });
                        
                        // Trim history if it gets too long
                        if (this.conversationHistory.length > this.maxHistoryLength) {
                            this.conversationHistory.shift();
                        }
                    },
                    
                    // Get formatted conversation context for the model
                    getFormattedContext: function() {
                        return this.conversationHistory.map(msg => 
                            `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
                        ).join('\n');
                    },
                    
                    // Clear conversation history
                    clearHistory: function() {
                        this.conversationHistory = [];
                    }
                };
                
                // Initialize model and tokenizer
                let pipeline = null;
                
                // Try to load the model using transformers.js - checking all possible global locations
                let transformersPipeline = null;
                if (typeof window.pipeline === 'function') {
                    transformersPipeline = window.pipeline;
                } else if (window.transformers && typeof window.transformers.pipeline === 'function') {
                    transformersPipeline = window.transformers.pipeline;
                } else if (window.Xenova && window.Xenova.transformers && 
                           typeof window.Xenova.transformers.pipeline === 'function') {
                    transformersPipeline = window.Xenova.transformers.pipeline;
                }
                
                if (transformersPipeline) {
                    try {
                        console.log('Loading pretrained NLP model...');
                        
                        // Use the pipeline API
                        pipeline = await transformersPipeline(
                            'text-generation',
                            'Xenova/distilgpt2'
                        );
                        
                        console.log('Pretrained model loaded successfully!');
                    } catch (modelError) {
                        console.error('Error loading model via pipeline:', modelError);
                        throw modelError;
                    }
                } else {
                    throw new Error('Transformers.js pipeline function not found');
                }
                
                // Create response generator
                const responseGenerator = {
                    // Generate response using the pretrained model
                    generateResponse: async function(input) {
                        // Add user input to context
                        contextSystem.addMessage('user', input);
                        
                        try {
                            const context = contextSystem.getFormattedContext();
                            let generatedText = "";
                            
                            // Generate response using pipeline
                            if (pipeline) {
                                const result = await pipeline(context + '\nAssistant:', {
                                    max_new_tokens: 100,
                                    temperature: 0.7,
                                    top_p: 0.9,
                                    do_sample: true,
                                    pad_token_id: 50256 // EOS token for GPT-2
                                });
                                
                                generatedText = result[0].generated_text;
                            } else {
                                throw new Error('No model available for generation');
                            }
                            
                            // Extract assistant's response from generated text
                            const assistantPrefix = 'Assistant:';
                            const assistantIndex = generatedText.lastIndexOf(assistantPrefix);
                            
                            if (assistantIndex !== -1) {
                                generatedText = generatedText.substring(assistantIndex + assistantPrefix.length).trim();
                                
                                // Remove any follow-up "Human:" part if present
                                const nextHumanIndex = generatedText.indexOf('Human:');
                                if (nextHumanIndex !== -1) {
                                    generatedText = generatedText.substring(0, nextHumanIndex).trim();
                                }
                                
                                // If we got a valid response, add it to history
                                if (generatedText && generatedText.length > 0) {
                                    contextSystem.addMessage('assistant', generatedText);
                                    return generatedText;
                                }
                            }
                            
                            // Fallback for when extraction fails
                            throw new Error('Failed to extract response from generated text');
                        } catch (error) {
                            console.error('Error generating response:', error);
                            
                            // Use fallback response generation
                            return this.generateFallbackResponse(input);
                        }
                    },
                    
                    // Generate fallback response when model fails
                    generateFallbackResponse: function(input) {
                        // Simple fallback responses
                        const responses = [
                            "I understand your message about " + (input.split(' ').slice(-3).join(' ')) + ". Can you tell me more?",
                            "That's an interesting point. Could you elaborate further?",
                            "I'm processing what you said about " + (input.split(' ').slice(0, 3).join(' ')) + ". What else would you like to discuss?",
                            "I see what you mean. How can I assist you further with this topic?",
                            "Thanks for sharing that. Is there anything specific you'd like to know or discuss?"
                        ];
                        
                        const response = responses[Math.floor(Math.random() * responses.length)];
                        contextSystem.addMessage('assistant', response);
                        return response;
                    },
                    
                    // Apply post-processing to improve response quality
                    enhanceResponse: function(input, response) {
                        // Ensure response isn't too short
                        if (response.length < 10) {
                            const enhancements = [
                                "Let me elaborate on that. ",
                                "To explain further, ",
                                "In other words, "
                            ];
                            response = enhancements[Math.floor(Math.random() * enhancements.length)] + response;
                        }
                        
                        // Check if response actually addresses the input
                        const isQuestion = input.includes('?');
                        if (isQuestion && !response.includes('?') && !response.toLowerCase().includes('yes') && 
                            !response.toLowerCase().includes('no') && response.length < 50) {
                            response += " Does that answer your question? If not, I can provide more details.";
                        }
                        
                        // Ensure coherent ending
                        if (response.endsWith(',') || response.endsWith(';')) {
                            response = response.slice(0, -1) + '.';
                        }
                        
                        return response;
                    }
                };
                
                // Store components in config
                this.serverConfig.nlpEngine.pipeline = pipeline;
                this.serverConfig.nlpEngine.contextSystem = contextSystem;
                this.serverConfig.nlpEngine.responseGenerator = responseGenerator;
                
                console.log('NLP engine setup complete');
                
                // Return success
                return Promise.resolve();
            } catch (error) {
                console.error('Error setting up NLP engine:', error);
                return Promise.reject(error);
            }
        },
        
        // Setup a fallback NLP engine when transformers.js fails
        setupFallbackNLPEngine: async function() {
            try {
                console.log('Setting up fallback NLP engine...');
                
                // Create a simple context system
                const contextSystem = {
                    conversationHistory: [],
                    maxHistoryLength: 10,
                    
                    // Add message to conversation history
                    addMessage: function(role, content) {
                        this.conversationHistory.push({
                            role: role, 
                            content: content,
                            timestamp: Date.now()
                        });
                        
                        if (this.conversationHistory.length > this.maxHistoryLength) {
                            this.conversationHistory.shift();
                        }
                    },
                    
                    getFormattedContext: function() {
                        return this.conversationHistory.map(msg => 
                            `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
                        ).join('\n');
                    },
                    
                    clearHistory: function() {
                        this.conversationHistory = [];
                    }
                };
                
                // Create a simple pattern-based response generator
                const responseGenerator = {
                    // Pre-defined patterns and responses
                    patterns: [
                        { regex: /hello|hi|hey/i, responses: ["Hello! How can I help you today?", "Hi there! What can I do for you?", "Hey! How can I assist you?"] },
                        { regex: /how are you/i, responses: ["I'm doing well, thank you for asking! How about you?", "I'm fine, thanks! How can I help you today?"] },
                        { regex: /thank|thanks/i, responses: ["You're welcome!", "Happy to help!", "My pleasure!"] },
                        { regex: /bye|goodbye/i, responses: ["Goodbye! Feel free to return if you have more questions.", "See you later!", "Take care!"] },
                        { regex: /help/i, responses: ["I'd be happy to help. What do you need assistance with?", "How can I assist you today?"] },
                        { regex: /\?$/i, responses: ["That's a good question. Let me think about that.", "Interesting question. Based on my understanding...", "I'll do my best to answer that."] },
                        { regex: /code|programming|javascript|python|html|css/i, responses: ["Are you working on a coding project? I can try to help with that.", "Programming can be challenging! What specific aspect are you working on?"] },
                        { regex: /error|bug|issue|problem/i, responses: ["Sorry to hear you're experiencing issues. Can you provide more details?", "Let's troubleshoot this together. What exactly is happening?"] }
                    ],
                    
                    // Generate response based on patterns
                    generateResponse: async function(input) {
                        contextSystem.addMessage('user', input);
                        
                        // First, try to match a pattern
                        for (const pattern of this.patterns) {
                            if (pattern.regex.test(input)) {
                                const responses = pattern.responses;
                                const response = responses[Math.floor(Math.random() * responses.length)];
                                contextSystem.addMessage('assistant', response);
                                return response;
                            }
                        }
                        
                        // If no pattern matches, use contextual fallback
                        return this.generateContextualResponse(input);
                    },
                    
                    // Generate a contextual response based on input
                    generateContextualResponse: function(input) {
                        // Extract keywords (simple implementation)
                        const keywords = input
                            .toLowerCase()
                            .replace(/[^\w\s]/g, '')
                            .split(/\s+/)
                            .filter(word => word.length > 3);
                        
                        // Generate response based on keywords
                        let response;
                        
                        if (keywords.length > 0) {
                            // Pick a random keyword from the input
                            const keyword = keywords[Math.floor(Math.random() * keywords.length)];
                            
                            const templates = [
                                `I see you're interested in ${keyword}. Can you tell me more about what you'd like to know?`,
                                `${keyword} is an interesting topic. What specific aspects are you curious about?`,
                                `Regarding ${keyword}, could you provide more details about your question?`,
                                `I'd be happy to discuss ${keyword} further. What would you like to know?`
                            ];
                            
                            response = templates[Math.floor(Math.random() * templates.length)];
                        } else {
                            // Generic responses if no keywords found
                            const genericResponses = [
                                "Could you please provide more details about your question?",
                                "I'm not sure I fully understood. Could you elaborate?",
                                "That's interesting. Can you tell me more?",
                                "I'd like to help you better. Can you give me more information?"
                            ];
                            
                            response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
                        }
                        
                        contextSystem.addMessage('assistant', response);
                        return response;
                    },
                    
                    // Apply enhancements to responses
                    enhanceResponse: function(input, response) {
                        // Add personalization based on context
                        if (contextSystem.conversationHistory.length > 2) {
                            // Check if this is a follow-up question
                            const prevUserMessage = contextSystem.conversationHistory
                                .filter(msg => msg.role === 'user')
                                .slice(-2, -1)[0];
                            
                            if (prevUserMessage && input.length < 20) {
                                response = `Continuing our discussion about ${prevUserMessage.content.split(' ').slice(0, 3).join(' ')}... ${response}`;
                            }
                        }
                        
                        return response;
                    }
                };
                
                // Store components in config
                this.serverConfig.nlpEngine.pipeline = null; // No transformer pipeline in fallback
                this.serverConfig.nlpEngine.contextSystem = contextSystem;
                this.serverConfig.nlpEngine.responseGenerator = responseGenerator;
                
                console.log('Fallback NLP engine setup complete');
                
                // Return success
                return Promise.resolve();
            } catch (error) {
                console.error('Error setting up fallback NLP engine:', error);
                return Promise.reject(error);
            }
        },
        
        // Check if both Python servers are online
        checkServerStatus: function() {
            console.log('Checking Python server status...');
            console.log('Code bot URL:', this.serverConfig.codeBot.url);
            console.log('Chat bot URL:', this.serverConfig.chatBot.url);
            
            return new Promise((resolve, reject) => {
                Promise.allSettled([
                    this.checkServerConnection(this.serverConfig.codeBot),
                    this.checkServerConnection(this.serverConfig.chatBot)
                ])
                .then((results) => {
                    // Log the results of each server check
                    results.forEach((result, index) => {
                        const serverType = index === 0 ? 'Code bot' : 'Chat bot';
                        if (result.status === 'fulfilled') {
                            console.log(`${serverType} server is ${result.value ? 'online' : 'offline'}`);
                        } else {
                            console.warn(`${serverType} server check failed:`, result.reason);
                        }
                    });
                    
                    // Update all bot status indicators
                    document.querySelectorAll('.forum-bot-container').forEach((container) => {
                        this.updateBotStatusIndicator(container);
                    });
                    
                    // Consider success if at least one server is online or NLP engine is enabled
                    const anyServerOnline = results.some(r => r.status === 'fulfilled' && r.value);
                    const nlpEngineOnline = this.serverConfig.nlpEngine.status === 'online';
                    
                    if (anyServerOnline || nlpEngineOnline) {
                        resolve(true);
                    } else {
                        reject(new Error('All servers are offline and NLP engine is not available'));
                    }
                })
                .catch((error) => {
                    console.error('Server status check failed:', error);
                    reject(error);
                });
            });
        },
        
        // Check connection to a specific server with better error handling
        checkServerConnection: function(server) {
            return new Promise((resolve, reject) => {
                try {
                    // Build URL ensuring http:// protocol
                    let serverUrl = server.url;
                    if (server.forceHttp && serverUrl.startsWith('https://')) {
                        serverUrl = serverUrl.replace('https://', 'http://');
                    }
                    
                    // Add a simple parameter to avoid caching
                    const url = `${serverUrl}?ack=ping&t=${Date.now()}`;
                    console.log(`Checking server connection: ${url}`);
                    
                    // Use fetch with timeout instead of XHR
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
                    
                    fetch(url, {
                        method: 'GET',
                        mode: 'cors', // Try with CORS mode first
                        cache: 'no-cache',
                        signal: controller.signal
                    })
                    .then(response => {
                        clearTimeout(timeoutId);
                        if (response.ok) {
                            console.log(`Server at ${server.port} is online!`);
                            server.status = 'online';
                            resolve(true);
                        } else {
                            console.warn(`Server at ${server.port} returned status ${response.status}`);
                            server.status = 'offline';
                            resolve(false);
                        }
                    })
                    .catch(error => {
                        clearTimeout(timeoutId);
                        console.warn(`Fetch error for ${server.port}:`, error.message);
                        
                        // If CORS failed, try with no-cors mode
                        if (error.message.includes('CORS') || error.message.includes('network')) {
                            console.log(`Retrying with no-cors mode for ${server.port}`);
                            this.checkServerWithNoCors(server).then(resolve).catch(reject);
                        } else {
                            server.status = 'offline';
                            resolve(false);
                        }
                    });
                } catch (error) {
                    console.error(`Error in checkServerConnection for ${server.port}:`, error);
                    server.status = 'offline';
                    resolve(false);
                }
            });
        },
        
        // Fallback method using no-cors mode and image trick
        checkServerWithNoCors: function(server) {
            return new Promise((resolve, reject) => {
                try {
                    let serverUrl = server.url;
                    if (server.forceHttp && serverUrl.startsWith('https://')) {
                        serverUrl = serverUrl.replace('https://', 'http://');
                    }
                    
                    const baseUrl = serverUrl.split('/talk')[0];
                    const timestamp = Date.now();
                    
                    console.log(`Trying no-cors image trick with ${baseUrl}`);
                    
                    // Create a test image
                    const img = new Image();
                    
                    // Set a timeout for the image load
                    const timeoutId = setTimeout(() => {
                        console.log(`Image load timeout for ${server.port}`);
                        img.onload = img.onerror = null;
                        server.status = 'offline';
                        resolve(false);
                    }, 3000);
                    
                    img.onload = function() {
                        clearTimeout(timeoutId);
                        console.log(`Server at ${server.port} responded to image!`);
                        server.status = 'online';
                        resolve(true);
                    };
                    
                    img.onerror = function() {
                        clearTimeout(timeoutId);
                        // Even an error means the server responded!
                        console.log(`Server at ${server.port} responded with error to image!`);
                        server.status = 'online';
                        resolve(true);
                    };
                    
                    // Attempt to load a favicon or any small image from the server
                    img.src = `${baseUrl}/favicon.ico?t=${timestamp}`;
                } catch (error) {
                    console.error(`Error in checkServerWithNoCors for ${server.port}:`, error);
                    server.status = 'offline';
                    resolve(false);
                }
            });
        },
        
        // Initialize a single bot container
        initializeBot: function(container) {
            try {
                const botId = container.dataset.id;
                const botName = container.dataset.name;
                const botType = container.dataset.type || 'auto';
                
                // Skip if already initialized
                if (container.dataset.initialized === 'true') {
                    return;
                }
                
                // Mark as initialized
                container.dataset.initialized = 'true';
                
                // Get elements
                const messagesContainer = document.getElementById(`${botId}-messages`);
                const inputField = document.getElementById(`${botId}-input`);
                const sendButton = container.querySelector('.bot-send-btn');
                const statusElement = document.getElementById(`${botId}-connection`);
                const statusDisplay = document.getElementById(`${botId}-status`) || document.createElement('div');
                
                if (!messagesContainer || !inputField || !sendButton) {
                    console.error(`Missing required elements for bot ${botId}`);
                    return;
                }
                
                // Set initial status to checking
                if (statusElement) {
                    statusElement.innerHTML = '<i class="fas fa-sync fa-spin"></i> Checking server...';
                }
                
                // Add NLP mode toggle - add to existing toggle group or create new if needed
                const toggleContainer = container.querySelector('.bot-type-toggle');
                if (toggleContainer) {
                    // Check if NLP toggle already exists
                    const existingNlpToggle = toggleContainer.querySelector('input[value="nlp"]');
                    if (!existingNlpToggle) {
                        // Create new toggle label
                        const nlpToggle = document.createElement('label');
                        nlpToggle.className = 'toggle-label';
                        nlpToggle.innerHTML = `
                            <input type="radio" name="bot-type-${botId}" value="nlp">
                            <span>NLP Model</span>
                        `;
                        toggleContainer.appendChild(nlpToggle);
                        
                        // Add event listener for the new toggle
                        nlpToggle.querySelector('input').addEventListener('change', (e) => {
                            if (e.target.checked) {
                                container.dataset.type = 'nlp';
                                this.updateBotStatusIndicator(container);
                                
                                // Add a system message about bot type change
                                this.addSystemMessage(messagesContainer, 'Switched to Pretrained NLP Model mode');
                            }
                        });
                    }
                }
                
                // Update status indicator based on server status
                this.updateBotStatusIndicator(container);
                
                // Add event listener for send button
                sendButton.addEventListener('click', () => {
                    if (inputField.value.trim()) {
                        this.sendMessage(botId, inputField.value);
                        inputField.value = '';
                    }
                });
                
                // Add event listener for enter key
                inputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputField.value.trim()) {
                            this.sendMessage(botId, inputField.value);
                            inputField.value = '';
                        }
                    }
                });
                
                // Add event listeners for bot type toggle
                container.querySelectorAll('input[name^="bot-type-"]').forEach((radio) => {
                    radio.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            container.dataset.type = e.target.value;
                            this.updateBotStatusIndicator(container);
                            
                            // Add a system message about bot type change
                            let modeText = e.target.value === 'auto' ? 'automatic' : e.target.value;
                            modeText = modeText === 'nlp' ? 'Pretrained NLP Model' : modeText;
                            this.addSystemMessage(messagesContainer, `Switched to ${modeText} mode`);
                            
                            // Clear conversation history if switching to NLP mode
                            if (e.target.value === 'nlp' && 
                                this.serverConfig.nlpEngine.contextSystem) {
                                this.serverConfig.nlpEngine.contextSystem.clearHistory();
                                this.addSystemMessage(messagesContainer, 'Conversation history cleared');
                            }
                        }
                    });
                });
                
                console.log(`Bot "${botName}" (${botId}) initialized with type: ${botType}`);
                
                // Check if servers are available and add appropriate initial message
                const isCodeServerOffline = this.serverConfig.codeBot.status === 'offline';
                const isChatServerOffline = this.serverConfig.chatBot.status === 'offline';
                const isNlpEngineOnline = this.serverConfig.nlpEngine.status === 'online';
                
                // Add initial message based on server status
                if (botType === 'nlp') {
                    if (isNlpEngineOnline) {
                        this.addSystemMessage(messagesContainer, 'Connected in Pretrained NLP Model mode');
                        this.addMessage(messagesContainer, "Hello! I'm running on a pretrained NLP model. How can I help you today?", 'bot');
                    } else {
                        this.addSystemMessage(messagesContainer, 'NLP Model mode not available');
                        this.addMessage(messagesContainer, "NLP Model mode is not available. The model failed to initialize. Switching to fallback mode.", 'bot');
                    }
                } else if ((botType === 'code' && isCodeServerOffline) || 
                    (botType === 'chat' && isChatServerOffline) || 
                    (botType === 'auto' && isCodeServerOffline && isChatServerOffline)) {
                    
                    if (isNlpEngineOnline) {
                        this.addSystemMessage(messagesContainer, `Remote servers are offline. Switched to NLP Model mode.`);
                        this.addMessage(messagesContainer, "Remote servers appear to be unavailable. I've switched to NLP Model mode powered by a pretrained transformer model. How can I help you?", 'bot');
                        // Auto-switch to NLP mode when servers are offline
                        container.dataset.type = 'nlp';
                        container.querySelector('input[value="nlp"]').checked = true;
                        this.updateBotStatusIndicator(container);
                    } else {
                        this.addSystemMessage(messagesContainer, `Connected in ${botType === 'auto' ? 'automatic' : botType} mode (offline)`);
                        this.addMessage(messagesContainer, "I'm currently in offline mode. The server appears to be unavailable. Basic forum features are still accessible.", 'bot');
                    }
                } else {
                    this.addSystemMessage(messagesContainer, `Connected in ${botType === 'auto' ? 'automatic' : botType} mode`);
                }
            } catch (error) {
                console.error('Error initializing bot:', error);
            }
        },
        
        // Update bot status indicator based on server status
        updateBotStatusIndicator: function(container) {
            try {
                const botId = container.dataset.id;
                const botType = container.dataset.type || 'auto';
                const connectionElement = document.getElementById(`${botId}-connection`);
                
                if (!connectionElement) return;
                
                let statusIcon = connectionElement.previousElementSibling;
                if (!statusIcon) return;
                
                // Remove previous status classes
                statusIcon.classList.remove('status-online', 'status-offline', 'status-unknown');
                
                // Determine status based on bot type and server status
                let status = 'unknown';
                let statusText = 'Unknown';
                
                // Handle NLP mode
                if (botType === 'nlp') {
                    if (this.serverConfig.nlpEngine.status === 'online') {
                        status = 'online';
                        statusText = 'NLP Model Active';
                    } else {
                        status = 'offline';
                        statusText = 'NLP Model Unavailable';
                    }
                } else if (botType === 'code') {
                    // For code bot, check code server status
                    if (this.serverConfig.codeBot.status === 'offline') {
                        status = 'offline';
                        statusText = 'Code Server Offline';
                    } else if (this.serverConfig.codeBot.status === 'online') {
                        status = 'online';
                        statusText = 'Code Mode';
                    }
                } else if (botType === 'chat') {
                    // For chat bot, check chat server status
                    if (this.serverConfig.chatBot.status === 'offline') {
                        status = 'offline';
                        statusText = 'Chat Server Offline';
                    } else if (this.serverConfig.chatBot.status === 'online') {
                        status = 'online';
                        statusText = 'Chat Mode';
                    }
                } else { // auto mode
                    // For auto mode, check both servers
                    if (this.serverConfig.codeBot.status === 'offline' && 
                        this.serverConfig.chatBot.status === 'offline') {
                        status = 'offline';
                        statusText = 'All Servers Offline';
                    } else if (this.serverConfig.codeBot.status === 'online' || 
                               this.serverConfig.chatBot.status === 'online') {
                        status = 'online';
                        statusText = 'Auto Mode';
                        
                        // Specify which servers are available
                        if (this.serverConfig.codeBot.status === 'online' && 
                            this.serverConfig.chatBot.status === 'online') {
                            statusText = 'All Servers Online';
                        } else if (this.serverConfig.codeBot.status === 'online') {
                            statusText = 'Code Server Online';
                        } else {
                            statusText = 'Chat Server Online';
                        }
                    }
                }
                
                // If status is still unknown but we've checked servers, default to offline
                if (status === 'unknown' && 
                    (this.serverConfig.codeBot.status !== 'unknown' || 
                     this.serverConfig.chatBot.status !== 'unknown' ||
                     this.serverConfig.nlpEngine.status !== 'unknown')) {
                    status = 'offline';
                    statusText = 'Connection Error';
                }
                
                // Update status text and icon color
                connectionElement.textContent = statusText;
                statusIcon.classList.add(`status-${status}`);
                
                // Log status
                console.log(`Bot ${botId} status updated to ${status} (${statusText})`);
            } catch (error) {
                console.error('Error updating bot status:', error);
            }
        },
        
        // Send a message to the bot
        sendMessage: function(botId, message) {
            try {
                if (!message.trim()) return;
                
                const container = document.querySelector(`.forum-bot-container[data-id="${botId}"]`);
                if (!container) return;
                
                const botType = container.dataset.type || 'auto';
                const messagesContainer = document.getElementById(`${botId}-messages`);
                
                // Add user message to chat
                this.addMessage(messagesContainer, message, 'user');
                
                // Check if we should use NLP mode
                if (botType === 'nlp') {
                    if (this.serverConfig.nlpEngine.status === 'online') {
                        // Use NLP engine with pretrained model
                        this.processWithNLPEngine(messagesContainer, message);
                        return;
                    } else {
                        // NLP mode is unavailable
                        this.addSystemMessage(messagesContainer, 'NLP Model mode unavailable. Falling back to server mode.');
                        // Fall through to server processing
                    }
                }
                
                // Determine which server to use based on message and bot type
                let server;
                const isCodeQuery = message.trim().startsWith('#');
                
                if (botType === 'code' || (botType === 'auto' && isCodeQuery)) {
                    server = this.serverConfig.codeBot;
                } else {
                    server = this.serverConfig.chatBot;
                }
                
                // Check if server is offline
                if (server.status === 'offline') {
                    // Check if NLP engine is available as a fallback
                    if (this.serverConfig.nlpEngine.status === 'online') {
                        this.addSystemMessage(messagesContainer, 'Server offline. Using NLP Model mode.');
                        this.processWithNLPEngine(messagesContainer, message);
                        return;
                    }
                    
                    // Use fallback mode if enabled
                    if (this.serverConfig.fallbackMode.enabled) {
                        // Get random response based on bot type
                        const responseType = botType === 'code' ? 'code' : 
                                             botType === 'chat' ? 'chat' : 'auto';
                        
                        const responses = this.serverConfig.fallbackMode.responses[responseType];
                        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                        
                        // Show "thinking" briefly to simulate processing
                        const thinkingId = this.addThinkingIndicator(messagesContainer);
                        
                        // Delayed response to simulate thinking
                        setTimeout(() => {
                            this.removeThinkingIndicator(thinkingId);
                            this.addMessage(messagesContainer, randomResponse, 'bot');
                        }, 1000);
                        
                        return;
                    } else {
                        this.addSystemMessage(messagesContainer, 'Server is currently offline. Please try again later.');
                        return;
                    }
                }
                
                // Show thinking indicator
                const thinkingId = this.addThinkingIndicator(messagesContainer);
                
                // Send message to server and handle response
                this.sendToPythonServer(server, message)
                    .then((response) => {
                        // Remove thinking indicator
                        this.removeThinkingIndicator(thinkingId);
                        
                        // Add bot response to chat
                        if (response && response.response) {
                            this.addMessage(messagesContainer, response.response, 'bot');
                        } else {
                            throw new Error('Invalid response from server');
                        }
                    })
                    .catch((error) => {
                        console.error('Error sending message to Python server:', error);
                        
                        // Remove thinking indicator
                        this.removeThinkingIndicator(thinkingId);
                        
                        // Try NLP model if available
                        if (this.serverConfig.nlpEngine.status === 'online') {
                            this.addSystemMessage(messagesContainer, 'Server error. Falling back to NLP Model mode.');
                            this.processWithNLPEngine(messagesContainer, message);
                            return;
                        }
                        
                        // Add friendly error message
                        if (this.serverConfig.fallbackMode.enabled) {
                            // Get fallback response
                            const responseType = botType === 'code' ? 'code' : 
                                                 botType === 'chat' ? 'chat' : 'auto';
                            
                            const responses = this.serverConfig.fallbackMode.responses[responseType];
                            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                            
                            this.addMessage(messagesContainer, randomResponse, 'bot');
                        } else {
                            this.addSystemMessage(messagesContainer, 'Error connecting to server. Please try again later.');
                        }
                        
                        // Update server status and UI
                        server.status = 'offline';
                        this.updateBotStatusIndicator(container);
                    });
            } catch (error) {
                console.error('Error in sendMessage:', error);
            }
        },
        
        // Process a message with the NLP engine
        processWithNLPEngine: function(messagesContainer, message) {
            try {
                if (!this.serverConfig.nlpEngine.initialized) {
                    this.addSystemMessage(messagesContainer, 'NLP Model not initialized');
                    return;
                }
                
                // Show thinking indicator
                const thinkingId = this.addThinkingIndicator(messagesContainer);
                
                // Get the NLP engine components
                const { responseGenerator } = this.serverConfig.nlpEngine;
                
                // Process message with NLP engine - handle both async and sync versions
                const processResponse = (response) => {
                    try {
                        // Apply enhancements to improve response quality
                        response = responseGenerator.enhanceResponse(message, response);
                        
                        // Remove thinking indicator
                        this.removeThinkingIndicator(thinkingId);
                        
                        // Add bot response to chat
                        this.addMessage(messagesContainer, response, 'bot');
                    } catch (error) {
                        console.error('Error processing response:', error);
                        this.removeThinkingIndicator(thinkingId);
                        this.addMessage(messagesContainer, "I encountered an error processing your message. Let's try again.", 'bot');
                    }
                };
                
                // Check if generateResponse returns a Promise or direct value
                const result = responseGenerator.generateResponse(message);
                if (result instanceof Promise) {
                    result.then(processResponse)
                        .catch(error => {
                            console.error('Error processing with NLP engine:', error);
                            this.removeThinkingIndicator(thinkingId);
                            
                            // Use fallback response
                            const fallbackResponse = responseGenerator.generateFallbackResponse ?
                                responseGenerator.generateFallbackResponse(message) :
                                "I'm having trouble generating a response right now. Could you try asking in a different way?";
                                
                            this.addMessage(messagesContainer, fallbackResponse, 'bot');
                        });
                } else {
                    // Handle synchronous response (fallback mode)
                    setTimeout(() => {
                        processResponse(result);
                    }, 500); // Add small delay to simulate thinking
                }
            } catch (error) {
                console.error('Error in processWithNLPEngine:', error);
                this.addSystemMessage(messagesContainer, 'Error processing with NLP Model');
            }
        },
        
        // Send message to Python server with better error handling
        sendToPythonServer: function(server, message) {
            return new Promise((resolve, reject) => {
                try {
                    // Encode message for URL
                    const encodedMessage = encodeURIComponent(message);
                    
                    // Safer server URL building
                    let fullUrl = `${server.url}?ack=${encodedMessage}`;
                    if (server.forceHttp && fullUrl.startsWith('https://')) {
                        fullUrl = fullUrl.replace('https://', 'http://');
                        console.log('Forcing HTTP protocol, adjusted URL:', fullUrl);
                    }
                    
                    console.log(`Sending request to: ${fullUrl}`);
                    console.log(`API endpoint status: ${server.status}, Server: ${server.url}, Port: ${server.port}`);
                    
                    // Send request with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), this.serverConfig.timeout);
                    
                    fetch(fullUrl, {
                        method: 'GET',
                        signal: controller.signal,
                        mode: 'cors',
                        cache: 'no-cache',
                        headers: {
                            'Accept': '*/*'
                        }
                    })
                    .then((response) => {
                        clearTimeout(timeoutId);
                        
                        if (!response.ok) {
                            throw new Error(`Server responded with status: ${response.status}`);
                        }
                        
                        return response.text();
                    })
                    .then((responseText) => {
                        console.log('Raw response text:', responseText);
                        
                        try {
                            const data = JSON.parse(responseText);
                            console.log('Parsed response:', data);
                            
                            // Validate response structure
                            if (!data || typeof data.response === 'undefined') {
                                console.warn('Response missing required field "response":', data);
                                resolve({ response: "I received an incomplete response. Please try again." });
                                return;
                            }
                            
                            resolve(data);
                        } catch (e) {
                            console.error('Error parsing JSON response:', e);
                            console.log('Response that failed to parse:', responseText);
                            // Return a fallback response when JSON parsing fails
                            resolve({ response: "I received a response but couldn't understand it. Please try again." });
                        }
                    })
                    .catch((error) => {
                        clearTimeout(timeoutId);
                        
                        // Improve error handling for different types of errors
                        if (error.name === 'AbortError') {
                            console.error('Request timed out after', this.serverConfig.timeout, 'ms');
                            reject(new Error('Request timed out. Server might be overloaded or offline.'));
                        } else if (error.message.includes('NetworkError')) {
                            console.error('Network error when connecting to server');
                            reject(new Error('Network error. Please check your internet connection.'));
                        } else {
                            console.error('Error in sendToPythonServer:', error);
                            reject(error);
                        }
                    });
                } catch (error) {
                    console.error('Exception in sendToPythonServer:', error);
                    reject(error);
                }
            });
        },
        
        // Add a message to the chat
        addMessage: function(container, message, sender) {
            try {
                if (!container) {
                    console.error('Message container not found');
                    return;
                }
                
                const messageElement = document.createElement('div');
                messageElement.className = sender === 'user' ? 'user-message' : 'bot-message';
                
                let content = '';
                
                if (sender === 'bot') {
                    // Process code blocks in bot messages
                    const processedMessage = this.processCodeBlocks(message);
                    
                    content = `
                        <div class="bot-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">${processedMessage}</div>
                    `;
                } else {
                    content = `
                        <div class="message-content">${this.escapeHtml(message)}</div>
                    `;
                }
                
                messageElement.innerHTML = content;
                container.appendChild(messageElement);
                
                // Scroll to bottom
                container.scrollTop = container.scrollHeight;
            } catch (error) {
                console.error('Error adding message:', error);
            }
        },
        
        // Add a system message
        addSystemMessage: function(container, message) {
            try {
                if (!container) {
                    console.error('System message container not found');
                    return;
                }
                
                const messageElement = document.createElement('div');
                messageElement.className = 'system-message';
                messageElement.textContent = message;
                
                container.appendChild(messageElement);
                
                // Scroll to bottom
                container.scrollTop = container.scrollHeight;
            } catch (error) {
                console.error('Error adding system message:', error);
            }
        },
        
        // Add thinking indicator
        addThinkingIndicator: function(container) {
            try {
                if (!container) {
                    console.error('Thinking indicator container not found');
                    return null;
                }
                
                const id = 'thinking-' + Math.random().toString(36).substring(2, 9);
                
                const thinkingElement = document.createElement('div');
                thinkingElement.className = 'bot-message thinking';
                thinkingElement.id = id;
                
                thinkingElement.innerHTML = `
                    <div class="bot-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <span class="thinking-dots">
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </span>
                    </div>
                `;
                
                container.appendChild(thinkingElement);
                
                // Scroll to bottom
                container.scrollTop = container.scrollHeight;
                
                return id;
            } catch (error) {
                console.error('Error adding thinking indicator:', error);
                return null;
            }
        },
        
        // Remove thinking indicator
        removeThinkingIndicator: function(id) {
            try {
                if (!id) return;
                
                const element = document.getElementById(id);
                if (element) {
                    element.remove();
                }
            } catch (error) {
                console.error('Error removing thinking indicator:', error);
            }
        },
        
        // Process code blocks in messages
        processCodeBlocks: function(message) {
            try {
                // Simple pattern to look for code snippets
                const codePattern = /```(?:\w+)?\s*([\s\S]+?)```|`([^`]+)`|(?:^|\n)( {4}[\s\S]+?)(?=\n[^ ]|\n$|$)/g;
                
                // Replace code patterns with HTML
                const processedText = message.replace(codePattern, (match, codeBlock1, codeBlock2, codeBlock3) => {
                    // Determine which capture group has the code
                    const code = codeBlock1 || codeBlock2 || codeBlock3 || '';
                    
                    if (codeBlock1) {
                        // Multi-line code block (```code```)
                        return `<pre class="code-block"><code>${this.escapeHtml(code)}</code></pre>`;
                    } else if (codeBlock2) {
                        // Inline code (`code`)
                        return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
                    } else if (codeBlock3) {
                        // Indented code block (4 spaces)
                        return `<pre class="code-block"><code>${this.escapeHtml(code)}</code></pre>`;
                    }
                    
                    return match; // Fallback
                });
                
                return processedText;
            } catch (error) {
                console.error('Error processing code blocks:', error);
                return message; // Return original message on error
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
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
                margin: 15px 0;
                background-color: #fff;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                font-family: inherit;
            }
            
            .forum-bot-header {
                background-color: #f5f5f5;
                padding: 10px 15px;
                border-bottom: 1px solid #e0e0e0;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .forum-bot-header i {
                margin-right: 8px;
                color: #2196F3;
            }
            
            /* Bot type toggle styles */
            .bot-type-toggle {
                display: flex;
                border-radius: 15px;
                overflow: hidden;
                background-color: #e0e0e0;
                margin-left: auto;
                border: 1px solid #ccc;
            }
            
            .toggle-label {
                padding: 3px 8px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                margin: 0;
                transition: background-color 0.2s;
            }
            
            .toggle-label input {
                position: absolute;
                opacity: 0;
                cursor: pointer;
                height: 0;
                width: 0;
            }
            
            .toggle-label input:checked + span {
                color: #fff;
                font-weight: bold;
            }
            
            .toggle-label:first-child input:checked + span {
                background-color: #4CAF50; /* Chat - Green */
            }
            
            .toggle-label:nth-child(2) input:checked + span {
                background-color: #2196F3; /* Auto - Blue */
            }
            
            .toggle-label:nth-child(3) input:checked + span {
                background-color: #FF9800; /* Code - Orange */
            }
            
            .toggle-label:nth-child(4) input:checked + span {
                background-color: #9C27B0; /* NLP - Purple */
            }
            
            .toggle-label span {
                padding: 3px 8px;
                border-radius: 12px;
            }
            
            /* Bot status styles */
            .bot-status {
                margin-left: 10px;
                font-size: 12px;
                color: #666;
            }
            
            /* Forum bot messages container */
            .forum-bot-messages {
                height: 250px;
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .bot-message, .user-message {
                display: flex;
                max-width: 80%;
            }
            
            .user-message {
                margin-left: auto;
                flex-direction: row-reverse;
            }
            
            .bot-avatar {
                width: 36px;
                height: 36px;
                background-color: #2196F3;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                margin-right: 8px;
            }
            
            .user-message .bot-avatar {
                margin-right: 0;
                margin-left: 8px;
            }
            
            .message-content {
                background-color: #f1f1f1;
                padding: 10px 15px;
                border-radius: 18px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                line-height: 1.4;
            }
            
            .user-message .message-content {
                background-color: #e3f2fd;
            }
            
            /* System messages */
            .system-message {
                text-align: center;
                font-size: 12px;
                color: #888;
                margin: 8px 0;
                font-style: italic;
            }
            
            /* Thinking animation */
            .thinking-dots {
                display: inline-flex;
                gap: 4px;
            }
            
            .thinking-dots .dot {
                width: 8px;
                height: 8px;
                background-color: #888;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            
            .thinking-dots .dot:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .thinking-dots .dot:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes pulse {
                0%, 60%, 100% {
                    transform: scale(1);
                    opacity: 0.4;
                }
                20% {
                    transform: scale(1.2);
                    opacity: 1;
                }
            }
            
            /* Code styles */
            .code-block {
                background-color: #282c34;
                color: #abb2bf;
                border-radius: 6px;
                padding: 10px;
                margin: 8px 0;
                overflow-x: auto;
                font-family: monospace;
                max-width: 100%;
            }
            
            .inline-code {
                background-color: #f0f0f0;
                padding: 2px 5px;
                border-radius: 3px;
                font-family: monospace;
                font-size: 85%;
            }
            
            /* Input area */
            .forum-bot-input {
                display: flex;
                padding: 10px;
                border-top: 1px solid #e0e0e0;
                background-color: #f9f9f9;
            }
            
            .forum-bot-input textarea {
                flex-grow: 1;
                border: 1px solid #e0e0e0;
                border-radius: 18px;
                padding: 8px 15px;
                resize: none;
                height: 38px;
                outline: none;
                font-family: inherit;
                font-size: 14px;
            }
            
            .bot-send-btn {
                width: 38px;
                height: 38px;
                border: none;
                background-color: #2196F3;
                color: white;
                border-radius: 50%;
                margin-left: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            }
            
            .bot-send-btn:hover {
                background-color: #1976D2;
            }
            
            /* Footer with connection status */
            .forum-bot-footer {
                padding: 8px 15px;
                background-color: #f5f5f5;
                border-top: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #666;
            }
            
            .bot-status-indicator {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .bot-status-indicator i {
                font-size: 10px;
            }
            
            .status-online {
                color: #4CAF50;
            }
            
            .status-offline {
                color: #F44336;
            }
            
            .status-unknown {
                color: #FFC107;
            }
            
            .bot-info {
                font-style: italic;
            }
            
            /* Model download progress bar */
            .model-download-progress {
                height: 5px;
                background-color: #f0f0f0;
                border-radius: 3px;
                margin: 8px 0;
                overflow: hidden;
            }
            
            .model-download-progress .progress-bar {
                height: 100%;
                background-color: #2196F3;
                width: 0%;
                transition: width 0.3s;
            }
            
            /* Dark theme support */
            [data-theme="dark"] .forum-bot-container {
                border-color: #444;
                background-color: #222;
            }
            
            [data-theme="dark"] .forum-bot-header {
                background-color: #333;
                border-color: #444;
                color: #eee;
            }
            
            [data-theme="dark"] .bot-type-toggle {
                background-color: #555;
                border-color: #666;
            }
            
            [data-theme="dark"] .toggle-label {
                color: #ccc;
            }
            
            [data-theme="dark"] .bot-status {
                color: #aaa;
            }
            
            [data-theme="dark"] .forum-bot-messages {
                background-color: #222;
            }
            
            [data-theme="dark"] .message-content {
                background-color: #333;
                color: #eee;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            [data-theme="dark"] .user-message .message-content {
                background-color: #1a3a5f;
            }
            
            [data-theme="dark"] .system-message {
                color: #aaa;
            }
            
            [data-theme="dark"] .forum-bot-input {
                background-color: #333;
                border-color: #444;
            }
            
            [data-theme="dark"] .forum-bot-input textarea {
                background-color: #444;
                border-color: #555;
                color: #eee;
            }
            
            [data-theme="dark"] .inline-code {
                background-color: #3a3a3a;
                color: #ddd;
            }
            
            [data-theme="dark"] .forum-bot-footer {
                background-color: #333;
                color: #aaa;
                border-color: #444;
            }
            
            [data-theme="dark"] .model-download-progress {
                background-color: #444;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    // Add model information modal
    function addModelInfoModal() {
        // Check if modal already exists
        if (document.getElementById('nlp-model-info-modal')) {
            return;
        }
        
        const modalEl = document.createElement('div');
        modalEl.id = 'nlp-model-info-modal';
        modalEl.className = 'nlp-model-modal';
        modalEl.style.display = 'none';
        
        modalEl.innerHTML = `
            <div class="nlp-model-modal-content">
                <span class="nlp-model-close">&times;</span>
                <h2>Pretrained NLP Model Information</h2>
                <div class="nlp-model-info">
                    <p><strong>Current Model:</strong> <span id="current-model-name">distilgpt2</span></p>
                    <p><strong>Model Size:</strong> <span id="current-model-size">~300MB</span></p>
                    <p><strong>Status:</strong> <span id="current-model-status">Loading...</span></p>
                    
                    <div class="model-download-progress">
                        <div class="progress-bar" id="model-download-progress-bar"></div>
                    </div>
                    
                    <h3>Available Models</h3>
                    <div class="model-selection">
                        <label>
                            <input type="radio" name="nlp-model" value="distilgpt2" checked>
                            distilgpt2 (Smaller, faster)
                        </label>
                        <label>
                            <input type="radio" name="nlp-model" value="gpt2-small">
                            GPT-2 Small (Better quality)
                        </label>
                        <label>
                            <input type="radio" name="nlp-model" value="dialogpt-small">
                            DialoGPT Small (Dialog-specific)
                        </label>
                    </div>
                    
                    <button id="change-model-btn" class="change-model-btn">Change Model</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalEl);
        
        // Add styles for modal
        const modalStyles = document.createElement('style');
        modalStyles.textContent = `
            .nlp-model-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
            }
            
            .nlp-model-modal-content {
                background-color: #fefefe;
                margin: 10% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                max-width: 500px;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .nlp-model-close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            
            .nlp-model-close:hover {
                color: #333;
            }
            
            .nlp-model-info {
                margin-top: 20px;
            }
            
            .model-selection {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin: 15px 0;
            }
            
            .model-selection label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }
            
            .change-model-btn {
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 10px;
            }
            
            .change-model-btn:hover {
                background-color: #0d8bf2;
            }
            
            [data-theme="dark"] .nlp-model-modal-content {
                background-color: #333;
                color: #eee;
                border-color: #555;
            }
            
            [data-theme="dark"] .nlp-model-close {
                color: #ccc;
            }
            
            [data-theme="dark"] .nlp-model-close:hover {
                color: #fff;
            }
        `;
        
        document.head.appendChild(modalStyles);
        
        // Add event listeners for modal
        const closeBtn = document.querySelector('.nlp-model-close');
        closeBtn.addEventListener('click', () => {
            modalEl.style.display = 'none';
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modalEl) {
                modalEl.style.display = 'none';
            }
        });
        
        // Add model change button functionality
        const changeModelBtn = document.getElementById('change-model-btn');
        changeModelBtn.addEventListener('click', () => {
            const selectedModel = document.querySelector('input[name="nlp-model"]:checked').value;
            
            // Update model status display
            document.getElementById('current-model-status').textContent = 'Downloading...';
            document.getElementById('current-model-name').textContent = selectedModel;
            
            // Show progress bar animation (this would be replaced with actual progress in a real implementation)
            const progressBar = document.getElementById('model-download-progress-bar');
            progressBar.style.width = '0%';
            
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 10;
                if (progress > 100) {
                    progress = 100;
                    clearInterval(progressInterval);
                    
                    // Simulate model loading completion
                    setTimeout(() => {
                        document.getElementById('current-model-status').textContent = 'Active';
                        // In a real implementation, we would trigger the actual model change here
                    }, 500);
                }
                progressBar.style.width = progress + '%';
            }, 300);
        });
    }
    
    // Add styles
    addBotStyles();
    
    // Add model info modal
    addModelInfoModal();
    
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