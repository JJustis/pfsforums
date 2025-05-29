const initTornadoGalaxyBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Set deep space background color
    renderer.setClearColor(0x000205, 1);
    
    // Position camera looking down into the tornado from above
    camera.position.z = 100;
    camera.position.y = 20;
    camera.lookAt(0, 0, 0);
    
    // Star textures for different colors
    const starTextures = {
        blue: createStarTexture([100, 180, 255]),
        white: createStarTexture([255, 255, 255]),
        yellow: createStarTexture([255, 240, 180]), 
        orange: createStarTexture([255, 180, 120]),
        red: createStarTexture([255, 120, 100])
    };
    
    // Create tornado galaxy of stars
    const tornadoGalaxy = createTornadoGalaxy();
    scene.add(tornadoGalaxy);
    
    // Create background stars
    const backgroundStars = createBackgroundStars();
    scene.add(backgroundStars);
    
    // Create tornado eye glow at the center
    const tornadoEye = createTornadoEye();
    scene.add(tornadoEye);
    
    // Create dust particles swirling in the tornado
    const tornadoDust = createTornadoDust();
    scene.add(tornadoDust);
    
    // Function to create star texture
    function createStarTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        
        // Convert color array to strings
        const fullColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1.0)`;
        const midColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`;
        const transpColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.0)`;
        
        gradient.addColorStop(0, fullColor);
        gradient.addColorStop(0.4, midColor);
        gradient.addColorStop(1, transpColor);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        // Add a core glow
        const coreGradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 16);
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        
        ctx.fillStyle = coreGradient;
        ctx.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    // Create stars for tornado galaxy
    function createTornadoGalaxy() {
        const starsGroup = new THREE.Group();
        const starCount = 2500;
        const stars = [];
        
        for (let i = 0; i < starCount; i++) {
            // Determine star properties
            const star = createTornadoStar(i);
            starsGroup.add(star.mesh);
            stars.push(star);
        }
        
        starsGroup.userData = { stars };
        return starsGroup;
    }
    
    // Create a single tornado star
    function createTornadoStar(index) {
        // Determine star color based on vertical position in tornado
        const layerPosition = Math.random();
        let texture;
        
        // Color gradient from top to bottom of tornado
        if (layerPosition < 0.2) {
            texture = starTextures.blue; // Top layer - blue stars
        } else if (layerPosition < 0.4) {
            texture = starTextures.white; // Upper middle - white stars
        } else if (layerPosition < 0.7) {
            texture = starTextures.yellow; // Middle - yellow stars
        } else if (layerPosition < 0.9) {
            texture = starTextures.orange; // Lower middle - orange stars
        } else {
            texture = starTextures.red; // Bottom layers - red stars
        }
        
        // Create star plane
        const size = 0.5 + Math.random() * 1.5;
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const star = new THREE.Mesh(geometry, material);
        
        // Initialize star with position in tornado structure
        // Use golden ratio for even distribution around spiral
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const angleStep = 2 * Math.PI / goldenRatio;
        const angle = index * angleStep;
        
        // Spiral radius based on index - larger index = larger radius
        const normalizedIndex = index / 200;
        const spiralTightness = 0.1 + Math.random() * 0.1; // How tight the spiral is
        const spiralRadius = 5 + normalizedIndex * 70;
        
        // Vertical position (z) decreases as we move outward in spiral
        const verticalPosition = 20 - normalizedIndex * 40;
        
        star.position.x = Math.cos(angle) * spiralRadius;
        star.position.y = Math.sin(angle) * spiralRadius;
        star.position.z = verticalPosition;
        
        // Always face the camera
        star.lookAt(camera.position);
        
        // Orbital parameters - each star has unique values
        const orbitParams = {
            // Base orbital speed - inner stars orbit faster
            baseSpeed: 0.2 + (1 - normalizedIndex) * 0.4,
            
            // Eccentricity - how elliptical the orbit is
            eccentricity: Math.random() * 0.3,
            
            // Inclination - tilt of the orbit
            inclination: Math.random() * 0.2,
            
            // Precession - orbit rotation over time
            precession: (Math.random() - 0.5) * 0.01,
            
            // Vertical oscillation - bobbing up and down
            verticalAmplitude: Math.random() * 2,
            verticalFrequency: 0.2 + Math.random() * 0.3,
            
            // Unique phase for each star
            phase: Math.random() * Math.PI * 2
        };
        
        // Star data for animation
        const starData = {
            mesh: star,
            baseRadius: spiralRadius,
            baseAngle: angle,
            baseZ: verticalPosition,
            size: size,
            originalSize: size,
            orbitParams: orbitParams,
            // Occasionally stars will be pulled toward center
            gravitySusceptibility: Math.random() * 0.5,
            // Unique twinkling for each star
            twinkling: {
                speed: 0.5 + Math.random() * 1,
                phase: Math.random() * Math.PI * 2
            }
        };
        
        return starData;
    }
    
    // Create tornado eye glow at center
    function createTornadoEye() {
        const eyeGroup = new THREE.Group();
        
        // Main eye glow
        const eyeGeometry = new THREE.PlaneGeometry(15, 15);
        const eyeTexture = createEyeTexture();
        
        const eyeMaterial = new THREE.MeshBasicMaterial({
            map: eyeTexture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const eyeGlow = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eyeGlow.lookAt(camera.position);
        eyeGlow.position.z = -5;
        eyeGroup.add(eyeGlow);
        
        // Add some smaller glows for depth
        for (let i = 0; i < 5; i++) {
            const smallGlowSize = 3 + Math.random() * 6;
            const smallGlowGeometry = new THREE.PlaneGeometry(smallGlowSize, smallGlowSize);
            const smallGlowMaterial = new THREE.MeshBasicMaterial({
                map: eyeTexture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                opacity: 0.3 + Math.random() * 0.4
            });
            
            const smallGlow = new THREE.Mesh(smallGlowGeometry, smallGlowMaterial);
            smallGlow.position.x = (Math.random() - 0.5) * 5;
            smallGlow.position.y = (Math.random() - 0.5) * 5;
            smallGlow.position.z = -5 - Math.random() * 10;
            smallGlow.lookAt(camera.position);
            
            // Store rotation speed for animation
            smallGlow.userData = {
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                pulsateSpeed: 0.5 + Math.random(),
                pulsatePhase: Math.random() * Math.PI * 2
            };
            
            eyeGroup.add(smallGlow);
        }
        
        return eyeGroup;
    }
    
    // Create eye texture
    function createEyeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for tornado eye
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        
        // Dark center with bright edges
        gradient.addColorStop(0, 'rgba(40, 20, 60, 0.9)'); // Dark purple/blue center
        gradient.addColorStop(0.3, 'rgba(80, 50, 120, 0.8)');
        gradient.addColorStop(0.6, 'rgba(160, 100, 180, 0.6)');
        gradient.addColorStop(1, 'rgba(220, 180, 255, 0.0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // Add some swirl effects
        ctx.strokeStyle = 'rgba(200, 180, 255, 0.4)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 6; i++) {
            const radius = 20 + i * 20;
            ctx.beginPath();
            ctx.arc(128, 128, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    // Create dust particles for tornado
    function createTornadoDust() {
        const dustGeometry = new THREE.BufferGeometry();
        const dustCount = 1500;
        
        const positions = new Float32Array(dustCount * 3);
        const colors = new Float32Array(dustCount * 3);
        const sizes = new Float32Array(dustCount);
        const turbulence = new Float32Array(dustCount * 3); // For unique movement
        
        for (let i = 0; i < dustCount; i++) {
            // Position dust in tornado structure
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * Math.random() * 60;
            const height = 20 - Math.random() * 40;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.sin(angle) * radius;
            positions[i * 3 + 2] = height;
            
            // Dust color - based on height (z-position)
            const normalizedHeight = (height + 20) / 40; // 0 to 1
            
            if (normalizedHeight > 0.8) {
                // Top - blue
                colors[i * 3] = 0.4 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            } else if (normalizedHeight > 0.6) {
                // Upper middle - cyan/white
                colors[i * 3] = 0.6 + Math.random() * 0.3;
                colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            } else if (normalizedHeight > 0.4) {
                // Middle - white/yellow
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.6 + Math.random() * 0.3;
            } else if (normalizedHeight > 0.2) {
                // Lower middle - yellow/orange
                colors[i * 3] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.3 + Math.random() * 0.2;
            } else {
                // Bottom - orange/red
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.3 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.2 + Math.random() * 0.1;
            }
            
            // Dust sizes
            sizes[i] = 0.5 + Math.random() * 1.5;
            
            // Turbulence factors for animation
            turbulence[i * 3] = Math.random() * 2 - 1;     // x-factor
            turbulence[i * 3 + 1] = Math.random() * 2 - 1; // y-factor
            turbulence[i * 3 + 2] = Math.random() * 2 - 1; // z-factor
        }
        
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        dustGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        dustGeometry.setAttribute('turbulence', new THREE.BufferAttribute(turbulence, 3));
        
        const dustMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uPixelRatio;
                
                attribute vec3 color;
                attribute float size;
                attribute vec3 turbulence;
                
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    
                    // Calculate swirling tornado motion
                    float radius = length(position.xy);
                    float angle = atan(position.y, position.x);
                    
                    // Base rotation speed decreases with radius (faster in center)
                    float rotationSpeed = 0.3 + (1.0 / (radius * 0.1 + 1.0)) * 0.7;
                    
                    // Apply rotation
                    angle += uTime * rotationSpeed;
                    
                    // Add turbulence
                    radius += sin(uTime * turbulence.x + position.z * 0.1) * (0.2 + turbulence.y * 0.3);
                    
                    // Calculate new position
                    vec3 newPosition = vec3(
                        cos(angle) * radius,
                        sin(angle) * radius,
                        position.z + sin(uTime * turbulence.z + radius * 0.2) * 0.5
                    );
                    
                    // Apply gravity effect - slowly pull toward center
                    if (radius > 5.0) {
                        float gravity = 0.02 * (1.0 - 5.0 / radius);
                        newPosition.xy *= (1.0 - gravity);
                    }
                    
                    // Vertical movement - slowly descend
                    newPosition.z -= 0.1 * uTime;
                    
                    // Reset particles that go too low
                    if (newPosition.z < -20.0) {
                        newPosition.z += 40.0;
                    }
                    
                    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                    gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Circular dust particles with soft edges
                    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
                    if (distanceToCenter > 0.5) discard;
                    
                    // Soft glow effect
                    float glow = 0.5 - distanceToCenter;
                    vec3 finalColor = vColor * glow * 2.0;
                    
                    gl_FragColor = vec4(finalColor, 0.7);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
            transparent: true
        });
        
        return new THREE.Points(dustGeometry, dustMaterial);
    }
    
    // Create background stars
    function createBackgroundStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 1500;
        
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        
        for (let i = 0; i < starsCount; i++) {
            // Star positions in a large dome above and around the scene
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random()) * 0.5; // Only top hemisphere
            const radius = 200 + Math.random() * 800;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Star colors
            const colorType = Math.random();
            if (colorType < 0.2) {
                // Blue
                colors[i * 3] = 0.7;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 1.0;
            } else if (colorType < 0.5) {
                // White
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 1.0;
            } else if (colorType < 0.8) {
                // Yellow
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.9;
                colors[i * 3 + 2] = 0.7;
            } else {
                // Red
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.5;
                colors[i * 3 + 2] = 0.5;
            }
            
            // Star sizes
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uPixelRatio;
                
                attribute vec3 color;
                attribute float size;
                
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    
                    // Twinkling effect
                    float twinkle = sin(uTime * 0.5 + position.x * 10.0) * 0.5 + 0.5;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * uPixelRatio * (0.5 + twinkle * 0.5);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Circular star shape
                    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
                    if (distanceToCenter > 0.5) discard;
                    
                    // Soft glow effect
                    float glow = 0.5 - distanceToCenter;
                    vec3 finalColor = vColor * glow * 2.0;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
            transparent: true
        });
        
        return new THREE.Points(starsGeometry, starsMaterial);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update pixel ratio for stars
        backgroundStars.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
        tornadoDust.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    });
    
    // Add mouse interactivity
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        targetMouseX = (event.clientX / window.innerWidth - 0.5) * 30;
        targetMouseY = (event.clientY / window.innerHeight - 0.5) * 30;
    });
    
    // Animation loop
    const clock = new THREE.Clock();
    let lastTime = 0;
    
    const animate = () => {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();
        const deltaTime = elapsedTime - lastTime;
        lastTime = elapsedTime;
        
        // Smooth mouse movement
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;
        
        // Update camera position based on mouse
        const cameraY = 20 + mouseY * 0.2;
        const cameraX = mouseX * 0.3;
        
        camera.position.x = cameraX;
        camera.position.y = cameraY;
        camera.lookAt(0, 0, -10); // Look slightly below center for tornado effect
        
        // Update background stars
        backgroundStars.material.uniforms.uTime.value = elapsedTime;
        
        // Update tornado dust
        tornadoDust.material.uniforms.uTime.value = elapsedTime;
        
        // Update tornado eye elements
        tornadoEye.children.forEach((child, index) => {
            if (index === 0) {
                // Main eye - subtle pulsing
                const scale = 1 + Math.sin(elapsedTime * 0.5) * 0.1;
                child.scale.set(scale, scale, scale);
            } else {
                // Smaller glows - rotation and pulsing
                child.rotation.z += child.userData.rotationSpeed;
                const scale = 1 + Math.sin(elapsedTime * child.userData.pulsateSpeed + child.userData.pulsatePhase) * 0.2;
                child.scale.set(scale, scale, scale);
            }
            
            // Keep eye elements facing camera
            child.lookAt(camera.position);
        });
        
        // Update galaxy stars
        const stars = tornadoGalaxy.userData.stars;
        
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const starMesh = star.mesh;
            const params = star.orbitParams;
            
            // Always make stars face the camera
            starMesh.lookAt(camera.position);
            
            // Calculate orbital position with gravity effects
            
            // Base rotation - inner stars rotate faster
            const angularSpeed = params.baseSpeed;
            
            // Current angle with precession
            const currentAngle = star.baseAngle + elapsedTime * angularSpeed + 
                                Math.sin(elapsedTime * 0.1) * params.precession;
            
            // Apply eccentricity to create elliptical orbits
            const radiusFactor = 1 + params.eccentricity * Math.sin(currentAngle * 2 + params.phase);
            let radius = star.baseRadius * radiusFactor;
            
            // Apply gravity - occasional pull toward center
            if (Math.random() < 0.01 * star.gravitySusceptibility) {
                radius = Math.max(5, radius * 0.98);
            }
            
            // Calculate position
            starMesh.position.x = Math.cos(currentAngle) * radius;
            starMesh.position.y = Math.sin(currentAngle) * radius;
            
            // Vertical position with oscillation for tornado effect
            const baseZ = star.baseZ;
            const oscillation = Math.sin(elapsedTime * params.verticalFrequency + currentAngle) * params.verticalAmplitude;
            starMesh.position.z = baseZ + oscillation;
            
            // Twinkling effect
            const twinkle = Math.sin(elapsedTime * star.twinkling.speed + star.twinkling.phase) * 0.3 + 0.7;
            starMesh.scale.set(twinkle, twinkle, twinkle);
        }
        
        // Render the scene
        renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
};

// Initialize Tornado Galaxy Background when DOM is loaded
document.addEventListener('DOMContentLoaded', initTornadoGalaxyBackground);
