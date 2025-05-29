const initDotMatrixBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Set the background color - deep blue
    renderer.setClearColor(new THREE.Color('#050520'), 1);
    
    // Create dot matrix points
    const dotMatrixGeometry = new THREE.BufferGeometry();
    
    // Grid dimensions - increased for better coverage
    const gridX = 220;
    const gridY = 220;
    const spacing = 0.65; // Reduced spacing for more density
    
    // Arrays to store positions and other attributes
    const positions = new Float32Array(gridX * gridY * 3);
    const initialPositions = new Float32Array(gridX * gridY * 3);
    const dotSizes = new Float32Array(gridX * gridY);
    const dotColors = new Float32Array(gridX * gridY * 3);
    
    // Create the dot matrix grid
    let index = 0;
    for (let y = 0; y < gridY; y++) {
        for (let x = 0; x < gridX; x++) {
            // Calculate grid position
            const posX = (x - gridX / 2) * spacing;
            const posY = (y - gridY / 2) * spacing;
            const posZ = 0;
            
            // Store positions
            positions[index * 3] = posX;
            positions[index * 3 + 1] = posY;
            positions[index * 3 + 2] = posZ;
            
            // Store initial positions for animations
            initialPositions[index * 3] = posX;
            initialPositions[index * 3 + 1] = posY;
            initialPositions[index * 3 + 2] = posZ;
            
            // Dot sizes
            dotSizes[index] = 0.15 + Math.random() * 0.08;
            
            // Dot colors - gradient from purple to blue
            const gradientFactor = y / gridY;
            dotColors[index * 3] = 0.2 + gradientFactor * 0.2; // R
            dotColors[index * 3 + 1] = 0.1 + gradientFactor * 0.2; // G
            dotColors[index * 3 + 2] = 0.5 + gradientFactor * 0.3; // B
            
            index++;
        }
    }
    
    // Add attributes to geometry
    dotMatrixGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dotMatrixGeometry.setAttribute('initialPosition', new THREE.BufferAttribute(initialPositions, 3));
    dotMatrixGeometry.setAttribute('size', new THREE.BufferAttribute(dotSizes, 1));
    dotMatrixGeometry.setAttribute('color', new THREE.BufferAttribute(dotColors, 3));
    
    // Create shader material for the dot matrix
    const dotMatrixMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
        },
        vertexShader: `
            uniform float uTime;
            uniform vec2 uMouse;
            uniform float uPixelRatio;
            
            attribute vec3 initialPosition;
            attribute float size;
            attribute vec3 color;
            
            varying vec3 vColor;
            varying float vDistortion;
            
            // Wave patterns
            float wave1(vec2 pos) {
                return sin(pos.x * 0.3 + uTime * 0.5) * cos(pos.y * 0.2 + uTime * 0.4) * 1.5;
            }
            
            float wave2(vec2 pos) {
                return sin(pos.x * 0.2 - uTime * 0.3) * sin(pos.y * 0.3 - uTime * 0.2) * 1.2;
            }
            
            // Torsion patterns
            vec2 torsion1(vec2 pos, float strength) {
                float angle = length(pos) * 0.1 + uTime * 0.2;
                float c = cos(angle) * strength;
                float s = sin(angle) * strength;
                
                return vec2(
                    pos.x * c - pos.y * s,
                    pos.x * s + pos.y * c
                );
            }
            
            vec2 torsion2(vec2 pos, float strength) {
                float dist = length(pos);
                float angle = dist * sin(uTime * 0.3) * strength;
                float c = cos(angle);
                float s = sin(angle);
                
                return vec2(
                    pos.x * c - pos.y * s,
                    pos.x * s + pos.y * c
                );
            }
            
            void main() {
                vColor = color;
                
                // Starting position
                vec3 newPosition = initialPosition;
                
                // Apply first wave and torsion
                vec2 torsionPos1 = torsion1(initialPosition.xy, 0.3);
                float wave1height = wave1(torsionPos1);
                
                // Apply second wave and torsion
                vec2 torsionPos2 = torsion2(initialPosition.xy, 0.2);
                float wave2height = wave2(torsionPos2);
                
                // Mix-torsioning effect - blend different wave and torsion patterns
                float blendFactor = sin(uTime * 0.2) * 0.5 + 0.5;
                vec2 mixedPos = mix(torsionPos1, torsionPos2, blendFactor);
                
                // Final position combines waves and torsions
                newPosition.z = mix(wave1height, wave2height, blendFactor);
                newPosition.xy = mix(initialPosition.xy, mixedPos, 0.7);
                
                // Mouse interaction
                float mouseDist = length(newPosition.xy - uMouse);
                float mouseEffect = 1.0 / (1.0 + mouseDist * 0.5);
                newPosition.z += mouseEffect * sin(uTime * 4.0 + mouseDist * 3.0) * 1.5;
                
                // Store distortion value for fragment shader
                vDistortion = abs(newPosition.z) * 0.2;
                
                // Calculate final position
                vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                
                // Set point size based on distortion and device pixel ratio
                gl_PointSize = (size + vDistortion * 2.0) * uPixelRatio * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vDistortion;
            
            void main() {
                // Create circular dots with soft edges
                float distToCenter = length(gl_PointCoord - vec2(0.5));
                if (distToCenter > 0.5) discard;
                
                // Make dots glow based on distortion
                vec3 finalColor = vColor + vec3(vDistortion * 0.8);
                
                // Add a soft glow based on distance from center
                float glow = 0.5 - distToCenter;
                gl_FragColor = vec4(finalColor, glow * 1.5);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    // Create the point cloud
    const dotMatrix = new THREE.Points(dotMatrixGeometry, dotMatrixMaterial);
    dotMatrix.rotation.x = -Math.PI / 3.5; // Adjusted tilt for better screen coverage
    scene.add(dotMatrix);
    
    // Create secondary particle system for ambient floating particles
    const particlesCount = 200;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesPositions = new Float32Array(particlesCount * 3);
    const particlesSizes = new Float32Array(particlesCount);
    
    for (let i = 0; i < particlesCount; i++) {
        // Position particles in a wider volume to match the larger matrix
        particlesPositions[i * 3] = (Math.random() - 0.5) * 150;
        particlesPositions[i * 3 + 1] = (Math.random() - 0.5) * 150;
        particlesPositions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 20;
        
        // Various particle sizes
        particlesSizes[i] = Math.random() * 0.5 + 0.15;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particlesSizes, 1));
    
    // Create texture for particles
    const particleTexture = new THREE.CanvasTexture(generateParticleTexture());
    
    function generateParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Create a circular gradient
        const gradient = context.createRadialGradient(
            32, 32, 0,
            32, 32, 32
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(150, 180, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(80, 100, 200, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        return canvas;
    }
    
    // Material for ambient particles
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.5,
        map: particleTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    // Create the particles system
    const particlesSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesSystem);
    
    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 50;
    camera.position.y = 25;
    camera.fov = 75; // Wider field of view
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
    
    // Track mouse movement
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        // Convert mouse position to normalized device coordinates
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the shader uniform - expanded range to match larger grid
        dotMatrixMaterial.uniforms.uMouse.value.x = mouseX * 60; 
        dotMatrixMaterial.uniforms.uMouse.value.y = mouseY * 60;
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update pixel ratio uniform
        dotMatrixMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    });
    
    // Animation variables
    const clock = new THREE.Clock();
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();
        
        // Update dot matrix shader time
        dotMatrixMaterial.uniforms.uTime.value = elapsedTime;
        
        // Rotate the entire dot matrix for additional movement
        dotMatrix.rotation.z = Math.sin(elapsedTime * 0.05) * 0.05;
        
        // Animate ambient particles
        const positions = particlesGeometry.attributes.position.array;
        for (let i = 0; i < particlesCount; i++) {
            const i3 = i * 3;
            // Gentle floating motion
            positions[i3 + 1] += Math.sin(elapsedTime * 0.2 + i * 0.1) * 0.02;
            positions[i3] += Math.cos(elapsedTime * 0.2 + i * 0.1) * 0.02;
            
            // Reset particles that drift too far
            if (Math.abs(positions[i3]) > 50 || Math.abs(positions[i3 + 1]) > 50) {
                positions[i3] = (Math.random() - 0.5) * 100;
                positions[i3 + 1] = (Math.random() - 0.5) * 100;
            }
        }
        particlesGeometry.attributes.position.needsUpdate = true;
        
        // Subtle camera movement - reduced to keep the entire matrix visible
        camera.position.x = Math.sin(elapsedTime * 0.1) * 2;
        camera.position.y = 25 + Math.cos(elapsedTime * 0.1) * 1;
        camera.lookAt(0, 0, 0);
        
        // Render the scene
        renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
};

// Initialize Dot Matrix background when DOM is loaded
document.addEventListener('DOMContentLoaded', initDotMatrixBackground);
