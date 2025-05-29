 const initMeteorShowerBackground = () => {
            // Get the canvas element
            const canvas = document.getElementById('bg-canvas');
            
            // Create scene, camera, and renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            
            // Set renderer size and pixel ratio
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Create materials for different meteor types
            const meteorMaterial = new THREE.PointsMaterial({
                size: 0.2,
                sizeAttenuation: true,
                color: 0xffffff,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.8
            });
            
            const trailMaterial = new THREE.PointsMaterial({
                size: 0.1,
                sizeAttenuation: true,
                map: createTrailTexture(),
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.6
            });

            // Create meteor system
            let meteors = [];
            const maxMeteors = 30; // Maximum number of active meteors
            
            // Create stars (background)
            const starsGeometry = new THREE.BufferGeometry();
            const starsCount = 2000;
            const starsPositions = new Float32Array(starsCount * 3);
            const starsColors = new Float32Array(starsCount * 3);
            
            for (let i = 0; i < starsCount; i++) {
                starsPositions[i * 3] = (Math.random() - 0.5) * 20;
                starsPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
                starsPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
                
                // Star colors - white/blue/cyan tints
                const brightness = Math.random() * 0.3 + 0.7;
                starsColors[i * 3] = brightness * (Math.random() * 0.3 + 0.7); // R
                starsColors[i * 3 + 1] = brightness * (Math.random() * 0.2 + 0.8); // G
                starsColors[i * 3 + 2] = brightness; // B
            }
            
            starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
            starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));
            
            const starsMaterial = new THREE.PointsMaterial({
                size: 0.04,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.8
            });
            
            const stars = new THREE.Points(starsGeometry, starsMaterial);
            scene.add(stars);
            
            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
            scene.add(ambientLight);
            
            // Position camera
            camera.position.z = 5;
            
            // Create meteor function
            function createMeteor() {
                // Create a meteor with a trail
                const meteorGeometry = new THREE.BufferGeometry();
                
                // Meteor head position (starts from a random position above the view)
                const startX = (Math.random() - 0.5) * 12;
                const startY = Math.random() * 3 + 5; // Start above the viewport
                const startZ = (Math.random() - 0.5) * 5;
                
                // Create meteor trail with multiple points
                const trailLength = Math.floor(Math.random() * 10 + 5);
                const positions = new Float32Array(trailLength * 3);
                const colors = new Float32Array(trailLength * 3);
                const sizes = new Float32Array(trailLength);
                
                // Generate trail points
                for (let i = 0; i < trailLength; i++) {
                    // Trail positions (following the meteor head with decreasing distance)
                    const trailFactor = i / trailLength;
                    positions[i * 3] = startX;
                    positions[i * 3 + 1] = startY + trailFactor * 2; // Trail points above the head
                    positions[i * 3 + 2] = startZ;
                    
                    // Trail colors (fading from white/blue to transparent)
                    colors[i * 3] = 1 - trailFactor * 0.5; // R
                    colors[i * 3 + 1] = 1 - trailFactor * 0.3; // G
                    colors[i * 3 + 2] = 1; // B

                    // Sizes (larger at the head, smaller at the tail)
                    sizes[i] = (1 - trailFactor) * 0.2 + 0.05;
                }
                
                meteorGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                meteorGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                meteorGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
                
                // Create custom material for this meteor
                const customMaterial = trailMaterial.clone();
                customMaterial.opacity = Math.random() * 0.5 + 0.5;
                
                // Create the meteor mesh
                const meteor = new THREE.Points(meteorGeometry, customMaterial);
                
                // Give the meteor a random directional speed
                const speedFactor = Math.random() * 0.05 + 0.04;
                meteor.userData = {
                    velocity: {
                        x: (Math.random() - 0.5) * 0.05,
                        y: -speedFactor, // Always moving downward
                        z: (Math.random() - 0.5) * 0.01
                    },
                    trail: [],
                    trailLength: trailLength,
                    life: 100 + Math.random() * 50, // Lifetime of the meteor
                    initialPositions: positions.slice() // Store initial relative positions
                };
                
                scene.add(meteor);
                meteors.push(meteor);
                
                return meteor;
            }
            
            // Create a trail texture
            function createTrailTexture() {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                
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
                gradient.addColorStop(0.2, 'rgba(200, 220, 255, 0.8)');
                gradient.addColorStop(0.5, 'rgba(150, 180, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
                
                context.fillStyle = gradient;
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                const texture = new THREE.Texture(canvas);
                texture.needsUpdate = true;
                return texture;
            }
            
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
                requestAnimationFrame(animate);
                
                const delta = clock.getDelta();
                
                // Slowly rotate stars
                stars.rotation.y += 0.0005;
                stars.rotation.x += 0.0001;
                
                // Make stars react slightly to mouse movement
                if (window.mouseX && window.mouseY) {
                    stars.rotation.y += (window.mouseX * 0.000005);
                    stars.rotation.x += (window.mouseY * 0.000005);
                }
                
                // Create new meteors randomly
                if (meteors.length < maxMeteors && Math.random() < 0.05) {
                    createMeteor();
                }
                
                // Update meteors
                for (let i = meteors.length - 1; i >= 0; i--) {
                    const meteor = meteors[i];
                    const positions = meteor.geometry.attributes.position.array;
                    const initialPositions = meteor.userData.initialPositions;
                    
                    // Move meteor head (first point)
                    meteor.position.x += meteor.userData.velocity.x;
                    meteor.position.y += meteor.userData.velocity.y;
                    meteor.position.z += meteor.userData.velocity.z;
                    
                    // Update trail positions (they should follow their relative position)
                    for (let j = 0; j < meteor.userData.trailLength; j++) {
                        // Keep trail points in their relative positions to maintain the trail shape
                        positions[j * 3] = initialPositions[j * 3];
                        positions[j * 3 + 1] = initialPositions[j * 3 + 1];
                        positions[j * 3 + 2] = initialPositions[j * 3 + 2];
                    }
                    
                    meteor.geometry.attributes.position.needsUpdate = true;
                    
                    // Decrease meteor life
                    meteor.userData.life -= 1;
                    
                    // Remove meteor if it's out of view or its life is over
                    if (meteor.position.y < -10 || meteor.userData.life <= 0) {
                        scene.remove(meteor);
                        meteors.splice(i, 1);
                    }
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
            
            // Create initial meteors
            for (let i = 0; i < 10; i++) {
                createMeteor();
            }
            
            // Start animation
            animate();
        };

        // Initialize Meteor Shower background when DOM is loaded
        document.addEventListener('DOMContentLoaded', initMeteorShowerBackground);