 const initSmokeBackground = () => {
            // Get the canvas element
            const canvas = document.getElementById('bg-canvas');
            
            // Create scene, camera, and renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            
            // Set renderer size and pixel ratio
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Create smoke texture
            const createSmokeTexture = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                
                const context = canvas.getContext('2d');
                const gradient = context.createRadialGradient(
                    canvas.width / 2,
                    canvas.height / 2,
                    0,
                    canvas.width / 2,
                    canvas.height / 2,
                    canvas.width / 2
                );
                
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                context.fillStyle = gradient;
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                return new THREE.CanvasTexture(canvas);
            };
            
            const smokeTexture = createSmokeTexture();
            
            // Array to store all smoke particles
            const smokeParticles = [];
            
            // Mouse tracking variables
            const mouse = {
                x: 0,
                y: 0,
                worldX: 0,
                worldY: 0,
                speed: 0,
                prevX: 0,
                prevY: 0
            };
            
            // Function to create a new smoke particle
            const createSmokeParticle = (x, y, z, size, opacity, color) => {
                const smokeGeometry = new THREE.PlaneGeometry(size, size);
                const smokeMaterial = new THREE.MeshBasicMaterial({
                    map: smokeTexture,
                    transparent: true,
                    opacity: opacity,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    color: color || 0xffffff
                });
                
                const smokeMesh = new THREE.Mesh(smokeGeometry, smokeMaterial);
                smokeMesh.position.set(x, y, z);
                smokeMesh.rotation.z = Math.random() * Math.PI * 2;
                
                // Add properties for animation
                smokeMesh.userData = {
                    velocity: {
                        x: (Math.random() - 0.5) * 0.02,
                        y: (Math.random() - 0.5) * 0.02,
                        z: (Math.random() - 0.5) * 0.01
                    },
                    rotation: (Math.random() - 0.5) * 0.02,
                    growthRate: Math.random() * 0.01 + 0.005,
                    fadeRate: Math.random() * 0.01 + 0.003,
                    maxSize: size * (Math.random() * 2 + 3),
                    age: 0,
                    maxAge: Math.random() * 200 + 100,
                    color: color || new THREE.Color(0xffffff)
                };
                
                scene.add(smokeMesh);
                smokeParticles.push(smokeMesh);
                
                return smokeMesh;
            };
            
            // Create a few initial particles
            for (let i = 0; i < 5; i++) {
                createSmokeParticle(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 3 - 5,
                    0.5,
                    0.3,
                    new THREE.Color(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.5 + 0.5)
                );
            }
            
            // Position camera
            camera.position.z = 10;
            
            // Track mouse movement
            document.addEventListener('mousemove', (event) => {
                // Calculate mouse speed
                mouse.prevX = mouse.x;
                mouse.prevY = mouse.y;
                
                // Get normalized mouse coordinates
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                
                // Calculate world coordinates
                const vector = new THREE.Vector3(mouse.x, mouse.y, 0);
                vector.unproject(camera);
                const dir = vector.sub(camera.position).normalize();
                const distance = -camera.position.z / dir.z;
                const pos = camera.position.clone().add(dir.multiplyScalar(distance));
                
                mouse.worldX = pos.x;
                mouse.worldY = pos.y;
                
                // Calculate mouse speed (squared distance)
                const dx = mouse.x - mouse.prevX;
                const dy = mouse.y - mouse.prevY;
                mouse.speed = Math.sqrt(dx * dx + dy * dy);
            });
            
            // Spawn particles based on mouse movement
            let particleCounter = 0;
            const spawnInterval = 2; // Frames between spawns
            
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
                
                // Spawn new particles based on mouse movement
                particleCounter++;
                if (particleCounter >= spawnInterval && mouse.speed > 0.001) {
                    particleCounter = 0;
                    
                    // Number of particles based on mouse speed
                    const particlesToSpawn = Math.min(Math.floor(mouse.speed * 20), 3);
                    
                    for (let i = 0; i < particlesToSpawn; i++) {
                        // Randomize position slightly around mouse
                        const offsetX = (Math.random() - 0.5) * 0.5;
                        const offsetY = (Math.random() - 0.5) * 0.5;
                        const z = -5 + Math.random() * 4;
                        
                        // Color based on position (for visual variety)
                        const hue = (mouse.x + 1) * 0.05;
                        const saturation = 0.5;
                        const lightness = 0.6 + Math.random() * 0.3;
                        
                        const color = new THREE.Color().setHSL(hue, saturation, lightness);
                        
                        // Size based on mouse speed
                        const size = 0.3 + mouse.speed * 2;
                        
                        createSmokeParticle(
                            mouse.worldX + offsetX,
                            mouse.worldY + offsetY,
                            z,
                            size,
                            0.2 + Math.random() * 0.2,
                            color
                        );
                        
                        // Limit maximum particles to prevent performance issues
                        const maxParticles = 120;
                        if (smokeParticles.length > maxParticles) {
                            const oldestParticle = smokeParticles.shift();
                            scene.remove(oldestParticle);
                            oldestParticle.material.dispose();
                            oldestParticle.geometry.dispose();
                        }
                    }
                }
                
                // Update particles
                for (let i = smokeParticles.length - 1; i >= 0; i--) {
                    const particle = smokeParticles[i];
                    const userData = particle.userData;
                    
                    // Update age
                    userData.age++;
                    
                    // Check if particle should be removed
                    if (userData.age > userData.maxAge || particle.material.opacity <= 0) {
                        scene.remove(particle);
                        particle.material.dispose();
                        particle.geometry.dispose();
                        smokeParticles.splice(i, 1);
                        continue;
                    }
                    
                    // Update position based on velocity
                    particle.position.x += userData.velocity.x;
                    particle.position.y += userData.velocity.y;
                    particle.position.z += userData.velocity.z;
                    
                    // Slow down particles over time
                    userData.velocity.x *= 0.99;
                    userData.velocity.y *= 0.99;
                    
                    // Apply a slight upward drift to simulate rising smoke
                    userData.velocity.y += 0.0003;
                    
                    // Rotate particle
                    particle.rotation.z += userData.rotation;
                    
                    // Grow particle until it reaches max size
                    const currentSize = particle.scale.x;
                    if (currentSize < userData.maxSize) {
                        const newSize = currentSize + userData.growthRate;
                        particle.scale.set(newSize, newSize, 1);
                    }
                    
                    // Fade out particle
                    particle.material.opacity -= userData.fadeRate;
                    
                    // Make particles slightly attract to each other
                    for (let j = 0; j < smokeParticles.length; j++) {
                        if (i !== j) {
                            const otherParticle = smokeParticles[j];
                            const dx = otherParticle.position.x - particle.position.x;
                            const dy = otherParticle.position.y - particle.position.y;
                            const dz = otherParticle.position.z - particle.position.z;
                            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            
                            if (distance < 3) {
                                const force = 0.00005 / (distance + 0.1);
                                userData.velocity.x += dx * force;
                                userData.velocity.y += dy * force;
                                userData.velocity.z += dz * force;
                            }
                        }
                    }
                    
                    // Make particles slightly attracted to mouse position
                    if (mouse.worldX && mouse.worldY) {
                        const dx = mouse.worldX - particle.position.x;
                        const dy = mouse.worldY - particle.position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < 5) {
                            const force = 0.0001 / (distance + 0.1);
                            userData.velocity.x += dx * force;
                            userData.velocity.y += dy * force;
                        }
                    }
                }
                
                // Render the scene
                renderer.render(scene, camera);
            };
            
            // Start animation
            animate();
        };

        // Initialize smoke background when DOM is loaded
        document.addEventListener('DOMContentLoaded', initSmokeBackground);