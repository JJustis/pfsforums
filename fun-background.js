
        const initSpeakerBackground = () => {
            // Get the canvas element
            const canvas = document.getElementById('bg-canvas');
            
            // Create scene, camera, and renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            
            // Set renderer size and pixel ratio
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000);
            
            // Add a subtle fog for depth
            scene.fog = new THREE.FogExp2(0x000000, 0.02);
            
            // Colors for 80's retro aesthetic
            const colors = {
                pink: 0xff00ff,
                purple: 0x9900ff,
                blue: 0x00aaff,
                teal: 0x00ffdd,
                yellow: 0xffff00,
                orange: 0xff6600
            };
            
            // Create a grid helper for the 80's grid effect
            const gridHelper = new THREE.GridHelper(40, 40, 0x00ffff, 0x9900ff);
            gridHelper.position.y = -8;
            gridHelper.position.z = -15;
            scene.add(gridHelper);
            
            // Create rhombus-shaped speaker
            const createSpeaker = () => {
                const group = new THREE.Group();
                
                // Create rhombus/diamond shape
                const rhombusShape = new THREE.Shape();
                const size = 4;
                
                rhombusShape.moveTo(0, size);
                rhombusShape.lineTo(size, 0);
                rhombusShape.lineTo(0, -size);
                rhombusShape.lineTo(-size, 0);
                rhombusShape.lineTo(0, size);
                
                const rhombusGeometry = new THREE.ShapeGeometry(rhombusShape);
                const rhombusMaterial = new THREE.MeshPhongMaterial({
                    color: colors.teal,
                    emissive: 0x006666,
                    specular: 0xffffff,
                    shininess: 100,
                    flatShading: true,
                    side: THREE.DoubleSide
                });
                
                const rhombusMesh = new THREE.Mesh(rhombusGeometry, rhombusMaterial);
                group.add(rhombusMesh);
                
                // Create outer frame/border
                const borderShape = new THREE.Shape();
                const borderSize = size + 0.3;
                
                borderShape.moveTo(0, borderSize);
                borderShape.lineTo(borderSize, 0);
                borderShape.lineTo(0, -borderSize);
                borderShape.lineTo(-borderSize, 0);
                borderShape.lineTo(0, borderSize);
                
                // Create hole (inner rhombus)
                const holeShape = new THREE.Path();
                const holeSize = size;
                
                holeShape.moveTo(0, holeSize);
                holeShape.lineTo(holeSize, 0);
                holeShape.lineTo(0, -holeSize);
                holeShape.lineTo(-holeSize, 0);
                holeShape.lineTo(0, holeSize);
                
                borderShape.holes.push(holeShape);
                
                const borderGeometry = new THREE.ShapeGeometry(borderShape);
                const borderMaterial = new THREE.MeshPhongMaterial({
                    color: colors.pink,
                    emissive: 0x330033,
                    specular: 0xffffff,
                    shininess: 100,
                    side: THREE.DoubleSide
                });
                
                const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
                borderMesh.position.z = 0.1;
                group.add(borderMesh);
                
                // Create inner speaker cone circle
                const coneGeometry = new THREE.CircleGeometry(2, 32);
                const coneMaterial = new THREE.MeshPhongMaterial({
                    color: 0x111111,
                    emissive: 0x222222,
                    specular: 0x999999,
                    shininess: 30,
                    side: THREE.DoubleSide
                });
                
                const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
                coneMesh.position.z = 0.15;
                group.add(coneMesh);
                
                // Create speaker center/dust cap
                const centerGeometry = new THREE.CircleGeometry(0.8, 32);
                const centerMaterial = new THREE.MeshPhongMaterial({
                    color: colors.yellow,
                    emissive: 0x333300,
                    specular: 0xffffff,
                    shininess: 100,
                    side: THREE.DoubleSide
                });
                
                const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
                centerMesh.position.z = 0.2;
                group.add(centerMesh);
                
                // Add concentric rings for the speaker cone
                const rings = 5;
                for (let i = 1; i <= rings; i++) {
                    const ringRadius = 2 * (i / rings);
                    const ringWidth = 0.05;
                    
                    const ringGeometry = new THREE.RingGeometry(
                        ringRadius - ringWidth / 2,
                        ringRadius + ringWidth / 2,
                        32
                    );
                    
                    const ringMaterial = new THREE.MeshBasicMaterial({
                        color: 0x333333,
                        side: THREE.DoubleSide
                    });
                    
                    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                    ringMesh.position.z = 0.16;
                    group.add(ringMesh);
                }
                
                // Add decorative corner accents
                const corners = [
                    { x: size + 0.5, y: 0, rotation: 0 },
                    { x: 0, y: size + 0.5, rotation: Math.PI / 2 },
                    { x: -(size + 0.5), y: 0, rotation: Math.PI },
                    { x: 0, y: -(size + 0.5), rotation: -Math.PI / 2 }
                ];
                
                corners.forEach(corner => {
                    const accentGeometry = new THREE.CircleGeometry(0.4, 3);
                    const accentMaterial = new THREE.MeshBasicMaterial({
                        color: colors.orange,
                        side: THREE.DoubleSide
                    });
                    
                    const accentMesh = new THREE.Mesh(accentGeometry, accentMaterial);
                    accentMesh.position.set(corner.x, corner.y, 0.1);
                    accentMesh.rotation.z = corner.rotation;
                    group.add(accentMesh);
                });
                
                return group;
            };
            
            // Create and add speakers
            const speaker = createSpeaker();
            scene.add(speaker);
            
            // Create particle emitter from the speaker center
            const createParticleSystem = () => {
                const particleCount = 200;
                
                // Create geometry
                const particlesGeometry = new THREE.BufferGeometry();
                
                // Arrays to store particle attributes
                const positions = new Float32Array(particleCount * 3);
                const velocities = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);
                const sizes = new Float32Array(particleCount);
                const lifetimes = new Float32Array(particleCount);
                const offsets = new Float32Array(particleCount);
                
                // Initialize particles
                for (let i = 0; i < particleCount; i++) {
                    // Initial positions at center
                    positions[i * 3] = 0;
                    positions[i * 3 + 1] = 0;
                    positions[i * 3 + 2] = 0.3;
                    
                    // Random velocity direction
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 0.05 + 0.02;
                    velocities[i * 3] = Math.cos(angle) * speed;
                    velocities[i * 3 + 1] = Math.sin(angle) * speed;
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
                    
                    // Random color
                    const colorChoice = Math.random();
                    if (colorChoice < 0.25) {
                        colors[i * 3] = 1;     // R (pink)
                        colors[i * 3 + 1] = 0; // G
                        colors[i * 3 + 2] = 1; // B
                    } else if (colorChoice < 0.5) {
                        colors[i * 3] = 0;     // R (blue)
                        colors[i * 3 + 1] = 0.6; // G
                        colors[i * 3 + 2] = 1; // B
                    } else if (colorChoice < 0.75) {
                        colors[i * 3] = 0;     // R (teal)
                        colors[i * 3 + 1] = 1; // G
                        colors[i * 3 + 2] = 0.8; // B
                    } else {
                        colors[i * 3] = 1;     // R (yellow)
                        colors[i * 3 + 1] = 1; // G
                        colors[i * 3 + 2] = 0; // B
                    }
                    
                    // Random size
                    sizes[i] = Math.random() * 0.2 + 0.05;
                    
                    // Random lifetime
                    lifetimes[i] = 0;
                    
                    // Random offset for staggered emission
                    offsets[i] = Math.random() * 100;
                }
                
                // Set geometry attributes
                particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                particlesGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
                particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
                
                // Create vertex shader
                const vertexShader = `
                    attribute vec3 customColor;
                    attribute float size;
                    varying vec3 vColor;
                    void main() {
                        vColor = customColor;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `;
                
                // Create fragment shader
                const fragmentShader = `
                    varying vec3 vColor;
                    void main() {
                        float r = distance(gl_PointCoord, vec2(0.5, 0.5));
                        if (r > 0.5) discard;
                        gl_FragColor = vec4(vColor, 1.0 - (r * 2.0));
                    }
                `;
                
                // Create shader material
                const shaderMaterial = new THREE.ShaderMaterial({
                    uniforms: {},
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader,
                    blending: THREE.AdditiveBlending,
                    depthTest: false,
                    transparent: true
                });
                
                // Create particle system
                const particleSystem = new THREE.Points(particlesGeometry, shaderMaterial);
                
                // Add extra properties for animation
                particleSystem.userData = {
                    velocities: velocities,
                    lifetimes: lifetimes,
                    maxLifetime: 100,
                    offsets: offsets,
                    tick: 0,
                    intensity: 1.0
                };
                
                return particleSystem;
            };
            
            const particles = createParticleSystem();
            scene.add(particles);
            
            // Add an ambient light
            const ambientLight = new THREE.AmbientLight(0x333333);
            scene.add(ambientLight);
            
            // Add directional lights for the 80's effect
            const createRetroLights = () => {
                const lights = [];
                
                // Pink light from top-left
                const pinkLight = new THREE.DirectionalLight(colors.pink, 1);
                pinkLight.position.set(-5, 5, 5);
                scene.add(pinkLight);
                lights.push(pinkLight);
                
                // Blue light from bottom-right
                const blueLight = new THREE.DirectionalLight(colors.blue, 1);
                blueLight.position.set(5, -5, 5);
                scene.add(blueLight);
                lights.push(blueLight);
                
                // Main front light
                const frontLight = new THREE.DirectionalLight(0xffffff, 1);
                frontLight.position.set(0, 0, 5);
                scene.add(frontLight);
                lights.push(frontLight);
                
                return lights;
            };
            
            const lights = createRetroLights();
            
            // Position camera
            camera.position.z = 10;
            
            // Mouse tracking
            const mouse = {
                x: 0,
                y: 0,
                speedX: 0,
                speedY: 0,
                prevX: 0,
                prevY: 0
            };
            
            document.addEventListener('mousemove', (event) => {
                // Store previous position
                mouse.prevX = mouse.x;
                mouse.prevY = mouse.y;
                
                // Update position
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                
                // Calculate speed
                mouse.speedX = mouse.x - mouse.prevX;
                mouse.speedY = mouse.y - mouse.prevY;
            });
            
            // Create the 80's sun/horizon effect in the background
            const createRetroBackground = () => {
                const geometry = new THREE.PlaneGeometry(40, 20);
                
                // Create gradient texture
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const context = canvas.getContext('2d');
                
                // Create gradient
                const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#000000');
                gradient.addColorStop(0.5, '#220033');
                gradient.addColorStop(0.8, '#440066');
                gradient.addColorStop(1, '#ff00aa');
                
                context.fillStyle = gradient;
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                // Create horizon line
                context.strokeStyle = '#00ffff';
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(0, canvas.height * 0.8);
                context.lineTo(canvas.width, canvas.height * 0.8);
                context.stroke();
                
                // Create sun
                const sunGradient = context.createRadialGradient(
                    canvas.width / 2, canvas.height * 0.8, 0,
                    canvas.width / 2, canvas.height * 0.8, canvas.width / 5
                );
                
                sunGradient.addColorStop(0, '#ff3366');
                sunGradient.addColorStop(0.5, '#ff0066');
                sunGradient.addColorStop(1, 'rgba(68, 0, 102, 0)');
                
                context.fillStyle = sunGradient;
                context.beginPath();
                context.arc(canvas.width / 2, canvas.height * 0.8, canvas.width / 5, 0, Math.PI * 2);
                context.fill();
                
                // Create material with the texture
                const texture = new THREE.CanvasTexture(canvas);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.8
                });
                
                const background = new THREE.Mesh(geometry, material);
                background.position.z = -20;
                background.position.y = -5;
                
                return background;
            };
            
            const retroBackground = createRetroBackground();
            scene.add(retroBackground);
            
            // Handle window resize
            window.addEventListener('resize', () => {
                // Update camera aspect ratio
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                
                // Update renderer size
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
            
            // Audio visualizer effect for speaker
            const createVisualizer = () => {
                const bars = 16;
                const visualizerGroup = new THREE.Group();
                
                for (let i = 0; i < bars; i++) {
                    const angle = (i / bars) * Math.PI * 2;
                    const radius = 3;
                    
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    const barGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.1);
                    const barMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.7
                    });
                    
                    const bar = new THREE.Mesh(barGeometry, barMaterial);
                    bar.position.set(x, y, 0.2);
                    bar.rotation.z = angle;
                    
                    visualizerGroup.add(bar);
                }
                
                return visualizerGroup;
            };
            
            const visualizer = createVisualizer();
            speaker.add(visualizer);
            
            // Animation variables
            let time = 0;
            
            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);
                
                time += 0.01;
                
                // Rotate speaker slightly based on mouse
                speaker.rotation.x = mouse.y * 0.3;
                speaker.rotation.y = mouse.x * 0.3;
                
                // Move speaker slightly with mouse
                speaker.position.x = mouse.x * 2;
                speaker.position.y = mouse.y * 1.5;
                
                // Calculate intensity based on mouse speed
                const mouseSpeed = Math.sqrt(mouse.speedX * mouse.speedX + mouse.speedY * mouse.speedY);
                const targetIntensity = 1 + mouseSpeed * 20;
                particles.userData.intensity += (targetIntensity - particles.userData.intensity) * 0.1;
                
                // Update particles
                const positions = particles.geometry.attributes.position.array;
                const sizes = particles.geometry.attributes.size.array;
                const velocities = particles.userData.velocities;
                const lifetimes = particles.userData.lifetimes;
                const offsets = particles.userData.offsets;
                const maxLifetime = particles.userData.maxLifetime;
                
                particles.userData.tick++;
                
                for (let i = 0; i < positions.length / 3; i++) {
                    // Update lifetime based on offset
                    if ((particles.userData.tick + offsets[i]) % maxLifetime === 0) {
                        // Reset particle
                        positions[i * 3] = 0;
                        positions[i * 3 + 1] = 0;
                        positions[i * 3 + 2] = 0.3;
                        
                        // Randomize velocity direction
                        const angle = Math.random() * Math.PI * 2;
                        const speed = (Math.random() * 0.05 + 0.02) * particles.userData.intensity;
                        velocities[i * 3] = Math.cos(angle) * speed;
                        velocities[i * 3 + 1] = Math.sin(angle) * speed;
                        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
                        
                        lifetimes[i] = 0;
                    } else {
                        // Update position based on velocity
                        positions[i * 3] += velocities[i * 3];
                        positions[i * 3 + 1] += velocities[i * 3 + 1];
                        positions[i * 3 + 2] += velocities[i * 3 + 2];
                        
                        // Slow down velocity over time
                        velocities[i * 3] *= 0.98;
                        velocities[i * 3 + 1] *= 0.98;
                        velocities[i * 3 + 2] *= 0.98;
                        
                        // Update lifetime
                        lifetimes[i]++;
                        
                        // Fade out based on lifetime
                        const lifeFactor = 1 - (lifetimes[i] / maxLifetime);
                        sizes[i] = (Math.random() * 0.2 + 0.05) * lifeFactor;
                    }
                }
                
                particles.geometry.attributes.position.needsUpdate = true;
                particles.geometry.attributes.size.needsUpdate = true;
                
                // Animate visualizer bars
                visualizer.children.forEach((bar, i) => {
                    const angle = (i / visualizer.children.length) * Math.PI * 2;
                    const sinValue = Math.sin(time * 3 + angle * 2) * 0.5 + 0.5;
                    bar.scale.y = 0.5 + sinValue * 1.5 * particles.userData.intensity;
                    
                    // Color based on intensity
                    const hue = (time * 0.1 + i / visualizer.children.length) % 1;
                    bar.material.color.setHSL(hue, 0.8, 0.5);
                });
                
                // Animate grid
                gridHelper.position.z = -15 + Math.sin(time) * 0.5;
                
                // Render the scene
                renderer.render(scene, camera);
            };
            
            // Start animation
            animate();
        };

        // Initialize background when DOM is loaded
        document.addEventListener('DOMContentLoaded', initSpeakerBackground);