const initNeuralCosmosBackground = () => {
    // Check for Three.js
    if (typeof THREE === 'undefined') {
        // Load Three.js if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = setupNeuralCosmos;
        document.head.appendChild(script);
    } else {
        setupNeuralCosmos();
    }

    function setupNeuralCosmos() {
        // Create or get canvas element
        let canvas = document.getElementById('bg-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'bg-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '-1';
            document.body.appendChild(canvas);
        }

        // Initialize Three.js
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Create scene
        const scene = new THREE.Scene();
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            2000
        );
        camera.position.z = 30;
        
        // Neural Cosmos settings
        const settings = {
            nodesCount: 200,               // Total number of neural nodes
            connectionsPerNode: 3,         // Average connections per node
            nodeMinSize: 0.05,             // Minimum node size
            nodeMaxSize: 0.3,              // Maximum node size
            spaceSize: 50,                 // Size of 3D space
            nodeColors: [                  // Color palette for nodes
                new THREE.Color('#4285F4'), // Google Blue
                new THREE.Color('#EA4335'), // Google Red
                new THREE.Color('#FBBC05'), // Google Yellow
                new THREE.Color('#34A853'), // Google Green
                new THREE.Color('#8956FF'), // Purple
                new THREE.Color('#00C9FF')  // Cyan
            ],
            connectionColors: [            // Color palette for connections
                new THREE.Color('#FFFFFF'),
                new THREE.Color('#4285F4').multiplyScalar(0.7),
                new THREE.Color('#EA4335').multiplyScalar(0.7),
                new THREE.Color('#FBBC05').multiplyScalar(0.7),
                new THREE.Color('#34A853').multiplyScalar(0.7)
            ],
            pulseSpeed: 0.8,               // Speed of data pulse along connections
            rotationSpeed: 0.05,           // Background rotation speed
            interactionStrength: 1.5,      // Mouse interaction strength
            depth: 80                      // Depth of the 3D space
        };

        // Arrays to store our objects
        const nodes = [];
        const connections = [];
        const dataPulses = [];
        
        // Create groups for better organization
        const nodesGroup = new THREE.Group();
        const connectionsGroup = new THREE.Group();
        const pulsesGroup = new THREE.Group();
        
        scene.add(nodesGroup);
        scene.add(connectionsGroup);
        scene.add(pulsesGroup);
        
        // User interaction tracking
        const mouse = {
            x: 0,
            y: 0,
            previousX: 0,
            previousY: 0,
            down: false
        };

        // Neural Node class
        class NeuralNode {
            constructor(position, size, color) {
                this.position = position;
                this.size = size;
                this.color = color;
                this.connections = [];
                this.pulseFrequency = Math.random() * 5 + 1; // How often this node sends pulses
                this.lastPulseTime = Math.random() * 10; // Last time a pulse was sent
                this.active = Math.random() > 0.3; // Some nodes start inactive
                this.activationLevel = this.active ? Math.random() * 0.5 + 0.5 : 0.2;
                this.targetActivation = this.activationLevel;
                
                // Create the mesh
                const geometry = new THREE.SphereGeometry(size, 16, 16);
                const material = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: this.activationLevel
                });
                
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.copy(position);
                
                // Create glow effect
                const glowSize = size * 2;
                const glowGeometry = new THREE.SphereGeometry(glowSize, 16, 16);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.15,
                    side: THREE.BackSide
                });
                
                this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                this.glowMesh.position.copy(position);
                
                nodesGroup.add(this.mesh);
                nodesGroup.add(this.glowMesh);
            }
            
            update(deltaTime) {
                // Gradually change activation to target
                this.activationLevel += (this.targetActivation - this.activationLevel) * deltaTime * 2;
                this.mesh.material.opacity = this.activationLevel;
                this.glowMesh.material.opacity = this.activationLevel * 0.15;
                
                // Randomly change activation
                if (Math.random() < 0.01) {
                    this.targetActivation = this.active ? 
                        Math.random() * 0.3 + 0.7 : // Active nodes are brighter
                        Math.random() * 0.15 + 0.1; // Inactive nodes are dimmer
                }
                
                // Generate pulses
                if (this.active && this.connections.length > 0) {
                    this.lastPulseTime += deltaTime;
                    if (this.lastPulseTime > this.pulseFrequency) {
                        this.lastPulseTime = 0;
                        this.pulseFrequency = Math.random() * 5 + 1;
                        
                        // Create a pulse along a random connection
                        const randomConnection = this.connections[
                            Math.floor(Math.random() * this.connections.length)
                        ];
                        
                        createDataPulse(randomConnection, this);
                    }
                }
            }
            
            activate() {
                this.active = true;
                this.targetActivation = Math.random() * 0.3 + 0.7;
                
                // Activate connected inactive nodes with a chance
                if (Math.random() < 0.3) {
                    this.connections.forEach(connection => {
                        const otherNode = connection.startNode === this ? 
                            connection.endNode : connection.startNode;
                            
                        if (!otherNode.active && Math.random() < 0.4) {
                            otherNode.activate();
                        }
                    });
                }
            }
        }
        
        // Neural Connection class
        class NeuralConnection {
            constructor(startNode, endNode, color) {
                this.startNode = startNode;
                this.endNode = endNode;
                this.color = color;
                this.pulses = [];
                this.active = true;
                this.strength = Math.random() * 0.5 + 0.5; // Connection strength
                
                // Create line geometry
                const points = [
                    startNode.position,
                    endNode.position
                ];
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                
                // Create material with custom dashed line
                const material = new THREE.LineBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.3 * this.strength
                });
                
                this.line = new THREE.Line(geometry, material);
                connectionsGroup.add(this.line);
                
                // Add this connection to both nodes
                startNode.connections.push(this);
                endNode.connections.push(this);
            }
            
            update() {
                // Update connection opacity based on nodes' activation
                const avgActivation = (this.startNode.activationLevel + 
                                      this.endNode.activationLevel) / 2;
                                      
                this.line.material.opacity = 0.3 * avgActivation * this.strength;
            }
        }
        
        // Data Pulse (traveling along connections)
        class DataPulse {
            constructor(connection, startNode, color) {
                this.connection = connection;
                this.startNode = startNode;
                this.progress = 0; // 0 to 1, position along connection
                this.speed = settings.pulseSpeed * (0.8 + Math.random() * 0.4);
                this.size = Math.random() * 0.15 + 0.05;
                this.alive = true;
                
                // Use startNode's color with higher intensity
                this.color = startNode.color.clone();
                
                // Create the mesh
                const geometry = new THREE.SphereGeometry(this.size, 8, 8);
                const material = new THREE.MeshBasicMaterial({
                    color: this.color,
                    transparent: true,
                    opacity: 0.8
                });
                
                this.mesh = new THREE.Mesh(geometry, material);
                
                // Calculate initial position (at the start node)
                this.updatePosition();
                
                pulsesGroup.add(this.mesh);
                dataPulses.push(this);
            }
            
            update(deltaTime) {
                this.progress += this.speed * deltaTime;
                
                if (this.progress >= 1) {
                    // Reached the end, activate end node
                    const targetNode = this.connection.startNode === this.startNode ? 
                        this.connection.endNode : this.connection.startNode;
                    
                    targetNode.activate();
                    
                    // Remove this pulse
                    this.alive = false;
                    pulsesGroup.remove(this.mesh);
                    return;
                }
                
                this.updatePosition();
            }
            
            updatePosition() {
                // Interpolate between start and end positions
                const startPos = this.startNode.position;
                const endPos = this.connection.startNode === this.startNode ? 
                    this.connection.endNode.position : this.connection.startNode.position;
                
                this.mesh.position.x = startPos.x + (endPos.x - startPos.x) * this.progress;
                this.mesh.position.y = startPos.y + (endPos.y - startPos.y) * this.progress;
                this.mesh.position.z = startPos.z + (endPos.z - startPos.z) * this.progress;
                
                // Pulse effect - grow and shrink slightly
                const pulseScale = 1 + Math.sin(this.progress * Math.PI * 2) * 0.2;
                this.mesh.scale.set(pulseScale, pulseScale, pulseScale);
            }
        }
        
        // Function to create a data pulse
        function createDataPulse(connection, startNode) {
            new DataPulse(
                connection, 
                startNode, 
                settings.nodeColors[Math.floor(Math.random() * settings.nodeColors.length)]
            );
        }
        
        // Create initial neural nodes
        function createNodes() {
            for (let i = 0; i < settings.nodesCount; i++) {
                // Random position in 3D space
                const position = new THREE.Vector3(
                    (Math.random() - 0.5) * settings.spaceSize,
                    (Math.random() - 0.5) * settings.spaceSize,
                    (Math.random() - 0.5) * settings.depth - 10
                );
                
                // Random size between min and max
                const size = Math.random() * 
                    (settings.nodeMaxSize - settings.nodeMinSize) + 
                    settings.nodeMinSize;
                
                // Random color from palette
                const colorIndex = Math.floor(Math.random() * settings.nodeColors.length);
                const color = settings.nodeColors[colorIndex];
                
                // Create node
                const node = new NeuralNode(position, size, color);
                nodes.push(node);
            }
        }
        
        // Create connections between nodes
        function createConnections() {
            // For each node, create some connections
            nodes.forEach(node => {
                // Get desired number of connections for this node
                const numConnections = Math.floor(Math.random() * 
                    settings.connectionsPerNode) + 1;
                
                // Find the nearest nodes to connect to
                const nodeDistances = nodes.map((otherNode, index) => {
                    if (otherNode === node) return { index, distance: Infinity };
                    
                    const distance = node.position.distanceTo(otherNode.position);
                    return { index, distance };
                });
                
                // Sort by distance and take the closest ones
                nodeDistances.sort((a, b) => a.distance - b.distance);
                
                for (let i = 0; i < numConnections && i < nodeDistances.length - 1; i++) {
                    const otherNodeIndex = nodeDistances[i].index;
                    const otherNode = nodes[otherNodeIndex];
                    
                    // Only connect if distance is reasonable
                    if (nodeDistances[i].distance < settings.spaceSize * 0.3) {
                        // Check if connection already exists
                        const connectionExists = node.connections.some(conn => 
                            (conn.startNode === node && conn.endNode === otherNode) ||
                            (conn.startNode === otherNode && conn.endNode === node)
                        );
                        
                        if (!connectionExists) {
                            // Create connection with random color
                            const colorIndex = Math.floor(Math.random() * settings.connectionColors.length);
                            const connection = new NeuralConnection(
                                node, 
                                otherNode, 
                                settings.connectionColors[colorIndex]
                            );
                            
                            connections.push(connection);
                        }
                    }
                }
            });
        }
        
        // Create the visual elements
        createNodes();
        createConnections();
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        // Add point lights for dynamic lighting
        const colors = [0x4285F4, 0xEA4335, 0xFBBC05, 0x34A853];
        
        for (let i = 0; i < 4; i++) {
            const intensity = 1;
            const light = new THREE.PointLight(colors[i], intensity, 150);
            light.position.set(
                (Math.random() - 0.5) * settings.spaceSize * 2,
                (Math.random() - 0.5) * settings.spaceSize * 2,
                (Math.random() - 0.5) * settings.spaceSize * 2
            );
            scene.add(light);
        }
        
        // Add faint fog for depth
        scene.fog = new THREE.FogExp2(0x000a18, 0.008);
        
        // Stars in the background
        function createStars() {
            const starsGeometry = new THREE.BufferGeometry();
            const starsMaterial = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.1,
                transparent: true,
                opacity: 0.8
            });
            
            const starsVertices = [];
            for (let i = 0; i < 1000; i++) {
                const x = (Math.random() - 0.5) * 2000;
                const y = (Math.random() - 0.5) * 2000;
                const z = (Math.random() - 0.5) * 2000;
                starsVertices.push(x, y, z);
            }
            
            starsGeometry.setAttribute(
                'position', 
                new THREE.Float32BufferAttribute(starsVertices, 3)
            );
            
            const stars = new THREE.Points(starsGeometry, starsMaterial);
            scene.add(stars);
        }
        
        createStars();
        
        // Animation loop variables
        let lastTime = 0;
        const clock = new THREE.Clock();
        
        // Animation loop
        function animate(currentTime) {
            requestAnimationFrame(animate);
            
            const deltaTime = clock.getDelta();
            
            // Scene rotation
            nodesGroup.rotation.y += settings.rotationSpeed * deltaTime;
            connectionsGroup.rotation.y += settings.rotationSpeed * deltaTime;
            pulsesGroup.rotation.y += settings.rotationSpeed * deltaTime;
            
            // Apply mouse interaction if mouse is moving
            if (mouse.down) {
                const deltaX = mouse.x - mouse.previousX;
                const deltaY = mouse.y - mouse.previousY;
                
                if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
                    nodesGroup.rotation.y += deltaX * 0.01 * settings.interactionStrength;
                    connectionsGroup.rotation.y += deltaX * 0.01 * settings.interactionStrength;
                    pulsesGroup.rotation.y += deltaX * 0.01 * settings.interactionStrength;
                    
                    nodesGroup.rotation.x += deltaY * 0.01 * settings.interactionStrength;
                    connectionsGroup.rotation.x += deltaY * 0.01 * settings.interactionStrength;
                    pulsesGroup.rotation.x += deltaY * 0.01 * settings.interactionStrength;
                }
            }
            
            mouse.previousX = mouse.x;
            mouse.previousY = mouse.y;
            
            // Update all nodes
            nodes.forEach(node => node.update(deltaTime));
            
            // Update all connections
            connections.forEach(connection => connection.update());
            
            // Update data pulses and remove dead ones
            for (let i = dataPulses.length - 1; i >= 0; i--) {
                dataPulses[i].update(deltaTime);
                if (!dataPulses[i].alive) {
                    dataPulses.splice(i, 1);
                }
            }
            
            // Random node activation
            if (Math.random() < 0.02) {
                const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
                randomNode.activate();
            }
            
            // Render scene
            renderer.render(scene, camera);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Update camera aspect ratio
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            
            // Update renderer size
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
        
        // Mouse interaction
        document.addEventListener('mousemove', (event) => {
            // Calculate normalized mouse coordinates
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        document.addEventListener('mousedown', () => {
            mouse.down = true;
        });
        
        document.addEventListener('mouseup', () => {
            mouse.down = false;
        });
        
        // Touch interaction for mobile
        document.addEventListener('touchmove', (event) => {
            if (event.touches.length > 0) {
                mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
                
                // Prevent scrolling
                event.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchstart', (event) => {
            mouse.down = true;
            if (event.touches.length > 0) {
                mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
                mouse.previousX = mouse.x;
                mouse.previousY = mouse.y;
            }
        });
        
        document.addEventListener('touchend', () => {
            mouse.down = false;
        });
        
        // Start the animation loop
        animate(0);
    }
};

// Initialize Neural Cosmos background when DOM is loaded
document.addEventListener('DOMContentLoaded', initNeuralCosmosBackground);