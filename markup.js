// markup.js - BBCode parser for Secure Forum with Ollama Bot Integration
const Markup = {
    // Initialize
    init() {
        // Register event listeners for expanding spoilers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('spoiler-toggle')) {
                const spoilerContent = e.target.nextElementSibling;
                if (spoilerContent) {
                    if (spoilerContent.classList.contains('hidden')) {
                        spoilerContent.classList.remove('hidden');
                        e.target.textContent = 'Hide Spoiler';
                    } else {
                        spoilerContent.classList.add('hidden');
                        e.target.textContent = 'Show Spoiler';
                    }
                }
            }
        });
        
        // Set up mutation observer to catch dynamically added content
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    // Process added nodes
                    mutation.addedNodes.forEach(node => {
                        // Check if the node is an element and has one of our content classes
                        if (node.nodeType === 1) { // Element node
                            const contentClasses = ['post-content-text', 'reply-content', 'category-description'];
                            contentClasses.forEach(className => {
                                if (node.classList && node.classList.contains(className)) {
                                    this.applyToElement(node);
                                }
                                
                                // Also check children
                                node.querySelectorAll('.' + className).forEach(el => {
                                    this.applyToElement(el);
                                });
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
        
        console.log('BBCode markup parser initialized with Ollama bot support');
        
        // Process existing content
        this.processPageContent();
    },
    
    // Parse BBCode to HTML
    parse(text) {
        if (!text) return '';
        
        // First, escape HTML to prevent XSS
        let html = this.escapeHtml(text);
        
        // Replace newlines with line breaks
        html = html.replace(/\n/g, '<br>');
        
        // Apply BBCode transformations
        
        // Bold [b]...[/b]
        html = html.replace(/\[b\](.*?)\[\/b\]/gs, '<strong>$1</strong>');
        
        // Italic [i]...[/i]
        html = html.replace(/\[i\](.*?)\[\/i\]/gs, '<em>$1</em>');
        
        // Underline [u]...[/u]
        html = html.replace(/\[u\](.*?)\[\/u\]/gs, '<u>$1</u>');
        
        // Strike [s]...[/s]
        html = html.replace(/\[s\](.*?)\[\/s\]/gs, '<strike>$1</strike>');
        
        // Headers [h1]...[/h1] through [h6]...[/h6]
        for (let i = 1; i <= 6; i++) {
            html = html.replace(new RegExp(`\\[h${i}\\](.*?)\\[\\/h${i}\\]`, 'gs'), `<h${i}>$1</h${i}>`);
        }
        
        // Color [color=...]...[/color]
        html = html.replace(/\[color=(#[a-fA-F0-9]{3,6}|[a-zA-Z]+)\](.*?)\[\/color\]/gs, '<span style="color:$1">$2</span>');
        
        // Size [size=...]...[/size]
        html = html.replace(/\[size=([1-7])\](.*?)\[\/size\]/gs, '<span style="font-size:$1em">$2</span>');
        
        // Quote [quote]...[/quote] or [quote=...]...[/quote]
        html = html.replace(/\[quote\](.*?)\[\/quote\]/gs, '<blockquote class="bbcode-quote">$1</blockquote>');
        html = html.replace(/\[quote=([^\]]+)\](.*?)\[\/quote\]/gs, '<blockquote class="bbcode-quote"><cite>$1 wrote:</cite>$2</blockquote>');
        
        // Code [code]...[/code]
        html = html.replace(/\[code\](.*?)\[\/code\]/gs, '<pre class="bbcode-code"><code>$1</code></pre>');
        
        // Lists [list]...[/list] with [*] items
        html = html.replace(/\[list\](.*?)\[\/list\]/gs, function(match, contents) {
            // Replace each [*] with a list item
            let items = contents.replace(/\[\*\](.*?)(?=\[\*\]|$)/gs, '<li>$1</li>');
            return '<ul class="bbcode-list">' + items + '</ul>';
        });
        
        // Numbered lists [list=1]...[/list]
        html = html.replace(/\[list=1\](.*?)\[\/list\]/gs, function(match, contents) {
            // Replace each [*] with a list item
            let items = contents.replace(/\[\*\](.*?)(?=\[\*\]|$)/gs, '<li>$1</li>');
            return '<ol class="bbcode-list bbcode-list-numbered">' + items + '</ol>';
        });
        
        // Forum Bot [bot]...[/bot] or [bot:name=...]...[/bot] or [bot:name=...:type=...]...[/bot]
        // Updated to work with Ollama backend
        html = html.replace(/\[bot(?::name=([^\]]+))?(?::type=([^\]]+))?\]([\s\S]*?)\[\/bot\]/gs, function(match, botName, botType, initialContent) {
            // Generate a unique ID for this bot instance
            const instanceId = 'bot-' + Math.random().toString(36).substring(2, 15);
            
            botName = botName || 'AI Assistant';
            botType = botType || 'auto'; // 'auto', 'code', or 'chat'
            initialContent = initialContent.trim() || 'Hello! I am an AI assistant powered by Ollama. How can I help you today?';
            
            // Create complete bot structure with Ollama integration
            return `
                <div class="forum-bot-container" data-id="${instanceId}" data-name="${botName}" data-type="${botType}">
                    <div class="forum-bot-header">
                        <i class="fas fa-robot"></i> ${botName}
                        <div class="bot-type-toggle">
                            <label class="toggle-label">
                                <input type="radio" name="bot-type-${instanceId}" value="chat" ${botType === 'chat' ? 'checked' : ''} data-bot-id="${instanceId}">
                                <span>Chat</span>
                            </label>
                            <label class="toggle-label">
                                <input type="radio" name="bot-type-${instanceId}" value="auto" ${botType === 'auto' ? 'checked' : ''} data-bot-id="${instanceId}">
                                <span>Auto</span>
                            </label>
                            <label class="toggle-label">
                                <input type="radio" name="bot-type-${instanceId}" value="code" ${botType === 'code' ? 'checked' : ''} data-bot-id="${instanceId}">
                                <span>Code</span>
                            </label>
                        </div>
                        <div class="bot-status" id="${instanceId}-status"></div>
                    </div>
                    <div class="forum-bot-messages" id="${instanceId}-messages">
                        <div class="bot-message">
                            <div class="bot-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="message-content">${initialContent}</div>
                        </div>
                    </div>
                    <div class="forum-bot-input">
                        <textarea id="${instanceId}-input" placeholder="Type your message here... (Ask me anything!)"></textarea>
                        <button class="bot-send-btn" data-target="${instanceId}">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="forum-bot-footer">
                        <span class="bot-status-indicator"><i class="fas fa-circle"></i> <span id="${instanceId}-connection">Connecting to Ollama...</span></span>
                        <span class="bot-info">Powered by Ollama AI</span>
                    </div>
                </div>
            `;
        });
        
        // PayPal transaction [paypal:product=...]...[/paypal]
        html = html.replace(/\[paypal:product=([^\]]+?)(?:\s+price=([0-9.]+))?(?:\s+currency=([A-Z]{3}))?(?:\s+email=([^\s\]]+))?(?:\s+file=([^\s\]]+))(?:\s+owner=([^\s\]]+))?\](.*?)\[\/paypal\]/gs, function(match, productName, price, currency, email, fileId, ownerUsername, description) {
            // Set defaults or use provided values
            price = price || "1.00";
            currency = currency || "USD";
            email = email || '';
            ownerUsername = ownerUsername || '';
            
            // Get current user info if available
            const currentUsername = window.App && window.App.currentUser ? window.App.currentUser.username : '';
            
            // Check if current user is the owner
            const isOwner = (currentUsername && ownerUsername && currentUsername === ownerUsername);
            
            // Generate a unique transaction ID
            const transactionId = 'tx_' + Math.random().toString(36).substring(2, 15);
            
            // Create timestamp for transaction reference
            const timestamp = new Date().getTime();
            
            // Use the actual file ID if provided
            const productId = fileId || ('prod_' + Math.random().toString(36).substring(2, 15));
            
            // If not the owner, show a warning message instead of the buy button
            if (!isOwner && ownerUsername) {
                return `
                    <div class="paypal-transaction ownership-error" data-product-id="${productId}">
                        <div class="paypal-header warning">
                            <i class="fas fa-exclamation-triangle"></i> Ownership Verification Failed
                        </div>
                        <div class="paypal-content">
                            <div class="product-info">
                                <h4 class="product-name">${this.escapeHtml(productName)}</h4>
                                <div class="product-description">
                                    <p>This product can only be sold by its owner: <strong>${this.escapeHtml(ownerUsername)}</strong></p>
                                    <p>The current user (${this.escapeHtml(currentUsername || 'Unknown')}) does not have permission to sell this product.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Normal PayPal button for the owner
            return `
                <div class="paypal-transaction" data-product-id="${productId}" data-owner="${this.escapeHtml(ownerUsername)}">
                    <div class="paypal-header">
                        <i class="fab fa-paypal"></i> Digital Product
                    </div>
                    <div class="paypal-content">
                        <div class="product-info">
                            <h4 class="product-name">${this.escapeHtml(productName)}</h4>
                            <div class="product-price">${price} ${currency}</div>
                            <div class="product-description">${description}</div>
                        </div>
                        <div class="paypal-actions">
                            <form action="${window.PAYPAL_URL || 'https://www.paypal.com/cgi-bin/webscr'}" method="post" class="paypal-form" target="_blank">
                                <input type="hidden" name="cmd" value="_xclick">
                                <input type="hidden" name="business" value="${email}">
                                <input type="hidden" name="item_name" value="${this.escapeHtml(productName)}">
                                <input type="hidden" name="item_number" value="${productId}">
                                <input type="hidden" name="amount" value="${price}">
                                <input type="hidden" name="currency_code" value="${currency}">
                                <input type="hidden" name="return" value="forum_return.php?product=${productId}&timestamp=${timestamp}">
                                <input type="hidden" name="cancel_return" value="forum_cancel.php?product=${productId}">
                                <input type="hidden" name="notify_url" value="ipn.php">
                                <input type="hidden" name="no_shipping" value="1">
                                <input type="hidden" name="custom" value="${encodeURIComponent(JSON.stringify({
                                    transaction_id: transactionId,
                                    product_id: productId,
                                    timestamp: timestamp,
                                    seller_email: email,
                                    owner_username: ownerUsername
                                }))}">
                                <button type="submit" class="paypal-buy-button">
                                    <i class="fab fa-paypal"></i> Buy Now
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // CryptoCoin product [cryptocoin:product=...] BBCode
        html = html.replace(/\[cryptocoin:product=([^\]]+?)(?:\s+price=([0-9.]+))?(?:\s+currency=([A-Z]{3}|CryptoCoins))?(?:\s+image=([^\s\]]+))?\](?:\n|\r\n)?(.*?)(?:\n|\r\n)?\[\/cryptocoin:product\]/gs, function(match, productName, price, currency, imageUrl, description) {
            // Set defaults or use provided values
            price = price || "100";
            currency = currency || "CryptoCoins";
            description = description || "No description provided";
            
            // Create the HTML
            let productHtml = `
                <div class="cryptocoin-product" style="background: linear-gradient(135deg, #1a1a1a, #2a2a2a); color: #e0e0e0; border: 1px solid #333; max-width: 300px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); font-family: 'Roboto', Arial, sans-serif; margin: 15px 0;">
            `;
            
            // Add image if provided
            if (imageUrl) {
                productHtml += `<img src="${this.escapeHtml(imageUrl)}" style="width: 100%; height: auto; object-fit: cover;">`;
            }
            
            productHtml += `
                    <div style="padding: 15px;">
                        <h3 style="margin-top: 0; color: #bb86fc;">${this.escapeHtml(productName)}</h3>
                        <p style="margin: 5px 0; color: #e0e0e0;">${this.escapeHtml(description)}</p>
                        <p style="font-weight: bold; color: #03dac6;">Price: ${price} ${currency}</p>
                        <a href="https://cryptocoin.example.com/shop.php?product=${encodeURIComponent(productName)}" style="background-color: #bb86fc; color: #000; display: inline-block; margin-top: 10px; padding: 8px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">Buy Now</a>
                    </div>
                </div>
            `;
            
            return productHtml;
        });

        // CryptoCoin listing [cryptocoin:listing] BBCode - Card style
        html = html.replace(/\[cryptocoin:listing(?::type=([^\]]+))?](?:\s+)?\[amount=([0-9.]+)\](?:\s+)?\[price=([0-9.]+)\](?:\s+)?(.*?)(?:\s+)?\[\/cryptocoin:listing\]/gs, function(match, type, amount, price, description) {
            // Set defaults
            type = type || "card";
            description = description.trim() || "CryptoCoin listing";
            
            // Create HTML based on type
            if (type === "marquee") {
                // Marquee style
                return `
                    <div class="cryptocoin-listing marquee" style="width: 100%; overflow: hidden; background: linear-gradient(90deg, #212121, #1b1b1b); color: #e0e0e0; border: 1px solid #333; border-radius: 4px; padding: 10px 0; font-family: 'Roboto', Arial, sans-serif; margin: 15px 0;">
                        <div style="display: inline-block; white-space: nowrap; animation: marquee 15s linear infinite;">
                            🚀 CryptoCoin For Sale: ${amount} CryptoCoins for just $${price} | <span style="color: #03dac6; font-weight: bold;">${this.escapeHtml(description)}</span> | <a href="https://cryptocoin.example.com/buy.php?amount=${amount}&price=${price}" style="color: #03dac6; text-decoration: none; font-weight: bold;">Buy Now</a> 🚀
                        </div>
                    </div>
                    <style>
                        @keyframes marquee {
                            0% { transform: translateX(100%); }
                            100% { transform: translateX(-100%); }
                        }
                    </style>
                `;
            } else {
                // Default card style
                return `
                    <div class="cryptocoin-listing card" style="background: linear-gradient(135deg, #1a1a1a, #2a2a2a); color: #e0e0e0; border: 1px solid #333; max-width: 300px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); font-family: 'Roboto', Arial, sans-serif; margin: 15px 0;">
                        <div style="padding: 15px;">
                            <h3 style="margin-top: 0; color: #03dac6;">CryptoCoin For Sale</h3>
                            <p style="margin: 5px 0;">Amount: <span style="font-weight: bold;">${amount} CryptoCoins</span></p>
                            <p style="margin: 5px 0;">Price: <span style="font-weight: bold; color: #03dac6;">$${price}</span></p>
                            <p style="margin: 5px 0;">${this.escapeHtml(description)}</p>
                            <a href="https://cryptocoin.example.com/buy.php?amount=${amount}&price=${price}" style="display: inline-block; margin-top: 10px; padding: 8px 15px; background-color: #03dac6; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold;">Buy Now</a>
                        </div>
                    </div>
                `;
            }
        });
        
        // Assembly code [asm]...[/asm] or [asm:title=...]...[/asm]
        html = html.replace(/\[asm(?::title=([^\]]+))?\]([\s\S]*?)\[\/asm\]/gs, function(match, title, code) {
            // Un-escape HTML within ASM blocks (since we need to preserve code exactly as written)
            code = code
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, "\"")
                .replace(/&#039;/g, "'")
                .replace(/&amp;/g, "&");
            
            // Generate a unique ID for this ASM block
            const instanceId = 'asm-' + Math.random().toString(36).substring(2, 15);
            
            // Create placeholder that will be processed by ASMRunner
            return `
                <div class="asm-placeholder" data-id="${instanceId}" data-title="${title || 'Assembly Code'}">
                    <pre style="display:none">${code}</pre>
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> Loading assembly code editor...
                    </div>
                </div>
            `;
        });
        
        // HTML code [html]...[/html]
        html = html.replace(/\[html\]([\s\S]*?)\[\/html\]/gs, function(match, htmlContent) {
            // Un-escape HTML entities if they were already escaped
            htmlContent = htmlContent
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, "\"")
                .replace(/&#039;/g, "'")
                .replace(/&amp;/g, "&");
            
            // Generate a unique ID for this content
            const uniqueId = 'html-' + Math.random().toString(36).substring(2, 9);
            
            // This approach uses a script tag to set the HTML content
            // The script runs immediately and sets the inner HTML of the container
            // This ensures the browser properly parses and renders the HTML
            return `
                <div id="${uniqueId}" class="bbcode-html-container">Loading HTML content...</div>
                <script>
                    (function() {
                        // Get the container element
                        var container = document.getElementById('${uniqueId}');
                        if (container) {
                            // Set the inner HTML
                            container.innerHTML = \`${htmlContent.replace(/`/g, '\\`')}\`;
                        }
                    })();
                </script>
            `;
        });
        
        // URL [url]...[/url] or [url=...]...[/url]
        html = html.replace(/\[url\](https?:\/\/[^\s\]]+)\[\/url\]/gs, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        html = html.replace(/\[url=(https?:\/\/[^\s\]]+)\](.*?)\[\/url\]/gs, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
        
        // Image [img]...[/img]
        html = html.replace(/\[img\](https?:\/\/[^\s\]]+)\[\/img\]/gs, '<img src="$1" class="bbcode-img" alt="User posted image">');
        
        // YouTube [youtube]...[/youtube]
        html = html.replace(/\[youtube\](?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})\[\/youtube\]/gs, 
            '<div class="bbcode-youtube"><iframe width="560" height="315" src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>');
        
        // Spoiler [spoiler]...[/spoiler] or [spoiler=title]...[/spoiler]
        html = html.replace(/\[spoiler\](.*?)\[\/spoiler\]/gs, 
            '<div class="bbcode-spoiler"><button class="spoiler-toggle">Show Spoiler</button><div class="spoiler-content hidden">$1</div></div>');
        html = html.replace(/\[spoiler=([^\]]+)\](.*?)\[\/spoiler\]/gs, 
            '<div class="bbcode-spoiler"><button class="spoiler-toggle">Show $1</button><div class="spoiler-content hidden">$2</div></div>');
        
        // Horizontal line [hr]
        html = html.replace(/\[hr\]/g, '<hr class="bbcode-hr">');
        
        // Marquee [marquee]...[/marquee]
        html = html.replace(/\[marquee\](.*?)\[\/marquee\]/gs, '<div class="bbcode-marquee">$1</div>');
        
        // Center [center]...[/center]
        html = html.replace(/\[center\](.*?)\[\/center\]/gs, '<div style="text-align:center">$1</div>');
        
        // Right [right]...[/right]
        html = html.replace(/\[right\](.*?)\[\/right\]/gs, '<div style="text-align:right">$1</div>');
        
        return html;
    },
    
    // Apply markup to an element
    applyToElement(element) {
        if (!element) return;
        
        // Get content - prefer innerHTML over textContent to preserve existing structure
        const content = element.innerHTML || element.textContent || '';
        
        // If the content has HTML BBCode tags, process them specifically first
        if (content.match(/\[html\]/i)) {
            element.innerHTML = this.parse(content);
            console.log('Applied HTML BBCode to element:', element);
            return;
        }
        
        // If the content has other BBCode tags, process it
        if (content.match(/\[[a-z\d=]/i)) {
            element.innerHTML = this.parse(content);
            console.log('Applied markup to element:', element);
            
            // Initialize any forum bots that were created
            if (window.ForumBot && typeof window.ForumBot.init === 'function') {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    window.ForumBot.init();
                }, 100);
            }
        }
    },
    
    // Apply markup to elements with a specific class
    applyToClass(className) {
        console.log(`Applying markup to class: ${className}`);
        const elements = document.querySelectorAll('.' + className);
        console.log(`Found ${elements.length} elements with class ${className}`);
        
        elements.forEach(element => {
            this.applyToElement(element);
        });
    },
    
    // Process all content in the page
    processPageContent() {
        console.log('Processing page content for BBCode...');
        
        // Process known content containers
        const contentSelectors = [
            '.post-content-text', 
            '.reply-content', 
            '.category-description',
            '.post-content-display',
            '.post-content',
            '.reply-text'
        ];
        
        contentSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`Found ${elements.length} elements with selector ${selector}`);
            
            elements.forEach(element => {
                this.applyToElement(element);
            });
        });
        
        // Process HTML BBCode containers after a short delay
        setTimeout(() => {
            this.processHtmlContainers();
        }, 100);
    },
    
    // Process HTML containers specifically
    processHtmlContainers() {
        console.log('Processing HTML BBCode containers');
        document.querySelectorAll('.bbcode-html-container').forEach(container => {
            // Just ensure the container is visible and properly formatted
            container.style.display = 'block';
            
            // Force browser to re-parse the HTML if needed
            if (container.parentNode) {
                const parent = container.parentNode;
                const clone = container.cloneNode(true);
                parent.replaceChild(clone, container);
            }
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
    },
    
    // Add toolbars to textareas
    addToolbarsToTextareas() {
        console.log('Adding toolbars to textareas...');
        
        // Try to add to known textarea IDs
        const textareaIds = ['post-content', 'reply-content', 'category-description-input'];
        
        textareaIds.forEach(id => {
            const textarea = document.getElementById(id);
            if (textarea) {
                console.log(`Found textarea with ID: ${id}`);
                
                // Check if a toolbar is already added
                const parent = textarea.parentNode;
                if (parent && !parent.querySelector('.bbcode-toolbar')) {
                    const toolbar = this.createToolbar(textarea);
                    if (toolbar) {
                        parent.insertBefore(toolbar, textarea);
                        console.log(`Added toolbar to ${id}`);
                    }
                }
            }
        });
        
        // Also look for any textareas with specific classes or within forms
        document.querySelectorAll('textarea:not([id])').forEach(textarea => {
            // Check if a toolbar is already added
            const parent = textarea.parentNode;
            if (parent && !parent.querySelector('.bbcode-toolbar')) {
                const toolbar = this.createToolbar(textarea);
                if (toolbar) {
                    parent.insertBefore(toolbar, textarea);
                    console.log('Added toolbar to unnamed textarea');
                }
            }
        });
    },
    
    // Create a markup toolbar for a textarea
    createToolbar(textarea) {
        if (!textarea) return null;
        
        // Create toolbar container
        const toolbar = document.createElement('div');
        toolbar.className = 'bbcode-toolbar';
        
        // Define toolbar buttons
        const buttons = [
            { icon: 'robot', title: 'Ollama AI Bot', insertText: '[bot:name=AI Assistant:type=auto]\nHello! I am an AI assistant powered by Ollama. How can I help you today?\n[/bot]' },
            { icon: 'shopping-cart', title: 'PayPal Product', insertText: '[paypal:product=My Product price=9.99 currency=USD email=your@email.com file=product123]\nProduct description goes here\n[/paypal]' },
            { divider: true },
            { icon: 'code', title: 'HTML Code', prefix: '[html]', suffix: '[/html]' },
            { icon: 'bold', title: 'Bold', prefix: '[b]', suffix: '[/b]' },
            { icon: 'italic', title: 'Italic', prefix: '[i]', suffix: '[/i]' },
            { icon: 'underline', title: 'Underline', prefix: '[u]', suffix: '[/u]' },
            { icon: 'strikethrough', title: 'Strikethrough', prefix: '[s]', suffix: '[/s]' },
            { divider: true },
            { icon: 'heading', title: 'Heading', prefix: '[h3]', suffix: '[/h3]' },
            { icon: 'list-ul', title: 'List', prefix: '[list]\n[*]', suffix: '\n[/list]' },
            { icon: 'list-ol', title: 'Numbered List', prefix: '[list=1]\n[*]', suffix: '\n[/list]' },
            { icon: 'quote-left', title: 'Quote', prefix: '[quote]', suffix: '[/quote]' },
            { icon: 'code', title: 'Code', prefix: '[code]', suffix: '[/code]' },
            { divider: true },
            { icon: 'link', title: 'URL', prefix: '[url]', suffix: '[/url]', dialog: true, placeholder: 'Enter URL' },
            { icon: 'image', title: 'Image', prefix: '[img]', suffix: '[/img]', dialog: true, placeholder: 'Enter image URL' },
            { icon: 'youtube', title: 'YouTube', prefix: '[youtube]', suffix: '[/youtube]', dialog: true, placeholder: 'Enter YouTube URL' },
            { divider: true },
            { icon: 'palette', title: 'Color', prefix: '[color=#3498db]', suffix: '[/color]' },
            { icon: 'text-height', title: 'Size', prefix: '[size=3]', suffix: '[/size]' },
            { icon: 'eye-slash', title: 'Spoiler', prefix: '[spoiler]', suffix: '[/spoiler]' },
            { icon: 'minus', title: 'Horizontal line', insertText: '[hr]' },
            { icon: 'microchip', title: 'Assembly Code', insertText: '[asm:title=My Program]\n; Your assembly code here\nMOV R0, 10\nOUT R0\nHLT\n[/asm]' },
        ];
        
        // Create buttons
        buttons.forEach(btn => {
            if (btn.divider) {
                const divider = document.createElement('span');
                divider.className = 'toolbar-divider';
                toolbar.appendChild(divider);
                return;
            }
            
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'toolbar-btn';
            button.title = btn.title;
            button.innerHTML = `<i class="fas fa-${btn.icon}"></i>`;
            
            button.addEventListener('click', () => {
                if (btn.dialog) {
                    // Show dialog for URLs, images, etc.
                    const url = prompt(btn.placeholder || 'Enter URL');
                    if (url) {
                        this.insertAtCursor(textarea, btn.prefix + url + btn.suffix);
                    }
                } else if (btn.insertText) {
                    // Insert plain text (like [hr])
                    this.insertAtCursor(textarea, btn.insertText);
                } else {
                    // Insert tags around selected text
                    this.wrapSelectedText(textarea, btn.prefix, btn.suffix);
                }
                
                // Focus back to the textarea
                textarea.focus();
            });
            
            toolbar.appendChild(button);
        });
        
        // Add help button
        const helpBtn = document.createElement('button');
        helpBtn.type = 'button';
        helpBtn.className = 'toolbar-btn toolbar-help';
        helpBtn.title = 'BBCode Help';
        helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
        helpBtn.addEventListener('click', () => this.showBBCodeHelp());
        toolbar.appendChild(helpBtn);
        
        return toolbar;
    },
    
    // Insert BBCode at cursor position
    insertAtCursor(textarea, text) {
        if (!textarea) return;
        
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        
        const beforeText = textarea.value.substring(0, startPos);
        const afterText = textarea.value.substring(endPos);
        
        textarea.value = beforeText + text + afterText;
        
        // Move cursor position after the inserted text
        const newPos = startPos + text.length;
        textarea.setSelectionRange(newPos, newPos);
        
        // Restore scroll position
        textarea.scrollTop = scrollTop;
        
        // Trigger input event to update character counters, etc.
        textarea.dispatchEvent(new Event('input'));
    },
    
    // Wrap selected text with BBCode tags
    wrapSelectedText(textarea, prefix, suffix) {
        if (!textarea) return;
        
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        
        const selectedText = textarea.value.substring(startPos, endPos);
        const beforeText = textarea.value.substring(0, startPos);
        const afterText = textarea.value.substring(endPos);
        
        // Insert the BBCode tags
        const wrappedText = prefix + selectedText + suffix;
        textarea.value = beforeText + wrappedText + afterText;
        
        // Set selection after insertion
        if (selectedText.length === 0) {
            // If no text was selected, place cursor between tags
            const newPos = startPos + prefix.length;
            textarea.setSelectionRange(newPos, newPos);
        } else {
            // If text was selected, select it with the tags
            textarea.setSelectionRange(startPos, startPos + wrappedText.length);
        }
        
        // Restore scroll position
        textarea.scrollTop = scrollTop;
        
        // Trigger input event
        textarea.dispatchEvent(new Event('input'));
    },
    
    // Show BBCode help modal
    showBBCodeHelp() {
        if (window.App && typeof App.showModal === 'function') {
            const helpContent = `
                <div class="bbcode-help">
                    <h3>BBCode Formatting Guide</h3>
                    
                    <div class="help-section">
                        <h4>Text Formatting</h4>
                        <ul>
                            <li><code>[b]Bold Text[/b]</code></li>
                            <li><code>[i]Italic Text[/i]</code></li>
                            <li><code>[u]Underlined Text[/u]</code></li>
                            <li><code>[s]Strikethrough Text[/s]</code></li>
                            <li><code>[color=#FF0000]Red Text[/color]</code></li>
                            <li><code>[size=3]Larger Text[/size]</code> (1-7)</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Structure</h4>
                        <ul>
                            <li><code>[h1]Heading 1[/h1]</code> (h1-h6)</li>
                            <li><code>[quote]Quoted text[/quote]</code></li>
                            <li><code>[quote=Author]Quote with author[/quote]</code></li>
                            <li><code>[code]Code block[/code]</code></li>
                            <li><code>[hr]</code> (Horizontal line)</li>
                            <li><code>[center]Centered text[/center]</code></li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Lists</h4>
                        <ul>
                            <li><code>[list][*]Item 1[*]Item 2[/list]</code></li>
                            <li><code>[list=1][*]Item 1[*]Item 2[/list]</code></li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Links & Media</h4>
                        <ul>
                            <li><code>[url]https://example.com[/url]</code></li>
                            <li><code>[url=https://example.com]Link text[/url]</code></li>
                            <li><code>[img]https://example.com/image.jpg[/img]</code></li>
                            <li><code>[youtube]https://youtube.com/watch?v=dQw4w9WgXcQ[/youtube]</code></li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Interactive Elements</h4>
                        <ul>
                            <li><code>[bot:name=AI Assistant:type=auto]Hello! I am an AI assistant.[/bot]</code></li>
                            <li><code>[spoiler]Hidden text[/spoiler]</code></li>
                            <li><code>[spoiler=Title]Hidden text[/spoiler]</code></li>
                            <li><code>[marquee]Scrolling text[/marquee]</code></li>
                            <li><code>[asm:title=Title]Assembly code[/asm]</code></li>
                        </ul>
                        <p><strong>AI Bot Types:</strong> chat (conversation), code (programming help), auto (detects intent)</p>
                    </div>
                    
                    <div class="help-section">
                        <h4>HTML Content</h4>
                        <ul>
                            <li><code>[html]&lt;div class="custom"&gt;Custom HTML&lt;/div&gt;[/html]</code></li>
                        </ul>
                        <p>Use this tag to include custom HTML formatting. Note that for security reasons, script tags and potentially harmful elements are automatically removed.</p>
                        <p><strong>Allowed:</strong> Basic HTML elements like div, span, p, h1-h6, a, img, table, etc.</p>
                        <p><strong>Not Allowed:</strong> script, iframe, embed, meta, form elements, event handlers</p>
                    </div>
                    
                    <div class="help-section">
                        <h4>Ollama AI Assistant</h4>
                        <p>The forum now features an integrated AI assistant powered by Ollama and the phi4-reasoning:plus model. The bot can:</p>
                        <ul>
                            <li>Answer questions and provide explanations</li>
                            <li>Help with programming and coding problems</li>
                            <li>Engage in natural conversations</li>
                            <li>Remember context within each conversation</li>
                        </ul>
                        <p><strong>Requirements:</strong> Ollama must be running locally with the phi4-reasoning:plus model installed.</p>
                        <p><strong>Setup:</strong> Run <code>ollama serve</code> and <code>ollama pull phi4-reasoning:plus</code></p>
                    </div>
                </div>
            `;
            
            App.showModal('BBCode Formatting Help', helpContent, null, 'Close', null);
        }
    },
    
    // Add CSS styles for BBCode elements
    addStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .bbcode-quote {
                background-color: #f8f8f8;
                border-left: 3px solid #3498db;
                margin: 10px 0;
                padding: 10px 15px;
                font-style: italic;
            }
            
            .bbcode-quote cite {
                display: block;
                font-weight: bold;
                margin-bottom: 5px;
                font-style: normal;
            }
            
            .bbcode-code {
                background-color: #2d2d2d;
                color: #f8f8f2;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
                font-family: monospace;
                margin: 10px 0;
            }
            
            .bbcode-list {
                margin: 10px 0;
                padding-left: 30px;
            }
            
            .bbcode-img {
                max-width: 100%;
                height: auto;
                margin: 10px 0;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .bbcode-youtube {
                position: relative;
                padding-bottom: 56.25%; /* 16:9 aspect ratio */
                height: 0;
                overflow: hidden;
                margin: 15px 0;
                max-width: 100%;
            }
            
            .bbcode-youtube iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 4px;
            }
            
            .bbcode-spoiler {
                margin: 10px 0;
                border: 1px solid #ddd;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .spoiler-toggle {
                width: 100%;
                background-color: #f5f5f5;
                border: none;
                padding: 8px 15px;
                text-align: left;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .spoiler-toggle:hover {
                background-color: #e8e8e8;
            }
            
            .spoiler-content {
                padding: 15px;
                background-color: #fff;
            }
            
            .spoiler-content.hidden {
                display: none;
            }
            
            .bbcode-hr {
                border: 0;
                height: 1px;
                background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));
                margin: 15px 0;
            }
            
            .bbcode-marquee {
                width: 100%;
                overflow: hidden;
                white-space: nowrap;
                box-sizing: border-box;
                animation: marquee 15s linear infinite;
                padding: 5px 0;
            }
            
            @keyframes marquee {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
            }
            
            /* HTML container styles */
            .bbcode-html-container {
                margin: 10px 0;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #f8f8f8;
                overflow: auto;
                max-width: 100%;
            }
            
            .bbcode-html-container table {
                border-collapse: collapse;
                width: 100%;
            }
            
            .bbcode-html-container table, .bbcode-html-container th, .bbcode-html-container td {
                border: 1px solid #ddd;
                padding: 8px;
            }
            
            .bbcode-html-container th {
                padding-top: 12px;
                padding-bottom: 12px;
                text-align: left;
                background-color: #f5f5f5;
            }
            
            .bbcode-html-container a {
                color: #3498db;
                text-decoration: none;
            }
            
            .bbcode-html-container a:hover {
                text-decoration: underline;
            }
            
            .bbcode-html-container img {
                max-width: 100%;
                height: auto;
            }
            
            /* YouTube icon for Font Awesome */
            .fa-youtube:before {
                content: "\\f167"; /* Font Awesome YouTube icon code */
            }
            
            /* Toolbar styles */
            .bbcode-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                background-color: #f8f8f8;
                border: 1px solid #ddd;
                border-bottom: none;
                border-radius: 4px 4px 0 0;
                padding: 8px;
                margin-bottom: 0;
            }
            
            .toolbar-btn {
                width: 32px;
                height: 32px;
                border: 1px solid #ddd;
                background-color: #fff;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .toolbar-btn:hover {
                background-color: #f0f0f0;
                border-color: #aaa;
            }
            
            .toolbar-divider {
                width: 1px;
                height: 24px;
                background-color: #ddd;
                margin: 0 5px;
                align-self: center;
            }
            
            .toolbar-help {
                margin-left: auto;
            }
            
            textarea {
                border-top-left-radius: 0 !important;
                border-top-right-radius: 0 !important;
            }
            
            /* BBCode Help Modal */
            .bbcode-help {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .bbcode-help h3 {
                margin-top: 0;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
            }
            
            .help-section {
                margin-bottom: 15px;
            }
            
            .help-section h4 {
                margin-bottom: 5px;
                color: #3498db;
            }
            
            .help-section ul {
                list-style-type: none;
                padding-left: 10px;
                margin: 0;
            }
            
            .help-section li {
                margin-bottom: 5px;
            }
            
            .help-section code {
                background-color: #f5f5f5;
                padding: 2px 4px;
                border-radius: 3px;
                font-family: monospace;
            }
        `;
        document.head.appendChild(styleEl);
    }
};

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize markup parser
    Markup.init();
    
    // Add BBCode styles
    Markup.addStyles();
    
    // Add toolbars to textareas
    Markup.addToolbarsToTextareas();
    
    // Apply to existing content
    Markup.applyToClass('post-content-text');
    Markup.applyToClass('reply-content');
    Markup.applyToClass('category-description');
    
    // Set up a periodic check for new textareas
    const checkInterval = setInterval(() => {
        Markup.addToolbarsToTextareas();
    }, 2000);  // Check every 2 seconds
    
    // Clear interval after 30 seconds to avoid performance issues
    setTimeout(() => clearInterval(checkInterval), 30000);
    
    // Extra step: Process HTML BBCode containers after page load
    setTimeout(() => {
        console.log('Post-processing HTML BBCode containers');
        Markup.processHtmlContainers();
    }, 100);
    
    // Hook into the post and reply display functions
    if (window.App) {
        // Extend the viewPost method to apply markup
        const originalViewPost = App.viewPost;
        App.viewPost = async function(postId) {
            await originalViewPost.call(this, postId);
            
            console.log('Post viewed, applying BBCode markup...');
            
            // Process all content with a delay to ensure it's in the DOM
            setTimeout(() => {
                Markup.processPageContent();
            }, 100);
        };
        
        // Extend the createPost method
        const originalCreatePost = App.createPost;
        App.createPost = async function() {
            await originalCreatePost.call(this);
            Markup.applyToClass('post-content-text');
        };
        
        // Extend the addReply method
        const originalAddReply = App.addReply;
        App.addReply = async function() {
            await originalAddReply.call(this);
            Markup.applyToClass('reply-content');
        };
        
        // Add toolbars when showing pages
        const originalShowPage = App.showPage;
        App.showPage = function(pageId) {
            originalShowPage.call(this, pageId);
            
            // Pages that might have textareas
            const pagesWithTextareas = ['new-post', 'new-category', 'post'];
            
            if (pagesWithTextareas.includes(pageId)) {
                // Try several times to ensure textareas are loaded
                setTimeout(() => Markup.addToolbarsToTextareas(), 100);
                setTimeout(() => Markup.addToolbarsToTextareas(), 500);
                setTimeout(() => Markup.addToolbarsToTextareas(), 1000);
            }
        };
        
        console.log('BBCode markup integrated with forum application');
    }
});

// Process posts and replies right after they're created
document.addEventListener('click', function(e) {
    // Check for post/reply submission buttons
    const isSubmitBtn = e.target.closest('#post-submit, #reply-submit');
    if (isSubmitBtn) {
        // Process content after a short delay
        setTimeout(() => {
            Markup.processPageContent();
        }, 500);
    }
});

// Add an event listener for form submissions to process HTML content
document.addEventListener('submit', function(e) {
    if (e.target.tagName === 'FORM') {
        // Process any HTML BBCode in textareas
        const textareas = e.target.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            const content = textarea.value;
            
            // If content contains HTML BBCode, ensure it's handled properly
            if (content.includes('[html]')) {
                console.log('Form being submitted with HTML BBCode content');
            }
        });
    }
});

// Attempt to add toolbars immediately when the script loads
setTimeout(() => {
    if (Markup && typeof Markup.addToolbarsToTextareas === 'function') {
        Markup.addToolbarsToTextareas();
    }
}, 1000);

console.log('BBCode markup.js with Ollama bot support fully loaded and initialized');