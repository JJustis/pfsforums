// bot-trainer.js - Advanced TensorFlow.js trainer for Forum Bot
const BotTrainer = {
    // Model properties
    model: null,
    wordIndex: {},
    maxSeqLength: 20,
    vocabSize: 5000,
    numClasses: 10,
    responseClasses: [],
    trainingInProgress: false,
    
    // Initialize the trainer
    async init() {
        console.log('Initializing Bot Trainer...');
        
        // Load TensorFlow.js if not already loaded
        if (!window.tf) {
            await this.loadTensorFlow();
        }
        
        // Load saved model if exists, otherwise create new
        try {
            await this.loadModel();
        } catch (error) {
            console.log('Creating new model', error);
            await this.createModel();
        }
        
        // Setup admin panel if admin
        this.setupAdminPanel();
        
        // Setup periodic training
        setInterval(() => this.trainModel(), 3600000); // Train every hour
        
        console.log('Bot Trainer initialized successfully');
    },
    
    // Load TensorFlow.js
    loadTensorFlow() {
        return new Promise((resolve, reject) => {
            if (window.tf) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js';
            script.async = true;
            
            script.onload = () => {
                console.log('TensorFlow.js loaded successfully');
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('Failed to load TensorFlow.js', error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    },
    
    // Create new TensorFlow model
    async createModel() {
        try {
            // Create a sequential model
            this.model = tf.sequential();
            
            // Add layers
            this.model.add(tf.layers.embedding({
                inputDim: this.vocabSize,
                outputDim: 128,
                inputLength: this.maxSeqLength
            }));
            
            this.model.add(tf.layers.bidirectional({
                layer: tf.layers.lstm({
                    units: 64,
                    returnSequences: false
                })
            }));
            
            this.model.add(tf.layers.dense({
                units: 64,
                activation: 'relu'
            }));
            
            this.model.add(tf.layers.dropout({ rate: 0.5 }));
            
            this.model.add(tf.layers.dense({
                units: this.numClasses,
                activation: 'softmax'
            }));
            
            // Compile model
            this.model.compile({
                optimizer: tf.train.adam(),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });
            
            console.log('Model created:');
            this.model.summary();
            
            // Initialize empty word index
            this.wordIndex = {};
            
            // Initialize response classes with defaults
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
            
        } catch (error) {
            console.error('Error creating model:', error);
            throw error;
        }
    },
    
    // Load existing model
    async loadModel() {
        try {
            // Try to load model from IndexedDB
            this.model = await tf.loadLayersModel('indexeddb://forum-bot-model');
            console.log('Model loaded from IndexedDB');
            
            // Load metadata
            await this.loadMetadata();
            
        } catch (error) {
            console.error('Error loading model:', error);
            throw error;
        }
    },
    
    // Load metadata from server
    async loadMetadata() {
        try {
            const response = await fetch('bot_handler.php?action=get_metadata');
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Failed to load metadata');
            }
            
            this.wordIndex = data.wordIndex || {};
            this.responseClasses = data.responseClasses || [];
            this.maxSeqLength = data.maxSeqLength || 20;
            
            // Update model parameters
            this.vocabSize = Math.max(Object.keys(this.wordIndex).length + 100, 5000);
            this.numClasses = Math.max(this.responseClasses.length, 10);
            
            console.log(`Loaded metadata: ${Object.keys(this.wordIndex).length} words, ${this.responseClasses.length} response classes`);
            
        } catch (error) {
            console.error('Error loading metadata:', error);
            throw error;
        }
    },
    
    // Save model to IndexedDB and metadata to server
    async saveModel() {
        try {
            // Save model to IndexedDB
            await this.model.save('indexeddb://forum-bot-model');
            console.log('Model saved to IndexedDB');
            
            // Save metadata to server
            const metadataResponse = await fetch('bot_handler.php?action=save_metadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wordIndex: this.wordIndex,
                    responseClasses: this.responseClasses,
                    maxSeqLength: this.maxSeqLength,
                    vocabSize: this.vocabSize,
                    numClasses: this.numClasses
                })
            });
            
            const result = await metadataResponse.json();
            
            if (!result.success) {
                console.error('Error saving metadata:', result.error);
            } else {
                console.log('Metadata saved successfully');
            }
            
        } catch (error) {
            console.error('Error saving model:', error);
            throw error;
        }
    },
    
    // Train model with latest interactions
    async trainModel() {
        // Skip if already training
        if (this.trainingInProgress) {
            console.log('Training already in progress, skipping');
            return;
        }
        
        this.trainingInProgress = true;
        
        try {
            console.log('Starting model training...');
            
            // Fetch interactions from server
            const response = await fetch('bot_handler.php?action=get_interactions');
            const data = await response.json();
            
            if (!data.success || !data.interactions || data.interactions.length === 0) {
                console.log('No interactions available for training');
                this.trainingInProgress = false;
                return;
            }
            
            const interactions = data.interactions;
            console.log(`Training with ${interactions.length} interactions`);
            
            // Update vocabulary with new words from interactions
            this.updateVocabulary(interactions);
            
            // Prepare training data
            const { inputs, targets } = this.prepareTrainingData(interactions);
            
            if (inputs.length === 0) {
                console.log('No valid training examples could be created');
                this.trainingInProgress = false;
                return;
            }
            
            // Convert to tensors
            const inputTensor = tf.tensor2d(inputs, [inputs.length, this.maxSeqLength]);
            const targetTensor = tf.tensor2d(targets, [targets.length, this.numClasses]);
            
            // Update training status in UI if it exists
            const statusEl = document.getElementById('bot-training-status');
            if (statusEl) {
                statusEl.textContent = 'Training in progress...';
            }
            
            // Train the model
            console.log('Training model...');
            const result = await this.model.fit(inputTensor, targetTensor, {
                epochs: 10,
                batchSize: Math.min(32, inputs.length),
                shuffle: true,
                validationSplit: 0.1,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                        if (statusEl) {
                            statusEl.textContent = `Training: Epoch ${epoch + 1}/${10}, Loss: ${logs.loss.toFixed(4)}`;
                        }
                    }
                }
            });
            
            console.log('Training complete:', result.history);
            
            // Clean up tensors
            inputTensor.dispose();
            targetTensor.dispose();
            
            // Save the updated model
            await this.saveModel();
            
            // Update training status in UI
            if (statusEl) {
                statusEl.textContent = 'Training complete. Last trained: ' + new Date().toLocaleTimeString();
            }
            
        } catch (error) {
            console.error('Error training model:', error);
            
            // Update error in UI
            const statusEl = document.getElementById('bot-training-status');
            if (statusEl) {
                statusEl.textContent = 'Training error: ' + error.message;
            }
        } finally {
            this.trainingInProgress = false;
        }
    },
    
    // Update vocabulary with new words
    updateVocabulary(interactions) {
        // Extract all words from user messages
        const allWords = new Set();
        
        interactions.forEach(interaction => {
            if (!interaction.userMessage) return;
            
            const tokens = interaction.userMessage.toLowerCase()
                .replace(/[^\w\s]/g, '')  // Remove punctuation
                .split(/\s+/)              // Split on whitespace
                .filter(token => token.length > 0);
            
            tokens.forEach(token => allWords.add(token));
        });
        
        // Find new words not in wordIndex
        const newWords = Array.from(allWords).filter(word => !this.wordIndex[word]);
        
        if (newWords.length === 0) {
            console.log('No new words to add to vocabulary');
            return;
        }
        
        // Add new words to wordIndex
        let nextIndex = Object.keys(this.wordIndex).length + 1;
        newWords.forEach(word => {
            this.wordIndex[word] = nextIndex++;
        });
        
        // Update vocabSize if needed
        this.vocabSize = Math.max(this.vocabSize, nextIndex);
        
        console.log(`Added ${newWords.length} new words to vocabulary. Total: ${Object.keys(this.wordIndex).length}`);
    },
    
    // Prepare training data from interactions
    prepareTrainingData(interactions) {
        const inputs = [];
        const targets = [];
        
        interactions.forEach(interaction => {
            if (!interaction.userMessage || !interaction.botResponse) return;
            
            // Tokenize user message
            const tokens = interaction.userMessage.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(token => token.length > 0);
            
            if (tokens.length === 0) return;
            
            // Convert tokens to numeric indices
            const indices = tokens.map(token => this.wordIndex[token] || 0);
            
            // Pad sequence to maxSeqLength
            const paddedIndices = this.padSequence(indices);
            
            // Determine appropriate response class
            const responseClass = this.findResponseClass(interaction.botResponse);
            
            // Create one-hot encoded target
            const target = Array(this.numClasses).fill(0);
            target[responseClass] = 1;
            
            // Add to training data
            inputs.push(paddedIndices);
            targets.push(target);
        });
        
        console.log(`Created ${inputs.length} training examples with ${this.numClasses} classes`);
        
        return { inputs, targets };
    },
    
    // Find the best response class for a bot response
    findResponseClass(botResponse) {
        if (!botResponse) return 0;
        
        // Try to find a matching response class
        for (let i = 0; i < this.responseClasses.length; i++) {
            if (botResponse.includes(this.responseClasses[i].substring(0, 10))) {
                return i;
            }
        }
        
        // If no match and we have space, add as new response class
        if (this.responseClasses.length < this.numClasses) {
            const newIndex = this.responseClasses.length;
            this.responseClasses.push(botResponse);
            return newIndex;
        }
        
        // Otherwise use the most similar existing class
        return this.findMostSimilarResponse(botResponse);
    },
    
    // Find most similar response class
    findMostSimilarResponse(botResponse) {
        let bestMatch = 0;
        let highestScore = 0;
        
        // Simple word overlap similarity
        const responseWords = new Set(
            botResponse.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 0)
        );
        
        this.responseClasses.forEach((classText, index) => {
            const classWords = new Set(
                classText.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(w => w.length > 0)
            );
            
            // Count word overlap
            let overlap = 0;
            responseWords.forEach(word => {
                if (classWords.has(word)) overlap++;
            });
            
            // Normalize by total unique words
            const totalWords = new Set([...responseWords, ...classWords]).size;
            const score = totalWords > 0 ? overlap / totalWords : 0;
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = index;
            }
        });
        
        return bestMatch;
    },
    
    // Pad sequence to maxSeqLength
    padSequence(sequence) {
        if (sequence.length >= this.maxSeqLength) {
            return sequence.slice(0, this.maxSeqLength);
        }
        
        const padding = Array(this.maxSeqLength - sequence.length).fill(0);
        return [...padding, ...sequence];
    },
    
    // Generate response for a user message
    async generateResponse(message) {
        if (!this.model || !window.tf) {
            throw new Error('TensorFlow model not loaded');
        }
        
        try {
            // Tokenize message
            const tokens = message.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(token => token.length > 0);
            
            if (tokens.length === 0) {
                return "I didn't understand that. Could you try saying it differently?";
            }
            
            // Convert tokens to indices
            const indices = tokens.map(token => this.wordIndex[token] || 0);
            
            // Pad sequence
            const paddedIndices = this.padSequence(indices);
            
            // Convert to tensor
            const inputTensor = tf.tensor2d([paddedIndices], [1, this.maxSeqLength]);
            
            // Get prediction
            const prediction = this.model.predict(inputTensor);
            const predictionData = await prediction.data();
            
            // Find class with highest probability
            let maxIndex = 0;
            let maxProb = 0;
            
            for (let i = 0; i < predictionData.length; i++) {
                if (predictionData[i] > maxProb) {
                    maxProb = predictionData[i];
                    maxIndex = i;
                }
            }
            
            // Cleanup
            inputTensor.dispose();
            prediction.dispose();
            
            // Return response from class
            if (maxIndex < this.responseClasses.length) {
                return this.responseClasses[maxIndex];
            } else {
                return "I'm not sure how to respond to that yet.";
            }
            
        } catch (error) {
            console.error('Error generating response:', error);
            return "I encountered an error processing that. My neural network is still learning.";
        }
    },
    
    // Setup admin panel
    setupAdminPanel() {
        // Check if admin panel container exists
        const container = document.getElementById('bot-admin-panel');
        if (!container) return;
        
        // Create admin panel UI
        container.innerHTML = `
            <div class="bot-admin-header">
                <h3>TensorFlow Bot Trainer</h3>
                <div id="bot-training-status">Ready</div>
            </div>
            <div class="bot-admin-content">
                <div class="bot-admin-stats">
                    <div class="stat-item">
                        <div class="stat-label">Vocabulary Size:</div>
                        <div class="stat-value" id="bot-vocab-size">${Object.keys(this.wordIndex).length}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Response Classes:</div>
                        <div class="stat-value" id="bot-class-count">${this.responseClasses.length}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Model Status:</div>
                        <div class="stat-value" id="bot-model-status">${this.model ? 'Loaded' : 'Not Loaded'}</div>
                    </div>
                </div>
                <div class="bot-admin-controls">
                    <button id="train-bot-btn" class="btn btn-primary">Train Model Now</button>
                    <button id="reset-bot-btn" class="btn btn-danger">Reset Bot</button>
                    <button id="test-bot-btn" class="btn btn-secondary">Test Bot</button>
                </div>
                <div class="bot-test-area hidden" id="bot-test-area">
                    <input type="text" id="bot-test-input" placeholder="Type a test message...">
                    <button id="bot-test-send" class="btn btn-primary">Send</button>
                    <div id="bot-test-response"></div>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('train-bot-btn').addEventListener('click', () => this.trainModel());
        document.getElementById('reset-bot-btn').addEventListener('click', () => this.resetBot());
        document.getElementById('test-bot-btn').addEventListener('click', () => {
            document.getElementById('bot-test-area').classList.toggle('hidden');
        });
        
        document.getElementById('bot-test-send').addEventListener('click', () => {
            const input = document.getElementById('bot-test-input');
            const response = document.getElementById('bot-test-response');
            
            if (!input.value.trim()) return;
            
            response.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Generating response...</div>';
            
            this.generateResponse(input.value)
                .then(result => {
                    response.innerHTML = '<div class="test-result">' + result + '</div>';
                })
                .catch(error => {
                    response.innerHTML = '<div class="test-error">Error: ' + error.message + '</div>';
                });
        });
    },
    
    // Reset bot
    async resetBot() {
        if (!confirm('Are you sure you want to reset the bot? This will delete all training data and model.')) {
            return;
        }
        
        try {
            // Delete model from IndexedDB
            await tf.removeModel('indexeddb://forum-bot-model');
            
            // Reset server data
            const response = await fetch('bot_handler.php?action=reset_bot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: prompt('Enter admin password:')
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Bot reset successfully. Refreshing page...');
                window.location.reload();
            } else {
                alert('Error resetting bot: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error resetting bot:', error);
            alert('Error resetting bot: ' + error.message);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Load TensorFlow and initialize trainer
    BotTrainer.init()
        .then(() => {
            // Make the trainer available globally for testing
            window.BotTrainer = BotTrainer;
            console.log('BotTrainer initialized and available as window.BotTrainer');
        })
        .catch(error => {
            console.error('Error initializing BotTrainer:', error);
        });
});