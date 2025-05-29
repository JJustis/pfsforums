// Simplified 3D Grid Animation with Error Handling
const initSimpleGridBackground = () => {
    // Basic error handling to prevent crashes
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
        
        const mainLight = new THREE.PointLight(0x00ccff, 1, 100);
        mainLight.position.set(0, 0, 0);
        scene.add(mainLight);
        
        const secondLight = new THREE.PointLight(0xff00cc, 1, 50);
        secondLight.position.set(15, 15, 15);
        scene.add(secondLight);
        
        // Create the grid
        const gridSize = 40;
        const gridDivisions = 20;
        const gridGeometry = new THREE.BoxGeometry(
            gridSize, gridSize, gridSize,
            gridDivisions, gridDivisions, gridDivisions
        );
        
        // Create material for the grid with simple animation
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
        scene.add(gridMesh);
        
        // Create central glowing sphere
        const sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ccff,
            emissive: 0x0033ff,
            specular: 0xffffff,
            shininess: 30,
            transparent: true,
            opacity: 0.7
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);
        
        // Create particles
        const particleCount = 1000;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random spherical coordinates
            const radius = 5 + Math.random() * 15;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            // Convert to Cartesian coordinates
            particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[i3 + 2] = radius * Math.cos(phi);
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.5,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.7
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
        
        function animate() {
            const elapsedTime = clock.getElapsedTime();
            
            // Morph the grid vertices
            if (gridMesh.geometry.attributes && gridMesh.geometry.attributes.position) {
                const positions = gridMesh.geometry.attributes.position;
                
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    const z = positions.getZ(i);
                    
                    // Skip center vertices to keep the shape intact
                    if (Math.abs(x) > 5 || Math.abs(y) > 5 || Math.abs(z) > 5) {
                        // Calculate distance from center
                        const dist = Math.sqrt(x*x + y*y + z*z);
                        
                        // Animation based on distance and time
                        const amplitude = 0.5 * (1.0 - Math.min(1.0, dist / (gridSize / 2)));
                        
                        // Create wave patterns
                        const waveX = Math.sin(x * 0.2 + elapsedTime) * amplitude;
                        const waveY = Math.cos(y * 0.2 + elapsedTime * 0.8) * amplitude;
                        const waveZ = Math.sin(z * 0.2 + elapsedTime * 0.6) * amplitude;
                        
                        // Apply displacement
                        positions.setX(i, x + waveX);
                        positions.setY(i, y + waveY);
                        positions.setZ(i, z + waveZ);
                    }
                }
                
                positions.needsUpdate = true;
            }
            
            // Rotate grid
            gridMesh.rotation.x = elapsedTime * 0.05;
            gridMesh.rotation.y = elapsedTime * 0.08;
            
            // Pulse the sphere
            sphere.scale.x = 1 + Math.sin(elapsedTime) * 0.2;
            sphere.scale.y = 1 + Math.sin(elapsedTime * 1.2) * 0.2;
            sphere.scale.z = 1 + Math.sin(elapsedTime * 0.8) * 0.2;
            
            // Update sphere color
            const hue = (elapsedTime * 0.05) % 1;
            sphere.material.color.setHSL(hue, 1, 0.5);
            sphere.material.emissive.setHSL(hue, 0.8, 0.2);
            
            // Rotate particles
            particles.rotation.y = elapsedTime * 0.1;
            
            // Move lights
            mainLight.intensity = 1 + Math.sin(elapsedTime) * 0.5;
            secondLight.position.x = Math.sin(elapsedTime * 0.3) * 15;
            secondLight.position.z = Math.cos(elapsedTime * 0.3) * 15;
            
            // Move camera in a circular path
            const cameraRadius = 30;
            camera.position.x = Math.sin(elapsedTime * 0.1) * cameraRadius * 0.3;
            camera.position.z = Math.cos(elapsedTime * 0.1) * cameraRadius;
            
            // Add mouse influence
            if (window.mouseX !== undefined && window.mouseY !== undefined) {
                camera.position.x += window.mouseX;
                camera.position.y += window.mouseY;
            }
            
            // Look at center
            camera.lookAt(0, 0, 0);
            
            // Render
            renderer.render(scene, camera);
            
            // Continue animation loop
            requestAnimationFrame(animate);
        }
        
        // Start animation
        animate();
        
        // Return success
        console.log('3D Grid background initialized successfully');
        
    } catch (error) {
        // Log errors but don't crash
        console.error('Error initializing 3D background:', error);
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
    console.log('DOM loaded, initializing 3D background');
    addBackgroundCSS();
    
    // Wait a little bit to ensure Three.js is loaded
    setTimeout(() => {
        initSimpleGridBackground();
    }, 100);
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, initializing 3D background');
    setTimeout(() => {
        addBackgroundCSS();
        initSimpleGridBackground();
    }, 100);
}