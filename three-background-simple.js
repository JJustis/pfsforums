
const initThreeBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Create geometry for particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    
    // Create positions array for particles
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    
    // Set random positions and colors for particles
    for (let i = 0; i < particlesCount; i++) {
        // Positions
        positions[i * 3] = (Math.random() - 0.5) * 10;  // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;  // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;  // z
        
        // Colors - blue/cyan theme
        colors[i * 3] = Math.random() * 0.3;  // R
        colors[i * 3 + 1] = Math.random() * 0.7;  // G
        colors[i * 3 + 2] = Math.random() * 0.9 + 0.1;  // B
    }
    
    // Set positions and colors attributes
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create material for particles
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        alphaTest: 0.001
    });
    
    // Create particles mesh
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 5;
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        
        // Rotate particles for animation effect
        particles.rotation.x += 0.0005;
        particles.rotation.y += 0.0003;
        
        // Make particles move with mouse movement
        if (window.mouseX && window.mouseY) {
            particles.rotation.x += (window.mouseY * 0.00001);
            particles.rotation.y += (window.mouseX * 0.00001);
        }
        
        // Render the scene
        renderer.render(scene, camera);
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

// Initialize Three.js background when DOM is loaded
document.addEventListener('DOMContentLoaded', initThreeBackground);

