// nn-bot.js - Client-side neural network bot implementation

// Simplified version of CleverBot2 for fast responses
class NNBot {
    constructor() {
        this.modelLoaded = false;
        this.ready = false;
        this.consentGiven = false;
        this.replyConsentGiven = false;
        this.userId = null;
        this.token = null;
    }
    
    // Initialize the bot with user information
    async initialize(userId, token) {
        this.userId = userId;
        this.token = token;
        
        try {
            // Check consent status
            const response = await fetch('api.php?action=check_nn_consent', {
                method: 'POST',
                body: JSON.stringify({
                    userId: userId,
                    token: token
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.consentGiven = data.consent.data_collection;
                this.replyConsentGiven = data.consent.ai_replies;
            }
            
            // Load model if consent given
            if (this.consentGiven) {
                await this.loadModel();
            }
            
            this.ready = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize NN Bot:', error);
            return false;
        }
    }
    
    // Load the neural network model
    async loadModel() {
        // This would load the model from server
        // For this simplified version, we'll just simulate model loading
        console.log('Loading NN model...');
        
        // Simulate model loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.modelLoaded = true;
        console.log('NN model loaded');
    }
    
    // Generate a reply based on content
    async generateReply(postContent, postTitle) {
        if (!this.modelLoaded) {
            await this.loadModel();
        }
        
        // In a real implementation, this would use the loaded model
        // to generate a response based on the post content
        
        // For now, we'll use a simple Markov-like approach
        const words = this.extractWords(postContent + ' ' + postTitle);
        const generatedText = this.generateMarkovText(words, 50);
        
        return {
            content: generatedText,
            confidence: Math.random() * 0.5 + 0.5 // Random confidence between 0.5 and 1.0
        };
    }
    
    // Extract words from text
    extractWords(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }
    
    // Simple Markov chain for text generation
    generateMarkovText(words, maxLength) {
        if (words.length < 3) {
            return "Insufficient content for meaningful response.";
        }
        
        // Build simple Markov chain
        const chain = {};
        for (let i = 0; i < words.length - 2; i++) {
            const key = words[i] + ' ' + words[i + 1];
            if (!chain[key]) {
                chain[key] = [];
            }
            chain[key].push(words[i + 2]);
        }
        
        // Generate text
        let currentKey = words[0] + ' ' + words[1];
        let result = currentKey;
        
        for (let i = 0; i < maxLength; i++) {
            if (!chain[currentKey]) {
                break;
            }
            
            const nextWord = chain[currentKey][Math.floor(Math.random() * chain[currentKey].length)];
            result += ' ' + nextWord;
            
            const words = result.split(' ');
            currentKey = words[words.length - 2] + ' ' + words[words.length - 1];
        }
        
        return result;
    }
    
    // Update user consent
    async updateConsent(consentType, status) {
        try {
            const response = await fetch('api.php?action=update_nn_consent', {
                method: 'POST',
                body: JSON.stringify({
                    userId: this.userId,
                    token: this.token,
                    consentType: consentType,
                    status: status
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (consentType === 'data_collection') {
                    this.consentGiven = status;
                } else if (consentType === 'ai_replies') {
                    this.replyConsentGiven = status;
                }
                
                // Load model if needed
                if (status && !this.modelLoaded && consentType === 'data_collection') {
                    await this.loadModel();
                }
            }
            
            return data;
        } catch (error) {
            console.error('Failed to update consent:', error);
            return { success: false, error: 'Network error' };
        }
    }
}

// Initialize bot
const nnBot = new NNBot();

// UI for consent dialogs
function showConsentDialog() {
    // Create modal for NN consent
    const modal = document.createElement('div');
    modal.className = 'nn-consent-modal';
    modal.innerHTML = `
        <div class="nn-consent-container">
            <h2><i class="fas fa-robot"></i> AI Features Consent</h2>
            <p>This forum includes advanced neural network features that can enhance your experience:</p>
            
            <div class="consent-option">
                <h3>Data Collection for Training</h3>
                <p>Allow the system to collect and encrypt your posts and replies to train the AI model.</p>
                <div class="consent-toggle">
                    <label class="switch">
                        <input type="checkbox" id="data-collection-consent">
                        <span class="slider round"></span>
                    </label>
                    <span class="toggle-label">Opt-in</span>
                </div>
            </div>
            
            <div class="consent-option">
                <h3>AI-Generated Replies</h3>
                <p>Allow AI to generate replies on your posts based on their content.</p>
                <div class="consent-toggle">
                    <label class="switch">
                        <input type="checkbox" id="ai-replies-consent">
                        <span class="slider round"></span>
                    </label>
                    <span class="toggle-label">Opt-in</span>
                </div>
            </div>
            
            <p class="note">You can change these settings at any time in your profile.</p>
            
            <div class="consent-actions">
                <button id="save-consent" class="btn btn-primary">Save Preferences</button>
                <button id="cancel-consent" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('save-consent').addEventListener('click', async () => {
        const dataConsent = document.getElementById('data-collection-consent').checked;
        const repliesConsent = document.getElementById('ai-replies-consent').checked;
        
        await nnBot.updateConsent('data_collection', dataConsent);
        await nnBot.updateConsent('ai_replies', repliesConsent);
        
        // Show toast confirmation
        showToast('AI preferences saved successfully', 'success');
        
        // Remove modal
        document.body.removeChild(modal);
    });
    
    document.getElementById('cancel-consent').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}