const initFallingFlamesBackground = () => {
    // Check for Three.js
    if (typeof THREE === 'undefined') {
        // Load Three.js if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = setupFallingFlamesBackground;
        document.head.appendChild(script);
    } else {
        setupFallingFlamesBackground();
    }

    function setupFallingFlamesBackground() {
        // Create or get canvas element
        let canvas = document.getElementById('bg-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'bg-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '-1';
            document.body.appendChild(canvas);
        }

        // Initialize Three.js
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Dark background
        scene.fog = new THREE.FogExp2(0x000000, 0.002);
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.z = 30;
        camera.position.y = 5;
        camera.lookAt(0, 0, 0);
        
        // Flame settings
        const settings = {
            flameCount: 1000,          // Number of flame particles
            flameSize: { min: 0.1, max: 0.5 }, // Size range of flames
            fallingSpeed: { min: 2, max: 8 },  // Speed range of falling
            swayFactor: 0.5,           // How much flames sway side to side
            flameColors: [             // Color palette for flames
                new THREE.Color(0xFF5500), // Bright orange
                new THREE.Color(0xFF3300), // Reddish orange
                new THREE.Color(0xFF9500), // Yellow orange
                new THREE.Color(0xFFAA00), // Amber
                new THREE.Color(0xFF0000)  // Red
            ],
            emberColors: [             // Color palette for embers
                new THREE.Color(0xFF3300),
                new THREE.Color(0xFF0000),
                new THREE.Color(0xDD0000)
            ],
            groundFireWidth: window.innerWidth / 30, // Width of ground fire section
            groundFireCount: 30,        // Number of fire columns at the bottom
            groundHeight: -15           // Height of the ground/bottom margin
        };

        // Create groups for better organization
        const flamesGroup = new THREE.Group();
        const embersGroup = new THREE.Group();
        const groundFireGroup = new THREE.Group();
        
        scene.add(flamesGroup);
        scene.add(embersGroup);
        scene.add(groundFireGroup);
        
        // User interaction tracking
        const mouse = {
            x: 0,
            y: 0,
            previousX: 0,
            previousY: 0,
            down: false
        };

        // Create flame texture
        function createFlameTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Create radial gradient for flame
            const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 200, 50, 0.8)');
            gradient.addColorStop(0.6, 'rgba(255, 50, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }
        
        // Create ember texture
        function createEmberTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            
            // Create radial gradient for ember
            const gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 150, 20, 0.8)');
            gradient.addColorStop(0.8, 'rgba(200, 0, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 32, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }
        
        // Flame particle class
        class FlameParticle {
            constructor() {
                this.size = Math.random() * 
                    (settings.flameSize.max - settings.flameSize.min) + 
                    settings.flameSize.min;
                    
                this.speed = Math.random() * 
                    (settings.fallingSpeed.max - settings.fallingSpeed.min) + 
                    settings.fallingSpeed.min;
                    
                this.position = new THREE.Vector3(
                    (Math.random() - 0.5) * window.innerWidth / 10,
                    Math.random() * 50 + 20,
                    (Math.random() - 0.5) * 20
                );
                
                this.angle = Math.random() * Math.PI * 2;
                this.angleSpeed = (Math.random() - 0.5) * 0.1;
                this.swayFactor = Math.random() * settings.swayFactor;
                
                // Create sprite material with fire texture
                const colorIndex = Math.floor(Math.random() * settings.flameColors.length);
                this.material = new THREE.SpriteMaterial({
                    map: createFlameTexture(),
                    color: settings.flameColors[colorIndex],
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    opacity: 0.8
                });
                
                this.sprite = new THREE.Sprite(this.material);
                this.sprite.scale.set(this.size, this.size * 1.5, 1);
                this.sprite.position.copy(this.position);
                
                // Life and fade properties
                this.life = 1.0;
                this.fadeSpeed = Math.random() * 0.05 + 0.02;
                
                flamesGroup.add(this.sprite);
            }
            
            update(deltaTime) {
                // Update position (falling down)
                this.position.y -= this.speed * deltaTime;
                
                // Swaying motion
                this.angle += this.angleSpeed;
                this.position.x += Math.sin(this.angle) * this.swayFactor * deltaTime;
                
                // Update sprite position
                this.sprite.position.copy(this.position);
                
                // Rotate sprite to face camera but with some variation
                this.sprite.material.rotation = Math.sin(this.angle) * 0.2;
                
                // Fade out as it falls
                this.life -= this.fadeSpeed * deltaTime;
                this.sprite.material.opacity = Math.min(this.life, 1.0) * 0.8;
                
                // Reduce size as it burns
                const scale = this.size * this.life;
                this.sprite.scale.set(scale, scale * 1.5, 1);
                
                // Check if flame hit the ground
                if (this.position.y < settings.groundHeight && this.life > 0.2) {
                    // Trigger fire at ground position
                    igniteGround(this.position.x);
                    // Create embers at impact
                    createEmbers(this.position);
                    // Reset flame
                    this.reset();
                }
                
                // Check if flame died out
                if (this.life <= 0) {
                    this.reset();
                }
            }
            
            reset() {
                // Reset position to top
                this.position.set(
                    (Math.random() - 0.5) * window.innerWidth / 10,
                    Math.random() * 20 + 40,
                    (Math.random() - 0.5) * 20
                );
                
                // Reset properties
                this.life = 1.0;
                this.size = Math.random() * 
                    (settings.flameSize.max - settings.flameSize.min) + 
                    settings.flameSize.min;
                    
                this.speed = Math.random() * 
                    (settings.fallingSpeed.max - settings.fallingSpeed.min) + 
                    settings.fallingSpeed.min;
                    
                this.sprite.scale.set(this.size, this.size * 1.5, 1);
                this.sprite.material.opacity = 0.8;
                
                // Change color occasionally
                if (Math.random() < 0.3) {
                    const colorIndex = Math.floor(Math.random() * settings.flameColors.length);
                    this.sprite.material.color = settings.flameColors[colorIndex];
                }
            }
        }
        
        // Ember particle (created when flames hit ground)
        class EmberParticle {
            constructor(position) {
                this.position = position.clone();
                this.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 5 + 5,
                    (Math.random() - 0.5) * 5
                );
                
                this.size = Math.random() * 0.2 + 0.05;
                this.gravity = 9.8;
                
                // Create sprite material with ember texture
                const colorIndex = Math.floor(Math.random() * settings.emberColors.length);
                this.material = new THREE.SpriteMaterial({
                    map: createEmberTexture(),
                    color: settings.emberColors[colorIndex],
                    blending: THREE.AdditiveBlending,
                    transparent: true
                });
                
                this.sprite = new THREE.Sprite(this.material);
                this.sprite.scale.set(this.size, this.size, 1);
                this.sprite.position.copy(this.position);
                
                // Life properties
                this.life = 1.0;
                this.fadeSpeed = Math.random() * 0.8 + 0.2;
                
                embersGroup.add(this.sprite);
            }
            
            update(deltaTime) {
                // Apply gravity and update position
                this.velocity.y -= this.gravity * deltaTime;
                
                this.position.x += this.velocity.x * deltaTime;
                this.position.y += this.velocity.y * deltaTime;
                this.position.z += this.velocity.z * deltaTime;
                
                // Update sprite position
                this.sprite.position.copy(this.position);
                
                // Fade out
                this.life -= this.fadeSpeed * deltaTime;
                this.sprite.material.opacity = this.life;
                
                // Reduce size as it burns out
                const scale = this.size * this.life;
                this.sprite.scale.set(scale, scale, 1);
                
                // Check if ember died out or hit ground again
                if (this.life <= 0 || this.position.y < settings.groundHeight) {
                    embersGroup.remove(this.sprite);
                    return false; // Mark for removal
                }
                
                return true; // Still alive
            }
        }
        
        // Ground fire column (appears when flames hit the ground)
        class GroundFire {
            constructor(x) {
                this.position = new THREE.Vector3(
                    x,
                    settings.groundHeight,
                    0
                );
                
                this.width = settings.groundFireWidth;
                this.intensity = 0; // Starts at 0, grows to 1
                this.maxHeight = Math.random() * 3 + 2;
                this.growthSpeed = Math.random() * 0.5 + 0.5;
                this.flickerSpeed = Math.random() * 5 + 3;
                this.angle = Math.random() * Math.PI * 2;
                
                // Create fire mesh (plane with fire texture)
                const geometry = new THREE.PlaneGeometry(this.width, 0.1);
                
                // Create fire material with texture
                this.material = new THREE.MeshBasicMaterial({
                    map: createFlameTexture(),
                    color: settings.flameColors[0],
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                
                this.mesh = new THREE.Mesh(geometry, this.material);
                this.mesh.position.copy(this.position);
                // Rotate to stand up from the ground
                this.mesh.rotation.x = -Math.PI / 2;
                
                // Light for fire
                this.light = new THREE.PointLight(
                    0xFF5500,
                    0,  // Start with no intensity
                    5   // Small range
                );
                this.light.position.copy(this.position);
                this.light.position.y += 1;
                
                groundFireGroup.add(this.mesh);
                groundFireGroup.add(this.light);
            }
            
            update(deltaTime) {
                // Grow fire intensity
                if (this.intensity < 1) {
                    this.intensity += this.growthSpeed * deltaTime;
                    if (this.intensity > 1) this.intensity = 1;
                }
                
                // Adjust height based on intensity
                const height = this.maxHeight * this.intensity;
                this.mesh.scale.y = height;
                
                // Center the fire mesh as it grows
                this.mesh.position.y = settings.groundHeight + height / 2;
                
                // Flicker effect
                this.angle += this.flickerSpeed * deltaTime;
                const flicker = Math.sin(this.angle) * 0.2 + 0.8;
                
                // Update material
                this.material.opacity = this.intensity * flicker;
                
                // Change color occasionally for flicker effect
                if (Math.random() < 0.1) {
                    const colorIndex = Math.floor(Math.random() * settings.flameColors.length);
                    this.material.color = settings.flameColors[colorIndex];
                }
                
                // Update light intensity
                this.light.intensity = this.intensity * flicker * 2;
                
                // Decay over time (very slow)
                if (Math.random() < 0.001) {
                    this.intensity -= 0.01;
                }
                
                // Check if fire burned out
                if (this.intensity <= 0) {
                    groundFireGroup.remove(this.mesh);
                    groundFireGroup.remove(this.light);
                    return false; // Mark for removal
                }
                
                return true; // Still burning
            }
            
            // Intensify the fire (when more flames hit nearby)
            intensify() {
                this.intensity = Math.min(this.intensity + 0.2, 1);
                this.maxHeight = Math.max(this.maxHeight, Math.random() * 3 + 2);
            }
        }
        
        // Array to store active flames, embers, and ground fires
        const flames = [];
        const embers = [];
        const groundFires = [];
        
        // Create initial flames
        function createFlames() {
            for (let i = 0; i < settings.flameCount; i++) {
                flames.push(new FlameParticle());
            }
        }
        
        // Create embers when flame hits the ground
        function createEmbers(position) {
            const emberCount = Math.floor(Math.random() * 10) + 5;
            for (let i = 0; i < emberCount; i++) {
                embers.push(new EmberParticle(position));
            }
        }
        
        // Create or intensify ground fire when flame hits the ground
        function igniteGround(x) {
            // Check if there's already a fire nearby
            let existingFire = false;
            
            for (const fire of groundFires) {
                const distance = Math.abs(fire.position.x - x);
                if (distance < settings.groundFireWidth) {
                    // Intensify existing fire
                    fire.intensify();
                    existingFire = true;
                    break;
                }
            }
            
            // Create new fire if none nearby
            if (!existingFire && groundFires.length < settings.groundFireCount) {
                groundFires.push(new GroundFire(x));
            }
        }
        
        // Create ground plane (floor)
        function createGround() {
            const groundGeo = new THREE.PlaneGeometry(window.innerWidth / 10, window.innerWidth / 20);
            const groundMat = new THREE.MeshPhongMaterial({
                color: 0x222222,
                specular: 0x101010
            });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = settings.groundHeight;
            
            scene.add(ground);
            
            // Add ambient occlusion shadow under the ground
            const shadowGeo = new THREE.PlaneGeometry(window.innerWidth / 10, window.innerWidth / 20);
            const shadowMat = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.3
            });
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.y = settings.groundHeight - 0.01;
            
            scene.add(shadow);
        }
        
        // Create all visual elements
        createGround();
        createFlames();
        
        // Add basic lighting
        const ambientLight = new THREE.AmbientLight(0x332211, 0.2);
        scene.add(ambientLight);
        
        // Background dim red light
        const backLight = new THREE.DirectionalLight(0xFF2200, 0.3);
        backLight.position.set(0, 20, -10);
        scene.add(backLight);
        
        // Animation loop variables
        const clock = new THREE.Clock();
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            const deltaTime = Math.min(clock.getDelta(), 0.1);
            
            // Apply mouse movement to camera
            if (mouse.down) {
                const deltaX = mouse.x - mouse.previousX;
                const deltaY = mouse.y - mouse.previousY;
                
                if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
                    camera.position.x += deltaX * 10;
                    camera.position.y += deltaY * 10;
                    
                    // Limit camera movement
                    camera.position.x = Math.max(Math.min(camera.position.x, 20), -20);
                    camera.position.y = Math.max(Math.min(camera.position.y, 20), -5);
                    
                    camera.lookAt(0, 0, 0);
                }
            }
            
            mouse.previousX = mouse.x;
            mouse.previousY = mouse.y;
            
            // Update flames
            for (let i = 0; i < flames.length; i++) {
                flames[i].update(deltaTime);
            }
            
            // Update embers and remove dead ones
            for (let i = embers.length - 1; i >= 0; i--) {
                if (!embers[i].update(deltaTime)) {
                    embers.splice(i, 1);
                }
            }
            
            // Update ground fires and remove extinguished ones
            for (let i = groundFires.length - 1; i >= 0; i--) {
                if (!groundFires[i].update(deltaTime)) {
                    groundFires.splice(i, 1);
                }
            }
            
            // Slowly rotate the flames group for some movement
            flamesGroup.rotation.y += deltaTime * 0.1;
            
            // Generate new embers occasionally from existing ground fires
            if (Math.random() < 0.1 && groundFires.length > 0) {
                const randomFire = groundFires[Math.floor(Math.random() * groundFires.length)];
                const emberPos = randomFire.position.clone();
                emberPos.y += 1;
                createEmbers(emberPos);
            }
            
            // Render scene
            renderer.render(scene, camera);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Update camera aspect ratio
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            
            // Update renderer size
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
        
        // Mouse interaction
        document.addEventListener('mousemove', (event) => {
            // Calculate normalized mouse coordinates
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        document.addEventListener('mousedown', () => {
            mouse.down = true;
        });
        
        document.addEventListener('mouseup', () => {
            mouse.down = false;
        });
        
        // Touch interaction for mobile
        document.addEventListener('touchmove', (event) => {
            if (event.touches.length > 0) {
                mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
                event.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchstart', (event) => {
            mouse.down = true;
            if (event.touches.length > 0) {
                mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
                mouse.previousX = mouse.x;
                mouse.previousY = mouse.y;
            }
        });
        
        document.addEventListener('touchend', () => {
            mouse.down = false;
        });
        
        // Start the animation loop
        animate();
    }
};

// Initialize the Falling Flames background when DOM is loaded
document.addEventListener('DOMContentLoaded', initFallingFlamesBackground);