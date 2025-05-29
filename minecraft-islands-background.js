const initThreeBackground = () => {
    // Track loading progress and performance
    const stats = {
        loadingProgress: 0,
        assetsToLoad: 0,
        assetsLoaded: 0
    };
    
    // Create a simple loading indicator
    const createLoadingIndicator = () => {
        const loader = document.createElement('div');
        loader.id = 'three-loader';
        loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:3px;background:rgba(0,0,0,0.2);z-index:1000;';
        
        const progress = document.createElement('div');
        progress.style.cssText = 'height:100%;width:0%;background:#4285f4;transition:width 0.3s;';
        loader.appendChild(progress);
        document.body.appendChild(loader);
        
        return {
            update: (percent) => {
                progress.style.width = `${percent}%`;
            },
            remove: () => {
                loader.style.opacity = 0;
                setTimeout(() => loader.remove(), 500);
            }
        };
    };
    
    const loader = createLoadingIndicator();
    
    // Get or create canvas with error handling
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
        document.body.appendChild(canvas);
    }
    
    // Check for WebGL support and set appropriate renderer
    let renderer;
    try {
        // Try WebGL2 first for better performance
        renderer = new THREE.WebGLRenderer({
            canvas, 
            alpha: true,
            antialias: false,
            precision: 'mediump',
            powerPreference: 'high-performance'
        });
    } catch (e) {
        console.warn('WebGL issue detected:', e);
        // Fallback to a simple colored background
        canvas.style.background = 'linear-gradient(to bottom, #090b1f 0%, #182048 100%)';
        addBackgroundCSS();
        
        // Remove loading indicator
        loader.remove();
        return;
    }
    
    // Set pixel ratio optimized for performance vs quality
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Enable frustum culling for performance
    renderer.frustumCulled = true;
    
    // Enable shader precision optimizations
    renderer.precision = 'mediump';
    
    // Create scene and object pools
    const scene = new THREE.Scene();
    
    // Create geometries and material pools (create once, reuse many)
    const geometries = {
        box: new THREE.BoxGeometry(1, 1, 1)
    };
    
    // Create isometric camera for Minecraft-like look
    const aspect = window.innerWidth / window.innerHeight;
    const d = 25;
    const camera = new THREE.OrthographicCamera(
        -d * aspect, d * aspect, d, -d, 1, 1000
    );
    camera.position.set(d, d, d);
    camera.lookAt(0, 0, 0);
    
    // Load manager to track loading progress
    const loadManager = new THREE.LoadingManager();
    loadManager.onProgress = (url, loaded, total) => {
        stats.assetsLoaded = loaded;
        stats.assetsToLoad = total;
        stats.loadingProgress = Math.floor((loaded / total) * 100);
        loader.update(stats.loadingProgress);
    };
    
    loadManager.onLoad = () => {
        // Hide loader when everything is loaded
        setTimeout(() => {
            loader.remove();
        }, 500);
    };
    
    // Setup texture loader with loading manager
    const textureLoader = new THREE.TextureLoader(loadManager);
    
    // Preload all textures at once - returns a promise
    const preloadTextures = () => {
        const texturePaths = [
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/grass_dirt.png',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/grass.png',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/dirt.png',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/stone.png',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/oak_log.png',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/oak_log_top.png',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/leaves_oak.png',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg',
            'https://threejs.org/examples/textures/sprites/spark1.png'
        ];
        
        const texturePromises = texturePaths.map(path => {
            return new Promise(resolve => {
                const texture = textureLoader.load(path, () => resolve(texture));
                
                // Apply pixel-perfect settings for all textures
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                
                // Return texture name and the loaded texture
                const name = path.split('/').pop().split('.')[0];
                return { name, texture };
            });
        });
        
        return Promise.all(texturePromises);
    };
    
    // Create a simple starry sky (simplified version to start with)
    const createLightweightSky = () => {
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                void main() {
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec3 vPosition;
                
                float rand(vec2 co) {
                    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec3 dir = normalize(vPosition);
                    float altitude = dir.y * 0.5 + 0.5;
                    vec3 nightColor = mix(
                        vec3(0.03, 0.05, 0.1),
                        vec3(0.0, 0.0, 0.05),
                        altitude
                    );
                    gl_FragColor = vec4(nightColor, 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false
        });
        
        const skyboxGeometry = new THREE.SphereGeometry(400, 16, 16);
        skyboxGeometry.scale(-1, 1, 1);
        const skyMesh = new THREE.Mesh(skyboxGeometry, skyMaterial);
        scene.add(skyMesh);
        
        return { mesh: skyMesh, material: skyMaterial };
    };
    
    // Initial sky (will be enhanced later)
    const skybox = createLightweightSky();
    
    // Add basic lighting to make scene visible during loading
    const ambientLight = new THREE.AmbientLight(0x3333aa, 0.4);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffcc, 0.6);
    dirLight.position.set(5, 12, 8);
    scene.add(dirLight);
    
    // Create object containers
    const worldGroup = new THREE.Group();
    const steveGroup = new THREE.Group();
    const birdGroup = new THREE.Group();
    
    scene.add(worldGroup);
    scene.add(steveGroup);
    scene.add(birdGroup);
    
    // World bounds
    const WORLD_SIZE = 120;
    const WORLD_HALF = WORLD_SIZE / 2;
    
    // Cache for block instances (reuse meshes)
    const blockCache = {
        grass: [],
        dirt: [],
        stone: [],
        log: [],
        leaves: []
    };
    
    // Heightmap cache to avoid expensive raycasting
    const heightMap = {};
    
    // Object pooling - get an object from cache or create a new one
    const getBlockFromCache = (type, materials) => {
        if (blockCache[type].length > 0) {
            return blockCache[type].pop();
        }
        
        // Create a new block if none in cache
        const block = new THREE.Mesh(geometries.box, materials);
        return block;
    };
    
    // Return object to pool when not needed
    const returnBlockToCache = (block, type) => {
        if (blockCache[type].length < 100) { // Limit cache size
            blockCache[type].push(block);
        }
    };
    
    // Optimized Perlin noise generator (simplified for performance)
    const generateFastNoise = (width, height) => {
        const noise = new Array(width).fill().map(() => new Array(height).fill(0));
        
        // Generate random noise
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                noise[x][y] = Math.random();
            }
        }
        
        // Simple smoothing pass
        for (let x = 1; x < width - 1; x++) {
            for (let y = 1; y < height - 1; y++) {
                noise[x][y] = (
                    noise[x-1][y-1] + noise[x][y-1] + noise[x+1][y-1] +
                    noise[x-1][y] + noise[x][y] + noise[x+1][y] +
                    noise[x-1][y+1] + noise[x][y+1] + noise[x+1][y+1]
                ) / 9;
            }
        }
        
        return noise;
    };
    
    // Base progressive loading function
    const loadScene = async () => {
        // Start with essential elements first
        
        // 1. First load textures (in parallel)
        const textures = {};
        (await preloadTextures()).forEach(({ name, texture }) => {
            textures[name] = texture;
        });
        
        // 2. Create materials (once textures are loaded)
        const materials = {
            grass: [
                new THREE.MeshLambertMaterial({ map: textures.grass_dirt }), // Right
                new THREE.MeshLambertMaterial({ map: textures.grass_dirt }), // Left
                new THREE.MeshLambertMaterial({ map: textures.grass }), // Top
                new THREE.MeshLambertMaterial({ map: textures.dirt }), // Bottom
                new THREE.MeshLambertMaterial({ map: textures.grass_dirt }), // Front
                new THREE.MeshLambertMaterial({ map: textures.grass_dirt }) // Back
            ],
            dirt: Array(6).fill().map(() => new THREE.MeshLambertMaterial({ map: textures.dirt })),
            stone: Array(6).fill().map(() => new THREE.MeshLambertMaterial({ map: textures.stone })),
            log: [
                new THREE.MeshLambertMaterial({ map: textures.oak_log }), // Right
                new THREE.MeshLambertMaterial({ map: textures.oak_log }), // Left
                new THREE.MeshLambertMaterial({ map: textures.oak_log_top }), // Top
                new THREE.MeshLambertMaterial({ map: textures.oak_log_top }), // Bottom
                new THREE.MeshLambertMaterial({ map: textures.oak_log }), // Front
                new THREE.MeshLambertMaterial({ map: textures.oak_log }) // Back
            ],
            leaves: Array(6).fill().map(() => new THREE.MeshLambertMaterial({ map: textures.leaves_oak }))
        };
        
        // Add emissive glow to all materials for nighttime visibility
        Object.values(materials).forEach(matArray => {
            matArray.forEach(mat => {
                mat.emissive = new THREE.Color(0x222222);
                mat.emissiveIntensity = 0.15;
            });
        });
        
        // 3. Generate central islands first (for immediate visibility)
        generateCentralIsland(materials);
        
        // 4. Start animation as soon as central elements are loaded
        startAnimation();
        
        // 5. Load remaining islands in batches for better responsiveness
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        
        // Load first batch of islands
        generateBatchOfIslands(5, materials);
        
        // Load second batch after a delay
        await new Promise(resolve => setTimeout(resolve, 200));
        generateBatchOfIslands(5, materials);
        
        // 6. Generate characters only after environment is loaded
        await new Promise(resolve => setTimeout(resolve, 300));
        generateSteves(materials, 6); // Reduced count for performance
        generateBirds(10); // Reduced count for performance
        
        // 7. Finally, enhance sky with full shader complexity
        enhanceSkyShader();
        
        // 8. Add moon
        createMoon(textures.moon_1024);
        
        // 9. Add falling stars effect
        createFallingStars(textures.spark1);
    };
    
    // Generate central island (most important visual element)
    const generateCentralIsland = (materials) => {
        const island = new THREE.Group();
        const size = 12;
        const mapSize = size * 2 + 1;
        const heightMap = generateFastNoise(mapSize, mapSize);
        const topBlocks = [];
        
        // Create blocks for central island
        for (let x = 0; x < mapSize; x++) {
            for (let z = 0; z < mapSize; z++) {
                const distX = (x - size) / size;
                const distZ = (z - size) / size;
                const dist = Math.sqrt(distX * distX + distZ * distZ);
                
                if (dist > 1.0) continue;
                
                const edgeFactor = 1 - Math.pow(dist, 2);
                const maxHeight = Math.round(size * 0.5 * edgeFactor);
                const noiseHeight = Math.floor(heightMap[x][z] * maxHeight * 0.7);
                const totalHeight = Math.max(1, noiseHeight + 1);
                
                for (let y = 0; y < totalHeight; y++) {
                    let block;
                    let blockType;
                    
                    if (y === totalHeight - 1) {
                        block = getBlockFromCache('grass', materials.grass);
                        blockType = 'grass';
                        
                        if (dist < 0.9) {
                            topBlocks.push({
                                x: x - size,
                                y: y,
                                z: z - size,
                                dist: dist
                            });
                        }
                    } else if (y > totalHeight - 3) {
                        block = getBlockFromCache('dirt', materials.dirt);
                        blockType = 'dirt';
                    } else {
                        block = getBlockFromCache('stone', materials.stone);
                        blockType = 'stone';
                    }
                    
                    block.position.set(x - size, y, z - size);
                    island.add(block);
                    
                    // Cache height for faster access later
                    const key = `${Math.round(x - size)},${Math.round(z - size)}`;
                    heightMap[key] = y;
                }
            }
        }
        
        // Add a few trees
        const treeCount = 3;
        for (let i = 0; i < treeCount; i++) {
            const index = Math.floor(Math.random() * topBlocks.length);
            const block = topBlocks[index];
            
            if (block && block.dist < 0.7) {
                createTree(
                    block.x,
                    block.y + 1,
                    block.z,
                    island,
                    materials
                );
                
                // Remove nearby blocks from candidates
                topBlocks.splice(index, 1);
            }
        }
        
        worldGroup.add(island);
    };
    
    // Generate islands in batches for progressive loading
    const generateBatchOfIslands = (count, materials) => {
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep + Math.random() * 0.3;
            const radius = 35 + Math.random() * 15;
            
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 15;
            
            const size = 5 + Math.floor(Math.random() * 3); // Smaller for performance
            
            generateIsland(x, y, z, size, materials);
        }
    };
    
    // Optimized island generation
    const generateIsland = (centerX, centerY, centerZ, size, materials) => {
        const island = new THREE.Group();
        const mapSize = size * 2 + 1;
        const heightMap = generateFastNoise(mapSize, mapSize);
        const topBlocks = [];
        
        // Create island mesh
        for (let x = 0; x < mapSize; x++) {
            for (let z = 0; z < mapSize; z++) {
                const distX = (x - size) / size;
                const distZ = (z - size) / size;
                const dist = Math.sqrt(distX * distX + distZ * distZ);
                
                if (dist > 1.0) continue;
                
                const edgeFactor = 1 - Math.pow(dist, 2);
                const maxHeight = Math.round(size * 0.5 * edgeFactor);
                const noiseHeight = Math.floor(heightMap[x][z] * maxHeight * 0.7);
                const totalHeight = Math.max(1, noiseHeight + 1);
                
                // Only create visible blocks (optimization)
                // Create top layer and exposed side blocks
                for (let y = 0; y < totalHeight; y++) {
                    if (y < totalHeight - 3 && y > 0) continue; // Skip hidden inner blocks
                    
                    let block;
                    let blockType;
                    
                    if (y === totalHeight - 1) {
                        block = getBlockFromCache('grass', materials.grass);
                        blockType = 'grass';
                        
                        if (dist < 0.8 && Math.random() < 0.1) { // Reduced tree placement chance
                            topBlocks.push({
                                x: x - size + centerX,
                                y: y + centerY,
                                z: z - size + centerZ,
                                dist: dist
                            });
                        }
                    } else if (y > totalHeight - 3) {
                        block = getBlockFromCache('dirt', materials.dirt);
                        blockType = 'dirt';
                    } else {
                        block = getBlockFromCache('stone', materials.stone);
                        blockType = 'stone';
                    }
                    
                    block.position.set(
                        x - size + centerX,
                        y + centerY,
                        z - size + centerZ
                    );
                    
                    island.add(block);
                    
                    // Cache height for faster access later
                    const key = `${Math.round(x - size + centerX)},${Math.round(z - size + centerZ)}`;
                    heightMap[key] = y + centerY;
                }
            }
        }
        
        // Add one tree per island for visual interest but less computational cost
        if (topBlocks.length > 0) {
            const blockIndex = Math.floor(Math.random() * topBlocks.length);
            const block = topBlocks[blockIndex];
            
            createTree(
                block.x,
                block.y + 1,
                block.z,
                island,
                materials
            );
        }
        
        worldGroup.add(island);
    };
    
    // Simplified tree creation
    const createTree = (x, y, z, parent, materials) => {
        const treeHeight = 3 + Math.floor(Math.random() * 2);
        
        // Create trunk
        for (let i = 0; i < treeHeight; i++) {
            const log = getBlockFromCache('log', materials.log);
            log.position.set(x, y + i, z);
            parent.add(log);
        }
        
        // Create leaves (simplified)
        const leavesHeight = 2;
        const leavesRadius = 1;
        
        for (let lY = 0; lY < leavesHeight; lY++) {
            const radius = lY === 0 ? leavesRadius : 1;
            
            for (let lX = -radius; lX <= radius; lX++) {
                for (let lZ = -radius; lZ <= radius; lZ++) {
                    // Skip corners
                    if (Math.abs(lX) === radius && Math.abs(lZ) === radius) continue;
                    
                    const leaves = getBlockFromCache('leaves', materials.leaves);
                    leaves.position.set(
                        x + lX,
                        y + treeHeight - 1 + lY,
                        z + lZ
                    );
                    
                    parent.add(leaves);
                }
            }
        }
    };
    
    // Optimized bird creation
    const generateBirds = (count) => {
        const birdGeometries = {
            body: new THREE.BoxGeometry(0.5, 0.5, 0.8),
            head: new THREE.BoxGeometry(0.4, 0.4, 0.4),
            beak: new THREE.BoxGeometry(0.2, 0.2, 0.3),
            wing: new THREE.BoxGeometry(0.8, 0.1, 0.5),
            tail: new THREE.BoxGeometry(0.4, 0.2, 0.4)
        };
        
        const colors = [0xFF5252, 0xFFD740, 0x69F0AE, 0x40C4FF, 0xBA68C8];
        const birds = [];
        
        for (let i = 0; i < count; i++) {
            const bird = new THREE.Group();
            
            // Random bird color
            const color = colors[Math.floor(Math.random() * colors.length)];
            const material = new THREE.MeshLambertMaterial({ color: color });
            const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
            
            // Bird body
            const body = new THREE.Mesh(birdGeometries.body, material);
            bird.add(body);
            
            // Bird head
            const head = new THREE.Mesh(birdGeometries.head, material);
            head.position.set(0, 0.1, 0.6);
            bird.add(head);
            
            // Bird beak
            const beak = new THREE.Mesh(birdGeometries.beak, beakMaterial);
            beak.position.set(0, 0, 0.8);
            bird.add(beak);
            
            // Bird wings
            const leftWing = new THREE.Mesh(birdGeometries.wing, material);
            leftWing.position.set(0.65, 0, 0);
            bird.add(leftWing);
            
            const rightWing = new THREE.Mesh(birdGeometries.wing, material);
            rightWing.position.set(-0.65, 0, 0);
            bird.add(rightWing);
            
            // Bird tail
            const tail = new THREE.Mesh(birdGeometries.tail, material);
            tail.position.set(0, 0, -0.5);
            bird.add(tail);
            
            // Flight data
            bird.userData = {
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * WORLD_SIZE * 0.8,
                    5 + Math.random() * 10,
                    (Math.random() - 0.5) * WORLD_SIZE * 0.8
                ),
                target: new THREE.Vector3(),
                speed: 0.05 + Math.random() * 0.1,
                wingAngle: 0,
                wingSpeed: 0.15 + Math.random() * 0.1,
                leftWing: leftWing,
                rightWing: rightWing
            };
            
            // Set initial position
            bird.position.copy(bird.userData.position);
            
            // Set random target
            bird.userData.target.set(
                (Math.random() - 0.5) * WORLD_SIZE * 0.8,
                5 + Math.random() * 10,
                (Math.random() - 0.5) * WORLD_SIZE * 0.8
            );
            
            birds.push(bird);
            birdGroup.add(bird);
        }
        
        return birds;
    };
    
    // Simplified Steve character creation
    const generateSteves = (materials, count) => {
        const steveGeometries = {
            head: new THREE.BoxGeometry(0.4, 0.4, 0.4),
            body: new THREE.BoxGeometry(0.5, 0.6, 0.3),
            arm: new THREE.BoxGeometry(0.2, 0.6, 0.2),
            leg: new THREE.BoxGeometry(0.2, 0.6, 0.2),
            shoe: new THREE.BoxGeometry(0.2, 0.1, 0.3)
        };
        
        const shirtColors = [0x5D76CB, 0x3CB371, 0xCD5C5C, 0x4682B4, 0x9370DB];
        const pantsColors = [0x191970, 0x3F3F3F, 0x8B4513, 0x2F4F4F, 0x556B2F];
        const steves = [];
        
        for (let i = 0; i < count; i++) {
            const steve = new THREE.Group();
            
            const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD4B8 });
            const shirtMaterial = new THREE.MeshLambertMaterial({ 
                color: shirtColors[Math.floor(Math.random() * shirtColors.length)] 
            });
            const pantsMaterial = new THREE.MeshLambertMaterial({ 
                color: pantsColors[Math.floor(Math.random() * pantsColors.length)] 
            });
            const shoeMaterial = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
            
            // Head
            const head = new THREE.Mesh(steveGeometries.head, skinMaterial);
            head.position.set(0, 0.95, 0);
            steve.add(head);
            
            // Body
            const body = new THREE.Mesh(steveGeometries.body, shirtMaterial);
            body.position.set(0, 0.45, 0);
            steve.add(body);
            
            // Arms
            const leftArm = new THREE.Mesh(steveGeometries.arm, shirtMaterial);
            leftArm.position.set(0.35, 0.45, 0);
            steve.add(leftArm);
            
            const rightArm = new THREE.Mesh(steveGeometries.arm, shirtMaterial);
            rightArm.position.set(-0.35, 0.45, 0);
            steve.add(rightArm);
            
            // Legs
            const leftLeg = new THREE.Mesh(steveGeometries.leg, pantsMaterial);
            leftLeg.position.set(0.15, -0.15, 0);
            steve.add(leftLeg);
            
            const rightLeg = new THREE.Mesh(steveGeometries.leg, pantsMaterial);
            rightLeg.position.set(-0.15, -0.15, 0);
            steve.add(rightLeg);
            
            // Shoes
            const leftShoe = new THREE.Mesh(steveGeometries.shoe, shoeMaterial);
            leftShoe.position.set(0.15, -0.5, 0.05);
            steve.add(leftShoe);
            
            const rightShoe = new THREE.Mesh(steveGeometries.shoe, shoeMaterial);
            rightShoe.position.set(-0.15, -0.5, 0.05);
            steve.add(rightShoe);
            
            // Scale down
            steve.scale.set(0.5, 0.5, 0.5);
            
            // Animation properties
            steve.userData = {
                position: new THREE.Vector3(0, 0, 0),
                direction: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.05,
                    0,
                    (Math.random() - 0.5) * 0.05
                ),
                falling: false,
                fallSpeed: 0,
                animTime: Math.random() * Math.PI * 2,
                animSpeed: 0.1 + Math.random() * 0.05,
                leftArm: leftArm,
                rightArm: rightArm,
                leftLeg: leftLeg,
                rightLeg: rightLeg
            };
            
            // Place on an island
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            
            // Find height at this position from cached heightmap
            const key = `${Math.round(x)},${Math.round(z)}`;
            const height = heightMap[key] ? heightMap[key] + 0.75 : 5; // Default height if not found
            
            steve.userData.position.set(x, height, z);
            steve.position.copy(steve.userData.position);
            
            const angle = Math.random() * Math.PI * 2;
            steve.rotation.y = angle;
            
            // Update direction based on rotation
            steve.userData.direction.set(
                Math.sin(angle) * 0.05,
                0,
                Math.cos(angle) * 0.05
            );
            
            steves.push(steve);
            steveGroup.add(steve);
        }
        
        return steves;
    };
    
    // Add moon with optimized texture loading
    const createMoon = (moonTexture) => {
        const moonGeometry = new THREE.SphereGeometry(8, 16, 16);
        
        const moonMaterial = new THREE.MeshPhongMaterial({
            map: moonTexture,
            emissive: 0x444444,
            emissiveIntensity: 0.2,
            shininess: 5
        });
        
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.position.set(-150, 100, -150);
        
        // Add variable to track rotation
        moon.userData = {
            rotationSpeed: 0.01
        };
        
        scene.add(moon);
        return moon;
    };
    
    // Create falling stars with optimized particle system
    const createFallingStars = (sparkTexture) => {
        const starCount = 3; // Reduced for performance
        const fallingStarGeometry = new THREE.BufferGeometry();
        const fallingStarPositions = new Float32Array(starCount * 3);
        const fallingStarData = new Float32Array(starCount * 3); // lifetime, speed, size
        
        // Initialize falling stars
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            
            // Start position (not visible yet)
            fallingStarPositions[i3] = 0;
            fallingStarPositions[i3 + 1] = 0;
            fallingStarPositions[i3 + 2] = 0;
            
            // Initialize with inactive state
            fallingStarData[i3] = -1; // lifetime < 0 means inactive
            fallingStarData[i3 + 1] = 0.5 + Math.random() * 0.5; // speed
            fallingStarData[i3 + 2] = 0.5 + Math.random() * 0.5; // size
        }
        
        fallingStarGeometry.setAttribute('position', new THREE.BufferAttribute(fallingStarPositions, 3));
        fallingStarGeometry.setAttribute('data', new THREE.BufferAttribute(fallingStarData, 3));
        
        // Create point material
        const fallingStarMaterial = new THREE.PointsMaterial({
            size: 2,
            map: sparkTexture,
            blending: THREE.AdditiveBlending,
            transparent: true,
            color: 0xffffff
        });
        
        // Create mesh
        const fallingStars = new THREE.Points(fallingStarGeometry, fallingStarMaterial);
        scene.add(fallingStars);
        
        // Return the mesh and functions to update it
        return {
            mesh: fallingStars,
            activateStar: (elapsedTime) => {
                // Find an inactive star
                const positions = fallingStars.geometry.attributes.position;
                const data = fallingStars.geometry.attributes.data;
                
                for (let i = 0; i < starCount; i++) {
                    const i3 = i * 3;
                    
                    // Check if star is inactive
                    if (data.array[i3] < 0) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 100 + Math.random() * 100;
                        
                        positions.array[i3] = Math.cos(angle) * distance;
                        positions.array[i3 + 1] = 100 + Math.random() * 100;
                        positions.array[i3 + 2] = Math.sin(angle) * distance;
                        
                        // Activate with random lifetime
                        data.array[i3] = 3 + Math.random() * 4; // lifetime
                        
                        positions.needsUpdate = true;
                        data.needsUpdate = true;
                        break;
                    }
                }
            },
            update: (deltaTime) => {
                // Update all active stars
                const positions = fallingStars.geometry.attributes.position;
                const data = fallingStars.geometry.attributes.data;
                let needsUpdate = false;
                
                for (let i = 0; i < starCount; i++) {
                    const i3 = i * 3;
                    
                    // Check if star is active
                    if (data.array[i3] > 0) {
                        needsUpdate = true;
                        
                        // Decrease lifetime
                        data.array[i3] -= deltaTime;
                        
                        // Move star down and at an angle
                        const speed = data.array[i3 + 1];
                        positions.array[i3] -= speed * 2 * deltaTime; // x
                        positions.array[i3 + 1] -= speed * 10 * deltaTime; // y
                        positions.array[i3 + 2] -= speed * 1 * deltaTime; // z
                    }
                }
                
                if (needsUpdate) {
                    positions.needsUpdate = true;
                    data.needsUpdate = true;
                }
            }
        };
    };
    
    // Enhance the sky shader with more complex effects after loading
    const enhanceSkyShader = () => {
        // Only update if we successfully created a skybox
        if (!skybox || !skybox.material) return;
        
        skybox.material.fragmentShader = `
            uniform float time;
            varying vec3 vPosition;
            
            // Pseudo-random number generator
            float rand(vec2 co) {
                return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float starField(vec3 pos, float size, float density) {
                // Create a grid of potential star positions
                vec3 gridPos = floor(pos * size);
                
                // Deterministic random from grid position
                float random = rand(gridPos.xy + gridPos.yz);
                
                // Only use a portion of potential stars based on density
                if (random > density) return 0.0;
                
                // Get position within grid cell
                vec3 cellPos = fract(pos * size) * 2.0 - 1.0;
                float distFromCenter = length(cellPos);
                
                // Make stars have a small radius
                float brightness = 1.0 - smoothstep(0.05, 0.1, distFromCenter);
                
                // Add twinkling effect
                float twinkle = sin(time * 2.0 + random * 100.0) * 0.5 + 0.5;
                brightness *= mix(0.7, 1.0, twinkle);
                
                return brightness * random;
            }
            
            void main() {
                // Normalize position vector to get direction
                vec3 dir = normalize(vPosition);
                
                // Base color - dark blue to black gradient
                float altitude = dir.y * 0.5 + 0.5; // 0 at horizon, 1 at zenith
                vec3 nightColor = mix(
                    vec3(0.03, 0.05, 0.1),   // horizon
                    vec3(0.0, 0.0, 0.05),    // zenith
                    altitude
                );
                
                // Add stars with different sizes
                float stars = 0.0;
                stars += starField(dir, 80.0, 0.6) * 0.6;  // Small stars
                stars += starField(dir, 30.0, 0.2) * 0.8;  // Medium stars
                stars += starField(dir, 10.0, 0.05) * 1.0; // Large stars
                
                // Create star color
                vec3 starColor = mix(
                    vec3(0.8, 0.8, 1.0),  // Bluish white
                    vec3(1.0, 0.9, 0.6),  // Yellowish white
                    rand(dir.xy)
                );
                
                // Combine night sky with stars
                vec3 finalColor = nightColor + stars * starColor;
                
                // Add a subtle blue nebula effect
                float nebula = pow(rand(dir.xy * 0.4), 6.0) * 0.1 * max(0.0, dir.y);
                finalColor += vec3(0.0, 0.1, 0.2) * nebula;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
        
        skybox.material.needsUpdate = true;
    };
    
    // Animation variables
    let worldRotation = 0;
    const worldRotationSpeed = 0.02; // Slightly slower rotation for performance
    let lastTime = null;
    let fallingStarsRef = null;
    let nextFallingStarTime = 5 + Math.random() * 10;
    let moonRef = null;
    
    // Vector reuse for performance
    const tempVector = new THREE.Vector3();
    const tempVector2 = new THREE.Vector3();
    
    // Responsive window resizing
    const handleResize = () => {
        // Use debounced resize for better performance
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            const aspect = window.innerWidth / window.innerHeight;
            camera.left = -d * aspect;
            camera.right = d * aspect;
            camera.updateProjectionMatrix();
            
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, 250);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Track mouse movement efficiently
    window.mouseX = 0;
    window.mouseY = 0;
    
    const handleMouseMove = (event) => {
        window.mouseX = (event.clientX - window.innerWidth / 2) * 0.05;
        window.mouseY = (event.clientY - window.innerHeight / 2) * 0.05;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    // Initial zoom effect
    const initialZoom = () => {
        const initialD = 40;
        camera.left = -initialD * aspect;
        camera.right = initialD * aspect;
        camera.top = initialD;
        camera.bottom = -initialD;
        camera.updateProjectionMatrix();
        
        const startTime = performance.now() / 1000;
        
        function updateZoom() {
            const elapsed = performance.now() / 1000 - startTime;
            const progress = Math.min(elapsed / 3, 1);
            
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentZoom = initialD - (initialD - d) * ease;
            
            camera.left = -currentZoom * aspect;
            camera.right = currentZoom * aspect;
            camera.top = currentZoom;
            camera.bottom = -currentZoom;
            camera.updateProjectionMatrix();
            
            if (progress < 1) {
                requestAnimationFrame(updateZoom);
            }
        }
        
        updateZoom();
    };
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        
        const now = performance.now() / 1000;
        const deltaTime = Math.min(0.1, now - (lastTime || now)); // Cap delta time
        lastTime = now;
        
        // Update skybox stars animation
        if (skybox.material.uniforms) {
            skybox.material.uniforms.time.value = now;
        }
        
        // Rotate world
        worldRotation += worldRotationSpeed * deltaTime;
        worldGroup.rotation.y = worldRotation;
        steveGroup.rotation.y = worldRotation;
        birdGroup.rotation.y = worldRotation;
        
        // Update birds (reduced calculations)
        if (birdGroup.children.length > 0 && now % 2 < 1) { // Only update every other second
            birdGroup.children.forEach(bird => {
                if (!bird.userData) return;
                
                // Calculate direction to target
                tempVector.subVectors(bird.userData.target, bird.userData.position).normalize();
                
                // Move towards target
                tempVector2.copy(tempVector).multiplyScalar(bird.userData.speed);
                bird.userData.position.add(tempVector2);
                
                // Check if bird has reached target
                if (bird.userData.position.distanceToSquared(bird.userData.target) < 4) {
                    bird.userData.target.set(
                        (Math.random() - 0.5) * WORLD_SIZE * 0.8,
                        5 + Math.random() * 10,
                        (Math.random() - 0.5) * WORLD_SIZE * 0.8
                    );
                }
                
                // Update bird position
                bird.position.copy(bird.userData.position);
                
                // Rotate towards direction
                if (tempVector.length() > 0) {
                    tempVector2.addVectors(bird.position, tempVector);
                    bird.lookAt(tempVector2);
                    bird.rotation.x = 0;
                    bird.rotation.z = 0;
                }
                
                // Animate wings (simplified)
                bird.userData.wingAngle += bird.userData.wingSpeed;
                const wingRotation = Math.sin(bird.userData.wingAngle) * 0.5;
                bird.userData.leftWing.rotation.x = wingRotation;
                bird.userData.rightWing.rotation.x = -wingRotation;
            });
        }
        
        // Update falling stars
        if (fallingStarsRef) {
            fallingStarsRef.update(deltaTime);
            
            // Randomly activate new falling stars
            nextFallingStarTime -= deltaTime;
            if (nextFallingStarTime <= 0) {
                fallingStarsRef.activateStar(now);
                nextFallingStarTime = 5 + Math.random() * 15;
            }
        }
        
        // Rotate moon
        if (moonRef) {
            moonRef.rotation.y = now * moonRef.userData.rotationSpeed;
        }
        
        // Add mouse influence to camera position
        if (window.mouseX !== undefined && window.mouseY !== undefined) {
            camera.position.x = d + window.mouseX;
            camera.position.y = d + window.mouseY;
            camera.position.z = d;
            camera.lookAt(0, 0, 0);
        }
        
        // Render scene
        renderer.render(scene, camera);
    };
    
    // Start animation loop
    const startAnimation = () => {
        initialZoom();
        animate();
    };
    
    // Initial scene loading
    loadScene().catch(err => {
        console.error('Error loading scene:', err);
        // Even if we have an error, still try to render what we have
        startAnimation();
    });
};

// Add CSS for better contrast with night sky
const addBackgroundCSS = () => {
    // Create a style element if it doesn't exist
    let style = document.getElementById('background-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'background-styles';
        document.head.appendChild(style);
        
        // Simplified CSS with essential styles only
        style.textContent = `
            body {
                position: relative;
                z-index: 1;
                color: #ddd;
            }
            
            main, article, section, .content, .container {
                position: relative;
                z-index: 1;
                background-color: rgba(20, 30, 50, 0.8);
                padding: 20px;
                border-radius: 5px;
                color: #ddd;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: #fff;
            }
            
            a {
                color: #00aaff;
            }
        `;
    }
};

// Initialize background on page load - use requestIdleCallback for non-blocking loading
window.addEventListener('load', () => {
    addBackgroundCSS();
    
    // Use requestIdleCallback when available for non-critical initialization
    if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
            initThreeBackground();
        }, { timeout: 2000 });
    } else {
        // Fallback to setTimeout for browsers without requestIdleCallback
        setTimeout(() => {
            initThreeBackground();
        }, 200);
    }
});