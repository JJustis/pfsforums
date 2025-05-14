const initThreeBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Create space background with subtle gradient
    scene.background = new THREE.Color(0x000510); // Very dark blue for space
    
    // Create positions for stars
    const particlesCount = 1500;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const sizes = new Float32Array(particlesCount);
    
    // Set random positions and colors for particles
    for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        
        // Create positions in a spherical distribution
        const radius = 2 + Math.random() * 8;
        const theta = Math.random() * Math.PI * 2; // around the sphere
        const phi = Math.acos((Math.random() * 2) - 1); // top to bottom
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        
        // Colors - blue/cyan theme
        colors[i3] = Math.random() * 0.3;  // R
        colors[i3 + 1] = Math.random() * 0.7;  // G
        colors[i3 + 2] = Math.random() * 0.9 + 0.1;  // B
        
        // Random sizes
        sizes[i] = Math.random() * 0.15 + 0.05;
    }
    
    // Set attributes
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create material for stars with custom shader to add glow
    const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            pointTexture: { value: createStarTexture() }
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
    
    // Function to create a glowing star texture
    function createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(160, 200, 240, 1)');
        gradient.addColorStop(0.4, 'rgba(120, 170, 220, 0.6)');
        gradient.addColorStop(0.8, 'rgba(80, 120, 180, 0.3)');
        gradient.addColorStop(1, 'rgba(40, 60, 130, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    // Create stars mesh
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    // Create space dust (smaller particles)
    const dustCount = 2000;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);
    
    for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        
        // Create dust in a larger sphere
        const radius = 1 + Math.random() * 12;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        dustPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        dustPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        dustPositions[i3 + 2] = radius * Math.cos(phi);
        
        // Subtle blue-grey colors for dust
        const intensity = Math.random() * 0.5 + 0.2;
        dustColors[i3] = intensity * 0.5;
        dustColors[i3 + 1] = intensity * 0.7;
        dustColors[i3 + 2] = intensity * 0.9;
        
        // Small sizes for dust
        dustSizes[i] = Math.random() * 0.03 + 0.01;
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));
    
    const dustMaterial = new THREE.PointsMaterial({
        size: 0.02,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);
    
    // Create the gas jets (north and south)
    const jetParticlesCount = 3000;
    
    // Create North Jet
    const northJetGeometry = new THREE.BufferGeometry();
    const northJetPositions = new Float32Array(jetParticlesCount * 3);
    const northJetColors = new Float32Array(jetParticlesCount * 3);
    const northJetSizes = new Float32Array(jetParticlesCount);
    const northJetVelocities = new Float32Array(jetParticlesCount * 3); // Store velocities for animation
    
    // Create South Jet
    const southJetGeometry = new THREE.BufferGeometry();
    const southJetPositions = new Float32Array(jetParticlesCount * 3);
    const southJetColors = new Float32Array(jetParticlesCount * 3);
    const southJetSizes = new Float32Array(jetParticlesCount);
    const southJetVelocities = new Float32Array(jetParticlesCount * 3); // Store velocities for animation
    
    // Set up jets (north and south)
    for (let i = 0; i < jetParticlesCount; i++) {
        const i3 = i * 3;
        
        // Create cone-shaped distribution for jets
        // Distance from center (increases away from center)
        const distFromCenter = Math.pow(Math.random(), 2) * 8; // Squared for more particles near center
        
        // Angular dispersion (wider at ends, narrower in middle)
        // The tangent gives us the desired tapering effect
        const maxAngle = 0.2 + 0.3 * Math.abs(Math.tan(distFromCenter * 0.25));
        const randomAngle = Math.random() * 2 * Math.PI;
        const randomRadius = Math.random() * maxAngle * distFromCenter;
        
        // North Jet (positive y)
        let nx = Math.sin(randomAngle) * randomRadius;
        let ny = distFromCenter; // Distance along y-axis
        let nz = Math.cos(randomAngle) * randomRadius;
        
        // South Jet (negative y)
        let sx = Math.sin(randomAngle) * randomRadius;
        let sy = -distFromCenter; // Negative y for south jet
        let sz = Math.cos(randomAngle) * randomRadius;
        
        // Set positions
        northJetPositions[i3] = nx;
        northJetPositions[i3 + 1] = ny;
        northJetPositions[i3 + 2] = nz;
        
        southJetPositions[i3] = sx;
        southJetPositions[i3 + 1] = sy;
        southJetPositions[i3 + 2] = sz;
        
        // Random initial velocities (for fluid-like motion)
        // Particles will move outward from center with some swirl
        northJetVelocities[i3] = (Math.random() - 0.5) * 0.01;
        northJetVelocities[i3 + 1] = Math.random() * 0.02; // Upward tendency
        northJetVelocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
        
        southJetVelocities[i3] = (Math.random() - 0.5) * 0.01;
        southJetVelocities[i3 + 1] = -Math.random() * 0.02; // Downward tendency
        southJetVelocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
        
        // Colors - blue/cyan with brightness based on distance
        // Brighter at center, fading out
        const brightness = 0.5 + 0.5 * (1 - distFromCenter / 8);
        
        // North jet - blue to cyan
        northJetColors[i3] = brightness * 0.2; // R
        northJetColors[i3 + 1] = brightness * 0.6; // G
        northJetColors[i3 + 2] = brightness; // B
        
        // South jet - blue to magenta
        southJetColors[i3] = brightness * 0.4; // R
        southJetColors[i3 + 1] = brightness * 0.2; // G
        southJetColors[i3 + 2] = brightness; // B
        
        // Sizes - larger at center, smaller at edges
        const particleSize = (0.1 + Math.random() * 0.1) * (1 - 0.7 * distFromCenter / 8);
        northJetSizes[i] = particleSize;
        southJetSizes[i] = particleSize;
    }
    
    // Set attributes for north jet
    northJetGeometry.setAttribute('position', new THREE.BufferAttribute(northJetPositions, 3));
    northJetGeometry.setAttribute('color', new THREE.BufferAttribute(northJetColors, 3));
    northJetGeometry.setAttribute('size', new THREE.BufferAttribute(northJetSizes, 1));
    
    // Set attributes for south jet
    southJetGeometry.setAttribute('position', new THREE.BufferAttribute(southJetPositions, 3));
    southJetGeometry.setAttribute('color', new THREE.BufferAttribute(southJetColors, 3));
    southJetGeometry.setAttribute('size', new THREE.BufferAttribute(southJetSizes, 1));
    
    // Create material for jets
    const jetMaterial = new THREE.PointsMaterial({
        size: 0.1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    // Create mesh for jets
    const northJet = new THREE.Points(northJetGeometry, jetMaterial.clone());
    const southJet = new THREE.Points(southJetGeometry, jetMaterial.clone());
    scene.add(northJet);
    scene.add(southJet);
    
    // Create a central diffusion sphere that rotates
    const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
    
    // Create semi-transparent material for the sphere
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x3060A0,
        transparent: true,
        opacity: 0.15,
        shininess: 50,
        specular: 0x6080C0,
        side: THREE.DoubleSide,
        wireframe: false
    });
    
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);
    
    // Create rain effect across the entire page
    const rainCount = 1500;
    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);
    const rainSizes = new Float32Array(rainCount);
    
    // Get page dimensions for rain positioning
    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;
    const pageDepth = 20; // How deep the 3D space should be
    
    // Calculate scaling factors to convert from pixel space to Three.js space
    const cameraZ = 10;
    const vFov = (camera.fov * Math.PI) / 180;
    const heightAtDepth = 2 * Math.tan(vFov / 2) * cameraZ;
    const widthAtDepth = heightAtDepth * camera.aspect;
    
    // Scale factors to convert from screen pixels to Three.js units
    const scaleX = widthAtDepth / window.innerWidth;
    const scaleY = heightAtDepth / window.innerHeight;
    
    // Initialize rain drops
    for (let i = 0; i < rainCount; i++) {
        const i3 = i * 3;
        
        // Position randomly across page width and height
        const x = (Math.random() * pageWidth - pageWidth / 2) * scaleX;
        const y = (Math.random() * pageHeight * 2 - pageHeight / 2) * scaleY; // Some above, some below
        const z = Math.random() * pageDepth - pageDepth / 2; // Distribute across depth
        
        rainPositions[i3] = x;
        rainPositions[i3 + 1] = y;
        rainPositions[i3 + 2] = z;
        
        // Random falling speeds - deeper particles fall slower (parallax effect)
        const depthFactor = 1 - (z + pageDepth/2) / pageDepth; // 0 to 1, deeper = smaller
        rainVelocities[i] = (Math.random() * 0.03 + 0.01) * (0.5 + depthFactor);
        
        // Raindrop sizes - closer droplets are larger
        rainSizes[i] = (Math.random() * 0.02 + 0.01) * (0.5 + depthFactor);
    }
    
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rainGeometry.setAttribute('size', new THREE.BufferAttribute(rainSizes, 1));
    
    // Create raindrop texture
    function createRainTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const context = canvas.getContext('2d');
        
        // Create elongated raindrop shape
        const gradient = context.createLinearGradient(16, 0, 16, 32);
        gradient.addColorStop(0, 'rgba(190, 215, 255, 0.0)');
        gradient.addColorStop(0.2, 'rgba(190, 215, 255, 0.5)');
        gradient.addColorStop(0.9, 'rgba(190, 215, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(190, 215, 255, 0.0)');
        
        context.fillStyle = gradient;
        
        // Draw an elongated raindrop
        context.beginPath();
        context.moveTo(16, 2);
        context.lineTo(18, 10);
        context.lineTo(16, 30);
        context.lineTo(14, 10);
        context.closePath();
        context.fill();
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    // Rain material with custom shader
    const rainMaterial = new THREE.ShaderMaterial({
        uniforms: {
            pointTexture: { value: createRainTexture() }
        },
        vertexShader: `
            attribute float size;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D pointTexture;
            void main() {
                vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                gl_FragColor = texColor;
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    // Create rain mesh
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rain);
    
    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x111133, 0.3);
    scene.add(ambientLight);
    
    // Add subtle directional light 
    const directionalLight = new THREE.DirectionalLight(0x2233AA, 0.4);
    directionalLight.position.set(1, 0.5, 0.5);
    scene.add(directionalLight);
    
    // Add faint rim light from the opposite direction
    const rimLight = new THREE.DirectionalLight(0x2255DD, 0.2);
    rimLight.position.set(-1, -0.5, -0.5);
    scene.add(rimLight);
    
    // Position camera
    camera.position.z = 10;
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update page dimensions
        const pageWidth = window.innerWidth;
        const pageHeight = window.innerHeight;
        
        // Recalculate scaling factors
        const heightAtDepth = 2 * Math.tan(vFov / 2) * cameraZ;
        const widthAtDepth = heightAtDepth * camera.aspect;
        const scaleX = widthAtDepth / window.innerWidth;
        const scaleY = heightAtDepth / window.innerHeight;
        
        // Update rain positions to match new dimensions
        const rainPositionsAttribute = rain.geometry.getAttribute('position');
        
        for (let i = 0; i < rainCount; i++) {
            const i3 = i * 3;
            
            // Only adjust if the raindrops are out of bounds
            if (Math.abs(rainPositionsAttribute.array[i3] / scaleX) > pageWidth / 2) {
                rainPositionsAttribute.array[i3] = (Math.random() * pageWidth - pageWidth / 2) * scaleX;
            }
        }
        
        rainPositionsAttribute.needsUpdate = true;
    });
    
    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        const deltaTime = clock.getDelta();
        
        // Rotate the sphere
        sphere.rotation.y += 0.003;
        sphere.rotation.x += 0.001;
        
        // Rotate stars and dust around the center
        particles.rotation.y += 0.0002;
        particles.rotation.x += 0.0001;
        
        dust.rotation.y -= 0.0001;
        dust.rotation.x += 0.00005;
        
        // Make particles move with mouse movement
        if (window.mouseX && window.mouseY) {
            particles.rotation.x += (window.mouseY * 0.00001);
            particles.rotation.y += (window.mouseX * 0.00001);
            
            sphere.rotation.x += (window.mouseY * 0.00002);
            sphere.rotation.y += (window.mouseX * 0.00002);
        }
        
        // Animate rain
        const rainPositionsAttribute = rain.geometry.getAttribute('position');
        
        for (let i = 0; i < rainCount; i++) {
            const i3 = i * 3;
            
            // Move raindrop down
            rainPositionsAttribute.array[i3 + 1] -= rainVelocities[i];
            
            // Add slight horizontal movement for realism
            rainPositionsAttribute.array[i3] += Math.sin(elapsedTime + i) * 0.002;
            
            // Reset raindrop if it's out of view
            if (rainPositionsAttribute.array[i3 + 1] < -pageHeight * scaleY) {
                rainPositionsAttribute.array[i3] = (Math.random() * pageWidth - pageWidth / 2) * scaleX;
                rainPositionsAttribute.array[i3 + 1] = (pageHeight / 2 + Math.random() * 10) * scaleY;
                
                // Randomize velocity slightly when resetting
                const z = rainPositionsAttribute.array[i3 + 2];
                const depthFactor = 1 - (z + pageDepth/2) / pageDepth;
                rainVelocities[i] = (Math.random() * 0.03 + 0.01) * (0.5 + depthFactor);
            }
        }
        
        rainPositionsAttribute.needsUpdate = true;
        
        // Animate the north jet particles (fluid dynamics)
        const northJetPositionsAttribute = northJet.geometry.getAttribute('position');
        for (let i = 0; i < jetParticlesCount; i++) {
            const i3 = i * 3;
            
            // Get current position
            let x = northJetPositionsAttribute.array[i3];
            let y = northJetPositionsAttribute.array[i3 + 1];
            let z = northJetPositionsAttribute.array[i3 + 2];
            
            // Calculate distance from center for tapering effect
            const distFromCenter = Math.sqrt(x*x + y*y + z*z);
            
            // Apply spiral motion based on rotation
            // Stronger effect closer to center (viscous fluid behavior)
            const rotationSpeedFactor = 0.05 / (1 + distFromCenter * 0.5);
            const spinX = -z * rotationSpeedFactor;
            const spinZ = x * rotationSpeedFactor;
            
            // Update velocities with some outward flow and rotation
            northJetVelocities[i3] += spinX * deltaTime;
            northJetVelocities[i3 + 2] += spinZ * deltaTime;
            
            // Apply velocities to positions
            northJetPositionsAttribute.array[i3] += northJetVelocities[i3];
            northJetPositionsAttribute.array[i3 + 1] += northJetVelocities[i3 + 1];
            northJetPositionsAttribute.array[i3 + 2] += northJetVelocities[i3 + 2];
            
            // Reset particles that go too far or check for sphere interaction
            if (distFromCenter > 8 || northJetPositionsAttribute.array[i3 + 1] > 8) {
                // Reset to near center with upward velocity
                northJetPositionsAttribute.array[i3] = (Math.random() - 0.5) * 0.2;
                northJetPositionsAttribute.array[i3 + 1] = Math.random() * 0.5;
                northJetPositionsAttribute.array[i3 + 2] = (Math.random() - 0.5) * 0.2;
                
                northJetVelocities[i3] = (Math.random() - 0.5) * 0.01;
                northJetVelocities[i3 + 1] = Math.random() * 0.02;
                northJetVelocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
            }
            
            // If particle is near the sphere radius (3), adjust velocity to follow sphere surface
            const sphereRadius = 3;
            if (Math.abs(distFromCenter - sphereRadius) < 0.5) {
                // Calculate normal from center to point
                const nx = x / distFromCenter;
                const ny = y / distFromCenter;
                const nz = z / distFromCenter;
                
                // Add a component tangent to sphere
                northJetVelocities[i3] += (nz * 0.005) * deltaTime; // Tangential component
                northJetVelocities[i3 + 2] += (-nx * 0.005) * deltaTime; // Tangential component
                
                // Slow down outward component slightly
                northJetVelocities[i3 + 1] *= 0.98;
            }
        }
        northJetPositionsAttribute.needsUpdate = true;
        
        // Animate the south jet particles (fluid dynamics)
        const southJetPositionsAttribute = southJet.geometry.getAttribute('position');
        for (let i = 0; i < jetParticlesCount; i++) {
            const i3 = i * 3;
            
            // Get current position
            let x = southJetPositionsAttribute.array[i3];
            let y = southJetPositionsAttribute.array[i3 + 1];
            let z = southJetPositionsAttribute.array[i3 + 2];
            
            // Calculate distance from center for tapering effect
            const distFromCenter = Math.sqrt(x*x + y*y + z*z);
            
            // Apply spiral motion based on rotation
            // Stronger effect closer to center (viscous fluid behavior)
            const rotationSpeedFactor = 0.05 / (1 + distFromCenter * 0.5);
            const spinX = -z * rotationSpeedFactor;
            const spinZ = x * rotationSpeedFactor;
            
            // Update velocities with some outward flow and rotation
            southJetVelocities[i3] += spinX * deltaTime;
            southJetVelocities[i3 + 2] += spinZ * deltaTime;
            
            // Apply velocities to positions
            southJetPositionsAttribute.array[i3] += southJetVelocities[i3];
            southJetPositionsAttribute.array[i3 + 1] += southJetVelocities[i3 + 1];
            southJetPositionsAttribute.array[i3 + 2] += southJetVelocities[i3 + 2];
            
            // Reset particles that go too far
            if (distFromCenter > 8 || southJetPositionsAttribute.array[i3 + 1] < -8) {
                // Reset to near center with downward velocity
                southJetPositionsAttribute.array[i3] = (Math.random() - 0.5) * 0.2;
                southJetPositionsAttribute.array[i3 + 1] = -Math.random() * 0.5;
                southJetPositionsAttribute.array[i3 + 2] = (Math.random() - 0.5) * 0.2;
                
                southJetVelocities[i3] = (Math.random() - 0.5) * 0.01;
                southJetVelocities[i3 + 1] = -Math.random() * 0.02;
                southJetVelocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
            }
            
            // If particle is near the sphere radius (3), adjust velocity to follow sphere surface
            const sphereRadius = 3;
            if (Math.abs(distFromCenter - sphereRadius) < 0.5) {
                // Calculate normal from center to point
                const nx = x / distFromCenter;
                const ny = y / distFromCenter;
                const nz = z / distFromCenter;
                
                // Add a component tangent to sphere
                southJetVelocities[i3] += (nz * 0.005) * deltaTime; // Tangential component
                southJetVelocities[i3 + 2] += (-nx * 0.005) * deltaTime; // Tangential component
                
                // Slow down outward component slightly
                southJetVelocities[i3 + 1] *= 0.98;
            }
        }
        southJetPositionsAttribute.needsUpdate = true;
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Call animate again on the next frame
        requestAnimationFrame(animate);
    };
    
    // Track mouse movement
    window.mouseX = 0;
    window.mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        window.mouseX = event.clientX - window.innerWidth / 2;
        window.mouseY = event.clientY - window.innerHeight / 2;
    });
    
    // Start animation
    animate();
};

// Function to setup the background canvas for the entire page
const setupPageBackground = () => {
    // Check if we already have a canvas
    let canvas = document.getElementById('bg-canvas');
    
    // If no canvas exists, create one
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        
        // Set canvas styles for fullscreen background
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-1';
        canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    }
    
    // Add the canvas to the body as a fixed background
    if (canvas.parentElement !== document.body) {
        document.body.appendChild(canvas);
    }
    
    return canvas;
};

// Add CSS to make content readable over the background
const addBackgroundCSS = () => {
    // Create a style element if it doesn't exist
    let style = document.getElementById('background-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'background-styles';
        document.head.appendChild(style);
        
        // Add CSS rules
        style.textContent = `
            body {
                background-color: transparent !important;
                position: relative;
                z-index: 1;
            }
            
            main, article, section, .content, .container {
                position: relative;
                z-index: 1;
                background-color: rgba(0, 5, 16, 0.6);
                padding: 20px;
                border-radius: 5px;
                color: #fff;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: #ffffff;
            }
            
            a {
                color: #80afff;
            }
            
            /* Style adjustments for text contrast */
            p, li, span, div {
                text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
            }
            
            /* Add a subtle background to text containers */
            article, .content, .container, .card, .post {
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                margin-bottom: 20px;
            }
        `;
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setupPageBackground();
    addBackgroundCSS();
    initThreeBackground();
    
    // Add a mutation observer to ensure the background works on dynamically loaded pages
    const observer = new MutationObserver((mutations) => {
        let needsReattach = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // Check if our canvas was removed
                const canvas = document.getElementById('bg-canvas');
                if (!canvas || !document.body.contains(canvas)) {
                    needsReattach = true;
                }
            }
        });
        
        if (needsReattach) {
            setupPageBackground();
            initThreeBackground();
        }
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});