// forum-bot.js - Forum Bot with TensorFlow.js integration
const ForumBot = {
    // Initialize all bot instances on the page
    init() {
        // Find all bot containers
        const botContainers = document.querySelectorAll('.forum-bot-container');
        
        // Initialize each bot
        botContainers.forEach(container => {
            this.initializeBot(container);
        });
        
        // Set up mutation observer to catch dynamically added bots
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    // Process added nodes
                    mutation.addedNodes.forEach(node => {
                        // Check if the node is an element and has a bot container
                        if (node.nodeType === 1) { // Element node
                            const botContainers = node.querySelectorAll('.forum-bot-container');
                            botContainers.forEach(container => {
                                this.initializeBot(container);
                            });
                        }
                    });
                }
            }
        });
        
        // Observe the document body
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('Forum Bot initialized with mutation observer');
        
        // Load TensorFlow.js
        this.loadTensorFlow();
    },
    
    // Initialize a single bot container
    initializeBot(container) {
        const botId = container.dataset.id;
        const botName = container.dataset.name;
        
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
        
        // Add event listener for send button
        sendButton.addEventListener('click', () => {
            this.sendMessage(botId, inputField.value);
            inputField.value = '';
        });
        
        // Add event listener for enter key
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(botId, inputField.value);
                inputField.value = '';
            }
        });
        
        console.log(`Bot "${botName}" (${botId}) initialized`);
    },
    
    // Send a message to the bot
    sendMessage(botId, message) {
        if (!message.trim()) return;
        
        const messagesContainer = document.getElementById(`${botId}-messages`);
        
        // Add user message
        this.addMessage(messagesContainer, message, 'user');
        
        // Process message and get response
        this.processMessage(botId, message)
            .then(response => {
                // Add bot response
                this.addMessage(messagesContainer, response, 'bot');
                
                // Save interaction with response for training
                this.saveInteraction(botId, message, response);
            })
            .catch(error => {
                console.error('Error processing message:', error);
                this.addMessage(messagesContainer, 'Sorry, I encountered an error.', 'bot');
            });
    },
    
    // Add a message to the chat
    addMessage(container, message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = sender === 'user' ? 'user-message' : 'bot-message';
        
        let content = '';
        
        if (sender === 'bot') {
            content = `
                <div class="bot-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">${this.escapeHtml(message)}</div>
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
    },
    
    // Process message and generate response
    async processMessage(botId, message) {
        // If TensorFlow is loaded and model is available, use it
        if (window.tf && this.model) {
            try {
                return await this.generateResponse(message);
            } catch (error) {
                console.error('Error generating response with TensorFlow:', error);
                // Fall back to basic response
            }
        }
        
        // Basic response logic if TensorFlow isn't ready
        const responses = [
            "That's interesting! Tell me more.",
            "I'm still learning, but that sounds fascinating.",
            "I appreciate your input. It helps me learn.",
            "I don't fully understand yet, but I'm learning from our conversation.",
            "Thanks for chatting with me!",
            "I'm processing that information. Can you elaborate?",
            "That's a good point. What else would you like to discuss?",
            "I'm designed to learn from interactions like this."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    // Generate response using TensorFlow model
    async generateResponse(message) {
        if (!window.tf || !this.model) {
            throw new Error('TensorFlow or model not loaded');
        }
        
        try {
            // Tokenize the message (convert to lowercase, remove punctuation, split into words)
            const tokens = message.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(Boolean);
            
            // If we have a wordIndex and tokens, encode the input
            if (this.wordIndex && tokens.length > 0) {
                // Map tokens to indices, replace unknown words with 0
                const indices = tokens.map(token => this.wordIndex[token] || 0);
                
                // Pad sequence to maxLength
                const paddedIndices = this.padSequence(indices, this.maxSeqLength);
                
                // Convert to tensor
                const inputTensor = tf.tensor2d([paddedIndices], [1, this.maxSeqLength]);
                
                // Get prediction
                const output = this.model.predict(inputTensor);
                const scores = await output.data();
                
                // Find most likely class
                const predIndex = scores.indexOf(Math.max(...scores));
                
                // Convert to response
                if (predIndex && this.responseClasses && this.responseClasses[predIndex]) {
                    return this.responseClasses[predIndex];
                }
            }
            
            // Default response if prediction failed
            return "I'm thinking about what you said. My neural network is still learning.";
            
        } catch (error) {
            console.error('Error generating response with TensorFlow:', error);
            return "I'm having trouble processing that with my neural network. Can we try something else?";
        }
    },
    
    // Pad sequence to a fixed length
    padSequence(sequence, length) {
        if (sequence.length > length) {
            return sequence.slice(0, length);
        }
        return [...Array(length - sequence.length).fill(0), ...sequence];
    },
    
    // Load TensorFlow.js
    loadTensorFlow() {
        // Check if TensorFlow is already loaded
        if (window.tf) {
            console.log('TensorFlow already loaded, initializing model');
            this.initTensorFlow();
            return;
        }
        
        // Create script tag
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js';
        script.async = true;
        
        script.onload = () => {
            console.log('TensorFlow.js loaded successfully');
            this.initTensorFlow();
        };
        
        script.onerror = () => {
            console.error('Failed to load TensorFlow.js');
        };
        
        // Add to document
        document.head.appendChild(script);
    },
    
    // Initialize TensorFlow model
    async initTensorFlow() {
        try {
            // Try to load existing model from IndexedDB
            try {
                this.model = await tf.loadLayersModel('indexeddb://forum-bot-model');
                console.log('Loaded existing model from IndexedDB');
                
                // Load word index and response classes
                await this.loadModelMetadata();
            } catch (e) {
                console.log('No existing model found, creating new one');
                await this.createNewModel();
            }
            
            // Schedule periodic training
            this.scheduleTraining();
        } catch (error) {
            console.error('Error initializing TensorFlow:', error);
        }
    },
    
    // Create a new model
    async createNewModel() {
        // Default values
        this.maxSeqLength = 10;
        this.vocabSize = 1000;
        this.numClasses = 10;
        
        // Create sequential model
        this.model = tf.sequential();
        
        // Add layers
        this.model.add(tf.layers.embedding({
            inputDim: this.vocabSize,
            outputDim: 64,
            inputLength: this.maxSeqLength
        }));
        
        this.model.add(tf.layers.globalAveragePooling1d());
        
        this.model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        
        this.model.add(tf.layers.dense({
            units: this.numClasses,
            activation: 'softmax'
        }));
        
        // Compile model
        this.model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        // Initialize empty word index and response classes
        this.wordIndex = {};
        this.responseClasses = [
            "I'm still learning how to respond properly.",
            "That's interesting! Tell me more.",
            "I'm not sure I understand. Could you explain differently?",
            "I'm processing what you said.",
            "Thanks for your message!",
            "I'm designed to learn from our conversations.",
            "That's a good point.",
            "I'd like to hear more about that.",
            "Let me think about that for a moment.",
            "That's valuable input for my learning."
        ];
        
        // Save model
        await this.saveModel();
        
        console.log('Created and saved new model');
    },
    
    // Load word index and response classes
    async loadModelMetadata() {
        try {
            const response = await fetch('bot_handler.php?action=get_metadata');
            const data = await response.json();
            
            if (data.success) {
                this.wordIndex = data.wordIndex || {};
                this.responseClasses = data.responseClasses || [];
                this.maxSeqLength = data.maxSeqLength || 10;
                console.log('Loaded model metadata', 
                    Object.keys(this.wordIndex).length, 'words,',
                    this.responseClasses.length, 'response classes');
            } else {
                throw new Error('Failed to load model metadata');
            }
        } catch (error) {
            console.error('Error loading model metadata:', error);
            // Create defaults
            this.wordIndex = {};
            this.responseClasses = [
                "I'm still learning how to respond properly.",
                "That's interesting! Tell me more.",
                "I'm not sure I understand. Could you explain differently?",
                "I'm processing what you said.",
                "Thanks for your message!",
                "I'm designed to learn from our conversations.",
                "That's a good point.",
                "I'd like to hear more about that.",
                "Let me think about that for a moment.",
                "That's valuable input for my learning."
            ];
            this.maxSeqLength = 10;
        }
    },
    
    // Save model to IndexedDB and metadata to server
    async saveModel() {
        try {
            // Save model to IndexedDB
            await this.model.save('indexeddb://forum-bot-model');
            
            // Save metadata to server
            const response = await fetch('bot_handler.php?action=save_metadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wordIndex: this.wordIndex,
                    responseClasses: this.responseClasses,
                    maxSeqLength: this.maxSeqLength
                })
            });
            
            const result = await response.json();
            if (!result.success) {
                console.error('Error saving metadata:', result.error);
            }
        } catch (error) {
            console.error('Error saving model:', error);
        }
    },
    
    // Schedule periodic training
    scheduleTraining() {
        // Train once when initialized
        setTimeout(() => this.trainModel(), 10000);
        
        // Then train periodically
        setInterval(() => this.trainModel(), 3600000); // Every hour
    },
    
    // Train model with new interactions
    async trainModel() {
        try {
            console.log('Starting model training...');
            
            // Fetch interactions from server
            const response = await fetch('bot_handler.php?action=get_interactions');
            const data = await response.json();
            
            if (!data.success || !data.interactions || data.interactions.length === 0) {
                console.log('No interactions available for training');
                return;
            }
            
            const interactions = data.interactions;
            console.log(`Training with ${interactions.length} interactions`);
            
            // Update word index from new messages
            this.updateWordIndex(interactions);
            
            // Prepare training data
            const { inputs, outputs } = this.prepareTrainingData(interactions);
            
            if (!inputs || inputs.length === 0) {
                console.log('No valid training data generated');
                return;
            }
            
            // Convert to tensors
            const xs = tf.tensor2d(inputs, [inputs.length, this.maxSeqLength]);
            const ys = tf.tensor2d(outputs, [outputs.length, this.numClasses]);
            
            // Train model
            const trainResult = await this.model.fit(xs, ys, {
                epochs: 5,
                batchSize: Math.min(32, inputs.length),
                shuffle: true,
                verbose: 1
            });
            
            console.log('Training completed.', trainResult.history);
            
            // Cleanup tensors
            xs.dispose();
            ys.dispose();
            
            // Save updated model
            await this.saveModel();
            
        } catch (error) {
            console.error('Error training model:', error);
        }
    },
    
    // Update word index with new words from interactions
    updateWordIndex(interactions) {
        // Extract all user messages
        const allMessages = interactions.map(interaction => interaction.userMessage);
        
        // Generate set of all words
        const allWords = new Set();
        
        allMessages.forEach(message => {
            if (!message) return;
            
            const words = message.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(Boolean);
                
            words.forEach(word => allWords.add(word));
        });
        
        // Get words that aren't already in wordIndex
        const newWords = Array.from(allWords).filter(word => !this.wordIndex[word]);
        
        // Add new words to wordIndex
        let nextIndex = Object.keys(this.wordIndex).length + 1;
        newWords.forEach(word => {
            this.wordIndex[word] = nextIndex++;
        });
        
        console.log(`Added ${newWords.length} new words to wordIndex. Total: ${nextIndex - 1}`);
        
        // Update vocabSize
        this.vocabSize = Math.max(this.vocabSize, nextIndex);
    },
    
    // Prepare training data from interactions
    prepareTrainingData(interactions) {
        const inputs = [];
        const outputs = [];
        
        interactions.forEach(interaction => {
            if (!interaction.userMessage || !interaction.botResponse) return;
            
            // Tokenize user message
            const tokens = interaction.userMessage.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(Boolean);
                
            if (tokens.length === 0) return;
            
            // Convert tokens to indices
            const indices = tokens.map(token => this.wordIndex[token] || 0);
            
            // Pad or truncate to maxSeqLength
            const paddedIndices = this.padSequence(indices, this.maxSeqLength);
            
            // Determine output class (simplified - in a real system, would use more sophisticated logic)
            // Here we'll just use the first few words of the bot response to determine class
            const responseStart = interaction.botResponse.toLowerCase().substring(0, 20);
            
            // Find matching response class or add a new one if needed
            let classIndex = this.responseClasses.findIndex(rc => 
                responseStart.includes(rc.toLowerCase().substring(0, 10)));
                
            if (classIndex === -1 && this.responseClasses.length < this.numClasses) {
                // Add new response class if we have room
                classIndex = this.responseClasses.length;
                this.responseClasses.push(interaction.botResponse);
            } else if (classIndex === -1) {
                // Use random existing class if we're full
                classIndex = Math.floor(Math.random() * this.numClasses);
            }
            
            // Create one-hot encoded output
            const output = Array(this.numClasses).fill(0);
            output[classIndex] = 1;
            
            inputs.push(paddedIndices);
            outputs.push(output);
        });
        
        return { inputs, outputs };
    },
    
    // Save interaction to server for training
    saveInteraction(botId, userMessage, botResponse) {
        // Prepare data
        const data = {
            botId: botId,
            userMessage: userMessage,
            botResponse: botResponse,
            timestamp: Date.now()
        };
        
        // Send to server
        fetch('bot_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                console.error('Error saving interaction:', result.error);
            }
        })
        .catch(error => {
            console.error('Error sending interaction to server:', error);
        });
    },
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ForumBot.init();
});