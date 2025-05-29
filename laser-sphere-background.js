// Laser Sphere Background with Interactive Controls
const initLaserSphereBackground = () => {
    try {
        // Make sure THREE is available
        if (typeof THREE === 'undefined') {
            console.error('THREE.js is not loaded. Please include the Three.js library.');
            return;
        }
        
        // Get or create the canvas element
        let canvas = document.getElementById('bg-canvas');
        if (!canvas) {
            console.log('Creating canvas element for background');
            canvas = document.createElement('canvas');
            canvas.id = 'bg-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '-1';
            canvas.style.pointerEvents = 'none';
            document.body.appendChild(canvas);
        }
        
        // Create renderer
        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000814);
        
        // Add subtle fog for depth
        scene.fog = new THREE.FogExp2(0x000814, 0.015);
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 30;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
        scene.add(ambientLight);
        
        // Central point light
        const centerLight = new THREE.PointLight(0x3366ff, 1, 100);
        centerLight.position.set(0, 0, 0);
        scene.add(centerLight);
        
        // Secondary lights
        const coloredLights = [];
        const lightColors = [
            0xff3366, // Pink
            0x33ff99, // Green
            0xff9933, // Orange
            0x9933ff  // Purple
        ];
        
        for (let i = 0; i < lightColors.length; i++) {
            const light = new THREE.PointLight(lightColors[i], 1, 30);
            const angle = (i / lightColors.length) * Math.PI * 2;
            light.position.set(
                Math.cos(angle) * 15,
                Math.sin(angle) * 15,
                0
            );
            scene.add(light);
            coloredLights.push({
                light,
                angle,
                distance: 15,
                speed: 0.5 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
        
        // Create the laser sphere structure
        const laserGroup = new THREE.Group();
        scene.add(laserGroup);
        
        // Settings for laser structure
        const settings = {
            sphereRadius: 12,
            laserCount: 60,
            laserLength: 25,
            laserWidth: 0.15,
            laserColors: [
                0xff0066, // Pink
                0x00ffff, // Cyan
                0xff9900, // Orange
                0x33ff66, // Lime
                0xff00ff, // Magenta
                0xffff00  // Yellow
            ]
        };
        
        // Function to create a single laser beam
        function createLaser(origin, direction, length, color) {
            // Create laser geometry
            const geometry = new THREE.CylinderGeometry(
                settings.laserWidth,
                settings.laserWidth,
                length,
                8,
                1,
                true
            );
            
            // Create glowing material
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.7,
                shininess: 100,
                specular: 0xffffff
            });
            
            // Create mesh
            const laser = new THREE.Mesh(geometry, material);
            
            // Position at origin
            laser.position.copy(origin);
            
            // Orient along direction
            laser.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0), // Default cylinder orientation is along Y
                direction.normalize()
            );
            
            // Move cylinder half its length along its axis to align start with origin
            laser.translateOnAxis(new THREE.Vector3(0, 1, 0), length / 2);
            
            return laser;
        }
        
        // Generate points evenly distributed on a sphere (Fibonacci sphere)
        function generateSpherePoints(count, radius) {
            const points = [];
            const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
            
            for (let i = 0; i < count; i++) {
                const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
                const radius_at_y = Math.sqrt(1 - y * y); // Radius at y
                
                const theta = phi * i; // Golden angle increment
                
                const x = Math.cos(theta) * radius_at_y;
                const z = Math.sin(theta) * radius_at_y;
                
                points.push(new THREE.Vector3(x, y, z).multiplyScalar(radius));
            }
            
            return points;
        }
        
        // Generate laser beams radiating from sphere
        function generateLasers() {
            // Clear existing lasers
            while (laserGroup.children.length > 0) {
                laserGroup.remove(laserGroup.children[0]);
            }
            
            // Generate points on the sphere
            const points = generateSpherePoints(settings.laserCount, settings.sphereRadius);
            
            // Create lasers
            for (let i = 0; i < points.length; i++) {
                const origin = points[i].clone();
                const direction = origin.clone().normalize();
                
                // Choose color
                const color = settings.laserColors[i % settings.laserColors.length];
                
                // Create laser
                const laser = createLaser(
                    origin,
                    direction,
                    settings.laserLength,
                    color
                );
                
                // Add to laser group
                laserGroup.add(laser);
                
                // Add reference to original direction for animation
                laser.userData = {
                    originalDirection: direction.clone(),
                    originalPosition: origin.clone(),
                    pulseFactor: 0.5 + Math.random() * 0.5,
                    pulsePhase: Math.random() * Math.PI * 2
                };
            }
        }
        
        // Generate initial lasers
        generateLasers();
        
        // Create particle system for sparkles
        const particleCount = 500;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        const particleColors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position on a larger sphere
            const radius = settings.sphereRadius * (1 + Math.random() * 2);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[i3 + 2] = radius * Math.cos(phi);
            
            // Random size
            particleSizes[i] = 0.2 + Math.random() * 0.8;
            
            // Random color from laser colors
            const color = new THREE.Color(settings.laserColors[Math.floor(Math.random() * settings.laserColors.length)]);
            particleColors[i3] = color.r;
            particleColors[i3 + 1] = color.g;
            particleColors[i3 + 2] = color.b;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        // Create sparkle texture
        function createSparkleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            
            const context = canvas.getContext('2d');
            const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            context.fillStyle = gradient;
            context.fillRect(0, 0, 64, 64);
            
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }
        
        // Create particle material with custom shader
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pointTexture: { value: createSparkleTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                uniform float time;
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    
                    // Add subtle movement
                    vec3 pos = position;
                    pos.x += sin(time * 0.5 + position.z * 0.1) * 0.5;
                    pos.y += cos(time * 0.4 + position.x * 0.1) * 0.5;
                    pos.z += sin(time * 0.3 + position.y * 0.1) * 0.5;
                    
                    // Scale size based on distance and time
                    float scaledSize = size * (0.8 + 0.2 * sin(time * 2.0 + position.x + position.y + position.z));
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = scaledSize * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                uniform float time;
                varying vec3 vColor;
                
                void main() {
                    // Get base texture
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    
                    // Add pulsing brightness
                    vec3 color = vColor * (0.8 + 0.2 * sin(time * 1.5 + gl_FragCoord.x * 0.01 + gl_FragCoord.y * 0.01));
                    
                    gl_FragColor = vec4(color, texColor.a);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        // Create particles mesh
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        
        // Add a central glowing core
        const coreGeometry = new THREE.SphereGeometry(2, 32, 32);
        const coreMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0x3366ff,
            transparent: true,
            opacity: 0.7,
            shininess: 100,
            specular: 0xffffff
        });
        
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        scene.add(core);
        
        // Track mouse and touch input
        const input = {
            mouseX: 0,
            mouseY: 0,
            targetMouseX: 0,
            targetMouseY: 0,
            zoom: 1.0,
            targetZoom: 1.0,
            rotationSpeed: 0.5,
            autoRotate: true
        };
        
        function updateInputFromMouse(event) {
            // Get normalized device coordinates (-1 to +1)
            input.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
            input.targetMouseY = -((event.clientY / window.innerHeight) * 2 - 1);
            
            // Update zoom based on mouse distance from center
            const distanceFromCenter = Math.sqrt(
                input.targetMouseX * input.targetMouseX + 
                input.targetMouseY * input.targetMouseY
            );
            
            // Map distance to zoom (closer to edge = closer zoom)
            input.targetZoom = 1.0 + distanceFromCenter * 0.5;
        }
        
        function handleWheel(event) {
            // Prevent default scrolling
            event.preventDefault();
            
            // Adjust zoom by wheel delta
            const zoomDelta = event.deltaY * 0.001;
            input.targetZoom = Math.max(0.5, Math.min(2.0, input.targetZoom + zoomDelta));
        }
        
        // Mouse event listeners
        document.addEventListener('mousemove', updateInputFromMouse);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        
        // Touch event listeners for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        let lastTouchDistance = 0;
        
        function handleTouchStart(event) {
            if (event.touches.length === 1) {
                touchStartX = event.touches[0].clientX;
                touchStartY = event.touches[0].clientY;
            } else if (event.touches.length === 2) {
                // Calculate initial pinch distance for zoom
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
            }
        }
        
        function handleTouchMove(event) {
            event.preventDefault();
            
            if (event.touches.length === 1) {
                // Single touch = rotate
                const touchX = event.touches[0].clientX;
                const touchY = event.touches[0].clientY;
                
                // Calculate normalized coordinates
                input.targetMouseX = (touchX / window.innerWidth) * 2 - 1;
                input.targetMouseY = -((touchY / window.innerHeight) * 2 - 1);
                
                // Disable auto-rotation when manually rotating
                input.autoRotate = false;
            } else if (event.touches.length === 2) {
                // Two touches = zoom
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                
                // Calculate current distance
                const currentTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                // Calculate zoom change
                const touchDelta = currentTouchDistance - lastTouchDistance;
                input.targetZoom = Math.max(0.5, Math.min(2.0, input.targetZoom + touchDelta * 0.005));
                
                // Update last distance
                lastTouchDistance = currentTouchDistance;
            }
        }
        
        function handleTouchEnd(event) {
            if (event.touches.length === 0) {
                // Re-enable auto-rotation when touch ends
                setTimeout(() => {
                    input.autoRotate = true;
                }, 3000); // Delay before auto-rotation resumes
            }
        }
        
        // Add touch events
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Update camera
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            
            // Update renderer
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Animation variables
        let rotationX = 0;
        let rotationY = 0;
        let targetRotationX = 0;
        let targetRotationY = 0;
        
        // Animation loop
        const clock = new THREE.Clock();
        
        function animate() {
            const elapsedTime = clock.getElapsedTime();
            const deltaTime = clock.getDelta();
            
            // Smooth input values
            input.mouseX += (input.targetMouseX - input.mouseX) * 5 * deltaTime;
            input.mouseY += (input.targetMouseY - input.mouseY) * 5 * deltaTime;
            input.zoom += (input.targetZoom - input.zoom) * 3 * deltaTime;
            
            // Update rotation based on mouse position if auto-rotate is off
            if (input.autoRotate) {
                // Auto rotation
                rotationY += input.rotationSpeed * deltaTime;
                targetRotationX = Math.sin(elapsedTime * 0.5) * 0.3;
            } else {
                // Manual rotation based on mouse
                targetRotationY = input.mouseX * Math.PI;
                targetRotationX = input.mouseY * Math.PI * 0.5;
            }
            
            // Smooth rotation
            rotationX += (targetRotationX - rotationX) * 2 * deltaTime;
            rotationY += (targetRotationY - rotationY) * 2 * deltaTime;
            
            // Apply rotation to the laser group
            laserGroup.rotation.set(rotationX, rotationY, 0);
            
            // Apply zoom to camera
            camera.position.z = 30 / input.zoom;
            
            // Update colored lights
            for (let i = 0; i < coloredLights.length; i++) {
                const lightData = coloredLights[i];
                const currentAngle = lightData.angle + elapsedTime * lightData.speed;
                
                lightData.light.position.x = Math.cos(currentAngle) * lightData.distance;
                lightData.light.position.y = Math.sin(currentAngle) * lightData.distance;
                
                // Pulse light intensity
                lightData.light.intensity = 1 + 0.5 * Math.sin(elapsedTime * 2 + lightData.phase);
            }
            
            // Pulse the central light
            centerLight.intensity = 1.5 + Math.sin(elapsedTime * 3) * 0.5;
            
            // Update core animation
            core.scale.set(
                1 + 0.1 * Math.sin(elapsedTime * 2),
                1 + 0.1 * Math.sin(elapsedTime * 2.5),
                1 + 0.1 * Math.sin(elapsedTime * 2.2)
            );
            
            // Update core color
            const hue = (elapsedTime * 0.05) % 1;
            core.material.emissive.setHSL(hue, 1, 0.5);
            centerLight.color.setHSL(hue, 1, 0.5);
            
            // Update lasers
            for (let i = 0; i < laserGroup.children.length; i++) {
                const laser = laserGroup.children[i];
                
                // Pulse laser thickness
                const pulse = 1 + 0.2 * Math.sin(
                    elapsedTime * 3 * laser.userData.pulseFactor + 
                    laser.userData.pulsePhase
                );
                
                laser.scale.x = pulse;
                laser.scale.z = pulse;
                
                // Pulse laser brightness
                laser.material.emissiveIntensity = 0.3 + 0.3 * Math.sin(
                    elapsedTime * 2 * laser.userData.pulseFactor + 
                    laser.userData.pulsePhase
                );
            }
            
            // Update particles
            if (particleMaterial.uniforms) {
                particleMaterial.uniforms.time.value = elapsedTime;
            }
            
            // Rotate particles slightly
            particles.rotation.y = elapsedTime * 0.05;
            particles.rotation.z = elapsedTime * 0.03;
            
            // Render the scene
            renderer.render(scene, camera);
            
            // Continue animation
            requestAnimationFrame(animate);
        }
        
        // Start animation
        animate();
        
        console.log('Laser Sphere background initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Laser Sphere background:', error);
    }
};

