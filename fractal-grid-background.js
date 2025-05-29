// 3D Fractal Grid with Gravitational Warping
const initFractalGridBackground = () => {
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
        
        // Create the renderer
        const renderer = new THREE.WebGLRenderer({ 
            canvas, 
            alpha: true, 
            antialias: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Create the scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000814);
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.z = 30;
        camera.position.y = 10;
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x333366, 0.5);
        scene.add(ambientLight);
        
        const mainLight = new THREE.PointLight(0x00ccff, 1.5, 100);
        mainLight.position.set(0, 0, 0);
        scene.add(mainLight);
        
        const secondLight = new THREE.PointLight(0xff00cc, 1, 50);
        secondLight.position.set(15, 15, 15);
        scene.add(secondLight);
        
        const thirdLight = new THREE.PointLight(0x33ff99, 1, 50);
        thirdLight.position.set(-15, -15, 15);
        scene.add(thirdLight);
        
        // Create gravitational attractors - these will warp the grid
        const attractors = [];
        const attractorCount = 3; // Number of gravitational sources
        
        for (let i = 0; i < attractorCount; i++) {
            attractors.push({
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 30
                ),
                mass: 0.5 + Math.random() * 2.5, // Random mass between 0.5 and 3
                speed: 0.2 + Math.random() * 0.8, // Random orbit speed
                orbitRadius: 5 + Math.random() * 15, // Random orbit radius
                orbitOffset: Math.random() * Math.PI * 2, // Random offset
                pulseSpeed: 0.5 + Math.random() * 1.5 // Random pulse speed
            });
        }
        
        // Create the grid with high detail for better deformation
        const gridSize = 40;
        const gridDivisions = 40; // Higher number for smoother deformation
        const gridGeometry = new THREE.BoxGeometry(
            gridSize, gridSize, gridSize,
            gridDivisions, gridDivisions, gridDivisions
        );
        
        // Store original positions for reference
        const originalPositions = new Float32Array(gridGeometry.attributes.position.array.length);
        originalPositions.set(gridGeometry.attributes.position.array);
        
        // Create material for the grid
        const gridMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x0033aa,
            specular: 0xffffff,
            shininess: 50,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
        scene.add(gridMesh);
        
        // Create visual representations of the attractors
        const attractorMeshes = [];
        const attractorGeometry = new THREE.SphereGeometry(1, 16, 16);
        
        for (let i = 0; i < attractorCount; i++) {
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(i / attractorCount, 0.8, 0.5),
                emissive: new THREE.Color().setHSL(i / attractorCount, 0.8, 0.2),
                transparent: true,
                opacity: 0.7
            });
            
            const mesh = new THREE.Mesh(attractorGeometry, material);
            mesh.position.copy(attractors[i].position);
            mesh.scale.setScalar(attractors[i].mass * 0.5); // Size based on mass
            
            scene.add(mesh);
            attractorMeshes.push(mesh);
        }
        
        // Create flowing energy lines between attractors
        const flowLinesGroup = new THREE.Group();
        scene.add(flowLinesGroup);
        
        function createFlowLines() {
            // Remove existing flow lines
            while (flowLinesGroup.children.length > 0) {
                flowLinesGroup.remove(flowLinesGroup.children[0]);
            }
            
            // Create new flow lines between attractors
            for (let i = 0; i < attractorCount; i++) {
                for (let j = i + 1; j < attractorCount; j++) {
                    const points = [];
                    const segmentCount = 20; // Number of segments in the curve
                    
                    // Create a curved path between attractors
                    for (let s = 0; s <= segmentCount; s++) {
                        const t = s / segmentCount;
                        
                        // Start and end points
                        const start = attractors[i].position;
                        const end = attractors[j].position;
                        
                        // Calculate point on curve
                        const point = new THREE.Vector3();
                        point.copy(start).lerp(end, t);
                        
                        // Add some curvature based on distance
                        const midPoint = new THREE.Vector3().copy(start).lerp(end, 0.5);
                        const distance = start.distanceTo(end);
                        const bulge = Math.sin(t * Math.PI) * distance * 0.2;
                        
                        point.y += bulge; // Add vertical curve
                        
                        points.push(point);
                    }
                    
                    // Create the curve geometry
                    const curve = new THREE.CatmullRomCurve3(points);
                    const flowGeometry = new THREE.TubeGeometry(curve, 20, 0.2, 8, false);
                    
                    // Create gradient material
                    const color1 = attractorMeshes[i].material.color;
                    const color2 = attractorMeshes[j].material.color;
                    
                    const flowMaterial = new THREE.MeshPhongMaterial({
                        color: 0xffffff,
                        emissive: color1.clone().lerp(color2, 0.5),
                        transparent: true,
                        opacity: 0.6
                    });
                    
                    const flowMesh = new THREE.Mesh(flowGeometry, flowMaterial);
                    flowLinesGroup.add(flowMesh);
                }
            }
        }
        
        // Create fractal noise field
        // Simplex Noise implementation (simplified version)
        class SimplexNoise {
            constructor() {
                this.grad3 = [
                    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
                ];
                this.p = [];
                for (let i = 0; i < 256; i++) {
                    this.p[i] = Math.floor(Math.random() * 256);
                }
                
                // To remove the need for index wrapping, double the permutation table length
                this.perm = new Array(512);
                this.gradP = new Array(512);
                
                this.seed(Math.random());
            }
            
            seed(seed) {
                if (seed > 0 && seed < 1) {
                    // Scale the seed out
                    seed *= 65536;
                }
                
                seed = Math.floor(seed);
                if (seed < 256) {
                    seed |= seed << 8;
                }
                
                for (let i = 0; i < 256; i++) {
                    let v;
                    if (i & 1) {
                        v = this.p[i] ^ (seed & 255);
                    } else {
                        v = this.p[i] ^ ((seed >> 8) & 255);
                    }
                    
                    this.perm[i] = this.perm[i + 256] = v;
                    this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
                }
            }
            
            // 3D simplex noise
            noise3D(x, y, z) {
                const {gradP, perm} = this;
                
                // Scale coordinates for simplified version
                const s = (x + y + z) * 0.333333333;
                const i = Math.floor(x + s);
                const j = Math.floor(y + s);
                const k = Math.floor(z + s);
                
                const t = (i + j + k) * 0.166666667;
                const X0 = i - t;
                const Y0 = j - t;
                const Z0 = k - t;
                
                const x0 = x - X0;
                const y0 = y - Y0;
                const z0 = z - Z0;
                
                // Determine which simplex we're in
                let i1, j1, k1;
                let i2, j2, k2;
                
                if (x0 >= y0) {
                    if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
                    else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
                    else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
                } else {
                    if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
                    else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
                    else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
                }
                
                // Offsets for corners
                const x1 = x0 - i1 + 0.166666667;
                const y1 = y0 - j1 + 0.166666667;
                const z1 = z0 - k1 + 0.166666667;
                const x2 = x0 - i2 + 0.333333333;
                const y2 = y0 - j2 + 0.333333333;
                const z2 = z0 - k2 + 0.333333333;
                const x3 = x0 - 1.0 + 0.5;
                const y3 = y0 - 1.0 + 0.5;
                const z3 = z0 - 1.0 + 0.5;
                
                // Calculate contribution from corners
                const n0 = this.cornerNoise(gradP, perm, x0, y0, z0, i, j, k);
                const n1 = this.cornerNoise(gradP, perm, x1, y1, z1, i+i1, j+j1, k+k1);
                const n2 = this.cornerNoise(gradP, perm, x2, y2, z2, i+i2, j+j2, k+k2);
                const n3 = this.cornerNoise(gradP, perm, x3, y3, z3, i+1, j+1, k+1);
                
                // Scale to fit the range [-1, 1]
                return 32.0 * (n0 + n1 + n2 + n3);
            }
            
            cornerNoise(gradP, perm, x, y, z, i, j, k) {
                // Noise contribution from one corner
                let t0 = 0.5 - x*x - y*y - z*z;
                
                if (t0 < 0) return 0;
                
                t0 *= t0;
                
                // Hash coordinates
                const gi = (perm[i + perm[j + perm[k & 255] & 255] & 255]) % 12;
                
                // Noise contribution
                return t0 * t0 * this.dot(gradP[gi], x, y, z);
            }
            
            dot(g, x, y, z) {
                return g[0]*x + g[1]*y + g[2]*z;
            }
            
            // Fractal Brownian Motion (fBm)
            fBm(x, y, z, octaves = 6, lacunarity = 2.0, persistence = 0.5) {
                let value = 0;
                let amplitude = 1.0;
                let frequency = 1.0;
                
                // Sum multiple octaves of noise
                for (let i = 0; i < octaves; i++) {
                    value += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }
                
                return value;
            }
        }
        
        // Create noise generator
        const simplex = new SimplexNoise();
        
        // Create central energy vortex
        const vortexGeometry = new THREE.TorusGeometry(8, 1, 16, 100);
        const vortexMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x003366,
            transparent: true,
            opacity: 0.7
        });
        
        const vortex = new THREE.Mesh(vortexGeometry, vortexMaterial);
        scene.add(vortex);
        
        // Energy particles around the vortex
        const particleCount = 1000;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random starting positions in spherical coordinates
            const radius = 3 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            // Convert to Cartesian coordinates
            particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[i3 + 2] = radius * Math.cos(phi);
            
            // Random sizes
            particleSizes[i] = 0.1 + Math.random() * 0.5;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        
        // Custom particle shader material
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.8,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Update camera
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            
            // Update renderer
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Track mouse movement
        window.mouseX = 0;
        window.mouseY = 0;
        
        document.addEventListener('mousemove', (event) => {
            window.mouseX = (event.clientX - window.innerWidth / 2) * 0.05;
            window.mouseY = (event.clientY - window.innerHeight / 2) * 0.05;
        });
        
        // Animation loop
        const clock = new THREE.Clock();
        let lastFlowUpdate = 0;
        
        function animate() {
            const elapsedTime = clock.getElapsedTime();
            const deltaTime = clock.getDelta();
            
            // Update attractor positions
            for (let i = 0; i < attractorCount; i++) {
                const attractor = attractors[i];
                
                // Calculate new position on orbital path
                attractor.position.x = Math.sin(elapsedTime * attractor.speed + attractor.orbitOffset) * attractor.orbitRadius;
                attractor.position.z = Math.cos(elapsedTime * attractor.speed + attractor.orbitOffset) * attractor.orbitRadius;
                attractor.position.y = Math.sin(elapsedTime * attractor.speed * 0.5 + attractor.orbitOffset) * attractor.orbitRadius * 0.5;
                
                // Update visual representation
                attractorMeshes[i].position.copy(attractor.position);
                
                // Pulse the attractor size
                const pulseFactor = 1 + 0.2 * Math.sin(elapsedTime * attractor.pulseSpeed);
                attractorMeshes[i].scale.setScalar(attractor.mass * 0.5 * pulseFactor);
                
                // Pulse the attractor brightness
                attractorMeshes[i].material.emissiveIntensity = 0.5 + 0.5 * Math.sin(elapsedTime * attractor.pulseSpeed);
            }
            
            // Update flow lines periodically
            if (elapsedTime - lastFlowUpdate > 0.5) {
                createFlowLines();
                lastFlowUpdate = elapsedTime;
            }
            
            // Apply gravitational deformation to grid
            if (gridMesh.geometry.attributes && gridMesh.geometry.attributes.position) {
                const positions = gridMesh.geometry.attributes.position;
                
                for (let i = 0; i < positions.count; i++) {
                    // Get original position
                    const x = originalPositions[i * 3];
                    const y = originalPositions[i * 3 + 1];
                    const z = originalPositions[i * 3 + 2];
                    
                    // Initialize with original position
                    let newX = x;
                    let newY = y;
                    let newZ = z;
                    
                    // Apply fractal distortion using Simplex noise
                    const noiseFreq = 0.02;
                    const noiseTime = elapsedTime * 0.1;
                    const noiseScale = 1.5;
                    
                    // Generate fractal noise
                    const noise = simplex.fBm(
                        x * noiseFreq + noiseTime, 
                        y * noiseFreq + noiseTime, 
                        z * noiseFreq + noiseTime, 
                        4, // octaves
                        2.0, // lacunarity
                        0.5  // persistence
                    );
                    
                    // Apply fractal displacement
                    newX += noise * noiseScale;
                    newY += noise * noiseScale;
                    newZ += noise * noiseScale;
                    
                    // Calculate gravitational influence from attractors
                    for (const attractor of attractors) {
                        const distance = Math.sqrt(
                            (newX - attractor.position.x) ** 2 + 
                            (newY - attractor.position.y) ** 2 + 
                            (newZ - attractor.position.z) ** 2
                        );
                        
                        // Avoid division by zero
                        if (distance > 0.1) {
                            // Gravitational formula (inverse square law)
                            const force = attractor.mass / (distance * distance);
                            const maxForce = 10;
                            const clampedForce = Math.min(force, maxForce);
                            
                            // Apply force toward attractor
                            const dirX = (attractor.position.x - newX) / distance;
                            const dirY = (attractor.position.y - newY) / distance;
                            const dirZ = (attractor.position.z - newZ) / distance;
                            
                            newX += dirX * clampedForce;
                            newY += dirY * clampedForce;
                            newZ += dirZ * clampedForce;
                        }
                    }
                    
                    // Update position
                    positions.setXYZ(i, newX, newY, newZ);
                }
                
                positions.needsUpdate = true;
            }
            
            // Update vortex animation
            vortex.rotation.z = elapsedTime * 0.5;
            vortex.rotation.x = Math.sin(elapsedTime * 0.3) * 0.2;
            vortex.scale.set(
                1 + 0.1 * Math.sin(elapsedTime),
                1 + 0.1 * Math.sin(elapsedTime),
                1 + 0.1 * Math.sin(elapsedTime)
            );
            
            // Update energy particles
            if (particles.geometry.attributes && particles.geometry.attributes.position) {
                const particlePositions = particles.geometry.attributes.position;
                const particleSizes = particles.geometry.attributes.size;
                
                for (let i = 0; i < particlePositions.count; i++) {
                    const i3 = i * 3;
                    
                    // Get current position
                    let x = particlePositions.getX(i);
                    let y = particlePositions.getY(i);
                    let z = particlePositions.getZ(i);
                    
                    // Calculate distance from center
                    const distance = Math.sqrt(x*x + y*y + z*z);
                    
                    // Apply vortex-like motion
                    const angle = elapsedTime * (0.5 / Math.max(1, distance * 0.1)) + distance * 0.1;
                    const newX = Math.cos(angle) * distance;
                    const newZ = Math.sin(angle) * distance;
                    
                    // Move particles toward the center slowly
                    const inwardSpeed = 0.2;
                    const newDistance = Math.max(2, distance - deltaTime * inwardSpeed);
                    
                    // Calculate new position
                    x = (newX / distance) * newDistance;
                    z = (newZ / distance) * newDistance;
                    
                    // Apply wave-like motion in Y axis
                    y += Math.sin(elapsedTime * 2 + distance) * 0.05;
                    
                    // Reset particles that get too close to center
                    if (newDistance < 3) {
                        // New random position far from center
                        const radius = 15 + Math.random() * 10;
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.acos(2 * Math.random() - 1);
                        
                        x = radius * Math.sin(phi) * Math.cos(theta);
                        y = radius * Math.sin(phi) * Math.sin(theta);
                        z = radius * Math.cos(phi);
                    }
                    
                    // Update position
                    particlePositions.setXYZ(i, x, y, z);
                    
                    // Pulse particle size
                    const size = 0.1 + 0.3 * (Math.sin(elapsedTime * 3 + i * 0.1) * 0.5 + 0.5);
                    particleSizes.setX(i, size);
                }
                
                particlePositions.needsUpdate = true;
                particleSizes.needsUpdate = true;
            }
            
            // Update camera position in a circular path with dynamic adjustment
            const cameraDistance = 30 + Math.sin(elapsedTime * 0.1) * 5;
            const cameraAngle = elapsedTime * 0.2;
            const cameraHeight = 15 + Math.sin(elapsedTime * 0.3) * 10;
            
            camera.position.x = Math.sin(cameraAngle) * cameraDistance;
            camera.position.z = Math.cos(cameraAngle) * cameraDistance;
            camera.position.y = cameraHeight;
            
            // Add mouse influence
            if (window.mouseX !== undefined && window.mouseY !== undefined) {
                camera.position.x += window.mouseX;
                camera.position.y += window.mouseY;
            }
            
            // Look at the center
            camera.lookAt(0, 0, 0);
            
            // Render the scene
            renderer.render(scene, camera);
            
            // Continue animation
            requestAnimationFrame(animate);
        }
        
        // Start animation
        animate();
        
        console.log('3D Fractal Grid background initialized successfully');
        
    } catch (error) {
        console.error('Error initializing 3D Fractal background:', error);
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
    console.log('DOM loaded, initializing 3D Fractal background');
    addBackgroundCSS();
    
    // Wait a little bit to ensure Three.js is loaded
    setTimeout(() => {
        initFractalGridBackground();
    }, 100);
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, initializing 3D Fractal background');
    setTimeout(() => {
        addBackgroundCSS();
        initFractalGridBackground();
    }, 100);
}