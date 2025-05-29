const initMinecraftIslandNN = () => {
    // Get the canvas element
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Use isometric-style camera
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.OrthographicCamera(
        -5 * aspect, 5 * aspect, 5, -5, 0.1, 1000
    );
    
    // Set the camera position for isometric view
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create textures
    const textureLoader = new THREE.TextureLoader();
    
    const textures = {
        dirt: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/dirt.png'),
        grass_top: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/grass_top.png'),
        grass_side: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/grass_side.png'),
        wood: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/wood.png'),
        leaves: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/leaves.png'),
        stone: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/stone.png'),
        red_flower: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/red_flower.png'),
    };
    
    // Configure textures
    Object.values(textures).forEach(texture => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
    });
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
    
    // Island generation parameters
    const islandSize = 15;
    const islandHeight = 6;
    const waterLevel = 0;
    
    // Block types
    const BlockType = {
        AIR: 0,
        GRASS: 1,
        DIRT: 2,
        STONE: 3,
        WOOD: 4,
        LEAVES: 5,
        FLOWER: 6,
        WATER: 7
    };
    
    // Create maps for terrain and entities
    const worldMap = {};
    const entities = [];
    
    // Define the key for a position in the worldMap
    const posKey = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    
    // Get block at position
    const getBlock = (x, y, z) => {
        const key = posKey(x, y, z);
        return worldMap[key] || BlockType.AIR;
    };
    
    // Set block at position
    const setBlock = (x, y, z, blockType) => {
        const key = posKey(x, y, z);
        
        // Remove old block mesh if exists
        if (worldMap[key] && worldMap[key].mesh) {
            scene.remove(worldMap[key].mesh);
        }
        
        if (blockType === BlockType.AIR) {
            delete worldMap[key];
            return;
        }
        
        // Create block mesh
        let mesh;
        
        switch (blockType) {
            case BlockType.GRASS: {
                // Grass block with different textures on each side
                const materials = [
                    new THREE.MeshLambertMaterial({ map: textures.grass_side }),
                    new THREE.MeshLambertMaterial({ map: textures.grass_side }),
                    new THREE.MeshLambertMaterial({ map: textures.grass_top }),
                    new THREE.MeshLambertMaterial({ map: textures.dirt }),
                    new THREE.MeshLambertMaterial({ map: textures.grass_side }),
                    new THREE.MeshLambertMaterial({ map: textures.grass_side })
                ];
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                mesh = new THREE.Mesh(geometry, materials);
                break;
            }
            case BlockType.DIRT: {
                const material = new THREE.MeshLambertMaterial({ map: textures.dirt });
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                mesh = new THREE.Mesh(geometry, material);
                break;
            }
            case BlockType.STONE: {
                const material = new THREE.MeshLambertMaterial({ map: textures.stone });
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                mesh = new THREE.Mesh(geometry, material);
                break;
            }
            case BlockType.WOOD: {
                const material = new THREE.MeshLambertMaterial({ map: textures.wood });
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                mesh = new THREE.Mesh(geometry, material);
                break;
            }
            case BlockType.LEAVES: {
                const material = new THREE.MeshLambertMaterial({ 
                    map: textures.leaves,
                    transparent: true,
                    alphaTest: 0.5
                });
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                mesh = new THREE.Mesh(geometry, material);
                break;
            }
            case BlockType.FLOWER: {
                // Create crossed planes for the flower
                const material = new THREE.MeshLambertMaterial({ 
                    map: textures.red_flower,
                    transparent: true,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide
                });
                
                // Create a group to hold crossed planes
                mesh = new THREE.Group();
                
                // Plane 1
                const planeGeom1 = new THREE.PlaneGeometry(1, 1);
                const plane1 = new THREE.Mesh(planeGeom1, material);
                plane1.rotation.y = Math.PI / 4;
                mesh.add(plane1);
                
                // Plane 2
                const planeGeom2 = new THREE.PlaneGeometry(1, 1);
                const plane2 = new THREE.Mesh(planeGeom2, material);
                plane2.rotation.y = -Math.PI / 4;
                mesh.add(plane2);
                
                break;
            }
            case BlockType.WATER: {
                const material = new THREE.MeshLambertMaterial({ 
                    color: 0x3070FF,
                    transparent: true,
                    opacity: 0.6
                });
                const geometry = new THREE.BoxGeometry(1, 0.8, 1);
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = -0.1; // Slight offset for water level
                break;
            }
        }
        
        if (mesh) {
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            
            worldMap[key] = {
                type: blockType,
                mesh: mesh
            };
        }
    };
    
    // Generate island terrain using Perlin noise
    const generateIsland = () => {
        const noise = new SimplexNoise();
        
        // Generate base terrain with noise
        for (let x = -islandSize; x <= islandSize; x++) {
            for (let z = -islandSize; z <= islandSize; z++) {
                // Distance from center for island shape
                const distFromCenter = Math.sqrt(x*x + z*z) / islandSize;
                
                // Only generate terrain within the island radius (circle shape)
                if (distFromCenter <= 1) {
                    // Height decreases as we get farther from center
                    const heightFactor = 1 - Math.pow(distFromCenter, 2);
                    
                    // Use noise to make terrain more interesting
                    const noiseVal = noise.noise2D(x * 0.1, z * 0.1) * 0.5 + 0.5;
                    
                    // Calculate terrain height
                    const terrainHeight = Math.floor(noiseVal * heightFactor * islandHeight);
                    
                    // Place blocks from bottom to top
                    for (let y = -5; y <= terrainHeight; y++) {
                        if (y < terrainHeight - 2) {
                            // Stone for deep terrain
                            setBlock(x, y, z, BlockType.STONE);
                        } else if (y < terrainHeight) {
                            // Dirt in middle
                            setBlock(x, y, z, BlockType.DIRT);
                        } else {
                            // Grass on top
                            setBlock(x, y, z, BlockType.GRASS);
                        }
                    }
                    
                    // Add water around island
                    if (terrainHeight < waterLevel && distFromCenter <= 1.2) {
                        setBlock(x, waterLevel, z, BlockType.WATER);
                    }
                }
            }
        }
    };
    
    // Generate trees on the island
    const generateTrees = () => {
        const noise = new SimplexNoise(1337); // Different seed for trees
        
        for (let x = -islandSize; x <= islandSize; x++) {
            for (let z = -islandSize; z <= islandSize; z++) {
                const noiseVal = noise.noise2D(x * 0.2, z * 0.2);
                
                // Only place trees where noise is above threshold (sparse trees)
                if (noiseVal > 0.7) {
                    // Check if block below is grass
                    let groundY = null;
                    
                    // Find the ground level
                    for (let y = islandHeight; y >= -5; y--) {
                        const block = getBlock(x, y, z);
                        if (block && block.type === BlockType.GRASS) {
                            groundY = y;
                            break;
                        }
                    }
                    
                    // Only place trees on grass
                    if (groundY !== null) {
                        const treeHeight = 3 + Math.floor(Math.random() * 2);
                        
                        // Tree trunk
                        for (let y = 1; y <= treeHeight; y++) {
                            setBlock(x, groundY + y, z, BlockType.WOOD);
                        }
                        
                        // Tree leaves (simple cube)
                        for (let lx = -2; lx <= 2; lx++) {
                            for (let ly = 0; ly <= 2; ly++) {
                                for (let lz = -2; lz <= 2; lz++) {
                                    // Skip corners for a more rounded shape
                                    if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly < 2) {
                                        continue;
                                    }
                                    
                                    const leafX = x + lx;
                                    const leafY = groundY + treeHeight + ly;
                                    const leafZ = z + lz;
                                    
                                    // Don't replace the trunk
                                    if (lx === 0 && lz === 0 && ly === 0) {
                                        continue;
                                    }
                                    
                                    // Place leaf block if there's air
                                    const block = getBlock(leafX, leafY, leafZ);
                                    if (!block || block.type === BlockType.AIR) {
                                        setBlock(leafX, leafY, leafZ, BlockType.LEAVES);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    
    // Generate flowers
    const generateFlowers = () => {
        const noise = new SimplexNoise(42); // Different seed for flowers
        
        for (let x = -islandSize; x <= islandSize; x++) {
            for (let z = -islandSize; z <= islandSize; z++) {
                const noiseVal = noise.noise2D(x * 0.5, z * 0.5);
                
                // Only place flowers where noise is above threshold
                if (noiseVal > 0.7 && Math.random() > 0.7) {
                    // Find the ground level
                    let groundY = null;
                    
                    for (let y = islandHeight; y >= -5; y--) {
                        const block = getBlock(x, y, z);
                        if (block && block.type === BlockType.GRASS) {
                            groundY = y;
                            break;
                        }
                    }
                    
                    // Only place flowers on grass
                    if (groundY !== null) {
                        // Check if there's no block above
                        const blockAbove = getBlock(x, groundY + 1, z);
                        if (!blockAbove || blockAbove.type === BlockType.AIR) {
                            setBlock(x, groundY + 1, z, BlockType.FLOWER);
                        }
                    }
                }
            }
        }
    };
    
    // Create Steve character
    const createSteve = () => {
        // Create a simple character with textured box
        const steveGroup = new THREE.Group();
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xE0AC69 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.75;
        steveGroup.add(head);
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.3);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x3050F0 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.15;
        steveGroup.add(body);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x3050F0 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.35, 1.15, 0);
        steveGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.35, 1.15, 0);
        steveGroup.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000A0 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, 0.45, 0);
        steveGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, 0.45, 0);
        steveGroup.add(rightLeg);
        
        // Add sword
        const swordGeometry = new THREE.BoxGeometry(0.1, 0.7, 0.1);
        const swordMaterial = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
        const sword = new THREE.Mesh(swordGeometry, swordMaterial);
        sword.position.set(0.35, 1.3, 0.25);
        rightArm.add(sword);
        
        // Set initial position
        steveGroup.position.set(0, 1, 0);
        steveGroup.castShadow = true;
        
        // Apply shadows to all parts
        steveGroup.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        scene.add(steveGroup);
        
        return {
            mesh: steveGroup,
            limbs: {
                leftArm,
                rightArm,
                leftLeg,
                rightLeg
            },
            position: { x: 0, y: 1, z: 0 }, // Actual position in world units
            target: { x: 0, y: 1, z: 0 },   // Target position to move towards
            rotation: 0,                     // Current rotation in radians
            targetRotation: 0,               // Target rotation to rotate towards
            action: 'idle',                  // Current action
            actionTime: 0,                   // Time counter for actions
            inventory: {
                blocks: [],
                heldBlock: null
            },
            
            // Update the character's position and animation
            update: function(deltaTime) {
                // Move towards target position
                const moveSpeed = 2 * deltaTime;
                const distX = this.target.x - this.position.x;
                const distZ = this.target.z - this.position.z;
                const dist = Math.sqrt(distX * distX + distZ * distZ);
                
                if (dist > 0.1) {
                    // Calculate rotation to face movement direction
                    this.targetRotation = Math.atan2(distZ, distX);
                    
                    // Move towards target
                    this.position.x += distX * moveSpeed / dist;
                    this.position.z += distZ * moveSpeed / dist;
                    
                    // Find ground height at current position
                    let groundY = -5;
                    for (let y = islandHeight; y >= -5; y--) {
                        const blockBelow = getBlock(this.position.x, y, this.position.z);
                        if (blockBelow && blockBelow.type !== BlockType.AIR && blockBelow.type !== BlockType.WATER) {
                            groundY = y;
                            break;
                        }
                    }
                    
                    // Set Y position above ground
                    this.position.y = groundY + 1;
                    
                    // Walking animation
                    this.actionTime += deltaTime * 5;
                    const legAngle = Math.sin(this.actionTime) * 0.3;
                    this.limbs.leftLeg.rotation.x = legAngle;
                    this.limbs.rightLeg.rotation.x = -legAngle;
                    this.limbs.leftArm.rotation.x = -legAngle;
                    this.limbs.rightArm.rotation.x = legAngle;
                    
                    this.action = 'walking';
                } else {
                    // Idle animation
                    this.actionTime += deltaTime;
                    const idleAngle = Math.sin(this.actionTime) * 0.05;
                    this.limbs.leftArm.rotation.x = idleAngle;
                    this.limbs.rightArm.rotation.x = -idleAngle;
                    
                    // Reset legs when idle
                    this.limbs.leftLeg.rotation.x = 0;
                    this.limbs.rightLeg.rotation.x = 0;
                    
                    this.action = 'idle';
                }
                
                // Smooth rotation towards target
                const rotDiff = ((this.targetRotation - this.rotation + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                if (Math.abs(rotDiff) > 0.05) {
                    this.rotation += rotDiff * 5 * deltaTime;
                    this.rotation = this.rotation % (Math.PI * 2);
                }
                
                // Apply position and rotation to mesh
                this.mesh.position.set(this.position.x, this.position.y, this.position.z);
                this.mesh.rotation.y = -this.rotation + Math.PI / 2; // Adjust for model orientation
                
                // Handle actions
                if (this.action === 'mining') {
                    this.actionTime += deltaTime * 10;
                    this.limbs.rightArm.rotation.x = Math.sin(this.actionTime) * 1.5;
                    
                    // Complete mining after a certain time
                    if (this.miningTime > 0) {
                        this.miningTime -= deltaTime;
                        if (this.miningTime <= 0) {
                            if (this.miningBlock) {
                                const { x, y, z, type } = this.miningBlock;
                                if (type !== BlockType.AIR) {
                                    // Add block to inventory
                                    this.inventory.blocks.push(type);
                                    
                                    // Remove block from world
                                    setBlock(x, y, z, BlockType.AIR);
                                }
                            }
                            this.action = 'idle';
                        }
                    }
                } else if (this.action === 'placing') {
                    this.actionTime += deltaTime * 8;
                    this.limbs.rightArm.rotation.x = Math.cos(this.actionTime) * 1.2;
                    
                    // Complete placing after a certain time
                    if (this.placingTime > 0) {
                        this.placingTime -= deltaTime;
                        if (this.placingTime <= 0) {
                            if (this.placingBlock && this.inventory.heldBlock) {
                                const { x, y, z } = this.placingBlock;
                                // Place block from inventory
                                setBlock(x, y, z, this.inventory.heldBlock);
                                
                                // Remove from inventory
                                const index = this.inventory.blocks.indexOf(this.inventory.heldBlock);
                                if (index !== -1) {
                                    this.inventory.blocks.splice(index, 1);
                                }
                                
                                if (this.inventory.blocks.length === 0) {
                                    this.inventory.heldBlock = null;
                                }
                            }
                            this.action = 'idle';
                        }
                    }
                }
            },
            
            // Mine a block at target position
            mine: function(x, y, z) {
                const block = getBlock(x, y, z);
                if (block && block.type !== BlockType.AIR) {
                    this.action = 'mining';
                    this.miningTime = 1.0; // Time to mine in seconds
                    this.miningBlock = { x, y, z, type: block.type };
                    
                    // Face the block
                    const dx = x - this.position.x;
                    const dz = z - this.position.z;
                    this.targetRotation = Math.atan2(dz, dx);
                    
                    return true;
                }
                return false;
            },
            
            // Place a block at target position
            place: function(x, y, z) {
                const block = getBlock(x, y, z);
                if ((!block || block.type === BlockType.AIR) && this.inventory.heldBlock) {
                    this.action = 'placing';
                    this.placingTime = 0.5; // Time to place in seconds
                    this.placingBlock = { x, y, z };
                    
                    // Face the block
                    const dx = x - this.position.x;
                    const dz = z - this.position.z;
                    this.targetRotation = Math.atan2(dz, dx);
                    
                    return true;
                }
                return false;
            },
            
            // Select a block type to hold
            selectBlock: function(blockType) {
                if (this.inventory.blocks.includes(blockType)) {
                    this.inventory.heldBlock = blockType;
                    return true;
                }
                return false;
            }
        };
    };
    
    // Create bees
    const createBee = (x, y, z) => {
        const beeGroup = new THREE.Group();
        
        // Bee body
        const bodyGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD800 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        beeGroup.add(body);
        
        // Bee stripes
        const stripe1Geometry = new THREE.BoxGeometry(0.26, 0.05, 0.15);
        const stripe2Geometry = new THREE.BoxGeometry(0.26, 0.05, 0.15);
        const stripeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const stripe1 = new THREE.Mesh(stripe1Geometry, stripeMaterial);
        const stripe2 = new THREE.Mesh(stripe2Geometry, stripeMaterial);
        
        stripe1.position.z = -0.05;
        stripe2.position.z = 0.1;
        
        beeGroup.add(stripe1);
        beeGroup.add(stripe2);
        
        // Bee wings
        const wingGeometry = new THREE.PlaneGeometry(0.2, 0.2);
        const wingMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.15, 0.15, 0);
        leftWing.rotation.x = Math.PI / 2;
        leftWing.rotation.z = -Math.PI / 6;
        beeGroup.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.15, 0.15, 0);
        rightWing.rotation.x = Math.PI / 2;
        rightWing.rotation.z = Math.PI / 6;
        beeGroup.add(rightWing);
        
        // Set initial position
        beeGroup.position.set(x, y, z);
        
        // Apply shadows
        beeGroup.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        scene.add(beeGroup);
        
        return {
            mesh: beeGroup,
            parts: {
                leftWing,
                rightWing,
                body
            },
            position: { x, y, z },
            velocity: { x: 0, y: 0, z: 0 },
            target: { x, y, z },
            wanderTime: 0,
            
            // Update bee movement and animation
            update: function(deltaTime) {
                // Wing flapping animation
                this.parts.leftWing.rotation.y = Math.sin(Date.now() * 0.02) * 0.5;
                this.parts.rightWing.rotation.y = Math.sin(Date.now() * 0.02) * 0.5;
                
                // Random wandering behavior
                this.wanderTime -= deltaTime;
                if (this.wanderTime <= 0) {
                    // Set new target position within radius
                    const radius = 3 + Math.random() * 3;
                    const angle = Math.random() * Math.PI * 2;
                    const height = 1 + Math.random() * 2;
                    
                    this.target.x = this.position.x + Math.cos(angle) * radius;
                    this.target.z = this.position.z + Math.sin(angle) * radius;
                    this.target.y = this.position.y + (Math.random() - 0.5) * height;
                    
                    // Constrain to island bounds
                    const distFromCenter = Math.sqrt(this.target.x * this.target.x + this.target.z * this.target.z);
                    if (distFromCenter > islandSize - 2) {
                        // If too far, move back towards center
                        this.target.x *= (islandSize - 2) / distFromCenter;
                        this.target.z *= (islandSize - 2) / distFromCenter;
                    }
                    
                    // Make sure bee stays above ground
                    let groundY = -5;
                    for (let y = islandHeight; y >= -5; y--) {
                        const blockBelow = getBlock(this.target.x, y, this.target.z);
                        if (blockBelow && blockBelow.type !== BlockType.AIR && blockBelow.type !== BlockType.WATER) {
                            groundY = y;
                            break;
                        }
                    }
                    
                    // Keep bee a bit above ground
                    this.target.y = Math.max(this.target.y, groundY + 2);
                    
                    // Reset timer
                    this.wanderTime = 2 + Math.random() * 3;
                }
                
                // Move towards target
                const moveSpeed = 1.5 * deltaTime;
                const distX = this.target.x - this.position.x;
                const distY = this.target.y - this.position.y;
                const distZ = this.target.z - this.position.z;
                const dist = Math.sqrt(distX * distX + distY * distY + distZ * distZ);
                
                if (dist > 0.1) {
                    // Move towards target
                    this.position.x += distX * moveSpeed / dist;
                    this.position.y += distY * moveSpeed / dist;
                    this.position.z += distZ * moveSpeed / dist;
                    
                    // Rotate to face movement direction
                    if (Math.abs(distX) > 0.01 || Math.abs(distZ) > 0.01) {
                        const targetRotation = Math.atan2(distZ, distX);
                        this.mesh.rotation.y = targetRotation;
                    }
                }
                
                // Apply position to mesh
                this.mesh.position.set(this.position.x, this.position.y, this.position.z);
                
                // Add bobbing motion
                this.mesh.position.y += Math.sin(Date.now() * 0.002) * 0.05;
            }
        };
    };
    
    // Initialize game
    const init = () => {
        generateIsland();
        generateTrees();
        generateFlowers();
        
        // Create player character
        const steve = createSteve();
        
        // Create some bees
        const bees = [];
        for (let i = 0; i < 5; i++) {
            const x = (Math.random() - 0.5) * islandSize;
            const z = (Math.random() - 0.5) * islandSize;
            const y = 3 + Math.random() * 2;
            
            bees.push(createBee(x, y, z));
        }
        
        // Event listeners for mouse interaction
        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();
        
        // Handle mouse click
        canvas.addEventListener('click', (event) => {
            // Calculate mouse position in normalized device coordinates
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Update raycaster with camera and mouse position
            raycaster.setFromCamera(mouse, camera);
            
            // Find all intersected objects
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            if (intersects.length > 0) {
                // Get the first intersected object
                const intersect = intersects[0];
                
                // Check if we hit a block
                const blockX = Math.floor(intersect.point.x);
                const blockY = Math.floor(intersect.point.y);
                const blockZ = Math.floor(intersect.point.z);
                
                // Place or mine blocks
                if (event.ctrlKey || event.metaKey) {
                    // Mine block
                    steve.mine(blockX, blockY, blockZ);
                } else if (event.shiftKey) {
                    // Place block
                    // First, determine which face was clicked to place adjacent to it
                    const normalX = Math.round(intersect.face.normal.x);
                    const normalY = Math.round(intersect.face.normal.y);
                    const normalZ = Math.round(intersect.face.normal.z);
                    
                    // Calculate adjacent block position
                    const adjacentX = blockX + normalX;
                    const adjacentY = blockY + normalY;
                    const adjacentZ = blockZ + normalZ;
                    
                    // Place block if steve has a block in inventory
                    if (steve.inventory.blocks.length > 0) {
                        steve.place(adjacentX, adjacentY, adjacentZ);
                    }
                } else {
                    // Move steve to clicked location
                    steve.target.x = intersect.point.x;
                    steve.target.z = intersect.point.z;
                }
            }
        });
        
        // Handle key press
        window.addEventListener('keydown', (event) => {
            // Number keys to select block type
            if (event.key >= '1' && event.key <= '7') {
                const blockType = parseInt(event.key);
                steve.selectBlock(blockType);
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Update camera aspect ratio
            const aspect = window.innerWidth / window.innerHeight;
            camera.left = -5 * aspect;
            camera.right = 5 * aspect;
            camera.updateProjectionMatrix();
            
            // Update renderer size
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Animation loop
        let lastTime = 0;
        const animate = (time) => {
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;
            
            // Update steve
            steve.update(deltaTime);
            
            // Update bees
            bees.forEach(bee => bee.update(deltaTime));
            
            // Render scene
            renderer.render(scene, camera);
            
            // Request next frame
            requestAnimationFrame(animate);
        };
        
        // Start animation loop
        requestAnimationFrame(animate);
    };
    
    // Check for SimplexNoise
    if (typeof SimplexNoise === 'undefined') {
        // SimplexNoise polyfill/implementation could go here
        // For brevity, assuming it's included in the HTML before this script
        console.error('SimplexNoise not found. Please include SimplexNoise.js before running this script.');
        return;
    }
    
    // Start the game
    init();
};

// Call the initialization function when the window loads
window.addEventListener('load', initMinecraftIslandNN);