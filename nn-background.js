const initNNMapperBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    // Set renderer to fill the screen completely
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.style.overflow = 'hidden'; // Prevent scrollbars
    
    // Set canvas to absolute positioning to fill the screen
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1'; // Behind other content
    
    // Create a group to hold all neural network elements
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);
    
    // Parameters for the neural network
    const nodeCount = 150; // Increased for fuller screen
    const layerCount = 5;
    const neuronsPerLayer = nodeCount / layerCount;
    const layerDistance = 2.5;
    const networkWidth = 10; // Wider to fill screen
    const networkHeight = 7; // Taller to fill screen
    
    // Arrays to store nodes and connections
    const nodes = [];
    const connections = [];
    const activeNodes = [];
    
    // Create node geometry and materials
    const nodeGeometry = new THREE.SphereGeometry(0.05, 16, 16); // Larger nodes
    const nodeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4fc3f7, 
        transparent: true,
        opacity: 0.7
    });
    
    const nodeHoverMaterial = new THREE.MeshBasicMaterial({
        color: 0x00fff7,
        transparent: true,
        opacity: 1
    });
    
    const activeNodeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00e5ff, 
        transparent: true,
        opacity: 1
    });
    
    // Create connection material
    const connectionMaterial = new THREE.LineBasicMaterial({ 
        color: 0x80deea, 
        transparent: true,
        opacity: 0.2,
        linewidth: 1
    });
    
    const activeConnectionMaterial = new THREE.LineBasicMaterial({ 
        color: 0x18ffff, 
        transparent: true,
        opacity: 0.8,
        linewidth: 1
    });
    
    // Function to generate pseudo code for nodes
    const generateNodePseudoCode = (node) => {
        const layerNames = ['Input', 'Hidden1', 'Hidden2', 'Hidden3', 'Output'];
        const layerName = layerNames[Math.min(node.userData.layer, layerNames.length - 1)];
        const nodeType = ['Perceptron', 'Sigmoid', 'ReLU', 'Tanh', 'Softmax'][Math.floor(Math.random() * 5)];
        const weightCount = Math.floor(Math.random() * 5) + 1;
        const activationThreshold = (Math.random() * 0.5 + 0.3).toFixed(2);
        
        return `
// Node ID: ${node.userData.id}
// Layer: ${layerName}
// Type: ${nodeType}
// Status: ${node.userData.isActive ? 'ACTIVE' : 'Idle'}

class Neuron_${node.userData.id} {
  constructor() {
    this.weights = [${Array(weightCount).fill(0).map(() => (Math.random() * 2 - 1).toFixed(3)).join(', ')}];
    this.bias = ${(Math.random() * 2 - 1).toFixed(3)};
    this.activation = "${nodeType}";
    this.threshold = ${activationThreshold};
    this.connections = ${node.userData.connections.length};
  }
  
  forward(inputs) {
    let sum = this.bias;
    for(let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * this.weights[i];
    }
    return this.activate(sum);
  }
  
  activate(x) {
    // ${nodeType} activation function
    ${nodeType === 'ReLU' ? 'return Math.max(0, x);' : 
      nodeType === 'Sigmoid' ? 'return 1 / (1 + Math.exp(-x));' :
      nodeType === 'Tanh' ? 'return Math.tanh(x);' :
      nodeType === 'Softmax' ? 'return Math.exp(x);' :
      'return x > this.threshold ? 1 : 0;'}
  }
}

// Connection IDs: ${node.userData.connections.map(c => 
    c.userData.sourceId === node.userData.id ? 
    `→${c.userData.targetId}` : 
    `←${c.userData.sourceId}`
).join(', ')}
`;
    };
    
    // Create the terminal popup element
    const createTerminalPopup = () => {
        const popup = document.createElement('div');
        popup.className = 'neural-terminal-popup';
        popup.style.display = 'none';
        popup.innerHTML = `
            <div class="terminal-header">
                <div class="terminal-title">Neural Node Inspector</div>
                <div class="terminal-controls">
                    <span class="minimize">_</span>
                    <span class="maximize">□</span>
                    <span class="close">×</span>
                </div>
            </div>
            <div class="terminal-content">
                <pre id="terminal-code"></pre>
            </div>
        `;
        
        // Style the terminal popup
        const style = document.createElement('style');
        style.textContent = `
            .neural-terminal-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 20, 40, 0.9);
                border: 1px solid #00bcd4;
                border-radius: 5px;
                box-shadow: 0 0 20px rgba(0, 188, 212, 0.5);
                color: #e0f7fa;
                font-family: 'Consolas', 'Monaco', monospace;
                width: 500px;
                max-width: 90vw;
                z-index: 1000;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .terminal-header {
                background-color: #006064;
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            
            .terminal-title {
                font-weight: bold;
                font-size: 14px;
            }
            
            .terminal-controls span {
                margin-left: 12px;
                cursor: pointer;
                display: inline-block;
                width: 16px;
                height: 16px;
                text-align: center;
                line-height: 16px;
                border-radius: 50%;
            }
            
            .terminal-controls .close {
                background-color: #ff5252;
                color: #000;
            }
            
            .terminal-controls .minimize,
            .terminal-controls .maximize {
                background-color: #ffeb3b;
                color: #000;
            }
            
            .terminal-content {
                padding: 15px;
                max-height: 70vh;
                overflow-y: auto;
            }
            
            .terminal-content pre {
                margin: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
                color: #80deea;
                font-size: 13px;
                line-height: 1.5;
            }
            
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
            
            .terminal-content pre::after {
                content: '█';
                animation: blink 1s infinite;
                color: #00e5ff;
            }
        `;
        document.head.appendChild(style);
        
        // Add event listeners
        popup.querySelector('.close').addEventListener('click', () => {
            popup.style.display = 'none';
        });
        
        // Make popup draggable
        let isDragging = false;
        let offsetX, offsetY;
        
        popup.querySelector('.terminal-header').addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - popup.getBoundingClientRect().left;
            offsetY = e.clientY - popup.getBoundingClientRect().top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            popup.style.top = y + 'px';
            popup.style.left = x + 'px';
            popup.style.transform = 'none';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        document.body.appendChild(popup);
        return popup;
    };
    
    // Create and get popup reference
    const terminalPopup = createTerminalPopup();
    
    // Function to show popup for a specific node
    const showNodePopup = (node) => {
        const pseudoCode = generateNodePseudoCode(node);
        document.getElementById('terminal-code').textContent = pseudoCode;
        terminalPopup.style.display = 'block';
    };
    
    // Function to create nodes in 3D space
    const createNodes = () => {
        for (let layer = 0; layer < layerCount; layer++) {
            for (let i = 0; i < neuronsPerLayer; i++) {
                // Calculate position with slight randomization within layers
                const angle = (i / neuronsPerLayer) * Math.PI * 2;
                const radius = (networkWidth / 2) * (0.4 + (layer / layerCount) * 0.6);
                
                const x = Math.cos(angle) * radius + (Math.random() - 0.5) * (layer / layerCount);
                const y = Math.sin(angle) * radius + (Math.random() - 0.5) * (layer / layerCount);
                const z = (layer - layerCount/2) * layerDistance + (Math.random() - 0.5);
                
                // Create node mesh
                const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
                node.position.set(x, y, z);
                node.userData = {
                    id: nodes.length,
                    layer: layer,
                    isActive: false,
                    lastActivated: 0,
                    connections: [],
                    position: { x, y, z }
                };
                
                networkGroup.add(node);
                nodes.push(node);
            }
        }
    };
    
    // Function to create connections between nodes
    const createConnections = () => {
        nodes.forEach(node => {
            const sourceLayer = node.userData.layer;
            
            // Only connect forward to the next layer
            if (sourceLayer < layerCount - 1) {
                // Find nodes in the next layer
                const nextLayerNodes = nodes.filter(n => n.userData.layer === sourceLayer + 1);
                
                // Create 1-3 random connections
                const connectionCount = Math.floor(Math.random() * 3) + 1;
                
                for (let i = 0; i < connectionCount; i++) {
                    // Select a random node from the next layer
                    const targetNode = nextLayerNodes[Math.floor(Math.random() * nextLayerNodes.length)];
                    
                    // Create line geometry
                    const points = [
                        new THREE.Vector3(
                            node.position.x,
                            node.position.y,
                            node.position.z
                        ),
                        new THREE.Vector3(
                            targetNode.position.x,
                            targetNode.position.y,
                            targetNode.position.z
                        )
                    ];
                    
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(geometry, connectionMaterial.clone());
                    
                    line.userData = {
                        sourceId: node.userData.id,
                        targetId: targetNode.userData.id,
                        isActive: false,
                        lastActivated: 0
                    };
                    
                    // Store connection references in the nodes
                    node.userData.connections.push(line);
                    targetNode.userData.connections.push(line);
                    
                    networkGroup.add(line);
                    connections.push(line);
                }
            }
        });
    };
    
    // Function to simulate neural network activity
    const simulateNetworkActivity = (time) => {
        // Probability of activating a node in the first layer
        if (Math.random() < 0.03) {
            // Select a random node from the first layer
            const firstLayerNodes = nodes.filter(n => n.userData.layer === 0);
            const startNode = firstLayerNodes[Math.floor(Math.random() * firstLayerNodes.length)];
            
            // Activate the node
            activateNode(startNode, time);
        }
        
        // Update active nodes
        activeNodes.forEach(data => {
            const node = data.node;
            const activationTime = data.time;
            const currentTime = time;
            const duration = 2000; // ms
            
            // If activation has expired
            if (currentTime - activationTime > duration) {
                // Deactivate node
                if (!node.userData.isHovered) {
                    node.material = nodeMaterial.clone();
                }
                node.scale.set(1, 1, 1);
                node.userData.isActive = false;
                
                // Deactivate outgoing connections
                node.userData.connections.forEach(conn => {
                    if (conn.userData.sourceId === node.userData.id) {
                        conn.material = connectionMaterial.clone();
                        conn.userData.isActive = false;
                    }
                });
                
                // Remove from active nodes
                activeNodes.splice(activeNodes.indexOf(data), 1);
            } else {
                // Pulse effect based on activation age
                const age = (currentTime - activationTime) / duration;
                const pulse = 1 + (0.5 * Math.sin(age * Math.PI * 2 * 3) * (1 - age));
                node.scale.set(pulse, pulse, pulse);
                
                // Propagate activation to next layer with delay
                if (age > 0.2 && !data.propagated) {
                    data.propagated = true;
                    
                    // Find outgoing connections to next layer
                    const outgoingConnections = connections.filter(conn => 
                        conn.userData.sourceId === node.userData.id
                    );
                    
                    // Activate connections and target nodes
                    outgoingConnections.forEach(conn => {
                        // Activate connection
                        conn.material = activeConnectionMaterial.clone();
                        conn.userData.isActive = true;
                        conn.userData.lastActivated = currentTime;
                        
                        // After a short delay, activate the target node
                        setTimeout(() => {
                            const targetNode = nodes.find(n => n.userData.id === conn.userData.targetId);
                            if (targetNode) activateNode(targetNode, performance.now());
                        }, 200 + Math.random() * 300);
                    });
                }
            }
        });
    };
    
    // Function to activate a node
    const activateNode = (node, time) => {
        // Skip if already active
        if (node.userData.isActive) return;
        
        // Activate the node
        if (!node.userData.isHovered) {
            node.material = activeNodeMaterial.clone();
        }
        node.userData.isActive = true;
        node.userData.lastActivated = time;
        
        // Add to active nodes
        activeNodes.push({
            node: node,
            time: time,
            propagated: false
        });
    };
    
    // Create neural network
    createNodes();
    createConnections();
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 12; // Further back to see more of the network
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Setup raycaster for node interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let intersectedNode = null;
    
    // Track mouse movement for raycasting
    document.addEventListener('mousemove', (event) => {
        // Update mouse position for raycasting
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Also update for camera movement
        window.mouseX = event.clientX - window.innerWidth / 2;
        window.mouseY = event.clientY - window.innerHeight / 2;
    });
    
    // Handle mouse click for node inspection
    document.addEventListener('click', (event) => {
        // Don't handle clicks on the terminal popup
        if (event.target.closest('.neural-terminal-popup')) return;
        
        // Update mouse position
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Cast ray for node intersection
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodes);
        
        if (intersects.length > 0) {
            const clickedNode = intersects[0].object;
            showNodePopup(clickedNode);
        } else {
            // Click on empty space - hide popup
            terminalPopup.style.display = 'none';
        }
    });
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        
        const time = performance.now();
        
        // Update node hover state with raycaster
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodes);
        
        // Reset previous hover state
        if (intersectedNode && !intersects.find(i => i.object === intersectedNode)) {
            if (!intersectedNode.userData.isActive) {
                intersectedNode.material = nodeMaterial.clone();
            }
            intersectedNode.userData.isHovered = false;
            document.body.style.cursor = 'default';
            intersectedNode = null;
        }
        
        // Set new hover state
        if (intersects.length > 0) {
            intersectedNode = intersects[0].object;
            intersectedNode.material = nodeHoverMaterial.clone();
            intersectedNode.userData.isHovered = true;
            document.body.style.cursor = 'pointer';
        }
        
        // Simulate neural network activity
        simulateNetworkActivity(time);
        
        // Gentle rotation for the entire network
        networkGroup.rotation.y += 0.0004;
        networkGroup.rotation.x += 0.0001;
        
        // Make network respond to mouse movement
        if (window.mouseX && window.mouseY) {
            networkGroup.rotation.y += (window.mouseX * 0.00001);
            networkGroup.rotation.x += (window.mouseY * 0.00001);
            
            // Slightly move camera based on mouse to add parallax
            camera.position.x = (window.mouseX * 0.0003);
            camera.position.y = -(window.mouseY * 0.0003);
        }
        
        // Render the scene
        renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
};

// Initialize NN Mapper when DOM is loaded
document.addEventListener('DOMContentLoaded', initNNMapperBackground);