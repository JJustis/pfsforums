/**
 * ASM-Runner - Executable Assembly Code BBCode for forums
 * A lightweight assembly interpreter that runs in a web worker for safe execution of user-submitted code
 */

// Main ASM-Runner module
const ASMRunner = {
    // Track instances of ASM code blocks
    instances: [],
    
    // Initialize the system
    init: function() {
        // Parse all ASM code blocks when page loads
        this.parseASMBlocks();
        
        // Process placeholder elements (for integration with BBCode parser)
        this.processPlaceholders();
        
        // Add styles to document
        this.addStyles();
        
        // Set up mutation observer to catch dynamically added ASM blocks
        this.setupMutationObserver();
        
        console.log('ASM-Runner initialized');
    },
    
    // Parse all ASM code blocks in the document
    parseASMBlocks: function() {
        // Find all posts and replies that might contain ASM BBCode
        const contentElements = document.querySelectorAll('.post-content-text, .reply-content');
        
        contentElements.forEach(element => {
            // Skip if already processed
            if (element.dataset.asmProcessed === 'true') return;
            
            // Mark as processed
            element.dataset.asmProcessed = 'true';
            
            // Get HTML content
            let content = element.innerHTML;
            
            // Replace ASM BBCode with HTML components
            content = this.replaceASMBlocks(content, element);
            
            // Update element content
            element.innerHTML = content;
            
            // Initialize all ASM blocks in this element
            this.initializeASMBlocks(element);
        });
    },
    
    // Replace ASM BBCode with HTML components
    replaceASMBlocks: function(content, parentElement) {
        // Match [asm]...[/asm] and [asm:title=Example]...[/asm]
        const asmRegex = /\[asm(?::title=([^\]]+))?\]([\s\S]*?)\[\/asm\]/g;
        
        return content.replace(asmRegex, (match, title, code) => {
            // Generate unique ID
            const instanceId = 'asm-' + this.generateUniqueId();
            
            // Store instance
            this.instances.push({
                id: instanceId,
                code: code.trim(),
                title: title || 'Assembly Code',
                results: [],
                memory: new Array(256).fill(0),
                registers: { 'R0': 0, 'R1': 0, 'R2': 0, 'R3': 0, 'R4': 0, 'R5': 0, 'R6': 0, 'R7': 0, 'IP': 0, 'SP': 255, 'FLAGS': 0 },
                running: false
            });
            
            // Create HTML
            return this.createASMBlockHTML(instanceId, title || 'Assembly Code', code.trim());
        });
    },
    
    // Process ASM placeholder elements (for integration with BBCode parser)
    processPlaceholders: function() {
        // Find all ASM placeholders
        const placeholders = document.querySelectorAll('.asm-placeholder');
        
        placeholders.forEach(placeholder => {
            // Check if already processed
            if (placeholder.dataset.processed === 'true') return;
            
            // Mark as processed
            placeholder.dataset.processed = 'true';
            
            // Get instance ID and title
            const instanceId = placeholder.dataset.id;
            const title = placeholder.dataset.title || 'Assembly Code';
            
            // Get code from pre element
            const preElement = placeholder.querySelector('pre');
            if (!preElement) return;
            
            const code = preElement.textContent.trim();
            
            // Store instance
            this.instances.push({
                id: instanceId,
                code: code,
                title: title,
                results: [],
                memory: new Array(256).fill(0),
                registers: { 'R0': 0, 'R1': 0, 'R2': 0, 'R3': 0, 'R4': 0, 'R5': 0, 'R6': 0, 'R7': 0, 'IP': 0, 'SP': 255, 'FLAGS': 0 },
                running: false
            });
            
            // Replace placeholder with ASM editor
            placeholder.innerHTML = this.createASMBlockHTML(instanceId, title, code);
            
            // Initialize ASM block
            this.initializeASMBlocks(placeholder);
        });
    },
    
    // Add mutation observer to catch dynamically added ASM blocks
    setupMutationObserver: function() {
        const observer = new MutationObserver(mutations => {
            let shouldProcess = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    // Check if any added nodes contain ASM placeholders
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && node.classList.contains('asm-placeholder')) {
                                shouldProcess = true;
                            } else if (node.querySelector && node.querySelector('.asm-placeholder')) {
                                shouldProcess = true;
                            }
                        }
                    }
                }
            }
            
            if (shouldProcess) {
                // Process all placeholders
                this.processPlaceholders();
            }
        });
        
        // Observe the document body
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
    
    // Create HTML for an ASM block
    createASMBlockHTML: function(id, title, code) {
        return `
            <div class="asm-container" id="${id}-container">
                <div class="asm-header">
                    <div class="asm-title">${this.escapeHTML(title)}</div>
                    <div class="asm-controls">
                        <button class="asm-run-btn" data-id="${id}">
                            <i class="fas fa-play"></i> Run
                        </button>
                        <button class="asm-step-btn" data-id="${id}">
                            <i class="fas fa-step-forward"></i> Step
                        </button>
                        <button class="asm-reset-btn" data-id="${id}">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    </div>
                </div>
                <div class="asm-body">
                    <div class="asm-code-area">
                        <pre class="asm-code"><code>${this.highlightSyntax(code)}</code></pre>
                    </div>
                    <div class="asm-execution-area">
                        <div class="asm-registers-view">
                            <h4>Registers</h4>
                            <div class="asm-registers" id="${id}-registers">
                                <div class="asm-register"><span class="register-name">R0</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">R1</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">R2</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">R3</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">R4</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">R5</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">R6</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">R7</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">IP</span>: <span class="register-value">0</span></div>
                                <div class="asm-register"><span class="register-name">SP</span>: <span class="register-value">255</span></div>
                                <div class="asm-register"><span class="register-name">FLAGS</span>: <span class="register-value">0</span></div>
                            </div>
                        </div>
                        <div class="asm-output-view">
                            <h4>Output</h4>
                            <div class="asm-output" id="${id}-output"></div>
                        </div>
                        <div class="asm-memory-view">
                            <h4>Memory View</h4>
                            <div class="asm-memory-controls">
                                <label>
                                    Address: 
                                    <input type="number" min="0" max="255" value="0" class="asm-memory-address" data-id="${id}">
                                </label>
                                <button class="asm-view-memory-btn" data-id="${id}">View</button>
                            </div>
                            <div class="asm-memory" id="${id}-memory"></div>
                        </div>
                    </div>
                </div>
                <div class="asm-canvas-container hidden" id="${id}-canvas-container">
                    <canvas id="${id}-canvas" width="256" height="256"></canvas>
                </div>
            </div>
        `;
    },
    
    // Initialize all ASM blocks in an element
    initializeASMBlocks: function(element) {
        // Add event listeners for run buttons
        const runButtons = element.querySelectorAll('.asm-run-btn');
        runButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.closest('.asm-run-btn').dataset.id;
                this.runCode(id);
            });
        });
        
        // Add event listeners for step buttons
        const stepButtons = element.querySelectorAll('.asm-step-btn');
        stepButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.closest('.asm-step-btn').dataset.id;
                this.stepCode(id);
            });
        });
        
        // Add event listeners for reset buttons
        const resetButtons = element.querySelectorAll('.asm-reset-btn');
        resetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.closest('.asm-reset-btn').dataset.id;
                this.resetCode(id);
            });
        });
        
        // Add event listeners for memory view buttons
        const memoryButtons = element.querySelectorAll('.asm-view-memory-btn');
        memoryButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.closest('.asm-view-memory-btn').dataset.id;
                const address = parseInt(element.querySelector(`.asm-memory-address[data-id="${id}"]`).value);
                this.viewMemory(id, address);
            });
        });
    },
    
    // Run ASM code for a specific instance
    runCode: function(id) {
        // Find the instance
        const instance = this.instances.find(inst => inst.id === id);
        
        if (!instance) return;
        
        // Reset instance state
        this.resetInstanceState(instance);
        
        // Mark as running
        instance.running = true;
        
        // Parse the code
        const instructions = this.parseCode(instance.code);
        
        // Create a web worker to execute the code
        const workerBlob = new Blob([this.getWorkerCode()], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        const worker = new Worker(workerUrl);
        
        // Handle messages from the worker
        worker.onmessage = (e) => {
            const message = e.data;
            
            switch (message.type) {
                case 'output':
                    this.addOutput(id, message.value);
                    break;
                case 'registers':
                    this.updateRegisters(id, message.registers);
                    break;
                case 'memory':
                    this.updateMemory(id, message.memory);
                    break;
                case 'graphics':
                    this.updateCanvas(id, message.data);
                    break;
                case 'error':
                    this.addOutput(id, `<span class="asm-error">${message.error}</span>`);
                    worker.terminate();
                    instance.running = false;
                    break;
                case 'done':
                    this.addOutput(id, '<span class="asm-success">Program execution completed</span>');
                    worker.terminate();
                    instance.running = false;
                    break;
            }
        };
        
        // Start execution
        worker.postMessage({
            type: 'run',
            instructions: instructions,
            memory: instance.memory,
            registers: instance.registers
        });
    },
    
    // Execute a single step of ASM code
    stepCode: function(id) {
        // Find the instance
        const instance = this.instances.find(inst => inst.id === id);
        
        if (!instance) return;
        
        // If not running, initialize
        if (!instance.running) {
            this.resetInstanceState(instance);
            instance.running = true;
            instance.instructions = this.parseCode(instance.code);
            instance.worker = null;
        }
        
        // If we don't have a worker, create one
        if (!instance.worker) {
            const workerBlob = new Blob([this.getWorkerCode()], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(workerBlob);
            instance.worker = new Worker(workerUrl);
            
            // Handle messages from the worker
            instance.worker.onmessage = (e) => {
                const message = e.data;
                
                switch (message.type) {
                    case 'output':
                        this.addOutput(id, message.value);
                        break;
                    case 'registers':
                        this.updateRegisters(id, message.registers);
                        break;
                    case 'memory':
                        this.updateMemory(id, message.memory);
                        break;
                    case 'graphics':
                        this.updateCanvas(id, message.data);
                        break;
                    case 'error':
                        this.addOutput(id, `<span class="asm-error">${message.error}</span>`);
                        instance.worker.terminate();
                        instance.worker = null;
                        instance.running = false;
                        break;
                    case 'done':
                        this.addOutput(id, '<span class="asm-success">Program execution completed</span>');
                        instance.worker.terminate();
                        instance.worker = null;
                        instance.running = false;
                        break;
                    case 'step-complete':
                        // Update state for next step
                        instance.registers = message.registers;
                        instance.memory = message.memory;
                        break;
                }
            };
        }
        
        // Execute one step
        instance.worker.postMessage({
            type: 'step',
            instructions: instance.instructions,
            memory: instance.memory,
            registers: instance.registers
        });
    },
    
    // Reset ASM code instance
    resetCode: function(id) {
        // Find the instance
        const instance = this.instances.find(inst => inst.id === id);
        
        if (!instance) return;
        
        // If running, terminate worker
        if (instance.running && instance.worker) {
            instance.worker.terminate();
            instance.worker = null;
        }
        
        // Reset instance state
        this.resetInstanceState(instance);
        
        // Update UI
        this.updateRegisters(id, instance.registers);
        document.getElementById(`${id}-output`).innerHTML = '';
        document.getElementById(`${id}-memory`).innerHTML = '';
        document.getElementById(`${id}-canvas-container`).classList.add('hidden');
    },
    
    // Reset the state of an instance
    resetInstanceState: function(instance) {
        instance.results = [];
        instance.memory = new Array(256).fill(0);
        instance.registers = { 'R0': 0, 'R1': 0, 'R2': 0, 'R3': 0, 'R4': 0, 'R5': 0, 'R6': 0, 'R7': 0, 'IP': 0, 'SP': 255, 'FLAGS': 0 };
        instance.running = false;
    },
    
    // Parse ASM code into instructions
    parseCode: function(code) {
        const lines = code.split('\n');
        const instructions = [];
        const labels = {};
        
        // First pass: collect labels
        lines.forEach((line, index) => {
            // Remove comments
            const commentIndex = line.indexOf(';');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex);
            }
            
            // Trim whitespace
            line = line.trim();
            
            // Skip empty lines
            if (line === '') return;
            
            // Check for labels
            if (line.endsWith(':')) {
                const label = line.substring(0, line.length - 1).trim();
                labels[label] = instructions.length;
                return;
            }
            
            // Add instruction
            instructions.push({
                line: index + 1,
                text: line,
                parsed: null // Will be parsed in second pass
            });
        });
        
        // Second pass: parse instructions
        instructions.forEach(instruction => {
            const parts = instruction.text.split(/\s+/);
            const opcode = parts[0].toUpperCase();
            const operands = parts.slice(1).join(' ').split(',').map(op => op.trim());
            
            instruction.parsed = {
                opcode: opcode,
                operands: operands,
                labels: labels
            };
        });
        
        return instructions;
    },
    
    // View memory at a specific address
    viewMemory: function(id, address) {
        // Find the instance
        const instance = this.instances.find(inst => inst.id === id);
        
        if (!instance) return;
        
        // Ensure address is valid
        address = Math.max(0, Math.min(255, address));
        
        // Get memory element
        const memoryElement = document.getElementById(`${id}-memory`);
        
        // Calculate range to display (16 bytes)
        const startAddress = Math.max(0, Math.min(240, address));
        const endAddress = startAddress + 15;
        
        // Create HTML
        let html = '<div class="asm-memory-grid">';
        html += '<div class="asm-memory-header">';
        html += '<div class="asm-memory-cell">Addr</div>';
        for (let i = 0; i < 16; i++) {
            html += `<div class="asm-memory-cell">+${i}</div>`;
        }
        html += '</div>';
        
        // Memory rows
        for (let row = 0; row < 1; row++) {
            const rowAddress = startAddress + (row * 16);
            html += '<div class="asm-memory-row">';
            html += `<div class="asm-memory-cell asm-memory-address">${rowAddress.toString(16).padStart(2, '0')}</div>`;
            
            for (let col = 0; col < 16; col++) {
                const address = rowAddress + col;
                const value = instance.memory[address];
                html += `<div class="asm-memory-cell">${value}</div>`;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        
        // Update element
        memoryElement.innerHTML = html;
    },
    
    // Add output to the output area
    addOutput: function(id, text) {
        const outputElement = document.getElementById(`${id}-output`);
        outputElement.innerHTML += text + '<br>';
        
        // Scroll to bottom
        outputElement.scrollTop = outputElement.scrollHeight;
    },
    
    // Update registers display
    updateRegisters: function(id, registers) {
        const registersElement = document.getElementById(`${id}-registers`);
        
        // Update each register
        Object.keys(registers).forEach(register => {
            const registerElement = registersElement.querySelector(`.asm-register:has(.register-name:contains("${register}"))`);
            if (registerElement) {
                registerElement.querySelector('.register-value').textContent = registers[register];
            }
        });
    },
    
    // Update memory display
    updateMemory: function(id, memory) {
        // Find the instance
        const instance = this.instances.find(inst => inst.id === id);
        
        if (!instance) return;
        
        // Update instance memory
        instance.memory = memory;
        
        // If memory view is open, update it
        const addressInput = document.querySelector(`.asm-memory-address[data-id="${id}"]`);
        if (addressInput) {
            this.viewMemory(id, parseInt(addressInput.value));
        }
    },
    
    // Update canvas display
    updateCanvas: function(id, data) {
        const canvasContainer = document.getElementById(`${id}-canvas-container`);
        const canvas = document.getElementById(`${id}-canvas`);
        
        // Show canvas
        canvasContainer.classList.remove('hidden');
        
        // Get canvas context
        const ctx = canvas.getContext('2d');
        
        // Create image data
        const imageData = new ImageData(new Uint8ClampedArray(data), 256, 256);
        
        // Draw image
        ctx.putImageData(imageData, 0, 0);
    },
    
    // Add CSS styles to document
    addStyles: function() {
        // Create style element
        const style = document.createElement('style');
        
        // Set style content
        style.textContent = `
            /* ASM Runner styles */
            .asm-container {
                border: 1px solid #ddd;
                border-radius: 5px;
                margin: 15px 0;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background-color: #f8f9fa;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            
            .asm-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background-color: #e9ecef;
                border-bottom: 1px solid #ddd;
            }
            
            .asm-title {
                font-weight: bold;
                font-size: 16px;
                color: #333;
            }
            
            .asm-controls {
                display: flex;
                gap: 5px;
            }
            
            .asm-run-btn, .asm-step-btn, .asm-reset-btn, .asm-view-memory-btn {
                background-color: #1976D2;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                font-size: 14px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
                transition: background-color 0.2s;
            }
            
            .asm-run-btn:hover, .asm-step-btn:hover, .asm-reset-btn:hover, .asm-view-memory-btn:hover {
                background-color: #1565C0;
            }
            
            .asm-reset-btn {
                background-color: #F44336;
            }
            
            .asm-reset-btn:hover {
                background-color: #D32F2F;
            }
            
            .asm-body {
                display: flex;
                flex-direction: row;
                min-height: 300px;
            }
            
            .asm-code-area {
                flex: 1;
                border-right: 1px solid #ddd;
                padding: 10px;
                overflow: auto;
                background-color: #282c34;
                color: #abb2bf;
                font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
            }
            
            .asm-code {
                margin: 0;
                font-size: 14px;
                line-height: 1.5;
                white-space: pre-wrap;
            }
            
            .asm-execution-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 10px;
                overflow: auto;
            }
            
            .asm-registers-view, .asm-output-view, .asm-memory-view {
                margin-bottom: 15px;
            }
            
            .asm-registers-view h4, .asm-output-view h4, .asm-memory-view h4 {
                margin: 0 0 10px 0;
                color: #343a40;
                font-size: 16px;
                font-weight: bold;
            }
            
            .asm-registers {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 5px;
            }
            
            .asm-register {
                padding: 5px;
                background-color: #e9ecef;
                border-radius: 3px;
                font-family: monospace;
                font-size: 14px;
            }
            
            .register-name {
                font-weight: bold;
                color: #1976D2;
            }
            
            .asm-output {
                background-color: #000;
                color: #0f0;
                font-family: monospace;
                padding: 10px;
                border-radius: 3px;
                height: 100px;
                overflow-y: auto;
                line-height: 1.5;
            }
            
            .asm-error {
                color: #F44336;
                font-weight: bold;
            }
            
            .asm-success {
                color: #4CAF50;
                font-weight: bold;
            }
            
            .asm-memory-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                align-items: center;
            }
            
            .asm-memory-address {
                width: 60px;
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 3px;
            }
            
            .asm-memory-grid {
                overflow-x: auto;
                border: 1px solid #ddd;
                border-radius: 3px;
            }
            
            .asm-memory-header, .asm-memory-row {
                display: flex;
            }
            
            .asm-memory-header {
                background-color: #e9ecef;
                font-weight: bold;
            }
            
            .asm-memory-cell {
                width: 40px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-right: 1px solid #ddd;
                border-bottom: 1px solid #ddd;
                font-family: monospace;
                font-size: 14px;
            }
            
            .asm-memory-address {
                background-color: #e9ecef;
                font-weight: bold;
            }
            
            .asm-canvas-container {
                padding: 10px;
                border-top: 1px solid #ddd;
                text-align: center;
            }
            
            .asm-canvas-container canvas {
                border: 1px solid #ddd;
                max-width: 100%;
            }
            
            .hidden {
                display: none;
            }
            
            /* Syntax highlighting */
            .asm-code .opcode {
                color: #61afef;
                font-weight: bold;
            }
            
            .asm-code .register {
                color: #e06c75;
            }
            
            .asm-code .number {
                color: #98c379;
            }
            
            .asm-code .label {
                color: #c678dd;
            }
            
            .asm-code .comment {
                color: #5c6370;
                font-style: italic;
            }
            
            .asm-code .string {
                color: #e5c07b;
            }
            
            .asm-code .memory {
                color: #56b6c2;
            }
            
            /* For BBCode integration */
            .asm-placeholder {
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 15px;
                margin: 15px 0;
                background-color: #f8f9fa;
            }

            .loading-spinner {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #666;
            }

            .loading-spinner i {
                margin-right: 10px;
            }
            
            @media (max-width: 768px) {
                .asm-body {
                    flex-direction: column;
                }
                
                .asm-code-area {
                    border-right: none;
                    border-bottom: 1px solid #ddd;
                }
            }
        `;
        
        // Add to document
        document.head.appendChild(style);
    },
    
    // Highlight ASM syntax
    highlightSyntax: function(code) {
        // Split into lines
        const lines = code.split('\n');
        
        // Highlight each line
        const highlightedLines = lines.map(line => {
            // Check for comments
            const commentIndex = line.indexOf(';');
            let comment = '';
            
            if (commentIndex !== -1) {
                comment = line.substring(commentIndex);
                line = line.substring(0, commentIndex);
            }
            
            // Check for labels
            if (line.trim().endsWith(':')) {
                return `<span class="label">${this.escapeHTML(line)}</span>${commentIndex !== -1 ? `<span class="comment">${this.escapeHTML(comment)}</span>` : ''}`;
            }
            
            // Split into parts
            const parts = line.trim().split(/\s+/);
            if (parts.length === 0 || parts[0] === '') {
                return commentIndex !== -1 ? `<span class="comment">${this.escapeHTML(comment)}</span>` : '';
            }
            
            // Opcode
            const opcode = parts[0].toUpperCase();
            let result = `<span class="opcode">${this.escapeHTML(opcode)}</span> `;
            
            // Operands
            if (parts.length > 1) {
                const operands = parts.slice(1).join(' ');
                
                // Highlight registers, numbers, memory references, and strings
                let highlightedOperands = operands;
                
                // Registers
                highlightedOperands = highlightedOperands.replace(/\b(R[0-7]|IP|SP|FLAGS)\b/g, '<span class="register">$1</span>');
                
                // Numbers
                highlightedOperands = highlightedOperands.replace(/\b([0-9]+)\b/g, '<span class="number">$1</span>');
                
                // Memory references
                highlightedOperands = highlightedOperands.replace(/\[([^\]]+)\]/g, '[<span class="memory">$1</span>]');
                
                // String literals
                highlightedOperands = highlightedOperands.replace(/'(.)'/g, '<span class="string">\'$1\'</span>');
                
                result += highlightedOperands;
            }
            
            // Add comment
            if (commentIndex !== -1) {
                result += `<span class="comment">${this.escapeHTML(comment)}</span>`;
            }
            
            return result;
        });
        
        // Join lines
        return highlightedLines.join('\n');
    },
    
    // Worker code for executing ASM instructions
    getWorkerCode: function() {
        return `
            // ASM Worker
            
            // Instruction set
            const instructions = {
                // Data movement
                MOV: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] = getValue(state, source);
                    } else if (dest.type === 'memory') {
                        state.memory[dest.value] = getValue(state, source);
                    }
                },
                
                // Arithmetic
                ADD: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] += getValue(state, source);
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                SUB: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] -= getValue(state, source);
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                MUL: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] *= getValue(state, source);
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                DIV: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        const divisor = getValue(state, source);
                        if (divisor === 0) {
                            throw new Error('Division by zero');
                        }
                        state.registers[dest.value] = Math.floor(state.registers[dest.value] / divisor);
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                // Bitwise operations
                AND: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] &= getValue(state, source);
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                OR: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] |= getValue(state, source);
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                XOR: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    const source = parseOperand(state, operands[1]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] ^= getValue(state, source);
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                NOT: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] = ~state.registers[dest.value];
                        updateFlags(state, state.registers[dest.value]);
                    }
                },
                
                // Compare
                CMP: (state, operands) => {
                    const left = parseOperand(state, operands[0]);
                    const right = parseOperand(state, operands[1]);
                    
                    const result = getValue(state, left) - getValue(state, right);
                    updateFlags(state, result);
                },
                
                // Jumps
                JMP: (state, operands, labels) => {
                    const target = operands[0];
                    if (labels[target] !== undefined) {
                        state.registers.IP = labels[target];
                        return true; // Indicate jump
                    } else {
                        throw new Error(\`Unknown label: \${target}\`);
                    }
                },
                
                JE: (state, operands, labels) => {
                    if ((state.registers.FLAGS & 1) !== 0) {
                        return instructions.JMP(state, operands, labels);
                    }
                },
                
                JNE: (state, operands, labels) => {
                    if ((state.registers.FLAGS & 1) === 0) {
                        return instructions.JMP(state, operands, labels);
                    }
                },
                
                JG: (state, operands, labels) => {
                    if ((state.registers.FLAGS & 4) !== 0) {
                        return instructions.JMP(state, operands, labels);
                    }
                },
                
                JL: (state, operands, labels) => {
                    if ((state.registers.FLAGS & 2) !== 0) {
                        return instructions.JMP(state, operands, labels);
                    }
                },
                
                // Stack operations
                PUSH: (state, operands) => {
                    const source = parseOperand(state, operands[0]);
                    state.memory[state.registers.SP] = getValue(state, source);
                    state.registers.SP--;
                },
                
                POP: (state, operands) => {
                    const dest = parseOperand(state, operands[0]);
                    state.registers.SP++;
                    
                    if (dest.type === 'register') {
                        state.registers[dest.value] = state.memory[state.registers.SP];
                    }
                },
                
                // Subroutines
                CALL: (state, operands, labels) => {
                    // Push return address
                    state.memory[state.registers.SP] = state.registers.IP + 1;
                    state.registers.SP--;
                    
                    // Jump to subroutine
                    return instructions.JMP(state, operands, labels);
                },
                
                RET: (state) => {
                    // Pop return address
                    state.registers.SP++;
                    state.registers.IP = state.memory[state.registers.SP];
                    return true; // Indicate jump
                },
                
                // I/O
                OUT: (state, operands) => {
                    const source = parseOperand(state, operands[0]);
                    self.postMessage({
                        type: 'output',
                        value: getValue(state, source)
                    });
                },
                
                OUTC: (state, operands) => {
                    const source = parseOperand(state, operands[0]);
                    const charCode = getValue(state, source);
                    const char = String.fromCharCode(charCode);
                    self.postMessage({
                        type: 'output',
                        value: char
                    });
                },
                
                // Graphics
                SETPIXEL: (state, operands) => {
                    const x = getValue(state, parseOperand(state, operands[0]));
                    const y = getValue(state, parseOperand(state, operands[1]));
                    const color = getValue(state, parseOperand(state, operands[2]));
                    
                    if (x >= 0 && x < 256 && y >= 0 && y < 256) {
                        const pixelIndex = (y * 256 + x) * 4;
                        state.graphicsBuffer[pixelIndex] = (color >> 16) & 0xFF;     // R
                        state.graphicsBuffer[pixelIndex + 1] = (color >> 8) & 0xFF;  // G
                        state.graphicsBuffer[pixelIndex + 2] = color & 0xFF;         // B
                        state.graphicsBuffer[pixelIndex + 3] = 255;                  // A
                    }
                },
                
                UPDATESCREEN: (state) => {
                    self.postMessage({
                        type: 'graphics',
                        data: state.graphicsBuffer
                    });
                },
                
                // Halt
                HLT: () => {
                    return 'halt';
                }
            };
            
            // Helper functions
            
            // Parse an operand
            function parseOperand(state, operand) {
                if (!operand) return null;
                
                // Register
                if (/^R[0-7]|IP|SP|FLAGS$/.test(operand)) {
                    return {
                        type: 'register',
                        value: operand
                    };
                }
                
                // Memory reference with register [Rx]
                const memRegMatch = /^\\[([a-zA-Z0-9]+)\\]$/.exec(operand);
                if (memRegMatch) {
                    const register = memRegMatch[1];
                    if (!state.registers[register]) {
                        throw new Error(\`Unknown register: \${register}\`);
                    }
                    
                    return {
                        type: 'memory',
                        value: state.registers[register]
                    };
                }
                
                // Direct memory reference [number]
                const memMatch = /^\\[([0-9]+)\\]$/.exec(operand);
                if (memMatch) {
                    const address = parseInt(memMatch[1]);
                    if (isNaN(address) || address < 0 || address > 255) {
                        throw new Error(\`Invalid memory address: \${memMatch[1]}\`);
                    }
                    
                    return {
                        type: 'memory',
                        value: address
                    };
                }
                
                // Immediate value
                if (/^[0-9]+$/.test(operand)) {
                    return {
                        type: 'immediate',
                        value: parseInt(operand)
                    };
                }
                
                // Character literal
                const charMatch = /^'(.)'$/.exec(operand);
                if (charMatch) {
                    return {
                        type: 'immediate',
                        value: charMatch[1].charCodeAt(0)
                    };
                }
                
                throw new Error(\`Invalid operand: \${operand}\`);
            }
            
            // Get value from operand
            function getValue(state, operand) {
                if (!operand) return null;
                
                switch (operand.type) {
                    case 'register':
                        return state.registers[operand.value];
                    case 'memory':
                        return state.memory[operand.value];
                    case 'immediate':
                        return operand.value;
                    default:
                        return null;
                }
            }
            
            // Update flags register
            function updateFlags(state, value) {
                // Bit 0: Zero flag
                // Bit 1: Negative flag
                // Bit 2: Positive flag
                
                let flags = 0;
                
                if (value === 0) {
                    flags |= 1; // Set zero flag
                } else if (value < 0) {
                    flags |= 2; // Set negative flag
                } else {
                    flags |= 4; // Set positive flag
                }
                
                state.registers.FLAGS = flags;
            }
            
            // Execute instructions
            function executeInstructions(instructions, memory, registers, runMode) {
                // Initialize state
                const state = {
                    memory: memory.slice(),
                    registers: Object.assign({}, registers),
                    graphicsBuffer: new Uint8ClampedArray(256 * 256 * 4)
                };
                
                // Fill graphics buffer with transparent black
                for (let i = 0; i < state.graphicsBuffer.length; i += 4) {
                    state.graphicsBuffer[i + 3] = 255; // Alpha
                }
                
                // Get labels
                const labels = {};
                instructions.forEach((instr, index) => {
                    if (instr.parsed && instr.parsed.labels) {
                        Object.assign(labels, instr.parsed.labels);
                    }
                });
                
                // Run mode: 'run' or 'step'
                if (runMode === 'run') {
                    // Execute all instructions
                    while (state.registers.IP < instructions.length) {
                        try {
                            const instruction = instructions[state.registers.IP];
                            
                            if (!instruction.parsed) {
                                throw new Error(\`Invalid instruction at line \${instruction.line}\`);
                            }
                            
                            const opcode = instruction.parsed.opcode;
                            const operands = instruction.parsed.operands;
                            
                            if (!instructions[opcode]) {
                                throw new Error(\`Unknown opcode: \${opcode}\`);
                            }
                            
                            const result = instructions[opcode](state, operands, labels);
                            
                            if (result === 'halt') {
                                break;
                            }
                            
                            if (result !== true) {
                                state.registers.IP++;
                            }
                            
                            // Update UI
                            self.postMessage({
                                type: 'registers',
                                registers: state.registers
                            });
                            
                            self.postMessage({
                                type: 'memory',
                                memory: state.memory
                            });
                        } catch (error) {
                            self.postMessage({
                                type: 'error',
                                error: error.message
                            });
                            return;
                        }
                    }
                    
                    // Done
                    self.postMessage({
                        type: 'done'
                    });
                } else if (runMode === 'step') {
                    // Execute one instruction
                    try {
                        if (state.registers.IP >= instructions.length) {
                            self.postMessage({
                                type: 'done'
                            });
                            return;
                        }
                        
                        const instruction = instructions[state.registers.IP];
                        
                        if (!instruction.parsed) {
                            throw new Error(\`Invalid instruction at line \${instruction.line}\`);
                        }
                        
                        const opcode = instruction.parsed.opcode;
                        const operands = instruction.parsed.operands;
                        
                        if (!instructions[opcode]) {
                            throw new Error(\`Unknown opcode: \${opcode}\`);
                        }
                        
                        const result = instructions[opcode](state, operands, labels);
                        
                        if (result === 'halt') {
                            self.postMessage({
                                type: 'done'
                            });
                            return;
                        }
                        
                        if (result !== true) {
                            state.registers.IP++;
                        }
                        
                        // Update UI
                        self.postMessage({
                            type: 'registers',
                            registers: state.registers
                        });
                        
                        self.postMessage({
                            type: 'memory',
                            memory: state.memory
                        });
                        
                        // Step complete
                        self.postMessage({
                            type: 'step-complete',
                            registers: state.registers,
                            memory: state.memory
                        });
                    } catch (error) {
                        self.postMessage({
                            type: 'error',
                            error: error.message
                        });
                        return;
                    }
                }
            }
            
            // Handle messages
            self.onmessage = function(e) {
                const message = e.data;
                
                switch (message.type) {
                    case 'run':
                        executeInstructions(
                            message.instructions,
                            message.memory,
                            message.registers,
                            'run'
                        );
                        break;
                    case 'step':
                        executeInstructions(
                            message.instructions,
                            message.memory,
                            message.registers,
                            'step'
                        );
                        break;
                }
            };
        `;
    },
    
    // Generate a unique ID
    generateUniqueId: function() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },
    
    // Get post ID from an element
    getPostId: function(element) {
        // Try to find closest post or reply element
        const postElement = element.closest('.post-card, .reply-card');
        if (postElement && postElement.id) {
            return postElement.id;
        }
        
        // Fallback to a generic ID
        return 'p' + this.generateUniqueId();
    },
    
    // Escape HTML
    escapeHTML: function(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Initialize ASM Runner when document is ready
document.addEventListener('DOMContentLoaded', function() {
    ASMRunner.init();
});