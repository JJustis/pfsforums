const initDancingGalaxyBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Set deep space background color
    renderer.setClearColor(0x000205, 1);
    
    // Camera position
    camera.position.z = 80;
    
    // Star textures for different colors
    const starTextures = {
        blue: createStarTexture([100, 180, 255]),
        white: createStarTexture([255, 255, 255]),
        yellow: createStarTexture([255, 240, 180]), 
        orange: createStarTexture([255, 180, 120]),
        red: createStarTexture([255, 120, 100])
    };
    
    // Create a galaxy of stars
    const galaxy = createGalaxy();
    scene.add(galaxy);
    
    // Create background stars
    const backgroundStars = createBackgroundStars();
    scene.add(backgroundStars);
    
    // Create galaxy glow at the center
    const galaxyCore = createGalaxyCore();
    scene.add(galaxyCore);
    
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
    
    // Create stars for galaxy
    function createGalaxy() {
        const starsGroup = new THREE.Group();
        const starCount = 2000;
        const stars = [];
        
        for (let i = 0; i < starCount; i++) {
            // Determine star properties
            const star = createStar(i);
            starsGroup.add(star.mesh);
            stars.push(star);
        }
        
        starsGroup.userData = { stars };
        return starsGroup;
    }
    
    // Create a single star
    function createStar(index) {
        // Determine star color
        const colorType = Math.random();
        let texture;
        
        if (colorType < 0.15) {
            texture = starTextures.blue;
        } else if (colorType < 0.35) {
            texture = starTextures.white;
        } else if (colorType < 0.7) {
            texture = starTextures.yellow;
        } else if (colorType < 0.9) {
            texture = starTextures.orange;
        } else {
            texture = starTextures.red;
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
        
        // Initialize star with random position in a disc
        const radius = 5 + Math.random() * Math.random() * 60;
        const angle = Math.random() * Math.PI * 2;
        
        star.position.x = Math.cos(angle) * radius;
        star.position.y = Math.sin(angle) * radius;
        star.position.z = (Math.random() - 0.5) * 10;
        
        // Always face the camera
        star.lookAt(camera.position);
        
        // Star data for animation
        const starData = {
            mesh: star,
            radius: radius,
            angle: angle,
            rotationSpeed: (1 / (radius * 0.1 + 1)) * 0.05, // Faster rotation for inner stars
            size: size,
            originalSize: size,
            state: 'orbiting', // possible states: 'orbiting', 'falling', 'ejecting', 'returning'
            fallProbability: 0.0003, // Probability to start falling in each frame
            fallProgress: 0,
            ejectionProgress: 0,
            ejectionAngle: 0,
            ejectionRadius: 0,
            twinkling: {
                speed: 0.5 + Math.random() * 1,
                phase: Math.random() * Math.PI * 2
            }
        };
        
        return starData;
    }
    
    // Create galaxy core glow
    function createGalaxyCore() {
        const coreGeometry = new THREE.PlaneGeometry(20, 20);
        const coreTexture = createCoreTexture();
        
        const coreMaterial = new THREE.MeshBasicMaterial({
            map: coreTexture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.lookAt(camera.position);
        
        return core;
    }
    
    // Create core texture
    function createCoreTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        
        gradient.addColorStop(0, 'rgba(255, 230, 200, 1.0)');
        gradient.addColorStop(0.2, 'rgba(255, 180, 120, 0.8)');
        gradient.addColorStop(0.5, 'rgba(180, 100, 80, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    // Create background stars
    function createBackgroundStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 1000;
        
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        
        for (let i = 0; i < starsCount; i++) {
            // Star positions in a large sphere around the scene
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = 100 + Math.random() * 900;
            
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
        
        // Update pixel ratio for background stars
        backgroundStars.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    });
    
    // Add mouse interactivity
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        targetMouseX = (event.clientX / window.innerWidth - 0.5) * 20;
        targetMouseY = (event.clientY / window.innerHeight - 0.5) * 20;
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
        camera.position.x = mouseX * 0.3;
        camera.position.y = mouseY * 0.3;
        camera.lookAt(0, 0, 0);
        
        // Update background stars
        backgroundStars.material.uniforms.uTime.value = elapsedTime;
        
        // Update galaxy stars
        const stars = galaxy.userData.stars;
        
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const starMesh = star.mesh;
            
            // Always make stars face the camera
            starMesh.lookAt(camera.position);
            
            // Twinkling effect
            const twinkle = Math.sin(elapsedTime * star.twinkling.speed + star.twinkling.phase) * 0.3 + 0.7;
            starMesh.scale.set(twinkle, twinkle, twinkle);
            
            // Handle star states and transitions
            switch(star.state) {
                case 'orbiting':
                    // Normal rotation around the galaxy center
                    star.angle += star.rotationSpeed;
                    starMesh.position.x = Math.cos(star.angle) * star.radius;
                    starMesh.position.y = Math.sin(star.angle) * star.radius;
                    
                    // Randomly decide if star should start falling
                    if (Math.random() < star.fallProbability) {
                        star.state = 'falling';
                        star.fallProgress = 0;
                    }
                    break;
                    
                case 'falling':
                    // Star is falling toward the center
                    star.fallProgress += deltaTime * 0.5; // Fall speed
                    
                    if (star.fallProgress >= 1) {
                        // Start ejection when star reaches center
                        star.state = 'ejecting';
                        star.ejectionProgress = 0;
                        star.ejectionAngle = Math.random() * Math.PI * 2; // Random ejection angle
                        star.ejectionRadius = star.radius * 1.5 + Math.random() * 20; // Eject further than original orbit
                    } else {
                        // Move toward center with easing
                        const t = easeInQuad(star.fallProgress);
                        const currentRadius = star.radius * (1 - t);
                        
                        starMesh.position.x = Math.cos(star.angle) * currentRadius;
                        starMesh.position.y = Math.sin(star.angle) * currentRadius;
                        
                        // Scale down slightly as it approaches center
                        const scale = 1 - t * 0.3;
                        starMesh.scale.set(scale * twinkle, scale * twinkle, scale * twinkle);
                    }
                    break;
                    
                case 'ejecting':
                    // Star is being ejected outward in a parabolic path
                    star.ejectionProgress += deltaTime * 0.8; // Ejection speed
                    
                    if (star.ejectionProgress >= 1) {
                        // Return to normal orbit with new radius and angle
                        star.state = 'orbiting';
                        star.radius = star.ejectionRadius;
                        star.angle = star.ejectionAngle;
                        
                        // Adjust rotation speed based on new radius
                        star.rotationSpeed = (1 / (star.radius * 0.1 + 1)) * 0.05;
                    } else {
                        // Parabolic motion outward
                        const t = easeOutQuad(star.ejectionProgress);
                        const currentRadius = star.radius * t * 2; // Parabolic path factor
                        
                        // Calculate position along the ejection path
                        const currentAngle = star.angle + (star.ejectionAngle - star.angle) * t;
                        starMesh.position.x = Math.cos(currentAngle) * currentRadius;
                        starMesh.position.y = Math.sin(currentAngle) * currentRadius;
                        
                        // Add some "z" motion to create a more 3D parabolic effect
                        const zOffset = Math.sin(t * Math.PI) * 10;
                        starMesh.position.z = zOffset;
                        
                        // Scale up as it ejects
                        const scale = 0.7 + t * 0.5;
                        starMesh.scale.set(scale * twinkle, scale * twinkle, scale * twinkle);
                    }
                    break;
            }
        }
        
        // Animate the galaxy core
        galaxyCore.rotation.z = elapsedTime * 0.1;
        const coreScale = 1 + Math.sin(elapsedTime * 2) * 0.05;
        galaxyCore.scale.set(coreScale, coreScale, coreScale);
        
        // Render the scene
        renderer.render(scene, camera);
    };
    
    // Easing functions for smooth animations
    function easeInQuad(t) {
        return t * t;
    }
    
    function easeOutQuad(t) {
        return t * (2 - t);
    }
    
    // Start animation
    animate();
};

// Initialize Dancing Galaxy Background when DOM is loaded
document.addEventListener('DOMContentLoaded', initDancingGalaxyBackground);
