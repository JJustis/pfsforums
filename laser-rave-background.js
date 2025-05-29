const initLaserRaveBackground = () => {
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
    
    // Create fog for atmosphere
    scene.fog = new THREE.FogExp2(0x000000, 0.03);
    scene.background = new THREE.Color(0x000000);
    
    // Laser beams container
    const lasers = [];
    
    // Laser colors - expanded palette
    const laserColors = [
        0xFF0099, // Pink
        0x00FFFF, // Cyan
        0xFF3300, // Orange
        0x33FF00, // Lime
        0xFF00FF, // Magenta
        0xFFFF00, // Yellow
        0x3333FF, // Blue
        0xFF6600, // Deep Orange
        0x00FF99, // Turquoise 
        0xCC00FF  // Purple
    ];
    
    // Function to create a laser beam
    function createLaser() {
        // Create a laser beam with random properties
        const geometry = new THREE.CylinderGeometry(0.02, 0.02, 40, 8, 1, true);
        
        // Random color from our palette
        const colorIndex = Math.floor(Math.random() * laserColors.length);
        const color = laserColors[colorIndex];
        
        // Create glowing material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(color) },
                time: { value: 0 },
                intensity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                uniform float intensity;
                varying vec2 vUv;
                
                void main() {
                    float pulse = intensity * (0.7 + 0.3 * sin(vUv.y * 30.0 + time * 10.0));
                    vec3 glow = color * pulse;
                    
                    // Create edge glow effect
                    float edge = 0.1;
                    float edgeDist = min(vUv.x, 1.0 - vUv.x);
                    float edgeIntensity = smoothstep(0.0, edge, edgeDist);
                    
                    gl_FragColor = vec4(glow, 1.0 - edgeIntensity * 0.9);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        // Create the laser mesh
        const laser = new THREE.Mesh(geometry, material);
        
        // Position at random location outside the view
        const distance = 20 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        laser.position.set(
            Math.cos(angle) * distance,
            Math.random() * 20 - 10,
            Math.sin(angle) * distance
        );
        
        // Random rotation
        laser.rotation.x = Math.PI / 2; // Make cylinder horizontal
        laser.rotation.z = Math.random() * Math.PI * 2;
        
        // Add random movement pattern
        const movement = {
            rotationSpeed: (Math.random() - 0.5) * 0.01,
            movementSpeed: 0.05 + Math.random() * 0.1,
            targetRotation: Math.random() * Math.PI * 2,
            rotationChangeTime: 100 + Math.random() * 200,
            timeCounter: 0,
            pulseSpeed: 1 + Math.random() * 2
        };
        
        // Create tracer particles for this laser
        const tracerCount = 40;
        const tracerGeometry = new THREE.BufferGeometry();
        const tracerPositions = new Float32Array(tracerCount * 3);
        const tracerSizes = new Float32Array(tracerCount);
        const tracerColors = new Float32Array(tracerCount * 3);
        
        // Initial positions - will be updated in animation loop
        for (let i = 0; i < tracerCount; i++) {
            const i3 = i * 3;
            
            // Position along the laser beam
            const t = i / tracerCount;
            
            // Start positions don't matter as they'll be updated
            tracerPositions[i3] = 0;
            tracerPositions[i3 + 1] = 0;
            tracerPositions[i3 + 2] = 0;
            
            // Size decreases with distance from laser source
            tracerSizes[i] = 0.1 * (1 - t * 0.7);
            
            // Color based on laser color but fading
            const laserColor = new THREE.Color(color);
            tracerColors[i3] = laserColor.r;
            tracerColors[i3 + 1] = laserColor.g;
            tracerColors[i3 + 2] = laserColor.b;
        }
        
        tracerGeometry.setAttribute('position', new THREE.BufferAttribute(tracerPositions, 3));
        tracerGeometry.setAttribute('size', new THREE.BufferAttribute(tracerSizes, 1));
        tracerGeometry.setAttribute('color', new THREE.BufferAttribute(tracerColors, 3));
        
        const tracerMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pointTexture: { value: createParticleTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                
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
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(vColor, texColor.a * 0.6);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true
        });
        
        const tracers = new THREE.Points(tracerGeometry, tracerMaterial);
        scene.add(tracers);
        
        return { 
            mesh: laser, 
            material, 
            movement,
            tracers,
            tracerPositions
        };
    }
    
    // Create laser beams arranged in patterns
    
    // Function to create a line of lasers
    function createLaserLine(count, startPos, endPos, yVariation = true) {
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1); // Position along the line (0 to 1)
            const laser = createLaser();
            
            // Clear any tracers for these lasers to avoid errors
            if (laser.tracers) {
                scene.remove(laser.tracers);
                laser.tracers = null;
                laser.tracerPositions = null;
            }
            
            // Position along the line
            laser.mesh.position.x = startPos.x + (endPos.x - startPos.x) * t;
            laser.mesh.position.z = startPos.z + (endPos.z - startPos.z) * t;
            
            // Add some Y variation if requested
            if (yVariation) {
                laser.mesh.position.y = startPos.y + (endPos.y - startPos.y) * t + (Math.random() - 0.5) * 4;
            } else {
                laser.mesh.position.y = startPos.y + (endPos.y - startPos.y) * t;
            }
            
            // Set the laser's rotation to point roughly in the same direction
            laser.mesh.lookAt(new THREE.Vector3(
                laser.mesh.position.x + (Math.random() - 0.5) * 5,
                laser.mesh.position.y + (Math.random() - 0.5) * 5,
                laser.mesh.position.z + (Math.random() - 0.5) * 5
            ));
            
            // Add flashing property to laser
            laser.flashSpeed = 0.5 + Math.random() * 2;
            laser.flashIntensity = 0.6 + Math.random() * 0.4;
            laser.phaseOffset = Math.random() * Math.PI * 2;
            
            scene.add(laser.mesh);
            lasers.push(laser);
        }
    }
    
    // Create a grid of lasers
    function createLaserGrid(rows, cols, centerX, centerZ, size, height) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const laser = createLaser();
                
                // Clear any tracers for these lasers to avoid errors
                if (laser.tracers) {
                    scene.remove(laser.tracers);
                    laser.tracers = null;
                    laser.tracerPositions = null;
                }
                
                // Position on grid
                const x = centerX + (c - (cols - 1) / 2) * size;
                const z = centerZ + (r - (rows - 1) / 2) * size;
                
                laser.mesh.position.set(x, height, z);
                
                // Point slightly inward for a fan effect
                laser.mesh.lookAt(new THREE.Vector3(
                    centerX + (x - centerX) * 0.5,
                    Math.random() * 5 - 10,
                    centerZ + (z - centerZ) * 0.5
                ));
                
                // Flashing properties
                laser.flashSpeed = 0.3 + Math.random() * 1.5;
                laser.flashIntensity = 0.7 + Math.random() * 0.3;
                laser.phaseOffset = (r * cols + c) / (rows * cols) * Math.PI * 2; // Sequential phases
                
                scene.add(laser.mesh);
                lasers.push(laser);
            }
        }
    }
    
    // Create a circular arrangement of lasers
    function createLaserCircle(count, centerX, centerZ, radius, height, pointTo) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const laser = createLaser();
            
            // Clear any tracers for these lasers to avoid errors
            if (laser.tracers) {
                scene.remove(laser.tracers);
                laser.tracers = null;
                laser.tracerPositions = null;
            }
            
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            laser.mesh.position.set(x, height, z);
            
            // Point to specified position
            laser.mesh.lookAt(pointTo);
            
            // Flashing properties with phase based on position in circle
            laser.flashSpeed = 0.5 + Math.random() * 1.5;
            laser.flashIntensity = 0.5 + Math.random() * 0.5;
            laser.phaseOffset = angle; // Phase offset based on angle
            
            scene.add(laser.mesh);
            lasers.push(laser);
        }
    }
    
    // Create different laser arrangements
    // 1. Create a line of lasers from left to right
    createLaserLine(12, 
        new THREE.Vector3(-25, 5, -15), 
        new THREE.Vector3(25, 5, -15),
        true
    );
    
    // 2. Create a line of lasers from front to back
    createLaserLine(12, 
        new THREE.Vector3(-15, 5, -25), 
        new THREE.Vector3(-15, 5, 25),
        true
    );
    
    // 3. Create a grid of lasers on one side
    createLaserGrid(4, 5, 20, 0, 3, 7);
    
    // 4. Create a circle of lasers pointing to center
    createLaserCircle(18, 0, 0, 30, 3, new THREE.Vector3(0, 5, 0));
    
    // 5. Create a circle of lasers pointing outward
    createLaserCircle(12, 0, 0, 15, 8, new THREE.Vector3(0, -10, 0));
    
    // 6. Add some random lasers for variety (these have tracers)
    for (let i = 0; i < 10; i++) {
        const laser = createLaser();
        
        // Make sure tracers are properly initialized
        if (laser.tracers && laser.tracers.geometry) {
            const positions = laser.tracers.geometry.getAttribute('position');
            if (positions) {
                laser.tracerPositions = positions;
            }
        }
        
        laser.flashSpeed = 0.5 + Math.random() * 2;
        laser.flashIntensity = 0.5 + Math.random() * 0.5;
        laser.phaseOffset = Math.random() * Math.PI * 2;
        scene.add(laser.mesh);
        lasers.push(laser);
    }
    
    // Create spotlight system for flashing stage lights
    const spotlights = [];
    const spotlightColors = [
        0xFF0099, // Pink
        0x00FFFF, // Cyan 
        0xFF3300, // Orange
        0x33FF00, // Lime
        0xFF00FF  // Magenta
    ];
    
    function createSpotlight() {
        // Random color from our palette
        const colorIndex = Math.floor(Math.random() * spotlightColors.length);
        const color = spotlightColors[colorIndex];
        
        // Create spotlight
        const spotlight = new THREE.SpotLight(color, 10, 50, Math.PI / 8, 0.5, 1);
        
        // Position at the top of the scene
        const distance = 15 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        spotlight.position.set(
            Math.cos(angle) * distance,
            8 + Math.random() * 4,
            Math.sin(angle) * distance
        );
        
        // Target at the center with some variation
        const target = new THREE.Object3D();
        target.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        scene.add(target);
        spotlight.target = target;
        
        // Add movement pattern
        const movement = {
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            targetChangeTime: 50 + Math.random() * 100,
            timeCounter: 0,
            intensity: 10,
            maxIntensity: 10 + Math.random() * 15,
            pulseSpeed: 0.5 + Math.random() * 1.5,
            movementRadius: 10 + Math.random() * 10
        };
        
        // Create visible cone to represent the spotlight
        const geometry = new THREE.ConeGeometry(4, 8, 16, 1, true);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const cone = new THREE.Mesh(geometry, material);
        cone.position.copy(spotlight.position);
        cone.rotation.x = Math.PI; // Point the cone downward
        
        return { 
            light: spotlight, 
            target, 
            movement, 
            cone,
            color
        };
    }
    
    // Create multiple spotlights
    for (let i = 0; i < 8; i++) {
        const spotlight = createSpotlight();
        scene.add(spotlight.light);
        scene.add(spotlight.cone);
        spotlights.push(spotlight);
    }
    
    // Create dance floor grid
    const floorSize = 30;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize, 20, 20);
    const floorMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            gridSize: { value: 20.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float gridSize;
            varying vec2 vUv;
            
            void main() {
                vec2 grid = fract(vUv * gridSize);
                float gridLine = step(0.95, grid.x) + step(0.95, grid.y);
                
                // Create moving color pattern
                vec3 color1 = vec3(0.8, 0.0, 0.8); // Purple
                vec3 color2 = vec3(0.0, 0.8, 0.8); // Cyan
                vec3 color3 = vec3(0.9, 0.1, 0.1); // Red
                
                // Create a color based on position and time
                float t1 = sin(time * 0.5 + vUv.x * 3.0 + vUv.y * 2.0) * 0.5 + 0.5;
                float t2 = sin(time * 0.7 - vUv.x * 4.0 + vUv.y * 5.0) * 0.5 + 0.5;
                
                vec3 gridColor = mix(mix(color1, color2, t1), color3, t2);
                
                // Create pulsing effect
                float pulse = 0.4 + 0.6 * pow(sin(time * 2.0) * 0.5 + 0.5, 2.0);
                
                // Grid cells light up randomly
                float random = fract(sin(dot(floor(vUv * gridSize), vec2(12.9898, 78.233)) + time * 0.5) * 43758.5453);
                float cellActive = step(0.7, random);
                
                // Calculate final color
                vec3 finalColor = gridColor * (gridLine + cellActive * pulse * 0.8);
                float alpha = gridLine * 0.6 + cellActive * pulse * 0.4;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Lay flat
    floor.position.y = -10;
    scene.add(floor);
    
    // Create particle system for floating dust/atmosphere
    const particleCount = 3000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random position in a cube
        particlePositions[i3] = (Math.random() - 0.5) * 50;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 50;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * 50;
        
        // Random size
        particleSizes[i] = Math.random() * 0.5 + 0.1;
        
        // Random color from palette
        const colorIndex = Math.floor(Math.random() * laserColors.length);
        const color = new THREE.Color(laserColors[colorIndex]);
        particleColors[i3] = color.r;
        particleColors[i3 + 1] = color.g;
        particleColors[i3 + 2] = color.b;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    // Create particle material with glowing effect
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pointTexture: { value: createParticleTexture() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            
            void main() {
                vColor = color;
                
                // Slight movement based on position and time
                vec3 pos = position;
                pos.y += sin(time * 0.2 + position.x * 0.1 + position.z * 0.1) * 0.5;
                pos.x += cos(time * 0.3 + position.y * 0.05) * 0.3;
                pos.z += sin(time * 0.4 + position.x * 0.05) * 0.3;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (20.0 / -mvPosition.z) * (sin(time * 2.0 + pos.x + pos.y) * 0.2 + 0.8);
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
    
    // Function to create particle texture
    function createParticleTexture() {
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
    
    // Create particles mesh
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Create central disco ball
    const discoBallRadius = 3;
    const discoBallGeometry = new THREE.SphereGeometry(discoBallRadius, 32, 32);
    
    // Create custom material for disco ball with mirror facets
    const discoBallMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100,
        specular: 0xffffff,
        emissive: 0x222222
    });
    
    const discoBall = new THREE.Mesh(discoBallGeometry, discoBallMaterial);
    discoBall.position.y = 5;
    scene.add(discoBall);
    
    // Create facets for the disco ball
    const facetSize = 0.3;
    const facetGeometry = new THREE.PlaneGeometry(facetSize, facetSize);
    const facetMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100,
        specular: 0xffffff,
        emissive: 0x222222,
        side: THREE.DoubleSide
    });
    
    const facets = new THREE.Group();
    
    // Create facets around the disco ball
    for (let i = 0; i < 200; i++) {
        const facet = new THREE.Mesh(facetGeometry, facetMaterial);
        
        // Position on the sphere surface
        const phi = Math.acos(-1 + (2 * i) / 200);
        const theta = Math.sqrt(200 * Math.PI) * phi;
        
        facet.position.x = discoBallRadius * Math.cos(theta) * Math.sin(phi);
        facet.position.y = discoBallRadius * Math.sin(theta) * Math.sin(phi) + 5; // +5 to match ball position
        facet.position.z = discoBallRadius * Math.cos(phi);
        
        // Orient to face outward
        facet.lookAt(new THREE.Vector3(0, 5, 0));
        
        // Tilt slightly for better reflections
        facet.rotation.z = Math.random() * Math.PI * 2;
        
        facets.add(facet);
    }
    
    scene.add(facets);
    
    // Position camera
    camera.position.z = 30;
    camera.position.y = 5;
    
    // Create ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        const deltaTime = clock.getDelta();
        
        // Update shader uniforms
        particleMaterial.uniforms.time.value = elapsedTime;
        floorMaterial.uniforms.time.value = elapsedTime;
        
        // Update laser materials
        lasers.forEach(laser => {
            laser.material.uniforms.time.value = elapsedTime;
            
            // Apply flashing effect based on individual laser properties
            if (laser.flashSpeed && laser.flashIntensity) {
                const flash = laser.flashIntensity * (0.5 + 0.5 * Math.sin(elapsedTime * laser.flashSpeed + laser.phaseOffset));
                laser.material.uniforms.intensity.value = flash;
            }
            
            // Move laser based on its pattern
            const move = laser.movement;
            move.timeCounter += 1;
            
            // Change rotation direction periodically
            if (move.timeCounter >= move.rotationChangeTime) {
                move.targetRotation = Math.random() * Math.PI * 2;
                move.rotationSpeed = (Math.random() - 0.5) * 0.02;
                move.rotationChangeTime = 100 + Math.random() * 200;
                move.timeCounter = 0;
            }
            
            // Rotate laser beam
            laser.mesh.rotation.z += move.rotationSpeed;
            
            // Move beam across the scene
            laser.mesh.position.x += Math.sin(elapsedTime * move.movementSpeed + laser.mesh.position.z) * 0.1;
            laser.mesh.position.z += Math.cos(elapsedTime * move.movementSpeed + laser.mesh.position.x) * 0.1;
            
            // If laser goes out of bounds, reset it
            const distanceFromCenter = Math.sqrt(
                laser.mesh.position.x * laser.mesh.position.x + 
                laser.mesh.position.z * laser.mesh.position.z
            );
            
            if (distanceFromCenter > 40) {
                const angle = Math.random() * Math.PI * 2;
                laser.mesh.position.set(
                    Math.cos(angle) * 30,
                    Math.random() * 20 - 10,
                    Math.sin(angle) * 30
                );
            }
            
            // Update tracer particles to follow laser
            if (laser.tracers && laser.tracerPositions && laser.tracerPositions.array) {
                // Calculate start and end points of laser
                const laserLength = 40; // Length of our cylinder
                
                // Create a matrix to transform from laser local space to world space
                const matrix = new THREE.Matrix4();
                matrix.extractRotation(laser.mesh.matrixWorld);
                
                // Get direction vector along laser's axis
                const direction = new THREE.Vector3(0, 1, 0); // Y is along cylinder in local space
                direction.applyMatrix4(matrix);
                direction.normalize();
                
                // Laser center point
                const center = new THREE.Vector3();
                center.copy(laser.mesh.position);
                
                // Calculate start point (half length back from center)
                const start = new THREE.Vector3();
                start.copy(center).sub(direction.clone().multiplyScalar(laserLength/2));
                
                // Calculate end point (half length forward from center)
                const end = new THREE.Vector3();
                end.copy(center).add(direction.clone().multiplyScalar(laserLength/2));
                
                // Update tracer particles positions
                const tracerCount = laser.tracerPositions.array.length / 3;
                
                for (let i = 0; i < tracerCount; i++) {
                    const i3 = i * 3;
                    
                    // Get position along laser beam
                    const t = i / tracerCount;
                    
                    // Position along beam with slight random variation
                    const x = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * 0.2;
                    const y = start.y + (end.y - start.y) * t + (Math.random() - 0.5) * 0.2;
                    const z = start.z + (end.z - start.z) * t + (Math.random() - 0.5) * 0.2;
                    
                    // Set position
                    laser.tracerPositions.array[i3] = x;
                    laser.tracerPositions.array[i3 + 1] = y;
                    laser.tracerPositions.array[i3 + 2] = z;
                }
                
                // Update the buffer
                laser.tracers.geometry.attributes.position.needsUpdate = true;
                
                // Update tracer material
                laser.tracers.material.uniforms.time.value = elapsedTime;
            }
        });
        
        // Update spotlights
        spotlights.forEach(spotlight => {
            const move = spotlight.movement;
            move.timeCounter += 1;
            
            // Update intensity for flickering/pulsing effect
            spotlight.light.intensity = move.intensity * (0.7 + 0.3 * Math.sin(elapsedTime * move.pulseSpeed * 5));
            
            // Change target periodically
            if (move.timeCounter >= move.targetChangeTime) {
                // Move target to new position
                spotlight.target.position.set(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 10 - 5, // Aim lower for floor
                    (Math.random() - 0.5) * 20
                );
                
                // Reset counter and set new change time
                move.targetChangeTime = 50 + Math.random() * 100;
                move.timeCounter = 0;
                
                // Randomly change color
                const colorIndex = Math.floor(Math.random() * spotlightColors.length);
                const newColor = new THREE.Color(spotlightColors[colorIndex]);
                spotlight.light.color = newColor;
                spotlight.cone.material.color = newColor;
            }
            
            // Update cone position and rotation to match spotlight
            spotlight.cone.position.copy(spotlight.light.position);
            spotlight.cone.lookAt(spotlight.target.position);
            
            // Move spotlight in circular pattern
            const angle = elapsedTime * move.rotationSpeed;
            const radius = move.movementRadius;
            spotlight.light.position.x = Math.cos(angle) * radius;
            spotlight.light.position.z = Math.sin(angle) * radius;
            
            // Update cone to match light
            spotlight.cone.position.copy(spotlight.light.position);
        });
        
        // Rotate disco ball
        discoBall.rotation.y = elapsedTime * 0.1;
        facets.rotation.y = elapsedTime * 0.1;
        
        // Add some up/down motion to the disco ball
        discoBall.position.y = 5 + Math.sin(elapsedTime * 0.5) * 0.5;
        facets.position.y = Math.sin(elapsedTime * 0.5) * 0.5; // Relative to the ball's original Y=5 position
        
        // Make particles move and pulse with music beat
        particles.rotation.y = elapsedTime * 0.05;
        const beatIntensity = 0.8 + 0.2 * Math.sin(elapsedTime * 2.0);
        
        // Camera motion for immersive effect
        const cameraRadius = 30;
        const cameraSpeed = 0.1;
        
        // Smooth camera movement in a circle, looking at center
        camera.position.x = Math.sin(elapsedTime * cameraSpeed) * cameraRadius * 0.3;
        camera.position.z = Math.cos(elapsedTime * cameraSpeed) * cameraRadius;
        camera.lookAt(0, 0, 0);
        
        // Add a slight up and down motion with the beat
        camera.position.y = 5 + Math.sin(elapsedTime * 2) * 0.5;
        
        // Add mouse influence to camera movement 
        if (window.mouseX && window.mouseY) {
            camera.position.x += window.mouseX * 0.01;
            camera.position.y += window.mouseY * 0.01;
        }
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Call animate again on the next frame
        requestAnimationFrame(animate);
    };
    
    // Track mouse movement
    window.mouseX = 0;
    window.mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        window.mouseX = (event.clientX - window.innerWidth / 2) * 0.05;
        window.mouseY = (event.clientY - window.innerHeight / 2) * 0.05;
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
                color: #fff;
            }
            
            main, article, section, .content, .container {
                position: relative;
                z-index: 1;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 20px;
                border-radius: 5px;
                color: #fff;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: #ffffff;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            }
            
            a {
                color: #00ffff;
                text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
            }
            
            /* Style adjustments for text contrast */
            p, li, span, div {
                text-shadow: 0 0 5px rgba(0, 0, 0, 0.9);
            }
            
            /* Add a subtle background to text containers */
            article, .content, .container, .card, .post {
                box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
                margin-bottom: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            /* Buttons and interactive elements */
            button, .btn {
                border: 1px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
                transition: all 0.3s ease;
            }
            
            button:hover, .btn:hover {
                box-shadow: 0 0 15px rgba(255, 0, 255, 0.5);
            }
            
            /* Form elements */
            input, textarea, select {
                background-color: rgba(0, 0, 0, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
            }
        `;
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setupPageBackground();
    addBackgroundCSS();
    initLaserRaveBackground();
    
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
            initLaserRaveBackground();
        }
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});