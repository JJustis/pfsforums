const initGoldRhombusBackground = () => {
    // Check for Three.js
    if (typeof THREE === 'undefined') {
        // Load Three.js if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = setupGoldRhombusBackground;
        document.head.appendChild(script);
    } else {
        setupGoldRhombusBackground();
    }

    function setupGoldRhombusBackground() {
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
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000814); // Very dark blue background
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.z = 30;
        camera.position.y = 0;
        camera.lookAt(0, 0, 0);
        
        // Settings
        const settings = {
            colors: {
                gold: 0xD4AF37,
                darkGold: 0xAA8822,
                lightGold: 0xFFD700,
                highlight: 0xFFFFE0
            },
            rhombusGrid: {
                width: 40,        // Grid width
                height: 30,       // Grid height
                spacing: 1.5,     // Space between rhombuses
                rows: 20,         // Number of rows
                columns: 20,      // Number of columns
                rotationSpeed: 0.1 // Base rotation speed
            },
            sheen: {
                speed: 0.4,       // Sheen movement speed
                width: 10,        // Width of sheen effect
                intensity: 0.8,   // Intensity of sheen
                frequency: 2      // How often the sheen passes by
            },
            animation: {
                waveHeight: 1.5,  // Height of the wave animation
                waveSpeed: 0.2    // Speed of the wave
            }
        };

        // User interaction tracking
        const mouse = {
            x: 0,
            y: 0,
            previousX: 0,
            previousY: 0,
            down: false
        };
        
        // Create groups for organization
        const rhombusGroup = new THREE.Group();
        scene.add(rhombusGroup);
        
        // Create gold material
        function createGoldMaterial() {
            // Create normal texture for the gold material to make it appear hammered
            const normalTexture = new THREE.CanvasTexture(createNormalMap());
            
            // Create a standard MeshStandardMaterial for physically-based rendering
            const goldMaterial = new THREE.MeshStandardMaterial({
                color: settings.colors.gold,
                metalness: 1.0,
                roughness: 0.25,
                normalMap: normalTexture,
                normalScale: new THREE.Vector2(0.5, 0.5),
                envMapIntensity: 1.0
            });
            
            // Create environment map for reflections
            const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
                format: THREE.RGBFormat,
                generateMipmaps: true,
                minFilter: THREE.LinearMipmapLinearFilter
            });
            
            const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
            scene.add(cubeCamera);
            
            // Add a simple environment for reflection
            const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
            cubeCamera.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
            directionalLight.position.set(1, 1, 1);
            cubeCamera.add(directionalLight);
            
            cubeCamera.update(renderer, scene);
            
            goldMaterial.envMap = cubeRenderTarget.texture;
            
            return goldMaterial;
        }
        
        // Create a normal map for the gold material
        function createNormalMap() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Fill with middle gray (no normal deviation)
            ctx.fillStyle = 'rgb(128, 128, 255)';
            ctx.fillRect(0, 0, 256, 256);
            
            // Create bump patterns for hammered gold effect
            for (let i = 0; i < 300; i++) {
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                const radius = Math.random() * 15 + 5;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                const intensity = Math.random() * 0.5 + 0.25;
                
                gradient.addColorStop(0, `rgb(${128 + intensity * 80}, ${128 + intensity * 80}, 255)`);
                gradient.addColorStop(1, 'rgb(128, 128, 255)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            return canvas;
        }
        
        // Create rhombus geometry
        function createRhombusGeometry(width, height, depth) {
            const geometry = new THREE.BufferGeometry();
            
            // Define vertices for a rhombus (diamond shape)
            const vertices = new Float32Array([
                0, 0, 0,       // Center
                width/2, 0, 0, // Right
                0, height/2, 0, // Top
                -width/2, 0, 0, // Left
                0, -height/2, 0, // Bottom
                0, 0, depth,   // Back Center
                width/2, 0, depth, // Back Right
                0, height/2, depth, // Back Top
                -width/2, 0, depth, // Back Left
                0, -height/2, depth // Back Bottom
            ]);
            
            // Define faces as triangles
            const indices = [
                // Front face
                0, 1, 2,
                0, 2, 3,
                0, 3, 4,
                0, 4, 1,
                
                // Back face
                5, 7, 6,
                5, 8, 7,
                5, 9, 8,
                5, 6, 9,
                
                // Side faces
                1, 6, 2,
                6, 7, 2,
                2, 7, 3,
                7, 8, 3,
                3, 8, 4,
                8, 9, 4,
                4, 9, 1,
                9, 6, 1
            ];
            
            // Calculate normals
            const positions = [];
            const normals = [];
            const uvs = [];
            
            for (let i = 0; i < indices.length; i += 3) {
                const idx1 = indices[i] * 3;
                const idx2 = indices[i + 1] * 3;
                const idx3 = indices[i + 2] * 3;
                
                // Vertex positions
                const vx1 = vertices[idx1];
                const vy1 = vertices[idx1 + 1];
                const vz1 = vertices[idx1 + 2];
                
                const vx2 = vertices[idx2];
                const vy2 = vertices[idx2 + 1];
                const vz2 = vertices[idx2 + 2];
                
                const vx3 = vertices[idx3];
                const vy3 = vertices[idx3 + 1];
                const vz3 = vertices[idx3 + 2];
                
                positions.push(vx1, vy1, vz1, vx2, vy2, vz2, vx3, vy3, vz3);
                
                // Calculate normal
                const v1 = new THREE.Vector3(vx2 - vx1, vy2 - vy1, vz2 - vz1);
                const v2 = new THREE.Vector3(vx3 - vx1, vy3 - vy1, vz3 - vz1);
                const normal = new THREE.Vector3();
                normal.crossVectors(v1, v2).normalize();
                
                normals.push(normal.x, normal.y, normal.z);
                normals.push(normal.x, normal.y, normal.z);
                normals.push(normal.x, normal.y, normal.z);
                
                // Simple UVs
                uvs.push(0, 0, 1, 0, 0.5, 1);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            
            geometry.computeBoundingSphere();
            
            return geometry;
        }
        
        // Create grid of rhombuses
        function createRhombusGrid() {
            const goldMaterial = createGoldMaterial();
            const rhombusWidth = settings.rhombusGrid.spacing;
            const rhombusHeight = settings.rhombusGrid.spacing * 1.618; // Golden ratio
            const rhombusDepth = 0.2;
            
            const rhombusGeometry = createRhombusGeometry(rhombusWidth, rhombusHeight, rhombusDepth);
            
            const rows = settings.rhombusGrid.rows;
            const columns = settings.rhombusGrid.columns;
            
            // Grid size
            const gridWidth = columns * (rhombusWidth + settings.rhombusGrid.spacing);
            const gridHeight = rows * (rhombusHeight + settings.rhombusGrid.spacing);
            
            // Create rhombuses
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns; col++) {
                    // Staggered pattern
                    const offsetX = (row % 2) * rhombusWidth / 2;
                    
                    const x = col * (rhombusWidth + settings.rhombusGrid.spacing) - gridWidth / 2 + offsetX;
                    const y = row * (rhombusHeight * 0.75) - gridHeight / 2;
                    
                    const rhombus = new THREE.Mesh(rhombusGeometry, goldMaterial.clone());
                    rhombus.position.set(x, y, 0);
                    
                    // Add small random rotation for more natural look
                    rhombus.rotation.x = (Math.random() - 0.5) * 0.2;
                    rhombus.rotation.y = (Math.random() - 0.5) * 0.2;
                    rhombus.rotation.z = (Math.random() - 0.5) * 0.1;
                    
                    // Store original position for animations
                    rhombus.userData = {
                        originalPosition: new THREE.Vector3(x, y, 0),
                        originalRotation: new THREE.Vector3(
                            rhombus.rotation.x,
                            rhombus.rotation.y,
                            rhombus.rotation.z
                        ),
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.5 + Math.random() * 0.5,
                        maxRotation: 0.1 + Math.random() * 0.1
                    };
                    
                    // Set material properties for sheen effect
                    rhombus.material.userData = {
                        originalColor: new THREE.Color(settings.colors.gold),
                        highlightColor: new THREE.Color(settings.colors.highlight),
                        darkColor: new THREE.Color(settings.colors.darkGold),
                        sheenPhase: Math.random() * Math.PI * 2
                    };
                    
                    rhombus.castShadow = true;
                    rhombus.receiveShadow = true;
                    
                    rhombusGroup.add(rhombus);
                }
            }
        }
        
        // Create sheen effect light
        function createSheenLight() {
            const sheenLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
            sheenLight.position.set(0, 0, 10);
            scene.add(sheenLight);
            
            return sheenLight;
        }
        
        // Create scene
        createRhombusGrid();
        const sheenLight = createSheenLight();
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        
        // Add main directional light
        const mainLight = new THREE.DirectionalLight(0xFFFFCC, 0.8);
        mainLight.position.set(5, 5, 10);
        scene.add(mainLight);
        
        // Add subtle colored lights for ambiance
        const blueLight = new THREE.PointLight(0x0044FF, 0.5, 50);
        blueLight.position.set(-15, -10, 15);
        scene.add(blueLight);
        
        const purpleLight = new THREE.PointLight(0x440088, 0.3, 50);
        purpleLight.position.set(15, 10, 15);
        scene.add(purpleLight);
        
        // Animation loop
        const clock = new THREE.Clock();
        
        function animate() {
            requestAnimationFrame(animate);
            
            const deltaTime = Math.min(clock.getDelta(), 0.1);
            const elapsedTime = clock.getElapsedTime();
            
            // Rotate the entire grid
            if (!mouse.down) {
                rhombusGroup.rotation.z += deltaTime * settings.rhombusGrid.rotationSpeed * 0.2;
                rhombusGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.1;
                rhombusGroup.rotation.y = Math.cos(elapsedTime * 0.2) * 0.1;
            }
            
            // User interaction
            if (mouse.down) {
                const deltaX = mouse.x - mouse.previousX;
                const deltaY = mouse.y - mouse.previousY;
                
                if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
                    rhombusGroup.rotation.z += deltaX * 2;
                    rhombusGroup.rotation.x += deltaY;
                    
                    // Limit rotation on x-axis
                    rhombusGroup.rotation.x = Math.max(Math.min(rhombusGroup.rotation.x, Math.PI * 0.5), -Math.PI * 0.5);
                }
            }
            
            mouse.previousX = mouse.x;
            mouse.previousY = mouse.y;
            
            // Animate individual rhombuses
            rhombusGroup.children.forEach((rhombus, index) => {
                const userData = rhombus.userData;
                
                // Gentle wave motion
                userData.phase += deltaTime * userData.speed;
                
                // Apply wave motion
                const waveX = Math.sin(userData.phase + index * 0.1) * settings.animation.waveHeight * 0.03;
                const waveY = Math.cos(userData.phase + index * 0.15) * settings.animation.waveHeight * 0.03;
                
                rhombus.position.x = userData.originalPosition.x + waveX;
                rhombus.position.y = userData.originalPosition.y + waveY;
                rhombus.position.z = Math.sin(userData.phase * 0.5) * 0.1;
                
                // Subtle rotation
                rhombus.rotation.x = userData.originalRotation.x + Math.sin(userData.phase * 0.6) * userData.maxRotation;
                rhombus.rotation.y = userData.originalRotation.y + Math.cos(userData.phase * 0.4) * userData.maxRotation;
                rhombus.rotation.z = userData.originalRotation.z + Math.sin(userData.phase * 0.3) * userData.maxRotation * 0.5;
            });
            
            // Sheen effect - moving highlight
            const sheenTime = elapsedTime * settings.sheen.speed;
            
            // Move sheen light
            const sheenX = Math.sin(sheenTime) * 30;
            const sheenY = Math.cos(sheenTime * 0.7) * 30;
            sheenLight.position.set(sheenX, sheenY, 15);
            
            // Apply sheen highlight to materials
            rhombusGroup.children.forEach((rhombus, index) => {
                const matData = rhombus.material.userData;
                const rhombusPos = new THREE.Vector3();
                rhombus.getWorldPosition(rhombusPos);
                
                // Calculate distance from sheen light to rhombus
                const distanceToSheen = new THREE.Vector2(rhombusPos.x - sheenX, rhombusPos.y - sheenY).length();
                
                // Apply sheen effect based on distance
                const sheenWidth = settings.sheen.width;
                const sheenIntensity = settings.sheen.intensity;
                
                if (distanceToSheen < sheenWidth) {
                    // Inside sheen area - transition to highlight color
                    const sheenFactor = 1 - (distanceToSheen / sheenWidth);
                    
                    // Mix colors based on sheen factor
                    const mixedColor = new THREE.Color()
                        .copy(matData.originalColor)
                        .lerp(matData.highlightColor, sheenFactor * sheenIntensity);
                    
                    rhombus.material.color = mixedColor;
                    
                    // Also decrease roughness for more shine
                    rhombus.material.roughness = Math.max(0.1, 0.3 - sheenFactor * 0.2);
                } else {
                    // Outside sheen area - return to original color
                    rhombus.material.color.copy(matData.originalColor);
                    rhombus.material.roughness = 0.3;
                    
                    // Add subtle color variations
                    const timeFactor = Math.sin(elapsedTime * 0.5 + index * 0.1) * 0.1 + 0.9;
                    rhombus.material.color.multiplyScalar(timeFactor);
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
        animate();
    }
};

// Initialize the Gold Rhombus Background when DOM is loaded
document.addEventListener('DOMContentLoaded', initGoldRhombusBackground);