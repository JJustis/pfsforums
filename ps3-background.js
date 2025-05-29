const initPS3Background = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Set the iconic PS3 background color - deep blue
    renderer.setClearColor(new THREE.Color('#050520'), 1);
    
    // Create a plane for the wave background
    const planeGeometry = new THREE.PlaneGeometry(80, 45, 150, 150);
    
    // PS3 wave material with custom shader
    const waveMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            // PS3 characteristic bluish purple gradient colors
            uColorTop: { value: new THREE.Color('#352a5c') },
            uColorBottom: { value: new THREE.Color('#090e30') }
        },
        vertexShader: `
            uniform float uTime;
            uniform vec2 uMouse;
            
            varying vec2 vUv;
            varying float vElevation;
            
            // Classic PS3 wave function
            float ps3Wave(vec2 position) {
                float waveX1 = sin(position.x * 0.5 + uTime * 0.2) * 0.4;
                float waveX2 = sin(position.x * 0.4 - uTime * 0.15) * 0.3;
                float waveY1 = cos(position.y * 0.4 + uTime * 0.15) * 0.3;
                float waveY2 = cos(position.y * 0.5 - uTime * 0.1) * 0.3;
                
                return waveX1 + waveX2 + waveY1 + waveY2;
            }
            
            void main() {
                vUv = uv;
                
                // Calculate the PS3-style wave elevation
                float elevation = ps3Wave(position.xy);
                
                // Add mouse interaction - subtle ripple effect
                float distanceToMouse = length(position.xy - uMouse);
                float mouseWave = sin(distanceToMouse * 3.0 - uTime * 2.0) * 0.05 / (distanceToMouse * 0.5 + 0.5);
                
                // Combine waves
                elevation += mouseWave;
                vElevation = elevation;
                
                // Apply elevation to z-coordinate
                vec3 newPosition = position;
                newPosition.z = elevation;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColorTop;
            uniform vec3 uColorBottom;
            uniform float uTime;
            
            varying vec2 vUv;
            varying float vElevation;
            
            void main() {
                // PS3-style gradient using UV coordinates and elevation
                float gradientFactor = vUv.y + vElevation * 0.2;
                vec3 color = mix(uColorBottom, uColorTop, gradientFactor);
                
                // Add subtle glow on wave peaks
                color += vec3(0.1, 0.1, 0.3) * max(0.0, vElevation) * 2.0;
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide
    });
    
    // Create mesh for the waves
    const waves = new THREE.Mesh(planeGeometry, waveMaterial);
    waves.rotation.x = -Math.PI / 4; // Tilt to match PS3 XMB look
    waves.position.z = -5;
    scene.add(waves);
    
    // Create PS3-style floating particles
    const particlesCount = 250;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesPositions = new Float32Array(particlesCount * 3);
    const particlesSizes = new Float32Array(particlesCount);
    
    for (let i = 0; i < particlesCount; i++) {
        // Position particles in a wide, flat volume
        particlesPositions[i * 3] = (Math.random() - 0.5) * 80;
        particlesPositions[i * 3 + 1] = (Math.random() - 0.5) * 45;
        particlesPositions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
        
        // Various particle sizes - PS3 had subtle size differences
        particlesSizes[i] = Math.random() * 0.5 + 0.1;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particlesSizes, 1));
    
    // Create texture for particles to match PS3's soft, glowing particles
    const particleTexture = new THREE.CanvasTexture(generateParticleTexture());
    
    function generateParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Create a circular gradient for each particle
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
    
    // Material for PS3-style particles
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.5,
        map: particleTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: false
    });
    
    // Create the particles system
    const particlesSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesSystem);
    
    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 30;
    camera.position.y = 5;
    camera.lookAt(0, 0, -5);
    
    // Track mouse movement
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        // Convert mouse position to normalized device coordinates
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the shader uniform
        waveMaterial.uniforms.uMouse.value.x = mouseX * 40; // Scale to match plane size
        waveMaterial.uniforms.uMouse.value.y = mouseY * 22.5; // Scale to match plane size
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animation variables
    const clock = new THREE.Clock();
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();
        
        // Update wave shader time
        waveMaterial.uniforms.uTime.value = elapsedTime;
        
        // Slow rotation of particles for the PS3 effect
        particlesSystem.rotation.y = elapsedTime * 0.03;
        particlesSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1;
        
        // Animate particles position - gentle floating motion
        const positions = particlesGeometry.attributes.position.array;
        for (let i = 0; i < particlesCount; i++) {
            const i3 = i * 3;
            positions[i3 + 1] += Math.sin(elapsedTime * 0.2 + i * 0.1) * 0.01;
            positions[i3] += Math.cos(elapsedTime * 0.2 + i * 0.1) * 0.01;
        }
        particlesGeometry.attributes.position.needsUpdate = true;
        
        // Subtle camera movement
        camera.position.x = Math.sin(elapsedTime * 0.1) * 1;
        camera.position.y = 5 + Math.cos(elapsedTime * 0.1) * 1;
        camera.lookAt(0, 0, -5);
        
        // Render the scene
        renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
};

// Initialize PS3 background when DOM is loaded
document.addEventListener('DOMContentLoaded', initPS3Background);
