// markup.js - BBCode parser for Secure Forum
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
        
        console.log('BBCode markup parser initialized with mutation observer');
        
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
        
        // If the content has BBCode tags like [b], process it
        if (content.match(/\[[a-z\d=]/i)) {
            element.innerHTML = this.parse(content);
            console.log('Applied markup to element:', element);
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
                        <h4>Special Elements</h4>
                        <ul>
                            <li><code>[spoiler]Hidden text[/spoiler]</code></li>
                            <li><code>[spoiler=Title]Hidden text[/spoiler]</code></li>
                            <li><code>[marquee]Scrolling text[/marquee]</code></li>
                        </ul>
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

// Attempt to add toolbars immediately when the script loads
setTimeout(() => {
    if (Markup && typeof Markup.addToolbarsToTextareas === 'function') {
        Markup.addToolbarsToTextareas();
    }
}, 1000);