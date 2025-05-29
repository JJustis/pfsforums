const initWindows95Background = () => {
    // Check for Three.js
    if (typeof THREE === 'undefined') {
        // Load Three.js if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = setupWindows95Background;
        document.head.appendChild(script);
    } else {
        setupWindows95Background();
    }

    function setupWindows95Background() {
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
            antialias: false, // Disable anti-aliasing for that pixelated look
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(1); // Force pixelation
        
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#008080'); // Classic Windows 95 teal
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            70, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.z = 30;
        camera.position.y = 10;
        camera.lookAt(0, 0, 0);
        
        // Windows 95 settings
        const settings = {
            gridSize: 50,
            gridSpacing: 2,
            windowsCount: 20,
            minWindowSize: 2,
            maxWindowSize: 5,
            hillsSegments: 30,
            hillsWidth: 100,
            hillsDepth: 80,
            hillsHeight: 8,
            cloudsCount: 15,
            colors: {
                grid: '#ffffff',
                taskbar: '#c0c0c0',
                window: '#c0c0c0',
                windowBorder: '#000000',
                titleBar: '#000080',
                startButton: '#c0c0c0',
                startText: '#000000',
                hills: '#008080',
                sky: '#87CEEB',
                ground: '#00a000'
            }
        };

        // Groups for organization
        const gridGroup = new THREE.Group();
        const windowsGroup = new THREE.Group();
        const landscapeGroup = new THREE.Group();
        const cloudsGroup = new THREE.Group();
        const taskbarGroup = new THREE.Group();
        
        scene.add(gridGroup);
        scene.add(windowsGroup);
        scene.add(landscapeGroup);
        scene.add(cloudsGroup);
        scene.add(taskbarGroup);
        
        // User interaction tracking
        const mouse = {
            x: 0,
            y: 0,
            previousX: 0,
            previousY: 0,
            down: false
        };

        // Create pixelated texture function
        function createPixelTexture(size, color1, color2, pixelSize) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = color1;
            ctx.fillRect(0, 0, size, size);
            
            ctx.fillStyle = color2;
            for (let x = 0; x < size; x += pixelSize) {
                for (let y = 0; y < size; y += pixelSize) {
                    if (Math.random() > 0.85) {
                        ctx.fillRect(x, y, pixelSize, pixelSize);
                    }
                }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            return texture;
        }

        // Create Windows logo texture
        function createWindowsLogo(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Draw Windows logo (simplified)
            const padding = size * 0.1;
            const windowSize = (size - (padding * 5)) / 2;
            
            // Red window (top left)
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(padding, padding, windowSize, windowSize);
            
            // Green window (top right)
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(padding * 3 + windowSize, padding, windowSize, windowSize);
            
            // Blue window (bottom left)
            ctx.fillStyle = '#0000FF';
            ctx.fillRect(padding, padding * 3 + windowSize, windowSize, windowSize);
            
            // Yellow window (bottom right)
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(padding * 3 + windowSize, padding * 3 + windowSize, windowSize, windowSize);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            return texture;
        }
        
        // Create a Windows 95 dialog window
        function createWindow95(x, y, z, width, height) {
            const group = new THREE.Group();
            group.position.set(x, y, z);
            
            // Main window
            const windowGeo = new THREE.BoxGeometry(width, height, 0.2);
            const windowMat = new THREE.MeshPhongMaterial({ 
                color: settings.colors.window,
                flatShading: true
            });
            const windowMesh = new THREE.Mesh(windowGeo, windowMat);
            group.add(windowMesh);
            
            // Title bar
            const titleBarGeo = new THREE.BoxGeometry(width, height * 0.15, 0.3);
            const titleBarMat = new THREE.MeshPhongMaterial({ 
                color: settings.colors.titleBar,
                flatShading: true
            });
            const titleBar = new THREE.Mesh(titleBarGeo, titleBarMat);
            titleBar.position.set(0, height * 0.425, 0.1);
            group.add(titleBar);
            
            // Border
            const edges = new THREE.EdgesGeometry(windowGeo);
            const borderMat = new THREE.LineBasicMaterial({ 
                color: settings.colors.windowBorder,
                linewidth: 2
            });
            const border = new THREE.LineSegments(edges, borderMat);
            group.add(border);
            
            // Add buttons
            const buttonSize = height * 0.1;
            const buttonGeo = new THREE.BoxGeometry(buttonSize, buttonSize, 0.3);
            const buttonMat = new THREE.MeshPhongMaterial({ 
                color: settings.colors.window,
                flatShading: true
            });
            
            // Close button
            const closeButton = new THREE.Mesh(buttonGeo, buttonMat);
            closeButton.position.set(width * 0.45, height * 0.425, 0.2);
            group.add(closeButton);
            
            // Maximize button
            const maxButton = new THREE.Mesh(buttonGeo, buttonMat);
            maxButton.position.set(width * 0.35, height * 0.425, 0.2);
            group.add(maxButton);
            
            // Minimize button
            const minButton = new THREE.Mesh(buttonGeo, buttonMat);
            minButton.position.set(width * 0.25, height * 0.425, 0.2);
            group.add(minButton);
            
            // Animation properties
            group.userData = {
                speed: Math.random() * 0.05 + 0.02,
                rotationSpeed: Math.random() * 0.01 - 0.005,
                direction: new THREE.Vector3(
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1
                ).normalize(),
                bounceTime: 0
            };
            
            windowsGroup.add(group);
            return group;
        }
        
        // Create grid
        function createGrid() {
            const gridSize = settings.gridSize;
            const spacing = settings.gridSpacing;
            
            const gridMaterial = new THREE.LineBasicMaterial({ 
                color: settings.colors.grid,
                transparent: true,
                opacity: 0.3
            });
            
            // Create horizontal lines
            for (let i = -gridSize/2; i <= gridSize/2; i += spacing) {
                const points = [
                    new THREE.Vector3(-gridSize/2, 0, i),
                    new THREE.Vector3(gridSize/2, 0, i)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, gridMaterial);
                gridGroup.add(line);
            }
            
            // Create vertical lines
            for (let i = -gridSize/2; i <= gridSize/2; i += spacing) {
                const points = [
                    new THREE.Vector3(i, 0, -gridSize/2),
                    new THREE.Vector3(i, 0, gridSize/2)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, gridMaterial);
                gridGroup.add(line);
            }
            
            // Position the grid lower
            gridGroup.position.y = -8;
            gridGroup.rotation.x = Math.PI / 2;
        }
        
        // Create Windows 95 hills landscape
        function createHills() {
            const width = settings.hillsWidth;
            const depth = settings.hillsDepth;
            const segments = settings.hillsSegments;
            
            // Create ground plane
            const groundGeo = new THREE.PlaneGeometry(width, depth, 1, 1);
            const groundMat = new THREE.MeshLambertMaterial({ 
                color: settings.colors.ground,
                side: THREE.DoubleSide,
                flatShading: true
            });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = Math.PI / 2;
            ground.position.y = -8;
            landscapeGroup.add(ground);
            
            // Create hills
            const hillsGeo = new THREE.PlaneGeometry(
                width, 
                depth, 
                segments, 
                segments
            );
            
            // Create the rolling hills effect
            const vertices = hillsGeo.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                // Apply sine wave patterns for the hills
                const x = vertices[i];
                const z = vertices[i + 2];
                
                // Classic Windows 95 rolling hills pattern
                let height = Math.sin(x * 0.1) * 2 + Math.sin(z * 0.1) * 2;
                
                // Add smaller variations
                height += Math.sin(x * 0.25 + z * 0.3) * 0.5;
                
                // Apply the height
                vertices[i + 1] = height;
            }
            
            hillsGeo.computeVertexNormals();
            
            // Create custom shader material for the "Windows 95 look"
            const hillsMat = new THREE.MeshLambertMaterial({ 
                color: settings.colors.hills,
                flatShading: true, // This gives the blocky look
                side: THREE.DoubleSide
            });
            
            const hills = new THREE.Mesh(hillsGeo, hillsMat);
            hills.rotation.x = Math.PI / 2;
            hills.position.y = -5;
            
            landscapeGroup.add(hills);
            
            // Position the entire landscape
            landscapeGroup.position.z = -30;
            landscapeGroup.position.y = -3;
        }
        
        // Create task bar
        function createTaskbar() {
            // Task bar
            const taskbarGeo = new THREE.BoxGeometry(30, 1.5, 0.5);
            const taskbarMat = new THREE.MeshPhongMaterial({ 
                color: settings.colors.taskbar,
                flatShading: true
            });
            const taskbar = new THREE.Mesh(taskbarGeo, taskbarMat);
            taskbar.position.set(0, -8, 15);
            
            // Start button
            const startButtonGeo = new THREE.BoxGeometry(3, 1.2, 0.6);
            const startButtonMat = new THREE.MeshPhongMaterial({ 
                color: settings.colors.startButton,
                flatShading: true
            });
            const startButton = new THREE.Mesh(startButtonGeo, startButtonMat);
            startButton.position.set(-13, -8, 15);
            
            // Windows logo on start button
            const logoSize = 1;
            const logoGeo = new THREE.PlaneGeometry(logoSize, logoSize);
            const logoMat = new THREE.MeshBasicMaterial({ 
                map: createWindowsLogo(64),
                transparent: true
            });
            const logo = new THREE.Mesh(logoGeo, logoMat);
            logo.position.set(-14, -8, 15.4);
            
            taskbarGroup.add(taskbar);
            taskbarGroup.add(startButton);
            taskbarGroup.add(logo);
            
            // Create time display
            const timeDisplayGeo = new THREE.BoxGeometry(4, 1.2, 0.6);
            const timeDisplayMat = new THREE.MeshPhongMaterial({ 
                color: settings.colors.window,
                flatShading: true
            });
            const timeDisplay = new THREE.Mesh(timeDisplayGeo, timeDisplayMat);
            timeDisplay.position.set(12.5, -8, 15);
            taskbarGroup.add(timeDisplay);
        }
        
        // Create clouds
        function createClouds() {
            for (let i = 0; i < settings.cloudsCount; i++) {
                const size = Math.random() * 3 + 2;
                
                // Create cloud as a group of cubes
                const cloudGroup = new THREE.Group();
                
                // Random number of cloud "puffs"
                const puffCount = Math.floor(Math.random() * 4) + 3;
                
                for (let j = 0; j < puffCount; j++) {
                    const puffSize = size * (0.5 + Math.random() * 0.5);
                    const puffGeo = new THREE.BoxGeometry(puffSize, puffSize, puffSize);
                    const puffMat = new THREE.MeshLambertMaterial({ 
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.8,
                        flatShading: true
                    });
                    
                    const puff = new THREE.Mesh(puffGeo, puffMat);
                    puff.position.set(
                        j * (size * 0.5) - (puffCount * size * 0.25),
                        Math.random() * size * 0.2,
                        Math.random() * size * 0.2
                    );
                    
                    cloudGroup.add(puff);
                }
                
                // Position the cloud
                cloudGroup.position.set(
                    Math.random() * 80 - 40,
                    Math.random() * 10 + 15,
                    -30 + Math.random() * 10
                );
                
                // Add animation data
                cloudGroup.userData = {
                    speed: Math.random() * 0.05 + 0.01,
                    originalX: cloudGroup.position.x
                };
                
                cloudsGroup.add(cloudGroup);
            }
        }
        
        // Create Windows for screen saver effect
        function createWindows() {
            for (let i = 0; i < settings.windowsCount; i++) {
                const width = Math.random() * 
                    (settings.maxWindowSize - settings.minWindowSize) + 
                    settings.minWindowSize;
                    
                const height = Math.random() * 
                    (settings.maxWindowSize - settings.minWindowSize) + 
                    settings.minWindowSize;
                
                createWindow95(
                    Math.random() * 40 - 20,
                    Math.random() * 20 - 5,
                    Math.random() * 20 - 10,
                    width,
                    height
                );
            }
        }
        
        // Create startup animation
        function createStartupSequence() {
            // Play windows startup sound if you want
            // ...
            
            // Animation timeline
            const duration = 3000; // 3 seconds
            const startTime = Date.now();
            
            // Animate function
            function animateStartup() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Fade in each group with a delay
                gridGroup.visible = progress > 0.2;
                gridGroup.children.forEach(child => {
                    child.material.opacity = Math.min((progress - 0.2) * 2, 0.3);
                });
                
                landscapeGroup.visible = progress > 0.4;
                landscapeGroup.position.y = -3 + (1 - Math.min((progress - 0.4) * 2, 1)) * 10;
                
                cloudsGroup.visible = progress > 0.6;
                cloudsGroup.position.y = (1 - Math.min((progress - 0.6) * 2, 1)) * 10;
                
                taskbarGroup.visible = progress > 0.8;
                taskbarGroup.position.y = (1 - Math.min((progress - 0.8) * 5, 1)) * 5;
                
                windowsGroup.visible = progress > 0.9;
                
                if (progress < 1) {
                    requestAnimationFrame(animateStartup);
                }
            }
            
            // Initialize visibility
            gridGroup.visible = false;
            landscapeGroup.visible = false;
            cloudsGroup.visible = false;
            taskbarGroup.visible = false;
            windowsGroup.visible = false;
            
            // Start animation
            animateStartup();
        }
        
        // Create all visual elements
        createGrid();
        createHills();
        createClouds();
        createTaskbar();
        createWindows();
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        scene.add(directionalLight);
        
        // Animation loop variables
        let lastTime = 0;
        const clock = new THREE.Clock();
        
        // Animation loop
        function animate(currentTime) {
            requestAnimationFrame(animate);
            
            const deltaTime = clock.getDelta();
            
            // Rotate groups slightly for parallax effect
            if (mouse.down) {
                const deltaX = mouse.x - mouse.previousX;
                const deltaY = mouse.y - mouse.previousY;
                
                if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
                    const rotationFactor = 0.5;
                    
                    // Different rotation strengths for each group creates parallax
                    gridGroup.rotation.y += deltaX * 0.01 * rotationFactor;
                    landscapeGroup.rotation.y += deltaX * 0.005 * rotationFactor;
                    cloudsGroup.rotation.y += deltaX * 0.002 * rotationFactor;
                    
                    // Limit rotation
                    gridGroup.rotation.y = Math.max(Math.min(gridGroup.rotation.y, Math.PI * 0.2), -Math.PI * 0.2);
                    landscapeGroup.rotation.y = Math.max(Math.min(landscapeGroup.rotation.y, Math.PI * 0.1), -Math.PI * 0.1);
                    cloudsGroup.rotation.y = Math.max(Math.min(cloudsGroup.rotation.y, Math.PI * 0.05), -Math.PI * 0.05);
                }
            }
            
            mouse.previousX = mouse.x;
            mouse.previousY = mouse.y;
            
            // Animate clouds
            cloudsGroup.children.forEach(cloud => {
                cloud.position.x += cloud.userData.speed;
                
                // Reset when cloud moves off screen
                if (cloud.position.x > 50) {
                    cloud.position.x = -50;
                }
            });
            
            // Animate windows
            windowsGroup.children.forEach(window => {
                // Update position
                window.position.x += window.userData.direction.x * window.userData.speed;
                window.position.y += window.userData.direction.y * window.userData.speed;
                window.position.z += window.userData.direction.z * window.userData.speed;
                
                // Update rotation
                window.rotation.x += window.userData.rotationSpeed;
                window.rotation.y += window.userData.rotationSpeed;
                
                // Bounce off invisible boundaries
                if (window.position.x < -20 || window.position.x > 20) {
                    window.userData.direction.x *= -1;
                }
                if (window.position.y < -10 || window.position.y > 15) {
                    window.userData.direction.y *= -1;
                }
                if (window.position.z < -15 || window.position.z > 15) {
                    window.userData.direction.z *= -1;
                }
                
                // Special animation: when windows collide
                window.userData.bounceTime -= deltaTime;
                
                if (window.userData.bounceTime <= 0) {
                    // Check for collisions with other windows
                    windowsGroup.children.forEach(otherWindow => {
                        if (window !== otherWindow) {
                            const distance = window.position.distanceTo(otherWindow.position);
                            
                            if (distance < 3) {
                                // Bounce in opposite directions
                                window.userData.direction.multiplyScalar(-1);
                                window.userData.bounceTime = 1; // Cooldown
                                
                                // Create "bounce" effect
                                window.scale.set(1.2, 1.2, 1.2);
                                
                                // Reset scale after 200ms
                                setTimeout(() => {
                                    window.scale.set(1, 1, 1);
                                }, 200);
                            }
                        }
                    });
                }
            });
            
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
        
        // Create startup animation
        createStartupSequence();
        
        // Start the animation loop
        animate(0);
    }
};

// Initialize Windows 95 background when DOM is loaded
document.addEventListener('DOMContentLoaded', initWindows95Background);