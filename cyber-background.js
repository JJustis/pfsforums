  const initNetrunnerBackground = () => {
            // Get the canvas element
            const canvas = document.getElementById('bg-canvas');
            
            // Create scene, camera, and renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            
            const renderer = new THREE.WebGLRenderer({ 
                canvas, 
                antialias: true,
                alpha: true 
            });
            
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000510);
            
            // Add fog for depth
            scene.fog = new THREE.FogExp2(0x000823, 0.035);
            
            // Colors
            const colors = {
                primary: 0x00ffff,
                secondary: 0xff00ff,
                accent1: 0x00ff8f,
                accent2: 0x9000ff,
                dataStream: 0x00aaff,
                gridLines: 0x0044aa
            };
            
            // --------------------------------
            // Create grid
            // --------------------------------
            const createGrid = () => {
                const gridGroup = new THREE.Group();
                
                // Main grid
                const gridSize = 100;
                const gridDivisions = 100;
                const mainGrid = new THREE.GridHelper(gridSize, gridDivisions, colors.gridLines, colors.gridLines);
                mainGrid.material.transparent = true;
                mainGrid.material.opacity = 0.3;
                mainGrid.position.y = -5;
                gridGroup.add(mainGrid);
                
                // Secondary smaller grid with different rotation
                const secondaryGrid = new THREE.GridHelper(gridSize * 0.5, gridDivisions / 2, colors.secondary, colors.secondary);
                secondaryGrid.material.transparent = true;
                secondaryGrid.material.opacity = 0.15;
                secondaryGrid.position.y = -2;
                secondaryGrid.rotation.y = Math.PI / 4;
                gridGroup.add(secondaryGrid);
                
                return gridGroup;
            };
            
            const grid = createGrid();
            scene.add(grid);
            
            // --------------------------------
            // Create floating data structures
            // --------------------------------
            const createDataStructures = () => {
                const structures = new THREE.Group();
                
                // Parameters for the structures
                const structureCount = 50;
                
                // Create various geometric shapes
                const geometries = [
                    new THREE.TetrahedronGeometry(1, 0),
                    new THREE.IcosahedronGeometry(1, 0),
                    new THREE.OctahedronGeometry(1, 0),
                    new THREE.DodecahedronGeometry(1, 0)
                ];
                
                // Create materials with wireframe
                const materials = [
                    new THREE.MeshBasicMaterial({ 
                        color: colors.primary, 
                        wireframe: true,
                        transparent: true,
                        opacity: 0.6
                    }),
                    new THREE.MeshBasicMaterial({ 
                        color: colors.secondary, 
                        wireframe: true,
                        transparent: true,
                        opacity: 0.6
                    }),
                    new THREE.MeshBasicMaterial({ 
                        color: colors.accent1, 
                        wireframe: true,
                        transparent: true,
                        opacity: 0.6
                    }),
                    new THREE.MeshBasicMaterial({ 
                        color: colors.accent2, 
                        wireframe: true,
                        transparent: true,
                        opacity: 0.6
                    })
                ];
                
                // Add meshes with random positions, scales, and rotations
                for (let i = 0; i < structureCount; i++) {
                    const geometryIndex = Math.floor(Math.random() * geometries.length);
                    const materialIndex = Math.floor(Math.random() * materials.length);
                    
                    const mesh = new THREE.Mesh(geometries[geometryIndex], materials[materialIndex]);
                    
                    // Position randomly in space
                    mesh.position.x = (Math.random() - 0.5) * 80;
                    mesh.position.y = (Math.random() - 0.5) * 40;
                    mesh.position.z = (Math.random() - 0.5) * 80 - 20;
                    
                    // Random scale
                    const scale = Math.random() * 3 + 0.5;
                    mesh.scale.set(scale, scale, scale);
                    
                    // Random rotation
                    mesh.rotation.x = Math.random() * Math.PI * 2;
                    mesh.rotation.y = Math.random() * Math.PI * 2;
                    mesh.rotation.z = Math.random() * Math.PI * 2;
                    
                    // Store initial position and rotation for animation
                    mesh.userData = {
                        initialPosition: mesh.position.clone(),
                        rotationSpeed: {
                            x: (Math.random() - 0.5) * 0.01,
                            y: (Math.random() - 0.5) * 0.01,
                            z: (Math.random() - 0.5) * 0.01
                        },
                        floatSpeed: Math.random() * 0.05 + 0.01,
                        floatOffset: Math.random() * Math.PI * 2
                    };
                    
                    structures.add(mesh);
                }
                
                return structures;
            };
            
            const dataStructures = createDataStructures();
            scene.add(dataStructures);
            
            // --------------------------------
            // Create data streams
            // --------------------------------
            const createDataStreams = () => {
                const streams = new THREE.Group();
                
                // Parameters
                const streamCount = 15;
                
                for (let i = 0; i < streamCount; i++) {
                    // Create a curved path for the stream
                    const curvePoints = [];
                    const segments = 10;
                    const radius = Math.random() * 30 + 10;
                    const height = Math.random() * 20 - 10;
                    const startAngle = Math.random() * Math.PI * 2;
                    const angleSpan = Math.PI * (Math.random() * 0.5 + 0.25);
                    
                    for (let j = 0; j <= segments; j++) {
                        const t = j / segments;
                        const angle = startAngle + angleSpan * t;
                        
                        curvePoints.push(new THREE.Vector3(
                            Math.cos(angle) * radius,
                            height + Math.sin(t * Math.PI) * 10,
                            Math.sin(angle) * radius - 20
                        ));
                    }
                    
                    const curve = new THREE.CatmullRomCurve3(curvePoints);
                    
                    // Create tube geometry along the curve
                    const tubeGeometry = new THREE.TubeGeometry(
                        curve,
                        50,            // tubular segments
                        0.15,          // radius
                        8,             // radial segments
                        false          // closed
                    );
                    
                    // Create material with glow effect
                    const tubeMaterial = new THREE.MeshBasicMaterial({
                        color: colors.dataStream,
                        transparent: true,
                        opacity: 0.6
                    });
                    
                    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
                    
                    // Store data for animation
                    tube.userData = {
                        particles: [],
                        particleCount: Math.floor(Math.random() * 15) + 10,
                        speed: Math.random() * 0.02 + 0.01
                    };
                    
                    // Create particles that will flow along the tube
                    for (let p = 0; p < tube.userData.particleCount; p++) {
                        const particleGeometry = new THREE.SphereGeometry(0.25, 8, 8);
                        const particleMaterial = new THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: 0.8
                        });
                        
                        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                        
                        // Start at random positions along the tube
                        const t = Math.random();
                        const pos = curve.getPointAt(t);
                        particle.position.copy(pos);
                        
                        particle.userData = {
                            t: t,
                            speed: tube.userData.speed * (Math.random() * 0.5 + 0.75)
                        };
                        
                        tube.userData.particles.push(particle);
                        streams.add(particle);
                    }
                    
                    streams.add(tube);
                }
                
                return streams;
            };
            
            const dataStreams = createDataStreams();
            scene.add(dataStreams);
            
            // --------------------------------
            // Create virtual skyline
            // --------------------------------
            const createSkyline = () => {
                const skylineGroup = new THREE.Group();
                
                // Create a distant horizon line of buildings
                const buildingCount = 50;
                const maxWidth = 2;
                const maxHeight = 8;
                const citySpread = 100;
                const cityDepth = 10;
                
                for (let i = 0; i < buildingCount; i++) {
                    const width = Math.random() * maxWidth + 0.5;
                    const height = Math.random() * maxHeight + 1;
                    const depth = Math.random() * 2 + 0.5;
                    
                    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
                    
                    // Choose a color based on height
                    let color;
                    if (height > maxHeight * 0.7) {
                        color = colors.accent1;
                    } else if (height > maxHeight * 0.4) {
                        color = colors.primary;
                    } else {
                        color = colors.dataStream;
                    }
                    
                    const buildingMaterial = new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.3,
                        wireframe: true
                    });
                    
                    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
                    
                    // Position along horizon
                    building.position.x = (Math.random() - 0.5) * citySpread;
                    building.position.y = -5 + height / 2;
                    building.position.z = -cityDepth - Math.random() * 20;
                    
                    // Add some random rotation for variety
                    building.rotation.y = (Math.random() - 0.5) * 0.2;
                    
                    skylineGroup.add(building);
                    
                    // Add some glowing windows
                    if (Math.random() > 0.5) {
                        const windowCount = Math.floor(Math.random() * 5) + 1;
                        
                        for (let w = 0; w < windowCount; w++) {
                            const windowGeometry = new THREE.PlaneGeometry(0.2, 0.2);
                            const windowMaterial = new THREE.MeshBasicMaterial({
                                color: 0xffffff,
                                transparent: true,
                                opacity: 0.8
                            });
                            
                            const window = new THREE.Mesh(windowGeometry, windowMaterial);
                            
                            // Position on the building
                            window.position.x = (Math.random() - 0.5) * (width * 0.8);
                            window.position.y = (Math.random() - 0.5) * (height * 0.8);
                            window.position.z = depth / 2 + 0.01;
                            
                            // Blinking effect
                            window.userData = {
                                blinkRate: Math.random() * 0.05,
                                blinkOffset: Math.random() * Math.PI * 2
                            };
                            
                            building.add(window);
                        }
                    }
                }
                
                return skylineGroup;
            };
            
            const skyline = createSkyline();
            scene.add(skyline);
            
            // --------------------------------
            // Create background space effect
            // --------------------------------
            const createSpaceBackground = () => {
                // Create stars
                const starCount = 2000;
                const starGeometry = new THREE.BufferGeometry();
                const starPositions = new Float32Array(starCount * 3);
                const starColors = new Float32Array(starCount * 3);
                
                for (let i = 0; i < starCount; i++) {
                    const i3 = i * 3;
                    
                    // Position stars in a dome shape
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI * 0.5;  // Half-sphere
                    const radius = 100 + Math.random() * 50;
                    
                    starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
                    starPositions[i3 + 1] = radius * Math.cos(phi);
                    starPositions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 50;
                    
                    // Add some color variation
                    let r, g, b;
                    
                    const colorRandom = Math.random();
                    if (colorRandom < 0.25) {
                        // Blue stars
                        r = 0.5 + Math.random() * 0.2;
                        g = 0.7 + Math.random() * 0.3;
                        b = 1.0;
                    } else if (colorRandom < 0.5) {
                        // Purple stars
                        r = 0.7 + Math.random() * 0.3;
                        g = 0.4 + Math.random() * 0.3;
                        b = 1.0;
                    } else if (colorRandom < 0.75) {
                        // Cyan stars
                        r = 0.4 + Math.random() * 0.2;
                        g = 1.0;
                        b = 1.0;
                    } else {
                        // White stars
                        r = 0.9 + Math.random() * 0.1;
                        g = 0.9 + Math.random() * 0.1;
                        b = 0.9 + Math.random() * 0.1;
                    }
                    
                    starColors[i3] = r;
                    starColors[i3 + 1] = g;
                    starColors[i3 + 2] = b;
                }
                
                starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
                starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
                
                const starMaterial = new THREE.PointsMaterial({
                    size: 0.5,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.8
                });
                
                const stars = new THREE.Points(starGeometry, starMaterial);
                
                return stars;
            };
            
            const spaceBackground = createSpaceBackground();
            scene.add(spaceBackground);
            
            // --------------------------------
            // Create energy particles system
            // --------------------------------
            const createEnergyParticles = () => {
                const particleCount = 500;
                const geometry = new THREE.BufferGeometry();
                
                const positions = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);
                const sizes = new Float32Array(particleCount);
                
                // Initialize particles
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    
                    // Position within a spherical volume
                    const radius = 30 * Math.cbrt(Math.random());  // Cube root for better distribution
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    
                    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
                    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                    positions[i3 + 2] = radius * Math.cos(phi) - 10;
                    
                    // Vary colors between primary and accent colors
                    const colorChoice = Math.random();
                    if (colorChoice < 0.3) {
                        // Cyan
                        colors[i3] = 0;
                        colors[i3 + 1] = 1;
                        colors[i3 + 2] = 1;
                    } else if (colorChoice < 0.6) {
                        // Magenta
                        colors[i3] = 1;
                        colors[i3 + 1] = 0;
                        colors[i3 + 2] = 1;
                    } else if (colorChoice < 0.9) {
                        // Green
                        colors[i3] = 0;
                        colors[i3 + 1] = 1;
                        colors[i3 + 2] = 0.5;
                    } else {
                        // White
                        colors[i3] = 1;
                        colors[i3 + 1] = 1;
                        colors[i3 + 2] = 1;
                    }
                    
                    // Vary sizes
                    sizes[i] = Math.random() * 2 + 0.5;
                }
                
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
                
                // Shader material for better looking particles
                const particleMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        pointTexture: { value: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAFFmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDAgNzkuMTYwNDUxLCAyMDE3LzA1LzA2LTAxOjA4OjIxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMTgtMDctMjlUMTc6Mzk6MTkrMDg6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDE4LTA3LTI5VDE3OjQwOjUwKzA4OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDE4LTA3LTI5VDE3OjQwOjUwKzA4OjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmIxMTJhMTM1LWQ1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') }
                    },
                    vertexShader: `
                        attribute float size;
                        attribute vec3 color;
                        varying vec3 vColor;
                        void main() {
                            vColor = color;
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            gl_PointSize = size * (300.0 / -mvPosition.z);
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D pointTexture;
                        varying vec3 vColor;
                        void main() {
                            gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
                        }
                    `,
                    blending: THREE.AdditiveBlending,
                    depthTest: false,
                    transparent: true
                });
                
                const particles = new THREE.Points(geometry, particleMaterial);
                
                // Store for animation
                particles.userData = {
                    positions: positions,
                    originalPositions: positions.slice(),
                    velocities: new Float32Array(particleCount * 3),
                    frequency: new Float32Array(particleCount),
                    phases: new Float32Array(particleCount)
                };
                
                // Initialize animation parameters
                for (let i = 0; i < particleCount; i++) {
                    particles.userData.frequency[i] = Math.random() * 0.05 + 0.01;
                    particles.userData.phases[i] = Math.random() * Math.PI * 2;
                }
                
                return particles;
            };
            
            const energyParticles = createEnergyParticles();
            scene.add(energyParticles);
            
            // --------------------------------
            // Create data code pillars
            // --------------------------------
            const createCodePillars = () => {
                const pillarsGroup = new THREE.Group();
                
                // Number of pillars
                const pillarCount = 8;
                
                for (let i = 0; i < pillarCount; i++) {
                    // Create pillar mesh
                    const height = Math.random() * 10 + 5;
                    const pillarGeometry = new THREE.BoxGeometry(0.5, height, 0.5);
                    
                    const pillarMaterial = new THREE.MeshBasicMaterial({
                        color: colors.dataStream,
                        transparent: true,
                        opacity: 0.3,
                        wireframe: true
                    });
                    
                    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
                    
                    // Position in a circle around the scene
                    const angle = (i / pillarCount) * Math.PI * 2;
                    const radius = 20;
                    
                    pillar.position.x = Math.cos(angle) * radius;
                    pillar.position.y = 0;
                    pillar.position.z = Math.sin(angle) * radius - 10;
                    
                    // Create data binary code texture
                    const codeCanvas = document.createElement('canvas');
                    codeCanvas.width = 64;
                    codeCanvas.height = 512;
                    const ctx = codeCanvas.getContext('2d');
                    
                    // Fill with dark background
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(0, 0, codeCanvas.width, codeCanvas.height);
                    
                    // Generate random binary code
                    ctx.font = '10px Courier New';
                    
                    for (let y = 0; y < codeCanvas.height; y += 10) {
                        let line = '';
                        for (let x = 0; x < 8; x++) {
                            line += Math.random() > 0.5 ? '1' : '0';
                        }
                        ctx.fillStyle = Math.random() > 0.7 ? 
                            `rgba(0, ${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 0.8)` :
                            'rgba(0, 255, 255, 0.4)';
                        ctx.fillText(line, 5, y + 10);
                    }
                    
                    const codeTexture = new THREE.CanvasTexture(codeCanvas);
                    
                    // Create planes for each side of the pillar with the code texture
                    const sides = 4;
                    for (let s = 0; s < sides; s++) {
                        const angle = (s / sides) * Math.PI * 2;
                        
                        const planeGeometry = new THREE.PlaneGeometry(0.6, height + 0.1);
                        const planeMaterial = new THREE.MeshBasicMaterial({
                            map: codeTexture,
                            transparent: true,
                            opacity: 0.9,
                            side: THREE.DoubleSide
                        });
                        
                        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
                        plane.position.set(
                            Math.sin(angle) * 0.3,
                            0,
                            Math.cos(angle) * 0.3
                        );
                        plane.rotation.y = angle;
                        
                        // Animation data
                        plane.userData = {
                            scrollSpeed: Math.random() * 0.001 + 0.0005,
                            blinkRate: Math.random() * 0.01 + 0.005,
                            blinkOffset: Math.random() * Math.PI * 2
                        };
                        
                        pillar.add(plane);
                    }
                    
                    pillarsGroup.add(pillar);
                }
                
                return pillarsGroup;
            };
            
            const codePillars = createCodePillars();
            scene.add(codePillars);
            
            // --------------------------------
            // Setup camera and mouse interaction
            // --------------------------------
            camera.position.set(0, 3, 20);
            camera.lookAt(0, 0, -10);
            
            // Mouse tracking
            const mouse = {
                x: 0,
                y: 0,
                prevX: 0,
                prevY: 0
            };
            
            document.addEventListener('mousemove', (event) => {
                mouse.prevX = mouse.x;
                mouse.prevY = mouse.y;
                
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            });
            
            // Handle window resize
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
            
            // Animation variables
            let time = 0;
            
            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);
                
                time += 0.01;
                
                // Move camera slightly based on mouse
                camera.position.x += (mouse.x * 5 - camera.position.x) * 0.01;
                camera.position.y += (mouse.y * 3 - camera.position.y) * 0.01;
                camera.lookAt(0, 0, -10);
                
                // Animate data structures
                dataStructures.children.forEach((structure) => {
                    structure.rotation.x += structure.userData.rotationSpeed.x;
                    structure.rotation.y += structure.userData.rotationSpeed.y;
                    structure.rotation.z += structure.userData.rotationSpeed.z;
                    
                    // Floating animation
                    structure.position.y = structure.userData.initialPosition.y +
                        Math.sin(time * structure.userData.floatSpeed + structure.userData.floatOffset) * 0.5;
                });
                
                // Animate data streams
                dataStreams.children.forEach((child) => {
                    if (child.userData && child.userData.particles) {
                        // This is a tube with particles
                        child.userData.particles.forEach((particle) => {
                            // Update particle position along the curve
                            particle.userData.t += particle.userData.speed;
                            if (particle.userData.t >= 1) {
                                particle.userData.t = 0;
                            }
                            
                            // Get position on the curve
                            const curvePoints = child.geometry.parameters.path.getPointAt(particle.userData.t);
                            particle.position.copy(curvePoints);
                        });
                    }
                });
                
                // Animate skyline windows (blinking)
                skyline.children.forEach((building) => {
                    building.children.forEach((child) => {
                        if (child.userData && child.userData.blinkRate) {
                            child.material.opacity = 0.5 + 0.5 * Math.sin(time * child.userData.blinkRate + child.userData.blinkOffset);
                        }
                    });
                });
                
                // Animate energy particles
                if (energyParticles.userData) {
                    const positions = energyParticles.geometry.attributes.position.array;
                    const originalPositions = energyParticles.userData.originalPositions;
                    const velocities = energyParticles.userData.velocities;
                    const frequency = energyParticles.userData.frequency;
                    const phases = energyParticles.userData.phases;
                    
                    // Calculate mouse influence
                    const mouseInfluence = Math.sqrt(
                        (mouse.x - mouse.prevX) * (mouse.x - mouse.prevX) +
                        (mouse.y - mouse.prevY) * (mouse.y - mouse.prevY)
                    ) * 50;
                    
                    for (let i = 0; i < positions.length; i += 3) {
                        // Wave animation
                        positions[i] = originalPositions[i] +
                            Math.sin(time * frequency[i/3] + phases[i/3]) * 2;
                            
                        positions[i + 1] = originalPositions[i + 1] +
                            Math.cos(time * frequency[i/3] + phases[i/3]) * 2;
                            
                        positions[i + 2] = originalPositions[i + 2] +
                            Math.sin(time * frequency[i/3] + phases[i/3] + Math.PI/2) * 2;
                        
                        // Add some velocity when mouse moves
                        if (mouseInfluence > 0.1) {
                            velocities[i] += (Math.random() - 0.5) * mouseInfluence * 0.01;
                            velocities[i + 1] += (Math.random() - 0.5) * mouseInfluence * 0.01;
                            velocities[i + 2] += (Math.random() - 0.5) * mouseInfluence * 0.01;
                        }
                        
                        // Apply velocity with damping
                        positions[i] += velocities[i];
                        positions[i + 1] += velocities[i + 1];
                        positions[i + 2] += velocities[i + 2];
                        
                        velocities[i] *= 0.95;
                        velocities[i + 1] *= 0.95;
                        velocities[i + 2] *= 0.95;
                        
                        // Pull back to original position
                        const dx = originalPositions[i] - positions[i];
                        const dy = originalPositions[i + 1] - positions[i + 1];
                        const dz = originalPositions[i + 2] - positions[i + 2];
                        
                        velocities[i] += dx * 0.003;
                        velocities[i + 1] += dy * 0.003;
                        velocities[i + 2] += dz * 0.003;
                    }
                    
                    energyParticles.geometry.attributes.position.needsUpdate = true;
                }
                
                // Animate code pillars (scrolling text)
                codePillars.children.forEach((pillar) => {
                    pillar.children.forEach((plane) => {
                        if (plane.material && plane.material.map) {
                            plane.material.map.offset.y += plane.userData.scrollSpeed;
                            
                            // Blink effect
                            const blinkValue = Math.sin(time * plane.userData.blinkRate + plane.userData.blinkOffset);
                            if (blinkValue > 0.95) {
                                plane.material.opacity = 0.9 + Math.random() * 0.1;
                            } else {
                                plane.material.opacity = 0.7;
                            }
                        }
                    });
                });
                
                // Slowly rotate the grid for a dynamic effect
                grid.rotation.y += 0.001;
                
                // Render the scene
                renderer.render(scene, camera);
            };
            
            // Start animation
            animate();
        };

        // Initialize background when DOM is loaded
        document.addEventListener('DOMContentLoaded', initNetrunnerBackground);