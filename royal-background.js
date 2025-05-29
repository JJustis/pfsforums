const initRoyalBackground = () => {
    // Check for Three.js
    if (typeof THREE === 'undefined') {
        // Load Three.js if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = setupRoyalBackground;
        document.head.appendChild(script);
    } else {
        setupRoyalBackground();
    }

    function setupRoyalBackground() {
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
        scene.background = new THREE.Color(0x150030); // Deep royal purple background
        scene.fog = new THREE.FogExp2(0x150030, 0.0025);
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.z = 40;
        camera.position.y = 10;
        camera.lookAt(0, 0, 0);
        
        // Royal settings
        const settings = {
            colors: {
                gold: 0xD4AF37,
                royalPurple: 0x4B0082,
                crimson: 0xDC143C,
                silver: 0xC0C0C0,
                sapphire: 0x0F52BA,
                emerald: 0x50C878,
                ruby: 0xE0115F
            },
            columnCount: 6,            // Number of columns
            columnHeight: 30,          // Height of the columns
            columnRadius: 2,           // Radius of the columns
            drapeCount: 8,             // Number of draped curtains
            drapeWidth: 12,            // Width of the drapes
            crownCount: 3,             // Number of floating crowns
            gemCount: 80,              // Number of floating gems
            goldDustCount: 1000,       // Number of gold dust particles
            sceneRadius: 50,           // Scene radius
            floorRadius: 60            // Floor radius
        };

        // Groups for organization
        const columnsGroup = new THREE.Group();
        const drapesGroup = new THREE.Group();
        const crownsGroup = new THREE.Group();
        const gemsGroup = new THREE.Group();
        const floorGroup = new THREE.Group();
        const goldDustGroup = new THREE.Group();
        
        scene.add(columnsGroup);
        scene.add(drapesGroup);
        scene.add(crownsGroup);
        scene.add(gemsGroup);
        scene.add(floorGroup);
        scene.add(goldDustGroup);
        
        // User interaction tracking
        const mouse = {
            x: 0,
            y: 0,
            previousX: 0,
            previousY: 0,
            down: false
        };

        // Create texture functions
        function createGoldTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Create golden background
            ctx.fillStyle = '#D4AF37';
            ctx.fillRect(0, 0, 256, 256);
            
            // Add some lighter and darker spots for texture
            for (let i = 0; i < 1000; i++) {
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                const radius = Math.random() * 3 + 1;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                
                if (Math.random() > 0.5) {
                    // Lighter spots
                    ctx.fillStyle = 'rgba(255, 240, 150, 0.3)';
                } else {
                    // Darker spots
                    ctx.fillStyle = 'rgba(100, 80, 0, 0.3)';
                }
                
                ctx.fill();
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }
        
        function createVelvetTexture(color) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Create base color
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 256, 256);
            
            // Add velvet texture with subtle highlights
            for (let i = 0; i < 5000; i++) {
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                const radius = Math.random() * 1 + 0.1;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                
                if (Math.random() > 0.7) {
                    // Highlights
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                } else {
                    // Shadows
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                }
                
                ctx.fill();
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }
        
        function createGemTexture(color) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Create gradient for gem
            const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.7, color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 128, 128);
            
            // Add facet lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.moveTo(64, 64);
                const angle = (i / 8) * Math.PI * 2;
                ctx.lineTo(64 + Math.cos(angle) * 64, 64 + Math.sin(angle) * 64);
                ctx.stroke();
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }
        
        function createCrownTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Background transparency
            ctx.clearRect(0, 0, 256, 256);
            
            // Draw crown base
            ctx.fillStyle = '#D4AF37';
            ctx.beginPath();
            ctx.moveTo(50, 180);
            ctx.lineTo(206, 180);
            ctx.lineTo(206, 150);
            ctx.lineTo(50, 150);
            ctx.closePath();
            ctx.fill();
            
            // Draw crown points
            ctx.beginPath();
            // Left edge
            ctx.moveTo(50, 150);
            // First point
            ctx.lineTo(80, 130);
            ctx.lineTo(90, 80);
            ctx.lineTo(100, 130);
            // Second point
            ctx.lineTo(125, 100);
            ctx.lineTo(128, 40);
            ctx.lineTo(131, 100);
            // Third point
            ctx.lineTo(156, 130);
            ctx.lineTo(166, 80);
            ctx.lineTo(176, 130);
            // Right edge
            ctx.lineTo(206, 150);
            ctx.closePath();
            ctx.fill();
            
            // Draw gems
            ctx.fillStyle = '#E0115F'; // Ruby
            ctx.beginPath();
            ctx.arc(90, 100, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#50C878'; // Emerald
            ctx.beginPath();
            ctx.arc(128, 70, 12, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#0F52BA'; // Sapphire
            ctx.beginPath();
            ctx.arc(166, 100, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Add shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(90, 95, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(128, 65, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(166, 95, 4, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.transparent = true;
            return texture;
        }
        
        // Create columns
        function createColumns() {
            const goldTexture = createGoldTexture();
            
            // Calculate positions in a circle
            for (let i = 0; i < settings.columnCount; i++) {
                const angle = (i / settings.columnCount) * Math.PI * 2;
                const radius = settings.sceneRadius * 0.8;
                
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                
                // Create column geometry
                const columnGeo = new THREE.CylinderGeometry(
                    settings.columnRadius,
                    settings.columnRadius * 1.2,
                    settings.columnHeight,
                    16,
                    2,
                    false
                );
                
                // Create column base and top
                const baseGeo = new THREE.CylinderGeometry(
                    settings.columnRadius * 1.5,
                    settings.columnRadius * 1.8,
                    settings.columnHeight * 0.1,
                    16,
                    1,
                    false
                );
                
                const topGeo = new THREE.CylinderGeometry(
                    settings.columnRadius * 1.8,
                    settings.columnRadius * 1.5,
                    settings.columnHeight * 0.1,
                    16,
                    1,
                    false
                );
                
                // Materials
                const columnMat = new THREE.MeshStandardMaterial({
                    map: goldTexture,
                    metalness: 0.8,
                    roughness: 0.3,
                    color: settings.colors.gold
                });
                
                // Create meshes
                const column = new THREE.Mesh(columnGeo, columnMat);
                column.position.set(x, 0, z);
                column.castShadow = true;
                column.receiveShadow = true;
                columnsGroup.add(column);
                
                // Add base
                const base = new THREE.Mesh(baseGeo, columnMat);
                base.position.set(x, -settings.columnHeight / 2, z);
                base.castShadow = true;
                base.receiveShadow = true;
                columnsGroup.add(base);
                
                // Add top (capital)
                const top = new THREE.Mesh(topGeo, columnMat);
                top.position.set(x, settings.columnHeight / 2, z);
                top.castShadow = true;
                top.receiveShadow = true;
                columnsGroup.add(top);
                
                // Decorative element on top
                const decorGeo = new THREE.SphereGeometry(settings.columnRadius * 0.8, 16, 16);
                const decorMat = new THREE.MeshStandardMaterial({
                    color: settings.colors.gold,
                    metalness: 1.0,
                    roughness: 0.2,
                    emissive: 0x553300,
                    emissiveIntensity: 0.2
                });
                
                const decor = new THREE.Mesh(decorGeo, decorMat);
                decor.position.set(x, settings.columnHeight * 0.6, z);
                decor.castShadow = true;
                columnsGroup.add(decor);
            }
        }
        
        // Create draped curtains
        function createDrapes() {
            for (let i = 0; i < settings.drapeCount; i++) {
                const angle = (i / settings.drapeCount) * Math.PI * 2;
                const radius = settings.sceneRadius * 0.9;
                
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                
                // Alternate between purple and crimson
                const color = i % 2 === 0 ? '#4B0082' : '#8B0000';
                const velvetTexture = createVelvetTexture(color);
                
                // Create drape geometry
                const drapeGeo = new THREE.PlaneGeometry(
                    settings.drapeWidth,
                    settings.columnHeight * 1.5,
                    8,
                    16
                );
                
                // Modify vertices to create a draped effect
                const vertices = drapeGeo.attributes.position.array;
                for (let j = 0; j < vertices.length; j += 3) {
                    const x = vertices[j];
                    const y = vertices[j + 1];
                    
                    // Create folds and curves in the drape
                    const waveX = Math.sin(x * 0.5) * 0.8;
                    const waveY = Math.sin(y * 0.2) * 0.3;
                    
                    // Apply deformation
                    vertices[j + 2] = waveX + waveY;
                    
                    // Bottom of the drape should be more curved
                    if (y < -settings.columnHeight * 0.3) {
                        const fallOff = (y + settings.columnHeight * 0.75) / (settings.columnHeight * 0.45);
                        vertices[j + 2] += (1 - fallOff) * 3 * Math.sin(x);
                    }
                }
                
                drapeGeo.computeVertexNormals();
                
                // Create drape material
                const drapeMat = new THREE.MeshStandardMaterial({
                    map: velvetTexture,
                    side: THREE.DoubleSide,
                    roughness: 0.8,
                    metalness: 0.1,
                    color: 0xFFFFFF // Use white to let the texture color show
                });
                
                // Create drape mesh
                const drape = new THREE.Mesh(drapeGeo, drapeMat);
                drape.position.set(x, 0, z);
                drape.lookAt(0, 0, 0); // Face toward center
                drape.castShadow = true;
                drape.receiveShadow = true;
                
                // Add gold trim at the top
                const trimGeo = new THREE.BoxGeometry(
                    settings.drapeWidth,
                    settings.columnHeight * 0.05,
                    0.5
                );
                const trimMat = new THREE.MeshStandardMaterial({
                    color: settings.colors.gold,
                    metalness: 0.8,
                    roughness: 0.2
                });
                
                const trim = new THREE.Mesh(trimGeo, trimMat);
                trim.position.set(0, settings.columnHeight * 0.75, 0.3);
                trim.castShadow = true;
                
                // Add trim to drape
                drape.add(trim);
                drapesGroup.add(drape);
                
                // Animation data for drapes
                drape.userData = {
                    originalPosition: drape.position.clone(),
                    animationPhase: Math.random() * Math.PI * 2,
                    animationSpeed: 0.3 + Math.random() * 0.2
                };
            }
        }
        
        // Create floating crowns
        function createCrowns() {
            const crownTexture = createCrownTexture();
            
            for (let i = 0; i < settings.crownCount; i++) {
                // Create crown as a square plane with texture
                const crownGeo = new THREE.PlaneGeometry(10, 10);
                const crownMat = new THREE.MeshBasicMaterial({
                    map: crownTexture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                
                const crown = new THREE.Sprite(crownMat);
                crown.scale.set(15, 15, 1);
                
                // Position randomly in the scene
                crown.position.set(
                    (Math.random() - 0.5) * settings.sceneRadius * 0.6,
                    Math.random() * 20 + 10,
                    (Math.random() - 0.5) * settings.sceneRadius * 0.6
                );
                
                // Add light to the crown for glow effect
                const light = new THREE.PointLight(settings.colors.gold, 1, 10);
                light.position.set(0, 0, 1);
                crown.add(light);
                
                // Animation data
                crown.userData = {
                    originalY: crown.position.y,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    floatSpeed: 0.2 + Math.random() * 0.3,
                    floatAmplitude: 1 + Math.random() * 3,
                    floatPhase: Math.random() * Math.PI * 2
                };
                
                crownsGroup.add(crown);
            }
        }
        
        // Create floating gems
        function createGems() {
            // Different gem colors
            const gemColors = [
                'rgb(15, 82, 186)',    // Sapphire
                'rgb(80, 200, 120)',    // Emerald
                'rgb(224, 17, 95)',     // Ruby
                'rgb(255, 215, 0)',     // Gold
                'rgb(212, 175, 55)'     // Gold variation
            ];
            
            for (let i = 0; i < settings.gemCount; i++) {
                // Choose a random gem color
                const colorIndex = Math.floor(Math.random() * gemColors.length);
                const gemTexture = createGemTexture(gemColors[colorIndex]);
                
                // Create gem as a sprite
                const gemMat = new THREE.SpriteMaterial({
                    map: gemTexture,
                    transparent: true,
                    blending: THREE.AdditiveBlending
                });
                
                const gem = new THREE.Sprite(gemMat);
                
                // Random size
                const size = Math.random() * 2 + 0.5;
                gem.scale.set(size, size, 1);
                
                // Position randomly in the scene
                gem.position.set(
                    (Math.random() - 0.5) * settings.sceneRadius * 1.5,
                    Math.random() * 30,
                    (Math.random() - 0.5) * settings.sceneRadius * 1.5
                );
                
                // Animation data
                gem.userData = {
                    originalPosition: gem.position.clone(),
                    floatSpeed: 0.2 + Math.random() * 0.8,
                    floatAmplitude: 0.5 + Math.random() * 2,
                    floatPhase: Math.random() * Math.PI * 2,
                    rotationSpeed: Math.random() * 0.02,
                    twinkleSpeed: 0.5 + Math.random() * 2
                };
                
                gemsGroup.add(gem);
            }
        }
        
        // Create gold dust particles
        function createGoldDust() {
            // Create a single particle texture
            const particleTexture = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAFFmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAxOS0wMi0wN1QxNjo0MzoxNiswMTowMCIgeG1wOk1vZGlmeURhdGU9IjIwMTktMDItMDdUMTY6NDU6MDErMDE6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMTktMDItMDdUMTY6NDU6MDErMDE6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6YzI0MGRmNzQtY2FmMy00MjQx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');
            
            // Particles geometry
            const particlesGeo = new THREE.BufferGeometry();
            const particlesCnt = settings.goldDustCount;
            const posArray = new Float32Array(particlesCnt * 3);
            const scaleArray = new Float32Array(particlesCnt);
            
            // Fill arrays with random values
            for (let i = 0; i < particlesCnt * 3; i += 3) {
                // Position
                posArray[i] = (Math.random() - 0.5) * settings.sceneRadius * 2;
                posArray[i + 1] = Math.random() * 40; // Height
                posArray[i + 2] = (Math.random() - 0.5) * settings.sceneRadius * 2;
                
                // Scale (size)
                scaleArray[i / 3] = Math.random() * 0.5 + 0.1;
            }
            
            particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            particlesGeo.setAttribute('scale', new THREE.BufferAttribute(scaleArray, 1));
            
            // Shader material for particles
            const particlesMaterial = new THREE.PointsMaterial({
                size: 0.5,
                map: particleTexture,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                vertexColors: false,
                color: settings.colors.gold
            });
            
            // Create particles
            const goldParticles = new THREE.Points(particlesGeo, particlesMaterial);
            goldDustGroup.add(goldParticles);
            
            // Animation properties
            goldDustGroup.userData = {
                time: 0,
                speed: 0.05
            };
        }
        
        // Create ornate floor
        function createFloor() {
            // Main floor
            const floorRadius = settings.floorRadius;
            const floorGeo = new THREE.CircleGeometry(floorRadius, 64);
            
            // Gold and purple checkerboard pattern
            const floorTexCanvas = document.createElement('canvas');
            floorTexCanvas.width = 512;
            floorTexCanvas.height = 512;
            const ctx = floorTexCanvas.getContext('2d');
            
            // Create checkerboard pattern
            const squareSize = 64;
            for (let x = 0; x < 512; x += squareSize) {
                for (let y = 0; y < 512; y += squareSize) {
                    if ((x / squareSize + y / squareSize) % 2 === 0) {
                        // Gold square
                        ctx.fillStyle = '#D4AF37';
                    } else {
                        // Purple square
                        ctx.fillStyle = '#4B0082';
                    }
                    ctx.fillRect(x, y, squareSize, squareSize);
                    
                    // Add decorative pattern
                    if ((x / squareSize + y / squareSize) % 2 === 0) {
                        ctx.fillStyle = 'rgba(255, 240, 150, 0.3)';
                    } else {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    }
                    
                    // Draw fleur-de-lis pattern
                    ctx.beginPath();
                    ctx.arc(x + squareSize/2, y + squareSize/2, squareSize/4, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(x + squareSize/2, y + squareSize/4);
                    ctx.lineTo(x + squareSize/2, y + squareSize * 3/4);
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = ctx.fillStyle;
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.moveTo(x + squareSize/4, y + squareSize/2);
                    ctx.lineTo(x + squareSize * 3/4, y + squareSize/2);
                    ctx.stroke();
                }
            }
            
            const floorTexture = new THREE.CanvasTexture(floorTexCanvas);
            floorTexture.wrapS = THREE.RepeatWrapping;
            floorTexture.wrapT = THREE.RepeatWrapping;
            floorTexture.repeat.set(4, 4);
            
            const floorMat = new THREE.MeshStandardMaterial({
                map: floorTexture,
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.DoubleSide
            });
            
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = settings.groundHeight;
            floor.receiveShadow = true;
            
            floorGroup.add(floor);
            
            // Floor edge (golden ring)
            const ringGeo = new THREE.TorusGeometry(floorRadius, 1, 16, 100);
            const ringMat = new THREE.MeshStandardMaterial({
                color: settings.colors.gold,
                metalness: 0.8,
                roughness: 0.3
            });
            
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = settings.groundHeight + 0.05;
            ring.receiveShadow = true;
            
            floorGroup.add(ring);
        }
        
        // Create all visual elements
        createFloor();
        createColumns();
        createDrapes();
        createCrowns();
        createGems();
        createGoldDust();
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x332211, 0.3);
        scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 10;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Add some colored point lights for atmosphere
        const purpleLight = new THREE.PointLight(0x4B0082, 1, 100);
        purpleLight.position.set(-20, 20, -20);
        scene.add(purpleLight);
        
        const goldLight = new THREE.PointLight(0xD4AF37, 1, 100);
        goldLight.position.set(20, 15, 20);
        scene.add(goldLight);
        
        // Animation loop variables
        const clock = new THREE.Clock();
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            const deltaTime = Math.min(clock.getDelta(), 0.1);
            const time = clock.getElapsedTime();
            
            // Apply mouse rotation to groups
            if (mouse.down) {
                const deltaX = mouse.x - mouse.previousX;
                const deltaY = mouse.y - mouse.previousY;
                
                if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
                    // Apply rotation to all groups
                    const groups = [columnsGroup, crownsGroup, drapesGroup, gemsGroup];
                    
                    groups.forEach(group => {
                        group.rotation.y += deltaX * 2;
                        group.rotation.x += deltaY;
                        
                        // Limit rotation on x-axis
                        group.rotation.x = Math.max(Math.min(group.rotation.x, Math.PI * 0.2), -Math.PI * 0.2);
                    });
                }
            } else {
                // Auto-rotation
                columnsGroup.rotation.y += deltaTime * 0.05;
                crownsGroup.rotation.y += deltaTime * 0.08;
                drapesGroup.rotation.y += deltaTime * 0.05;
                gemsGroup.rotation.y += deltaTime * 0.02;
            }
            
            mouse.previousX = mouse.x;
            mouse.previousY = mouse.y;
            
            // Update drapes animation
            drapesGroup.children.forEach(drape => {
                drape.userData.animationPhase += deltaTime * drape.userData.animationSpeed;
                
                // Subtle wave animation
                const waveAmplitude = 0.2;
                drape.position.z = drape.userData.originalPosition.z + 
                    Math.sin(drape.userData.animationPhase) * waveAmplitude;
            });
            
            // Update crowns animation
            crownsGroup.children.forEach(crown => {
                // Floating up and down
                crown.position.y = crown.userData.originalY + 
                    Math.sin(time * crown.userData.floatSpeed) * crown.userData.floatAmplitude;
                
                // Rotation
                crown.rotation.z += crown.userData.rotationSpeed;
            });
            
            // Update gems animation
            gemsGroup.children.forEach((gem, i) => {
                // Floating motion
                gem.position.x = gem.userData.originalPosition.x + 
                    Math.sin(time * 0.5 + i) * 0.3;
                gem.position.y = gem.userData.originalPosition.y + 
                    Math.sin(time * gem.userData.floatSpeed + gem.userData.floatPhase) * 
                    gem.userData.floatAmplitude;
                
                // Twinkle effect
                gem.material.opacity = 0.7 + Math.sin(time * gem.userData.twinkleSpeed) * 0.3;
            });
            
            // Update gold dust animation
            goldDustGroup.userData.time += deltaTime;
            const dustTime = goldDustGroup.userData.time;
            
            // Rotate dust
            goldDustGroup.rotation.y += deltaTime * 0.05;
            
            // Animate dust particles
            const positions = goldDustGroup.children[0].geometry.attributes.position.array;
            const scales = goldDustGroup.children[0].geometry.attributes.scale.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Gentle rising motion
                positions[i + 1] += deltaTime * 0.5;
                
                // Reset particles that go too high
                if (positions[i + 1] > 40) {
                    positions[i + 1] = 0;
                }
                
                // Swirl motion
                const angle = dustTime * 0.1 + i * 0.001;
                const radius = 5 + Math.sin(i * 0.1) * 20;
                positions[i] += Math.sin(angle) * deltaTime * radius * 0.01;
                positions[i + 2] += Math.cos(angle) * deltaTime * radius * 0.01;
                
                // Pulsing size
                scales[i / 3] = 0.1 + Math.sin(dustTime + i * 0.1) * 0.05;
            }
            
            goldDustGroup.children[0].geometry.attributes.position.needsUpdate = true;
            goldDustGroup.children[0].geometry.attributes.scale.needsUpdate = true;
            
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

// Initialize the Royal Background when DOM is loaded
document.addEventListener('DOMContentLoaded', initRoyalBackground);