const initDreamwavesBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    
    // Create a wavy plane geometry
    const planeGeometry = new THREE.PlaneGeometry(40, 40, 100, 100);
    
    // Create vertex displacement for initial wave pattern
    const initialPositions = planeGeometry.attributes.position.array;
    const waves = new Float32Array(initialPositions.length);
    
    for (let i = 0; i < initialPositions.length; i += 3) {
        const x = initialPositions[i];
        const y = initialPositions[i + 1];
        
        // Store original positions for animation
        waves[i] = x;
        waves[i + 1] = y;
        waves[i + 2] = 0;
    }
    
    // Create a custom shader material for the waves
    const waveMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMouseX: { value: 0 },
            uMouseY: { value: 0 },
            uColorA: { value: new THREE.Color(0x2c3e50) },
            uColorB: { value: new THREE.Color(0x4ca1af) }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uMouseX;
            uniform float uMouseY;
            
            varying vec2 vUv;
            varying float vElevation;
            
            float createWave(float x, float z, float time, float frequency, float amplitude) {
                return sin(x * frequency + time) * sin(z * frequency + time) * amplitude;
            }
            
            void main() {
                vUv = uv;
                
                // Create multiple wave patterns
                float wave1 = createWave(position.x, position.y, uTime * 0.5, 0.2, 0.5);
                float wave2 = createWave(position.x, position.y, uTime * 0.3, 0.5, 0.2);
                float wave3 = createWave(position.x, position.y, uTime * 0.8, 0.1, 0.3);
                
                // Mouse influence (subtle)
                float distanceToMouse = distance(vec2(position.x, position.y), vec2(uMouseX, uMouseY));
                float mouseWave = sin(distanceToMouse * 2.0 - uTime * 3.0) * 0.1 / (distanceToMouse * 0.5 + 0.5);
                
                // Total elevation
                float elevation = wave1 + wave2 + wave3 + mouseWave;
                vElevation = elevation;
                
                // Apply to z position
                vec3 newPosition = position;
                newPosition.z += elevation;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uTime;
            
            varying vec2 vUv;
            varying float vElevation;
            
            void main() {
                // Gradient based on elevation and position
                float mixStrength = (vElevation + 1.0) * 0.5 * sin(vUv.x + uTime * 0.05) * cos(vUv.y + uTime * 0.05);
                vec3 color = mix(uColorA, uColorB, mixStrength + 0.5);
                
                // Add subtle shimmer effect
                float shimmer = sin(vUv.x * 100.0 + uTime) * sin(vUv.y * 100.0 + uTime) * 0.05;
                color += shimmer;
                
                gl_FragColor = vec4(color, 0.8); // Slightly transparent
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create mesh and add to scene
    const wavePlane = new THREE.Mesh(planeGeometry, waveMaterial);
    wavePlane.rotation.x = -Math.PI / 3; // Tilt the plane
    scene.add(wavePlane);
    
    // Create floating particles
    const particlesCount = 400;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesPositions = new Float32Array(particlesCount * 3);
    const particlesSizes = new Float32Array(particlesCount);
    const particlesColors = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount; i++) {
        // Random positions in a volume above the wave plane
        particlesPositions[i * 3] = (Math.random() - 0.5) * 50;
        particlesPositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        particlesPositions[i * 3 + 2] = Math.random() * 20 - 5;
        
        // Random sizes
        particlesSizes[i] = Math.random() * 0.5 + 0.1;
        
        // Colors - blue/teal/purple theme with variations
        particlesColors[i * 3] = Math.random() * 0.2 + 0.1; // R
        particlesColors[i * 3 + 1] = Math.random() * 0.5 + 0.3; // G
        particlesColors[i * 3 + 2] = Math.random() * 0.5 + 0.5; // B
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particlesSizes, 1));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particlesColors, 3));
    
    // Particles shader material
    const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uPixelRatio;
            
            attribute float size;
            attribute vec3 color;
            
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                
                // Animate position slightly
                vec3 animatedPosition = position;
                animatedPosition.x += sin(uTime * 0.2 + position.z * 5.0) * 0.5;
                animatedPosition.y += cos(uTime * 0.2 + position.x * 5.0) * 0.5;
                animatedPosition.z += sin(uTime * 0.3 + position.y * 5.0) * 0.3;
                
                vec4 mvPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
                
                gl_PointSize = size * 150.0 * uPixelRatio / -mvPosition.z;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                // Create circular particles with smooth edges
                float distanceToCenter = length(gl_PointCoord - vec2(0.5));
                if (distanceToCenter > 0.5) discard;
                
                // Apply soft edge
                float strength = 0.5 - distanceToCenter;
                
                // Final color with smooth edge
                gl_FragColor = vec4(vColor, strength * 2.0);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    // Create particles system
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Position camera
    camera.position.z = 15;
    
    // Track mouse movement
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates
        targetMouseX = (event.clientX / window.innerWidth - 0.5) * 20;
        targetMouseY = -(event.clientY / window.innerHeight - 0.5) * 20;
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update pixel ratio in shader
        particlesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    });
    
    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();
        
        // Smooth mouse movement
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;
        
        // Update wave material uniforms
        waveMaterial.uniforms.uTime.value = elapsedTime;
        waveMaterial.uniforms.uMouseX.value = mouseX;
        waveMaterial.uniforms.uMouseY.value = mouseY;
        
        // Update particles material uniforms
        particlesMaterial.uniforms.uTime.value = elapsedTime;
        
        // Rotate scene slightly for added dimension
        scene.rotation.y = Math.sin(elapsedTime * 0.1) * 0.1;
        
        // Adjust camera position based on mouse
        camera.position.x = mouseX * 0.05;
        camera.position.y = mouseY * 0.05;
        camera.lookAt(0, 0, 0);
        
        // Animate colors
        const hue = elapsedTime * 0.05 % 1;
        const colorA = new THREE.Color().setHSL(hue, 0.6, 0.2);
        const colorB = new THREE.Color().setHSL((hue + 0.15) % 1, 0.7, 0.3);
        
        waveMaterial.uniforms.uColorA.value = colorA;
        waveMaterial.uniforms.uColorB.value = colorB;
        
        // Render the scene
        renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
};

// Initialize Dreamwaves background when DOM is loaded
document.addEventListener('DOMContentLoaded', initDreamwavesBackground);