// Add CSS to make content readable over the background
const addBackgroundCSS = () => {
    try {
        // Create a style element if it doesn't exist
        let style = document.getElementById('background-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'background-styles';
            document.head.appendChild(style);
            
            // Add CSS rules
            style.textContent = `
                body {
                    background-color: #000814 !important;
                    position: relative;
                    z-index: 1;
                    color: #fff;
                }
                
                main, article, section, .content, .container {
                    position: relative;
                    z-index: 1;
                    background-color: rgba(0, 8, 20, 0.7);
                    padding: 20px;
                    border-radius: 5px;
                    color: #fff;
                }
                
                h1, h2, h3, h4, h5, h6 {
                    color: #ffffff;
                    text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
                }
                
                a {
                    color: #00ccff;
                    text-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
                }
                
                /* Style adjustments for text contrast */
                p, li, span, div {
                    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                }
            `;
        }
    } catch (error) {
        console.error('Error adding background CSS:', error);
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Laser Sphere background');
    addBackgroundCSS();
    
    // Wait a little bit to ensure Three.js is loaded
    setTimeout(() => {
        initLaserSphereBackground();
    }, 100);
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, initializing Laser Sphere background');
    setTimeout(() => {
        addBackgroundCSS();
        initLaserSphereBackground();
    }, 100);
}